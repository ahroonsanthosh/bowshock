import { describe, expect, it } from 'vitest';
import { forebodyPressureDrag } from '../../src/analysis/forces';
import { freeStreamAt } from '../../src/analysis/verified-drag';
import { Euler2D, farFieldState, splitEigensystem } from '../../src/engine-cpu/euler2d';
import { bodyGrid } from '../../src/grid/body-grid';
import { gridFromFunction } from '../../src/grid/structured';
import type { Primitive2D } from '../../src/scheme/flux';
import { AndersonMixing } from '../../src/solver/anderson';

const gamma = 1.4;
const deg = Math.PI / 180;

/** Physical flux along (nx, ny) of conserved q. */
function flux(q: readonly number[], nx: number, ny: number): number[] {
  const [rho, mx, my, e] = q as [number, number, number, number];
  const p = (gamma - 1) * (e - (0.5 * (mx * mx + my * my)) / rho);
  const un = (mx * nx + my * ny) / rho;
  return [rho * un, mx * un + p * nx, my * un + p * ny, (e + p) * un];
}

describe('far-field boundary state (Riemann invariants)', () => {
  const free: Primitive2D = { rho: 1, u: 1.05 * Math.sqrt(gamma), v: 0, p: 1 };
  const invariants = (w: Primitive2D, nx: number, ny: number) => {
    const a = Math.sqrt((gamma * w.p) / w.rho);
    const un = w.u * nx + w.v * ny;
    return { plus: un + (2 * a) / (gamma - 1), minus: un - (2 * a) / (gamma - 1) };
  };

  it('gives the free stream back for a free stream inside, at any face', () => {
    for (const [nx, ny] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0.6, -0.8],
    ] as const) {
      const w = farFieldState(free, free, nx, ny, gamma);
      expect(w.rho).toBeCloseTo(1, 14);
      expect(w.u).toBeCloseTo(free.u, 14);
      expect(w.v).toBeCloseTo(0, 14);
      expect(w.p).toBeCloseTo(1, 14);
    }
  });

  it('takes the free stream at a supersonic inflow and the inside at a supersonic outflow', () => {
    // Supersonic inside too (Mach 1.24): every wave comes in through an upstream face.
    const inside: Primitive2D = { rho: 1.1, u: 1.5, v: 0.1, p: 1.15 };
    const back = farFieldState(inside, free, -1, 0, gamma);
    expect(back.rho).toBeCloseTo(free.rho, 13);
    expect(back.u).toBeCloseTo(free.u, 13);
    expect(back.v).toBeCloseTo(free.v, 13);
    expect(back.p).toBeCloseTo(free.p, 13);
    const fast: Primitive2D = { rho: 0.9, u: 1.5, v: 0.05, p: 0.85 };
    const out = farFieldState(fast, free, 1, 0, gamma);
    expect(out.rho).toBeCloseTo(fast.rho, 13);
    expect(out.u).toBeCloseTo(fast.u, 13);
    expect(out.v).toBeCloseTo(fast.v, 13);
    expect(out.p).toBeCloseTo(fast.p, 13);
  });

  it('at a subsonic outflow keeps R+, entropy and tangential velocity from inside, R- from outside', () => {
    const inside: Primitive2D = { rho: 1.05, u: 0.9, v: 0.2, p: 1.08 };
    const nx = 0.6;
    const ny = 0.8;
    const out = farFieldState(inside, free, nx, ny, gamma);
    const a = invariants(out, nx, ny);
    expect(a.plus).toBeCloseTo(invariants(inside, nx, ny).plus, 12);
    expect(a.minus).toBeCloseTo(invariants(free, nx, ny).minus, 12);
    expect(out.p / out.rho ** gamma).toBeCloseTo(inside.p / inside.rho ** gamma, 12);
    expect(-out.u * ny + out.v * nx).toBeCloseTo(-inside.u * ny + inside.v * nx, 12);
  });

  it('keeps a uniform flow uniform on a distorted grid, at Mach 0.8, 1 and 1.5', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 2 ** 32;
      return seed / 2 ** 32 - 0.5;
    };
    const grid = gridFromFunction(14, 10, (i, j) => {
      const interior = i > 0 && i < 14 && j > 0 && j < 10;
      return [i + (interior ? 0.5 * random() : 0), 1 + j + (interior ? 0.5 * random() : 0)];
    });
    for (const mach of [0.8, 1, 1.5]) {
      const w: Primitive2D = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
      const far = { kind: 'farField', state: w } as const;
      const s = new Euler2D({
        grid,
        geometry: 'axisymmetric',
        gamma,
        flux: 'hllc',
        limiter: 'vanAlbada',
        reconstruction: 'sharedScaled',
        timeIntegrator: 'ssprk2',
        cfl: 0.8,
        timeStepping: 'local',
        boundaries: { iMin: far, iMax: far, jMin: far, jMax: far },
      });
      s.setInitialCondition(() => w);
      s.iterateImplicit(20, 100);
      s.iterate(20);
      for (let j = 0; j < 10; j++) {
        for (let i = 0; i < 14; i++) {
          const c = s.primitive(i, j);
          expect(Math.abs(c.rho - 1)).toBeLessThan(1e-12);
          expect(Math.abs(c.p - 1)).toBeLessThan(1e-12);
          expect(Math.abs(c.u - w.u)).toBeLessThan(1e-12);
          expect(Math.abs(c.v)).toBeLessThan(1e-12);
        }
      }
    }
  });
});

describe('Steger-Warming split Jacobians (block LU-SGS)', () => {
  it('left eigenvectors invert the right ones, and A+ + A- is the flux Jacobian', () => {
    const states = [
      { rho: 1.3, u: 0.4, v: -0.2, p: 0.9 },
      { rho: 0.7, u: 1.6, v: 0.3, p: 1.1 },
      { rho: 1, u: 1.18, v: 0, p: 1 },
    ];
    const normals = [
      [1, 0],
      [0.6, 0.8],
      [-0.28, 0.96],
    ] as const;
    const minus = {
      lambda: new Float64Array(4),
      right: new Float64Array(16),
      left: new Float64Array(16),
    };
    const plus = {
      lambda: new Float64Array(4),
      right: new Float64Array(16),
      left: new Float64Array(16),
    };
    for (const w of states) {
      const a = Math.sqrt((gamma * w.p) / w.rho);
      const e = w.p / (gamma - 1) + 0.5 * w.rho * (w.u * w.u + w.v * w.v);
      const h = (e + w.p) / w.rho;
      const q = [w.rho, w.rho * w.u, w.rho * w.v, e];
      for (const [nx, ny] of normals) {
        splitEigensystem(
          w.u,
          w.v,
          a,
          h,
          nx,
          ny,
          gamma,
          1e-9,
          -1,
          minus.lambda,
          minus.right,
          minus.left,
        );
        splitEigensystem(
          w.u,
          w.v,
          a,
          h,
          nx,
          ny,
          gamma,
          1e-9,
          1,
          plus.lambda,
          plus.right,
          plus.left,
        );
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 4; col++) {
            let identity = 0;
            for (let k = 0; k < 4; k++)
              identity += minus.left[4 * row + k]! * minus.right[4 * k + col]!;
            expect(identity).toBeCloseTo(row === col ? 1 : 0, 12);
          }
        }
        for (let col = 0; col < 4; col++) {
          const step = 1e-6 * Math.max(1, Math.abs(q[col]!));
          const up = q.slice();
          const down = q.slice();
          up[col] = up[col]! + step;
          down[col] = down[col]! - step;
          const fu = flux(up, nx, ny);
          const fd = flux(down, nx, ny);
          for (let row = 0; row < 4; row++) {
            let split = 0;
            for (let k = 0; k < 4; k++) {
              split +=
                minus.right[4 * row + k]! *
                (minus.lambda[k]! + plus.lambda[k]!) *
                minus.left[4 * k + col]!;
            }
            expect(split).toBeCloseTo((fu[row]! - fd[row]!) / (2 * step), 6);
          }
        }
      }
    }
  });
});

describe('implicit steps reach the steady state of the explicit scheme', () => {
  // A 15 deg cone at Mach 2 on the coarsest captured-shock grid: the drag
  // after convergence to round-off, by LU-SGS (scalar and block) and with
  // Anderson acceleration, against the explicit scheme's.
  const body = {
    nose: {
      shape: { kind: 'conical' as const },
      length: 0.5 / Math.tan(15 * deg),
      baseRadius: 0.5,
    },
    cylinderLength: 1,
  };
  const mach = 2;
  const free = freeStreamAt(mach, gamma);
  const { grid } = bodyGrid(body, { nj: 12, mach, gamma });
  const make = () => {
    const s = new Euler2D({
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
        iMin: { kind: 'inflow', state: free.state },
        iMax: { kind: 'outflow' },
        jMin: { kind: 'wall' },
        jMax: { kind: 'farField', state: free.state },
      },
    });
    s.setInitialCondition(() => free.state);
    return s;
  };
  const drag = (s: Euler2D) => forebodyPressureDrag(s.boundaryFluxes('jMin'), free, 0.5);
  const explicit = make();
  explicit.iterate(6000);

  it('the explicit scheme has converged to round-off', () => {
    expect(explicit.densityResidualNorm()).toBeLessThan(1e-12);
  }, 120_000);

  it('scalar LU-SGS, from CFL 1 to 1000, gives the same drag within 1e-12', () => {
    const s = make();
    let cfl = 1;
    for (let n = 0; n < 600 && s.densityResidualNorm() > 1e-13; n++) {
      s.iterateImplicit(1, cfl);
      cfl = Math.min(1000, cfl * 1.2);
    }
    expect(s.densityResidualNorm()).toBeLessThan(1e-12);
    expect(Math.abs(drag(s) / drag(explicit) - 1)).toBeLessThan(1e-12);
  }, 120_000);

  it.each([
    ['Jacobi, 4 sweeps', { kind: 'jacobi', sweeps: 4 }],
    ['red-black, 2 sweeps', { kind: 'redBlack', sweeps: 2 }],
  ] as const)(
    'the data-parallel relaxation (%s) gives the same drag within 1e-12',
    (_, relaxation) => {
      const s = make();
      let cfl = 1;
      for (let n = 0; n < 3000 && s.densityResidualNorm() > 1e-13; n++) {
        s.iterateImplicit(1, cfl, 1.5, relaxation);
        cfl = Math.min(1000, cfl * 1.2);
      }
      expect(s.densityResidualNorm()).toBeLessThan(1e-12);
      expect(Math.abs(drag(s) / drag(explicit) - 1)).toBeLessThan(1e-12);
    },
    300_000,
  );

  it('block LU-SGS gives the same drag within 1e-12', () => {
    const s = make();
    let cfl = 1;
    for (let n = 0; n < 400 && s.densityResidualNorm() > 1e-13; n++) {
      s.iterateBlockImplicit(1, cfl);
      cfl = Math.min(1000, cfl * 1.2);
    }
    expect(s.densityResidualNorm()).toBeLessThan(1e-12);
    expect(Math.abs(drag(s) / drag(explicit) - 1)).toBeLessThan(1e-12);
  }, 120_000);

  it('Anderson-accelerated LU-SGS gives the same drag within 1e-12', () => {
    const s = make();
    s.iterateImplicit(30, 10);
    const n = 4 * grid.ni * grid.nj;
    const anderson = new AndersonMixing(n, 8);
    for (let k = 0; k < 600 && s.densityResidualNorm() > 1e-13; k++) {
      const x = s.conserved();
      const f = Float64Array.from(s.implicitCorrection(1000));
      s.setConserved(anderson.next(x, f));
    }
    expect(s.densityResidualNorm()).toBeLessThan(1e-12);
    expect(Math.abs(drag(s) / drag(explicit) - 1)).toBeLessThan(1e-12);
  }, 120_000);
});

describe('Anderson acceleration', () => {
  it('without history takes the plain step', () => {
    const a = new AndersonMixing(3, 4);
    const x = Float64Array.from([1, 2, 3]);
    const f = Float64Array.from([0.5, -1, 0.25]);
    expect(Array.from(a.next(x, f))).toEqual([1.5, 1, 3.25]);
  });

  it('solves a slowly converging linear fixed-point iteration far faster than the plain steps', () => {
    // x <- x + f(x), f(x) = (b - A x) / 4 with A = diag(1, ..., 1/400):
    // the plain iteration converges as 1 - 1/1600 per step.
    const n = 40;
    const diag = Array.from({ length: n }, (_, k) => 1 / (1 + (399 * k) / (n - 1)));
    const b = Array.from({ length: n }, (_, k) => Math.sin(k + 1));
    const correction = (x: Float64Array) =>
      Float64Array.from(x, (xk, k) => (b[k]! - diag[k]! * xk) / 4);
    const error = (x: Float64Array) =>
      Math.max(...Array.from(x, (xk, k) => Math.abs(xk - b[k]! / diag[k]!)));
    let plain: Float64Array = new Float64Array(n);
    let accelerated: Float64Array = new Float64Array(n);
    const anderson = new AndersonMixing(n, 10);
    for (let k = 0; k < 200; k++) {
      const f = correction(plain);
      plain = Float64Array.from(plain, (xk, m) => xk + f[m]!);
      accelerated = anderson.next(accelerated, correction(accelerated));
    }
    // Measured when written: 1.5e-6 of the starting error, the plain steps 0.88.
    expect(error(accelerated)).toBeLessThan(1e-5 * error(new Float64Array(n)));
    expect(error(plain)).toBeGreaterThan(0.5 * error(new Float64Array(n)));
  });
});
