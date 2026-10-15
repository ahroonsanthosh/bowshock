/**
 * How face states are reconstructed from cell values along a grid line.
 *
 * - 'perVariable': each primitive variable has its own limited slope (the
 *   classical MUSCL scheme). Second order on smooth flows, so it is the
 *   choice for time-accurate problems. With captured shocks in steady flow
 *   it can fall into a limit cycle and stall convergence: measured on a
 *   supersonic wedge, the residual stalled at 7e-3 to 2e-2 and the
 *   integrated force fluctuated by up to 4e-4 relative.
 *
 * - 'shared': one smooth van Albada factor (so it requires the 'vanAlbada'
 *   limiter) per cell and direction, the
 *   smallest over the four primitive variables, applies to all of them, so
 *   every reconstructed state lies on the path between neighbouring
 *   states. The same wedge then converges to round-off on every grid
 *   alignment tried, with smaller wall-pressure wiggles and a more accurate
 *   ramp force. The cost: wherever any variable has a smooth extremum, all
 *   variables drop towards first order there (the isentropic vortex
 *   converges at about order 1.13 instead of 2). Body pressures, which drag
 *   depends on, lie in monotone regions; wakes and vortex cores are where
 *   the cost shows, to be re-measured when the viscous solver arrives.
 *
 * The choice and its evidence are recorded in docs/design/0003-2d-solver.md.
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
 * The van Albada limiter written as a factor on the central slope:
 * vanAlbada(a, b) = factor * (a + b) / 2, with
 * factor = 2 (a b + eps) / (a^2 + b^2 + 2 eps), clipped at zero.
 */
export function vanAlbadaFactor(a: number, b: number): number {
  const eps = VAN_ALBADA_EPSILON;
  return Math.max(0, (2 * (a * b + eps)) / (a * a + b * b + 2 * eps));
}

/** The shared limiter factor of a cell: the smallest over its four primitive variables. */
export function sharedFactor(prev: Primitive2D, centre: Primitive2D, next: Primitive2D): number {
  return Math.min(
    vanAlbadaFactor(centre.rho - prev.rho, next.rho - centre.rho),
    vanAlbadaFactor(centre.u - prev.u, next.u - centre.u),
    vanAlbadaFactor(centre.v - prev.v, next.v - centre.v),
    vanAlbadaFactor(centre.p - prev.p, next.p - centre.p),
  );
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
