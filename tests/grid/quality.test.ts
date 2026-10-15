import { describe, expect, it } from 'vitest';
import { gridQuality, qualityFailures } from '../../src/grid/quality';
import { gridFromFunction, rectangularGrid } from '../../src/grid/structured';

describe('grid quality', () => {
  it('a uniform square grid is perfect', () => {
    const q = gridQuality(rectangularGrid(4, 4, 0, 1, 0, 1));
    expect(q.minAngle).toBeCloseTo(Math.PI / 2, 12);
    expect(q.maxSizeRatio).toBeCloseTo(1, 12);
    expect(q.maxAspectRatio).toBeCloseTo(1, 12);
    expect(q.minArea).toBeCloseTo(1 / 16, 12);
    expect(qualityFailures(q)).toEqual([]);
  });

  it('measures skew, stretching and aspect ratio', () => {
    // Columns sheared by 40 deg, rows growing by 1.5, cells 4 times wider than tall.
    const shear = Math.tan((40 * Math.PI) / 180);
    const grid = gridFromFunction(3, 3, (i, j) => {
      const y = 0.25 * (1.5 ** j - 1);
      return [4 * i * 0.25 + y * shear, y];
    });
    const q = gridQuality(grid);
    expect((q.minAngle * 180) / Math.PI).toBeCloseTo(50, 9);
    expect(q.maxSizeRatio).toBeCloseTo(1.5, 9);
    expect(qualityFailures(q).join(' ')).toMatch(/differ in size by 1.50/);
  });

  it('fails a degenerate cell rather than passing it on a NaN angle', () => {
    // Collapse one corner onto its neighbour: a cell with a zero-length side.
    const grid = gridFromFunction(2, 1, (i, j) => (i === 1 && j === 1 ? [0, 1] : [i, j]));
    expect(qualityFailures(gridQuality(grid)).length).toBeGreaterThan(0);
  });
});
