import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  computeMetrics,
  gridFromFunction,
  rectangularGrid,
  type GridMetrics,
} from '../../src/grid/structured';

/**
 * A rectangle [0, 2] x [0.5, 1.5] with interior nodes moved randomly by up
 * to 30% of the spacing: a curvilinear grid with no special structure.
 */
function perturbedGrid(ni: number, nj: number, seed: number) {
  let state = seed;
  const random = () => {
    // Deterministic linear congruential generator, so failures reproduce.
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32 - 0.5;
  };
  return gridFromFunction(ni, nj, (i, j) => {
    const interior = i > 0 && i < ni && j > 0 && j < nj;
    const dx = interior ? 0.6 * random() : 0;
    const dy = interior ? 0.6 * random() : 0;
    return [(2 * (i + dx)) / ni, 0.5 + (j + dy) / nj];
  });
}

/** Sum over a cell's faces of (outward unit normal) x (area) x weight. */
function closure(m: GridMetrics, i: number, j: number) {
  const { ni } = m;
  const iLeft = i + j * (ni + 1);
  const iRight = iLeft + 1;
  const jBottom = i + j * ni;
  const jTop = jBottom + ni;
  const sum = (component: 'nx' | 'ny') =>
    m.iFaces[component][iRight]! * m.iFaces.area[iRight]! -
    m.iFaces[component][iLeft]! * m.iFaces.area[iLeft]! +
    m.jFaces[component][jTop]! * m.jFaces.area[jTop]! -
    m.jFaces[component][jBottom]! * m.jFaces.area[jBottom]!;
  return { x: sum('nx'), y: sum('ny') };
}

describe('grid metrics', () => {
  it('are exact on a uniform rectangle', () => {
    const m = computeMetrics(rectangularGrid(4, 2, 0, 2, 0, 1), 'planar');
    for (const v of m.volume) expect(v).toBeCloseTo(0.25, 15);
    // i-faces point in +x, j-faces in +y.
    for (let k = 0; k < m.iFaces.nx.length; k++) {
      expect(m.iFaces.nx[k]).toBe(1);
      expect(Math.abs(m.iFaces.ny[k]!)).toBe(0);
      expect(m.iFaces.area[k]).toBeCloseTo(0.5, 15);
    }
    for (let k = 0; k < m.jFaces.nx.length; k++) {
      expect(Math.abs(m.jFaces.nx[k]!)).toBe(0);
      expect(m.jFaces.ny[k]).toBe(1);
    }
    expect(m.centroidX[0]).toBeCloseTo(0.25, 15);
    expect(m.centroidY[0]).toBeCloseTo(0.25, 15);
  });

  it('property: every cell of a distorted grid is closed (outward normals sum to zero)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1e6 }), (seed) => {
        const m = computeMetrics(perturbedGrid(8, 6, seed), 'planar');
        for (let j = 0; j < m.nj; j++) {
          for (let i = 0; i < m.ni; i++) {
            const c = closure(m, i, j);
            expect(Math.abs(c.x)).toBeLessThan(1e-15);
            expect(Math.abs(c.y)).toBeLessThan(1e-15);
          }
        }
      }),
      { numRuns: 50, seed: 71 },
    );
  });

  it('property: axisymmetric faces integrate r n exactly (closed contour identities)', () => {
    // For any closed polygon, the contour integral of r n_x ds is zero and
    // of r n_r ds is the planar area. These identities make the discrete
    // axisymmetric equations preserve a uniform flow exactly.
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1e6 }), (seed) => {
        const m = computeMetrics(perturbedGrid(8, 6, seed), 'axisymmetric');
        for (let j = 0; j < m.nj; j++) {
          for (let i = 0; i < m.ni; i++) {
            const c = closure(m, i, j);
            const area = m.planarArea[i + j * m.ni]!;
            expect(Math.abs(c.x) / area).toBeLessThan(1e-13);
            expect(Math.abs(c.y - area) / area).toBeLessThan(1e-13);
          }
        }
      }),
      { numRuns: 50, seed: 72 },
    );
  });

  it('volumes sum to the domain size (area, or volume per radian)', () => {
    const grid = perturbedGrid(10, 7, 12345);
    const sum = (a: Float64Array) => a.reduce((s, v) => s + v, 0);
    expect(sum(computeMetrics(grid, 'planar').volume)).toBeCloseTo(2, 13);
    // Integral of r over [0, 2] x [0.5, 1.5] = 2 * (1.5^2 - 0.5^2) / 2 = 2.
    expect(sum(computeMetrics(grid, 'axisymmetric').volume)).toBeCloseTo(2, 13);
  });

  it('rejects inverted cells and nodes below the axis', () => {
    const inverted = gridFromFunction(1, 1, (i, j) => [i === 0 ? 1 : 0, j]);
    expect(() => computeMetrics(inverted, 'planar')).toThrow(RangeError);
    expect(() => computeMetrics(rectangularGrid(2, 2, 0, 1, -1, 1), 'axisymmetric')).toThrow(
      RangeError,
    );
  });
});
