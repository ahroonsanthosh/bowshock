import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { transonicProblem } from '../../src/analysis/transonic-flow';
import { Euler2D } from '../../src/engine-cpu/euler2d';

const out = `tests/tmp-transonic/probe-mode-${process.env.TAG ?? 'a'}.jsonl`;
const deg = Math.PI / 180;
it('slow mode', () => {
  const body = {
    nose: { shape: { kind: 'conical' as const }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
    cylinderLength: 0,
  };
  const mach = Number(process.env.MACH ?? 1.05);
  const problem = transonicProblem(body, { mach, gamma: 1.4, refinement: 1, farField: 100, cylinder: 10 });
  const s = new Euler2D(problem.config);
  s.setInitialCondition(() => problem.freeStream.state);
  let cfl = 1;
  for (let k = 0; k < 1500; k++) {
    s.iterateImplicit(1, cfl, 1.5);
    cfl = Math.min(1000, cfl * 1.2);
  }
  const a = s.conserved();
  s.iterateImplicit(300, cfl, 1.5);
  const b = s.conserved();
  const { ni, nj, centroidX, centroidY, volume } = s.metrics;
  const cells: { i: number; j: number; x: number; y: number; d: number; dv: number }[] = [];
  let total = 0;
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      const c = i + j * ni;
      const d = Math.abs(b[4 * c]! - a[4 * c]!);
      total += d * volume[c]!;
      cells.push({ i, j, x: centroidX[c]!, y: centroidY[c]!, d, dv: d * volume[c]! });
    }
  }
  cells.sort((p, q) => q.d - p.d);
  appendFileSync(out, JSON.stringify({ top: cells.slice(0, 25) }) + '\n');
  // Distribution of the change by region.
  const region = (x: number, y: number) =>
    x < -20 ? 'far-up' : x < 0 ? (y < 5 ? 'near-up-axis' : 'up-high') : x < 8.2 ? (y < 3 ? 'nose-near' : y < 15 ? 'nose-mid' : 'nose-far') : y < 3 ? 'cyl-near' : y < 15 ? 'cyl-mid' : 'cyl-far';
  const sums: Record<string, number> = {};
  for (const c of cells) sums[region(c.x, c.y)] = (sums[region(c.x, c.y)] ?? 0) + c.dv / total;
  const dragA = problem.drag(s);
  appendFileSync(out, JSON.stringify({ sums, dragA }) + '\n');
  // Profiles along the axis line j = 0 and along the column through the shoulder.
  const axis = [];
  for (let i = 0; i < ni; i += 2) {
    const c = i;
    axis.push([+centroidX[c]!.toFixed(2), +(b[4 * c]! - a[4 * c]!).toExponential(2)]);
  }
  appendFileSync(out, JSON.stringify({ axis }) + '\n');
});
