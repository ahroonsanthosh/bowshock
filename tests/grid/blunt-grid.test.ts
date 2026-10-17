import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bodyLength, bodyRadius, type Body } from '../../src/geometry/body';
import { GridQualityError } from '../../src/grid/body-grid';
import {
  billigStandoff,
  bluntBodyGrid,
  gridOnLines,
  withFixedFractions,
} from '../../src/grid/blunt-grid';
import { gridQuality, qualityFailures } from '../../src/grid/quality';
import { nodeIndex } from '../../src/grid/structured';

const value = (min: number, max: number) =>
  fc.integer({ min: Math.round(1000 * min), max: Math.round(1000 * max) }).map((n) => n / 1000);

/**
 * Hemisphere (length 0.5) to 3:1 ellipsoids, radius 0.5, with cylinders
 * of 2 to 15 calibers (shorter ones are refused at low Mach numbers; see
 * docs/design/0004-grids.md).
 */
const bluntRocket: fc.Arbitrary<Body> = fc.record({
  nose: fc.record({
    shape: fc.constant({ kind: 'ellipsoid' } as const),
    length: value(0.5, 1.5),
    baseRadius: fc.constant(0.5),
  }),
  cylinderLength: value(2, 15),
});

const hemisphereCylinder: Body = {
  nose: { shape: { kind: 'ellipsoid' }, length: 0.5, baseRadius: 0.5 },
  cylinderLength: 4,
};

describe('body grids (C topology, blunt noses)', () => {
  it('property: 40 random blunt rockets at Mach 1.5 to 5 pass every quality gate', () => {
    fc.assert(
      fc.property(bluntRocket, value(1.5, 5), (body, mach) => {
        const { grid } = bluntBodyGrid(body, { nj: 20, mach });
        const quality = gridQuality(grid);
        expect(qualityFailures(quality)).toEqual([]);
        // The lines leave the wall close to normal.
        expect(quality.minWallAngle).toBeGreaterThan((80 * Math.PI) / 180);
      }),
      { seed: 7, numRuns: 40 },
    );
  }, 300_000);

  it('puts the wall nodes on the body, the first line on the axis and the last at the end', () => {
    const { grid, outerStandoff } = bluntBodyGrid(hemisphereCylinder, { nj: 20, mach: 3 });
    const { ni, nj, x, y } = grid;
    for (let i = 0; i <= ni; i++) {
      const k = nodeIndex(grid, i, 0);
      expect(Math.abs(y[k]! - bodyRadius(hemisphereCylinder, x[k]!))).toBeLessThan(1e-12);
    }
    for (let j = 0; j <= nj; j++) {
      expect(y[nodeIndex(grid, 0, j)]).toBe(0);
      expect(x[nodeIndex(grid, ni, j)]).toBeCloseTo(bodyLength(hemisphereCylinder), 12);
    }
    expect(x[nodeIndex(grid, 0, nj)]).toBeCloseTo(-outerStandoff, 9);
    expect(outerStandoff).toBeCloseTo(2 * billigStandoff(3, 0.5), 12);
  });

  it('keeps every node of the coarser grids of its family', () => {
    const coarse = bluntBodyGrid(hemisphereCylinder, { nj: 20, mach: 2 }).grid;
    for (const refinement of [2, 4]) {
      const fine = bluntBodyGrid(hemisphereCylinder, { nj: 20, refinement, mach: 2 }).grid;
      expect(fine.ni).toBe(refinement * coarse.ni);
      expect(fine.nj).toBe(refinement * coarse.nj);
      let worst = 0;
      for (let j = 0; j <= coarse.nj; j++) {
        for (let i = 0; i <= coarse.ni; i++) {
          const c = nodeIndex(coarse, i, j);
          const f = nodeIndex(fine, refinement * i, refinement * j);
          worst = Math.max(
            worst,
            Math.abs(fine.x[f]! - coarse.x[c]!),
            Math.abs(fine.y[f]! - coarse.y[c]!),
          );
        }
      }
      expect(worst).toBeLessThan(1e-12);
    }
  });

  it('refuses sharp noses, noses meeting the body at an angle, and grids that fail the gates', () => {
    const sharp: Body = {
      ...hemisphereCylinder,
      nose: { shape: { kind: 'conical' }, length: 2, baseRadius: 0.5 },
    };
    expect(() => bluntBodyGrid(sharp, { nj: 20, mach: 3 })).toThrow(/sharp/);
    // A paraboloid half as long as its radius meets the cylinder at 26.6 deg.
    const power: Body = {
      ...hemisphereCylinder,
      nose: { shape: { kind: 'power', exponent: 0.5 }, length: 0.5, baseRadius: 0.5 },
    };
    expect(() => bluntBodyGrid(power, { nj: 20, mach: 3 })).toThrow(
      /meeting the body at more than/,
    );
    // A hemisphere with no cylinder at Mach 1.5: the lines must turn
    // vertical by the end of the body, too fast for the gates.
    const stub: Body = { ...hemisphereCylinder, cylinderLength: 0 };
    expect(() => bluntBodyGrid(stub, { nj: 20, mach: 1.5 })).toThrow(GridQualityError);
  });

  it('fixed node fractions reproduce the grid at the reference heights and scale with new ones', () => {
    const { grid, lines } = bluntBodyGrid(hemisphereCylinder, { nj: 20, mach: 3 });
    const fixed = withFixedFractions(lines, 20, 0.5);
    const same = gridOnLines(
      fixed,
      fixed.map((l) => l.h),
      20,
      0.5,
    );
    expect([...same.x]).toEqual([...grid.x]);
    expect([...same.y]).toEqual([...grid.y]);
    const taller = gridOnLines(
      fixed,
      fixed.map((l) => 1.1 * l.h),
      20,
      0.5,
      false,
    );
    for (const i of [0, 40, fixed.length - 1]) {
      for (const j of [5, 20]) {
        const l = fixed[i]!;
        const k = nodeIndex(taller, i, j);
        const d = (taller.x[k]! - l.x) * l.dx + (taller.y[k]! - l.y) * l.dy;
        expect(d / (1.1 * l.h)).toBeCloseTo(l.fractions![j]!, 13);
      }
    }
  });
});
