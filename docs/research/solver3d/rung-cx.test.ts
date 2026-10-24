/**
 * Rung (c-x) of docs/design/0021-3d-euler-fins.md (4.3), its CPU part: the exact nonlinear 3D check, L0 on the
 * CPU (L0 to L3 run on the GPU with the ladder; the CPU's L0 is the GPU's check, 3.5).
 *
 * Planform D (a rectangle, span equal to the chord, here 1), a double wedge with its ridge at mid-chord, t/c
 * 0.04, 0.06 and 0.08, Mach 2, on rung (c)'s plane wall (src/solver3d/sector-grid.ts, planeWall). The wall is
 * a mirror plane, so wherever the tip's influence has not arrived the flow is the section's planar 2D flow,
 * for which shock-expansion theory is exact. The tip's influence: the Mach cone from the tip's leading edge at
 * the lowest local Mach number on the face (behind the leading-edge shock), the widest; the region compared
 * is the face below that cone with a margin of 3 L0 cells (3 times 13 w, the largest L0 cell next to the fin).
 * The quantity: the face's drag over the region, faces cut by its boundary weighted by their area inside it
 * (sampled on 8 x 8 points of the face's (x, y) projection); the reference: the exact shock-expansion
 * pressures integrated over the same region, in closed form. Reported: both, their difference, and the
 * largest cell-level pressure difference in the region.
 *
 * The run converges each family until the residual has fallen by 1e8 and the drag over the region changes by
 * less than 1e-9 of itself over 500 steps, or 60,000 steps. Out: out/rung-cx.json.
 *   ONLY=./rung-cx.test.ts nice -n 10 npx vitest run --config docs/research/solver3d/vitest.config.ts
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { trapezoidalPlanform } from '../../../src/fins/planform';
import { gridFromFunction } from '../../../src/grid/structured';
import { field2D } from '../../../src/solver3d/field2d';
import { doubleWedge3D, SIZE_CAP } from '../../../src/solver3d/sector-grid';
import { sectorProblem } from '../../../src/solver3d/sector-solve';
import { nodeIndex3D } from '../../../src/solver3d/grid3d';
import { obliqueShock, prandtlMeyer, machFromPrandtlMeyer } from '../../../src/validation/gas-dynamics';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
const RUNS = join(OUT, 'rung-cx-runs.jsonl');
const GAMMA = 1.4;
const MACH = 2;

test('rung (c-x) on the CPU, L0', { timeout: 86_400_000 * 2 }, () => {
  mkdirSync(OUT, { recursive: true });
  const done = new Map<number, Record<string, unknown>>();
  if (existsSync(RUNS)) for (const l of readFileSync(RUNS, 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(l) as { tc: number };
    done.set(r.tc, r);
  }
  const results: Record<string, unknown>[] = [];
  for (const tc of [0.04, 0.06, 0.08]) {
    if (done.has(tc)) {
      results.push(done.get(tc)!);
      continue;
    }
    const t0 = Date.now();
    const delta = Math.atan(tc);
    const front = obliqueShock(MACH, delta, GAMMA);
    const p1 = front.pressureRatio;
    // Behind the front shock, then the Prandtl-Meyer turn of 2 delta at the ridge.
    const v1 = Math.hypot(Math.cos(front.beta), Math.sin(front.beta) / front.densityRatio) * MACH * Math.sqrt(GAMMA);
    const a1 = Math.sqrt((GAMMA * p1) / front.densityRatio);
    const m1 = v1 / a1;
    const m2 = machFromPrandtlMeyer(prandtlMeyer(m1, GAMMA) + 2 * delta, GAMMA);
    const p0 = p1 * (1 + 0.5 * (GAMMA - 1) * m1 * m1) ** (GAMMA / (GAMMA - 1));
    const p2 = p0 / (1 + 0.5 * (GAMMA - 1) * m2 * m2) ** (GAMMA / (GAMMA - 1));
    const mu = Math.asin(1 / Math.min(m1, m2));
    const xLE = 0.5;
    const free = { rho: 1, u: MACH * Math.sqrt(GAMMA), v: 0, p: 1 };
    const field = field2D(gridFromFunction(8, 8, (i, j) => [-1 + (4 * i) / 8, (4 * j) / 8]), () => free);
    const prob = sectorProblem({
      input: {
        bodyRadius: 0,
        fins: 1,
        rootLeadingEdge: xLE,
        shoulder: -Infinity,
        base: xLE + 1.0,
        planform: trapezoidalPlanform({ rootChord: 1, span: 1, leadingEdgeSweep: 0 }),
        section: doubleWedge3D(tc),
        tanTipShock: Math.tan(front.beta),
        planeWall: { zMax: Math.tan(front.beta) + 0.2 },
      },
      level: 0,
      mach: MACH,
      gamma: GAMMA,
      field,
    });
    const s = prob.sector;
    const margin = 3 * SIZE_CAP * s.w;
    // Inside the region: below the tip's Mach cone (apex at the tip's leading edge), with the margin.
    const inside = (x: number, y: number) => x <= xLE || 1 - y >= (x - xLE) * Math.tan(mu) + margin;
    // The exact reference: (p - 1) times the face's x projection, dz = tan(delta) dx on the front half, -tan on the rear.
    const exact = (() => {
      const n = 2000;
      let sum = 0;
      for (let a = 0; a < n; a++)
        for (let b = 0; b < n; b++) {
          const x = xLE + (a + 0.5) / n;
          const y = (b + 0.5) / n;
          if (!inside(x, y)) continue;
          const front2 = x < xLE + 0.5;
          sum += (front2 ? (p1 - 1) * Math.tan(delta) : -(p2 - 1) * Math.tan(delta)) / (n * n);
        }
      return sum;
    })();
    // The Euler drag over the region, from the fin faces (box 1, kMin), weighted by their area inside it.
    const regionDrag = () => {
      const e = prob.blocks[1]!;
      const f = e.sideFluxes('kMin');
      const g = s.grid;
      const { ni, nj, kFaces } = e.metrics;
      let sum = 0;
      let worstDp = 0;
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++) {
          const xs = [0, 1].flatMap((a) => [0, 1].map((b) => g.c0[nodeIndex3D(g, i + a, j + b, 4)]!));
          const ys = [0, 1].flatMap((a) => [0, 1].map((b) => g.c1[nodeIndex3D(g, i + a, j + b, 4)]!));
          if (!s.onFin(i, j) || !s.onFin(i + 1, j + 1)) continue;
          let w = 0;
          for (let a = 0; a < 8; a++)
            for (let b = 0; b < 8; b++) {
              const u = (a + 0.5) / 8;
              const v = (b + 0.5) / 8;
              const x = (1 - u) * (1 - v) * xs[0]! + (1 - u) * v * xs[1]! + u * (1 - v) * xs[2]! + u * v * xs[3]!;
              const y = (1 - u) * (1 - v) * ys[0]! + (1 - u) * v * ys[1]! + u * (1 - v) * ys[2]! + u * v * ys[3]!;
              if (inside(x, y)) w += 1 / 64;
            }
          if (w === 0) continue;
          const t = i + ni * j;
          const sx = kFaces.s0[t]!;
          const area = Math.hypot(sx, kFaces.s1[t]!, kFaces.s2[t]!);
          const p = f[5 * t + 1]! / sx;
          sum -= w * (f[5 * t + 1]! - sx);
          const xm = 0.25 * (xs[0]! + xs[1]! + xs[2]! + xs[3]!);
          if (w === 1 && area > 0) worstDp = Math.max(worstDp, Math.abs(p - (xm < xLE + 0.5 ? p1 : p2)));
        }
      return { sum, worstDp };
    };
    const r0 = prob.residual();
    let steps = 0;
    let previous = Number.NaN;
    let change = Infinity;
    let residual = 1;
    while (steps < 60_000) {
      prob.iterate(500);
      steps += 500;
      const d = regionDrag().sum;
      change = Math.abs(d / previous - 1);
      previous = d;
      residual = prob.residual() / r0;
      if (residual < 1e-8 && change < 1e-9) break;
    }
    const final = regionDrag();
    const row = {
      tc,
      cells: prob.blocks.reduce((a, e) => a + e.metrics.ni * e.metrics.nj * e.metrics.nk, 0),
      steps,
      residual,
      change,
      euler: final.sum,
      exact,
      relativeDifference: final.sum / exact - 1,
      largestCellPressureDifference: final.worstDp,
      region: { mu, margin },
      seconds: (Date.now() - t0) / 1000,
      date: new Date().toISOString(),
    };
    appendFileSync(RUNS, JSON.stringify(row) + '\n');
    results.push(row);
    writeFileSync(join(OUT, 'rung-cx.json'), JSON.stringify({ date: new Date().toISOString(), level: 0, label: 'CPU L0 only: no band (the band needs L0 to L3, on the GPU)', results }, null, 2) + '\n');
  }
  writeFileSync(join(OUT, 'rung-cx.json'), JSON.stringify({ date: new Date().toISOString(), level: 0, label: 'CPU L0 only: no band (the band needs L0 to L3, on the GPU)', results }, null, 2) + '\n');
});
