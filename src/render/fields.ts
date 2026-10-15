/**
 * Scalar fields for display, computed on grid nodes so they can be drawn as
 * smoothly shaded triangles. The GPU computes the same fields in
 * src/render/shaders/fields.wgsl; this module is the reference (tested
 * against the shader) and the path for browsers without WebGPU.
 */

import type { StructuredGrid } from '../grid/structured';
import { pressureFromConserved2D } from '../scheme/gas';

export type DisplayField = 'schlieren' | 'mach' | 'pressure' | 'density';

/** Field codes as used by fields.wgsl. */
export const DISPLAY_FIELD_CODES: Readonly<Record<DisplayField, number>> = {
  schlieren: 0,
  mach: 1,
  pressure: 2,
  density: 3,
};

/** Conserved state per cell, cell (i, j) at index i + j * ni. */
export interface CellState {
  readonly rho: ArrayLike<number>;
  readonly mu: ArrayLike<number>;
  readonly mv: ArrayLike<number>;
  readonly energy: ArrayLike<number>;
}

/** The value of a cell-based quantity at each node: the mean over the cells sharing the node. */
export function nodeAverage(grid: StructuredGrid, cellValue: (c: number) => number): Float64Array {
  const { ni, nj } = grid;
  const out = new Float64Array((ni + 1) * (nj + 1));
  for (let j = 0; j <= nj; j++) {
    for (let i = 0; i <= ni; i++) {
      let sum = 0;
      let count = 0;
      for (let dj = -1; dj <= 0; dj++) {
        for (let di = -1; di <= 0; di++) {
          const ci = i + di;
          const cj = j + dj;
          if (ci >= 0 && ci < ni && cj >= 0 && cj < nj) {
            sum += cellValue(ci + cj * ni);
            count += 1;
          }
        }
      }
      out[i + j * (ni + 1)] = sum / count;
    }
  }
  return out;
}

/**
 * Magnitude of the gradient of a node field in each cell, by the
 * Green-Gauss formula over the cell's four edges with edge values the mean
 * of their end nodes (exact for linear fields):
 *   grad q = (1 / A) sum over edges of q_edge (dy, -dx).
 */
export function cellGradientMagnitude(
  grid: StructuredGrid,
  nodeValues: ArrayLike<number>,
): Float64Array {
  const { ni, nj, x, y } = grid;
  const out = new Float64Array(ni * nj);
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      // Corners counter-clockwise.
      const corners = [
        i + j * (ni + 1),
        i + 1 + j * (ni + 1),
        i + 1 + (j + 1) * (ni + 1),
        i + (j + 1) * (ni + 1),
      ];
      let gx = 0;
      let gy = 0;
      let area = 0;
      for (let k = 0; k < 4; k++) {
        const a = corners[k]!;
        const b = corners[(k + 1) % 4]!;
        const q = 0.5 * (nodeValues[a]! + nodeValues[b]!);
        const dx = x[b]! - x[a]!;
        const dy = y[b]! - y[a]!;
        gx += q * dy;
        gy -= q * dx;
        area += 0.5 * (x[a]! * y[b]! - x[b]! * y[a]!);
      }
      out[i + j * ni] = Math.hypot(gx, gy) / area;
    }
  }
  return out;
}

/**
 * Node values of a display field. Schlieren is the density gradient
 * magnitude, shaded later relative to its maximum.
 */
export function displayField(
  grid: StructuredGrid,
  state: CellState,
  field: DisplayField,
  gamma: number,
): Float64Array {
  const pressure = (c: number) =>
    pressureFromConserved2D(state.rho[c]!, state.mu[c]!, state.mv[c]!, state.energy[c]!, gamma);
  switch (field) {
    case 'density':
      return nodeAverage(grid, (c) => state.rho[c]!);
    case 'pressure':
      return nodeAverage(grid, pressure);
    case 'mach':
      return nodeAverage(grid, (c) => {
        const rho = state.rho[c]!;
        const speed = Math.hypot(state.mu[c]!, state.mv[c]!) / rho;
        return speed / Math.sqrt((gamma * pressure(c)) / rho);
      });
    case 'schlieren': {
      const gradient = cellGradientMagnitude(
        grid,
        nodeAverage(grid, (c) => state.rho[c]!),
      );
      return nodeAverage(grid, (c) => gradient[c]!);
    }
  }
}

/**
 * Numerical schlieren shading in [0, 1] (1 = white): exp(-k g / g_max) for
 * gradient magnitude g. A k of about 10 to 15 shows weak waves as well as
 * shocks.
 */
export function schlierenShade(gradient: number, maxGradient: number, k: number): number {
  return maxGradient > 0 ? Math.exp((-k * gradient) / maxGradient) : 1;
}
