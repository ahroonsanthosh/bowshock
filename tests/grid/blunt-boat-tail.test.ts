import { describe, expect, it } from 'vitest';
import { solvedBluntBody } from '../../src/analysis/fitted-flow';
import { bodyLength, bodyRadius, shoulderPosition, type Body } from '../../src/geometry/body';
import { bluntBodyGrid } from '../../src/grid/blunt-grid';
import { BOAT_TAIL_CONTINUATION_COLUMNS } from '../../src/grid/boat-tail-columns';
import { gridQuality, qualityFailures } from '../../src/grid/quality';
import { nodeIndex, type StructuredGrid } from '../../src/grid/structured';

// A boat-tail behind a blunt nose (docs/design/0023-boat-tails.md, 2.6):
// the C grid goes on over the boat-tail's cone and past its base, with the
// shoulder and the base on grid lines, and nested families.

const eightDegrees = Math.tan((8 * Math.PI) / 180);

const bodies: Record<string, Body> = {
  ellipsoid: {
    nose: { shape: { kind: 'ellipsoid' }, length: 1, baseRadius: 0.5 },
    cylinderLength: 3,
    boatTail: { length: 1, baseRadius: 0.5 - eightDegrees },
  },
  'Von Karman': {
    nose: { shape: { kind: 'haack', parameter: 0 }, length: 3, baseRadius: 0.5 },
    cylinderLength: 3,
    boatTail: { length: 1, baseRadius: 0.5 - eightDegrees },
  },
};

const wallX = (grid: StructuredGrid) =>
  Array.from({ length: grid.ni + 1 }, (_, i) => grid.x[nodeIndex(grid, i, 0)]!);

describe('a boat-tail behind a blunt nose: the C grid', () => {
  for (const [name, asked] of Object.entries(bodies)) {
    it(`${name}: the cone continued, the shoulder and the base on grid lines, the gates passed`, () => {
      const mach = 2;
      const solved = solvedBluntBody(asked, { mach, gamma: 1.4, nj: 20 });
      const { body, base, boatTailBase } = solved;
      expect(boatTailBase).toBe(bodyLength(asked));
      // The solved body is the asked one's cone, continued.
      expect(body.cylinderLength).toBe(asked.cylinderLength);
      const slope = (0.5 - asked.boatTail!.baseRadius) / asked.boatTail!.length;
      const continuation = body.boatTail!.length - asked.boatTail!.length;
      expect(continuation).toBeGreaterThan(0);
      expect(body.boatTail!.baseRadius).toBeCloseTo(
        asked.boatTail!.baseRadius - continuation * slope,
        12,
      );

      const { grid } = base;
      const xs = wallX(grid);
      for (let i = 0; i <= grid.ni; i++) {
        const k = nodeIndex(grid, i, 0);
        expect(Math.abs(grid.y[k]! - bodyRadius(body, grid.x[k]!))).toBeLessThan(1e-12);
      }
      const at = (x: number) => xs.findIndex((v) => Math.abs(v - x) < 1e-12);
      const iShoulder = at(shoulderPosition(asked));
      const iBase = at(bodyLength(asked));
      expect(iShoulder).toBeGreaterThan(0);
      expect(iBase).toBeGreaterThan(iShoulder);
      // Past the base: BOAT_TAIL_CONTINUATION_COLUMNS columns of the base's width.
      expect(grid.ni - iBase).toBe(BOAT_TAIL_CONTINUATION_COLUMNS);
      expect(base.boatTailSpacing).toBeGreaterThan(0);
      const along = (i: number) =>
        Math.hypot(
          xs[i + 1]! - xs[i]!,
          grid.y[nodeIndex(grid, i + 1, 0)]! - grid.y[nodeIndex(grid, i, 0)]!,
        );
      for (let i = iBase; i < grid.ni; i++) {
        expect(along(i)).toBeCloseTo(base.boatTailSpacing!, 9);
      }
      // The lines over the boat-tail stay vertical, as along the cylinder.
      for (let i = iShoulder; i <= grid.ni; i++) {
        expect(grid.x[nodeIndex(grid, i, grid.nj)]).toBeCloseTo(xs[i]!, 12);
      }
      if (base.twoScale) {
        // A two-scale nose's generator grid fails the size gate at the tip
        // (its family is built on the captured shock, and the fitted grid
        // is gated): over the boat-tail, its columns pass it.
        let worst = 1;
        for (let j = 0; j <= grid.nj; j++) {
          const width = (i: number) =>
            Math.hypot(
              grid.x[nodeIndex(grid, i + 1, j)]! - grid.x[nodeIndex(grid, i, j)]!,
              grid.y[nodeIndex(grid, i + 1, j)]! - grid.y[nodeIndex(grid, i, j)]!,
            );
          for (let i = iShoulder - 2; i + 1 < grid.ni; i++) {
            worst = Math.max(worst, width(i) / width(i + 1), width(i + 1) / width(i));
          }
        }
        expect(worst).toBeLessThan(1.3);
      } else {
        expect(qualityFailures(gridQuality(grid))).toEqual([]);
      }

      // The family is nested: the grid twice as fine keeps every node.
      const fine = bluntBodyGrid(body, {
        nj: 20,
        refinement: 2,
        mach,
        gated: false,
        boatTailBase: bodyLength(asked),
      }).grid;
      expect(fine.ni).toBe(2 * grid.ni);
      let worst = 0;
      for (let j = 0; j <= grid.nj; j++) {
        for (let i = 0; i <= grid.ni; i++) {
          const c = nodeIndex(grid, i, j);
          const f = nodeIndex(fine, 2 * i, 2 * j);
          worst = Math.max(
            worst,
            Math.abs(fine.x[f]! - grid.x[c]!),
            Math.abs(fine.y[f]! - grid.y[c]!),
          );
        }
      }
      expect(worst).toBeLessThan(1e-12);
    }, 120_000);
  }

  it('refuses a base asked for off the boat-tail', () => {
    const body = bodies.ellipsoid!;
    expect(() =>
      bluntBodyGrid(body, { nj: 20, mach: 2, boatTailBase: shoulderPosition(body) }),
    ).toThrow(/on the boat-tail/);
  });
});
