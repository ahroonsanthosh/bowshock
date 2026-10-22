/** Hashes of transonic grids and a short solve, to show a merge leaves them bit for bit (OUT names the file). */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { solveTransonic, transonicProblem } from '../../src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';
import { transonicGrid } from '../../src/grid/transonic-grid';

const deg = Math.PI / 180;
const bodies: Record<string, Body> = {
  cone7: {
    nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
    cylinderLength: 0,
  },
  ogive5: { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 10, baseRadius: 1 }, cylinderLength: 0 },
  ell2: { nose: { shape: { kind: 'ellipsoid' }, length: 2, baseRadius: 1 }, cylinderLength: 0 },
};

it('grid hashes', () => {
  const out: Record<string, string> = {};
  for (const [name, body] of Object.entries(bodies)) {
    for (const refinement of [1, 2, 8]) {
      const g = transonicGrid(body, { refinement, farField: 100, cylinder: 10 }).grid;
      const h = createHash('sha256');
      h.update(Buffer.from(g.x.buffer));
      h.update(Buffer.from(g.y.buffer));
      out[`${name}-r${refinement}`] = h.digest('hex').slice(0, 16);
    }
  }
  const problem = transonicProblem(bodies.cone7!, { mach: 1.2, gamma: 1.4, refinement: 1, farField: 100, cylinder: 10 });
  const s = solveTransonic(problem, { noise: 1e-7, maxSteps: 300, checkEvery: 50, cfl: 1000, depth: 8, plainSteps: 200 });
  out.solve300 = s.drag.toPrecision(17);
  writeFileSync(process.env.OUT ?? 'tests/tmp-transonic/gridhash.json', JSON.stringify(out, null, 1));
});
