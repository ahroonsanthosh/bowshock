/**
 * Steady boundary shock fitting: the bow shock is the outer boundary of
 * the grid, and the flow just behind it is the exact Rankine-Hugoniot
 * state for the shock's current shape, instead of a shock captured across
 * cells, whose error depends on where it falls within a cell (design:
 * docs/design/0004-grids.md).
 *
 * The method is that of G. Moretti and M. J. Abbett, "A time-dependent
 * computational method for blunt body flows", AIAA J. 4 (1966) 2136, in a
 * finite-volume form (M. D. Salas, "Shock fitting method for complicated
 * two-dimensional supersonic flows", AIAA J. 14 (1976) 583):
 *
 * - The shock is a curve of nodes, each on a fixed straight grid line from
 *   the body, at a distance h along it.
 * - On each shock face, of outward normal n, the shock's speed W along n
 *   follows from the one characteristic that reaches it from behind, the
 *   u_n + a wave, whose compatibility relation, dp + rho a du_n = 0, links
 *   the post-shock state to the flow in the adjacent cell:
 *     p_s(W) + rho a u_n,s(W) = p_c + rho a u_n,c,
 *   with p_c and u_n,c extrapolated from the two cells below the face.
 *   Both terms on the left increase with W, so the root is unique.
 * - The flux through the face is the physical flux of that post-shock
 *   state; the post-shock state also fills the ghost cells.
 * - Each node moves along its line by W dt / (n . line), taking W from
 *   the face on the axis side: along the shock, information travels away
 *   from the axis. The axis node keeps the shock normal to the axis. The
 *   grid is rebuilt and the flow interpolated along the lines.
 *
 * At convergence W = 0 on every face, the post-shock state satisfies the
 * Rankine-Hugoniot conditions exactly, and the motion terms vanish, so the
 * steady solution does not depend on the path to it.
 */

import { Euler2D, type Euler2DConfig } from '../engine-cpu/euler2d';
import { type GridLine } from '../grid/blunt-grid';
import { nodeIndex, type StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';

/** The state behind a normal shock moving along n, and its speed. */
export interface ShockState {
  readonly state: Primitive2D;
  /** Speed of the shock along n (outward, away from the body). */
  readonly speed: number;
  /** Normal velocity of the post-shock flow along n, in the lab frame. */
  readonly normalVelocity: number;
}

/**
 * Rankine-Hugoniot state behind a shock of outward normal (nx, ny) that
 * the free stream meets at a relative normal Mach number M >= 1. The
 * free stream's tangential velocity is kept; the shock moves at
 * W = M a - q_n, q_n being the free stream's speed into the shock.
 */
export function shockState(
  free: Primitive2D,
  gamma: number,
  mach: number,
  nx: number,
  ny: number,
): ShockState {
  const a = Math.sqrt((gamma * free.p) / free.rho);
  const vn = free.u * nx + free.v * ny;
  const speed = mach * a + vn;
  const m2 = mach * mach;
  const densityRatio = ((gamma + 1) * m2) / ((gamma - 1) * m2 + 2);
  const pressureRatio = 1 + ((2 * gamma) / (gamma + 1)) * (m2 - 1);
  // Relative normal speed into the shock is M a ahead of it and M a /
  // (density ratio) behind; behind it in the lab frame, along n:
  const normalVelocity = speed - (mach * a) / densityRatio;
  return {
    state: {
      rho: free.rho * densityRatio,
      u: free.u + (normalVelocity - vn) * nx,
      v: free.v + (normalVelocity - vn) * ny,
      p: free.p * pressureRatio,
    },
    speed,
    normalVelocity,
  };
}

/**
 * The shock on a face of outward normal (nx, ny) consistent with the flow
 * behind it: the root of the u_n + a compatibility relation, linearised
 * about the adjacent cell (density rho, sound speed a, and the pressure and
 * normal velocity extrapolated to the face). Where no shock of normal Mach
 * number above 1 satisfies it, the shock is a Mach wave (M = 1).
 */
export function compatibleShock(
  free: Primitive2D,
  gamma: number,
  nx: number,
  ny: number,
  behind: { rho: number; a: number; p: number; un: number },
): ShockState {
  const impedance = behind.rho * behind.a;
  const target = behind.p + impedance * behind.un;
  const mismatch = (mach: number) => {
    const s = shockState(free, gamma, mach, nx, ny);
    return s.state.p + impedance * s.normalVelocity - target;
  };
  let mach = 1;
  if (mismatch(1) < 0) {
    let low = 1;
    let high = 2;
    while (mismatch(high) < 0) high *= 2;
    for (let k = 0; k < 100 && high - low > 1e-15 * high; k++) {
      const mid = 0.5 * (low + high);
      if (mismatch(mid) < 0) low = mid;
      else high = mid;
    }
    mach = 0.5 * (low + high);
  }
  return shockState(free, gamma, mach, nx, ny);
}

export interface ShockFitOptions {
  /** The straight grid lines from the body, axis line first. */
  readonly lines: readonly GridLine[];
  /** Initial distance of the shock along each line. */
  readonly heights: readonly number[];
  readonly nj: number;
  /** Builds the grid on the lines for given shock heights (ungated while fitting). */
  readonly gridFor: (heights: readonly number[], gated: boolean) => StructuredGrid;
  /** Engine configuration for a grid; its jMax boundary must be 'faceStates'. */
  readonly configFor: (grid: StructuredGrid, shockStates: readonly Primitive2D[]) => Euler2DConfig;
  /** Initial flow on the first grid. */
  readonly initial: (i: number, j: number) => Primitive2D;
  readonly freeStream: Primitive2D;
  /**
   * The first shock node: on the axis ahead of a blunt nose the shock is
   * normal to the axis ('symmetry'); at the start of the domain behind a
   * sharp tip it is held where the inflow data put it ('fixed').
   */
  readonly firstNode: 'symmetry' | 'fixed';
  /** Stop when every shock face moves slower than this times the free-stream sound speed. */
  readonly speedTolerance: number;
  /**
   * ... and the density residual has fallen below this, relative to the
   * larger of the starting flow's and the free stream's on the first grid.
   */
  readonly residualTolerance: number;
  readonly maxIterations: number;
  /**
   * Flow steps between moves of the shock (default 1). The shock boundary
   * is updated at every step, but the shock moves one step's worth, W dt,
   * only once per this many steps, so it settles that many times slower;
   * the converged state does not depend on it (the shock stops moving
   * there), and the grid is rebuilt less often. Moving it by the steps'
   * sum instead, or holding the boundary between moves, is unstable.
   */
  readonly stepsPerMove?: number;
  /** Called every so often with the progress. */
  readonly onProgress?: (iterations: number, maxSpeed: number, residual: number) => void;
  /** SNAPSHOT ONLY (checkpoints): the residual the tolerance is relative to, when resuming. */
  readonly initialResidual?: number;
  /** SNAPSHOT ONLY (checkpoints): called at every check with the state; true stops the fit. */
  readonly onCheck?: (state: {
    readonly iterations: number;
    readonly solver: Euler2D;
    readonly heights: readonly number[];
    readonly initialResidual: number;
  }) => boolean | void;
}

export interface ShockFit {
  readonly solver: Euler2D;
  readonly grid: StructuredGrid;
  readonly heights: readonly number[];
  /** Largest |W| / a over the shock faces at the end. */
  readonly maxSpeed: number;
  /** Density residual at the end, relative to the reference (see residualTolerance). */
  readonly residual: number;
  readonly iterations: number;
  readonly converged: boolean;
}

/** Steps between progress reports and residual checks. */
const CHECK_EVERY = 100;

export function fitShock(options: ShockFitOptions): ShockFit {
  const { lines, nj, freeStream: free } = options;
  const gamma = options.configFor(options.gridFor(options.heights, false), []).gamma;
  const aFree = Math.sqrt((gamma * free.p) / free.rho);
  const ni = lines.length - 1;
  const stepsPerMove = options.stepsPerMove ?? 1;

  const remap = (old: Euler2D, oldGrid: StructuredGrid, newGrid: StructuredGrid) =>
    remapAlongLines(lines, nj, (i, j) => old.primitive(i, j), oldGrid, newGrid);

  /** The shock on every jMax face for the current flow, and the flux through it. */
  const shockBoundary = (s: Euler2D) => {
    const m = s.metrics;
    const states: Primitive2D[] = [];
    const speeds: number[] = [];
    const fluxes = new Float64Array(4 * ni);
    for (let i = 0; i < ni; i++) {
      const f = i + nj * ni;
      const nx = m.jFaces.nx[f]!;
      const ny = m.jFaces.ny[f]!;
      const c1 = s.primitive(i, nj - 1);
      const c2 = s.primitive(i, nj - 2);
      const shock = compatibleShock(free, gamma, nx, ny, {
        rho: c1.rho,
        a: Math.sqrt((gamma * c1.p) / c1.rho),
        p: 1.5 * c1.p - 0.5 * c2.p,
        un: 1.5 * (c1.u * nx + c1.v * ny) - 0.5 * (c2.u * nx + c2.v * ny),
      });
      const w = shock.state;
      states.push(w);
      speeds.push(shock.speed);
      // The flux of the post-shock state through the face, held fixed for
      // the step: the shock's motion is applied by regridding and remapping.
      const energy = w.p / (gamma - 1) + 0.5 * w.rho * (w.u * w.u + w.v * w.v);
      const un = w.u * nx + w.v * ny;
      fluxes[4 * i] = w.rho * un;
      fluxes[4 * i + 1] = w.rho * w.u * un + w.p * nx;
      fluxes[4 * i + 2] = w.rho * w.v * un + w.p * ny;
      fluxes[4 * i + 3] = un * (energy + w.p);
    }
    return { states, speeds, fluxes, metrics: m };
  };
  const applyBoundary = (s: Euler2D) => {
    const b = shockBoundary(s);
    s.setFaceStates('jMax', b.states);
    s.setFaceFluxes('jMax', b.fluxes);
    return b;
  };

  let heights = [...options.heights];
  let grid = options.gridFor(heights, false);
  let solver = new Euler2D(
    options.configFor(
      grid,
      Array.from({ length: ni }, () => free),
    ),
  );
  solver.setCellPrimitives(options.initial);
  applyBoundary(solver);
  // The residual is measured against that of the free stream on the first
  // grid, a scale fixed by the problem: the starting flow's own residual
  // can be tiny when it is already close to the answer.
  const reference = new Euler2D(
    options.configFor(
      grid,
      Array.from({ length: ni }, () => free),
    ),
  );
  reference.setInitialCondition(() => free);
  applyBoundary(reference);
  const initialResidual =
    options.initialResidual ?? Math.max(solver.densityResidualNorm(), reference.densityResidualNorm());
  let maxSpeed = Infinity;
  let residual = Infinity;
  let iterations = 0;
  let converged = false;

  while (iterations < options.maxIterations) {
    // The shock boundary follows the flow at every step; the shock itself
    // moves once every stepsPerMove steps, by the last step's speed.
    let boundary = applyBoundary(solver);
    for (let step = 1; step < stepsPerMove; step++) {
      solver.iterate(1);
      boundary = applyBoundary(solver);
    }
    const { states, speeds, metrics } = boundary;
    solver.iterate(1);
    iterations += stepsPerMove;

    maxSpeed = 0;
    const next = [...heights];
    for (let k = 1; k <= ni; k++) {
      // Upwind along the shock: node k takes the face on its axis side.
      const f = k - 1;
      const w = speeds[f]!;
      maxSpeed = Math.max(maxSpeed, Math.abs(w) / aFree);
      const nx = metrics.jFaces.nx[f + nj * ni]!;
      const ny = metrics.jFaces.ny[f + nj * ni]!;
      const l = lines[k]!;
      const cell = solver.primitive(Math.min(k, ni - 1), nj - 1);
      const top = nodeIndex(grid, k, nj);
      const below = nodeIndex(grid, k, nj - 1);
      const height = Math.hypot(grid.x[top]! - grid.x[below]!, grid.y[top]! - grid.y[below]!);
      // A pseudo-time step of half a cell height per signal speed.
      const dt =
        (0.5 * height) / (Math.hypot(cell.u, cell.v) + Math.sqrt((gamma * cell.p) / cell.rho));
      next[k] = heights[k]! + (w * dt) / (l.dx * nx + l.dy * ny);
    }
    maxSpeed = Math.max(maxSpeed, Math.abs(speeds[0]!) / aFree);
    // The axis: the shock is normal to it, on the parabola x = x0 + c y^2
    // through the next two nodes.
    if (options.firstNode === 'symmetry') {
      const node = (k: number) =>
        [lines[k]!.x + next[k]! * lines[k]!.dx, lines[k]!.y + next[k]! * lines[k]!.dy] as const;
      const [x1, y1] = node(1);
      const [x2, y2] = node(2);
      const c = (x2 - x1) / (y2 * y2 - y1 * y1);
      next[0] = (x1 - c * y1 * y1 - lines[0]!.x) / lines[0]!.dx;
    }
    const oldGrid = grid;
    heights = next;
    grid = options.gridFor(heights, false);
    const moved = new Euler2D(options.configFor(grid, states));
    moved.setCellPrimitives(remap(solver, oldGrid, grid));
    solver = moved;

    if (iterations % CHECK_EVERY < stepsPerMove || maxSpeed < options.speedTolerance) {
      applyBoundary(solver);
      residual = solver.densityResidualNorm() / initialResidual;
      options.onProgress?.(iterations, maxSpeed, residual);
      if (maxSpeed < options.speedTolerance && residual < options.residualTolerance) {
        converged = true;
        break;
      }
      if (options.onCheck?.({ iterations, solver, heights, initialResidual }) === true) break;
    }
  }
  applyBoundary(solver);
  return { solver, grid, heights, maxSpeed, residual, iterations, converged };
}

/**
 * The flow `old` on `oldGrid`, interpolated along the lines to the cells of
 * `newGrid` (both grids on `lines`, with nj cells along each): linear in
 * the primitive variables between the old cell centres of each column,
 * held at the end cells beyond them. Distances along a column are the mean
 * of its two lines'.
 */
export function remapAlongLines(
  lines: readonly GridLine[],
  nj: number,
  old: (i: number, j: number) => Primitive2D,
  oldGrid: StructuredGrid,
  newGrid: StructuredGrid,
): (i: number, j: number) => Primitive2D {
  const along = (g: StructuredGrid, i: number, j: number) => {
    const l = lines[i]!;
    const k = nodeIndex(g, i, j);
    return (g.x[k]! - l.x) * l.dx + (g.y[k]! - l.y) * l.dy;
  };
  // Distance along the two lines bounding cell column i, at node row j.
  const columnAlong = (g: StructuredGrid, i: number, j: number) =>
    0.5 * (along(g, i, j) + along(g, i + 1, j));
  return (i, j) => {
    const d = 0.5 * (columnAlong(newGrid, i, j) + columnAlong(newGrid, i, j + 1));
    const centre = (jj: number) =>
      0.5 * (columnAlong(oldGrid, i, jj) + columnAlong(oldGrid, i, jj + 1));
    let jj = 0;
    while (jj < nj - 2 && centre(jj + 1) < d) jj++;
    const t = Math.min(Math.max((d - centre(jj)) / (centre(jj + 1) - centre(jj)), 0), 1);
    const a = old(i, jj);
    const b = old(i, jj + 1);
    return {
      rho: a.rho + t * (b.rho - a.rho),
      u: a.u + t * (b.u - a.u),
      v: a.v + t * (b.v - a.v),
      p: a.p + t * (b.p - a.p),
    };
  };
}

/**
 * Initial shock heights along the lines from a captured solution: on each
 * line, the outer face of the outermost cell whose pressure has risen by
 * more than 5% of that column's peak rise (the outer edge of the captured
 * shock), smoothed along the shock (mirrored at the axis). The fit then
 * moves the shock to where the jump conditions put it.
 */
export function capturedShockHeights(
  captured: Euler2D,
  grid: StructuredGrid,
  lines: readonly GridLine[],
  freeStream: Primitive2D,
): number[] {
  const { ni, nj } = grid;
  const heights = lines.map((l, i) => {
    const c = Math.min(i, ni - 1);
    let peak = freeStream.p;
    for (let j = 0; j < nj; j++) peak = Math.max(peak, captured.primitive(c, j).p);
    const threshold = Math.max(0.05 * (peak - freeStream.p), 1e-4 * freeStream.p);
    let top = 0;
    for (let j = 0; j < nj; j++) {
      if (captured.primitive(c, j).p - freeStream.p > threshold) top = j;
    }
    const k = nodeIndex(grid, i, top + 1);
    return (grid.x[k]! - l.x) * l.dx + (grid.y[k]! - l.y) * l.dy;
  });
  for (let pass = 0; pass < SMOOTHING_PASSES; pass++) {
    const copy = [...heights];
    const n = heights.length - 1;
    heights[0] = 0.5 * (copy[0]! + copy[1]!);
    for (let i = 1; i < n; i++)
      heights[i] = 0.25 * copy[i - 1]! + 0.5 * copy[i]! + 0.25 * copy[i + 1]!;
    heights[n] = 0.5 * (copy[n]! + copy[n - 1]!);
  }
  return heights;
}

/** Passes of 1-2-1 smoothing of the initial shock, which a captured solution leaves stepped. */
const SMOOTHING_PASSES = 20;
