/**
 * Dense streaks on the GPU (shaders/streaks-compute.wgsl): tens of
 * thousands of short pieces of streamline of the computed flow, traced in
 * the field's image (./field-image-gpu.ts) once per field (or per frame
 * while they move), into a buffer the 3D view draws (streaks-draw.wgsl).
 */

import { compileShader } from '../engine-gpu/gpu-common';
import type { DualMesh } from './field';
import computeWgsl from './shaders/streaks-compute.wgsl?raw';

/** Radii of the region's edges (body, shock) at this many even x. */
export const EDGES_N = 256;

/**
 * The region's edges at EDGES_N even x from xMin to xMax: the radius of the
 * wall (the dual mesh's first row) and of the shock (its last), linear
 * between their points; past their ends, their end values.
 */
export function regionEdges(mesh: DualMesh, xMin: number, xMax: number): Float32Array<ArrayBuffer> {
  const NI = mesh.ni + 2;
  const top = (mesh.nj + 1) * NI;
  const at = (row: number, x: number) => {
    let k = 0;
    while (k + 1 < NI - 1 && mesh.x[row + k + 1]! < x) k++;
    const xa = mesh.x[row + k]!;
    const xb = mesh.x[row + k + 1]!;
    const t = Math.min(Math.max((x - xa) / (xb - xa || 1), 0), 1);
    return mesh.r[row + k]! + t * (mesh.r[row + k + 1]! - mesh.r[row + k]!);
  };
  const out = new Float32Array(2 * EDGES_N);
  for (let n = 0; n < EDGES_N; n++) {
    const x = xMin + ((xMax - xMin) * n) / (EDGES_N - 1);
    out[2 * n] = at(0, x);
    out[2 * n + 1] = at(top, x);
  }
  return out;
}

export interface StreakSettings {
  readonly count: number;
  readonly steps: number;
  /** Step length, in the field's lengths. */
  readonly step: number;
  /** Moving: the phase of the starts along their streamlines, 0 to 1. */
  readonly phase: number;
  readonly box: { readonly xMin: number; readonly xMax: number; readonly rMax: number };
  /** Shares of the starts near the body and near the shock (the rest even in volume). */
  readonly nearBody: number;
  readonly nearShock: number;
  /** The cutaway (first azimuth, width; width 0 for none), where few streaks are kept. */
  readonly cut: readonly [number, number];
}

export class DenseStreaks {
  points: GPUBuffer | null = null;
  count = 0;
  steps = 0;
  private edges: GPUBuffer | null = null;
  private readonly params: GPUBuffer;
  private readonly sampler: GPUSampler;

  private constructor(
    private readonly device: GPUDevice,
    private readonly pipeline: GPUComputePipeline,
  ) {
    this.params = device.createBuffer({
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  }

  static async create(device: GPUDevice): Promise<DenseStreaks> {
    const module = await compileShader(device, '3D streaks', computeWgsl);
    const pipeline = await device.createComputePipelineAsync({
      label: '3D streaks',
      layout: 'auto',
      compute: { module, entryPoint: 'trace' },
    });
    return new DenseStreaks(device, pipeline);
  }

  /** The region's edges, for the starts (once per field). */
  setEdges(edges: Float32Array<ArrayBuffer>): void {
    this.edges?.destroy();
    this.edges = this.device.createBuffer({
      label: '3D streak edges',
      size: edges.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.edges, 0, edges);
  }

  /** Trace the streaks in the field's image. */
  trace(field: GPUTexture, s: StreakSettings): void {
    if (this.edges === null) return;
    const device = this.device;
    const size = 16 * s.count * (s.steps + 1);
    if (this.points === null || this.points.size !== size) {
      this.points?.destroy();
      this.points = device.createBuffer({
        label: '3D streaks',
        size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
    }
    this.count = s.count;
    this.steps = s.steps;
    const { xMin, xMax, rMax } = s.box;
    device.queue.writeBuffer(
      this.params,
      0,
      new Float32Array([
        s.count,
        s.steps,
        s.step,
        s.phase,
        xMin,
        1 / (xMax - xMin),
        1 / rMax,
        xMax,
        s.nearBody,
        s.nearShock,
        s.cut[0],
        s.cut[1],
      ]),
    );
    const group = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.params } },
        { binding: 1, resource: field.createView() },
        { binding: 2, resource: this.sampler },
        { binding: 3, resource: { buffer: this.edges } },
        { binding: 4, resource: { buffer: this.points } },
      ],
    });
    const encoder = device.createCommandEncoder({ label: '3D streaks' });
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(Math.ceil(s.count / 64));
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  destroy(): void {
    this.points?.destroy();
    this.edges?.destroy();
    this.params.destroy();
  }
}
