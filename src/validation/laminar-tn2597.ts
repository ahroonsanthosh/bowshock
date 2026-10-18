/**
 * Laminar flat-plate friction in compressible flow as computed by E. R.
 * van Driest, "Investigation of laminar boundary layer in compressible
 * fluids using the Crocco method", NACA TN 2597, 1952
 * (https://ntrs.nasa.gov/citations/19930083425), figure 3 (report p. 30,
 * PDF p. 32): the mean coefficient CF sqrt(Re_x) against Mach number for
 * an insulated (adiabatic) plate and for wall-to-free-stream temperature
 * ratios 0.25, 1, 2, 4 and 6. Conditions (pp. 20 to 21 and the figure):
 * Prandtl number 0.75, constant specific heat, gamma = 1.4, Sutherland's
 * law with S / T_inf = 0.505 (S = 110 K, T_inf = -67.6 F). The report
 * states its results are "within 0.5 percent for friction and heat
 * transfer at the plate" (p. 21). Theory, not measurement: used to check
 * the similarity solver (src/friction/laminar.ts), not to measure
 * model-form error.
 *
 * Digitised once, from the 300 dpi scan rotated so that M runs to the
 * right: each of the 21 horizontal gridlines (CF sqrt(Re) = 0.40 to 1.40
 * in steps of 0.05) and 40 vertical gridlines (M = 0.5 to 20 in steps of
 * 0.5) was fitted as a straight line through its darkest pixels (the scan
 * is turned by about 0.6 degrees), and each curve was read at the centre
 * of its dark run along a pixel column chosen between gridlines, with the
 * value interpolated between the fitted lines bracketing it. Curves were
 * told apart by their order, which the figure's labels give at the right
 * and which changes only where the insulated curve crosses the others;
 * runs where two curves merge were not used. Reading precision: the
 * curves are 5 to 8 px wide at 1132 px per unit, so about +-0.002. At
 * M = 0.27, where the Tw / T_inf = 1 and insulated curves merge (the
 * Blasius value 1.328 with a compressibility change below 0.1%), the
 * reading is 1.323: the readings may sit about 0.4% low.
 */

export interface Tn2597Point {
  readonly mach: number;
  /** Wall over free-stream temperature, or 'adiabatic' for the insulated plate. */
  readonly wall: number | 'adiabatic';
  /** CF sqrt(Re_x), the mean coefficient: twice cf sqrt(Re_x). */
  readonly cfMeanSqrtRe: number;
}

export const TN2597_PRANDTL = 0.75;
/** Sutherland's constant over the free-stream temperature. */
export const TN2597_SUTHERLAND_RATIO = 0.505;

export const TN2597_FIGURE_3: readonly Tn2597Point[] = [
  { mach: 0.27, wall: 0.25, cfMeanSqrtRe: 1.354 },
  { mach: 0.268, wall: 2, cfMeanSqrtRe: 1.2665 },
  { mach: 0.263, wall: 4, cfMeanSqrtRe: 1.1763 },
  { mach: 0.261, wall: 6, cfMeanSqrtRe: 1.1138 },
  { mach: 1.286, wall: 0.25, cfMeanSqrtRe: 1.3512 },
  { mach: 1.284, wall: 1, cfMeanSqrtRe: 1.3182 },
  { mach: 1.283, wall: 'adiabatic', cfMeanSqrtRe: 1.297 },
  { mach: 1.281, wall: 2, cfMeanSqrtRe: 1.261 },
  { mach: 1.277, wall: 4, cfMeanSqrtRe: 1.1716 },
  { mach: 1.274, wall: 6, cfMeanSqrtRe: 1.111 },
  { mach: 2.29, wall: 0.25, cfMeanSqrtRe: 1.3425 },
  { mach: 2.288, wall: 1, cfMeanSqrtRe: 1.3069 },
  { mach: 2.281, wall: 4, cfMeanSqrtRe: 1.1626 },
  { mach: 2.278, wall: 6, cfMeanSqrtRe: 1.104 },
  { mach: 3.284, wall: 0.25, cfMeanSqrtRe: 1.327 },
  { mach: 3.282, wall: 1, cfMeanSqrtRe: 1.2873 },
  { mach: 3.28, wall: 2, cfMeanSqrtRe: 1.2319 },
  { mach: 3.278, wall: 'adiabatic', cfMeanSqrtRe: 1.197 },
  { mach: 3.276, wall: 4, cfMeanSqrtRe: 1.1508 },
  { mach: 3.273, wall: 6, cfMeanSqrtRe: 1.096 },
  { mach: 4.288, wall: 0.25, cfMeanSqrtRe: 1.3028 },
  { mach: 4.286, wall: 1, cfMeanSqrtRe: 1.2629 },
  { mach: 4.284, wall: 2, cfMeanSqrtRe: 1.2111 },
  { mach: 4.279, wall: 6, cfMeanSqrtRe: 1.0822 },
  { mach: 6.287, wall: 0.25, cfMeanSqrtRe: 1.2401 },
  { mach: 6.285, wall: 1, cfMeanSqrtRe: 1.2075 },
  { mach: 6.284, wall: 2, cfMeanSqrtRe: 1.1612 },
  { mach: 6.281, wall: 4, cfMeanSqrtRe: 1.0989 },
  { mach: 6.279, wall: 6, cfMeanSqrtRe: 1.0514 },
  { mach: 6.278, wall: 'adiabatic', cfMeanSqrtRe: 1.0126 },
  { mach: 8.271, wall: 'adiabatic', cfMeanSqrtRe: 0.919 },
  { mach: 10.265, wall: 'adiabatic', cfMeanSqrtRe: 0.8473 },
];
