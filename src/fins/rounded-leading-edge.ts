/**
 * Rounded fin leading edges at zero incidence: step B4's rounded-edge
 * term (docs/design/0008-total-drag.md, sections 4.1 and 6.2), with the
 * choices of docs/design/0010-base-drag-and-total.md section 5, made from
 * geometry, physics and the component data alone before the Basic Finner
 * gate was run.
 *
 * **Geometry.** A single wedge of chord c ending in a blunt trailing edge
 * of half-thickness h, its leading edge rounded to a circle of radius r
 * whose front is at x = 0: the faces are tangent to the circle and pass
 * through the trailing-edge corners (c, +-h), so their angle delta to the
 * stream solves h cos(delta) - (c - r) sin(delta) = r. The rounded nose
 * spans the circle's front up to the tangent points, at polar angles
 * +-(90 deg - delta) from the stagnation line, of frontal height
 * 2 r cos(delta); each face rises h - r cos(delta). (For the Basic Finner,
 * r = 0.004 and h = 0.04 on c = 1 give delta = 2.07 deg, against the 2.29
 * deg of a sharp wedge through the same corners.)
 *
 * **The nose.** Its pressure drag per unit span is the modified-Newtonian
 * front side, Cp = Cp_pitot cos^2(phi) over the arc,
 *
 *   D / (q s) = Cp_pitot r 2 (cos(delta) - cos^3(delta) / 3),
 *
 * which is (2/3) Cp_pitot (2 r) to within 1e-6 at these angles, Cp_pitot
 * from Rayleigh's pitot formula. Band, measured over modelled: TN 2960's
 * cylinder normal to the stream, front side (0 to 90 deg of fig. 5(c),
 * trapezoid rule) over (2/3) Cp_pitot, at M 1.49, 1.98 and 2.90: 0.995,
 * 1.043 and 1.056 on the first reading (with its corrected value at M 1.98
 * and 45 deg), 1.002, 1.049 and 1.052 on the second; the envelope of both,
 * 0.995 to 1.056, rounded outward: **0.99 to 1.06** (./tn2960.ts).
 * Labelled "an analogy, not a measurement" and "tested only in the total"
 * (0010 section 7): behind a fin's edge are the fin's faces, not the
 * cylinder's separated wake, and the nose's effect on the faces (its
 * entropy layer, the overexpansion behind the shoulder) is not modelled;
 * no opened source measures it.
 *
 * **Domain** (0010 section 5, ruled on before the gate). TN 2960 covers
 * M 1.49 to 2.90 and Re_D 1e5 to 1e6. Beyond it:
 * - M 2.48 to 3.0 at Re_D down to 6.7e3: covered by RM A55H31's statement
 *   that the front-half pressure distribution, as a ratio to the impact
 *   pressure, is a unique function of azimuth over Re 6.7e3 to 1.4e5 and
 *   M 2.48 to 6.86 (pp. 13 to 14); same band;
 * - M below 2.48 at Re_D 6.7e3 to 1e5: no measurement covers it; the band
 *   is widened by +-3% of the term, an allowance for an unmeasured regime
 *   set from the boundary-layer displacement scale (about 1% to 2% of D at
 *   Re_D 1e4, doubled), not from data; labelled "extrapolated in Reynolds
 *   number".
 * Refused: M below 1.49 or above 3.0, Re_D below 6.7e3 or above 1e6 (TN
 * 2960's highest; no opened source measures the front side above it, and
 * the +-3% allowance, set from the displacement scale at low Reynolds
 * number, says nothing about a cylinder whose layer may turn turbulent
 * before separation; round 5, finding 11), and sections other than a single
 * wedge or a flat plate.
 *
 * **Flat plates** (docs/design/0016-fin-edges-of-flat-plates.md, W4(a)): the
 * rounded wedge's limit, face angle zero, a semicircular nose of radius half
 * the thickness: (2/3) Cp_pitot (2 r) per unit span, the same at every
 * station whatever the chord (W4(b)). The plate's faces are parallel to the
 * stream, so the overexpansion behind the shoulder acts normal to it and
 * carries no drag; at supersonic normal Mach numbers the flow past the
 * cylinder's sonic point is supersonic, so the cylinder's front half and the
 * plate's nose see the same inviscid flow up to 90 deg. Still labelled an
 * analogy: no source measures a fin's edge.
 *
 * **Swept edges** (0016, W4(c)): the independence principle, exact for the
 * inviscid flow past an infinite swept cylinder: the front side at the
 * normal Mach number M_n = M cos(sweep) on the normal dynamic pressure,
 *
 *   D / (q s) = Cp_pitot(M_n) cos^2(sweep) r 2 (cos(delta) - cos^3(delta) / 3),
 *
 * per unit span, with the domain and regime (TN 2960, RM A55H31, the +-3%
 * allowance) decided on M_n and the Reynolds number on the normal
 * component. Its error is measured on yawed cylinders (RM A55H31 figs. 11
 * and 12, ./rm-a55h31.ts): the yawed front side (gauge) over this model,
 * relative to the unyawed, 0.990 to 1.067 over the checks the reports do not
 * set apart, so the band is TN 2960's times 0.99 to 1.07, rounded outward.
 * Swept edges are served to 60 deg (the checks reach 59.9 deg; at 75 deg
 * the only point has an end effect).
 *
 * **Normal Mach numbers 1.0 to 1.49** (0016 section 11, W4(e), on flat
 * plates and rounded wedges): the same analogy, the normal flow sonic or
 * faster, so the surface flow is supersonic from the sonic point (about 50
 * deg) to 90 deg and the edge's nose, up to its tangent points, and the
 * cylinder's front half see the same flow. The term is
 * the modified-Newtonian one times kappa(M_n), the cylinder's front side
 * over modified Newtonian, measured at M 1.0, 1.1 and 1.2 (NASA CR-149372
 * fig. 8b, ./macha.ts: 0.762, 0.831, 0.898 on the first reading) and taken
 * as 1 at 1.49 (the term above), nominal linear between the nodes. Band:
 * from the lowest to the highest of the bracketing nodes' ranges (each
 * node's readings widened by a 1% reading error and by fig. 5's blockage
 * and run spread at M 1.0; the 1.49 node's range is TN 2960's band), so
 * across 1.2 to 1.49, where nothing is measured, the band spans both sides
 * (0014 W4(d) as amended by 0016). Swept, the sweep allowance is
 * extrapolated from M_n 3.4 down to these normal Mach numbers and widened
 * to twice its measured deviation from 1 (0.98 to 1.14).
 *
 * **Normal Mach numbers below 1.0** stay refused (0016, W4(d)): below Mach 1 a cylinder's front side is set by its
 * separation and wake (TN 2960 figs. 5(a), 5(b), 5(e): 0.10 to 0.39 of the
 * modified-Newtonian value at M 0.05 to 0.70, and a thrust above the
 * critical Reynolds number), which a plate's edge, followed by its faces,
 * does not have, and the normal flow is subsonic, so the faces are felt at
 * the nose; no source measures a rounded nose followed by flat faces there,
 * and the leading-edge bluntness series at subsonic leading edges (RM
 * L53L24a, NASA TP 2204, NASA TN D-3634) are of airfoil noses.
 */

import { normalShock, stagnationPressureRatio } from '../validation/gas-dynamics';
import { MACHA_FIG5, MACHA_FIG8B, MACHA_READINGS } from './macha';
import { FinRefusal } from './refusal';
import {
  RM_A55H31_FIG11,
  RM_A55H31_FIG12,
  RM_A55H31_READINGS,
  RM_A55H31_TABLE2,
} from './rm-a55h31';
import { TN2960_FIG5C, TN2960_FIG5C_SECOND, TN2960_FRONT_SIDES } from './tn2960';

const GAMMA = 1.4;
const DEG = Math.PI / 180;

/** Rayleigh's pitot pressure coefficient. */
export function pitotPressureCoefficient(mach: number, gamma = GAMMA): number {
  const shock = normalShock(mach, gamma);
  const p02 = shock.pressureRatio * stagnationPressureRatio(shock.downstreamMach, gamma);
  return (p02 - 1) / (0.5 * gamma * mach * mach);
}

/**
 * TN 2960 fig. 5(c) integrated by the trapezoid rule: front (0 to 90
 * deg), rear, total, on D; the first reading unless another is given.
 */
export function tn2960Integrated(reading: typeof TN2960_FIG5C = TN2960_FIG5C): {
  readonly mach: number;
  readonly front: number;
  readonly rear: number;
  readonly frontOverModifiedNewtonian: number;
}[] {
  return reading.map((c) => {
    let front = 0;
    let rear = 0;
    for (let k = 0; k + 1 < c.points.length; k++) {
      const a = c.points[k]!;
      const b = c.points[k + 1]!;
      const area =
        0.5 *
        (a.p * Math.cos(a.theta * DEG) + b.p * Math.cos(b.theta * DEG)) *
        (b.theta - a.theta) *
        DEG;
      if (b.theta <= 90) front += area;
      else rear += area;
    }
    return {
      mach: c.mach,
      front,
      rear,
      frontOverModifiedNewtonian: front / ((2 / 3) * pitotPressureCoefficient(c.mach)),
    };
  });
}

/** The stagnation pressure coefficient: Rayleigh's pitot formula above Mach 1, isentropic below. */
export function stagnationPressureCoefficient(mach: number, gamma = GAMMA): number {
  if (mach >= 1) return pitotPressureCoefficient(mach, gamma);
  const p0 = (1 + 0.5 * (gamma - 1) * mach * mach) ** (gamma / (gamma - 1));
  return (p0 - 1) / (0.5 * gamma * mach * mach);
}

/** Trapezoid rule of P cos(theta) over 0 to 90 deg (degrees), on the diameter. */
function frontSide(points: readonly { readonly theta: number; readonly p: number }[]): number {
  let s = 0;
  for (let k = 0; k + 1 < points.length; k++) {
    const a = points[k]!;
    const b = points[k + 1]!;
    if (b.theta > 90 + 1e-9) break;
    s +=
      0.5 *
      (a.p * Math.cos(a.theta * DEG) + b.p * Math.cos(b.theta * DEG)) *
      (b.theta - a.theta) *
      DEG;
  }
  return s;
}

/** `frontSide` of points in any order, cut at 90 deg (interpolated there). */
function frontToNinety(points: readonly { readonly theta: number; readonly p: number }[]): number {
  const s = [...points].sort((a, b) => a.theta - b.theta);
  const k = s.findIndex((q) => q.theta > 90);
  if (k > 0) {
    const a = s[k - 1]!;
    const b = s[k]!;
    s.splice(k, s.length - k, {
      theta: 90,
      p: a.p + ((b.p - a.p) * (90 - a.theta)) / (b.theta - a.theta),
    });
  }
  return frontSide(s);
}

/**
 * TN 2960's other front sides (figs. 5(a), 5(b), 5(d), 5(e); ./tn2960.ts)
 * over (2/3) of the stagnation coefficient: a set without a value at 0 deg
 * starts at the stagnation coefficient; one that passes 90 deg is
 * interpolated there.
 */
export function tn2960FrontSides(): {
  readonly figure: string;
  readonly item: string;
  readonly mach: number;
  readonly front: number;
  readonly ratio: number;
}[] {
  return TN2960_FRONT_SIDES.map((c) => {
    const cp0 = stagnationPressureCoefficient(c.mach);
    const pts = c.stagnation ? [{ theta: 0, p: cp0 }, ...c.points] : [...c.points];
    const k = pts.findIndex((q) => q.theta > 90);
    if (k > 0) {
      const a = pts[k - 1]!;
      const b = pts[k]!;
      pts.splice(k, pts.length - k, {
        theta: 90,
        p: a.p + ((b.p - a.p) * (90 - a.theta)) / (b.theta - a.theta),
      });
    }
    const front = frontSide(pts);
    return { figure: c.figure, item: c.item, mach: c.mach, front, ratio: front / ((2 / 3) * cp0) };
  });
}

/** One yawed-cylinder check of the independence principle (RM A55H31 figs. 11, 12). */
export interface SweepCheck {
  readonly source: string;
  readonly mach: number;
  readonly yaw: number;
  readonly normalMach: number;
  /** Fig. 12's ratio on gauge pressures. */
  readonly gauge: number;
  /** The independence model's ratio, cos^3(L) Cp_pitot(M cos L) / Cp_pitot(M). */
  readonly model: number;
  /** Measured over modelled. */
  readonly r: number;
  readonly flag: string | undefined;
}

/**
 * The independence principle on RM A55H31 (0016, W4(c)): each fig. 12
 * ratio, on absolute pressures as eq. (14), converted to gauge pressures
 * with fig. 11's stagnation ratio S (times Rayleigh's p_t2 / p_inf) and the
 * unyawed shape integral I_g of table II at yaw 0, gauge = ratio [1 - 1 /
 * (S I_g)] / [1 - 1 / (S_0 I_g)], then over the model per unit length of
 * the cylinder, cos^3(L) Cp_pitot(M cos L) / Cp_pitot(M).
 */
export function sweepChecks(
  fig12: typeof RM_A55H31_FIG12 = RM_A55H31_FIG12,
  fig11: typeof RM_A55H31_FIG11 = RM_A55H31_FIG11,
): SweepCheck[] {
  const t0 = RM_A55H31_TABLE2.find((t) => t.yaw === 0)!;
  const shape = t0.p.map((p, k) => ({ theta: 15 * k, p: p / t0.p[0]! }));
  const ig = frontSide(shape);
  const p0p = (m: number) => 1 + 0.5 * GAMMA * m * m * pitotPressureCoefficient(m);
  return fig12.map((pt) => {
    const st = fig11
      .filter((q) => q.mach === pt.mach)
      .reduce((a, b) => (Math.abs(b.yaw - pt.yaw) < Math.abs(a.yaw - pt.yaw) ? b : a));
    const pt2 = p0p(pt.mach);
    const gauge = (pt.value * (1 - 1 / (st.value * pt2 * ig))) / (1 - 1 / (pt2 * ig));
    const L = pt.yaw * DEG;
    const normalMach = pt.mach * Math.cos(L);
    const model =
      (Math.cos(L) ** 3 * pitotPressureCoefficient(normalMach)) / pitotPressureCoefficient(pt.mach);
    return {
      source: pt.source,
      mach: pt.mach,
      yaw: pt.yaw,
      normalMach,
      gauge,
      model,
      r: gauge / model,
      flag: pt.flag,
    };
  });
}

/** The sweep allowance: the checks the reports do not set apart, rounded outward. */
export const SWEEP_ALLOWANCE = (() => {
  const r = sweepChecks()
    .filter((c) => c.flag === undefined)
    .map((c) => c.r);
  return {
    low: Math.floor(Math.min(...r) * 100 + 1e-9) / 100,
    high: Math.ceil(Math.max(...r) * 100 - 1e-9) / 100,
  };
})();
/** The largest sweep served: the largest yaw among the checks the reports do not set apart. */
export const SWEEP_LIMIT_DEGREES = 60;

/** The nose term's band, measured over modelled: TN 2960's ratios, both readings, rounded outward. */
export const ROUNDED_EDGE_BAND = (() => {
  const r = [TN2960_FIG5C, TN2960_FIG5C_SECOND].flatMap((reading) =>
    tn2960Integrated(reading).map((x) => x.frontOverModifiedNewtonian),
  );
  return {
    low: Math.floor(Math.min(...r) * 100 + 1e-9) / 100,
    high: Math.ceil(Math.max(...r) * 100 - 1e-9) / 100,
  };
})();

/** The domain of the term without kappa (from M_n 1.0 to 1.49 with it: `TRANSONIC_NODES`). */
export const ROUNDED_EDGE_MACH_RANGE = [1.49, 3.0] as const;

/**
 * NASA CR-149372 fig. 8b's front sides (0 to 90 deg, trapezoid rule over
 * the symbols and the faired curve together) over (2/3) Cp_pitot at the
 * test Mach number: kappa, measured over modelled (0016 section 11).
 */
export function machaFrontSides(reading: typeof MACHA_FIG8B = MACHA_FIG8B): {
  readonly mach: number;
  readonly front: number;
  readonly ratio: number;
}[] {
  return reading.map((c) => {
    const front = frontToNinety(c.points);
    return { mach: c.mach, front, ratio: front / ((2 / 3) * pitotPressureCoefficient(c.mach)) };
  });
}

/** The readings of fig. 8b held (the second to be added beside the first). */
const MACHA_FIG8B_HELD: readonly (typeof MACHA_FIG8B)[] = [MACHA_FIG8B];

/**
 * Fig. 5 at M 1.0: each cylinder's front side, fig. 8b's M 1.0 points below
 * 44 deg (where fig. 5 starts) and fig. 5's from there (the shared curve to
 * 78 deg, the cylinder's own points beyond), over fig. 8b's own: the
 * change with blockage (3.1% to 8.4%) and run (Re_d 1.9e5 against 2.8e5
 * to 3.3e5).
 */
export function machaBlockageSpread(): {
  readonly diameterCm: number;
  readonly blockage: number;
  readonly change: number;
}[] {
  const m10 = MACHA_FIG8B.find((c) => c.mach === 1.0)!;
  const own = frontToNinety(m10.points);
  const start = Math.min(...MACHA_FIG5.common.map((q) => q.theta));
  const below = m10.points.filter((q) => q.theta < start);
  const common = MACHA_FIG5.common.filter((q) => q.theta <= 78);
  return MACHA_FIG5.branches.map((b) => ({
    diameterCm: b.diameterCm,
    blockage: b.blockage,
    change: frontToNinety([...below, ...common, ...b.points]) / own - 1,
  }));
}

/** The reading error allowed on each CR-149372 node's ratio (0016 section 11). */
export const MACHA_READING_ERROR = 0.01;

/** One node of kappa(M_n), the front side over modified Newtonian. */
export interface FrontSideNode {
  readonly mach: number;
  readonly nominal: number;
  readonly low: number;
  readonly high: number;
  readonly source: 'NASA CR-149372 fig. 8b' | 'TN 2960';
}

/**
 * kappa's nodes: CR-149372 at M 1.0, 1.1, 1.2 (nominal the mean of the
 * readings held; range the lowest and highest reading widened by the
 * reading error and by fig. 5's spread), and the term above at 1.49
 * (nominal 1, range TN 2960's band).
 */
export const TRANSONIC_NODES: readonly FrontSideNode[] = (() => {
  const spread = machaBlockageSpread().map((s) => s.change);
  const sLow = Math.min(0, ...spread);
  const sHigh = Math.max(0, ...spread);
  const per = MACHA_FIG8B_HELD.map((r) => machaFrontSides(r));
  const nodes: FrontSideNode[] = MACHA_FIG8B.map((c, i) => {
    const r = per.map((x) => x[i]!.ratio);
    return {
      mach: c.mach,
      nominal: r.reduce((a, b) => a + b, 0) / r.length,
      low: Math.min(...r) * (1 - MACHA_READING_ERROR) * (1 + sLow),
      high: Math.max(...r) * (1 + MACHA_READING_ERROR) * (1 + sHigh),
      source: 'NASA CR-149372 fig. 8b',
    };
  });
  nodes.push({
    mach: ROUNDED_EDGE_MACH_RANGE[0],
    nominal: 1,
    low: ROUNDED_EDGE_BAND.low,
    high: ROUNDED_EDGE_BAND.high,
    source: 'TN 2960',
  });
  return nodes;
})();

/** The highest CR-149372 node: above it, to 1.49, nothing is measured. */
export const MEASURED_TRANSONIC_LIMIT = 1.2;

/** kappa at a normal Mach number of 1.0 to 1.49: nominal, range, and the nodes it rests on. */
export interface TransonicFrontSide {
  readonly nominal: number;
  readonly low: number;
  readonly high: number;
  readonly machNodes: readonly number[];
}

/**
 * kappa(M_n) for 1.0 <= M_n < 1.49 (0016 section 11): nominal linear
 * between the bracketing nodes, range from the lower of their lows to the
 * higher of their highs (at a node, its own).
 */
export function transonicFrontSide(normalMach: number): TransonicFrontSide {
  const nodes = TRANSONIC_NODES;
  const first = nodes[0]!.mach;
  const last = nodes[nodes.length - 1]!.mach;
  if (!(normalMach >= first && normalMach <= last)) {
    throw new FinRefusal(
      'leading-edge-range',
      `kappa is measured from M_n ${first} to ${last}, asked ${normalMach}`,
    );
  }
  let k = 0;
  while (k + 2 < nodes.length && normalMach > nodes[k + 1]!.mach) k++;
  const a = nodes[k]!;
  const b = nodes[k + 1]!;
  const bracket = normalMach === a.mach ? [a] : normalMach === b.mach ? [b] : [a, b];
  return {
    nominal: a.nominal + ((normalMach - a.mach) / (b.mach - a.mach)) * (b.nominal - a.nominal),
    low: Math.min(...bracket.map((n) => n.low)),
    high: Math.max(...bracket.map((n) => n.high)),
    machNodes: bracket.map((n) => n.mach),
  };
}

/** The sweep allowance below M_n 1.49: twice its measured deviation from 1 (0016 section 11). */
export const SWEEP_ALLOWANCE_EXTRAPOLATED = {
  low: 1 - 2 * (1 - SWEEP_ALLOWANCE.low),
  high: 1 + 2 * (SWEEP_ALLOWANCE.high - 1),
};

/** Widening of the band where no measurement covers the Reynolds number (0010 section 5). */
export const REYNOLDS_ALLOWANCE = 0.03;
/** TN 2960's Mach and Reynolds numbers. */
export const TN2960_RANGE = { mach: [1.49, 2.9] as const, reynolds: [1e5, 1e6] as const };
/** RM A55H31's statement: front-half distribution unique over these. */
export const RM_A55H31_RANGE = { mach: [2.48, 6.86] as const, reynolds: [6.7e3, 1.4e5] as const };

export interface RoundedWedge {
  /** Face angle to the stream, radians. */
  readonly faceAngle: number;
  /** Chordwise position of the tangent points. */
  readonly tangentX: number;
  /** Each face's rise, h - r cos(delta). */
  readonly faceRise: number;
  /** The nose's frontal height, 2 r cos(delta). */
  readonly noseHeight: number;
}

/**
 * The tangent geometry of a single wedge with a rounded leading edge, in
 * any one length unit: trailing-edge half-thickness h, radius r, chord c.
 */
export function roundedWedge(halfThickness: number, radius: number, chord: number): RoundedWedge {
  const h = halfThickness;
  const r = radius;
  const c = chord;
  if (!(r > 0 && h > r && c > 2 * r && Number.isFinite(h + r + c))) {
    throw new FinRefusal(
      'leading-edge-geometry',
      `a rounded wedge needs 0 < r < h and c > 2r (r ${r}, h ${h}, c ${c})`,
    );
  }
  const f = (d: number) => h * Math.cos(d) - (c - r) * Math.sin(d) - r;
  let lo = 0;
  let hi = Math.PI / 2;
  for (let k = 0; k < 200 && hi - lo > 1e-16; k++) {
    const mid = 0.5 * (lo + hi);
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  const d = 0.5 * (lo + hi);
  return {
    faceAngle: d,
    tangentX: r * (1 - Math.sin(d)),
    faceRise: h - r * Math.cos(d),
    noseHeight: 2 * r * Math.cos(d),
  };
}

export type RoundedEdgeRegime =
  'measured' | 'covered by RM A55H31' | 'extrapolated in Reynolds number';

export interface RoundedLeadingEdge {
  /** Nose pressure drag per unit span over q (a length). */
  readonly dragPerSpan: number;
  /** The band as ratios on the term. */
  readonly band: { readonly low: number; readonly high: number };
  readonly regime: RoundedEdgeRegime;
  readonly label: string;
  readonly reynoldsOnDiameter: number;
  /** The Mach number normal to the edge, M cos(sweep). */
  readonly normalMach: number;
  /** The leading edge's sweep, degrees. */
  readonly sweepDegrees: number;
  /** At M_n 1.0 to 1.49: kappa, the front side over modified Newtonian (0016 section 11). */
  readonly transonic?: TransonicFrontSide;
}

/**
 * The nose term of a rounded leading edge of radius r and face angle delta
 * (from `roundedWedge`; 0 for a flat plate), at the Mach number normal to
 * the edge, with the Reynolds number on its diameter 2r (on the free
 * stream; its normal component decides the domain).
 */
export function roundedLeadingEdgeDrag(input: {
  readonly mach: number;
  readonly radius: number;
  readonly faceAngle: number;
  readonly tanLeadingEdgeSweep: number;
  readonly reynoldsOnDiameter: number;
}): RoundedLeadingEdge {
  const { radius, faceAngle } = input;
  const tanSweep = input.tanLeadingEdgeSweep;
  if (!(tanSweep >= 0 && Number.isFinite(tanSweep))) {
    throw new FinRefusal('swept-leading-edge', `bad leading-edge sweep (tan ${tanSweep})`);
  }
  const sweep = Math.atan(tanSweep);
  const sweepDegrees = sweep / DEG;
  if (sweepDegrees > SWEEP_LIMIT_DEGREES + 1e-9) {
    throw new FinRefusal(
      'swept-leading-edge',
      `a rounded leading edge swept ${sweepDegrees.toFixed(1)} deg is refused: the yawed-cylinder ` +
        `checks of the independence principle reach ${SWEEP_LIMIT_DEGREES} deg (RM A55H31 fig. 12), ` +
        'and at 75 deg the only point has an end effect (0016)',
    );
  }
  const cosSweep = Math.cos(sweep);
  const mach = input.mach * cosSweep;
  const re = input.reynoldsOnDiameter * cosSweep;
  const swept = tanSweep !== 0;
  const normal = swept ? ' normal to the edge, M cos(sweep),' : '';
  const [mLo, mHi] = ROUNDED_EDGE_MACH_RANGE;
  const transonicFloor = TRANSONIC_NODES[0]!.mach;
  if (mach < transonicFloor) {
    throw new FinRefusal(
      'leading-edge-range',
      `the Mach number${normal} ${mach.toFixed(3)} is below ${transonicFloor.toFixed(1)}, the ` +
        "lowest at which a cylinder's front side is measured with the normal flow sonic or faster " +
        '(NASA CR-149372): below it the normal flow is subsonic and the faces behind a rounded ' +
        "edge are felt at its nose, which a cylinder's separation and wake replace (TN 2960 " +
        'figs. 5(a), 5(b), 5(e): 0.10 to 0.39 of the modified-Newtonian value at M 0.05 to 0.70); ' +
        'no source measures a rounded nose followed by flat faces there, and the leading-edge ' +
        'bluntness series at subsonic leading edges (RM L53L24a, NASA TP 2204, NASA TN D-3634) ' +
        'are of airfoil noses, of radius about a tenth of the thickness or less or faired into ' +
        'the section, their increments within their errors (0016)',
    );
  }
  const transonic = mach < mLo ? transonicFrontSide(mach) : undefined;
  if (!(mach <= mHi)) {
    throw new FinRefusal(
      'leading-edge-range',
      `the rounded-edge band covers Mach ${mLo} to ${mHi} (TN 2960 and RM A55H31), asked ` +
        `${swept ? `M cos(sweep) = ${mach.toFixed(3)}` : mach}`,
    );
  }
  if (!(re >= RM_A55H31_RANGE.reynolds[0])) {
    throw new FinRefusal(
      'leading-edge-range',
      `Reynolds number ${re.toPrecision(3)} on the edge's diameter${swept ? ' (normal component)' : ''} is below ` +
        `${RM_A55H31_RANGE.reynolds[0]}, the lowest at which a front-side pressure measurement ` +
        'shows no Reynolds-number effect (RM A55H31)',
    );
  }
  if (!(re <= TN2960_RANGE.reynolds[1])) {
    throw new FinRefusal(
      'leading-edge-range',
      `Reynolds number ${re.toPrecision(3)} on the edge's diameter is above ` +
        `${TN2960_RANGE.reynolds[1]}, the highest at which a front-side pressure measurement ` +
        'was opened (TN 2960)',
    );
  }
  let regime: RoundedEdgeRegime;
  if (re >= TN2960_RANGE.reynolds[0] && mach <= TN2960_RANGE.mach[1]) regime = 'measured';
  else if (mach >= RM_A55H31_RANGE.mach[0]) regime = 'covered by RM A55H31';
  else regime = 'extrapolated in Reynolds number';
  const widen = regime === 'extrapolated in Reynolds number' ? REYNOLDS_ALLOWANCE : 0;
  const c = Math.cos(faceAngle);
  const kappa = transonic ? transonic.nominal : 1;
  const dragPerSpan =
    kappa *
    pitotPressureCoefficient(mach) *
    cosSweep *
    cosSweep *
    radius *
    2 *
    (c - (c * c * c) / 3);
  const once = MACHA_READINGS < 2 ? ', read once, the second reading pending' : '';
  const base = !transonic
    ? 'an analogy, not a measurement: the modified-Newtonian front side of a cylinder normal to ' +
      'the stream (band 0.99 to 1.06 on TN 2960), carried to a fin edge whose faces replace the ' +
      "cylinder's wake; band estimated on TN 2960, tested only in the total"
    : mach <= MEASURED_TRANSONIC_LIMIT
      ? 'an analogy, not a measurement: the front side of a cylinder normal to the stream at the ' +
        'normal Mach number, measured over modified Newtonian at Mach 1.0, 1.1 and 1.2 (NASA ' +
        `CR-149372 figs. 8b and 5${once}) and interpolated between them (kappa ` +
        `${transonic.nominal.toFixed(3)}), carried to a fin edge whose faces replace the ` +
        "cylinder's wake; tested only in the total"
      : 'an analogy, interpolated across an unmeasured Mach range: the front side of a cylinder ' +
        'normal to the stream over modified Newtonian, between NASA CR-149372 at Mach 1.2 ' +
        `(fig. 8b${once}) and TN 2960 at 1.49 (kappa ${transonic.nominal.toFixed(3)}), the band ` +
        "from the lower node's lowest reading to the upper node's highest; carried to a fin edge " +
        "whose faces replace the cylinder's wake; tested only in the total";
  const label =
    regime === 'measured'
      ? base
      : regime === 'covered by RM A55H31'
        ? `${base}; beyond TN 2960's Mach or Reynolds numbers, covered by RM A55H31's statement`
        : `${base}; extrapolated in Reynolds number (band widened by +-3% of the term, an allowance, not data)`;
  const band = transonic
    ? {
        low: transonic.low / transonic.nominal - widen,
        high: transonic.high / transonic.nominal + widen,
      }
    : { low: ROUNDED_EDGE_BAND.low - widen, high: ROUNDED_EDGE_BAND.high + widen };
  const extra = transonic ? { transonic } : {};
  if (!swept) {
    return {
      dragPerSpan,
      band,
      regime,
      label,
      reynoldsOnDiameter: re,
      normalMach: mach,
      sweepDegrees,
      ...extra,
    };
  }
  const allowance = transonic ? SWEEP_ALLOWANCE_EXTRAPOLATED : SWEEP_ALLOWANCE;
  return {
    dragPerSpan,
    band: {
      low: Math.floor(band.low * allowance.low * 100 + 1e-9) / 100,
      high: Math.ceil(band.high * allowance.high * 100 - 1e-9) / 100,
    },
    regime,
    label:
      `${label}; swept ${sweepDegrees.toFixed(1)} deg: the independence principle, the front side ` +
      'at the normal Mach number on the normal dynamic pressure, checked on yawed cylinders ' +
      `(RM A55H31 figs. 11, 12${RM_A55H31_READINGS < 2 ? ', read once, the second reading pending' : ''}), ` +
      `the band widened by ${allowance.low.toFixed(2)} to ` +
      `${allowance.high.toFixed(2)} for it` +
      (transonic
        ? ', the sweep allowance extrapolated in normal Mach number (from M_n 3.4; twice its ' +
          'measured deviation from 1) (0016)'
        : ' (0016)'),
    reynoldsOnDiameter: re,
    normalMach: mach,
    sweepDegrees,
    ...extra,
  };
}
