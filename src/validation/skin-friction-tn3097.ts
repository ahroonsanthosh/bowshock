/**
 * Measured turbulent skin friction on cylinders in axial flow, from D. R.
 * Chapman and R. H. Kester, "Turbulent boundary-layer and skin-friction
 * measurements in axial flow along cylinders at Mach numbers between 0.5
 * and 3.6", NACA TN 3097, 1954 (https://ntrs.nasa.gov/citations/19930083801).
 *
 * What was measured (pp. 6 to 10, 14, 18): the average friction on the
 * cylindrical part of 20-degree cone-cylinders, 1 in in diameter, of
 * cylinder fineness about 8, 13 and 23, by direct force (the difference of
 * two body lengths), with the boundary layer tripped and referred, by the
 * measured momentum thickness at the start of the cylinder, to "completely
 * turbulent flow starting with zero boundary-layer thickness" (pp. 8 to
 * 9). Zero heat transfer in the Ames 1- by 3-foot supersonic wind tunnel
 * No. 2 (all data of fig. 17); "wall temperature within 2 percent of
 * recovery temperature" (p. 14). Edge quantities are averages over the
 * cylinder, with Sutherland's law at S = 216 R (p. 10).
 *
 * Table III (report p. 33, PDF p. 34) gives CF / (CF_i)_exp, the ratio of
 * the compressible average coefficient to the incompressible one measured
 * on the same cylinders (extrapolated to M = 0 from the data at M = 0.51
 * and 0.81 with a 2.5 and 6.1% compressibility correction, p. 18),
 * independent of L/D. Column (a) is from the individual points of fig.
 * 17(a), column (b) from faired curves through all Reynolds numbers, fig.
 * 17(b). The mean deviation from the faired curves is about 1% (p. 18).
 * Transcribed from the page image (typed table), checked against the text
 * layer.
 */

export interface Tn3097Ratio {
  readonly mach: number;
  /** CF / (CF_i)exp, table III(a). */
  readonly ratioA: number;
  /** CF / (CF_i)exp, table III(b). */
  readonly ratioB: number;
}

/** Table III at the supersonic Mach numbers. */
export const TN3097_TABLE_III: readonly Tn3097Ratio[] = [
  { mach: 1.99, ratioA: 0.745, ratioB: 0.757 },
  { mach: 2.49, ratioA: 0.671, ratioB: 0.672 },
  { mach: 2.95, ratioA: 0.623, ratioB: 0.63 },
  { mach: 3.36, ratioA: 0.578, ratioB: 0.571 },
  { mach: 3.6, ratioA: 0.551, ratioB: 0.552 },
];

/**
 * Reynolds numbers of the data, on the length of fully turbulent flow:
 * 6e6 to 16e6 for all the direct-force points (fig. 19, legend), with the
 * individual points of fig. 17(a) at 7e6 (L/D 8), 10e6 (13) and 16e6 (23).
 */
export const TN3097_REYNOLDS_RANGE = [6e6, 16e6] as const;

/**
 * The cylinders' measured incompressible coefficient (CF_i)exp below the
 * Karman-Schoenherr value, for L/D = 8, 13, 23 (p. 18): from fig. 17(a)
 * and from fig. 17(b). Negative is above.
 */
export const TN3097_INCOMPRESSIBLE_BELOW_KARMAN_SCHOENHERR = {
  figure17a: [0.025, 0.002, -0.006],
  figure17b: [0.022, 0.002, -0.014],
} as const;

/**
 * Measured wall temperature at M = 3.4: Tw / Tt = 0.940 once steady (fig.
 * 11(a), p. 14), slightly above the adiabatic wall at r = 0.89 because the
 * blowdown tunnel's air cools during a run.
 */
export const TN3097_WALL_OVER_TOTAL_AT_M34 = 0.94;

/**
 * The stagnation temperature is not stated in the report: not in the text
 * layer, the notation, the figure captions or the figure pages (all
 * searched). The tunnel ran on air from a reservoir, "expanded through the
 * nozzle to atmospheric pressure" (p. 6), whose total temperature
 * "decreases at the rate of about 4 F per minute" (p. 14); the wall
 * reached equilibrium after about 5 minutes and fig. 11(b) follows one run
 * for 16 minutes. The comparisons therefore bracket it, 250 to 310 K
 * (reservoir air near ambient less up to about 35 K of cooling: an
 * estimate, not a measurement). Its effect on van Driest II, through
 * Sutherland's law, is measured with the comparison and is below 0.7%.
 */
export const TN3097_STAGNATION_TEMPERATURE_BRACKET = [250, 310] as const;
