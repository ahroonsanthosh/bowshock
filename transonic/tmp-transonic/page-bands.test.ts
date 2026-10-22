/**
 * The procedure's band at page sizes: gridConvergence on the four finest
 * grids up to r = 8 (and up to 16 where solved), with the GPU engine's
 * noise (2e-6) and the CPU's (1e-7 settling), for every family measured.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { gridConvergence } from '../../src/verification/grid-convergence';

it('page bands', () => {
  const dir = 'tests/tmp-transonic/results';
  const out: string[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('-f100-c10.jsonl')) continue;
    const rows = readFileSync(`${dir}/${file}`, 'utf8')
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as { refinement: number; drag: number; converged: boolean });
    const by = new Map(rows.filter((r) => r.converged).map((r) => [r.refinement, r.drag]));
    for (const top of [8, 16]) {
      const values: number[] = [];
      for (let r = 1; r <= top && by.has(r); r *= 2) values.push(by.get(r)!);
      if (values.length < 4 || (top === 16 && !by.has(16))) continue;
      for (const noise of [1e-5, 2e-6]) {
        const e = gridConvergence(values.slice(-4), { orderTolerance: 0.5, noise });
        out.push(JSON.stringify({ file, top, noise, n: values.length, estimate: e }));
      }
    }
  }
  writeFileSync('tests/tmp-transonic/page-bands.jsonl', out.join('\n') + '\n');
});
