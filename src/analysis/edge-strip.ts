/**
 * The 2D strip of a fin's blunt leading edge (docs/design/0021-3d-euler-fins.md 3.4 and rung (e0) of 4.4): the
 * planar flow over the edge's section in the plane normal to the edge, at the edge's normal Mach number, with
 * the bow shock fitted as the outer boundary (0006's method, src/solver/shock-fitting.ts). Exact inviscid flow
 * of an infinite swept edge (the independence principle); block L's start and, where it applies, its check.
 *
 * Lengths are in the edge's half-thickness r (the plate is 2 r thick). The rounded edge is a half-circle of
 * radius r followed by the plate: in the normal plane, the profile of a hemisphere-cylinder, so the blunt
 * nose's C grid (src/grid/blunt-grid.ts) serves, with its outer boundary placed from Billig's correlation for
 * cylinders (whose shocks stand about 2.7 times farther off than a sphere's, and are far flatter). The first
 * grid line is the stagnation line, a plane of symmetry (a wall); the solve is captured from the free stream,
 * then the shock fitted, as for blunt noses (src/analysis/fitted-flow.ts), in planar geometry.
 *
 * Measured from the fitted solution: the standoff on the stagnation line; the sonic point on the shock (where
 * the post-shock flow becomes supersonic); y*, the sonic line's lateral reach (the largest distance from the
 * midplane of a subsonic cell); and the shock's heights along the lines (block L's start).
 */

import { Euler2D, type Euler2DConfig } from '../engine-cpu/euler2d';
import type { Body } from '../geometry/body';
import { bluntBodyGrid, gridOnLines, withFixedFractions } from '../grid/blunt-grid';
import { nodeIndex, type StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';
import { capturedShockHeights, fitShock, type ShockFit } from '../solver/shock-fitting';

export interface EdgeStripOptions {
  readonly edge: 'rounded' | 'square';
  /** The edge's normal Mach number. */
  readonly mach: number;
  readonly gamma: number;
  /** Cells from the edge to the shock on the base grid. */
  readonly nj: number;
  readonly refinement: number;
  /** Plate solved behind the edge, in half-thicknesses (default: past the sonic reach). */
  readonly plateLength?: number;
  readonly capturedSteps?: number;
  readonly maxIterations: number;
  readonly onProgress?: (iterations: number, maxSpeed: number, residual: number) => void;
  /** 0006's stepsPerMove (default 1): the shock settles that many times slower; the converged state is the same. */
  readonly stepsPerMove?: number;
}

export interface EdgeStrip {
  readonly fit: ShockFit;
  readonly lines: ReturnType<typeof withFixedFractions>;
  /** Standoff of the shock on the stagnation line, in half-thicknesses. */
  readonly standoff: number;
  /** The sonic point on the shock: its x (from the edge's foremost point) and y, in half-thicknesses. */
  readonly sonicPoint: { readonly x: number; readonly y: number } | null;
  /** The sonic line's lateral reach from the midplane, in half-thicknesses. */
  readonly yStar: number;
  /** The plate solved behind the edge. */
  readonly plateLength: number;
}

/** Billig's cylinder correlation: standoff and shock radius at the vertex, over the edge's radius. */
export function billigCylinder(mach: number): { standoff: number; vertexRadius: number } {
  return {
    standoff: 0.386 * Math.exp(4.67 / (mach * mach)),
    vertexRadius: 1.386 * Math.exp(1.8 / (mach - 1) ** 0.75),
  };
}

function config(
  grid: StructuredGrid,
  gamma: number,
  jMax: Euler2DConfig['boundaries']['jMax'],
): Euler2DConfig {
  return {
    grid,
    geometry: 'planar',
    gamma,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'wall' },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax,
    },
  };
}

/**
 * The outer boundary of the captured start, as the blunt nose's (src/grid/blunt-grid.ts): an arc of radius
 * twice Billig's shock radius at the vertex, a multiple of Billig's standoff ahead of the edge, continued by a line at
 * the angle halfway between the normal shock and the Mach angle. Returns x at height y.
 */
function outerBoundary(mach: number, standoffFactor: number): (y: number) => number {
  const b = billigCylinder(mach);
  const standoff = standoffFactor * b.standoff;
  const arc = 2 * b.vertexRadius;
  const angle = (Math.PI / 2 + Math.asin(1 / mach)) / 2;
  const centre = arc - standoff;
  const yJoin = arc * Math.cos(angle);
  const xJoin = centre - arc * Math.sin(angle);
  return (y) =>
    y <= yJoin ? centre - Math.sqrt(arc * arc - y * y) : xJoin + (y - yJoin) / Math.tan(angle);
}

/** Lines per refinement: across the square edge's half front face, and in its corner's fan (2.10's L0 counts). */
const SQUARE_FRONT = 8;
const SQUARE_FAN = 12;

/**
 * The strip's grid on the base lines (refinement 1) or refined ones (every coarser line kept): the rounded
 * edge's from the blunt C grid; the square edge's from lines of its own: horizontal from the front face (y from
 * the midplane to the corner), a fan at the corner (from upstream to normal to the plate; the corner a line of
 * nodes, its faces of zero length, as at an axis), and normal to the plate behind it, spaced by an exponential
 * map of a parameter so that refined families keep every coarser line.
 */
function edgeGrid(
  edge: 'rounded' | 'square',
  plate: number,
  mach: number,
  nj: number,
  refinement: number,
) {
  const b = billigCylinder(mach);
  if (edge === 'rounded') {
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 1, baseRadius: 1 },
      cylinderLength: plate,
    };
    return bluntBodyGrid(body, {
      nj,
      refinement,
      mach,
      gated: false,
      outerStandoff: 2 * b.standoff,
      outerArcRadius: 2 * b.vertexRadius,
    });
  }
  // A square face's shock stands about twice as far off as a cylinder's: the outer boundary twice as far again.
  const outer = outerBoundary(mach, 4);
  // Distance from (x, y) along (dx, dy) to the outer boundary.
  const reach = (x: number, y: number, dx: number, dy: number) => {
    const outside = (d: number) => x + d * dx - outer(y + d * dy) <= 0;
    let hi = 1;
    while (!outside(hi)) hi *= 2;
    let lo = 0;
    for (let k = 0; k < 60; k++) {
      const mid = 0.5 * (lo + hi);
      if (outside(mid)) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  const r = refinement;
  const lines: { x: number; y: number; dx: number; dy: number; h: number }[] = [];
  const nf = SQUARE_FRONT * r;
  for (let i = 0; i <= nf; i++)
    lines.push({ x: 0, y: i / nf, dx: -1, dy: 0, h: reach(0, i / nf, -1, 0) });
  const nc = SQUARE_FAN * r;
  for (let i = 1; i <= nc; i++) {
    const a = Math.PI - (Math.PI / 2) * (i / nc);
    lines.push({
      x: 0,
      y: 1,
      dx: Math.cos(a),
      dy: Math.sin(a),
      h: reach(0, 1, Math.cos(a), Math.sin(a)),
    });
  }
  // Behind the corner: x = plate (e^(beta s) - 1) / (e^beta - 1), the first cell on the base family about the
  // fan's spacing out at the shock (its angle step times twice Billig's standoff), so that cells do not jump
  // in size where the fan meets the plate's lines (the front face's spacing, 1 / SQUARE_FRONT, made the coarse
  // fit unstable); the base family's count from the plate's length.
  const first = (Math.PI / 2 / SQUARE_FAN) * 2 * b.standoff;
  const np0 = Math.max(8, Math.ceil(Math.log(1 + plate / first) * 4));
  let beta = 1;
  for (let it = 0; it < 200; it++) {
    const f = (plate * Math.expm1(beta / np0)) / Math.expm1(beta) - first;
    beta = f > 0 ? beta * 1.05 : beta / 1.03;
  }
  const np = np0 * r;
  for (let i = 1; i <= np; i++) {
    const x = (plate * Math.expm1((beta * i) / np)) / Math.expm1(beta);
    lines.push({ x, y: 1, dx: 0, dy: 1, h: reach(x, 1, 0, 1) });
  }
  const grid = gridOnLines(
    lines,
    lines.map((l) => l.h),
    nj * r,
    1,
    false,
  );
  return { grid, lines };
}

export function edgeStrip(o: EdgeStripOptions): EdgeStrip {
  const { mach, gamma } = o;
  const b = billigCylinder(mach);
  // The plate: past the sonic line's lateral reach (the shock's sonic point lies about that far out) and at
  // least 8 half-thicknesses.
  const plate = o.plateLength ?? Math.max(8, 2 * b.vertexRadius * 0.6);
  const free: Primitive2D = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
  const base = edgeGrid(o.edge, plate, mach, o.nj, 1);
  // The captured start on the base grid.
  const captured = new Euler2D(config(base.grid, gamma, { kind: 'inflow', state: free }));
  captured.setInitialCondition(() => free);
  captured.iterate(o.capturedSteps ?? 4000);
  const heights0 = capturedShockHeights(captured, base.grid, base.lines, free);
  const refined = o.refinement === 1 ? base : edgeGrid(o.edge, plate, mach, o.nj, o.refinement);
  // Heights on the refined lines: linear in the line index between the base lines (as bluntFitFamily).
  const r = o.refinement;
  const heights: number[] = [];
  for (let k = 0; k < base.lines.length - 1; k++)
    for (let m = 0; m < r; m++)
      heights.push(heights0[k]! * (1 - m / r) + heights0[k + 1]! * (m / r));
  heights.push(heights0[heights0.length - 1]!);
  const nj = o.nj * r;
  const lines = withFixedFractions(
    refined.lines.map((l, i) => ({ ...l, h: heights[i]! })),
    nj,
    1,
  );
  // Each fitted cell starts from the captured cell at the same fraction of the shock layer, on its base column.
  const start = (i: number, j: number): Primitive2D => {
    const column = Math.floor(i / r);
    const frac = (j + 0.5) / nj;
    const target = frac * heights0[column]!;
    const l = base.lines[column]!;
    let jj = 0;
    for (; jj < base.grid.nj - 1; jj++) {
      const q = nodeIndex(base.grid, column, jj + 1);
      const d = (base.grid.x[q]! - l.x) * l.dx + (base.grid.y[q]! - l.y) * l.dy;
      if (d > target) break;
    }
    return captured.primitive(Math.min(column, base.grid.ni - 1), jj);
  };
  const fit = fitShock({
    lines,
    heights,
    nj,
    gridFor: (h, gated) => gridOnLines(lines, h, nj, 1, gated),
    configFor: (g, states) =>
      config(g, gamma, {
        kind: 'faceStates',
        states: states.length > 0 ? states : Array.from({ length: g.ni }, () => free),
      }),
    initial: start,
    freeStream: free,
    firstNode: 'symmetry',
    speedTolerance: 1e-12,
    residualTolerance: 1e-12,
    maxIterations: o.maxIterations,
    ...(o.onProgress ? { onProgress: o.onProgress } : {}),
    ...(o.stepsPerMove ? { stepsPerMove: o.stepsPerMove } : {}),
  });
  // Measures.
  const g = fit.grid;
  const top = (i: number) => nodeIndex(g, i, g.nj);
  const standoff = -g.x[top(0)]!;
  const machOf = (w: Primitive2D) => Math.hypot(w.u, w.v) / Math.sqrt((gamma * w.p) / w.rho);
  const shockStates = fit.solver.faceStatesOf('jMax') ?? [];
  let sonicPoint: EdgeStrip['sonicPoint'] = null;
  for (let i = 0; i < shockStates.length; i++) {
    if (machOf(shockStates[i]!) >= 1) {
      const a = top(i);
      const c = top(i + 1);
      sonicPoint = { x: 0.5 * (g.x[a]! + g.x[c]!), y: 0.5 * (g.y[a]! + g.y[c]!) };
      break;
    }
  }
  let yStar = 0;
  for (let j = 0; j < g.nj; j++)
    for (let i = 0; i < g.ni; i++) {
      if (machOf(fit.solver.primitive(i, j)) < 1) {
        const q = nodeIndex(g, i + 1, j + 1);
        yStar = Math.max(yStar, g.y[q]!);
      }
    }
  return { fit, lines, standoff, sonicPoint, yStar, plateLength: plate };
}
