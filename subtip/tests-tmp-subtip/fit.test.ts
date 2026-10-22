// Throwaway: fitted-shock runs on the snapshot with the subsonic-tip refusal removed.
// Env: CASE (A, B, C, S1, S2), RUNS = "refinement:start,..." (start in nose lengths), OUT.
import { test } from 'vitest';
import { append, bodyOf, caseOf, gamma } from './common';
import { fittedFlow, sharpFitProblem } from './snap/src/analysis/fitted-flow';
import { nodeIndex } from './snap/src/grid/structured';

const OUT = process.env.OUT!;
const c = caseOf(process.env.CASE!);
const anchor = process.env.ANCHOR ? Number(process.env.ANCHOR) : undefined;
const runs = process.env.RUNS!.split(',').map((r) => {
  const [refinement, start] = r.split(':');
  return { refinement: Number(refinement), start: Number(start) };
});

test(`fit ${c.id} ${process.env.RUNS}`, () => {
  const body = bodyOf(c);
  for (const { refinement, start } of runs) {
    const t0 = Date.now();
    const problem = sharpFitProblem(body, { mach: c.mach, gamma, nj: 20, refinement, start, anchor });
    const history: number[][] = [];
    const { fit, drag } = fittedFlow(problem, 20000 * refinement, (it, speed, residual, solver) => {
      const dragNow = problem.drag(solver.boundaryFluxes('jMin'));
      history.push([it, speed, residual, dragNow]);
      if (it % 2000 === 0) {
        append({ kind: 'progress', id: c.id, refinement, start, anchor: anchor ?? null, it, speed, residual, drag: dragNow }, `${OUT}.progress`);
      }
    });
    const elapsed = (Date.now() - t0) / 1000;
    const g = fit.grid;
    const wall = fit.solver.boundaryFluxes('jMin').map((f) => ({
      x: f.x,
      y: f.y,
      p: f.flux[1] * f.nx + f.flux[2] * f.ny,
      mass: f.flux[0],
    }));
    const shock = [];
    for (let i = 0; i <= g.ni; i++) {
      const k = nodeIndex(g, i, g.nj);
      shock.push([g.x[k]!, g.y[k]!]);
    }
    let outflowMach = Infinity;
    let wallMachMin = Infinity;
    let wallMachMax = 0;
    for (let j = 0; j < g.nj; j++) {
      const w = fit.solver.primitive(g.ni - 1, j);
      outflowMach = Math.min(outflowMach, w.u / Math.sqrt((gamma * w.p) / w.rho));
    }
    const wallMach: number[] = [];
    for (let i = 0; i < g.ni; i++) {
      const w = fit.solver.primitive(i, 0);
      const m = Math.hypot(w.u, w.v) / Math.sqrt((gamma * w.p) / w.rho);
      wallMach.push(m);
      wallMachMin = Math.min(wallMachMin, m);
      wallMachMax = Math.max(wallMachMax, m);
    }
    // First column of cells against the inflow it is fed (relative pressure difference).
    append(
      {
        kind: 'fit',
        id: c.id,
        mach: c.mach,
        refinement,
        nj: problem.nj,
        ni: g.ni,
        start,
        anchor: anchor ?? null,
        x0: problem.x0,
        slowestInflowMach: problem.inflowSlowestMach,
        tipDrag: problem.tipDrag,
        converged: fit.converged,
        iterations: fit.iterations,
        maxSpeed: fit.maxSpeed,
        residual: fit.residual,
        drag,
        elapsed,
        outflowMach,
        wallMachMin,
        wallMachMax,
        history,
        wall,
        wallMach,
        shock,
      },
      OUT,
    );
  }
});
