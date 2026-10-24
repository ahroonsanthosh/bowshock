/**
 * The 2D field interpolated at a point (src/solver3d/field2d.ts): cubic in the 2D grid's parameters
 * (docs/design/0021-3d-euler-fins.md 2.1).
 */

import { describe, expect, it } from 'vitest';
import { gridFromFunction, nodeIndex } from '../../src/grid/structured';
import { field2D } from '../../src/solver3d/field2d';

const NI = 12;
const NJ = 9;
const grid = gridFromFunction(NI, NJ, (i, j) => {
  const a = i / NI;
  const b = j / NJ;
  return [a + 0.15 * Math.sin(Math.PI * b) * a, 0.5 + b + 0.1 * a * a];
});
// A quadratic in the cell-centre parameters (xi, eta) = (i, j) at the centres.
const q = (xi: number, eta: number) =>
  1 + 0.1 * xi + 0.05 * eta + 0.01 * xi * xi - 0.02 * xi * eta + 0.03 * eta * eta;
const cell = (i: number, j: number) => ({
  rho: q(i, j),
  u: 2 * q(i, j),
  v: -q(i, j),
  p: 0.5 + q(i, j),
});

describe('the 2D field at a point', () => {
  const f = field2D(grid, cell);

  it('returns the cell value at a cell centre (its parameters integers)', () => {
    for (const [i, j] of [
      [3, 4],
      [7, 2],
    ] as const) {
      // The bilinear map's centre point of the cell.
      let x = 0;
      let y = 0;
      for (const [a, b] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ] as const) {
        const k = nodeIndex(grid, i + a, j + b);
        x += grid.x[k]! / 4;
        y += grid.y[k]! / 4;
      }
      const p = f.parameters(x, y)!;
      expect(p.xi).toBeCloseTo(i, 12);
      expect(p.eta).toBeCloseTo(j, 12);
      expect(f.at(x, y)!.rho).toBeCloseTo(q(i, j), 12);
    }
  });

  it('is exact for a quadratic in the parameters away from the edges', () => {
    let seed = 5;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    let worst = 0;
    let tried = 0;
    while (tried < 200) {
      const k = nodeIndex(
        grid,
        2 + Math.floor(rand() * (NI - 4)),
        2 + Math.floor(rand() * (NJ - 4)),
      );
      const x = grid.x[k]! + 0.05 * (rand() - 0.5);
      const y = grid.y[k]! + 0.05 * (rand() - 0.5);
      const p = f.parameters(x, y);
      if (!p || p.xi < 1 || p.xi > NI - 2 || p.eta < 1 || p.eta > NJ - 2) continue;
      tried++;
      const v = f.at(x, y)!;
      worst = Math.max(
        worst,
        Math.abs(v.rho - q(p.xi, p.eta)),
        Math.abs(v.p - 0.5 - q(p.xi, p.eta)),
      );
    }
    expect(worst).toBeLessThan(1e-12);
  });

  it('refuses a point outside the grid', () => {
    expect(f.at(-1, 0.7)).toBeUndefined();
    expect(f.at(0.5, 5)).toBeUndefined();
  });
});
