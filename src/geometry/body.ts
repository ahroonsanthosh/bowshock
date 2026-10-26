/**
 * Axisymmetric rocket bodies: a nose followed by a cylindrical body tube,
 * and optionally a conical boat-tail behind it, narrowing to a flat base
 * (docs/design/0023-boat-tails.md). Transitions that widen (flares) and
 * curved boat-tails are not represented.
 */

import { noseRadius, validateNose, type Nose } from './nose';

/** A straight (conical) boat-tail behind the cylinder, narrowing to the base. */
export interface BoatTail {
  /** Axial length, from the shoulder (the end of the cylinder) to the base. */
  readonly length: number;
  /** Radius of the base, at its aft end: below the body's radius. */
  readonly baseRadius: number;
}

export interface Body {
  readonly nose: Nose;
  /** Length of the cylinder behind the nose; its radius is the nose base radius. */
  readonly cylinderLength: number;
  /** A conical boat-tail behind the cylinder, if any (none: the cylinder ends at the base). */
  readonly boatTail?: BoatTail | undefined;
}

export function validateBody(body: Body): void {
  validateNose(body.nose);
  if (!(body.cylinderLength >= 0)) throw new RangeError('the cylinder length cannot be negative');
  const tail = body.boatTail;
  if (tail !== undefined) {
    if (!(tail.length > 0)) throw new RangeError('a boat-tail needs a positive length');
    if (!(tail.baseRadius > 0 && tail.baseRadius < body.nose.baseRadius)) {
      throw new RangeError(
        "a boat-tail's base radius must be positive and below the body's radius",
      );
    }
  }
}

/** Axial position of the shoulder, where the cylinder ends (and any boat-tail starts). */
export function shoulderPosition(body: Body): number {
  return body.nose.length + body.cylinderLength;
}

export function bodyLength(body: Body): number {
  return shoulderPosition(body) + (body.boatTail?.length ?? 0);
}

/** Half-angle of the boat-tail's cone, radians (0 without one). */
export function boatTailAngle(body: Body): number {
  const tail = body.boatTail;
  return tail === undefined ? 0 : Math.atan((body.nose.baseRadius - tail.baseRadius) / tail.length);
}

/** Radius of the body at its aft end, the base. */
export function baseRadiusOf(body: Body): number {
  return body.boatTail?.baseRadius ?? body.nose.baseRadius;
}

/**
 * Radius of the body at distance x from the tip (zero upstream of it).
 * Beyond the end the last part continues: the cylinder at the body's
 * radius, or the boat-tail's cone (down to the axis).
 */
export function bodyRadius(body: Body, x: number): number {
  if (x <= 0) return 0;
  if (x < body.nose.length) return noseRadius(body.nose, x);
  const R = body.nose.baseRadius;
  const tail = body.boatTail;
  const shoulder = shoulderPosition(body);
  if (tail === undefined || x <= shoulder) return R;
  return Math.max(R - ((R - tail.baseRadius) * (x - shoulder)) / tail.length, 0);
}

/** Positions along the body where the profile's slope or curvature changes abruptly. */
export function bodyBreakpoints(body: Body): number[] {
  const points = [0, body.nose.length];
  if (body.cylinderLength > 0) points.push(shoulderPosition(body));
  if (body.boatTail !== undefined) points.push(bodyLength(body));
  return points;
}
