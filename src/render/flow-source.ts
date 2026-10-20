/**
 * Flows the flow view can draw, from the solvers that compute them: a
 * fitted-shock fit as it runs (src/engine-gpu/shock-fitting-gpu.ts), or
 * any GPU solver on a fixed grid. Each gives the view the solver's own
 * buffers; nothing is copied.
 */

import type { LiveFit } from '../engine-gpu/shock-fitting-gpu';
import type { GridLine } from '../grid/blunt-grid';
import type { Geometry, StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';
import type { FlowSource } from './flow-renderer';
import type { Bounds } from './view';

/** The extent of the grid on these lines at these heights: each line from its body point to its end. */
export function boundsOfLines(lines: readonly GridLine[], heights: readonly number[]): Bounds {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  lines.forEach((l, i) => {
    const h = heights[i] ?? l.h;
    for (const [x, y] of [
      [l.x, l.y],
      [l.x + h * l.dx, l.y + h * l.dy],
    ] as const) {
      xMin = Math.min(xMin, x);
      xMax = Math.max(xMax, x);
      yMin = Math.min(yMin, y);
      yMax = Math.max(yMax, y);
    }
  });
  return { xMin, xMax, yMin, yMax };
}

/** The extent of a grid's nodes. */
export function boundsOfGrid(grid: StructuredGrid): Bounds {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let n = 0; n < grid.x.length; n++) {
    xMin = Math.min(xMin, grid.x[n]!);
    xMax = Math.max(xMax, grid.x[n]!);
    yMin = Math.min(yMin, grid.y[n]!);
    yMax = Math.max(yMax, grid.y[n]!);
  }
  return { xMin, xMax, yMin, yMax };
}

/** A fitted-shock fit as it runs, its grid moving with the shock. */
export function liveFitSource(live: LiveFit): FlowSource {
  return {
    ni: live.ni,
    nj: live.nj,
    gamma: live.gamma,
    freeStream: live.freeStream,
    mirror: live.geometry === 'axisymmetric',
    fittedShock: true,
    nodes: { kind: 'lines', ...live.nodeBuffers },
    state: () => live.state(),
    bounds: () => boundsOfLines(live.lines, live.heights()),
  };
}

/** A GPU solver on a fixed grid (the shock captured, or no shock). */
export function fixedGridSource(
  solver: {
    readonly config: {
      readonly grid: StructuredGrid;
      readonly gamma: number;
      readonly geometry: Geometry;
    };
    readonly stateBuffer: GPUBuffer;
  },
  freeStream: Primitive2D,
): FlowSource {
  const { grid, gamma, geometry } = solver.config;
  const bounds = boundsOfGrid(grid);
  return {
    ni: grid.ni,
    nj: grid.nj,
    gamma,
    freeStream,
    mirror: geometry === 'axisymmetric',
    fittedShock: false,
    nodes: { kind: 'grid', grid },
    state: () => solver.stateBuffer,
    bounds: () => bounds,
  };
}
