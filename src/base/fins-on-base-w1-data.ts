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
 * TN 3819 fig. 35's free-flight line (ref. 12). The first, this work's, at
 * M 1.40 to 1.80: NOT BLIND, made after round 3's values of this range had
 * been seen (fins_at_base_w1.md). The second, round 6's, blind, over the
 * whole line, M 1.0 to 3.0. Above M 2.3 round 6 identifies the line
 * differently from 0008's reading and round 3's in ./tn3819-fig35.ts (the
 * middle of the three lines there, by its long-short dash pattern, where
 * they took the most negative): up to 0.010 less negative in P_B at M 2.4
 * to 2.9 (w1_compare_round6_output.txt). Every reading is kept and the
 * rebuilt factor's band is their envelope (0008's reading rule); the
 * present factor (./fins-on-base.ts) keeps its own two readings unchanged
 * (0014 section 10.3).
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
  {
    reading: 'w1 second',
    points: [
      { mach: 1, pB: -0.2998, error: 0.0003 },
      { mach: 1.05, pB: -0.2913, error: 0.0003 },
      { mach: 1.1, pB: -0.284, error: 0.0003 },
      { mach: 1.15, pB: -0.2793, error: 0.0003 },
      { mach: 1.2, pB: -0.275, error: 0.0003 },
      { mach: 1.25, pB: -0.272, error: 0.0003 },
      { mach: 1.3, pB: -0.2703, error: 0.0003 },
      { mach: 1.35, pB: -0.2687, error: 0.0003 },
      { mach: 1.4, pB: -0.2675, error: 0.0003 },
      { mach: 1.45, pB: -0.2665, error: 0.0003 },
      { mach: 1.5, pB: -0.2659, error: 0.0003 },
      { mach: 1.55, pB: -0.2656, error: 0.0003 },
      { mach: 1.6, pB: -0.2654, error: 0.0003 },
      { mach: 1.65, pB: -0.2651, error: 0.002 },
      { mach: 1.7, pB: -0.2612, error: 0.002 },
      { mach: 1.75, pB: -0.2503, error: 0.002 },
      { mach: 1.8, pB: -0.2368, error: 0.0003 },
      { mach: 1.85, pB: -0.2226, error: 0.0003 },
      { mach: 1.9, pB: -0.2108, error: 0.0003 },
      { mach: 1.95, pB: -0.2, error: 0.0003 },
      { mach: 2, pB: -0.1905, error: 0.0004 },
      { mach: 2.1, pB: -0.1745, error: 0.003 },
      { mach: 2.2, pB: -0.1625, error: 0.003 },
      { mach: 2.3, pB: -0.1537, error: 0.003 },
      { mach: 2.4, pB: -0.1464, error: 0.003 },
      { mach: 2.5, pB: -0.1401, error: 0.0003 },
      { mach: 2.6, pB: -0.1348, error: 0.0003 },
      { mach: 2.7, pB: -0.1303, error: 0.0003 },
      { mach: 2.8, pB: -0.1264, error: 0.0003 },
      { mach: 2.9, pB: -0.1223, error: 0.0003 },
      { mach: 3, pB: -0.1182, error: 0.0003 },
    ],
  },
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
