/**
 * Where the implicit steps go unstable at Mach 1 on 800 radii (base grid of
 * the 7 deg cone): at checks before and after the residual starts to grow,
 * the cells with the largest implicit change of density (relative), with
 * their position and Mach number. Writes probe-m1-instab.jsonl.
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { solveTransonic, transonicProblem } from '../../src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};

it('probe', () => {
  const out = 'tests/tmp-transonic/probe-m1-instab.jsonl';
  writeFileSync(out, '');
  const far = Number(process.env.FAR ?? 800);
  const problem = transonicProblem(cone, { mach: 1, gamma: 1.4, refinement: 1, farField: far, cylinder: 10 });
  const { ni, nj } = problem.config.grid;
  const g = problem.config.grid;
  let best = Infinity;
  let snapshots = 0;
  const snap = (steps: number, residual: number, solver: Parameters<NonNullable<Parameters<typeof solveTransonic>[1]['onCheck']>>[0]['solver']) => {
    const dq = solver.implicitCorrection(1000);
    const cells: { i: number; j: number; rel: number }[] = [];
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const w = solver.primitive(i, j);
        cells.push({ i, j, rel: Math.abs(dq[4 * (i + j * ni)]!) / w.rho });
      }
    }
    cells.sort((a, b) => b.rel - a.rel);
    const top = cells.slice(0, 15).map(({ i, j, rel }) => {
      const k = (ii: number, jj: number) => ii + jj * (ni + 1);
      const x = 0.25 * (g.x[k(i, j)]! + g.x[k(i + 1, j)]! + g.x[k(i, j + 1)]! + g.x[k(i + 1, j + 1)]!);
      const y = 0.25 * (g.y[k(i, j)]! + g.y[k(i + 1, j)]! + g.y[k(i, j + 1)]! + g.y[k(i + 1, j + 1)]!);
      const w = solver.primitive(i, j);
      const mach = Math.hypot(w.u, w.v) / Math.sqrt((1.4 * w.p) / w.rho);
      return { i, j, x: +x.toFixed(2), y: +y.toFixed(2), rel: +rel.toExponential(3), mach: +mach.toFixed(5) };
    });
    appendFileSync(out, JSON.stringify({ steps, residual, ni, nj, top }) + '\n');
  };
  try {
    solveTransonic(problem, {
      noise: 1e-12,
      maxSteps: 12000,
      checkEvery: 50,
      cfl: 1000,
      depth: 0,
      plainSteps: 0,
      onCheck: (c) => {
        if (c.steps === 3000) snap(c.steps, c.residual, c.solver);
        best = Math.min(best, c.residual);
        if (c.steps > 3000 && c.residual > 2 * best && snapshots < 4) {
          snapshots++;
          snap(c.steps, c.residual, c.solver);
          best = c.residual / 2 > best ? c.residual / 2 : best;
        }
        if (snapshots >= 4) throw new Error('enough');
      },
    });
  } catch (e) {
    if (!(e instanceof Error && e.message === 'enough')) throw e;
  }
});
