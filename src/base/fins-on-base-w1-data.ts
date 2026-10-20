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
 * pending (0014 section 10.4).
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
];

/**
 * TN 3819 fig. 35's free-flight line (ref. 12) at M 1.40 to 1.80, this
 * reading's: NOT BLIND, made after round 3's values of this range had been
 * seen (fins_at_base_w1.md). The line above M 1.80 and the tunnel pairs
 * have two readings in ./tn3819-fig35.ts, used as they are.
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
];
