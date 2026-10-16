/**
 * Discretisation error of a computed quantity, estimated from its values on
 * a nested family of grids refined by a factor of 2 (design:
 * docs/design/0005-solution-verification.md).
 *
 * The estimate is the grid convergence index of I. B. Celik, U. Ghia, P. J.
 * Roache and C. J. Freitas, "Procedure for estimation and reporting of
 * uncertainty due to discretization in CFD applications", the ASME Journal
 * of Fluids Engineering editorial policy note (2008), steps 3 to 5, with a
 * constant refinement ratio r = 2:
 *
 *   p = |ln |e32 / e21|| / ln 2,  e21 = phi2 - phi1, e32 = phi3 - phi2,
 *   phi_ext = (2^p phi1 - phi2) / (2^p - 1),
 *   GCI = 1.25 |e21| / (2^p - 1)   (here absolute, not relative to phi1),
 *
 * phi1 being the finest grid. Two safeguards are ours, both making the
 * estimate more cautious:
 * - The observed order is capped at the formal order of the scheme, 2, so
 *   an apparently faster convergence never shrinks the error band.
 * - The note takes agreement of the observed with the formal order as a
 *   sign of the asymptotic range; a shock-capturing scheme has no single
 *   formal order (second in smooth flow, first at shocks and limited
 *   extrema), so instead the observed orders of the two finest triples of
 *   grids must agree, which needs four grids. A coarse grid outside the
 *   asymptotic range can otherwise give an observed order, and an error
 *   band, that the finer grids contradict.
 */

/** Formal order of the scheme: second-order MUSCL reconstruction. */
const FORMAL_ORDER = 2;
/** Factor of safety of the grid convergence index (Celik et al., eq. 7). */
const SAFETY_FACTOR = 1.25;
/** Refinement ratio between successive grids of a family. */
const RATIO = 2;
/**
 * Relative size below which a change between grids is not measurable: the
 * steady solutions are converged to residuals of 1e-13 or less, leaving
 * values uncertain far below this.
 */
const NOISE = 1e-10;

export interface ConvergenceEstimateOptions {
  /**
   * Largest difference between the observed orders of the two finest
   * triples of grids for the finest grids to count as asymptotic.
   */
  readonly orderTolerance: number;
}

export type ConvergenceEstimate =
  | {
      readonly asymptotic: true;
      /** Value on the finest grid. */
      readonly value: number;
      /** Richardson extrapolation to zero cell size. */
      readonly extrapolated: number;
      /** Observed order of the finest triple, before the cap. */
      readonly order: number;
      /** Grid convergence index of the finest value, absolute. */
      readonly uncertainty: number;
    }
  | {
      readonly asymptotic: false;
      readonly value: number;
      /** Why no error band can be given; more refinement is needed. */
      readonly reason: string;
    };

/**
 * Error estimate for values on grids refined successively by 2, coarsest
 * first.
 */
export function gridConvergence(
  values: readonly number[],
  options: ConvergenceEstimateOptions,
): ConvergenceEstimate {
  if (!values.every(Number.isFinite)) throw new RangeError('the values must be finite');
  const n = values.length;
  const value = values[n - 1]!;
  if (n < 4) {
    return { asymptotic: false, value, reason: 'four grids are needed to confirm the order' };
  }
  const fine = observedOrder(values[n - 3]!, values[n - 2]!, value);
  const coarse = observedOrder(values[n - 4]!, values[n - 3]!, values[n - 2]!);
  for (const triple of [fine, coarse]) {
    if (typeof triple === 'string') return { asymptotic: false, value, reason: triple };
  }
  const order = fine as number;
  if (!(Math.abs(order - (coarse as number)) <= options.orderTolerance)) {
    return {
      asymptotic: false,
      value,
      reason: `the observed orders of the two finest triples differ (${(coarse as number).toFixed(2)} and ${order.toFixed(2)})`,
    };
  }
  const p = Math.min(order, FORMAL_ORDER);
  const e21 = values[n - 2]! - value;
  const gain = RATIO ** p - 1;
  return {
    asymptotic: true,
    value,
    extrapolated: value - e21 / gain,
    order,
    uncertainty: (SAFETY_FACTOR * Math.abs(e21)) / gain,
  };
}

/** Observed order of three successive values, or why it has none. */
function observedOrder(coarse: number, medium: number, fine: number): number | string {
  const e21 = medium - fine;
  const e32 = coarse - medium;
  // Changes no larger than the iteration error of a converged steady
  // solution carry no order (Celik et al., step 3: the procedure fails when
  // a change is close to zero).
  const noise = NOISE * Math.max(Math.abs(coarse), Math.abs(medium), Math.abs(fine));
  if (Math.abs(e21) <= noise || Math.abs(e32) <= noise) {
    return 'the changes between grids are too small to measure';
  }
  if (e32 / e21 < 0) return 'the values oscillate under refinement';
  if (Math.abs(e32 / e21) <= 1) return 'the changes do not shrink under refinement';
  return Math.log(Math.abs(e32 / e21)) / Math.log(RATIO);
}

export interface VerifiedValue {
  /** The estimate on the finest grid solved. */
  readonly estimate: ConvergenceEstimate;
  /** Whether the error band is known and within the tolerance. */
  readonly verified: boolean;
  /** Values on the grids solved, coarsest first, with their refinements. */
  readonly levels: readonly { readonly refinement: number; readonly value: number }[];
}

export interface RefinementOptions extends ConvergenceEstimateOptions {
  /** Largest acceptable uncertainty, absolute. */
  readonly tolerance: number;
  /** Finest refinement to try (1, 2, 4, ...). */
  readonly maxRefinement: number;
}

/**
 * Solve on grids refined by 2 until the error band of the value is known
 * and within the tolerance, or the finest refinement allowed is reached.
 * `solveAt` returns the value on the grid of the given refinement, solved
 * to iterative convergence.
 */
export async function refineUntilVerified(
  solveAt: (refinement: number) => number | Promise<number>,
  options: RefinementOptions,
): Promise<VerifiedValue> {
  const levels: { refinement: number; value: number }[] = [];
  let estimate: ConvergenceEstimate | undefined;
  for (let refinement = 1; refinement <= options.maxRefinement; refinement *= 2) {
    levels.push({ refinement, value: await solveAt(refinement) });
    estimate = gridConvergence(
      levels.map((l) => l.value),
      options,
    );
    if (estimate.asymptotic && estimate.uncertainty <= options.tolerance) {
      return { estimate, verified: true, levels };
    }
  }
  if (estimate === undefined) throw new RangeError('the finest refinement must be at least 1');
  return { estimate, verified: false, levels };
}
