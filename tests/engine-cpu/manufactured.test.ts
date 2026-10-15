import { describe, expect, it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { computeMetrics, gridFromFunction, type Geometry } from '../../src/grid/structured';
import type { Reconstruction } from '../../src/scheme/reconstruction';
import {
  MANUFACTURED_INFLOW,
  manufacturedCellSources,
  manufacturedSource,
  manufacturedState,
} from '../../src/validation/manufactured';

/**
 * Code verification by a manufactured solution: smooth supersonic flow in
 * a channel (an annulus in axisymmetric geometry) between walls, on a
 * smoothly distorted grid, made exact by source terms. Second-order
 * convergence here verifies the fluxes, reconstruction, metrics, the
 * axisymmetric source and the wall condition together.
 *
 * Measured when written, L1 error of (rho, u, v, p) on 16, 32, 64 and 128
 * cells: orders 2.09, 2.04, 2.04 (shared) and 1.99, 2.02, 2.00
 * (per-variable), in both geometries, with residuals converged to 1e-12.
 */

const gamma = 1.4;

function channel(n: number) {
  return gridFromFunction(n, n, (i, j) => {
    const x = i / n;
    const y = 1 + j / n;
    const bump = 0.04 * Math.sin(Math.PI * x) * Math.sin(Math.PI * (y - 1));
    return [x + bump, y + bump];
  });
}

function solve(n: number, geometry: Geometry, reconstruction: Reconstruction) {
  const grid = channel(n);
  const wall = { kind: 'wall' } as const;
  const s = new Euler2D({
    grid,
    geometry,
    gamma,
    flux: 'hllc',
    limiter: reconstruction === 'shared' ? 'vanAlbada' : 'vanLeer',
    reconstruction,
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'inflow', state: MANUFACTURED_INFLOW(gamma) },
      iMax: { kind: 'outflow' },
      jMin: wall,
      jMax: wall,
    },
    source: manufacturedCellSources(grid, geometry, gamma),
  });
  s.setInitialCondition((x, y) => manufacturedState(x, y, gamma));
  const initialResidual = s.densityResidualNorm();
  s.iterate(40 * n);
  let error = 0;
  let volume = 0;
  for (let c = 0; c < n * n; c++) {
    const exact = manufacturedState(s.metrics.centroidX[c]!, s.metrics.centroidY[c]!, gamma);
    const w = s.primitive(c % n, Math.floor(c / n));
    const local =
      Math.abs(w.rho - exact.rho) +
      Math.abs(w.u - exact.u) +
      Math.abs(w.v - exact.v) +
      Math.abs(w.p - exact.p);
    error += local * s.metrics.volume[c]!;
    volume += s.metrics.volume[c]!;
  }
  return { error: error / volume, residual: s.densityResidualNorm() / initialResidual };
}

describe('manufactured solution', () => {
  it.each(['planar', 'axisymmetric'] as const)(
    'cell sources integrate the pointwise source (%s)',
    (geometry) => {
      // Face-integrated sources over cell volumes approach the pointwise
      // source at the centroids at second order.
      const deviation = (n: number) => {
        const grid = channel(n);
        const metrics = computeMetrics(grid, geometry);
        const cells = manufacturedCellSources(grid, geometry, gamma);
        let worst = 0;
        for (let c = 0; c < n * n; c++) {
          const point = manufacturedSource(
            metrics.centroidX[c]!,
            metrics.centroidY[c]!,
            gamma,
            geometry,
          );
          for (let k = 0; k < 4; k++) {
            worst = Math.max(worst, Math.abs(cells[4 * c + k]! / metrics.volume[c]! - point[k]!));
          }
        }
        return worst;
      };
      const coarse = deviation(16);
      const fine = deviation(32);
      expect(Math.log2(coarse / fine)).toBeGreaterThan(1.8);
    },
  );

  it.each([
    ['axisymmetric', 'shared'],
    ['planar', 'perVariable'],
  ] as const)(
    'the %s solver converges to it at second order (%s reconstruction)',
    (geometry, reconstruction) => {
      const coarse = solve(16, geometry, reconstruction);
      const fine = solve(32, geometry, reconstruction);
      const finer = solve(64, geometry, reconstruction);
      for (const run of [coarse, fine, finer]) expect(run.residual).toBeLessThan(1e-10);
      expect(Math.log2(coarse.error / fine.error)).toBeGreaterThan(1.9);
      expect(Math.log2(fine.error / finer.error)).toBeGreaterThan(1.9);
    },
    60_000,
  );
});
