/**
 * Nose cone profiles: the radius r(x) of a nose of length L and base
 * radius R at distance x from the tip.
 *
 * The shapes and the meaning of their parameters follow OpenRocket's
 * definitions (core/.../rocketcomponent/Transition.java), so that designs
 * imported from OpenRocket produce the same body. The formulas are the
 * standard ones for each shape; each is checked in the tests by a defining
 * geometric or aerodynamic property rather than against another
 * implementation.
 */

export type NoseShape =
  /** Straight sides. */
  | { readonly kind: 'conical' }
  /**
   * A portion of a tangent ogive: parameter 1 is the tangent ogive (a
   * circular arc meeting the body tangentially), smaller values straighten
   * the arc towards the cone at 0.
   */
  | { readonly kind: 'ogive'; readonly parameter: number }
  /** Half an ellipse, with semi-axes L and R. */
  | { readonly kind: 'ellipsoid' }
  /** r = R (x / L)^n, with 0 < n <= 1 (n = 1 is the cone). */
  | { readonly kind: 'power'; readonly exponent: number }
  /** Parabolic series: K = 0 is the cone, K = 1 meets the body tangentially. */
  | { readonly kind: 'parabolic'; readonly parameter: number }
  /**
   * Haack series: C = 0 is the LD-Haack (von Karman) ogive, C = 1/3 the
   * LV-Haack; slender-body minimum-wave-drag shapes for a given length and
   * base area (C = 0) or length and volume (C = 1/3).
   */
  | { readonly kind: 'haack'; readonly parameter: number };

export interface Nose {
  readonly shape: NoseShape;
  readonly length: number;
  readonly baseRadius: number;
  /**
   * A blunted tip: the radius of a sphere cap centred on the axis and
   * tangent to the shape's profile, or none (a sharp tip, the default).
   * The capped nose keeps `length` overall, the cap included: behind the
   * cap its profile is that of the uncapped shape of length
   * `length + offset`, shifted forward by the offset the cap cuts off
   * (cappedNose). Offered on the shapes CAPPED_SHAPES names only.
   */
  readonly tipRadius?: number;
}

/** Throw a RangeError if the nose or its shape parameter is out of range. */
export function validateNose(nose: Nose): void {
  const { shape, length, baseRadius } = nose;
  if (!(length > 0 && baseRadius > 0)) {
    throw new RangeError('a nose needs a positive length and base radius');
  }
  if (nose.tipRadius !== undefined) {
    if (!(nose.tipRadius > 0 && nose.tipRadius < baseRadius)) {
      throw new RangeError(
        `a tip radius must lie between 0 and the base radius, got ${nose.tipRadius}`,
      );
    }
    if (!takesTipRadius(nose)) {
      throw new RangeError(
        `a tip radius is offered on ${CAPPED_SHAPES} only${shape.kind === 'ellipsoid' || (shape.kind === 'ogive' && length <= baseRadius) ? ': this nose is already rounded at its tip' : ''}`,
      );
    }
  }
  const inRange = (value: number, min: number, max: number, what: string) => {
    if (!(value >= min && value <= max)) {
      throw new RangeError(`${what} must lie in [${min}, ${max}], got ${value}`);
    }
  };
  switch (shape.kind) {
    case 'ogive':
      inRange(shape.parameter, 0, 1, 'the ogive parameter');
      break;
    case 'power':
      // OpenRocket allows n = 0, a flat face; that is a blunt body and is
      // refused here.
      if (!(shape.exponent > 0 && shape.exponent <= 1)) {
        throw new RangeError(`the power-series exponent must lie in (0, 1], got ${shape.exponent}`);
      }
      break;
    case 'parabolic':
      inRange(shape.parameter, 0, 1, 'the parabolic parameter');
      break;
    case 'haack':
      inRange(shape.parameter, 0, 1 / 3, 'the Haack parameter');
      break;
    case 'conical':
    case 'ellipsoid':
      break;
  }
  // The cap must fit on the profile: computed (and cached) here, so that
  // an impossible cap is refused when the nose is validated.
  if (nose.tipRadius !== undefined) cappedNose(nose);
}

/** Radius of the nose at distance x from the tip, 0 <= x <= length. */
export function noseRadius(nose: Nose, x: number): number {
  if (nose.tipRadius !== undefined) return cappedRadius(nose, x);
  const { shape, length: L, baseRadius: R } = nose;
  const t = Math.min(Math.max(x / L, 0), 1);
  switch (shape.kind) {
    case 'conical':
      return R * t;
    case 'ogive':
      return ogiveRadius(shape.parameter, t * L, L, R);
    case 'ellipsoid':
      return R * Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
    case 'power':
      return R * t ** shape.exponent;
    case 'parabolic': {
      const k = shape.parameter;
      return (R * (2 * t - k * t * t)) / (2 - k);
    }
    case 'haack': {
      const theta = Math.acos(1 - 2 * t);
      const area = theta - Math.sin(2 * theta) / 2 + shape.parameter * Math.sin(theta) ** 3;
      return R * Math.sqrt(Math.max(0, area) / Math.PI);
    }
  }
}

/**
 * Ogive parameters below this give the cone, as in OpenRocket (its
 * MINFEATURE); above it the arc differs from the cone by less than 1e-3 of
 * the base radius.
 */
const OGIVE_CONE_LIMIT = 0.001;

/**
 * The circular arc of the ogive family. With parameter p the arc, of radius
 * rho, passes through the tip and the base point with its centre at
 * (L / p, -y0): p = 1 puts the centre level with the base, so the arc meets
 * the body tangentially, and as p tends to 0 the arc straightens into the
 * cone. As in OpenRocket, a nose shorter than its radius is the ogive of
 * length R compressed along x by `stretch`.
 */
function ogiveArc(p: number, L: number, R: number) {
  const stretch = L < R ? R / L : 1;
  const length = Math.max(L, R);
  const rho = Math.sqrt(
    ((length * length + R * R) * (((2 - p) * length) ** 2 + (p * R) ** 2)) / (4 * (p * R) ** 2),
  );
  const xc = length / p;
  // rho^2 - xc^2 is exactly zero for parameter 1 on a nose no longer than
  // its radius (the arc's centre on the axis: a quarter circle) and can
  // round below zero there.
  return { stretch, length, rho, xc, y0: Math.sqrt(Math.max(0, rho * rho - xc * xc)) };
}

function ogiveRadius(p: number, x: number, L: number, R: number): number {
  if (p < OGIVE_CONE_LIMIT) return (R * x) / L;
  const { stretch, rho, xc, y0 } = ogiveArc(p, L, R);
  const s = x * stretch;
  // The tip: the form below is 0 / 0 there when y0 is zero.
  if (s <= 0) return 0;
  // sqrt(rho^2 - (xc - s)^2) - y0, rearranged with rho^2 - y0^2 = xc^2 to
  // avoid cancellation: for small p the arc is huge and both terms nearly
  // equal, which would lose about four digits near the tip.
  return (s * (2 * xc - s)) / (Math.sqrt(Math.max(0, rho * rho - (xc - s) ** 2)) + y0);
}

/**
 * Slope dr/dx of the nose at its tip, from each shape's formula: finite for
 * a sharp tip, Infinity where the profile leaves the tip vertically (the
 * tip is then blunt, and the flow ahead of it has a stagnation point).
 */
export function noseTipSlope(nose: Nose): number {
  // A capped tip leaves the axis vertically: blunt.
  if (nose.tipRadius !== undefined) return Infinity;
  const { shape, length: L, baseRadius: R } = nose;
  switch (shape.kind) {
    case 'conical':
      return R / L;
    case 'ogive': {
      if (shape.parameter < OGIVE_CONE_LIMIT) return R / L;
      // Slope of the arc at the tip, xc / y0; infinite for a quarter circle.
      const { stretch, xc, y0 } = ogiveArc(shape.parameter, L, R);
      return (xc / y0) * stretch;
    }
    case 'parabolic':
      return (2 * R) / ((2 - shape.parameter) * L);
    case 'power':
      return shape.exponent === 1 ? R / L : Infinity;
    case 'ellipsoid':
    case 'haack':
      return Infinity;
  }
}

/**
 * Slope dr/dx of the nose at its base, from each shape's formula: exactly
 * 0 where the nose meets a cylinder tangentially (the tangent ogive, the
 * parabola of parameter 1, the Haack series, the ellipsoid), positive
 * where the junction is a corner. The fitted-shock solver serves an
 * axially subsonic tip only on a tangent junction
 * (docs/design/0006-shock-fitting.md).
 */
export function noseBaseSlope(nose: Nose): number {
  if (nose.tipRadius !== undefined) return noseBaseSlope(cappedNose(nose).parent);
  const { shape, length: L, baseRadius: R } = nose;
  switch (shape.kind) {
    case 'conical':
      return R / L;
    case 'ogive': {
      if (shape.parameter < OGIVE_CONE_LIMIT) return R / L;
      // Slope of the arc at the base, (xc - s) / sqrt(rho^2 - (xc - s)^2),
      // with s the base's position along the arc: 0 for parameter 1, where
      // the arc's centre lies abreast of the base.
      const { stretch, length, rho, xc } = ogiveArc(shape.parameter, L, R);
      const d = xc - length;
      return (d / Math.sqrt(rho * rho - d * d)) * stretch;
    }
    case 'parabolic':
      return (2 * R * (1 - shape.parameter)) / ((2 - shape.parameter) * L);
    case 'power':
      return (shape.exponent * R) / L;
    case 'ellipsoid':
    case 'haack':
      return 0;
  }
}

/**
 * The geometry of a capped nose (Nose.tipRadius): a sphere of radius r_n
 * centred on the axis and tangent to the uncapped profile f, the parent.
 * On a parent of length Lp the sphere tangent to f at xt has
 * r_n = f(xt) sqrt(1 + f'(xt)^2) and its centre at xt + f(xt) f'(xt); the
 * capped nose starts where the sphere meets the axis, the offset
 * xc - r_n behind the parent's tip. The parent's length is chosen so
 * that the capped nose has the length asked, Lp = length + offset(Lp).
 * Positions below are on the capped nose, x from its tip.
 */
export interface CappedNose {
  /** The uncapped shape whose profile continues the cap. */
  readonly parent: Nose;
  /** Distance from the parent's tip to the capped nose's tip. */
  readonly offset: number;
  /** Axial position of the point where the cap meets the profile. */
  readonly tangentX: number;
  /** Axial position of the sphere's centre: r_n, the tip on the axis. */
  readonly centreX: number;
}

/** The shapes that take a tip radius, in words. */
export const CAPPED_SHAPES =
  'the tangent ogive (longer than its radius), the Von Karman nose, the parabola of parameter 1 and the cone';

/**
 * Whether a nose's shape takes a tip radius: the noses W6 caps (the
 * tangent ogive, the Von Karman nose and the parabola K = 1, which meet
 * the cylinder without a corner) and the cone, as geometry only (a capped
 * cone meets the cylinder at a corner, and nothing serves it). Their
 * profiles and slopes are written out below (uncappedProfile).
 */
function takesTipRadius(nose: Nose): boolean {
  const { shape, length, baseRadius } = nose;
  switch (shape.kind) {
    case 'conical':
      return true;
    case 'ogive':
      return shape.parameter === 1 && length > baseRadius;
    case 'haack':
      return shape.parameter === 0;
    case 'parabolic':
      return shape.parameter === 1;
    default:
      return false;
  }
}

/**
 * The radius and slope dr/dx at x of an uncapped nose of a shape that
 * takes a tip radius, from each shape's formula. The Haack series uses
 * theta = 2 asin(sqrt(x / L)) and a series for its area function at small
 * theta, where theta - sin(2 theta) / 2 cancels: near the tip, where a
 * small cap meets it, noseRadius's formula (acos(1 - 2 t)) loses digits,
 * and below t of about 1e-16 returns 0. A capped nose's profile behind the
 * cap is this one (cappedRadius); on the other shapes it is noseRadius's,
 * value for value.
 */
function uncappedProfile(nose: Nose, x: number): { r: number; slope: number } {
  const { shape, length: L, baseRadius: R } = nose;
  const t = x / L;
  switch (shape.kind) {
    case 'conical':
      return { r: R * t, slope: R / L };
    case 'ogive': {
      const { rho, xc } = ogiveArc(1, L, R);
      const root = Math.sqrt(Math.max(0, rho * rho - (xc - x) ** 2));
      return { r: noseRadius(nose, x), slope: (xc - x) / root };
    }
    case 'parabolic': {
      const k = shape.parameter;
      return {
        r: (R * (2 * t - k * t * t)) / (2 - k),
        slope: (R * (2 - 2 * k * t)) / ((2 - k) * L),
      };
    }
    case 'haack': {
      const c = shape.parameter;
      const theta = 2 * Math.asin(Math.sqrt(t));
      const th2 = theta * theta;
      // theta - sin(2 theta) / 2 by its series below 0.1 (terms to theta^11:
      // the next is below 1e-16 of the first there), where the formula
      // itself cancels to 1e-14.
      const base =
        theta < 0.1
          ? theta *
            th2 *
            (2 / 3 - th2 * (2 / 15 - th2 * (4 / 315 - th2 * (2 / 2835 - (4 / 155925) * th2))))
          : theta - Math.sin(2 * theta) / 2;
      const area = base + c * Math.sin(theta) ** 3;
      const sqrtArea = Math.sqrt(Math.PI * area);
      return {
        r: (R * sqrtArea) / Math.PI,
        slope: (R * Math.sin(theta) * (2 + 3 * c * Math.cos(theta))) / (L * sqrtArea),
      };
    }
    default:
      throw new RangeError(`a tip radius is offered on ${CAPPED_SHAPES} only`);
  }
}

const capCache = new WeakMap<Nose, CappedNose>();

/** The cap of a nose with a tip radius; throws a RangeError if it does not fit. */
export function cappedNose(nose: Nose): CappedNose {
  const cached = capCache.get(nose);
  if (cached) return cached;
  const rn = nose.tipRadius;
  if (rn === undefined) throw new RangeError('the nose has no tip radius');
  if (!takesTipRadius(nose))
    throw new RangeError(`a tip radius is offered on ${CAPPED_SHAPES} only`);
  const uncapped = (length: number): Nose => ({
    shape: nose.shape,
    length,
    baseRadius: nose.baseRadius,
  });
  const fails = () => new RangeError(`a tip radius of ${rn} does not fit on this nose`);
  /**
   * On the uncapped nose `parent`, the point xt where the tangent sphere's
   * radius f sqrt(1 + f'^2), which grows from 0 at the tip along these
   * convex profiles, equals r_n; and the offset xc - r_n of the sphere's
   * centre xc. The centre comes from the sphere through the profile's
   * point (xt, f(xt)) as the profile behind the cap uses it, which keeps the radius
   * continuous at the tangent point to rounding.
   */
  const tangency = (parent: Nose) => {
    const L = parent.length;
    const radiusAt = (x: number) => {
      const { r, slope } = uncappedProfile(parent, x);
      return r * Math.sqrt(1 + slope * slope);
    };
    let low = 0;
    let high = L;
    if (!(radiusAt(high) > rn)) throw fails();
    for (let k = 0; k < 1100 && high - low > 0; k++) {
      const mid = 0.5 * (low + high);
      if (mid === low || mid === high) break;
      if (radiusAt(mid) < rn) low = mid;
      else high = mid;
    }
    const xt = 0.5 * (low + high);
    const r = uncappedProfile(parent, xt).r;
    const xc = xt + Math.sqrt(Math.max(0, (rn - r) * (rn + r)));
    return { xt, offset: xc - rn };
  };
  // The parent's length Lp solves g(Lp) = Lp - offset(Lp) - length = 0;
  // g increases with Lp (the offset grows more slowly than the length:
  // near r_n = R only just, where a fixed-point iteration stalls short of
  // the root), so the root is bracketed and bisected.
  const g = (lp: number) => lp - tangency(uncapped(lp)).offset - nose.length;
  let lo = nose.length;
  let step = Math.max(tangency(uncapped(lo)).offset, 1e-12 * nose.length);
  let hi = lo + step;
  for (let k = 0; g(hi) <= 0; k++) {
    if (k === 200) throw fails();
    lo = hi;
    step *= 2;
    hi = lo + step;
  }
  for (let k = 0; k < 1100; k++) {
    const mid = 0.5 * (lo + hi);
    if (mid === lo || mid === hi) break;
    if (g(mid) <= 0) lo = mid;
    else hi = mid;
  }
  const length = Math.abs(g(lo)) <= Math.abs(g(hi)) ? lo : hi;
  const t = tangency(uncapped(length));
  // The overall length kept to rounding, or refused.
  if (!(Math.abs(length - t.offset - nose.length) <= 1e-12 * length)) throw fails();
  if (!(t.offset >= 0 && t.xt - t.offset > 0 && t.xt - t.offset < nose.length)) throw fails();
  const result: CappedNose = {
    parent: uncapped(length),
    offset: t.offset,
    tangentX: t.xt - t.offset,
    centreX: rn,
  };
  capCache.set(nose, result);
  return result;
}

function cappedRadius(nose: Nose, x: number): number {
  const c = cappedNose(nose);
  const xx = Math.min(Math.max(x, 0), nose.length);
  if (xx < c.tangentX) {
    const rn = nose.tipRadius!;
    const d = xx - c.centreX;
    return Math.sqrt(Math.max(0, rn * rn - d * d));
  }
  // The parent's profile shifted by the offset; at the base the parent's
  // own end, so that the radius there is the base radius exactly.
  return xx >= nose.length ? nose.baseRadius : uncappedProfile(c.parent, xx + c.offset).r;
}
