/**
 * Rounded fin leading edges (src/fins/rounded-leading-edge.ts): TN 2960's
 * transcription and its band recomputed, the tangent geometry, the
 * modified-Newtonian nose term, the domain and its regimes, the refusals.
 * Recorded in docs/design/0010-base-drag-and-total.md, section 5.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FinRefusal } from '../../src/fins/refusal';
import {
  pitotPressureCoefficient,
  REYNOLDS_ALLOWANCE,
  ROUNDED_EDGE_BAND,
  roundedLeadingEdgeDrag,
  roundedWedge,
  tn2960Integrated,
} from '../../src/fins/rounded-leading-edge';
import { singleWedge } from '../../src/fins/section';
import { exactSectionDrag } from '../../src/fins/section-drag';
import { TN2960_FIG5C, TN2960_FIG7 } from '../../src/fins/tn2960';

const deg = Math.PI / 180;

const reason = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(FinRefusal);
    return (e as FinRefusal).reason;
  }
  return 'none';
};

describe("TN 2960, against 0008's data file (first readings)", () => {
  it('holds fig. 5(c) and fig. 7', () => {
    const rows = readFileSync('docs/research/total-drag/data/le_bluntness.csv', 'utf8')
      .split('\n')
      .filter((l) => l.startsWith('TN 2960,'))
      .map((l) => l.split(','));
    const curve = rows.filter((r) => r[1] === '5(c)' && r[2] === 'faired curve');
    expect(curve.map((r) => [Number(r[3]), Number(r[5]), Number(r[7])])).toEqual(
      TN2960_FIG5C.flatMap((c) => c.points.map((p) => [c.mach, p.theta, p.p])),
    );
    const fig7 = rows.filter((r) => r[1] === '7');
    expect(fig7.map((r) => [Number(r[3]), Number(r[7])])).toEqual(
      TN2960_FIG7.map((p) => [p.mach, p.cd]),
    );
  });

  it("the stagnation readings lie within 0.02 of Rayleigh's pitot coefficient (1.529, 1.654, 1.750)", () => {
    for (const c of TN2960_FIG5C) {
      expect(Math.abs(c.points[0]!.p - pitotPressureCoefficient(c.mach))).toBeLessThan(0.02);
    }
    expect(
      TN2960_FIG5C.map((c) => Math.round(1000 * pitotPressureCoefficient(c.mach)) / 1000),
    ).toEqual([1.529, 1.654, 1.75]);
  });

  it('integrates to front 1.014, 1.156, 1.232 and rear 0.454, 0.269, 0.093; totals within 0.985 to 1.001 of fig. 7', () => {
    const r = tn2960Integrated();
    expect(r.map((x) => Math.round(1000 * x.front) / 1000)).toEqual([1.014, 1.156, 1.232]);
    expect(r.map((x) => Math.round(1000 * x.rear) / 1000)).toEqual([0.454, 0.269, 0.093]);
    r.forEach((x, k) => {
      const ratio = (x.front + x.rear) / TN2960_FIG7[k]!.cd;
      expect(ratio).toBeGreaterThan(0.984);
      expect(ratio).toBeLessThan(1.002);
    });
  });

  it('front over modified Newtonian: 0.995, 1.049, 1.056, so the band 0.99 to 1.06', () => {
    expect(
      tn2960Integrated().map((x) => Math.round(1000 * x.frontOverModifiedNewtonian) / 1000),
    ).toEqual([0.995, 1.049, 1.056]);
    expect(ROUNDED_EDGE_BAND).toEqual({ low: 0.99, high: 1.06 });
  });
});

describe('the tangent geometry', () => {
  it('the faces are tangent to the circle and pass through the trailing-edge corners', () => {
    for (const [h, r, c] of [
      [0.04, 0.004, 1],
      [0.03, 0.01, 1],
      [0.1, 0.02, 2],
    ] as const) {
      const g = roundedWedge(h, r, c);
      const d = g.faceAngle;
      // Distance from the centre (r, 0) to the line through (c, h) at angle d.
      const distance = Math.abs(Math.sin(d) * (r - c) - Math.cos(d) * (0 - h));
      expect(Math.abs(distance - r)).toBeLessThan(1e-14);
      // The tangent point lies on the circle and on the face.
      const tx = g.tangentX;
      const ty = r * Math.cos(d);
      expect(Math.abs((tx - r) ** 2 + ty * ty - r * r)).toBeLessThan(1e-15);
      expect(Math.abs(ty + Math.tan(d) * (c - tx) - h)).toBeLessThan(1e-14);
      expect(g.faceRise).toBeCloseTo(h - ty, 15);
      expect(g.noseHeight + 2 * g.faceRise).toBeCloseTo(2 * h, 15);
    }
  });

  it('r = 0.004, h = 0.04 on c = 1: 2.070 deg, against 2.291 for the sharp wedge, so (tan) squared 0.816', () => {
    const g = roundedWedge(0.04, 0.004, 1);
    expect(g.faceAngle / deg).toBeCloseTo(2.07, 3);
    expect(Math.atan(0.04) / deg).toBeCloseTo(2.291, 3);
    expect((Math.tan(g.faceAngle) / 0.04) ** 2).toBeCloseTo(0.816, 3);
  });

  it("the faces' exact wave drag is 0.808 to 0.810 of the sharp wedge through the same corners", () => {
    // A consequence of the geometry: the faces start at the tangent points, at 2.070 deg on a
    // rise of 0.0360, not at the apex at 2.291 deg on 0.04.
    const g = roundedWedge(0.04, 0.004, 1);
    for (const [mach, ratio] of [
      [1.8, 0.8095],
      [2.4, 0.8088],
      [3.0, 0.8078],
    ] as const) {
      const sharp = exactSectionDrag(singleWedge(0.08), mach).cd;
      const faces =
        (exactSectionDrag(singleWedge(2 * Math.tan(g.faceAngle)), mach).cd * g.faceRise) /
        Math.tan(g.faceAngle);
      expect(faces / sharp).toBeCloseTo(ratio, 4);
    }
  });

  it('refuses a radius not smaller than the half-thickness', () => {
    expect(reason(() => roundedWedge(0.004, 0.004, 1))).toBe('leading-edge-geometry');
  });
});

describe('the nose term', () => {
  const base = { radius: 0.004, faceAngle: 2.07 * deg, tanLeadingEdgeSweep: 0 };

  it('is the modified-Newtonian integral over the arc, (2/3) Cp_pitot 2r within 1e-6', () => {
    for (const mach of [1.6, 2.2, 2.9]) {
      const t = roundedLeadingEdgeDrag({ ...base, mach, reynoldsOnDiameter: 2e5 });
      const cpMax = pitotPressureCoefficient(mach);
      // Midpoint rule over phi in +-(90 deg - delta).
      const n = 20000;
      const top = Math.PI / 2 - base.faceAngle;
      let sum = 0;
      for (let k = 0; k < n; k++) {
        const phi = -top + ((k + 0.5) * 2 * top) / n;
        sum += cpMax * Math.cos(phi) ** 3 * base.radius;
      }
      sum *= (2 * top) / n;
      expect(Math.abs(t.dragPerSpan / sum - 1)).toBeLessThan(1e-8);
      expect(Math.abs(t.dragPerSpan / ((2 / 3) * cpMax * 2 * base.radius) - 1)).toBeLessThan(1e-6);
    }
  });

  it('has three regimes: measured, covered by RM A55H31, extrapolated in Reynolds number', () => {
    const at = (mach: number, re: number) =>
      roundedLeadingEdgeDrag({ ...base, mach, reynoldsOnDiameter: re });
    expect(at(2.0, 2e5).regime).toBe('measured');
    expect(at(2.0, 2e5).band).toEqual({ low: 0.99, high: 1.06 });
    expect(at(2.6, 1e4).regime).toBe('covered by RM A55H31');
    expect(at(2.95, 2e5).regime).toBe('covered by RM A55H31');
    expect(at(2.6, 1e4).band).toEqual({ low: 0.99, high: 1.06 });
    const x = at(2.0, 1e4);
    expect(x.regime).toBe('extrapolated in Reynolds number');
    expect(x.band.low).toBeCloseTo(0.99 - REYNOLDS_ALLOWANCE, 15);
    expect(x.band.high).toBeCloseTo(1.06 + REYNOLDS_ALLOWANCE, 15);
    expect(x.label).toMatch(/extrapolated in Reynolds number/);
    expect(x.label.startsWith('an analogy, not a measurement')).toBe(true);
  });

  it('refuses swept edges, Mach numbers outside 1.49 to 3.0, Re_D below 6.7e3', () => {
    expect(
      reason(() =>
        roundedLeadingEdgeDrag({
          ...base,
          mach: 2,
          reynoldsOnDiameter: 2e5,
          tanLeadingEdgeSweep: 0.1,
        }),
      ),
    ).toBe('swept-leading-edge');
    expect(
      reason(() => roundedLeadingEdgeDrag({ ...base, mach: 1.45, reynoldsOnDiameter: 2e5 })),
    ).toBe('leading-edge-range');
    expect(
      reason(() => roundedLeadingEdgeDrag({ ...base, mach: 3.05, reynoldsOnDiameter: 2e5 })),
    ).toBe('leading-edge-range');
    expect(
      reason(() => roundedLeadingEdgeDrag({ ...base, mach: 2.6, reynoldsOnDiameter: 6e3 })),
    ).toBe('leading-edge-range');
  });
});
