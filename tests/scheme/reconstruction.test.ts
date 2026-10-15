import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { VAN_ALBADA_EPSILON, vanAlbada } from '../../src/scheme/limiters';
import { reconstructShared, sharedFactor, vanAlbadaFactor } from '../../src/scheme/reconstruction';

const slope = fc.double({ min: -10, max: 10, noNaN: true });
const state = fc.record({
  rho: fc.double({ min: 0.1, max: 10, noNaN: true }),
  u: fc.double({ min: -5, max: 5, noNaN: true }),
  v: fc.double({ min: -5, max: 5, noNaN: true }),
  p: fc.double({ min: 0.1, max: 10, noNaN: true }),
});

describe('shared reconstruction', () => {
  it('property: the factor reproduces van Albada on the central slope wherever it is positive', () => {
    fc.assert(
      fc.property(slope, slope, (a, b) => {
        const f = vanAlbadaFactor(a, b);
        if (f > 0) expect(f * 0.5 * (a + b)).toBeCloseTo(vanAlbada(a, b), 12);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(vanAlbadaFactor(a, b)).toBe(vanAlbadaFactor(b, a));
      }),
      { seed: 91 },
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

  it('property: an extremum in any one variable flattens every variable', () => {
    fc.assert(
      fc.property(state, state, (a, b) => {
        // u has a strict local maximum at the centre; the others are linear.
        const prev = { ...a, u: 0 };
        const next = { rho: 2 * b.rho, u: 0, v: 2 * b.v, p: 2 * b.p };
        const centre = {
          rho: 0.5 * (prev.rho + next.rho),
          u: 1,
          v: 0.5 * (prev.v + next.v),
          p: 0.5 * (prev.p + next.p),
        };
        expect(sharedFactor(prev, centre, next)).toBe(0);
        expect(reconstructShared(prev, centre, next, 1)).toEqual(centre);
      }),
      { seed: 92 },
    );
  });

  it('property: reconstructed states lie between the neighbouring states', () => {
    // Where both one-sided differences of a variable are at least
    // sqrt(eps), its face value cannot leave the neighbour range: the
    // factor is then at most 2 (t + 1) / (t^2 + 1) for the slope ratio t,
    // and the shared factor is no larger. Below that scale eps makes the
    // limiter deliberately smooth, and the face value may pass a neighbour
    // by at most a quarter of the difference across the cell.
    const scale = Math.sqrt(VAN_ALBADA_EPSILON);
    fc.assert(
      fc.property(state, state, state, fc.constantFrom(1, -1), (prev, centre, next, side) => {
        const f = reconstructShared(prev, centre, next, side);
        for (const key of ['rho', 'u', 'v', 'p'] as const) {
          const lo = Math.min(prev[key], centre[key], next[key]);
          const hi = Math.max(prev[key], centre[key], next[key]);
          const a = centre[key] - prev[key];
          const b = next[key] - centre[key];
          const roundOff = 1e-12 * (Math.abs(lo) + Math.abs(hi));
          const slack = Math.min(Math.abs(a), Math.abs(b)) >= scale ? 0 : 0.25 * Math.abs(a + b);
          expect(f[key]).toBeGreaterThanOrEqual(lo - slack - roundOff);
          expect(f[key]).toBeLessThanOrEqual(hi + slack + roundOff);
        }
      }),
      { seed: 93 },
    );
  });

  it('may pass a neighbour only by differences below the smoothing scale', () => {
    // The case fast-check found: uniform flow but for a 4e-12 pressure step.
    const prev = { rho: 0.1, u: 0, v: 0, p: 0.1 };
    const next = { ...prev, p: 0.1 + 4e-12 };
    const face = reconstructShared(prev, prev, next, -1);
    expect(face.p).toBeLessThan(prev.p);
    expect(prev.p - face.p).toBeLessThanOrEqual(0.25 * 4e-12 * (1 + 1e-3));
  });
});
