import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  PAIRS,
  T2_CASES,
  T3R_LEVELS,
  T3R_PAIR,
  t3rPasses,
  analyticReflection,
  convergesAsRegistered,
  exactLanding,
  hexagonEps,
  methodLanding,
  methodReflection,
  quadratureCheck,
  shearFlow,
  t1,
  t4Passes,
} from '../support/planar-characteristics-checks';

// The code checks of design record 0009 section 9.3 on
// src/validation/planar-characteristics.ts, each against its registered
// predicate. Measured when written (docs/research/fin-wave-drag/w9/code-checks.out):
// T1 within 4.6e-15, T2 within 3.3e-14, T4's code 9.95e-12 in p at N = 256
// at order 2 and every planted error failing, T5 at order 2 (1.9e-8 to
// 7.5e-6 at N = 256), the quadrature within 2.3e-16.

describe('0009 section 9.3: the code checks of the planar method of characteristics', () => {
  it.each(PAIRS)(
    'T1: a wedge and a flat to a square edge, %d deg at Mach %d, as shock-expansion',
    (t, m) => {
      for (const N of LEVELS) {
        const r = t1(t, m, N);
        expect(r.drag).toBeLessThanOrEqual(1e-12);
        expect(r.flatPressure).toBeLessThanOrEqual(1e-12);
      }
    },
  );

  it.each(T2_CASES)('T2: the exact hexagon t/c $tc, bevel $bevel, Mach $mach gives eps 0', (c) => {
    for (const N of LEVELS) {
      const r = hexagonEps(c.tc, c.bevel, c.mach, N);
      expect(r.exact).toBe(true);
      expect(Math.abs(r.eps)).toBeLessThanOrEqual(1e-12);
    }
  });

  const t3 = (t: number, m: number) => {
    const R = analyticReflection(t, m);
    const err = LEVELS.map((N) => methodReflection(t, m, N) - R);
    // Decreasing from N = 32 to 256, the last at most a sixth of N = 32's.
    return convergesAsRegistered(err.slice(1), err[1]!, 1 / 6, 1e-10);
  };
  it.each(PAIRS.slice(0, 3))(
    'T3: the first reflection at %d deg, Mach %d, approaches R',
    (t, m) => {
      expect(t3(t, m)).toBe(true);
    },
  );
  // Fails as registered: at 14 deg and Mach 1.6 (Mach 1.023 behind the
  // shock) R_N approaches R = -0.1434 at first order only from about N = 512
  // (0.0184 off at N = 256, a quarter of N = 32's, against the sixth asked);
  // put to the owner in 0009 section 9's note of 2026-10-30.
  it.fails('T3: the first reflection at 14 deg, Mach 1.6, approaches R as registered', () => {
    expect(t3(14, 1.6)).toBe(true);
  });
  // T3R, registered in 0009 section 9.12 after that failure and before it ran: the other node below
  // Mach 1.1 behind the shock, to N = 8192.
  it('T3R: the first reflection at 11 deg, Mach 1.5, approaches R at first order by N = 8192', () => {
    const [t, m] = T3R_PAIR;
    const R = analyticReflection(t, m);
    expect(t3rPasses(T3R_LEVELS.map((N) => methodReflection(t, m, N) - R))).toBe(true);
  });

  it('T4: a parallel shear flow stays parallel at uniform pressure, and each planted error fails', () => {
    const run = (o: Parameters<typeof shearFlow>[1]) => LEVELS.map((N) => shearFlow(N, o));
    expect(t4Passes(run({}))).toBe(true);
    expect(t4Passes(run({ planted: 'no-entropy-term' }))).toBe(false);
    expect(t4Passes(run({ planted: 'entropy-term-sign' }))).toBe(false);
    expect(t4Passes(run({ mirror: true }))).toBe(false);
    expect(t4Passes(run({ planted: 'previous-k' }))).toBe(false);
  });

  it.each(PAIRS)('T5: the first landing at %d deg, Mach %d, at second order', (t, m) => {
    const exact = exactLanding(t, m);
    expect(Math.abs(exactLanding(t, m, 128) - exact)).toBeLessThan(1e-12);
    const err = LEVELS.map((N) => methodLanding(t, m, N) - exact);
    expect(convergesAsRegistered(err.slice(1), err[2]!, 1 / 12, 1e-12)).toBe(true);
  });

  it("T5: the rear bevel's quadrature integrates a linear Cp exactly, the last interval cut", () => {
    const q = quadratureCheck();
    expect(Math.abs(q.method / q.exact - 1)).toBeLessThanOrEqual(1e-14);
  });
});
