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
  readonly edge: 'rounded';
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

export function edgeStrip(o: EdgeStripOptions): EdgeStrip {
  const { mach, gamma } = o;
  const b = billigCylinder(mach);
  // The plate: past the sonic line's lateral reach (the shock's sonic point lies about that far out) and at
  // least 8 half-thicknesses.
  const plate = o.plateLength ?? Math.max(8, 2 * b.vertexRadius * 0.6);
  const body: Body = {
    nose: { shape: { kind: 'ellipsoid' }, length: 1, baseRadius: 1 },
    cylinderLength: plate,
  };
  const free: Primitive2D = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
  const base = bluntBodyGrid(body, {
    nj: o.nj,
    mach,
    gated: false,
    outerStandoff: 2 * b.standoff,
    outerArcRadius: 2 * b.vertexRadius,
  });
  // The captured start on the base grid.
  const captured = new Euler2D(config(base.grid, gamma, { kind: 'inflow', state: free }));
  captured.setInitialCondition(() => free);
  captured.iterate(o.capturedSteps ?? 4000);
  const heights0 = capturedShockHeights(captured, base.grid, base.lines, free);
  const refined =
    o.refinement === 1
      ? base
      : bluntBodyGrid(body, {
          nj: o.nj,
          refinement: o.refinement,
          mach,
          gated: false,
          outerStandoff: 2 * b.standoff,
          outerArcRadius: 2 * b.vertexRadius,
        });
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
      sonicPoint = { x: 0.5 * (g.x[a]! + g.x[c]!) + 1, y: 0.5 * (g.y[a]! + g.y[c]!) };
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
