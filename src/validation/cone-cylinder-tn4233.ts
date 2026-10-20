/**
 * Measured surface pressures on a slender cone-cylinder at zero incidence
 * at transonic speeds, from W. A. Page, "Experimental study of the
 * equivalence of transonic flow about slender cone-cylinders of circular
 * and elliptic cross section", NACA TN 4233, 1958
 * (https://ntrs.nasa.gov/citations/19930085182).
 *
 * Model (figure 1): a cone of 6 deg 59 min semiapex angle, 5.50 in long,
 * on a cylinder of 1.347 in diameter, 15.15 in overall (7.16 calibers of
 * cylinder), supported from behind by a sting of about 1 in diameter
 * (text, p. 4); orifices at the x / l of CONE_CYLINDER_ORIFICES (l the
 * cone length), numbers 16 and 17 on the opposite side as checks.
 * Tested in two ventilated transonic tunnels: the Ames 2- by 2-foot
 * (0.25 percent blockage) and the Ames 14-foot (0.005 percent), Reynolds
 * number 2.4e6 on the cone length. Random uncertainties (p. 6): Mach
 * number +-0.003 at 0.8, +-0.004 at 1.0, +-0.002 at 1.2; Cp +-0.002.
 * The report's appendix finds wall interference in both tunnels between
 * indicated Mach numbers of about 0.99 and 1.05, the 14-foot data being
 * close to free air elsewhere; at sonic speed it estimates that free air
 * at Mach 1 corresponds to an indicated Mach number of 1.0066 in the
 * 14-foot tunnel and 1.035 in the 2-foot one (from a porous-wall
 * analysis for vanishingly small models, p. 17).
 *
 * Transcribed by eye from table I(a) and (b) of the NTRS scan, rendered
 * at 250 dpi, for the circular cone-cylinder only: the 14-foot rows of
 * indicated Mach number 0.964 and above, and the 2-foot rows of 1.100,
 * 1.151 and 1.200 (the 14-foot tunnel's table ends at 1.100).
 */

/** Cone semiapex angle, radians (6 deg 59 min). */
export const TN4233_CONE_HALF_ANGLE = ((6 + 59 / 60) * Math.PI) / 180;

/** Orifice positions x / l (l the cone length, 5.50 in), numbers 1 to 15. */
export const TN4233_ORIFICES: readonly number[] = [
  0.082, 0.183, 0.285, 0.385, 0.486, 0.589, 0.688, 0.79, 0.891, 0.942, 0.994, 1.043, 1.094, 1.195,
  1.398,
];

export interface Tn4233Row {
  /** Indicated free-stream Mach number. */
  readonly mach: number;
  /** Ames 14-foot (0.005 percent blockage) or 2-foot (0.25 percent) tunnel. */
  readonly tunnel: '14ft' | '2ft';
  /** Cp at orifices 1 to 15 (TN4233_ORIFICES). */
  readonly cp: readonly number[];
  /** Cp at the check orifices on the opposite side, at x / l = 0.385 and 0.688. */
  readonly check: readonly [number, number];
}

export const TN4233_ROWS: readonly Tn4233Row[] = [
  row(
    0.964,
    '14ft',
    [
      0.13, 0.113, 0.103, 0.095, 0.087, 0.079, 0.067, 0.057, 0.03, 0.007, -0.129, -0.444, -0.352,
      -0.205, 0.011,
    ],
    [0.091, 0.066],
  ),
  row(
    0.98,
    '14ft',
    [
      0.136, 0.117, 0.108, 0.1, 0.093, 0.087, 0.077, 0.064, 0.042, 0.021, -0.104, -0.417, -0.328,
      -0.225, -0.055,
    ],
    [0.1, 0.076],
  ),
  row(
    0.991,
    '14ft',
    [
      0.141, 0.123, 0.113, 0.107, 0.102, 0.093, 0.083, 0.074, 0.052, 0.03, -0.091, -0.398, -0.312,
      -0.213, -0.082,
    ],
    [0.107, 0.084],
  ),
  row(
    1.001,
    '14ft',
    [
      0.152, 0.136, 0.127, 0.121, 0.113, 0.107, 0.098, 0.088, 0.069, 0.049, -0.072, -0.379, -0.296,
      -0.198, -0.077,
    ],
    [0.119, 0.097],
  ),
  row(
    1.008,
    '14ft',
    [
      0.159, 0.145, 0.137, 0.131, 0.12, 0.116, 0.111, 0.1, 0.082, 0.062, -0.059, -0.363, -0.28,
      -0.182, -0.066,
    ],
    [0.129, 0.109],
  ),
  row(
    1.02,
    '14ft',
    [
      0.138, 0.13, 0.125, 0.124, 0.119, 0.115, 0.11, 0.103, 0.091, 0.074, -0.043, -0.344, -0.263,
      -0.168, -0.062,
    ],
    [0.124, 0.111],
  ),
  row(
    1.032,
    '14ft',
    [
      0.121, 0.118, 0.115, 0.116, 0.112, 0.112, 0.108, 0.104, 0.094, 0.08, -0.033, -0.328, -0.251,
      -0.16, -0.062,
    ],
    [0.113, 0.107],
  ),
  row(
    1.041,
    '14ft',
    [
      0.109, 0.107, 0.108, 0.11, 0.109, 0.111, 0.109, 0.108, 0.095, 0.089, -0.023, -0.312, -0.237,
      -0.148, -0.058,
    ],
    [0.108, 0.108],
  ),
  row(
    1.05,
    '14ft',
    [
      0.113, 0.111, 0.105, 0.105, 0.104, 0.106, 0.103, 0.1, 0.099, 0.089, -0.015, -0.302, -0.228,
      -0.144, -0.059,
    ],
    [0.108, 0.103],
  ),
  row(
    1.064,
    '14ft',
    [
      0.1, 0.099, 0.099, 0.1, 0.1, 0.102, 0.096, 0.097, 0.096, 0.094, -0.001, -0.286, -0.213, -0.13,
      -0.049,
    ],
    [0.098, 0.101],
  ),
  row(
    1.078,
    '14ft',
    [
      0.098, 0.096, 0.096, 0.096, 0.096, 0.096, 0.096, 0.096, 0.096, 0.094, 0.008, -0.268, -0.203,
      -0.125, -0.052,
    ],
    [0.094, 0.095],
  ),
  row(
    1.1,
    '14ft',
    [
      0.098, 0.096, 0.095, 0.095, 0.094, 0.094, 0.093, 0.092, 0.091, 0.09, 0.016, -0.251, -0.192,
      -0.12, -0.053,
    ],
    [0.094, 0.092],
  ),
  row(
    1.1,
    '2ft',
    [
      0.092, 0.091, 0.094, 0.089, 0.093, 0.097, 0.099, 0.098, 0.095, 0.093, 0.022, -0.248, -0.192,
      -0.119, -0.054,
    ],
    [0.088, 0.1],
  ),
  row(
    1.151,
    '2ft',
    [
      0.084, 0.085, 0.084, 0.085, 0.085, 0.086, 0.086, 0.089, 0.087, 0.087, 0.034, -0.215, -0.167,
      -0.105, -0.049,
    ],
    [0.084, 0.088],
  ),
  row(
    1.2,
    '2ft',
    [
      0.079, 0.078, 0.079, 0.081, 0.08, 0.079, 0.08, 0.083, 0.081, 0.082, 0.039, -0.19, -0.149,
      -0.097, -0.046,
    ],
    [0.08, 0.082],
  ),
];

function row(
  mach: number,
  tunnel: '14ft' | '2ft',
  cp: number[],
  check: [number, number],
): Tn4233Row {
  return { mach, tunnel, cp, check };
}

/** Stated random uncertainty of each measured Cp. */
export const TN4233_CP_UNCERTAINTY = 0.002;
