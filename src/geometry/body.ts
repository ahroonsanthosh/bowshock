/**
 * Axisymmetric rocket bodies: a nose followed by a cylindrical body tube.
 * (Transitions, boat-tails and the base follow in later milestones.)
 */

import { noseRadius, validateNose, type Nose } from './nose';

export interface Body {
  readonly nose: Nose;
  /** Length of the cylinder behind the nose; its radius is the nose base radius. */
  readonly cylinderLength: number;
}

export function validateBody(body: Body): void {
  validateNose(body.nose);
  if (!(body.cylinderLength >= 0)) throw new RangeError('the cylinder length cannot be negative');
}

export function bodyLength(body: Body): number {
  return body.nose.length + body.cylinderLength;
}

/** Radius of the body at distance x from the tip (zero upstream of it). */
export function bodyRadius(body: Body, x: number): number {
  if (x <= 0) return 0;
  return x < body.nose.length ? noseRadius(body.nose, x) : body.nose.baseRadius;
}

/** Positions along the body where the profile's slope or curvature changes abruptly. */
export function bodyBreakpoints(body: Body): number[] {
  return body.cylinderLength > 0 ? [0, body.nose.length, bodyLength(body)] : [0, body.nose.length];
}

/**
 * Slope dr/dx of the nose at its tip, from each shape's formula: finite for
 * a sharp tip, Infinity where the profile leaves the tip vertically (the
 * tip is then blunt, and the flow ahead of it has a stagnation point).
 */
export function noseTipSlope(nose: Nose): number {
  const { shape, length: L, baseRadius: R } = nose;
  switch (shape.kind) {
    case 'conical':
      return R / L;
    case 'ogive': {
      // As in noseRadius: a nose shorter than its radius is compressed along x.
      const stretch = L < R ? R / L : 1;
      const length = Math.max(L, R);
      const p = shape.parameter;
      if (p < 1e-6) return (R / length) * stretch;
      const rho = Math.sqrt(
        ((length * length + R * R) * (((2 - p) * length) ** 2 + (p * R) ** 2)) / (4 * (p * R) ** 2),
      );
      const xc = length / p;
      // Slope of the arc at the tip: xc / sqrt(rho^2 - xc^2).
      return (xc / Math.sqrt(rho * rho - xc * xc)) * stretch;
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
