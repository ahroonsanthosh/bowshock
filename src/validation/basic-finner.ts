/**
 * The Basic Finner in free flight: A. D. Dupuis and W. Hathaway,
 * "Aeroballistic Range Tests of the Basic Finner Reference Projectile at
 * Supersonic Velocities", DREV TM 9703, Defence Research Establishment
 * Valcartier, 1997, DTIC ADA636861 (copy opened: the Internet Archive
 * mirror, archive.org/download/DTIC_ADA636861/DTIC_ADA636861.pdf; DTIC
 * refused every request). Transcribed for docs/design/0008-total-drag.md
 * (`docs/research/total-drag/data/basic_finner_ada636861.md` and `.csv`,
 * tables read on the page images); the round-2 audit read Tables V, VII,
 * VIII, IX and fig. 2 again and agrees on all 19 Table VIII rows.
 *
 * The hold-out set of 0008 (section 6.2, B5): used to set or shape no
 * band, so nothing may be tuned on it (section 6.1).
 */

import type { Body } from '../geometry/body';

/** Geometry, in calibers (1 cal = 30.0 mm), fig. 2 (PDF p. 53), text p. 3, Table I. */
export const BASIC_FINNER_GEOMETRY = {
  caliberMetres: 0.03,
  length: 10.0,
  /** "a 20 deg nose cone": half-angle 10 deg; fig. 2 dimensions its length 2.84. */
  coneHalfAngleDegrees: 10,
  noseLengthDrawn: 2.84,
  /** "The meplat of the nose was also at a radius of a 0.004 cal" (p. 3). */
  noseTipRadius: 0.004,
  finCount: 4,
  /** "1 cal x 1 cal": chord and span from the body surface, rectangular, at the base. */
  finChord: 1.0,
  finSpan: 1.0,
  /** "conical in shape with a thickness of 0.08 cal at the base of the fin" (p. 3). */
  finTrailingEdgeThickness: 0.08,
  /** "The leading edges of the fins were very sharp with a radius 0.004 cal" (p. 3). */
  finLeadingEdgeRadius: 0.004,
} as const;

/**
 * The Basic Finner's body without its fins, in calibers: the 20 deg cone,
 * 0.5 / tan(10 deg) = 2.8356409 long, exactly (not fig. 2's printed 2.84),
 * on a cylinder to 10 cal overall, to a flat base. The gate and the class
 * rule take it so.
 */
export function basicFinnerBody(): Body {
  const g = BASIC_FINNER_GEOMETRY;
  const noseLength = 0.5 / Math.tan(g.coneHalfAngleDegrees * (Math.PI / 180));
  return {
    nose: { shape: { kind: 'conical' }, length: noseLength, baseRadius: 0.5 },
    cylinderLength: g.length - noseLength,
  };
}

/**
 * basicFinnerBody's lengths as a page's fields hold them, to six decimals:
 * 2.835641 and 7.164359, within 5e-7 of it. At three decimals (2.836) the
 * wave drag moved by 2.0e-4 of its value at Mach 2, three times the band's
 * allowance of 7e-5 of the value.
 */
export const BASIC_FINNER_LENGTHS = {
  nose: basicFinnerBody().nose.length.toFixed(6),
  cylinder: basicFinnerBody().cylinderLength.toFixed(6),
} as const;

/**
 * The body every page solves for the Basic Finner: BASIC_FINNER_LENGTHS
 * read back, the body the drag page's fields give, so that the drag page
 * and the live flow page solve the same case to the last bit.
 */
export function basicFinnerBodyAsTyped(): Body {
  return {
    nose: {
      shape: { kind: 'conical' },
      length: Number(BASIC_FINNER_LENGTHS.nose),
      baseRadius: 0.5,
    },
    cylinderLength: Number(BASIC_FINNER_LENGTHS.cylinder),
  };
}

/**
 * Range conditions (Table V, PDF p. 41; text p. 3): air at 20 deg C
 * nominal, relative humidity about 45%; per shot a speed of sound of 343.4
 * to 344.0 m/s (the per-shot values are not transcribed). Reynolds numbers
 * are on the 0.300 m length.
 */
export const BASIC_FINNER_RANGE = {
  speedOfSound: [343.4, 344.0] as const,
  reynoldsLength: 0.3,
} as const;

export type BasicFinnerUse = 'gate' | 'reported' | 'high yaw' | 'above range';

export interface BasicFinnerShot {
  readonly shot: string;
  readonly mach: number;
  /** Mean squared yaw, deg^2 (Table VIII). */
  readonly meanSquaredYaw: number;
  /** Axial-force coefficient at zero yaw, 6DOF single fit (Table VIII), on the cross-section. */
  readonly cx0: number;
  /** Reynolds number on the 0.300 m length (Table V). */
  readonly reynolds: number;
  readonly use: BasicFinnerUse;
}

/**
 * Table VIII shots (probable error of CX0 printed "(0.%)", under 0.5%, on
 * every row). Gate: the 11 shots with mean squared yaw at most 5 deg^2 at
 * M 1.80 to 2.97 (0008 B5). Reported: the five at M 1.06 to 1.33 (no shot
 * between 1.38 and 1.80). The M 1.377 shot is excluded for its yaw (15.8
 * deg^2; 6DOF and linear-theory CD0 differ by 13%), and two shots lie above
 * M 3.
 */
export const BASIC_FINNER_SHOTS: readonly BasicFinnerShot[] = [
  {
    shot: 'DA95022010',
    mach: 1.056,
    meanSquaredYaw: 0.4,
    cx0: 0.868,
    reynolds: 0.699e7,
    use: 'reported',
  },
  {
    shot: 'DA95022219',
    mach: 1.058,
    meanSquaredYaw: 2.0,
    cx0: 0.868,
    reynolds: 0.704e7,
    use: 'reported',
  },
  {
    shot: 'DA95022230',
    mach: 1.116,
    meanSquaredYaw: 0.1,
    cx0: 0.854,
    reynolds: 0.742e7,
    use: 'reported',
  },
  {
    shot: 'DA95030613',
    mach: 1.254,
    meanSquaredYaw: 2.3,
    cx0: 0.76,
    reynolds: 0.836e7,
    use: 'reported',
  },
  {
    shot: 'DA95022009',
    mach: 1.332,
    meanSquaredYaw: 0.8,
    cx0: 0.701,
    reynolds: 0.889e7,
    use: 'reported',
  },
  {
    shot: 'DA95030622',
    mach: 1.377,
    meanSquaredYaw: 15.8,
    cx0: 0.708,
    reynolds: 0.92e7,
    use: 'high yaw',
  },
  {
    shot: 'DA95021318',
    mach: 1.799,
    meanSquaredYaw: 0.6,
    cx0: 0.594,
    reynolds: 0.119e8,
    use: 'gate',
  },
  {
    shot: 'DA95021529',
    mach: 1.846,
    meanSquaredYaw: 0.6,
    cx0: 0.598,
    reynolds: 0.124e8,
    use: 'gate',
  },
  {
    shot: 'DA95021308',
    mach: 1.85,
    meanSquaredYaw: 1.0,
    cx0: 0.567,
    reynolds: 0.123e8,
    use: 'gate',
  },
  {
    shot: 'DA95021328',
    mach: 2.348,
    meanSquaredYaw: 0.4,
    cx0: 0.5,
    reynolds: 0.156e8,
    use: 'gate',
  },
  {
    shot: 'DA95020907',
    mach: 2.364,
    meanSquaredYaw: 0.5,
    cx0: 0.478,
    reynolds: 0.155e8,
    use: 'gate',
  },
  {
    shot: 'DA95021317',
    mach: 2.414,
    meanSquaredYaw: 2.1,
    cx0: 0.473,
    reynolds: 0.161e8,
    use: 'gate',
  },
  {
    shot: 'DA95020927',
    mach: 2.663,
    meanSquaredYaw: 3.7,
    cx0: 0.446,
    reynolds: 0.174e8,
    use: 'gate',
  },
  { shot: 'DA95020906', mach: 2.741, meanSquaredYaw: 2.1, cx0: 0.4, reynolds: 0.18e8, use: 'gate' },
  {
    shot: 'DA95020916',
    mach: 2.749,
    meanSquaredYaw: 0.0,
    cx0: 0.452,
    reynolds: 0.18e8,
    use: 'gate',
  },
  {
    shot: 'DA95030603',
    mach: 2.969,
    meanSquaredYaw: 0.1,
    cx0: 0.385,
    reynolds: 0.198e8,
    use: 'gate',
  },
  {
    shot: 'DA95022205',
    mach: 2.97,
    meanSquaredYaw: 1.7,
    cx0: 0.376,
    reynolds: 0.197e8,
    use: 'gate',
  },
  {
    shot: 'DA95022215',
    mach: 3.312,
    meanSquaredYaw: 3.0,
    cx0: 0.35,
    reynolds: 0.22e8,
    use: 'above range',
  },
  {
    shot: 'DA95022726',
    mach: 3.338,
    meanSquaredYaw: 0.4,
    cx0: 0.376,
    reynolds: 0.227e8,
    use: 'above range',
  },
];

/** The gated shots' four Mach clusters (0008 B5). */
export const BASIC_FINNER_CLUSTERS: readonly (readonly [number, number])[] = [
  [1.79, 1.86],
  [2.34, 2.42],
  [2.66, 2.75],
  [2.96, 2.98],
];
