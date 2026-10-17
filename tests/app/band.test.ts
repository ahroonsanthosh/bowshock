import { describe, expect, it } from 'vitest';
import { withBand } from '../../src/app/band';

/** The interval a string `v ± b` shows. */
function interval(text: string): [number, number] {
  const [v, b] = text.split(' ± ').map(Number) as [number, number];
  return [v - b, v + b];
}

describe('a value shown with its band', () => {
  it('shows the band to two significant digits, rounded up', () => {
    expect(withBand(0.098803, 1.049e-5)).toBe('0.098803 ± 0.000011');
    expect(withBand(0.28427, 2.0e-5)).toBe('0.284270 ± 0.000021');
  });

  it('contains the interval computed, for values and bands of every rounding', () => {
    for (let k = 0; k < 2000; k++) {
      const value = 0.01 + Math.random();
      const band = 10 ** (-7 + 5 * Math.random());
      const [low, high] = interval(withBand(value, band));
      expect(low).toBeLessThanOrEqual(value - band);
      expect(high).toBeGreaterThanOrEqual(value + band);
    }
  });
});
