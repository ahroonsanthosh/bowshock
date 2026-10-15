/**
 * Measured surface pressures on a tangent-ogive cylinder at zero incidence,
 * from E. W. Perkins and L. H. Jorgensen, "Comparison of experimental and
 * theoretical normal-force distributions (including Reynolds number
 * effects) on an ogive-cylinder body at Mach number 1.98", NACA TN 3716,
 * 1956 (https://ntrs.nasa.gov/citations/19930084497).
 *
 * Model (figure 1): a 3-caliber tangent-ogive nose (ogive radius 9.25 d) on
 * a cylinder, overall length 10 d, d = 1.125 in. Free-stream Mach number
 * 1.98, Reynolds number 0.39e6 per inch (0.44e6 based on d), so the
 * boundary layer is thin on the nose but present: this is wind-tunnel data,
 * not an inviscid solution. The report finds Reynolds-number effects at
 * zero incidence negligible.
 *
 * Transcribed by eye from table I(a) of the NTRS scan, enlarged to 600 and
 * 1200 dpi, with the stations checked against the orifice list of figure 1.
 * Two cells cannot be read reliably: at x/d = 0.56 the table reads 0.222 or
 * 0.212 and the plotted point in figure 3 is at about 0.213; at x/d = 3.62
 * it reads -0.030 or -0.026 and the plot is at about -0.025. Both readings
 * are kept and those stations are marked ambiguous; comparisons leave them
 * out. The report gives the uncertainty of each measured Cp as +-0.005.
 */

export const TN3716_MACH = 1.98;

/** Nose length and ogive radius, in body diameters. */
export const TN3716_NOSE_CALIBERS = 3;
export const TN3716_OGIVE_RADIUS_CALIBERS = 9.25;

export interface Tn3716Station {
  /** Distance from the tip over diameter. */
  readonly xOverD: number;
  /** Pressure coefficient as read from table I(a). */
  readonly cp: number;
  /** The other plausible reading, where the scan is ambiguous. */
  readonly alternative?: number;
}

/** Measured pressure coefficients at zero incidence. */
export const TN3716_ZERO_INCIDENCE: readonly Tn3716Station[] = [
  { xOverD: 0.22, cp: 0.26 },
  { xOverD: 0.56, cp: 0.222, alternative: 0.212 },
  { xOverD: 0.89, cp: 0.165 },
  { xOverD: 1.22, cp: 0.115 },
  { xOverD: 1.61, cp: 0.074 },
  { xOverD: 2.06, cp: 0.026 },
  { xOverD: 2.5, cp: -0.014 },
  { xOverD: 2.95, cp: -0.036 },
  { xOverD: 3.62, cp: -0.03, alternative: -0.026 },
  { xOverD: 4.06, cp: -0.017 },
  { xOverD: 4.5, cp: -0.012 },
  { xOverD: 5.39, cp: -0.009 },
  { xOverD: 6.28, cp: -0.001 },
  { xOverD: 7.17, cp: 0 },
  { xOverD: 8.06, cp: 0.006 },
];

/** Uncertainty of each measured Cp, as stated in the report. */
export const TN3716_CP_UNCERTAINTY = 0.005;
