import { describe, expect, it } from 'vitest';
import { isentropicVortex } from '../../src/validation/isentropic-vortex';

const gamma = 1.4;
const vortex = { strength: 5, x0: 0, y0: 0, u0: 0, v0: 0, period: 0 };

describe('isentropic vortex', () => {
  it('is in radial equilibrium: dp/dr = rho u_theta^2 / r (an exact steady solution)', () => {
    for (const r of [0.2, 0.5, 1, 1.5, 2, 3]) {
      const h = 1e-5;
      const dpdr =
        (isentropicVortex(vortex, r + h, 0, 0, gamma).p -
          isentropicVortex(vortex, r - h, 0, 0, gamma).p) /
        (2 * h);
      const w = isentropicVortex(vortex, r, 0, 0, gamma);
      // On the x axis the swirl velocity is v.
      expect(dpdr).toBeCloseTo((w.rho * w.v * w.v) / r, 7);
    }
  });

  it('is isentropic and translates with the background stream', () => {
    const moving = { ...vortex, u0: 1, v0: -0.5 };
    for (const [x, y] of [
      [0.3, -0.7],
      [1.2, 0.4],
    ] as const) {
      const now = isentropicVortex(moving, x, y, 0, gamma);
      const later = isentropicVortex(moving, x + 2, y - 1, 2, gamma);
      expect(now.p / now.rho ** gamma).toBeCloseTo(1, 14);
      expect(later.rho).toBeCloseTo(now.rho, 14);
      expect(later.u).toBeCloseTo(now.u, 14);
    }
  });

  it('is periodic when a period is given', () => {
    const periodic = { ...vortex, x0: 5, y0: 5, u0: 1, v0: 1, period: 10 };
    const a = isentropicVortex(periodic, 1, 2, 0, gamma);
    const b = isentropicVortex(periodic, 1, 2, 10, gamma);
    expect(b.rho).toBeCloseTo(a.rho, 14);
    expect(b.v).toBeCloseTo(a.v, 14);
  });
});
