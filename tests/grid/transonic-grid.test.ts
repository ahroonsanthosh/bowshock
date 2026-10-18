import { describe, expect, it } from 'vitest';
import type { Body } from '../../src/geometry/body';
import { bodyRadius } from '../../src/geometry/body';
import { gridQuality } from '../../src/grid/quality';
import { computeMetrics, nodeIndex } from '../../src/grid/structured';
import { transonicGrid } from '../../src/grid/transonic-grid';

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan(7 * deg), baseRadius: 1 },
  cylinderLength: 0,
};
const ogive: Body = {
  nose: { shape: { kind: 'ogive', parameter: 1 }, length: 6, baseRadius: 1 },
  cylinderLength: 0,
};

describe('transonic grids (design record 0007)', () => {
  it.each([
    ['cone', cone],
    ['ogive', ogive],
  ] as const)(
    '%s: reach the far boundaries asked for, with the tip and shoulder on grid lines',
    (_, body) => {
      const g = transonicGrid(body, { refinement: 1, farField: 100, cylinder: 10 });
      const { grid } = g;
      expect(g.farRadius).toBeGreaterThanOrEqual(100);
      expect(g.farRadius).toBeLessThan(125);
      expect(g.xUpstream).toBe(-g.farRadius);
      expect(g.xEnd).toBeCloseTo(body.nose.length + 20, 12);
      expect(grid.x[nodeIndex(grid, g.iTip, 0)]).toBe(0);
      expect(grid.x[nodeIndex(grid, g.iShoulder, 0)]).toBe(body.nose.length);
      // The wall nodes lie on the body (the axis ahead of the tip) and the
      // far nodes on the far radius.
      for (let i = 0; i <= grid.ni; i++) {
        const x = grid.x[nodeIndex(grid, i, 0)]!;
        expect(grid.y[nodeIndex(grid, i, 0)]).toBeCloseTo(bodyRadius(body, x), 12);
        expect(grid.y[nodeIndex(grid, i, grid.nj)]).toBeCloseTo(g.farRadius, 9);
      }
      // Positive volumes (computeMetrics throws otherwise), and near the
      // body the gates of the generated grids: wall cells close to square
      // corners, neighbours within 1.3 in size.
      computeMetrics(grid, 'axisymmetric');
      const q = gridQuality(grid);
      expect(q.minWallAngle).toBeGreaterThan(60 * deg);
      expect(q.minAngle).toBeGreaterThan(30 * deg);
      expect(q.maxSizeRatio).toBeLessThan(1.4);
    },
  );

  it('nest: every node of a grid is a node of its refinement', () => {
    const coarse = transonicGrid(cone, { refinement: 1, farField: 100, cylinder: 10 }).grid;
    const fine = transonicGrid(cone, { refinement: 2, farField: 100, cylinder: 10 }).grid;
    expect(fine.ni).toBe(2 * coarse.ni);
    expect(fine.nj).toBe(2 * coarse.nj);
    let worst = 0;
    for (let j = 0; j <= coarse.nj; j++) {
      for (let i = 0; i <= coarse.ni; i++) {
        const c = nodeIndex(coarse, i, j);
        const f = nodeIndex(fine, 2 * i, 2 * j);
        worst = Math.max(
          worst,
          Math.abs(coarse.x[c]! - fine.x[f]!),
          Math.abs(coarse.y[c]! - fine.y[f]!),
        );
      }
    }
    expect(worst).toBeLessThan(1e-9);
  });

  it('keep the near-body grid when the far boundaries move out', () => {
    const near = transonicGrid(cone, { refinement: 1, farField: 50, cylinder: 10 });
    const far = transonicGrid(cone, { refinement: 1, farField: 400, cylinder: 10 });
    expect(far.grid.nj).toBeGreaterThan(near.grid.nj);
    // The first rows next to the body differ only by the far radius's
    // share of the stretching (relative change of order R / farRadius).
    const k = (g: typeof near, j: number) => g.grid.y[nodeIndex(g.grid, g.iShoulder, j)]!;
    for (let j = 1; j <= 5; j++) {
      expect(Math.abs(k(far, j) / k(near, j) - 1)).toBeLessThan(0.05);
    }
  });

  it('refuse blunt noses and far boundaries too close to the nose', () => {
    const blunt: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 1, baseRadius: 1 },
      cylinderLength: 0,
    };
    expect(() => transonicGrid(blunt, { refinement: 1, farField: 100, cylinder: 10 })).toThrow(
      /blunt/,
    );
    expect(() => transonicGrid(cone, { refinement: 1, farField: 20, cylinder: 10 })).toThrow(
      /far boundaries/,
    );
  });
});
