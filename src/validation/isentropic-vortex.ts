/**
 * The isentropic vortex: a smooth, exact solution of the 2D Euler equations
 * in which a vortex is carried unchanged by a uniform stream. It is the
 * standard test of the order of accuracy of 2D schemes; see C.-W. Shu,
 * "Essentially non-oscillatory and weighted essentially non-oscillatory
 * schemes for hyperbolic conservation laws", in Advanced Numerical
 * Approximation of Nonlinear Hyperbolic Equations, Lecture Notes in
 * Mathematics 1697, Springer, 1998.
 *
 * With background state rho = 1, p = 1 and velocity (u0, v0), and r the
 * distance from the vortex centre,
 *   T     = 1 - (gamma - 1) beta^2 / (8 gamma pi^2) exp(1 - r^2)   (T = p / rho)
 *   rho   = T^(1 / (gamma - 1)),  p = rho^gamma
 *   u, v  = (u0, v0) + beta / (2 pi) exp((1 - r^2) / 2) (-(y - yc), x - xc).
 * tests/validation/isentropic-vortex.test.ts checks that this is an exact
 * steady solution in the vortex frame.
 */

import type { Primitive2D } from '../scheme/flux';

export interface IsentropicVortex {
  readonly strength: number;
  /** Centre at t = 0. */
  readonly x0: number;
  readonly y0: number;
  /** Background velocity. */
  readonly u0: number;
  readonly v0: number;
  /** The solution is periodic in x and y with this period (0 for an unbounded domain). */
  readonly period: number;
}

/** Exact state at (x, y) and time t. */
export function isentropicVortex(
  vortex: IsentropicVortex,
  x: number,
  y: number,
  t: number,
  gamma: number,
): Primitive2D {
  const { strength: beta, period } = vortex;
  // Displacement from the vortex centre at time t, wrapped to the nearest
  // periodic image so the solution is periodic.
  const wrap = (d: number) => (period > 0 ? d - period * Math.round(d / period) : d);
  const dx = wrap(x - vortex.x0 - vortex.u0 * t);
  const dy = wrap(y - vortex.y0 - vortex.v0 * t);
  const r2 = dx * dx + dy * dy;
  const temperature =
    1 - (((gamma - 1) * beta * beta) / (8 * gamma * Math.PI * Math.PI)) * Math.exp(1 - r2);
  const rho = temperature ** (1 / (gamma - 1));
  const swirl = (beta / (2 * Math.PI)) * Math.exp(0.5 * (1 - r2));
  return {
    rho,
    u: vortex.u0 - swirl * dy,
    v: vortex.v0 + swirl * dx,
    p: rho ** gamma,
  };
}
