import { describe, expect, it } from 'vitest';
import {
  karmanSchoenherrAverageCf,
  karmanSchoenherrLocalCf,
  karmanSchoenherrMomentumReynolds,
  karmanSchoenherrReynoldsForMomentum,
  karmanSchoenherrTmrFit,
  karmanSchoenherrY,
} from '../../src/friction/karman-schoenherr';

const REYNOLDS = [1e2, 1e4, 3e5, 1e6, 7e6, 1e7, 6e7, 1.7e8, 1e9, 1e11];

describe('Karman-Schoenherr law', () => {
  it('the average coefficient satisfies 0.242 / sqrt(CF) = log10(Re CF)', () => {
    for (const re of REYNOLDS) {
      const cf = karmanSchoenherrAverageCf(re);
      expect(0.242 / Math.sqrt(cf) - Math.log10(re * cf)).toBeCloseTo(0, 12);
    }
    expect(karmanSchoenherrY(0)).toBe(1);
  });

  it('Re_theta = Re_x CF / 2, and Re_x(Re_theta) inverts it', () => {
    for (const re of REYNOLDS) {
      const reTheta = karmanSchoenherrMomentumReynolds(re);
      expect(reTheta).toBeCloseTo((re * karmanSchoenherrAverageCf(re)) / 2, 6);
      expect(karmanSchoenherrReynoldsForMomentum(reTheta) / re - 1).toBeCloseTo(0, 12);
    }
  });

  it('the local coefficient is the momentum balance cf = 2 dRe_theta / dRe_x', () => {
    for (const re of REYNOLDS.slice(1)) {
      const d = re * 1e-5;
      const slope =
        (karmanSchoenherrMomentumReynolds(re + d) - karmanSchoenherrMomentumReynolds(re - d)) /
        (2 * d);
      const cf = karmanSchoenherrLocalCf(karmanSchoenherrMomentumReynolds(re));
      expect(2 * slope).toBeCloseTo(cf, 9);
      expect(Math.abs((2 * slope) / cf - 1)).toBeLessThan(1e-7);
    }
  });

  it("the TMR's curve fit is the exact local law with rounded coefficients (within 2.1e-4)", () => {
    const worstBetween = (lo: number, hi: number) => {
      let worst = 0;
      for (let l = lo; l <= hi + 1e-9; l += 0.01) {
        const reTheta = 10 ** l;
        worst = Math.max(
          worst,
          Math.abs(karmanSchoenherrTmrFit(reTheta) / karmanSchoenherrLocalCf(reTheta) - 1),
        );
      }
      return worst;
    };
    // Measured: 2.03e-4 at Re_theta = 1e6, 1.84e-4 over the TMR file's
    // range of 200 to 25000.
    expect(worstBetween(2, 6)).toBeLessThan(2.1e-4);
    expect(worstBetween(2, 6)).toBeGreaterThan(2e-4);
    expect(worstBetween(Math.log10(200), Math.log10(25000))).toBeLessThan(1.9e-4);
  });
});
