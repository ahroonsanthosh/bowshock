/**
 * Base drag of blunt fin trailing edges: step B3 of
 * docs/design/0008-total-drag.md (section 3.4, "blunt fin trailing edges:
 * two-dimensional base pressure at the free-stream Mach number, labelled,
 * refused for laminar or swept edges, and carried by analogy to edges in
 * the body's base plane"), with the choices of
 * docs/design/0010-base-drag-and-total.md section 5, made from the
 * component data alone before the Basic Finner gate was run.
 *
 *   C_D = -P_B(M) n h s / A_ref
 *
 * for n fins whose trailing edges are h thick over a span s, with P_B the
 * thin-layer two-dimensional curve, RM A51J25 fig. 7's mean curve at M' =
 * M_inf (flat-sided sections), interpolated linearly in M
 * (./blunt-te-2d.ts). No separate interpolation band is carried: the band's
 * evidence was formed against this same interpolated curve at each data
 * point's own Mach number.
 *
 * The nominal curve is the first reading; the second reading of the
 * curve agrees within -0.005 to +0.003 in p_b / p' at M' 1.50 to 4.00.
 *
 * Band, measured over modelled, the envelope of the evidence 0008 lists,
 * on both readings, rounded outward to two decimals: TR 1109 fig. 8's
 * symbols about their faired curves and fig. 29(a) against fig. 8
 * (orifice position), RM A51J25 fig. 7's symbols at M' 1.45 to 3.2, and
 * the X-15 fin in flight at M 1.52 to 3.24 against the curve: 0.933 to
 * 1.204, so **0.93 to 1.21** (0008's "about 0.93 to 1.20"; 1.20 would be
 * narrower than the X-15's own points). Estimated on all of these, so it
 * is tested only in a total.
 *
 * Labels: for edges ending in the body's base plane (fins at the base),
 * "an analogy, not a measurement": no opened source measures such an
 * edge, whose wake meets the body's base flow; for free edges, a
 * correlation. Both say the band is "tested only in the total" (0010
 * section 7).
 *
 * Below Mach 1.5, down to 1.0 (docs/design/0019-fins-near-mach-1.md
 * section 3.4.1; ./fin-te-transonic.ts): the nominal is the flat-faced
 * sets' base pressure on the free-stream Mach number (TN 3548 in flight,
 * R&M 3427), joined to the curve above at Mach 1.5; the band is the spread
 * of every set near Mach 1 about it (wedges widened on the side their
 * shape does not bound), never narrower than 0.93 to 1.21; TR 1109's
 * thick-layer factor is held at its Mach 1.5 value; the layer parameter
 * and h/c must lie where the sets reach, and a laminar edge is refused.
 *
 * Refused (`BaseRefusal`):
 * - Mach numbers outside 1.0 to 3.2 (the evidence's range);
 * - swept trailing edges (base pressure 20% to 50% higher at M 1.41 and
 *   1.96 with 45 deg of sweep, RM A51J25 p. 17);
 * - a laminar layer at the trailing edge (base pressure then depends
 *   strongly on Reynolds number, TR 1109 p. 1);
 * - layers thicker than TR 1109 fig. 29(a) is read, c / [h Re_c^(1/5)] > 4.5,
 *   and any layer thicker than 1.0 above M 3.1 (its highest curve).
 *
 * Thick layers (docs/design/0016-fin-edges-of-flat-plates.md, W3(a)). Up to
 * X = c / [h Re_c^(1/5)] = 1.0 the thin-layer curve is taken as it is: TR
 * 1109 fig. 29(a)'s base drag lies within 0.4%, 1.4% and 1.8% of its value
 * at its lowest read abscissa at M 1.5, 2.0 and 3.1 in the first reading
 * (within 0.2%, 1.5% and 4.0% in the second, from X 0.45). From 1.0 to 4.5,
 * where it falls by up to 12% to 31%, the term is the thin-layer term times
 *
 *   K(M, X) = D(M, X) / D(M, 1.0),   D = 1 - p_b / p_inf on fig. 29(a),
 *
 * the first reading's K interpolated linearly in M between the curves at M
 * 1.5, 2.0 and 3.1. Its band: the term's band (0.93 to 1.21) times the
 * lowest and the highest K over both readings and the curves that bracket
 * the Mach number (at a curve's own Mach number, that curve), since K falls
 * with M at every abscissa read. K = 1 at X = 1, so the term is continuous
 * there and unchanged below it.
 *
 * Fins of varying chord (0016, W3(b)): with an unswept trailing edge the
 * term is integrated along the span with the local chord, thickness and
 * Reynolds number (Gauss-Legendre); a transition input leaves laminar the
 * part of the span whose chord Reynolds number it reaches, and that part's
 * laminar change is integrated on its own interval.
 *
 * Input band, laminar against turbulent: when a transition input leaves
 * the fin's layer laminar at its trailing edge (Re_T at least the chord
 * Reynolds number), the term changes by the laminar over turbulent base
 * drag of TR 1109 fig. 29, laminar (29(b)) at c / [h Re_c^(1/2)] over
 * turbulent (29(a)) at c / [h Re_c^(1/5)], at each of M 1.5, 2.0 and 3.1;
 * the band is the envelope over the three (the ratio changes sign between
 * them, so it is not interpolated in M) and over both readings of each
 * curve. Where an abscissa lies beyond a curve's read range by at most one
 * read interval, the value is the envelope of the end value and the
 * linear extrapolation of the end interval (flagged); further out, in
 * either reading, the input is refused. This replaces 0008's fixed -13%
 * to +26%, computed at two read points for the whole Reynolds-number
 * range. The term in the laminar state is returned as `laminarTerm`;
 * src/total adds it to the friction of the same state (a fin laminar at
 * its trailing edge is laminar along its whole chord), never on its own.
 *
 * The envelope over M 1.5, 2.0 and 3.1 is kept near M 3, where its high
 * end is the M 1.5 ratio (1.26 to 1.32) and TR 1109's own ratio at M 3.1
 * is 0.92 to 0.97 for these abscissas: the reasoning is in 0010 section
 * 10 (round 5, finding 8).
 *
 * The vacuum bound (./vacuum.ts): the term, its band's ends and the
 * laminar state's ends are each at most 2 / (gamma M^2) n h s / A_ref,
 * clamped there (`vacuumClamped` lists what was). Without the clamp the
 * envelope's M 1.5 ratio, applied at M 2.97, implies a negative absolute
 * base pressure (round 5, finding 8).
 */

import {
  RM_A51J25_FIG7_CURVE,
  RM_A51J25_FIG7_CURVE_SECOND,
  RM_A51J25_FIG7_SYMBOLS,
  RM_A51J25_FIG7_SYMBOLS_SECOND,
  TN_D1056_TABLE_II,
  TR1109_FIG29A_AGAINST_FIG8,
  TR1109_FIG29A_TURBULENT,
  TR1109_FIG29A_TURBULENT_SECOND,
  TR1109_FIG29B_LAMINAR,
  TR1109_FIG29B_LAMINAR_SECOND,
  TR1109_FIG8_CURVES_SECOND,
  TR1109_FIG8_SYMBOLS,
  TR1109_FIG8_SYMBOLS_SECOND,
  type Tr1109Curve,
} from './blunt-te-2d';
import {
  buildTransonicTrailingEdge,
  TRANSONIC_TE_MACH_RANGE,
  type TransonicTrailingEdge,
} from './fin-te-transonic';
import { gaussLegendre } from '../fins/quadrature';
import { BaseRefusal } from './refusal';
import { vacuumBaseDrag } from './vacuum';

const GAMMA = 1.4;

/** Mach numbers of the band's evidence. */
export const FIN_TRAILING_EDGE_MACH_RANGE = [1.5, 3.2] as const;
/** Largest c / [h Re_c^(1/5)] counted a thin layer (TR 1109 fig. 29(a)). */
export const THIN_LAYER_LIMIT = 1.0;
/** Largest c / [h Re_c^(1/5)] served: the end of TR 1109 fig. 29(a)'s readings. */
export const THICK_LAYER_LIMIT = 4.5;
/** The Mach numbers of fig. 29(a)'s turbulent curves, between which K is interpolated. */
export const THICK_LAYER_MACH_RANGE = [1.5, 3.1] as const;

/** RM A51J25 fig. 7's p_b / p' at M', linearly interpolated (within the table). */
export function thinLayerPressureRatio(mach: number): number {
  const t = RM_A51J25_FIG7_CURVE;
  if (!(mach >= t[0]!.mach && mach <= t[t.length - 1]!.mach)) {
    throw new RangeError(
      `RM A51J25 fig. 7 is read at M' ${t[0]!.mach} to ${t[t.length - 1]!.mach}`,
    );
  }
  let k = 0;
  while (k + 2 < t.length && mach > t[k + 1]!.mach) k++;
  const a = t[k]!;
  const b = t[k + 1]!;
  return a.ratio + ((mach - a.mach) / (b.mach - a.mach)) * (b.ratio - a.ratio);
}

/** The thin-layer two-dimensional base pressure coefficient at the free-stream Mach number. */
export function thinLayerBasePressure(mach: number): number {
  return ((thinLayerPressureRatio(mach) - 1) * 2) / (GAMMA * mach * mach);
}

/** A read curve's value at an abscissa: a range, wider than a point only when extrapolated. */
export interface CurveValue {
  readonly low: number;
  readonly high: number;
  readonly extrapolated: boolean;
}

type Points = readonly { readonly x: number; readonly ratio: number }[];

/**
 * Linear interpolation within the read range; beyond it by at most one
 * read interval, the envelope of the end value and the end interval's
 * linear extrapolation; undefined further out.
 */
function pointsValue(p: Points, x: number): CurveValue | undefined {
  const n = p.length;
  const first = p[0]!;
  const last = p[n - 1]!;
  if (x >= first.x && x <= last.x) {
    let k = 0;
    while (k + 2 < n && x > p[k + 1]!.x) k++;
    const a = p[k]!;
    const b = p[k + 1]!;
    const v = a.ratio + ((x - a.x) / (b.x - a.x)) * (b.ratio - a.ratio);
    return { low: v, high: v, extrapolated: false };
  }
  const [end, next] = x < first.x ? [first, p[1]!] : [last, p[n - 2]!];
  const interval = Math.abs(next.x - end.x);
  if (Math.abs(x - end.x) > interval * (1 + 1e-12)) return undefined;
  const extrapolated = end.ratio + ((x - end.x) / (next.x - end.x)) * (next.ratio - end.ratio);
  return {
    low: Math.min(end.ratio, extrapolated),
    high: Math.max(end.ratio, extrapolated),
    extrapolated: true,
  };
}

/** A TR 1109 curve's p_b / p_inf at abscissa x (the rule of `pointsValue`). */
export function tr1109CurveValue(curve: Tr1109Curve, x: number): CurveValue | undefined {
  return pointsValue(curve.points, x);
}

/** One reading of a curve's value; throws if beyond one read interval. */
function mustValue(p: Points, x: number, what: string): CurveValue {
  const v = pointsValue(p, x);
  if (v === undefined) throw new RangeError(`${what} is not read at ${x}`);
  return v;
}

const curveAt = (curves: readonly Tr1109Curve[], mach: number): Points => {
  const c = curves.find((k) => k.mach === mach);
  if (c === undefined) throw new RangeError(`no curve at M ${mach}`);
  return c.points;
};

/** The thick-layer factor on the thin-layer term, and its band's ends. */
export interface ThickLayerFactor {
  readonly nominal: number;
  readonly low: number;
  readonly high: number;
  /** The fig. 29(a) Mach numbers whose curves bracket the Mach number. */
  readonly machNodes: readonly number[];
}

const NO_THICK_LAYER: ThickLayerFactor = { nominal: 1, low: 1, high: 1, machNodes: [] };

/**
 * K(M, X) = D(M, X) / D(M, 1.0) on TR 1109 fig. 29(a), D = 1 - p_b / p_inf
 * (0016, W3(a)); 1 for X up to 1.0. Nominal: the first reading, linear in M
 * between the bracketing curves; low and high: the extremes over both
 * readings and the bracketing curves. Throws BaseRefusal beyond X = 4.5, or
 * for X above 1.0 outside M 1.5 to 3.1.
 */
export function thickLayerFactor(mach: number, x: number): ThickLayerFactor {
  if (!(x > THIN_LAYER_LIMIT)) return NO_THICK_LAYER;
  if (!(x <= THICK_LAYER_LIMIT * (1 + 1e-12))) {
    throw new BaseRefusal(
      'thick-layer',
      `c/[h Re_c^(1/5)] = ${x.toFixed(3)} exceeds ${THICK_LAYER_LIMIT}, the end of TR 1109 ` +
        "fig. 29(a)'s readings: the boundary layer is thicker against the edge than any base " +
        'pressure measured',
    );
  }
  const [lo, hi] = THICK_LAYER_MACH_RANGE;
  if (!(mach >= lo && mach <= hi)) {
    throw new BaseRefusal(
      'thick-layer',
      `c/[h Re_c^(1/5)] = ${x.toFixed(3)} is a thick layer, whose effect TR 1109 fig. 29(a) ` +
        `measures at Mach ${lo}, 2.0 and ${hi} only, asked Mach ${mach}`,
    );
  }
  const nodes = TR1109_FIG29A_TURBULENT.map((c) => c.mach);
  let k = 0;
  while (k + 2 < nodes.length && mach > nodes[k + 1]!) k++;
  const a = nodes[k]!;
  const b = nodes[k + 1]!;
  const bracket = mach === a ? [a] : mach === b ? [b] : [a, b];
  const factor = (curves: readonly Tr1109Curve[], m: number) => {
    const p = curveAt(curves, m);
    return (1 - mustValue(p, x, 'fig. 29(a)').low) / (1 - mustValue(p, 1.0, 'fig. 29(a)').low);
  };
  const ka = factor(TR1109_FIG29A_TURBULENT, a);
  const kb = factor(TR1109_FIG29A_TURBULENT, b);
  const all = [TR1109_FIG29A_TURBULENT, TR1109_FIG29A_TURBULENT_SECOND].flatMap((r) =>
    bracket.map((m) => factor(r, m)),
  );
  return {
    nominal: ka + ((mach - a) / (b - a)) * (kb - ka),
    low: Math.min(...all),
    high: Math.max(...all),
    machNodes: bracket,
  };
}

/** RM A51J25 fig. 7's mean curve, each reading, as points. */
const FIG7_READINGS: readonly { readonly reading: string; readonly points: Points }[] = [
  { reading: 'first', points: RM_A51J25_FIG7_CURVE.map((p) => ({ x: p.mach, ratio: p.ratio })) },
  {
    reading: 'second',
    points: RM_A51J25_FIG7_CURVE_SECOND.map((p) => ({ x: p.mach, ratio: p.ratio })),
  },
];

/** One item of the band's evidence, base drag measured over modelled. */
export interface EvidenceItem {
  readonly item:
    'TR 1109 fig. 8' | 'TR 1109 fig. 29(a) over fig. 8' | 'RM A51J25 fig. 7 symbols' | 'X-15 fin';
  /** The readings it is formed on. */
  readonly reading: string;
  readonly min: number;
  readonly max: number;
  /** Data points (symbols, comparisons or flight points). */
  readonly count: number;
}

export interface TrailingEdgeBandEvidence {
  readonly items: readonly EvidenceItem[];
  /** The envelope of every item. */
  readonly min: number;
  readonly max: number;
}

/**
 * The evidence of 0008 section 3.4, as base drag measured over modelled,
 * on both readings: TR 1109 fig. 8's symbols over their faired curves and
 * fig. 29(a) over fig. 8, each reading on its own; RM A51J25 fig. 7's
 * symbols at M' 1.45 to 3.2 over the mean curve, each reading of the
 * symbols over each reading of the curve; and the X-15 fin at M 1.45 to
 * 3.25 over each reading of the curve. Where a symbol lies below a
 * curve's read range (the second reading of fig. 7 starts at M' 1.50),
 * the curve's one-interval envelope is used and both of its ends count.
 */
export function finTrailingEdgeBandEvidence(): TrailingEdgeBandEvidence {
  const drag = (pressureRatio: number) => 1 - pressureRatio;
  const items: EvidenceItem[] = [];
  const add = (item: EvidenceItem['item'], reading: string, values: number[], count: number) => {
    items.push({ item, reading, min: Math.min(...values), max: Math.max(...values), count });
  };
  const over = (measured: number, curve: CurveValue) => [
    drag(measured) / drag(curve.low),
    drag(measured) / drag(curve.high),
  ];

  add(
    'TR 1109 fig. 8',
    'first',
    TR1109_FIG8_SYMBOLS.map((s) => drag(s.ratio) / drag(s.curve)),
    TR1109_FIG8_SYMBOLS.length,
  );
  add(
    'TR 1109 fig. 8',
    'second',
    TR1109_FIG8_SYMBOLS_SECOND.flatMap((s) =>
      over(s.ratio, mustValue(curveAt(TR1109_FIG8_CURVES_SECOND, s.mach), s.x, 'fig. 8')),
    ),
    TR1109_FIG8_SYMBOLS_SECOND.length,
  );
  add(
    'TR 1109 fig. 29(a) over fig. 8',
    'first',
    TR1109_FIG29A_AGAINST_FIG8.map((s) => drag(s.fig29a) / drag(s.fig8)),
    TR1109_FIG29A_AGAINST_FIG8.length,
  );
  add(
    'TR 1109 fig. 29(a) over fig. 8',
    'second',
    TR1109_FIG29A_AGAINST_FIG8.flatMap((s) => {
      const fig29a = mustValue(curveAt(TR1109_FIG29A_TURBULENT_SECOND, s.mach), s.x, '29(a)');
      const fig8 = mustValue(curveAt(TR1109_FIG8_CURVES_SECOND, s.mach), s.x, 'fig. 8');
      return [drag(fig29a.low) / drag(fig8.high), drag(fig29a.high) / drag(fig8.low)];
    }),
    TR1109_FIG29A_AGAINST_FIG8.length,
  );
  const inRange = (m: number) => m >= 1.45 && m <= 3.2;
  for (const [symbolReading, symbols] of [
    ['first', RM_A51J25_FIG7_SYMBOLS],
    ['second', RM_A51J25_FIG7_SYMBOLS_SECOND],
  ] as const) {
    const used = symbols.filter((s) => inRange(s.mach));
    for (const curve of FIG7_READINGS) {
      add(
        'RM A51J25 fig. 7 symbols',
        `symbols ${symbolReading}, curve ${curve.reading}`,
        used.flatMap((s) => over(s.ratio, mustValue(curve.points, s.mach, 'fig. 7'))),
        used.length,
      );
    }
  }
  const flight = TN_D1056_TABLE_II.filter((r) => r.mach >= 1.45 && r.mach <= 3.25);
  for (const curve of FIG7_READINGS) {
    add(
      'X-15 fin',
      `curve ${curve.reading}`,
      flight.flatMap((r) => {
        const v = mustValue(curve.points, r.mach, 'fig. 7');
        const pB = (ratio: number) => ((ratio - 1) * 2) / (GAMMA * r.mach * r.mach);
        return [r.cp / pB(v.low), r.cp / pB(v.high)];
      }),
      flight.length,
    );
  }
  return {
    items,
    min: Math.min(...items.map((i) => i.min)),
    max: Math.max(...items.map((i) => i.max)),
  };
}

/** The band on the term, measured over modelled: the evidence of both readings rounded outward. */
export const FIN_TRAILING_EDGE_BAND = (() => {
  const e = finTrailingEdgeBandEvidence();
  return {
    low: Math.floor(e.min * 100 + 1e-9) / 100,
    high: Math.ceil(e.max * 100 - 1e-9) / 100,
  };
})();

let transonic: TransonicTrailingEdge | undefined;

/**
 * The term below Mach 1.5 (0019 section 3.4.1): its nominal, the band's
 * nodes and what the sets reach, built once from ./fin-te-transonic.ts's
 * evidence with this module's curve at Mach 1.5 and TR 1109's thick-layer
 * factor at Mach 1.5.
 */
export function transonicTrailingEdge(): TransonicTrailingEdge {
  transonic ??= buildTransonicTrailingEdge({
    cpAt15: thinLayerBasePressure(FIN_TRAILING_EDGE_MACH_RANGE[0]),
    thickLayerAt15: (x) => thickLayerFactor(FIN_TRAILING_EDGE_MACH_RANGE[0], x),
    thickLayerLimit: THICK_LAYER_LIMIT,
    thinLayerLimit: THIN_LAYER_LIMIT,
  });
  return transonic;
}

/** The term's pieces at a Mach number: the thin-layer Cp_b, its band, and where K is read. */
interface TermBasis {
  readonly pB: number;
  readonly band: { readonly low: number; readonly high: number };
  /** The Mach number at which TR 1109's thick-layer factor is read: 1.5 below 1.5. */
  readonly kMach: number;
  readonly belowBand: boolean;
}

/**
 * Above Mach 1.5 the curve and the band 0.93 to 1.21; below, the nominal
 * and the evidence's envelope there, never narrower than 0.93 to 1.21 (0019
 * section 3.4.1 item 5), K read at Mach 1.5.
 */
export function trailingEdgeBasis(mach: number): TermBasis {
  const above = FIN_TRAILING_EDGE_MACH_RANGE[0];
  if (mach >= above) {
    return {
      pB: thinLayerBasePressure(mach),
      band: FIN_TRAILING_EDGE_BAND,
      kMach: mach,
      belowBand: false,
    };
  }
  const t = transonicTrailingEdge();
  const e = t.envelope(mach);
  return {
    pB: t.nominal(mach),
    band: {
      low: Math.min(FIN_TRAILING_EDGE_BAND.low, e.low),
      high: Math.max(FIN_TRAILING_EDGE_BAND.high, e.high),
    },
    kMach: above,
    belowBand: true,
  };
}

/**
 * Below Mach 1.5, what the sets reach (0019 section 3.4.1 item 7): the
 * layer parameter, in each of the two nodes either side of the Mach number,
 * and h / c over every set. Throws BaseRefusal outside.
 */
export function transonicCoverage(mach: number, layer: number, hOverC: number): void {
  const t = transonicTrailingEdge();
  const [a, b] = t.bracket(mach);
  const reach = Math.min(a.layerReached, b.layerReached, THICK_LAYER_LIMIT);
  if (layer > reach * (1 + 1e-12)) {
    throw new BaseRefusal(
      'thick-layer',
      `below Mach 1.5 a square trailing edge's base pressure is measured with ` +
        `c/[h Re_c^(1/5)] up to ${reach.toFixed(2)} near Mach ${mach.toFixed(2)} (0019 section ` +
        `3.4.1); this edge has ${layer.toFixed(2)}: its boundary layer is thicker against the edge ` +
        'than any measured there',
    );
  }
  const [h0, h1] = t.hOverCRange;
  if (hOverC < h0 * (1 - 1e-12)) {
    throw new BaseRefusal(
      'thick-layer',
      `below Mach 1.5 square trailing edges are measured from h/c ${h0} (0019 section 3.4.1); this ` +
        `edge has h/c ${hOverC.toFixed(4)}, thinner than any measured there`,
    );
  }
  if (hOverC > h1 * (1 + 1e-12)) {
    throw new BaseRefusal(
      'beyond-read-range',
      `below Mach 1.5 square trailing edges are measured up to h/c ${h1} (0019 section 3.4.1); ` +
        `this edge has h/c ${hOverC.toFixed(4)}, thicker than any measured there`,
    );
  }
}

/** A transition input that leaves the edge laminar below Mach 1.5: not measured (item 1). */
const laminarBelowBand = () =>
  new BaseRefusal(
    'laminar-trailing-edge',
    "below Mach 1.5 a transition input that leaves the trailing edge laminar is refused: TR 1109's " +
      'laminar base pressures start at Mach 1.5, and none below is measured (0019 section 3.4.1)',
  );

export interface LaminarRatio {
  /** Laminar over turbulent base drag: the envelope over M 1.5, 2.0 and 3.1 and both readings. */
  readonly low: number;
  readonly high: number;
  readonly byMach: readonly {
    readonly mach: number;
    readonly low: number;
    readonly high: number;
    readonly extrapolated: boolean;
  }[];
  readonly extrapolated: boolean;
  /** The abscissas: c / [h Re_c^(1/2)] (laminar) and c / [h Re_c^(1/5)] (turbulent). */
  readonly laminarAbscissa: number;
  readonly turbulentAbscissa: number;
}

/** The two readings of TR 1109 fig. 29: (a) turbulent and (b) laminar. */
const FIG29_READINGS = [
  { turbulent: TR1109_FIG29A_TURBULENT, laminar: TR1109_FIG29B_LAMINAR },
  { turbulent: TR1109_FIG29A_TURBULENT_SECOND, laminar: TR1109_FIG29B_LAMINAR_SECOND },
] as const;

/**
 * Laminar over turbulent base drag of a blunt trailing edge of chord over
 * thickness c / h at chord Reynolds number Re_c (TR 1109 fig. 29), the
 * envelope over both readings of each curve; throws BaseRefusal when an
 * abscissa lies beyond one read interval of a curve in either reading.
 */
export function laminarOverTurbulent(chordOverThickness: number, reChord: number): LaminarRatio {
  const xl = chordOverThickness / Math.sqrt(reChord);
  const xt = chordOverThickness / reChord ** 0.2;
  const envelope = (values: readonly (CurveValue | undefined)[], mach: number): CurveValue => {
    const read = values.filter((v): v is CurveValue => v !== undefined);
    if (read.length !== values.length) {
      throw new BaseRefusal(
        'beyond-read-range',
        `the laminar trailing-edge input needs TR 1109 fig. 29 at c/[h Re^(1/2)] = ${xl.toFixed(4)} ` +
          `and c/[h Re^(1/5)] = ${xt.toFixed(3)} at M ${mach}, more than one read ` +
          'interval beyond the curves',
      );
    }
    return {
      low: Math.min(...read.map((c) => c.low)),
      high: Math.max(...read.map((c) => c.high)),
      extrapolated: read.some((c) => c.extrapolated),
    };
  };
  const byMach = TR1109_FIG29A_TURBULENT.map(({ mach }) => {
    const lam = envelope(
      FIG29_READINGS.map((r) => pointsValue(curveAt(r.laminar, mach), xl)),
      mach,
    );
    const tur = envelope(
      FIG29_READINGS.map((r) => pointsValue(curveAt(r.turbulent, mach), xt)),
      mach,
    );
    return {
      mach,
      low: (1 - lam.high) / (1 - tur.low),
      high: (1 - lam.low) / (1 - tur.high),
      extrapolated: lam.extrapolated || tur.extrapolated,
    };
  });
  return {
    low: Math.min(...byMach.map((m) => m.low)),
    high: Math.max(...byMach.map((m) => m.high)),
    byMach,
    extrapolated: byMach.some((m) => m.extrapolated),
    laminarAbscissa: xl,
    turbulentAbscissa: xt,
  };
}

export interface FinTrailingEdgeInput {
  readonly mach: number;
  readonly count: number;
  /** Trailing-edge thickness, uniform along the span, in the reference length's unit. */
  readonly thickness: number;
  readonly span: number;
  /** Chord at the trailing edge, uniform along the span (for c / h and Re_c). */
  readonly chord: number;
  /** tan of the trailing edge's sweep. */
  readonly tanSweep: number;
  /** True when the edges end in the body's base plane (fins at the base). */
  readonly inBasePlane: boolean;
  /** The layer at the trailing edge in the nominal state. */
  readonly layer: 'turbulent' | 'laminar';
  /** Free-stream Reynolds number per unit length. */
  readonly reynoldsPerLength: number;
  /** Transition Reynolds numbers of the transition input (from each fin's leading edge). */
  readonly transitionReynolds?: readonly number[];
  readonly referenceArea: number;
  /**
   * Fins of varying chord (unswept trailing edge): the chord and the
   * trailing-edge thickness at the tip, each varying linearly along the
   * span from `chord` and `thickness` at the root. Omitted: as at the root.
   */
  readonly tipChord?: number;
  readonly tipThickness?: number;
}

/** One state of a transition input on fins of varying chord: the term's change, C_D. */
export interface LaminarState {
  readonly reynolds: number;
  /** The part of the span left laminar at its trailing edge, from 0 to 1. */
  readonly laminarSpanFraction: number;
  readonly low: number;
  readonly high: number;
}

export interface FinTrailingEdgeBase {
  readonly cd: number;
  readonly low: number;
  readonly high: number;
  readonly pB: number;
  readonly label: string;
  /** c / [h Re_c^(1/5)]. */
  readonly thinLayerParameter: number;
  /** The chord Reynolds number; a transition input at or above it leaves the edge laminar. */
  readonly chordReynolds: number;
  /** The vacuum bound on the term, C_D: 2 / (gamma M^2) n h s / A_ref. No value here exceeds it. */
  readonly vacuum: number;
  /** The term with a laminar layer at the edge, C_D: the laminar ratio's ends times the term, at most the vacuum bound. */
  readonly laminarTerm: { readonly low: number; readonly high: number } | undefined;
  /**
   * The term's change from turbulent to laminar, C_D, with zero (zero when
   * no transition input reaches the edge). The band beside the term; a
   * total adds the laminar term to the friction of the same state instead.
   */
  readonly laminarInput: { readonly low: number; readonly high: number };
  /** The laminar ratio, when a transition input reaches the trailing edge. */
  readonly laminar: LaminarRatio | undefined;
  /** The values the vacuum bound clamped, by name ('term', 'band high end', 'laminar high end', ...). */
  readonly vacuumClamped: readonly string[];
  /** The thick-layer factor (at the root on fins of varying chord); 1 for thin layers. */
  readonly thickLayer: ThickLayerFactor;
  /**
   * Fins of varying chord: the term's change in each transition state, in
   * the order of the input (`laminarTerm` and `laminar` are then undefined).
   */
  readonly laminarStates: readonly LaminarState[] | undefined;
}

export const FIN_TRAILING_EDGE_LABEL_ANALOGY =
  'an analogy, not a measurement: the two-dimensional base pressure of free, unswept, blunt ' +
  'trailing edges (RM A51J25 fig. 7 at the free-stream Mach number), carried to edges ending ' +
  "in the body's base plane, which no opened source measures (0008 section 3.4); band " +
  'estimated on TR 1109, RM A51J25 and the X-15 fin, tested only in the total';
export const FIN_TRAILING_EDGE_LABEL_FREE =
  'correlation: two-dimensional base pressure of blunt trailing edges (RM A51J25 fig. 7 at the ' +
  'free-stream Mach number), band estimated on TR 1109, RM A51J25 and the X-15 fin, tested ' +
  'only in the total';

/** Below Mach 1.5 (0019 section 3.4.1): the sets the band is set on, in plain words. */
const TRANSONIC_SETS_WORDS =
  'the base pressure of square trailing edges near Mach 1 on the free-stream Mach number, ' +
  'centred on flat-sided sections measured in flight and in a tunnel (TN 3548, R&M 3427); band ' +
  'the spread of every set about it: wedges (R&M 3348, Johnston), thickened airfoils with ' +
  'thick boundary layers (RM A51J11) and others (RM A51J25), each section whose faces are not ' +
  'flat at the base widened on the side its shape does not bound; never narrower than above ' +
  'Mach 1.5 (0019 section 3.4.1)';
export const FIN_TRAILING_EDGE_LABEL_TRANSONIC_ANALOGY =
  `an analogy, not a measurement: ${TRANSONIC_SETS_WORDS}, carried to edges ending in the ` +
  "body's base plane, which no opened source measures; tested only in the total";
export const FIN_TRAILING_EDGE_LABEL_TRANSONIC_FREE = `estimated on component data: ${TRANSONIC_SETS_WORDS}; tested only in the total`;

const thickLabel = (x: number, belowBand = false) =>
  belowBand
    ? `; a thick layer, c/[h Re_c^(1/5)] ${x.toFixed(2)}: the thin-layer term times TR 1109 fig. ` +
      "29(a)'s fall in base drag at Mach 1.5, held below 1.5 where it is not measured; the " +
      'thick-layer sets near Mach 1 are in the band (0019 section 3.4.1)'
    : `; a thick layer, c/[h Re_c^(1/5)] ${x.toFixed(2)}: the thin-layer term times TR 1109 fig. ` +
      "29(a)'s fall in base drag from 1.0, its two readings and bracketing Mach numbers in the " +
      'band (0016)';

/** The label's first part: free edge or base plane, above or below Mach 1.5. */
const baseLabel = (inBasePlane: boolean, belowBand: boolean) =>
  belowBand
    ? inBasePlane
      ? FIN_TRAILING_EDGE_LABEL_TRANSONIC_ANALOGY
      : FIN_TRAILING_EDGE_LABEL_TRANSONIC_FREE
    : inBasePlane
      ? FIN_TRAILING_EDGE_LABEL_ANALOGY
      : FIN_TRAILING_EDGE_LABEL_FREE;

export function finTrailingEdgeBaseDrag(input: FinTrailingEdgeInput): FinTrailingEdgeBase {
  const { mach, count, thickness, span, chord, reynoldsPerLength, referenceArea } = input;
  const tipChord = input.tipChord ?? chord;
  const tipThickness = input.tipThickness ?? thickness;
  for (const [name, v] of [
    ['thickness', thickness],
    ['span', span],
    ['chord', chord],
    ['reynoldsPerLength', reynoldsPerLength],
    ['referenceArea', referenceArea],
    ['tipChord', tipChord],
    ['tipThickness', tipThickness],
  ] as const) {
    if (!(v >= 0 && Number.isFinite(v))) throw new BaseRefusal('input', `bad ${name} ${v}`);
  }
  if (thickness === 0 && tipThickness === 0) {
    return {
      cd: 0,
      low: 0,
      high: 0,
      pB: 0,
      label: 'sharp trailing edges: no base',
      thinLayerParameter: Infinity,
      chordReynolds: reynoldsPerLength * chord,
      vacuum: 0,
      laminarTerm: undefined,
      laminarInput: { low: 0, high: 0 },
      laminar: undefined,
      vacuumClamped: [],
      thickLayer: NO_THICK_LAYER,
      laminarStates: undefined,
    };
  }
  const lo = TRANSONIC_TE_MACH_RANGE[0];
  const hi = FIN_TRAILING_EDGE_MACH_RANGE[1];
  if (!(mach >= lo && mach <= hi)) {
    throw new BaseRefusal(
      'mach-range',
      `the two-dimensional trailing-edge base pressure's band is estimated at Mach ${lo} to ${hi} ` +
        `(below ${FIN_TRAILING_EDGE_MACH_RANGE[0]} on 0019 section 3.4.1's sets), asked Mach ${mach}`,
    );
  }
  if (input.tanSweep !== 0) {
    throw new BaseRefusal(
      'swept-trailing-edge',
      'swept blunt trailing edges are refused: with 45 deg of sweep the base pressure was 20% to ' +
        '50% higher at M 1.41 and 1.96 (RM A51J25 p. 17), which the band does not carry',
    );
  }
  if (input.layer !== 'turbulent') {
    throw new BaseRefusal(
      'laminar-trailing-edge',
      'a laminar layer at the trailing edge is refused: its base pressure depends strongly on ' +
        'Reynolds number (TR 1109), and the band is set on turbulent layers',
    );
  }
  if (tipChord !== chord || tipThickness !== thickness) {
    return varyingChordTrailingEdge(input, tipChord, tipThickness);
  }
  const reChord = reynoldsPerLength * chord;
  const thin = chord / (thickness * reChord ** 0.2);
  const basis = trailingEdgeBasis(mach);
  if (basis.belowBand) {
    transonicCoverage(mach, thin, thickness / chord);
    if ((input.transitionReynolds ?? []).some((reT) => reT >= reChord)) throw laminarBelowBand();
  }
  const k = thickLayerFactor(basis.kMach, thin);
  const pB = basis.pB;
  const area = (count * thickness * span) / referenceArea;
  const vacuum = vacuumBaseDrag(mach, GAMMA) * area;
  const vacuumClamped: string[] = [];
  const atMostVacuum = (value: number, what: string) => {
    if (value <= vacuum) return value;
    vacuumClamped.push(what);
    return vacuum;
  };
  const cd = atMostVacuum(-pB * area * k.nominal, 'term');
  const reaches = (input.transitionReynolds ?? []).some((reT) => reT >= reChord);
  const laminar = reaches ? laminarOverTurbulent(chord / thickness, reChord) : undefined;
  const laminarTerm =
    laminar === undefined
      ? undefined
      : {
          low: atMostVacuum(laminar.low * cd, 'laminar low end'),
          high: atMostVacuum(laminar.high * cd, 'laminar high end'),
        };
  const base = baseLabel(input.inBasePlane, basis.belowBand);
  return {
    cd,
    low: atMostVacuum(basis.band.low * cd * (k.low / k.nominal), 'band low end'),
    high: atMostVacuum(basis.band.high * cd * (k.high / k.nominal), 'band high end'),
    pB,
    label: thin > THIN_LAYER_LIMIT ? base + thickLabel(thin, basis.belowBand) : base,
    thinLayerParameter: thin,
    chordReynolds: reChord,
    vacuum,
    laminarTerm,
    laminarInput:
      laminarTerm === undefined
        ? { low: 0, high: 0 }
        : { low: Math.min(0, laminarTerm.low - cd), high: Math.max(0, laminarTerm.high - cd) },
    laminar,
    vacuumClamped,
    thickLayer: k,
    laminarStates: undefined,
  };
}

/**
 * The term on fins of varying chord with an unswept trailing edge (0016,
 * W3(b)): chord and thickness linear along the span, integrated by
 * Gauss-Legendre with the local thin-layer parameter and thick-layer factor.
 * A transition state leaves laminar the stations whose chord Reynolds number
 * it reaches; their laminar change (TR 1109 fig. 29 at each station) is
 * integrated over that interval of the span alone. Each band end and each
 * state's term is at most the vacuum bound.
 */
function varyingChordTrailingEdge(
  input: FinTrailingEdgeInput,
  tipChord: number,
  tipThickness: number,
): FinTrailingEdgeBase {
  const { mach, count, thickness, span, chord, reynoldsPerLength, referenceArea } = input;
  const chordAt = (y: number) => chord + ((tipChord - chord) * y) / span;
  const thicknessAt = (y: number) => thickness + ((tipThickness - thickness) * y) / span;
  const parameter = (y: number) => {
    const c = chordAt(y);
    return c / (thicknessAt(y) * (reynoldsPerLength * c) ** 0.2);
  };
  if (!(Math.min(thickness, tipThickness) > 0 && Math.min(chord, tipChord) > 0)) {
    throw new BaseRefusal('input', 'a blunt trailing edge needs a positive thickness and chord');
  }
  const basis = trailingEdgeBasis(mach);
  const pB = basis.pB;
  const rule = gaussLegendre(VARYING_CHORD_NODES);
  const scale = count / referenceArea;
  // Every station's parameter is checked, the ends included (the refusals of thickLayerFactor,
  // and below Mach 1.5 what the sets reach, 0019 section 3.4.1).
  const stations = [0, ...Array.from(rule.nodes, (n) => 0.5 * span * (n + 1)), span];
  if (basis.belowBand) {
    for (const y of stations) transonicCoverage(mach, parameter(y), thicknessAt(y) / chordAt(y));
    const shortest = Math.min(chord, tipChord);
    if ((input.transitionReynolds ?? []).some((reT) => reT >= reynoldsPerLength * shortest)) {
      throw laminarBelowBand();
    }
  }
  const factors = stations.map((y) => thickLayerFactor(basis.kMach, parameter(y)));
  let cd = 0;
  let lowSum = 0;
  let highSum = 0;
  rule.weights.forEach((w, i) => {
    const y = stations[i + 1]!;
    const k = factors[i + 1]!;
    const d = 0.5 * span * w * -pB * thicknessAt(y) * scale;
    cd += d * k.nominal;
    lowSum += d * k.low;
    highSum += d * k.high;
  });
  const vacuum = vacuumBaseDrag(mach, GAMMA) * scale * 0.5 * span * (thickness + tipThickness);
  const vacuumClamped: string[] = [];
  const atMostVacuum = (value: number, what: string) => {
    if (value <= vacuum) return value;
    vacuumClamped.push(what);
    return vacuum;
  };
  cd = atMostVacuum(cd, 'term');
  const sub = gaussLegendre(LAMINAR_NODES);
  // Near a small tip the stations can lie beyond fig. 29's read range for the laminar input
  // (c/[h Re^(1/2)] small), where fig. 29(b)'s laminar base pressure keeps falling: that sliver
  // takes the laminar change bounded below by the smaller of none and its value at the nearest
  // station read, and above by the vacuum bound, instead of the whole term being refused (0016
  // sections 16 and 18).
  const scan = Array.from({ length: SCAN_STATIONS + 1 }, (_, k) => (span * k) / SCAN_STATIONS);
  const ratioAt = (y: number): LaminarRatio | undefined => {
    try {
      const c = chordAt(y);
      return laminarOverTurbulent(c / thicknessAt(y), reynoldsPerLength * c);
    } catch (e) {
      if (e instanceof BaseRefusal && e.reason === 'beyond-read-range') return undefined;
      throw e;
    }
  };
  // The scan is made only when a sliver needs it (most calls have none), and once.
  let readableScan: (LaminarRatio | undefined)[] | undefined;
  const readable = () => (readableScan ??= scan.map(ratioAt));
  const vacuumOverTerm = (y: number) =>
    vacuumBaseDrag(mach, GAMMA) / (-pB * thickLayerFactor(basis.kMach, parameter(y)).nominal);
  let sliverMax = 0;
  const laminarStates = (input.transitionReynolds ?? []).map((reT): LaminarState => {
    // The stations laminar at their trailing edge: Re' c(y) <= Re_T, an interval of the span.
    const cT = reT / reynoldsPerLength;
    let y0 = 0;
    let y1 = span;
    if (tipChord === chord) {
      if (cT < chord) y1 = 0;
    } else {
      const yT = ((cT - chord) * span) / (tipChord - chord);
      if (tipChord < chord) y0 = Math.min(span, Math.max(0, yT));
      else y1 = Math.min(span, Math.max(0, yT));
    }
    if (!(y1 > y0)) return { reynolds: reT, laminarSpanFraction: 0, low: 0, high: 0 };
    let low = 0;
    let high = 0;
    let sliver = 0;
    sub.weights.forEach((w, i) => {
      const y = y0 + 0.5 * (y1 - y0) * (sub.nodes[i]! + 1);
      const h = thicknessAt(y);
      let ratio = ratioAt(y);
      if (ratio === undefined) {
        let best: LaminarRatio | undefined;
        let dist = Infinity;
        readable().forEach((r, k) => {
          if (r !== undefined && Math.abs(scan[k]! - y) < dist) {
            dist = Math.abs(scan[k]! - y);
            best = r;
          }
        });
        if (best === undefined) {
          const c = chordAt(y);
          laminarOverTurbulent(c / h, reynoldsPerLength * c); // throws the refusal
          throw new BaseRefusal('beyond-read-range', 'no station of the span is read');
        }
        ratio = { ...best, low: Math.min(best.low, 1), high: Math.max(vacuumOverTerm(y), 1) };
        sliver += (0.5 * w * (y1 - y0)) / span;
      }
      const term =
        0.5 * (y1 - y0) * w * -pB * h * scale * thickLayerFactor(basis.kMach, parameter(y)).nominal;
      low += (ratio.low - 1) * term;
      high += (ratio.high - 1) * term;
    });
    sliverMax = Math.max(sliverMax, sliver);
    const lowTerm = atMostVacuum(cd + low, 'laminar low end');
    const highTerm = atMostVacuum(cd + high, 'laminar high end');
    return {
      reynolds: reT,
      laminarSpanFraction: (y1 - y0) / span,
      low: lowTerm - cd,
      high: highTerm - cd,
    };
  });
  const xRoot = parameter(0);
  const xMax = Math.max(...stations.map(parameter));
  const base = baseLabel(input.inBasePlane, basis.belowBand);
  // Stations below fig. 29(a)'s lowest read abscissa take the thin-layer term unchanged.
  const belowRead = scan.filter((y) => parameter(y) < FIG29A_LOWEST_READ).length / scan.length;
  const tipLabels =
    (belowRead > 0
      ? `; near the tip, over ${(100 * belowRead).toFixed(0)}% of the span, c/[h Re_c^(1/5)] is below ` +
        `${FIG29A_LOWEST_READ}, fig. 29(a)'s lowest read abscissa, and the thin-layer term is taken ` +
        'there unchanged (from 0.45 to 1.0 fig. 29(a) varies by up to 4.2% of its value at 1.0, at ' +
        'M 3.1; an extrapolation, 0016)'
      : '') +
    (sliverMax > 0
      ? `; in a transition state, the stations beyond fig. 29's read range (up to ` +
        `${(100 * sliverMax).toFixed(0)}% of the span, near the tip), where its laminar base ` +
        'pressure keeps falling, take the laminar change bounded below by the smaller of none and ' +
        'its value at the nearest station read and above by the vacuum bound (0016)'
      : '');
  return {
    cd,
    low: atMostVacuum(basis.band.low * lowSum, 'band low end'),
    high: atMostVacuum(basis.band.high * highSum, 'band high end'),
    pB,
    label:
      base +
      '; on fins of varying chord, integrated along the span with the local chord (0016)' +
      (xMax > THIN_LAYER_LIMIT
        ? thickLabel(xMax, basis.belowBand).replace('c/[h', 'largest c/[h')
        : '') +
      tipLabels,
    thinLayerParameter: xRoot,
    chordReynolds: reynoldsPerLength * chord,
    vacuum,
    laminarTerm: undefined,
    laminarInput: {
      low: Math.min(0, ...laminarStates.map((l) => l.low)),
      high: Math.max(0, ...laminarStates.map((l) => l.high)),
    },
    laminar: undefined,
    vacuumClamped,
    thickLayer: factors[0]!,
    laminarStates,
  };
}

/** Stations scanned along the span for the tip's read-range checks (0016 section 16). */
const SCAN_STATIONS = 400;
/** TR 1109 fig. 29(a)'s lowest read abscissa, c / [h Re_c^(1/5)]. */
const FIG29A_LOWEST_READ = 0.45;
/** Gauss-Legendre nodes along the span for fins of varying chord. */
const VARYING_CHORD_NODES = 32;
/** Gauss-Legendre nodes over the laminar part of the span in a transition state. */
const LAMINAR_NODES = 64;
