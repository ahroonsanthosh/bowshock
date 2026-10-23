/**
 * A manufactured solution in cylindrical coordinates (docs/design/0021-3d-euler-fins.md 4.0): smooth fields
 * with w not zero and theta dependence, on sector grids whose k = 0 face is displaced onto a fin-like surface,
 * the source integrated face by face (0003's construction) so that the exact field is the discrete scheme's
 * steady state up to its truncation error. Pass: the L1 error of the converged solution falls at an observed
 * order of 1.8 or more over four grids.
 */

import { describe, expect, it } from 'vitest';
import { gridFromFunction3D, type StructuredGrid3D } from '../../src/solver3d/grid3d';
import { Euler3D, type Side3D } from '../../src/solver3d/euler3d';
import { totalEnergy3D, type Primitive3D } from '../../src/solver3d/flux3d';

const GAMMA = 1.4;
const T1 = 0.5;

function exact(x: number, r: number, t: number): Primitive3D {
  return {
    rho: 1 + 0.1 * Math.sin(2 * x + 0.3) * Math.cos(1.5 * r) * Math.cos(3 * t),
    u: 2.6 + 0.15 * Math.cos(1.7 * x) * Math.sin(r + 0.2),
    v: 0.12 * Math.sin(1.3 * x + 0.5) * Math.cos(2 * t),
    w: 0.1 * Math.cos(x) * Math.sin(1.4 * r) + 0.05 * Math.sin(2 * t),
    p: 1 + 0.12 * Math.cos(1.6 * x) * Math.sin(1.2 * r + 0.4) * Math.cos(2.5 * t),
  };
}

/** Physical flux of the exact field through the r-weighted area element (a, b, c) in the local basis. */
function fluxThrough(q: Primitive3D, a: number, b: number, c: number, out: number[]): void {
  const vn = q.u * a + q.v * b + q.w * c;
  const m = q.rho * vn;
  out[0]! += m;
  out[1]! += m * q.u + q.p * a;
  out[2]! += m * q.v + q.p * b;
  out[3]! += m * q.w + q.p * c;
  out[4]! += vn * (totalEnergy3D(q, GAMMA) + q.p);
}

const GP = [
  [0.5 - Math.sqrt(0.15), 5 / 18],
  [0.5, 8 / 18],
  [0.5 + Math.sqrt(0.15), 5 / 18],
] as const;

type V3 = [number, number, number];

/** The integral of the exact flux over a bilinear face (3 x 3 Gauss points), [5]. */
function faceIntegral(a: V3, b: V3, c: V3, d: V3, out: number[]): void {
  for (const [s, ws] of GP)
    for (const [t, wt] of GP) {
      const P: V3 = [0, 0, 0];
      const xs: V3 = [0, 0, 0];
      const xt: V3 = [0, 0, 0];
      for (let q = 0; q < 3; q++) {
        P[q] =
          (1 - s) * (1 - t) * a[q]! + s * (1 - t) * b[q]! + s * t * c[q]! + (1 - s) * t * d[q]!;
        xs[q] = (1 - t) * (b[q]! - a[q]!) + t * (c[q]! - d[q]!);
        xt[q] = (1 - s) * (d[q]! - a[q]!) + s * (c[q]! - b[q]!);
      }
      const n0 = xs[1] * xt[2] - xs[2] * xt[1];
      const n1 = xs[2] * xt[0] - xs[0] * xt[2];
      const n2 = xs[0] * xt[1] - xs[1] * xt[0];
      const w = ws * wt;
      fluxThrough(exact(P[0], P[1], P[2]), w * P[1] * n0, w * P[1] * n1, w * n2, out);
    }
}

function grid(n: number): StructuredGrid3D {
  const nk = Math.max(2, n / 2);
  return gridFromFunction3D(n, n, nk, (i, j, k) => {
    const x = i / n;
    const r = 0.6 + (0.8 * j) / n;
    // The k = 0 face displaced onto a smooth bump (a fin-like face), the others spread to T1; a smooth
    // shear in x as well.
    const t0 = Math.asin(
      (0.03 * Math.sin(Math.PI * x) * Math.sin((Math.PI * (r - 0.6)) / 0.8)) / r,
    );
    const t = t0 + ((T1 - t0) * k) / nk;
    return [x + 0.05 * Math.sin(Math.PI * (r - 0.6)) * Math.sin((Math.PI * t) / T1) * 0, r, t];
  });
}

function solve(n: number): number {
  const g = grid(n);
  const { ni, nj, nk } = g;
  const P = (i: number, j: number, k: number): V3 => {
    const q = i + (ni + 1) * (j + (nj + 1) * k);
    return [g.c0[q]!, g.c1[q]!, g.c2[q]!];
  };
  // Source: the net exact outflow through the cell's faces minus the geometric source over its volume.
  const source = new Float64Array(5 * ni * nj * nk);
  const probe = new Euler3D({
    grid: g,
    geometry: 'cylindrical',
    gamma: GAMMA,
    timeIntegrator: 'ssprk2',
    cfl: 0.6,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'outflow' },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'outflow' },
      jMax: { kind: 'outflow' },
      kMin: { kind: 'outflow' },
      kMax: { kind: 'outflow' },
    },
  });
  const m = probe.metrics;
  for (let k = 0; k < nk; k++)
    for (let j = 0; j < nj; j++)
      for (let i = 0; i < ni; i++) {
        const out = [0, 0, 0, 0, 0];
        const minus = [0, 0, 0, 0, 0];
        faceIntegral(
          P(i + 1, j, k),
          P(i + 1, j + 1, k),
          P(i + 1, j + 1, k + 1),
          P(i + 1, j, k + 1),
          out,
        );
        faceIntegral(P(i, j, k), P(i, j + 1, k), P(i, j + 1, k + 1), P(i, j, k + 1), minus);
        faceIntegral(
          P(i, j + 1, k),
          P(i, j + 1, k + 1),
          P(i + 1, j + 1, k + 1),
          P(i + 1, j + 1, k),
          out,
        );
        faceIntegral(P(i, j, k), P(i, j, k + 1), P(i + 1, j, k + 1), P(i + 1, j, k), minus);
        faceIntegral(
          P(i, j, k + 1),
          P(i + 1, j, k + 1),
          P(i + 1, j + 1, k + 1),
          P(i, j + 1, k + 1),
          out,
        );
        faceIntegral(P(i, j, k), P(i + 1, j, k), P(i + 1, j + 1, k), P(i, j + 1, k), minus);
        const c = i + ni * (j + nj * k);
        // Geometric source of the exact field over the cell, by its centroid value times the source volume
        // (second order, as the scheme's own source).
        const q = exact(m.centroid0[c]!, m.centroid1[c]!, m.centroid2[c]!);
        const V = m.sourceVolume[c]!;
        const geo = [0, 0, (q.rho * q.w * q.w + q.p) * V, -q.rho * q.v * q.w * V, 0];
        for (let n = 0; n < 5; n++) source[5 * c + n] = out[n]! - minus[n]! - geo[n]!;
      }
  // Boundaries: exact states at the ghost cells, the interior centroids mirrored about the boundary.
  const sides: Side3D[] = ['iMin', 'iMax', 'jMin', 'jMax', 'kMin', 'kMax'];
  const boundaries = Object.fromEntries(
    sides.map((side) => {
      const layer = (g0: number) => {
        const out: Primitive3D[] = [];
        const cells: [number, number][] = [];
        const count = side[0] === 'i' ? nj * nk : side[0] === 'j' ? ni * nk : ni * nj;
        for (let t = 0; t < count; t++) {
          let i: number;
          let j: number;
          let k: number;
          if (side[0] === 'i') {
            j = t % nj;
            k = Math.floor(t / nj);
            i = side === 'iMin' ? g0 : ni - 1 - g0;
          } else if (side[0] === 'j') {
            i = t % ni;
            k = Math.floor(t / ni);
            j = side === 'jMin' ? g0 : nj - 1 - g0;
          } else {
            i = t % ni;
            j = Math.floor(t / ni);
            k = side === 'kMin' ? g0 : nk - 1 - g0;
          }
          const c = i + ni * (j + nj * k);
          // The boundary face's centroid, approximately: the mean of the cell's centroid and its neighbour's mirror.
          const fc = boundaryPoint(side, i, j, k);
          out.push(
            exact(
              2 * fc[0] - m.centroid0[c]!,
              2 * fc[1] - m.centroid1[c]!,
              2 * fc[2] - m.centroid2[c]!,
            ),
          );
          cells.push([c, t]);
        }
        return out;
      };
      return [
        side,
        side === 'iMax'
          ? { kind: 'outflow' }
          : { kind: 'faceStates', layer0: layer(0), layer1: layer(1) },
      ];
    }),
  ) as never;
  function boundaryPoint(side: Side3D, i: number, j: number, k: number): V3 {
    const corners: V3[] =
      side === 'iMin'
        ? [P(0, j, k), P(0, j + 1, k), P(0, j + 1, k + 1), P(0, j, k + 1)]
        : side === 'iMax'
          ? [P(ni, j, k), P(ni, j + 1, k), P(ni, j + 1, k + 1), P(ni, j, k + 1)]
          : side === 'jMin'
            ? [P(i, 0, k), P(i + 1, 0, k), P(i + 1, 0, k + 1), P(i, 0, k + 1)]
            : side === 'jMax'
              ? [P(i, nj, k), P(i + 1, nj, k), P(i + 1, nj, k + 1), P(i, nj, k + 1)]
              : side === 'kMin'
                ? [P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)]
                : [P(i, j, nk), P(i + 1, j, nk), P(i + 1, j + 1, nk), P(i, j + 1, nk)];
    return [0, 1, 2].map((q) => corners.reduce((s, c) => s + c[q]!, 0) / 4) as V3;
  }
  const e = new Euler3D({ ...probe.config, boundaries, source });
  e.setCellPrimitives((i, j, k) => {
    const c = i + ni * (j + nj * k);
    return exact(m.centroid0[c]!, m.centroid1[c]!, m.centroid2[c]!);
  });
  const r0 = e.densityResidualNorm();
  for (let it = 0; it < 40000; it += 100) {
    e.iterate(100);
    if (e.densityResidualNorm() < 1e-11 * Math.max(r0, 1e-3)) break;
  }
  // L1 error of density, over the cells.
  let err = 0;
  let vol = 0;
  for (let k = 0; k < nk; k++)
    for (let j = 0; j < nj; j++)
      for (let i = 0; i < ni; i++) {
        const c = i + ni * (j + nj * k);
        const q = exact(m.centroid0[c]!, m.centroid1[c]!, m.centroid2[c]!);
        const s = e.primitive(i, j, k);
        err += (Math.abs(s.rho - q.rho) + Math.abs(s.p - q.p) + Math.abs(s.w - q.w)) * m.volume[c]!;
        vol += m.volume[c]!;
      }
  return err / vol;
}

describe('the manufactured solution in cylindrical coordinates', () => {
  it(
    'converges at an observed order of 1.8 or more over four grids',
    { timeout: 3_600_000 },
    () => {
      const ns = [4, 8, 16, 32];
      const errors = ns.map(solve);
      const orders = errors.slice(1).map((e, n) => Math.log2(errors[n]! / e));
      process.stdout.write(
        `manufactured: errors ${errors.join(', ')}; orders ${orders.join(', ')}\n`,
      );
      expect(Math.min(orders[1]!, orders[2]!)).toBeGreaterThanOrEqual(1.8);
    },
  );
});
