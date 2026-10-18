import { describe, expect, it } from 'vitest';
import { columnPositions } from '../../src/grid/spacing';

/** Lengths of the cells between consecutive positions. */
const cells = (xs: readonly number[]) => xs.slice(1).map((x, i) => x - xs[i]!);
/** Largest ratio of neighbouring cell lengths. */
const largestRatio = (xs: readonly number[]) => {
  const ds = cells(xs);
  let worst = 1;
  for (let i = 1; i < ds.length; i++) {
    worst = Math.max(worst, ds[i]! / ds[i - 1]!, ds[i - 1]! / ds[i]!);
  }
  return worst;
};

/**
 * A spacing that jumps from 0.05 to 0.25 over a short distance at x = 1,
 * as the blunt-nose grids' did at the shoulder at low Mach numbers
 * (docs/design/0006-shock-fitting.md), scaled by the refinement as the
 * generators' densities are.
 */
const steep = (refinement: number) => (x: number) =>
  refinement / (0.05 + 0.2 / (1 + Math.exp(-40 * (x - 1))));

describe('column positions', () => {
  it('limits the spacing slope across the breakpoints, which stay nodes', () => {
    const breakpoints = [0, 0.95, 3];
    const free = columnPositions(breakpoints, steep(1), 1);
    const limited = columnPositions(breakpoints, steep(1), 1, { maxSpacingSlope: 0.15 });
    // Measured when written: 2.52 on 28 cells, and 1.156 on 32.
    expect(largestRatio(free)).toBeGreaterThan(2.5);
    expect(largestRatio(limited)).toBeLessThan(1.16);
    for (const b of breakpoints) expect(limited).toContain(b);
    // Only ever finer.
    expect(limited.length).toBeGreaterThan(free.length);
  });

  it('leaves the positions bit-identical where the spacing changes more slowly than the limit', () => {
    const gentle = (x: number) => 1 / (0.05 + 0.05 * x);
    const breakpoints = [0.001, 1, 4];
    for (const refinement of [1, 2]) {
      const density = (x: number) => refinement * gentle(x);
      expect(columnPositions(breakpoints, density, refinement, { maxSpacingSlope: 0.15 })).toEqual(
        columnPositions(breakpoints, density, refinement),
      );
    }
  });

  it('keeps every node of the coarser grids at refinements 2, 4 and 8 with the limit applied', () => {
    const breakpoints = [0, 0.95, 3];
    const base = columnPositions(breakpoints, steep(1), 1, { maxSpacingSlope: 0.15 });
    for (const refinement of [2, 4, 8]) {
      const fine = columnPositions(breakpoints, steep(refinement), refinement, {
        maxSpacingSlope: 0.15,
      });
      expect(fine.length - 1).toBe(refinement * (base.length - 1));
      // Exactly: each base node is a node of the refined grid.
      base.forEach((x, k) => {
        expect(fine[refinement * k]).toBe(x);
      });
    }
  });
});
