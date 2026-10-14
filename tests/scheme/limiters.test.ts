import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { LIMITERS, unlimitedCentral } from '../../src/scheme/limiters';

const TVD_LIMITERS = Object.entries(LIMITERS).filter(([, limiter]) => limiter !== unlimitedCentral);

const slope = fc.double({ min: -1e3, max: 1e3, noNaN: true });

describe.each(TVD_LIMITERS)('%s limiter', (name, limiter) => {
  it('is symmetric: lim(a, b) = lim(b, a)', () => {
    fc.assert(
      fc.property(slope, slope, (a, b) => {
        expect(limiter(a, b)).toBeCloseTo(limiter(b, a), 12);
      }),
      { seed: 21 },
    );
  });

  it('is zero at a local extremum (a and b of opposite sign, or either zero)', () => {
    fc.assert(
      fc.property(slope, slope, (a, b) => {
        if (a * b <= 0) expect(limiter(a, b)).toBe(0);
      }),
      { seed: 22 },
    );
  });

  it('lies in the TVD region: same sign as a and b, at most 2 min(|a|, |b|)', () => {
    // Sweby's condition for second-order TVD schemes, written for slopes:
    // the limited slope may not exceed twice the smaller one-sided slope.
    fc.assert(
      fc.property(slope, slope, (a, b) => {
        const s = limiter(a, b);
        if (a * b <= 0) return;
        expect(s * a).toBeGreaterThanOrEqual(0);
        expect(Math.abs(s)).toBeLessThanOrEqual(
          2 * Math.min(Math.abs(a), Math.abs(b)) * (1 + 1e-12),
        );
      }),
      { seed: 23 },
    );
  });

  if (name !== 'firstOrder') {
    it('is exact on linear data: lim(a, a) = a', () => {
      fc.assert(
        fc.property(slope, (a) => {
          expect(limiter(a, a)).toBeCloseTo(a, 10);
        }),
        { seed: 24 },
      );
    });
  }
});
