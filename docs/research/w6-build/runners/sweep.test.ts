// Diagnostics: the third march on several lines and intervals of one grid (not a registered run).
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { characteristicsFromShocked } from '../../src/validation/characteristics-shocked';
import { caseFromEnv } from './common';
import { downstreamDrag, effectiveMach, fittedDragFrom, gamma, lineData, loadFit } from './fitdata';

const say = (s: string) => appendFileSync(process.env.DIAG_OUT ?? 'sweep.txt', s + '\n');

it('sweep', () => {
  const { body, mach: M } = caseFromEnv();
  const r = Number(process.env.R ?? 1);
  const f = loadFit(body, M, r, process.env.FILE!);
  const mach = effectiveMach(f);
  const lines = (process.env.LINES ?? '22').split(',').map(Number);
  const ns = (process.env.NS ?? '640').split(',').map(Number);
  for (const base of lines) {
    const d = lineData(f, base * r);
    const fitted = fittedDragFrom(f, base * r);
    for (const n of ns) {
      let fewest = Infinity;
      try {
        const s = characteristicsFromShocked(f.body, d.start, {
          mach,
          gamma,
          intervals: n,
          onLine: (pts) => {
            fewest = Math.min(fewest, pts.length);
          },
        });
        const drag = downstreamDrag(f.body, mach, s.wall);
        say(
          `r ${r} line ${base} n ${n}: fitted - march ${((fitted - drag) / f.drag).toExponential(3)}, mass ${s.massBalance.toExponential(2)}, penetration ${s.penetration.toExponential(1)}, formed ${s.formed ? s.formed.x.toFixed(4) : '-'}, merged ${s.merged ? s.merged.x.toFixed(4) : '-'}, embedded ${s.embedded.length}, fewest points on a line ${fewest}`,
        );
      } catch (err) {
        say(`r ${r} line ${base} n ${n}: ${(err as Error).message}; fewest points on a line ${fewest}`);
      }
    }
  }
});
