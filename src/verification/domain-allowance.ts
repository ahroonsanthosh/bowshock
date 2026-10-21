/**
 * The allowance for a transonic solve's truncated domain: how much the
 * drag could still change if the far boundaries were taken to infinity or
 * the cylinder (the sting) made longer, from the drag on the base grid
 * with the domain at three nested sizes (design record 0013, "The
 * allowance rule", written before its test).
 *
 * The three grids are nested (transonicGrid's `nested` option): every
 * node they share is the same, so a change of the drag between them is
 * the domain's, not a change of the grid. With c1 the change from the
 * smaller domain to the family's own and c2 the change from the family's
 * own to the larger one:
 *
 * - if the larger of |c1| and |c2| is at most a quarter of the family's
 *   error band, or too small to measure against the values' noise, the
 *   effect is negligible and that larger change is the allowance;
 * - otherwise, if c1 and c2 have the same sign and |c2| / |c1| = rho is
 *   at most DECAY_LIMIT, the effect is taken to keep falling at least
 *   geometrically, and the allowance is what is left beyond the family's
 *   own domain: c2 and every later change, each at most rho times the one
 *   before, |c2| / (1 - rho);
 * - otherwise no allowance can be given, and the solve is refused.
 *
 * The allowance bounds the effect; it is not a correction (the rule that
 * extrapolated the far boundaries' effect as a correction failed its test
 * at Mach 1.2, where the regridded domains' noise was read as a change).
 */

/** Largest ratio of successive changes for which the remainder is bounded geometrically. */
export const DECAY_LIMIT = 0.6;
/**
 * A change counts as measurable only if it is this many times the values'
 * own noise (as in gridConvergence).
 */
const MEASURABLE = 10;

export type DomainAllowance =
  | {
      readonly kind: 'negligible' | 'decaying';
      /** Absolute allowance, added to the band. */
      readonly allowance: number;
      /** c1 and c2. */
      readonly changes: readonly [number, number];
    }
  | {
      readonly kind: 'refused';
      readonly reason: string;
      readonly changes: readonly [number, number];
    };

/**
 * The allowance from the drag on the smaller, the family's own and the
 * larger nested domain, given the family's error band (absolute) and the
 * values' noise (relative, as the engine's).
 */
export function domainAllowance(
  values: readonly [number, number, number],
  band: number,
  noise: number,
): DomainAllowance {
  if (!values.every(Number.isFinite)) throw new RangeError('the values must be finite');
  if (!(band >= 0 && noise >= 0)) throw new RangeError('the band and the noise must be at least 0');
  const [smaller, own, larger] = values;
  const changes = [own - smaller, larger - own] as const;
  const [c1, c2] = changes;
  const largest = Math.max(Math.abs(c1), Math.abs(c2));
  const measurable = MEASURABLE * noise * Math.max(...values.map(Math.abs));
  if (largest <= band / 4 || largest <= measurable) {
    return { kind: 'negligible', allowance: largest, changes };
  }
  if (c1 * c2 > 0) {
    const rho = Math.abs(c2) / Math.abs(c1);
    if (rho <= DECAY_LIMIT) {
      return { kind: 'decaying', allowance: Math.abs(c2) / (1 - rho), changes };
    }
  }
  return {
    kind: 'refused',
    reason: `the drag changes by ${c1.toExponential(2)} and then ${c2.toExponential(2)} as the domain grows, which does not fall fast enough to bound what lies beyond`,
    changes,
  };
}
