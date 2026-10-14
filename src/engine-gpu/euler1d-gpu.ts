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
import euler1dWgsl from './shaders/euler1d.wgsl?raw';
import fluxWgsl from './shaders/flux.wgsl?raw';
import gasWgsl from './shaders/gas.wgsl?raw';
import limitersWgsl from './shaders/limiters.wgsl?raw';

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
const STATUS_NON_PHYSICAL = 1;
/** Matches DT_LOG_SIZE in euler1d.wgsl: the most steps submitted in one batch. */
const DT_LOG_SIZE = 256;
/** Bytes read back after each batch: clock (16), status (16), dt log. */
const CLOCK_READBACK_BYTES = 32 + 4 * DT_LOG_SIZE;

/**
 * Whether a run asked to stop at `tEnd` has arrived. The GPU stores t_end in
 * 32 bits, so arrival means reaching the f32 value of tEnd.
 */
export function hasReached(time: number, tEnd: number): boolean {
  return time >= Math.fround(tEnd) * (1 - 1e-9);
}

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

/** Primitive variables of cell i of a state read back from the GPU. */
export function gpuPrimitive(state: GpuState1D, i: number, gamma: number): Primitive1D {
  return primitiveFromConserved(state.rho[i]!, state.mom[i]!, state.energy[i]!, gamma);
}

/** Index of one of the three state buffers. */
type StateIndex = 0 | 1 | 2;

interface Stage {
  readonly u0: StateIndex;
  readonly src: StateIndex;
  readonly dst: StateIndex;
  /** Index into the stage coefficient buffers. */
  readonly coefficients: number;
}

interface Pipelines {
  readonly computeFaceFluxes: GPUComputePipeline;
  readonly updateCells: GPUComputePipeline;
  readonly reduceMaxSpeed: GPUComputePipeline;
  readonly finalizeTimeStep: GPUComputePipeline;
  readonly advanceClock: GPUComputePipeline;
}

interface ClockReading {
  /** t + t_error as kept by the GPU. */
  readonly gpuTime: number;
  /** The most recent time step. */
  readonly dt: number;
  readonly steps: number;
  readonly status: number;
  readonly dtLog: Float32Array;
}

export class GpuEuler1D {
  readonly config: GpuEuler1DConfig;
  readonly dx: number;

  private readonly device: GPUDevice;
  private readonly pipelines: Pipelines;
  private readonly sharedBindGroup: GPUBindGroup;
  private readonly stageLayout: GPUBindGroupLayout;
  private readonly paramsBuffer: GPUBuffer;
  private readonly clockBuffer: GPUBuffer;
  private readonly statusBuffer: GPUBuffer;
  private readonly dtLogBuffer: GPUBuffer;
  private readonly clockReadback: GPUBuffer;
  private readonly stateReadback: GPUBuffer;
  private readonly stateBuffers: readonly [GPUBuffer, GPUBuffer, GPUBuffer];
  private readonly coefficientBuffers: GPUBuffer[];
  private readonly ownedBuffers: GPUBuffer[] = [];
  private readonly stageBindGroups = new Map<string, GPUBindGroup>();
  private readonly nPartials: number;
  /** Index into stateBuffers of the buffer holding the current solution. */
  private current: StateIndex = 0;
  /** Steps whose dt has been added to `elapsed`. */
  private loggedSteps = 0;
  /** Simulated time: double-precision sum of every dt taken. */
  private elapsed = 0;
  private busy = false;

  /** Create a solver, compiling its shaders. Throws with the compiler's messages on failure. */
  static async create(device: GPUDevice, config: GpuEuler1DConfig): Promise<GpuEuler1D> {
    validateConfig(config);
    const module = device.createShaderModule({
      label: 'euler1d',
      code: euler1dShaderSource(config.flux, config.limiter),
    });
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter((m) => m.type === 'error');
    if (errors.length > 0) {
      throw new Error(
        `WGSL compilation failed:\n${errors.map((m) => `${m.lineNum}:${m.linePos} ${m.message}`).join('\n')}`,
      );
    }

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
    this.stageLayout = stageLayout;
    this.nPartials = Math.ceil(config.nCells / WORKGROUP_SIZE);

    const usage = GPUBufferUsage;
    const buffer = (label: string, size: number, flags: number) => {
      const b = device.createBuffer({ label, size, usage: flags });
      this.ownedBuffers.push(b);
      return b;
    };
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
    this.coefficientBuffers = RUNGE_KUTTA_STAGES[config.timeIntegrator].map(({ a, b }, i) => {
      const c = buffer(`stage ${i} coefficients`, 16, usage.UNIFORM | usage.COPY_DST);
      device.queue.writeBuffer(c, 0, new Float32Array([a, b, 0, 0]));
      return c;
    });

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
    this.assertIdle();
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
    this.loggedSteps = 0;
    this.elapsed = 0;
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
    await this.exclusive(async () => {
      this.writeParams(tEnd);
      const firstStep = this.loggedSteps;
      // The first batch is a single step: no time step is known yet.
      let batch = 1;
      for (;;) {
        const before = this.loggedSteps;
        this.submitSteps(batch);
        const reading = await this.readClock();
        if ((reading.status & STATUS_NON_PHYSICAL) !== 0) {
          throw new NonPhysicalStateError(
            `non-physical state on the GPU between steps ${before} and ${reading.steps}`,
          );
        }
        this.accountForSteps(reading);
        if (hasReached(this.elapsed, tEnd)) return;
        if (this.loggedSteps - firstStep >= maxSteps) {
          throw new Error(`advanceTo(${tEnd}) needed more than ${maxSteps} steps`);
        }
        // Enough steps to finish at the current time step, plus one.
        const remaining = Math.ceil((tEnd - this.elapsed) / reading.dt) + 1;
        batch = Math.min(Math.max(remaining, 1), DT_LOG_SIZE);
      }
    });
  }

  /** Read the current solution back to the CPU. Throws if the solution is non-physical. */
  async readState(): Promise<GpuState1D> {
    return this.exclusive(async () => {
      const { nCells } = this.config;
      const bytes = 16 * nCells;
      const encoder = this.device.createCommandEncoder();
      encoder.copyBufferToBuffer(this.stateBuffers[this.current], 0, this.stateReadback, 0, bytes);
      this.device.queue.submit([encoder.finish()]);
      await this.stateReadback.mapAsync(GPUMapMode.READ, 0, bytes);
      const packed = new Float32Array(this.stateReadback.getMappedRange(0, bytes).slice(0));
      this.stateReadback.unmap();

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
      return { time: this.elapsed, steps: this.loggedSteps, rho, mom, energy };
    });
  }

  /** Release all GPU buffers. The solver cannot be used afterwards. */
  destroy(): void {
    for (const b of this.ownedBuffers) b.destroy();
  }

  /**
   * Add the time steps of the latest batch to the double-precision sum and
   * check the GPU clock against it. A mismatch means the GPU compiler
   * defeated the clock's compensated summation (see advance_clock).
   */
  private accountForSteps(reading: ClockReading): void {
    for (let s = this.loggedSteps; s < reading.steps; s++) {
      this.elapsed += reading.dtLog[s % DT_LOG_SIZE]!;
    }
    this.loggedSteps = reading.steps;
    const drift = Math.abs(reading.gpuTime - this.elapsed);
    if (drift > 1e-10 * Math.max(this.elapsed, Number.MIN_VALUE)) {
      throw new Error(
        `GPU clock drifted from the sum of its time steps by ${drift.toExponential(2)}; ` +
          'this GPU compiler does not preserve compensated summation',
      );
    }
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
      const plan = this.stagePlan();
      // The first stage reads the current solution as `src`, so its bind
      // group also serves the wave-speed reduction.
      pass.setBindGroup(1, this.stageBindGroup(plan[0]!));
      pass.setPipeline(this.pipelines.reduceMaxSpeed);
      pass.dispatchWorkgroups(this.nPartials);
      pass.setPipeline(this.pipelines.finalizeTimeStep);
      pass.dispatchWorkgroups(1);

      for (const stage of plan) {
        pass.setBindGroup(1, this.stageBindGroup(stage));
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

  /**
   * Buffer roles for each Runge-Kutta stage of one step. With the current
   * solution in buffer s, stages write alternately to the other two buffers,
   * so a stage never writes a buffer it reads.
   */
  private stagePlan(): Stage[] {
    const s = this.current;
    const others = [((s + 1) % 3) as StateIndex, ((s + 2) % 3) as StateIndex] as const;
    return RUNGE_KUTTA_STAGES[this.config.timeIntegrator].map((_, n) => ({
      u0: s,
      src: n === 0 ? s : others[(n - 1) % 2]!,
      dst: others[n % 2]!,
      coefficients: n,
    }));
  }

  private stageBindGroup(stage: Stage): GPUBindGroup {
    const key = `${stage.u0}${stage.src}${stage.dst}${stage.coefficients}`;
    let group = this.stageBindGroups.get(key);
    if (group === undefined) {
      group = this.device.createBindGroup({
        label: `stage ${key}`,
        layout: this.stageLayout,
        entries: [
          { binding: 0, resource: { buffer: this.coefficientBuffers[stage.coefficients]! } },
          { binding: 1, resource: { buffer: this.stateBuffers[stage.u0] } },
          { binding: 2, resource: { buffer: this.stateBuffers[stage.src] } },
          { binding: 3, resource: { buffer: this.stateBuffers[stage.dst] } },
        ],
      });
      this.stageBindGroups.set(key, group);
    }
    return group;
  }

  private async readClock(): Promise<ClockReading> {
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

  private assertIdle(): void {
    if (this.busy) throw new Error('GpuEuler1D: await the previous operation first');
  }

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    this.assertIdle();
    this.busy = true;
    try {
      return await operation();
    } finally {
      this.busy = false;
    }
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
