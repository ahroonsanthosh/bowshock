import { describe, expect, it } from 'vitest';
import { SettlingValue } from '../../src/verification/iterative-convergence';

/** Checks until the value is declared settled, and the error then left. */
function settle(
  values: (check: number) => number,
  limit: number,
  noise: number,
  knownRate = Number.NaN,
  maxChecks = 10_000,
) {
  const settling = new SettlingValue(noise, knownRate);
  for (let check = 0; check < maxChecks; check++) {
    const value = values(check);
    if (settling.add(value)) return { check, error: Math.abs(value - limit) };
  }
  return { check: Infinity, error: Infinity };
}

/**
 * Trials of an iteration whose error, in multiples of the noise, is
 * `error(check)`, every value off by up to half the noise: the largest
 * error left where it settled (in multiples of the noise), how many
 * settled, the latest check at which one did, and the rates it passed on.
 */
function trials(
  error: (check: number) => number,
  options: { knownRate?: number; maxChecks: number; count: number; seed: number },
) {
  const noise = 1e-6;
  let seed = options.seed;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  let worst = 0;
  let settled = 0;
  let latest = 0;
  const passedOn: number[] = [];
  for (let t = 0; t < options.count; t++) {
    const jitter = Array.from(
      { length: options.maxChecks },
      () => 0.5 * noise * (2 * random() - 1),
    );
    const settling = new SettlingValue(noise, options.knownRate ?? Number.NaN);
    for (let k = 0; k < options.maxChecks; k++) {
      if (settling.add(1 + error(k) * noise + jitter[k]!)) {
        worst = Math.max(worst, Math.abs(error(k)));
        settled++;
        latest = Math.max(latest, k);
        passedOn.push(settling.rateToPassOn);
        break;
      }
    }
  }
  return { worst, settled, latest, passedOn };
}

describe('settling of an iterated value', () => {
  it('fast geometric convergence settles on the second check whose change is within the noise', () => {
    const { check, error } = settle((k) => 1 + 0.1 * 0.1 ** k, 1, 1e-6);
    // Changes 9e-2, 9e-3, ... 9e-7 at check 6 and 9e-8 at check 7.
    expect(check).toBe(7);
    expect(error).toBeLessThan(1e-7);
  });

  it('slower convergence with noise on every value settles near its limit, within 100 checks', () => {
    // A noisy small change after a larger one would give a small rate, and
    // let a slowly converging value settle early. Measured when written,
    // worst errors left 0.01, 0.61, 0.94, 1.31 and 1.59 times the noise,
    // the latest settling at check 97.
    for (const [rate, bound] of [
      [0.1, 0.1],
      [0.5, 1],
      [0.7, 1.5],
      [0.85, 2],
      [0.9, 2],
    ] as const) {
      const r = trials((k) => 1e4 * rate ** k, { maxChecks: 120, count: 300, seed: 11 });
      expect(r.settled, `rate ${rate}`).toBe(300);
      expect(r.latest, `rate ${rate}`).toBeLessThan(100);
      expect(r.worst, `rate ${rate}`).toBeLessThan(bound);
      // The rate passed on is the rate, not inflated by the noise.
      const p90 = r.passedOn.sort((a, b) => a - b)[Math.floor(0.9 * 299)]!;
      expect(p90, `rate ${rate}`).toBeLessThan(rate + 0.02);
    }
    // At 0.97 per check: within 1.60 times the noise, after about 300 checks.
    const slow = trials((k) => 1e4 * 0.97 ** k, { maxChecks: 2000, count: 300, seed: 11 });
    expect(slow.settled).toBe(300);
    expect(slow.worst).toBeLessThan(2);
  });

  it('an early drift before fast convergence, and a damped oscillation, settle promptly', () => {
    // Two changes falling by 0.995, then 0.1 per check: kept as the largest
    // rate, the drift would stop the value from ever settling. Measured
    // when written: by check 12, and within 0.06 times the noise.
    const drift = trials((k) => (k === 0 ? 3000 : k === 1 ? 2900 : 2800.5 * 0.1 ** (k - 2)), {
      maxChecks: 120,
      count: 300,
      seed: 13,
    });
    expect(drift.settled).toBe(300);
    expect(drift.latest).toBeLessThanOrEqual(15);
    expect(drift.worst).toBeLessThan(0.1);
    const oscillation = trials((k) => 1e4 * 0.3 ** k * Math.cos((2 * Math.PI * k) / 5), {
      maxChecks: 120,
      count: 300,
      seed: 17,
    });
    expect(oscillation.settled).toBe(300);
    expect(oscillation.latest).toBeLessThanOrEqual(15);
    expect(oscillation.worst).toBeLessThan(0.1);
  });

  it('a start close to its limit, converging slowly, settles near it only with the rate known from before', () => {
    // A grid started from the converged one before: 100 times the noise
    // from its limit, at most 120 checks (the page's). Measured when
    // written over 400 trials: at 0.95 per check, 25 times the noise left
    // with the change alone tested, 1.65 with the rate known; at 0.97, 44
    // with the change alone, and none settling with the rate known (a fit
    // that does not converge).
    for (const rate of [0.97, 0.95]) {
      const without = trials((k) => 100 * rate ** k, { maxChecks: 120, count: 400, seed: 7 });
      const known = trials((k) => 100 * rate ** k, {
        knownRate: rate,
        maxChecks: 120,
        count: 400,
        seed: 7,
      });
      expect(without.worst, `rate ${rate}`).toBeGreaterThan(10);
      expect(known.worst, `rate ${rate}`).toBeLessThan(2);
    }
    expect(
      trials((k) => 100 * 0.95 ** k, { knownRate: 0.95, maxChecks: 120, count: 400, seed: 7 })
        .settled,
    ).toBe(400);
  });

  it('a rate known from before that is faster than the one measured does not hide it', () => {
    const settling = new SettlingValue(1e-6, 0.1);
    for (const v of [1.1, 1.05, 1.025]) settling.add(v);
    expect(settling.rate).toBeCloseTo(0.5, 12);
    // What is passed on is the rate measured here.
    expect(settling.rateToPassOn).toBeCloseTo(0.5, 12);
    expect(new SettlingValue(1e-6, 0.3).rateToPassOn).toBe(0.3);
  });

  it('a value that starts converged settles once two changes are within the noise', () => {
    expect(settle(() => 2, 2, 1e-6).check).toBe(2);
    // So does one that only wanders by its noise.
    let seed = 5;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let trial = 0; trial < 100; trial++) {
      const { check } = settle(() => 2 * (1 + 0.5e-6 * (2 * random() - 1)), 2, 1e-6);
      expect(check).toBe(2);
    }
  });
});
