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
}

/** Throw a RangeError if the nose or its shape parameter is out of range. */
export function validateNose(nose: Nose): void {
  const { shape, length, baseRadius } = nose;
  if (!(length > 0 && baseRadius > 0)) {
    throw new RangeError('a nose needs a positive length and base radius');
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
      // n = 0 would be a flat-faced cylinder: not a nose.
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
}

/** Radius of the nose at distance x from the tip, 0 <= x <= length. */
export function noseRadius(nose: Nose, x: number): number {
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
 * Ogive family. With parameter p, the profile is a circular arc of radius
 * rho through the tip and the base point, whose centre lies on the line
 * x = L / p: p = 1 puts the centre level with the base, so the arc meets
 * the body tangentially. As p tends to 0 the arc becomes a straight line.
 * As in OpenRocket, a nose shorter than its radius is the ogive of length
 * R compressed along x.
 */
function ogiveRadius(p: number, x: number, L: number, R: number): number {
  if (L < R) {
    x *= R / L;
    L = R;
  }
  if (p < 1e-6) return (R * x) / L;
  // Arc centre at (L / p, -y0), radius rho, passing through (0, 0) and (L, R).
  const rho = Math.sqrt(
    ((L * L + R * R) * (((2 - p) * L) ** 2 + (p * R) ** 2)) / (4 * (p * R) ** 2),
  );
  const xc = L / p;
  const y0 = Math.sqrt(rho * rho - xc * xc);
  // sqrt(rho^2 - (xc - x)^2) - y0, rearranged with rho^2 - y0^2 = xc^2 to
  // avoid cancellation: for small p the arc is huge and both terms nearly
  // equal, which would lose about four digits near the tip.
  return (x * (2 * xc - x)) / (Math.sqrt(Math.max(0, rho * rho - (xc - x) ** 2)) + y0);
}
