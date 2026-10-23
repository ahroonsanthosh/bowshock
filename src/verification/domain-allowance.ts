/**
 * The allowance for a transonic solve's truncated domain: how much the
 * drag could still change if the far boundaries were taken to infinity or
 * the cylinder (the sting) made longer, from the drag on the base grid
 * with the domain at three nested sizes (design record 0013, "The
 * allowance rule corrected for sign reversal", written before its code and
 * its test; it corrects "The allowance rule" after the review's S2 and S3).
 *
 * The three grids are nested (transonicGrid's `nested` option): every
 * node they share is the same, so a change of the drag between them is
 * the domain's, not a change of the grid. The domains are D0 < D1 < D2,
 * the family's own D1, with a = C(D1) - C(D0) and b = C(D2) - C(D1), and:
 *
 * - m = 2 nu max|C|, the measurability level (nu the values' noise,
 *   relative), added to every allowance, so that more noise only ever
 *   widens one;
 * - T = 1 / ((D2 / D1)^Q_SLOW - 1): what a part of the effect decaying no
 *   slower than D^-Q_SLOW leaves beyond D2, per unit of its change from
 *   D1 to D2;
 * - rho_fast: the ratio of successive changes a single power law of
 *   exponent Q_FAST gives over these distances. A change falling faster
 *   is two parts of opposite sign cancelling: the effect turning;
 * - U = |b| + T max(|a|, |b|) + m, the turning bound.
 *
 * Then, in order:
 * 1. max(|a|, |b|) <= m: 'unmeasurable', allowance U;
 * 2. a = 0, or |b| / |a| > DECAY_LIMIT: 'refused' (the effect does not
 *    fall fast enough to bound);
 * 3. a, b of one sign and rho_fast <= |b| / |a| <= DECAY_LIMIT:
 *    'decaying', allowance |b| / (1 - rho) + m (the geometric remainder);
 * 4. otherwise (b against a, or a fall faster than rho_fast): 'turning',
 *    allowance U.
 *
 * The allowance bounds the effect; it is not a correction (the rule that
 * extrapolated the far boundaries' effect as a correction failed its test
 * at Mach 1.2, where the regridded domains' noise was read as a change).
 */

/** Largest ratio of successive changes for which the remainder is bounded geometrically. */
export const DECAY_LIMIT = 0.6;
/**
 * The decay with the distance that T is computed for: below every exponent
 * measured, the drag's (0.8 to 1.35) and the far field's local pressure
 * decay (0.39 to 0.47) at Mach 1. It is not by itself what makes the
 * allowances bounds (re-review of dd6c423): two parts of opposite sign
 * decaying as D^-0.5 and D^-1 break the turning bound (0.6 to 0.94 of the
 * truth), and one-signed D^-0.5 + D^-2 the decaying branch (0.96). What
 * the rule assumes is that both parts of the effect decay as D^-0.8 or
 * faster, or that what remains beyond the largest domain is no larger than
 * the largest change measured; with exponents of 0.8 and above it held in
 * every mix tried. The decaying branch is a bound only where D2 / D1 >=
 * D1 / D0 (0013, the re-review's item 2): on the family moved to 224.2
 * radii (ratios 2.23 then 1.82) it understates every pure power law.
 */
export const Q_SLOW = 0.35;
/** The fastest decay admitted for one part of the effect: a doublet's, D^-3. */
export const Q_FAST = 3;
/** The measurability level is this many times the noise times the value. */
export const MEASURABILITY = 2;

export type DomainAllowanceKind = 'unmeasurable' | 'decaying' | 'turning';

export type DomainAllowance =
  | {
      readonly kind: DomainAllowanceKind;
      /** Absolute allowance (a half-width), added to the band. */
      readonly allowance: number;
      /** a and b. */
      readonly changes: readonly [number, number];
      /** The measurability level m included in the allowance. */
      readonly measurability: number;
    }
  | {
      readonly kind: 'refused';
      readonly reason: string;
      readonly changes: readonly [number, number];
      readonly measurability: number;
    };

/** T: the remainder beyond d2 of a decay D^-q per unit of its change from d1 to d2. */
export function tailFactor(d1: number, d2: number, q = Q_SLOW): number {
  return 1 / ((d2 / d1) ** q - 1);
}

/** The ratio of successive changes a single power law D^-q gives over d0, d1, d2. */
export function powerLawRatio(d0: number, d1: number, d2: number, q = Q_FAST): number {
  return (d1 ** -q - d2 ** -q) / (d0 ** -q - d1 ** -q);
}

/**
 * The allowance from the drag on the smaller, the family's own and the
 * larger nested domain, at the domains' own distances (radii, or calibers
 * of cylinder), given the values' noise (relative, as the engine's).
 */
export function domainAllowance(
  values: readonly [number, number, number],
  distances: readonly [number, number, number],
  noise: number,
): DomainAllowance {
  if (!values.every(Number.isFinite)) throw new RangeError('the values must be finite');
  const [d0, d1, d2] = distances;
  if (!(d0 > 0 && d1 > d0 && d2 > d1)) {
    throw new RangeError('the distances must be positive and increasing');
  }
  if (!(noise >= 0)) throw new RangeError('the noise must be at least 0');
  const [smaller, own, larger] = values;
  const changes = [own - smaller, larger - own] as const;
  const [a, b] = changes;
  const measurability = MEASURABILITY * noise * Math.max(...values.map(Math.abs));
  const turning = Math.abs(b) + tailFactor(d1, d2) * Math.max(Math.abs(a), Math.abs(b));
  const allow = (kind: DomainAllowanceKind, allowance: number): DomainAllowance => ({
    kind,
    allowance: allowance + measurability,
    changes,
    measurability,
  });
  if (Math.max(Math.abs(a), Math.abs(b)) <= measurability) return allow('unmeasurable', turning);
  const rho = a === 0 ? Infinity : Math.abs(b) / Math.abs(a);
  if (rho > DECAY_LIMIT) {
    return {
      kind: 'refused',
      reason: `the drag changes by ${a.toExponential(2)} and then ${b.toExponential(2)} as the domain grows, which does not fall fast enough to bound what lies beyond`,
      changes,
      measurability,
    };
  }
  if (a * b > 0 && rho >= powerLawRatio(d0, d1, d2)) {
    return allow('decaying', Math.abs(b) / (1 - rho));
  }
  return allow('turning', turning);
}
