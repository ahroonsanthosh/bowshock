/**
 * Steps the explicit scheme (SSPRK2, local time steps, CFL 0.8: the GPU
 * engine's) needs to settle the drag to the GPU's noise (2e-6 of it) on
 * the 7 deg cone: r = 1 from the free stream, then r = 2 from r = 1's
 * explicit solution, as a page solve would. Env MACHS (comma list),
 * REFS (default 1,2), NOISE (default 2e-6), CHECK (steps per check at
 * r = 1, times r), MAXSTEPS. Appends to results/explicit-count.jsonl.
 */
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { transonicProblem, type TransonicProblem } from '../../src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';
import { SettlingValue } from '../../src/verification/iterative-convergence';

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};

it('explicit counts', { timeout: 172_800_000 }, () => {
  const machs = (process.env.MACHS ?? '1.2').split(',').map(Number);
  const refs = (process.env.REFS ?? '1,2').split(',').map(Number);
  const noise = Number(process.env.NOISE ?? 2e-6);
  const check = Number(process.env.CHECK ?? 50);
  const maxSteps = Number(process.env.MAXSTEPS ?? 400_000);
  for (const mach of machs) {
    let previous: { problem: TransonicProblem; solver: Euler2D } | null = null;
    for (const refinement of refs) {
      const problem = transonicProblem(cone, { mach, gamma: 1.4, refinement, farField: 100, cylinder: 10 });
      const solver = new Euler2D(problem.config);
      const free = problem.freeStream.state;
      if (previous === null) {
        solver.setInitialCondition(() => free);
      } else {
        const ratio = refinement / previous.problem.options.refinement;
        const coarse = previous.solver;
        solver.setCellPrimitives((i, j) => coarse.primitive(Math.floor(i / ratio), Math.floor(j / ratio)));
      }
      const settling = new SettlingValue(noise, Number.NaN);
      const every = check * refinement;
      const t0 = performance.now();
      let steps = 0;
      let drag = problem.drag(solver);
      let settled = false;
      while (steps < maxSteps && !settled) {
        solver.iterate(every);
        steps += every;
        drag = problem.drag(solver);
        settled = settling.add(drag);
      }
      const seconds = (performance.now() - t0) / 1000;
      appendFileSync(
        'tests/tmp-transonic/results/explicit-count.jsonl',
        JSON.stringify({
          mach,
          refinement,
          cells: problem.config.grid.ni * problem.config.grid.nj,
          noise,
          steps,
          settled,
          drag,
          seconds,
          cellStepsPerSecond: (problem.config.grid.ni * problem.config.grid.nj * steps) / seconds,
          date: new Date().toISOString(),
        }) + '\n',
      );
      previous = { problem, solver };
    }
  }
});
