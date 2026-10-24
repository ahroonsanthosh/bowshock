import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gridFromFunction } from '../../src/grid/structured';
import { dualMesh, fieldFromCells, type MeridionalField } from '../../src/render3d/field';
import { fieldImageMesh } from '../../src/render3d/field-image';
import { FieldImage } from '../../src/render3d/field-image-gpu';
import { DenseStreaks, regionEdges, type StreakSettings } from '../../src/render3d/streaks-gpu';
import { bodyR, FREE, GAMMA, shockR } from '../render3d/synthetic';
import { requireDevice } from './device';

/**
 * The dense streaks (src/render3d/streaks-gpu.ts, streaks-compute.wgsl)
 * on the GPU, traced in synthetic fields whose streamlines are known
 * exactly: circular arcs about a point off the axis (so a first-order
 * trace drifts off them and a second-order one does not), and straight
 * rays. Every step of every streak runs downstream (dx > 0 where u > 0),
 * is one step long, stays on its arc, and inside the region before the
 * end; the moving mode's lead, the cutaway's thinning and the stop at
 * x = xMax are held too. Only the start points are the page's.
 */

let device: GPUDevice;
beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

/** Circles about (XC, RC): u = W (r - RC), v = -W (x - XC), so u > 0 above the centre. */
const XC = 2;
const RC = -6;
const W = 0.25;

function arcField(ni = 64, nj = 16, x0 = 0.2, x1 = 4): MeridionalField {
  const grid = gridFromFunction(ni, nj, (i, j) => {
    const f = (j / nj) ** 1.3;
    const x = x0 + ((x1 - x0) * i) / ni;
    return [x, bodyR(x) + (shockR(x) - bodyR(x)) * f];
  });
  const row = ni + 1;
  return fieldFromCells(
    grid,
    (i, j) => {
      const k = [i + j * row, i + 1 + j * row, i + (j + 1) * row, i + 1 + (j + 1) * row];
      const cx = k.reduce((s, n) => s + grid.x[n]!, 0) / 4;
      const cr = k.reduce((s, n) => s + grid.y[n]!, 0) / 4;
      return { rho: 1.1, u: W * (cr - RC), v: -W * (cx - XC), p: 1.2 };
    },
    GAMMA,
    FREE,
  );
}

const BOX = { xMin: 0.2, xMax: 4, rMax: 3 };
const COUNT = 2000;
const STEPS = 6;
const H = 0.1;

/** The streaks traced in `field` with these settings, read back: (x, r, value, phi) per point. */
async function traced(
  field: MeridionalField,
  more: Partial<StreakSettings> = {},
): Promise<Float32Array> {
  const mesh = dualMesh(field);
  const image = await FieldImage.create(device);
  const streaks = await DenseStreaks.create(device);
  image.update(fieldImageMesh(mesh, field, mesh.mach, BOX, 1), 1024, 768, 8, 1, 1, false);
  streaks.setEdges(regionEdges(mesh, BOX.xMin, BOX.xMax));
  streaks.trace(image.field, {
    count: COUNT,
    steps: STEPS,
    step: H,
    phase: 0,
    box: BOX,
    nearBody: 0.25,
    nearShock: 0.15,
    cut: [0, 0],
    ...more,
  });
  const bytes = 16 * COUNT * (STEPS + 1);
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
  read.destroy();
  image.destroy();
  streaks.destroy();
  return p;
}

/** Each live step of each streak: its ends. */
function steps(p: Float32Array): { xa: number; ra: number; xb: number; rb: number }[] {
  const out: { xa: number; ra: number; xb: number; rb: number }[] = [];
  for (let i = 0; i < COUNT; i++) {
    for (let k = 0; k < STEPS; k++) {
      const a = 4 * (i * (STEPS + 1) + k);
      const b = a + 4;
      if (p[a + 2]! < -1e30 || p[b + 2]! < -1e30) continue;
      out.push({ xa: p[a]!, ra: p[a + 1]!, xb: p[b]!, rb: p[b + 1]! });
    }
  }
  return out;
}

/** Checks of the arcs: downstream, one step long, on the circle, inside the region. */
function checkArcs(p: Float32Array): void {
  const s = steps(p);
  expect(s.length).toBeGreaterThan(COUNT * STEPS * 0.5);
  let worstRadius = 0;
  let worstLength = 0;
  for (const { xa, ra, xb, rb } of s) {
    // Downstream: u > 0 everywhere in the region (r > RC).
    expect(xb).toBeGreaterThan(xa);
    worstLength = Math.max(worstLength, Math.abs(Math.hypot(xb - xa, rb - ra) - H));
    const radiusA = Math.hypot(xa - XC, ra - RC);
    const radiusB = Math.hypot(xb - XC, rb - RC);
    worstRadius = Math.max(worstRadius, Math.abs(radiusB - radiusA));
    expect(ra).toBeGreaterThanOrEqual(bodyR(xa) - 0.02);
    expect(ra).toBeLessThanOrEqual(shockR(xa) + 0.02);
    expect(xa).toBeLessThanOrEqual(BOX.xMax + 1e-4);
  }
  // Every step is one step long (a unit direction times H; float32).
  expect(worstLength).toBeLessThan(1e-5);
  // On the circle: a first-order step leaves it by H^2 / (2 R), at least
  // 5.4e-4 here (R at most 9.2); second order, with the image's
  // half-precision velocity, measured 1e-4 or less.
  expect(worstRadius).toBeLessThan(2.5e-4);
}

describe('dense streaks', () => {
  it('follow curved streamlines (circular arcs) downstream, to second order', async () => {
    checkArcs(await traced(arcField()));
  }, 120_000);

  it('moving: starts carried along their streamlines (the lead) still give the same arcs', async () => {
    const still = await traced(arcField());
    const moving = await traced(arcField(), { phase: 0.5 });
    checkArcs(moving);
    // The lead moved the starts: the first points differ from the still ones.
    let moved = 0;
    for (let i = 0; i < COUNT; i++) {
      const a = 4 * i * (STEPS + 1);
      if (Math.abs(moving[a]! - still[a]!) > 1e-6) moved++;
    }
    expect(moved).toBeGreaterThan(COUNT * 0.5);
  }, 120_000);

  it('keeps few streaks in the cutaway and all others; stops at x = xMax', async () => {
    const cut: [number, number] = [0, Math.PI];
    const p = await traced(arcField(), { cut });
    let inCut = 0;
    let aliveInCut = 0;
    let outCut = 0;
    let aliveOutCut = 0;
    for (let i = 0; i < COUNT; i++) {
      const a = 4 * i * (STEPS + 1);
      const phi = p[a + 3]!;
      const alive = p[a + 2]! > -1e30;
      const d = (((phi - cut[0]) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (d < cut[1]) {
        inCut++;
        if (alive) aliveInCut++;
      } else {
        outCut++;
        if (alive) aliveOutCut++;
      }
      // Nothing alive past the end.
      for (let k = 0; k <= STEPS; k++) {
        const q = 4 * (i * (STEPS + 1) + k);
        if (p[q + 2]! > -1e30) expect(p[q]!).toBeLessThanOrEqual(BOX.xMax + 1e-4);
      }
    }
    // CUT_KEEP = 0.12 of those in the cutaway are kept; the rest of the
    // starts are the same either side, so the share alive in the cutaway is
    // about 0.12 of the share alive outside it. (Some die either side: their
    // start, carried by a random lead along its arc, has left the region,
    // which this test field's arcs do, across the body or past x = xMax.)
    expect(aliveOutCut / outCut).toBeGreaterThan(0.5);
    expect(aliveInCut / inCut).toBeLessThan((0.2 * aliveOutCut) / outCut);
  }, 120_000);
});
