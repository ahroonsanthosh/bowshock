// Throwaway: quality of the fitted grids saved by family.test.ts (no solve). Env: CASE, FAMILY, SCALE, REF, STATE, OUT.
import { test } from 'vitest';
import { appendFileSync, readFileSync } from 'node:fs';
import { bodyOf, caseOf, gamma } from './common';
import { sharpFitProblem } from './snap3/src/analysis/fitted-flow';
import { gridOnLines } from './snap3/src/grid/blunt-grid';
import { FITTED_QUALITY_LIMITS, gridQuality, qualityFailures } from './snap3/src/grid/quality';
import { nodeIndex } from './snap3/src/grid/structured';
const c = caseOf(process.env.CASE!);
test('grid quality', () => {
  const r = Number(process.env.REF);
  const p = sharpFitProblem(bodyOf(c), { mach: c.mach, gamma, nj: 20, refinement: r, columnDensityScale: Number(process.env.SCALE ?? 1) });
  const b = readFileSync(`${process.env.STATE}/${c.id}-${process.env.FAMILY}-r${r}.bin`);
  const a = new Float64Array(b.buffer, b.byteOffset, b.byteLength / 8);
  const heights = Array.from(a.subarray(6, 6 + a[0]!));
  const g = gridOnLines(p.lines, heights, p.nj, p.baseRadius, false);
  const q = gridQuality(g);
  // Largest aspect ratio and where.
  let worst = { ratio: 0, i: -1, j: -1, x: 0, y: 0 };
  for (let j = 0; j < g.nj; j++) for (let i = 0; i < g.ni; i++) {
    const n = (ii: number, jj: number) => { const k = nodeIndex(g, ii, jj); return [g.x[k]!, g.y[k]!]; };
    const [a0, a1] = n(i, j), [b0, b1] = n(i + 1, j), [c0, c1] = n(i, j + 1);
    const di = Math.hypot(b0! - a0!, b1! - a1!), dj = Math.hypot(c0! - a0!, c1! - a1!);
    const ratio = Math.max(di / dj, dj / di);
    if (ratio > worst.ratio) worst = { ratio, i, j, x: a0!, y: a1! };
  }
  appendFileSync(process.env.OUT!, JSON.stringify({ id: c.id, family: process.env.FAMILY, refinement: r, ni: g.ni, nj: g.nj, failures: qualityFailures(q, FITTED_QUALITY_LIMITS), worst, L: c.length }) + '\n');
});
