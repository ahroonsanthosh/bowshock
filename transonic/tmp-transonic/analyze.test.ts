/**
 * Grid-convergence analysis of the measured families: for each results
 * file, the drags on the grids solved (coarsest first), the changes, the
 * observed order of each triple, the Richardson extrapolation at the
 * observed order (capped at 2) and the procedure's band
 * (gridConvergence, docs/design/0005), written to
 * tests/tmp-transonic/analysis.jsonl (replaced).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { gridConvergence } from '../../src/verification/grid-convergence';

interface Row {
  refinement: number;
  drag: number;
  converged: boolean;
  steps: number;
  seconds: number;
  ni: number;
  nj: number;
}

it('analyze', () => {
  const dir = 'tests/tmp-transonic/results';
  const lines: string[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.jsonl') || file.startsWith('fitted-')) continue;
    const rows = readFileSync(`${dir}/${file}`, 'utf8')
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as Row)
      .filter((r) => r.converged)
      .sort((a, b) => a.refinement - b.refinement);
    const byRefinement = new Map(rows.map((r) => [r.refinement, r]));
    const levels: Row[] = [];
    for (let r = 1; byRefinement.has(r); r *= 2) levels.push(byRefinement.get(r)!);
    const values = levels.map((l) => l.drag);
    const changes = values.slice(1).map((v, k) => v - values[k]!);
    const orders = changes
      .slice(1)
      .map((e21, k) => Math.log(Math.abs(changes[k]! / e21)) / Math.log(2));
    let extrapolated: number | null = null;
    if (values.length >= 3) {
      const p = Math.min(orders[orders.length - 1]!, 2);
      const e21 = changes[changes.length - 1]!;
      extrapolated = values[values.length - 1]! + e21 / (2 ** p - 1);
    }
    const estimate = gridConvergence(values, { orderTolerance: 0.5, noise: 1e-7 });
    lines.push(
      JSON.stringify({
        tag: file.replace('.jsonl', ''),
        refinements: levels.map((l) => l.refinement),
        cells: levels.map((l) => l.ni * l.nj),
        values,
        changes,
        orders,
        extrapolated,
        estimate,
        steps: levels.map((l) => l.steps),
        seconds: levels.map((l) => Math.round(l.seconds)),
      }),
    );
  }
  writeFileSync('tests/tmp-transonic/analysis.jsonl', lines.join('\n') + '\n');
});
