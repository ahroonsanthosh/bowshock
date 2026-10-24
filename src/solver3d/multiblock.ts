/**
 * Blocks cut from one global structured grid by index boxes, and their interfaces, for Euler3D.iterateCoupled
 * (docs/design/0021-3d-euler-fins.md: block L, the main block, the slab; and the junction tests J1, J2 of 4.0).
 *
 * The global grid's nodes are shared, so the blocks' common faces are the same faces bit for bit, and every
 * interface point-matches (2.5). Each block side either lies on the global grid's boundary (it keeps the global
 * boundary condition, sliced to its faces) or faces other blocks across its whole extent (it is linked: its
 * ghost cells hold their cells, and the faces take the flux of the block that comes first, its owner). A side
 * that faces blocks across part of its extent only is refused, as is a pair of blocks declared cut, whose common
 * faces are then a boundary of both (a fitted shock, whose conditions the caller sets).
 */

import {
  SIDES_3D,
  type BoundaryCondition3D,
  type FluxShare3D,
  type GhostLink3D,
  type Side3D,
} from './euler3d';
import type { Primitive3D } from './flux3d';
import { nodeIndex3D, type StructuredGrid3D } from './grid3d';

/** Cells [i0, i1) x [j0, j1) x [k0, k1) of the global grid. */
export interface Box3D {
  readonly i0: number;
  readonly i1: number;
  readonly j0: number;
  readonly j1: number;
  readonly k0: number;
  readonly k1: number;
}

export type SideRole =
  | { readonly kind: 'boundary'; readonly side: Side3D }
  /** Faces cells in no block (a solid: the fin, under the slab), across its whole extent. */
  | { readonly kind: 'hole' }
  | { readonly kind: 'linked' }
  | { readonly kind: 'cut'; readonly with: number };

export interface Decomposition {
  readonly grids: readonly StructuredGrid3D[];
  readonly boxes: readonly Box3D[];
  readonly links: readonly GhostLink3D[];
  readonly shares: readonly FluxShare3D[];
  /** role[b][side]: what block b's side is. */
  readonly roles: readonly Readonly<Record<Side3D, SideRole>>[];
}

const GHOSTS = 2;

/** The block's own grid: the global nodes of its box. */
export function subGrid(global: StructuredGrid3D, b: Box3D): StructuredGrid3D {
  const ni = b.i1 - b.i0;
  const nj = b.j1 - b.j0;
  const nk = b.k1 - b.k0;
  const n = (ni + 1) * (nj + 1) * (nk + 1);
  const c0 = new Float64Array(n);
  const c1 = new Float64Array(n);
  const c2 = new Float64Array(n);
  for (let k = 0; k <= nk; k++)
    for (let j = 0; j <= nj; j++)
      for (let i = 0; i <= ni; i++) {
        const g = nodeIndex3D(global, i + b.i0, j + b.j0, k + b.k0);
        const q = nodeIndex3D({ ni, nj }, i, j, k);
        c0[q] = global.c0[g]!;
        c1[q] = global.c1[g]!;
        c2[q] = global.c2[g]!;
      }
  return { ni, nj, nk, c0, c1, c2 };
}

/** Face t of a side of a box: the global (i, j, k) of the cell inside, and the outward step. */
function faceCell(
  b: Box3D,
  side: Side3D,
  t: number,
): { i: number; j: number; k: number; d: [number, number, number] } {
  const ni = b.i1 - b.i0;
  const nj = b.j1 - b.j0;
  if (side[0] === 'i') {
    const j = t % nj;
    const k = Math.floor(t / nj);
    return side === 'iMin'
      ? { i: b.i0, j: j + b.j0, k: k + b.k0, d: [-1, 0, 0] }
      : { i: b.i1 - 1, j: j + b.j0, k: k + b.k0, d: [1, 0, 0] };
  }
  if (side[0] === 'j') {
    const i = t % ni;
    const k = Math.floor(t / ni);
    return side === 'jMin'
      ? { i: i + b.i0, j: b.j0, k: k + b.k0, d: [0, -1, 0] }
      : { i: i + b.i0, j: b.j1 - 1, k: k + b.k0, d: [0, 1, 0] };
  }
  const i = t % ni;
  const j = Math.floor(t / ni);
  return side === 'kMin'
    ? { i: i + b.i0, j: j + b.j0, k: b.k0, d: [0, 0, -1] }
    : { i: i + b.i0, j: j + b.j0, k: b.k1 - 1, d: [0, 0, 1] };
}

function faceCount(b: Box3D, side: Side3D): number {
  const ni = b.i1 - b.i0;
  const nj = b.j1 - b.j0;
  const nk = b.k1 - b.k0;
  return side[0] === 'i' ? nj * nk : side[0] === 'j' ? ni * nk : ni * nj;
}

/** Face index on `side` of box b of the face whose inside cell is the global (i, j, k). */
function faceIndexOf(b: Box3D, side: Side3D, i: number, j: number, k: number): number {
  const ni = b.i1 - b.i0;
  const nj = b.j1 - b.j0;
  if (side[0] === 'i') return j - b.j0 + nj * (k - b.k0);
  if (side[0] === 'j') return i - b.i0 + ni * (k - b.k0);
  return i - b.i0 + ni * (j - b.j0);
}

const OPPOSITE: Readonly<Record<Side3D, Side3D>> = {
  iMin: 'iMax',
  iMax: 'iMin',
  jMin: 'jMax',
  jMax: 'jMin',
  kMin: 'kMax',
  kMax: 'kMin',
};

export function decompose(
  global: StructuredGrid3D,
  boxes: readonly Box3D[],
  cuts: readonly (readonly [number, number])[] = [],
  /** Allow cells in no box (holes: solids inside the global index space). */
  holes = false,
): Decomposition {
  const owner = (i: number, j: number, k: number): number => {
    for (let b = 0; b < boxes.length; b++) {
      const x = boxes[b]!;
      if (i >= x.i0 && i < x.i1 && j >= x.j0 && j < x.j1 && k >= x.k0 && k < x.k1) return b;
    }
    return -1;
  };
  // The boxes tile the global grid without overlap.
  for (let k = 0; k < global.nk; k++)
    for (let j = 0; j < global.nj; j++)
      for (let i = 0; i < global.ni; i++) {
        let n = 0;
        for (const x of boxes)
          if (i >= x.i0 && i < x.i1 && j >= x.j0 && j < x.j1 && k >= x.k0 && k < x.k1) n++;
        if (n > 1 || (n === 0 && !holes))
          throw new RangeError(`cell (${i}, ${j}, ${k}) lies in ${n} boxes`);
      }
  const isCut = (a: number, b: number) =>
    cuts.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
  const links: GhostLink3D[] = [];
  const shares: FluxShare3D[] = [];
  const roles: Record<Side3D, SideRole>[] = [];
  boxes.forEach((box, b) => {
    const role = {} as Record<Side3D, SideRole>;
    for (const side of SIDES_3D) {
      const n = faceCount(box, side);
      const across = new Int32Array(n);
      let inGrid = 0;
      for (let t = 0; t < n; t++) {
        const c = faceCell(box, side, t);
        const [i, j, k] = [c.i + c.d[0], c.j + c.d[1], c.k + c.d[2]];
        const inside =
          i >= 0 && i < global.ni && j >= 0 && j < global.nj && k >= 0 && k < global.nk;
        if (inside) inGrid++;
        across[t] = inside ? owner(i, j, k) : -1;
      }
      if (inGrid === n && Array.from(across).every((x) => x === -1)) {
        role[side] = { kind: 'hole' };
        continue;
      }
      if (inGrid !== 0 && inGrid !== n)
        throw new RangeError(`side ${side} of block ${b} reaches the grid's edge part way`);
      const outside = Array.from(across).every((x) => x === -1);
      const cutWith = Array.from(across).filter((x) => x !== -1 && isCut(b, x));
      if (outside) {
        role[side] = { kind: 'boundary', side };
        continue;
      }
      if (cutWith.length === n && new Set(cutWith).size === 1) {
        role[side] = { kind: 'cut', with: cutWith[0]! };
        continue;
      }
      if (Array.from(across).some((x) => x === -1 || isCut(b, x)))
        throw new RangeError(
          `side ${side} of block ${b} faces other blocks across part of its extent only`,
        );
      role[side] = { kind: 'linked' };
      const sources = new Int32Array(4 * GHOSTS * n);
      const lower = Array.from(across).some((x) => x < b);
      const higher = Array.from(across).some((x) => x > b);
      if (lower && higher)
        throw new RangeError(`side ${side} of block ${b} faces blocks before and after it`);
      const owners = new Int32Array(3 * n);
      for (let t = 0; t < n; t++) {
        const c = faceCell(box, side, t);
        for (let g = 0; g < GHOSTS; g++) {
          const gi = c.i + (1 + g) * c.d[0];
          const gj = c.j + (1 + g) * c.d[1];
          const gk = c.k + (1 + g) * c.d[2];
          const ob = owner(gi, gj, gk);
          if (ob === -1 || isCut(b, ob))
            throw new RangeError(
              `the blocks across side ${side} of block ${b} are less than two cells thick`,
            );
          const [si, sj, sk] = [gi, gj, gk];
          const ox = boxes[ob]!;
          const e = 4 * (GHOSTS * t + g);
          sources[e] = ob;
          sources[e + 1] = si - ox.i0;
          sources[e + 2] = sj - ox.j0;
          sources[e + 3] = sk - ox.k0;
        }
        if (lower) {
          const ob = across[t]!;
          const ox = boxes[ob]!;
          const os = OPPOSITE[side];
          owners[3 * t] = ob;
          owners[3 * t + 1] = SIDES_3D.indexOf(os);
          owners[3 * t + 2] = faceIndexOf(ox, os, c.i + c.d[0], c.j + c.d[1], c.k + c.d[2]);
        }
      }
      links.push({ block: b, side, sources });
      if (lower) shares.push({ block: b, side, owners });
    }
    roles.push(role);
  });
  return { grids: boxes.map((x) => subGrid(global, x)), boxes, links, shares, roles };
}

/**
 * Block b's boundary conditions: linked sides linked, global-boundary sides the global condition (face states
 * sliced to the block's faces), cut sides from `cut` (the caller's fitted-shock conditions).
 */
export function blockBoundaries(
  dec: Decomposition,
  b: number,
  global: Readonly<Record<Side3D, BoundaryCondition3D>>,
  globalGrid: { readonly ni: number; readonly nj: number; readonly nk: number },
  cut: (side: Side3D, other: number) => BoundaryCondition3D = () => {
    throw new RangeError('a cut side needs its condition');
  },
  hole: (side: Side3D) => BoundaryCondition3D = () => ({ kind: 'wall' }),
): Record<Side3D, BoundaryCondition3D> {
  const box = dec.boxes[b]!;
  const whole: Box3D = {
    i0: 0,
    i1: globalGrid.ni,
    j0: 0,
    j1: globalGrid.nj,
    k0: 0,
    k1: globalGrid.nk,
  };
  const out = {} as Record<Side3D, BoundaryCondition3D>;
  for (const side of SIDES_3D) {
    const role = dec.roles[b]![side];
    if (role.kind === 'linked') {
      out[side] = { kind: 'linked' };
      continue;
    }
    if (role.kind === 'cut') {
      out[side] = cut(side, role.with);
      continue;
    }
    if (role.kind === 'hole') {
      out[side] = hole(side);
      continue;
    }
    const bc = global[side];
    if (bc.kind !== 'faceStates') {
      out[side] = bc;
      continue;
    }
    const n = faceCount(box, side);
    const layer0: Primitive3D[] = [];
    const layer1: Primitive3D[] = [];
    for (let t = 0; t < n; t++) {
      const c = faceCell(box, side, t);
      const tg = faceIndexOf(whole, side, c.i, c.j, c.k);
      layer0.push(bc.layer0[tg]!);
      layer1.push(bc.layer1[tg]!);
    }
    out[side] = { kind: 'faceStates', layer0, layer1 };
  }
  return out;
}
