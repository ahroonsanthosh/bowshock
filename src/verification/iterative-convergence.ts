/**
 * Whether the output of an iteration towards a steady state has stopped
 * changing by more than its noise. It approaches its limit geometrically,
 * so two successive changes give the rate and the remaining error,
 * change * rate / (1 - rate). A small change alone is not enough: slow
 * convergence can pair a small change with a large remaining error.
 *
 * Changes near the noise say little about the rate: a noisy small change
 * after a larger one gives a small rate, and a small estimate of what
 * remains, however slowly the value converges. So the rate is taken from
 * the last two successive changes both ten times the noise or more (from
 * the latest two only while there is no such pair or it does not show
 * convergence), and the test must pass on two successive checks.
 * Simulated with every value off by up to half the noise, geometric
 * convergence settles within 0.01 of the noise of its limit at a rate of
 * 0.1 per check (the fitted solver's), within 0.6 at 0.5 and 1.3 at 0.7;
 * no test on the values can do much better for slower convergence.
 */
export class SettlingValue {
  private previous = Number.NaN;
  private previousChange = Number.NaN;
  /** The rate from the last two successive changes well above the noise. */
  private measuredRate = Number.NaN;
  private passes = 0;

  /** `noise`: the change, relative to the value, that counts as none. */
  constructor(private readonly noise: number) {}

  /** Record the value after the next batch of iterations; true once it has settled. */
  add(value: number): boolean {
    const change = Math.abs(value - this.previous);
    const allowed = this.noise * Math.abs(value);
    if (change > MEASURABLE * allowed && this.previousChange > MEASURABLE * allowed) {
      this.measuredRate = change / this.previousChange;
    }
    const rate = this.measuredRate < 1 ? this.measuredRate : change / this.previousChange;
    const remaining = rate < 1 ? (change * rate) / (1 - rate) : Infinity;
    this.previousChange = change;
    this.previous = value;
    const passed = change <= allowed && (change === 0 || remaining <= allowed);
    this.passes = passed ? this.passes + 1 : 0;
    return this.passes >= 2;
  }
}

/** A change gives the rate only if it is this many times the noise. */
const MEASURABLE = 10;
