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
 * trapezoid rule) over (2/3) Cp_pitot, 0.995, 1.049 and 1.056 at M 1.49,
 * 1.98 and 2.90, rounded outward: **0.99 to 1.06** (./tn2960.ts).
 * Labelled "an analogy, not a measurement": behind a fin's edge are the
 * fin's faces, not the cylinder's separated wake, and the nose's effect on
 * the faces (its entropy layer, the overexpansion behind the shoulder) is
 * not modelled; no opened source measures it.
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
 * Refused: M below 1.49 or above 3.0, Re_D below 6.7e3, swept leading
 * edges (no data at M 1.5 to 3; RM A55H31's eq. (14) would be an untested
 * theory there), and sections other than a single wedge.
 */

import { normalShock, stagnationPressureRatio } from '../validation/gas-dynamics';
import { FinRefusal } from './refusal';
import { TN2960_FIG5C } from './tn2960';

const GAMMA = 1.4;
const DEG = Math.PI / 180;

/** Rayleigh's pitot pressure coefficient. */
export function pitotPressureCoefficient(mach: number, gamma = GAMMA): number {
  const shock = normalShock(mach, gamma);
  const p02 = shock.pressureRatio * stagnationPressureRatio(shock.downstreamMach, gamma);
  return (p02 - 1) / (0.5 * gamma * mach * mach);
}

/** TN 2960 fig. 5(c) integrated by the trapezoid rule: front (0 to 90 deg), rear, total, on D. */
export function tn2960Integrated(): {
  readonly mach: number;
  readonly front: number;
  readonly rear: number;
  readonly frontOverModifiedNewtonian: number;
}[] {
  return TN2960_FIG5C.map((c) => {
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

/** The nose term's band, measured over modelled: TN 2960's ratios rounded outward. */
export const ROUNDED_EDGE_BAND = (() => {
  const r = tn2960Integrated().map((x) => x.frontOverModifiedNewtonian);
  return {
    low: Math.floor(Math.min(...r) * 100 + 1e-9) / 100,
    high: Math.ceil(Math.max(...r) * 100 - 1e-9) / 100,
  };
})();

/** Widening of the band where no measurement covers the Reynolds number (0010 section 5). */
export const REYNOLDS_ALLOWANCE = 0.03;
/** TN 2960's Mach and Reynolds numbers. */
export const TN2960_RANGE = { mach: [1.49, 2.9] as const, reynolds: [1e5, 1e6] as const };
/** RM A55H31's statement: front-half distribution unique over these. */
export const RM_A55H31_RANGE = { mach: [2.48, 6.86] as const, reynolds: [6.7e3, 1.4e5] as const };
/** The domain served. */
export const ROUNDED_EDGE_MACH_RANGE = [1.49, 3.0] as const;

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
}

/**
 * The nose term of a rounded, unswept leading edge of radius r and face
 * angle delta (from `roundedWedge`), at the free-stream Mach number, with
 * the Reynolds number on its diameter 2r.
 */
export function roundedLeadingEdgeDrag(input: {
  readonly mach: number;
  readonly radius: number;
  readonly faceAngle: number;
  readonly tanLeadingEdgeSweep: number;
  readonly reynoldsOnDiameter: number;
}): RoundedLeadingEdge {
  const { mach, radius, faceAngle, reynoldsOnDiameter: re } = input;
  if (input.tanLeadingEdgeSweep !== 0) {
    throw new FinRefusal(
      'swept-leading-edge',
      'rounded leading edges on swept fins are refused: no swept-cylinder data were opened at ' +
        "M 1.5 to 3, and RM A55H31's eq. (14) would be an untested theory there (0008 section 4.1)",
    );
  }
  const [mLo, mHi] = ROUNDED_EDGE_MACH_RANGE;
  if (!(mach >= mLo && mach <= mHi)) {
    throw new FinRefusal(
      'leading-edge-range',
      `the rounded-edge band covers Mach ${mLo} to ${mHi} (TN 2960 and RM A55H31), asked ${mach}`,
    );
  }
  if (!(re >= RM_A55H31_RANGE.reynolds[0])) {
    throw new FinRefusal(
      'leading-edge-range',
      `Reynolds number ${re.toPrecision(3)} on the edge's diameter is below ` +
        `${RM_A55H31_RANGE.reynolds[0]}, the lowest at which a front-side pressure measurement ` +
        'shows no Reynolds-number effect (RM A55H31)',
    );
  }
  let regime: RoundedEdgeRegime;
  if (re >= TN2960_RANGE.reynolds[0] && mach <= TN2960_RANGE.mach[1]) regime = 'measured';
  else if (mach >= RM_A55H31_RANGE.mach[0]) regime = 'covered by RM A55H31';
  else regime = 'extrapolated in Reynolds number';
  const widen = regime === 'extrapolated in Reynolds number' ? REYNOLDS_ALLOWANCE : 0;
  const c = Math.cos(faceAngle);
  const dragPerSpan = pitotPressureCoefficient(mach) * radius * 2 * (c - (c * c * c) / 3);
  const base =
    'an analogy, not a measurement: the modified-Newtonian front side of a cylinder normal to ' +
    'the stream (band 0.99 to 1.06 on TN 2960), carried to a fin edge whose faces replace the ' +
    "cylinder's wake";
  const label =
    regime === 'measured'
      ? base
      : regime === 'covered by RM A55H31'
        ? `${base}; beyond TN 2960's Mach or Reynolds numbers, covered by RM A55H31's statement`
        : `${base}; extrapolated in Reynolds number (band widened by +-3% of the term, an allowance, not data)`;
  return {
    dragPerSpan,
    band: { low: ROUNDED_EDGE_BAND.low - widen, high: ROUNDED_EDGE_BAND.high + widen },
    regime,
    label,
    reynoldsOnDiameter: re,
  };
}
