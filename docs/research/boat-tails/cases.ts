/**
 * The reference cases of the boat-tail term (docs/design/0023-boat-tails.md
 * section 2.3): a body with a sharp nose, a cylinder and a conical
 * boat-tail, in calibres (body radius 0.5), at one Mach number.
 */

import type { Body } from '../../../src/geometry/body';
import type { NoseShape } from '../../../src/geometry/nose';

export interface BoatTailCase {
  /** Short name: the results file is named after it. */
  readonly name: string;
  readonly nose: NoseShape;
  /** Nose length, calibres. */
  readonly noseLength: number;
  /** Cylinder length, calibres. */
  readonly cylinder: number;
  /** Boat-tail half-angle, degrees. */
  readonly angle: number;
  /** Boat-tail length, calibres. */
  readonly length: number;
  readonly mach: number;
}

export const GAMMA = 1.4;

export function caseBody(c: BoatTailCase): Body {
  const R = 0.5;
  const tan = Math.tan((c.angle * Math.PI) / 180);
  return {
    nose: { shape: c.nose, length: c.noseLength, baseRadius: R },
    cylinderLength: c.cylinder,
    boatTail: { length: c.length, baseRadius: R - c.length * tan },
  };
}

const ogive: NoseShape = { kind: 'ogive', parameter: 1 };
const cone: NoseShape = { kind: 'conical' };

function make(
  nose: 'o' | 'c',
  noseLength: number,
  cylinder: number,
  angle: number,
  length: number,
  mach: number,
): BoatTailCase {
  return {
    name: `${nose}${noseLength}-c${cylinder}-bt${angle}-l${length}-m${mach}`,
    nose: nose === 'o' ? ogive : cone,
    noseLength,
    cylinder,
    angle,
    length,
    mach,
  };
}

/**
 * The first set, in the order the lane runs it: the case of section 2.1,
 * then the corners of angle (4 to 16 deg), length (0.5 to 2 calibres) and
 * Mach number (1.5 to 3) on a 3-calibre tangent ogive with 5 calibres of
 * cylinder, then a cone.
 */
export const CASES: readonly BoatTailCase[] = [
  make('o', 3, 3, 6, 1, 2),
  make('o', 3, 5, 8, 1, 2),
  make('o', 3, 5, 4, 1, 2),
  make('o', 3, 5, 16, 1, 2),
  make('o', 3, 5, 8, 0.5, 2),
  make('o', 3, 5, 8, 2, 2),
  make('o', 3, 5, 8, 1, 1.5),
  make('o', 3, 5, 8, 1, 3),
  make('o', 3, 5, 16, 1, 1.5),
  make('o', 3, 5, 16, 1, 3),
  make('o', 3, 5, 4, 2, 1.5),
  make('o', 3, 5, 12, 1.5, 3),
  make('c', 3, 5, 8, 1, 2),
];
