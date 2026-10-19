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
 * interpolated at each point's Mach number. Its envelope is 0.824 to 1.078,
 * rounded outward to two decimals: 0.82 to 1.08, 0008's stated band. The
 * low end rests on Herrin and Dutton, a single visual reading of a slide
 * whose support is not verified; the high end on the tunnel symbol at M
 * 3.243, above the range served. The free-flight curve of fig. 18 (M 1.06
 * to 1.21, data over curve 1.027 to 1.122) informs the bias only, as in
 * 0008.
 *
 * Refused (0008 sections 3.3, 6.2 B3 and 6.4): Mach numbers outside 1.5
 * to 3.0 (below 1.5 the data opened are not claimable; the band is stated
 * for 1.5 to 3), afterbodies other than cylinders, and laminar boundary
 * layers at the base. The Mach number is the free stream's: fig. 18 plots
 * against it for cylindrical afterbodies, whose Mach number ahead of the
 * base is about the free stream's; boundary-layer thickness at the base is
 * not an input (0008 section 3.2 found no opened source to quantify it).
 */

import { BaseRefusal } from './refusal';
import {
  HERRIN_DUTTON,
  TN3819_FIG18_CHECKS,
  TN3819_FIG18_CURVES,
  TN3819_FIG18_TUNNEL,
  type CompiledCurveName,
} from './tn3819-fig18';

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

/** The evidence of 0008 section 3.3 as data over curve (ratios of base drag). */
export interface CompiledCurveBandEvidence {
  /** Tunnel symbols, both readings, against both curves. */
  readonly tunnel: { readonly min: number; readonly max: number };
  /** Herrin and Dutton's range against both curves. */
  readonly herrinDutton: { readonly min: number; readonly max: number };
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
  return {
    tunnel: t,
    herrinDutton: h,
    min: Math.min(t.min, h.min),
    max: Math.max(t.max, h.max),
  };
}

/**
 * The model-form band of the compiled curve, measured over curve (ratio of
 * base drag): the evidence's envelope rounded outward to two decimals.
 */
export const COMPILED_CURVE_BAND = (() => {
  const e = compiledCurveBandEvidence();
  return {
    low: Math.floor(e.min * 100 + 1e-9) / 100,
    high: Math.ceil(e.max * 100 - 1e-9) / 100,
  };
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
