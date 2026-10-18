/**
 * Flight measurements of average turbulent skin friction on a body of
 * revolution, from J. D. Loposer and C. B. Rumsey, "Flight measurements of
 * average skin-friction coefficients on a parabolic body of revolution
 * (NACA RM-10) at Mach numbers from 1.0 to 3.7", NACA RM L54G14, 1954
 * (https://ntrs.nasa.gov/citations/20030068110; the scan has no text
 * layer, its pages were read as images).
 *
 * Model and measurement (pp. 3 to 6, fig. 1): full-scale RM-10, a
 * parabolic body Y = 6.000 - 0.0007407 X^2 inches (X from station 90, the
 * maximum diameter of 12 in; station = inches from the nose), cut off at
 * station 146.5, with four fins at the rear. Contour within 0.25% of the
 * local diameter, roughness below 60 microinches peak to valley except at
 * the joints (threaded joints at stations 23, 80 and 125; a step of about
 * 0.005 in remained at station 80). Average
 * friction on the wetted area ahead of a boundary-layer rake at station
 * 125, from the momentum of the measured profiles; Reynolds number on the
 * axial distance to the station, 40e6 to 170e6 over the tests.
 *
 * Figure 10 (report p. 28, PDF p. 29) gives CF / CF_i at zero heating
 * (read by the authors from fairings of the per-model time histories of
 * fig. 7 where the heating parameter crosses zero), CF_i being the
 * Karman-Schoenherr value at the same Reynolds number, which towing-tank
 * tests of the full-scale body agree with (p. 8, ref. 11). "Most of the
 * experimental points on figure 10 are for a Reynolds number of
 * approximately 60 x 10^6" (p. 8); the per-point value is not given, nor
 * the free-stream temperature. The report's comparison theory, "Van
 * Driest's theory" (ref. 2: NAA report AL-997, 1950), is not shown to be
 * the van Driest II of 1956 used here, so its "7 percent" (p. 7) is not
 * transferred; the comparison is recomputed.
 *
 * Digitised once, from the native 240 ppi scan of the page: every gridline
 * (CF / CF_i from 0 to 1.2 in steps of 0.1, M from 0 to 3.2 in steps of
 * 0.2) was fitted as a straight line through the centres of its dark runs
 * (the scan is turned by about 0.35 degrees), and each value interpolated
 * between the two fitted lines bracketing the point. The plotted symbols
 * carry a centre dot: ten were found as isolated dark components of 3 to
 * 60 pixels enclosed by a symbol outline, three (where the dot touches a
 * gridline or an outline) from a pixel printout of the symbol. Each was
 * checked by eye on a 3 to 8 times enlargement of its symbol (within 1.5
 * px). One pixel is 0.00104 in CF / CF_i and 0.0021 in M; the reading is
 * good to about +-0.002 and +-0.004. The symbols distinguish five models,
 * flight phases and one point of ref. 5 (Maloney, RM L54D06, M = 1.84);
 * the assignment is not needed here and is not recorded.
 */

export interface RmL54g14Point {
  readonly mach: number;
  /** CF / CF_i at zero heating. */
  readonly ratio: number;
  /** The plotted symbol, as read. */
  readonly symbol: string;
}

export const RM_L54G14_FIGURE_10: readonly RmL54g14Point[] = [
  { mach: 1.04, ratio: 0.9527, symbol: 'D shape' },
  { mach: 1.078, ratio: 0.9379, symbol: 'D shape with flag' },
  { mach: 1.102, ratio: 0.9865, symbol: 'triangle with flag (dot read by hand)' },
  { mach: 1.141, ratio: 1.0093, symbol: 'circle with flag' },
  { mach: 1.168, ratio: 0.9314, symbol: 'triangle with tail' },
  { mach: 1.18, ratio: 0.9676, symbol: 'triangle' },
  { mach: 1.2, ratio: 1.01, symbol: 'circle with tail (dot read by hand)' },
  { mach: 1.84, ratio: 0.8395, symbol: 'house shape' },
  { mach: 2.38, ratio: 0.7825, symbol: 'diamond with tail' },
  { mach: 2.559, ratio: 0.6653, symbol: 'D shape with tail' },
  { mach: 2.7, ratio: 0.795, symbol: 'triangle with tick' },
  { mach: 2.741, ratio: 0.774, symbol: 'triangle with tail (dot read by hand)' },
  { mach: 2.901, ratio: 0.7117, symbol: 'circle' },
];

/** Reading precision of the digitised points. */
export const RM_L54G14_READING = { ratio: 0.002, mach: 0.004 } as const;

/** The nominal Reynolds number of figure 10, on the axial length to the rake. */
export const RM_L54G14_REYNOLDS = 60e6;

/** Station of the rake, inches from the nose. */
export const RM_L54G14_STATION = 125;

/** Body radius in inches at station x (fig. 1): Y = 6 - 0.0007407 (x - 90)^2, with 0.0007407 = 6 / 8100. */
export function rmL54g14Radius(x: number): number {
  return 6 - (6 / 8100) * (x - 90) ** 2;
}

/**
 * Free-stream temperature bracket of the comparisons, kelvin: not given
 * per point; the standard atmosphere from sea level (288.15 K) to the
 * tropopause (216.65 K). If every point were at Re = 60e6 on 3.18 m, the
 * standard atmosphere would put the Mach 1.04 point at 2.7 km (271 K),
 * Mach 1.84 at 8.3 km (234 K) and Mach 2.9 at 11.9 km (216.65 K): an
 * inference, not a measurement.
 */
export const RM_L54G14_TEMPERATURE_BRACKET = [216.65, 288.15] as const;
