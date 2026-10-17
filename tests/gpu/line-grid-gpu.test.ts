import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GpuLineGrid } from '../../src/engine-gpu/line-grid';
import {
  bluntBodyGrid,
  gridOnLines,
  withFixedFractions,
  type GridLine,
} from '../../src/grid/blunt-grid';
import { computeMetrics } from '../../src/grid/structured';
import { requireDevice } from './device';

/**
 * Metrics computed on the GPU in 32-bit from the heights of lines with
 * fixed node fractions (src/engine-gpu/line-grid.ts), against the CPU's
 * double-precision metrics of the same grid (design record 0006).
 */

let device: GPUDevice;
beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

async function gpuMetrics(lines: readonly GridLine[], heights: number[], nj: number) {
  const ni = lines.length - 1;
  const size = 16 * ((ni + 1) * nj + ni * (nj + 1) + ni * nj);
  const target = device.createBuffer({
    size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const readback = device.createBuffer({
    size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const grid = await GpuLineGrid.create(device, lines, nj, 'axisymmetric', target);
  grid.setHeights(heights);
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(target, 0, readback, 0, size);
  device.queue.submit([encoder.finish()]);
  await readback.mapAsync(GPUMapMode.READ);
  const data = new Float32Array(readback.getMappedRange().slice(0));
  readback.unmap();
  grid.destroy();
  target.destroy();
  readback.destroy();
  return data;
}

/** Largest relative differences of the GPU metrics from the CPU's, by kind. */
async function compare(lines: readonly GridLine[], heights: number[], nj: number) {
  const m = computeMetrics(gridOnLines(lines, heights, nj, 0.5, false), 'axisymmetric');
  const data = await gpuMetrics(lines, heights, nj);
  const { ni } = m;
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
