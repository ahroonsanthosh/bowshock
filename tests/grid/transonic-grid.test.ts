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

describe('transonic grids (design record 0013)', () => {
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

  it.each([1, 2, 3])(
    'blunt noses (ellipsoid %d:1): a C grid from the axis ahead to the end of the cylinder',
    (L) => {
      const body: Body = {
        nose: { shape: { kind: 'ellipsoid' }, length: L, baseRadius: 1 },
        cylinderLength: 0,
      };
      const g = transonicGrid(body, { refinement: 1, farField: 100, cylinder: 10 });
      const { grid } = g;
      expect(g.topology).toBe('C');
      expect(g.iTip).toBe(0);
      expect(grid.x[nodeIndex(grid, g.iShoulder, 0)]).toBeCloseTo(L, 12);
      // jMin on the body, jMax on the far boundary (a quarter circle about
      // the stagnation point, then the far radius), iMin on the axis ahead
      // and iMax the plane at the end of the cylinder.
      for (let i = 0; i <= grid.ni; i++) {
        const x = grid.x[nodeIndex(grid, i, 0)]!;
        expect(grid.y[nodeIndex(grid, i, 0)]).toBeCloseTo(bodyRadius(body, x), 9);
        const xf = grid.x[nodeIndex(grid, i, grid.nj)]!;
        const yf = grid.y[nodeIndex(grid, i, grid.nj)]!;
        expect(xf <= 0 ? Math.hypot(xf, yf) : yf).toBeCloseTo(g.farRadius, 9);
      }
      for (let j = 0; j <= grid.nj; j++) {
        expect(grid.y[nodeIndex(grid, 0, j)]).toBe(0);
        expect(grid.x[nodeIndex(grid, 0, j)]).toBeLessThanOrEqual(0);
        expect(grid.x[nodeIndex(grid, grid.ni, j)]).toBeCloseTo(g.xEnd, 12);
      }
      expect(grid.x[nodeIndex(grid, 0, grid.nj)]).toBeCloseTo(-g.farRadius, 9);
      // Measured when written: wall cells at 85.3 deg or more, every corner
      // at 51 deg or more, neighbours within 1.92 in size on the hemisphere
      // and 1.43 on the ellipsoids (the largest jumps in the far field above
      // the start of the cylinder, where the lines from the nose fan out).
      computeMetrics(grid, 'axisymmetric');
      const q = gridQuality(grid);
      expect(q.minWallAngle).toBeGreaterThan(80 * deg);
      expect(q.minAngle).toBeGreaterThan(45 * deg);
      expect(q.maxSizeRatio).toBeLessThan(L === 1 ? 2 : 1.5);
    },
  );

  it('blunt noses: the C grids nest', () => {
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 2, baseRadius: 1 },
      cylinderLength: 0,
    };
    const coarse = transonicGrid(body, { refinement: 1, farField: 100, cylinder: 10 }).grid;
    const fine = transonicGrid(body, { refinement: 2, farField: 100, cylinder: 10 }).grid;
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

  it('refuse blunt noses meeting the cylinder at an angle and far boundaries too close', () => {
    const corner: Body = {
      nose: { shape: { kind: 'power', exponent: 0.5 }, length: 2, baseRadius: 1 },
      cylinderLength: 0,
    };
    expect(() => transonicGrid(corner, { refinement: 1, farField: 100, cylinder: 10 })).toThrow(
      /tangentially/,
    );
    expect(() => transonicGrid(cone, { refinement: 1, farField: 20, cylinder: 10 })).toThrow(
      /far boundaries/,
    );
  });
});
