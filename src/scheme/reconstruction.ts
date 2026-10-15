/**
 * How face states are reconstructed from cell values along a grid line.
 *
 * - 'perVariable': each primitive variable has its own limited slope (the
 *   classical MUSCL scheme). With captured shocks in steady flow it can fall
 *   into a limit cycle and stall convergence: on a supersonic wedge the
 *   residual stalled at 7e-3 to 2e-2 and the integrated force fluctuated by
 *   up to 4e-4 relative.
 *
 * - 'shared': the van Albada limiter applied to the state as a vector. With
 *   A and B the backward and forward differences of (rho, u, v, p), one
 *   factor
 *     f = 2 (A.B + eps) / (|A|^2 + |B|^2 + 2 eps), clipped at zero,
 *   scales the central slope of every variable. Because all variables move
 *   together, the cells inside a captured shock cannot cycle between
 *   limiter states variable by variable, and steady flows with shocks
 *   converge to round-off. A per-variable minimum of factors was tried
 *   first: it cured the wedge, but amplified round-off where a variable
 *   with tiny slopes owned the minimum, and cycled next to cone surfaces.
 *   The vector factor weights the variables by their nondimensional
 *   differences, as eps does, so it assumes variables of order one.
 *   Requires the 'vanAlbada' limiter.
 *
 * The evidence for both is recorded in docs/design/0003-2d-solver.md.
 */

import type { Primitive2D } from './flux';
import { type Limiter, VAN_ALBADA_EPSILON } from './limiters';

export type Reconstruction = 'perVariable' | 'shared';

/** Limited linear reconstruction of the centre cell's primitives at its +1 or -1 face. */
export function reconstructPerVariable(
  prev: Primitive2D,
  centre: Primitive2D,
  next: Primitive2D,
  side: 1 | -1,
  limiter: Limiter,
): Primitive2D {
  const value = (p: number, c: number, n: number) => c + 0.5 * side * limiter(c - p, n - c);
  return {
    rho: value(prev.rho, centre.rho, next.rho),
    u: value(prev.u, centre.u, next.u),
    v: value(prev.v, centre.v, next.v),
    p: value(prev.p, centre.p, next.p),
  };
}

/**
 * The shared limiter factor of a cell: the van Albada factor of the
 * backward and forward difference vectors of its primitive variables.
 */
export function sharedFactor(prev: Primitive2D, centre: Primitive2D, next: Primitive2D): number {
  const a = [centre.rho - prev.rho, centre.u - prev.u, centre.v - prev.v, centre.p - prev.p];
  const b = [next.rho - centre.rho, next.u - centre.u, next.v - centre.v, next.p - centre.p];
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let q = 0; q < 4; q++) {
    ab += a[q]! * b[q]!;
    aa += a[q]! * a[q]!;
    bb += b[q]! * b[q]!;
  }
  const eps = VAN_ALBADA_EPSILON;
  return Math.max(0, (2 * (ab + eps)) / (aa + bb + 2 * eps));
}

/**
 * Reconstruct the centre cell's state at its +1 or -1 face with the shared
 * factor: q_face = q_c +/- factor * (q_next - q_prev) / 4.
 */
export function reconstructShared(
  prev: Primitive2D,
  centre: Primitive2D,
  next: Primitive2D,
  side: 1 | -1,
): Primitive2D {
  const k = 0.25 * side * sharedFactor(prev, centre, next);
  return {
    rho: centre.rho + k * (next.rho - prev.rho),
    u: centre.u + k * (next.u - prev.u),
    v: centre.v + k * (next.v - prev.v),
    p: centre.p + k * (next.p - prev.p),
  };
}
