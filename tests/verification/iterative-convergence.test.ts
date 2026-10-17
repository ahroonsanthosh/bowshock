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

describe('settling of an iterated value', () => {
  it('fast geometric convergence settles on the second check whose change is within the noise', () => {
    const { check, error } = settle((k) => 1 + 0.1 * 0.1 ** k, 1, 1e-6);
    // Changes 9e-2, 9e-3, ... 9e-7 at check 6 and 9e-8 at check 7.
    expect(check).toBe(7);
    expect(error).toBeLessThan(1e-7);
  });

  it('slower convergence with noise on every value settles near its limit', () => {
    // A noisy small change after a larger one would give a small rate, and
    // let a slowly converging value settle early. Values off by up to half
    // the noise; measured when written, worst errors 0.61, 0.94 and 0.85
    // of the noise at rates of 0.5, 0.7 and 0.9 per check over 300 trials
    // each (with the rate of the last pair of changes and no window, 0.61,
    // 1.34 and 10.6).
    const noise = 1e-6;
    let seed = 11;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (const [rate, bound] of [
      [0.1, 0.1],
      [0.5, 1],
      [0.7, 2],
      [0.9, 2],
    ] as const) {
      for (let trial = 0; trial < 300; trial++) {
        const jitter = Array.from({ length: 2000 }, () => 0.5 * noise * (2 * random() - 1));
        const { check } = settle((k) => 1 + 0.01 * rate ** k + jitter[k]!, 1, noise);
        // The iteration's own error left, without the value's noise.
        expect(0.01 * rate ** check, `rate ${rate}`).toBeLessThan(bound * noise);
      }
    }
  });

  it('a start close to its limit, converging slowly, settles near it only with the rate known from before', () => {
    // A grid started from the converged one before: 100 times the noise
    // from its limit, converging at 0.97 per check, every value off by up
    // to half the noise, at most 120 checks (the page's). Measured when
    // written over 400 trials: without the rate known, the worst
    // iteration error left at settling was 45 times the noise; with it,
    // none settled within the 120 checks (a fit that does not converge).
    // At 0.95 per check, 26 and 1.6 times.
    const noise = 1e-6;
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (const rate of [0.97, 0.95]) {
      let worstWithout = 0;
      let worstWith = 0;
      for (let trial = 0; trial < 400; trial++) {
        const jitter = Array.from({ length: 120 }, () => 0.5 * noise * (2 * random() - 1));
        const values = (k: number) => 1 + 100 * noise * rate ** k + jitter[k]!;
        const without = settle(values, 1, noise, Number.NaN, 120);
        if (without.check < 120) worstWithout = Math.max(worstWithout, 100 * rate ** without.check);
        const known = settle(values, 1, noise, rate, 120);
        if (known.check < 120) worstWith = Math.max(worstWith, 100 * rate ** known.check);
      }
      expect(worstWithout, `rate ${rate}`).toBeGreaterThan(10);
      expect(worstWith, `rate ${rate}`).toBeLessThan(2);
    }
  });

  it('a rate known from before that is faster than the one measured does not hide it', () => {
    const settling = new SettlingValue(1e-6, 0.1);
    for (const v of [1.1, 1.05, 1.025]) settling.add(v);
    expect(settling.rate).toBeCloseTo(0.5, 12);
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
