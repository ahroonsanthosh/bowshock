/**
 * Analytic relations of compressible gas dynamics for a calorically perfect
 * gas, used as exact references by the 2D validation cases. The relations
 * are standard (see for example NACA Report 1135, "Equations, Tables, and
 * Charts for Compressible Flow", 1953) and are tested in
 * tests/validation/gas-dynamics.test.ts against their own consistency
 * conditions rather than against copied table values.
 */

/** Mach angle mu = asin(1 / M), radians. */
export function machAngle(mach: number): number {
  if (!(mach >= 1)) throw new RangeError('the Mach angle needs M >= 1');
  return Math.asin(1 / mach);
}

/**
 * Flow deflection theta (radians) produced by an oblique shock of wave
 * angle beta in a stream of Mach number M (the theta-beta-Mach relation):
 * tan(theta) = 2 cot(beta) (M^2 sin^2(beta) - 1) / (M^2 (gamma + cos(2 beta)) + 2).
 */
export function deflectionAngle(mach: number, beta: number, gamma: number): number {
  const m2s2 = mach * mach * Math.sin(beta) ** 2;
  return Math.atan(
    (2 * (m2s2 - 1)) / (Math.tan(beta) * (mach * mach * (gamma + Math.cos(2 * beta)) + 2)),
  );
}

export interface ObliqueShock {
  /** Wave angle relative to the upstream flow, radians. */
  readonly beta: number;
  readonly pressureRatio: number;
  readonly densityRatio: number;
  readonly downstreamMach: number;
}

/**
 * Weak oblique shock attached to a wedge of half-angle theta (radians) in a
 * stream of Mach number M. Throws if theta exceeds the detachment angle.
 */
export function obliqueShock(mach: number, theta: number, gamma: number): ObliqueShock {
  const lo0 = machAngle(mach);
  const betaMax = maxDeflectionWaveAngle(mach, gamma);
  if (theta > deflectionAngle(mach, betaMax, gamma)) {
    throw new RangeError('deflection exceeds the detachment angle; the shock is detached');
  }
  // On the weak branch, deflection increases monotonically from 0 at the
  // Mach angle to its maximum at betaMax: bisect.
  let lo = lo0;
  let hi = betaMax;
  for (let k = 0; k < 200 && hi - lo > 1e-15; k++) {
    const mid = 0.5 * (lo + hi);
    if (deflectionAngle(mach, mid, gamma) < theta) lo = mid;
    else hi = mid;
  }
  const beta = 0.5 * (lo + hi);
  const mn1 = mach * Math.sin(beta);
  const shock = normalShock(mn1, gamma);
  return {
    beta,
    pressureRatio: shock.pressureRatio,
    densityRatio: shock.densityRatio,
    downstreamMach: shock.downstreamMach / Math.sin(beta - theta),
  };
}

/** Wave angle of maximum deflection for Mach number M (the detachment limit). */
export function maxDeflectionWaveAngle(mach: number, gamma: number): number {
  // Golden-section search for the maximum of the unimodal deflection angle.
  let a = machAngle(mach);
  let b = Math.PI / 2;
  const r = (Math.sqrt(5) - 1) / 2;
  for (let k = 0; k < 200 && b - a > 1e-14; k++) {
    const c = b - r * (b - a);
    const d = a + r * (b - a);
    if (deflectionAngle(mach, c, gamma) < deflectionAngle(mach, d, gamma)) a = c;
    else b = d;
  }
  return 0.5 * (a + b);
}

export interface NormalShock {
  readonly pressureRatio: number;
  readonly densityRatio: number;
  readonly downstreamMach: number;
}

/** Normal shock relations for upstream normal Mach number M >= 1. */
export function normalShock(mach: number, gamma: number): NormalShock {
  if (!(mach >= 1)) throw new RangeError('a shock needs a supersonic normal Mach number');
  const m2 = mach * mach;
  return {
    pressureRatio: 1 + ((2 * gamma) / (gamma + 1)) * (m2 - 1),
    densityRatio: ((gamma + 1) * m2) / ((gamma - 1) * m2 + 2),
    downstreamMach: Math.sqrt(((gamma - 1) * m2 + 2) / (2 * gamma * m2 - (gamma - 1))),
  };
}

/** Prandtl-Meyer function nu(M), radians. */
export function prandtlMeyer(mach: number, gamma: number): number {
  if (!(mach >= 1)) throw new RangeError('the Prandtl-Meyer function needs M >= 1');
  const k = (gamma + 1) / (gamma - 1);
  const m = Math.sqrt(mach * mach - 1);
  return Math.sqrt(k) * Math.atan(m / Math.sqrt(k)) - Math.atan(m);
}

/** Mach number with Prandtl-Meyer angle nu (radians); inverse of prandtlMeyer. */
export function machFromPrandtlMeyer(nu: number, gamma: number): number {
  const nuMax = (Math.PI / 2) * (Math.sqrt((gamma + 1) / (gamma - 1)) - 1);
  if (!(nu >= 0 && nu < nuMax)) throw new RangeError('nu is outside the Prandtl-Meyer range');
  // nu(M) is increasing; bracket and bisect.
  let lo = 1;
  let hi = 2;
  while (prandtlMeyer(hi, gamma) < nu) hi *= 2;
  for (let k = 0; k < 200 && hi - lo > 1e-14 * hi; k++) {
    const mid = 0.5 * (lo + hi);
    if (prandtlMeyer(mid, gamma) < nu) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** Ratio of stagnation to static pressure, p0 / p, for isentropic flow. */
export function stagnationPressureRatio(mach: number, gamma: number): number {
  return (1 + 0.5 * (gamma - 1) * mach * mach) ** (gamma / (gamma - 1));
}
