import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { GAMMA_AIR, soundSpeed, type Primitive1D } from '../../src/scheme/gas';
import {
  FLUXES,
  godunovFlux,
  hllcFlux,
  physicalFlux,
  type FluxFunction,
} from '../../src/scheme/flux';
import { solveStarRegion } from '../../src/scheme/riemann-exact';
import { fluxScales, scaledError } from '../support/flux-scales';

const gamma = GAMMA_AIR;

const state = fc.record({
  rho: fc.double({ min: 1e-2, max: 1e2, noNaN: true }),
  u: fc.double({ min: -5, max: 5, noNaN: true }),
  p: fc.double({ min: 1e-2, max: 1e2, noNaN: true }),
});

/** Pairs that do not generate a vacuum (needed by the exact Godunov flux). */
const pair = fc
  .tuple(state, state)
  .filter(
    ([l, r]) =>
      (2 / (gamma - 1)) * (soundSpeed(l.rho, l.p, gamma) + soundSpeed(r.rho, r.p, gamma)) >
      (r.u - l.u) * 1.01,
  );

function evaluate(flux: FluxFunction, l: Primitive1D, r: Primitive1D): number[] {
  const out = new Float64Array(3);
  flux(l, r, gamma, out);
  return [...out];
}

function expectClose(a: number[], b: number[], scales: number[], tol = 1e-12): void {
  expect(scaledError(a, b, scales)).toBeLessThan(tol);
}

describe.each(Object.entries(FLUXES))('%s flux', (_, flux) => {
  it('property: consistency, F(w, w) equals the physical flux', () => {
    fc.assert(
      fc.property(state, (w) => {
        const f = evaluate(flux, w, w);
        const exact = evaluate(
          (x, _y, g, out) => {
            physicalFlux(x, g, out);
          },
          w,
          w,
        );
        expectClose(f, exact, fluxScales(gamma, w));
      }),
      { numRuns: 500, seed: 1 },
    );
  });

  it('property: mirror symmetry, reflecting the problem reflects the flux', () => {
    fc.assert(
      fc.property(pair, ([l, r]) => {
        const f = evaluate(flux, l, r);
        const g = evaluate(flux, { ...r, u: -r.u }, { ...l, u: -l.u });
        expectClose(f, [-g[0]!, g[1]!, -g[2]!], fluxScales(gamma, l, r));
      }),
      { numRuns: 500, seed: 2 },
    );
  });
});

describe('HLLC specifics', () => {
  it('resolves a stationary contact exactly (zero mass and energy flux)', () => {
    const f = evaluate(hllcFlux, { rho: 1, u: 0, p: 1 }, { rho: 0.1, u: 0, p: 1 });
    expect(f[0]).toBe(0);
    expect(f[1]).toBeCloseTo(1, 14);
    expect(f[2]).toBe(0);
  });

  it('property: a moving contact is transported with the upwind state', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        fc.double({ min: -0.9, max: 0.9, noNaN: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        (rhoL, rhoR, machish, p) => {
          const u = machish * Math.min(soundSpeed(rhoL, p, gamma), soundSpeed(rhoR, p, gamma));
          const L = { rho: rhoL, u, p };
          const R = { rho: rhoR, u, p };
          const f = evaluate(hllcFlux, L, R);
          const exact = evaluate(godunovFlux, L, R);
          expectClose(f, exact, fluxScales(gamma, L, R));
        },
      ),
      { numRuns: 500, seed: 4 },
    );
  });

  it('agrees with the exact Godunov flux to second order in the jump size', () => {
    // For a small jump of size eps, consistent approximate fluxes differ from
    // the exact flux by O(eps^2), so halving eps should quarter the difference.
    const base = { rho: 1.2, u: 0.3, p: 0.9 };
    const diff = (eps: number) => {
      const r = { rho: base.rho * (1 + eps), u: base.u + 0.7 * eps, p: base.p * (1 - 1.3 * eps) };
      const a = evaluate(hllcFlux, base, r);
      const b = evaluate(godunovFlux, base, r);
      return Math.max(...a.map((v, i) => Math.abs(v - b[i]!)));
    };
    const ratio = diff(1e-3) / diff(5e-4);
    expect(ratio).toBeGreaterThan(3.5);
    expect(ratio).toBeLessThan(4.5);
  });
});

describe('upwinding', () => {
  // Note: two states that are both supersonic in the same direction do NOT
  // in general give a fully upwind flux. If the faster state catches the
  // slower one, the collision can send a shock back across the face. The
  // correct statement is about the waves of the exact solution.

  /** Speeds of the leftmost and rightmost waves of the exact solution. */
  function extremeWaveSpeeds(l: Primitive1D, r: Primitive1D) {
    const star = solveStarRegion(l, r, gamma);
    const aL = soundSpeed(l.rho, l.p, gamma);
    const aR = soundSpeed(r.rho, r.p, gamma);
    const shockFactor = (pStar: number, p: number) =>
      Math.sqrt(((gamma + 1) / (2 * gamma)) * (pStar / p) + (gamma - 1) / (2 * gamma));
    return {
      leftmost: star.leftWave === 'shock' ? l.u - aL * shockFactor(star.pStar, l.p) : l.u - aL,
      rightmost: star.rightWave === 'shock' ? r.u + aR * shockFactor(star.pStar, r.p) : r.u + aR,
    };
  }

  it('property: the exact flux is fully upwind whenever all exact waves move one way', () => {
    const shifted = fc.tuple(pair, fc.double({ min: -20, max: 20, noNaN: true }));
    fc.assert(
      fc.property(shifted, ([[l, r], V]) => {
        const L = { ...l, u: l.u + V };
        const R = { ...r, u: r.u + V };
        const { leftmost, rightmost } = extremeWaveSpeeds(L, R);
        const f = evaluate(godunovFlux, L, R);
        const physical = (w: Primitive1D) =>
          evaluate(
            (x, _y, g, out) => {
              physicalFlux(x, g, out);
            },
            w,
            w,
          );
        if (leftmost > 0) expectClose(f, physical(L), fluxScales(gamma, L, R));
        if (rightmost < 0) expectClose(f, physical(R), fluxScales(gamma, L, R));
      }),
      { numRuns: 2000, seed: 3 },
    );
  });

  it('property: HLLC is fully upwind for supersonic flow with modest, non-colliding jumps', () => {
    const supersonicPair = fc.record({
      rho: fc.double({ min: 0.1, max: 10, noNaN: true }),
      p: fc.double({ min: 0.1, max: 10, noNaN: true }),
      mach: fc.double({ min: 3, max: 6, noNaN: true }),
      jumpRho: fc.double({ min: -0.1, max: 0.1, noNaN: true }),
      jumpP: fc.double({ min: -0.1, max: 0.1, noNaN: true }),
      jumpU: fc.double({ min: 0, max: 0.2, noNaN: true }),
      rightward: fc.boolean(),
    });
    fc.assert(
      fc.property(supersonicPair, (c) => {
        const dir = c.rightward ? 1 : -1;
        const a = soundSpeed(c.rho, c.p, gamma);
        // Upstream state, then a downstream state moving away from it.
        const up = { rho: c.rho, u: dir * c.mach * a, p: c.p };
        const down = {
          rho: c.rho * (1 + c.jumpRho),
          u: dir * c.mach * a * (1 + c.jumpU),
          p: c.p * (1 + c.jumpP),
        };
        const [L, R] = c.rightward ? [up, down] : [down, up];
        const f = evaluate(hllcFlux, L, R);
        const upwind = evaluate(
          (x, _y, g, out) => {
            physicalFlux(x, g, out);
          },
          up,
          up,
        );
        expectClose(f, upwind, fluxScales(gamma, L, R));
      }),
      { numRuns: 1000, seed: 5 },
    );
  });
});
