/**
 * Discretisation error of a computed quantity, estimated from its values on
 * a nested family of grids refined by a factor of 2 (design:
 * docs/design/0005-solution-verification.md).
 *
 * Monotone convergence: the grid convergence index of I. B. Celik, U. Ghia,
 * P. J. Roache and C. J. Freitas, "Procedure for estimation and reporting
 * of uncertainty due to discretization in CFD applications", the ASME
 * Journal of Fluids Engineering editorial policy note (2008), steps 3 to 5,
 * with a constant refinement ratio r = 2:
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
 *
 * - Values carry noise from iterative convergence and arithmetic. When the
 *   finest change is too small to measure against it but the coarser
 *   triple has an order, that order predicts the finest change; if the
 *   measured change agrees with the prediction to within what can be
 *   measured, the finest grid is taken as converged to within the noise,
 *   and the band is the index above with the change bounded by the larger
 *   of the measured and predicted changes plus the noise of both values.
 *   An accurate solution then gets a band of a few times its noise
 *   instead of none.
 *
 * Oscillatory convergence: F. Stern, R. V. Wilson, H. W. Coleman and E. G.
 * Paterson, "Comprehensive approach to verification and validation of CFD
 * simulations, part 1", J. Fluids Eng. 123 (2001) 793-802 (reference 9 of
 * the note above) bound the error by the upper and lower values of the
 * oscillation, taking half their range; here the full range of the three
 * finest values is taken.
 *
 * Neither estimate sees an error that does not shrink with the grid. The
 * caller adds the systematic error measured for the quantity against exact
 * solutions (see `RefinementOptions.floor`).
 */

/** Formal order of the scheme: second-order MUSCL reconstruction. */
const FORMAL_ORDER = 2;
/** Factor of safety of the grid convergence index (Celik et al., eq. 7). */
const SAFETY_FACTOR = 1.25;
/** Refinement ratio between successive grids of a family. */
const RATIO = 2;
/**
 * A change between grids carries an order only if it is this many times the
 * values' own uncertainty from iterative convergence and precision.
 */
const MEASURABLE = 10;

export interface ConvergenceEstimateOptions {
  /**
   * Largest difference between the observed orders of the two finest
   * triples of grids for the finest grids to count as asymptotic.
   */
  readonly orderTolerance: number;
  /**
   * Uncertainty of each value from iterative convergence and arithmetic,
   * relative to the value: about 1e-12 for the CPU engine converged to
   * residuals of 1e-13; for the GPU engine, whose 32-bit solutions give
   * forebody drag within about 1.3e-6 of the CPU's up to Mach 5, 2e-6.
   */
  readonly noise: number;
  /**
   * The value the noise is relative to. Left out (every served solve), each
   * test uses the largest |value| among the values it looks at, its triple
   * or the four finest, as the procedure always has. A quantity whose true
   * value is near zero (the subsonic nose drag of 0014 10.7 (y)) gives the
   * scale S it is measured on instead, so that the measurable level is
   * MEASURABLE x noise x S, never collapsing with the value.
   */
  readonly scale?: number;
}

export type ConvergenceEstimate =
  | {
      readonly kind: 'monotone';
      /** Value on the finest grid. */
      readonly value: number;
      /** Richardson extrapolation to zero cell size. */
      readonly extrapolated: number;
      /**
       * Observed order of the finest triple, before the cap; of the coarser
       * triple when the finest change is within the noise.
       */
      readonly order: number;
      /** Grid convergence index of the finest value, absolute. */
      readonly uncertainty: number;
    }
  | {
      readonly kind: 'oscillatory';
      readonly value: number;
      /** Range of the three finest values: the error band. */
      readonly uncertainty: number;
    }
  | {
      readonly kind: 'unresolved';
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
    return { kind: 'unresolved', value, reason: 'four grids are needed to confirm the order' };
  }
  const finest = values.slice(n - 3);
  if (options.scale !== undefined && !(options.scale >= 0))
    throw new RangeError('the scale must be at least 0');
  // Without a scale given, each test uses the largest |value| of the values
  // it looks at (its triple, or the four finest), as it always has.
  const scaleOf = (own: readonly number[]) => options.scale ?? Math.max(...own.map(Math.abs));
  const fine = observedOrder(finest[0]!, finest[1]!, value, options.noise, scaleOf(finest));
  if (fine === OSCILLATES) {
    return { kind: 'oscillatory', value, uncertainty: Math.max(...finest) - Math.min(...finest) };
  }
  const coarser = values.slice(n - 4, n - 1);
  const coarse = observedOrder(
    coarser[0]!,
    coarser[1]!,
    coarser[2]!,
    options.noise,
    scaleOf(coarser),
  );
  if (fine === TOO_SMALL && typeof coarse === 'number') {
    const four = values.slice(n - 4);
    return withinNoise(four, coarse, options.noise, scaleOf(four));
  }
  for (const triple of [fine, coarse]) {
    if (typeof triple === 'string') return { kind: 'unresolved', value, reason: triple };
  }
  const order = fine as number;
  if (!(Math.abs(order - (coarse as number)) <= options.orderTolerance)) {
    return {
      kind: 'unresolved',
      value,
      reason: `the observed orders of the two finest triples differ (${(coarse as number).toFixed(2)} and ${order.toFixed(2)})`,
    };
  }
  const p = Math.min(order, FORMAL_ORDER);
  const e21 = values[n - 2]! - value;
  const gain = RATIO ** p - 1;
  return {
    kind: 'monotone',
    value,
    extrapolated: value - e21 / gain,
    order,
    uncertainty: (SAFETY_FACTOR * Math.abs(e21)) / gain,
  };
}

const OSCILLATES = 'the values oscillate under refinement';
const TOO_SMALL = 'the changes between grids are too small to measure';

/** The largest change between grids that cannot be measured against the values' noise on the scale. */
function unmeasurable(relativeNoise: number, scale: number): number {
  return MEASURABLE * relativeNoise * scale;
}

/**
 * The four finest values, whose finest change is too small to measure
 * while the coarser triple has the given order: the band if the finest
 * change agrees with the one that order predicts.
 */
function withinNoise(
  values: readonly number[],
  coarseOrder: number,
  relativeNoise: number,
  scale: number,
): ConvergenceEstimate {
  const value = values[3]!;
  const e21 = values[2]! - value;
  const predicted = (values[1]! - values[2]!) / RATIO ** coarseOrder;
  if (!(Math.abs(e21 - predicted) <= unmeasurable(relativeNoise, scale))) {
    return {
      kind: 'unresolved',
      value,
      reason: `the finest change (${e21.toExponential(2)}) is below the noise but not the one the coarser grids predict (${predicted.toExponential(2)})`,
    };
  }
  const gain = RATIO ** Math.min(coarseOrder, FORMAL_ORDER) - 1;
  // Each value is uncertain by its noise, so a change by twice that.
  const noise = relativeNoise * scale;
  const bound = Math.max(Math.abs(e21), Math.abs(predicted)) + 2 * noise;
  return {
    kind: 'monotone',
    value,
    extrapolated: value - predicted / gain,
    order: coarseOrder,
    uncertainty: (SAFETY_FACTOR * bound) / gain,
  };
}

/** Observed order of three successive values, or why it has none. */
function observedOrder(
  coarse: number,
  medium: number,
  fine: number,
  relativeNoise: number,
  scale: number,
): number | string {
  const e21 = medium - fine;
  const e32 = coarse - medium;
  // Changes close to the values' own uncertainty carry no order (Celik et
  // al., step 3: the procedure fails when a change is close to zero).
  const noise = unmeasurable(relativeNoise, scale);
  if (Math.abs(e21) <= noise || Math.abs(e32) <= noise) return TOO_SMALL;
  if (e32 / e21 < 0) return OSCILLATES;
  if (Math.abs(e32 / e21) <= 1) return 'the changes do not shrink under refinement';
  return Math.log(Math.abs(e32 / e21)) / Math.log(RATIO);
}

export interface VerifiedValue {
  /** The estimate on the finest grid solved. */
  readonly estimate: ConvergenceEstimate;
  /**
   * Total error band: the discretisation estimate plus the systematic
   * floor, absolute; undefined when no estimate could be made.
   */
  readonly uncertainty: number | undefined;
  /** Whether the error band is known and within the tolerance. */
  readonly verified: boolean;
  /** Values on the grids solved, coarsest first, with their refinements. */
  readonly levels: readonly { readonly refinement: number; readonly value: number }[];
  /**
   * The finer grid that could not be solved, and why, when refinement
   * stopped short of the finest allowed (RefinementOptions.stopOn).
   */
  readonly stopped?: { readonly refinement: number; readonly reason: string };
}

export interface RefinementOptions extends ConvergenceEstimateOptions {
  /** Largest acceptable error band, absolute. */
  readonly tolerance: number;
  /**
   * Systematic error of the quantity that does not shrink with the grid,
   * relative to its value, as measured against exact solutions.
   */
  readonly floor: number;
  /** Finest refinement to try (1, 2, 4, ...). */
  readonly maxRefinement: number;
  /**
   * For a failure to solve a grid finer than the first, the reason to stop
   * refining there and report the grids solved before it (the result a
   * coarser finest refinement would have given), or undefined to fail.
   */
  readonly stopOn?: (error: unknown) => string | undefined;
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
  let result: VerifiedValue | undefined;
  for (let refinement = 1; refinement <= options.maxRefinement; refinement *= 2) {
    let value: number;
    try {
      value = await solveAt(refinement);
    } catch (error) {
      const reason = result === undefined ? undefined : options.stopOn?.(error);
      if (result === undefined || reason === undefined) throw error;
      return { ...result, stopped: { refinement, reason } };
    }
    levels.push({ refinement, value });
    const estimate = gridConvergence(
      levels.map((l) => l.value),
      options,
    );
    const uncertainty =
      estimate.kind === 'unresolved'
        ? undefined
        : estimate.uncertainty + options.floor * Math.abs(estimate.value);
    const verified = uncertainty !== undefined && uncertainty <= options.tolerance;
    result = { estimate, uncertainty, verified, levels: [...levels] };
    if (verified) break;
  }
  if (result === undefined) throw new RangeError('the finest refinement must be at least 1');
  return result;
}
