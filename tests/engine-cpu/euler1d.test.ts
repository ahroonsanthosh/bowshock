import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, Euler1D, type Euler1DConfig } from '../../src/engine-cpu/euler1d';
import type { Primitive1D } from '../../src/scheme/gas';
import { exactRiemannProfile } from '../../src/scheme/riemann-exact';
import { NonPhysicalStateError } from '../../src/solver/errors';
import { TORO_TESTS } from '../../src/validation/toro-tests';
import { TORO_L1_BASELINE_200 } from '../support/toro-baselines';

function makeSolver(overrides: Partial<Euler1DConfig> & { nCells: number }): Euler1D {
  return new Euler1D({ ...DEFAULT_CONFIG, xMin: 0, xMax: 1, ...overrides });
}

function densities(s: Euler1D): number[] {
  return Array.from({ length: s.config.nCells }, (_, i) => s.primitive(i).rho);
}

/** L1 errors of density, velocity and pressure against the exact solution at cell centres. */
function riemannL1Errors(
  test: (typeof TORO_TESTS)[number],
  nCells: number,
): { rho: number; u: number; p: number } {
  const s = makeSolver({ nCells });
  s.setInitialCondition((x) => (x < test.x0 ? test.left : test.right));
  s.advanceTo(test.tEnd);
  const xs = Array.from({ length: nCells }, (_, i) => s.cellCentre(i));
  const exact = exactRiemannProfile(test.left, test.right, xs, test.x0, test.tEnd, 1.4);
  const errors = { rho: 0, u: 0, p: 0 };
  for (let i = 0; i < nCells; i++) {
    const w = s.primitive(i);
    const e = exact[i]!;
    errors.rho += Math.abs(w.rho - e.rho) * s.dx;
    errors.u += Math.abs(w.u - e.u) * s.dx;
    errors.p += Math.abs(w.p - e.p) * s.dx;
  }
  return errors;
}

/** Density wave advected once around a periodic domain; returns L1 error vs exact cell averages. */
function smoothWaveL1Error(overrides: Partial<Euler1DConfig>, nCells: number): number {
  const s = makeSolver({ nCells, left: 'periodic', right: 'periodic', cfl: 0.4, ...overrides });
  s.setInitialCondition((x) => ({ rho: 1 + 0.2 * Math.sin(2 * Math.PI * x), u: 1, p: 1 }));
  s.advanceTo(1);
  let error = 0;
  for (let i = 0; i < nCells; i++) {
    const a = s.cellCentre(i) - s.dx / 2;
    const b = a + s.dx;
    // Exact cell average of 1 + 0.2 sin(2 pi x) over [a, b].
    const average =
      1 + (0.2 * (Math.cos(2 * Math.PI * a) - Math.cos(2 * Math.PI * b))) / (2 * Math.PI * s.dx);
    error += Math.abs(s.primitive(i).rho - average) * s.dx;
  }
  return error;
}

function observedOrder(coarseError: number, fineError: number): number {
  return Math.log2(coarseError / fineError);
}

describe('Euler1D: accuracy on smooth flow (order of convergence)', () => {
  // Expected orders: 2 for MUSCL with a smooth slope and SSP-RK2/3; TVD
  // limiters clip slopes at extrema and approach 2 more slowly; 1 for the
  // first-order scheme. Measured on 128 -> 256 cells. Values observed when
  // these tests were written: 2.00, 2.03, 2.04, 1.87, 1.97, 0.95.
  const cases = [
    {
      name: 'unlimited, SSP-RK3',
      cfg: { limiter: 'unlimitedCentral', timeIntegrator: 'ssprk3' },
      min: 1.95,
      max: 2.05,
    },
    {
      name: 'van Leer, SSP-RK2',
      cfg: { limiter: 'vanLeer', timeIntegrator: 'ssprk2' },
      min: 1.9,
      max: 2.15,
    },
    {
      name: 'van Albada, SSP-RK2',
      cfg: { limiter: 'vanAlbada', timeIntegrator: 'ssprk2' },
      min: 1.9,
      max: 2.15,
    },
    {
      name: 'minmod, SSP-RK2',
      cfg: { limiter: 'minmod', timeIntegrator: 'ssprk2' },
      min: 1.75,
      max: 2.1,
    },
    {
      name: 'monotonized central, SSP-RK2',
      cfg: { limiter: 'monotonizedCentral', timeIntegrator: 'ssprk2' },
      min: 1.9,
      max: 2.1,
    },
    {
      name: 'first order, forward Euler',
      cfg: { limiter: 'firstOrder', timeIntegrator: 'forwardEuler' },
      min: 0.9,
      max: 1.1,
    },
  ] as const;

  for (const c of cases) {
    it(`${c.name}: observed order in [${c.min}, ${c.max}]`, () => {
      const order = observedOrder(smoothWaveL1Error(c.cfg, 128), smoothWaveL1Error(c.cfg, 256));
      expect(order).toBeGreaterThanOrEqual(c.min);
      expect(order).toBeLessThanOrEqual(c.max);
    });
  }
});

describe('Euler1D: Toro test problems against the exact solution', () => {
  for (const test of TORO_TESTS) {
    it(`${test.name}: converges under refinement and matches its baseline`, () => {
      const e100 = riemannL1Errors(test, 100);
      const e200 = riemannL1Errors(test, 200);
      const e400 = riemannL1Errors(test, 400);
      // Solutions with discontinuities converge at less than first order
      // in L1, because contacts smear as the grid is refined. Density must
      // converge clearly; every variable must improve with each refinement.
      // (Velocity in the 123 problem converges slowly, at observed orders of
      // about 0.3 to 0.7: near vacuum u = momentum / density is
      // ill-conditioned, a known difficulty of Godunov-type schemes.)
      expect(observedOrder(e100.rho, e200.rho)).toBeGreaterThan(0.5);
      expect(observedOrder(e200.rho, e400.rho)).toBeGreaterThan(0.5);
      for (const variable of ['u', 'p'] as const) {
        expect(observedOrder(e100[variable], e200[variable])).toBeGreaterThan(0.25);
        expect(observedOrder(e200[variable], e400[variable])).toBeGreaterThan(0.25);
      }
      const baseline = TORO_L1_BASELINE_200[test.name];
      if (baseline === undefined) throw new Error(`no baseline for ${test.name}`);
      // A regression of more than 10% fails; an improvement should be
      // investigated and the baseline lowered.
      expect(e200.rho).toBeLessThanOrEqual(1.1 * baseline);
      expect(e200.rho).toBeGreaterThanOrEqual(0.9 * baseline);
    });
  }
});

describe('Euler1D: exact discrete properties', () => {
  it('preserves a uniform flow exactly', () => {
    for (const bc of ['transmissive', 'periodic'] as const) {
      for (const flux of ['hllc', 'rusanov', 'godunov'] as const) {
        const s = makeSolver({ nCells: 50, left: bc, right: bc, flux });
        const w = { rho: 1.3, u: 0.7, p: 2.2 };
        s.setInitialCondition(() => w);
        const rho0 = densities(s);
        s.advanceTo(0.5);
        expect(densities(s)).toEqual(rho0);
      }
    }
  });

  it('conserves mass, momentum and energy to round-off on a periodic domain', () => {
    const s = makeSolver({ nCells: 200, left: 'periodic', right: 'periodic' });
    const test = TORO_TESTS[0]!;
    s.setInitialCondition((x) => (x > 0.25 && x < 0.75 ? test.left : test.right));
    const before = s.totals();
    s.advanceTo(0.3);
    const after = s.totals();
    expect(Math.abs(after.mass - before.mass) / before.mass).toBeLessThan(1e-13);
    expect(Math.abs(after.energy - before.energy) / before.energy).toBeLessThan(1e-13);
    // Total momentum is zero by symmetry; compare with the energy scale.
    expect(Math.abs(after.momentum - before.momentum) / before.energy).toBeLessThan(1e-13);
  });

  it('keeps a stationary contact discontinuity sharp with HLLC', () => {
    const s = makeSolver({ nCells: 100, flux: 'hllc' });
    const left = { rho: 1, u: 0, p: 1 };
    const right = { rho: 0.1, u: 0, p: 1 };
    s.setInitialCondition((x) => (x < 0.5 ? left : right));
    const rho0 = densities(s);
    s.advanceTo(1);
    const rho = densities(s);
    for (let i = 0; i < rho.length; i++) expect(Math.abs(rho[i]! - rho0[i]!)).toBeLessThan(1e-13);
  });

  it('is mirror-symmetric: the reflected problem gives the reflected solution', () => {
    const test = TORO_TESTS[0]!;
    const a = makeSolver({ nCells: 200 });
    a.setInitialCondition((x) => (x < test.x0 ? test.left : test.right));
    a.advanceTo(test.tEnd);
    const mirror = (w: Primitive1D) => ({ ...w, u: -w.u });
    const b = makeSolver({ nCells: 200 });
    b.setInitialCondition((x) => (x < 1 - test.x0 ? mirror(test.right) : mirror(test.left)));
    b.advanceTo(test.tEnd);
    for (let i = 0; i < 200; i++) {
      const wa = a.primitive(i);
      const wb = b.primitive(199 - i);
      expect(Math.abs(wa.rho - wb.rho)).toBeLessThan(1e-12);
      expect(Math.abs(wa.u + wb.u)).toBeLessThan(1e-12);
      expect(Math.abs(wa.p - wb.p)).toBeLessThan(1e-12);
    }
  });

  it('reflective wall: half domain matches the symmetric full domain', () => {
    // Two gases collide symmetrically about x = 0.5. With a reflective wall
    // at x = 0.5, the half domain must reproduce the left half exactly.
    const collide = (x: number) => ({ rho: 1, u: x < 0.5 ? 1 : -1, p: 1 });
    const full = new Euler1D({ ...DEFAULT_CONFIG, nCells: 200, xMin: 0, xMax: 1 });
    full.setInitialCondition(collide);
    const half = new Euler1D({
      ...DEFAULT_CONFIG,
      nCells: 100,
      xMin: 0,
      xMax: 0.5,
      right: 'reflective',
    });
    half.setInitialCondition(collide);
    // Use identical time steps: the full domain's stable step equals the half's.
    for (let n = 0; n < 60; n++) {
      const dt = full.stableTimeStep();
      expect(half.stableTimeStep()).toBe(dt);
      full.step(dt);
      half.step(dt);
    }
    for (let i = 0; i < 100; i++) {
      expect(Math.abs(full.primitive(i).rho - half.primitive(i).rho)).toBeLessThan(1e-12);
      expect(Math.abs(full.primitive(i).p - half.primitive(i).p)).toBeLessThan(1e-12);
    }
  });

  it('lands exactly on the requested end time', () => {
    const s = makeSolver({ nCells: 64 });
    s.setInitialCondition(() => ({ rho: 1, u: 0.3, p: 1 }));
    s.advanceTo(0.123456789);
    expect(s.time).toBe(0.123456789);
  });
});

describe('Euler1D: failure is loud, never silent', () => {
  it('throws NonPhysicalStateError instead of producing NaN when a run goes unstable', () => {
    // An unlimited second-order scheme with forward Euler at CFL 1 is
    // unstable; on a strong shock it must fail with a clear error.
    const test = TORO_TESTS[2]!;
    const s = makeSolver({
      nCells: 200,
      limiter: 'unlimitedCentral',
      timeIntegrator: 'forwardEuler',
      cfl: 1,
    });
    s.setInitialCondition((x) => (x < test.x0 ? test.left : test.right));
    expect(() => {
      s.advanceTo(test.tEnd);
    }).toThrow(NonPhysicalStateError);
  });

  it('rejects invalid configuration', () => {
    expect(() => makeSolver({ nCells: 2 })).toThrow(RangeError);
    expect(() => makeSolver({ nCells: 10, cfl: 0 })).toThrow(RangeError);
    expect(() => makeSolver({ nCells: 10, left: 'periodic' })).toThrow(RangeError);
    expect(() => new Euler1D({ ...DEFAULT_CONFIG, nCells: 10, xMin: 1, xMax: 0 })).toThrow(
      RangeError,
    );
  });
});
