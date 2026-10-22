// Throwaway (2026-10-22): the page's four-grid verdict on the 1-caliber
// Von Karman nose (one caliber of cylinder) at Mach 2, from the settled
// fits on nj = 20, 40, 80 and 160 (lane160.sh), with the page's options
// on the CPU (CPU_NOISE, ORDER_TOLERANCE, the allowance 7e-4), against
// the references of the marches (moc3.mjs, "C0 L1 M2 cyl1": 0.42854045
// to 0.42854332, lowest bound 0.42853280). Run from tests/tmp-haackmoc/
// with ONLY=tests/tmp-haackmoc/check160.test.ts; writes check160.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { CPU_NOISE, ORDER_TOLERANCE } from '../../src/analysis/verified-drag';
import { gridConvergence } from '../../src/verification/grid-convergence';

const FLOOR = 7e-4;

it('check160', () => {
  const drags = [1, 2, 4, 8].map(
    (r) =>
      (
        JSON.parse(readFileSync(`tests/tmp-haackmoc/L1c1M2r${r}.json`, 'utf8')) as {
          drag: number;
        }
      ).drag,
  );
  const estimate = gridConvergence(drags, { noise: CPU_NOISE, orderTolerance: ORDER_TOLERANCE });
  const band =
    estimate.kind === 'unresolved'
      ? undefined
      : estimate.uncertainty + FLOOR * Math.abs(estimate.value);
  const references = { low: 0.4285404450, high: 0.4285433189, lowestBound: 0.4285327967 };
  const value = drags[3]!;
  writeFileSync(
    'tests/tmp-haackmoc/check160.json',
    JSON.stringify(
      {
        drags,
        estimate,
        band,
        relativeBand: band === undefined ? undefined : band / value,
        errorAgainstLowestBound: (value - references.lowestBound) / value,
        contains: band === undefined ? undefined : band >= value - references.lowestBound,
        references,
      },
      null,
      1,
    ),
  );
});
