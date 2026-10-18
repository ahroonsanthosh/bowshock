/**
 * Friction drag of a body of revolution at zero incidence, from the
 * flat-plate laws of ./flat-plate.ts applied along its surface, at
 * free-stream conditions. Two methods, chosen by the caller:
 *
 * - 'local-reynolds': at each point of the surface the local friction
 *   coefficient is that of a flat plate at the Reynolds number
 *   Re_s = U s / nu of the surface distance s from the tip. With
 *   transition at s_T, the turbulent part is the flat plate's from its
 *   virtual origin (./flat-plate.ts) at every s > s_T.
 * - 'momentum-integral': the momentum thickness theta(s) follows the
 *   axisymmetric momentum integral equation at constant pressure,
 *
 *     d(r theta)/ds = r cf / 2,
 *
 *   closed by the flat-plate relation between cf and Re_theta: laminar
 *   cf = c^2 / Re_theta (from the similarity solution, cf sqrt(Re_x) =
 *   Re_theta / sqrt(Re_x) = c), turbulent cf = cf_inc(F_theta Re_theta) /
 *   F_c (van Driest II with Karman-Schoenherr). On a cylinder it is the
 *   flat plate; on a laminar cone it gives sqrt(3) times the flat-plate
 *   cf at the same s, the exact result of Mangler's transformation (W.
 *   Mangler, 1948; the paper not read: the factor is checked in the tests
 *   from the equation itself). Theta is continuous through transition,
 *   which is the momentum-matching virtual origin of NACA TN 3097 pp. 8
 *   to 9 applied where the radius changes.
 *
 * Both report the axial component of the wall shear over the wetted area,
 *
 *   D = q integral of cf cos(phi) 2 pi r ds = q 2 pi integral of cf r dx,
 *
 * phi being the angle of the surface to the axis, on the cross-section of
 * the reference radius, C_D = D / (q pi R^2), and on the wetted area,
 * D / (q S_wet).
 *
 * What both assume, not yet corrected for:
 *
 * - Free-stream edge conditions everywhere: the velocity, density, Mach
 *   number and temperature at the edge of the boundary layer are the free
 *   stream's, so neither the compression over the nose nor any pressure
 *   gradient enters. (NACA TN 3097 measured no significant effect of small
 *   pressure gradients on the average friction of its cylinders at Mach 2,
 *   summary and pp. 15 to 16.)
 * - Flat-plate closures: no transverse-curvature effect where the layer is
 *   thick against the radius, and for 'local-reynolds' no axisymmetric
 *   thinning of the layer where the radius grows. How each compares with
 *   flight data on a body of revolution is measured in
 *   docs/design/0007-skin-friction.md.
 * - A smooth wall at one temperature (given, or adiabatic for each regime)
 *   and transition as a step at the given surface Reynolds number.
 *
 * Numerics: the profile is split at its breakpoints; the first segment's
 * nodes cluster at the tip (x = L t^3), the others are uniform. The
 * surface distance is the length of the polyline through the nodes (exact
 * on cones and cylinders) and the transition point is inserted as a node.
 * The drag integral is the trapezoidal rule on each panel, whose ends are
 * in the same regime; the momentum integral is advanced by Heun's method
 * (second order) from the laminar cone solution at the first node. The
 * tests check both against closed forms on cones and cylinders (laminar,
 * turbulent and with transition) and by refinement on curved noses.
 */

import { bodyBreakpoints, bodyLength, bodyRadius, validateBody, type Body } from '../geometry/body';
import { flatPlateFriction, type FlatPlateConditions } from './flat-plate';
import { vanDriestLocalCf } from './van-driest';

/** A body of revolution: radius r(x) for 0 <= x <= length, r(0) = 0 at the tip. */
export interface AxisymmetricProfile {
  readonly length: number;
  readonly radius: (x: number) => number;
  /** Positions from 0 to length, ascending, where the slope or curvature changes abruptly. */
  readonly breakpoints: readonly number[];
  /** Radius of the reference cross-section of C_D. */
  readonly referenceRadius: number;
}

export type BodyFrictionMethod = 'local-reynolds' | 'momentum-integral';

export interface BodyFrictionConditions extends FlatPlateConditions {
  readonly method: BodyFrictionMethod;
  /**
   * Free-stream Reynolds number per unit length, U / nu, in the inverse of
   * the unit of the body's dimensions. The transition Reynolds number of
   * FlatPlateConditions is on the surface distance from the tip.
   */
  readonly reynoldsPerLength: number;
  /** Panels in each segment of the profile; default 4000. */
  readonly panels?: number;
}

export interface BodyFriction {
  /** Friction drag over the dynamic pressure and pi R_ref^2. */
  readonly cd: number;
  /** Friction drag over the dynamic pressure and the wetted area. */
  readonly averageCf: number;
  readonly wettedArea: number;
  /** Surface distance from the tip to the end of the body. */
  readonly surfaceLength: number;
  /** Surface distance from the tip at which transition is placed, if it lies on the body. */
  readonly transitionDistance: number | undefined;
  /**
   * Momentum-thickness Reynolds number at the end of the body: from the
   * momentum integral, or for 'local-reynolds' the flat plate's at the
   * surface length.
   */
  readonly endMomentumReynolds: number;
}

export function profileFriction(
  profile: AxisymmetricProfile,
  conditions: BodyFrictionConditions,
): BodyFriction {
  const { length, radius, breakpoints, referenceRadius } = profile;
  const { method, reynoldsPerLength: rePerLength, panels = 4000 } = conditions;
  if (!(rePerLength > 0 && Number.isFinite(rePerLength))) {
    throw new RangeError(`bad Reynolds number per length ${rePerLength}`);
  }
  if (!(referenceRadius > 0)) throw new RangeError('the reference radius must be positive');
  if (!(panels >= 1 && Number.isInteger(panels))) throw new RangeError('bad panel count');
  if (breakpoints[0] !== 0 || breakpoints[breakpoints.length - 1] !== length) {
    throw new RangeError('the breakpoints must run from 0 to the length');
  }
  if (Math.abs(radius(0)) > 1e-12 * referenceRadius) {
    throw new RangeError('the profile must start at a point (r(0) = 0)');
  }

  // Nodes along the profile.
  const xs: number[] = [0];
  for (let k = 0; k + 1 < breakpoints.length; k++) {
    const a = breakpoints[k]!;
    const b = breakpoints[k + 1]!;
    if (!(b > a)) throw new RangeError('the breakpoints must ascend');
    for (let i = 1; i <= panels; i++) {
      const t = i / panels;
      xs.push(i === panels ? b : a + (b - a) * (k === 0 ? t * t * t : t));
    }
  }
  const rs = xs.map((x, i) => (i === 0 ? 0 : radius(x)));
  if (!rs.every((r, i) => i === 0 || r > 0)) {
    throw new RangeError('the radius must be positive behind the tip');
  }
  const ss: number[] = [0];
  for (let i = 1; i < xs.length; i++) {
    ss.push(ss[i - 1]! + Math.hypot(xs[i]! - xs[i - 1]!, rs[i]! - rs[i - 1]!));
  }
  const surfaceLength = ss[ss.length - 1]!;

  // Transition point, inserted as a node on the polyline.
  const plate = flatPlateFriction(conditions);
  const sT = plate.transitionReynolds / rePerLength;
  let transitionDistance: number | undefined;
  if (sT > 0 && sT < surfaceLength) {
    transitionDistance = sT;
    let k = 0;
    while (ss[k + 1]! <= sT) k++;
    if (ss[k]! < sT) {
      const w = (sT - ss[k]!) / (ss[k + 1]! - ss[k]!);
      xs.splice(k + 1, 0, xs[k]! + w * (xs[k + 1]! - xs[k]!));
      rs.splice(k + 1, 0, rs[k]! + w * (rs[k + 1]! - rs[k]!));
      ss.splice(k + 1, 0, sT);
    }
  }
  const nodes = xs.length;
  const laminarPanel = (i: number) => ss[i + 1]! <= sT;

  // Local cf at the two ends of each panel, in the panel's regime.
  const cfStart = new Float64Array(nodes - 1);
  const cfEnd = new Float64Array(nodes - 1);
  let endMomentumReynolds: number;
  if (method === 'local-reynolds') {
    const cfAt = (i: number, laminar: boolean) => {
      const re = rePerLength * ss[i]!;
      return laminar ? plate.laminarLocalCf(re) : plate.turbulentLocalCf(re);
    };
    for (let i = 0; i + 1 < nodes; i++) {
      const laminar = laminarPanel(i);
      cfStart[i] = i === 0 ? 0 : cfAt(i, laminar); // r cf -> 0 at the tip
      cfEnd[i] = cfAt(i + 1, laminar);
    }
    endMomentumReynolds = plate.momentumReynolds(rePerLength * surfaceLength);
  } else {
    const c2 = (plate.laminar?.cfSqrtRe ?? 0) ** 2;
    const factors = plate.turbulent;
    // The Karman-Schoenherr law holds for F_theta Re_theta > 1/2 only (see
    // ./karman-schoenherr.ts); a turbulent layer thinner than that, of
    // order one viscous length near the tip, is held at that limit.
    const minTurbulent = (0.5 * (1 + 1e-9)) / factors.fTheta;
    const cfOf = (reTheta: number, laminar: boolean) =>
      laminar ? c2 / reTheta : vanDriestLocalCf(Math.max(reTheta, minTurbulent), factors);
    // z = r Re_theta; dz/ds = r Re_1 cf(z / r) / 2.
    const slope = (i: number, z: number, laminar: boolean) =>
      0.5 * rs[i]! * rePerLength * cfOf(z / rs[i]!, laminar);
    // Start: the laminar cone, Re_theta(s) = c sqrt(Re_s / 3), or the
    // turbulent plate at Re_s / 3 (a region of order 1e-9 of the length).
    const re1 = rePerLength * ss[1]!;
    let reTheta = laminarPanel(0) ? Math.sqrt(c2 * (re1 / 3)) : plate.momentumReynolds(re1 / 3);
    if (!laminarPanel(0)) reTheta = Math.max(reTheta, minTurbulent);
    let z = rs[1]! * reTheta;
    cfStart[0] = 0;
    cfEnd[0] = cfOf(reTheta, laminarPanel(0));
    for (let i = 1; i + 1 < nodes; i++) {
      const laminar = laminarPanel(i);
      const ds = ss[i + 1]! - ss[i]!;
      const f0 = slope(i, z, laminar);
      const predicted = z + ds * f0;
      const zNext = z + 0.5 * ds * (f0 + slope(i + 1, predicted, laminar));
      cfStart[i] = cfOf(z / rs[i]!, laminar);
      cfEnd[i] = cfOf(zNext / rs[i + 1]!, laminar);
      z = zNext;
    }
    endMomentumReynolds = z / rs[nodes - 1]!;
  }

  let dragOverQ = 0;
  let wettedArea = 0;
  for (let i = 0; i + 1 < nodes; i++) {
    dragOverQ += 0.5 * (cfStart[i]! * rs[i]! + cfEnd[i]! * rs[i + 1]!) * (xs[i + 1]! - xs[i]!);
    wettedArea += Math.PI * (rs[i]! + rs[i + 1]!) * (ss[i + 1]! - ss[i]!);
  }
  dragOverQ *= 2 * Math.PI;
  return {
    cd: dragOverQ / (Math.PI * referenceRadius * referenceRadius),
    averageCf: dragOverQ / wettedArea,
    wettedArea,
    surfaceLength,
    transitionDistance,
    endMomentumReynolds,
  };
}

/**
 * Friction drag of a nose-and-cylinder body (src/geometry/body.ts) on its
 * cross-section, with the assumptions of profileFriction above.
 */
export function bodyFriction(body: Body, conditions: BodyFrictionConditions): BodyFriction {
  validateBody(body);
  return profileFriction(
    {
      length: bodyLength(body),
      radius: (x) => bodyRadius(body, x),
      breakpoints: bodyBreakpoints(body),
      referenceRadius: body.nose.baseRadius,
    },
    conditions,
  );
}
