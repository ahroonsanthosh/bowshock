/**
 * Fin effects on base pressure: NACA TN 3819 (E. S. Love, 1957; NTRS
 * 19930084517) fig. 35 (PDF p. 66, report p. 64), "Fin effects upon base
 * pressure with varying Mach number. t/c = 0.10; x/c = 0; zero sweepback."
 * The body is cylindrical with an ogival nose; four rectangular unswept
 * fins of 10%-thick circular-arc section, span to body diameter 3.5, fin
 * thickness to body diameter 0.15, trailing edges at the base (text pp. 20
 * to 22). P_B = (p_b - p_inf) / q_inf.
 *
 * The figure draws four curves: the faired free-flight curve of ref. 12
 * (the long-short dash line, the only line style in its legend), Love's
 * two predictions, "estimate A" and "estimate B" (both from M 1.5 to 3.0:
 * "No calculations were made below M 1.5", p. 23), and the solid body-alone
 * curve of fig. 18. Identified from the report alone (the legend, the
 * measured dash patterns, the text; `docs/research/total-drag/fig35-free-flight/`,
 * 0010 section 11): the free-flight curve starts at M 1.0, levels off at M
 * 1.2 to 1.7, falls steeply as the most negative with-fin line, crosses
 * estimate B near M 2.0 to 2.1 and estimate A near 2.15, and ends at M
 * 2.563 as the least negative with-fin line. Above that the figure has no
 * free-flight data; estimate B is the most negative line to 3.0 and
 * estimate A the middle one.
 *
 * Readings of a scanned figure, kept as data so that further readings can
 * be added (the band of ./fins-on-base.ts is the envelope of all of them):
 *
 * - `TN3819_FIG35_FREE_FLIGHT`, the two readings of the identified
 *   free-flight curve, M 1.0 to its end, each made without the other: the
 *   first (2026-10-20, following the identification,
 *   `fig35-free-flight/reading1/`; calibrated against fig. 18's basic
 *   curve, which fig. 35's own no-fin curve reproduces within 0.0009) and
 *   the second (audit round 6, revised the same day, by another reader on
 *   its own render and calibration). They agree within their combined
 *   errors at every Mach number both read, by 0.0018 at most (M 2.15, in
 *   the crossing with estimate A); 0010 section 11.
 * - `TN3819_FIG35_SUPERSEDED`, the two readings the factor rested on until
 *   2026-10-20: 0008's first (`docs/research/total-drag/data/love_fig35_tn3819.csv`)
 *   and round 3's (`drag-audit/round3/readings/tn3819_fig35.csv`). Both took
 *   "the most negative with-fin line wherever the lines separate" for the
 *   free-flight line: on it to M 2.1 (within 0.0003 of the first reading
 *   above), on estimate B, a prediction, above about 2.15 (within 0.0004
 *   of a track of B at M 2.2 to 2.6). Kept as the record and for the tests
 *   that reproduce 0008's and round 3's tables; no row uses them.
 *
 * Reading errors in P_B as each reading states them.
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
  readonly reading: string;
  /** The line read, ascending in M. */
  readonly points: readonly Fig35Point[];
}

/**
 * The faired free-flight curve with fins (ref. 12, R 10e6 to 120e6), as
 * identified (0010 section 11). The first reading's error is +-0.002, and
 * +-0.003 where the line touches or merges with another: estimate B at the
 * knee (M 1.65, 1.70) and in one stroke with it at M 1.99 to 2.13;
 * estimate A in one stroke at M 2.14 to 2.22.
 */
export const TN3819_FIG35_FREE_FLIGHT: readonly Fig35FreeFlightReading[] = [
  {
    reading: 'identified, first',
    points: [
      { mach: 1.0, pB: -0.2998, error: 0.002 },
      { mach: 1.05, pB: -0.2914, error: 0.002 },
      { mach: 1.1, pB: -0.2846, error: 0.002 },
      { mach: 1.15, pB: -0.2791, error: 0.002 },
      { mach: 1.2, pB: -0.2751, error: 0.002 },
      { mach: 1.25, pB: -0.2721, error: 0.002 },
      { mach: 1.3, pB: -0.2703, error: 0.002 },
      { mach: 1.35, pB: -0.2687, error: 0.002 },
      { mach: 1.4, pB: -0.2675, error: 0.002 },
      { mach: 1.45, pB: -0.2665, error: 0.002 },
      { mach: 1.5, pB: -0.2659, error: 0.002 },
      { mach: 1.55, pB: -0.2655, error: 0.002 },
      { mach: 1.6, pB: -0.2654, error: 0.002 },
      { mach: 1.65, pB: -0.2651, error: 0.003 },
      { mach: 1.7, pB: -0.2622, error: 0.003 },
      { mach: 1.75, pB: -0.2502, error: 0.002 },
      { mach: 1.8, pB: -0.2362, error: 0.002 },
      { mach: 1.85, pB: -0.2225, error: 0.002 },
      { mach: 1.9, pB: -0.2107, error: 0.002 },
      { mach: 1.95, pB: -0.1999, error: 0.002 },
      { mach: 2.0, pB: -0.1903, error: 0.003 },
      { mach: 2.05, pB: -0.1819, error: 0.003 },
      { mach: 2.1, pB: -0.1744, error: 0.003 },
      { mach: 2.15, pB: -0.1675, error: 0.003 },
      { mach: 2.2, pB: -0.1621, error: 0.003 },
      { mach: 2.25, pB: -0.1562, error: 0.003 },
      { mach: 2.3, pB: -0.1512, error: 0.002 },
      { mach: 2.35, pB: -0.1466, error: 0.002 },
      { mach: 2.4, pB: -0.1424, error: 0.002 },
      { mach: 2.45, pB: -0.1387, error: 0.002 },
      { mach: 2.5, pB: -0.1353, error: 0.002 },
      { mach: 2.55, pB: -0.1322, error: 0.002 },
      // The line ends at M 2.563 (its last inked column, +-0.002 in M).
      { mach: 2.56, pB: -0.1318, error: 0.002 },
    ],
  },
  {
    // The second reading (audit round 6, its revision of 2026-10-20: the reader's branch
    // commit 8c28afe, `audit/round6/readings/tn3819_fig35.csv`, method in
    // `method_tn3819_figs32-35.md`), made without the first: its own calibration from every
    // gridline of its own 600 dpi render. M 1.0 to 1.70 by column tracking (its blind first
    // pass); M 1.72 to 2.55 by guided column reads along the line it identified by dash
    // profile, as the identification does. Its errors: the ink's reading error, 0.0003, plus
    // 0.002 where the line merges with estimate B (M 1.64 to 1.76) and 0.003 where it crosses
    // estimate A (M 2.0 to 2.25). It also ends the line at M 2.563.
    reading: 'identified, second',
    points: [
      { mach: 1.0, pB: -0.2998, error: 0.0003 },
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
      { mach: 1.7, pB: -0.2611, error: 0.002 },
      { mach: 1.72, pB: -0.2582, error: 0.002 },
      { mach: 1.75, pB: -0.2503, error: 0.002 },
      { mach: 1.8, pB: -0.2369, error: 0.0003 },
      { mach: 1.85, pB: -0.2225, error: 0.0003 },
      { mach: 1.9, pB: -0.2108, error: 0.0003 },
      { mach: 1.95, pB: -0.1999, error: 0.0003 },
      { mach: 2.0, pB: -0.1897, error: 0.003 },
      { mach: 2.05, pB: -0.1819, error: 0.003 },
      { mach: 2.1, pB: -0.1746, error: 0.003 },
      { mach: 2.15, pB: -0.1693, error: 0.003 },
      { mach: 2.2, pB: -0.1633, error: 0.0031 },
      { mach: 2.25, pB: -0.1562, error: 0.003 },
      { mach: 2.3, pB: -0.1515, error: 0.0003 },
      { mach: 2.35, pB: -0.1466, error: 0.0003 },
      { mach: 2.4, pB: -0.1425, error: 0.0003 },
      { mach: 2.45, pB: -0.1387, error: 0.0003 },
      { mach: 2.5, pB: -0.1353, error: 0.0003 },
      { mach: 2.55, pB: -0.1321, error: 0.0003 },
      // The line's end: its last inked column (+-0.002 in M; `fig35-free-flight/reading2/`,
      // commit e1b70d3).
      { mach: 2.563, pB: -0.1317, error: 0.0004 },
    ],
  },
];

/**
 * The end of the free-flight curve as the factor uses it: M 2.56, the
 * first reading's last point and within the second's (both put the line's
 * last ink at M 2.563 +- 0.002). Above it the figure has no free-flight
 * data, and the fins-on-base factor is bounded, not measured
 * (./fins-on-base.ts).
 */
export const FIG35_FREE_FLIGHT_END = 2.56;

/**
 * Where another with-fin line runs near the free-flight curve, and the
 * error that covers a swap with the nearer of the two estimates: the
 * largest distance from the free-flight line to the nearer estimate at M
 * 1.75 to 2.56, over both readings, each against its own reading of A and
 * B (TN3819_FIG35_ESTIMATES): 0.0077, estimate B at M 1.80 in the second
 * reading (0.0063 in the first); estimate A is the nearer above M 2.15,
 * 0.0024 to 0.0054. The identification's confidence is about 99% on the
 * left half and 85% for which right-hand line is free flight and which is
 * A.
 */
export const FIG35_IDENTITY_SWAP = { from: 1.75, to: 2.56, error: 0.0077 } as const;

/**
 * The readings the factor rested on until 2026-10-20 (see the module
 * comment): on the free-flight curve to M 2.1, on estimate B above about
 * 2.15. Superseded; no row uses them.
 */
export const TN3819_FIG35_SUPERSEDED: readonly Fig35FreeFlightReading[] = [
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

/**
 * The superseded readings' identity-swap error: at M 1.75 to 2.35 they
 * took the free-flight line to run 0.003 to 0.005 from estimate B, and set
 * 0.005 to cover a swap (round 3, section 4.3). Kept to reproduce the
 * factor as it stood before 2026-10-20.
 */
export const FIG35_IDENTITY_SWAP_SUPERSEDED = { from: 1.75, to: 2.35, error: 0.005 } as const;

/**
 * Love's two predictions, as each reading read them: the first on its
 * tracks (`fig35-free-flight/reading1/separations.out`, every 0.05 in M at
 * M 1.75 to 2.56, then every 0.1 and at 2.97; error 0.002, 0.003 where the
 * lines merge), the second every 0.1 at M 1.5 to 3.0
 * (`fig35-free-flight/reading2/estimate_A.csv` and `estimate_B.csv`, commit
 * e1b70d3; error 0.0003, 0.003 where they merge; B's M 1.5 value is
 * extrapolated 0.01 from its first ink, so it is left out here). Not data:
 * used only to set the identity-swap allowance and to check that the bounded
 * factor above the free-flight curve's end contains them (./fins-on-base.ts,
 * 0010 section 11).
 */
export const TN3819_FIG35_ESTIMATES: readonly {
  readonly estimate: 'A' | 'B';
  readonly reading: string;
  readonly points: readonly Fig35Point[];
}[] = [
  {
    estimate: 'A',
    reading: 'identified, first',
    points: [
      { mach: 1.75, pB: -0.2297, error: 0.002 },
      { mach: 1.8, pB: -0.2167, error: 0.002 },
      { mach: 1.85, pB: -0.2072, error: 0.002 },
      { mach: 1.9, pB: -0.1979, error: 0.002 },
      { mach: 1.95, pB: -0.1911, error: 0.002 },
      { mach: 2.0, pB: -0.1843, error: 0.003 },
      { mach: 2.05, pB: -0.1783, error: 0.003 },
      { mach: 2.1, pB: -0.1726, error: 0.003 },
      { mach: 2.15, pB: -0.1675, error: 0.003 },
      { mach: 2.2, pB: -0.1626, error: 0.003 },
      { mach: 2.25, pB: -0.1583, error: 0.003 },
      { mach: 2.3, pB: -0.1542, error: 0.002 },
      { mach: 2.35, pB: -0.1501, error: 0.002 },
      { mach: 2.4, pB: -0.1466, error: 0.002 },
      { mach: 2.45, pB: -0.1433, error: 0.002 },
      { mach: 2.5, pB: -0.1405, error: 0.002 },
      { mach: 2.55, pB: -0.1375, error: 0.002 },
      { mach: 2.56, pB: -0.137, error: 0.002 },
      { mach: 2.6, pB: -0.135, error: 0.002 },
      { mach: 2.7, pB: -0.1304, error: 0.002 },
      { mach: 2.8, pB: -0.1265, error: 0.002 },
      { mach: 2.9, pB: -0.1225, error: 0.002 },
      { mach: 2.97, pB: -0.1191, error: 0.002 },
      { mach: 3.0, pB: -0.1183, error: 0.002 },
    ],
  },
  {
    estimate: 'B',
    reading: 'identified, first',
    points: [
      { mach: 1.75, pB: -0.2444, error: 0.003 },
      { mach: 1.8, pB: -0.2299, error: 0.002 },
      { mach: 1.85, pB: -0.2167, error: 0.002 },
      { mach: 1.9, pB: -0.206, error: 0.002 },
      { mach: 1.95, pB: -0.1965, error: 0.002 },
      { mach: 2.0, pB: -0.1882, error: 0.003 },
      { mach: 2.05, pB: -0.1819, error: 0.003 },
      { mach: 2.1, pB: -0.1744, error: 0.003 },
      { mach: 2.15, pB: -0.1686, error: 0.003 },
      { mach: 2.2, pB: -0.1648, error: 0.003 },
      { mach: 2.25, pB: -0.1614, error: 0.003 },
      { mach: 2.3, pB: -0.1587, error: 0.002 },
      { mach: 2.35, pB: -0.1563, error: 0.002 },
      { mach: 2.4, pB: -0.1539, error: 0.002 },
      { mach: 2.45, pB: -0.1515, error: 0.002 },
      { mach: 2.5, pB: -0.1491, error: 0.002 },
      { mach: 2.55, pB: -0.1468, error: 0.002 },
      { mach: 2.56, pB: -0.1463, error: 0.002 },
      { mach: 2.6, pB: -0.1445, error: 0.002 },
      { mach: 2.8, pB: -0.1361, error: 0.002 },
      { mach: 2.9, pB: -0.132, error: 0.002 },
      { mach: 2.97, pB: -0.1292, error: 0.002 },
      { mach: 3.0, pB: -0.1281, error: 0.002 },
    ],
  },
  {
    estimate: 'A',
    reading: 'identified, second',
    points: [
      { mach: 1.5, pB: -0.2559, error: 0.0003 },
      { mach: 1.6, pB: -0.2468, error: 0.0003 },
      { mach: 1.7, pB: -0.2392, error: 0.0003 },
      { mach: 1.8, pB: -0.2169, error: 0.0003 },
      { mach: 1.9, pB: -0.199, error: 0.0003 },
      { mach: 2.0, pB: -0.1843, error: 0.003 },
      { mach: 2.1, pB: -0.1736, error: 0.003 },
      { mach: 2.2, pB: -0.1632, error: 0.0031 },
      { mach: 2.3, pB: -0.1539, error: 0.003 },
      { mach: 2.4, pB: -0.1466, error: 0.0003 },
      { mach: 2.5, pB: -0.1401, error: 0.0003 },
      { mach: 2.6, pB: -0.1348, error: 0.0003 },
      { mach: 2.7, pB: -0.1304, error: 0.0003 },
      { mach: 2.8, pB: -0.1264, error: 0.0003 },
      { mach: 2.9, pB: -0.1223, error: 0.0003 },
      { mach: 3.0, pB: -0.1181, error: 0.0003 },
    ],
  },
  {
    estimate: 'B',
    reading: 'identified, second',
    points: [
      { mach: 1.6, pB: -0.2702, error: 0.0003 },
      { mach: 1.7, pB: -0.2597, error: 0.0031 },
      { mach: 1.8, pB: -0.2292, error: 0.003 },
      { mach: 1.9, pB: -0.2062, error: 0.003 },
      { mach: 2.0, pB: -0.1887, error: 0.0031 },
      { mach: 2.1, pB: -0.1745, error: 0.003 },
      { mach: 2.2, pB: -0.1649, error: 0.003 },
      { mach: 2.3, pB: -0.1589, error: 0.003 },
      { mach: 2.4, pB: -0.1538, error: 0.0003 },
      { mach: 2.5, pB: -0.1491, error: 0.0003 },
      { mach: 2.6, pB: -0.1446, error: 0.0003 },
      { mach: 2.7, pB: -0.1399, error: 0.0003 },
      { mach: 2.8, pB: -0.136, error: 0.0003 },
      { mach: 2.9, pB: -0.1319, error: 0.0003 },
      { mach: 3.0, pB: -0.1277, error: 0.0003 },
    ],
  },
];

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
 * errors +-0.001 (first) and +-0.0006 to +-0.0009 (round 3). The symbols
 * were not in question: these readings stand.
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
