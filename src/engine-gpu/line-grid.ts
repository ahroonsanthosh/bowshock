/**
 * Grid metrics computed on the GPU for straight lines from the body with
 * fixed node fractions (src/grid/blunt-grid.ts, withFixedFractions), for
 * heights that change as a fitted shock moves, and the flow remapped onto
 * the moved grid (design: docs/design/0006-shock-fitting.md). The fixed
 * data (the lines, the differences between neighbouring lines, the
 * fractions and their differences) are computed once in double precision;
 * each update uploads the heights, their neighbour differences and the
 * move of each line, also from double precision, and writes the metrics
 * into a geometry buffer laid out as euler2d.wgsl expects.
 */

import type { Geometry } from '../grid/structured';
import type { GridLine } from '../grid/blunt-grid';
import { BufferSet, compileShader } from './gpu-common';
import lineGridWgsl from './shaders/line-grid.wgsl?raw';

const WORKGROUP_SIZE = 64;
const METRIC_ENTRY_POINTS = ['line_grid_i_faces', 'line_grid_j_faces', 'line_grid_cells'] as const;
const REMAP_ENTRY_POINT = 'line_grid_remap';

export class GpuLineGrid {
  private readonly device: GPUDevice;
  private readonly buffers: BufferSet;
  private readonly bindGroupLayout: GPUBindGroupLayout;
  /** Bindings 0 to 5, shared by every bind group. */
  private readonly fixedBuffers: readonly GPUBuffer[];
  private readonly heightsBuffer: GPUBuffer;
  private readonly metricPipelines: readonly GPUComputePipeline[];
  private readonly remapPipeline: GPUComputePipeline;
  /** Bind groups by the flow buffers bound as `before` and `after`. */
  private readonly bindGroups = new Map<GPUBuffer, Map<GPUBuffer, GPUBindGroup>>();
  private readonly placeholders: readonly [GPUBuffer, GPUBuffer];
  private readonly ni: number;
  private readonly nj: number;
  /** The heights of the last update, in double precision. */
  private heights: number[] | null = null;

  /**
   * Metrics on `lines`, which must carry fixed fractions (nj + 1 each),
   * written into `target` (at least the size euler2d.wgsl uses for an
   * ni x nj grid) at each setHeights or moveTo; `gamma` is that of the flow
   * moveTo remaps.
   */
  static async create(
    device: GPUDevice,
    lines: readonly GridLine[],
    nj: number,
    geometry: Geometry,
    gamma: number,
    target: GPUBuffer,
  ): Promise<GpuLineGrid> {
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
        entry(4, 'read-only-storage'),
        entry(5, 'storage'),
        entry(6, 'read-only-storage'),
        entry(7, 'storage'),
      ],
    });
    const layout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
    const pipelines = await Promise.all(
      [...METRIC_ENTRY_POINTS, REMAP_ENTRY_POINT].map((entryPoint) =>
        device.createComputePipelineAsync({
          label: entryPoint,
          layout,
          compute: { module, entryPoint },
        }),
      ),
    );
    return new GpuLineGrid(device, lines, nj, geometry, gamma, target, pipelines, bindGroupLayout);
  }

  private constructor(
    device: GPUDevice,
    lines: readonly GridLine[],
    nj: number,
    geometry: Geometry,
    gamma: number,
    target: GPUBuffer,
    pipelines: GPUComputePipeline[],
    bindGroupLayout: GPUBindGroupLayout,
  ) {
    this.device = device;
    this.metricPipelines = pipelines.slice(0, METRIC_ENTRY_POINTS.length);
    this.remapPipeline = pipelines[METRIC_ENTRY_POINTS.length]!;
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
    // (ni, nj, axisymmetric) as u32, then gamma as f32 (LineGridParams).
    const params = new ArrayBuffer(16);
    new Uint32Array(params, 0, 3).set([ni, nj, geometry === 'axisymmetric' ? 1 : 0]);
    new Float32Array(params, 12, 1)[0] = gamma;
    const paramsBuffer = b.createWith('line grid params', new Uint8Array(params), usage.UNIFORM);
    this.heightsBuffer = b.create('heights', 4 * (3 * ni + 2), usage.STORAGE | usage.COPY_DST);
    this.fixedBuffers = [
      paramsBuffer,
      b.createWith('lines', lineData, usage.STORAGE),
      b.createWith('line pairs', pairData, usage.STORAGE),
      b.createWith('fractions', fractionData, usage.STORAGE),
      this.heightsBuffer,
      target,
    ];
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
    this.submit(false, ...this.placeholders);
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
    if (this.heights === null) throw new Error('set the heights before moving them');
    this.upload(heights, this.heights);
    this.submit(true, before, after);
  }

  /** Release this object's buffers (not the target or the flow). */
  destroy(): void {
    this.buffers.destroyAll();
  }

  private upload(heights: readonly number[], previous: readonly number[] | null): void {
    const ni = this.ni;
    if (heights.length !== ni + 1) throw new RangeError(`${ni + 1} heights are needed`);
    const data = new Float32Array(3 * ni + 2);
    for (let i = 0; i <= ni; i++) data[i] = heights[i]!;
    for (let i = 0; i < ni; i++) data[ni + 1 + i] = heights[i + 1]! - heights[i]!;
    if (previous !== null) {
      for (let i = 0; i <= ni; i++) data[2 * ni + 1 + i] = heights[i]! - previous[i]!;
    }
    this.device.queue.writeBuffer(this.heightsBuffer, 0, data);
    this.heights = [...heights];
  }

  private submit(remap: boolean, before: GPUBuffer, after: GPUBuffer): void {
    const { ni, nj } = this;
    const bindGroup = this.bindGroup(before, after);
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setBindGroup(0, bindGroup);
    // The remap reads only the heights and the flow, not the metrics, so it
    // can run before the metrics are overwritten or after.
    if (remap) {
      pass.setPipeline(this.remapPipeline);
      pass.dispatchWorkgroups(Math.ceil((ni * nj) / WORKGROUP_SIZE));
    }
    const counts = [(ni + 1) * nj, ni * (nj + 1), ni * nj];
    this.metricPipelines.forEach((pipeline, k) => {
      pass.setPipeline(pipeline);
      pass.dispatchWorkgroups(Math.ceil(counts[k]! / WORKGROUP_SIZE));
    });
    pass.end();
    this.device.queue.submit([encoder.finish()]);
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
        entries: [...this.fixedBuffers, before, after].map((buffer, binding) => ({
          binding,
          resource: { buffer },
        })),
      });
      byAfter.set(after, group);
    }
    return group;
  }
}
