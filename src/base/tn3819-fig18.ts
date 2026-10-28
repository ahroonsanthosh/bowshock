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
 * - Round 7 (2026-10-21, blind, `audit/round7/` on another branch,
 *   commit 92fb693; copied in `data/round7/tn3819_fig18.csv`): both curves
 *   at M 1.0 to 1.5 every 0.1 and at 2.0, 2.5 and 3.0 (TN3819_FIG18_ROUND7).
 *   Paired with the adopted rows (docs/design/0015-fins-at-the-base.md
 *   section 7): within the combined errors at every Mach number but the
 *   basic curve at M 1.4, where round 1's -0.1796 lies 0.0020 from round
 *   7's -0.1776 (combined 0.0012). The third evidence is fig. 35's no-fin
 *   curve, which reproduces the basic curve within 0.001 (0008 section
 *   3.4) and reads -0.1774 and -0.1775 there in its two readings (0010
 *   section 11.3); and round 1 puts the two curves 0.0014 apart at M 1.4,
 *   against 0.0034 to 0.0042 at M 1.2 and 1.5 in both readings and 0.0038
 *   in round 7 at 1.4. So round 1's value is a misread
 *   (TN3819_FIG18_MISREADS), and the row takes round 7's. Nothing served
 *   from M 1.5 uses that row; below 1.5 the body base of W2 and the rebuilt
 *   fins-on-base factor do (0015 section 11). Round 7 is not added to
 *   TN3819_FIG18_CHECKS: those set the curvature bound of
 *   ./compiled-curve.ts, and nodes below M 1.5 would raise it (0.063 to
 *   0.118, the bend near M 1.2) for the whole range; from M 1.5 its rows
 *   would leave it unchanged.
 *
 * Values without a check rest on one reading from M 1.5: the rows at
 * 1.503, 1.6, 1.8, 2.009, 2.2, 2.4, 2.418, 2.6, 2.8, 3.2 and 3.5 (both
 * curves); the rows at M 1.0, 1.2 and 1.4 are read twice (round 1, round
 * 7; at 1.4 the basic curve resolved as above).
 * tests/base/compiled-curve.test.ts holds every check against the
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

/** Adopted reading (round-1 audit), M 1.0 to 3.5; at M 1.4 the basic curve is round 7's (TN3819_FIG18_MISREADS). */
export const TN3819_FIG18_CURVES: readonly CompiledCurveRow[] = [
  { mach: 1.0, moreNegative: -0.1896, lessNegative: -0.1849 },
  { mach: 1.2, moreNegative: -0.187, lessNegative: -0.1836 },
  { mach: 1.4, moreNegative: -0.181, lessNegative: -0.1776 },
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

/** An adopted value found to be a misread on pairing, and what replaced it. */
export interface CurveMisread {
  readonly mach: number;
  readonly curve: CompiledCurveName;
  /** The value read, now replaced. */
  readonly value: number;
  readonly source: 'round 1';
  /** The value adopted in its place. */
  readonly replacedBy: number;
  readonly why: string;
}

export const TN3819_FIG18_MISREADS: readonly CurveMisread[] = [
  {
    mach: 1.4,
    curve: 'lessNegative',
    value: -0.1796,
    source: 'round 1',
    replacedBy: -0.1776,
    why:
      "0.0020 from round 7's -0.1776 +-0.0002 (combined 0.0012); fig. 35's no-fin curve, which reproduces " +
      'the basic curve, reads -0.1774 and -0.1775 there (0010 section 11.3); 0.0014 from Chapman against ' +
      '0.0034 to 0.0042 at the neighbouring rows',
  },
];

/** One row of round 7's reading of the two compiled curves (P_B, each with its reading error). */
export interface Round7Row {
  readonly mach: number;
  readonly moreNegative: number;
  readonly moreNegativeError: number;
  readonly lessNegative: number;
  readonly lessNegativeError: number;
}

/**
 * Round 7's blind reading of the two compiled curves (`data/round7/tn3819_fig18.csv`). At M 3.0 the curves
 * merge on the figure and its value is the merged line's.
 */
export const TN3819_FIG18_ROUND7: readonly Round7Row[] = [
  {
    mach: 1.0,
    moreNegative: -0.1902,
    moreNegativeError: 0.0004,
    lessNegative: -0.1851,
    lessNegativeError: 0.0003,
  },
  {
    mach: 1.1,
    moreNegative: -0.1892,
    moreNegativeError: 0.0002,
    lessNegative: -0.1851,
    lessNegativeError: 0.0002,
  },
  {
    mach: 1.2,
    moreNegative: -0.1874,
    moreNegativeError: 0.0002,
    lessNegative: -0.1839,
    lessNegativeError: 0.0003,
  },
  {
    mach: 1.3,
    moreNegative: -0.1847,
    moreNegativeError: 0.0002,
    lessNegative: -0.1813,
    lessNegativeError: 0.0002,
  },
  {
    mach: 1.4,
    moreNegative: -0.1814,
    moreNegativeError: 0.0005,
    lessNegative: -0.1776,
    lessNegativeError: 0.0002,
  },
  {
    mach: 1.5,
    moreNegative: -0.1776,
    moreNegativeError: 0.0003,
    lessNegative: -0.1734,
    lessNegativeError: 0.0003,
  },
  {
    mach: 2.0,
    moreNegative: -0.1499,
    moreNegativeError: 0.0003,
    lessNegative: -0.1448,
    lessNegativeError: 0.0002,
  },
  {
    mach: 2.5,
    moreNegative: -0.1196,
    moreNegativeError: 0.0005,
    lessNegative: -0.1172,
    lessNegativeError: 0.0002,
  },
  {
    mach: 3.0,
    moreNegative: -0.0965,
    moreNegativeError: 0.0005,
    lessNegative: -0.0965,
    lessNegativeError: 0.0003,
  },
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

/** TR 1051 fig. 23(b) at one Mach number: its thinnest measured sting symbol, both blind readings. */
export interface Tr1051Fig23bSymbol {
  readonly mach: number;
  /** Reynolds number on the body length and that length over the base diameter, from the figure's legend. */
  readonly reynolds: number;
  readonly lengthOverBase: number;
  /** The symbol's d/h, readers A and B. */
  readonly dOverH: readonly [number, number];
  /** P_B, readers A and B, and each reader's stated error (one standard deviation). */
  readonly readerA: number;
  readonly readerB: number;
  readonly errorA: number;
  readonly errorB: number;
}

/**
 * D. R. Chapman, NACA TR 1051 (1951), appendix B, fig. 23(b): turbulent base pressure against the sting's
 * diameter over the base diameter, d/h, at each Mach number's thinnest measured sting symbol. Round 19
 * (docs/research/total-drag/audit/round19/): two blind readers of every symbol of the figure, paired by a
 * neutral party (15 of 15 symbols within the summed stated errors; the readers agree to within 0.0001 at
 * the three symbols used, so the agreement mostly tests their calibrations); the symbol, not the faired curve,
 * as the addendum to 0014 section 10.7 (ah) registers and its third addendum applies. The models (TR 1051, PDF pp. 12 and 21; its text and
 * fig. 23(b)'s legend, which both readers quote): every body a cone-cylinder (10 deg semiangle) or an
 * ogive-cylinder (10-calibre ogival radius), turbulent by a narrow transition strip, on a rear sting more
 * than 4 base diameters long. Inside the compiled curve's domain, so band evidence (0008 section 3.3's rule,
 * 0014 section 10.7 (ah)) as the plain envelope of the two readings; the thicker stings of the figure
 * measure the sting effect itself (0008 section 3.3's last item) and are not used.
 */
export const TR1051_FIG23B_THINNEST: readonly Tr1051Fig23bSymbol[] = [
  {
    mach: 1.5,
    reynolds: 4.0e6,
    lengthOverBase: 7.0,
    dOverH: [0.3467, 0.347],
    readerA: -0.1722,
    readerB: -0.1723,
    errorA: 0.0003,
    errorB: 0.0005,
  },
  {
    mach: 2.0,
    reynolds: 4.0e6,
    lengthOverBase: 5.0,
    dOverH: [0.2977, 0.298],
    readerA: -0.138,
    readerB: -0.1379,
    errorA: 0.0005,
    errorB: 0.0008,
  },
  {
    mach: 2.9,
    reynolds: 7.5e6,
    lengthOverBase: 5.0,
    dOverH: [0.2961, 0.296],
    readerA: -0.1126,
    readerB: -0.1127,
    errorA: 0.0003,
    errorB: 0.0005,
  },
];

/**
 * Superseded (the third addendum to 0014 section 10.7 (ah)), kept as the record: the values (ah) first used, read
 * at d/h 0.35 on the faired curves (docs/research/total-drag/data/base_sources.md section 2: the first
 * reading, revised, and the round-1 audit's, which had seen the draft's values). At Mach 2.0 and 2.9 the first
 * measured symbols lie at d/h 0.30, so these are fairings, not data; at Mach 1.5 the symbol is at d/h 0.347,
 * and round 19's blind pair reads it 0.002 to 0.004 less negative than these.
 */
export const TR1051_FIG23B_FAIRED_SUPERSEDED: readonly {
  readonly mach: number;
  readonly first: number;
  readonly audit: number;
}[] = [
  { mach: 1.5, first: -0.174, audit: -0.176 },
  { mach: 2.0, first: -0.141, audit: -0.147 },
  { mach: 2.9, first: -0.115, audit: -0.118 },
];

/** TN 2360 fig. 5 or 7: one symbol of the body alone, every reading of both blind readers (round 20). */
export interface Tn2360BodyAloneSymbol {
  readonly figure: '5(a)' | '5(b)' | '7';
  readonly mach: number;
  /** Reynolds number on the body length, readers A and B (fig. 5's abscissa; fig. 7 gives none). */
  readonly reynolds?: readonly [number, number];
  /** P_B, every reading of each reader: the primary first, then the alternatives in the order written. */
  readonly readingsA: readonly number[];
  readonly readingsB: readonly number[];
  /** Each reader's stated error (one standard deviation). */
  readonly errorA: number;
  readonly errorB: number;
}

/**
 * NACA TN 2360 (Spahr and Dickey, 1951) figs. 5(a), 5(b) and 7: the body alone ("tail off", "without
 * tail surface"), its nose tripped by a salt band "to insure local transition" (p. 5), at Mach 1.5 and
 * 2.0. Round 20 (docs/research/total-drag/audit/round20/): two blind readers of every symbol of both
 * figures, paired by a neutral party, 60 of 60 within the summed stated errors, these ten among them, no
 * verdict changed by the alternatives. The pairer notes that both readers took nearly the same pixel
 * positions on the same scan, so the agreement mostly tests their calibrations. Every tripped station is
 * inside the compiled curve's domain (0014 section 10.7 (ah), the fourth addendum and its correction), so
 * all ten enter as the plain envelope of their readings. Fig. 5(a)'s symbol at R 0.765e6 is partly hidden
 * and carries alternatives in both readers; every reading is kept.
 */
export const TN2360_FIG5_FIG7_BODY_ALONE: readonly Tn2360BodyAloneSymbol[] = [
  {
    figure: '5(a)',
    mach: 1.5,
    reynolds: [0.765e6, 0.764e6],
    readingsA: [-0.2021, -0.2023, -0.2018],
    readingsB: [-0.2026, -0.2023],
    errorA: 0.0007,
    errorB: 0.001,
  },
  {
    figure: '5(a)',
    mach: 1.5,
    reynolds: [1.954e6, 1.951e6],
    readingsA: [-0.1962],
    readingsB: [-0.1961],
    errorA: 0.0006,
    errorB: 0.0005,
  },
  {
    figure: '5(a)',
    mach: 1.5,
    reynolds: [3.263e6, 3.262e6],
    readingsA: [-0.1955],
    readingsB: [-0.1953],
    errorA: 0.0004,
    errorB: 0.0005,
  },
  {
    figure: '5(a)',
    mach: 1.5,
    reynolds: [4.414e6, 4.415e6],
    readingsA: [-0.1966],
    readingsB: [-0.1968],
    errorA: 0.0004,
    errorB: 0.0005,
  },
  {
    figure: '5(b)',
    mach: 2.0,
    reynolds: [0.475e6, 0.475e6],
    readingsA: [-0.1486],
    readingsB: [-0.1487],
    errorA: 0.0005,
    errorB: 0.0005,
  },
  {
    figure: '5(b)',
    mach: 2.0,
    reynolds: [1.832e6, 1.833e6],
    readingsA: [-0.1475],
    readingsB: [-0.1473],
    errorA: 0.0004,
    errorB: 0.0005,
  },
  {
    figure: '5(b)',
    mach: 2.0,
    reynolds: [3.308e6, 3.308e6],
    readingsA: [-0.1492],
    readingsB: [-0.1493],
    errorA: 0.0004,
    errorB: 0.0005,
  },
  {
    figure: '5(b)',
    mach: 2.0,
    reynolds: [4.431e6, 4.429e6],
    readingsA: [-0.1512],
    readingsB: [-0.1516],
    errorA: 0.0004,
    errorB: 0.0005,
  },
  {
    figure: '7',
    mach: 1.5,
    readingsA: [-0.1951],
    readingsB: [-0.1949],
    errorA: 0.0004,
    errorB: 0.0005,
  },
  {
    figure: '7',
    mach: 2.0,
    readingsA: [-0.1508],
    readingsB: [-0.1511],
    errorA: 0.0004,
    errorB: 0.0005,
  },
];

/**
 * Superseded by round 20 (0014 section 10.7 (ah), the fourth addendum and its correction), kept as the
 * record: round 6's single readings of the same ten symbols (`audit/round6/readings/tn2360_fig5a.csv`,
 * `tn2360_fig5b.csv`, `tn2360_fig7.csv`), which (ah) listed as checked and not used. Reynolds number in
 * units of 1e6 as read (fig. 7 gives none).
 */
export const TN2360_FIG5_FIG7_ROUND6_SUPERSEDED: readonly {
  readonly figure: '5(a)' | '5(b)' | '7';
  readonly mach: number;
  readonly reynolds?: number;
  readonly pB: number;
}[] = [
  { figure: '5(a)', mach: 1.5, reynolds: 0.7613, pB: -0.2031 },
  { figure: '5(a)', mach: 1.5, reynolds: 1.951, pB: -0.1964 },
  { figure: '5(a)', mach: 1.5, reynolds: 3.262, pB: -0.1953 },
  { figure: '5(a)', mach: 1.5, reynolds: 4.415, pB: -0.1964 },
  { figure: '5(b)', mach: 2.0, reynolds: 0.4781, pB: -0.1506 },
  { figure: '5(b)', mach: 2.0, reynolds: 1.853, pB: -0.1477 },
  { figure: '5(b)', mach: 2.0, reynolds: 3.306, pB: -0.15 },
  { figure: '5(b)', mach: 2.0, reynolds: 4.423, pB: -0.1511 },
  { figure: '7', mach: 1.5, pB: -0.1947 },
  { figure: '7', mach: 2.0, pB: -0.1506 },
];
