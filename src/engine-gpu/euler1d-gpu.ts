/**
 * One-dimensional Euler solver on WebGPU: the GPU twin of
 * src/engine-cpu/euler1d.ts, running the same scheme in 32-bit floats.
 *
 * The whole time loop runs on the GPU, including the time-step reduction,
 * so the CPU only submits batches of steps and reads back the clock and a
 * status flag between batches. A non-physical state raises the flag and is
 * reported as a NonPhysicalStateError, as in the CPU engine.
 */

import type { BoundaryCondition, Euler1DConfig } from '../engine-cpu/euler1d';
import type { Primitive1D } from '../scheme/gas';
import type { LimiterName } from '../scheme/limiters';
import { validateGrid1DConfig } from '../solver/config';
import { NonPhysicalStateError } from '../solver/errors';
import { cellAverages1D } from '../solver/initial-condition';
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

const LIMITER_FUNCTIONS: Record<LimiterName, string> = {
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

/** Runge-Kutta stages as dst = a * u0 + b * (src + dt * L(src)); see euler1d.wgsl. */
const STAGES = {
  forwardEuler: [{ a: 0, b: 1 }],
  ssprk2: [
    { a: 0, b: 1 },
    { a: 1 / 2, b: 1 / 2 },
  ],
  ssprk3: [
    { a: 0, b: 1 },
    { a: 3 / 4, b: 1 / 4 },
    { a: 1 / 3, b: 2 / 3 },
  ],
} as const;

const WORKGROUP_SIZE = 64;
const STATUS_NON_PHYSICAL = 1;

export interface GpuEuler1DConfig extends Omit<Euler1DConfig, 'flux'> {
  readonly flux: GpuFluxName;
}

/** Assemble the complete WGSL source for a configuration. */
export function euler1dShaderSource(flux: GpuFluxName, limiter: LimiterName): string {
  const configuration = /* wgsl */ `
fn limiter(a: f32, b: f32) -> f32 {
  return ${LIMITER_FUNCTIONS[limiter]}(a, b);
}

fn numerical_flux(left: Primitive, right: Primitive) -> vec3f {
  return ${GPU_FLUX_FUNCTIONS[flux]}(left, right, params.gamma);
}
`;
  return [gasWgsl, fluxWgsl, limitersWgsl, configuration, euler1dWgsl].join('\n');
}

export interface GpuState1D {
  readonly time: number;
  readonly steps: number;
  readonly rho: Float32Array;
  readonly mom: Float32Array;
  readonly energy: Float32Array;
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
  private readonly readbackBuffer: GPUBuffer;
  private readonly stateBuffers: readonly [GPUBuffer, GPUBuffer, GPUBuffer];
  private readonly coefficientBuffers: GPUBuffer[];
  private readonly ownedBuffers: GPUBuffer[] = [];
  private readonly stageBindGroups = new Map<string, GPUBindGroup>();
  private readonly nPartials: number;
  /** Index into stateBuffers of the buffer holding the current solution. */
  private current: StateIndex = 0;

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

    const sharedLayout = device.createBindGroupLayout({
      label: 'euler1d shared',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
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
    this.readbackBuffer = buffer(
      'readback',
      Math.max(32, stateBytes),
      usage.MAP_READ | usage.COPY_DST,
    );
    const faceFluxBuffer = buffer('face flux', 16 * (config.nCells + 1), usage.STORAGE);
    const partialsBuffer = buffer('partials', 4 * this.nPartials, usage.STORAGE);
    const stateFlags = usage.STORAGE | usage.COPY_DST | usage.COPY_SRC;
    this.stateBuffers = [
      buffer('state 0', stateBytes, stateFlags),
      buffer('state 1', stateBytes, stateFlags),
      buffer('state 2', stateBytes, stateFlags),
    ];
    this.coefficientBuffers = STAGES[config.timeIntegrator].map(({ a, b }, i) => {
      const c = buffer(`stage ${i} coefficients`, 16, usage.UNIFORM | usage.COPY_DST);
      device.queue.writeBuffer(c, 0, new Float32Array([a, b, 0, 0]));
      return c;
    });

    this.sharedBindGroup = device.createBindGroup({
      label: 'euler1d shared',
      layout: sharedLayout,
      entries: [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: { buffer: this.clockBuffer } },
        { binding: 2, resource: { buffer: this.statusBuffer } },
        { binding: 3, resource: { buffer: faceFluxBuffer } },
        { binding: 4, resource: { buffer: partialsBuffer } },
      ],
    });
    this.writeParams(0);
  }

  /** Set the initial state to the cell averages of a primitive field and reset the clock. */
  setInitialCondition(field: (x: number) => Primitive1D): void {
    const { xMin, nCells, gamma } = this.config;
    const averages = cellAverages1D(field, xMin, this.dx, nCells, gamma);
    const packed = new Float32Array(4 * nCells);
    for (let i = 0; i < nCells; i++) {
      packed[4 * i] = averages.rho[i]!;
      packed[4 * i + 1] = averages.mom[i]!;
      packed[4 * i + 2] = averages.energy[i]!;
    }
    this.current = 0;
    this.device.queue.writeBuffer(this.stateBuffers[0], 0, packed);
    this.device.queue.writeBuffer(this.clockBuffer, 0, new Uint32Array(4));
    this.device.queue.writeBuffer(this.statusBuffer, 0, new Uint32Array(4));
  }

  /**
   * Advance to `tEnd`, submitting `stepsPerBatch` steps at a time and
   * checking the clock and status flag after each batch.
   */
  async advanceTo(tEnd: number, stepsPerBatch = 64, maxSteps = 1_000_000): Promise<void> {
    this.writeParams(tEnd);
    for (;;) {
      this.submitSteps(stepsPerBatch);
      const { time, steps, status } = await this.readClock();
      if ((status & STATUS_NON_PHYSICAL) !== 0) {
        throw new NonPhysicalStateError(
          `non-physical state on the GPU between steps ${steps - stepsPerBatch} and ${steps}`,
        );
      }
      if (time >= Math.fround(tEnd) * (1 - 1e-9)) return;
      if (steps >= maxSteps) throw new Error(`exceeded ${maxSteps} steps`);
    }
  }

  /** Read the current solution back to the CPU. */
  async readState(): Promise<GpuState1D> {
    const { nCells } = this.config;
    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(
      this.stateBuffers[this.current],
      0,
      this.readbackBuffer,
      0,
      16 * nCells,
    );
    this.device.queue.submit([encoder.finish()]);
    await this.readbackBuffer.mapAsync(GPUMapMode.READ, 0, 16 * nCells);
    const packed = new Float32Array(this.readbackBuffer.getMappedRange(0, 16 * nCells).slice(0));
    this.readbackBuffer.unmap();

    const rho = new Float32Array(nCells);
    const mom = new Float32Array(nCells);
    const energy = new Float32Array(nCells);
    for (let i = 0; i < nCells; i++) {
      rho[i] = packed[4 * i]!;
      mom[i] = packed[4 * i + 1]!;
      energy[i] = packed[4 * i + 2]!;
    }
    const { time, steps } = await this.readClock();
    return { time, steps, rho, mom, energy };
  }

  /** Release all GPU buffers. The solver cannot be used afterwards. */
  destroy(): void {
    for (const b of this.ownedBuffers) b.destroy();
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
   * Buffer roles for each stage of one step. With the current solution in
   * buffer s and the other two buffers p and q:
   *   forward Euler: p = step(s)
   *   SSP-RK2:       p = step(s);  q = (s + step(p)) / 2
   *   SSP-RK3:       p = step(s);  q = 3/4 s + 1/4 step(p);  p = 1/3 s + 2/3 step(q)
   */
  private stagePlan(): Stage[] {
    const s = this.current;
    const p = ((s + 1) % 3) as StateIndex;
    const q = ((s + 2) % 3) as StateIndex;
    switch (this.config.timeIntegrator) {
      case 'forwardEuler':
        return [{ u0: s, src: s, dst: p, coefficients: 0 }];
      case 'ssprk2':
        return [
          { u0: s, src: s, dst: p, coefficients: 0 },
          { u0: s, src: p, dst: q, coefficients: 1 },
        ];
      case 'ssprk3':
        return [
          { u0: s, src: s, dst: p, coefficients: 0 },
          { u0: s, src: p, dst: q, coefficients: 1 },
          { u0: s, src: q, dst: p, coefficients: 2 },
        ];
    }
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

  private async readClock(): Promise<{ time: number; steps: number; status: number }> {
    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(this.clockBuffer, 0, this.readbackBuffer, 0, 16);
    encoder.copyBufferToBuffer(this.statusBuffer, 0, this.readbackBuffer, 16, 16);
    this.device.queue.submit([encoder.finish()]);
    await this.readbackBuffer.mapAsync(GPUMapMode.READ, 0, 32);
    const bytes = this.readbackBuffer.getMappedRange(0, 32).slice(0);
    this.readbackBuffer.unmap();
    const asFloat = new Float32Array(bytes);
    const asUint = new Uint32Array(bytes);
    // Clock layout: t, t_error, dt (f32), steps (u32); then the status word.
    return { time: asFloat[0]! + asFloat[1]!, steps: asUint[3]!, status: asUint[4]! };
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
