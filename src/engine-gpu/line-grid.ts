/**
 * Grid metrics computed on the GPU for straight lines from the body with
 * fixed node fractions (src/grid/blunt-grid.ts, withFixedFractions), for
 * heights that change as a fitted shock moves, the shock's moves
 * themselves, and the flow remapped onto the moved grid (design:
 * docs/design/0006-shock-fitting.md). The fixed data (the lines, the
 * differences between neighbouring lines, the fractions and their
 * differences) are computed once in double precision. Heights come from
 * the CPU in double precision, with their neighbour differences, as base
 * heights; the shock's moves on the GPU add up in a displacement from
 * them, small enough to keep the moves' precision. The metrics are written
 * into a geometry buffer laid out as euler2d.wgsl expects.
 */

import type { Geometry } from '../grid/structured';
import type { GridLine } from '../grid/blunt-grid';
import { BufferSet, checkDispatchSize, compileShader, withDeviceErrors } from './gpu-common';
import lineGridWgsl from './shaders/line-grid.wgsl?raw';

const WORKGROUP_SIZE = 64;
const METRIC_ENTRY_POINTS = ['line_grid_i_faces', 'line_grid_j_faces', 'line_grid_cells'] as const;
const OTHER_ENTRY_POINTS = [
  'line_grid_remap',
  'line_grid_shock_moves',
  'line_grid_apply_moves',
] as const;

export interface GpuLineGridOptions {
  readonly geometry: Geometry;
  /** Of the flow that moves remap. */
  readonly gamma: number;
  /** Written with the metrics (at least the size euler2d.wgsl uses for the grid). */
  readonly target: GPUBuffer;
  /** The boundary buffer of euler2d.wgsl, whose shock speeds encodeShockMove uses. */
  readonly boundary?: GPUBuffer;
  /** The shock's first node in encodeShockMove: normal to the axis, or not moved. */
  readonly firstNode?: 'symmetry' | 'fixed';
}

export class GpuLineGrid {
  private readonly device: GPUDevice;
  private readonly buffers: BufferSet;
  private readonly bindGroupLayout: GPUBindGroupLayout;
  /** Bindings 0 to 5, shared by every bind group. */
  private readonly fixedBuffers: readonly GPUBuffer[];
  private readonly heightsBuffer: GPUBuffer;
  private readonly heightsReadback: GPUBuffer;
  private readonly metricPipelines: readonly GPUComputePipeline[];
  private readonly remapPipeline: GPUComputePipeline;
  private readonly shockMovesPipeline: GPUComputePipeline;
  private readonly applyMovesPipeline: GPUComputePipeline;
  /** Bind groups by the flow buffers bound as `before` and `after`. */
  private readonly bindGroups = new Map<GPUBuffer, Map<GPUBuffer, GPUBindGroup>>();
  private readonly placeholders: readonly [GPUBuffer, GPUBuffer];
  private readonly boundary: GPUBuffer;
  private readonly ni: number;
  private readonly nj: number;
  /** The base heights of the last update from the CPU. */
  private base: number[] | null = null;

  /**
   * Metrics on `lines`, which must carry fixed fractions (nj + 1 each),
   * written into the target buffer at each update.
   */
  static async create(
    device: GPUDevice,
    lines: readonly GridLine[],
    nj: number,
    options: GpuLineGridOptions,
  ): Promise<GpuLineGrid> {
    const ni = lines.length - 1;
    checkDispatchSize(
      device,
      Math.max((ni + 1) * nj, ni * (nj + 1)),
      WORKGROUP_SIZE,
      `a grid of ${ni} x ${nj} cells`,
    );
    const module = await compileShader(device, 'line grid', lineGridWgsl);
    // One layout for all the entry points, which each use only some of the
    // bindings (an automatic layout would differ between them).
    const entry = (binding: number, type: GPUBufferBindingType): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type },
    });
    const bindGroupLayout = device.createBindGroupLayout({
      label: 'line grid',
      entries: [
        entry(0, 'uniform'),
        entry(1, 'read-only-storage'),
        entry(2, 'read-only-storage'),
        entry(3, 'read-only-storage'),
        entry(4, 'storage'),
        entry(5, 'storage'),
        entry(6, 'read-only-storage'),
        entry(7, 'storage'),
        entry(8, 'read-only-storage'),
      ],
    });
    const layout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
    const pipelines = await Promise.all(
      [...METRIC_ENTRY_POINTS, ...OTHER_ENTRY_POINTS].map((entryPoint) =>
        device.createComputePipelineAsync({
          label: entryPoint,
          layout,
          compute: { module, entryPoint },
        }),
      ),
    );
    return withDeviceErrors(
      device,
      `the moving grid of ${ni} x ${nj} cells`,
      () => new GpuLineGrid(device, lines, nj, options, pipelines, bindGroupLayout),
      (grid) => {
        grid.destroy();
      },
    );
  }

  private constructor(
    device: GPUDevice,
    lines: readonly GridLine[],
    nj: number,
    options: GpuLineGridOptions,
    pipelines: GPUComputePipeline[],
    bindGroupLayout: GPUBindGroupLayout,
  ) {
    this.device = device;
    const metrics = METRIC_ENTRY_POINTS.length;
    this.metricPipelines = pipelines.slice(0, metrics);
    [this.remapPipeline, this.shockMovesPipeline, this.applyMovesPipeline] = [
      pipelines[metrics]!,
      pipelines[metrics + 1]!,
      pipelines[metrics + 2]!,
    ];
    this.bindGroupLayout = bindGroupLayout;
    this.ni = lines.length - 1;
    this.nj = nj;
    const ni = this.ni;
    const fractionsOf = (i: number) => {
      const f = lines[i]!.fractions;
      if (f?.length !== nj + 1) {
        throw new RangeError(`line ${i} needs ${nj + 1} fixed fractions (withFixedFractions)`);
      }
      return f;
    };
    const lineData = new Float32Array(4 * (ni + 1));
    lines.forEach((l, i) => {
      lineData.set([l.x, l.y, l.dx, l.dy], 4 * i);
    });
    const pairData = new Float32Array(4 * ni);
    for (let i = 0; i < ni; i++) {
      const a = lines[i]!;
      const b = lines[i + 1]!;
      pairData.set([b.x - a.x, b.y - a.y, b.dx - a.dx, b.dy - a.dy], 4 * i);
    }
    const nodes = (ni + 1) * (nj + 1);
    const fractionData = new Float32Array(nodes + (ni + 1) * nj + ni * (nj + 1));
    for (let j = 0; j <= nj; j++) {
      for (let i = 0; i <= ni; i++) {
        fractionData[i + j * (ni + 1)] = fractionsOf(i)[j]!;
        if (j < nj) {
          fractionData[nodes + i + j * (ni + 1)] = fractionsOf(i)[j + 1]! - fractionsOf(i)[j]!;
        }
        if (i < ni) {
          fractionData[nodes + (ni + 1) * nj + i + j * ni] =
            fractionsOf(i + 1)[j]! - fractionsOf(i)[j]!;
        }
      }
    }
    const usage = GPUBufferUsage;
    this.buffers = new BufferSet(device);
    const b = this.buffers;
    // LineGridParams: (ni, nj, axisymmetric) as u32, gamma as f32, symmetry.
    const params = new ArrayBuffer(32);
    new Uint32Array(params, 0, 3).set([ni, nj, options.geometry === 'axisymmetric' ? 1 : 0]);
    new Float32Array(params, 12, 1)[0] = options.gamma;
    new Uint32Array(params, 16, 1)[0] = options.firstNode === 'symmetry' ? 1 : 0;
    const paramsBuffer = b.createWith('line grid params', new Uint8Array(params), usage.UNIFORM);
    const heightsBytes = 4 * (4 * ni + 3);
    this.heightsBuffer = b.create(
      'heights',
      heightsBytes,
      usage.STORAGE | usage.COPY_DST | usage.COPY_SRC,
    );
    this.heightsReadback = b.create(
      'heights readback',
      heightsBytes,
      usage.MAP_READ | usage.COPY_DST,
    );
    this.fixedBuffers = [
      paramsBuffer,
      b.createWith('lines', lineData, usage.STORAGE),
      b.createWith('line pairs', pairData, usage.STORAGE),
      b.createWith('fractions', fractionData, usage.STORAGE),
      this.heightsBuffer,
      options.target,
    ];
    this.boundary = options.boundary ?? b.create('no boundary', 16, usage.STORAGE);
    // Bound as the flow when only the metrics are computed; never read.
    this.placeholders = [
      b.create('no flow before', 16, usage.STORAGE),
      b.create('no flow after', 16, usage.STORAGE),
    ];
  }

  /**
   * Write the metrics for these heights (one per line) into the target
   * buffer; the neighbour differences are taken here in double precision.
   */
  setHeights(heights: readonly number[]): void {
    this.upload(heights, null);
    this.submit(
      (pass) => {
        this.dispatchMetrics(pass);
      },
      ...this.placeholders,
    );
  }

  /**
   * Move the lines from the heights of the last update to these, writing
   * into `after` the flow in `before` (conserved states per cell, as in
   * euler2d.wgsl) interpolated along the lines to the moved cells, as
   * remapAlongLines in src/solver/shock-fitting.ts does, then the metrics
   * of the moved grid into the target buffer. Each line must move by less
   * than half the height of the cells at its end.
   */
  moveTo(heights: readonly number[], before: GPUBuffer, after: GPUBuffer): void {
    if (this.base === null) throw new Error('set the heights before moving them');
    this.upload(heights, this.base);
    this.submit(
      (pass) => {
        this.dispatchRemap(pass);
        this.dispatchMetrics(pass);
      },
      before,
      after,
    );
  }

  /**
   * Encode one move of the fitted shock, as fitShock in
   * src/solver/shock-fitting.ts moves it: every node by the speeds the
   * last step's shock boundary left in the boundary buffer, the flow in
   * `before` remapped into `after`, and the moved grid's metrics.
   */
  encodeShockMove(encoder: GPUCommandEncoder, before: GPUBuffer, after: GPUBuffer): void {
    if (this.base === null) throw new Error('set the heights before moving them');
    const pass = encoder.beginComputePass();
    pass.setBindGroup(0, this.bindGroup(before, after));
    const nodes = Math.ceil((this.ni + 1) / WORKGROUP_SIZE);
    pass.setPipeline(this.shockMovesPipeline);
    pass.dispatchWorkgroups(nodes);
    pass.setPipeline(this.applyMovesPipeline);
    pass.dispatchWorkgroups(nodes);
    this.dispatchRemap(pass);
    this.dispatchMetrics(pass);
    pass.end();
  }

  /**
   * The current heights in double precision: the base heights plus the
   * displacements the GPU's moves have added to them.
   */
  async readHeights(): Promise<number[]> {
    if (this.base === null) throw new Error('set the heights first');
    const ni = this.ni;
    const bytes = 4 * (4 * ni + 3);
    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(this.heightsBuffer, 0, this.heightsReadback, 0, bytes);
    this.device.queue.submit([encoder.finish()]);
    await this.heightsReadback.mapAsync(GPUMapMode.READ);
    const data = new Float32Array(this.heightsReadback.getMappedRange().slice(0));
    this.heightsReadback.unmap();
    return this.base.map((h, i) => h + data[3 * ni + 2 + i]!);
  }

  /** Release this object's buffers (not the target, the boundary or the flow). */
  destroy(): void {
    this.buffers.destroyAll();
  }

  /** New base heights, with no displacement; with `previous`, the move from them. */
  private upload(heights: readonly number[], previous: readonly number[] | null): void {
    const ni = this.ni;
    if (heights.length !== ni + 1) throw new RangeError(`${ni + 1} heights are needed`);
    const data = new Float32Array(4 * ni + 3);
    for (let i = 0; i <= ni; i++) data[i] = heights[i]!;
    for (let i = 0; i < ni; i++) data[ni + 1 + i] = heights[i + 1]! - heights[i]!;
    if (previous !== null) {
      for (let i = 0; i <= ni; i++) data[2 * ni + 1 + i] = heights[i]! - previous[i]!;
    }
    this.device.queue.writeBuffer(this.heightsBuffer, 0, data);
    this.base = [...heights];
  }

  private submit(
    dispatch: (pass: GPUComputePassEncoder) => void,
    before: GPUBuffer,
    after: GPUBuffer,
  ): void {
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setBindGroup(0, this.bindGroup(before, after));
    dispatch(pass);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  /** The remap reads only the heights and the flow, not the metrics. */
  private dispatchRemap(pass: GPUComputePassEncoder): void {
    pass.setPipeline(this.remapPipeline);
    pass.dispatchWorkgroups(Math.ceil((this.ni * this.nj) / WORKGROUP_SIZE));
  }

  private dispatchMetrics(pass: GPUComputePassEncoder): void {
    const { ni, nj } = this;
    const counts = [(ni + 1) * nj, ni * (nj + 1), ni * nj];
    this.metricPipelines.forEach((pipeline, k) => {
      pass.setPipeline(pipeline);
      pass.dispatchWorkgroups(Math.ceil(counts[k]! / WORKGROUP_SIZE));
    });
  }

  private bindGroup(before: GPUBuffer, after: GPUBuffer): GPUBindGroup {
    let byAfter = this.bindGroups.get(before);
    if (byAfter === undefined) {
      byAfter = new Map();
      this.bindGroups.set(before, byAfter);
    }
    let group = byAfter.get(after);
    if (group === undefined) {
      group = this.device.createBindGroup({
        label: 'line grid',
        layout: this.bindGroupLayout,
        entries: [...this.fixedBuffers, before, after, this.boundary].map((buffer, binding) => ({
          binding,
          resource: { buffer },
        })),
      });
      byAfter.set(after, group);
    }
    return group;
  }
}
