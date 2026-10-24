/**
 * The 3D fitted shock (src/solver3d/fitted-surface.ts) and the fitted plane-shock check of
 * docs/design/0021-3d-euler-fins.md 4.0 (src/solver3d/junction.ts, 'full': fitted over the whole span).
 */

import { describe, expect, it } from 'vitest';
import { compatibleShock, shockState } from '../../src/solver/shock-fitting';
import { compatibleShock3D, shockState3D } from '../../src/solver3d/fitted-surface';
import { junctionMeasures, runJunction } from '../../src/solver3d/junction';

const GAMMA = 1.4;

describe('fitted surface', () => {
  it('reduces to the 2D shock relations for a normal in the x-y plane', () => {
    const free = { rho: 1.2, u: 2.1, v: 0.3, p: 0.9 };
    const n2 = [Math.cos(0.7), Math.sin(0.7)] as const;
    for (const m of [1, 1.3, 2.5]) {
      const a = shockState(free, GAMMA, m, n2[0], n2[1]);
      const b = shockState3D({ ...free, w: 0 }, GAMMA, m, [n2[0], n2[1], 0]);
      for (const k of ['rho', 'u', 'v', 'p'] as const)
        expect(b.state[k]).toBeCloseTo(a.state[k], 14);
      expect(b.state.w).toBe(0);
      expect(b.speed).toBeCloseTo(a.speed, 14);
    }
    const behind = { rho: 2, a: 1.1, p: 2.5, un: 0.2 };
    const a = compatibleShock(free, GAMMA, n2[0], n2[1], behind);
    const b = compatibleShock3D({ ...free, w: 0 }, GAMMA, [n2[0], n2[1], 0], behind);
    expect(b.speed).toBeCloseTo(a.speed, 13);
  });

  it('is invariant under a rotation of the frame', () => {
    const free = { rho: 1, u: 2, v: 0.4, w: -0.3, p: 1 };
    const n: [number, number, number] = [0.6, 0, 0.8];
    const s = shockState3D(free, GAMMA, 1.7, n);
    // Rotate by 90 deg about x: (y, z) -> (-z, y).
    const r = shockState3D({ ...free, v: -free.w, w: free.v }, GAMMA, 1.7, [n[0], -n[2], n[1]]);
    expect(r.state.v).toBeCloseTo(-s.state.w, 14);
    expect(r.state.w).toBeCloseTo(s.state.v, 14);
    expect(r.state.p).toBeCloseTo(s.state.p, 14);
  });

  it('keeps a plane oblique shock placed at its exact position (4.0)', () => {
    const s = runJunction({ kind: 'full', level: 0, maxSteps: 20 });
    expect(s.maxSpeed).toBeLessThan(1e-13);
    const m = junctionMeasures(s, 'full', 1e-5);
    expect(m.awayAngle).toBeLessThan(1e-14);
    expect(m.awayState).toBeLessThan(1e-13);
  });

  it('returns to it from a start 10% too high (4.0)', { timeout: 300_000 }, () => {
    const s = runJunction({ kind: 'full', level: 0, displaced: 0.1, maxSteps: 5000 });
    expect(s.converged).toBe(true);
    const m = junctionMeasures(s, 'full', 1e-5);
    // Measured: 5.4e-13 rad and 7.3e-13 at the stopping test (shock speeds below 1e-12).
    expect(m.awayAngle).toBeLessThan(1e-11);
    expect(m.awayState).toBeLessThan(1e-11);
  });
});
