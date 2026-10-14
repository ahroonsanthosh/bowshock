/**
 * Exact solution of the Riemann problem for the one-dimensional Euler
 * equations of a calorically perfect gas.
 *
 * Reference: E. F. Toro, "Riemann Solvers and Numerical Methods for Fluid
 * Dynamics", 3rd ed., Springer, 2009, chapter 4. The pressure function, its
 * derivative, the star-region states and the sampling formulas below follow
 * that chapter.
 *
 * This solver is the reference that the numerical schemes are tested
 * against, so it is written for clarity and robustness rather than speed:
 * Newton iteration safeguarded by bisection, converged to round-off.
 *
 * Wave structure: a left wave (shock or rarefaction), a contact
 * discontinuity moving at the star velocity u*, and a right wave. Pressure
 * and velocity are continuous across the contact; density jumps.
 */

import { soundSpeed, type Primitive1D } from './gas';

export interface StarRegion {
  /** Pressure between the left and right waves. */
  readonly pStar: number;
  /** Velocity between the left and right waves (the contact speed). */
  readonly uStar: number;
  /** Density between the left wave and the contact. */
  readonly rhoStarL: number;
  /** Density between the contact and the right wave. */
  readonly rhoStarR: number;
  readonly leftWave: 'shock' | 'rarefaction';
  readonly rightWave: 'shock' | 'rarefaction';
}

export class VacuumError extends Error {
  constructor() {
    super(
      'The initial states generate a vacuum (pressure positivity condition violated); ' +
        'this solver does not handle vacuum.',
    );
    this.name = 'VacuumError';
  }
}

/**
 * The function f_K(p) for one side K of the Riemann problem (Toro ch. 4)
 * and its derivative with respect to p. The velocity jump across
 * wave K is f_K(p*), so the star pressure solves
 * f_L(p) + f_R(p) + (u_R - u_L) = 0.
 */
function waveFunction(
  p: number,
  side: Primitive1D,
  gamma: number,
): { readonly f: number; readonly df: number } {
  const a = soundSpeed(side.rho, side.p, gamma);
  if (p > side.p) {
    // Shock: Rankine-Hugoniot relations.
    const A = 2 / ((gamma + 1) * side.rho);
    const B = ((gamma - 1) / (gamma + 1)) * side.p;
    const root = Math.sqrt(A / (p + B));
    return { f: (p - side.p) * root, df: root * (1 - (p - side.p) / (2 * (B + p))) };
  }
  // Rarefaction: isentropic relations.
  const ratio = p / side.p;
  const exponent = (gamma - 1) / (2 * gamma);
  return {
    f: ((2 * a) / (gamma - 1)) * (Math.pow(ratio, exponent) - 1),
    df: (1 / (side.rho * a)) * Math.pow(ratio, -(gamma + 1) / (2 * gamma)),
  };
}

/** Solve for the star region. Throws VacuumError if the data generate a vacuum. */
export function solveStarRegion(left: Primitive1D, right: Primitive1D, gamma: number): StarRegion {
  assertPhysical(left, 'left');
  assertPhysical(right, 'right');

  const aL = soundSpeed(left.rho, left.p, gamma);
  const aR = soundSpeed(right.rho, right.p, gamma);
  const du = right.u - left.u;

  // Pressure positivity condition (Toro ch. 4). If it fails, the two
  // rarefactions are strong enough to create a vacuum between them.
  if ((2 / (gamma - 1)) * (aL + aR) <= du) {
    throw new VacuumError();
  }

  const g = (p: number) => {
    const l = waveFunction(p, left, gamma);
    const r = waveFunction(p, right, gamma);
    return { value: l.f + r.f + du, slope: l.df + r.df };
  };

  // g is monotonically increasing in p, g(0) < 0 by the positivity
  // condition, and g grows without bound, so a bracket [lo, hi] exists.
  let lo = 0;
  let hi = Math.max(left.p, right.p);
  while (g(hi).value < 0) {
    lo = hi;
    hi *= 2;
  }

  // Initial guess: the two-rarefaction approximation (Toro ch. 4), which
  // is exact when both waves are rarefactions; clipped into the bracket.
  const exponent = (gamma - 1) / (2 * gamma);
  const twoRarefaction = Math.pow(
    (aL + aR - 0.5 * (gamma - 1) * du) /
      (aL / Math.pow(left.p, exponent) + aR / Math.pow(right.p, exponent)),
    1 / exponent,
  );
  let p = Math.min(Math.max(twoRarefaction, lo), hi);
  if (!(p > lo && p < hi)) p = 0.5 * (lo + hi);

  // Newton iteration, falling back to bisection whenever a Newton step
  // would leave the bracket. Converges to round-off.
  for (let iteration = 0; iteration < 200; iteration++) {
    const { value, slope } = g(p);
    if (value === 0) break;
    if (value < 0) lo = p;
    else hi = p;

    let next = p - value / slope;
    if (!(next > lo && next < hi)) next = 0.5 * (lo + hi);

    const converged = Math.abs(next - p) <= 1e-15 * Math.max(p, Number.MIN_VALUE);
    p = next;
    if (converged || hi - lo <= 4 * Number.EPSILON * hi) break;
  }

  const fL = waveFunction(p, left, gamma).f;
  const fR = waveFunction(p, right, gamma).f;
  const uStar = 0.5 * (left.u + right.u) + 0.5 * (fR - fL);

  return {
    pStar: p,
    uStar,
    rhoStarL: starDensity(p, left, gamma),
    rhoStarR: starDensity(p, right, gamma),
    leftWave: p > left.p ? 'shock' : 'rarefaction',
    rightWave: p > right.p ? 'shock' : 'rarefaction',
  };
}

/** Density behind wave K: shock (Rankine-Hugoniot) or rarefaction (isentropic). */
function starDensity(pStar: number, side: Primitive1D, gamma: number): number {
  const ratio = pStar / side.p;
  if (pStar > side.p) {
    const g = (gamma - 1) / (gamma + 1);
    return side.rho * ((ratio + g) / (g * ratio + 1));
  }
  return side.rho * Math.pow(ratio, 1 / gamma);
}

/**
 * Sample the self-similar solution at speed s = x / t (Toro ch. 4).
 * `star` must come from solveStarRegion for the same states.
 */
export function sampleRiemann(
  left: Primitive1D,
  right: Primitive1D,
  star: StarRegion,
  s: number,
  gamma: number,
): Primitive1D {
  const { pStar, uStar } = star;
  const gm1 = gamma - 1;
  const gp1 = gamma + 1;

  if (s <= uStar) {
    // Left of the contact.
    const aL = soundSpeed(left.rho, left.p, gamma);
    if (star.leftWave === 'shock') {
      const shockSpeed =
        left.u - aL * Math.sqrt((gp1 / (2 * gamma)) * (pStar / left.p) + gm1 / (2 * gamma));
      return s <= shockSpeed ? left : { rho: star.rhoStarL, u: uStar, p: pStar };
    }
    const head = left.u - aL;
    const aStar = aL * Math.pow(pStar / left.p, gm1 / (2 * gamma));
    const tail = uStar - aStar;
    if (s <= head) return left;
    if (s >= tail) return { rho: star.rhoStarL, u: uStar, p: pStar };
    // Inside the left rarefaction fan.
    const c = 2 / gp1 + (gm1 / (gp1 * aL)) * (left.u - s);
    return {
      rho: left.rho * Math.pow(c, 2 / gm1),
      u: (2 / gp1) * (aL + 0.5 * gm1 * left.u + s),
      p: left.p * Math.pow(c, (2 * gamma) / gm1),
    };
  }

  // Right of the contact.
  const aR = soundSpeed(right.rho, right.p, gamma);
  if (star.rightWave === 'shock') {
    const shockSpeed =
      right.u + aR * Math.sqrt((gp1 / (2 * gamma)) * (pStar / right.p) + gm1 / (2 * gamma));
    return s >= shockSpeed ? right : { rho: star.rhoStarR, u: uStar, p: pStar };
  }
  const head = right.u + aR;
  const aStar = aR * Math.pow(pStar / right.p, gm1 / (2 * gamma));
  const tail = uStar + aStar;
  if (s >= head) return right;
  if (s <= tail) return { rho: star.rhoStarR, u: uStar, p: pStar };
  // Inside the right rarefaction fan.
  const c = 2 / gp1 - (gm1 / (gp1 * aR)) * (right.u - s);
  return {
    rho: right.rho * Math.pow(c, 2 / gm1),
    u: (2 / gp1) * (-aR + 0.5 * gm1 * right.u + s),
    p: right.p * Math.pow(c, (2 * gamma) / gm1),
  };
}

/**
 * Exact solution on a set of points at time t > 0, for a discontinuity
 * initially at x0.
 */
export function exactRiemannProfile(
  left: Primitive1D,
  right: Primitive1D,
  x: ArrayLike<number>,
  x0: number,
  t: number,
  gamma: number,
): Primitive1D[] {
  if (!(t > 0)) throw new RangeError('t must be positive');
  const star = solveStarRegion(left, right, gamma);
  return Array.from({ length: x.length }, (_, i) =>
    sampleRiemann(left, right, star, ((x[i] ?? NaN) - x0) / t, gamma),
  );
}

function assertPhysical(w: Primitive1D, name: string): void {
  if (!(w.rho > 0 && w.p > 0 && Number.isFinite(w.u))) {
    throw new RangeError(`${name} state must have positive density and pressure`);
  }
}
