/**
 * The transonic domain's steady solver on the GPU with the state, the grid
 * metrics and the residual in two-float arithmetic (about 48 bits of
 * mantissa), its implicit steps the red-black relaxation of the CPU
 * engine's scalar implicit system, solved in 32 bits (design record 0013,
 * step 4b). The 32-bit engine (euler2d-gpu.ts) lets the drag wander near
 * Mach 1 by up to 7e-5 of its value, from its 32-bit residual; here the
 * fixed point is that of a residual within about 1e-12 of the CPU's.
 *
 * Supported: HLLC, the shared scaled van Albada reconstruction, inflow,
 * outflow, wall and far-field boundaries (one free stream for all), planar
 * or axisymmetric geometry, and gases with 2 / (gamma - 1) a whole number
 * (air: 5). The solver performs one operation at a time: await each call.
 */

import type { BoundaryCondition2D, Euler2DConfig, Side } from '../engine-cpu/euler2d';
import { computeMetrics, type GridMetrics } from '../grid/structured';
import { VAN_ALBADA_EPSILON } from '../scheme/limiters';
import type { Primitive2D } from '../scheme/flux';
import { validateGrid2DConfig } from '../solver/config';
import { NonPhysicalStateError } from '../solver/errors';
import {
  BufferSet,
  ExclusiveRunner,
  GpuExecutionError,
  GpuMemoryLimitError,
  checkDispatchSize,
  compileShader,
  readBuffer,
  withDeviceErrors,
} from './gpu-common';
import { DT_LOG_SIZE, STATUS_NON_PHYSICAL } from './time-loop';
import twoFloatWgsl from './shaders/two-float.wgsl?raw';
import solverWgsl from './shaders/euler2d-two-float.wgsl?raw';

const WORKGROUP_SIZE = 64;
/** Size of the Params struct in euler2d-two-float.wgsl. */
const PARAMS_BYTES = 96;
/** Size of the Control struct: six 4-byte words and the dt log (as euler2d.wgsl). */
const CONTROL_BYTES = 24 + 4 * DT_LOG_SIZE;
/** Steps per command buffer. */
const BATCH = 64;

const SIDES: readonly Side[] = ['iMin', 'iMax', 'jMin', 'jMax'];
const KINDS: Partial<Readonly<Record<BoundaryCondition2D['kind'], number>>> = {
  inflow: 0,
  outflow: 1,
  wall: 2,
  farField: 5,
};
const ENTRY_POINTS = [
  'fluxes_i',
  'fluxes_j',
  'prepare',
  'relax',
  'update',
  'advance',
  'residual_to_dst',
] as const;
type EntryPoint = (typeof ENTRY_POINTS)[number];

/** The high and low 32-bit parts of a double: hi + lo is within 2^-48 of it, relative. */
export function split(value: number): [number, number] {
  const hi = Math.fround(value);
  return [hi, Math.fround(value - hi)];
}

export interface TwoFloatImplicitOptions {
  /** Largest CFL number, reached by `growth` per step from the one set by setImplicitCfl. */
  readonly cfl: number;
  /** Red-black sweeps per step. */
  readonly sweeps: number;
  readonly omega?: number;
  readonly growth?: number;
}

export class GpuEuler2DTwoFloat {
  readonly config: Euler2DConfig;
  readonly metrics: GridMetrics;

  private readonly device: GPUDevice;
  private readonly pipelines: Readonly<Record<EntryPoint, GPUComputePipeline>>;
  private readonly layout: GPUBindGroupLayout;
  private readonly buffers: BufferSet;
  private readonly exclusive = new ExclusiveRunner('GpuEuler2DTwoFloat');
  private readonly params: readonly [GPUBuffer, GPUBuffer];
  private readonly states: readonly [GPUBuffer, GPUBuffer];
  private readonly work: GPUBuffer;
  private readonly control: GPUBuffer;
  private readonly controlReadback: GPUBuffer;
  private readonly stateReadback: GPUBuffer;
  private readonly groups: readonly (readonly [GPUBindGroup, GPUBindGroup])[];
  private readonly nCells: number;
  private current: 0 | 1 = 0;
  private steps = 0;

  /**
   * Create a solver, compiling its shaders and checking that this GPU's
   * compiler keeps two-float arithmetic exact (twoFloatSelfTest). Throws
   * RangeError for a configuration it does not support.
   */
  static async create(device: GPUDevice, config: Euler2DConfig): Promise<GpuEuler2DTwoFloat> {
    validateGrid2DConfig(config);
    if (config.flux !== 'hllc') throw new RangeError('the two-float solver has the HLLC flux only');
    if (config.reconstruction !== 'sharedScaled' || config.limiter !== 'vanAlbada') {
      throw new RangeError(
        'the two-float solver has the shared scaled van Albada reconstruction only',
      );
    }
    if (config.source !== undefined) throw new RangeError('the two-float solver has no sources');
    densityPower(config.gamma);
    freeStreamOf(config);
    const { ni, nj } = config.grid;
    const largest = 32 * ((ni + 1) * nj + ni * (nj + 1) + ni * nj);
    const limit = Math.min(device.limits.maxStorageBufferBindingSize, device.limits.maxBufferSize);
    if (largest > limit) {
      throw new GpuMemoryLimitError(
        `a grid of ${ni} x ${nj} cells needs a ${largest}-byte buffer, more than this GPU allows (${limit})`,
      );
    }
    checkDispatchSize(device, (ni + 1) * nj, WORKGROUP_SIZE, `a grid of ${ni} x ${nj} cells`);
    await twoFloatSelfTest(device);
    const module = await compileShader(
      device,
      'euler2d two-float',
      [twoFloatWgsl, solverWgsl].join('\n'),
    );
    const entry = (binding: number, type: GPUBufferBindingType): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type },
    });
    const layout = device.createBindGroupLayout({
      label: 'euler2d two-float',
      entries: [
        entry(0, 'uniform'),
        entry(1, 'read-only-storage'),
        entry(2, 'storage'),
        entry(3, 'read-only-storage'),
        entry(4, 'storage'),
        entry(5, 'storage'),
        entry(6, 'storage'),
        entry(7, 'storage'),
      ],
    });
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    const compiled = await Promise.all(
      ENTRY_POINTS.map((entryPoint) =>
        device.createComputePipelineAsync({
          label: entryPoint,
          layout: pipelineLayout,
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
      () => new GpuEuler2DTwoFloat(device, config, layout, pipelines),
      (solver) => {
        solver.destroy();
      },
    );
  }

  private constructor(
    device: GPUDevice,
    config: Euler2DConfig,
    layout: GPUBindGroupLayout,
    pipelines: Record<EntryPoint, GPUComputePipeline>,
  ) {
    this.device = device;
    this.config = config;
    this.layout = layout;
    this.pipelines = pipelines;
    this.metrics = computeMetrics(config.grid, config.geometry);
    const { ni, nj } = this.metrics;
    this.nCells = ni * nj;
    const usage = GPUBufferUsage;
    const b = (this.buffers = new BufferSet(device));
    this.params = [
      b.create('two-float params 0', PARAMS_BYTES, usage.UNIFORM | usage.COPY_DST),
      b.create('two-float params 1', PARAMS_BYTES, usage.UNIFORM | usage.COPY_DST),
    ];
    const geometry = b.createWith('two-float geometry', packGeometry(this.metrics), usage.STORAGE);
    const faceFlux = b.create(
      'two-float face flux',
      32 * ((ni + 1) * nj + ni * (nj + 1)),
      usage.STORAGE,
    );
    const stateBytes = 32 * this.nCells;
    const stateFlags = usage.STORAGE | usage.COPY_DST | usage.COPY_SRC;
    this.states = [
      b.create('two-float state 0', stateBytes, stateFlags),
      b.create('two-float state 1', stateBytes, stateFlags),
    ];
    const initial = new Float32Array(4 * (2 * this.nCells + 1));
    initial[4 * 2 * this.nCells] = 1;
    this.work = b.createWith('two-float work', initial, usage.STORAGE);
    const dq = b.create('two-float dq', 16 * this.nCells, usage.STORAGE);
    this.control = b.create(
      'two-float control',
      CONTROL_BYTES,
      usage.STORAGE | usage.COPY_DST | usage.COPY_SRC,
    );
    this.controlReadback = b.create(
      'two-float control readback',
      CONTROL_BYTES,
      usage.MAP_READ | usage.COPY_DST,
    );
    this.stateReadback = b.create(
      'two-float state readback',
      stateBytes,
      usage.MAP_READ | usage.COPY_DST,
    );
    const group = (src: 0 | 1, colour: 0 | 1) =>
      device.createBindGroup({
        label: `euler2d two-float ${src}${colour}`,
        layout: this.layout,
        entries: [
          this.params[colour],
          geometry,
          faceFlux,
          this.states[src],
          this.states[1 - src]!,
          this.work,
          dq,
          this.control,
        ].map((buffer, binding) => ({ binding, resource: { buffer } })),
      });
    this.groups = [
      [group(0, 0), group(0, 1)],
      [group(1, 0), group(1, 1)],
    ];
    // The parameters residual() needs before any step sets the rest.
    this.writeParams(1.5, 1000, 1.2);
  }

  /** Set every cell (i, j) to the given state (in double precision) and reset the step count. */
  setCellPrimitives(cell: (i: number, j: number) => Primitive2D): void {
    this.exclusive.assertIdle();
    const { ni } = this.metrics;
    const gamma = this.config.gamma;
    const packed = new Float32Array(8 * this.nCells);
    for (let c = 0; c < this.nCells; c++) {
      const w = cell(c % ni, Math.floor(c / ni));
      if (!(w.rho > 0 && w.p > 0 && Number.isFinite(w.u) && Number.isFinite(w.v))) {
        throw new NonPhysicalStateError(`non-physical state for cell ${c}`);
      }
      const q = [
        w.rho,
        w.rho * w.u,
        w.rho * w.v,
        w.p / (gamma - 1) + 0.5 * w.rho * (w.u * w.u + w.v * w.v),
      ];
      for (let k = 0; k < 4; k++) {
        const [hi, lo] = split(q[k]!);
        packed[8 * c + k] = hi;
        packed[8 * c + 4 + k] = lo;
      }
    }
    this.current = 0;
    this.steps = 0;
    this.device.queue.writeBuffer(this.states[0], 0, packed);
    this.device.queue.writeBuffer(this.control, 0, new Uint32Array(CONTROL_BYTES / 4));
  }

  /** Set the CFL number the next step starts from: 1 from the free stream, the largest from a coarser grid's solution. */
  async setImplicitCfl(cfl: number): Promise<void> {
    if (!(cfl > 0)) throw new RangeError('the CFL number must be positive');
    await this.exclusive.run(() => {
      this.device.queue.writeBuffer(
        this.work,
        16 * 2 * this.nCells,
        new Float32Array([cfl, 0, 0, 0]),
      );
      return Promise.resolve();
    });
  }

  /** Take `count` implicit steps (the twin of Euler2D.iterateImplicit with the red-black relaxation). */
  async iterateImplicit(count: number, options: TwoFloatImplicitOptions): Promise<void> {
    const { cfl, sweeps } = options;
    const omega = options.omega ?? 1.5;
    const growth = options.growth ?? 1.2;
    if (!(cfl > 0 && omega >= 1 && growth >= 1)) {
      throw new RangeError('implicit steps need cfl > 0, omega >= 1 and growth >= 1');
    }
    if (!(Number.isInteger(sweeps) && sweeps >= 1)) {
      throw new RangeError('the relaxation needs a whole number of sweeps, at least one');
    }
    await this.exclusive.run(async () => {
      this.writeParams(omega, cfl, growth);
      const { ni, nj } = this.metrics;
      const cells = Math.ceil(this.nCells / WORKGROUP_SIZE);
      let remaining = count;
      while (remaining > 0) {
        const batch = Math.min(remaining, BATCH);
        const encoder = this.device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        for (let step = 0; step < batch; step++) {
          const [even, odd] = this.groups[this.current]!;
          pass.setBindGroup(0, even);
          pass.setPipeline(this.pipelines.fluxes_i);
          pass.dispatchWorkgroups(Math.ceil(((ni + 1) * nj) / WORKGROUP_SIZE));
          pass.setPipeline(this.pipelines.fluxes_j);
          pass.dispatchWorkgroups(Math.ceil((ni * (nj + 1)) / WORKGROUP_SIZE));
          pass.setPipeline(this.pipelines.prepare);
          pass.dispatchWorkgroups(cells);
          pass.setPipeline(this.pipelines.relax);
          for (let s = 0; s < sweeps; s++) {
            pass.setBindGroup(0, even);
            pass.dispatchWorkgroups(cells);
            pass.setBindGroup(0, odd);
            pass.dispatchWorkgroups(cells);
          }
          pass.setBindGroup(0, even);
          pass.setPipeline(this.pipelines.update);
          pass.dispatchWorkgroups(cells);
          pass.setPipeline(this.pipelines.advance);
          pass.dispatchWorkgroups(1);
          this.current = this.current === 0 ? 1 : 0;
        }
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        const bytes = await readBuffer(
          this.device,
          this.control,
          this.controlReadback,
          CONTROL_BYTES,
        );
        const words = new Uint32Array(bytes);
        if ((words[4]! & STATUS_NON_PHYSICAL) !== 0) {
          throw new NonPhysicalStateError(`non-physical state on the GPU after step ${words[3]}`);
        }
        if (words[3] !== this.steps + batch) {
          throw new GpuExecutionError(
            `the GPU ran ${words[3]! - this.steps} of the ${batch} steps submitted: it rejected the work, ran out of memory or lost the device`,
          );
        }
        this.steps = words[3]!;
        remaining -= batch;
      }
    });
  }

  /**
   * The two-float residual of the current state (net inflow of each
   * conserved quantity, with the axisymmetric source) in double precision,
   * four per cell: for checking it against Euler2D.residualVector.
   */
  async residual(): Promise<Float64Array> {
    return this.exclusive.run(async () => {
      const { ni, nj } = this.metrics;
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setBindGroup(0, this.groups[this.current]![0]);
      pass.setPipeline(this.pipelines.fluxes_i);
      pass.dispatchWorkgroups(Math.ceil(((ni + 1) * nj) / WORKGROUP_SIZE));
      pass.setPipeline(this.pipelines.fluxes_j);
      pass.dispatchWorkgroups(Math.ceil((ni * (nj + 1)) / WORKGROUP_SIZE));
      pass.setPipeline(this.pipelines.residual_to_dst);
      pass.dispatchWorkgroups(Math.ceil(this.nCells / WORKGROUP_SIZE));
      pass.end();
      this.device.queue.submit([encoder.finish()]);
      const spare = this.current === 0 ? 1 : 0;
      const bytes = await readBuffer(
        this.device,
        this.states[spare],
        this.stateReadback,
        32 * this.nCells,
      );
      const packed = new Float32Array(bytes);
      const r = new Float64Array(4 * this.nCells);
      for (let c = 0; c < this.nCells; c++) {
        for (let k = 0; k < 4; k++) r[4 * c + k] = packed[8 * c + k]! + packed[8 * c + 4 + k]!;
      }
      return r;
    });
  }

  /** Steps taken since the state was set. */
  get stepsTaken(): number {
    return this.steps;
  }

  /** The current state's conserved variables in double precision (hi + lo), four per cell. */
  async readConserved(): Promise<Float64Array> {
    return this.exclusive.run(async () => {
      const bytes = await readBuffer(
        this.device,
        this.states[this.current],
        this.stateReadback,
        32 * this.nCells,
      );
      const packed = new Float32Array(bytes);
      const q = new Float64Array(4 * this.nCells);
      for (let c = 0; c < this.nCells; c++) {
        for (let k = 0; k < 4; k++) q[4 * c + k] = packed[8 * c + k]! + packed[8 * c + 4 + k]!;
      }
      return q;
    });
  }

  destroy(): void {
    this.buffers.destroyAll();
  }

  private writeParams(omega: number, cfl: number, growth: number): void {
    const { ni, nj } = this.metrics;
    const { boundaries, geometry, gamma } = this.config;
    const free = freeStreamOf(this.config);
    for (const colour of [0, 1] as const) {
      const data = new ArrayBuffer(PARAMS_BYTES);
      const words = new Uint32Array(data);
      const floats = new Float32Array(data);
      words.set([ni, nj, geometry === 'axisymmetric' ? 1 : 0, colour]);
      words.set(
        SIDES.map((side) => KINDS[boundaries[side].kind]!),
        4,
      );
      floats.set([...split(gamma), ...split(VAN_ALBADA_EPSILON), omega, cfl, growth], 8);
      words[15] = densityPower(gamma);
      const parts = [free.rho, free.u, free.v, free.p].map(split);
      floats.set(
        parts.map(([hi]) => hi),
        16,
      );
      floats.set(
        parts.map(([, lo]) => lo),
        20,
      );
      this.device.queue.writeBuffer(this.params[colour], 0, data);
    }
  }
}

/** 2 / (gamma - 1), which must be a whole number (within 1e-9) for the far field's density. */
function densityPower(gamma: number): number {
  const power = 2 / (gamma - 1);
  const whole = Math.round(power);
  if (!(Math.abs(power - whole) < 1e-9 && whole >= 1)) {
    throw new RangeError('the two-float solver needs 2 / (gamma - 1) to be a whole number');
  }
  return whole;
}

/** The one free stream of the inflow and far-field sides (those sides must agree). */
function freeStreamOf(config: Euler2DConfig): Primitive2D {
  let free: Primitive2D | undefined;
  for (const side of SIDES) {
    const bc = config.boundaries[side];
    if (KINDS[bc.kind] === undefined) {
      throw new RangeError(`the two-float solver has no ${bc.kind} boundaries`);
    }
    if (bc.kind === 'inflow' || bc.kind === 'farField') {
      const w = bc.state;
      if (free === undefined) free = w;
      else if (free.rho !== w.rho || free.u !== w.u || free.v !== w.v || free.p !== w.p) {
        throw new RangeError('the two-float solver needs one free stream for all its sides');
      }
    }
  }
  return free ?? { rho: 1, u: 0, v: 0, p: 1 };
}

/**
 * The grid's metrics in two-float, as euler2d.wgsl's layout but two vec4f
 * per entry (high, then low parts): i-faces, j-faces (nx, ny, area, 0),
 * then cells (volume, planar area, centroid x, y).
 */
function packGeometry(m: GridMetrics): Float32Array<ArrayBuffer> {
  const nI = (m.ni + 1) * m.nj;
  const nJ = m.ni * (m.nj + 1);
  const nC = m.ni * m.nj;
  const data = new Float32Array(8 * (nI + nJ + nC));
  const put = (entry: number, values: readonly number[]) => {
    for (let k = 0; k < 4; k++) {
      const [hi, lo] = split(values[k]!);
      data[8 * entry + k] = hi;
      data[8 * entry + 4 + k] = lo;
    }
  };
  for (let f = 0; f < nI; f++) put(f, [m.iFaces.nx[f]!, m.iFaces.ny[f]!, m.iFaces.area[f]!, 0]);
  for (let f = 0; f < nJ; f++)
    put(nI + f, [m.jFaces.nx[f]!, m.jFaces.ny[f]!, m.jFaces.area[f]!, 0]);
  for (let c = 0; c < nC; c++) {
    put(nI + nJ + c, [m.volume[c]!, m.planarArea[c]!, m.centroidX[c]!, m.centroidY[c]!]);
  }
  return data;
}

const checked = new WeakMap<GPUDevice, Promise<void>>();

/**
 * Check, once per device, that this GPU's compiler keeps the two-float
 * operations exact: sums, products, quotients and square roots of
 * two-float numbers against double precision, within 1e-12 relative. A
 * compiler that reassociates or contracts them would lose the low parts
 * silently; this refuses such a GPU instead.
 */
export function twoFloatSelfTest(device: GPUDevice): Promise<void> {
  let result = checked.get(device);
  if (result === undefined) {
    result = runSelfTest(device);
    checked.set(device, result);
  }
  return result;
}

async function runSelfTest(device: GPUDevice): Promise<void> {
  const a = 1 / 3;
  const b = Math.PI / 7;
  const code = `${twoFloatWgsl}
@group(0) @binding(0) var<storage, read> input: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> output: array<vec4f>;
@compute @workgroup_size(1)
fn main() {
  let a = input[0].xy;
  let b = input[0].zw;
  output[0] = vec4f(df_add(a, b), df_mul(a, b));
  output[1] = vec4f(df_div(a, b), df_sqrt(b));
}
`;
  const module = await compileShader(device, 'two-float self-test', code);
  const pipeline = await device.createComputePipelineAsync({
    layout: 'auto',
    compute: { module, entryPoint: 'main' },
  });
  const buffers = new BufferSet(device);
  try {
    const input = buffers.createWith(
      'two-float self-test input',
      new Float32Array([...split(a), ...split(b)]),
      GPUBufferUsage.STORAGE,
    );
    const output = buffers.create(
      'two-float self-test output',
      32,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    );
    const readback = buffers.create(
      'two-float self-test readback',
      32,
      GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    );
    const group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: input } },
        { binding: 1, resource: { buffer: output } },
      ],
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(1);
    pass.end();
    device.queue.submit([encoder.finish()]);
    const r = new Float32Array(await readBuffer(device, output, readback, 32));
    const value = (k: number) => r[2 * k]! + r[2 * k + 1]!;
    const sa = split(a);
    const sb = split(b);
    const exactA = sa[0] + sa[1];
    const exactB = sb[0] + sb[1];
    const expected = [exactA + exactB, exactA * exactB, exactA / exactB, Math.sqrt(exactB)];
    for (let k = 0; k < 4; k++) {
      const error = Math.abs(value(k) / expected[k]! - 1);
      if (!(error < 1e-12)) {
        throw new GpuExecutionError(
          `this GPU's compiler does not keep two-float arithmetic exact (error ${error.toExponential(2)} in operation ${k}); the transonic solve needs it`,
        );
      }
    }
  } finally {
    buffers.destroyAll();
  }
}
