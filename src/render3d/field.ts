/**
 * The solved flow in one meridional plane, and the same flow in 3D.
 *
 * The solver computes the axisymmetric flow at zero incidence: every
 * meridional plane (a half-plane through the axis, at azimuth phi) holds
 * the same flow, the velocity having an axial component u and a radial
 * component v, with no swirl. So the 3D field is the meridional field
 * revolved about the axis, exactly:
 *
 *   q(x, y, z) = q_m(x, r),  r = sqrt(y^2 + z^2),
 *   velocity (u, v cos phi, v sin phi),  phi = atan2(z, y).
 *
 * Values between the solver's cells are interpolated as the 2D flow view
 * draws them (src/render/flow-fields.ts): on the "dual" mesh whose
 * vertices are the cell centres, with the faces and corners of the
 * boundary added, each taking the value of the cell beside it, bilinearly
 * within each dual quad. So the value at a cell's centre is the solver's
 * value there, and no value lies outside the cells' range. The dual mesh
 * covers exactly the computed region: from the body (the wall) to the
 * fitted bow shock, and from the inflow plane to the outflow plane.
 */

import type { GridLine } from '../grid/blunt-grid';
import type { StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';

/** The flow of one meridional plane on the solver's grid, in double precision. */
export interface MeridionalField {
  /** Cells along the body and across, as the solver's grid. */
  readonly ni: number;
  readonly nj: number;
  /** Node (i, j) at i + j (ni + 1): x axial, r radial (r >= 0). */
  readonly x: Float64Array;
  readonly r: Float64Array;
  /** Cell (i, j) at i + j ni: density, axial and radial velocity, pressure. */
  readonly rho: Float64Array;
  readonly u: Float64Array;
  readonly v: Float64Array;
  readonly p: Float64Array;
  readonly gamma: number;
  readonly freeStream: Primitive2D;
}

/** The field from a grid and the flow in each cell (a CPU fit, or a GPU fit read back). */
export function fieldFromCells(
  grid: StructuredGrid,
  cell: (i: number, j: number) => Primitive2D,
  gamma: number,
  freeStream: Primitive2D,
): MeridionalField {
  const { ni, nj } = grid;
  const n = ni * nj;
  const rho = new Float64Array(n);
  const u = new Float64Array(n);
  const v = new Float64Array(n);
  const p = new Float64Array(n);
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      const q = cell(i, j);
      const c = i + j * ni;
      rho[c] = q.rho;
      u[c] = q.u;
      v[c] = q.v;
      p[c] = q.p;
    }
  }
  return {
    ni,
    nj,
    x: Float64Array.from(grid.x),
    r: Float64Array.from(grid.y),
    rho,
    u,
    v,
    p,
    gamma,
    freeStream,
  };
}

/**
 * The field from a solver's conserved state, (rho, rho u, rho v, E) per
 * cell at i + j ni as the GPU engine holds it, on nodes already placed.
 */
export function fieldFromConserved(
  ni: number,
  nj: number,
  x: Float64Array,
  r: Float64Array,
  conserved: ArrayLike<number>,
  gamma: number,
  freeStream: Primitive2D,
): MeridionalField {
  const n = ni * nj;
  const rho = new Float64Array(n);
  const u = new Float64Array(n);
  const v = new Float64Array(n);
  const p = new Float64Array(n);
  for (let c = 0; c < n; c++) {
    const d = conserved[4 * c]!;
    const mu = conserved[4 * c + 1]!;
    const mv = conserved[4 * c + 2]!;
    const e = conserved[4 * c + 3]!;
    rho[c] = d;
    u[c] = mu / d;
    v[c] = mv / d;
    p[c] = (gamma - 1) * (e - (0.5 * (mu * mu + mv * mv)) / d);
  }
  return { ni, nj, x, r, rho, u, v, p, gamma, freeStream };
}

/**
 * Nodes of the moving grid of a fitted shock at these heights: node (i, j)
 * at P_i + h_i f_ij d_i on line i, with its fixed fractions f_ij
 * (withFixedFractions). The CPU twin of flow_nodes in
 * src/render/shaders/flow-fields.wgsl.
 */
export function nodesOnLines(
  lines: readonly GridLine[],
  heights: ArrayLike<number>,
  nj: number,
): { x: Float64Array; r: Float64Array } {
  const ni = lines.length - 1;
  const x = new Float64Array((ni + 1) * (nj + 1));
  const r = new Float64Array((ni + 1) * (nj + 1));
  lines.forEach((line, i) => {
    const f = line.fractions;
    if (f === undefined || f.length !== nj + 1) {
      throw new RangeError(`line ${i} needs ${nj + 1} fixed fractions`);
    }
    const h = heights[i]!;
    for (let j = 0; j <= nj; j++) {
      x[i + j * (ni + 1)] = line.x + h * f[j]! * line.dx;
      r[i + j * (ni + 1)] = line.y + h * f[j]! * line.dy;
    }
  });
  return { x, r };
}

/** Mach number of cell c. */
export function cellMach(field: MeridionalField, c: number): number {
  const a = Math.sqrt((field.gamma * field.p[c]!) / field.rho[c]!);
  return Math.hypot(field.u[c]!, field.v[c]!) / a;
}

export function freeStreamMach(field: MeridionalField): number {
  const f = field.freeStream;
  return Math.hypot(f.u, f.v) / Math.sqrt((field.gamma * f.p) / f.rho);
}

/** Smallest and largest Mach number over the cells. */
export function machRange(field: MeridionalField): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let c = 0; c < field.ni * field.nj; c++) {
    const m = cellMach(field, c);
    if (m < min) min = m;
    if (m > max) max = m;
  }
  return { min, max };
}

/**
 * The dual mesh: (ni + 2) by (nj + 2) vertices, vertex (I, J) at
 * I + J (ni + 2). Interior vertices (1 <= I <= ni, 1 <= J <= nj) are the
 * centres of cells (I - 1, J - 1); boundary vertices are the midpoints of
 * the boundary faces, and the four corners the grid's corner nodes. Each
 * vertex takes the values of the cell `cell[k]` beside it.
 */
export interface DualMesh {
  readonly ni: number;
  readonly nj: number;
  readonly x: Float64Array;
  readonly r: Float64Array;
  readonly cell: Int32Array;
  /** Per vertex: axial and radial velocity and Mach number of its cell. */
  readonly u: Float64Array;
  readonly v: Float64Array;
  readonly mach: Float64Array;
}

export function dualMesh(field: MeridionalField): DualMesh {
  const { ni, nj, x: nx, r: nr } = field;
  const row = ni + 1;
  const NI = ni + 2;
  const count = NI * (nj + 2);
  const x = new Float64Array(count);
  const r = new Float64Array(count);
  const cell = new Int32Array(count);
  const node = (i: number, j: number) => i + j * row;
  for (let J = 0; J <= nj + 1; J++) {
    for (let I = 0; I <= ni + 1; I++) {
      // Node ranges the vertex averages: [i0, i1] x [j0, j1].
      const i0 = Math.max(I - 1, 0);
      const i1 = Math.min(I, ni);
      const j0 = Math.max(J - 1, 0);
      const j1 = Math.min(J, nj);
      const corners = [node(i0, j0), node(i1, j0), node(i0, j1), node(i1, j1)];
      let sx = 0;
      let sr = 0;
      for (const k of corners) {
        sx += nx[k]!;
        sr += nr[k]!;
      }
      const k = I + J * NI;
      x[k] = sx / 4;
      r[k] = sr / 4;
      cell[k] = Math.min(Math.max(I - 1, 0), ni - 1) + Math.min(Math.max(J - 1, 0), nj - 1) * ni;
    }
  }
  const u = new Float64Array(count);
  const v = new Float64Array(count);
  const mach = new Float64Array(count);
  const cellMachs = new Float64Array(ni * nj);
  for (let c = 0; c < ni * nj; c++) cellMachs[c] = cellMach(field, c);
  for (let k = 0; k < count; k++) {
    const c = cell[k]!;
    u[k] = field.u[c]!;
    v[k] = field.v[c]!;
    mach[k] = cellMachs[c]!;
  }
  return { ni, nj, x, r, cell, u, v, mach };
}

/** A point inside dual quad (I, J) (I in 0..ni, J in 0..nj) at local (s, t) in [0, 1]^2. */
export interface Location {
  readonly I: number;
  readonly J: number;
  readonly s: number;
  readonly t: number;
}

/** The four vertex indices of dual quad (I, J): (0,0), (1,0), (1,1), (0,1). */
export function quadVertices(
  mesh: DualMesh,
  I: number,
  J: number,
): [number, number, number, number] {
  const NI = mesh.ni + 2;
  const a = I + J * NI;
  return [a, a + 1, a + 1 + NI, a + NI];
}

/**
 * Local coordinates (s, t) of (x, r) in dual quad (I, J), by Newton's
 * method on the bilinear map (the quads are convex); not clamped.
 */
export function localCoordinates(
  mesh: DualMesh,
  I: number,
  J: number,
  x: number,
  r: number,
): [number, number] {
  const [a, b, c, d] = quadVertices(mesh, I, J);
  const X = mesh.x;
  const R = mesh.r;
  let s = 0.5;
  let t = 0.5;
  for (let iter = 0; iter < 20; iter++) {
    const px =
      (1 - s) * (1 - t) * X[a]! + s * (1 - t) * X[b]! + s * t * X[c]! + (1 - s) * t * X[d]!;
    const pr =
      (1 - s) * (1 - t) * R[a]! + s * (1 - t) * R[b]! + s * t * R[c]! + (1 - s) * t * R[d]!;
    const ex = px - x;
    const er = pr - r;
    const dxs = (1 - t) * (X[b]! - X[a]!) + t * (X[c]! - X[d]!);
    const drs = (1 - t) * (R[b]! - R[a]!) + t * (R[c]! - R[d]!);
    const dxt = (1 - s) * (X[d]! - X[a]!) + s * (X[c]! - X[b]!);
    const drt = (1 - s) * (R[d]! - R[a]!) + s * (R[c]! - R[b]!);
    const det = dxs * drt - dxt * drs;
    if (det === 0) break;
    const ds = (ex * drt - er * dxt) / det;
    const dt = (dxs * er - drs * ex) / det;
    s -= ds;
    t -= dt;
    if (Math.abs(ds) + Math.abs(dt) < 1e-13) break;
  }
  return [s, t];
}

/** Position of local (s, t) in dual quad (I, J). */
export function quadPoint(
  mesh: DualMesh,
  I: number,
  J: number,
  s: number,
  t: number,
): [number, number] {
  const [a, b, c, d] = quadVertices(mesh, I, J);
  const w = [(1 - s) * (1 - t), s * (1 - t), s * t, (1 - s) * t];
  const k = [a, b, c, d];
  let x = 0;
  let r = 0;
  for (let n = 0; n < 4; n++) {
    x += w[n]! * mesh.x[k[n]!]!;
    r += w[n]! * mesh.r[k[n]!]!;
  }
  return [x, r];
}

const INSIDE_SLACK = 1e-9;

/**
 * The dual quad holding (x, r), walking from `hint` towards it and
 * searching every quad if the walk fails; null outside the computed
 * region.
 */
export function locate(
  mesh: DualMesh,
  x: number,
  r: number,
  hint?: { readonly I: number; readonly J: number },
): Location | null {
  const { ni, nj } = mesh;
  if (hint !== undefined) {
    let I = Math.min(Math.max(hint.I, 0), ni);
    let J = Math.min(Math.max(hint.J, 0), nj);
    for (let step = 0; step < 4 * (ni + nj + 2); step++) {
      const [s, t] = localCoordinates(mesh, I, J, x, r);
      const inside =
        s >= -INSIDE_SLACK && s <= 1 + INSIDE_SLACK && t >= -INSIDE_SLACK && t <= 1 + INSIDE_SLACK;
      if (inside) return { I, J, s: clamp01(s), t: clamp01(t) };
      const nI = I + (s < 0 ? -1 : s > 1 ? 1 : 0);
      const nJ = J + (t < 0 ? -1 : t > 1 ? 1 : 0);
      if (nI < 0 || nI > ni || nJ < 0 || nJ > nj) break;
      I = nI;
      J = nJ;
    }
  }
  for (let J = 0; J <= nj; J++) {
    for (let I = 0; I <= ni; I++) {
      if (!quadBoxHolds(mesh, I, J, x, r)) continue;
      const [s, t] = localCoordinates(mesh, I, J, x, r);
      if (
        s >= -INSIDE_SLACK &&
        s <= 1 + INSIDE_SLACK &&
        t >= -INSIDE_SLACK &&
        t <= 1 + INSIDE_SLACK
      ) {
        return { I, J, s: clamp01(s), t: clamp01(t) };
      }
    }
  }
  return null;
}

function quadBoxHolds(mesh: DualMesh, I: number, J: number, x: number, r: number): boolean {
  const k = quadVertices(mesh, I, J);
  let xMin = Infinity;
  let xMax = -Infinity;
  let rMin = Infinity;
  let rMax = -Infinity;
  for (const q of k) {
    xMin = Math.min(xMin, mesh.x[q]!);
    xMax = Math.max(xMax, mesh.x[q]!);
    rMin = Math.min(rMin, mesh.r[q]!);
    rMax = Math.max(rMax, mesh.r[q]!);
  }
  const e = 1e-9 * (1 + Math.abs(x) + Math.abs(r));
  return x >= xMin - e && x <= xMax + e && r >= rMin - e && r <= rMax + e;
}

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

/** Values of the meridional field at a location: axial and radial velocity, Mach number. */
export interface Sample {
  readonly u: number;
  readonly v: number;
  readonly mach: number;
}

export function sampleAt(mesh: DualMesh, at: Location): Sample {
  const [a, b, c, d] = quadVertices(mesh, at.I, at.J);
  const { s, t } = at;
  const w = [(1 - s) * (1 - t), s * (1 - t), s * t, (1 - s) * t] as const;
  const k = [a, b, c, d] as const;
  let u = 0;
  let v = 0;
  let mach = 0;
  for (let n = 0; n < 4; n++) {
    u += w[n]! * mesh.u[k[n]!]!;
    v += w[n]! * mesh.v[k[n]!]!;
    mach += w[n]! * mesh.mach[k[n]!]!;
  }
  return { u, v, mach };
}

/** The meridional field at (x, r); null outside the computed region. */
export function sampleMeridional(mesh: DualMesh, x: number, r: number): Sample | null {
  const at = locate(mesh, x, r);
  return at === null ? null : sampleAt(mesh, at);
}

/** The 3D field at (x, y, z): its velocity (ux, uy, uz) and Mach number; null outside. */
export function sampleRevolved(
  mesh: DualMesh,
  x: number,
  y: number,
  z: number,
): { velocity: [number, number, number]; mach: number } | null {
  const r = Math.hypot(y, z);
  const q = sampleMeridional(mesh, x, r);
  if (q === null) return null;
  // On the axis the radial velocity has no direction; the flow there has
  // none (v = 0 on the axis of an axisymmetric flow).
  const cos = r > 0 ? y / r : 1;
  const sin = r > 0 ? z / r : 0;
  return { velocity: [q.u, q.v * cos, q.v * sin], mach: q.mach };
}

/** The fitted shock: the grid's outer boundary, nodes (i, nj), as a polyline. */
export function shockLine(field: MeridionalField): { x: number[]; r: number[] } {
  const { ni, nj } = field;
  const x: number[] = [];
  const r: number[] = [];
  for (let i = 0; i <= ni; i++) {
    x.push(field.x[i + nj * (ni + 1)]!);
    r.push(field.r[i + nj * (ni + 1)]!);
  }
  return { x, r };
}

/** The body's surface as the grid has it: nodes (i, 0). */
export function wallLine(field: MeridionalField): { x: number[]; r: number[] } {
  const { ni } = field;
  return { x: Array.from(field.x.subarray(0, ni + 1)), r: Array.from(field.r.subarray(0, ni + 1)) };
}

/** Extent of the computed region: x from its first to last node, r up to the shock's largest. */
export function fieldBounds(field: MeridionalField): {
  xMin: number;
  xMax: number;
  rMax: number;
} {
  let xMin = Infinity;
  let xMax = -Infinity;
  let rMax = 0;
  for (let k = 0; k < field.x.length; k++) {
    xMin = Math.min(xMin, field.x[k]!);
    xMax = Math.max(xMax, field.x[k]!);
    rMax = Math.max(rMax, field.r[k]!);
  }
  return { xMin, xMax, rMax };
}
