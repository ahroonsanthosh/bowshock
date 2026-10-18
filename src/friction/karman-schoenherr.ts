/**
 * The Karman-Schoenherr law of turbulent skin friction on a smooth flat
 * plate in incompressible flow (K. E. Schoenherr, Trans. SNAME 40, 1932,
 * 279-313; the citation as given by the NASA Turbulence Modeling Resource,
 * the paper not read), in the form NACA TN 3097 (p. 9) and NACA RM L54G14
 * (p. 10) state it:
 *
 *   0.242 / sqrt(CF) = log10(Re_x CF),
 *
 * CF being the average friction coefficient over a length x of fully
 * turbulent flow from its origin and Re_x the Reynolds number on x.
 *
 * Writing Y = Re_x CF, the law in closed form is
 *
 *   CF = (0.242 / log10 Y)^2,    Re_x = Y (log10 Y)^2 / 0.242^2,
 *
 * and the momentum balance of a flat plate at constant pressure,
 * d(theta)/dx = cf / 2, gives the momentum-thickness Reynolds number and
 * the local coefficient cf = dY / dRe_x:
 *
 *   Re_theta = Y / 2,    cf = 0.242^2 / (log10 Y (log10 Y + 2 / ln 10)).
 *
 * These are the exact consequences of the law, not further fits. The law
 * puts Y = 1 at Re_x = 0, so Re_theta starts at 1/2 rather than 0: the
 * friction integrated from the origin is (Y - 1) / Re_x where the law
 * states Y / Re_x, a relative difference 1 / (2 Re_theta), below 1e-4 once
 * Re_theta exceeds 5000.
 */

const K = 0.242;
const K2 = K * K;
const LN10 = Math.LN10;

/**
 * Y = Re_x CF for the Reynolds number Re_x: the root of
 * log10(Y)^2 Y = 0.242^2 Re_x with Y >= 1. With u = log10 Y = exp(w) the
 * equation is h(w) = exp(w) ln 10 + 2 w - ln(0.242^2 Re_x) = 0, h convex
 * and increasing on the whole real line, so Newton's method converges from
 * any start, monotonically after its first step.
 */
export function karmanSchoenherrY(reX: number): number {
  if (!(reX >= 0) || !Number.isFinite(reX)) {
    throw new RangeError(`the Reynolds number must be finite and non-negative, got ${reX}`);
  }
  if (reX === 0) return 1;
  const c = Math.log(K2 * reX);
  // Start from CF = 0.003, a typical value.
  let w = Math.log(Math.max(Math.log10(Math.max(0.003 * reX, 10)), 1e-3));
  for (let iteration = 0; iteration < 100; iteration++) {
    const e = Math.exp(w);
    const step = (e * LN10 + 2 * w - c) / (e * LN10 + 2);
    w -= step;
    if (Math.abs(step) < 1e-15) break;
  }
  return 10 ** Math.exp(w);
}

/** Average friction coefficient CF over a turbulent length with Reynolds number Re_x. */
export function karmanSchoenherrAverageCf(reX: number): number {
  const u = Math.log10(karmanSchoenherrY(reX));
  return K2 / (u * u);
}

/** Momentum-thickness Reynolds number Re_theta = Y / 2 at Re_x. */
export function karmanSchoenherrMomentumReynolds(reX: number): number {
  return karmanSchoenherrY(reX) / 2;
}

/** Re_x at which the momentum-thickness Reynolds number is Re_theta (Re_theta >= 1/2). */
export function karmanSchoenherrReynoldsForMomentum(reTheta: number): number {
  if (!(reTheta >= 0.5) || !Number.isFinite(reTheta)) {
    throw new RangeError(`the law reaches only Re_theta >= 1/2, got ${reTheta}`);
  }
  const y = 2 * reTheta;
  const u = Math.log10(y);
  return (y * u * u) / K2;
}

/** Local friction coefficient cf at the momentum-thickness Reynolds number Re_theta (> 1/2). */
export function karmanSchoenherrLocalCf(reTheta: number): number {
  if (!(reTheta > 0.5)) throw new RangeError(`the local law needs Re_theta > 1/2, got ${reTheta}`);
  const u = Math.log10(2 * reTheta);
  return K2 / (u * (u + 2 / LN10));
}

/**
 * The curve fit of the Karman-Schoenherr law in Re_theta given on the
 * Turbulence Modeling Resource (TMR) pages of the flat-plate validation
 * cases (https://tmbwg.github.io/turbmodels/ZPGflatplateSS_val.html):
 *
 *   cf = 1 / (17.08 L^2 + 25.11 L + 6.012),   L = log10 Re_theta.
 *
 * Expanding the exact local law above gives 17.0754 L^2 + 25.1119 L +
 * 6.0121 in the denominator: the fit is that law with rounded coefficients
 * (they differ by at most 1.84e-4 for Re_theta from 200 to 25000 and
 * 2.03e-4 up to 1e6, measured in the tests).
 * Here it serves to verify the van Driest II transformation against the
 * TMR tabulation, which was computed with it.
 */
export function karmanSchoenherrTmrFit(reTheta: number): number {
  const l = Math.log10(reTheta);
  return 1 / (17.08 * l * l + 25.11 * l + 6.012);
}
