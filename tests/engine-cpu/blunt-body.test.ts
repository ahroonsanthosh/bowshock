import { beforeAll, describe, expect, it } from 'vitest';
import { outerDeviation } from '../../src/analysis/verified-drag';
import { Euler2D, type Euler2DConfig } from '../../src/engine-cpu/euler2d';
import type { Body } from '../../src/geometry/body';
import { billigStandoff, bluntBodyGrid } from '../../src/grid/blunt-grid';
import { normalShock } from '../../src/validation/gas-dynamics';

const gamma = 1.4;
const mach = 3;
const hemisphereCylinder: Body = {
  nose: { shape: { kind: 'ellipsoid' }, length: 0.5, baseRadius: 0.5 },
  cylinderLength: 4,
};

describe('hemisphere-cylinder on the blunt-body grid, Mach 3', () => {
  const freeStream = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
  let config: Euler2DConfig;
  let solver: Euler2D;
  let residual: number;

  beforeAll(() => {
    const { grid } = bluntBodyGrid(hemisphereCylinder, { nj: 20, mach });
    config = {
      grid,
      geometry: 'axisymmetric',
      gamma,
      flux: 'hllc',
      limiter: 'vanAlbada',
      reconstruction: 'sharedScaled',
      timeIntegrator: 'ssprk2',
      cfl: 0.8,
      timeStepping: 'local',
      boundaries: {
        // The axis ahead of the nose is a line of symmetry.
        iMin: { kind: 'wall' },
        iMax: { kind: 'outflow' },
        jMin: { kind: 'wall' },
        jMax: { kind: 'inflow', state: freeStream },
      },
    };
    solver = new Euler2D(config);
    solver.setInitialCondition(() => freeStream);
    const initial = solver.densityResidualNorm();
    solver.iterate(6000);
    residual = solver.densityResidualNorm() / initial;
  }, 300_000);

  it('converges to round-off', () => {
    expect(residual).toBeLessThan(1e-13);
  });

  it('keeps the bow shock inside the outer boundary, with free stream along it', () => {
    expect(outerDeviation(config, freeStream, (i, j) => solver.primitive(i, j))).toBeLessThan(1e-5);
  });

  it('stands the shock off by about the Billig correlation (a regression bound)', () => {
    // Where the pressure on the stagnation line crosses halfway through the
    // shock; 0.1078 when written, Billig 0.1025.
    const { ni, nj, centroidX } = solver.metrics;
    const halfway = 0.5 * (1 + normalShock(mach, gamma).pressureRatio);
    let standoff = Number.NaN;
    for (let j = 0; j + 1 < nj; j++) {
      const p0 = solver.primitive(0, j).p;
      const p1 = solver.primitive(0, j + 1).p;
      if (p0 > halfway && p1 <= halfway) {
        const x0 = centroidX[j * ni]!;
        const x1 = centroidX[(j + 1) * ni]!;
        standoff = -(x0 + ((x1 - x0) * (p0 - halfway)) / (p0 - p1));
        break;
      }
    }
    expect(Math.abs(standoff / billigStandoff(mach, 0.5) - 1)).toBeLessThan(0.1);
  });
});
