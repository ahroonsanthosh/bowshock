/**
 * Grids for simple shapes used by validation cases and demos.
 */

import { gridFromFunction, type StructuredGrid } from './structured';

export interface RampGridOptions {
  readonly ni: number;
  readonly nj: number;
  readonly xMin: number;
  /** x position of the corner where the lower wall turns. */
  readonly xCorner: number;
  readonly xMax: number;
  /** Height of the flat upper boundary above the undisturbed lower wall (y = 0). */
  readonly height: number;
  /**
   * Turning angle of the lower wall at the corner, radians: positive turns
   * the wall into the flow (a compression ramp, or wedge), negative turns it
   * away (an expansion corner).
   */
  readonly angle: number;
}

/**
 * A channel whose lower wall is flat up to a corner and then turns by a
 * constant angle; the upper boundary is flat. Grid lines of constant i are
 * vertical, uniformly spaced in x, with the corner on a grid line; lines of
 * constant j divide each vertical line uniformly.
 */
export function rampGrid(options: RampGridOptions): StructuredGrid {
  const { ni, nj, xMin, xCorner, xMax, height, angle } = options;
  if (!(xMin < xCorner && xCorner < xMax)) throw new RangeError('the corner must lie inside');
  const wall = (x: number) => (x <= xCorner ? 0 : (x - xCorner) * Math.tan(angle));
  if (wall(xMax) >= height) throw new RangeError('the ramp reaches the upper boundary');
  // Place the corner exactly on a grid line by spacing the two segments
  // separately in proportion to their lengths.
  const iCorner = Math.round((ni * (xCorner - xMin)) / (xMax - xMin));
  if (iCorner < 1 || iCorner >= ni) throw new RangeError('too few cells to resolve the corner');
  const xAt = (i: number) =>
    i <= iCorner
      ? xMin + ((xCorner - xMin) * i) / iCorner
      : xCorner + ((xMax - xCorner) * (i - iCorner)) / (ni - iCorner);
  return gridFromFunction(ni, nj, (i, j) => {
    const x = xAt(i);
    const y0 = wall(x);
    return [x, y0 + ((height - y0) * j) / nj];
  });
}
