/**
 * Calorically perfect gas: the equation of state used throughout bowshock.
 *
 * Pressure p, density rho and specific internal energy e are related by
 * p = (gamma - 1) * rho * e, with a constant ratio of specific heats gamma.
 * For air, gamma is close to 1.40 near room temperature and falls slowly as
 * vibrational modes are excited (to roughly 1.34 near 1000 K). Stagnation
 * temperatures of amateur rockets reach about 900 K at Mach 4 in the
 * stratosphere, so the constant-gamma assumption is a documented limitation
 * at the top of the Mach range.
 *
 * Conserved variables per unit volume: density rho, momentum rho*u and total
 * energy E = rho*e + rho*u^2/2. These scalar functions are shared by every
 * engine; the GPU has WGSL twins in src/engine-gpu/shaders/gas.wgsl.
 */

/** Ratio of specific heats for air. */
export const GAMMA_AIR = 1.4;

/** One-dimensional primitive state. */
export interface Primitive1D {
  readonly rho: number;
  readonly u: number;
  readonly p: number;
}

/** Total energy per unit volume from primitive variables. */
export function totalEnergy(rho: number, u: number, p: number, gamma: number): number {
  return p / (gamma - 1) + 0.5 * rho * u * u;
}

/** Pressure from conserved variables. */
export function pressureFromConserved(
  rho: number,
  mom: number,
  energy: number,
  gamma: number,
): number {
  return (gamma - 1) * (energy - (0.5 * mom * mom) / rho);
}

/** Speed of sound a = sqrt(gamma * p / rho). */
export function soundSpeed(rho: number, p: number, gamma: number): number {
  return Math.sqrt((gamma * p) / rho);
}
