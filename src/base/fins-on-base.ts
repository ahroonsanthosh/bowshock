/**
 * The fins-on-base factor of docs/design/0008-total-drag.md section 3.4: F
 * = P_B with fins ending at the base over P_B without fins, measured for
 * one family of fins (four rectangular unswept fins of 10%-thick
 * circular-arc section, TN 3819 fig. 35, ./tn3819-fig35.ts), and the band
 * 0008 builds from it for fins of other thickness.
 *
 * F is defined against Love's basic curve, the less negative of the two
 * compiled curves of fig. 18 (./compiled-curve.ts): the figure's own no-fin
 * estimate reproduces that curve within 0.001, and against the more
 * negative curve F would be 2% to 3.5% smaller (1.453 instead of 1.505 at
 * M 1.8; round-3 audit, section 4.2). It must be applied to that curve and
 * to no other; ./base-drag.ts does.
 *
 * Corrected on 2026-10-20 (0010 section 11): the rows rest on the two
 * readings of fig. 35's free-flight curve as identified, which ends at M
 * 2.563; until then they rested on two readings that followed estimate B,
 * one of Love's predictions, above about M 2.15 (kept as
 * TN3819_FIG35_SUPERSEDED, reproduced by the tests through the options of
 * `finsOnBaseRows`).
 *
 * Measured, M 1.80 to 2.55 (FIG35_FREE_FLIGHT_END, the last Mach number
 * both readings read). The band at each row (a Mach number where some
 * reading of the free-flight line exists), over every reading r of that
 * line, with F_r = P_B,r / P_B,no fins and e_r its reading error over
 * |P_B,no fins|:
 *
 * - low end: min over r of 1 + (F_r - e_r - 1) / 2, half the 10%-thick
 *   increment, since TN 2360's 5%-thick fins gave about half the
 *   increments of 10% (its summary; 0008 section 3.4);
 * - high end: the larger of max over r of F_r + e_r and the tunnel factor
 *   (the largest over the readings of the tunnel pairs, interpolated
 *   linearly between M 1.50, 2.00 and 2.41). Beyond the last tunnel pair
 *   (M 2.41) the tunnel's excess over free flight is carried: the high end
 *   there is max over r of F_r plus the largest excess measured at any
 *   tunnel Mach number (0.208, at M 2.41, the Langley pair against the
 *   first reading of the line; 0.140 at 1.50 and 0.073 at 2.00). This is
 *   the conservative choice of the round-3 audit (its section 4.1, option
 *   b), adopted on that reading's evidence, not on any gate: TN 3819 p. 23,
 *   "All the wind-tunnel base pressures for the body with fins are lower
 *   than the free-flight results".
 * - nominal: the band's midpoint (0008 section 6.3).
 *
 * Reading errors are each reading's own, and at least
 * FIG35_IDENTITY_SWAP.error (0.0065) at M 1.75 to 2.55, where estimate B
 * (to 2.15) or estimate A (above) runs within that of the free-flight line,
 * so that a swap of the two is covered. Between rows the low and high ends
 * are interpolated linearly in M.
 *
 * Bounded, not measured, above M 2.55 to 3.0 (0014 section 10.2; 0010
 * section 11): the figure has no free-flight data there. The lower bound is
 * no fin effect, F = 1 exactly (the factor is defined on the basic curve,
 * which the figure's no-fin curve reproduces; and every source this factor
 * rests on, TN 3819 figs. 33 to 35 and TN 2360, shows four unswept fins 5%
 * to 10% thick at the base lowering the base pressure, never raising it).
 * The upper bound is the factor at M 2.55 with its band's high end, carried
 * as a ratio: Love, p. 23, "Also indicated is the decrease in fin effects
 * as Mach number increases", and TN 2360's dependence on the fins'
 * thickness and slope, whose pressure field scales in linear theory as the
 * slope over sqrt(M^2 - 1) (a judgement backed by the trend, not a
 * measurement). Served: the midpoint of 1 and that high end, the band the
 * whole gap.
 *
 * Labels (0008 sections 3.4, 6.2 B3, 6.4): on circular-arc fins the factor
 * is a correlation measured on such fins; on any other section, such as
 * the Basic Finner's single wedges with blunt trailing edges, it is "an
 * analogy, not a measurement", since no opened source measures F for them.
 * Above M 2.55, "bounded, not measured" in either case.
 *
 * Refused: fins other than four (the data are cruciform; TN 2360 found a
 * cruciform tail's increment less than twice a plane tail's, not
 * quantified); thickness ratios outside 0.05 to 0.10 (the band rests on the
 * 5% and 10% data); Mach numbers outside 1.80 to 3.0 (a Mach number below
 * 1.80 by no more than the figure's abscissa reading error, 0.002, takes
 * the 1.80 row, flagged). Fins ending between the base and a chord ahead of
 * it are refused by ./base-drag.ts.
 */

import { compiledCurveValue } from './compiled-curve';
import { BaseRefusal } from './refusal';
import {
  FIG35_FREE_FLIGHT_END,
  FIG35_IDENTITY_SWAP,
  TN3819_FIG35_FREE_FLIGHT,
  TN3819_FIG35_TUNNEL,
  type Fig35FreeFlightReading,
  type Fig35TunnelPair,
} from './tn3819-fig35';

/** The Mach numbers served: measured from M 1.80 to FIG35_FREE_FLIGHT_END, bounded above it to 3.0. */
export const FINS_ON_BASE_MACH_RANGE = [1.8, 3.0] as const;
/** Abscissa reading error of fig. 35 (round 3: +-0.002 in M). */
export const FIG35_MACH_READING_ERROR = 0.002;

export interface FinsOnBaseRowOptions {
  readonly readings?: readonly Fig35FreeFlightReading[];
  readonly tunnel?: readonly Fig35TunnelPair[];
  /** Carry the largest tunnel excess beyond the last pair (default true). */
  readonly carryTunnelExcess?: boolean;
  /** Apply the identity-swap error (default true). */
  readonly identitySwap?: boolean;
  /** Where the identity-swap error applies, and its size (default FIG35_IDENTITY_SWAP). */
  readonly identitySwapSpan?: {
    readonly from: number;
    readonly to: number;
    readonly error: number;
  };
  /** Row Mach numbers; default every point of a reading in M 1.80 to FIG35_FREE_FLIGHT_END. */
  readonly machs?: readonly number[];
}

export interface FreeFlightFactor {
  readonly reading: string;
  readonly factor: number;
  /** Reading error of the factor. */
  readonly error: number;
  readonly extrapolated: boolean;
}

export interface FinsOnBaseRow {
  readonly mach: number;
  /** Love's basic curve (fig. 18, less negative) at this Mach number. */
  readonly pBNoFins: number;
  readonly freeFlight: readonly FreeFlightFactor[];
  /** The tunnel factor (largest over readings), where the pairs reach. */
  readonly tunnel: number | undefined;
  /** The free-flight factor plus the largest tunnel excess, beyond the pairs. */
  readonly carried: number | undefined;
  readonly low: number;
  readonly high: number;
  /** Readings of the free-flight line at this Mach number that are not extrapolations. */
  readonly readCount: number;
}

/** Linear interpolation on ascending points, or undefined outside them. */
function interpolate<T extends { mach: number }>(
  points: readonly T[],
  mach: number,
  value: (p: T) => number,
): { value: number; a: T; b: T } | undefined {
  if (points.length === 0) return undefined;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (mach < first.mach - 1e-12 || mach > last.mach + 1e-12) return undefined;
  for (let k = 0; k < points.length; k++) {
    const p = points[k]!;
    if (Math.abs(p.mach - mach) <= 1e-12) return { value: value(p), a: p, b: p };
    const q = points[k + 1];
    if (q !== undefined && mach > p.mach && mach < q.mach) {
      const t = (mach - p.mach) / (q.mach - p.mach);
      return { value: value(p) + t * (value(q) - value(p)), a: p, b: q };
    }
  }
  return undefined;
}

function tunnelByReading(pairs: readonly Fig35TunnelPair[]) {
  const byReading = new Map<string, Fig35TunnelPair[]>();
  for (const p of pairs) {
    const list = byReading.get(p.reading) ?? [];
    list.push(p);
    byReading.set(p.reading, list);
  }
  return [...byReading.values()].map((list) => [...list].sort((p, q) => p.mach - q.mach));
}

/** The tunnel's excess over free flight at each tunnel pair, for each reading of the line that reaches it. */
export function tunnelExcess(
  readings: readonly Fig35FreeFlightReading[] = TN3819_FIG35_FREE_FLIGHT,
  pairs: readonly Fig35TunnelPair[] = TN3819_FIG35_TUNNEL,
): { mach: number; tunnelReading: string; lineReading: string; excess: number }[] {
  const out: { mach: number; tunnelReading: string; lineReading: string; excess: number }[] = [];
  for (const p of pairs) {
    const noFins = compiledCurveValue(p.mach, 'lessNegative');
    for (const r of readings) {
      const v = interpolate(r.points, p.mach, (x) => x.pB);
      if (v === undefined) continue;
      out.push({
        mach: p.mach,
        tunnelReading: p.reading,
        lineReading: r.reading,
        excess: p.withFins / p.withoutFins - v.value / noFins,
      });
    }
  }
  return out;
}

export function finsOnBaseRows(options: FinsOnBaseRowOptions = {}): FinsOnBaseRow[] {
  const readings = options.readings ?? TN3819_FIG35_FREE_FLIGHT;
  const pairs = options.tunnel ?? TN3819_FIG35_TUNNEL;
  const carry = options.carryTunnelExcess ?? true;
  const swap = options.identitySwap ?? true;
  const span = options.identitySwapSpan ?? FIG35_IDENTITY_SWAP;
  const lo = FINS_ON_BASE_MACH_RANGE[0];
  const hi = FIG35_FREE_FLIGHT_END;
  const machs =
    options.machs ??
    [
      ...new Set(
        readings.flatMap((r) =>
          r.points.map((p) => p.mach).filter((m) => m >= lo - 1e-12 && m <= hi + 1e-12),
        ),
      ),
    ].sort((a, b) => a - b);
  const tunnels = tunnelByReading(pairs);
  const lastTunnel = Math.max(...pairs.map((p) => p.mach));
  const excesses = tunnelExcess(readings, pairs).map((e) => e.excess);
  const largestExcess = excesses.length > 0 ? Math.max(...excesses) : 0;

  return machs.map((mach) => {
    const noFins = compiledCurveValue(mach, 'lessNegative');
    const freeFlight: FreeFlightFactor[] = [];
    for (const r of readings) {
      const v = interpolate(r.points, mach, (p) => p.pB);
      if (v === undefined) continue;
      let error = Math.max(v.a.error, v.b.error);
      if (swap && mach >= span.from - 1e-12 && mach <= span.to + 1e-12) {
        error = Math.max(error, span.error);
      }
      freeFlight.push({
        reading: r.reading,
        factor: v.value / noFins,
        error: error / Math.abs(noFins),
        extrapolated: v.a.extrapolated === true || v.b.extrapolated === true,
      });
    }
    if (freeFlight.length === 0) {
      throw new RangeError(`no reading of the free-flight line reaches M ${mach}`);
    }
    let tunnel: number | undefined;
    for (const list of tunnels) {
      const v = interpolate(list, mach, (p) => p.withFins / p.withoutFins);
      if (v !== undefined) tunnel = Math.max(tunnel ?? -Infinity, v.value);
    }
    const maxFactor = Math.max(...freeFlight.map((f) => f.factor));
    const carried = carry && mach > lastTunnel + 1e-12 ? maxFactor + largestExcess : undefined;
    const low = Math.min(...freeFlight.map((f) => 1 + 0.5 * (f.factor - f.error - 1)));
    const high = Math.max(
      ...freeFlight.map((f) => f.factor + f.error),
      tunnel ?? -Infinity,
      carried ?? -Infinity,
    );
    return {
      mach,
      pBNoFins: noFins,
      freeFlight,
      tunnel,
      carried,
      low,
      high,
      readCount: freeFlight.filter((f) => !f.extrapolated).length,
    };
  });
}

/** The adopted rows, M 1.80 to 2.55: both readings, the tunnel excess carried, the identity-swap error. */
export const FINS_ON_BASE_ROWS: readonly FinsOnBaseRow[] = finsOnBaseRows();

/**
 * Above the free-flight curve's end: bounded, not measured, from no fin
 * effect (F = 1) to the last row's high end.
 */
export const FINS_ON_BASE_BOUNDED = (() => {
  const end = FINS_ON_BASE_ROWS[FINS_ON_BASE_ROWS.length - 1]!;
  return { from: end.mach, to: FINS_ON_BASE_MACH_RANGE[1], low: 1, high: end.high } as const;
})();

/** Fins whose trailing edges are at the base. */
export interface FinsAtBase {
  readonly count: number;
  /** Largest thickness over chord. */
  readonly thicknessRatio: number;
  /** 'circular-arc' is the section of fig. 35's fins; anything else is an analogy. */
  readonly section: 'circular-arc' | 'other';
}

export interface FinsOnBaseFactor {
  readonly mach: number;
  /** The band's midpoint. */
  readonly nominal: number;
  readonly low: number;
  readonly high: number;
  readonly label: string;
  /** True when the factor is carried over from circular-arc fins. */
  readonly analogy: boolean;
  /**
   * Above the free-flight curve's end (M 2.55): bounded, not measured, from
   * no fin effect to the factor at the end (0014 section 10.2).
   */
  readonly bounded: boolean;
  /** Fewer than two readings at a bracketing row (extrapolations not counted). */
  readonly singleReading: boolean;
  /** A bracketing row rests on an extrapolated value only. */
  readonly extrapolated: boolean;
  /** Below M 1.80 by no more than FIG35_MACH_READING_ERROR, taking the 1.80 row. */
  readonly atRangeEnd: boolean;
}

export const FINS_ON_BASE_LABEL_MEASURED =
  'correlation: fins-on-base factor measured on circular-arc fins (TN 3819 fig. 35)';
export const FINS_ON_BASE_LABEL_ANALOGY =
  'an analogy, not a measurement: the fins-on-base factor measured on circular-arc fins ' +
  '(TN 3819 fig. 35), applied by analogy to these fins (0008 section 3.4)';
/** Above the end of fig. 35's free-flight curve, for circular-arc fins and (by analogy) others. */
export const finsOnBaseBoundedLabel = (analogy: boolean): string =>
  'bounded, not measured: the fins-on-base factor between no fin effect (F = 1 on the basic ' +
  `curve of TN 3819 fig. 18) and its value at M ${FINS_ON_BASE_BOUNDED.from}, where the ` +
  'free-flight curve of TN 3819 fig. 35 ends (the high end of its band there, F = ' +
  `${FINS_ON_BASE_BOUNDED.high.toFixed(3)}), measured on circular-arc fins below that Mach number` +
  (analogy ? ' and applied by analogy to these fins' : '') +
  ' (0010 section 11)';

export function finsOnBaseFactor(mach: number, fins: FinsAtBase): FinsOnBaseFactor {
  if (fins.count !== 4) {
    throw new BaseRefusal(
      'fin-count',
      `the fins-on-base factor is measured with four fins at the base; ${fins.count} fins are not ` +
        'covered (TN 2360 found a cruciform tail less than twice a plane tail, not quantified)',
    );
  }
  if (!(fins.thicknessRatio >= 0.05 && fins.thicknessRatio <= 0.1)) {
    throw new BaseRefusal(
      'fin-thickness',
      `the fins-on-base band rests on fins 5% and 10% thick (TN 2360, TN 3819 fig. 35); ` +
        `t/c = ${fins.thicknessRatio} is outside them`,
    );
  }
  const rows = FINS_ON_BASE_ROWS;
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const top = FINS_ON_BASE_MACH_RANGE[1];
  let m = mach;
  let atRangeEnd = false;
  if (m < first.mach && m >= first.mach - FIG35_MACH_READING_ERROR) {
    m = first.mach;
    atRangeEnd = true;
  }
  if (!(m >= first.mach && m <= top)) {
    throw new BaseRefusal(
      'mach-range',
      `the fins-on-base factor is read at Mach ${first.mach} to ${last.mach} and bounded to ` +
        `${top} (TN 3819 fig. 35), asked Mach ${mach}`,
    );
  }
  const analogy = fins.section !== 'circular-arc';
  if (m > last.mach) {
    const b = FINS_ON_BASE_BOUNDED;
    return {
      mach,
      nominal: 0.5 * (b.low + b.high),
      low: b.low,
      high: b.high,
      label: finsOnBaseBoundedLabel(analogy),
      analogy,
      bounded: true,
      singleReading: last.readCount < 2,
      extrapolated: last.readCount === 0,
      atRangeEnd: false,
    };
  }
  let k = 0;
  while (k + 2 < rows.length && m > rows[k + 1]!.mach) k++;
  const a = rows[k]!;
  const b = rows[k + 1]!;
  const t = m <= a.mach ? 0 : (m - a.mach) / (b.mach - a.mach);
  const used = t === 0 ? [a] : t === 1 ? [b] : [a, b];
  const low = a.low + t * (b.low - a.low);
  const high = a.high + t * (b.high - a.high);
  return {
    mach,
    nominal: 0.5 * (low + high),
    low,
    high,
    label: analogy ? FINS_ON_BASE_LABEL_ANALOGY : FINS_ON_BASE_LABEL_MEASURED,
    analogy,
    bounded: false,
    singleReading: used.some((r) => r.readCount < 2),
    extrapolated: used.some((r) => r.readCount === 0),
    atRangeEnd,
  };
}
