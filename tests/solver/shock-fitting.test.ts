import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compatibleShock, shockState } from '../../src/solver/shock-fitting';
import { normalShock, obliqueShock } from '../../src/validation/gas-dynamics';

const gamma = 1.4;
const deg = Math.PI / 180;
const freeAt = (mach: number) => ({ rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 });

describe('Rankine-Hugoniot state behind a fitted shock', () => {
  it('a normal shock at the free-stream Mach number stands still, with the exact jump', () => {
    for (const mach of [1.2, 2, 3, 5]) {
      const free = freeAt(mach);
      // Outward normal pointing upstream: the shock faces the oncoming flow.
      const s = shockState(free, gamma, mach, -1, 0);
      const exact = normalShock(mach, gamma);
      expect(s.speed).toBeCloseTo(0, 13);
      expect(s.state.p).toBeCloseTo(exact.pressureRatio, 12);
      expect(s.state.rho).toBeCloseTo(exact.densityRatio, 12);
      const a2 = Math.sqrt((gamma * s.state.p) / s.state.rho);
      expect(Math.hypot(s.state.u, s.state.v) / a2).toBeCloseTo(exact.downstreamMach, 12);
    }
  });

  it('an oblique shock at the wave angle of a wedge stands still and turns the flow by the wedge angle', () => {
    for (const [mach, theta] of [
      [2, 10],
      [3, 20],
      [5, 8],
    ] as const) {
      const free = freeAt(mach);
      const exact = obliqueShock(mach, theta * deg, gamma);
      const beta = exact.beta;
      // The shock line rises at beta; its outward normal points up and upstream.
      const s = shockState(free, gamma, mach * Math.sin(beta), -Math.sin(beta), Math.cos(beta));
      expect(s.speed).toBeCloseTo(0, 13);
      expect(s.state.p).toBeCloseTo(exact.pressureRatio, 12);
      expect(Math.atan2(s.state.v, s.state.u)).toBeCloseTo(theta * deg, 12);
    }
  });

  it('property: mass, momentum and energy fluxes are continuous across the shock in its own frame', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.05, max: 6, noNaN: true }),
        fc.double({ min: 1, max: 4, noNaN: true }),
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }),
        (machFree, machRel, angle) => {
          const free = freeAt(machFree);
          const nx = Math.cos(angle);
          const ny = Math.sin(angle);
          const s = shockState(free, gamma, machRel, nx, ny);
          // In the shock frame the normal velocity is u.n - W.
          const flux = (w: typeof free) => {
            const un = w.u * nx + w.v * ny - s.speed;
            const ut = -w.u * ny + w.v * nx;
            const h = (gamma / (gamma - 1)) * (w.p / w.rho) + 0.5 * (un * un + ut * ut);
            return [w.rho * un, w.rho * un * un + w.p, w.rho * un * ut, w.rho * un * h];
          };
          const before = flux(free);
          const after = flux(s.state);
          const scale = [
            before[0]!,
            before[1]!,
            Math.abs(before[0]!) * 10 + 1,
            Math.abs(before[3]!),
          ];
          for (let k = 0; k < 4; k++) {
            expect(Math.abs(after[k]! - before[k]!)).toBeLessThan(1e-12 * Math.max(scale[k]!, 1));
          }
        },
      ),
      { numRuns: 300, seed: 71 },
    );
  });
});

describe('the shock compatible with the flow behind it', () => {
  it('returns a standing shock when the flow behind is the exact post-shock state', () => {
    const mach = 3;
    const free = freeAt(mach);
    const s = shockState(free, gamma, mach, -1, 0);
    const w = s.state;
    const found = compatibleShock(free, gamma, -1, 0, {
      rho: w.rho,
      a: Math.sqrt((gamma * w.p) / w.rho),
      p: w.p,
      un: -w.u,
    });
    expect(found.speed).toBeCloseTo(0, 12);
  });

  it('moves the shock outward when the pressure behind it is higher, inward when lower', () => {
    const mach = 3;
    const free = freeAt(mach);
    const w = shockState(free, gamma, mach, -1, 0).state;
    const behind = (p: number) => ({
      rho: w.rho,
      a: Math.sqrt((gamma * w.p) / w.rho),
      p,
      un: -w.u,
    });
    expect(compatibleShock(free, gamma, -1, 0, behind(1.05 * w.p)).speed).toBeGreaterThan(0);
    expect(compatibleShock(free, gamma, -1, 0, behind(0.95 * w.p)).speed).toBeLessThan(0);
  });

  it('becomes a Mach wave (M = 1) where no shock fits, as for undisturbed flow behind it', () => {
    const mach = 2;
    const free = freeAt(mach);
    const nx = -Math.sin(45 * deg);
    const ny = Math.cos(45 * deg);
    const s = compatibleShock(free, gamma, nx, ny, {
      rho: 1,
      a: Math.sqrt(gamma),
      p: 1,
      un: free.u * nx + free.v * ny,
    });
    expect(s.state.p).toBeCloseTo(1, 14);
    expect(s.state.rho).toBeCloseTo(1, 14);
  });
});
