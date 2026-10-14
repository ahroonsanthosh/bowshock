import { describe, expect, it } from 'vitest';
import {
  Euler2D,
  type BoundaryCondition2D,
  type Euler2DConfig,
  type Side,
} from '../../src/engine-cpu/euler2d';
import { gridFromFunction, type StructuredGrid } from '../../src/grid/structured';
import { isentropicVortex } from '../../src/validation/isentropic-vortex';

const gamma = 1.4;

function boundaries(bc: BoundaryCondition2D): Record<Side, BoundaryCondition2D> {
  return { iMin: bc, iMax: bc, jMin: bc, jMax: bc };
}

function solver(grid: StructuredGrid, overrides: Partial<Euler2DConfig>): Euler2D {
  return new Euler2D({
    grid,
    geometry: 'planar',
    gamma,
    flux: 'hllc',
    limiter: 'vanLeer',
    timeIntegrator: 'ssprk2',
    cfl: 0.5,
    timeStepping: 'global',
    boundaries: boundaries({ kind: 'outflow' }),
    ...overrides,
  });
}

/** Random interior node displacements of up to 30% of the spacing (deterministic). */
function distortedGrid(ni: number, nj: number, x0: number, x1: number, y0: number, y1: number) {
  let state = 2024;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32 - 0.5;
  };
  return gridFromFunction(ni, nj, (i, j) => {
    const interior = i > 0 && i < ni && j > 0 && j < nj;
    const di = interior ? 0.6 * random() : 0;
    const dj = interior ? 0.6 * random() : 0;
    return [x0 + ((x1 - x0) * (i + di)) / ni, y0 + ((y1 - y0) * (j + dj)) / nj];
  });
}

describe('Euler2D: uniform flow is preserved on distorted grids', () => {
  it.each([
    { geometry: 'planar', w: { rho: 1.2, u: 0.7, v: -0.4, p: 0.9 } },
    // A uniform radial velocity is not a solution in axisymmetric geometry,
    // so the axisymmetric case uses a uniform axial stream.
    { geometry: 'axisymmetric', w: { rho: 1.2, u: 0.7, v: 0, p: 0.9 } },
  ] as const)('$geometry geometry', ({ geometry, w }) => {
    const s = solver(distortedGrid(12, 10, 0, 2, 0.5, 1.5), {
      geometry,
      boundaries: boundaries({ kind: 'inflow', state: w }),
    });
    s.setInitialCondition(() => w);
    s.advanceTo(0.5);
    for (let j = 0; j < 10; j++) {
      for (let i = 0; i < 12; i++) {
        const c = s.primitive(i, j);
        expect(Math.abs(c.rho - w.rho)).toBeLessThan(1e-13);
        expect(Math.abs(c.u - w.u)).toBeLessThan(1e-13);
        expect(Math.abs(c.v - w.v)).toBeLessThan(1e-13);
        expect(Math.abs(c.p - w.p)).toBeLessThan(1e-13);
      }
    }
  });
});

describe('Euler2D: second-order accuracy on a curvilinear grid', () => {
  // The isentropic vortex crosses a periodic domain [0, 10]^2 whose grid is
  // distorted sinusoidally (the distortion vanishes on the boundaries, so
  // periodicity is kept).
  const L = 10;
  const vortex = { strength: 5, x0: 5, y0: 5, u0: 1, v0: 1, period: L };
  const wavyGrid = (n: number) =>
    gridFromFunction(n, n, (i, j) => {
      const xi = (L * i) / n;
      const eta = (L * j) / n;
      const bump = 0.4 * Math.sin((2 * Math.PI * xi) / L) * Math.sin((2 * Math.PI * eta) / L);
      return [xi + bump, eta + bump];
    });

  function vortexError(n: number, tEnd: number): number {
    const s = solver(wavyGrid(n), {
      limiter: 'unlimitedCentral',
      timeIntegrator: 'ssprk3',
      cfl: 0.4,
      boundaries: boundaries({ kind: 'periodic' }),
    });
    s.setInitialCondition((x, y) => isentropicVortex(vortex, x, y, 0, gamma));
    s.advanceTo(tEnd);
    let error = 0;
    let volume = 0;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const c = i + j * n;
        const exact = isentropicVortex(
          vortex,
          s.metrics.centroidX[c]!,
          s.metrics.centroidY[c]!,
          tEnd,
          gamma,
        );
        error += Math.abs(s.primitive(i, j).rho - exact.rho) * s.metrics.volume[c]!;
        volume += s.metrics.volume[c]!;
      }
    }
    return error / volume;
  }

  it('converges at second order with unlimited slopes', () => {
    const coarse = vortexError(32, 1);
    const fine = vortexError(64, 1);
    const order = Math.log2(coarse / fine);
    expect(order).toBeGreaterThan(1.9);
    expect(order).toBeLessThan(2.2);
  });
});
