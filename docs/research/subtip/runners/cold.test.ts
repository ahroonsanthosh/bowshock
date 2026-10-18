// Throwaway: a cold fit to the 1e-12 tests on snap3 (no warm start, no early stop). Env: CASE, REF, OUT.
import { test } from 'vitest';
import { appendFileSync, readFileSync } from 'node:fs';
import { bodyOf, caseOf, gamma } from './common';
import { fittedFlow, sharpFitProblem } from './snap3/src/analysis/fitted-flow';
const c = caseOf(process.env.CASE!);
const r = Number(process.env.REF);
test(`cold ${c.id} ${r}`, () => {
  const t0 = Date.now();
  const { fit, drag } = fittedFlow(sharpFitProblem(bodyOf(c), { mach: c.mach, gamma, nj: 20, refinement: r }), 20000 * r);
  appendFileSync(process.env.OUT!, JSON.stringify({ t: new Date().toISOString(), commit: readFileSync('tests/tmp-subtip/snap3/COMMIT', 'utf8').trim(), kind: 'cold', id: c.id, refinement: r, drag, converged: fit.converged, iterations: fit.iterations, maxSpeed: fit.maxSpeed, residual: fit.residual, ni: fit.grid.ni, elapsed: (Date.now() - t0) / 1000 }) + '\n');
});
