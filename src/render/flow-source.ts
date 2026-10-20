/**
 * Flows the flow view can draw, from the solvers that compute them: a
 * fitted-shock fit as it runs (src/engine-gpu/shock-fitting-gpu.ts), its
 * own buffers given to the view; nothing is copied.
 */

import type { LiveFit } from '../engine-gpu/shock-fitting-gpu';
import type { GridLine } from '../grid/blunt-grid';
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
