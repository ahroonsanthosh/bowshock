import { describe, expect, it } from 'vitest';
import {
  Euler2D,
  type BoundaryCondition2D,
  type Euler2DConfig,
  type Side,
} from '../../src/engine-cpu/euler2d';
import { gridFromFunction, rectangularGrid, type StructuredGrid } from '../../src/grid/structured';
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
    reconstruction: 'perVariable',
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

  function vortexError(n: number, tEnd: number, scheme: Partial<Euler2DConfig>): number {
    const s = solver(wavyGrid(n), {
      ...scheme,
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
    const unlimited = { limiter: 'unlimitedCentral', reconstruction: 'perVariable' } as const;
    const order = Math.log2(vortexError(32, 1, unlimited) / vortexError(64, 1, unlimited));
    expect(order).toBeGreaterThan(1.9);
    expect(order).toBeLessThan(2.2);
  });

  it('converges above first order with the shared reconstruction', () => {
    // The price of steady convergence (see src/scheme/reconstruction.ts):
    // one smooth extremum in any variable flattens all of them, and the
    // vortex has extrema everywhere along its core. Recorded so that any
    // future improvement can be measured: 1.13 when written (32 to 64 cells).
    const shared = { limiter: 'vanAlbada', reconstruction: 'shared' } as const;
    const order = Math.log2(vortexError(32, 1, shared) / vortexError(64, 1, shared));
    expect(order).toBeGreaterThan(1.0);
    expect(order).toBeLessThan(2.2);
  });
});

describe('Euler2D: time step', () => {
  it('equals CFL * V / ((|u| + a) S_i + (|v| + a) S_j) on a stretched uniform grid', () => {
    // Cells 0.1 wide and 0.01 tall: the j direction limits the step.
    const w = { rho: 1.3, u: 0.4, v: -0.7, p: 0.9 };
    const s = solver(rectangularGrid(10, 100, 0, 1, 0, 1), { cfl: 0.8 });
    s.setInitialCondition(() => w);
    const a = Math.sqrt((gamma * w.p) / w.rho);
    const dx = 0.1;
    const dy = 0.01;
    const expected = (0.8 * dx * dy) / ((Math.abs(w.u) + a) * dy + (Math.abs(w.v) + a) * dx);
    expect(s.stableTimeStep()).toBeCloseTo(expected, 15);
  });

  it('stays stable on thin cells when the flow runs along the short direction', () => {
    // A density pulse carried in y across cells ten times thinner than
    // wide. Too large a step in that direction makes the run blow up.
    const pulse = (_x: number, y: number) => ({
      rho: 1 + 0.2 * Math.exp(-100 * (y - 0.5) ** 2),
      u: 0,
      v: 1,
      p: 1,
    });
    const s = solver(rectangularGrid(10, 100, 0, 1, 0, 1), {
      cfl: 0.9,
      boundaries: boundaries({ kind: 'periodic' }),
    });
    s.setInitialCondition(pulse);
    s.advanceTo(0.25);
    for (let j = 0; j < 100; j++) {
      const exact = pulse(0, ((j + 0.5) / 100 - 0.25 + 1) % 1);
      expect(Math.abs(s.primitive(5, j).rho - exact.rho)).toBeLessThan(1e-2);
    }
  });
});

describe('Euler2D: periodic boundaries', () => {
  it('give a translation-invariant solution across all four boundaries', () => {
    // The same vortex, centred mid-domain and centred on the domain's corner
    // (where it straddles all four periodic boundaries), on a uniform grid
    // whose spacing is exact in binary. The second solution must be the
    // first shifted by half the domain in each direction.
    const n = 40;
    const L = 10;
    const run = (x0: number, y0: number) => {
      const s = solver(rectangularGrid(n, n, 0, L, 0, L), {
        boundaries: boundaries({ kind: 'periodic' }),
      });
      const vortex = { strength: 5, x0, y0, u0: 1, v0: 0.5, period: L };
      s.setInitialCondition((x, y) => isentropicVortex(vortex, x, y, 0, gamma));
      s.advanceTo(1);
      return s;
    };
    const centred = run(5, 5);
    const corner = run(0, 0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = centred.primitive(i, j);
        const b = corner.primitive((i + n / 2) % n, (j + n / 2) % n);
        expect(Math.abs(a.rho - b.rho)).toBeLessThan(1e-12);
        expect(Math.abs(a.u - b.u)).toBeLessThan(1e-12);
        expect(Math.abs(a.v - b.v)).toBeLessThan(1e-12);
      }
    }
  });
});

describe('Euler2D: configuration', () => {
  it('rejects shared reconstruction with a limiter it would ignore', () => {
    expect(() => solver(rectangularGrid(4, 4, 0, 1, 0, 1), { reconstruction: 'shared' })).toThrow(
      /requires the 'vanAlbada' limiter/,
    );
  });
});
