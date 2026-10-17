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
  }, 30_000);

  it.each(['shared', 'sharedScaled'] as const)(
    'converges at second order with the %s reconstruction',
    (reconstruction) => {
      // Limiting fades as the grid resolves the vortex, so the measured order
      // exceeds two: when written, L1 errors were 2.6e-3, 4.7e-4 and 9.0e-5 on
      // 32, 64 and 128 cells (orders 2.45 and 2.39), against 7.7e-5 unlimited
      // on 128 cells.
      const shared = { limiter: 'vanAlbada', reconstruction } as const;
      const unlimited = { limiter: 'unlimitedCentral', reconstruction: 'perVariable' } as const;
      const coarse = vortexError(32, 1, shared);
      const fine = vortexError(64, 1, shared);
      expect(Math.log2(coarse / fine)).toBeGreaterThan(1.9);
      // Limiting costs little: 1.47 times the unlimited error on 64 cells.
      expect(fine).toBeLessThan(1.6 * vortexError(64, 1, unlimited));
    },
    30_000,
  );
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
  it.each(['shared', 'sharedScaled'] as const)(
    'rejects %s reconstruction with a limiter it would ignore',
    (reconstruction) => {
      expect(() => solver(rectangularGrid(4, 4, 0, 1, 0, 1), { reconstruction })).toThrow(
        /requires the 'vanAlbada' limiter/,
      );
    },
  );
});

describe('Euler2D: boundary fluxes', () => {
  const SIDES = ['iMin', 'iMax', 'jMin', 'jMax'] as const;

  it.each([
    ['shared', 'vanAlbada'],
    ['sharedScaled', 'vanAlbada'],
    ['perVariable', 'vanLeer'],
    ['perVariable', 'minmod'],
  ] as const)(
    'carry no mass through a wall at an angle, in moving flow (%s, %s)',
    (reconstruction, limiter) => {
      // A lower wall sloping at 20 deg and a flow varying in every variable.
      // Componentwise limiting is not invariant under the reflection about
      // such a wall; the outside state is therefore mirrored from the inside
      // one at the face itself. Measured before that change: 4.4e-3 with
      // the per-variable reconstruction (van Leer).
      const slope = Math.tan((20 * Math.PI) / 180);
      const grid = gridFromFunction(16, 12, (i, j) => {
        const x = i / 16;
        return [x, x * slope + ((1 + 0.2 * x) * j) / 12];
      });
      for (const geometry of ['planar', 'axisymmetric'] as const) {
        const s = solver(grid, {
          geometry,
          reconstruction,
          limiter,
          boundaries: { ...boundaries({ kind: 'outflow' }), jMin: { kind: 'wall' } },
        });
        s.setInitialCondition((x, y) => ({
          rho: 1 + 0.3 * Math.sin(3 * x + 2 * y),
          u: 2 + 0.4 * Math.cos(2 * x - y),
          v: 0.5 + 0.3 * Math.sin(x + 3 * y),
          p: 1 + 0.2 * Math.cos(4 * x + y),
        }));
        for (const f of s.boundaryFluxes('jMin')) expect(Math.abs(f.flux[0])).toBeLessThan(1e-14);
      }
    },
  );

  it('gives outward normals, face areas and midpoints, and wall pressure, on a distorted box', () => {
    // Gas at rest in a closed box: the only flux through each wall is the
    // pressure, p n per unit area, and the forces on the walls balance.
    const grid = distortedGrid(12, 10, 0, 2, 0, 1.5);
    const s = solver(grid, { boundaries: boundaries({ kind: 'wall' }) });
    const p = 0.8;
    s.setInitialCondition(() => ({ rho: 1.1, u: 0, v: 0, p }));
    let perimeter = 0;
    let forceX = 0;
    let forceY = 0;
    for (const side of SIDES) {
      for (const f of s.boundaryFluxes(side)) {
        // The box is the rectangle [0, 2] x [0, 1.5]; its edges are straight.
        const onEdge = Math.min(
          Math.abs(f.x),
          Math.abs(f.x - 2),
          Math.abs(f.y),
          Math.abs(f.y - 1.5),
        );
        expect(onEdge).toBeLessThan(1e-12);
        expect(f.nx * (f.x - 1) + f.ny * (f.y - 0.75)).toBeGreaterThan(0);
        expect(Math.abs(f.flux[0])).toBe(0); // -0 and +0 are both exact
        expect(f.flux[1]).toBeCloseTo(p * f.nx, 12);
        expect(f.flux[2]).toBeCloseTo(p * f.ny, 12);
        perimeter += f.area;
        forceX += f.flux[1] * f.area;
        forceY += f.flux[2] * f.area;
      }
    }
    expect(perimeter).toBeCloseTo(7, 12);
    expect(Math.abs(forceX)).toBeLessThan(1e-12);
    expect(Math.abs(forceY)).toBeLessThan(1e-12);
  });

  it('gives the area per radian in axisymmetric geometry', () => {
    // An annular duct between radii 0.5 and 1.5: the outer wall's area per
    // radian is its length times its radius.
    const s = solver(rectangularGrid(8, 4, 0, 2, 0.5, 1.5), {
      geometry: 'axisymmetric',
      boundaries: boundaries({ kind: 'wall' }),
    });
    s.setInitialCondition(() => ({ rho: 1, u: 0, v: 0, p: 1 }));
    const outer = s.boundaryFluxes('jMax');
    expect(outer.reduce((sum, f) => sum + f.area, 0)).toBeCloseTo(2 * 1.5, 12);
    for (const f of outer) expect(f.ny).toBe(1);
  });
});

describe('Euler2D: per-face boundary states', () => {
  // A supersonic ramp-like box: inflow on the left and top, outflow right,
  // wall below; states along the top set per face.
  const grid = gridFromFunction(16, 8, (i, j) => [i / 16, (j / 8) * (0.5 + 0.02 * i)]);
  const free = { rho: 1, u: 2.5, v: 0.1, p: 0.8 };
  const config = (jMax: BoundaryCondition2D): Euler2DConfig => ({
    grid,
    geometry: 'planar',
    gamma,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.5,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'inflow', state: free },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax,
    },
  });

  it('with the same state on every face, reproduce the inflow boundary exactly', () => {
    const a = new Euler2D(config({ kind: 'inflow', state: free }));
    const b = new Euler2D(
      config({ kind: 'faceStates', states: Array.from({ length: 16 }, () => free) }),
    );
    for (const s of [a, b]) {
      s.setInitialCondition(() => free);
      s.iterate(200);
    }
    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 16; i++) expect(b.primitive(i, j)).toEqual(a.primitive(i, j));
    }
  });

  it('take a different state on each face, replaceable, and refuse a wrong count', () => {
    const states = Array.from({ length: 16 }, (_, i) => ({ ...free, p: 0.8 + 0.01 * i }));
    const s = new Euler2D(config({ kind: 'faceStates', states }));
    s.setInitialCondition(() => free);
    s.iterate(50);
    const before = s.primitive(10, 7).p;
    s.setFaceStates(
      'jMax',
      states.map((w) => ({ ...w, p: 2 * w.p })),
    );
    s.iterate(50);
    expect(s.primitive(10, 7).p).not.toBe(before);
    expect(() => {
      s.setFaceStates('jMax', states.slice(1));
    }).toThrow(/16 face states/);
    expect(() => {
      s.setFaceStates('iMin', states);
    }).toThrow(/does not take face states/);
  });

  it('take imposed face fluxes: the free-stream flux keeps a uniform flow uniform', () => {
    const states = Array.from({ length: 16 }, () => free);
    const s = new Euler2D({
      ...config({ kind: 'faceStates', states }),
      boundaries: {
        iMin: { kind: 'inflow', state: free },
        iMax: { kind: 'outflow' },
        jMin: { kind: 'inflow', state: free },
        jMax: { kind: 'faceStates', states },
      },
    });
    const metrics = s.metrics;
    const fluxes = new Float64Array(64);
    const energy = free.p / (gamma - 1) + 0.5 * free.rho * (free.u ** 2 + free.v ** 2);
    for (let i = 0; i < 16; i++) {
      const f = i + 8 * 16;
      const nx = metrics.jFaces.nx[f]!;
      const ny = metrics.jFaces.ny[f]!;
      const un = free.u * nx + free.v * ny;
      fluxes.set(
        [
          free.rho * un,
          free.rho * free.u * un + free.p * nx,
          free.rho * free.v * un + free.p * ny,
          un * (energy + free.p),
        ],
        4 * i,
      );
    }
    s.setFaceFluxes('jMax', fluxes);
    s.setInitialCondition(() => free);
    s.iterate(50);
    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 16; i++) {
        const w = s.primitive(i, j);
        expect(Math.abs(w.p - free.p)).toBeLessThan(1e-12);
        expect(Math.abs(w.v - free.v)).toBeLessThan(1e-12);
      }
    }
    expect(() => {
      s.setFaceFluxes('jMax', fluxes.subarray(4));
    }).toThrow(/64 flux values/);
    s.setFaceFluxes('jMax', null);
  });
});
