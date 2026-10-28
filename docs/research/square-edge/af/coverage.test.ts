/**
 * How many cases of the refusal audit's population (docs/research/refusals,
 * 2000 rockets at four Mach bands, the same draws as its impact.test.ts)
 * have a square-cut leading edge whose face Reynolds number lies inside the
 * range the paired flat-face sets measured (0014 section 10.7 (af),
 * addendum (d); the coordinator's ruling of 2026-10-27; 0016 section
 * 21.6). The face Reynolds number is on free-stream conditions, on the
 * fin's thickness, with the velocity's component normal to the leading
 * edge. Run from the repository root:
 *
 *   ONLY=./af/coverage.test.ts nice -n 10 npx vitest run --config docs/research/square-edge/vitest.config.ts
 *
 * It checks a fresh run against the committed af/out/coverage.out and that
 * no square-cut case lies inside either range (the outcome the square edge's
 * staying unwired rests on); with UPDATE=1 it rewrites af/out/coverage.out
 * instead of checking it (added 2026-10-28, Fable's review).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import {
  atmosphere,
  drawAltitude,
  MACH_BANDS,
  mulberry32,
  population,
} from '../../refusals/population';

const here = dirname(fileURLToPath(import.meta.url));
const DEG = Math.PI / 180;

/** The two ranges (0016 section 21.6): as b0590ba computed it, and under the pinned definition. */
const RANGES = [
  { name: 'as computed in b0590ba, before the definition', low: 0.9e6, high: (14e6 * 3.7) / 12 },
  { name: 'under the pinned definition', low: (14e6 * 3.3) / 12, high: (14e6 * 3.7) / 12 },
] as const;

it('square-cut leading edges of the population inside the measured face Reynolds numbers', () => {
  const rockets = population(2000);
  const rand = mulberry32(7);
  let cases = 0;
  let square = 0;
  let largest = 0;
  let largestAt = '';
  const inside = RANGES.map(() => ({ re: 0, domain: 0 }));
  const lines: string[] = [];
  for (const r of rockets) {
    MACH_BANDS.forEach(([lo, hi]) => {
      // The same draws, in the same order, as impact.test.ts's evaluateAll(rockets, 7).
      const mach = lo + (hi - lo) * (0.0005 + 0.999 * rand());
      const altitudeKm = drawAltitude(rand(), rand());
      cases++;
      if (r.section !== 'square-both') return;
      square++;
      const air = atmosphere(altitudeKm);
      const cos = Math.cos(r.leadingEdgeSweepDeg * DEG);
      const re = ((air.rho * air.a * mach) / air.mu) * r.thickness * cos;
      if (re > largest) {
        largest = re;
        largestAt = `rocket ${r.id}, M ${mach.toFixed(3)}, ${altitudeKm.toFixed(1)} km, thickness ${(r.thickness * 1000).toFixed(2)} mm, LE sweep ${r.leadingEdgeSweepDeg.toFixed(1)} deg`;
      }
      const mn = mach * cos;
      RANGES.forEach((g, i) => {
        if (re >= g.low && re <= g.high) {
          inside[i]!.re++;
          if (mn >= 2.0 && mn <= 3.0 && r.leadingEdgeSweepDeg <= 60) inside[i]!.domain++;
        }
      });
    });
  }
  lines.push(
    'Square-cut leading edges of the refusal audit population inside the measured face Reynolds numbers',
    '(free-stream conditions, on the thickness, the component normal to the leading edge)',
    '',
    `cases: ${cases}; with square-cut leading edges: ${square}`,
    `the largest face Reynolds number of any square-cut case: ${largest.toExponential(3)} (${largestAt})`,
  );
  RANGES.forEach((g, i) => {
    lines.push(
      `range ${g.name}, ${g.low.toExponential(3)} to ${g.high.toExponential(3)}: ` +
        `${inside[i]!.re} cases inside; ${inside[i]!.domain} also at M_n 2.0 to 3.0 and sweep 60 deg or less`,
    );
  });
  const text = lines.join('\n') + '\n';
  console.log(text);
  const file = join(here, 'out', 'coverage.out');
  if (process.env.UPDATE === '1') {
    mkdirSync(join(here, 'out'), { recursive: true });
    writeFileSync(file, text);
  } else {
    expect(text).toBe(readFileSync(file, 'utf8'));
  }
  // The outcome: no square-cut case inside either range, in the domain or out of it.
  expect(inside.map((x) => x.re)).toEqual([0, 0]);
  expect(inside.map((x) => x.domain)).toEqual([0, 0]);
  expect(largest).toBeLessThan(RANGES[0].low);
});
