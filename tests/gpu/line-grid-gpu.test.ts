import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GpuLineGrid } from '../../src/engine-gpu/line-grid';
import {
  bluntBodyGrid,
  gridOnLines,
  withFixedFractions,
  type GridLine,
} from '../../src/grid/blunt-grid';
import { computeMetrics, type GridMetrics } from '../../src/grid/structured';
import type { Primitive2D } from '../../src/scheme/flux';
import { remapAlongLines } from '../../src/solver/shock-fitting';
import { requireDevice } from './device';

/**
 * Metrics computed on the GPU in 32-bit from the heights of lines with
 * fixed node fractions (src/engine-gpu/line-grid.ts), and the flow
 * remapped as the lines move, against the CPU's double-precision metrics
 * and remap of the same grids (design record 0006).
 */

const gamma = 1.4;

let device: GPUDevice;
beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

function storage(size: number, usage: number): GPUBuffer {
  return device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | usage });
}

async function read(buffer: GPUBuffer, size: number): Promise<Float32Array> {
  const readback = device.createBuffer({
    size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(buffer, 0, readback, 0, size);
  device.queue.submit([encoder.finish()]);
  await readback.mapAsync(GPUMapMode.READ);
  const data = new Float32Array(readback.getMappedRange().slice(0));
  readback.unmap();
  readback.destroy();
  return data;
}

function geometrySize(ni: number, nj: number): number {
  return 16 * ((ni + 1) * nj + ni * (nj + 1) + ni * nj);
}

async function gpuMetrics(lines: readonly GridLine[], heights: number[], nj: number) {
  const size = geometrySize(lines.length - 1, nj);
  const target = storage(size, GPUBufferUsage.COPY_SRC);
  const grid = await GpuLineGrid.create(device, lines, nj, {
    geometry: 'axisymmetric',
    gamma,
    target,
  });
  grid.setHeights(heights);
  const data = await read(target, size);
  grid.destroy();
  target.destroy();
  return data;
}

/** Largest relative differences of the GPU metrics from the CPU's, by kind. */
async function compare(lines: readonly GridLine[], heights: number[], nj: number) {
  const m = computeMetrics(gridOnLines(lines, heights, nj, 0.5, false), 'axisymmetric');
  return differences(m, await gpuMetrics(lines, heights, nj));
}

function differences(m: GridMetrics, data: Float32Array) {
  const { ni, nj } = m;
  const nI = (ni + 1) * nj;
  const nJ = ni * (nj + 1);
  let normal = 0;
  let area = 0;
  let volume = 0;
  let centroid = 0;
  const faces = (set: typeof m.iFaces, start: number, count: number) => {
    for (let f = 0; f < count; f++) {
      const k = 4 * (start + f);
      normal = Math.max(
        normal,
        Math.abs(data[k]! - set.nx[f]!),
        Math.abs(data[k + 1]! - set.ny[f]!),
      );
      // Faces on the axis have no area.
      if (set.area[f]! > 0) area = Math.max(area, Math.abs(data[k + 2]! / set.area[f]! - 1));
    }
  };
  faces(m.iFaces, 0, nI);
  faces(m.jFaces, nI, nJ);
  for (let c = 0; c < ni * nj; c++) {
    const k = 4 * (nI + nJ + c);
    volume = Math.max(volume, Math.abs(data[k]! / m.volume[c]! - 1));
    // Centroids are stored as absolute 32-bit coordinates, as the CPU-built
    // geometry of the GPU engine stores them: against their magnitude.
    const scale = Math.max(Math.abs(m.centroidX[c]!), Math.abs(m.centroidY[c]!));
    centroid = Math.max(
      centroid,
      Math.abs(data[k + 2]! - m.centroidX[c]!) / scale,
      Math.abs(data[k + 3]! - m.centroidY[c]!) / scale,
    );
  }
  return { normal, area, volume, centroid };
}

describe('grid metrics on the GPU from line heights', () => {
  it('C grid round a hemisphere-cylinder, heights moved 5%', async () => {
    const nj = 20;
    const { lines } = bluntBodyGrid(
      { nose: { shape: { kind: 'ellipsoid' }, length: 0.5, baseRadius: 0.5 }, cylinderLength: 4 },
      { nj, mach: 3 },
    );
    const fixed = withFixedFractions(lines, nj, 0.5);
    const e = await compare(
      fixed,
      fixed.map((l, i) => l.h * (1 + 0.05 * Math.sin(0.1 * i))),
      nj,
    );
    expectSinglePrecision(e);
  }, 300_000);

  it('vertical lines behind a sharp tip, spaced geometrically from 1e-3 of the nose', async () => {
    const nj = 40;
    const tan = Math.tan((20 * Math.PI) / 180);
    const xs = Array.from({ length: 301 }, (_, i) => 1e-3 * 2000 ** (i / 300));
    const lines: GridLine[] = xs.map((x) => ({ x, y: x * tan, dx: 0, dy: 1, h: 0.25 * x }));
    const fixed = withFixedFractions(lines, nj, 0.5);
    const e = await compare(
      fixed,
      fixed.map((l, i) => l.h * (1 + 0.05 * Math.cos(0.05 * i))),
      nj,
    );
    expectSinglePrecision(e);
  }, 300_000);
});

describe('flow remapped on the GPU as the lines move', () => {
  it('C grid round a hemisphere-cylinder: matches the CPU remap, then the moved metrics', async () => {
    const nj = 20;
    const { lines } = bluntBodyGrid(
      { nose: { shape: { kind: 'ellipsoid' }, length: 0.5, baseRadius: 0.5 }, cylinderLength: 4 },
      { nj, mach: 3 },
    );
    const fixed = withFixedFractions(lines, nj, 0.5);
    const ni = fixed.length - 1;
    const start = fixed.map((l) => l.h);
    // Moves of both signs, up to 0.4 of each line's end cell.
    const moved = fixed.map(
      (l, i) => l.h * (1 + 0.4 * (1 - l.fractions![nj - 1]!) * Math.sin(0.37 * i + 0.5)),
    );
    const oldGrid = gridOnLines(fixed, start, nj, 0.5, false);
    const newGrid = gridOnLines(fixed, moved, nj, 0.5, false);
    const centres = computeMetrics(oldGrid, 'axisymmetric');
    const field = (x: number, y: number): Primitive2D => ({
      rho: 2 + Math.sin(3 * x + y),
      u: 1 + 0.3 * Math.cos(x),
      v: 0.2 * Math.sin(2 * y),
      p: 3 + Math.cos(x - 2 * y),
    });
    const old = (i: number, j: number) =>
      field(centres.centroidX[i + j * ni]!, centres.centroidY[i + j * ni]!);
    const flow = new Float32Array(4 * ni * nj);
    for (let c = 0; c < ni * nj; c++) {
      const w = old(c % ni, Math.floor(c / ni));
      flow.set(
        [
          w.rho,
          w.rho * w.u,
          w.rho * w.v,
          w.p / (gamma - 1) + 0.5 * w.rho * (w.u * w.u + w.v * w.v),
        ],
        4 * c,
      );
    }
    const before = storage(flow.byteLength, GPUBufferUsage.COPY_DST);
    device.queue.writeBuffer(before, 0, flow);
    const after = storage(flow.byteLength, GPUBufferUsage.COPY_SRC);
    const size = geometrySize(ni, nj);
    const target = storage(size, GPUBufferUsage.COPY_SRC);
    const grid = await GpuLineGrid.create(device, fixed, nj, {
      geometry: 'axisymmetric',
      gamma,
      target,
    });
    grid.setHeights(start);
    grid.moveTo(moved, before, after);
    const remapped = await read(after, flow.byteLength);
    const geometry = await read(target, size);
    grid.destroy();
    for (const b of [before, after, target]) b.destroy();

    const expected = remapAlongLines(fixed, nj, old, oldGrid, newGrid);
    let worst = 0;
    for (let c = 0; c < ni * nj; c++) {
      const e = expected(c % ni, Math.floor(c / ni));
      const [rho, mu, mv, energy] = Array.from(remapped.subarray(4 * c, 4 * c + 4));
      const u = mu! / rho!;
      const v = mv! / rho!;
      const p = (gamma - 1) * (energy! - 0.5 * rho! * (u * u + v * v));
      // Velocities against the flow's speed, the rest relative.
      const speed = Math.hypot(e.u, e.v);
      worst = Math.max(
        worst,
        Math.abs(rho! / e.rho - 1),
        Math.abs(u - e.u) / speed,
        Math.abs(v - e.v) / speed,
        Math.abs(p / e.p - 1),
      );
    }
    // Measured when written: 2.0e-7.
    expect(worst, `largest difference ${worst.toExponential(2)}`).toBeLessThan(5e-6);
    expectSinglePrecision(differences(computeMetrics(newGrid, 'axisymmetric'), geometry));
  }, 300_000);
});

/**
 * Within a few 32-bit roundings. Measured when written: normals 1.3e-7,
 * areas 2.6e-7, volumes 4.5e-7 (relative), centroids 1e-7 of their
 * magnitude.
 */
function expectSinglePrecision(e: Awaited<ReturnType<typeof compare>>): void {
  const message = JSON.stringify(e);
  expect(e.normal, message).toBeLessThan(5e-7);
  expect(e.area, message).toBeLessThan(1e-6);
  expect(e.volume, message).toBeLessThan(2e-6);
  expect(e.centroid, message).toBeLessThan(5e-7);
}
