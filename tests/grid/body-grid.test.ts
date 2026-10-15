import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bodyRadius, type Body } from '../../src/geometry/body';
import type { NoseShape } from '../../src/geometry/nose';
import { GridQualityError, bodyGrid } from '../../src/grid/body-grid';
import { gridQuality, qualityFailures } from '../../src/grid/quality';
import { computeMetrics, nodeIndex } from '../../src/grid/structured';

const gamma = 1.4;
const value = (min: number, max: number) =>
  fc.integer({ min: Math.round(1000 * min), max: Math.round(1000 * max) }).map((n) => n / 1000);

/**
 * Random sharp-nosed rockets in body diameters (radius 0.5): noses of 2 to
 * 8 calibers with tip half-angles below the cone that detaches at the
 * Mach number drawn, no cylinder or one of 1 to 25 calibers.
 */
const sharpShape: fc.Arbitrary<NoseShape> = fc.oneof(
  fc.constant({ kind: 'conical' } as const),
  value(0.2, 1).map((parameter) => ({ kind: 'ogive', parameter }) as const),
  value(0, 1).map((parameter) => ({ kind: 'parabolic', parameter }) as const),
);
const rocket: fc.Arbitrary<Body> = fc.record({
  nose: fc.record({ shape: sharpShape, length: value(2, 8), baseRadius: fc.constant(0.5) }),
  cylinderLength: fc.oneof(fc.constant(0), value(1, 25)),
});

describe('body grids (H topology, sharp noses)', () => {
  it('property: 100 random rockets at Mach 2 to 5 pass every quality gate', () => {
    fc.assert(
      fc.property(rocket, value(2, 5), (body, mach) => {
        const { grid } = bodyGrid(body, { nj: 20, mach, gamma });
        expect(qualityFailures(gridQuality(grid))).toEqual([]);
      }),
      { seed: 121, numRuns: 100 },
    );
  });

  it('property: below Mach 2 a grid either passes or is refused for its corner angle', () => {
    // The outer boundary steepens as the shock angle grows; where it meets
    // the vertical grid lines at under 30 deg the H topology cannot serve,
    // and the generator says so instead of returning the grid. When written,
    // 1 of these 100 random rockets was refused at Mach 1.5 to 2; more
    // would mean the generator got worse.
    let refused = 0;
    fc.assert(
      fc.property(rocket, value(1.5, 2), (body, mach) => {
        try {
          const { grid } = bodyGrid(body, { nj: 20, mach, gamma });
          expect(qualityFailures(gridQuality(grid))).toEqual([]);
        } catch (error) {
          expect(error).toBeInstanceOf(GridQualityError);
          expect(String(error)).toMatch(/cell angle/);
          refused += 1;
        }
      }),
      { seed: 123, numRuns: 100 },
    );
    expect(refused).toBeLessThanOrEqual(1);
  });

  it('property: the wall nodes lie on the profile, with the tip and shoulder on grid lines', () => {
    fc.assert(
      fc.property(rocket, value(2, 5), (body, mach) => {
        const { grid, iTip } = bodyGrid(body, { nj: 20, mach, gamma });
        const xs = Array.from({ length: grid.ni + 1 }, (_, i) => grid.x[nodeIndex(grid, i, 0)]!);
        for (let i = 0; i <= grid.ni; i++) {
          const k = nodeIndex(grid, i, 0);
          expect(grid.y[k]).toBeCloseTo(bodyRadius(body, grid.x[k]!), 12);
        }
        expect(xs[iTip]).toBe(0);
        expect(xs).toContain(body.nose.length);
        expect(xs[grid.ni]).toBeCloseTo(body.nose.length + body.cylinderLength, 12);
        // Columns advance monotonically, so every cell has positive volume.
        for (let i = 1; i <= grid.ni; i++) expect(xs[i]!).toBeGreaterThan(xs[i - 1]!);
      }),
      { seed: 122, numRuns: 50 },
    );
  });

  it('property: refining keeps every node: the grids of a family are nested', () => {
    fc.assert(
      fc.property(rocket, value(2, 5), (body, mach) => {
        const coarse = bodyGrid(body, { nj: 20, mach, gamma }).grid;
        const fine = bodyGrid(body, { nj: 20, refinement: 2, mach, gamma }).grid;
        expect(fine.ni).toBe(2 * coarse.ni);
        for (let j = 0; j <= coarse.nj; j++) {
          for (let i = 0; i <= coarse.ni; i++) {
            const c = nodeIndex(coarse, i, j);
            const f = nodeIndex(fine, 2 * i, 2 * j);
            const scale = 1 + Math.abs(coarse.x[c]!) + Math.abs(coarse.y[c]!);
            expect(Math.abs(fine.x[f]! - coarse.x[c]!) / scale).toBeLessThan(1e-12);
            expect(Math.abs(fine.y[f]! - coarse.y[c]!) / scale).toBeLessThan(1e-12);
          }
        }
        expect(() => computeMetrics(fine, 'axisymmetric')).not.toThrow();
      }),
      { seed: 124, numRuns: 20 },
    );
  });

  it('accepts refinements 1, 2, 4, ... only', () => {
    const body: Body = {
      nose: { shape: { kind: 'conical' }, length: 2, baseRadius: 0.5 },
      cylinderLength: 3,
    };
    expect(() => bodyGrid(body, { nj: 20, refinement: 3, mach: 3, gamma })).toThrow(/refinement/);
    expect(bodyGrid(body, { nj: 20, refinement: 4, mach: 3, gamma }).grid.nj).toBe(80);
  });

  it('refuses a grid that fails its quality checks, saying why', () => {
    // A cylinder far shorter than the local spacing leaves one sliver cell.
    const sliver: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 0.001,
    };
    expect(() => bodyGrid(sliver, { nj: 20, mach: 2, gamma })).toThrow(GridQualityError);
    expect(() => bodyGrid(sliver, { nj: 20, mach: 2, gamma })).toThrow(/differ in size/);
  });

  it('refuses tips steeper than 30 deg half-angle, whose wall cells the H grid would skew', () => {
    const steep: Body = {
      nose: {
        shape: { kind: 'conical' },
        length: 0.5 / Math.tan((32 * Math.PI) / 180),
        baseRadius: 0.5,
      },
      cylinderLength: 3,
    };
    expect(() => bodyGrid(steep, { nj: 20, mach: 5, gamma })).toThrow(/tip half-angles above 30/);
  });

  it('refuses blunt noses, and noses whose tip shock would detach', () => {
    const blunt: Body = {
      nose: { shape: { kind: 'haack', parameter: 0 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 5,
    };
    expect(() => bodyGrid(blunt, { nj: 20, mach: 2, gamma })).toThrow(/blunt noses/);
    const squat: Body = {
      nose: {
        shape: { kind: 'conical' },
        length: 0.5 / Math.tan((28 * Math.PI) / 180),
        baseRadius: 0.5,
      },
      cylinderLength: 5,
    };
    // A 28 deg cone at Mach 1.3 carries a detached shock.
    expect(() => bodyGrid(squat, { nj: 20, mach: 1.3, gamma })).toThrow(/detaches/);
  });
});
