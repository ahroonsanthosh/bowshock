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

/**
 * The cases solved on nj = 160 too, before the rest are solved on nj = 80
 * (the CPU takes hours a case there): the case of section 2.1, the
 * steepest at the lowest Mach number, the highest Mach number, and the
 * longest boat-tail.
 */
export const FOUR_GRIDS: readonly string[] = [
  'o3-c3-bt6-l1-m2',
  'o3-c5-bt16-l1-m1.5',
  'o3-c5-bt8-l1-m3',
  'o3-c5-bt8-l2-m2',
];

/**
 * NACA RM E51F26's six boat-tailed models at Mach 1.91, from its text
 * (pp. 5 and 6: an 18 in body of fineness ratio 12, its first half a
 * contoured nose, the rest a cylinder ending in a conical boat-tail of
 * 5.63, 7.03 or 9.33 deg to a base of 0.506 or 0.704 of the diameter):
 * the inviscid side pressure drag that 0014 10.7 (ae) item 1 divides the
 * measured one by. The nose is "contoured according to equation (14) of
 * reference 1", a 1943 Peenemuende report not available here, so each
 * model is computed behind a 6-caliber tangent ogive and a 6-caliber cone
 * (the allowance carries their spread, (ae) item 1). The boat-tail's
 * length follows from its angle and base ratio; the readers' fig. 6
 * gives the drawn dimensions, against which these are checked.
 */
export const RM_E51F26: readonly BoatTailCase[] = (['o', 'c'] as const).flatMap((nose) =>
  [0.506, 0.704].flatMap((ratio) =>
    [5.63, 7.03, 9.33].map((angle) => {
      const length = (1 - ratio) / (2 * Math.tan((angle * Math.PI) / 180));
      return {
        ...make(nose, 6, 6 - length, angle, length, 1.91),
        name: `e51f26-${nose}6-bt${angle}-r${ratio}`,
      };
    }),
  ),
);

/**
 * Blunt noses with a boat-tail (0023 section 2.6, registered 2026-10-26),
 * solved by ./blunt-lane.test.ts against the march of characteristics from
 * lines of the fitted flow past the nose's subsonic region: the 3-caliber
 * Von Karman nose (the population's commonest, a two-scale nose) and the
 * 1-caliber (2:1) ellipsoid, each with 3 calibers of cylinder and an 8 deg
 * boat-tail one caliber long, at Mach 2.
 */
export const BLUNT_CASES: readonly BoatTailCase[] = [
  {
    name: 'vk3-c3-bt8-l1-m2',
    nose: { kind: 'haack', parameter: 0 },
    noseLength: 3,
    cylinder: 3,
    angle: 8,
    length: 1,
    mach: 2,
  },
  {
    name: 'e1-c3-bt8-l1-m2',
    nose: { kind: 'ellipsoid' },
    noseLength: 1,
    cylinder: 3,
    angle: 8,
    length: 1,
    mach: 2,
  },
];
