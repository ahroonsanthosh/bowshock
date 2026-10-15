import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Primitive2D } from '../../src/scheme/flux';
import { vanAlbada } from '../../src/scheme/limiters';
import { reconstructShared, sharedFactor } from '../../src/scheme/reconstruction';

const KEYS = ['rho', 'u', 'v', 'p'] as const;

const state = fc.record({
  rho: fc.double({ min: 0.1, max: 10, noNaN: true }),
  u: fc.double({ min: -5, max: 5, noNaN: true }),
  v: fc.double({ min: -5, max: 5, noNaN: true }),
  p: fc.double({ min: 0.1, max: 10, noNaN: true }),
});
const slope = fc.double({ min: -10, max: 10, noNaN: true });

describe('shared reconstruction', () => {
  it('property: with one variable varying, it is the van Albada limiter on that variable', () => {
    fc.assert(
      fc.property(state, slope, slope, fc.constantFrom(...KEYS), (centre, a, b, key) => {
        const prev = { ...centre, [key]: centre[key] - a };
        const next = { ...centre, [key]: centre[key] + b };
        const face = reconstructShared(prev, centre, next, 1);
        expect(face[key] - centre[key]).toBeCloseTo(0.5 * vanAlbada(a, b), 12);
      }),
      { seed: 91 },
    );
  });

  it('property: the factor lies in [0, 1] and is symmetric in the two differences', () => {
    fc.assert(
      fc.property(state, state, state, (prev, centre, next) => {
        const f = sharedFactor(prev, centre, next);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
        // Swapping prev and next negates both differences and swaps them.
        expect(sharedFactor(next, centre, prev)).toBeCloseTo(f, 14);
      }),
      { seed: 92 },
    );
  });

  it('is exact (factor 1) on linear data in every variable', () => {
    const prev = { rho: 1, u: 0.5, v: -0.2, p: 1 };
    const centre = { rho: 1.1, u: 0.6, v: -0.1, p: 1.2 };
    const next = { rho: 1.2, u: 0.7, v: 0, p: 1.4 };
    expect(sharedFactor(prev, centre, next)).toBeCloseTo(1, 12);
    const face = reconstructShared(prev, centre, next, 1);
    expect(face.rho).toBeCloseTo(1.15, 12);
    expect(face.p).toBeCloseTo(1.3, 12);
  });

  it('property: opposing difference vectors (an extremum of the state) flatten every variable', () => {
    fc.assert(
      fc.property(state, state, fc.double({ min: 0.1, max: 3, noNaN: true }), (a, centre, r) => {
        // B = -r A: the state turns back on itself across the cell.
        const offset = (scale: number): Primitive2D => ({
          rho: centre.rho + scale * (a.rho - 1),
          u: centre.u + scale * (a.u - 1),
          v: centre.v + scale * (a.v - 1),
          p: centre.p + scale * (a.p - 1),
        });
        const prev = offset(-1);
        const next = offset(-r);
        fc.pre(KEYS.some((k) => Math.abs(a[k] - 1) > 1e-2));
        expect(sharedFactor(prev, centre, next)).toBe(0);
        expect(reconstructShared(prev, centre, next, -1)).toEqual(centre);
      }),
      { seed: 93 },
    );
  });

  it('property: a variable passes its neighbours by at most a quarter of its own differences', () => {
    // All variables share the factor of the state vector, so a variable
    // with a small extremum, riding on large monotone changes of the
    // others, is not limited to its own neighbour range: its face value may
    // pass it, by at most |a + b| / 4 for its differences a and b (the
    // factor is at most 1).
    fc.assert(
      fc.property(state, state, state, fc.constantFrom(1, -1), (prev, centre, next, side) => {
        const face = reconstructShared(prev, centre, next, side);
        for (const k of KEYS) {
          const lo = Math.min(prev[k], centre[k], next[k]);
          const hi = Math.max(prev[k], centre[k], next[k]);
          const bound = 0.25 * Math.abs(next[k] - prev[k]) + 1e-12 * (Math.abs(lo) + Math.abs(hi));
          expect(face[k]).toBeGreaterThanOrEqual(lo - bound);
          expect(face[k]).toBeLessThanOrEqual(hi + bound);
        }
      }),
      { seed: 94 },
    );
  });

  it('can pass a neighbour in a variable with an extremum, by a quarter of its differences', () => {
    // The case the bound above describes: pressure rises linearly while the
    // velocity has a small maximum at the centre.
    const prev = { rho: 1, u: 1, v: 0, p: 1 };
    const centre = { rho: 1, u: 1.001, v: 0, p: 1.1 };
    const next = { rho: 1, u: 1.0005, v: 0, p: 1.2 };
    const face = reconstructShared(prev, centre, next, 1);
    expect(face.u).toBeGreaterThan(centre.u);
    expect(face.u - centre.u).toBeLessThanOrEqual(0.25 * (next.u - prev.u));
  });
});
