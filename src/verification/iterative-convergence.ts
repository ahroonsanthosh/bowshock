/**
 * Whether the output of an iteration towards a steady state has stopped
 * changing by more than its noise. It approaches its limit geometrically,
 * so two successive changes give the rate and the remaining error,
 * change * rate / (1 - rate). A small change alone is not enough: slow
 * convergence can pair a small change with a large remaining error.
 */
export class SettlingValue {
  private previous = Number.NaN;
  private previousChange = Number.NaN;

  /** `noise`: the change, relative to the value, that counts as none. */
  constructor(private readonly noise: number) {}

  /** Record the value after the next batch of iterations; true once it has settled. */
  add(value: number): boolean {
    const change = Math.abs(value - this.previous);
    const rate = change / this.previousChange;
    const remaining = rate < 1 ? (change * rate) / (1 - rate) : Infinity;
    this.previousChange = change;
    this.previous = value;
    const allowed = this.noise * Math.abs(value);
    return change <= allowed && (change === 0 || remaining <= allowed);
  }
}
