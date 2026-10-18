/**
 * One-dimensional Euler solver on WebGPU: the GPU twin of
 * src/engine-cpu/euler1d.ts, running the same scheme in 32-bit floats.
 *
 * The whole time loop runs on the GPU, including the time-step reduction,
 * so the CPU only submits batches of steps and reads back the clock, a
 * status flag and the log of time steps between batches. A non-physical
 * state raises the flag and is reported as a NonPhysicalStateError, as in
 * the CPU engine.
 *
 * The solver performs one operation at a time: await each call before
 * making the next. Overlapping calls throw rather than corrupt state.
 */

import type { BoundaryCondition, Euler1DConfig } from '../engine-cpu/euler1d';
import { primitiveFromConserved, type Primitive1D } from '../scheme/gas';
import type { LimiterName } from '../scheme/limiters';
import { validateGrid1DConfig } from '../solver/config';
import { NonPhysicalStateError } from '../solver/errors';
import { cellAverages1D } from '../solver/initial-condition';
import { firstNonPhysicalCell1D } from '../solver/physical';
import { RUNGE_KUTTA_STAGES } from '../solver/runge-kutta';
import { BufferSet, ExclusiveRunner, compileShader, readBuffer } from './gpu-common';
import euler1dWgsl from './shaders/euler1d.wgsl?raw';
import fluxWgsl from './shaders/flux.wgsl?raw';
import gasWgsl from './shaders/gas.wgsl?raw';
import limitersWgsl from './shaders/limiters.wgsl?raw';
import {
  DT_LOG_SIZE,
  STATUS_NON_PHYSICAL,
  StageBindGroups,
  StepLedger,
  advanceInBatches,
  stagePlan,
  type ControlReading,
  type StateIndex,
} from './time-loop';

/** Fluxes available on the GPU. The exact Godunov flux is CPU-only. */
const GPU_FLUX_FUNCTIONS = { hllc: 'hllc_flux', rusanov: 'rusanov_flux' } as const;
export type GpuFluxName = keyof typeof GPU_FLUX_FUNCTIONS;

export function isGpuFlux(name: string): name is GpuFluxName {
  return name in GPU_FLUX_FUNCTIONS;
}

/** WGSL names of the limiter functions in limiters.wgsl. */
export const WGSL_LIMITER_FUNCTIONS: Readonly<Record<LimiterName, string>> = {
  firstOrder: 'first_order',
  minmod: 'minmod',
  vanLeer: 'van_leer',
  vanAlbada: 'van_albada',
  monotonizedCentral: 'monotonized_central',
  unlimitedCentral: 'unlimited_central',
};

const BOUNDARY_CODES: Record<BoundaryCondition, number> = {
  transmissive: 0,
  reflective: 1,
  periodic: 2,
};

const WORKGROUP_SIZE = 64;
/** Bytes read back after each batch: clock (16), status (16), dt log. */
const CLOCK_READBACK_BYTES = 32 + 4 * DT_LOG_SIZE;

export interface GpuEuler1DConfig extends Omit<Euler1DConfig, 'flux'> {
  readonly flux: GpuFluxName;
}

/** Assemble the complete WGSL source for a configuration. */
export function euler1dShaderSource(flux: GpuFluxName, limiter: LimiterName): string {
  const configuration = /* wgsl */ `
fn limiter(a: f32, b: f32) -> f32 {
  return ${WGSL_LIMITER_FUNCTIONS[limiter]}(a, b);
}

fn numerical_flux(left: Primitive, right: Primitive) -> vec3f {
  return ${GPU_FLUX_FUNCTIONS[flux]}(left, right, params.gamma);
}
`;
  return [gasWgsl, fluxWgsl, limitersWgsl, configuration, euler1dWgsl].join('\n');
}

export interface GpuState1D {
  /** Simulated time: the double-precision sum of the time steps taken. */
  readonly time: number;
  readonly steps: number;
  readonly rho: Float32Array;
  readonly mom: Float32Array;
  readonly energy: Float32Array;
}

/**
 * Primitive variables of cell i of a state read back from the GPU, with
 * gamma rounded to 32 bits as the GPU solves with it (gpuPrimitive2D).
 */
export function gpuPrimitive(state: GpuState1D, i: number, gamma: number): Primitive1D {
  return primitiveFromConserved(state.rho[i]!, state.mom[i]!, state.energy[i]!, Math.fround(gamma));
}

interface Pipelines {
  readonly computeFaceFluxes: GPUComputePipeline;
  readonly updateCells: GPUComputePipeline;
  readonly reduceMaxSpeed: GPUComputePipeline;
  readonly finalizeTimeStep: GPUComputePipeline;
  readonly advanceClock: GPUComputePipeline;
}

export class GpuEuler1D {
  readonly config: GpuEuler1DConfig;
  readonly dx: number;

  private readonly device: GPUDevice;
  private readonly pipelines: Pipelines;
  private readonly sharedBindGroup: GPUBindGroup;
  private readonly paramsBuffer: GPUBuffer;
  private readonly clockBuffer: GPUBuffer;
  private readonly statusBuffer: GPUBuffer;
  private readonly dtLogBuffer: GPUBuffer;
  private readonly clockReadback: GPUBuffer;
  private readonly stateReadback: GPUBuffer;
  private readonly stateBuffers: readonly [GPUBuffer, GPUBuffer, GPUBuffer];
  private readonly stageBindGroups: StageBindGroups;
  private readonly buffers: BufferSet;
  private readonly exclusive = new ExclusiveRunner('GpuEuler1D');
  private readonly ledger = new StepLedger();
  private readonly nPartials: number;
  /** Index into stateBuffers of the buffer holding the current solution. */
  private current: StateIndex = 0;

  /** Create a solver, compiling its shaders. Throws with the compiler's messages on failure. */
  static async create(device: GPUDevice, config: GpuEuler1DConfig): Promise<GpuEuler1D> {
    validateConfig(config);
    const module = await compileShader(
      device,
      'euler1d',
      euler1dShaderSource(config.flux, config.limiter),
    );

    const storage = { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } };
    const sharedLayout = device.createBindGroupLayout({
      label: 'euler1d shared',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        ...[1, 2, 3, 4, 5].map((binding) => ({ ...storage, binding }) as GPUBindGroupLayoutEntry),
      ],
    });
    const stageLayout = device.createBindGroupLayout({
      label: 'euler1d stage',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
    });
    const layout = device.createPipelineLayout({ bindGroupLayouts: [sharedLayout, stageLayout] });
    const pipeline = (entryPoint: string) =>
      device.createComputePipelineAsync({
        label: entryPoint,
        layout,
        compute: { module, entryPoint },
      });
    const [computeFaceFluxes, updateCells, reduceMaxSpeed, finalizeTimeStep, advanceClock] =
      await Promise.all([
        pipeline('compute_face_fluxes'),
        pipeline('update_cells'),
        pipeline('reduce_max_speed'),
        pipeline('finalize_time_step'),
        pipeline('advance_clock'),
      ]);
    return new GpuEuler1D(device, config, sharedLayout, stageLayout, {
      computeFaceFluxes,
      updateCells,
      reduceMaxSpeed,
      finalizeTimeStep,
      advanceClock,
    });
  }

  private constructor(
    device: GPUDevice,
    config: GpuEuler1DConfig,
    sharedLayout: GPUBindGroupLayout,
    stageLayout: GPUBindGroupLayout,
    pipelines: Pipelines,
  ) {
    this.device = device;
    this.config = config;
    this.dx = (config.xMax - config.xMin) / config.nCells;
    this.pipelines = pipelines;
    this.nPartials = Math.ceil(config.nCells / WORKGROUP_SIZE);

    const usage = GPUBufferUsage;
    this.buffers = new BufferSet(device);
    const buffer = (label: string, size: number, flags: number) =>
      this.buffers.create(label, size, flags);
    const stateBytes = 16 * config.nCells;
    this.paramsBuffer = buffer('params', 32, usage.UNIFORM | usage.COPY_DST);
    this.clockBuffer = buffer('clock', 16, usage.STORAGE | usage.COPY_DST | usage.COPY_SRC);
    this.statusBuffer = buffer('status', 16, usage.STORAGE | usage.COPY_DST | usage.COPY_SRC);
    this.dtLogBuffer = buffer('dt log', 4 * DT_LOG_SIZE, usage.STORAGE | usage.COPY_SRC);
    this.clockReadback = buffer(
      'clock readback',
      CLOCK_READBACK_BYTES,
      usage.MAP_READ | usage.COPY_DST,
    );
    this.stateReadback = buffer('state readback', stateBytes, usage.MAP_READ | usage.COPY_DST);
    const faceFluxBuffer = buffer('face flux', 16 * (config.nCells + 1), usage.STORAGE);
    const partialsBuffer = buffer('partials', 4 * this.nPartials, usage.STORAGE);
    const stateFlags = usage.STORAGE | usage.COPY_DST | usage.COPY_SRC;
    this.stateBuffers = [
      buffer('state 0', stateBytes, stateFlags),
      buffer('state 1', stateBytes, stateFlags),
      buffer('state 2', stateBytes, stateFlags),
    ];
    const coefficientBuffers = RUNGE_KUTTA_STAGES[config.timeIntegrator].map(({ a, b }, i) =>
      this.buffers.createWith(
        `stage ${i} coefficients`,
        new Float32Array([a, b, 0, 0]),
        usage.UNIFORM,
      ),
    );
    this.stageBindGroups = new StageBindGroups(
      device,
      stageLayout,
      coefficientBuffers,
      this.stateBuffers,
    );

    this.sharedBindGroup = device.createBindGroup({
      label: 'euler1d shared',
      layout: sharedLayout,
      entries: [
        this.paramsBuffer,
        this.clockBuffer,
        this.statusBuffer,
        faceFluxBuffer,
        partialsBuffer,
        this.dtLogBuffer,
      ].map((b, binding) => ({ binding, resource: { buffer: b } })),
    });
    this.writeParams(0);
  }

  /**
   * Set the initial state to the cell averages of a primitive field and
   * reset the clock. Throws NonPhysicalStateError if the field is not
   * physical anywhere, before anything reaches the GPU.
   */
  setInitialCondition(field: (x: number) => Primitive1D): void {
    this.exclusive.assertIdle();
    const { xMin, nCells, gamma } = this.config;
    const { rho, mom, energy } = cellAverages1D(field, xMin, this.dx, nCells, gamma);
    const bad = firstNonPhysicalCell1D(rho, mom, energy, gamma);
    if (bad >= 0) {
      throw new NonPhysicalStateError(`non-physical initial state in cell ${bad}`);
    }
    const packed = new Float32Array(4 * nCells);
    for (let i = 0; i < nCells; i++) {
      packed[4 * i] = rho[i]!;
      packed[4 * i + 1] = mom[i]!;
      packed[4 * i + 2] = energy[i]!;
    }
    this.current = 0;
    this.ledger.reset();
    this.device.queue.writeBuffer(this.stateBuffers[0], 0, packed);
    this.device.queue.writeBuffer(this.clockBuffer, 0, new Uint32Array(4));
    this.device.queue.writeBuffer(this.statusBuffer, 0, new Uint32Array(4));
  }

  /**
   * Advance to `tEnd`. Steps are submitted in batches sized from the most
   * recent time step, so short advances cost few dispatches; the clock,
   * status flag and time-step log are checked after every batch. Throws if
   * more than `maxSteps` steps are needed by this call.
   */
  async advanceTo(tEnd: number, maxSteps = 1_000_000): Promise<void> {
    await this.exclusive.run(async () => {
      this.writeParams(tEnd);
      await advanceInBatches(
        tEnd,
        maxSteps,
        this.ledger,
        (count) => {
          this.submitSteps(count);
        },
        () => this.readClock(),
      );
    });
  }

  /** Read the current solution back to the CPU. Throws if the solution is non-physical. */
  async readState(): Promise<GpuState1D> {
    return this.exclusive.run(async () => {
      const { nCells } = this.config;
      const packed = new Float32Array(
        await readBuffer(
          this.device,
          this.stateBuffers[this.current],
          this.stateReadback,
          16 * nCells,
        ),
      );

      const reading = await this.readClock();
      if ((reading.status & STATUS_NON_PHYSICAL) !== 0) {
        throw new NonPhysicalStateError('the GPU solution is non-physical');
      }
      const rho = new Float32Array(nCells);
      const mom = new Float32Array(nCells);
      const energy = new Float32Array(nCells);
      for (let i = 0; i < nCells; i++) {
        rho[i] = packed[4 * i]!;
        mom[i] = packed[4 * i + 1]!;
        energy[i] = packed[4 * i + 2]!;
      }
      return { time: this.ledger.elapsed, steps: this.ledger.steps, rho, mom, energy };
    });
  }

  /** Release all GPU buffers. The solver cannot be used afterwards. */
  destroy(): void {
    this.buffers.destroyAll();
  }

  private writeParams(tEnd: number): void {
    const { nCells, left, right, gamma, cfl } = this.config;
    const data = new ArrayBuffer(32);
    new Uint32Array(data, 0, 4).set([
      nCells,
      BOUNDARY_CODES[left],
      BOUNDARY_CODES[right],
      this.nPartials,
    ]);
    new Float32Array(data, 16, 4).set([this.dx, gamma, cfl, tEnd]);
    this.device.queue.writeBuffer(this.paramsBuffer, 0, data);
  }

  private submitSteps(count: number): void {
    const { nCells } = this.config;
    const cellGroups = Math.ceil(nCells / WORKGROUP_SIZE);
    const faceGroups = Math.ceil((nCells + 1) / WORKGROUP_SIZE);
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setBindGroup(0, this.sharedBindGroup);

    for (let step = 0; step < count; step++) {
      const plan = stagePlan(this.current, this.config.timeIntegrator);
      // The first stage reads the current solution as `src`, so its bind
      // group also serves the wave-speed reduction.
      pass.setBindGroup(1, this.stageBindGroups.get(plan[0]!));
      pass.setPipeline(this.pipelines.reduceMaxSpeed);
      pass.dispatchWorkgroups(this.nPartials);
      pass.setPipeline(this.pipelines.finalizeTimeStep);
      pass.dispatchWorkgroups(1);

      for (const stage of plan) {
        pass.setBindGroup(1, this.stageBindGroups.get(stage));
        pass.setPipeline(this.pipelines.computeFaceFluxes);
        pass.dispatchWorkgroups(faceGroups);
        pass.setPipeline(this.pipelines.updateCells);
        pass.dispatchWorkgroups(cellGroups);
      }
      pass.setPipeline(this.pipelines.advanceClock);
      pass.dispatchWorkgroups(1);
      this.current = plan[plan.length - 1]!.dst;
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private async readClock(): Promise<ControlReading> {
    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(this.clockBuffer, 0, this.clockReadback, 0, 16);
    encoder.copyBufferToBuffer(this.statusBuffer, 0, this.clockReadback, 16, 16);
    encoder.copyBufferToBuffer(this.dtLogBuffer, 0, this.clockReadback, 32, 4 * DT_LOG_SIZE);
    this.device.queue.submit([encoder.finish()]);
    await this.clockReadback.mapAsync(GPUMapMode.READ);
    const bytes = this.clockReadback.getMappedRange().slice(0);
    this.clockReadback.unmap();
    // Layout: clock = t, t_error, dt (f32), steps (u32); status (u32); dt log (f32).
    const asFloat = new Float32Array(bytes);
    const asUint = new Uint32Array(bytes);
    return {
      gpuTime: asFloat[0]! + asFloat[1]!,
      dt: asFloat[2]!,
      steps: asUint[3]!,
      status: asUint[4]!,
      dtLog: asFloat.subarray(8),
    };
  }
}

function validateConfig(config: GpuEuler1DConfig): void {
  validateGrid1DConfig(config);
  // Configurations can come from untyped sources (for example a page's
  // <select>), so check at run time what the type system assumes.
  const flux: string = config.flux;
  if (!isGpuFlux(flux)) {
    throw new RangeError(`flux ${flux} is not available on the GPU`);
  }
}
