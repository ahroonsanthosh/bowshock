import { describe, expect, it } from 'vitest';
import { gridFromFunction } from '../../src/grid/structured';
import {
  cellCentre,
  cellFieldValue,
  schlierenBrightness,
  schlierenGradient,
  type Conserved,
} from '../../src/render/flow-fields';

const gamma = 1.4;
const free = { rho: 1, u: 2 * Math.sqrt(gamma), v: 0, p: 1 };

function conserved(rho: number, u: number, v: number, p: number): Conserved {
  return [rho, rho * u, rho * v, p / (gamma - 1) + 0.5 * rho * (u * u + v * v)];
}

describe('the flow view’s fields', () => {
  it('give the free stream its own Mach number, a zero pressure coefficient, unit density', () => {
    const state = conserved(free.rho, free.u, free.v, free.p);
    expect(cellFieldValue('mach', state, gamma, free)).toBeCloseTo(2, 12);
    expect(cellFieldValue('cp', state, gamma, free)).toBeCloseTo(0, 12);
    expect(cellFieldValue('density', state, gamma, free)).toBeCloseTo(1, 12);
  });

  it('give the pressure coefficient of a stagnation point at low speed as about 1', () => {
    const slow = { rho: 1, u: 0.01, v: 0, p: 1 };
    const q = 0.5 * slow.u * slow.u;
    const state = conserved(1, 0, 0, 1 + q);
    expect(cellFieldValue('cp', state, gamma, slow)).toBeCloseTo(1, 9);
  });

  it('take schlieren’s gradient exactly from a density that varies linearly, on a skewed grid', () => {
    const grid = gridFromFunction(6, 5, (i, j) => [0.3 * i + 0.07 * j, 0.2 * j + 0.04 * i]);
    // rho = 1 + 0.5 x - 0.25 y at each cell's centroid of its corners.
    const density = (i: number, j: number) => {
      const [x, y] = cellCentre(grid, i, j);
      return 1 + 0.5 * x - 0.25 * y;
    };
    const exact = Math.hypot(0.5, 0.25);
    // Interior cells: every face takes the mean of the two cells, exact for a linear field
    // on this affine grid.
    for (let j = 1; j < 4; j++) {
      for (let i = 1; i < 5; i++) {
        expect(schlierenGradient(grid, density, i, j, 1, 1)).toBeCloseTo(exact, 10);
      }
    }
    // Made dimensionless by a length and the free stream's density.
    expect(schlierenGradient(grid, density, 2, 2, 0.5, 2)).toBeCloseTo((exact * 0.5) / 2, 10);
  });

  it('shades uniform flow dark and steep gradients towards full brightness', () => {
    expect(schlierenBrightness(0, 3)).toBe(0);
    expect(schlierenBrightness(10, 3)).toBeGreaterThan(0.999);
    expect(schlierenBrightness(0.2, 3)).toBeCloseTo(1 - Math.exp(-0.6), 12);
  });

  it('places a cell’s value at the mean of its four corners', () => {
    const grid = gridFromFunction(2, 2, (i, j) => [i * i, j + 0.1 * i]);
    const [x, y] = cellCentre(grid, 1, 0);
    expect(x).toBeCloseTo((1 + 4 + 1 + 4) / 4, 12);
    expect(y).toBeCloseTo((0.1 + 0.2 + 1.1 + 1.2) / 4, 12);
  });
});
