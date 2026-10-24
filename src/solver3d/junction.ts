/**
 * The fitted surface's code checks and junction tests (docs/design/0021-3d-euler-fins.md 4.0): planar 3D, a
 * sharp wedge of half-angle 10 deg at Mach 2.5 spanning from a plane wall (y = 0) to a mirror face (y = 1),
 * whose attached oblique shock is exact and uniform.
 *
 * Coordinates (x, y, z): the wedge's face is z = x tan(delta), the span is y, the face's normal side z. Block L
 * lies between the wedge's face and the fitted shock (its lines straight along z, from the face to the shock);
 * the main block outside it, to z = Z_MAX. The domain runs from x = X0 (the wedge's flow there is exact and is
 * imposed on the inflow plane, at each ghost cell's centroid) to x = 1 (supersonic outflow).
 *
 * - 'full': the shock fitted over the whole span (4.0's fitted-surface check: placed at its exact position it
 *   stays there; a displaced start returns to it).
 * - 'J1': fitted over the inner half of the span (y < 1/2) and captured beyond the junction row (the tip's
 *   case).
 * - 'J2': fitted up to the column at x = (X0 + 1) / 2 and captured behind it (the downstream line's case).
 *
 * One global grid holds the three blocks (src/solver3d/multiblock.ts): block L (cells below the fitted shock),
 * M1 (the main block's cells above it) and M2 (the main block where the shock is captured). The main block's
 * nodes follow the fitted shock where it is fitted, through the junction row (or column), whose nodes are the
 * fitted surface's; beyond it they are evenly spaced from the wedge to Z_MAX, not aligned with the shock, so
 * that the captured continuation is a captured shock (smeared across cells), not a grid line.
 *
 * Every fitted face takes the exact upstream state, the free stream (0021 2.5: the 2D field, never the cell
 * across the face); the planted breach takes M1's cell across the face instead (revision 2's rule). The main
 * block's side of a fitted face is a supersonic outflow whose ghost cells take the same upstream state.
 */

import { obliqueShock } from '../validation/gas-dynamics';
import { Euler3D, type BoundaryCondition3D, type Euler3DConfig, type Side3D } from './euler3d';
import { fittedSide, type FittedSide } from './fitted-surface';
import type { Primitive3D } from './flux3d';
import { cellIndex3D, computeMetrics3D, nodeIndex3D, type StructuredGrid3D } from './grid3d';
import { blockBoundaries, decompose, subGrid, type Box3D, type Decomposition } from './multiblock';

export const JUNCTION_MACH = 2.5;
export const JUNCTION_DELTA = (10 * Math.PI) / 180;
const GAMMA = 1.4;
const X0 = 0.1;
const X1 = 1;
const Z_MAX = 1;

export type JunctionKind = 'full' | 'J1' | 'J2';

export interface JunctionOptions {
  readonly kind: JunctionKind;
  /** Grid level: 0, 1, 2, each halving the last's spacing. */
  readonly level: number;
  /** Take each fitted face's upstream state from M1's cell across it (the planted breach). */
  readonly breach?: boolean;
  /** Start with the shock displaced by this fraction of its exact height (0: at its exact position). */
  readonly displaced?: number;
  readonly maxSteps: number;
  /**
   * Flow steps between moves of the shock (default 1), as 0006's option: the shock boundary follows the flow at
   * every step, the shock moves one step's worth once per this many steps, and the blocks are rebuilt only
   * then; the converged state does not depend on it.
   */
  readonly stepsPerMove?: number;
  /** Stop when every shock face moves slower than this times the free-stream sound speed ... */
  readonly speedTolerance?: number;
  /** ... and the density residual is below this, relative to its first value. */
  readonly residualTolerance?: number;
  readonly onProgress?: (steps: number, maxSpeed: number, residual: number) => void;
}

export interface JunctionCounts {
  readonly ni: number;
  readonly nj: number;
  readonly nkL: number;
  readonly nkM: number;
}

/** Cells on a level: 8 columns, 8 rows, 4 cells across block L and 8 across the main block on level 0. */
export function junctionCounts(level: number): JunctionCounts {
  const f = 2 ** level;
  return { ni: 8 * f, nj: 8 * f, nkL: 4 * f, nkM: 8 * f };
}

export interface ExactWedgeFlow {
  readonly free: Primitive3D;
  readonly post: Primitive3D;
  readonly beta: number;
}

export function exactWedgeFlow(): ExactWedgeFlow {
  const vInf = JUNCTION_MACH * Math.sqrt(GAMMA);
  const s = obliqueShock(JUNCTION_MACH, JUNCTION_DELTA, GAMMA);
  const v2 = Math.hypot(vInf * Math.cos(s.beta), (vInf * Math.sin(s.beta)) / s.densityRatio);
  return {
    free: { rho: 1, u: vInf, v: 0, w: 0, p: 1 },
    post: {
      rho: s.densityRatio,
      u: v2 * Math.cos(JUNCTION_DELTA),
      v: 0,
      w: v2 * Math.sin(JUNCTION_DELTA),
      p: s.pressureRatio,
    },
    beta: s.beta,
  };
}

export interface JunctionState {
  readonly counts: JunctionCounts;
  /** Shock height above the wedge at each fitted node (i, j), (ni + 1) (nj + 1) values (unused where not fitted). */
  readonly h: Float64Array;
  readonly blocks: Euler3D[];
  readonly dec: Decomposition;
  readonly fitted: FittedSide;
  readonly steps: number;
  readonly maxSpeed: number;
  readonly residual: number;
  readonly converged: boolean;
}

/** Is node (i, j) on the fitted surface? */
function fittedNode(kind: JunctionKind, c: JunctionCounts, i: number, j: number): boolean {
  if (kind === 'J1') return j <= c.nj / 2;
  if (kind === 'J2') return i <= c.ni / 2;
  return true;
}

/** Is face (i, j) (between nodes i .. i + 1, j .. j + 1) fitted? */
export function fittedFace(kind: JunctionKind, c: JunctionCounts, i: number, j: number): boolean {
  if (kind === 'J1') return j < c.nj / 2;
  if (kind === 'J2') return i < c.ni / 2;
  return true;
}

function xOf(c: JunctionCounts, i: number): number {
  return X0 + ((X1 - X0) * i) / c.ni;
}

function globalGrid(kind: JunctionKind, c: JunctionCounts, h: Float64Array): StructuredGrid3D {
  const nk = c.nkL + c.nkM;
  const n = (c.ni + 1) * (c.nj + 1) * (nk + 1);
  const c0 = new Float64Array(n);
  const c1 = new Float64Array(n);
  const c2 = new Float64Array(n);
  const tanD = Math.tan(JUNCTION_DELTA);
  for (let k = 0; k <= nk; k++)
    for (let j = 0; j <= c.nj; j++)
      for (let i = 0; i <= c.ni; i++) {
        const x = xOf(c, i);
        const zw = x * tanD;
        let z: number;
        if (fittedNode(kind, c, i, j)) {
          const zs = zw + h[i + (c.ni + 1) * j]!;
          z = k <= c.nkL ? zw + ((zs - zw) * k) / c.nkL : zs + ((Z_MAX - zs) * (k - c.nkL)) / c.nkM;
        } else z = zw + ((Z_MAX - zw) * k) / nk;
        const q = nodeIndex3D(c, i, j, k);
        c0[q] = x;
        c1[q] = j / c.nj;
        c2[q] = z;
      }
  return { ni: c.ni, nj: c.nj, nk, c0, c1, c2 };
}

function boxesFor(kind: JunctionKind, c: JunctionCounts): Box3D[] {
  const nk = c.nkL + c.nkM;
  if (kind === 'full')
    return [
      { i0: 0, i1: c.ni, j0: 0, j1: c.nj, k0: 0, k1: c.nkL },
      { i0: 0, i1: c.ni, j0: 0, j1: c.nj, k0: c.nkL, k1: nk },
    ];
  if (kind === 'J1') {
    const jJ = c.nj / 2;
    return [
      { i0: 0, i1: c.ni, j0: 0, j1: jJ, k0: 0, k1: c.nkL },
      { i0: 0, i1: c.ni, j0: 0, j1: jJ, k0: c.nkL, k1: nk },
      { i0: 0, i1: c.ni, j0: jJ, j1: c.nj, k0: 0, k1: nk },
    ];
  }
  const iD = c.ni / 2;
  return [
    { i0: 0, i1: iD, j0: 0, j1: c.nj, k0: 0, k1: c.nkL },
    { i0: 0, i1: iD, j0: 0, j1: c.nj, k0: c.nkL, k1: nk },
    { i0: iD, i1: c.ni, j0: 0, j1: c.nj, k0: 0, k1: nk },
  ];
}

/** The exact flow at a point: post-shock below the shock z = x tan(beta), the free stream above. */
function exactAt(exact: ExactWedgeFlow, x: number, z: number): Primitive3D {
  return z < x * Math.tan(exact.beta) ? exact.post : exact.free;
}

/**
 * The blocks for shock heights h, their cells from `cell` (global indices). Block 0 is L, 1 is M1, 2 (J1, J2)
 * is M2; L's kMax is the fitted shock (face states and fluxes set by the caller), M1's kMin its outer side.
 */
function buildBlocks(
  kind: JunctionKind,
  c: JunctionCounts,
  h: Float64Array,
  exact: ExactWedgeFlow,
  cell: (i: number, j: number, k: number) => Primitive3D,
  /** The decomposition of an earlier build (the topology does not change as the shock moves). */
  known?: Decomposition,
): { blocks: Euler3D[]; dec: Decomposition; grid: StructuredGrid3D } {
  const grid = globalGrid(kind, c, h);
  const boxes = boxesFor(kind, c);
  const dec = known
    ? { ...known, grids: known.boxes.map((x) => subGrid(grid, x)) }
    : decompose(grid, boxes, [[0, 1]]);
  const nk = grid.nk;
  // A cell's centroid in x and z, as the mean of its eight nodes (the inflow ghosts' only use of the metrics).
  const centroid = (i: number, j: number, k: number): [number, number] => {
    let x = 0;
    let z = 0;
    for (const a of [0, 1])
      for (const b of [0, 1])
        for (const d of [0, 1]) {
          const q = nodeIndex3D(grid, i + a, j + b, k + d);
          x += grid.c0[q]!;
          z += grid.c2[q]!;
        }
    return [x / 8, z / 8];
  };
  // The inflow plane: block L's ghost cells take the post-shock state, M1's the free stream (each block's
  // region of the exact flow), and the captured block M2's the exact flow at each ghost cell's centroid (the
  // first two columns mirrored).
  const blockOf = (i: number, j: number, k: number) =>
    boxes.findIndex((x) => i >= x.i0 && i < x.i1 && j >= x.j0 && j < x.j1 && k >= x.k0 && k < x.k1);
  const ghost = (g: number): Primitive3D[] => {
    const out: Primitive3D[] = [];
    for (let k = 0; k < nk; k++)
      for (let j = 0; j < c.nj; j++) {
        const b = blockOf(0, j, k);
        const [cx, cz] = b > 1 ? centroid(g, j, k) : [0, 0];
        out.push(b === 0 ? exact.post : b === 1 ? exact.free : exactAt(exact, 2 * X0 - cx, cz));
      }
    return out;
  };
  const global: Record<Side3D, BoundaryCondition3D> = {
    iMin: { kind: 'faceStates', layer0: ghost(0), layer1: ghost(1) },
    iMax: { kind: 'outflow' },
    jMin: { kind: 'wall' },
    jMax: { kind: 'wall' },
    kMin: { kind: 'wall' },
    kMax: { kind: 'inflow', state: exact.free },
  };
  const blocks = dec.grids.map((g, b) => {
    const bc = blockBoundaries(dec, b, global, grid, (side) => {
      const n = side[0] === 'k' ? g.ni * g.nj : 0;
      const states = Array.from({ length: n }, () => (b === 0 ? exact.post : exact.free));
      return { kind: 'faceStates', layer0: states, layer1: states };
    });
    const config: Euler3DConfig = {
      grid: g,
      geometry: 'planar',
      gamma: GAMMA,
      timeIntegrator: 'ssprk2',
      cfl: 0.8,
      timeStepping: 'local',
      boundaries: bc,
    };
    const e = new Euler3D(config);
    const x = dec.boxes[b]!;
    e.setCellPrimitives((i, j, k) => cell(i + x.i0, j + x.j0, k + x.k0));
    return e;
  });
  if (!known) Euler3D.checkShares(blocks, dec.shares);
  return { blocks, dec, grid };
}

/** A captured block's inflow ghost layers: the exact flow at each ghost cell's centroid (its first two columns mirrored). */
function capturedInflow(
  g: StructuredGrid3D,
  exact: ExactWedgeFlow,
): [Primitive3D[], Primitive3D[]] {
  const layer = (col: number) => {
    const out: Primitive3D[] = [];
    for (let k = 0; k < g.nk; k++)
      for (let j = 0; j < g.nj; j++) {
        let x = 0;
        let z = 0;
        for (const a of [0, 1])
          for (const b of [0, 1])
            for (const d of [0, 1]) {
              const q = nodeIndex3D(g, col + a, j + b, k + d);
              x += g.c0[q]!;
              z += g.c2[q]!;
            }
        out.push(exactAt(exact, 2 * X0 - x / 8, z / 8));
      }
    return out;
  };
  return [layer(0), layer(1)];
}

/** Run a junction problem (or 'full') to convergence. */
export function runJunction(options: JunctionOptions): JunctionState {
  const { kind } = options;
  const c = junctionCounts(options.level);
  const exact = exactWedgeFlow();
  const aFree = Math.sqrt(GAMMA);
  const tanD = Math.tan(JUNCTION_DELTA);
  const tanB = Math.tan(exact.beta);
  const h = new Float64Array((c.ni + 1) * (c.nj + 1));
  const displaced = options.displaced ?? 0;
  for (let j = 0; j <= c.nj; j++)
    for (let i = 0; i <= c.ni; i++) {
      const x = xOf(c, i);
      // The inflow plane's node stays exact; the others start displaced.
      h[i + (c.ni + 1) * j] = x * (tanB - tanD) * (1 + (i === 0 ? 0 : displaced));
    }
  // The start: the exact flow at each cell's centroid on the first grid.
  let built = buildBlocks(kind, c, h, exact, () => exact.free);
  {
    const m = computeMetrics3D(built.grid, 'planar');
    const start = (i: number, j: number, k: number) => {
      const q = cellIndex3D(m, i, j, k);
      // Block L's cells (and M2's below the shock) post-shock, by position.
      const inL = k < c.nkL && fittedFace(kind, c, i, j);
      return inL ? exact.post : exactAt(exact, m.centroid0[q]!, m.centroid2[q]!);
    };
    built = buildBlocks(kind, c, h, exact, start);
  }
  const speedTolerance = options.speedTolerance ?? 1e-12;
  const residualTolerance = options.residualTolerance ?? 1e-12;
  let steps = 0;
  let maxSpeed = Infinity;
  let residual = Infinity;
  let converged = false;
  let fitted!: FittedSide;
  const upstreamOf = (blocks: Euler3D[]) => (t: number) => {
    if (!options.breach) return exact.free;
    const L = blocks[0]!;
    const i = t % L.metrics.ni;
    const j = Math.floor(t / L.metrics.ni);
    return blocks[1]!.primitive(i, j, 0);
  };
  const applyBoundary = (blocks: Euler3D[]) => {
    fitted = fittedSide(blocks[0]!, 'kMax', upstreamOf(blocks));
    blocks[0]!.setFaceStates('kMax', fitted.states, fitted.states);
    blocks[0]!.setFaceFluxes('kMax', fitted.fluxes);
    if (options.breach) {
      // The main block's ghost cells across the fitted faces take the same (breached) upstream state.
      const up = Array.from({ length: fitted.states.length }, (_, t) => upstreamOf(blocks)(t));
      blocks[1]!.setFaceStates('kMin', up, up);
    }
  };
  const residualNorm = (blocks: Euler3D[], dec: Decomposition) => {
    Euler3D.fillLinkedGhosts(blocks, dec.links);
    let s = 0;
    let n = 0;
    for (const b of blocks) {
      const r = b.densityResidualNorm();
      const cells = b.metrics.ni * b.metrics.nj * b.metrics.nk;
      s += r * r * cells;
      n += cells;
    }
    return Math.sqrt(s / n);
  };
  // The residual's scale (as 0006's): the larger of the start's and the free stream's on the first grid; an
  // exact start's own residual is round-off.
  const reference = (() => {
    const free = buildBlocks(kind, c, h, exact, () => exact.free);
    applyBoundary(free.blocks);
    const rFree = residualNorm(free.blocks, free.dec);
    applyBoundary(built.blocks);
    return Math.max(rFree, residualNorm(built.blocks, built.dec));
  })();
  const LNI = built.blocks[0]!.metrics.ni;
  while (steps < options.maxSteps) {
    const { blocks, dec } = built;
    applyBoundary(blocks);
    Euler3D.iterateCoupled(blocks, dec.links, dec.shares, 1);
    steps++;
    applyBoundary(blocks);
    // Move the fitted nodes along their lines (z), each by the mean speed of its upstream faces.
    const L = blocks[0]!;
    const LNJ = L.metrics.nj;
    const faceAt = (i: number, j: number) => i + LNI * j;
    maxSpeed = 0;
    for (let t = 0; t < fitted.speeds.length; t++)
      maxSpeed = Math.max(maxSpeed, Math.abs(fitted.speeds[t]!) / aFree);
    const stepsPerMove = options.stepsPerMove ?? 1;
    const move = steps % stepsPerMove === 0;
    const next = Float64Array.from(h);
    for (let j = 0; move && j <= c.nj; j++)
      for (let i = 1; i <= c.ni; i++) {
        if (!fittedNode(kind, c, i, j)) continue;
        // Faces upstream of node (i, j): (i - 1, j - 1) and (i - 1, j), where fitted; at the wall and the
        // mirror face, the face's own mirror image (the same speed).
        const faces: number[] = [];
        for (const jj of [j - 1, j]) {
          if (jj < 0 || jj >= c.nj || i - 1 >= LNI || jj >= LNJ) continue;
          if (!fittedFace(kind, c, i - 1, jj)) continue;
          faces.push(faceAt(i - 1, jj));
        }
        if (faces.length === 0) continue;
        let w = 0;
        let nz = 0;
        for (const f of faces) {
          w += fitted.speeds[f]!;
          nz += fitted.normals[3 * f + 2]!;
        }
        w /= faces.length;
        nz /= faces.length;
        const f0 = faces[0]!;
        const ci = f0 % LNI;
        const cj = Math.floor(f0 / LNI);
        const cellState = L.primitive(ci, cj, L.metrics.nk - 1);
        const height = h[i + (c.ni + 1) * j]! / c.nkL;
        const dt =
          (0.5 * height) /
          (Math.hypot(cellState.u, cellState.v, cellState.w) +
            Math.sqrt((GAMMA * cellState.p) / cellState.rho));
        next[i + (c.ni + 1) * j] = h[i + (c.ni + 1) * j]! + (w * dt) / nz;
      }
    if (move) {
      h.set(next);
      // Move every block's nodes; every cell keeps its state (the fractions along each line are fixed).
      const grid = globalGrid(kind, c, h);
      built.blocks.forEach((e, b) => {
        const box = built.dec.boxes[b]!;
        const g = subGrid(grid, box);
        e.setGrid(g);
        // The captured block's inflow ghosts take the exact flow at their (moved) centroids.
        if (b > 1 && box.i0 === 0) e.setFaceStates('iMin', ...capturedInflow(g, exact));
      });
    }
    if (steps % 100 === 0 || maxSpeed < speedTolerance) {
      applyBoundary(built.blocks);
      const r = residualNorm(built.blocks, built.dec);
      residual = r / reference;
      options.onProgress?.(steps, maxSpeed, residual);
      if (maxSpeed < speedTolerance && residual < residualTolerance) {
        converged = true;
        break;
      }
    }
  }
  applyBoundary(built.blocks);
  return {
    counts: c,
    h,
    blocks: built.blocks,
    dec: built.dec,
    fitted,
    steps,
    maxSpeed,
    residual,
    converged,
  };
}

export interface JunctionMeasures {
  /** Over the fitted faces more than k cells from the junction: the largest shock-angle error (rad) ... */
  readonly awayAngle: number;
  /** ... and the largest post-shock state error (relative to the free stream's density, sound speed, pressure). */
  readonly awayState: number;
  readonly awayFaces: number;
  /** Over the fitted faces within k cells of it: their integrated pressure force's error, relative. */
  readonly nearForce: number;
  readonly nearFaces: number;
  /**
   * The largest distance from the junction, in cells, of a main-block cell second or third upstream of a fitted
   * face (M1's k = 1, 2) that differs from the free stream by more than `tolerance`; -1 if none.
   */
  readonly upstreamReach: number;
}

/** The junction tests' measures, k = 4 cells (4.0). */
export function junctionMeasures(
  s: JunctionState,
  kind: JunctionKind,
  tolerance: number,
  k = 4,
): JunctionMeasures {
  const exact = exactWedgeFlow();
  const c = s.counts;
  const L = s.blocks[0]!;
  const M1 = s.blocks[1]!;
  const LNI = L.metrics.ni;
  const a = Math.sqrt(GAMMA);
  const nExact: [number, number, number] = [-Math.sin(exact.beta), 0, Math.cos(exact.beta)];
  const distance = (i: number, j: number): number => {
    if (kind === 'J1') return c.nj / 2 - 1 - j;
    if (kind === 'J2') return c.ni / 2 - 1 - i;
    return Infinity;
  };
  let awayAngle = 0;
  let awayState = 0;
  let awayFaces = 0;
  let nearFaces = 0;
  const force = [0, 0, 0];
  const forceExact = [0, 0, 0];
  for (let t = 0; t < s.fitted.speeds.length; t++) {
    const i = t % LNI;
    const j = Math.floor(t / LNI);
    const n = [
      s.fitted.normals[3 * t]!,
      s.fitted.normals[3 * t + 1]!,
      s.fitted.normals[3 * t + 2]!,
    ];
    const w = s.fitted.states[t]!;
    if (distance(i, j) >= k) {
      const cross = Math.hypot(
        n[1]! * nExact[2] - n[2]! * nExact[1],
        n[2]! * nExact[0] - n[0]! * nExact[2],
        n[0]! * nExact[1] - n[1]! * nExact[0],
      );
      awayAngle = Math.max(awayAngle, Math.asin(Math.min(1, cross)));
      const e = exact.post;
      awayState = Math.max(
        awayState,
        Math.abs(w.rho - e.rho),
        Math.abs(w.u - e.u) / a,
        Math.abs(w.v - e.v) / a,
        Math.abs(w.w - e.w) / a,
        Math.abs(w.p - e.p),
      );
      awayFaces++;
    } else {
      const area = s.fitted.areas[t]!;
      for (let d = 0; d < 3; d++) {
        force[d] = force[d]! + w.p * n[d]! * area;
        forceExact[d] = forceExact[d]! + exact.post.p * n[d]! * area;
      }
      nearFaces++;
    }
  }
  const nearForce =
    nearFaces === 0
      ? 0
      : Math.hypot(
          force[0]! - forceExact[0]!,
          force[1]! - forceExact[1]!,
          force[2]! - forceExact[2]!,
        ) / Math.hypot(forceExact[0]!, forceExact[1]!, forceExact[2]!);
  let upstreamReach = -1;
  for (let j = 0; j < M1.metrics.nj; j++)
    for (let i = 0; i < M1.metrics.ni; i++)
      for (const kk of [1, 2]) {
        const p = M1.primitive(i, j, kk);
        const f = exact.free;
        const dev = Math.max(Math.abs(p.rho - f.rho), Math.abs(p.p - f.p));
        if (dev > tolerance) upstreamReach = Math.max(upstreamReach, distance(i, j));
      }
  return { awayAngle, awayState, awayFaces, nearForce, nearFaces, upstreamReach };
}
