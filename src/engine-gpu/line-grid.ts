/**
 * Grid metrics computed on the GPU for straight lines from the body with
 * fixed node fractions (src/grid/blunt-grid.ts, withFixedFractions), for
 * heights that change as a fitted shock moves (design:
 * docs/design/0006-shock-fitting.md). The fixed data (the lines, the
 * differences between neighbouring lines, the fractions and their
 * differences) are computed once in double precision; each update uploads
 * the heights and their neighbour differences, also from double precision,
 * and writes the metrics into a geometry buffer laid out as euler2d.wgsl
 * expects.
 */

import type { Geometry } from '../grid/structured';
import type { GridLine } from '../grid/blunt-grid';
import { BufferSet, compileShader } from './gpu-common';
import lineGridWgsl from './shaders/line-grid.wgsl?raw';

const WORKGROUP_SIZE = 64;
const ENTRY_POINTS = ['line_grid_i_faces', 'line_grid_j_faces', 'line_grid_cells'] as const;

export class GpuLineGrid {
  private readonly device: GPUDevice;
  private readonly buffers: BufferSet;
  private readonly heightsBuffer: GPUBuffer;
  private readonly bindGroup: GPUBindGroup;
  private readonly pipelines: readonly GPUComputePipeline[];
  private readonly ni: number;
  private readonly nj: number;

  /**
   * Metrics on `lines`, which must carry fixed fractions (nj + 1 each),
   * written into `geometry` (at least the size euler2d.wgsl uses for an
   * ni x nj grid) at each setHeights.
   */
  static async create(
    device: GPUDevice,
    lines: readonly GridLine[],
    nj: number,
    geometry: Geometry,
    target: GPUBuffer,
  ): Promise<GpuLineGrid> {
    const module = await compileShader(device, 'line grid', lineGridWgsl);
    // One layout for all three entry points, which each use only some of
    // the bindings (an automatic layout would differ between them).
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
      ],
    });
    const layout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
    const pipelines = await Promise.all(
      ENTRY_POINTS.map((entryPoint) =>
        device.createComputePipelineAsync({
          label: entryPoint,
          layout,
          compute: { module, entryPoint },
        }),
      ),
    );
    return new GpuLineGrid(device, lines, nj, geometry, target, pipelines, bindGroupLayout);
  }

  private constructor(
    device: GPUDevice,
    lines: readonly GridLine[],
    nj: number,
    geometry: Geometry,
    target: GPUBuffer,
    pipelines: GPUComputePipeline[],
    bindGroupLayout: GPUBindGroupLayout,
  ) {
    this.device = device;
    this.pipelines = pipelines;
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
    const params = new Uint32Array([ni, nj, geometry === 'axisymmetric' ? 1 : 0, 0]);
    const paramsBuffer = b.createWith('line grid params', params, usage.UNIFORM);
    this.heightsBuffer = b.create('heights', 4 * (2 * ni + 1), usage.STORAGE | usage.COPY_DST);
    const resources = [
      paramsBuffer,
      b.createWith('lines', lineData, usage.STORAGE),
      b.createWith('line pairs', pairData, usage.STORAGE),
      b.createWith('fractions', fractionData, usage.STORAGE),
      this.heightsBuffer,
      target,
    ];
    this.bindGroup = device.createBindGroup({
      label: 'line grid',
      layout: bindGroupLayout,
      entries: resources.map((buffer, binding) => ({ binding, resource: { buffer } })),
    });
  }

  /**
   * Write the metrics for these heights (one per line) into the target
   * buffer; the neighbour differences are taken here in double precision.
   */
  setHeights(heights: readonly number[]): void {
    const ni = this.ni;
    if (heights.length !== ni + 1) throw new RangeError(`${ni + 1} heights are needed`);
    const data = new Float32Array(2 * ni + 1);
    for (let i = 0; i <= ni; i++) data[i] = heights[i]!;
    for (let i = 0; i < ni; i++) data[ni + 1 + i] = heights[i + 1]! - heights[i]!;
    this.device.queue.writeBuffer(this.heightsBuffer, 0, data);
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    const counts = [(ni + 1) * this.nj, ni * (this.nj + 1), ni * this.nj];
    this.pipelines.forEach((pipeline, k) => {
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.dispatchWorkgroups(Math.ceil(counts[k]! / WORKGROUP_SIZE));
    });
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  /** Release this object's buffers (not the target). */
  destroy(): void {
    this.buffers.destroyAll();
  }
}
