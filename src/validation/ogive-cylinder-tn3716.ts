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
 * not an inviscid solution.
 *
 * Transcribed by eye from table I(a) of the NTRS scan, enlarged to 600 dpi,
 * and checked against the orifice stations of figure 1. The scan is poor:
 * at x/d = 2.95 the last digit reads 6 but may be 8 (-0.036 or -0.038), so
 * comparisons should allow at least 0.002 in Cp for transcription.
 */

export const TN3716_MACH = 1.98;

/** Nose length and ogive radius, in body diameters. */
export const TN3716_NOSE_CALIBERS = 3;
export const TN3716_OGIVE_RADIUS_CALIBERS = 9.25;

/** Distance from the tip over diameter, and pressure coefficient (alpha = 0). */
export const TN3716_ZERO_INCIDENCE: readonly { readonly xOverD: number; readonly cp: number }[] = [
  { xOverD: 0.22, cp: 0.26 },
  { xOverD: 0.56, cp: 0.222 },
  { xOverD: 0.89, cp: 0.165 },
  { xOverD: 1.22, cp: 0.115 },
  { xOverD: 1.61, cp: 0.074 },
  { xOverD: 2.06, cp: 0.026 },
  { xOverD: 2.5, cp: -0.014 },
  { xOverD: 2.95, cp: -0.036 },
  { xOverD: 3.62, cp: -0.03 },
  { xOverD: 4.06, cp: -0.017 },
  { xOverD: 4.5, cp: -0.012 },
  { xOverD: 5.39, cp: -0.009 },
  { xOverD: 6.28, cp: -0.001 },
  { xOverD: 7.17, cp: 0 },
  { xOverD: 8.06, cp: 0.006 },
];

/** Transcription uncertainty of the tabulated Cp, from the quality of the scan. */
export const TN3716_TRANSCRIPTION_UNCERTAINTY = 0.002;
