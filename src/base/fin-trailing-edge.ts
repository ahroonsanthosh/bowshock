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
 * correlation.
 *
 * Refused (`BaseRefusal`):
 * - Mach numbers outside 1.5 to 3.2 (the evidence's range);
 * - swept trailing edges (base pressure 20% to 50% higher at M 1.41 and
 *   1.96 with 45 deg of sweep, RM A51J25 p. 17);
 * - a laminar layer at the trailing edge (base pressure then depends
 *   strongly on Reynolds number, TR 1109 p. 1);
 * - thick layers, c / [h Re_c^(1/5)] > 1.0: up to 1.0 TR 1109 fig. 29(a)'s
 *   base drag lies within 0.4%, 1.4% and 1.8% of its value at its lowest
 *   read abscissa at M 1.5, 2.0 and 3.1 in the first reading (from X 0.5,
 *   0.5 and 0.75), within 0.2%, 1.5% and 4.0% in the second (from X 0.45);
 *   beyond, it falls by up to 12% to 29% at 4.5 (11% to 31% in the second
 *   reading), which the thin-layer curve does not carry.
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
import { BaseRefusal } from './refusal';
import { vacuumBaseDrag } from './vacuum';

const GAMMA = 1.4;

/** Mach numbers of the band's evidence. */
export const FIN_TRAILING_EDGE_MACH_RANGE = [1.5, 3.2] as const;
/** Largest c / [h Re_c^(1/5)] counted a thin layer (TR 1109 fig. 29(a)). */
export const THIN_LAYER_LIMIT = 1.0;

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
}

export const FIN_TRAILING_EDGE_LABEL_ANALOGY =
  'an analogy, not a measurement: the two-dimensional base pressure of free, unswept, blunt ' +
  'trailing edges (RM A51J25 fig. 7 at the free-stream Mach number), carried to edges ending ' +
  "in the body's base plane, which no opened source measures (0008 section 3.4)";
export const FIN_TRAILING_EDGE_LABEL_FREE =
  'correlation: two-dimensional base pressure of blunt trailing edges (RM A51J25 fig. 7 at the ' +
  'free-stream Mach number), band estimated on TR 1109, RM A51J25 and the X-15 fin, tested ' +
  'only in the total';

export function finTrailingEdgeBaseDrag(input: FinTrailingEdgeInput): FinTrailingEdgeBase {
  const { mach, count, thickness, span, chord, reynoldsPerLength, referenceArea } = input;
  for (const [name, v] of [
    ['thickness', thickness],
    ['span', span],
    ['chord', chord],
    ['reynoldsPerLength', reynoldsPerLength],
    ['referenceArea', referenceArea],
  ] as const) {
    if (!(v >= 0 && Number.isFinite(v))) throw new BaseRefusal('input', `bad ${name} ${v}`);
  }
  if (thickness === 0) {
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
    };
  }
  const [lo, hi] = FIN_TRAILING_EDGE_MACH_RANGE;
  if (!(mach >= lo && mach <= hi)) {
    throw new BaseRefusal(
      'mach-range',
      `the two-dimensional trailing-edge base pressure's band is estimated at Mach ${lo} to ${hi}, ` +
        `asked Mach ${mach}`,
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
  const reChord = reynoldsPerLength * chord;
  const thin = chord / (thickness * reChord ** 0.2);
  if (thin > THIN_LAYER_LIMIT) {
    throw new BaseRefusal(
      'thick-layer',
      `c/[h Re_c^(1/5)] = ${thin.toFixed(3)} exceeds ${THIN_LAYER_LIMIT}: the boundary layer is ` +
        "thick against the edge, where TR 1109 fig. 29(a)'s base drag falls by up to 12% to 29%, " +
        'which the thin-layer curve does not carry',
    );
  }
  const pB = thinLayerBasePressure(mach);
  const area = (count * thickness * span) / referenceArea;
  const vacuum = vacuumBaseDrag(mach, GAMMA) * area;
  const vacuumClamped: string[] = [];
  const atMostVacuum = (value: number, what: string) => {
    if (value <= vacuum) return value;
    vacuumClamped.push(what);
    return vacuum;
  };
  const cd = atMostVacuum(-pB * area, 'term');
  const reaches = (input.transitionReynolds ?? []).some((reT) => reT >= reChord);
  const laminar = reaches ? laminarOverTurbulent(chord / thickness, reChord) : undefined;
  const laminarTerm =
    laminar === undefined
      ? undefined
      : {
          low: atMostVacuum(laminar.low * cd, 'laminar low end'),
          high: atMostVacuum(laminar.high * cd, 'laminar high end'),
        };
  return {
    cd,
    low: atMostVacuum(FIN_TRAILING_EDGE_BAND.low * cd, 'band low end'),
    high: atMostVacuum(FIN_TRAILING_EDGE_BAND.high * cd, 'band high end'),
    pB,
    label: input.inBasePlane ? FIN_TRAILING_EDGE_LABEL_ANALOGY : FIN_TRAILING_EDGE_LABEL_FREE,
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
  };
}
