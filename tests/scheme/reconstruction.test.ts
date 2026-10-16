import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Primitive2D } from '../../src/scheme/flux';
import { VAN_ALBADA_EPSILON, vanAlbada } from '../../src/scheme/limiters';
import {
  reconstructShared,
  reconstructSharedScaled,
  sharedFactor,
  sharedScaledFactor,
} from '../../src/scheme/reconstruction';

const KEYS = ['rho', 'u', 'v', 'p'] as const;

/**
 * Order-one values in steps of 1e-3. fc.double draws boundary and
 * subnormal values often, which would leave these properties untested on
 * the data the solver sees.
 */
const value = (min: number, max: number) =>
  fc.integer({ min: Math.round(1000 * min), max: Math.round(1000 * max) }).map((n) => n / 1000);
const state = fc.record({
  rho: value(0.1, 10),
  u: value(-5, 5),
  v: value(-5, 5),
  p: value(0.1, 10),
});
const slope = value(-10, 10);

describe('shared reconstruction', () => {
  it('property: with one variable varying monotonically, it is the van Albada limiter', () => {
    fc.assert(
      fc.property(state, slope, slope, fc.constantFrom(...KEYS), (centre, a, b, key) => {
        fc.pre(a * b >= 0);
        const prev = { ...centre, [key]: centre[key] - a };
        const next = { ...centre, [key]: centre[key] + b };
        const face = reconstructShared(prev, centre, next, 1);
        expect(face[key] - centre[key]).toBeCloseTo(0.5 * vanAlbada(a, b), 12);
      }),
      { seed: 91 },
    );
  });

  it('is clipped at zero where the differences oppose, unlike the per-variable limiter', () => {
    // Unclipped, the factor turns negative and would steepen the extremum.
    const prev = { rho: 1, u: 0, v: 0, p: 0 };
    const centre = { ...prev, p: 1 };
    const next = { ...prev, p: 0.5 };
    expect(vanAlbada(1, -0.5)).toBeLessThan(-0.1);
    expect(sharedFactor(prev, centre, next)).toBe(0);
    expect(reconstructShared(prev, centre, next, 1)).toEqual(centre);
  });

  it('property: the factor lies in [0, 1], is symmetric, and vanishes where A.B < -eps', () => {
    fc.assert(
      fc.property(state, state, state, (prev, centre, next) => {
        const f = sharedFactor(prev, centre, next);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
        // Swapping prev and next negates both differences and swaps them.
        expect(sharedFactor(next, centre, prev)).toBeCloseTo(f, 14);
        const ab = KEYS.reduce((sum, k) => sum + (centre[k] - prev[k]) * (next[k] - centre[k]), 0);
        if (ab < -VAN_ALBADA_EPSILON) expect(f).toBe(0);
      }),
      { seed: 92 },
    );
  });

  it('property: the factor does not depend on the direction of the velocity axes', () => {
    // A.B and |A|, |B| are unchanged when (u, v) rotates in every cell.
    const angle = value(0, 2 * Math.PI);
    fc.assert(
      fc.property(state, state, state, angle, (prev, centre, next, theta) => {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        const rotate = (w: Primitive2D) => ({ ...w, u: c * w.u - s * w.v, v: s * w.u + c * w.v });
        expect(sharedFactor(rotate(prev), rotate(centre), rotate(next))).toBeCloseTo(
          sharedFactor(prev, centre, next),
          12,
        );
      }),
      { seed: 93 },
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
      fc.property(state, state, value(0.1, 3), (a, centre, r) => {
        // B = -r A: the state turns back on itself across the cell.
        const offset = (scale: number): Primitive2D => ({
          rho: centre.rho + scale * (a.rho - 1),
          u: centre.u + scale * (a.u - 1),
          v: centre.v + scale * (a.v - 1),
          p: centre.p + scale * (a.p - 1),
        });
        fc.pre(KEYS.some((k) => Math.abs(a[k] - 1) > 1e-2));
        expect(sharedFactor(offset(-1), centre, offset(-r))).toBe(0);
        expect(reconstructShared(offset(-1), centre, offset(-r), -1)).toEqual(centre);
      }),
      { seed: 94 },
    );
  });

  it('lets a variable with a small extremum pass its neighbours, by at most a quarter of its differences', () => {
    // The cost of one factor for all variables: here pressure rises
    // linearly, so the factor stays near 1, while the velocity has a small
    // maximum at the centre. Its face value passes the centre value; as the
    // factor is at most 1, by no more than |next - prev| / 4.
    const prev = { rho: 1, u: 1, v: 0, p: 1 };
    const centre = { rho: 1, u: 1.001, v: 0, p: 1.1 };
    const next = { rho: 1, u: 1.0005, v: 0, p: 1.2 };
    const face = reconstructShared(prev, centre, next, 1);
    expect(face.u).toBeGreaterThan(centre.u);
    expect(face.u - centre.u).toBeLessThanOrEqual(0.25 * (next.u - prev.u));
  });
});

describe('scaled shared reconstruction', () => {
  const gamma = 1.4;
  const state = (rho: number, u: number, v: number, p: number): Primitive2D => ({ rho, u, v, p });
  // The same flow in other units: density and pressure k times larger; the
  // velocities, whose square has the units of p / rho, unchanged.
  const inUnits = (w: Primitive2D, k: number): Primitive2D => ({
    ...w,
    rho: k * w.rho,
    p: k * w.p,
  });
  const prev = state(1.1, 2.3, 0.2, 1.4);
  const centre = state(1.3, 2.1, 0.35, 1.9);
  const next = state(1.4, 1.95, 0.4, 2.6);

  it('does not depend on the units', () => {
    const f = sharedScaledFactor(prev, centre, next, gamma);
    for (const k of [1e-3, 0.1, 10, 1e4]) {
      expect(
        sharedScaledFactor(inUnits(prev, k), inUnits(centre, k), inUnits(next, k), gamma),
      ).toBeCloseTo(f, 12);
    }
    // The unscaled factor does: it weights the variables by their size.
    expect(
      Math.abs(
        sharedFactor(inUnits(prev, 10), inUnits(centre, 10), inUnits(next, 10)) -
          sharedFactor(prev, centre, next),
      ),
    ).toBeGreaterThan(1e-3);
  });

  it('is 1 where the profile is linear and 0 at an extremum', () => {
    const lin = (t: number) => state(1 + 0.1 * t, 2 - 0.05 * t, 0.3 + 0.02 * t, 1.5 + 0.2 * t);
    expect(sharedScaledFactor(lin(-1), lin(0), lin(1), gamma)).toBeCloseTo(1, 6);
    expect(
      sharedScaledFactor(state(1, 2, 0, 1), state(1.2, 2.1, 0.1, 1.3), state(1, 2, 0, 1), gamma),
    ).toBe(0);
  });

  it('reconstructs a linear profile exactly', () => {
    const lin = (t: number) => state(1 + 0.1 * t, 2 - 0.05 * t, 0.3 + 0.02 * t, 1.5 + 0.2 * t);
    const face = reconstructSharedScaled(lin(-1), lin(0), lin(1), 1, gamma);
    const exact = lin(0.5);
    // Up to the factor's departure from 1 through eps.
    expect(face.rho).toBeCloseTo(exact.rho, 5);
    expect(face.p).toBeCloseTo(exact.p, 5);
  });
});
