/**
 * Sections with a blunt trailing edge (src/fins/section.ts): the single
 * wedge of the Basic Finner's fins. The faces' wave drag only; the base is
 * a base-pressure term (src/base). Recorded in
 * docs/design/0010-base-drag-and-total.md, section 2.
 */

import { describe, expect, it } from 'vitest';
import { finWaveDrag } from '../../src/fins/fin-wave-drag';
import { linearWaveDrag } from '../../src/fins/linear-wave-drag';
import { trapezoidalPlanform } from '../../src/fins/planform';
import {
  singleWedge,
  symmetricPolygon,
  validateSection,
  validateSymmetricSection,
} from '../../src/fins/section';
import { ackeretSectionDrag, exactSectionDrag } from '../../src/fins/section-drag';
import { obliqueShock } from '../../src/validation/gas-dynamics';

const gamma = 1.4;

describe('blunt trailing edges are accepted only when declared', () => {
  it('a thickness at x = 1 is refused without the declaration', () => {
    expect(() => {
      validateSymmetricSection({ x: [0, 0.5, 1], halfThickness: [0, 0.02, 0.04] });
    }).toThrow(/blunt edges are refused/);
    expect(() => {
      validateSection({
        upper: [
          { x: 0, y: 0 },
          { x: 1, y: 0.04 },
        ],
        lower: [
          { x: 0, y: 0 },
          { x: 1, y: -0.04 },
        ],
      });
    }).toThrow(/trailing edge \(1, 0\)/);
  });

  it('a blunt leading edge stays refused, declared or not', () => {
    expect(() => {
      validateSymmetricSection({ x: [0, 1], halfThickness: [0.01, 0.04], bluntTrailingEdge: true });
    }).toThrow(/leading edge/);
  });

  it('a declared blunt edge needs its thickness', () => {
    expect(() => {
      validateSymmetricSection({ x: [0, 1], halfThickness: [0, 0], bluntTrailingEdge: true });
    }).toThrow(/positive thickness at x = 1/);
  });

  it('the single wedge is two faces ending at x = 1, apart', () => {
    const s = symmetricPolygon(singleWedge(0.08));
    expect(s.bluntTrailingEdge).toBe(true);
    const coordinates = (points: readonly { x: number; y: number }[]) =>
      points.map((p) => [p.x, p.y + 0]);
    expect(coordinates(s.upper)).toEqual([
      [0, 0],
      [1, 0.04],
    ]);
    expect(coordinates(s.lower)).toEqual([
      [0, 0],
      [1, -0.04],
    ]);
  });
});

describe('the single wedge in two dimensions', () => {
  it('exact face drag: the oblique-shock pressure on both faces, by hand, to 1e-15', () => {
    for (const mach of [1.5, 1.8, 2.4, 3]) {
      const t = 0.08;
      const shock = obliqueShock(mach, Math.atan(t / 2), gamma);
      const cp = (shock.pressureRatio - 1) / (0.5 * gamma * mach * mach);
      const r = exactSectionDrag(singleWedge(t), mach);
      expect(r.exact).toBe(true);
      expect(r.upper.firstReflection).toBe(Infinity);
      expect(Math.abs(r.cd - 2 * cp * (t / 2))).toBeLessThan(1e-15);
    }
  });

  it("Ackeret's face drag is t^2 / beta", () => {
    for (const mach of [1.5, 2, 3]) {
      const t = 0.08;
      const beta = Math.sqrt(mach * mach - 1);
      expect(Math.abs(ackeretSectionDrag(singleWedge(t), mach) - (t * t) / beta)).toBeLessThan(
        1e-16,
      );
    }
  });
});

describe('the single wedge on a rectangle: linear 3D over strip theory', () => {
  // Inside the tip's Mach cone a constant-slope sheet carries Cp / Cp_2D =
  // 1/2 + asin(beta (s - y) / x) / pi (tested in linear-wave-drag.test.ts);
  // integrated over the cone's part of the panel the loss is c^2 / (2 pi
  // beta) of the strip drag per unit area, so the ratio is 1 - c / (2 pi
  // beta s) while beta s >= c. The root is a plane of symmetry (the image).
  it.each([
    { mach: 1.5, span: 1 },
    { mach: 1.8, span: 1 },
    { mach: 2.4, span: 1 },
    { mach: 3, span: 1 },
    { mach: 2, span: 2 },
    { mach: 3, span: 0.5 },
  ])('Mach $mach, span $span chords: within 2e-6 and its error estimate', ({ mach, span }) => {
    const planform = trapezoidalPlanform({ rootChord: 1, span, leadingEdgeSweep: 0 });
    const beta = Math.sqrt(mach * mach - 1);
    const expected = 1 - 1 / (2 * Math.PI * beta * span);
    const r = linearWaveDrag(planform, singleWedge(0.08), mach);
    expect(Math.abs(r.ratio - expected)).toBeLessThan(2e-6);
    expect(Math.abs(r.ratio - expected)).toBeLessThanOrEqual(r.quadratureError);
    const t = 0.08;
    expect(Math.abs(r.cdStrip - (t * t) / beta)).toBeLessThan(1e-12);
  });

  it('the fin wave drag is the exact face drag times that ratio', () => {
    const planform = trapezoidalPlanform({ rootChord: 1, span: 1, leadingEdgeSweep: 0 });
    const r = finWaveDrag(planform, singleWedge(0.08), 2);
    expect(r.exactSection).toBe(true);
    expect(Math.abs(r.cd - r.sectionCd * r.ratio)).toBeLessThan(1e-18);
    expect(r.ratio).toBeLessThan(1);
  });
});
