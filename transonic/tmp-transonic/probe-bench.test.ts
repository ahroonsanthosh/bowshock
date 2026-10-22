import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { transonicProblem } from '../../src/analysis/transonic-flow';
import { Euler2D } from '../../src/engine-cpu/euler2d';

const deg = Math.PI / 180;
it('bench', () => {
  const body = {
    nose: { shape: { kind: 'conical' as const }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
    cylinderLength: 0,
  };
  const problem = transonicProblem(body, { mach: 1.05, gamma: 1.4, refinement: 1, farField: 100, cylinder: 10 });
  const s = new Euler2D(problem.config);
  s.setInitialCondition(() => problem.freeStream.state);
  s.iterateImplicit(50, 10);
  const t0 = performance.now();
  for (let k = 0; k < 200; k++) s.residualVector();
  const t1 = performance.now();
  s.iterateImplicit(200, 1000);
  const t2 = performance.now();
  appendFileSync(
    'tests/tmp-transonic/bench.jsonl',
    JSON.stringify({ cells: problem.config.grid.ni * problem.config.grid.nj, residualMs: (t1 - t0) / 200, lusgsMs: (t2 - t1) / 200 }) + '\n',
  );
});
