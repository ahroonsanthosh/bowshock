// Throwaway (2026-10-22): the page's four-grid verdict on a Von Karman
// nose from the settled fits on nj = 20, 40, 80 and 160 (lane160.sh,
// lane160b.sh), with the page's options on the CPU (CPU_NOISE,
// ORDER_TOLERANCE, the allowance 8e-4), against the references of its
// marches (moc3.mjs, over the lines passing the line criterion):
// TAG=L1c1M2 (default): references 0.4285404450 to 0.4285433189, lowest
//   bound 0.4285327967;
// TAG=L3M2: references 0.08036083686 to 0.08037793594, lowest bound
//   0.08035623841.
// Run from tests/tmp-haackmoc/ with ONLY=tests/tmp-haackmoc/check160.test.ts;
// writes check160-<TAG>.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { CPU_NOISE, ORDER_TOLERANCE } from '../../src/analysis/verified-drag';
import { gridConvergence } from '../../src/verification/grid-convergence';

const FLOOR = 8e-4;
const TAG = process.env.TAG ?? 'L1c1M2';
const REFERENCES: Record<string, { low: number; high: number; lowestBound: number }> = {
  L1c1M2: { low: 0.428540445, high: 0.4285433189, lowestBound: 0.4285327967 },
  L3M2: { low: 0.08036083686, high: 0.08037793594, lowestBound: 0.08035623841 },
};

it('check160', () => {
  const drags = [1, 2, 4, 8].map((r) => {
    const head = JSON.parse(readFileSync(`tests/tmp-haackmoc/${TAG}r${r}.json`, 'utf8')) as {
      drag?: number;
    };
    // L3M2r4 was saved by fit.test.ts without its drag: 0006's table.
    return head.drag ?? (TAG === 'L3M2' && r === 4 ? 0.0804049623294 : Number.NaN);
  });
  const estimate = gridConvergence(drags, { noise: CPU_NOISE, orderTolerance: ORDER_TOLERANCE });
  const band =
    estimate.kind === 'unresolved'
      ? undefined
      : estimate.uncertainty + FLOOR * Math.abs(estimate.value);
  const references = REFERENCES[TAG]!;
  const value = drags[3]!;
  writeFileSync(
    `tests/tmp-haackmoc/check160-${TAG}.json`,
    JSON.stringify(
      {
        drags,
        estimate,
        band,
        relativeBand: band === undefined ? undefined : band / value,
        errorAgainstLowestBound: (value - references.lowestBound) / value,
        containsLowestBound: band === undefined ? undefined : band >= value - references.lowestBound,
        containsReferences:
          band === undefined
            ? undefined
            : value - band <= references.low && value + band >= references.high,
        references,
      },
      null,
      1,
    ),
  );
});
