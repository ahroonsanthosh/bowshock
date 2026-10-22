/**
 * Whether the output of an iteration towards a steady state has stopped
 * changing by more than its noise. It approaches its limit geometrically,
 * at a rate per check, so what remains follows from the change over k
 * checks, |v_n - v_(n-k)| r^k / (1 - r^k). A small change alone is not
 * enough: slow convergence can pair a small change with a large
 * remaining error.
 *
 * Changes near the noise say little about the rate, so the rate is
 * measured only on changes of ten times the noise or more: the slope of
 * a least-squares line through the logarithms of the last eight such
 * changes against their checks. A single pair of changes near the noise
 * can read a slow rate as a fast one, and an early slow transient (a
 * start that drifts before it converges) would, kept as the largest rate,
 * stop a fast iteration from ever settling; the line averages the noise
 * and forgets old changes. While no rate is known, only the change itself
 * is tested. The window k is the number of checks over which the error
 * halves (one check at rates up to 0.5), so that the value's noise enters
 * what remains about once, however slow the convergence. Either way the
 * test must pass on two successive checks.
 *
 * An iteration started close to its limit (a grid started from the
 * converged one before) may never change by ten times the noise, and so
 * shows no rate of its own, though it converges as slowly as the one
 * before. So a rate known from before can be given, the rate of the same
 * iteration on a coarser grid of the family (per check, with the checks
 * scaled with the grid); the test uses the larger of it and the rate
 * measured, and passes on the rate measured if there is one, else the
 * known one (rateToPassOn), so that no grid inflates the next one's.
 *
 * Simulated with every value off by up to half the noise, 300 or 400
 * trials each (tests/verification/iterative-convergence.test.ts, measured
 * when written): a start 1e4 times the noise from its limit settles
 * within 0.01, 0.61, 0.94, 1.3 and 1.6 times the noise of it at rates of
 * 0.1, 0.5, 0.7, 0.85 and 0.9 per check, all within 100 checks; at 0.97
 * within 1.6, after about 300. A start 100 times the noise away at 0.95
 * per check, with that rate known, within 1.7 (the change alone tested:
 * 25); at 0.97 it does not settle within 120 checks (the change alone: 44
 * from its limit). An early drift (two changes falling by 0.995) before
 * convergence at 0.1 per check settles by the twelfth check, and a damped
 * oscillation (0.3 per check, period 5) within 0.06. The test cannot do
 * better than its knowledge of the rate: a known rate faster than the
 * true one (0.9 for 0.97) leaves up to 7.5 times the noise, and a slow
 * component that never changes by ten times the noise while a faster one
 * dominates (1e4 times the noise at 0.2 with 200 at 0.9) up to 12. A
 * transient whose changes grow and then stop at once gives a measured
 * rate of 1 or more, which is not used, so the change alone is tested:
 * with a slow component of 40 times the noise at 0.98 per check hidden
 * behind it, 32 times the noise was left (an independent review's
 * reproduction). Refusing to settle on such a rate would not help: a
 * transient that stopped at once leaves no later change to measure, so
 * an iteration that has truly converged would never settle either.
 */
export class SettlingValue {
  private readonly values: number[] = [];
  /** Check index and logarithm of each change of ten times the noise or more. */
  private readonly measurable: [number, number][] = [];
  private passes = 0;

  /**
   * `noise`: the change, relative to the value, that counts as none.
   * `knownRate`: the rate per check known from before (NaN if none).
   */
  constructor(
    private readonly noise: number,
    private readonly knownRate = Number.NaN,
  ) {}

  /** The rate per check measured on this iteration's changes; NaN if none. */
  get measuredRate(): number {
    const points = this.measurable.slice(-RATE_POINTS);
    if (points.length < 2) return Number.NaN;
    const meanX = points.reduce((s, [x]) => s + x, 0) / points.length;
    const meanY = points.reduce((s, [, y]) => s + y, 0) / points.length;
    let sxy = 0;
    let sxx = 0;
    for (const [x, y] of points) {
      sxy += (x - meanX) * (y - meanY);
      sxx += (x - meanX) ** 2;
    }
    return Math.exp(sxy / sxx);
  }

  /**
   * The rate per check the test uses: the larger of the rate measured and
   * the rate known from before, of those below 1; NaN if neither.
   */
  get rate(): number {
    const usable = [this.measuredRate, this.knownRate].filter((r) => r < 1);
    return usable.length > 0 ? Math.max(...usable) : Number.NaN;
  }

  /** The rate for the next iteration of the family: measured here, else known. */
  get rateToPassOn(): number {
    const measured = this.measuredRate;
    return measured < 1 ? measured : this.knownRate;
  }

  /** Record the value after the next batch of iterations; true once it has settled. */
  add(value: number): boolean {
    const n = this.values.length;
    const change = Math.abs(value - (this.values[n - 1] ?? Number.NaN));
    this.values.push(value);
    const allowed = this.noise * Math.abs(value);
    if (change > MEASURABLE * allowed) this.measurable.push([n, Math.log(change)]);
    const rate = this.rate;
    let remaining = 0;
    if (rate < 1) {
      const k = Math.max(1, Math.ceil(Math.log(0.5) / Math.log(rate)));
      if (n < k) {
        remaining = Infinity;
      } else {
        const f = rate ** k;
        remaining = (Math.abs(value - this.values[n - k]!) * f) / (1 - f);
      }
    }
    const passed = change <= allowed && remaining <= allowed;
    this.passes = passed ? this.passes + 1 : 0;
    return this.passes >= 2;
  }
}

/** A change gives the rate only if it is this many times the noise. */
const MEASURABLE = 10;
/** The rate is measured on this many of the last such changes. */
const RATE_POINTS = 8;
