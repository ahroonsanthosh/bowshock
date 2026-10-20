/**
 * Base pressure of bodies of revolution with cylindrical afterbodies, no
 * fins, turbulent boundary layers: E. S. Love, "Base pressure at supersonic
 * speeds on two-dimensional airfoils and on bodies of revolution with and
 * without fins having turbulent boundary layers", NACA TN 3819, 1957
 * (https://ntrs.nasa.gov/citations/19930084517), fig. 18 (PDF p. 49,
 * report p. 47), plotted against the free-stream Mach number with the Mach
 * number ahead of the base about equal to it (cylindrical afterbodies).
 * P_B = (p_b - p_inf) / q_inf; the base drag on the base area is -P_B.
 *
 * These are readings of a scanned figure, kept as data so that further
 * readings can be added. Where they come from (the research record behind
 * docs/design/0008-total-drag.md, `docs/research/total-drag/`):
 *
 * - The two near-coincident compiled curves, Chapman's compilation (the
 *   more negative below about M 3.1) and Love's "basic curve" (the less
 *   negative), at round Mach numbers and at the tunnel symbols' Mach
 *   numbers: the round-1 audit's table (`audit/readings/tn3819_fig18.csv`,
 *   method in `method_tn3819_fig18.md`, error about +-0.001), which 0008
 *   adopts (section 3.1; `data/love_tn3819_fig18.csv` holds the rows at
 *   the symbol Mach numbers and five round values, identical to these).
 *   The audit identified the curves by their leaders: Chapman's leader
 *   touches the more negative curve at M 2.3, the basic curve's the less
 *   negative. TN 3819 fig. 35's "present estimate, no fins" reproduces
 *   the less negative curve within 0.001 (0008 section 3.4; round 3).
 * - Second readings (`checks`): the robust local line fits of 0008's
 *   second reading (`scripts/love18_ransac.py`, `data/love18_twice_output.txt`;
 *   a fit within 0.0004 counts as a confirmation, and only those are
 *   listed), and the round-3 reading of the values 0008 lists as read once
 *   (`drag-audit/round3/readings/tn3819_fig18_round3.csv`: the same reader
 *   as round 1 with a different calibration and new columns, error
 *   +-0.0008 to +-0.0015). At M 3.243 and 3.497 the curves and Gabeaud's
 *   line merge into one stroke; round 3 gives the bundle, recorded here
 *   against both curves at its edge nearest each.
 * - The twelve tunnel symbols at M 1.5 to 3.5, two independent readings
 *   (the first reading and the round-1 audit's, `data/love_tn3819_fig18.csv`),
 *   which agree within 0.003. Symbol shapes and references are the audit's
 *   provisional assignment by shape.
 *
 * Values without a check rest on one reading: the rows at M 1.0, 1.2,
 * 1.4, 1.503, 1.6, 1.8, 2.009, 2.2, 2.4, 2.418, 2.6, 2.8, 3.2 and 3.5 (both
 * curves). tests/base/compiled-curve.test.ts holds every check against the
 * adopted value within the combined reading error (0008's reading rule:
 * where two readings differ by more, both are kept and the one that
 * widens the band is used) and checks each single-read value against the
 * line through its neighbours.
 */

/** The two compiled curves at one Mach number (one reading: the adopted one). */
export interface CompiledCurveRow {
  readonly mach: number;
  /** Chapman's compilation: the more negative of the pair below about M 3.1. */
  readonly moreNegative: number;
  /** Love's basic curve: the less negative. */
  readonly lessNegative: number;
}

/** Adopted reading (round-1 audit), M 1.0 to 3.5. */
export const TN3819_FIG18_CURVES: readonly CompiledCurveRow[] = [
  { mach: 1.0, moreNegative: -0.1896, lessNegative: -0.1849 },
  { mach: 1.2, moreNegative: -0.187, lessNegative: -0.1836 },
  { mach: 1.4, moreNegative: -0.181, lessNegative: -0.1796 },
  { mach: 1.5, moreNegative: -0.1775, lessNegative: -0.1733 },
  { mach: 1.503, moreNegative: -0.1774, lessNegative: -0.1732 },
  { mach: 1.6, moreNegative: -0.1731, lessNegative: -0.1683 },
  { mach: 1.63, moreNegative: -0.1717, lessNegative: -0.1667 },
  { mach: 1.8, moreNegative: -0.1625, lessNegative: -0.1569 },
  { mach: 1.935, moreNegative: -0.1539, lessNegative: -0.1486 },
  { mach: 1.939, moreNegative: -0.1536, lessNegative: -0.1484 },
  { mach: 2.0, moreNegative: -0.1496, lessNegative: -0.1447 },
  { mach: 2.009, moreNegative: -0.149, lessNegative: -0.1442 },
  { mach: 2.2, moreNegative: -0.1367, lessNegative: -0.1331 },
  { mach: 2.4, moreNegative: -0.125, lessNegative: -0.1224 },
  { mach: 2.414, moreNegative: -0.1243, lessNegative: -0.1216 },
  { mach: 2.418, moreNegative: -0.1241, lessNegative: -0.1214 },
  { mach: 2.5, moreNegative: -0.1196, lessNegative: -0.1172 },
  { mach: 2.6, moreNegative: -0.1144, lessNegative: -0.1124 },
  { mach: 2.681, moreNegative: -0.1107, lessNegative: -0.1088 },
  { mach: 2.8, moreNegative: -0.1055, lessNegative: -0.1039 },
  { mach: 3.0, moreNegative: -0.0978, lessNegative: -0.0964 },
  { mach: 3.2, moreNegative: -0.09, lessNegative: -0.0894 },
  { mach: 3.243, moreNegative: -0.0885, lessNegative: -0.0881 },
  { mach: 3.497, moreNegative: -0.0803, lessNegative: -0.0803 },
  { mach: 3.5, moreNegative: -0.0802, lessNegative: -0.0802 },
];

/** Reading error of the adopted curve values (round-1 audit, method file). */
export const TN3819_FIG18_CURVE_READING_ERROR = 0.001;

export type CompiledCurveName = 'moreNegative' | 'lessNegative';

/** A second reading of one curve value. */
export interface CurveCheck {
  readonly mach: number;
  readonly curve: CompiledCurveName;
  readonly value: number;
  /** Its own reading error, P_B. */
  readonly error: number;
  readonly source: 'robust fits (0008)' | 'round 3';
}

/**
 * Second readings of the adopted curve values. Robust fits: the nearest
 * fitted line, listed only where within 0.0004 (0008's criterion; its
 * error taken as 0.0004). At M 3.243 one fitted line lies within 0.0004
 * of both curves, which are 0.0004 apart, and 0008 counts it once: it is
 * listed against the less negative curve.
 */
export const TN3819_FIG18_CHECKS: readonly CurveCheck[] = [
  { mach: 1.5, curve: 'lessNegative', value: -0.1731, error: 0.0004, source: 'robust fits (0008)' },
  {
    mach: 1.63,
    curve: 'moreNegative',
    value: -0.1717,
    error: 0.0004,
    source: 'robust fits (0008)',
  },
  {
    mach: 1.63,
    curve: 'lessNegative',
    value: -0.1667,
    error: 0.0004,
    source: 'robust fits (0008)',
  },
  {
    mach: 1.935,
    curve: 'lessNegative',
    value: -0.1486,
    error: 0.0004,
    source: 'robust fits (0008)',
  },
  { mach: 2.0, curve: 'lessNegative', value: -0.1447, error: 0.0004, source: 'robust fits (0008)' },
  {
    mach: 2.414,
    curve: 'moreNegative',
    value: -0.1242,
    error: 0.0004,
    source: 'robust fits (0008)',
  },
  {
    mach: 2.414,
    curve: 'lessNegative',
    value: -0.1215,
    error: 0.0004,
    source: 'robust fits (0008)',
  },
  { mach: 2.5, curve: 'moreNegative', value: -0.1196, error: 0.0004, source: 'robust fits (0008)' },
  { mach: 2.5, curve: 'lessNegative', value: -0.1172, error: 0.0004, source: 'robust fits (0008)' },
  {
    mach: 2.681,
    curve: 'moreNegative',
    value: -0.1108,
    error: 0.0004,
    source: 'robust fits (0008)',
  },
  {
    mach: 2.681,
    curve: 'lessNegative',
    value: -0.1089,
    error: 0.0004,
    source: 'robust fits (0008)',
  },
  { mach: 3.0, curve: 'lessNegative', value: -0.0966, error: 0.0004, source: 'robust fits (0008)' },
  {
    mach: 3.243,
    curve: 'lessNegative',
    value: -0.0882,
    error: 0.0004,
    source: 'robust fits (0008)',
  },
  { mach: 1.5, curve: 'moreNegative', value: -0.1774, error: 0.0012, source: 'round 3' },
  { mach: 1.5, curve: 'lessNegative', value: -0.173, error: 0.0012, source: 'round 3' },
  { mach: 1.935, curve: 'moreNegative', value: -0.1536, error: 0.0012, source: 'round 3' },
  { mach: 1.935, curve: 'lessNegative', value: -0.1483, error: 0.0012, source: 'round 3' },
  { mach: 1.939, curve: 'moreNegative', value: -0.1534, error: 0.0012, source: 'round 3' },
  { mach: 1.939, curve: 'lessNegative', value: -0.1481, error: 0.0012, source: 'round 3' },
  { mach: 2.0, curve: 'moreNegative', value: -0.1494, error: 0.0008, source: 'round 3' },
  { mach: 2.0, curve: 'lessNegative', value: -0.1444, error: 0.0008, source: 'round 3' },
  { mach: 3.0, curve: 'moreNegative', value: -0.0974, error: 0.0012, source: 'round 3' },
  { mach: 3.0, curve: 'lessNegative', value: -0.0962, error: 0.0012, source: 'round 3' },
  // The bundle, -0.0898 to -0.0886: its edges against the two curves.
  { mach: 3.243, curve: 'moreNegative', value: -0.0898, error: 0.0015, source: 'round 3' },
  { mach: 3.243, curve: 'lessNegative', value: -0.0886, error: 0.0015, source: 'round 3' },
  { mach: 3.497, curve: 'moreNegative', value: -0.0805, error: 0.0015, source: 'round 3' },
  { mach: 3.497, curve: 'lessNegative', value: -0.0805, error: 0.0015, source: 'round 3' },
];

/** A tunnel symbol of fig. 18 with its two independent readings. */
export interface TunnelSymbol {
  readonly mach: number;
  readonly first: number;
  readonly audit: number;
  /** Provisional assignment by shape (the audit's). */
  readonly shape: string;
}

/**
 * The twelve tunnel symbols at M 1.5 to 3.5 (sting-supported, R 2e6 to
 * 22.3e6). Mach numbers from the audit's shear-corrected grid, +-0.02.
 */
export const TN3819_FIG18_TUNNEL: readonly TunnelSymbol[] = [
  { mach: 1.503, first: -0.178, audit: -0.1807, shape: 'circle (Ref 9)' },
  { mach: 1.5, first: -0.152, audit: -0.1522, shape: 'teardrop (Ref 2)' },
  { mach: 1.63, first: -0.165, audit: -0.163, shape: 'D (Langley 9 in SST)' },
  { mach: 1.63, first: -0.152, audit: -0.1526, shape: 'arch (Ref 15)' },
  { mach: 1.935, first: -0.15, audit: -0.1492, shape: 'arch (Ref 15)' },
  { mach: 1.939, first: -0.143, audit: -0.141, shape: 'D (Langley 9 in SST)' },
  { mach: 2.009, first: -0.139, audit: -0.138, shape: 'teardrop (Ref 2)' },
  { mach: 2.418, first: -0.118, audit: -0.1169, shape: 'D or arch' },
  { mach: 2.414, first: -0.115, audit: -0.1135, shape: 'arch or box' },
  { mach: 2.681, first: -0.102, audit: -0.1011, shape: 'thin diamond (Ref 23)' },
  { mach: 3.243, first: -0.095, audit: -0.0926, shape: 'triangle with tick (Ref 5?)' },
  { mach: 3.497, first: -0.083, audit: -0.0819, shape: 'diamond (Ref 24)' },
];

/**
 * Herrin and Dutton's cylinder at M 2.46, as plotted in P. K. Tucker's
 * slides (NASA MSFC 1993, NTRS 19950017232, slide p. 900; a visual
 * reading, +-0.01): base pressure over free-stream pressure 0.553 to 0.575
 * across the base, nearly flat. The original paper (AIAA J. 32(1), 1994)
 * was not opened, and its support arrangement is not verified (0008
 * section 3.3).
 */
export const HERRIN_DUTTON = {
  mach: 2.46,
  pressureRatio: [0.553, 0.575] as const,
  readingError: 0.01,
} as const;
