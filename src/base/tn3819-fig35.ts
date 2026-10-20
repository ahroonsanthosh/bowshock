/**
 * Fin effects on base pressure: NACA TN 3819 (E. S. Love, 1957; NTRS
 * 19930084517) fig. 35 (PDF p. 66, report p. 64), "Fin effects upon base
 * pressure with varying Mach number. t/c = 0.10; x/c = 0; zero sweepback."
 * The body is cylindrical with an ogival nose; four rectangular unswept
 * fins of 10%-thick circular-arc section, span to body diameter 3.5, fin
 * thickness to body diameter 0.15, trailing edges at the base (text pp. 20
 * to 22). P_B = (p_b - p_inf) / q_inf.
 *
 * Readings of a scanned figure, kept as data so that further readings can
 * be added (the band of ./fins-on-base.ts is the envelope of all of them):
 *
 * - First reading: 0008's (`docs/research/total-drag/data/love_fig35_tn3819.csv`;
 *   calibration `scripts/love35_cal.py`, curves `scripts/love35_track.py`,
 *   symbols by eye). It read the free-flight line from M 1.80 to 2.85; the
 *   values at M 2.97 and 3.0 are 0008's linear extrapolation from M 2.7 to
 *   2.8 (`scripts/love35_factor.py`), flagged, not readings.
 * - Round 3: the independent second reading (`drag-audit/round3/readings/tn3819_fig35.csv`,
 *   method in `method_round3.md`; saved before the first reading was
 *   opened). It traced the free-flight line from M 1.1 to 2.99; its M 2.97
 *   value is from its factor script (`scripts/factor35.py`) and its M 3.00
 *   value is extrapolated 0.01 in M.
 *
 * Reading errors in P_B as each reading states them. Both readings
 * identified the free-flight line the same way, from the text and the
 * leaders (TN 3819 pp. 22 to 23): the only line starting at M 1.0, the
 * most negative with-fin line wherever the lines separate (M 2.4 to 3.0).
 * At M 1.75 to 2.35 it runs 0.003 to 0.005 from estimate B and neither
 * reading can tell the two apart from the scan, so there the error is
 * taken as at least FIG35_IDENTITY_SWAP.error, which covers a swap of the
 * two lines (round 3, section 4.3).
 */

export interface Fig35Point {
  readonly mach: number;
  readonly pB: number;
  /** Reading error, P_B. */
  readonly error: number;
  /** An extrapolation, not a reading. */
  readonly extrapolated?: true;
}

export interface Fig35FreeFlightReading {
  readonly reading: 'first' | 'round 3';
  /** The free-flight line with fins (ref. 12, R 10e6 to 120e6), ascending in M. */
  readonly points: readonly Fig35Point[];
}

export const TN3819_FIG35_FREE_FLIGHT: readonly Fig35FreeFlightReading[] = [
  {
    reading: 'first',
    points: [
      { mach: 1.8, pB: -0.2362, error: 0.005 },
      { mach: 1.9, pB: -0.2108, error: 0.005 },
      { mach: 2.0, pB: -0.1905, error: 0.005 },
      { mach: 2.1, pB: -0.1746, error: 0.005 },
      { mach: 2.2, pB: -0.1649, error: 0.002 },
      { mach: 2.3, pB: -0.1587, error: 0.002 },
      { mach: 2.4, pB: -0.1538, error: 0.002 },
      { mach: 2.5, pB: -0.149, error: 0.002 },
      { mach: 2.6, pB: -0.1445, error: 0.002 },
      { mach: 2.7, pB: -0.1401, error: 0.002 },
      { mach: 2.8, pB: -0.1359, error: 0.002 },
      { mach: 2.85, pB: -0.1338, error: 0.002 },
      // 0008's extrapolation: P_B(2.8) + (P_B(2.8) - P_B(2.7)) / 0.1 (M - 2.8).
      { mach: 2.97, pB: -0.12876, error: 0.002, extrapolated: true },
      { mach: 3.0, pB: -0.1275, error: 0.002, extrapolated: true },
    ],
  },
  {
    reading: 'round 3',
    points: [
      { mach: 1.1, pB: -0.2844, error: 0.002 },
      { mach: 1.2, pB: -0.2751, error: 0.002 },
      { mach: 1.3, pB: -0.2705, error: 0.002 },
      { mach: 1.4, pB: -0.2678, error: 0.002 },
      { mach: 1.5, pB: -0.2661, error: 0.002 },
      { mach: 1.6, pB: -0.2655, error: 0.002 },
      { mach: 1.7, pB: -0.2588, error: 0.002 },
      { mach: 1.8, pB: -0.2361, error: 0.004 },
      { mach: 1.9, pB: -0.2107, error: 0.004 },
      { mach: 2.0, pB: -0.1903, error: 0.004 },
      { mach: 2.1, pB: -0.1745, error: 0.004 },
      { mach: 2.2, pB: -0.1652, error: 0.004 },
      { mach: 2.3, pB: -0.1587, error: 0.004 },
      { mach: 2.4, pB: -0.1539, error: 0.002 },
      { mach: 2.41, pB: -0.1534, error: 0.002 },
      { mach: 2.5, pB: -0.149, error: 0.002 },
      { mach: 2.6, pB: -0.1443, error: 0.002 },
      { mach: 2.7, pB: -0.1399, error: 0.002 },
      { mach: 2.8, pB: -0.1358, error: 0.002 },
      { mach: 2.9, pB: -0.1319, error: 0.002 },
      { mach: 2.97, pB: -0.129, error: 0.003 },
      { mach: 3.0, pB: -0.1278, error: 0.003, extrapolated: true },
    ],
  },
];

/** Where the free-flight line cannot be told from estimate B, and the error that covers a swap. */
export const FIG35_IDENTITY_SWAP = { from: 1.75, to: 2.35, error: 0.005 } as const;

/** A tunnel pair of fig. 35: the same tunnel with and without fins. */
export interface Fig35TunnelPair {
  readonly reading: 'first' | 'round 3';
  readonly source: string;
  readonly mach: number;
  readonly withFins: number;
  readonly withoutFins: number;
}

/**
 * The tunnel pairs (ref. 26 is NACA TN 2360, sting-supported; the Langley
 * 9-inch pair is unpublished in TN 3819), each read twice, at the tunnels'
 * test Mach numbers 1.50, 2.00 and 2.41 (round 3 placed the symbols at
 * 1.502, 2.003 and 2.405 to 2.409, within its +-0.003 to +-0.004). Reading
 * errors +-0.001 (first) and +-0.0006 to +-0.0009 (round 3).
 */
export const TN3819_FIG35_TUNNEL: readonly Fig35TunnelPair[] = [
  { reading: 'first', source: 'ref. 26', mach: 1.5, withFins: -0.325, withoutFins: -0.194 },
  { reading: 'first', source: 'ref. 26', mach: 2.0, withFins: -0.208, withoutFins: -0.15 },
  { reading: 'first', source: 'Langley 9 in', mach: 2.41, withFins: -0.164, withoutFins: -0.12 },
  { reading: 'round 3', source: 'ref. 26', mach: 1.5, withFins: -0.3251, withoutFins: -0.1941 },
  { reading: 'round 3', source: 'ref. 26', mach: 2.0, withFins: -0.2077, withoutFins: -0.15 },
  {
    reading: 'round 3',
    source: 'Langley 9 in',
    mach: 2.41,
    withFins: -0.1648,
    withoutFins: -0.1202,
  },
];
