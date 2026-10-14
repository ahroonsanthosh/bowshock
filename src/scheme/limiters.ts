/**
 * Slope limiters for MUSCL reconstruction.
 *
 * Given the backward difference a = q_i - q_{i-1} and the forward
 * difference b = q_{i+1} - q_i of some variable q, a limiter returns the
 * slope used to reconstruct q at the faces of cell i. Limiting prevents new
 * extrema (oscillations) near shocks; the price is that accuracy drops to
 * first order at smooth extrema.
 *
 * All the TVD limiters here (everything except unlimitedCentral) return 0
 * when a and b have opposite signs, i.e. at a local extremum, which makes
 * the reconstruction total-variation diminishing.
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
 * Van Albada limiter (G. D. van Albada, B. van Leer and W. W. Roberts, "A
 * comparative study of computational methods in cosmic gas dynamics",
 * Astron. Astrophys. 108, 1982), in its TVD form that is zero at extrema.
 * Smooth, so it does not hinder convergence to steady state.
 */
export const vanAlbada: Limiter = (a, b) => {
  // After this guard a and b are non-zero with the same sign, so the
  // denominator is positive: no epsilon is needed.
  if (a * b <= 0) return 0;
  return (a * b * b + b * a * a) / (a * a + b * b);
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
