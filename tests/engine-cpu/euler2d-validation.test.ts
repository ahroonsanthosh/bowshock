import { beforeAll, describe, expect, it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { rampGrid } from '../../src/grid/shapes';
import {
  machFromPrandtlMeyer,
  obliqueShock,
  prandtlMeyer,
  stagnationPressureRatio,
} from '../../src/validation/gas-dynamics';

/**
 * Steady supersonic flow over a compression ramp (oblique shock) and an
 * expansion corner (Prandtl-Meyer fan), against the exact solutions, with
 * the shared reconstruction used for steady flows.
 *
 * Measured when written (60 x 30 cells; 120 x 60 in brackets):
 * - wedge, M = 2.5, 10 deg: residual 2e-14 (3e-14), wall pressure +0.015%
 *   (+0.007%), spread along the plateau 0.004% (0.0004%), shock angle
 *   0.07 to 0.24 deg too large (0.03 to 0.13);
 * - expansion, M = 2, 10 deg: wall pressure +0.0015% (-0.0001%).
 * The wall-adjacent cells carry a numerical entropy layer from the corner
 * (entropy error 3e-2 in the first cell, 2e-3 to 4e-3 two cells out), so
 * the Mach number is checked away from the wall. Pressure is continuous
 * across the layer and is unaffected.
 */

const gamma = 1.4;
const deg = Math.PI / 180;
/** Time allowed for one steady solve, in milliseconds. */
const SOLVE_TIMEOUT = 60_000;

function rampFlow(
  mach: number,
  angle: number,
  iterations: number,
  height = 1.2,
): { s: Euler2D; initialResidual: number } {
  const free = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
  const solver = new Euler2D({
    grid: rampGrid({ ni: 60, nj: 30, xMin: -0.5, xCorner: 0, xMax: 1.5, height, angle }),
    geometry: 'planar',
    gamma,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'inflow', state: free },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'outflow' },
    },
  });
  solver.setInitialCondition(() => free);
  const initialResidual = solver.densityResidualNorm();
  solver.iterate(iterations);
  return { s: solver, initialResidual };
}

/** Mean wall pressure over the wall faces with centroid x in (x0, x1). */
function wallPressure(s: Euler2D, x0: number, x1: number): { mean: number; spread: number } {
  const values = s
    .boundaryFluxes('jMin')
    .filter((_, i) => s.metrics.centroidX[i]! > x0 && s.metrics.centroidX[i]! < x1)
    .map((f) => f.flux[1] * f.nx + f.flux[2] * f.ny);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return { mean, spread: Math.max(...values.map((p) => Math.abs(p / mean - 1))) };
}

/** Mean Mach number of the cells in grid row j with centroid x in (x0, x1). */
function rowMach(s: Euler2D, j: number, x0: number, x1: number): number {
  const machs: number[] = [];
  for (let i = 0; i < s.metrics.ni; i++) {
    const x = s.metrics.centroidX[i + j * s.metrics.ni]!;
    if (x <= x0 || x >= x1) continue;
    const w = s.primitive(i, j);
    machs.push(Math.hypot(w.u, w.v) / Math.sqrt((gamma * w.p) / w.rho));
  }
  return machs.reduce((a, b) => a + b, 0) / machs.length;
}

describe('Euler2D validation: oblique shock on a wedge (M = 2.5, 10 deg)', () => {
  const exact = obliqueShock(2.5, 10 * deg, gamma);
  let s: Euler2D;
  let initialResidual: number;
  beforeAll(() => {
    ({ s, initialResidual } = rampFlow(2.5, 10 * deg, 1600));
  }, SOLVE_TIMEOUT);

  it('converges: the residual falls to round-off', () => {
    // Per-variable limiting stalls here at 7e-3 (see reconstruction.ts).
    expect(s.densityResidualNorm()).toBeLessThan(1e-10 * initialResidual);
  });

  it('wall pressure matches the oblique-shock relation within 0.05%', () => {
    const p = wallPressure(s, 0.5, 1.2);
    expect(Math.abs(p.mean / exact.pressureRatio - 1)).toBeLessThan(5e-4);
    // Uniform behind the shock, as the exact solution is (per-variable
    // limiting left a 0.4% spread here).
    expect(p.spread).toBeLessThan(1e-3);
  });

  it('shock angle matches the theta-beta-Mach relation within 0.3 deg', () => {
    // On vertical grid lines, find where the pressure crosses the mean of
    // its two exact values; the shock leaves the corner at (0, 0).
    const pMid = 0.5 * (1 + exact.pressureRatio);
    const { ni, nj, centroidX, centroidY } = s.metrics;
    const angles: number[] = [];
    for (let i = 0; i < ni; i++) {
      const x = centroidX[i]!;
      if (x < 0.5 || x > 1.3) continue;
      for (let j = 0; j < nj - 1; j++) {
        const p0 = s.primitive(i, j).p;
        const p1 = s.primitive(i, j + 1).p;
        if (p0 > pMid && p1 <= pMid) {
          const y0 = centroidY[i + j * ni]!;
          const y1 = centroidY[i + (j + 1) * ni]!;
          const y = y0 + ((y1 - y0) * (p0 - pMid)) / (p0 - p1);
          angles.push(Math.atan2(y, x));
          break;
        }
      }
    }
    expect(angles.length).toBeGreaterThan(10);
    // The captured shock spans about three cells; its mid-pressure line was
    // up to 0.24 deg outside the exact angle on this grid (0.13 on 120 x 60).
    for (const beta of angles) expect(Math.abs(beta - exact.beta) / deg).toBeLessThan(0.3);
  });

  it('downstream Mach number matches within 0.5% away from the wall', () => {
    for (const j of [3, 4, 5]) {
      expect(Math.abs(rowMach(s, j, 0.6, 1.1) / exact.downstreamMach - 1)).toBeLessThan(5e-3);
    }
  });
});

describe('Euler2D validation: Prandtl-Meyer expansion (M = 2, 10 deg)', () => {
  const mach2 = machFromPrandtlMeyer(prandtlMeyer(2, gamma) + 10 * deg, gamma);
  const pressureRatio = stagnationPressureRatio(2, gamma) / stagnationPressureRatio(mach2, gamma);
  let s: Euler2D;
  let initialResidual: number;
  beforeAll(() => {
    ({ s, initialResidual } = rampFlow(2, -10 * deg, 500));
  }, SOLVE_TIMEOUT);

  it('converges: the residual falls to round-off', () => {
    expect(s.densityResidualNorm()).toBeLessThan(1e-10 * initialResidual);
  });

  it('wall pressure downstream of the fan matches isentropic theory within 0.05%', () => {
    const p = wallPressure(s, 0.6, 1.3);
    expect(Math.abs(p.mean / pressureRatio - 1)).toBeLessThan(5e-4);
    expect(p.spread).toBeLessThan(1e-3);
  });

  it('downstream Mach number matches within 0.5% away from the wall and the fan', () => {
    // The fan ends on the Mach line at mu(M2) - 10 deg = 14.8 deg from the
    // corner, which crosses rows 2 to 4 near x = 0.6 to 0.7; from x = 1 the
    // rows are at least two cells downstream of it. Measured: -0.13% and
    // -0.09% in rows 3 and 4.
    for (const j of [3, 4]) {
      expect(Math.abs(rowMach(s, j, 1.0, 1.4) / mach2 - 1)).toBeLessThan(5e-3);
    }
  });
});

describe('Euler2D validation: steady convergence with captured shocks', () => {
  it(
    'wedge on a second grid alignment (domain height 1.0) converges to round-off',
    () => {
      // Per-variable limiting stalls on this grid at 2e-2.
      const { s, initialResidual } = rampFlow(2.5, 10 * deg, 1600, 1.0);
      expect(s.densityResidualNorm()).toBeLessThan(1e-10 * initialResidual);
    },
    SOLVE_TIMEOUT,
  );

  it(
    'strong wedge (M = 5, 20 deg): converges, without pressure overshoot above 1%',
    () => {
      const exact = obliqueShock(5, 20 * deg, gamma);
      const { s, initialResidual } = rampFlow(5, 20 * deg, 2500);
      expect(s.densityResidualNorm()).toBeLessThan(1e-10 * initialResidual);
      let maxPressure = 0;
      for (let j = 0; j < s.metrics.nj; j++) {
        for (let i = 0; i < s.metrics.ni; i++) {
          maxPressure = Math.max(maxPressure, s.primitive(i, j).p);
        }
      }
      expect(maxPressure / exact.pressureRatio - 1).toBeLessThan(1e-2);
      expect(Math.abs(wallPressure(s, 0.5, 1.2).mean / exact.pressureRatio - 1)).toBeLessThan(5e-3);
    },
    SOLVE_TIMEOUT,
  );
});
