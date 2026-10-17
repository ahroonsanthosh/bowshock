import { describe, expect, it } from 'vitest';
import { SettlingValue } from '../../src/verification/iterative-convergence';

/** Checks until the value is declared settled, and the error then left. */
function settle(values: (check: number) => number, limit: number, noise: number) {
  const settling = new SettlingValue(noise);
  for (let check = 0; check < 10_000; check++) {
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
    // the noise; measured when written, worst errors 0.61 and 1.34 of the
    // noise at rates of 0.5 and 0.7 per check over 2000 trials each.
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
    ] as const) {
      for (let trial = 0; trial < 300; trial++) {
        const jitter = Array.from({ length: 2000 }, () => 0.5 * noise * (2 * random() - 1));
        const { check } = settle((k) => 1 + 0.01 * rate ** k + jitter[k]!, 1, noise);
        // The iteration's own error left, without the value's noise.
        expect(0.01 * rate ** check, `rate ${rate}`).toBeLessThan(bound * noise);
      }
    }
  });

  it('a value that starts converged settles once two changes are within the noise', () => {
    const { check } = settle(() => 2, 2, 1e-6);
    expect(check).toBe(2);
  });
});
