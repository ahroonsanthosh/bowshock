/**
 * The body base below Mach 1.5: work item W2 of docs/design/0014-refusals.md,
 * recorded in docs/design/0015-fins-at-the-base.md section 11. Cylindrical
 * afterbody, turbulent layer, power off, M 1.0 to 1.5.
 *
 * - **Value:** Love's basic curve of TN 3819 fig. 18 (./tn3819-fig18.ts)
 *   continued below 1.5 (its rows at M 1.0, 1.2, 1.4 and 1.5), linear in
 *   M as above, times the band's midpoint (a method choice, as for W1's
 *   brackets: every free-flight datum below M 1.5 lies above the curve).
 * - **Band, over the curve:** from the band-setting low end of M 1.5 to
 *   3.0 (./compiled-curve.ts; 0.77 since 0014 section 10.7 (ah), 0.82
 *   before) carried down, since no finless datum below the curve was found
 *   under M 1.5, to the largest free-flight
 *   datum over the curve below M 1.5 plus its reading error, rounded
 *   outward: RM L52E06 fig. 8's finless PARD body A (each reading), with
 *   TN 3819 fig. 18's free-flight curve beside it. Carried flat over M 1.3
 *   to 1.5, where no free-flight data were found (0014's W2 item).
 *
 * RM L52E06's base pressures are band-setting while the same body's totals
 * are held back (0014 section 10.1): at Mach 1.0 to 1.3 the PARD body's
 * hold-out tests a total whose base term was set on that body, and its
 * record says so.
 */

import {
  COMPILED_CURVE_BAND,
  COMPILED_CURVE_CURVATURE_BOUND,
  compiledCurveValue,
  interpolationErrorBound,
} from './compiled-curve';
import type { CompiledCurveBasePressure } from './compiled-curve';
import { BaseRefusal } from './refusal';
import { TN3819_FIG18_ROUND7 } from './tn3819-fig18';

/** Where this term serves; from M 1.5 the compiled curve's own band (./compiled-curve.ts) applies. */
export const W2_MACH_RANGE = [1.0, 1.5] as const;

export type W2Reading = 'w2 first' | 'round 6';

/**
 * NACA RM L52E06 (Hart 1952) fig. 8: C_DB of configuration A, the finless PARD body in free flight, rim and
 * centre pressures over their areas (on the base area, so -P_B). Readings: this work's first
 * (docs/research/total-drag/data/w2_l52e06_fig8_output.txt; near the peak the curve runs within 0.0012 of
 * the 0.24 gridline, its error there) and round 6's, blind (audit/round6, 5531c84). M 1.025 to 1.28, where
 * both are read off the steep rise.
 */
export interface L52e06Fig8Point {
  readonly mach: number;
  readonly cdb: number;
  readonly error: number;
}

export const L52E06_FIG8_A: readonly {
  readonly reading: W2Reading;
  readonly points: readonly L52e06Fig8Point[];
}[] = [
  {
    reading: 'w2 first',
    points: [
      { mach: 1.025, cdb: 0.2357, error: 0.001 },
      { mach: 1.04, cdb: 0.2388, error: 0.0012 },
      { mach: 1.045, cdb: 0.2388, error: 0.0012 },
      { mach: 1.05, cdb: 0.2388, error: 0.0012 },
      { mach: 1.055, cdb: 0.2389, error: 0.0012 },
      { mach: 1.06, cdb: 0.2386, error: 0.0012 },
      { mach: 1.075, cdb: 0.2337, error: 0.0012 },
      { mach: 1.1, cdb: 0.2257, error: 0.0008 },
      { mach: 1.15, cdb: 0.2228, error: 0.0005 },
      { mach: 1.2, cdb: 0.2226, error: 0.0005 },
      { mach: 1.25, cdb: 0.2225, error: 0.0005 },
      { mach: 1.28, cdb: 0.2198, error: 0.0005 },
    ],
  },
  {
    reading: 'round 6',
    points: [
      { mach: 1.025, cdb: 0.2354, error: 0.0005 },
      { mach: 1.05, cdb: 0.2396, error: 0.0005 },
      { mach: 1.075, cdb: 0.2338, error: 0.0005 },
      { mach: 1.1, cdb: 0.226, error: 0.0005 },
      { mach: 1.15, cdb: 0.2228, error: 0.0005 },
      { mach: 1.2, cdb: 0.2228, error: 0.0005 },
      { mach: 1.25, cdb: 0.2225, error: 0.0005 },
      { mach: 1.28, cdb: 0.2197, error: 0.0005 },
    ],
  },
];

/**
 * TN 3819 fig. 18's free-flight curve (Langley, R 30e6 to 35e6) over the compiled curves (both), 0008's reading
 * (docs/research/total-drag/data/love18_ff_output.txt): the range at each read Mach number. Its second reading
 * is round 7's (TN3819_FIG18_FREE_FLIGHT_ROUND7); the two agree within 0.0005 (0015 section 11.3).
 */
export const TN3819_FIG18_FREE_FLIGHT_OVER_CURVE: readonly {
  readonly mach: number;
  readonly low: number;
  readonly high: number;
}[] = [
  { mach: 1.057, low: 1.096, high: 1.122 },
  { mach: 1.149, low: 1.027, high: 1.048 },
  { mach: 1.159, low: 1.031, high: 1.052 },
  { mach: 1.214, low: 1.057, high: 1.076 },
];

/**
 * TN 3819 fig. 18's free-flight curve, round 7's blind reading (data/round7/tn3819_fig18.csv; audit/round7 on
 * another branch, 92fb693): P_B every 0.05 in M from 1.05 and its extremes, each with its reading error. Drawn
 * from M 1.008 to 1.279; not read at M 1.0, where it cannot be told from the border.
 */
export const TN3819_FIG18_FREE_FLIGHT_ROUND7: readonly {
  readonly mach: number;
  readonly pB: number;
  readonly error: number;
}[] = [
  { mach: 1.05, pB: -0.2066, error: 0.0003 },
  { mach: 1.0606, pB: -0.2073, error: 0.0002 },
  { mach: 1.1, pB: -0.1991, error: 0.0006 },
  { mach: 1.1445, pB: -0.1931, error: 0.0002 },
  { mach: 1.15, pB: -0.1931, error: 0.0002 },
  { mach: 1.2, pB: -0.1975, error: 0.0004 },
  { mach: 1.2185, pB: -0.1978, error: 0.0002 },
  { mach: 1.25, pB: -0.197, error: 0.0002 },
];

/** Every free-flight datum below M 1.5 over Love's basic curve, each moved by its error toward a larger ratio. */
export function w2FreeFlightRatios(): { source: string; mach: number; ratio: number }[] {
  const out: { source: string; mach: number; ratio: number }[] = [];
  for (const r of L52E06_FIG8_A) {
    for (const p of r.points) {
      out.push({
        source: `RM L52E06 fig. 8, A (${r.reading})`,
        mach: p.mach,
        ratio: (p.cdb + p.error) / Math.abs(compiledCurveValue(p.mach, 'lessNegative')),
      });
    }
  }
  for (const p of TN3819_FIG18_FREE_FLIGHT_OVER_CURVE) {
    out.push({ source: "TN 3819 fig. 18's free-flight curve (0008)", mach: p.mach, ratio: p.high });
  }
  for (const p of TN3819_FIG18_FREE_FLIGHT_ROUND7) {
    out.push({
      source: "TN 3819 fig. 18's free-flight curve (round 7)",
      mach: p.mach,
      ratio: (Math.abs(p.pB) + p.error) / Math.abs(compiledCurveValue(p.mach, 'lessNegative')),
    });
  }
  return out;
}

/**
 * The curvature bound below M 1.5. The bound of ./compiled-curve.ts is set on the twice-read nodes from M 1.5
 * (0.063) and does not hold below: round 7's rows at M 1.1 and 1.3 lie off the chord of its own neighbouring
 * rows by 0.0006 and 0.00055, where that bound allows 0.0003 (the basic curve bends near M 1.2). So below 1.5
 * the bound is the largest |P_B''| of round 7's rows every 0.1 at M 1.0 to 1.5, both curves (twice the
 * largest second divided difference, as above), if larger.
 */
export const W2_CURVATURE_BOUND = (() => {
  let k = COMPILED_CURVE_CURVATURE_BOUND;
  const rows = TN3819_FIG18_ROUND7.filter((r) => r.mach <= W2_MACH_RANGE[1] + 1e-12);
  for (const c of ['moreNegative', 'lessNegative'] as const) {
    for (let i = 1; i + 1 < rows.length; i++) {
      const [a, b, d] = [rows[i - 1]!, rows[i]!, rows[i + 1]!];
      const s1 = (b[c] - a[c]) / (b.mach - a.mach);
      const s2 = (d[c] - b[c]) / (d.mach - b.mach);
      k = Math.max(k, Math.abs((2 * (s2 - s1)) / (d.mach - a.mach)));
    }
  }
  return k;
})();

/** The band over Love's basic curve below M 1.5, and the nominal at its midpoint. */
export const W2_BAND = (() => {
  const high = Math.ceil(Math.max(...w2FreeFlightRatios().map((r) => r.ratio)) * 100 - 1e-9) / 100;
  const low = COMPILED_CURVE_BAND.low;
  return { low, high, nominal: 0.5 * (low + high) };
})();

export const W2_LABEL =
  `correlation: compiled base-pressure curve of TN 3819 fig. 18 (Love) continued below Mach 1.5, ` +
  `times ${W2_BAND.nominal.toFixed(3)}, the midpoint of its band ${W2_BAND.low.toFixed(2)} to ` +
  `${W2_BAND.high.toFixed(2)} over the curve: its high end set on free-flight data at Mach 1.0 to 1.3 ` +
  '(RM L52E06 fig. 8, TN 3819 fig. 18) and carried to 1.5, its low end the band of Mach 1.5 to 3.0 ' +
  'carried down, which a sting-supported tunnel body with a radome nose sets at Mach 1.62 (RM L52J21a, ' +
  "0014 section 10.7 (ah); 0015 section 11); the curve's rows below 1.5 and fig. 18's " +
  'free-flight curve read twice; with fins at the base, the fins-on-base members built on TN 3819 fig. ' +
  `35's free-flight line apply to the curve itself, not on top of the ${W2_BAND.nominal.toFixed(3)} (0015 section ` +
  '11.2); tested only in the total';

/** The curve at M 1.0 to 1.5 (below the compiled curve's own range), as ./compiled-curve.ts returns it above. */
export function w2CurveBasePressure(mach: number): CompiledCurveBasePressure {
  const [lo, hi] = W2_MACH_RANGE;
  if (!(mach >= lo && mach < hi)) {
    throw new BaseRefusal(
      'mach-range',
      `the body base below Mach 1.5 (W2) is set at Mach ${lo} to ${hi}, asked Mach ${mach}; below Mach ` +
        `${lo} the base data opened are not claimable`,
    );
  }
  return {
    mach,
    pB: compiledCurveValue(mach, 'lessNegative'),
    pBMoreNegative: compiledCurveValue(mach, 'moreNegative'),
    interpolationError:
      (interpolationErrorBound(mach) * W2_CURVATURE_BOUND) / COMPILED_CURVE_CURVATURE_BOUND,
    // The rows at M 1.0, 1.2, 1.4 and 1.5 are read twice (round 1, round 7; 0015 section 11.3).
    bracketReadTwice: true,
  };
}
