/**
 * The compiled curve of base pressure against Mach number for a
 * cylindrical afterbody with a turbulent boundary layer and no fins (NACA
 * TN 3819 fig. 18, ./tn3819-fig18.ts), and its model-form band, as
 * docs/design/0008-total-drag.md section 3 sets them. Labelled a
 * correlation: every base data set opened at these conditions was used to
 * set the band, so the correlation is band estimation, tested only through
 * a total (0008 sections 3.3 and 6.2, B3).
 *
 * The curve served is Love's basic curve, the less negative of the two:
 * the fins-on-base factor of ./fins-on-base.ts is defined against it (TN
 * 3819 fig. 35's no-fin estimate reproduces it), and taken against the
 * more negative curve that factor would be 2% to 3.5% too small (round-3
 * audit, section 4.2). Every value of it at the ratio Mach numbers M 1.5
 * to 3.5 has two readings. The band applies to it unchanged: it was set
 * as the envelope of data over curve against both curves, so it contains
 * every data point against either (and the more negative curve itself
 * lies within 1.036 times the less negative over the table).
 *
 * Interpolation between the tabulated values is linear in M. It reproduces
 * every tabulated value, adds no extremum, and its error between nodes a
 * and b is at most (M - a)(b - M) / 2 times the largest |P_B''|. That
 * curvature is estimated from the values read twice, as the largest second
 * divided difference over consecutive twice-read nodes (spacings 0.004 to
 * 0.48 in M; nodes closer than 0.03 are merged, since their difference
 * measures the reading error, not the curvature), and the resulting error
 * bound is carried in the band. tests/base/compiled-curve.test.ts checks
 * the bound against the single-read values (each against the line
 * through its neighbours).
 *
 * The band is computed here from the transcribed data, as 0008 computes
 * it (`docs/research/total-drag/scripts/base_ratios_v3.py`, its Herrin and
 * Dutton line from `base_ratios_v2.py`): the twelve tunnel symbols of fig.
 * 18 (each of their two readings) and Herrin and Dutton's range at M 2.46
 * (./tn3819-fig18.ts), as data over curve against both curves, the curve
 * interpolated at each point's Mach number. That envelope, 0.824 to 1.078,
 * gave 0008's stated band, 0.82 to 1.08. The free-flight curve of fig. 18
 * (M 1.06 to 1.21, data over curve 1.027 to 1.122) informs the bias only,
 * as in 0008.
 *
 * Corrected on 2026-10-27 (0014 section 10.7 (ah)): 0008 section 3.3's rule,
 * "every base data set opened at these conditions is used to set this band",
 * now takes every body-alone base pressure read twice inside this domain,
 * each paired reading, the same way (`BODY_ALONE_IN_DOMAIN`): TN 2360's body
 * alone and the Langley 9 in tunnel's (TN 3819 figs. 33 and 35), RM
 * L52J21a's unfinned bodies (figs. 31 to 33 (d), every paired symbol) and TR
 * 1051 fig. 23(b) at its thinnest measured sting symbols (round 19's blind
 * pair; the addendum and the third addendum to (ah)), and TN 2360 figs. 5
 * and 7's body alone at every tripped station (round 20's blind pair; the
 * fourth addendum and its correction). The sets opened in the domain and
 * read once are named in that entry and set nothing. The envelope becomes
 * 0.7731 to 1.1691, rounded outward 0.77 to 1.17: the low end RM L52J21a's
 * radome nose at M 1.62 over the more negative curve, the high end TN 2360
 * fig. 5(a)'s body alone at M 1.5 and R 0.765e6 (round 20's reader B, over
 * the served curve).
 *
 * Refused (0008 sections 3.3, 6.2 B3 and 6.4): Mach numbers outside 1.5
 * to 3.0 (below 1.5 the data opened are not claimable; the band is stated
 * for 1.5 to 3), afterbodies other than cylinders, and laminar boundary
 * layers at the base. The Mach number is the free stream's: fig. 18 plots
 * against it for cylindrical afterbodies, whose Mach number ahead of the
 * base is about the free stream's; boundary-layer thickness at the base is
 * not an input (0008 section 3.2 found no opened source to quantify it).
 */

import {
  L52J21A_FIG31_33D,
  L52J21A_FIG31_33D_OTHER_R,
  TN3819_FIG33,
  TN3819_FIG35_TUNNEL_W1,
} from './fins-on-base-w1-data';
import { BaseRefusal } from './refusal';
import {
  HERRIN_DUTTON,
  TN3819_FIG18_CHECKS,
  TN3819_FIG18_CURVES,
  TN2360_FIG5_FIG7_BODY_ALONE,
  TN3819_FIG18_TUNNEL,
  TR1051_FIG23B_THINNEST,
  type CompiledCurveName,
} from './tn3819-fig18';
import { TN3819_FIG35_TUNNEL } from './tn3819-fig35';

/** Mach numbers over which 0008 states the band (section 3.3). */
export const COMPILED_CURVE_MACH_RANGE = [1.5, 3.0] as const;

/** The two curves' adopted values interpolated linearly in M (any M in the table). */
export function compiledCurveValue(mach: number, curve: CompiledCurveName): number {
  const rows = TN3819_FIG18_CURVES;
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  if (!(mach >= first.mach && mach <= last.mach)) {
    throw new RangeError(`the table runs from M ${first.mach} to ${last.mach}, asked ${mach}`);
  }
  let k = 0;
  while (k + 2 < rows.length && mach > rows[k + 1]!.mach) k++;
  const a = rows[k]!;
  const b = rows[k + 1]!;
  const t = (mach - a.mach) / (b.mach - a.mach);
  return a[curve] + t * (b[curve] - a[curve]);
}

/** Nodes closer than this in M are merged when the curvature is estimated. */
const MERGE_SPACING = 0.03;

/**
 * The twice-read values of one curve (those with at least one check), with
 * nodes closer than MERGE_SPACING merged by averaging.
 */
export function twiceReadNodes(curve: CompiledCurveName): { mach: number; value: number }[] {
  const checked = TN3819_FIG18_CURVES.filter((row) =>
    TN3819_FIG18_CHECKS.some((c) => c.curve === curve && c.mach === row.mach),
  );
  const out: { mach: number; value: number; n: number }[] = [];
  for (const row of checked) {
    const prev = out[out.length - 1];
    if (prev !== undefined && row.mach - prev.mach < MERGE_SPACING) {
      prev.mach = (prev.mach * prev.n + row.mach) / (prev.n + 1);
      prev.value = (prev.value * prev.n + row[curve]) / (prev.n + 1);
      prev.n += 1;
    } else {
      out.push({ mach: row.mach, value: row[curve], n: 1 });
    }
  }
  return out.map(({ mach, value }) => ({ mach, value }));
}

/**
 * Largest |P_B''| over both curves, estimated as twice the largest second
 * divided difference over consecutive twice-read nodes.
 */
export const COMPILED_CURVE_CURVATURE_BOUND = (() => {
  let k = 0;
  for (const curve of ['moreNegative', 'lessNegative'] as const) {
    const n = twiceReadNodes(curve);
    for (let i = 1; i + 1 < n.length; i++) {
      const s1 = (n[i]!.value - n[i - 1]!.value) / (n[i]!.mach - n[i - 1]!.mach);
      const s2 = (n[i + 1]!.value - n[i]!.value) / (n[i + 1]!.mach - n[i]!.mach);
      k = Math.max(k, Math.abs((2 * (s2 - s1)) / (n[i + 1]!.mach - n[i - 1]!.mach)));
    }
  }
  return k;
})();

/**
 * Bound on the linear interpolant's error at mach: (M - a)(b - M) / 2
 * times COMPILED_CURVE_CURVATURE_BOUND, a and b the bracketing nodes.
 */
export function interpolationErrorBound(mach: number): number {
  const rows = TN3819_FIG18_CURVES;
  let k = 0;
  while (k + 2 < rows.length && mach > rows[k + 1]!.mach) k++;
  const a = rows[k]!.mach;
  const b = rows[k + 1]!.mach;
  const w = Math.max(0, (mach - a) * (b - mach));
  return 0.5 * w * COMPILED_CURVE_CURVATURE_BOUND;
}

/** The body-alone sets taken into the band by 0014 section 10.7 (ah). */
export type BodyAloneSet = 'TN 2360' | 'Langley 9 in' | 'RM L52J21a' | 'TR 1051';

/** One reading of a body-alone base pressure inside the curve's domain. */
export interface BodyAloneReading {
  readonly set: BodyAloneSet;
  /** Figure and reading. */
  readonly source: string;
  readonly mach: number;
  readonly pB: number;
}

const reading = (
  set: BodyAloneSet,
  source: string,
  mach: number,
  pB: number,
): BodyAloneReading => ({
  set,
  source,
  mach,
  pB,
});

/**
 * Every body-alone base pressure read twice inside the curve's domain (Mach 1.5 to 3.0, cylindrical
 * afterbody, turbulent, no fins, power off), each paired reading (0014 section 10.7 (ah)); the sets
 * opened there and read once (NSWCDD/TR-92/509 among them) are named in that entry and set nothing:
 *
 * - TN 2360's body alone (TN 3819's ref. 26; ogive-cylinder, sting d/h 0.4, R 4.5e6) at M 1.5 and 2.0,
 *   and the Langley 9 in tunnel's at M 2.41: TN 3819 fig. 33 at t/c 0 (W1's first reading and round
 *   6's) and fig. 35's no-fin tunnel symbols (0008's first reading, round 3's and round 6's);
 * - RM L52J21a figs. 31 to 33 panel (d): the unfinned bodies with cylindrical bases, sting-supported,
 *   three noses, every symbol W1's first reading and round 7's both read, at R 7.0e6 to 9.1e6 (W1's
 *   window about R 8.06e6 and the fourteen pairs outside it, `L52J21A_FIG31_33D_OTHER_R`);
 * - TR 1051 fig. 23(b) at its thinnest measured sting symbol at each Mach number (d/h 0.347, 0.298
 *   and 0.296), round 19's two blind readings (./tn3819-fig18.ts); the faired values at d/h 0.35 that
 *   (ah) first used are superseded and set nothing (the third addendum to (ah));
 * - TN 2360 figs. 5(a), 5(b) and 7: the body alone at every tripped station, Mach 1.5 and 2.0, R 0.475e6
 *   to 4.43e6 (fig. 7 gives none), every reading of round 20's two blind readers (./tn3819-fig18.ts);
 *   round 6's single readings, checked and not used before, are superseded (the fourth addendum to (ah)
 *   and its correction).
 */
export const BODY_ALONE_IN_DOMAIN: readonly BodyAloneReading[] = [
  ...TN3819_FIG33.filter((p) => p.thicknessRatio === 0).map((p) =>
    reading(
      p.mach < 2.2 ? 'TN 2360' : 'Langley 9 in',
      `TN 3819 fig. 33, ${p.reading}`,
      p.mach,
      p.pB,
    ),
  ),
  ...[...TN3819_FIG35_TUNNEL, ...TN3819_FIG35_TUNNEL_W1].map((p) =>
    reading(
      p.source === 'ref. 26' ? 'TN 2360' : 'Langley 9 in',
      `TN 3819 fig. 35, ${p.reading}`,
      p.mach,
      p.withoutFins,
    ),
  ),
  ...[...L52J21A_FIG31_33D, ...L52J21A_FIG31_33D_OTHER_R].map((p) =>
    reading(
      'RM L52J21a',
      `RM L52J21a figs. 31 to 33 (d), ${p.nose}, R ${(p.reynolds / 1e6).toFixed(2)}e6, ${p.reading}`,
      p.mach,
      p.pB,
    ),
  ),
  ...TR1051_FIG23B_THINNEST.flatMap((p) => [
    reading('TR 1051', `TR 1051 fig. 23(b), d/h ${p.dOverH[1]}, round 19 A`, p.mach, p.readerA),
    reading('TR 1051', `TR 1051 fig. 23(b), d/h ${p.dOverH[1]}, round 19 B`, p.mach, p.readerB),
  ]),
  ...TN2360_FIG5_FIG7_BODY_ALONE.flatMap((p) => {
    const at = `TN 2360 fig. ${p.figure}, M ${p.mach}${p.reynolds === undefined ? '' : `, R ${(p.reynolds[0] / 1e6).toFixed(3)}e6`}`;
    return [
      ...p.readingsA.map((pB, k) => reading('TN 2360', `${at}, round 20 A${k}`, p.mach, pB)),
      ...p.readingsB.map((pB, k) => reading('TN 2360', `${at}, round 20 B${k}`, p.mach, pB)),
    ];
  }),
];

/** The evidence of 0008 section 3.3 as data over curve (ratios of base drag). */
export interface CompiledCurveBandEvidence {
  /** Tunnel symbols, both readings, against both curves. */
  readonly tunnel: { readonly min: number; readonly max: number };
  /** Herrin and Dutton's range against both curves. */
  readonly herrinDutton: { readonly min: number; readonly max: number };
  /** Each body-alone set of 0014 section 10.7 (ah), every reading, against both curves. */
  readonly bodyAlone: Readonly<
    Record<BodyAloneSet, { readonly min: number; readonly max: number }>
  >;
  readonly min: number;
  readonly max: number;
}

export function compiledCurveBandEvidence(gamma = 1.4): CompiledCurveBandEvidence {
  const both = (mach: number) =>
    [compiledCurveValue(mach, 'moreNegative'), compiledCurveValue(mach, 'lessNegative')] as const;
  const tunnel: number[] = [];
  for (const s of TN3819_FIG18_TUNNEL) {
    for (const p of [s.first, s.audit]) for (const c of both(s.mach)) tunnel.push(p / c);
  }
  const q = 0.5 * gamma * HERRIN_DUTTON.mach ** 2;
  const hd: number[] = [];
  for (const ratio of HERRIN_DUTTON.pressureRatio) {
    for (const c of both(HERRIN_DUTTON.mach)) hd.push((ratio - 1) / q / c);
  }
  const range = (v: number[]) => ({ min: Math.min(...v), max: Math.max(...v) });
  const t = range(tunnel);
  const h = range(hd);
  const sets: BodyAloneSet[] = ['TN 2360', 'Langley 9 in', 'RM L52J21a', 'TR 1051'];
  const bodyAlone = Object.fromEntries(
    sets.map((set) => [
      set,
      range(
        BODY_ALONE_IN_DOMAIN.filter((r) => r.set === set).flatMap((r) =>
          both(r.mach).map((c) => r.pB / c),
        ),
      ),
    ]),
  ) as Record<BodyAloneSet, { min: number; max: number }>;
  const all = [t, h, ...Object.values(bodyAlone)];
  return {
    tunnel: t,
    herrinDutton: h,
    bodyAlone,
    min: Math.min(...all.map((r) => r.min)),
    max: Math.max(...all.map((r) => r.max)),
  };
}

/**
 * 0008 section 3.3's rounding: an envelope rounded outward to two decimals, the low end down and the
 * high end up (an end already on the second decimal, within 1e-9, stays).
 */
export function roundedOutward(min: number, max: number): { low: number; high: number } {
  return {
    low: Math.floor(min * 100 + 1e-9) / 100,
    high: Math.ceil(max * 100 - 1e-9) / 100,
  };
}

/**
 * The model-form band of the compiled curve, measured over curve (ratio of
 * base drag): the evidence's envelope rounded outward to two decimals.
 */
export const COMPILED_CURVE_BAND = (() => {
  const e = compiledCurveBandEvidence();
  return roundedOutward(e.min, e.max);
})();

export interface CompiledCurveBasePressure {
  readonly mach: number;
  /** Love's basic curve (the less negative), the value served. */
  readonly pB: number;
  /** Chapman's compilation (the more negative), for reference. */
  readonly pBMoreNegative: number;
  /** Bound on the interpolation error of pB (P_B units). */
  readonly interpolationError: number;
  /**
   * True when both table nodes bracketing mach on the served curve were
   * read twice (or mach is a twice-read node).
   */
  readonly bracketReadTwice: boolean;
}

/** Checks the Mach number against COMPILED_CURVE_MACH_RANGE; throws BaseRefusal. */
export function checkCompiledCurveMach(mach: number): void {
  const [lo, hi] = COMPILED_CURVE_MACH_RANGE;
  if (!(mach >= lo && mach <= hi)) {
    throw new BaseRefusal(
      'mach-range',
      `the base-pressure correlation's band is measured at Mach ${lo} to ${hi} (0008 section 3.3; ` +
        `below ${lo} the base data opened are not claimable), asked Mach ${mach}`,
    );
  }
}

/** The compiled curve at a Mach number in COMPILED_CURVE_MACH_RANGE. */
export function compiledCurveBasePressure(mach: number): CompiledCurveBasePressure {
  checkCompiledCurveMach(mach);
  const rows = TN3819_FIG18_CURVES;
  const read = (m: number) =>
    TN3819_FIG18_CHECKS.some((c) => c.curve === 'lessNegative' && c.mach === m);
  const node = rows.find((r) => r.mach === mach);
  let bracketReadTwice: boolean;
  if (node !== undefined) {
    bracketReadTwice = read(node.mach);
  } else {
    let k = 0;
    while (k + 2 < rows.length && mach > rows[k + 1]!.mach) k++;
    bracketReadTwice = read(rows[k]!.mach) && read(rows[k + 1]!.mach);
  }
  return {
    mach,
    pB: compiledCurveValue(mach, 'lessNegative'),
    pBMoreNegative: compiledCurveValue(mach, 'moreNegative'),
    interpolationError: interpolationErrorBound(mach),
    bracketReadTwice,
  };
}
