import { beforeAll, describe, expect, it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { rampGrid } from '../../src/grid/shapes';
import { taylorMaccoll, type ConeFlow } from '../../src/validation/taylor-maccoll';

/**
 * Axisymmetric validation: supersonic flow over a sharp cone at zero angle
 * of attack, against the Taylor-Maccoll solution. A ramp grid in
 * axisymmetric geometry is a cone: its lower boundary is the axis upstream
 * of the apex (faces of zero area) and the cone surface after it.
 *
 * The flow is conical, so the surface pressure is the same all along the
 * cone; the computed pressure approaches it downstream of the apex, where
 * the grid resolves the shock layer. It is compared over x = 1.0 to 1.4.
 * Grid convergence, M = 3, 20 deg, at x = 1.3: -0.22%, -0.12%, -0.061% on
 * 60 x 30, 120 x 60 and 240 x 120 cells (observed order 0.9; Richardson
 * extrapolation +0.002%). See docs/design/0003-2d-solver.md.
 */

const gamma = 1.4;
const deg = Math.PI / 180;
const SOLVE_TIMEOUT = 60_000;

function coneFlow(mach: number, coneAngle: number): { s: Euler2D; initialResidual: number } {
  const free = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
  const s = new Euler2D({
    grid: rampGrid({
      ni: 60,
      nj: 30,
      xMin: -0.5,
      xCorner: 0,
      xMax: 1.5,
      height: 1.2,
      angle: coneAngle,
    }),
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
      jMax: { kind: 'outflow' },
    },
  });
  s.setInitialCondition(() => free);
  const initialResidual = s.densityResidualNorm();
  s.iterate(2000);
  return { s, initialResidual };
}

/** Mean cone-surface pressure over the faces with midpoint x in (x0, x1). */
function surfacePressure(s: Euler2D, x0: number, x1: number): number {
  const values = s
    .boundaryFluxes('jMin')
    .filter((f) => f.x > x0 && f.x < x1)
    .map((f) => f.flux[1] * f.nx + f.flux[2] * f.ny);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Distance of the captured shock from the exact conical shock, in local
 * cell heights, on each vertical grid line with x in (0.6, 1.3): the shock
 * is where the pressure crosses the mean of its free-stream and post-shock
 * values. (An angle seen from the apex would exaggerate a fixed offset near
 * the apex.)
 */
function shockOffsets(s: Euler2D, exact: ConeFlow): number[] {
  const pMid = 0.5 * (1 + exact.postShockPressureRatio);
  const { ni, nj, centroidX, centroidY } = s.metrics;
  const offsets: number[] = [];
  for (let i = 0; i < ni; i++) {
    const x = centroidX[i]!;
    if (x < 0.6 || x > 1.3) continue;
    for (let j = nj - 2; j >= 0; j--) {
      const p0 = s.primitive(i, j).p;
      const p1 = s.primitive(i, j + 1).p;
      if (p0 > pMid && p1 <= pMid) {
        const y0 = centroidY[i + j * ni]!;
        const y1 = centroidY[i + (j + 1) * ni]!;
        const y = y0 + ((y1 - y0) * (p0 - pMid)) / (p0 - p1);
        offsets.push((y - x * Math.tan(exact.shockAngle)) / (y1 - y0));
        break;
      }
    }
  }
  return offsets;
}

describe.each([
  // Measured when written, surface pressure over x = 1.0 to 1.4 on this
  // grid: +0.03%, -0.03% and -0.25%.
  { mach: 2.35, cone: 10, pressureTolerance: 1e-3 },
  { mach: 2, cone: 15, pressureTolerance: 1e-3 },
  { mach: 3, cone: 20, pressureTolerance: 4e-3 },
])('Euler2D validation: cone, M = $mach, $cone deg', ({ mach, cone, pressureTolerance }) => {
  const exact = taylorMaccoll(mach, cone * deg, gamma);
  let s: Euler2D;
  let initialResidual: number;
  beforeAll(() => {
    ({ s, initialResidual } = coneFlow(mach, cone * deg));
  }, SOLVE_TIMEOUT);

  it('converges: the residual falls to round-off', () => {
    expect(s.densityResidualNorm()).toBeLessThan(1e-10 * initialResidual);
  });

  it('surface pressure matches Taylor-Maccoll', () => {
    const p = surfacePressure(s, 1.0, 1.4);
    expect(Math.abs(p / exact.surfacePressureRatio - 1)).toBeLessThan(pressureTolerance);
  });

  it('the captured shock lies within half a cell of the Taylor-Maccoll shock', () => {
    // Measured when written: 0.08 to 0.24 cell heights outside it.
    const offsets = shockOffsets(s, exact);
    expect(offsets.length).toBeGreaterThan(10);
    for (const offset of offsets) expect(Math.abs(offset)).toBeLessThan(0.5);
  });
});
