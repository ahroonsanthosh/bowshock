/** Shared builders for the 3D engine's tests (docs/design/0021-3d-euler-fins.md section 4.0). */

import { gridFromFunction, type StructuredGrid } from '../../src/grid/structured';
import { gridFromFunction3D, type StructuredGrid3D } from '../../src/solver3d/grid3d';
import type { Primitive3D } from '../../src/solver3d/flux3d';

/** A deterministic generator (mulberry32). */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A 2D grid on an annular region (x0..x1, r0..r1) with interior nodes moved at random by up to `jitter` of a
 * cell, the boundary nodes on the rectangle's sides.
 */
export function jitteredGrid2D(
  ni: number,
  nj: number,
  x0: number,
  x1: number,
  r0: number,
  r1: number,
  jitter: number,
  seed: number,
): StructuredGrid {
  const rand = random(seed);
  const dx = (x1 - x0) / ni;
  const dr = (r1 - r0) / nj;
  return gridFromFunction(ni, nj, (i, j) => {
    const inside = i > 0 && i < ni && j > 0 && j < nj;
    const ex = inside ? (rand() - 0.5) * 2 * jitter * dx : 0;
    const er = inside ? (rand() - 0.5) * 2 * jitter * dr : 0;
    return [x0 + i * dx + ex, r0 + j * dr + er];
  });
}

/** The 2D grid revolved through angles theta[0..nk] (cylindrical coordinates). */
export function revolve(grid: StructuredGrid, theta: readonly number[]): StructuredGrid3D {
  const nk = theta.length - 1;
  return gridFromFunction3D(grid.ni, grid.nj, nk, (i, j, k) => {
    const q = i + j * (grid.ni + 1);
    return [grid.x[q]!, grid.y[q]!, theta[k]!];
  });
}

/** A cylindrical sector grid with every interior node moved at random (in x, r and theta) by up to `jitter` of a cell. */
export function jitteredSector(
  ni: number,
  nj: number,
  nk: number,
  box: { x0: number; x1: number; r0: number; r1: number; t0: number; t1: number },
  jitter: number,
  seed: number,
  displace?: (x: number, r: number) => number,
): StructuredGrid3D {
  const rand = random(seed);
  const dx = (box.x1 - box.x0) / ni;
  const dr = (box.r1 - box.r0) / nj;
  const dt = (box.t1 - box.t0) / nk;
  return gridFromFunction3D(ni, nj, nk, (i, j, k) => {
    const inside = i > 0 && i < ni && j > 0 && j < nj && k > 0 && k < nk;
    const e = () => (inside ? (rand() - 0.5) * 2 * jitter : 0);
    const x = box.x0 + i * dx + e() * dx;
    const r = box.r0 + j * dr + e() * dr;
    let t = box.t0 + k * dt + e() * dt;
    if (displace !== undefined) {
      // The k = 0 face displaced onto theta_0(x, r), the other nodes spread linearly to t1 (0021 2.3).
      const t0 = displace(x, r);
      t = t0 + ((box.t1 - t0) * (t - box.t0)) / (box.t1 - box.t0);
    }
    return [x, r, t];
  });
}

export function uniformFlow(mach: number, gamma = 1.4): Primitive3D {
  return { rho: 1, u: mach * Math.sqrt(gamma), v: 0, w: 0, p: 1 };
}
