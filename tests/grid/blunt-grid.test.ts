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
  }, 60_000);

  it('limits the growth of the cells along the body where the lines stop turning (Mach 1.2)', () => {
    // A 1.5-caliber ellipsoid with a caliber of cylinder: the cells along
    // the body grew from 0.238 to 0.355 across the shoulder (1.49), where
    // the turn of the lines, which shrinks the spacing, stops; with the
    // spacing's slope limited, measured when written: 1.1605.
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 1.5, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const { lines } = bluntBodyGrid(body, { nj: 20, mach: 1.2, gated: false });
    const ds = lines.slice(1).map((l, i) => Math.hypot(l.x - lines[i]!.x, l.y - lines[i]!.y));
    let worst = 1;
    for (let i = 1; i < ds.length; i++) {
      worst = Math.max(worst, ds[i]! / ds[i - 1]!, ds[i - 1]! / ds[i]!);
    }
    expect(worst).toBeLessThan(1.17);
    // The shoulder is still a node.
    expect(lines.some((l) => l.x === body.nose.length)).toBe(true);
  });

  it('keeps every node of its coarser grids exactly at refinements 2, 4 and 8 with the slope limited', () => {
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 1.5, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const coarse = bluntBodyGrid(body, { nj: 20, mach: 1.2, gated: false }).grid;
    for (const refinement of [2, 4, 8]) {
      const fine = bluntBodyGrid(body, { nj: 20, refinement, mach: 1.2, gated: false }).grid;
      expect(fine.ni).toBe(refinement * coarse.ni);
      expect(fine.nj).toBe(refinement * coarse.nj);
      for (let j = 0; j <= coarse.nj; j++) {
        for (let i = 0; i <= coarse.ni; i++) {
          const c = nodeIndex(coarse, i, j);
          const f = nodeIndex(fine, refinement * i, refinement * j);
          expect(fine.x[f]).toBe(coarse.x[c]);
          expect(fine.y[f]).toBe(coarse.y[c]);
        }
      }
    }
  }, 120_000);

  it('a Haack nose has two scales: its tip scale, 2.88 (1 + 1.5 C)^2 R^4 / L^3, a hundredth of the body', () => {
    // r = c x^(3/4) at the tip crosses r = x at (64 / pi^2) (2/3 + C)^2
    // R^4 / L^3; the higher terms of the series lower it on the 3-caliber
    // nose by 0.13% (C = 0) and 0.70% (C = 1/3).
    for (const parameter of [0, 1 / 3]) {
      const haack: Body = {
        nose: { shape: { kind: 'haack', parameter }, length: 3, baseRadius: 0.5 },
        cylinderLength: 2,
      };
      const g = bluntBodyGrid(haack, { nj: 20, mach: 2, gated: false });
      const asymptotic = ((64 / Math.PI ** 2) * (2 / 3 + parameter) ** 2 * 0.5 ** 4) / 3 ** 3;
      expect(Math.abs(g.tipScale / asymptotic - 1)).toBeLessThan(1e-2);
      expect(g.twoScale).toBe(true);
      expect(g.scale).toBe(2 * g.tipScale);
    }
    // Ellipsoids keep one scale, the base radius, whatever their length:
    // the grids their families were measured on (0006).
    for (const length of [0.5, 3, 6]) {
      const ellipsoid: Body = {
        ...hemisphereCylinder,
        nose: { ...hemisphereCylinder.nose, length },
      };
      const g = bluntBodyGrid(ellipsoid, { nj: 20, mach: 2, gated: false });
      expect(g.twoScale).toBe(false);
      expect(g.scale).toBe(Math.max(0.5, 0.25 / length));
    }
  }, 120_000);

  it('keeps every node of its coarser grids exactly on an outer boundary given (a two-scale family)', () => {
    // The family's grids are built on the shock captured on the first,
    // pushed out (secondCapture); here a boundary made up from the
    // generator's own lines.
    const haack: Body = {
      nose: { shape: { kind: 'haack', parameter: 0 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    const first = bluntBodyGrid(haack, { nj: 20, mach: 2, gated: false });
    const outerBoundary = first.lines.map((l) => ({
      x: l.x + 0.4 * l.h * l.dx,
      y: l.y + 0.4 * l.h * l.dy,
    }));
    const options = { nj: 20, mach: 2, outerBoundary, gated: false };
    const coarse = bluntBodyGrid(haack, options).grid;
    expect(Math.abs(coarse.x[nodeIndex(coarse, 0, coarse.nj)]! - outerBoundary[0]!.x)).toBeLessThan(
      1e-15,
    );
    for (const refinement of [2, 4]) {
      const fine = bluntBodyGrid(haack, { ...options, refinement }).grid;
      expect(fine.ni).toBe(refinement * coarse.ni);
      expect(fine.nj).toBe(refinement * coarse.nj);
      for (let j = 0; j <= coarse.nj; j++) {
        for (let i = 0; i <= coarse.ni; i++) {
          const c = nodeIndex(coarse, i, j);
          const f = nodeIndex(fine, refinement * i, refinement * j);
          expect(fine.x[f]).toBe(coarse.x[c]);
          expect(fine.y[f]).toBe(coarse.y[c]);
        }
      }
    }
  }, 300_000);

  it('serves sharp tips as the limit of two-scale noses, refuses noses meeting the body at an angle, and grids that fail the gates', () => {
    const sharp: Body = {
      ...hemisphereCylinder,
      nose: { shape: { kind: 'conical' }, length: 2, baseRadius: 0.5 },
    };
    // A sharp tip is served as the limit of a two-scale nose (its shock
    // detaches at low Mach numbers): the generator's own grid only has to
    // contain the shock, and the family's grid is built on it (0006).
    expect(bluntBodyGrid(sharp, { nj: 20, mach: 3, gated: false }).twoScale).toBe(true);
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
  }, 60_000);

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
