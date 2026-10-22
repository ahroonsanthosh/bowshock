/**
 * Slope limiters for MUSCL reconstruction.
 *
 * Given the backward difference a = q_i - q_{i-1} and the forward
 * difference b = q_{i+1} - q_i of some variable q, a limiter returns the
 * slope used to reconstruct q at the faces of cell i. Limiting prevents new
 * extrema (oscillations) near shocks; the price is that accuracy drops to
 * first order at smooth extrema.
 *
 * The TVD limiters here (first order, minmod, van Leer and monotonized
 * central) return 0 when a and b have opposite signs, i.e. at a local
 * extremum, which makes the reconstruction total-variation diminishing. The
 * smooth van Albada limiter, for steady problems, and the unlimited slope,
 * for accuracy tests, are not TVD.
 *
 * MUSCL reconstruction: B. van Leer, "Towards the ultimate conservative
 * difference scheme. V. A second-order sequel to Godunov's method",
 * J. Comput. Phys. 32, 1979.
 */

export type Limiter = (a: number, b: number) => number;

/** No slope: first-order (Godunov) reconstruction. */
export const firstOrder: Limiter = () => 0;

/** Most dissipative TVD limiter: the smaller slope, or 0 at extrema. */
export const minmod: Limiter = (a, b) => {
  if (a * b <= 0) return 0;
  return Math.abs(a) < Math.abs(b) ? a : b;
};

/**
 * Van Leer's harmonic-mean limiter (B. van Leer, "Towards the ultimate
 * conservative difference scheme. II. Monotonicity and conservation combined
 * in a second-order scheme", J. Comput. Phys. 14, 1974).
 */
export const vanLeer: Limiter = (a, b) => {
  if (a * b <= 0) return 0;
  return (2 * a * b) / (a + b);
};

/**
 * Smoothing constant of the van Albada limiter. It matters only where both
 * one-sided differences are below about 1e-3 (nearly uniform flow), where it
 * turns limiting off smoothly. It assumes nondimensional variables of order
 * one, as all bowshock engines use. Measured on a supersonic wedge: the
 * steady residual falls to round-off (about 5e-14) with 1e-6, stalls near
 * 3e-12 with 1e-12, and with 1e-3 converges fastest but visibly smears the
 * solution.
 */
export const VAN_ALBADA_EPSILON = 1e-6;

/**
 * Van Albada limiter, in its original smooth form (G. D. van Albada,
 * B. van Leer and W. W. Roberts, "A comparative study of computational
 * methods in cosmic gas dynamics", Astron. Astrophys. 108, 1982).
 *
 * Unlike the other limiters it is a smooth function of a and b and is not
 * forced to zero at extrema, so it is not strictly TVD there. That
 * smoothness is why it is the choice for steady-state problems: limiters
 * with switches (including a TVD version of this one) can cycle between
 * branches and stall convergence. On a supersonic wedge the TVD version
 * stalled at a residual of about 2e-3; this form converges to round-off.
 */
export const vanAlbada: Limiter = (a, b) => {
  const eps = VAN_ALBADA_EPSILON;
  return (a * (b * b + eps) + b * (a * a + eps)) / (a * a + b * b + 2 * eps);
};

/**
 * Monotonized central limiter, minmod(2a, 2b, (a + b) / 2) (B. van Leer,
 * "Towards the ultimate conservative difference scheme. IV. A new approach
 * to numerical convection", J. Comput. Phys. 23, 1977).
 */
export const monotonizedCentral: Limiter = (a, b) => {
  if (a * b <= 0) return 0;
  const sign = a > 0 ? 1 : -1;
  return sign * Math.min(2 * Math.abs(a), 2 * Math.abs(b), 0.5 * Math.abs(a + b));
};

/**
 * Unlimited central slope (a + b) / 2. Not TVD: oscillates at shocks. Used
 * only to verify formal second-order accuracy on smooth solutions.
 */
export const unlimitedCentral: Limiter = (a, b) => 0.5 * (a + b);

export const LIMITERS = {
  firstOrder,
  minmod,
  vanLeer,
  vanAlbada,
  monotonizedCentral,
  unlimitedCentral,
} as const satisfies Record<string, Limiter>;

export type LimiterName = keyof typeof LIMITERS;
