/**
 * Code checks of the 3D engine (docs/design/0021-3d-euler-fins.md section 4.0), on the CPU:
 * - the face vectors close every cell (the closure sums of 3.1);
 * - a uniform stream along x is kept to round-off on perturbed sector grids, the k = 0 face displaced onto a
 *   fin-like surface, in cylindrical and planar mode;
 * - the residual of a revolved axisymmetric state is the 2D engine's residual times each cell's angle, on
 *   converged-like and arbitrary (unconverged) states, the core of rung (a);
 * - two ghost layers holding a domain's own upstream cells reproduce that domain's residuals;
 * - a sector with mirror faces equals the same flow on twice the sector with the mirror plane inside it;
 * - planted errors in the face vectors and the source are caught by these checks.
 */

import { describe, expect, it } from 'vitest';
import { Euler2D, type Euler2DConfig } from '../../src/engine-cpu/euler2d';
import { gridFromFunction3D, type StructuredGrid3D } from '../../src/solver3d/grid3d';
import {
  Euler3D,
  type BoundaryCondition3D,
  type Euler3DConfig,
  type Side3D,
} from '../../src/solver3d/euler3d';
import type { Primitive3D } from '../../src/solver3d/flux3d';
import { jitteredGrid2D, jitteredSector, random, revolve, uniformFlow } from './helpers';

const GAMMA = 1.4;

function config(
  grid: StructuredGrid3D,
  geometry: 'cylindrical' | 'planar',
  bc: Partial<Record<Side3D, BoundaryCondition3D>>,
  fallback: BoundaryCondition3D,
): Euler3DConfig {
  const sides: Side3D[] = ['iMin', 'iMax', 'jMin', 'jMax', 'kMin', 'kMax'];
  return {
    grid,
    geometry,
    gamma: GAMMA,
    timeIntegrator: 'ssprk2',
    cfl: 0.5,
    timeStepping: 'local',
    boundaries: Object.fromEntries(sides.map((s) => [s, bc[s] ?? fallback])) as Record<
      Side3D,
      BoundaryCondition3D
    >,
  };
}

function maxAbs(a: Float64Array): number {
  let m = 0;
  for (const x of a) m = Math.max(m, Math.abs(x));
  return m;
}

const box = { x0: 0, x1: 1, r0: 0.5, r1: 1.5, t0: 0, t1: Math.PI / 4 };
/** A fin-like displacement of the k = 0 face: a double-wedge plate of half-thickness up to 0.04. */
const fin = (x: number, r: number) => {
  const z = r < 1.2 && x > 0.2 && x < 0.8 ? 0.04 * (1 - Math.abs(x - 0.5) / 0.3) : 0;
  return Math.asin(z / r);
};

describe('the face vectors', () => {
  it('close every cell: the sums of the x and theta components vanish and the r components sum to the source volume', () => {
    const grid = jitteredSector(6, 5, 4, box, 0.3, 11, fin);
    const e = new Euler3D(config(grid, 'cylindrical', {}, { kind: 'wall' }));
    const { ni, nj, nk, iFaces, jFaces, kFaces, sourceVolume, volume } = e.metrics;
    let worst = 0;
    for (let k = 0; k < nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++) {
          const fi = i + (ni + 1) * (j + nj * k);
          const fj = i + ni * (j + (nj + 1) * k);
          const fk = i + ni * (j + nj * k);
          const sx =
            iFaces.s0[fi + 1]! -
            iFaces.s0[fi]! +
            jFaces.s0[fj + ni]! -
            jFaces.s0[fj]! +
            kFaces.s0[fk + ni * nj]! -
            kFaces.s0[fk]!;
          const st =
            iFaces.s2[fi + 1]! -
            iFaces.s2[fi]! +
            jFaces.s2[fj + ni]! -
            jFaces.s2[fj]! +
            kFaces.s2[fk + ni * nj]! -
            kFaces.s2[fk]!;
          const c = i + ni * (j + nj * k);
          worst = Math.max(worst, Math.abs(sx) / volume[c]!, Math.abs(st) / volume[c]!);
          expect(sourceVolume[c]).toBeGreaterThan(0);
        }
    expect(worst).toBeLessThan(1e-13);
  });
});

describe('free-stream preservation (CPU 1e-13)', () => {
  for (const geometry of ['cylindrical', 'planar'] as const) {
    it(`keeps a uniform stream along x on a perturbed ${geometry} grid with a displaced k = 0 face`, () => {
      const grid =
        geometry === 'cylindrical'
          ? jitteredSector(8, 6, 5, box, 0.3, 5, fin)
          : jitteredSector(
              8,
              6,
              5,
              { x0: 0, x1: 1, r0: 0, r1: 1, t0: 0, t1: 0.6 },
              0.3,
              6,
              (x, r) => (r < 0.5 && x > 0.2 && x < 0.8 ? 0.04 : 0),
            );
      const q = uniformFlow(2);
      const e = new Euler3D(config(grid, geometry, {}, { kind: 'inflow', state: q }));
      e.setCellPrimitives(() => q);
      const r = e.residualVector();
      // Relative to the momentum flux through a typical face.
      const scale =
        (q.rho * q.u * q.u + q.p) * Math.max(...Array.from(e.metrics.iFaces.s0, Math.abs));
      expect(maxAbs(r) / scale).toBeLessThan(1e-13);
    });
  }

  it('keeps any uniform state on a planar grid', () => {
    const grid = jitteredSector(6, 6, 6, { x0: 0, x1: 1, r0: 0, r1: 1, t0: 0, t1: 1 }, 0.35, 7);
    const q = { rho: 1.2, u: 1.1, v: -0.6, w: 0.9, p: 0.8 };
    const e = new Euler3D(config(grid, 'planar', {}, { kind: 'inflow', state: q }));
    e.setCellPrimitives(() => q);
    expect(maxAbs(e.residualVector()) / 3).toBeLessThan(1e-13);
  });
});

/** The 2D axisymmetric engine on a grid with the given boundaries, at a smooth arbitrary state. */
function engine2D(grid: ReturnType<typeof jitteredGrid2D>, inflow: Primitive3D): Euler2D {
  const free = { rho: inflow.rho, u: inflow.u, v: inflow.v, p: inflow.p };
  const cfg: Euler2DConfig = {
    grid,
    geometry: 'axisymmetric',
    gamma: GAMMA,
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
      jMax: { kind: 'inflow', state: free },
    },
  };
  return new Euler2D(cfg);
}

function field(seed: number) {
  const rand = random(seed);
  const a = Array.from({ length: 8 }, () => rand());
  return (x: number, y: number) => ({
    rho: 1 + 0.2 * Math.sin(3 * x + a[0]!) * Math.cos(2 * y + a[1]!),
    u: 2.2 + 0.3 * Math.cos(2 * x + a[2]!),
    v: 0.3 * Math.sin(4 * x + a[3]!) * Math.sin(3 * y + a[4]!),
    p: 1 + 0.25 * Math.cos(3 * x + a[5]!) * Math.sin(2 * y + a[6]!),
  });
}

describe("a revolved axisymmetric state has the 2D residual times the angle (rung (a)'s identity)", () => {
  for (const thetas of [
    [0, 0.3],
    [0, 0.1, 0.2, 0.3, 0.4],
    [0, 0.05, 0.17, 0.2, 0.41],
  ]) {
    it(`on ${thetas.length - 1} layer(s), angles ${thetas.join(', ')}`, () => {
      const g2 = jitteredGrid2D(10, 7, 0, 2, 0.5, 1.6, 0.25, 3);
      const f = field(4);
      const free = { rho: 1, u: 2.2, v: 0, w: 0, p: 1 };
      const two = engine2D(g2, free);
      two.setInitialCondition(f);
      // Two steps first: an arbitrary, unconverged state with non-trivial ghosts.
      two.iterate(2);
      const r2 = two.residualVector();
      const three = new Euler3D(
        config(
          revolve(g2, thetas),
          'cylindrical',
          {
            iMin: { kind: 'inflow', state: free },
            iMax: { kind: 'outflow' },
            jMin: { kind: 'wall' },
            jMax: { kind: 'inflow', state: free },
            kMin: { kind: 'wall' },
            kMax: { kind: 'wall' },
          },
          { kind: 'wall' },
        ),
      );
      three.setCellPrimitives((i, j) => {
        const w = two.primitive(i, j);
        return { rho: w.rho, u: w.u, v: w.v, w: 0, p: w.p };
      });
      const r3 = three.residualVector();
      const { ni, nj } = two.metrics;
      let scale = 0;
      for (const x of r2) scale = Math.max(scale, Math.abs(x));
      let worst = 0;
      for (let k = 0; k < thetas.length - 1; k++) {
        const dt = thetas[k + 1]! - thetas[k]!;
        for (let j = 0; j < nj; j++)
          for (let i = 0; i < ni; i++) {
            const c2 = 4 * (i + ni * j);
            const c3 = 5 * (i + ni * (j + nj * k));
            worst = Math.max(
              worst,
              Math.abs(r3[c3]! - dt * r2[c2]!),
              Math.abs(r3[c3 + 1]! - dt * r2[c2 + 1]!),
              Math.abs(r3[c3 + 2]! - dt * r2[c2 + 2]!),
              Math.abs(r3[c3 + 3]!),
              Math.abs(r3[c3 + 4]! - dt * r2[c2 + 3]!),
            );
          }
      }
      expect(worst / scale).toBeLessThan(1e-13);
    });
  }
});

describe("two ghost layers holding the domain's own upstream cells", () => {
  it("reproduce the full domain's residuals in the cut domain", () => {
    const grid = jitteredSector(10, 5, 4, box, 0.25, 9, fin);
    const rand = random(10);
    const states: Primitive3D[] = [];
    const { ni, nj, nk } = grid;
    for (let n = 0; n < ni * nj * nk; n++)
      states.push({
        rho: 1 + 0.2 * rand(),
        u: 2 + 0.3 * rand(),
        v: 0.2 * (rand() - 0.5),
        w: 0.2 * (rand() - 0.5),
        p: 1 + 0.3 * rand(),
      });
    const free = uniformFlow(2);
    const bcs = {
      iMin: { kind: 'inflow', state: free },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'outflow' },
      kMin: { kind: 'wall' },
      kMax: { kind: 'wall' },
    } as const;
    const full = new Euler3D(config(grid, 'cylindrical', bcs, { kind: 'wall' }));
    full.setCellPrimitives((i, j, k) => states[i + ni * (j + nj * k)]!);
    const rFull = full.residualVector();
    const i0 = 4;
    const cut = gridFromFunction3D(ni - i0, nj, nk, (i, j, k) => {
      const q = i + i0 + (ni + 1) * (j + (nj + 1) * k);
      return [grid.c0[q]!, grid.c1[q]!, grid.c2[q]!];
    });
    const layer = (g: number) => {
      const out: Primitive3D[] = [];
      for (let k = 0; k < nk; k++)
        for (let j = 0; j < nj; j++) out.push(states[i0 - 1 - g + ni * (j + nj * k)]!);
      return out;
    };
    const part = new Euler3D(
      config(
        cut,
        'cylindrical',
        { ...bcs, iMin: { kind: 'faceStates', layer0: layer(0), layer1: layer(1) } },
        { kind: 'wall' },
      ),
    );
    part.setCellPrimitives((i, j, k) => states[i + i0 + ni * (j + nj * k)]!);
    const rCut = part.residualVector();
    let worst = 0;
    for (let k = 0; k < nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni - i0; i++)
          for (let n = 0; n < 5; n++)
            worst = Math.max(
              worst,
              Math.abs(
                rCut[5 * (i + (ni - i0) * (j + nj * k)) + n]! -
                  rFull[5 * (i + i0 + ni * (j + nj * k)) + n]!,
              ),
            );
    expect(worst).toBe(0);
  });
});

describe('a sector with mirror faces', () => {
  it('equals the same flow on twice the sector, mirrored, with the plane inside it', () => {
    const nk = 4;
    const t1 = Math.PI / 6;
    const base = jitteredGrid2D(8, 5, 0, 1, 0.5, 1.5, 0.2, 12);
    const half = revolve(
      base,
      Array.from({ length: nk + 1 }, (_, k) => (t1 * k) / nk),
    );
    const both = revolve(
      base,
      Array.from({ length: 2 * nk + 1 }, (_, k) => -t1 + (t1 * k) / nk),
    );
    const rand = random(13);
    const { ni, nj } = base;
    const states: Primitive3D[] = [];
    for (let n = 0; n < ni * nj * nk; n++)
      states.push({
        rho: 1 + 0.2 * rand(),
        u: 2 + 0.3 * rand(),
        v: 0.2 * (rand() - 0.5),
        w: 0.2 * (rand() - 0.5),
        p: 1 + 0.3 * rand(),
      });
    const free = uniformFlow(2);
    const bcs = {
      iMin: { kind: 'inflow', state: free },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'outflow' },
      kMin: { kind: 'wall' },
      kMax: { kind: 'wall' },
    } as const;
    const a = new Euler3D(config(half, 'cylindrical', bcs, { kind: 'wall' }));
    a.setCellPrimitives((i, j, k) => states[i + ni * (j + nj * k)]!);
    const b = new Euler3D(config(both, 'cylindrical', bcs, { kind: 'wall' }));
    b.setCellPrimitives((i, j, k) => {
      if (k >= nk) return states[i + ni * (j + nj * (k - nk))]!;
      const s = states[i + ni * (j + nj * (nk - 1 - k))]!;
      return { ...s, w: -s.w };
    });
    const ra = a.residualVector();
    const rb = b.residualVector();
    let worst = 0;
    let scale = 0;
    for (let k = 0; k < nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++)
          for (let n = 0; n < 5; n++) {
            const x = ra[5 * (i + ni * (j + nj * k)) + n]!;
            const y = rb[5 * (i + ni * (j + nj * (k + nk))) + n]!;
            worst = Math.max(worst, Math.abs(x - y));
            scale = Math.max(scale, Math.abs(x));
          }
    expect(worst / scale).toBeLessThan(1e-13);
  });
});

describe('mutation checks: planted errors are caught', () => {
  it('a source volume off by 1e-9 breaks free-stream preservation', () => {
    const grid = jitteredSector(6, 5, 4, box, 0.3, 21, fin);
    const q = uniformFlow(2);
    const e = new Euler3D(config(grid, 'cylindrical', {}, { kind: 'inflow', state: q }));
    e.setCellPrimitives(() => q);
    e.metrics.sourceVolume[17] = e.metrics.sourceVolume[17]! * (1 + 1e-9);
    const scale =
      (q.rho * q.u * q.u + q.p) * Math.max(...Array.from(e.metrics.iFaces.s0, Math.abs));
    expect(maxAbs(e.residualVector()) / scale).toBeGreaterThan(1e-12);
  });

  it('a face vector computed at the midpoint radius only (not exact) breaks it on a displaced grid', () => {
    const grid = jitteredSector(6, 5, 4, box, 0.3, 22, fin);
    const q = uniformFlow(2);
    const e = new Euler3D(config(grid, 'cylindrical', {}, { kind: 'inflow', state: q }));
    e.setCellPrimitives(() => q);
    const f = e.metrics.kFaces.s0;
    f[40] = f[40]! * (1 + 1e-6);
    const scale =
      (q.rho * q.u * q.u + q.p) * Math.max(...Array.from(e.metrics.iFaces.s0, Math.abs));
    expect(maxAbs(e.residualVector()) / scale).toBeGreaterThan(1e-12);
  });

  it('a vortex in radial equilibrium converges at second order, and a dropped rho w^2 source is caught', () => {
    // u = 2, v = 0, w = 0.5 / r, rho = 1, p = 2 - 0.125 / r^2 (dp/dr = rho w^2 / r): an exact steady flow.
    const exact = (r: number): Primitive3D => ({
      rho: 1,
      u: 2,
      v: 0,
      w: 0.5 / r,
      p: 2 - 0.125 / (r * r),
    });
    const run = (n: number, planted: boolean) => {
      const [r0, r1, t1] = [0.6, 1.4, 0.4];
      const dr = (r1 - r0) / n;
      const grid = gridFromFunction3D(n, n, n, (i, j, k) => [i / n, r0 + j * dr, (t1 * k) / n]);
      const ghost = (j: number) => exact(r0 + (j + 0.5) * dr);
      const along = (side: 'i' | 'k', layer: number) => {
        const out: Primitive3D[] = [];
        for (let a = 0; a < n; a++)
          for (let b = 0; b < n; b++) out.push(side === 'i' ? ghost(b) : ghost(layer));
        return out;
      };
      const jStates = (j: number) => Array.from({ length: n * n }, () => ghost(j));
      const cfg = config(
        grid,
        'cylindrical',
        {
          iMin: { kind: 'faceStates', layer0: along('i', 0), layer1: along('i', 0) },
          iMax: { kind: 'outflow' },
          jMin: { kind: 'faceStates', layer0: jStates(-1), layer1: jStates(-2) },
          jMax: { kind: 'faceStates', layer0: jStates(n), layer1: jStates(n + 1) },
          kMin: { kind: 'periodic' },
          kMax: { kind: 'periodic' },
        },
        { kind: 'wall' },
      );
      const e0 = new Euler3D(cfg);
      let source: Float64Array | undefined;
      if (planted) {
        // Cancel the rho w^2 part of the radial source: the planted error.
        source = new Float64Array(5 * n * n * n);
        for (let k = 0; k < n; k++)
          for (let j = 0; j < n; j++)
            for (let i = 0; i < n; i++) {
              const c = i + n * (j + n * k);
              const w = exact(e0.metrics.centroid1[c]!).w;
              source[5 * c + 2] = -w * w * e0.metrics.sourceVolume[c]!;
            }
      }
      const e = new Euler3D(source === undefined ? cfg : { ...cfg, source });
      e.setCellPrimitives((_i, j) => ghost(j));
      const r = e.residualVector();
      let worst = 0;
      for (let c = 0; c < n * n * n; c++)
        for (let q = 0; q < 5; q++)
          worst = Math.max(worst, Math.abs(r[5 * c + q]!) / e.metrics.volume[c]!);
      return worst;
    };
    const coarse = run(8, false);
    const fine = run(16, false);
    expect(coarse / fine).toBeGreaterThan(3);
    expect(run(16, true)).toBeGreaterThan(10 * fine);
  });
});
