import { describe, expect, it } from 'vitest';
import { outward, outwardPercent, withBand } from '../../src/app/band';

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

describe('an interval shown with its ends rounded outward', () => {
  it('rounds the low end down and the high end up, never inward', () => {
    expect(outward(0.42498, 0.57198, 4)).toEqual(['0.4249', '0.5720']);
    expect(outward(-0.03012, 0, 4)).toEqual(['-0.0302', '0.0000']);
    expect(outward(-0.00001, -0.00001, 4)).toEqual(['-0.0001', '0.0000']);
    expect(outwardPercent(-0.12081, 0.17542)).toBe('-12.1% to +17.6%');
    for (let k = 0; k < 2000; k++) {
      const low = Math.random() - 0.5;
      const high = low + Math.random();
      const [a, b] = outward(low, high, 4).map(Number) as [number, number];
      expect(a).toBeLessThanOrEqual(low);
      expect(b).toBeGreaterThanOrEqual(high);
      expect(low - a).toBeLessThan(1e-4 + 1e-12);
      expect(b - high).toBeLessThan(1e-4 + 1e-12);
    }
  });
});
