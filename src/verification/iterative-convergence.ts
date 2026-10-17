/**
 * Whether the output of an iteration towards a steady state has stopped
 * changing by more than its noise. It approaches its limit geometrically,
 * at a rate per check, so what remains follows from the change over k
 * checks, |v_n - v_(n-k)| r^k / (1 - r^k). A small change alone is not
 * enough: slow convergence can pair a small change with a large
 * remaining error.
 *
 * Changes near the noise say little about the rate, so a rate is taken
 * only from two successive changes both ten times the noise or more, and
 * the largest such rate is used: the last pair, nearest the noise, can
 * read a slow rate as a fast one. While none is known, only the change
 * itself is tested. The window k is the number of checks over which the
 * error halves (one check at rates up to 0.5), so that the value's noise
 * enters what remains about once, however slow the convergence. Either
 * way the test must pass on two successive checks.
 *
 * An iteration started close to its limit (a grid started from the
 * converged one before) may never change by ten times the noise, and so
 * shows no rate of its own, though it converges as slowly as the one
 * before. So a rate known from before can be given, the rate of the same
 * iteration on a coarser grid of the family (per check, with the checks
 * scaled with the grid), and the larger of it and the rate measured is
 * used.
 *
 * Simulated with every value off by up to half the noise (300 trials
 * each; tests/verification/iterative-convergence.test.ts): a start 1e4
 * times the noise from its limit settles within 0.01, 0.61, 0.94, 0.85
 * and 0.15 times the noise of it at rates of 0.1, 0.5, 0.7, 0.9 and 0.97
 * per check (the fitted solver's is about 0.1); a start 100 times the
 * noise away at 0.95 per check, with that rate known, within 1.6 (the
 * change alone tested: 26); a value that starts at its limit settles on
 * the second check. No test on the values can catch a slow component
 * that never changes by ten times the noise while a faster one dominates
 * (two components, 1e4 times the noise at 0.2 and 200 at 0.9: within 6).
 */
export class SettlingValue {
  private readonly values: number[] = [];
  private previousChange = Number.NaN;
  /** The largest rate from two successive changes well above the noise. */
  private measuredRate = Number.NaN;
  private passes = 0;

  /**
   * `noise`: the change, relative to the value, that counts as none.
   * `knownRate`: the rate per check known from before (NaN if none).
   */
  constructor(
    private readonly noise: number,
    private readonly knownRate = Number.NaN,
  ) {}

  /**
   * The rate per check the test uses: the larger of the rate measured and
   * the rate known from before, of those below 1; NaN if neither.
   */
  get rate(): number {
    const usable = [this.measuredRate, this.knownRate].filter((r) => r < 1);
    return usable.length > 0 ? Math.max(...usable) : Number.NaN;
  }

  /** Record the value after the next batch of iterations; true once it has settled. */
  add(value: number): boolean {
    const n = this.values.length;
    const change = Math.abs(value - (this.values[n - 1] ?? Number.NaN));
    this.values.push(value);
    const allowed = this.noise * Math.abs(value);
    if (change > MEASURABLE * allowed && this.previousChange > MEASURABLE * allowed) {
      const r = change / this.previousChange;
      if (r < 1) this.measuredRate = r < this.measuredRate ? this.measuredRate : r;
    }
    this.previousChange = change;
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
