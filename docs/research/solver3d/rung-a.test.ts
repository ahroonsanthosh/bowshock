/**
 * Rung (a) of design record 0021 (section 4.1), the CPU part: the finless sector reproduces the 2D fitted
 * solution. For each case (a 3-caliber tangent ogive at Mach 2, the 3:1 ellipsoid at Mach 2, the 5 deg cone
 * at Mach 1.3), the 2D fitted solution on the CPU, its shock frozen, is converged to round-off; the 3D engine
 * on that grid revolved (from a start column on the cylinder at least 0.1 radius behind the shoulder, the
 * start plane's two ghost layers holding the 2D solution's own two upstream cells, the outer boundary the
 * frozen fitted shock's states and fluxes) must give:
 * - identity of residuals: the 3D residual of the revolved 2D state equals the 2D residual times each layer's
 *   angle within 1e-13 (relative to the residual scale), on the converged state and on an unconverged one;
 * - the converged state: started from the revolved reference and converged, every cell within 1e-12 of the
 *   2D reference (relative to the free stream), |w| within 1e-12 of the free-stream sound speed;
 * on K = 1, 4 and 16 layers and a non-uniform spacing; and (a') on a sheared layout, the solution independent
 * of theta to 1e-13.
 *
 * Writes docs/research/solver3d/out/rung-a.json. Run (about an hour, one core):
 *   ONLY=./rung-a.test.ts nice -n 10 npx vitest run --config docs/research/solver3d/vitest.config.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { bluntFitProblem, fittedFlow, sharpFitProblem } from '../../../src/analysis/fitted-flow';
import type { Body } from '../../../src/geometry/body';
import { Euler3D, type BoundaryCondition3D, type Side3D } from '../../../src/solver3d/euler3d';
import type { Primitive3D } from '../../../src/solver3d/flux3d';
import { gridFromFunction3D, type StructuredGrid3D } from '../../../src/solver3d/grid3d';

const here = dirname(fileURLToPath(import.meta.url));
const GAMMA = 1.4;
const DEG = Math.PI / 180;

interface Case {
  readonly name: string;
  readonly body: Body;
  readonly mach: number;
  readonly kind: 'sharp' | 'blunt';
}

const CASES: readonly Case[] = [
  {
    name: '3-caliber tangent ogive, Mach 2 (sharp, H grid)',
    body: { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 }, cylinderLength: 2 },
    mach: 2,
    kind: 'sharp',
  },
  {
    name: '3:1 ellipsoid, Mach 2 (blunt, C grid)',
    body: { nose: { shape: { kind: 'ellipsoid' }, length: 1.5, baseRadius: 0.5 }, cylinderLength: 2 },
    mach: 2,
    kind: 'blunt',
  },
  {
    name: '5 deg cone, Mach 1.3',
    body: { nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(5 * DEG), baseRadius: 0.5 }, cylinderLength: 2 },
    mach: 1.3,
    kind: 'sharp',
  },
];

const LAYOUTS: readonly { name: string; theta: number[] }[] = [
  { name: 'K = 1', theta: [0, 0.3] },
  { name: 'K = 4', theta: [0, 1, 2, 3, 4].map((k) => (k * Math.PI) / 16) },
  { name: 'K = 16', theta: Array.from({ length: 17 }, (_, k) => (k * Math.PI) / 64) },
  { name: 'K = 6, non-uniform', theta: [0, 0.01, 0.03, 0.07, 0.15, 0.3, 0.6] },
];

const prim3 = (w: { rho: number; u: number; v: number; p: number }): Primitive3D => ({ rho: w.rho, u: w.u, v: w.v, w: 0, p: w.p });

test('rung (a), CPU: the finless sector reproduces the 2D fitted solution', { timeout: 86_400_000 }, () => {
  const report: Record<string, unknown>[] = [];
  let pass = true;
  for (const c of CASES) {
    const t0 = Date.now();
    const options = { mach: c.mach, gamma: GAMMA, nj: 20, refinement: 1 };
    const problem = c.kind === 'sharp' ? sharpFitProblem(c.body, options) : bluntFitProblem(c.body, options);
    const flow = fittedFlow(problem, 60_000);
    const two = flow.fit.solver;
    const { ni, nj } = two.metrics;
    const fs = problem.freeStream;
    // The 2D reference: the fitted state, its shock frozen, converged further to round-off. Its first value:
    // the residual of the problem's starting flow on this grid.
    const saved0: { rho: number; u: number; v: number; p: number }[] = [];
    for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) saved0.push(two.primitive(i, j));
    two.setCellPrimitives((i, j) => problem.initial(i, j));
    const first = two.densityResidualNorm();
    two.setCellPrimitives((i, j) => saved0[i + ni * j]!);
    const afterFit = two.densityResidualNorm();
    let best = afterFit;
    let stalls = 0;
    let chunks = 0;
    while (chunks < 2000 && best > 1e-13 * first && stalls < 20) {
      two.iterate(500);
      chunks++;
      const r = two.densityResidualNorm();
      if (r < 0.9 * best) {
        best = r;
        stalls = 0;
      } else stalls++;
    }
    const final2D = two.densityResidualNorm();
    const free = two.faceStatesOf('jMax')!;
    // The start column: on the cylinder, at least 0.1 radius behind the shoulder.
    const g2 = two.config.grid;
    const R = c.body.nose.baseRadius;
    const xs = c.body.nose.length + 0.1 * R;
    let i0 = -1;
    for (let i = 2; i < ni; i++) {
      if (g2.x[i]! >= xs - 1e-12 && Math.abs(g2.y[i]! - R) < 1e-12) {
        i0 = i;
        break;
      }
    }
    expect(i0).toBeGreaterThan(1);
    const n3 = ni - i0;
    const r2 = two.residualVector();
    const jStates = free;
    const jFluxes = two.faceFluxesOf('jMax');
    const caseReport: Record<string, unknown> = {
      case: c.name,
      grid2D: `${ni} x ${nj}`,
      fit: { converged: flow.fit.converged, iterations: flow.fit.iterations, maxSpeed: flow.fit.maxSpeed },
      residual2D: { first, afterFit, final: final2D, finalOverFirst: final2D / first, steps: 500 * chunks },
      startColumn: i0,
      startX: g2.x[i0],
      layouts: [] as unknown[],
    };
    for (const layout of LAYOUTS) {
      const nk = layout.theta.length - 1;
      const grid: StructuredGrid3D = gridFromFunction3D(n3, nj, nk, (i, j, k) => {
        const q = i + i0 + (ni + 1) * j;
        return [g2.x[q]!, g2.y[q]!, layout.theta[k]!];
      });
      const iLayer = (g: number) => {
        const out: Primitive3D[] = [];
        for (let k = 0; k < nk; k++) for (let j = 0; j < nj; j++) out.push(prim3(two.primitive(i0 - 1 - g, j)));
        return out;
      };
      const jLayer: Primitive3D[] = [];
      const jFlux = new Float64Array(5 * n3 * nk);
      for (let k = 0; k < nk; k++)
        for (let i = 0; i < n3; i++) {
          jLayer.push(prim3(jStates[i + i0]!));
          if (jFluxes !== undefined) {
            const f = 4 * (i + i0);
            const t = 5 * (i + n3 * k);
            jFlux[t] = jFluxes[f]!;
            jFlux[t + 1] = jFluxes[f + 1]!;
            jFlux[t + 2] = jFluxes[f + 2]!;
            jFlux[t + 3] = 0;
            jFlux[t + 4] = jFluxes[f + 3]!;
          }
        }
      const boundaries: Record<Side3D, BoundaryCondition3D> = {
        iMin: { kind: 'faceStates', layer0: iLayer(0), layer1: iLayer(1) },
        iMax: { kind: 'outflow' },
        jMin: { kind: 'wall' },
        jMax: { kind: 'faceStates', layer0: jLayer, layer1: jLayer },
        kMin: { kind: 'wall' },
        kMax: { kind: 'wall' },
      };
      const three = new Euler3D({ grid, geometry: 'cylindrical', gamma: GAMMA, timeIntegrator: 'ssprk2', cfl: 0.8, timeStepping: 'local', boundaries });
      if (jFluxes !== undefined) three.setFaceFluxes('jMax', jFlux);
      const identity = (state2: (i: number, j: number) => Primitive3D, r2v: Float64Array) => {
        three.setCellPrimitives((i, j) => state2(i + i0, j));
        const r3 = three.residualVector();
        let worst = 0;
        let scale = 0;
        for (let k = 0; k < nk; k++) {
          const dt = layout.theta[k + 1]! - layout.theta[k]!;
          for (let j = 0; j < nj; j++)
            for (let i = 0; i < n3; i++) {
              const a = 4 * (i + i0 + ni * j);
              const b = 5 * (i + n3 * (j + nj * k));
              worst = Math.max(worst, Math.abs(r3[b]! - dt * r2v[a]!), Math.abs(r3[b + 1]! - dt * r2v[a + 1]!), Math.abs(r3[b + 2]! - dt * r2v[a + 2]!), Math.abs(r3[b + 3]!), Math.abs(r3[b + 4]! - dt * r2v[a + 3]!));
              // The scale: the momentum flux through the cell's i-face, times the angle.
              const w = state2(i + i0, j);
              scale = Math.max(scale, dt * (w.rho * w.u * w.u + w.p) * two.metrics.iFaces.area[i + i0 + (ni + 1) * j]!);
            }
        }
        return { worst, scale, relative: worst / scale };
      };
      // Identity on the converged state.
      const converged = identity((i, j) => prim3(two.primitive(i, j)), r2);
      // Identity on an unconverged axisymmetric state: the converged state blended with the free stream,
      // computed by the 2D engine on the same grid (its own ghosts) and compared.
      const saved: { rho: number; u: number; v: number; p: number }[] = [];
      for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) saved.push(two.primitive(i, j));
      // From the saved converged state (not the engine's, which is replaced below).
      const blend = (i: number, j: number) => {
        const a = saved[i + ni * j]!;
        const s = 0.3 * Math.sin(0.7 * i + 0.3 * j) ** 2;
        return { rho: a.rho * (1 - s) + s * fs.rho, u: a.u * (1 - s) + s * fs.u, v: a.v * (1 - s), p: a.p * (1 - s) + s * fs.p };
      };
      two.setCellPrimitives(blend);
      const r2b = two.residualVector();
      // The start plane's ghosts must hold the blended state's upstream cells too.
      const iLayerB = (g: number) => {
        const out: Primitive3D[] = [];
        for (let k = 0; k < nk; k++) for (let j = 0; j < nj; j++) out.push(prim3(blend(i0 - 1 - g, j)));
        return out;
      };
      three.setFaceStates('iMin', iLayerB(0), iLayerB(1));
      const unconverged = identity((i, j) => prim3(blend(i, j)), r2b);
      two.setCellPrimitives((i, j) => saved[i + ni * j]!);
      three.setFaceStates('iMin', iLayer(0), iLayer(1));
      // The converged state: from the revolved reference, iterated until the residual stops falling.
      three.setCellPrimitives((i, j) => prim3(two.primitive(i + i0, j)));
      const r0 = three.densityResidualNorm();
      let steps = 0;
      let prev = r0;
      for (; steps < 20_000; steps += 200) {
        three.iterate(200);
        const r = three.densityResidualNorm();
        if (r >= 0.95 * prev) break;
        prev = r;
      }
      const aFree = Math.sqrt((GAMMA * fs.p) / fs.rho);
      const pFree = fs.p;
      let worstState = 0;
      let worstW = 0;
      for (let k = 0; k < nk; k++)
        for (let j = 0; j < nj; j++)
          for (let i = 0; i < n3; i++) {
            const a = three.primitive(i, j, k);
            const b = two.primitive(i + i0, j);
            worstState = Math.max(worstState, Math.abs(a.rho - b.rho) / fs.rho, Math.abs(a.u - b.u) / aFree, Math.abs(a.v - b.v) / aFree, Math.abs(a.p - b.p) / pFree);
            worstW = Math.max(worstW, Math.abs(a.w) / aFree);
          }
      const ok = converged.relative < 1e-13 && unconverged.relative < 1e-13 && worstState < 1e-12 && worstW < 1e-12;
      pass &&= ok;
      (caseReport.layouts as unknown[]).push({
        layout: layout.name,
        identityConverged: converged.relative,
        identityUnconverged: unconverged.relative,
        stateDifference: worstState,
        wOverSoundSpeed: worstW,
        steps3D: steps,
        residual3D: { start: r0, end: three.densityResidualNorm() },
        pass: ok,
      });
    }
    // (a'): a fin layout with zero thickness, the columns sheared over a fin's span and a tip row inserted
    // (the nodes' (x, r) the same on every layer): the flow stays independent of theta.
    {
      const nk = 4;
      const theta = [0, 1, 2, 3, 4].map((k) => (k * Math.PI) / 16);
      const tipRow = Math.floor(nj / 3);
      const rowOf = (j: number) => Math.min(j <= tipRow ? j : j - 1, nj - 1);
      const grid = gridFromFunction3D(n3, nj + 1, nk, (i, j, k) => {
        // Rows: the 2D rows with one more row inserted halfway into row tipRow.
        const jj = j <= tipRow ? j : j - 1;
        const q = i + i0 + (ni + 1) * jj;
        let x = g2.x[q]!;
        let r = g2.y[q]!;
        if (j === tipRow + 1) {
          const q2 = q + (ni + 1);
          x = 0.5 * (x + g2.x[q2]!);
          r = 0.5 * (r + g2.y[q2]!);
        }
        // Shear the columns over the fin's span (rows up to the tip row) by up to a fifth of a column.
        const shear = j <= tipRow + 1 ? 0.2 * (j / (tipRow + 1)) * (g2.x[i0 + 1]! - g2.x[i0]!) * Math.sin((Math.PI * i) / n3) : 0;
        return [x + shear, r, theta[k]!];
      });
      const inflowLayer = (g: number) => {
        const out: Primitive3D[] = [];
        for (let k = 0; k < nk; k++) for (let j = 0; j <= nj; j++) out.push(prim3(two.primitive(i0 - 1 - g, rowOf(j))));
        return out;
      };
      const top: Primitive3D[] = [];
      for (let k = 0; k < nk; k++) for (let i = 0; i < n3; i++) top.push(prim3(free[i + i0]!));
      const three = new Euler3D({
        grid,
        geometry: 'cylindrical',
        gamma: GAMMA,
        timeIntegrator: 'ssprk2',
        cfl: 0.8,
        timeStepping: 'local',
        boundaries: {
          iMin: { kind: 'faceStates', layer0: inflowLayer(0), layer1: inflowLayer(1) },
          iMax: { kind: 'outflow' },
          jMin: { kind: 'wall' },
          jMax: { kind: 'faceStates', layer0: top, layer1: top },
          kMin: { kind: 'wall' },
          kMax: { kind: 'wall' },
        },
      });
      three.setCellPrimitives((i, j) => prim3(two.primitive(i + i0, rowOf(j))));
      three.iterate(1000);
      const aFree = Math.sqrt((GAMMA * fs.p) / fs.rho);
      let worst = 0;
      for (let j = 0; j <= nj; j++)
        for (let i = 0; i < n3; i++) {
          const a = three.primitive(i, j, 0);
          for (let k = 1; k < nk; k++) {
            const b = three.primitive(i, j, k);
            worst = Math.max(worst, Math.abs(a.rho - b.rho) / fs.rho, Math.abs(a.u - b.u) / aFree, Math.abs(a.v - b.v) / aFree, Math.abs(b.w) / aFree, Math.abs(a.p - b.p) / fs.p);
          }
        }
      const ok = worst < 1e-13;
      pass &&= ok;
      caseReport.aPrime = { steps: 1000, thetaVariation: worst, pass: ok };
    }
    caseReport.seconds = (Date.now() - t0) / 1000;
    report.push(caseReport);
    mkdirSync(join(here, 'out'), { recursive: true });
    writeFileSync(join(here, 'out', 'rung-a.json'), JSON.stringify({ date: new Date().toISOString(), engine: 'CPU, double', cases: report }, null, 2) + '\n');
  }
  expect(pass).toBe(true);
});
