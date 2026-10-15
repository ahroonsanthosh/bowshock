import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { LIMITERS, unlimitedCentral, vanAlbada } from '../../src/scheme/limiters';

const TVD_LIMITERS = Object.entries(LIMITERS).filter(
  ([, limiter]) => limiter !== unlimitedCentral && limiter !== vanAlbada,
);

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

describe('smooth van Albada limiter', () => {
  it('is symmetric and exact on linear data', () => {
    fc.assert(
      fc.property(slope, slope, (a, b) => {
        expect(vanAlbada(a, b)).toBeCloseTo(vanAlbada(b, a), 12);
        expect(vanAlbada(a, a)).toBeCloseTo(a, 10);
      }),
      { seed: 25 },
    );
  });

  it('never exceeds the larger one-sided slope', () => {
    fc.assert(
      fc.property(slope, slope, (a, b) => {
        expect(Math.abs(vanAlbada(a, b))).toBeLessThanOrEqual(
          Math.max(Math.abs(a), Math.abs(b)) * (1 + 1e-12),
        );
      }),
      { seed: 26 },
    );
  });

  it('is zero at a symmetric extremum and small at any extremum', () => {
    expect(vanAlbada(0.3, -0.3)).toBe(0);
    // At an extremum it returns at most the mean slope (a + b) / 2 in size,
    // much smaller than either one-sided slope when they nearly cancel.
    fc.assert(
      fc.property(slope, slope, (a, b) => {
        if (a * b < 0) {
          expect(Math.abs(vanAlbada(a, b))).toBeLessThanOrEqual(
            Math.abs(a + b) * (1 + 1e-12) + 1e-9,
          );
        }
      }),
      { seed: 27 },
    );
  });

  it('is smooth: no jump anywhere, including where the slopes change sign', () => {
    // A switch, such as zeroing at extrema, shows up as a jump between
    // neighbouring arguments; the smooth form changes by O(h).
    for (const b of [-1, -0.01, 0, 0.01, 1]) {
      for (let a = -1; a <= 1; a += 0.01) {
        const h = 1e-7;
        expect(Math.abs(vanAlbada(a + h, b) - vanAlbada(a, b))).toBeLessThan(1e-3);
      }
    }
  });
});
