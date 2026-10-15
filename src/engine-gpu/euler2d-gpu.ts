/**
 * Two-dimensional Euler solver on WebGPU: the GPU twin of
 * src/engine-cpu/euler2d.ts, running the same scheme in 32-bit floats.
 *
 * Grid metrics are computed once in double precision on the CPU and
 * uploaded. The time loop runs entirely on the GPU; the CPU submits batches
 * of steps and checks the control block (clock, status flag, time-step log)
 * between them, as the 1D GPU engine does.
 *
 * The solver performs one operation at a time: await each call before
 * making the next. Overlapping calls throw rather than corrupt state.
 */

import type { BoundaryCondition2D, Euler2DConfig, Side } from '../engine-cpu/euler2d';
import { computeMetrics, type GridMetrics } from '../grid/structured';
import { pressureFromConserved2D } from '../scheme/gas';
import type { Primitive2D } from '../scheme/flux';
import { validateGrid2DConfig } from '../solver/config';
import { NonPhysicalStateError } from '../solver/errors';
import { RUNGE_KUTTA_STAGES } from '../solver/runge-kutta';
import { WGSL_LIMITER_FUNCTIONS, isGpuFlux, type GpuFluxName } from './euler1d-gpu';
import { BufferSet, ExclusiveRunner, compileShader, readBuffer } from './gpu-common';
import euler2dWgsl from './shaders/euler2d.wgsl?raw';
import fluxWgsl from './shaders/flux.wgsl?raw';
import gasWgsl from './shaders/gas.wgsl?raw';
import limitersWgsl from './shaders/limiters.wgsl?raw';

const GPU_FACE_FLUX_FUNCTIONS: Readonly<Record<GpuFluxName, string>> = {
  hllc: 'hllc_face_flux',
  rusanov: 'rusanov_face_flux',
};

/** Boundary condition kinds as coded in euler2d.wgsl. */
const BOUNDARY_KINDS: Readonly<Record<BoundaryCondition2D['kind'], number>> = {
  inflow: 0,
  outflow: 1,
  wall: 2,
  periodic: 3,
};

/** Sides in the order euler2d.wgsl expects them. */
const SIDES: readonly Side[] = ['iMin', 'iMax', 'jMin', 'jMax'];

const WORKGROUP_SIZE = 64;
const STATUS_NON_PHYSICAL = 1;
/** Matches DT_LOG_SIZE in euler2d.wgsl: the most steps submitted in one batch. */
const DT_LOG_SIZE = 256;
/** Size of the Control struct in euler2d.wgsl: six 4-byte words and the dt log. */
const CONTROL_BYTES = 24 + 4 * DT_LOG_SIZE;
/** Size of the Params struct in euler2d.wgsl. */
const PARAMS_BYTES = 112;

export interface GpuEuler2DConfig extends Omit<Euler2DConfig, 'flux'> {
  readonly flux: GpuFluxName;
}

/** Assemble the complete WGSL source for a configuration. */
export function euler2dShaderSource(config: Pick<GpuEuler2DConfig, 'flux' | 'limiter'>): string {
  const configuration = /* wgsl */ `
fn limiter(a: f32, b: f32) -> f32 {
  return ${WGSL_LIMITER_FUNCTIONS[config.limiter]}(a, b);
}

fn numerical_face_flux(left: FaceState, right: FaceState) -> vec4f {
  return ${GPU_FACE_FLUX_FUNCTIONS[config.flux]}(left, right, params.gamma);
}
`;
  return [gasWgsl, fluxWgsl, limitersWgsl, configuration, euler2dWgsl].join('\n');
}

export interface GpuState2D {
  /** Simulated time (global stepping): double-precision sum of the steps taken. */
  readonly time: number;
  readonly steps: number;
  /** Conserved variables of each cell, cell (i, j) at index i + j * ni. */
  readonly rho: Float32Array;
  readonly mu: Float32Array;
  readonly mv: Float32Array;
  readonly energy: Float32Array;
}

/** Primitive variables of cell c of a state read back from the GPU. */
export function gpuPrimitive2D(state: GpuState2D, c: number, gamma: number): Primitive2D {
  const rho = state.rho[c]!;
  const mu = state.mu[c]!;
  const mv = state.mv[c]!;
  return {
    rho,
    u: mu / rho,
    v: mv / rho,
    p: pressureFromConserved2D(rho, mu, mv, state.energy[c]!, gamma),
  };
}

type StateIndex = 0 | 1 | 2;

interface Stage {
  readonly u0: StateIndex;
  readonly src: StateIndex;
  readonly dst: StateIndex;
  readonly coefficients: number;
}

const ENTRY_POINTS = [
  'compute_time_steps',
  'finalize_time_step',
  'compute_i_fluxes',
  'compute_j_fluxes',
  'update_cells',
  'advance_clock',
  'residual_norm_partials',
  'finalize_residual_norm',
] as const;
type EntryPoint = (typeof ENTRY_POINTS)[number];

interface ControlReading {
  readonly gpuTime: number;
  readonly dt: number;
  readonly steps: number;
  readonly status: number;
  readonly residualNorm: number;
  readonly dtLog: Float32Array;
}

export class GpuEuler2D {
  readonly config: GpuEuler2DConfig;
  readonly metrics: GridMetrics;

  private readonly device: GPUDevice;
  private readonly pipelines: Readonly<Record<EntryPoint, GPUComputePipeline>>;
  private readonly sharedBindGroup: GPUBindGroup;
  private readonly stageLayout: GPUBindGroupLayout;
  private readonly buffers: BufferSet;
  private readonly exclusive = new ExclusiveRunner('GpuEuler2D');
  private readonly paramsBuffer: GPUBuffer;
  private readonly controlBuffer: GPUBuffer;
  private readonly controlReadback: GPUBuffer;
  private readonly stateReadback: GPUBuffer;
  private readonly stateBuffers: readonly [GPUBuffer, GPUBuffer, GPUBuffer];
  private readonly coefficientBuffers: GPUBuffer[];
  private readonly stageBindGroups = new Map<string, GPUBindGroup>();
  private readonly nCells: number;
  private readonly nPartials: number;
  private current: StateIndex = 0;
  private loggedSteps = 0;
  private elapsed = 0;

  /** Create a solver, compiling its shaders. Throws with the compiler's messages on failure. */
  static async create(device: GPUDevice, config: GpuEuler2DConfig): Promise<GpuEuler2D> {
    validateGrid2DConfig(config);
    const flux: string = config.flux;
    if (!isGpuFlux(flux)) throw new RangeError(`flux ${flux} is not available on the GPU`);

    const module = await compileShader(device, 'euler2d', euler2dShaderSource(config));
    const storage = (binding: number, type: GPUBufferBindingType): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type },
    });
    const sharedLayout = device.createBindGroupLayout({
      label: 'euler2d shared',
      entries: [
        storage(0, 'uniform'),
        storage(1, 'read-only-storage'),
        storage(2, 'storage'),
        storage(3, 'storage'),
        storage(4, 'storage'),
      ],
    });
    const stageLayout = device.createBindGroupLayout({
      label: 'euler2d stage',
      entries: [
        storage(0, 'uniform'),
        storage(1, 'read-only-storage'),
        storage(2, 'read-only-storage'),
        storage(3, 'storage'),
      ],
    });
    const layout = device.createPipelineLayout({ bindGroupLayouts: [sharedLayout, stageLayout] });
    const compiled = await Promise.all(
      ENTRY_POINTS.map((entryPoint) =>
        device.createComputePipelineAsync({
          label: entryPoint,
          layout,
          compute: { module, entryPoint },
        }),
      ),
    );
    const pipelines = Object.fromEntries(
      ENTRY_POINTS.map((name, k) => [name, compiled[k]!]),
    ) as Record<EntryPoint, GPUComputePipeline>;
    return new GpuEuler2D(device, config, sharedLayout, stageLayout, pipelines);
  }

  private constructor(
    device: GPUDevice,
    config: GpuEuler2DConfig,
    sharedLayout: GPUBindGroupLayout,
    stageLayout: GPUBindGroupLayout,
    pipelines: Record<EntryPoint, GPUComputePipeline>,
  ) {
    this.device = device;
    this.config = config;
    this.pipelines = pipelines;
    this.stageLayout = stageLayout;
    this.metrics = computeMetrics(config.grid, config.geometry);
    const { ni, nj } = this.metrics;
    this.nCells = ni * nj;
    this.nPartials = Math.ceil(this.nCells / WORKGROUP_SIZE);

    const usage = GPUBufferUsage;
    this.buffers = new BufferSet(device);
    const b = this.buffers;
    const stateBytes = 16 * this.nCells;
    this.paramsBuffer = b.create('params', PARAMS_BYTES, usage.UNIFORM | usage.COPY_DST);
    const geometryBuffer = b.createWith('geometry', packGeometry(this.metrics), usage.STORAGE);
    this.controlBuffer = b.create(
      'control',
      CONTROL_BYTES,
      usage.STORAGE | usage.COPY_DST | usage.COPY_SRC,
    );
    const faceFluxBuffer = b.create(
      'face flux',
      16 * ((ni + 1) * nj + ni * (nj + 1)),
      usage.STORAGE,
    );
    const scratchBuffer = b.create('scratch', 4 * (this.nCells + this.nPartials), usage.STORAGE);
    this.controlReadback = b.create(
      'control readback',
      CONTROL_BYTES,
      usage.MAP_READ | usage.COPY_DST,
    );
    this.stateReadback = b.create('state readback', stateBytes, usage.MAP_READ | usage.COPY_DST);
    const stateFlags = usage.STORAGE | usage.COPY_DST | usage.COPY_SRC;
    this.stateBuffers = [
      b.create('state 0', stateBytes, stateFlags),
      b.create('state 1', stateBytes, stateFlags),
      b.create('state 2', stateBytes, stateFlags),
    ];
    this.coefficientBuffers = RUNGE_KUTTA_STAGES[config.timeIntegrator].map(({ a, b: bb }, i) =>
      b.createWith(`stage ${i} coefficients`, new Float32Array([a, bb, 0, 0]), usage.UNIFORM),
    );

    this.sharedBindGroup = device.createBindGroup({
      label: 'euler2d shared',
      layout: sharedLayout,
      entries: [
        this.paramsBuffer,
        geometryBuffer,
        this.controlBuffer,
        faceFluxBuffer,
        scratchBuffer,
      ].map((buffer, binding) => ({ binding, resource: { buffer } })),
    });
    this.writeParams(0);
  }

  /** The GPU buffer holding the current solution, as (rho, rho u, rho v, E) per cell, for rendering. */
  get stateBuffer(): GPUBuffer {
    return this.stateBuffers[this.current];
  }

  /**
   * Set every cell to the field's value at its centroid and reset the
   * clock. Throws NonPhysicalStateError before anything reaches the GPU if
   * the field is not physical somewhere.
   */
  setInitialCondition(field: (x: number, y: number) => Primitive2D): void {
    this.exclusive.assertIdle();
    const { gamma } = this.config;
    const { centroidX, centroidY } = this.metrics;
    const packed = new Float32Array(4 * this.nCells);
    for (let c = 0; c < this.nCells; c++) {
      const w = field(centroidX[c]!, centroidY[c]!);
      if (!(w.rho > 0 && w.p > 0 && Number.isFinite(w.u) && Number.isFinite(w.v))) {
        throw new NonPhysicalStateError(`non-physical initial state in cell ${c}`);
      }
      packed[4 * c] = w.rho;
      packed[4 * c + 1] = w.rho * w.u;
      packed[4 * c + 2] = w.rho * w.v;
      packed[4 * c + 3] = w.p / (gamma - 1) + 0.5 * w.rho * (w.u * w.u + w.v * w.v);
    }
    this.current = 0;
    this.loggedSteps = 0;
    this.elapsed = 0;
    this.device.queue.writeBuffer(this.stateBuffers[0], 0, packed);
    this.device.queue.writeBuffer(this.controlBuffer, 0, new Uint32Array(CONTROL_BYTES / 4));
  }

  /** Take `count` steps (local or global time stepping) towards a steady state. */
  async iterate(count: number): Promise<void> {
    await this.exclusive.run(async () => {
      this.writeParams(Infinity);
      let remaining = count;
      while (remaining > 0) {
        const batch = Math.min(remaining, DT_LOG_SIZE);
        this.submitSteps(batch);
        this.accountForSteps(await this.readControl());
        remaining -= batch;
      }
    });
  }

  /** Advance to `tEnd` with global time steps. */
  async advanceTo(tEnd: number, maxSteps = 1_000_000): Promise<void> {
    if (this.config.timeStepping !== 'global') {
      throw new Error('advanceTo needs global time stepping; use iterate() for local stepping');
    }
    await this.exclusive.run(async () => {
      this.writeParams(tEnd);
      const firstStep = this.loggedSteps;
      let batch = 1;
      for (;;) {
        this.submitSteps(batch);
        const reading = await this.readControl();
        this.accountForSteps(reading);
        if (this.elapsed >= Math.fround(tEnd) * (1 - 1e-9)) return;
        if (this.loggedSteps - firstStep >= maxSteps) {
          throw new Error(`advanceTo(${tEnd}) needed more than ${maxSteps} steps`);
        }
        const needed = Math.ceil((tEnd - this.elapsed) / reading.dt) + 1;
        batch = Math.min(Math.max(needed, 1), DT_LOG_SIZE);
      }
    });
  }

  /** Root-mean-square density residual d(rho)/dt of the current solution. */
  async densityResidualNorm(): Promise<number> {
    return this.exclusive.run(async () => {
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setBindGroup(0, this.sharedBindGroup);
      pass.setBindGroup(1, this.stageBindGroup(this.stagePlan()[0]!));
      this.dispatchFluxes(pass);
      pass.setPipeline(this.pipelines.residual_norm_partials);
      pass.dispatchWorkgroups(this.nPartials);
      pass.setPipeline(this.pipelines.finalize_residual_norm);
      pass.dispatchWorkgroups(1);
      pass.end();
      this.device.queue.submit([encoder.finish()]);
      return (await this.readControl()).residualNorm;
    });
  }

  /** Read the current solution back to the CPU. Throws if it is non-physical. */
  async readState(): Promise<GpuState2D> {
    return this.exclusive.run(async () => {
      const bytes = await readBuffer(
        this.device,
        this.stateBuffer,
        this.stateReadback,
        16 * this.nCells,
      );
      if (((await this.readControl()).status & STATUS_NON_PHYSICAL) !== 0) {
        throw new NonPhysicalStateError('the GPU solution is non-physical');
      }
      const packed = new Float32Array(bytes);
      const component = (k: number) =>
        Float32Array.from({ length: this.nCells }, (_, c) => packed[4 * c + k]!);
      return {
        time: this.elapsed,
        steps: this.loggedSteps,
        rho: component(0),
        mu: component(1),
        mv: component(2),
        energy: component(3),
      };
    });
  }

  /** Release all GPU buffers. The solver cannot be used afterwards. */
  destroy(): void {
    this.buffers.destroyAll();
  }

  /** Check the status flag, sum the logged time steps in double precision and check the clock. */
  private accountForSteps(reading: ControlReading): void {
    if ((reading.status & STATUS_NON_PHYSICAL) !== 0) {
      throw new NonPhysicalStateError(
        `non-physical state on the GPU between steps ${this.loggedSteps} and ${reading.steps}`,
      );
    }
    if (this.config.timeStepping === 'global') {
      for (let s = this.loggedSteps; s < reading.steps; s++) {
        this.elapsed += reading.dtLog[s % DT_LOG_SIZE]!;
      }
      const drift = Math.abs(reading.gpuTime - this.elapsed);
      if (drift > 1e-10 * Math.max(this.elapsed, Number.MIN_VALUE)) {
        throw new Error(
          `GPU clock drifted from the sum of its time steps by ${drift.toExponential(2)}; ` +
            'this GPU compiler does not preserve compensated summation',
        );
      }
    }
    this.loggedSteps = reading.steps;
  }

  private writeParams(tEnd: number): void {
    const { ni, nj } = this.metrics;
    const { boundaries, geometry, timeStepping, gamma, cfl } = this.config;
    const data = new ArrayBuffer(PARAMS_BYTES);
    const words = new Uint32Array(data);
    const floats = new Float32Array(data);
    words.set([ni, nj, geometry === 'axisymmetric' ? 1 : 0, timeStepping === 'local' ? 1 : 0]);
    words.set(
      SIDES.map((side) => BOUNDARY_KINDS[boundaries[side].kind]),
      4,
    );
    SIDES.forEach((side, k) => {
      const bc = boundaries[side];
      if (bc.kind === 'inflow')
        floats.set([bc.state.rho, bc.state.u, bc.state.v, bc.state.p], 8 + 4 * k);
    });
    floats.set([gamma, cfl, Math.min(tEnd, 3e38)], 24);
    words[27] = this.nPartials;
    this.device.queue.writeBuffer(this.paramsBuffer, 0, data);
  }

  private dispatchFluxes(pass: GPUComputePassEncoder): void {
    const { ni, nj } = this.metrics;
    pass.setPipeline(this.pipelines.compute_i_fluxes);
    pass.dispatchWorkgroups(Math.ceil(((ni + 1) * nj) / WORKGROUP_SIZE));
    pass.setPipeline(this.pipelines.compute_j_fluxes);
    pass.dispatchWorkgroups(Math.ceil((ni * (nj + 1)) / WORKGROUP_SIZE));
  }

  private submitSteps(count: number): void {
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setBindGroup(0, this.sharedBindGroup);
    for (let step = 0; step < count; step++) {
      const plan = this.stagePlan();
      // The first stage reads the current solution as `src`, so its bind
      // group also serves the time-step computation.
      pass.setBindGroup(1, this.stageBindGroup(plan[0]!));
      pass.setPipeline(this.pipelines.compute_time_steps);
      pass.dispatchWorkgroups(this.nPartials);
      pass.setPipeline(this.pipelines.finalize_time_step);
      pass.dispatchWorkgroups(1);
      for (const stage of plan) {
        pass.setBindGroup(1, this.stageBindGroup(stage));
        this.dispatchFluxes(pass);
        pass.setPipeline(this.pipelines.update_cells);
        pass.dispatchWorkgroups(this.nPartials);
      }
      pass.setPipeline(this.pipelines.advance_clock);
      pass.dispatchWorkgroups(1);
      this.current = plan[plan.length - 1]!.dst;
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  /** Buffer roles per stage; see stagePlan in euler1d-gpu.ts. */
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

  private async readControl(): Promise<ControlReading> {
    const bytes = await readBuffer(
      this.device,
      this.controlBuffer,
      this.controlReadback,
      CONTROL_BYTES,
    );
    // Layout: t, t_error, dt (f32), steps, status (u32), residual_norm (f32), dt log (f32).
    const asFloat = new Float32Array(bytes);
    const asUint = new Uint32Array(bytes);
    return {
      gpuTime: asFloat[0]! + asFloat[1]!,
      dt: asFloat[2]!,
      steps: asUint[3]!,
      status: asUint[4]!,
      residualNorm: asFloat[5]!,
      dtLog: asFloat.subarray(6),
    };
  }
}

/**
 * Geometry buffer layout of euler2d.wgsl: i-faces then j-faces as
 * (nx, ny, area, 0), then cells as (volume, planar area, centroid x, y).
 */
function packGeometry(m: GridMetrics): Float32Array<ArrayBuffer> {
  const nI = (m.ni + 1) * m.nj;
  const nJ = m.ni * (m.nj + 1);
  const nC = m.ni * m.nj;
  const data = new Float32Array(4 * (nI + nJ + nC));
  for (let f = 0; f < nI; f++)
    data.set([m.iFaces.nx[f]!, m.iFaces.ny[f]!, m.iFaces.area[f]!, 0], 4 * f);
  for (let f = 0; f < nJ; f++) {
    data.set([m.jFaces.nx[f]!, m.jFaces.ny[f]!, m.jFaces.area[f]!, 0], 4 * (nI + f));
  }
  for (let c = 0; c < nC; c++) {
    data.set([m.volume[c]!, m.planarArea[c]!, m.centroidX[c]!, m.centroidY[c]!], 4 * (nI + nJ + c));
  }
  return data;
}
