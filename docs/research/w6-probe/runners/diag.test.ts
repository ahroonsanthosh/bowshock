// W6 probe diagnostic: where along the body the family's drag changes.
// For each saved fit of a case (SAVES: comma-separated save paths without
// extension, coarsest first), the drag of the wall faces ahead of fixed
// stations x (STATIONS), from the saved cells on the fitted grid, so the
// changes between grids can be split by region. Env: RATIO, M, CAL, CYL.
import { readFileSync } from 'node:fs';
import { it } from 'vitest';
import { bluntFitFamily, wallDrag } from '../../src/analysis/fitted-flow';
import { forebodyPressureDrag } from '../../src/analysis/forces';
import { freeStreamAt } from '../../src/analysis/verified-drag';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { cappedNose } from '../../src/geometry/nose';
import { gridOnLines } from '../../src/grid/blunt-grid';
import { nodeIndex } from '../../src/grid/structured';
import { append, cappedOgive, caseId, gamma, log } from './common';

const RATIO = Number(process.env.RATIO ?? 0.05);
const M = Number(process.env.M ?? 2);
const CAL = Number(process.env.CAL ?? 5);
const CYL = Number(process.env.CYL ?? 2);
const SAVES = (process.env.SAVES ?? '').split(',').filter(Boolean);

it('drag by region', () => {
  const body = cappedOgive(CAL, RATIO, CYL);
  const rn = body.nose.tipRadius!;
  const xt = cappedNose(body.nose).tangentX;
  const stations = (
    process.env.STATIONS ??
    `${rn / 2},${xt},${2 * xt},${5 * xt},${0.3},${1},${2},${3},${4},${5},${7}`
  )
    .split(',')
    .map(Number);
  const family = bluntFitFamily(body, { mach: M, gamma, nj: 20 });
  const free = freeStreamAt(M, gamma);
  SAVES.forEach((save, k) => {
    const refinement = 2 ** k;
    const problem = family(refinement);
    const head = JSON.parse(readFileSync(`${save}.json`, 'utf8')) as {
      heights: number[];
      ni: number;
      nj: number;
      drag: number;
    };
    const cells = new Float64Array(readFileSync(`${save}.bin`).buffer.slice(0));
    const grid = gridOnLines(problem.lines, head.heights, problem.nj, problem.baseRadius, false);
    const cell = (i: number, j: number) => {
      const q = 4 * (i + j * head.ni);
      return { rho: cells[q]!, u: cells[q + 1]!, v: cells[q + 2]!, p: cells[q + 3]! };
    };
    const total = wallDrag(problem, grid, cell);
    const solver = new Euler2D(problem.configFor(grid, []));
    solver.setCellPrimitives(cell);
    const wall = solver.boundaryFluxes('jMin');
    // Each face's drag spread evenly over its axial extent, so that a
    // face straddling a station counts in part (a whole-face cut would
    // carry an error of one face's drag, first order in the spacing).
    const faceDrag = wall.map((f) => forebodyPressureDrag([f], free, problem.baseRadius));
    const xs = Array.from({ length: grid.ni + 1 }, (_, i) => grid.x[nodeIndex(grid, i, 0)]!);
    const ahead = stations.map((x) => {
      let sum = 0;
      faceDrag.forEach((d, i) => {
        const a = xs[i]!;
        const b = xs[i + 1]!;
        const w = b > a ? Math.min(Math.max((x - a) / (b - a), 0), 1) : x > a ? 1 : 0;
        sum += w * d;
      });
      return sum;
    });
    log(`diag ${caseId(CAL, RATIO, M, CYL)} r${refinement}: total ${total} saved ${head.drag}`);
    append({
      kind: 'diag',
      id: caseId(CAL, RATIO, M, CYL),
      REF: refinement,
      total,
      saved: head.drag,
      stations,
      ahead,
    });
  });
});
