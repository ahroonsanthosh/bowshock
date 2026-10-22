// Throwaway: shared column positions between the default and density-1.5 layouts (no solve).
import { test } from 'vitest';
import { appendFileSync } from 'node:fs';
import { bodyOf, caseOf, gamma } from './common';
import { sharpFitProblem } from './snap3/src/analysis/fitted-flow';
test('cols', () => {
  for (const id of ['E', 'A', 'P']) {
    const c = caseOf(id);
    for (const r of [1, 2, 4, 8]) {
      const a = sharpFitProblem(bodyOf(c), { mach: c.mach, gamma, nj: 20, refinement: r }).lines.map((l) => l.x);
      const b = sharpFitProblem(bodyOf(c), { mach: c.mach, gamma, nj: 20, refinement: r, columnDensityScale: 1.5 }).lines.map((l) => l.x);
      const shared = a.filter((x) => b.some((y) => Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x))));
      appendFileSync(process.env.OUT!, JSON.stringify({ id, r, default: a.length - 1, dense: b.length - 1, shared }) + '\n');
    }
  }
});
