import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dualMesh } from '../../src/render3d/field';
import { fieldImageMesh } from '../../src/render3d/field-image';
import { FieldImage } from '../../src/render3d/field-image-gpu';
import { DenseStreaks, regionEdges } from '../../src/render3d/streaks-gpu';
import { ORIGIN, rayField } from '../render3d/synthetic';
import { requireDevice } from './device';

/**
 * The dense streaks (src/render3d/streaks-gpu.ts) on the GPU, traced in a
 * synthetic field whose streamlines are known exactly (straight rays from
 * (ORIGIN, 0)): every step of every streak lies along the ray through it,
 * inside the region; only the start points are the page's.
 */

let device: GPUDevice;
beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

describe('dense streaks', () => {
  it('follow the computed flow (the synthetic rays) from starts inside the region', async () => {
    const field = rayField(64, 16);
    const mesh = dualMesh(field);
    const box = { xMin: 0.2, xMax: 4, rMax: 3 };
    const image = await FieldImage.create(device);
    const streaks = await DenseStreaks.create(device);
    image.update(fieldImageMesh(mesh, field, mesh.mach, box, 1), 1024, 768, 8, 1, 1);
    streaks.setEdges(regionEdges(mesh, box.xMin, box.xMax));
    const count = 2000;
    const steps = 6;
    streaks.trace(image.field, {
      count,
      steps,
      step: 0.02,
      phase: 0,
      box,
      nearBody: 0.25,
      nearShock: 0.15,
      cut: [0, 0],
    });
    const bytes = 16 * count * (steps + 1);
    const read = device.createBuffer({
      size: bytes,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    const encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(streaks.points!, 0, read, 0, bytes);
    device.queue.submit([encoder.finish()]);
    await read.mapAsync(GPUMapMode.READ);
    const p = new Float32Array(read.getMappedRange().slice(0));
    read.unmap();
    let segments = 0;
    let worst = 0;
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < steps; k++) {
        const a = 4 * (i * (steps + 1) + k);
        const b = a + 4;
        if (p[a + 2]! < -1e30 || p[b + 2]! < -1e30) continue;
        const [xa, ra, xb, rb] = [p[a]!, p[a + 1]!, p[b]!, p[b + 1]!];
        // Inside the region: between the body and the shock lines.
        expect(ra).toBeGreaterThanOrEqual(0.2 + 0.05 * xa - 0.02);
        expect(ra).toBeLessThanOrEqual(0.5 + 0.6 * xa + 0.02);
        // Along the ray from (ORIGIN, 0) through its first end.
        const ux = xa - ORIGIN;
        const sx = xb - xa;
        const sr = rb - ra;
        const sine = Math.abs(ux * sr - ra * sx) / (Math.hypot(ux, ra) * Math.hypot(sx, sr));
        worst = Math.max(worst, sine);
        segments++;
      }
    }
    expect(segments).toBeGreaterThan(count * steps * 0.6);
    // The image's velocity is a half-precision, linear sampling of the cells' values.
    expect(worst).toBeLessThan(0.02);
    image.destroy();
    streaks.destroy();
  }, 120_000);
});
