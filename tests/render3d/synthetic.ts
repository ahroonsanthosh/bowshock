/**
 * A synthetic meridional field for the 3D view's tests: a grid between a
 * gentle conical body and an outer "shock" line, on slightly slanted grid
 * lines, holding a flow whose streamlines are known exactly: straight rays
 * from the point (-3, 0), at a speed and density that vary smoothly.
 */

import { gridFromFunction } from '../../src/grid/structured';
import { fieldFromCells, type MeridionalField } from '../../src/render3d/field';

export const GAMMA = 1.4;
export const ORIGIN = -3;
export const FREE = { rho: 1, u: 2 * Math.sqrt(GAMMA), v: 0, p: 1 };

export const bodyR = (x: number) => 0.2 + 0.05 * x;
export const shockR = (x: number) => 0.5 + 0.6 * x;

/** The flow at (x, r): along the ray from (ORIGIN, 0), speed and state smooth. */
export function rayFlow(x: number, r: number) {
  const dx = x - ORIGIN;
  const len = Math.hypot(dx, r);
  const speed = 2.2 + 0.1 * Math.sin(x) + 0.05 * r;
  return {
    rho: 1.1 + 0.05 * Math.cos(r),
    u: (speed * dx) / len,
    v: (speed * r) / len,
    p: 1.2 + (0.1 * x) / (1 + x * x),
  };
}

export function rayField(ni = 40, nj = 12, x0 = 0.2, x1 = 4): MeridionalField {
  const grid = gridFromFunction(ni, nj, (i, j) => {
    const f = (j / nj) ** 1.3;
    const x = x0 + ((x1 - x0) * i) / ni + 0.03 * (j / nj);
    return [x, bodyR(x) + (shockR(x) - bodyR(x)) * f];
  });
  // Each cell's state: the flow at the mean of its corners (the dual mesh's vertex).
  const row = ni + 1;
  return fieldFromCells(
    grid,
    (i, j) => {
      const k = [i + j * row, i + 1 + j * row, i + (j + 1) * row, i + 1 + (j + 1) * row];
      const cx = k.reduce((s, n) => s + grid.x[n]!, 0) / 4;
      const cr = k.reduce((s, n) => s + grid.y[n]!, 0) / 4;
      return rayFlow(cx, cr);
    },
    GAMMA,
    FREE,
  );
}
