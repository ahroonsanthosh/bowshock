/**
 * The band-setting readings behind the rebuilt fins-on-base factor
 * (./fins-on-base-w1.ts; docs/design/0015-fins-at-the-base.md, work item
 * W1 of 0014). Each value is a reading of a scanned figure, kept as data
 * so that the second, independent reading can be added beside it: every
 * entry names its reading, and the factor's band is the envelope over all
 * of them (0014 section 10.1, rule 5).
 *
 * First readings: docs/research/total-drag/data/fins_at_base_w1.md (page,
 * calibration, method, error) and fins_at_base_w1.csv (every value, held
 * to this file by tests/base/fins-on-base-w1.test.ts). Second readings:
 * the round-6 blind readings (docs/research/total-drag/audit/round6/),
 * restated in fins_at_base_w1_second.csv by scripts/w1/round6_second.py
 * and compared with the first value by value in
 * w1_compare_round6_output.txt (0015 section 7). RM L52J21a fig. 8's
 * second reading is pending; fig. 38(c)'s symbols cannot be separated on
 * the scan and it stays read once.
 *
 * Coefficients: P_B = (p_b - p_inf) / q_inf; dPb = P_B with fins minus
 * P_B without, in the same facility.
 */

import { FIG35_FREE_FLIGHT_END, TN3819_FIG35_FREE_FLIGHT, type Fig35Point } from './tn3819-fig35';

export type W1Reading = 'w1 first' | 'w1 second';

/**
 * NACA TN 2360 (Spahr and Dickey 1951) fig. 6: the change in base-pressure
 * coefficient due to tails of rectangular planform and symmetrical
 * circular-arc section, chord 1.875 in on a 1.250 in body, sting d/h 0.4,
 * Ames 1 by 3 ft tunnel, R 4.5e6 on body length, against x/c (trailing
 * edge forward of the base over the chord). Read at x/c = 1.0 to 0.
 */
export interface Tn2360Fig6Point {
  readonly reading: W1Reading;
  readonly mach: 1.5 | 2.0;
  /** 2: plane tail; 4: cruciform. */
  readonly count: 2 | 4;
  readonly thicknessRatio: 0.05 | 0.1;
  /** Trailing edge ahead of the base, in chords. */
  readonly xc: number;
  readonly dPb: number;
  /** Reading error, in dPb. */
  readonly error: number;
}

const p6 = (
  mach: 1.5 | 2.0,
  count: 2 | 4,
  thicknessRatio: 0.05 | 0.1,
  xc: number,
  dPb: number,
): Tn2360Fig6Point => ({ reading: 'w1 first', mach, count, thicknessRatio, xc, dPb, error: 0.002 });
/** A second-reading symbol, with its own reading error. */
const p6s = (
  mach: 1.5 | 2.0,
  count: 2 | 4,
  thicknessRatio: 0.05 | 0.1,
  xc: number,
  dPb: number,
  error: number,
): Tn2360Fig6Point => ({ reading: 'w1 second', mach, count, thicknessRatio, xc, dPb, error });

export const TN2360_FIG6: readonly Tn2360Fig6Point[] = [
  // (a) M = 1.5, plane tail.
  p6(1.5, 2, 0.1, 1.0, -0.0101),
  p6(1.5, 2, 0.05, 1.0, -0.0035),
  p6(1.5, 2, 0.1, 0.8, -0.0109),
  p6(1.5, 2, 0.1, 0.6, -0.036),
  p6(1.5, 2, 0.1, 0.4, -0.0419),
  p6(1.5, 2, 0.05, 0.4, -0.0106),
  p6(1.5, 2, 0.1, 0.2, -0.0538),
  p6(1.5, 2, 0.1, 0.0, -0.0685),
  p6(1.5, 2, 0.05, 0.0, -0.0337),
  // (a) M = 1.5, cruciform tail; three runs at x/c = 0 for t/c 0.10.
  p6(1.5, 4, 0.05, 1.0, 0.008),
  p6(1.5, 4, 0.1, 1.0, 0.0155),
  p6(1.5, 4, 0.1, 0.8, 0.0035),
  p6(1.5, 4, 0.1, 0.6, -0.0125),
  p6(1.5, 4, 0.05, 0.6, 0.0041),
  p6(1.5, 4, 0.1, 0.4, -0.0184),
  p6(1.5, 4, 0.05, 0.4, -0.0048),
  p6(1.5, 4, 0.1, 0.2, -0.0599),
  p6(1.5, 4, 0.05, 0.2, -0.0235),
  p6(1.5, 4, 0.1, 0.0, -0.1391),
  p6(1.5, 4, 0.1, 0.0, -0.1303),
  p6(1.5, 4, 0.1, 0.0, -0.121),
  p6(1.5, 4, 0.05, 0.0, -0.0743),
  // (b) M = 2.0, plane tail (t/c 0.10 only).
  p6(2.0, 2, 0.1, 1.0, -0.0137),
  p6(2.0, 2, 0.1, 0.6, -0.0201),
  p6(2.0, 2, 0.1, 0.4, -0.0313),
  p6(2.0, 2, 0.1, 0.2, -0.0348),
  p6(2.0, 2, 0.1, 0.0, -0.0398),
  // (b) M = 2.0, cruciform tail.
  p6(2.0, 4, 0.1, 1.0, -0.0096),
  p6(2.0, 4, 0.05, 1.0, 0.0064),
  p6(2.0, 4, 0.1, 0.8, -0.0124),
  p6(2.0, 4, 0.1, 0.6, -0.0344),
  p6(2.0, 4, 0.1, 0.6, -0.0295),
  p6(2.0, 4, 0.1, 0.4, -0.0629),
  p6(2.0, 4, 0.05, 0.4, -0.0221),
  p6(2.0, 4, 0.1, 0.2, -0.0642),
  p6(2.0, 4, 0.1, 0.2, -0.057),
  p6(2.0, 4, 0.1, 0.0, -0.064),
  p6(2.0, 4, 0.1, 0.0, -0.0573),
  p6(2.0, 4, 0.1, 0.0, -0.0509),
  p6(2.0, 4, 0.05, 0.0, -0.0321),
  // The second reading (round 6), in its file's order: x/c 0 to 1.0, each at the nearest station.
  p6s(1.5, 2, 0.05, 1, -0.0045, 0.0003),
  p6s(1.5, 2, 0.1, 0.8, -0.0117, 0.0003),
  p6s(1.5, 2, 0.1, 0.6, -0.0367, 0.0003),
  p6s(1.5, 2, 0.05, 0.4, -0.0104, 0.0003),
  p6s(1.5, 2, 0.1, 0.4, -0.0435, 0.0003),
  p6s(1.5, 2, 0.1, 0.2, -0.0538, 0.0003),
  p6s(1.5, 2, 0.05, 0, -0.0334, 0.0003),
  p6s(1.5, 2, 0.1, 0, -0.0686, 0.0003),
  p6s(1.5, 2, 0.1, 1, -0.0085, 0.0021),
  p6s(1.5, 4, 0.1, 1, 0.0144, 0.0003),
  p6s(1.5, 4, 0.1, 1, 0.0094, 0.0003),
  p6s(1.5, 4, 0.05, 1, 0.0071, 0.0003),
  p6s(1.5, 4, 0.1, 0.8, 0.0031, 0.0003),
  p6s(1.5, 4, 0.05, 0.6, 0.004, 0.0003),
  p6s(1.5, 4, 0.1, 0.6, -0.0112, 0.0003),
  p6s(1.5, 4, 0.05, 0.4, -0.0049, 0.0003),
  p6s(1.5, 4, 0.05, 0.2, -0.0231, 0.0003),
  p6s(1.5, 4, 0.1, 0.2, -0.0644, 0.0003),
  p6s(1.5, 4, 0.1, 0.2, -0.0598, 0.0003),
  p6s(1.5, 4, 0.05, 0, -0.0739, 0.0003),
  p6s(1.5, 4, 0.1, 0, -0.1207, 0.0003),
  p6s(1.5, 4, 0.1, 0, -0.1299, 0.0003),
  p6s(1.5, 4, 0.1, 0.4, -0.018, 0.0005),
  p6s(1.5, 4, 0.1, 0, -0.139, 0.0021),
  p6s(2.0, 2, 0.1, 1, -0.0143, 0.0002),
  p6s(2.0, 2, 0.1, 0.6, -0.0202, 0.0002),
  p6s(2.0, 2, 0.1, 0.4, -0.0301, 0.0002),
  p6s(2.0, 2, 0.1, 0.2, -0.0357, 0.0002),
  p6s(2.0, 2, 0.1, 0, -0.0386, 0.0002),
  p6s(2.0, 4, 0.1, 1, -0.0096, 0.0002),
  p6s(2.0, 4, 0.05, 1, 0.004, 0.0002),
  p6s(2.0, 4, 0.1, 0.8, -0.0126, 0.0002),
  p6s(2.0, 4, 0.1, 0.6, -0.0285, 0.0002),
  p6s(2.0, 4, 0.1, 0.4, -0.0623, 0.0002),
  p6s(2.0, 4, 0.05, 0.4, -0.0204, 0.0002),
  p6s(2.0, 4, 0.1, 0.2, -0.0639, 0.0002),
  p6s(2.0, 4, 0.1, 0, -0.0496, 0.0002),
  p6s(2.0, 4, 0.05, 0, -0.0302, 0.0002),
  p6s(2.0, 4, 0.1, 0, -0.0644, 0.0002),
  p6s(2.0, 4, 0.1, 0.2, -0.0579, 0.002),
];

/**
 * NACA TN 3819 (Love 1957) fig. 33: P_B at x/c = 0 against fin t/c, zero
 * sweep, four rectangular circular-arc fins; M 1.50 and 2.00 from ref. 26
 * (TN 2360), M 2.41 from the Langley 9 in tunnel.
 */
export interface Fig33Point {
  readonly reading: W1Reading;
  readonly mach: number;
  readonly thicknessRatio: number;
  readonly pB: number;
  readonly error: number;
}

export const TN3819_FIG33: readonly Fig33Point[] = [
  { reading: 'w1 first', mach: 1.5, thicknessRatio: 0, pB: -0.1948, error: 0.001 },
  { reading: 'w1 first', mach: 1.5, thicknessRatio: 0.05, pB: -0.27, error: 0.001 },
  { reading: 'w1 first', mach: 1.5, thicknessRatio: 0.1, pB: -0.3253, error: 0.001 },
  { reading: 'w1 first', mach: 2.0, thicknessRatio: 0, pB: -0.1507, error: 0.001 },
  { reading: 'w1 first', mach: 2.0, thicknessRatio: 0.05, pB: -0.1851, error: 0.001 },
  { reading: 'w1 first', mach: 2.0, thicknessRatio: 0.1, pB: -0.2092, error: 0.001 },
  { reading: 'w1 first', mach: 2.41, thicknessRatio: 0, pB: -0.1219, error: 0.001 },
  { reading: 'w1 first', mach: 2.41, thicknessRatio: 0.1, pB: -0.1649, error: 0.001 },
  { reading: 'w1 second', mach: 1.5, thicknessRatio: 0, pB: -0.1947, error: 0.0002 },
  { reading: 'w1 second', mach: 1.5, thicknessRatio: 0.05, pB: -0.2698, error: 0.0002 },
  { reading: 'w1 second', mach: 1.5, thicknessRatio: 0.1, pB: -0.3251, error: 0.0002 },
  { reading: 'w1 second', mach: 2, thicknessRatio: 0, pB: -0.1505, error: 0.0002 },
  { reading: 'w1 second', mach: 2, thicknessRatio: 0.05, pB: -0.185, error: 0.0002 },
  { reading: 'w1 second', mach: 2, thicknessRatio: 0.1, pB: -0.2091, error: 0.0002 },
  { reading: 'w1 second', mach: 2.41, thicknessRatio: 0, pB: -0.1213, error: 0.0003 },
  { reading: 'w1 second', mach: 2.41, thicknessRatio: 0.1, pB: -0.1649, error: 0.0002 },
];

/**
 * TN 3819 fig. 34: the NACA RM-10 (ref. 36), a boat-tailed parabolic body,
 * with and without its fins (t/c 0.10, 60 deg sweepback), in a tunnel. A
 * check of the sweep bracket, not a member (0015 section 3.4).
 */
export interface Fig34Point {
  readonly reading: W1Reading;
  readonly mach: number;
  readonly withFins: number;
  readonly withoutFins: number;
  readonly error: number;
}

export const TN3819_FIG34: readonly Fig34Point[] = [
  { reading: 'w1 first', mach: 1.49, withFins: -0.1132, withoutFins: -0.0921, error: 0.001 },
  { reading: 'w1 first', mach: 1.59, withFins: -0.1094, withoutFins: -0.0962, error: 0.001 },
  { reading: 'w1 first', mach: 1.78, withFins: -0.1083, withoutFins: -0.0927, error: 0.001 },
  { reading: 'w1 first', mach: 1.98, withFins: -0.1067, withoutFins: -0.0932, error: 0.001 },
  { reading: 'w1 second', mach: 1.49, withFins: -0.1131, withoutFins: -0.0919, error: 0.0002 },
  { reading: 'w1 second', mach: 1.59, withFins: -0.1093, withoutFins: -0.0961, error: 0.0002 },
  { reading: 'w1 second', mach: 1.78, withFins: -0.1082, withoutFins: -0.0926, error: 0.0002 },
  { reading: 'w1 second', mach: 1.98, withFins: -0.1066, withoutFins: -0.0931, error: 0.0002 },
];

/**
 * TN 3819 fig. 35's free-flight line (ref. 12), this work's reading at M
 * 1.40 to 1.80: NOT BLIND, made after round 3's values of this range had
 * been seen (fins_at_base_w1.md). Round 6's first version of the whole line
 * (on estimate A above about M 2.2) is dropped: the line is now identified
 * and read twice in ./tn3819-fig35.ts (0010 section 11), round 6's revision
 * being its second reading; round 6's first version stays in
 * fins_at_base_w1_second.csv as the record.
 */
export interface W1Fig35Point {
  readonly mach: number;
  readonly pB: number;
  readonly error: number;
}

export const TN3819_FIG35_W1: readonly {
  readonly reading: W1Reading;
  readonly points: readonly W1Fig35Point[];
}[] = [
  {
    reading: 'w1 first',
    points: [
      { mach: 1.4, pB: -0.2674, error: 0.002 },
      { mach: 1.45, pB: -0.2666, error: 0.002 },
      { mach: 1.5, pB: -0.266, error: 0.002 },
      { mach: 1.55, pB: -0.2656, error: 0.002 },
      { mach: 1.6, pB: -0.2653, error: 0.002 },
      { mach: 1.65, pB: -0.2651, error: 0.002 },
      { mach: 1.7, pB: -0.26, error: 0.003 },
      { mach: 1.75, pB: -0.248, error: 0.004 },
      { mach: 1.8, pB: -0.2365, error: 0.003 },
    ],
  },
];

/**
 * Every reading of TN 3819 fig. 35's free-flight line that the rebuilt factor's reference member uses (and so
 * W2's fins at the base below Mach 1.5 and the carried tunnel excess): the present factor's two, held in
 * ./tn3819-fig35.ts, and W1's first above. The member's only source for the line (./fins-on-base-w1.ts,
 * freeFlightFactors). Since the correction of 0010 section 11: the identified curve's two readings, and W1's
 * first reading at M 1.4 to 1.8; never TN3819_FIG35_SUPERSEDED.
 */
export const W1_FIG35_LINE: readonly {
  readonly reading: string;
  readonly points: readonly Fig35Point[];
}[] = [
  // The identified curve, read twice (0010 section 11), to its end at M 2.56: the second reading's last
  // inked column at M 2.563 is left out, so the line ends where the factor's measured range does.
  ...TN3819_FIG35_FREE_FLIGHT.map((r) => ({
    reading: r.reading,
    points: r.points.filter((p) => p.mach <= FIG35_FREE_FLIGHT_END + 1e-9),
  })),
  ...TN3819_FIG35_W1.filter((r) => r.reading === 'w1 first').map((r) => ({
    reading: r.reading,
    points: r.points,
  })),
];

/**
 * Fig. 35's tunnel pairs, round 6's reading (a third, beside the two of
 * ./tn3819-fig35.ts, which the present factor keeps): the same tunnel with
 * and without fins at its test Mach numbers (read at 1.501, 2.001 to 2.002
 * and 2.405 to 2.411). Reading error +-0.0003.
 */
export interface W1Fig35TunnelPair {
  readonly reading: W1Reading;
  readonly source: string;
  readonly mach: number;
  readonly withFins: number;
  readonly withoutFins: number;
  readonly error: number;
}

export const TN3819_FIG35_TUNNEL_W1: readonly W1Fig35TunnelPair[] = [
  {
    reading: 'w1 second',
    source: 'ref. 26',
    mach: 1.5,
    withFins: -0.3251,
    withoutFins: -0.194,
    error: 0.0003,
  },
  {
    reading: 'w1 second',
    source: 'ref. 26',
    mach: 2.0,
    withFins: -0.2076,
    withoutFins: -0.1502,
    error: 0.0003,
  },
  {
    reading: 'w1 second',
    source: 'Langley 9 in',
    mach: 2.41,
    withFins: -0.1647,
    withoutFins: -0.1202,
    error: 0.0003,
  },
];

/**
 * NACA RM L52J21a (Love and O'Donnell 1952) fig. 38(c), R = 8.06e6: the fin
 * effect dPb of four 45 deg swept 8% circular-arc fins (their root trailing
 * edge about 0.8 chords ahead of the base, the swept trailing edge crossing
 * the base plane about a diameter out), cylindrical and conical bases, three
 * noses. The symbols overlap and the two bases cannot be told apart on the
 * scan: the reading is each Mach number's most negative and most positive
 * symbol.
 */
export interface Fig38Point {
  readonly reading: W1Reading;
  readonly mach: number;
  readonly mostNegative: number;
  readonly mostPositive: number;
  readonly error: number;
}

export const L52J21A_FIG38C: readonly Fig38Point[] = [
  { reading: 'w1 first', mach: 1.62, mostNegative: -0.0157, mostPositive: 0.0017, error: 0.002 },
  { reading: 'w1 first', mach: 1.93, mostNegative: -0.0066, mostPositive: 0.0055, error: 0.002 },
  { reading: 'w1 first', mach: 2.41, mostNegative: -0.0069, mostPositive: 0.002, error: 0.002 },
];

/**
 * RM L52J21a fig. 8, R = 8.06e6: the finned body's P_B, to turn fig. 38's
 * dPb into a factor. Of each base, the least negative symbol over the three
 * noses (the smallest |P_B| gives the largest relative effect).
 */
export interface Fig8Point {
  readonly reading: W1Reading;
  readonly mach: number;
  readonly base: 'cylindrical' | 'conical';
  readonly leastNegative: number;
  readonly error: number;
}

export const L52J21A_FIG8: readonly Fig8Point[] = [
  { reading: 'w1 first', mach: 1.62, base: 'cylindrical', leastNegative: -0.1485, error: 0.002 },
  { reading: 'w1 first', mach: 1.93, base: 'cylindrical', leastNegative: -0.1465, error: 0.002 },
  { reading: 'w1 first', mach: 2.41, base: 'cylindrical', leastNegative: -0.1128, error: 0.002 },
  { reading: 'w1 first', mach: 1.62, base: 'conical', leastNegative: -0.0322, error: 0.003 },
  { reading: 'w1 first', mach: 1.93, base: 'conical', leastNegative: -0.0617, error: 0.002 },
  { reading: 'w1 first', mach: 2.41, base: 'conical', leastNegative: -0.0598, error: 0.002 },
  // The second reading (round 6, dde6cd0): each base's least negative over its named symbols and stack ends.
  // Two stacks at M 2.41 are the panel's label and logo, not symbols (fins_at_base_w1_second.csv), and are left
  // out. The conical base's value at M 1.62 disagrees with the first (0015 section 7); it is not used.
  { reading: 'w1 second', mach: 1.62, base: 'cylindrical', leastNegative: -0.1476, error: 0.0007 },
  { reading: 'w1 second', mach: 1.93, base: 'cylindrical', leastNegative: -0.1443, error: 0.0007 },
  { reading: 'w1 second', mach: 2.41, base: 'cylindrical', leastNegative: -0.1124, error: 0.0007 },
  { reading: 'w1 second', mach: 1.62, base: 'conical', leastNegative: -0.0387, error: 0.0007 },
  { reading: 'w1 second', mach: 1.93, base: 'conical', leastNegative: -0.0634, error: 0.0007 },
  { reading: 'w1 second', mach: 2.41, base: 'conical', leastNegative: -0.0604, error: 0.0007 },
];

export type L52j21aNose = 'conical' | 'ogive' | 'radome';

/**
 * RM L52J21a fig. 8, cylindrical base, R = 8.06e6: the finned symbols with
 * their nose called, by three readers: this work's first reading by
 * template (scores 0.19 to 0.44 but the ogive at M 1.93, 0.76;
 * w1_l52j21a_fig8_output.txt), round 6 (names some, dde6cd0) and round 7
 * (blind, by the free parts of each outline, M 2.41 and the M 1.62 stack
 * near -0.1485; data/round7/rml52j21a_fig8_lr.csv, 1cc821d). Paired in 0015
 * section 7: a call another reader contradicts beyond the combined errors,
 * with the third evidence against it, is kept with `leftOut` saying why,
 * and is not used. Errors as each reading's.
 */
export interface Fig8NoseCall {
  readonly reading: W1Reading | 'round 7';
  readonly mach: number;
  readonly nose: L52j21aNose;
  readonly pB: number;
  readonly error: number;
  readonly leftOut?: string;
}

const FIRST_AT_241 =
  "the first reading's template fits for the circle and the diamond at M 2.41 lie 3 px (0.0010) apart, " +
  'where round 7 finds the two symbols 0.0036 apart: it did not separate them, and its conical call is ' +
  "0.0029 from round 7's (combined 0.0025); round 7's calls, from the outlines' free parts, and fig. " +
  "38(c)'s smaller relief there decide it";

export const L52J21A_FIG8_NOSE_CALLS: readonly Fig8NoseCall[] = [
  { reading: 'w1 first', mach: 1.62, nose: 'ogive', pB: -0.1611, error: 0.002 },
  { reading: 'w1 first', mach: 1.62, nose: 'conical', pB: -0.1485, error: 0.002 },
  { reading: 'w1 first', mach: 1.62, nose: 'radome', pB: -0.1488, error: 0.002 },
  { reading: 'w1 first', mach: 1.93, nose: 'ogive', pB: -0.1513, error: 0.002 },
  { reading: 'w1 first', mach: 1.93, nose: 'conical', pB: -0.1468, error: 0.002 },
  { reading: 'w1 first', mach: 1.93, nose: 'radome', pB: -0.1465, error: 0.002 },
  { reading: 'w1 first', mach: 2.41, nose: 'ogive', pB: -0.119, error: 0.002 },
  {
    reading: 'w1 first',
    mach: 2.41,
    nose: 'conical',
    pB: -0.1128,
    error: 0.002,
    leftOut: FIRST_AT_241,
  },
  {
    reading: 'w1 first',
    mach: 2.41,
    nose: 'radome',
    pB: -0.1139,
    error: 0.002,
    leftOut: FIRST_AT_241,
  },
  {
    reading: 'w1 second',
    mach: 1.62,
    nose: 'ogive',
    pB: -0.1485,
    error: 0.0002,
    leftOut:
      'the first reading and round 7 both call the -0.1485 stack conical and radome, round 7 from the ' +
      "outlines (a diamond's vertices and a circle's flat round top and bottom), and the ogive square " +
      'apart near -0.161, where round 6 names one too',
  },
  { reading: 'w1 second', mach: 1.62, nose: 'ogive', pB: -0.1618, error: 0.0002 },
  { reading: 'w1 second', mach: 1.93, nose: 'conical', pB: -0.1454, error: 0.0002 },
  { reading: 'w1 second', mach: 1.93, nose: 'radome', pB: -0.1448, error: 0.0002 },
  { reading: 'w1 second', mach: 1.93, nose: 'ogive', pB: -0.1515, error: 0.0002 },
  { reading: 'round 7', mach: 1.62, nose: 'conical', pB: -0.1488, error: 0.0005 },
  { reading: 'round 7', mach: 1.62, nose: 'radome', pB: -0.1482, error: 0.0005 },
  { reading: 'round 7', mach: 2.41, nose: 'ogive', pB: -0.1188, error: 0.0003 },
  { reading: 'round 7', mach: 2.41, nose: 'conical', pB: -0.1157, error: 0.0005 },
  { reading: 'round 7', mach: 2.41, nose: 'radome', pB: -0.1121, error: 0.0005 },
];

/**
 * RM L52J21a figs. 31 to 33 panel (d), cylindrical base, the same bodies
 * without fins (sting-supported): every symbol within 0.6e6 of fig. 8's R =
 * 8.06e6, by nose. Two readings: this work's first (template calls,
 * w1_l52j21a_fig31_33d_output.txt, +-0.002), kept only where round 7
 * confirms the symbol, and round 7's blind reading (data/round7/, nose by
 * symbol shape, its errors). Paired in w1_round7_pairing_output.txt.
 */
export interface Fig31To33Point {
  readonly reading: 'w1 first' | 'round 7';
  readonly mach: number;
  readonly nose: L52j21aNose;
  readonly reynolds: number;
  readonly pB: number;
  readonly error: number;
}

export const L52J21A_FIG31_33D: readonly Fig31To33Point[] = [
  { reading: 'w1 first', mach: 1.62, nose: 'conical', reynolds: 7.65e6, pB: -0.149, error: 0.002 },
  { reading: 'w1 first', mach: 1.62, nose: 'ogive', reynolds: 8.03e6, pB: -0.1479, error: 0.002 },
  { reading: 'w1 first', mach: 1.62, nose: 'radome', reynolds: 8.11e6, pB: -0.1338, error: 0.002 },
  { reading: 'w1 first', mach: 1.93, nose: 'conical', reynolds: 8.13e6, pB: -0.1524, error: 0.002 },
  { reading: 'w1 first', mach: 1.93, nose: 'ogive', reynolds: 8.16e6, pB: -0.152, error: 0.002 },
  { reading: 'w1 first', mach: 1.93, nose: 'radome', reynolds: 8.11e6, pB: -0.1376, error: 0.002 },
  { reading: 'w1 first', mach: 2.41, nose: 'conical', reynolds: 7.53e6, pB: -0.1186, error: 0.002 },
  { reading: 'w1 first', mach: 2.41, nose: 'conical', reynolds: 8.12e6, pB: -0.1204, error: 0.002 },
  { reading: 'w1 first', mach: 2.41, nose: 'ogive', reynolds: 8.16e6, pB: -0.1198, error: 0.002 },
  { reading: 'w1 first', mach: 2.41, nose: 'radome', reynolds: 8.12e6, pB: -0.1126, error: 0.002 },
  {
    reading: 'round 7',
    mach: 1.62,
    nose: 'conical',
    reynolds: 7.625e6,
    pB: -0.1488,
    error: 0.0002,
  },
  { reading: 'round 7', mach: 1.62, nose: 'ogive', reynolds: 8.023e6, pB: -0.1479, error: 0.0008 },
  { reading: 'round 7', mach: 1.62, nose: 'radome', reynolds: 8.053e6, pB: -0.1331, error: 0.0002 },
  {
    reading: 'round 7',
    mach: 1.93,
    nose: 'conical',
    reynolds: 8.032e6,
    pB: -0.1506,
    error: 0.0005,
  },
  { reading: 'round 7', mach: 1.93, nose: 'ogive', reynolds: 8.168e6, pB: -0.1517, error: 0.0008 },
  { reading: 'round 7', mach: 1.93, nose: 'radome', reynolds: 8.189e6, pB: -0.1391, error: 0.0005 },
  {
    reading: 'round 7',
    mach: 2.41,
    nose: 'conical',
    reynolds: 7.519e6,
    pB: -0.1184,
    error: 0.0002,
  },
  {
    reading: 'round 7',
    mach: 2.41,
    nose: 'conical',
    reynolds: 8.121e6,
    pB: -0.1191,
    error: 0.0006,
  },
  { reading: 'round 7', mach: 2.41, nose: 'ogive', reynolds: 8.162e6, pB: -0.1196, error: 0.0008 },
  { reading: 'round 7', mach: 2.41, nose: 'radome', reynolds: 8.06e6, pB: -0.1128, error: 0.0002 },
];

/**
 * NACA RM L52E06 (Hart 1952) fig. 7: rim and centre P_B of the PARD body
 * without fins (A) and with four 0.091 in flat-plate fins with square
 * trailing edges at the base (C), in free flight, to M 1.10 (C's lines end
 * near 1.11). The lowest relief here is the lower bound of the bounded
 * value for fins with flat faces at a square trailing edge (0015 section
 * 4). Base pressures only; this report's drag data (figs. 9 to 12) are held
 * back (0014 section 10.1) and were not opened.
 */
export interface L52e06Fig7Point {
  readonly reading: W1Reading;
  readonly mach: number;
  readonly rimNoFins: number;
  readonly rimFins: number;
  /** Undefined where the two centre lines merge (M 1.06). */
  readonly centreNoFins: number | undefined;
  readonly centreFins: number | undefined;
  readonly error: number;
}

export const L52E06_FIG7: readonly L52e06Fig7Point[] = [
  {
    reading: 'w1 first',
    mach: 1.06,
    rimNoFins: -0.2559,
    rimFins: -0.2181,
    centreNoFins: undefined,
    centreFins: undefined,
    error: 0.002,
  },
  {
    reading: 'w1 first',
    mach: 1.08,
    rimNoFins: -0.2499,
    rimFins: -0.2164,
    centreNoFins: -0.2017,
    centreFins: -0.1981,
    error: 0.002,
  },
  {
    reading: 'w1 first',
    mach: 1.1,
    rimNoFins: -0.2422,
    rimFins: -0.2137,
    centreNoFins: -0.1972,
    centreFins: -0.1937,
    error: 0.002,
  },
  // The second reading (round 6) at its read Mach numbers inside the first's window; at M 1.05, just
  // below it, it is in fins_at_base_w1_second.csv for the comparison only.
  {
    reading: 'w1 second',
    mach: 1.075,
    rimNoFins: -0.2517,
    rimFins: -0.2166,
    centreNoFins: -0.2029,
    centreFins: -0.199,
    error: 0.0005,
  },
  {
    reading: 'w1 second',
    mach: 1.1,
    rimNoFins: -0.2427,
    rimFins: -0.2138,
    centreNoFins: -0.1968,
    centreFins: -0.1942,
    error: 0.0005,
  },
];

/**
 * NSWCDD/TR-92/509 (Moore, Wilcox and Hymer 1992; DTIC ADA258753), Table 2: base drag C_DB (on the base area,
 * so -P_B) of an ogive-cylinder alone (configuration 1) and with four fins at the base (x/c 0; configurations 8,
 * 5 and 2), alpha 0, fins undeflected, NASA Langley Unitary Plan tunnel, turbulent (grit), strut-supported. The
 * fins: clipped deltas, root chord 4.00 in, tip 1.50 in, semispan 2.60 in, so the leading edge swept 43.9 deg and
 * the trailing edge unswept; double wedges, ridge at mid-chord, sharp edges. Registered for W1's sweep ordering
 * (0014 section 10.1, 2026-10-20), M 2.0 to 3.0; its fins ahead of the base are not used until TN 3819 fig. 32 is
 * read twice. C_DB is uncertain by about +-5% of each value (the report, p. 10), carried on each.
 * First transcription: docs/research/total-drag/data/nswc_tr92_509_table2.csv; the blind second is requested.
 */
export interface NswcTable2Point {
  readonly reading: W1Reading;
  /** Table 1's configuration. */
  readonly config: 1 | 2 | 5 | 8;
  /** Double-wedge t/c; 0 for the body alone. */
  readonly thicknessRatio: 0 | 0.05 | 0.1 | 0.15;
  readonly mach: 2.0 | 2.5 | 3.0;
  readonly cdb: number;
  /** Relative uncertainty of cdb. */
  readonly relativeError: number;
}

const nswc = (
  config: 1 | 2 | 5 | 8,
  thicknessRatio: 0 | 0.05 | 0.1 | 0.15,
  cdb: readonly number[],
) =>
  ([2.0, 2.5, 3.0] as const).map((mach, k): NswcTable2Point => ({
    reading: 'w1 first',
    config,
    thicknessRatio,
    mach,
    cdb: cdb[k]!,
    relativeError: 0.05,
  }));

/** NSWCDD/TR-92/509 swept at 43.9 deg (leading edge), trailing edge unswept. */
export const NSWC_LEADING_EDGE_SWEEP_DEG = (Math.atan((4.0 - 1.5) / 2.6) * 180) / Math.PI;

export const NSWC_TR92_509_TABLE2: readonly NswcTable2Point[] = [
  ...nswc(1, 0, [0.138, 0.106, 0.09]),
  ...nswc(8, 0.05, [0.148, 0.116, 0.1]),
  ...nswc(5, 0.1, [0.158, 0.127, 0.108]),
  ...nswc(2, 0.15, [0.167, 0.136, 0.114]),
];
