/**
 * The 2D field at any point (docs/design/0021-3d-euler-fins.md 2.1, 2.4, 2.5): the 3D sector's start plane and
 * envelope ghost cells, and every fitted face's upstream state, take the axisymmetric 2D solution interpolated
 * there, "cubic, in the 2D grid's parameters".
 *
 * A point (x, r) is located in the 2D grid by its cell (a bucketed search, then Newton on the cell's bilinear
 * map), which gives its continuous node coordinates (i + s, j + t); the cell centres sit at half-integers, so
 * its cell-centre coordinates are (i + s - 1/2, j + t - 1/2). The value there is the tensor-product Catmull-Rom
 * cubic of the 4 x 4 nearest cell centres (exact for polynomials of degree two in the parameters, and through
 * the cell values), its stencil clamped at the grid's edges. Outside the grid the point is refused.
 */

import { nodeIndex, type StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';

export interface Field2D {
  /** The 2D state at (x, r), or undefined outside the grid. */
  at(x: number, r: number): Primitive2D | undefined;
  /** The point's cell-centre parameters (for tests). */
  parameters(x: number, r: number): { xi: number; eta: number } | undefined;
}

/** Catmull-Rom weights for the four points around a parameter fraction t in [0, 1]. */
function catmullRom(t: number): [number, number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5 * (-t3 + 2 * t2 - t),
    0.5 * (3 * t3 - 5 * t2 + 2),
    0.5 * (-3 * t3 + 4 * t2 + t),
    0.5 * (t3 - t2),
  ];
}

export function field2D(
  grid: StructuredGrid,
  cell: (i: number, j: number) => Primitive2D,
): Field2D {
  const { ni, nj } = grid;
  const X = (i: number, j: number) => grid.x[nodeIndex(grid, i, j)]!;
  const Y = (i: number, j: number) => grid.y[nodeIndex(grid, i, j)]!;
  // Buckets of cells by their bounding boxes.
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let q = 0; q < grid.x.length; q++) {
    xMin = Math.min(xMin, grid.x[q]!);
    xMax = Math.max(xMax, grid.x[q]!);
    yMin = Math.min(yMin, grid.y[q]!);
    yMax = Math.max(yMax, grid.y[q]!);
  }
  const nb = Math.max(4, Math.ceil(Math.sqrt(ni * nj)));
  const bx = (xMax - xMin) / nb || 1;
  const by = (yMax - yMin) / nb || 1;
  const buckets: number[][] = Array.from({ length: nb * nb }, () => []);
  const clampB = (v: number) => Math.min(nb - 1, Math.max(0, v));
  for (let j = 0; j < nj; j++)
    for (let i = 0; i < ni; i++) {
      const xs = [X(i, j), X(i + 1, j), X(i, j + 1), X(i + 1, j + 1)];
      const ys = [Y(i, j), Y(i + 1, j), Y(i, j + 1), Y(i + 1, j + 1)];
      const a0 = clampB(Math.floor((Math.min(...xs) - xMin) / bx));
      const a1 = clampB(Math.floor((Math.max(...xs) - xMin) / bx));
      const b0 = clampB(Math.floor((Math.min(...ys) - yMin) / by));
      const b1 = clampB(Math.floor((Math.max(...ys) - yMin) / by));
      for (let a = a0; a <= a1; a++)
        for (let b = b0; b <= b1; b++) buckets[a + nb * b]!.push(i + ni * j);
    }
  /** (s, t) in [0, 1]^2 with the cell's bilinear map at (x, r), by Newton; undefined if outside the cell. */
  const invert = (i: number, j: number, x: number, r: number): [number, number] | undefined => {
    const x00 = X(i, j);
    const x10 = X(i + 1, j);
    const x01 = X(i, j + 1);
    const x11 = X(i + 1, j + 1);
    const y00 = Y(i, j);
    const y10 = Y(i + 1, j);
    const y01 = Y(i, j + 1);
    const y11 = Y(i + 1, j + 1);
    let s = 0.5;
    let t = 0.5;
    for (let it = 0; it < 50; it++) {
      const px = (1 - s) * (1 - t) * x00 + s * (1 - t) * x10 + (1 - s) * t * x01 + s * t * x11;
      const py = (1 - s) * (1 - t) * y00 + s * (1 - t) * y10 + (1 - s) * t * y01 + s * t * y11;
      const fx = px - x;
      const fy = py - r;
      const dxs = (1 - t) * (x10 - x00) + t * (x11 - x01);
      const dxt = (1 - s) * (x01 - x00) + s * (x11 - x10);
      const dys = (1 - t) * (y10 - y00) + t * (y11 - y01);
      const dyt = (1 - s) * (y01 - y00) + s * (y11 - y10);
      const det = dxs * dyt - dxt * dys;
      if (det === 0) return undefined;
      const ds = (fx * dyt - fy * dxt) / det;
      const dt = (dxs * fy - dys * fx) / det;
      s -= ds;
      t -= dt;
      if (Math.abs(ds) + Math.abs(dt) < 1e-14) break;
    }
    const e = 1e-10;
    return s >= -e && s <= 1 + e && t >= -e && t <= 1 + e ? [s, t] : undefined;
  };
  const parameters = (x: number, r: number) => {
    const a = Math.floor((x - xMin) / bx);
    const b = Math.floor((r - yMin) / by);
    if (a < 0 || a >= nb || b < 0 || b >= nb) {
      // On the box's far edges.
      if (!(x >= xMin && x <= xMax && r >= yMin && r <= yMax)) return undefined;
    }
    for (const c of buckets[clampB(a) + nb * clampB(b)]!) {
      const i = c % ni;
      const j = Math.floor(c / ni);
      const st = invert(i, j, x, r);
      if (st) return { xi: i + st[0] - 0.5, eta: j + st[1] - 0.5 };
    }
    return undefined;
  };
  const at = (x: number, r: number): Primitive2D | undefined => {
    const p = parameters(x, r);
    if (!p) return undefined;
    const i0 = Math.floor(p.xi);
    const j0 = Math.floor(p.eta);
    const wi = catmullRom(p.xi - i0);
    const wj = catmullRom(p.eta - j0);
    const ci = (i: number) => Math.min(ni - 1, Math.max(0, i));
    const cj = (j: number) => Math.min(nj - 1, Math.max(0, j));
    const out = { rho: 0, u: 0, v: 0, p: 0 };
    for (let b = 0; b < 4; b++)
      for (let a = 0; a < 4; a++) {
        const w = wi[a]! * wj[b]!;
        const v = cell(ci(i0 - 1 + a), cj(j0 - 1 + b));
        out.rho += w * v.rho;
        out.u += w * v.u;
        out.v += w * v.v;
        out.p += w * v.p;
      }
    return out;
  };
  return { at, parameters };
}
