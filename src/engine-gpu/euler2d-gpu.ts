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
import type { Reconstruction } from '../scheme/reconstruction';
import { validateGrid2DConfig } from '../solver/config';
import { NonPhysicalStateError } from '../solver/errors';
import { RUNGE_KUTTA_STAGES } from '../solver/runge-kutta';
import { WGSL_LIMITER_FUNCTIONS, isGpuFlux, type GpuFluxName } from './euler1d-gpu';
import {
  BufferSet,
  ExclusiveRunner,
  GpuMemoryLimitError,
  checkDispatchSize,
  compileShader,
  readBuffer,
  withDeviceErrors,
} from './gpu-common';
import type { GpuLineGrid } from './line-grid';
import {
  DT_LOG_SIZE,
  STATUS_NON_PHYSICAL,
  StageBindGroups,
  StepLedger,
  advanceInBatches,
  stagePlan,
  type ControlReading,
  type Stage,
  type StateIndex,
} from './time-loop';
import euler2dWgsl from './shaders/euler2d.wgsl?raw';
import fluxWgsl from './shaders/flux.wgsl?raw';
import gasWgsl from './shaders/gas.wgsl?raw';
import limitersWgsl from './shaders/limiters.wgsl?raw';
import reconstructionWgsl from './shaders/reconstruction.wgsl?raw';

/** WGSL names of the reconstruction functions in reconstruction.wgsl. */
const WGSL_RECONSTRUCTION_FUNCTIONS: Readonly<Record<Reconstruction, string>> = {
  perVariable: 'reconstruct_per_variable',
  shared: 'reconstruct_shared',
  sharedScaled: 'reconstruct_shared_scaled',
};

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
  faceStates: 4,
  farField: 5,
};

/** Sides in the order euler2d.wgsl expects them. */
const SIDES: readonly Side[] = ['iMin', 'iMax', 'jMin', 'jMax'];

const WORKGROUP_SIZE = 64;
/** Size of the Control struct in euler2d.wgsl: six 4-byte words and the dt log. */
const CONTROL_BYTES = 24 + 4 * DT_LOG_SIZE;
/** Size of the Params struct in euler2d.wgsl. */
const PARAMS_BYTES = 144;

export interface GpuEuler2DConfig extends Omit<Euler2DConfig, 'flux'> {
  readonly flux: GpuFluxName;
  /**
   * The jMax boundary is a fitted shock with this free stream ahead of it:
   * at the start of every step the GPU sets its post-shock states and
   * fluxes from the flow below it, as src/solver/shock-fitting.ts does on
   * the CPU, and records the shock's speed on each face. jMax must be a
   * 'faceStates' boundary.
   */
  readonly fittedShock?: { readonly freeStream: Primitive2D };
}

/** Assemble the complete WGSL source for a configuration. */
export function euler2dShaderSource(
  config: Pick<GpuEuler2DConfig, 'flux' | 'limiter' | 'reconstruction'>,
): string {
  const configuration = /* wgsl */ `
fn limiter(a: f32, b: f32) -> f32 {
  return ${WGSL_LIMITER_FUNCTIONS[config.limiter]}(a, b);
}

fn reconstruct(prev: Primitive2D, centre: Primitive2D, next: Primitive2D, side: f32) -> Primitive2D {
  return ${WGSL_RECONSTRUCTION_FUNCTIONS[config.reconstruction]}(prev, centre, next, side${config.reconstruction === 'sharedScaled' ? ', params.gamma' : ''});
}

fn numerical_face_flux(left: FaceState, right: FaceState) -> vec4f {
  return ${GPU_FACE_FLUX_FUNCTIONS[config.flux]}(left, right, params.gamma);
}
`;
  return [gasWgsl, fluxWgsl, limitersWgsl, reconstructionWgsl, configuration, euler2dWgsl].join(
    '\n',
  );
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

export { GpuExecutionError, GpuMemoryLimitError } from './gpu-common';

/**
 * Primitive variables of cell c of a state read back from the GPU. The GPU
 * solves with gamma rounded to 32 bits, so its pressure is recovered with
 * the same value: with the unrounded one every pressure would be off by
 * (gamma - 1) / (fround(gamma) - 1) - 1, 6e-8 for gamma = 1.4, and the drag
 * by up to about 1e-6 of its value on bodies of small drag.
 */
export function gpuPrimitive2D(state: GpuState2D, c: number, gamma: number): Primitive2D {
  const rho = state.rho[c]!;
  const mu = state.mu[c]!;
  const mv = state.mv[c]!;
  return {
    rho,
    u: mu / rho,
    v: mv / rho,
    p: pressureFromConserved2D(rho, mu, mv, state.energy[c]!, Math.fround(gamma)),
  };
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
  'compute_shock_boundary',
] as const;
type EntryPoint = (typeof ENTRY_POINTS)[number];

interface Control2DReading extends ControlReading {
  readonly residualNorm: number;
}

export class GpuEuler2D {
  readonly config: GpuEuler2DConfig;
  readonly metrics: GridMetrics;

  private readonly device: GPUDevice;
  private readonly pipelines: Readonly<Record<EntryPoint, GPUComputePipeline>>;
  private readonly sharedBindGroup: GPUBindGroup;
  private readonly buffers: BufferSet;
  private readonly exclusive = new ExclusiveRunner('GpuEuler2D');
  private readonly paramsBuffer: GPUBuffer;
  private readonly controlBuffer: GPUBuffer;
  private readonly controlReadback: GPUBuffer;
  private readonly stateReadback: GPUBuffer;
  private readonly stateBuffers: readonly [GPUBuffer, GPUBuffer, GPUBuffer];
  private readonly stageBindGroups: StageBindGroups;
  private readonly ledger = new StepLedger();
  private readonly nCells: number;
  private readonly nPartials: number;
  private readonly geometry: GPUBuffer;
  private readonly boundary: GPUBuffer;
  private readonly boundaryReadback: GPUBuffer;
  /** Sides whose face fluxes are imposed from the boundary buffer. */
  private readonly imposed = new Set<Side>();
  /** Index into stateBuffers of the buffer holding the current solution. */
  private current: StateIndex = 0;

  /**
   * Create a solver, compiling its shaders. Throws with the compiler's
   * messages on failure, and GpuMemoryLimitError if the grid's buffers
   * exceed the device's limits.
   */
  static async create(device: GPUDevice, config: GpuEuler2DConfig): Promise<GpuEuler2D> {
    validateGrid2DConfig(config);
    const { ni, nj } = config.grid;
    // The largest buffer: the geometry, one vec4 per face and cell.
    const largest = 16 * ((ni + 1) * nj + ni * (nj + 1) + ni * nj);
    const limit = Math.min(device.limits.maxStorageBufferBindingSize, device.limits.maxBufferSize);
    if (largest > limit) {
      throw new GpuMemoryLimitError(
        `a grid of ${ni} x ${nj} cells needs a buffer of ${(largest / 2 ** 20).toFixed(0)} MiB, more than this GPU allows (${(limit / 2 ** 20).toFixed(0)} MiB)`,
      );
    }
    // The largest dispatch: one invocation per face of either family.
    checkDispatchSize(
      device,
      Math.max((ni + 1) * nj, ni * (nj + 1)),
      WORKGROUP_SIZE,
      `a grid of ${ni} x ${nj} cells`,
    );
    const flux: string = config.flux;
    if (!isGpuFlux(flux)) throw new RangeError(`flux ${flux} is not available on the GPU`);
    if (config.source !== undefined) {
      throw new RangeError('manufactured-solution sources are only supported by the CPU engine');
    }
    if (config.fittedShock !== undefined && config.boundaries.jMax.kind !== 'faceStates') {
      throw new RangeError("a fitted shock needs a 'faceStates' jMax boundary");
    }

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
        storage(5, 'storage'),
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
    return withDeviceErrors(
      device,
      `a grid of ${ni} x ${nj} cells`,
      () => new GpuEuler2D(device, config, sharedLayout, stageLayout, pipelines),
      (engine) => {
        engine.destroy();
      },
    );
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
    this.metrics = computeMetrics(config.grid, config.geometry);
    const { ni, nj } = this.metrics;
    this.nCells = ni * nj;
    this.nPartials = Math.ceil(this.nCells / WORKGROUP_SIZE);

    const usage = GPUBufferUsage;
    this.buffers = new BufferSet(device);
    const b = this.buffers;
    const stateBytes = 16 * this.nCells;
    this.paramsBuffer = b.create('params', PARAMS_BYTES, usage.UNIFORM | usage.COPY_DST);
    this.geometry = b.createWith('geometry', packGeometry(this.metrics), usage.STORAGE);
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
    // States and imposed fluxes for every boundary face, then the fitted
    // shock's speed per jMax face (layout in euler2d.wgsl).
    this.boundary = b.create(
      'boundary',
      16 * (4 * (ni + nj) + ni),
      usage.STORAGE | usage.COPY_DST | usage.COPY_SRC,
    );
    this.boundaryReadback = b.create('boundary readback', 16 * ni, usage.MAP_READ | usage.COPY_DST);
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
    const coefficientBuffers = RUNGE_KUTTA_STAGES[config.timeIntegrator].map(({ a, b: bb }, i) =>
      b.createWith(`stage ${i} coefficients`, new Float32Array([a, bb, 0, 0]), usage.UNIFORM),
    );
    this.stageBindGroups = new StageBindGroups(
      device,
      stageLayout,
      coefficientBuffers,
      this.stateBuffers,
    );

    this.sharedBindGroup = device.createBindGroup({
      label: 'euler2d shared',
      layout: sharedLayout,
      entries: [
        this.paramsBuffer,
        this.geometry,
        this.controlBuffer,
        faceFluxBuffer,
        scratchBuffer,
        this.boundary,
      ].map((buffer, binding) => ({ binding, resource: { buffer } })),
    });
    for (const side of SIDES) {
      const bc = config.boundaries[side];
      if (bc.kind === 'faceStates') this.setFaceStates(side, bc.states);
    }
    this.writeParams(0);
  }

  /** The GPU buffer holding the current solution, as (rho, rho u, rho v, E) per cell, for rendering. */
  get stateBuffer(): GPUBuffer {
    return this.stateBuffers[this.current];
  }

  /**
   * The GPU buffer of the grid's metrics (layout in euler2d.wgsl), for a
   * GpuLineGrid to write as the grid moves.
   */
  get geometryBuffer(): GPUBuffer {
    return this.geometry;
  }

  /**
   * The GPU buffer of per-face boundary data (layout in euler2d.wgsl),
   * holding the fitted shock's speeds for a GpuLineGrid to move it by.
   */
  get boundaryBuffer(): GPUBuffer {
    return this.boundary;
  }

  /**
   * Move the grid's lines to these heights with `lineGrid` (made on this
   * solver's lines and geometry buffer), remapping the current solution
   * onto the moved cells. `metrics` still describes the grid as created.
   */
  moveGrid(lineGrid: GpuLineGrid, heights: readonly number[]): void {
    this.exclusive.assertIdle();
    const spare = this.current === 0 ? 1 : 0;
    lineGrid.moveTo(heights, this.stateBuffers[this.current], this.stateBuffers[spare]);
    this.current = spare;
  }

  /**
   * Set every cell to the field's value at its centroid and reset the
   * clock. Throws NonPhysicalStateError before anything reaches the GPU if
   * the field is not physical somewhere.
   */
  setInitialCondition(field: (x: number, y: number) => Primitive2D): void {
    this.exclusive.assertIdle();
    // The energy the GPU reads back with its 32-bit gamma (gpuPrimitive2D).
    const gamma = Math.fround(this.config.gamma);
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
    this.ledger.reset();
    this.device.queue.writeBuffer(this.stateBuffers[0], 0, packed);
    this.device.queue.writeBuffer(this.controlBuffer, 0, new Uint32Array(CONTROL_BYTES / 4));
  }

  /**
   * Set every cell (i, j) to the given state, as Euler2D.setCellPrimitives,
   * and reset the clock: for continuing a solution from another engine or
   * grid. Throws NonPhysicalStateError if a state is not physical.
   */
  setCellPrimitives(cell: (i: number, j: number) => Primitive2D): void {
    this.exclusive.assertIdle();
    // The energy the GPU reads back with its 32-bit gamma (gpuPrimitive2D).
    const gamma = Math.fround(this.config.gamma);
    const { ni } = this.metrics;
    const packed = new Float32Array(4 * this.nCells);
    for (let c = 0; c < this.nCells; c++) {
      const w = cell(c % ni, Math.floor(c / ni));
      if (!(w.rho > 0 && w.p > 0 && Number.isFinite(w.u) && Number.isFinite(w.v))) {
        throw new NonPhysicalStateError(`non-physical state for cell ${c}`);
      }
      packed[4 * c] = w.rho;
      packed[4 * c + 1] = w.rho * w.u;
      packed[4 * c + 2] = w.rho * w.v;
      packed[4 * c + 3] = w.p / (gamma - 1) + 0.5 * w.rho * (w.u * w.u + w.v * w.v);
    }
    this.current = 0;
    this.ledger.reset();
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
        this.ledger.account(await this.readControl(), this.timeAccurate, batch);
        remaining -= batch;
      }
    });
  }

  /**
   * Take `moves` times `stepsPerMove` steps towards a steady state with the
   * fitted shock moved by `lineGrid` (made on this solver's lines, geometry
   * and boundary buffers) after every `stepsPerMove`, the solution remapped
   * onto the moved grid each time (GpuLineGrid.encodeShockMove).
   */
  async iterateFitted(lineGrid: GpuLineGrid, moves: number, stepsPerMove: number): Promise<void> {
    if (this.config.fittedShock === undefined) throw new Error('there is no fitted shock');
    if (!(Number.isInteger(stepsPerMove) && stepsPerMove >= 1 && stepsPerMove <= DT_LOG_SIZE)) {
      throw new RangeError(`steps per move must be an integer from 1 to ${DT_LOG_SIZE}`);
    }
    await this.exclusive.run(async () => {
      this.writeParams(Infinity);
      const perBatch = Math.floor(DT_LOG_SIZE / stepsPerMove);
      let remaining = moves;
      while (remaining > 0) {
        const batch = Math.min(remaining, perBatch);
        const encoder = this.device.createCommandEncoder();
        for (let move = 0; move < batch; move++) {
          this.encodeSteps(encoder, stepsPerMove);
          const spare = ((this.current + 1) % 3) as StateIndex;
          lineGrid.encodeShockMove(
            encoder,
            this.stateBuffers[this.current],
            this.stateBuffers[spare],
          );
          this.current = spare;
        }
        this.device.queue.submit([encoder.finish()]);
        this.ledger.account(await this.readControl(), this.timeAccurate, batch * stepsPerMove);
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
      await advanceInBatches(
        tEnd,
        maxSteps,
        this.ledger,
        (count) => {
          this.submitSteps(count);
        },
        () => this.readControl(),
      );
    });
  }

  /** Root-mean-square density residual d(rho)/dt of the current solution. */
  async densityResidualNorm(): Promise<number> {
    return this.exclusive.run(async () => {
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setBindGroup(0, this.sharedBindGroup);
      pass.setBindGroup(1, this.stageBindGroups.get(this.stagePlan()[0]!));
      this.dispatchShockBoundary(pass);
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
        time: this.ledger.elapsed,
        steps: this.ledger.steps,
        rho: component(0),
        mu: component(1),
        mv: component(2),
        energy: component(3),
      };
    });
  }

  /** Replace the states outside the faces of a 'faceStates' side (as Euler2D.setFaceStates). */
  setFaceStates(side: Side, states: readonly Primitive2D[]): void {
    this.exclusive.assertIdle();
    if (this.config.boundaries[side].kind !== 'faceStates') {
      throw new RangeError(`the ${side} boundary does not take face states`);
    }
    const along = this.alongSide(side);
    if (states.length !== along) {
      throw new RangeError(`the ${side} boundary needs ${along} face states`);
    }
    // The energy the GPU reads back with its 32-bit gamma (gpuPrimitive2D).
    const gamma = Math.fround(this.config.gamma);
    const packed = new Float32Array(4 * along);
    states.forEach((w, t) => {
      packed.set(
        [
          w.rho,
          w.rho * w.u,
          w.rho * w.v,
          w.p / (gamma - 1) + 0.5 * w.rho * (w.u * w.u + w.v * w.v),
        ],
        4 * t,
      );
    });
    this.device.queue.writeBuffer(this.boundary, 16 * this.sideOffset(side), packed);
  }

  /**
   * Impose the flux through each face of a 'faceStates' side, four values
   * per face per unit area along the face normal (as Euler2D.setFaceFluxes),
   * or go back to the Riemann flux with null.
   */
  setFaceFluxes(side: Side, fluxes: Float64Array | null): void {
    this.exclusive.assertIdle();
    if (this.config.boundaries[side].kind !== 'faceStates') {
      throw new RangeError(`the ${side} boundary does not take face fluxes`);
    }
    const along = this.alongSide(side);
    if (fluxes === null) {
      this.imposed.delete(side);
    } else {
      if (fluxes.length !== 4 * along) {
        throw new RangeError(`the ${side} boundary needs ${4 * along} flux values`);
      }
      const { ni, nj } = this.metrics;
      this.device.queue.writeBuffer(
        this.boundary,
        16 * (2 * (ni + nj) + this.sideOffset(side)),
        Float32Array.from(fluxes),
      );
      this.imposed.add(side);
    }
    this.writeParams(Infinity);
  }

  /**
   * The fitted shock's speed along each jMax face's outward normal, as set
   * at the start of the last step, its relative normal Mach number, and the
   * fastest signal speed (|u| + a) in the face's cell then.
   */
  async readShock(): Promise<{ speed: Float32Array; mach: Float32Array; signal: Float32Array }> {
    if (this.config.fittedShock === undefined) throw new Error('there is no fitted shock');
    return this.exclusive.run(async () => {
      const { ni, nj } = this.metrics;
      const encoder = this.device.createCommandEncoder();
      encoder.copyBufferToBuffer(
        this.boundary,
        16 * 4 * (ni + nj),
        this.boundaryReadback,
        0,
        16 * ni,
      );
      this.device.queue.submit([encoder.finish()]);
      await this.boundaryReadback.mapAsync(GPUMapMode.READ, 0, 16 * ni);
      const data = new Float32Array(this.boundaryReadback.getMappedRange(0, 16 * ni).slice(0));
      this.boundaryReadback.unmap();
      return {
        speed: Float32Array.from({ length: ni }, (_, i) => data[4 * i]!),
        mach: Float32Array.from({ length: ni }, (_, i) => data[4 * i + 1]!),
        signal: Float32Array.from({ length: ni }, (_, i) => data[4 * i + 2]!),
      };
    });
  }

  /** Release all GPU buffers. The solver cannot be used afterwards. */
  destroy(): void {
    this.buffers.destroyAll();
  }

  /** Faces along a side. */
  private alongSide(side: Side): number {
    return side === 'iMin' || side === 'iMax' ? this.metrics.nj : this.metrics.ni;
  }

  /** Offset of a side's faces in each part of the boundary buffer (side_offset in euler2d.wgsl). */
  private sideOffset(side: Side): number {
    const { ni, nj } = this.metrics;
    return { iMin: 0, iMax: nj, jMin: 2 * nj, jMax: 2 * nj + ni }[side];
  }

  /** Whether time steps are global, so that the clock is meaningful. */
  private get timeAccurate(): boolean {
    return this.config.timeStepping === 'global';
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
      // The state outside an inflow side, and the free stream of a far field.
      if (bc.kind === 'inflow' || bc.kind === 'farField')
        floats.set([bc.state.rho, bc.state.u, bc.state.v, bc.state.p], 8 + 4 * k);
    });
    const shock = this.config.fittedShock;
    if (shock !== undefined) {
      const w = shock.freeStream;
      floats.set([w.rho, w.u, w.v, w.p], 8 + 4 * SIDES.indexOf('jMax'));
    }
    floats.set([gamma, cfl, Math.min(tEnd, 3e38)], 24);
    words[27] = this.nPartials;
    words.set(
      SIDES.map((side) =>
        this.imposed.has(side) || (side === 'jMax' && shock !== undefined) ? 1 : 0,
      ),
      28,
    );
    words[32] = shock === undefined ? 0 : 1;
    this.device.queue.writeBuffer(this.paramsBuffer, 0, data);
  }

  /** With a fitted shock, set its faces from the solution in the bound `src`. */
  private dispatchShockBoundary(pass: GPUComputePassEncoder): void {
    if (this.config.fittedShock === undefined) return;
    pass.setPipeline(this.pipelines.compute_shock_boundary);
    pass.dispatchWorkgroups(Math.ceil(this.metrics.ni / WORKGROUP_SIZE));
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
    this.encodeSteps(encoder, count);
    this.device.queue.submit([encoder.finish()]);
  }

  private encodeSteps(encoder: GPUCommandEncoder, count: number): void {
    const pass = encoder.beginComputePass();
    pass.setBindGroup(0, this.sharedBindGroup);
    for (let step = 0; step < count; step++) {
      const plan = this.stagePlan();
      // The first stage reads the current solution as `src`, so its bind
      // group also serves the time-step computation.
      pass.setBindGroup(1, this.stageBindGroups.get(plan[0]!));
      this.dispatchShockBoundary(pass);
      pass.setPipeline(this.pipelines.compute_time_steps);
      pass.dispatchWorkgroups(this.nPartials);
      pass.setPipeline(this.pipelines.finalize_time_step);
      pass.dispatchWorkgroups(1);
      for (const stage of plan) {
        pass.setBindGroup(1, this.stageBindGroups.get(stage));
        this.dispatchFluxes(pass);
        pass.setPipeline(this.pipelines.update_cells);
        pass.dispatchWorkgroups(this.nPartials);
      }
      pass.setPipeline(this.pipelines.advance_clock);
      pass.dispatchWorkgroups(1);
      this.current = plan[plan.length - 1]!.dst;
    }
    pass.end();
  }

  private stagePlan(): Stage[] {
    return stagePlan(this.current, this.config.timeIntegrator);
  }

  private async readControl(): Promise<Control2DReading> {
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
