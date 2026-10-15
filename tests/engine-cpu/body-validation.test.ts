import { beforeAll, describe, expect, it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import type { Body } from '../../src/geometry/body';
import { bodyGrid } from '../../src/grid/body-grid';
import type { Primitive2D } from '../../src/scheme/flux';
import { TN3716_MACH, TN3716_ZERO_INCIDENCE } from '../../src/validation/ogive-cylinder-tn3716';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

/**
 * The Euler solver on grids generated from body profiles (lengths in body
 * diameters, radius 0.5). See docs/design/0004-grids.md for the grid
 * convergence measured beyond these tests.
 */

const gamma = 1.4;
const deg = Math.PI / 180;
const SOLVE_TIMEOUT = 120_000;

function solveBody(body: Body, mach: number, nj: number) {
  const { grid } = bodyGrid(body, { nj, mach, gamma });
  const free: Primitive2D = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
  const s = new Euler2D({
    grid,
    geometry: 'axisymmetric',
    gamma,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'shared',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'inflow', state: free },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'inflow', state: free },
    },
  });
  s.setInitialCondition(() => free);
  const initialResidual = s.densityResidualNorm();
  s.iterate(60 * nj);
  return { s, initialResidual };
}

/**
 * Largest pressure disturbance in the cells along the outer boundary. It
 * imposes the free stream, which is only right if the bow shock stays
 * inside it: this must be close to zero.
 */
function outerDisturbance(s: Euler2D): number {
  let worst = 0;
  for (let i = 0; i < s.metrics.ni; i++) {
    worst = Math.max(worst, Math.abs(s.primitive(i, s.metrics.nj - 1).p - 1));
  }
  return worst;
}

/** Wall pressure interpolated linearly between face midpoints, at x. */
function wallPressureAt(s: Euler2D, x: number): number {
  const faces = s
    .boundaryFluxes('jMin')
    .map((f) => ({ x: f.x, p: f.flux[1] * f.nx + f.flux[2] * f.ny }));
  let k = 0;
  while (faces[k + 1]!.x < x) k++;
  const a = faces[k]!;
  const b = faces[k + 1]!;
  return a.p + ((b.p - a.p) * (x - a.x)) / (b.x - a.x);
}

describe.each([
  // Measured when written, cone surface over 0.5 to 0.95 of the cone
  // length, nj = 20: +0.030% and -0.276% (-0.159% and -0.085% at nj = 40
  // and 80 for the 20 deg cone).
  { mach: 2, cone: 15, tolerance: 1e-3 },
  { mach: 3, cone: 20, tolerance: 3.5e-3 },
])(
  'Euler2D on a generated grid: cone-cylinder, M = $mach, $cone deg',
  ({ mach, cone, tolerance }) => {
    const body: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(cone * deg), baseRadius: 0.5 },
      cylinderLength: 4,
    };
    let s: Euler2D;
    let initialResidual: number;
    beforeAll(() => {
      ({ s, initialResidual } = solveBody(body, mach, 20));
    }, SOLVE_TIMEOUT);

    it('converges, with the outer boundary undisturbed', () => {
      expect(s.densityResidualNorm()).toBeLessThan(1e-10 * initialResidual);
      expect(outerDisturbance(s)).toBeLessThan(1e-5);
    });

    it('cone surface pressure matches Taylor-Maccoll', () => {
      const exact = taylorMaccoll(mach, cone * deg, gamma).surfacePressureRatio;
      const L = body.nose.length;
      const values = s
        .boundaryFluxes('jMin')
        .filter((f) => f.x > 0.5 * L && f.x < 0.95 * L)
        .map((f) => f.flux[1] * f.nx + f.flux[2] * f.ny);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      expect(Math.abs(mean / exact - 1)).toBeLessThan(tolerance);
    });
  },
);

describe('Euler2D on a generated grid: ogive-cylinder against NACA TN 3716', () => {
  // The wind-tunnel model: 3-caliber tangent ogive, 7-caliber cylinder.
  const body: Body = {
    nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
    cylinderLength: 7,
  };
  const mach = TN3716_MACH;
  const q = 0.5 * gamma * mach * mach;
  let coarse: { s: Euler2D; initialResidual: number };
  let fine: { s: Euler2D; initialResidual: number };
  beforeAll(() => {
    coarse = solveBody(body, mach, 20);
    fine = solveBody(body, mach, 40);
  }, SOLVE_TIMEOUT);
  const cp = (s: Euler2D, x: number) => (wallPressureAt(s, x) - 1) / q;

  it('converges on both grids, with the outer boundary undisturbed', () => {
    for (const { s, initialResidual } of [coarse, fine]) {
      expect(s.densityResidualNorm()).toBeLessThan(1e-10 * initialResidual);
      expect(outerDisturbance(s)).toBeLessThan(1e-5);
    }
  });

  it('is grid-converged at the measuring stations (nj = 20 and 40 agree within 0.003)', () => {
    // Measured when written: within 0.0024 (largest at x/d = 0.22, nearest
    // the tip); 40 and 80 agree within 0.0004.
    for (const { xOverD } of TN3716_ZERO_INCIDENCE) {
      expect(Math.abs(cp(coarse.s, xOverD) - cp(fine.s, xOverD))).toBeLessThan(3e-3);
    }
  });

  it('matches the measured pressures within 0.025, lying below them as inviscid flow must', () => {
    // The boundary layer of the model thickens its effective shape, which
    // softens the expansion at the shoulder and raises the pressure on the
    // cylinder. Inviscid solutions miss this: the report's own method of
    // characteristics (its figure 3) also lies below the measurements, by
    // about 0.02 at the shoulder. Measured when written: largest
    // difference 0.022 at x/d = 2.95.
    for (const { xOverD, cp: measured } of TN3716_ZERO_INCIDENCE) {
      const computed = cp(fine.s, xOverD);
      expect(Math.abs(computed - measured)).toBeLessThan(0.025);
      if (xOverD >= 0.5) expect(computed).toBeLessThan(measured + 0.002);
    }
  });
});
