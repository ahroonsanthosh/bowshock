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

/**
 * A bound on what an iterated value still has to move, from a damped
 * oscillation fitted to its history (review of aed95b0, S1): the settling
 * test above looks at the last few changes only, and a slow oscillation
 * passes it at every turning point, where the value pauses. On the
 * nested runs of the cone at Mach 1.0 to 1.02 (periods of about 6,000
 * steps, checks every 50) it passed with the drag still 3e-6 to 4e-6
 * from its limit.
 *
 * Each window (the last third and the last quarter of the history),
 * thinned to about OSCILLATION_SAMPLES values ending with the last one,
 * is fitted by least squares with the recurrence of a constant plus two
 * modes, v(k+1) = p v(k) + q v(k-1) + r: a damped oscillation when the
 * modes are complex, two geometric decays when they are real. Its limit
 * is r / (1 - p - q). The window's bound is the larger of the last
 * value's distance from that limit and the modes' amplitude there (the
 * envelope), plus three times the fit's own rms misfit; the bound is the
 * largest of the windows'. A window whose values span less than `quiet`
 * has converged and bounds by its span. A mode of magnitude 1 or more in
 * any window means the value is not decaying. A window of fewer than
 * OSCILLATION_MIN_SAMPLES values is not fitted: with none fitted, the
 * bound is 0 and the value counts as decaying, so a short, fast
 * convergence is left to the settling test.
 */
export interface OscillationBound {
  /** Whether every fitted window decays. */
  readonly decaying: boolean;
  /** The bound, absolute. */
  readonly bound: number;
}

/** The windows, as fractions of the history: its last third and last quarter. */
const OSCILLATION_WINDOWS = [3, 4] as const;
/** About this many values per window after thinning. */
const OSCILLATION_SAMPLES = 20;
/** The fewest values a window is fitted with. */
const OSCILLATION_MIN_SAMPLES = 10;

export function dampedOscillationBound(values: readonly number[], quiet: number): OscillationBound {
  let bound = 0;
  let decaying = true;
  for (const fraction of OSCILLATION_WINDOWS) {
    const window = values.slice(values.length - Math.floor(values.length / fraction));
    const step = Math.max(1, Math.floor(window.length / OSCILLATION_SAMPLES));
    const xs: number[] = [];
    for (let k = window.length - 1; k >= 0; k -= step) xs.unshift(window[k]!);
    if (xs.length < OSCILLATION_MIN_SAMPLES) continue;
    const last = xs[xs.length - 1]!;
    const spread = Math.max(...xs) - Math.min(...xs);
    if (!(spread > quiet)) {
      bound = Math.max(bound, spread);
      continue;
    }
    const fit = fitTwoModes(xs.map((x) => (x - last) / spread));
    if (fit === null || !(fit.modulus < 1)) {
      decaying = false;
      continue;
    }
    bound = Math.max(bound, (Math.max(fit.distance, fit.envelope) + 3 * fit.rms) * spread);
  }
  return { decaying, bound };
}

/**
 * The least-squares fit of y(k+1) = p y(k) + q y(k-1) + r to y (scaled,
 * its last value 0): the larger mode's magnitude, the last value's
 * distance from the limit, the modes' amplitude there, and the rms
 * misfit; null if the fit is singular.
 */
function fitTwoModes(
  y: readonly number[],
): { modulus: number; distance: number; envelope: number; rms: number } | null {
  const a = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const b = [0, 0, 0];
  for (let k = 1; k + 1 < y.length; k++) {
    const row = [y[k]!, y[k - 1]!, 1];
    for (let i = 0; i < 3; i++) {
      b[i]! += row[i]! * y[k + 1]!;
      for (let j = 0; j < 3; j++) a[i]![j]! += row[i]! * row[j]!;
    }
  }
  const solution = solve3(a, b);
  if (solution === null) return null;
  const [p, q, r] = solution;
  let misfit = 0;
  for (let k = 1; k + 1 < y.length; k++) {
    misfit += (y[k + 1]! - (p * y[k]! + q * y[k - 1]! + r)) ** 2;
  }
  const rms = Math.sqrt(misfit / (y.length - 2));
  const denominator = 1 - p - q;
  if (denominator === 0) return { modulus: 1, distance: Infinity, envelope: Infinity, rms };
  const limit = r / denominator;
  const u1 = y[y.length - 1]! - limit;
  const u0 = y[y.length - 2]! - limit;
  const discriminant = p * p + 4 * q;
  if (discriminant < 0) {
    // Complex modes rho e^(+-i theta): u(k) = a cos(k theta + phi) rho^k.
    const modulus = Math.sqrt(-q);
    const cos = p / (2 * modulus);
    const sin = Math.sqrt(Math.max(0, 1 - cos * cos));
    const across = sin > 0 ? (modulus * u0 - u1 * cos) / sin : 0;
    return { modulus, distance: Math.abs(u1), envelope: Math.hypot(u1, across), rms };
  }
  const root = Math.sqrt(discriminant);
  const z1 = (p + root) / 2;
  const z2 = (p - root) / 2;
  const modulus = Math.max(Math.abs(z1), Math.abs(z2));
  // u1 = A1 + A2 and z1 z2 u0 = A1 z2 + A2 z1 (the modes one sample back).
  const envelope =
    Math.abs(z2 - z1) > 1e-12
      ? (() => {
          const a1 = (z1 * (z2 * u0 - u1)) / (z2 - z1);
          return Math.abs(a1) + Math.abs(u1 - a1);
        })()
      : Math.abs(u1) + Math.abs(u1 - z1 * u0);
  return { modulus, distance: Math.abs(u1), envelope, rms };
}

/** Solve the 3 x 3 system a x = b by Gaussian elimination with partial pivoting; null if singular. */
function solve3(a: number[][], b: number[]): [number, number, number] | null {
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(m[row]![col]!) > Math.abs(m[pivot]![col]!)) pivot = row;
    }
    if (!(Math.abs(m[pivot]![col]!) > 1e-300)) return null;
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    for (let row = 0; row < 3; row++) {
      if (row === col) continue;
      const f = m[row]![col]! / m[col]![col]!;
      for (let k = col; k < 4; k++) m[row]![k]! -= f * m[col]![k]!;
    }
  }
  return [m[0]![3]! / m[0]![0]!, m[1]![3]! / m[1]![1]!, m[2]![3]! / m[2]![2]!];
}
