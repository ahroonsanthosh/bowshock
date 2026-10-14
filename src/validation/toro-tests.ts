/**
 * The five one-dimensional Riemann test problems of Toro, "Riemann Solvers
 * and Numerical Methods for Fluid Dynamics", 3rd ed., Springer, 2009,
 * chapter 4, with the exact star-region pressure and velocity as tabulated
 * there (gamma = 1.4).
 *
 * Test 1 is the original shock tube problem of G. A. Sod, "A survey of
 * several finite difference methods for systems of nonlinear hyperbolic
 * conservation laws", J. Comput. Phys. 27, 1978 (initial velocity zero).
 * It should not be confused with the "modified Sod" problem (left velocity
 * 0.75) that Toro uses in later chapters to expose sonic-point errors.
 *
 * The published star values are rounded; each tolerance is half a unit in
 * the last printed digit. They are a cross-check only: the exact solver is
 * also verified independently against the Rankine-Hugoniot and isentropic
 * relations, which needs no published numbers at all.
 */

import type { Primitive1D } from '../scheme/gas';

export interface ToroTest {
  readonly name: string;
  readonly description: string;
  readonly left: Primitive1D;
  readonly right: Primitive1D;
  /** Initial discontinuity position on the domain [0, 1]. */
  readonly x0: number;
  /** Output time used for this problem. */
  readonly tEnd: number;
  readonly published: {
    readonly pStar: number;
    readonly pStarTolerance: number;
    readonly uStar: number;
    readonly uStarTolerance: number;
  };
}

export const TORO_TESTS: readonly ToroTest[] = [
  {
    name: 'Toro test 1 (Sod)',
    description: 'Left rarefaction, contact, right shock.',
    left: { rho: 1, u: 0, p: 1 },
    right: { rho: 0.125, u: 0, p: 0.1 },
    x0: 0.5,
    tEnd: 0.25,
    published: { pStar: 0.30313, pStarTolerance: 5e-6, uStar: 0.92745, uStarTolerance: 5e-6 },
  },
  {
    name: 'Toro test 2 (123 problem)',
    description: 'Two strong rarefactions with near-vacuum between them.',
    left: { rho: 1, u: -2, p: 0.4 },
    right: { rho: 1, u: 2, p: 0.4 },
    x0: 0.5,
    tEnd: 0.15,
    published: { pStar: 0.00189, pStarTolerance: 5e-6, uStar: 0, uStarTolerance: 5e-6 },
  },
  {
    name: 'Toro test 3',
    description: 'Left half of the Woodward-Colella blast wave: very strong right shock.',
    left: { rho: 1, u: 0, p: 1000 },
    right: { rho: 1, u: 0, p: 0.01 },
    x0: 0.5,
    tEnd: 0.012,
    published: { pStar: 460.894, pStarTolerance: 5e-4, uStar: 19.5975, uStarTolerance: 5e-5 },
  },
  {
    name: 'Toro test 4',
    description: 'Right half of the Woodward-Colella blast wave: strong left shock.',
    left: { rho: 1, u: 0, p: 0.01 },
    right: { rho: 1, u: 0, p: 100 },
    x0: 0.5,
    tEnd: 0.035,
    published: { pStar: 46.095, pStarTolerance: 5e-5, uStar: -6.19633, uStarTolerance: 5e-6 },
  },
  {
    name: 'Toro test 5',
    description: 'Collision of the two shocks from tests 3 and 4.',
    // Toro prints these states rounded to 6 significant figures (5.99924,
    // 19.5975, 460.894 and 5.99242, -6.19633, 46.0950). They are the exact
    // post-shock states of tests 3 and 4, and the published star values
    // correspond to the unrounded states, given here to full precision as
    // computed by our exact solver (checked independently in Python). With
    // the rounded inputs, p* differs from the published value by 0.007.
    left: { rho: 5.999240704796235, u: 19.59745138872306, p: 460.8937874913835 },
    right: { rho: 5.992416863515227, u: -6.196328249787035, p: 46.09504424886798 },
    x0: 0.5,
    tEnd: 0.035,
    published: { pStar: 1691.64, pStarTolerance: 5e-3, uStar: 8.68975, uStarTolerance: 5e-6 },
  },
];
