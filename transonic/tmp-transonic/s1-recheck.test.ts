/** Re-check of the certified families' grids against the fitted-window rule (re-review of dd6c423, item 1). */
import { readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { dampedOscillationBound } from '../../src/verification/iterative-convergence';

it('s1 recheck', () => {
  const out: string[] = ['| Family | r | Checks | Fitted windows | Decaying | Bound, of the drag |', '| --- | --- | --- | --- | --- | --- |'];
  for (const tag of ['cone7-m1.2-f100-c10', 'cone7-m1.1-f100-c10', 'cone7-m1.05-f100-c10', 'ogive3-m1.2-f100-c10']) {
    const rows = readFileSync(`tests/tmp-transonic/progress/${tag}.jsonl`, 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as { refinement: number; steps?: number; drag?: number })
      .filter((r) => r.drag !== undefined);
    for (const r of [1, 2, 4, 8, 16]) {
      // The last continuous run of this grid (a restart from a checkpoint begins a new history).
      const all = rows.filter((x) => x.refinement === r);
      if (all.length === 0) continue;
      let start = 0;
      for (let k = 1; k < all.length; k++) if (all[k]!.steps! <= all[k - 1]!.steps!) start = k;
      const h = all.slice(start).map((x) => x.drag!);
      const last = h[h.length - 1]!;
      const f = dampedOscillationBound(h, 1e-8 * Math.abs(last));
      out.push(`| ${tag} | ${r} | ${h.length} | ${f.fitted} | ${f.decaying} | ${(f.bound / Math.abs(last)).toExponential(2)} |`);
    }
  }
  writeFileSync('tests/tmp-transonic/s1-recheck.md', out.join('\n') + '\n');
});
