// Throwaway: the fit problems of refinements 1, 2 and 4 nest (startedFrom's
// conditions): line 2k of the finer grid is line k of the coarser, with the
// same node fractions and heights at every coarse node. Env: SHAPE, C, L, M, CYL.
import { it } from 'vitest';
import { bluntFitFamily } from '../../src/analysis/fitted-flow';
import { ellipsoid, gamma, haack, log } from './common';

const SHAPE = process.env.SHAPE ?? 'haack';
const C = Number(process.env.C ?? 0);
const L = Number(process.env.L ?? 3);
const M = Number(process.env.M ?? 2);
const CYL = Number(process.env.CYL ?? 2);
const id = `${SHAPE} C${C} L${L} M${M} cyl${CYL}`;

it(`nesting ${id}`, () => {
  const body = SHAPE === 'ellipsoid' ? ellipsoid(L, CYL) : haack(C, L, CYL);
  const t0 = performance.now();
  const family = bluntFitFamily(body, { mach: M, gamma, nj: 20 });
  const problems = [1, 2, 4].map((r) => family(r));
  for (let k = 0; k + 1 < problems.length; k++) {
    const coarse = problems[k]!;
    const fine = problems[k + 1]!;
    const n = coarse.lines.length - 1;
    let worstPos = 0;
    let worstFrac = 0;
    let worstHeight = 0;
    let worstDir = 0;
    const ok = fine.lines.length - 1 === 2 * n && fine.nj === 2 * coarse.nj;
    if (ok) {
      for (let i = 0; i <= n; i++) {
        const a = coarse.lines[i]!;
        const b = fine.lines[2 * i]!;
        worstPos = Math.max(worstPos, Math.abs(a.x - b.x), Math.abs(a.y - b.y));
        worstDir = Math.max(worstDir, Math.abs(a.dx - b.dx), Math.abs(a.dy - b.dy));
        worstHeight = Math.max(worstHeight, Math.abs(coarse.heights[i]! - fine.heights[2 * i]!));
        for (let j = 0; j <= coarse.nj; j++) {
          worstFrac = Math.max(worstFrac, Math.abs(a.fractions![j]! - b.fractions![2 * j]!));
        }
      }
    }
    log(
      `${id}: refinements ${2 ** k} and ${2 ** (k + 1)} (${coarse.lines.length - 1}x${coarse.nj} and ${fine.lines.length - 1}x${fine.nj}): ${ok ? 'counts match' : 'COUNTS DIFFER'}; worst line position difference ${worstPos.toExponential(2)}, direction ${worstDir.toExponential(2)}, height ${worstHeight.toExponential(2)}, fraction ${worstFrac.toExponential(2)} (startedFrom needs 1e-12); standoff ${coarse.heights[0]!.toExponential(5)}`,
    );
  }
  log(`${id}: nesting check in ${((performance.now() - t0) / 1000).toFixed(0)}s`);
});
