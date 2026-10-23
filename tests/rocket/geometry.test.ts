/**
 * The rocket's outside as drawn (src/rocket/geometry.ts;
 * docs/design/0017-rocketeer-interface.md section 7): the profile on the
 * nose's own formula, and the fins seen from the side for three and four
 * fins at several roll angles.
 */

import { describe, expect, it } from 'vitest';
import { noseRadius } from '../../src/geometry/nose';
import type { RocketDesign } from '../../src/rocket/design';
import {
  convexHull,
  polygonArea,
  radiusAt,
  rocketGeometry,
  sideViewFins,
} from '../../src/rocket/geometry';
import { preset } from '../../src/rocket/presets';

const basic = () => preset('basic-finner').design;
const T = 0.08;

/** The Basic Finner's fins, n of them, at a rotation. */
function finner(count: number, rotation = 0): RocketDesign {
  const b = basic();
  return { ...b, finSets: [{ ...b.finSets[0]!, count, rotation }] };
}

describe('the profile', () => {
  it("follows the nose's own formula, then the tube, in calibres", () => {
    for (const id of ['basic-finner', 'example-54']) {
      const design = preset(id).design;
      const g = rocketGeometry(design);
      const d = design.nose.diameter;
      const nose = {
        shape: design.nose.shape,
        length: design.nose.length / d,
        baseRadius: 0.5,
      };
      for (const [x, r] of g.profile.filter(([x]) => x <= nose.length)) {
        expect(r).toBeCloseTo(noseRadius(nose, x), 14);
      }
      expect(g.profile[0]).toEqual([0, 0]);
      expect(g.profile[g.profile.length - 1]![1]).toBe(0.5);
      expect(g.length).toBeCloseTo((design.nose.length + design.body[0]!.length) / d, 12);
      expect(g.calibre).toBe(d);
    }
  });

  it('a boat-tail narrows to its aft diameter', () => {
    const b = basic();
    const g = rocketGeometry({
      ...b,
      body: [
        ...b.body,
        {
          kind: 'transition',
          length: 0.03,
          foreDiameter: 0.03,
          aftDiameter: 0.015,
          shape: { kind: 'conical' },
        },
      ],
    });
    expect(g.length).toBeCloseTo(11, 12);
    expect(radiusAt(g.profile, 10.5)).toBeCloseTo(0.375, 12);
    expect(g.profile[g.profile.length - 1]![1]).toBeCloseTo(0.25, 14);
  });
});

describe('the fins seen from the side', () => {
  it('four fins at 0 deg: two whole, one edge on in front, one edge on behind', () => {
    const seen = sideViewFins(rocketGeometry(finner(4)));
    expect(seen.map((s) => s.roll)).toEqual([270, 0, 90, 180]);
    expect(seen.map((s) => s.behind)).toEqual([true, false, false, false]);
    const [behind, up, front, down] = seen;
    expect(polygonArea(up!.polygons[0]!)).toBeCloseTo(1, 12);
    expect(polygonArea(down!.polygons[0]!)).toBeCloseTo(1, 12);
    // Edge on: the chord by the thickness, across the axis.
    for (const edge of [front!, behind!]) {
      expect(polygonArea(edge.polygons[0]!)).toBeCloseTo(T, 12);
      expect(Math.max(...edge.polygons[0]!.map(([, y]) => Math.abs(y)))).toBeCloseTo(T / 2, 12);
      expect(edge.facing).toBeCloseTo(0, 12);
    }
    // Up spans 0.5 to 1.5 cal, at the base (x 9 to 10).
    const ys = up!.polygons[0]!.map(([, y]) => y);
    const xs = up!.polygons[0]!.map(([x]) => x);
    expect([Math.min(...ys), Math.max(...ys)]).toEqual([0.5, 1.5]);
    expect(Math.min(...xs)).toBeCloseTo(9, 12);
    expect(Math.max(...xs)).toBeCloseTo(10, 12);
  });

  it('three fins at 0 deg: one whole, two at half their span beyond the body, one of them behind', () => {
    const seen = sideViewFins(rocketGeometry(finner(3)));
    expect(seen.map((s) => [s.roll, s.behind])).toEqual([
      [240, true],
      [0, false],
      [120, false],
    ]);
    const sin = Math.sin((120 * Math.PI) / 180);
    for (const s of [seen[0]!, seen[2]!]) {
      const p = s.polygons[0]!;
      const ys = p.map(([, y]) => y);
      // Root at 0.5 cos 120 = -0.25, tip at 1.5 cos 120 = -0.75, widened by the thickness seen.
      expect(Math.max(...ys)).toBeCloseTo(-0.25 + (T / 2) * sin, 12);
      expect(Math.min(...ys)).toBeCloseTo(-0.75 - (T / 2) * sin, 12);
      expect(polygonArea(p)).toBeCloseTo(0.5 + T * sin, 12);
      expect(s.facing).toBeCloseTo(0.5, 12);
    }
  });

  it('four fins at 45 deg: all four seen at cos 45, two in front and two behind', () => {
    const seen = sideViewFins(rocketGeometry(finner(4, 45)));
    expect(seen.filter((s) => s.behind).length).toBe(2);
    const c = Math.SQRT1_2;
    for (const s of seen) {
      expect(polygonArea(s.polygons[0]!)).toBeCloseTo(c + T * c, 12);
    }
  });

  it('a tapered, swept fin keeps its outline, squeezed by the cosine', () => {
    const b = basic();
    const design: RocketDesign = {
      ...b,
      finSets: [
        {
          ...b.finSets[0]!,
          count: 3,
          planform: {
            kind: 'trapezoidal',
            rootChord: 0.03,
            tipChord: 0.012,
            span: 0.03,
            sweepLength: 0.015,
          },
        },
      ],
    };
    const [, up] = sideViewFins(rocketGeometry(design));
    // Seen whole, with no thickness showing: the trapezoid's own area, (1 + 0.4) / 2.
    expect(polygonArea(up!.polygons[0]!)).toBeCloseTo(0.7, 12);
  });

  it('a freeform fin that is not convex: its view as a union, covering its outline', () => {
    const b = basic();
    const design: RocketDesign = {
      ...b,
      finSets: [
        {
          ...b.finSets[0]!,
          count: 4,
          planform: {
            kind: 'freeform',
            points: [
              [0, 0],
              [0.01, 0.03],
              [0.015, 0.01],
              [0.02, 0.03],
              [0.03, 0],
            ],
          },
        },
      ],
    };
    const up = sideViewFins(rocketGeometry(design)).find((s) => s.roll === 0)!;
    expect(up.polygons.length).toBeGreaterThan(1);
  });

  it('the hull of a square and its middle is the square', () => {
    const hull = convexHull([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0.5, 0.5],
    ]);
    expect(polygonArea(hull)).toBe(1);
    expect(hull.length).toBe(4);
  });
});
