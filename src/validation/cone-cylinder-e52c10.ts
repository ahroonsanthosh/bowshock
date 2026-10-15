/**
 * Measured surface pressures on sharp cone-cylinders at Mach 3.12, from
 * J. R. Jack and L. I. Gould, "Aerodynamics of slender bodies at Mach
 * number of 3.12 and Reynolds numbers from 2x10^6 to 15x10^6. II -
 * Aerodynamic load distributions of series of five bodies having conical
 * noses and cylindrical afterbodies", NACA RM E52C10, 1952
 * (https://ntrs.nasa.gov/citations/19930087041).
 *
 * Models (figure 1; maximum diameter d = 1.75 in, length 12 d = 21 in):
 * - model 1: cone of 20 deg included angle, 2.84 d long, on a 9.16 d
 *   cylinder (the length gives a half-angle of 9.985 deg);
 * - model 3: cone of 7 deg 10 min included angle, 8 d long, on a 4 d
 *   cylinder (3.576 deg from the length, 3.583 from the angle), with a
 *   0.875 in sting at the base.
 * Test-section Mach number 3.12 +- 0.03, Reynolds number 14e6 (on the body
 * length), ratio of specific heats 1.40. The report states no uncertainty
 * for the pressures.
 *
 * Only angles of attack of 3 deg and above are tabulated; the zero-incidence
 * data appear only as plotted points (figure 4). Transcribed from the
 * meridians theta = 0 (windward) and 180 deg (leeward) of tables II(a) and
 * III(a), read from the NTRS scan at 300 dpi; every cell is legible. The
 * stations bracket the shoulders of figure 1 (4.97 in for model 1, 14.00 in
 * for model 3).
 *
 * To first order in the angle of attack the surface pressure varies as
 * cos(theta), so the mean of the two meridians differs from the
 * zero-incidence value only at second order, whose size is not known here.
 * On the forward cones at 3 deg that mean agrees with the exact conical
 * value (NASA SP-3004) within 0.0004; downstream it is an estimate, not a
 * measurement, of the zero-incidence pressure.
 */

export const E52C10_MACH = 3.12;

/** Maximum body diameter, inches. */
export const E52C10_DIAMETER_INCHES = 1.75;

export interface E52c10Station {
  /** Distance from the tip, inches. */
  readonly x: number;
  /** Pressure coefficient on the windward meridian (theta = 0). */
  readonly windward: number;
  /** Pressure coefficient on the leeward meridian (theta = 180 deg). */
  readonly leeward: number;
}

export interface E52c10Model {
  /** Cone length and cylinder length, in body diameters. */
  readonly coneCalibers: number;
  readonly cylinderCalibers: number;
  /** Angle of attack, degrees, and the measured pressures. */
  readonly runs: readonly { readonly alpha: number; readonly stations: readonly E52c10Station[] }[];
}

const s = (x: number, windward: number, leeward: number): E52c10Station => ({
  x,
  windward,
  leeward,
});

/** Model 1, table II(a). */
export const E52C10_MODEL_1: E52c10Model = {
  coneCalibers: 2.84,
  cylinderCalibers: 9.16,
  runs: [
    {
      alpha: 3,
      stations: [
        s(1, 0.1192, 0.0475),
        s(2, 0.1221, 0.0507),
        s(3.38, 0.1192, 0.0537),
        s(4.84, 0.1218, 0.0507),
        s(5.09, -0.0143, -0.039),
        s(5.5, -0.0172, -0.049),
        s(6, -0.0094, -0.0288),
        s(6.5, -0.0104, -0.0369),
        s(7, -0.0087, -0.0312),
        s(7.75, -0.007, -0.0243),
        s(8.5, -0.0065, -0.0187),
        s(10, -0.0033, -0.013),
        s(11.5, -0.0039, -0.0117),
        s(13, -0.0072, -0.0087),
        s(14.5, -0.0075, -0.01),
        s(16, -0.0098, -0.0067),
        s(17.5, -0.0073, -0.0041),
        s(19, -0.0028, -0.0081),
        s(20.5, -0.0066, -0.0086),
      ],
    },
    {
      alpha: 6,
      stations: [
        s(1, 0.1582, 0.0266),
        s(2, 0.1651, 0.0279),
        s(3.38, 0.1717, 0.0304),
        s(4.84, 0.1722, 0.0318),
        s(5.09, 0.01, -0.0461),
        s(5.5, 0.009, -0.0568),
        s(6, 0.0306, -0.0406),
        s(6.5, 0.0138, -0.0443),
        s(7, 0.0149, -0.0372),
        s(7.75, 0.0146, -0.0281),
        s(8.5, 0.0132, -0.0217),
        s(10, 0.0123, -0.0166),
        s(11.5, 0.0118, -0.0137),
        s(13, 0.0092, -0.0134),
        s(14.5, 0.0073, -0.0125),
        s(16, 0.003, -0.011),
        s(17.5, 0.0015, -0.0072),
        s(19, 0.0077, -0.0137),
        s(20.5, 0.002, -0.0136),
      ],
    },
  ],
};

/** Model 3, table III(a). */
export const E52C10_MODEL_3: E52c10Model = {
  coneCalibers: 8,
  cylinderCalibers: 4,
  runs: [
    {
      alpha: 3,
      stations: [
        s(3, 0.0281, 0.0043),
        s(5, 0.0282, 0.0044),
        s(9, 0.0296, 0.0092),
        s(11, 0.0328, 0.0062),
        s(13.88, 0.0297, 0.0043),
        s(14.12, -0.0059, -0.0218),
        s(14.5, -0.0122, -0.0261),
        s(15, -0.0119, -0.0267),
        s(15.5, -0.0122, -0.0243),
        s(16, -0.0109, -0.0213),
        s(17.5, -0.0081, -0.0104),
        s(19.5, -0.0071, -0.013),
        s(20.5, -0.0086, -0.0119),
      ],
    },
    {
      alpha: 9,
      stations: [
        s(3, 0.084, -0.0176),
        s(5, 0.0871, -0.0136),
        s(9, 0.0852, -0.0095),
        s(11, 0.0835, -0.0125),
        s(13.88, 0.0888, -0.015),
        s(14.12, 0.0362, -0.0462),
        s(14.5, 0.0328, -0.0491),
        s(15, 0.0336, -0.0471),
        s(15.5, 0.0329, -0.043),
        s(16, 0.031, -0.0377),
        s(17.5, 0.0278, -0.0265),
        s(19.5, 0.0281, -0.031),
        s(20.5, 0.0251, -0.0293),
      ],
    },
  ],
};
