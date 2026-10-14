import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  deflectionAngle,
  machAngle,
  machFromPrandtlMeyer,
  maxDeflectionWaveAngle,
  normalShock,
  obliqueShock,
  prandtlMeyer,
} from '../../src/validation/gas-dynamics';

const gamma = 1.4;
const deg = Math.PI / 180;

describe('normal shock relations', () => {
  it('property: conserve mass, momentum and energy across the shock', () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 10, noNaN: true }), (m1) => {
        const s = normalShock(m1, gamma);
        // Upstream state rho = 1, p = 1, so a = sqrt(gamma), u = M a.
        const u1 = m1 * Math.sqrt(gamma);
        const rho2 = s.densityRatio;
        const u2 = u1 / rho2;
        const p2 = s.pressureRatio;
        const h = (p: number, rho: number) => (gamma / (gamma - 1)) * (p / rho);
        expect(Math.abs(p2 + rho2 * u2 * u2 - (1 + u1 * u1)) / (1 + u1 * u1)).toBeLessThan(1e-12);
        expect(Math.abs(h(p2, rho2) + (u2 * u2) / 2 - (h(1, 1) + (u1 * u1) / 2))).toBeLessThan(
          1e-12 * (1 + u1 * u1),
        );
        // Downstream Mach number agrees with the computed state.
        expect(s.downstreamMach).toBeCloseTo(u2 / Math.sqrt((gamma * p2) / rho2), 12);
      }),
      { seed: 61 },
    );
  });

  it('is the identity at M = 1', () => {
    const s = normalShock(1, gamma);
    expect(s.pressureRatio).toBe(1);
    expect(s.densityRatio).toBe(1);
    expect(s.downstreamMach).toBeCloseTo(1, 14);
  });
});

describe('oblique shock relations', () => {
  it('property: the solved wave angle reproduces the requested deflection', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.2, max: 6, noNaN: true }),
        fc.double({ min: 0.01, max: 0.95, noNaN: true }),
        (mach, fraction) => {
          const thetaMax = deflectionAngle(mach, maxDeflectionWaveAngle(mach, gamma), gamma);
          const theta = fraction * thetaMax;
          const s = obliqueShock(mach, theta, gamma);
          expect(deflectionAngle(mach, s.beta, gamma)).toBeCloseTo(theta, 12);
          // Weak branch: between the Mach angle and the detachment wave angle.
          expect(s.beta).toBeGreaterThan(machAngle(mach));
          expect(s.beta).toBeLessThan(maxDeflectionWaveAngle(mach, gamma));
        },
      ),
      { seed: 62 },
    );
  });

  it('tends to a Mach wave as the deflection tends to zero', () => {
    const s = obliqueShock(2.5, 1e-8, gamma);
    expect(s.beta).toBeCloseTo(machAngle(2.5), 6);
    expect(s.pressureRatio).toBeCloseTo(1, 6);
  });

  it('refuses deflections beyond detachment', () => {
    expect(() => obliqueShock(2, 30 * deg, gamma)).toThrow(RangeError);
  });

  // Classic values for gamma = 1.4, reproduced only as a cross-check of the
  // relations above (which are verified exactly by the conservation tests).
  // Textbook figures are often worked from interpolated tables, so they
  // are compared at two or three significant figures.
  it('reproduces textbook values: M = 2, theta = 10 deg', () => {
    const s = obliqueShock(2, 10 * deg, gamma);
    expect(s.beta / deg).toBeCloseTo(39.31, 2);
    expect(s.pressureRatio).toBeCloseTo(1.71, 2);
    expect(s.downstreamMach).toBeCloseTo(1.64, 2);
  });

  it('reproduces the detachment angle for M = 2 (about 22.97 deg)', () => {
    const theta = deflectionAngle(2, maxDeflectionWaveAngle(2, gamma), gamma);
    expect(theta / deg).toBeCloseTo(22.97, 2);
  });
});

describe('Prandtl-Meyer function', () => {
  it('is zero at M = 1 and reproduces nu(2) of about 26.38 deg', () => {
    expect(prandtlMeyer(1, gamma)).toBe(0);
    expect(prandtlMeyer(2, gamma) / deg).toBeCloseTo(26.38, 2);
  });

  it('property: the inverse recovers the Mach number', () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 8, noNaN: true }), (mach) => {
        expect(machFromPrandtlMeyer(prandtlMeyer(mach, gamma), gamma)).toBeCloseTo(mach, 10);
      }),
      { seed: 63 },
    );
  });

  it('property: dnu/dM matches its analytic form sqrt(M^2 - 1) / (M (1 + (gamma-1)/2 M^2))', () => {
    fc.assert(
      fc.property(fc.double({ min: 1.05, max: 8, noNaN: true }), (mach) => {
        const h = 1e-6 * mach;
        const numeric = (prandtlMeyer(mach + h, gamma) - prandtlMeyer(mach - h, gamma)) / (2 * h);
        const analytic =
          Math.sqrt(mach * mach - 1) / (mach * (1 + 0.5 * (gamma - 1) * mach * mach));
        expect(Math.abs(numeric - analytic) / analytic).toBeLessThan(1e-7);
      }),
      { seed: 64 },
    );
  });
});
