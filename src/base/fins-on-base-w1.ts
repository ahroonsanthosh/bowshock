/**
 * The rebuilt fins-on-base factor: work item W1 of
 * docs/design/0014-refusals.md, recorded in
 * docs/design/0015-fins-at-the-base.md. F = P_B with fins near the base
 * over P_B without, as in ./fins-on-base.ts, but over the fins the data
 * cover, not one family: two to four fins, sharp trailing edges up to the
 * 10% circular arc's, swept or not, at the base or up to a chord ahead.
 *
 * Routing (0014 section 10.3; ./base-drag.ts): the present factor
 * (./fins-on-base.ts) is kept for every case it serves, the Basic Finner's
 * validated total among them, and this factor is used only where the
 * present one refuses, until the owner decides otherwise after BRL 934's
 * run.
 *
 * The family members, all measured on rectangular, unswept fins of
 * circular-arc section on a cylindrical afterbody with a turbulent layer
 * (./fins-on-base-w1-data.ts, ./tn3819-fig35.ts):
 *
 * - the reference, four fins t/c 0.10 at x/c = 0, M 1.5 to 3.0: low end
 *   the free-flight line of TN 3819 fig. 35 less its reading error (every
 *   reading), high end the larger of the line plus its error and the
 *   tunnel factor (fig. 35's pairs, fig. 33, TN 2360 fig. 6, each reading
 *   with its error; linear between M 1.50, 2.00 and 2.41, and beyond 2.41
 *   the line plus the largest tunnel excess, as the present factor);
 * - the others, t/c 0.05 and 0.10, two and four fins, x/c = 0 to 1.0
 *   (TN 2360 fig. 6, and fig. 33 for four fins t/c 0.05 at x/c = 0), at M
 *   1.5 and 2.0 only: each as a ratio of its increment to the reference's
 *   in the same tunnel (the range over every reading and run, each with
 *   its error; between M 1.5 and 2.0 the envelope of both ranges), times
 *   the reference's increment band, so the tunnel's ratio is carried to
 *   free flight and the band holds both;
 * - the zero member, no fins or fins with no pressure field: F from 1 down
 *   to the largest relief RM L52J21a allows with fins near the base and a
 *   turbulent layer at M 1.5 or above, at every M from 1.5
 *   (W1_RELIEF_LOW): the lesser of fig. 8 over figs. 31 to 33 by nose, its
 *   calls paired among three readers (0.938, the conical nose at M 1.93),
 *   and fig. 38(c) over fig. 8 (0.9504, W1_RELIEF_LOW_FIG38C). Below 1.5,
 *   RM L52E06's relief with flat plates (0.838, zeroMember).
 *
 * A case is bracketed between a lower member it dominates and an upper
 * member that dominates it, in each variable the sources show moves F:
 *
 * - the section's thickness near the trailing edge: by TN 2360's
 *   superposition argument (pp. 6, 10) the increment grows with the
 *   section's half-thickness at each station; so a sharp-edged section of
 *   half-thickness h(s) lies between the circular arcs 2 tau s (1 - s) with
 *   tau = tauLow = min h / (2 s (1 - s)) and tau = tauEq = max of it
 *   (sectionBracket). Circular arcs are their own members;
 * - the count: two between zero and four where TN 2360's plane tail is not
 *   measured, three between two and four (TN 2360 p. 10: the increment
 *   grows with count, less than in proportion);
 * - the position: between the two stations of TN 2360 fig. 6 that bracket
 *   x/c, each member's own (M 1.5 to 2.0 only);
 * - sweep: only where measured, the leading edge swept 45 to 60 deg (RM
 *   L52J21a's 45 deg fins, fig. 38; the RM-10's 60 deg, TN 3819 fig. 34)
 *   and the trailing edge no more, a sharp section's trailing edge swept
 *   aft only as far ahead of the base as RM L52J21a's fins (0.9 root
 *   chords or more; closer, refused, since the RM-10's trailing-edge sweep
 *   is not stated and linear theory raises the pressures behind a swept
 *   edge; swept forward, refused, since RM L52J21a's is swept aft):
 *   between the zero member and the
 *   unswept member that dominates the section, since both measured swept
 *   sets lie there, below the unswept member at their Mach numbers (and
 *   TN 3819 p. 22). Leading edges swept 0 to 45 deg with an unswept
 *   trailing edge, at M 2.0 to 3.0, take the same bracket (W1b, 0015
 *   section 3.4): NSWCDD/TR-92/509's 43.9 deg fins with unswept trailing
 *   edges lie inside it, and with the trailing edge unswept linear theory
 *   moves the aft faces' pressures by at most 4% with the leading-edge
 *   sweep there. Other sweeps between 0 and 45 deg, and those at M 1.5 to
 *   2.0, are refused: for supersonic edges linear theory gives larger
 *   surface pressures with sweep at a fixed streamwise section, and no
 *   measurement shows the ordering there.
 *
 * Below M 1.5 (W2's part, 0015 section 11), at M 1.0 to 1.5: the reference
 * is fig. 35's free-flight curve (two readings from M 1.0) with the largest
 * tunnel excess carried, the zero member reaches down to RM L52E06's
 * relief with flat plates (the lowest relief measured at or below M 1.5),
 * no ratio member and no position ahead of the base is measured, and
 * swept fins are served only with flat faces swept 45 to 60 deg (RM
 * L52E06's plates are swept 45 deg; 0014 section 10.7 (z), the note of
 * 2026-10-27). Fins ending ahead of the base are refused there: no
 * measurement with fins ahead of the base below M 1.5 is known (0015
 * section 3.3; 0014 section 10.7 (ad), narrowed after the independent
 * review of 2026-10-26, which withdrew a bound built on carries).
 *
 * Positions ahead of the base (0 < x/c < 1) are served at M 1.5 to 2.0
 * only, and only with TN 2360's geometry, a root chord of 1.5 body
 * diameters within 0.5% (W1_POSITION_CHORD_OVER_DIAMETER): where the fins'
 * field still reaches the base depends on the chord against the body, and
 * no other chord is measured.
 *
 * Fins with flat faces at a square trailing edge (flat plates), the
 * trailing edge unswept, are served at every leading-edge sweep from M
 * 1.62, and below it unswept or swept 45 to 60 deg (0015 section 12,
 * 2026-10-26: neither bound below uses the leading edge; narrowed on
 * 2026-10-27, flatPlateSweepNarrowing); with the trailing edge swept, at
 * the sweeps above. They are "bounded, not measured" (0014 section
 * 10.2): between the lowest relief
 * measured with such fins at the base (RM L52E06 fig. 7, M 1.06 to 1.10:
 * W1_FLAT_RELIEF_LOW) and the unswept circular-arc member at least as
 * thick, the ordering argued in 0015 section 4 from TN 2360 (the increment
 * follows the slope of the faces near the trailing edge, zero on a flat
 * face; "a blunt-trailing-edge section" among "the most favorable", p. 11)
 * and RM L52E06 (relief, where circular-arc fins at the same Mach number
 * raise the base drag by half). The band is the whole gap.
 *
 * Where a member is not measured at the case's Mach number, the bracket
 * widens to the next member outward (t/c 0.05 to 0.10 above, to the zero
 * member below; two fins to zero). The band is the envelope of the lower
 * and upper members' bands; the nominal its midpoint (0008 section 6.3).
 *
 * Refused, each with its reason: fewer than two or more than four fins;
 * rounded, diverging (thickest at the edge) and converging blunt trailing
 * edges; sections not dominated by the 10% circular arc; sweeps other than
 * those measured; Mach numbers outside 1.0 to 3.0; fins ending ahead of the
 * base below M 1.5 or above 2.0, or with a root chord other than TN 2360's
 * (nearBasePositionReasons).
 */

import { compiledCurveValue } from './compiled-curve';
import {
  L52E06_FIG7,
  L52J21A_FIG31_33D,
  L52J21A_FIG38C,
  L52J21A_FIG8,
  L52J21A_FIG8_NOSE_CALLS,
  NSWC_TR92_509_TABLE2,
  TN2360_FIG6,
  TN3819_FIG33,
  TN3819_FIG35_TUNNEL_W1,
  W1_FIG35_LINE,
  type Tn2360Fig6Point,
} from './fins-on-base-w1-data';
import { BaseRefusal } from './refusal';
import { FIG35_FREE_FLIGHT_END, FIG35_IDENTITY_SWAP, TN3819_FIG35_TUNNEL } from './tn3819-fig35';
import type { SymmetricSection } from '../fins/section';

/** The Mach numbers the rebuilt factor serves from its tunnel members up (W1). */
export const W1_MACH_RANGE = [1.5, 3.0] as const;
/**
 * Below W1_MACH_RANGE: fins at the base from M 1.0 (W2's part), where fig. 35's identified free-flight curve
 * starts and is read twice (the owner's decision of 2026-10-21: serve wherever the result is accurate, with
 * its band; 0015 section 11.2).
 */
export const W1_LOW_MACH = 1.0;
/**
 * Moderate sweeps (W1b): the leading edge swept up to 45 deg with the trailing edge unswept, served at M 2.0 to
 * 3.0 between the zero member and the unswept member (NSWCDD/TR-92/509; 0015 section 3.4).
 */
export const W1_MODERATE_SWEEP = {
  leadingEdge: (45 * Math.PI) / 180,
  mach: [2.0, 3.0],
} as const;
/** TN 2360's two Mach numbers: the only ones where t/c 0.05, two fins and x/c > 0 are measured. */
export const W1_TUNNEL_MACHS = [1.5, 2.0] as const;
/** The measured thickness ratios (circular arcs) and counts. */
export const W1_THICKNESSES = [0.05, 0.1] as const;
/** TN 2360 fig. 6's stations, x/c (trailing edge ahead of the base, in chords). */
export const W1_STATIONS = [0, 0.2, 0.4, 0.6, 0.8, 1.0] as const;
/**
 * TN 2360's geometry, the one on which positions ahead of the base are measured: a tail chord of 1.875 in on a
 * 1.250 in body (its fig. 2), a root chord of 1.5 body diameters. In its superposition model (pp. 6 and 7, fig. 4)
 * the fins' field reaches the dead-air region along isobars at the Mach angle, so where fins ahead of the base still
 * reach it depends on the body radius times beta against the chord; no other chord is measured, so positions ahead
 * of the base are served only with this one (0015 section 3.3; 0014 section 10.7 (ad), the review of 2026-10-26).
 */
export const W1_POSITION_CHORD_OVER_DIAMETER = 1.875 / 1.25;
/**
 * How close the root chord over the body diameter must be to TN 2360's: 0.5%. Not 0011 section 3's typing
 * tolerance, which 0011 keeps for the Basic Finner's own inputs: 0.5% of the 1.5-diameter chord is 0.0075
 * diameters, and it moves a position given in chords by at most 0.005 chords (at x/c 1.0), a fortieth of the
 * 0.2 chords between TN 2360's stations, across which the bracket already runs (0015 section 3.3, the note of
 * 2026-10-28).
 */
export const W1_POSITION_CHORD_TOLERANCE = 0.005;

/**
 * Why fins ending x/c root chords ahead of the base (x/c > 0) are refused at M, each reason in plain words, or
 * none where TN 2360's measured positions cover them: M 1.5 to 2.0 and its root chord of 1.5 body diameters
 * (0015 section 3.3; 0014 section 10.7 (ad), narrowed after the review of 2026-10-26).
 */
export function nearBasePositionReasons(
  mach: number,
  xc: number,
  rootChordOverDiameter: number | undefined,
): string[] {
  if (!(xc > 0)) return [];
  const out: string[] = [];
  if (mach < W1_TUNNEL_MACHS[0] - 1e-12) {
    out.push(
      `below Mach ${W1_TUNNEL_MACHS[0]} no measurement with fins ahead of the base is known (TN 2360 ` +
        `measures them at Mach ${W1_TUNNEL_MACHS[0]} and ${W1_TUNNEL_MACHS[1].toFixed(1)} only), and TN ` +
        "2360's own account says the fins' pressures grow as the Mach number falls (p. 7) while its " +
        'measured relief moves toward the base, so nothing there says how these fins act on the base ' +
        'until such a measurement is found',
    );
  } else if (mach > W1_TUNNEL_MACHS[1] + 1e-12) {
    out.push(
      `above Mach ${W1_TUNNEL_MACHS[1].toFixed(1)} no measurement with fins ahead of the base is settled ` +
        `(TN 2360 measures them at Mach ${W1_TUNNEL_MACHS[0]} and ${W1_TUNNEL_MACHS[1].toFixed(1)} only; ` +
        "TN 3819 fig. 32's, at Mach 2.41, is read three times but no method using it is written yet, so " +
        "it sets nothing), and TN 2360 finds the fins' effect reaching the base from farther ahead as the " +
        'Mach number rises, so its positions are not carried up',
    );
  }
  const c = rootChordOverDiameter;
  if (c === undefined || !Number.isFinite(c)) {
    out.push(
      "the fins' root chord over the body diameter, which decides how far ahead fins still reach the " +
        'base, is not given',
    );
  } else if (
    Math.abs(c / W1_POSITION_CHORD_OVER_DIAMETER - 1) >
    W1_POSITION_CHORD_TOLERANCE + 1e-12
  ) {
    out.push(
      `the fins' root chord is ${c.toFixed(2)} body diameters, and TN 2360 measures fins ahead of the ` +
        `base only with a root chord of ${W1_POSITION_CHORD_OVER_DIAMETER} body diameters: how far ahead ` +
        'fins still reach the base depends on the chord against the size of the body, and no other ' +
        'chord is measured',
    );
  }
  return out;
}

/**
 * The refusal of fins ending ahead of the base where TN 2360 measured no position (0015 section 3.3), every
 * reason named, or undefined where it did; `note` is added to the message (src/base/base-drag.ts names a
 * trailing edge refused there too, so that the words lead to one that is served).
 */
export function nearBasePositionRefusal(
  mach: number,
  xc: number,
  rootChordOverDiameter: number | undefined,
  note = '',
): BaseRefusal | undefined {
  const reasons = nearBasePositionReasons(mach, xc, rootChordOverDiameter);
  if (reasons.length === 0) return undefined;
  return new BaseRefusal(
    'fins-near-base',
    `fins ending ${Number(xc.toPrecision(3))} root chords ahead of the base at Mach ${mach}: ` +
      `${reasons.join('; and ')} (0015 section 3.3)${note}`,
  );
}

export type Thickness = 0 | 0.05 | 0.1;
export type Count = 0 | 2 | 4;

export interface Band {
  readonly low: number;
  readonly high: number;
}

/** Linear interpolation on ascending points (by mach), or undefined outside them. */
function interp<T extends { mach: number }>(
  pts: readonly T[],
  mach: number,
  f: (p: T) => number,
): { value: number; a: T; b: T } | undefined {
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k]!;
    if (Math.abs(p.mach - mach) <= 1e-12) return { value: f(p), a: p, b: p };
    const q = pts[k + 1];
    if (q !== undefined && mach > p.mach && mach < q.mach) {
      const t = (mach - p.mach) / (q.mach - p.mach);
      return { value: f(p) + t * (f(q) - f(p)), a: p, b: q };
    }
  }
  return undefined;
}

// ------------------------------------------------------------ the zero member

/**
 * The largest relief measured at M 1.5 or above with fins near the base and
 * a turbulent layer: RM L52J21a fig. 38(c)'s most positive dPb at each Mach
 * number (both bases, which the scan cannot separate, so the cylindrical
 * base's relief is at most this), over fig. 8's least negative cylindrical
 * base P_B, each with its reading error toward more relief.
 */
export function reliefFactors(): { mach: number; factor: number }[] {
  return L52J21A_FIG38C.map((p) => {
    const cyl = L52J21A_FIG8.filter(
      (q) => q.base === 'cylindrical' && Math.abs(q.mach - p.mach) < 1e-9,
    );
    const finned = Math.min(...cyl.map((q) => Math.abs(q.leastNegative) - q.error));
    const relief = Math.max(0, p.mostPositive + p.error);
    return { mach: p.mach, factor: finned / (finned + relief) };
  });
}

/** Fig. 38(c)'s least relief factor (0.9504), read once; the zero member's low end is the lesser of it and the nose-paired one. */
export const W1_RELIEF_LOW_FIG38C = Math.min(...reliefFactors().map((r) => r.factor));

/**
 * The relief by nose: fig. 8's finned symbol of each nose (each reader's call, but those left out on
 * pairing) over figs. 31 to 33 (d)'s unfinned symbols of the same nose near R 8.06e6 (both readings), each
 * moved by its error toward more relief. `confirmed` is whether another reading calls a symbol of that
 * nose within the two errors.
 */
export function noseCallReliefFactors(): {
  mach: number;
  nose: string;
  callReading: string;
  confirmed: boolean;
  factor: number;
}[] {
  const out: {
    mach: number;
    nose: string;
    callReading: string;
    confirmed: boolean;
    factor: number;
  }[] = [];
  const used = L52J21A_FIG8_NOSE_CALLS.filter((c) => c.leftOut === undefined);
  for (const c of used) {
    const confirmed = used.some(
      (d) =>
        d.reading !== c.reading &&
        d.mach === c.mach &&
        d.nose === c.nose &&
        Math.abs(d.pB - c.pB) <= d.error + c.error,
    );
    for (const u of L52J21A_FIG31_33D) {
      if (u.mach !== c.mach || u.nose !== c.nose) continue;
      out.push({
        mach: c.mach,
        nose: c.nose,
        callReading: c.reading,
        confirmed,
        factor: (Math.abs(c.pB) - c.error) / (Math.abs(u.pB) + u.error),
      });
    }
  }
  return out;
}

const LEAST_BY_CALL = noseCallReliefFactors().reduce((a, b) => (b.factor < a.factor ? b : a));

/**
 * The zero member's low end, carried to every Mach number from 1.5: the most relief the evidence allows,
 * fig. 38(c)'s or the nose-paired one's (0015 section 3.5).
 */
export const W1_RELIEF_LOW = Math.min(W1_RELIEF_LOW_FIG38C, LEAST_BY_CALL.factor);

/** Whether that low end rests on a nose call that no second reader has confirmed (the second call pending). */
export const W1_RELIEF_ON_ONE_CALL =
  LEAST_BY_CALL.factor < W1_RELIEF_LOW_FIG38C && !LEAST_BY_CALL.confirmed;

/**
 * The calls used that one reader alone has made (Mach number and nose): while any remains, a second
 * reading of it could lower the member, and results using it carry `secondReadingPending`.
 */
export const W1_RELIEF_SINGLE_CALLS: readonly string[] = [
  ...new Set(
    noseCallReliefFactors()
      .filter((r) => !r.confirmed)
      .map((r) => `the ${r.nose} nose at M ${r.mach}`),
  ),
];
export const ZERO_MEMBER: Band = { low: W1_RELIEF_LOW, high: 1 };

/** Whether the zero member from M 1.5 still waits on a second reading (a call one reader alone has made). */
export const W1_ZERO_MEMBER_PENDING = W1_RELIEF_ON_ONE_CALL || W1_RELIEF_SINGLE_CALLS.length > 0;

// ------------------------------------------------------ the reference member

interface FreeFlight {
  readonly reading: string;
  readonly factor: number;
  readonly error: number;
  readonly extrapolated: boolean;
}

/** Every reading of fig. 35's free-flight line at M, as a factor on Love's basic curve. */
export function freeFlightFactors(mach: number): FreeFlight[] {
  const noFins = Math.abs(compiledCurveValue(mach, 'lessNegative'));
  const out: FreeFlight[] = [];
  for (const r of W1_FIG35_LINE) {
    const v = interp(r.points, mach, (p) => p.pB);
    if (v === undefined) continue;
    let error = Math.max(v.a.error, v.b.error);
    if (mach >= FIG35_IDENTITY_SWAP.from && mach <= FIG35_IDENTITY_SWAP.to) {
      error = Math.max(error, FIG35_IDENTITY_SWAP.error);
    }
    const ext = (p: object) => 'extrapolated' in p && p.extrapolated === true;
    out.push({
      reading: r.reading,
      factor: Math.abs(v.value) / noFins,
      error: error / noFins,
      extrapolated: ext(v.a) || ext(v.b),
    });
  }
  return out;
}

/** The tunnel factors of four t/c 0.10 fins at x/c = 0, each reading with its error, at M 1.50, 2.00, 2.41. */
export function tunnelReferenceFactors(): { mach: number; source: string; factor: number }[] {
  const out: { mach: number; source: string; factor: number }[] = [];
  const ratioHigh = (fins: number, eFins: number, none: number, eNone: number) =>
    (Math.abs(fins) + eFins) / (Math.abs(none) - eNone);
  for (const p of TN3819_FIG35_TUNNEL) {
    // Reading errors of the pairs: +-0.001 (first), +-0.0009 at most (round 3).
    const e = 0.001;
    out.push({
      mach: p.mach,
      source: `TN 3819 fig. 35 pair (${p.source}, ${p.reading})`,
      factor: ratioHigh(p.withFins, e, p.withoutFins, e),
    });
  }
  for (const p of TN3819_FIG35_TUNNEL_W1) {
    out.push({
      mach: p.mach,
      source: `TN 3819 fig. 35 pair (${p.source}, ${p.reading})`,
      factor: ratioHigh(p.withFins, p.error, p.withoutFins, p.error),
    });
  }
  for (const m of [1.5, 2.0, 2.41]) {
    const at = TN3819_FIG33.filter((q) => Math.abs(q.mach - m) < 1e-9);
    const nones = at.filter((q) => q.thicknessRatio === 0);
    // Each reading's t/c 0.10 point over the same reading's body alone.
    for (const none of nones) {
      const ten = at.find((q) => q.thicknessRatio === 0.1 && q.reading === none.reading);
      if (ten === undefined) continue;
      out.push({
        mach: m,
        source: `TN 3819 fig. 33 (${ten.reading})`,
        factor: ratioHigh(ten.pB, ten.error, none.pB, none.error),
      });
    }
    // TN 2360 fig. 6's runs over every reading of fig. 33's body alone.
    for (const q of TN2360_FIG6) {
      if (q.mach !== m || q.count !== 4 || q.thicknessRatio !== 0.1 || q.xc !== 0) continue;
      for (const none of nones) {
        out.push({
          mach: m,
          source: `TN 2360 fig. 6 (${q.reading}) over fig. 33's body alone (${none.reading})`,
          factor: 1 + (Math.abs(q.dPb) + q.error) / (Math.abs(none.pB) - none.error),
        });
      }
    }
  }
  return out;
}

const TUNNEL_MACHS_REF = [1.5, 2.0, 2.41] as const;

function tunnelMax(): { mach: number; factor: number }[] {
  const all = tunnelReferenceFactors();
  return TUNNEL_MACHS_REF.map((m) => ({
    mach: m,
    factor: Math.max(...all.filter((t) => Math.abs(t.mach - m) < 1e-9).map((t) => t.factor)),
  }));
}

/** The tunnel's largest excess over the free-flight line (its least reading) at a tunnel Mach number. */
export function largestTunnelExcess(): number {
  return Math.max(
    ...tunnelMax().map(
      (t) => t.factor - Math.min(...freeFlightFactors(t.mach).map((f) => f.factor)),
    ),
  );
}
const EXCESS = largestTunnelExcess();

export interface ReferenceBand extends Band {
  readonly freeFlight: readonly FreeFlight[];
  /** The tunnel factor at M (interpolated), where the tunnels reach (M 2.41 at most). */
  readonly tunnel: number | undefined;
  /** Beyond M 2.41: the free-flight factor plus the largest tunnel excess. */
  readonly carried: number | undefined;
  /**
   * Above the free-flight curve's end (M 2.56, 0010 section 11): bounded, not measured, from the zero member's
   * low end to the member's high end at M 2.56; its band the whole gap.
   */
  readonly bounded: boolean;
}

/** Four fins t/c 0.10 at x/c = 0: the reference member, measured at M 1.0 to 2.56, bounded to 3.0. */
export function referenceBand(mach: number): ReferenceBand {
  if (mach > FIG35_FREE_FLIGHT_END + 1e-12) {
    const end = referenceBand(FIG35_FREE_FLIGHT_END);
    return {
      low: W1_RELIEF_LOW,
      high: end.high,
      freeFlight: [],
      tunnel: undefined,
      carried: undefined,
      bounded: true,
    };
  }
  const ff = freeFlightFactors(mach);
  if (ff.length === 0) throw new RangeError(`no reading of fig. 35's line at M ${mach}`);
  const t = interp(tunnelMax(), mach, (p) => p.factor);
  const maxFf = Math.max(...ff.map((f) => f.factor));
  // Beyond the tunnels' Mach numbers on either side (above M 2.41, and below 1.5: W2's part) the excess is carried.
  const carried = mach > 2.41 + 1e-12 || mach < 1.5 - 1e-12 ? maxFf + EXCESS : undefined;
  return {
    low: Math.min(...ff.map((f) => f.factor - f.error)),
    high: Math.max(
      ...ff.map((f) => f.factor + f.error),
      t?.value ?? -Infinity,
      carried ?? -Infinity,
    ),
    freeFlight: ff,
    tunnel: t?.value,
    carried,
    bounded: false,
  };
}

// --------------------------------------------------------- the ratio members

/**
 * The range of a member's increment over the reference's, in TN 2360's
 * tunnel at one of its Mach numbers: every reading and run of the member
 * against every one of the reference (fig. 6 at x/c = 0, four fins, t/c
 * 0.10, and fig. 33), each end moved by its reading error so as to widen
 * the range. Undefined if the member was not measured there.
 */
export function memberRatio(
  thickness: 0.05 | 0.1,
  count: 2 | 4,
  station: number,
  tunnelMach: 1.5 | 2.0,
  withoutSingleReader = false,
): Band | undefined {
  const sel = (p: Tn2360Fig6Point, t: number, n: number, s: number) =>
    p.mach === tunnelMach &&
    p.thicknessRatio === t &&
    p.count === n &&
    Math.abs(p.xc - s) < 1e-9 &&
    !(withoutSingleReader && p.singleReader === true);
  const val = (dPb: number, e: number) => ({ lo: dPb - e, hi: dPb + e });
  const members = TN2360_FIG6.filter((p) => sel(p, thickness, count, station)).map((p) =>
    val(p.dPb, p.error),
  );
  const refs = TN2360_FIG6.filter((p) => sel(p, 0.1, 4, 0)).map((p) => val(p.dPb, p.error));
  const at33 = TN3819_FIG33.filter((q) => Math.abs(q.mach - tunnelMach) < 1e-9);
  // Fig. 33's increments, each reading's points against the same reading's body alone.
  for (const p0 of at33.filter((q) => q.thicknessRatio === 0)) {
    const same = at33.filter((q) => q.reading === p0.reading);
    const p10 = same.find((q) => q.thicknessRatio === 0.1);
    const p5 = same.find((q) => q.thicknessRatio === 0.05);
    if (p10 !== undefined) refs.push(val(p10.pB - p0.pB, p10.error + p0.error));
    if (thickness === 0.05 && count === 4 && station === 0 && p5 !== undefined) {
      members.push(val(p5.pB - p0.pB, p5.error + p0.error));
    }
  }
  if (members.length === 0 || refs.length === 0) return undefined;
  const ratios: number[] = [];
  for (const m of members) {
    for (const r of refs) {
      // The reference increment is negative (more suction) by a margin; the member's may have either sign.
      for (const a of [m.lo, m.hi]) for (const b of [r.lo, r.hi]) ratios.push(a / b);
    }
  }
  return { low: Math.min(...ratios), high: Math.max(...ratios) };
}

function ratioAt(
  thickness: 0.05 | 0.1,
  count: 2 | 4,
  station: number,
  mach: number,
  withoutSingleReader = false,
): Band | undefined {
  const [m0, m1] = W1_TUNNEL_MACHS;
  const r0 = memberRatio(thickness, count, station, m0, withoutSingleReader);
  const r1 = memberRatio(thickness, count, station, m1, withoutSingleReader);
  if (Math.abs(mach - m0) < 1e-12) return r0;
  if (Math.abs(mach - m1) < 1e-12) return r1;
  if (r0 === undefined || r1 === undefined || !(mach > m0 && mach < m1)) return undefined;
  // Between the two Mach numbers, the envelope of both ranges: no assumption on how the ratio varies.
  return { low: Math.min(r0.low, r1.low), high: Math.max(r0.high, r1.high) };
}

/** The stations of TN 2360 fig. 6 at which a member is measured at this Mach number. */
function stationsOf(thickness: 0.05 | 0.1, count: 2 | 4, mach: number): number[] {
  return W1_STATIONS.filter((s) =>
    thickness === 0.1 && count === 4 && s === 0
      ? true
      : ratioAt(thickness, count, s, mach) !== undefined,
  );
}

/**
 * A member's band at M and x/c: the envelope over the two of its stations
 * that bracket x/c; undefined where it is not measured.
 */
export function memberBand(
  thickness: Thickness,
  count: Count,
  xc: number,
  mach: number,
): Band | undefined {
  if (!(mach >= W1_LOW_MACH - 1e-12 && mach <= W1_MACH_RANGE[1] + 1e-12)) return undefined;
  if (thickness === 0 || count === 0) return zeroMember(mach);
  const ref = referenceBand(mach);
  if (thickness === 0.1 && count === 4 && xc === 0) return { low: ref.low, high: ref.high };
  const st = stationsOf(thickness, count, mach);
  const below = st.filter((s) => s <= xc + 1e-12);
  const above = st.filter((s) => s >= xc - 1e-12);
  if (below.length === 0 || above.length === 0) return undefined;
  const used = [...new Set([Math.max(...below), Math.min(...above)])];
  let low = Infinity;
  let high = -Infinity;
  const L = ref.low - 1;
  const H = ref.high - 1;
  for (const s of used) {
    let b: Band;
    if (thickness === 0.1 && count === 4 && s === 0) {
      b = { low: L, high: H };
    } else {
      const r = ratioAt(thickness, count, s, mach);
      if (r === undefined) return undefined;
      const p = [r.low * L, r.low * H, r.high * L, r.high * H];
      b = { low: Math.min(...p), high: Math.max(...p) };
    }
    low = Math.min(low, 1 + b.low);
    high = Math.max(high, 1 + b.high);
  }
  return { low, high };
}

/**
 * Whether an end of a member's band at M and x/c rests on a symbol of TN 2360 fig. 6 that one reader alone
 * found (`singleReader`, 0015 section 7): the band's ratio range at a station it uses moves when those
 * symbols are left out. Such a result carries `secondReadingPending`.
 */
export function memberEndOnSingleReader(
  thickness: Thickness,
  count: Count,
  xc: number,
  mach: number,
): boolean {
  if (thickness === 0 || count === 0) return false;
  const st = stationsOf(thickness, count, mach);
  const below = st.filter((x) => x <= xc + 1e-12);
  const above = st.filter((x) => x >= xc - 1e-12);
  if (below.length === 0 || above.length === 0) return false;
  for (const station of new Set([Math.max(...below), Math.min(...above)])) {
    if (thickness === 0.1 && count === 4 && station === 0) continue;
    const all = ratioAt(thickness, count, station, mach);
    const kept = ratioAt(thickness, count, station, mach, true);
    if (all === undefined) continue;
    if (
      kept === undefined ||
      Math.abs(all.low - kept.low) > 1e-12 ||
      Math.abs(all.high - kept.high) > 1e-12
    ) {
      return true;
    }
  }
  return false;
}

// ----------------------------------------------------------- the case's bracket

/**
 * The circular arcs between which a symmetric section lies, by its
 * half-thickness at every station (chord units): tauLow the thickest arc it
 * dominates, tauEq the thinnest that dominates it, the arcs taken as
 * 2 tau s (1 - s). Only for sections with a sharp trailing edge.
 */
export function sectionBracket(section: SymmetricSection): { tauLow: number; tauEq: number } {
  const { x, halfThickness: h } = section;
  let lo = Infinity;
  let hi = 0;
  const n = 4000;
  for (let k = 1; k < n; k++) {
    const s = k / n;
    let j = 0;
    while (j + 2 < x.length && s > x[j + 1]!) j++;
    const hs = h[j]! + ((h[j + 1]! - h[j]!) * (s - x[j]!)) / (x[j + 1]! - x[j]!);
    const r = hs / (2 * s * (1 - s));
    lo = Math.min(lo, r);
    hi = Math.max(hi, r);
  }
  // The limits at the edges: the half-slopes there.
  const slopeLe = (h[1]! - h[0]!) / (x[1]! - x[0]!);
  const m = x.length - 1;
  const slopeTe = (h[m - 1]! - h[m]!) / (x[m]! - x[m - 1]!);
  lo = Math.min(lo, slopeLe / 2, slopeTe / 2);
  hi = Math.max(hi, slopeLe / 2, slopeTe / 2);
  return { tauLow: lo, tauEq: hi };
}

export type TrailingEdgeShape = 'sharp' | 'flat' | 'diverging' | 'converging-blunt';

/** The trailing edge of a symmetric section: sharp, or blunt with flat, diverging or converging faces. */
export function trailingEdgeShape(section: SymmetricSection): TrailingEdgeShape {
  const h = section.halfThickness;
  const m = h.length - 1;
  if (section.bluntTrailingEdge !== true) return 'sharp';
  const d = h[m]! - h[m - 1]!;
  if (Math.abs(d) <= 1e-12 * Math.max(1, Math.abs(h[m]!))) return 'flat';
  return d > 0 ? 'diverging' : 'converging-blunt';
}

/** The fins, as the rebuilt factor needs them. */
export interface FinsNearBase {
  readonly count: number;
  /** The section in chord units (src/fins); with spanSections, its thickest station (largest t/c). */
  readonly section: SymmetricSection;
  /**
   * The section at other spanwise stations, in their own chord units, where it changes along the span (a
   * plate of one thickness on a tapered planform: `section` at the tip, the largest t/c, and the root here,
   * the smallest). The bracket must hold at every station, since the measured fins are rectangular with one
   * section and do not say which station sets the factor: the upper member dominates the thickest station
   * (tauEq the largest over all) and the lower member is dominated by the thinnest (tauLow the least over
   * all). A thinner station needs no range of its own: the zero member lies below any section (0015 section
   * 3.6). Every station must have the same trailing-edge shape.
   */
  readonly spanSections?: readonly SymmetricSection[];
  /** 'circular-arc' when the section is one (its own member); else bracketed. */
  readonly sectionFamily: 'circular-arc' | 'other';
  /** Tangents of the leading- and trailing-edge sweep angles. */
  readonly tanLeadingEdgeSweep: number;
  readonly tanTrailingEdgeSweep: number;
  /** The root trailing edge ahead of the base, in root chords: 0 at the base, up to 1. */
  readonly trailingEdgeAheadOfBase: number;
  /**
   * The root chord over the body diameter. Needed for fins ending ahead of the base, which are served only with
   * TN 2360's 1.5 (W1_POSITION_CHORD_OVER_DIAMETER); without it such fins are refused.
   */
  readonly rootChordOverDiameter?: number;
}

export interface MemberUsed {
  readonly thickness: Thickness;
  readonly count: Count;
  readonly band: Band;
  /** What the member is, for the label. */
  readonly name: string;
}

export interface FinsOnBaseFactorW1 {
  readonly mach: number;
  readonly nominal: number;
  readonly low: number;
  readonly high: number;
  readonly label: string;
  /** True unless the case is a member itself (circular arcs, unswept, measured count and station). */
  readonly analogy: boolean;
  /**
   * "Bounded, not measured" (0014 section 10.2): fins with flat faces at a square trailing edge, between
   * the lowest relief measured with such fins (RM L52E06) and the circular-arc member at least as thick;
   * and every case above M 2.56, where the reference member is bounded (ReferenceBand.bounded).
   */
  readonly bounded: boolean;
  /** Fewer than two readings of fig. 35's line at M, not counting extrapolations. */
  readonly singleReading: boolean;
  /** The reference rests on an extrapolated value at M (M above 2.99). */
  readonly extrapolated: boolean;
  /** Always false: kept for the shape of ./fins-on-base.ts's factor. */
  readonly atRangeEnd: false;
  readonly lower: MemberUsed;
  readonly upper: MemberUsed;
  /** The section's bracket (circular arcs: tauLow = tauEq = t/c; flat faces: tauEq = t/c). */
  readonly tauLow: number;
  readonly tauEq: number;
  readonly swept: boolean;
  /**
   * Flat-faced fins with the trailing edge unswept, served at a leading-edge sweep at which no flat plate is
   * measured at the base: unswept (0015 section 4, 0014 section 10.7 (i)), or swept short of 45 deg or beyond 60
   * deg (section 12), outside the 45 to 60 deg that RM L52E06's plates and the RM-10 bracket. Their bracket rests on
   * the argument that neither bound uses the leading edge; the total's claim names it (src/app/total-drag.ts).
   */
  readonly sweepByArgument: boolean;
  /**
   * A band-setting input of this result has one reading: the zero member from M 1.5 while any nose call of
   * RM L52J21a fig. 8 it uses has one reader (W1_RELIEF_SINGLE_CALLS; 0015 sections 3.5, 7), or a moderate
   * sweep's ordering (NSWCDD/TR-92/509 Table 2, its blind second transcription requested).
   */
  readonly secondReadingPending: boolean;
}

/**
 * The swept fins measured at the base (leading-edge sweep): RM L52J21a's 45 deg (fig. 38) and the RM-10's
 * 60 deg (TN 3819 fig. 34). Below 45 deg only W1_MODERATE_SWEEP is served (0015 section 3.4).
 */
export const W1_SWEPT_RANGE = [(45 * Math.PI) / 180, (60 * Math.PI) / 180] as const;

/**
 * Where fins of a sharp section with a swept trailing edge are measured near the base: RM L52J21a's 45 deg
 * fins, the trailing edge swept aft and the root trailing edge about 0.9 in ahead of the base on a streamwise
 * chord of 0.75 in / cos 45 deg = 1.06 in, so 0.85 +-0.05 root chords (its figs. 1 and 5, read from the
 * drawings to +-0.05 in). Served only where the measurement covers it, from the uncertainty's far end: 0.9
 * root chords. Closer to the base such fins are refused, and so is a forward-swept trailing edge anywhere,
 * RM L52J21a's being the one set (the RM-10's trailing-edge sweep is not stated; 0015 section 3.4).
 */
export const W1_SWEPT_TRAILING_EDGE_AHEAD = 0.9;

/**
 * The lowest relief measured with fins at the base: RM L52E06 fig. 7, four flat-plate fins with square
 * trailing edges, M 1.06 to 1.10, the rim and centre pressures with and without fins, each with its
 * reading error toward more relief. The lower bound of the bounded value for flat-faced fins.
 */
export function flatPlateReliefs(): { mach: number; where: 'rim' | 'centre'; factor: number }[] {
  const out: { mach: number; where: 'rim' | 'centre'; factor: number }[] = [];
  for (const p of L52E06_FIG7) {
    const f = (fins: number, none: number) =>
      (Math.abs(fins) - p.error) / (Math.abs(none) + p.error);
    out.push({ mach: p.mach, where: 'rim', factor: f(p.rimFins, p.rimNoFins) });
    if (p.centreFins !== undefined && p.centreNoFins !== undefined) {
      out.push({ mach: p.mach, where: 'centre', factor: f(p.centreFins, p.centreNoFins) });
    }
  }
  return out;
}
export const W1_FLAT_RELIEF_LOW = Math.min(...flatPlateReliefs().map((r) => r.factor));

/**
 * The lowest Mach number at which RM L52J21a measures the relief (fig. 38(c), figs. 8 and 31 to 33): M 1.62.
 * Below it the zero member keeps RM L52E06's lower relief (W1_FLAT_RELIEF_LOW), the safe side, since no relief
 * is measured between M 1.10 and 1.62.
 */
export const W1_RELIEF_MEASURED_FROM = Math.min(...L52J21A_FIG38C.map((p) => p.mach));

/**
 * A phrase only the refusal of flat-faced fins swept more than 0 and under 45 deg below M 1.62 carries (the
 * ruling of 2026-10-27, 0014 section 10.7 (z)); the page's words for it key on this.
 */
export const W1_FLAT_UNDER_45_MARK = 'more than 0 and under 45 deg, below M 1.62';

/**
 * A phrase only the refusal of flat-faced fins swept beyond 60 deg below M 1.62 carries (the second ruling of
 * 2026-10-27, 0014 section 10.7 (z)); the page's words for it key on this.
 */
export const W1_FLAT_BEYOND_60_MARK = 'beyond 60 deg, below M 1.62';

/**
 * The zero member at M: from M 1.62 down to RM L52J21a's relief (W1_RELIEF_LOW), measured at 1.62 to 2.41 and
 * carried to 3.0; below 1.62 down to RM L52E06's relief with flat plates at the base (W1_FLAT_RELIEF_LOW),
 * measured at M 1.05 to 1.10 and carried over 1.0 to 1.62.
 */
export function zeroMember(mach: number): Band {
  return mach < W1_RELIEF_MEASURED_FROM - 1e-12
    ? { low: W1_FLAT_RELIEF_LOW, high: 1 }
    : ZERO_MEMBER;
}

/**
 * NSWCDD/TR-92/509's factors (fins over body alone, alpha 0, fins at the base, 43.9 deg leading edge, trailing
 * edge unswept), each C_DB moved by its +-5% toward the ends: checks of the moderate-sweep bracket (W1b), not
 * members.
 */
export function nswcFactors(): {
  mach: number;
  thicknessRatio: number;
  factor: number;
  low: number;
  high: number;
}[] {
  const body = NSWC_TR92_509_TABLE2.filter((p) => p.config === 1);
  return NSWC_TR92_509_TABLE2.filter((p) => p.config !== 1).map((p) => {
    const b = body.find((q) => q.mach === p.mach && q.reading === p.reading)!;
    return {
      mach: p.mach,
      thicknessRatio: p.thicknessRatio,
      factor: p.cdb / b.cdb,
      low: (p.cdb * (1 - p.relativeError)) / (b.cdb * (1 + b.relativeError)),
      high: (p.cdb * (1 + p.relativeError)) / (b.cdb * (1 - b.relativeError)),
    };
  });
}

const zeroName = (mach: number) =>
  mach < W1_RELIEF_MEASURED_FROM - 1e-12
    ? `no fins or fins without a pressure field (F 1 down to ${W1_FLAT_RELIEF_LOW.toFixed(3)}, ` +
      'RM L52E06 fig. 7, measured with flat plates at M 1.05 to 1.10 and carried to 1.0 and up to ' +
      `${W1_RELIEF_MEASURED_FROM}, where RM L52J21a's measurements begin)`
    : W1_RELIEF_ON_ONE_CALL
      ? `no fins or fins without a pressure field (F 1 down to ${W1_RELIEF_LOW.toFixed(3)}, the most ` +
        `relief RM L52J21a allows: its fig. 8 over figs. 31 to 33 at M ${LEAST_BY_CALL.mach}, resting on ` +
        "one reader's calls of which nose each symbol is, the second call pending; fig. 38(c) gives " +
        `${W1_RELIEF_LOW_FIG38C.toFixed(3)})`
      : `no fins or fins without a pressure field (F 1 down to ${W1_RELIEF_LOW.toFixed(3)}, the most ` +
        `relief RM L52J21a allows: its fig. 8 over figs. 31 to 33 by nose, at M ${LEAST_BY_CALL.mach}, ` +
        `each read twice, measured at M ${W1_RELIEF_MEASURED_FROM} to 2.41 and carried to ` +
        `${W1_MACH_RANGE[1]}; fig. 38(c) gives ${W1_RELIEF_LOW_FIG38C.toFixed(3)}` +
        (W1_RELIEF_SINGLE_CALLS.length > 0
          ? `; ${W1_RELIEF_SINGLE_CALLS.join(' and ')} called by one reader, the second pending)`
          : ')');
const memberName = (t: Thickness, n: Count, xc: number, mach: number) =>
  t === 0 || n === 0
    ? zeroName(mach)
    : `${n} unswept circular-arc fins t/c ${t.toFixed(2)} at x/c ${xc.toFixed(2)}`;

const SINGLE_END_REASON =
  'an end of the band rests on a symbol of TN 2360 fig. 6 that one reader alone found, the second ' +
  'reading pending (0015 section 7)';

export const W1_LABEL_PREFIX =
  'estimated on component data: the rebuilt fins-on-base factor (0015), between ';
export const W1_BOUNDED_PREFIX =
  'bounded, not measured: the rebuilt fins-on-base factor (0015), between ';

/** A t/c for a message: beyond 1 (a tip chord near zero), the plate's t/c grows without bound toward the tip. */
const tcText = (tc: number) =>
  Number.isFinite(tc) && tc <= 1
    ? `t/c ${tc.toFixed(3)}`
    : 'whose t/c grows without bound toward a tip chord of zero';

/**
 * A sweep angle (radians) in degrees for a message or label: to one decimal, or to as many as it takes for the
 * printed value to stay on its own side of 45 and 60 deg, the bounds the sweep rules turn on (44.99 deg is never
 * printed 45.0, nor 60.01 deg 60.0; the review of 2026-10-27).
 */
export function sweepDegrees(a: number): string {
  const d = (a * 180) / Math.PI;
  const onBound = (b: number) => Math.abs(d - b) <= (1e-9 * 180) / Math.PI;
  for (const digits of [1, 2, 3, 4, 6, 9, 12]) {
    const text = d.toFixed(digits);
    const v = Number(text);
    if ([45, 60].every((b) => onBound(b) || Math.sign(v - b) === Math.sign(d - b))) return text;
  }
  return String(d);
}

/** Added to a refusal of fins ahead of the base whose sweep the narrowing of 2026-10-27 refuses too. */
export const W1_SWEEP_REFUSED_TOO =
  '; their leading-edge sweep is refused at or near the base too: ';

/**
 * Why flat-faced fins (a square, unswept trailing edge) are refused for their leading-edge sweep below M 1.62, or
 * undefined: swept more than 0 and under 45 deg, or beyond 60 deg (0014 section 10.7 (z), the note of 2026-10-27;
 * 0015 section 12). Below M 1.62 the floor is RM L52E06's relief with plates swept 45 deg alone, measured at M 1.06
 * to 1.10, and which way the juncture vortex moves F is not shown: under 45 deg the plate is not shown to lie
 * between the unswept plate and the 45 deg ones, beyond 60 deg it lies past the last sweep measured. Exactly 60
 * deg, and 45 to 60, stay as section 4 serves them; from M 1.62, where RM L52J21a measures at most 5% relief,
 * these plates stay served.
 */
export function flatPlateSweepNarrowing(
  mach: number,
  fins: Pick<FinsNearBase, 'section' | 'tanLeadingEdgeSweep' | 'tanTrailingEdgeSweep'>,
): string | undefined {
  if (trailingEdgeShape(fins.section) !== 'flat') return undefined;
  const le = Math.abs(Math.atan(fins.tanLeadingEdgeSweep));
  const tes = Math.abs(Math.atan(fins.tanTrailingEdgeSweep));
  if (!(le > 1e-9 && tes <= 1e-9 && mach < W1_RELIEF_MEASURED_FROM - 1e-12)) return undefined;
  const head =
    `flat-faced fins with the leading edge swept ${sweepDegrees(le)} deg and the trailing edge unswept ` +
    `at M ${mach}`;
  if (le < W1_SWEPT_RANGE[0] - 1e-9) {
    return (
      `${head}, ${W1_FLAT_UNDER_45_MARK}: no base pressure is measured with such fins at or near the base ` +
      "there; the floor is RM L52E06's relief with plates swept 45 deg alone, measured at M 1.06 to 1.10, " +
      "and which way a lighter sweep's stronger juncture vortex moves the relief is not shown, so these " +
      'fins are not shown to lie between the unswept plate and the 45 deg ones (0015 section 12; 0014 ' +
      'section 10.7 (z), the note of 2026-10-27)'
    );
  }
  if (le > W1_SWEPT_RANGE[1] + 1e-9) {
    return (
      `${head}, ${W1_FLAT_BEYOND_60_MARK}: no base pressure is measured with fins swept beyond 60 deg ` +
      "at or near the base there (no fin of any section is measured at the base swept beyond the RM-10's " +
      "60 deg); the floor is RM L52E06's relief with plates swept 45 deg alone, these fins lie past the " +
      "last sweep measured, and which way a sharper sweep's weaker juncture vortex moves the relief is " +
      'not shown (0015 section 12; 0014 section 10.7 (z), the note of 2026-10-27)'
    );
  }
  return undefined;
}

export function finsOnBaseFactorW1(mach: number, fins: FinsNearBase): FinsOnBaseFactorW1 {
  const { count, section } = fins;
  if (!(Number.isInteger(count) && count >= 2 && count <= 4)) {
    throw new BaseRefusal(
      'fin-count',
      `the rebuilt fins-on-base factor is measured with two and four fins (TN 2360) and brackets ` +
        `three between them; ${count} fins are not covered`,
    );
  }
  const stations = [section, ...(fins.spanSections ?? [])];
  const te = trailingEdgeShape(section);
  if (stations.some((st) => trailingEdgeShape(st) !== te)) {
    throw new BaseRefusal(
      'input',
      'the sections given along the span have different trailing-edge shapes; the rebuilt factor ' +
        'brackets one shape at a time',
    );
  }
  if (te !== 'sharp' && te !== 'flat') {
    throw new BaseRefusal(
      'fin-trailing-edge',
      (te === 'diverging'
        ? 'faces that diverge to a blunt trailing edge (thickest at the edge, as the Basic ' +
          "Finner's wedges)"
        : 'faces that converge to a blunt trailing edge') +
        ' at the base: no band-setting source measures their effect on the body base, and the ' +
        'ordering of 0015 section 4 does not reach them',
    );
  }
  const bounded = te === 'flat';
  const le = Math.abs(Math.atan(fins.tanLeadingEdgeSweep));
  const tes = Math.abs(Math.atan(fins.tanTrailingEdgeSweep));
  const swept = le > 1e-9 || tes > 1e-9;
  const measuredSwept =
    le >= W1_SWEPT_RANGE[0] - 1e-9 && le <= W1_SWEPT_RANGE[1] + 1e-9 && tes <= le + 1e-9;
  // W1b: the leading edge swept up to 45 deg with the trailing edge unswept, at M 2.0 to 3.0.
  const moderate =
    swept &&
    !measuredSwept &&
    tes <= 1e-9 &&
    le < W1_MODERATE_SWEEP.leadingEdge + 1e-9 &&
    mach >= W1_MODERATE_SWEEP.mach[0] - 1e-12 &&
    mach <= W1_MODERATE_SWEEP.mach[1] + 1e-12;
  // Flat faces at a square trailing edge with the trailing edge unswept: served at every leading-edge sweep from
  // M 1.62, below it unswept or swept 45 to 60 deg (0015 section 12; 0014 section 10.7 (z) and its note). Neither bound of the flat-plate value uses the leading edge:
  // the upper rests on the faces' slope near the trailing edge (zero on a flat face at any sweep), the lower
  // on RM L52E06's relief at the fin-body junctures and the square edge, in one plane parallel to the base
  // (the base plane at x/c 0), which the leading-edge sweep does not move when the trailing edge is unswept.
  const plateAnyLeadingEdgeSweep = bounded && swept && tes <= 1e-9;
  const deg = sweepDegrees;
  if (swept && !measuredSwept && !moderate && !plateAnyLeadingEdgeSweep) {
    throw new BaseRefusal(
      'fin-sweep',
      `fins with a leading edge swept ${deg(le)} deg and a trailing edge ${deg(tes)} deg at M ${mach}: ` +
        'fins at or near the base are measured unswept, with the leading edge swept 45 deg (RM L52J21a, a ' +
        'chord ahead of the base) and 60 deg (the RM-10, TN 3819 fig. 34), and, at M 2.0 to 3.0 only, ' +
        'with the leading edge swept 43.9 deg and the trailing edge unswept (NSWCDD/TR-92/509); other ' +
        'sweeps are not measured and their ordering is not shown (0015 section 3.4)',
    );
  }
  // The rulings after A1's second review (0014 section 10.7 (z), its note of 2026-10-27; 0015 section 12): below
  // M 1.62 a plate swept more than 0 and under 45 deg, or beyond 60 deg, is refused (flatPlateSweepNarrowing).
  // Ahead of the base, where its position is refused too, both reasons are named, the position first, so that
  // neither refusal's advice leads into the other (0015 section 3.3).
  const narrowing = flatPlateSweepNarrowing(mach, fins);
  if (narrowing !== undefined) {
    throw (
      nearBasePositionRefusal(
        mach,
        fins.trailingEdgeAheadOfBase,
        fins.rootChordOverDiameter,
        `${W1_SWEEP_REFUSED_TOO}${narrowing}`,
      ) ?? new BaseRefusal('fin-sweep', narrowing)
    );
  }
  if (swept && !bounded && mach < W1_MACH_RANGE[0] - 1e-12) {
    throw new BaseRefusal(
      'fin-sweep',
      `swept fins with a sharp trailing edge at M ${mach}: below M 1.5 no swept fins of such a section ` +
        "are measured at the base (the RM-10's lowest Mach number is 1.49, RM L52J21a's 1.62); only " +
        "RM L52E06's swept flat plates are, so only flat-faced fins are served swept there (0015 section 11)",
    );
  }
  const xc = fins.trailingEdgeAheadOfBase;
  if (!(xc >= 0 && xc <= 1 && Number.isFinite(xc))) {
    throw new BaseRefusal(
      'input',
      `the rebuilt factor takes fins ending 0 to 1 chord ahead of the base, got ${xc}`,
    );
  }
  // A sharp section with a forward-swept trailing edge rests on no measurement anywhere: the one set with a
  // swept trailing edge near the base, RM L52J21a's, sweeps it aft (0015 section 3.4).
  if (!bounded && fins.tanTrailingEdgeSweep < 0 && tes > 1e-9) {
    throw new BaseRefusal(
      'fin-sweep',
      `fins of a sharp section with the trailing edge swept ${deg(tes)} deg forward at M ${mach}: the one ` +
        "set measured near the base with a swept trailing edge, RM L52J21a's 45 deg fins, sweeps it aft, " +
        "and the RM-10's trailing-edge sweep is not stated, so a forward-swept edge is not measured and " +
        'its ordering is not shown (0015 section 3.4)',
    );
  }
  // At the base, and closer to it than RM L52J21a's 45 deg fins (the root trailing edge 0.85 +-0.05 root
  // chords ahead), a sharp section with a swept trailing edge rests on no measurement: the RM-10's
  // trailing-edge sweep is not stated, and linear theory puts the faces behind a swept edge above the unswept
  // fin's (0015 section 3.4).
  if (!bounded && xc < W1_SWEPT_TRAILING_EDGE_AHEAD - 1e-9 && tes > 1e-9) {
    const k = (m: number) => Math.sqrt(m * m - 1) / Math.sqrt(m * m - 1 / Math.cos(tes) ** 2);
    const factor = mach * Math.cos(tes) > 1 ? `${k(mach).toFixed(2)} times` : 'more than';
    const where = xc === 0 ? 'at the base' : `ending ${xc} root chords ahead of the base`;
    throw new BaseRefusal(
      'fin-sweep',
      `fins of a sharp section ${where} with the trailing edge swept ${deg(tes)} deg ` +
        `aft at M ${mach}: no such fins are measured closer to the base than RM L52J21a's 45 deg fins, ` +
        'which end 0.85 +-0.05 root chords ahead of it, so they are served from ' +
        `${W1_SWEPT_TRAILING_EDGE_AHEAD} (the RM-10's trailing-edge sweep is not stated), and linear theory gives ` +
        `the faces behind that edge ${factor} the unswept fin's pressures, so they may act as thicker ` +
        "fins than the bracket's upper member (0015 section 3.4)",
    );
  }
  if (!(mach >= W1_LOW_MACH && mach <= W1_MACH_RANGE[1])) {
    throw new BaseRefusal(
      'mach-range',
      `the rebuilt fins-on-base factor serves Mach ${W1_LOW_MACH} to ${W1_MACH_RANGE[1]} (TN 3819 ` +
        `fig. 35's free-flight curve, read twice, to M ${FIG35_FREE_FLIGHT_END} and bounded above it; ` +
        `TN 2360), asked Mach ${mach}`,
    );
  }
  const thicknesses = stations.map((st) => Math.max(...st.halfThickness) * 2);
  const thickness = Math.max(...thicknesses);
  const brackets = stations.map((st, k) =>
    fins.sectionFamily === 'circular-arc'
      ? { tauLow: thicknesses[k]!, tauEq: thicknesses[k]! }
      : bounded
        ? { tauLow: 0, tauEq: thicknesses[k]! }
        : sectionBracket(st),
  );
  const tr = {
    tauLow: Math.min(...brackets.map((b) => b.tauLow)),
    tauEq: Math.max(...brackets.map((b) => b.tauEq)),
  };
  if (tr.tauEq > 0.1 + 1e-9) {
    throw new BaseRefusal(
      'fin-thickness',
      bounded
        ? `flat-faced fins ${tcText(thickness)}: the circular-arc members that bound them reach ` +
            't/c 0.10 (TN 2360, TN 3819 fig. 33)'
        : `this section is not inside the 10%-thick circular arc near its edges (it would need an ` +
            `arc of t/c ${tr.tauEq.toFixed(3)}); thicker fins at the base are not measured (TN 2360, ` +
            'TN 3819 fig. 33)',
    );
  }
  const taus: Thickness[] = [0, 0.05, 0.1];
  const lowT =
    swept || bounded ? [0 as Thickness] : taus.filter((t) => t <= tr.tauLow + 1e-9).reverse();
  const highT = taus.filter((t) => t >= tr.tauEq - 1e-9);
  const lowN: Count[] = count === 4 ? [4] : [2, 0];
  const highN: Count[] = count === 2 ? [2, 4] : [4];
  const pick = (ts: Thickness[], ns: Count[], at: number): MemberUsed | undefined => {
    for (const t of ts) {
      for (const n of ns) {
        const b = memberBand(t, n, at, mach);
        if (b !== undefined)
          return { thickness: t, count: n, band: b, name: memberName(t, n, at, mach) };
      }
    }
    return undefined;
  };
  // Fins ending ahead of the base: served only where TN 2360 measured positions, M 1.5 to 2.0 and its root chord
  // of 1.5 body diameters (0015 section 3.3); every reason they are refused, in plain words.
  const xcText = `${Number(xc.toPrecision(3))}`;
  const positionRefusal = nearBasePositionRefusal(mach, xc, fins.rootChordOverDiameter);
  if (positionRefusal !== undefined) throw positionRefusal;
  const upper = pick(highT, highN, xc);
  const lower: MemberUsed | undefined = bounded
    ? {
        thickness: 0,
        count: 4,
        band: { low: W1_FLAT_RELIEF_LOW, high: 1 },
        // (The same lower bound at every Mach number; below M 1.5 it is also the zero member's.)
        name:
          `the lowest relief measured with flat-faced fins at the base (F ${W1_FLAT_RELIEF_LOW.toFixed(3)}, ` +
          'RM L52E06 fig. 7 at M 1.06)',
      }
    : pick(lowT, lowN, xc);
  if (lower === undefined || upper === undefined) {
    throw new BaseRefusal(
      'fins-near-base',
      `fins ending ${xcText} root chords ahead of the base at Mach ${mach}: no measured member bounds ` +
        'these fins at this position (0015 section 3.3)',
    );
  }
  const low = Math.min(lower.band.low, upper.band.low);
  const high = Math.max(lower.band.high, upper.band.high);
  // Above the free-flight curve's end the reference, and every bracket that uses it, is bounded, not measured.
  const aboveLine = mach > FIG35_FREE_FLIGHT_END + 1e-12;
  const boundedResult = bounded || aboveLine;
  const member =
    !swept &&
    !bounded &&
    !aboveLine &&
    fins.sectionFamily === 'circular-arc' &&
    lower.thickness === upper.thickness &&
    lower.count === upper.count &&
    lower.count === count;
  const ff = referenceBand(mach).freeFlight;
  const reasons: string[] = [];
  if (bounded) {
    reasons.push(
      "flat faces at a square trailing edge: not measured above M 1.10; the ordering is TN 2360's " +
        "(the increment follows the faces' slope near the trailing edge, zero here) and RM L52E06's " +
        '(relief with these fins), 0015 section 4',
    );
  } else if (fins.sectionFamily !== 'circular-arc') {
    reasons.push(
      `the section bracketed by its thickness near the edges (arcs t/c ${tr.tauLow.toFixed(3)} to ` +
        `${tr.tauEq.toFixed(3)}), not measured on this section`,
    );
  }
  if (plateAnyLeadingEdgeSweep) {
    // Flat faces, the trailing edge unswept: the bounds are set at the trailing edge, which the leading-edge
    // sweep does not move (0015 section 12). That edge lies in the base plane only for fins at the base; fins
    // within a chord have it in one plane parallel to the base, ahead of it.
    const plane =
      xc === 0
        ? 'in the base plane'
        : `in one plane parallel to the base, ${xc.toFixed(2)} root chords ahead of it`;
    reasons.push(
      `the leading edge swept ${deg(le)} deg with the trailing edge unswept, with flat faces: bracketed ` +
        "between RM L52E06's relief with flat plates at the base (F " +
        `${W1_FLAT_RELIEF_LOW.toFixed(3)}, its plates swept 45 deg) and unswept circular-arc fins; both ` +
        `bounds are set at the trailing edge, ${plane}, which the leading-edge sweep does not ` +
        'move, and the faces carry no slope for the sweep to act on (0015 section 12)' +
        (le > W1_SWEPT_RANGE[1] + 1e-9
          ? '; no fin of any section is measured at the base swept beyond 60 deg'
          : ''),
    );
  } else if (swept && bounded) {
    // Flat faces: the lower bound is RM L52E06's relief with swept plates, not the zero member (0015 section 4).
    reasons.push(
      `the leading edge swept ${deg(le)} deg and the trailing edge ${deg(tes)} deg, with flat faces: ` +
        "bracketed between RM L52E06's relief with flat plates at the base (F " +
        `${W1_FLAT_RELIEF_LOW.toFixed(3)}, its plates swept 45 deg) and unswept circular-arc fins, the ` +
        'faces carrying no slope for the sweep to act on (0015 section 4)',
    );
  } else if (moderate) {
    reasons.push(
      `the leading edge swept ${deg(le)} deg with the trailing edge unswept: bracketed between the zero ` +
        "member and unswept fins, where NSWCDD/TR-92/509's 43.9 deg fins lie, linear theory moving the " +
        "aft faces' pressures by at most 4% with the leading-edge sweep (0015 section 3.4)",
    );
  } else if (swept && xc === 0) {
    reasons.push(
      `the leading edge swept ${deg(le)} deg with the trailing edge unswept: bracketed between the ` +
        "zero member and unswept fins, as the RM-10's 60 deg fins at the base lie (TN 3819 fig. 34) and " +
        "RM L52J21a's 45 deg fins about 0.85 root chords ahead of it (0015 section 3.4)",
    );
  } else if (swept) {
    reasons.push(
      'swept fins bracketed between the zero member and unswept fins, as the measured swept fins lie ' +
        "(RM L52J21a's 45 deg fins about 0.85 root chords ahead of the base, the RM-10)",
    );
  }
  // The carries of the reference's high end, named on members and brackets alike.
  const carries: string[] = [];
  if (mach < W1_MACH_RANGE[0] - 1e-12) {
    carries.push(
      "below M 1.5 the reference is TN 3819 fig. 35's free-flight line, its high end carrying the tunnel " +
        `excess measured at M 2.41 (${largestTunnelExcess().toFixed(4)}) down from the tunnels' Mach ` +
        'numbers' +
        (member ? '' : ", and the zero member reaches down to RM L52E06's relief") +
        ' (0015 sections 3.1 and 11.2)',
    );
  } else if (mach > 2.41 + 1e-12 && !aboveLine) {
    carries.push(
      "above M 2.41, the tunnels' last Mach number, the reference's high end carries the tunnel excess " +
        `measured there (${largestTunnelExcess().toFixed(4)}) on the free-flight line (0015 section 3.1)`,
    );
  }
  reasons.push(...carries);
  if (aboveLine) {
    reasons.push(
      `above M ${FIG35_FREE_FLIGHT_END}, where TN 3819 fig. 35's free-flight curve ends, the reference is ` +
        `bounded, not measured: from the zero member's low end (F ${W1_RELIEF_LOW.toFixed(4)}) to its high end at M ` +
        `${FIG35_FREE_FLIGHT_END} (0010 section 11, 0015 section 3.1)`,
    );
  }
  const singleEnd =
    memberEndOnSingleReader(lower.thickness, lower.count, xc, mach) ||
    memberEndOnSingleReader(upper.thickness, upper.count, xc, mach);
  if (singleEnd) reasons.push(SINGLE_END_REASON);
  if (count === 3) reasons.push('three fins bracketed between two (or none) and four');
  if (xc > 0) {
    reasons.push(
      'the position bracketed between the stations of TN 2360 fig. 6, measured with a root chord of ' +
        `${W1_POSITION_CHORD_OVER_DIAMETER} body diameters, as these fins have`,
    );
  }
  const label = member
    ? `estimated on component data: the rebuilt fins-on-base factor (0015), measured on ${lower.name} ` +
      '(TN 2360 fig. 6, TN 3819 figs. 33 and 35)' +
      [...carries, ...(singleEnd ? [SINGLE_END_REASON] : [])].map((c) => `; ${c}`).join('') +
      ', tested only in the total'
    : `${boundedResult ? W1_BOUNDED_PREFIX : W1_LABEL_PREFIX}${lower.name} and ${upper.name}; ` +
      `${reasons.join('; ')}; not measured on these fins, tested only in the total`;
  return {
    mach,
    nominal: 0.5 * (low + high),
    low,
    high,
    label,
    analogy: !member,
    bounded: boundedResult,
    singleReading: !aboveLine && ff.filter((f) => !f.extrapolated).length < 2,
    extrapolated: ff.some((f) => f.extrapolated),
    atRangeEnd: false,
    lower,
    upper,
    tauLow: tr.tauLow,
    tauEq: tr.tauEq,
    swept,
    sweepByArgument: bounded && tes <= 1e-9 && !measuredSwept,
    // The zero member above M 1.5 rests on fig. 38(c), read once; moderate sweeps on NSWC's Table 2, read once.
    // Above M 2.56 the bounded reference's low end is the zero member's, so it rests on fig. 38(c) too.
    secondReadingPending:
      moderate ||
      singleEnd ||
      (W1_ZERO_MEMBER_PENDING &&
        (lower.thickness === 0 ||
          lower.count === 0 ||
          upper.thickness === 0 ||
          upper.count === 0 ||
          aboveLine) &&
        !bounded &&
        mach >= W1_RELIEF_MEASURED_FROM - 1e-12) ||
      !L52J21A_FIG8.some((p) => p.reading === 'w1 second'),
  };
}
