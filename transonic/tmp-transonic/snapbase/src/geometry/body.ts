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
