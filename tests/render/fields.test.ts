import { describe, expect, it } from 'vitest';
import { gridFromFunction } from '../../src/grid/structured';
import { cellGradientMagnitude, displayField, nodeAverage } from '../../src/render/fields';

/** Randomly distorted grid (deterministic). */
function distorted(ni: number, nj: number) {
  let state = 99;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32 - 0.5;
  };
  return gridFromFunction(ni, nj, (i, j) => {
    const interior = i > 0 && i < ni && j > 0 && j < nj;
    return [i + (interior ? 0.6 * random() : 0), j + (interior ? 0.6 * random() : 0)];
  });
}

describe('display fields', () => {
  it('the Green-Gauss gradient is exact for a linear field on a distorted grid', () => {
    const grid = distorted(8, 6);
    const linear = Array.from(grid.x, (x, k) => 3 * x - 4 * grid.y[k]! + 1);
    for (const g of cellGradientMagnitude(grid, linear)) expect(g).toBeCloseTo(5, 12);
  });

  it('node averages of a uniform field are that value, including at boundaries', () => {
    const grid = distorted(5, 4);
    for (const v of nodeAverage(grid, () => 2.5)) expect(v).toBe(2.5);
  });

  it('computes Mach number and pressure from conserved variables', () => {
    const grid = distorted(4, 3);
    const n = 12;
    // rho = 1.4, u = 3, v = 4, p = 1: speed 5, sound speed 1, Mach 5.
    const state = {
      rho: new Float64Array(n).fill(1.4),
      mu: new Float64Array(n).fill(1.4 * 3),
      mv: new Float64Array(n).fill(1.4 * 4),
      energy: new Float64Array(n).fill(1 / 0.4 + 0.5 * 1.4 * 25),
    };
    for (const m of displayField(grid, state, 'mach', 1.4)) expect(m).toBeCloseTo(5, 12);
    for (const p of displayField(grid, state, 'pressure', 1.4)) expect(p).toBeCloseTo(1, 12);
    for (const s of displayField(grid, state, 'schlieren', 1.4)) expect(s).toBeCloseTo(0, 12);
  });
});
