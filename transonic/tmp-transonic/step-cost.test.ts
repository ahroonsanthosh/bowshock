/**
 * CPU time per cell and step of the explicit step (SSPRK2) and of the
 * LU-SGS step, on the cone's transonic grids r = 1 and 2 at Mach 1.1, in
 * process CPU seconds (the machine is shared, so wall time is not the
 * measure). Appends to results/step-cost.jsonl.
 */
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { transonicProblem } from '../../src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};

const cpuSeconds = () => {
  const u = process.cpuUsage();
  return (u.user + u.system) / 1e6;
};

it('step cost', { timeout: 3_600_000 }, () => {
  for (const refinement of [1, 2]) {
    const problem = transonicProblem(cone, { mach: 1.1, gamma: 1.4, refinement, farField: 100, cylinder: 10 });
    const cells = problem.config.grid.ni * problem.config.grid.nj;
    const steps = refinement === 1 ? 400 : 100;
    const solver = new Euler2D(problem.config);
    solver.setInitialCondition(() => problem.freeStream.state);
    solver.iterate(20);
    let t = cpuSeconds();
    solver.iterate(steps);
    const explicit = (cpuSeconds() - t) / (cells * steps);
    solver.iterateImplicit(20, 1);
    t = cpuSeconds();
    solver.iterateImplicit(steps, 100);
    const implicit = (cpuSeconds() - t) / (cells * steps);
    appendFileSync(
      'tests/tmp-transonic/results/step-cost.jsonl',
      JSON.stringify({ refinement, cells, steps, explicitCpuPerCellStep: explicit, lusgsCpuPerCellStep: implicit, date: new Date().toISOString() }) + '\n',
    );
  }
});
