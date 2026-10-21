/**
 * Which fins-on-base factor the body base uses (src/base/base-drag.ts;
 * docs/design/0015-fins-at-the-base.md section 5; 0014 section 10.3): the
 * present factor wherever it serves, the rebuilt one only where the
 * present one refuses, and the Basic Finner's gate numbers unchanged.
 */

import { describe, expect, it } from 'vitest';
import { FINS_ON_BASE_ROUTING_LABEL, bodyBaseDrag, type BaseFins } from '../../src/base/base-drag';
import { finsOnBaseFactor } from '../../src/base/fins-on-base';
import { finsOnBaseFactorW1, type FinsOnBaseFactorW1 } from '../../src/base/fins-on-base-w1';
import { BaseRefusal } from '../../src/base/refusal';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { doubleWedge, singleWedge, type SymmetricSection } from '../../src/fins/section';
import { finnedBodyComponents, type FinnedBody } from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import { combineComponents } from '../../src/total/total-drag';
import { BASIC_FINNER_GEOMETRY as G, BASIC_FINNER_SHOTS } from '../../src/validation/basic-finner';

const near = (section: SymmetricSection, tanLe = 0, tanTe = 0) => ({
  section,
  sectionFamily: 'other' as const,
  tanLeadingEdgeSweep: tanLe,
  tanTrailingEdgeSweep: tanTe,
});
const fins = (over: Partial<BaseFins>): BaseFins => ({
  count: 4,
  thicknessRatio: 0.08,
  section: 'other',
  trailingEdgeAheadOfBase: 0,
  ...over,
});
const base = (mach: number, f: BaseFins) =>
  bodyBaseDrag({
    mach,
    afterbody: 'cylinder',
    boundaryLayerAtBase: 'turbulent',
    baseAreaRatio: 1,
    fins: f,
  });

describe('the present factor wherever it serves', () => {
  it('four fins 5% to 10% thick at M 1.80 to 3.0: the same numbers with or without the section', () => {
    for (const mach of [1.799, 1.8, 2.0, 2.414, 2.75, 2.97, 3.0]) {
      for (const t of [0.05, 0.08, 0.1]) {
        const without = base(mach, fins({ thicknessRatio: t }));
        const withNear = base(mach, fins({ thicknessRatio: t, nearBase: near(doubleWedge(t)) }));
        expect(withNear.finsOnBaseSource).toBe('present');
        expect(withNear.presentRefusal).toBeUndefined();
        expect([withNear.cd, withNear.low, withNear.high]).toEqual([
          without.cd,
          without.low,
          without.high,
        ]);
        expect(withNear.finsOnBase).toEqual(finsOnBaseFactor(mach, fins({ thicknessRatio: t })));
        expect(withNear.labels).toEqual(without.labels);
      }
    }
  });
});

describe('the rebuilt factor only where the present one refuses', () => {
  it('three fins, thin fins, Mach 1.5 to 1.8: rebuilt, labelled with the routing', () => {
    const cases: [number, BaseFins, string][] = [
      [
        2.5,
        fins({ count: 3, thicknessRatio: 0.024, nearBase: near(doubleWedge(0.024), 1) }),
        'fin-count',
      ],
      [2.5, fins({ thicknessRatio: 0.024, nearBase: near(doubleWedge(0.024)) }), 'fin-thickness'],
      [1.6, fins({ thicknessRatio: 0.08, nearBase: near(doubleWedge(0.08)) }), 'mach-range'],
    ];
    for (const [mach, f, presentReason] of cases) {
      const r = base(mach, f);
      expect(r.finsOnBaseSource).toBe('rebuilt');
      expect(r.presentRefusal?.reason).toBe(presentReason);
      const w1 = finsOnBaseFactorW1(mach, {
        ...f.nearBase!,
        count: f.count,
        trailingEdgeAheadOfBase: 0,
      });
      expect(r.finsOnBase).toEqual(w1);
      expect(r.labels[1]).toContain(FINS_ON_BASE_ROUTING_LABEL);
      expect(r.labels[1]).toContain(r.presentRefusal!.message);
      // The term and its fins-on-base band, as base-drag builds them from the factor.
      expect(r.cd).toBeCloseTo(-r.curve.pB * w1.nominal, 12);
      expect(r.parts.finsOnBase[0]).toBeCloseTo((w1.low - w1.nominal) * -r.curve.pB, 12);
      expect(r.parts.finsOnBase[1]).toBeCloseTo((w1.high - w1.nominal) * -r.curve.pB, 12);
    }
  });

  it('fins ending within a chord of the base: rebuilt where measured (M 1.5 to 2.0), else refused', () => {
    const f = fins({ trailingEdgeAheadOfBase: 0.5, nearBase: near(doubleWedge(0.08)) });
    const r = base(1.8, f);
    expect(r.finsOnBaseSource).toBe('rebuilt');
    expect(r.labels[1]).toContain('it takes fins at the base only');
    expect(() => base(2.2, f)).toThrow(BaseRefusal);
    // Without the section the rebuilt factor cannot run: refused as before.
    expect(() => base(1.8, fins({ trailingEdgeAheadOfBase: 0.5 }))).toThrow(/root chords ahead/);
  });

  it("where both refuse, the rebuilt factor's reason, with the present factor's beside it", () => {
    try {
      base(2.5, fins({ count: 3, nearBase: near(singleWedge(0.08)) }));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BaseRefusal);
      expect((e as BaseRefusal).reason).toBe('fin-trailing-edge');
      expect((e as BaseRefusal).message).toMatch(
        /the present factor \(0010 section 1.3\) refuses it too/,
      );
    }
    // Without the section, the present factor's refusal stands, as before the rebuilt factor.
    try {
      base(2.5, fins({ count: 3 }));
      expect.unreachable();
    } catch (e) {
      expect((e as BaseRefusal).reason).toBe('fin-count');
    }
  });

  it('a bounded value states its gap in C_D (0014 section 10.2)', () => {
    const plate: SymmetricSection = {
      x: [0, 0.1, 1],
      halfThickness: [0, 0.012, 0.012],
      bluntTrailingEdge: true,
    };
    const r = base(2.0, fins({ count: 3, thicknessRatio: 0.024, nearBase: near(plate, 1) }));
    const f = r.finsOnBase as FinsOnBaseFactorW1;
    expect(f.bounded).toBe(true);
    expect(r.labels[1]).toMatch(/^bounded, not measured/);
    expect(r.labels[1]).toContain(
      `the gap between the bounds is ${((f.high - f.low) * -r.curve.pB).toFixed(4)} in C_D`,
    );
  });

  it('above Mach 2.56, where fig. 35 ends, both factors are bounded and each label states its gap', () => {
    // The rebuilt factor (three thin fins): from the zero member's low end to its reference's high end at M 2.56.
    const w = base(
      2.8,
      fins({ count: 3, thicknessRatio: 0.024, nearBase: near(doubleWedge(0.024)) }),
    );
    const fw = w.finsOnBase as FinsOnBaseFactorW1;
    expect(w.finsOnBaseSource).toBe('rebuilt');
    expect(fw.bounded).toBe(true);
    expect(w.labels[1]).toMatch(/^bounded, not measured/);
    expect(w.labels[1]).toContain(
      `the gap between the bounds is ${((fw.high - fw.low) * -w.curve.pB).toFixed(4)} in C_D`,
    );
    // The present factor (four fins t/c 0.08), bounded by its own rule (0010 section 11).
    const p = base(2.8, fins({ thicknessRatio: 0.08, nearBase: near(doubleWedge(0.08)) }));
    expect(p.finsOnBaseSource).toBe('present');
    expect(p.finsOnBase?.bounded).toBe(true);
    expect(p.labels[1]).toContain(
      `the gap between the bounds is ${((p.finsOnBase!.high - p.finsOnBase!.low) * -p.curve.pB).toFixed(4)} in C_D`,
    );
  });
});

describe("the Basic Finner's gate: unchanged", { timeout: 120_000 }, () => {
  const gamma = 1.4;
  const half = (G.coneHalfAngleDegrees * Math.PI) / 180;
  const noseLength = G.length / 20 / Math.tan(half);
  const config: FinnedBody = {
    body: {
      nose: { shape: { kind: 'conical' }, length: noseLength, baseRadius: 0.5 },
      cylinderLength: G.length - noseLength,
    },
    afterbody: 'cylinder',
    fins: {
      count: G.finCount,
      planform: trapezoidalPlanform({
        rootChord: G.finChord,
        span: G.finSpan,
        leadingEdgeSweep: 0,
      }),
      section: singleWedge(G.finTrailingEdgeThickness / G.finChord),
      sectionFamily: 'other',
      leadingEdgeRadius: G.finLeadingEdgeRadius,
      trailingEdgeAheadOfBase: 0,
    },
  };
  const temperature = 343.7 ** 2 / (gamma * 287.05);
  const inputs = { transitionReynolds: [5e5, 1.6e6, 3e6], wallTemperature: temperature };

  it('every gated shot: the body base and the total as without the rebuilt factor, to 1e-12', () => {
    const gated = BASIC_FINNER_SHOTS.filter((s) => s.use === 'gate');
    expect(gated.length).toBe(11);
    for (const s of gated) {
      const conditions = { mach: s.mach, temperature, reynoldsPerLength: s.reynolds / G.length };
      const nose = exactConeNoseWaveDrag(s.mach, half, gamma);
      const r = finnedBodyComponents(config, conditions, nose, inputs);
      expect(r.refusals).toEqual([]);
      expect(r.base?.finsOnBaseSource).toBe('present');
      // The present path alone, as before the routing existed.
      const old = bodyBaseDrag({
        mach: s.mach,
        afterbody: 'cylinder',
        boundaryLayerAtBase: 'turbulent',
        baseAreaRatio: 1,
        fins: {
          count: 4,
          thicknessRatio: G.finTrailingEdgeThickness / G.finChord,
          section: 'other',
          trailingEdgeAheadOfBase: 0,
        },
      });
      const b = r.components.find((c) => c.name === 'body base')!;
      expect(Math.abs(b.cd - old.cd)).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(b.low - old.low)).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(b.high - old.high)).toBeLessThanOrEqual(1e-12);
      expect(b.label).toBe(old.labels.join('; '));
      const swapped = r.components.map((c) =>
        c.name === 'body base' ? { ...c, cd: old.cd, low: old.low, high: old.high } : c,
      );
      const t = combineComponents(r.components, r.inputs);
      const t0 = combineComponents(swapped, r.inputs);
      expect(Math.abs(t.cd - t0.cd)).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(t.low - t0.low)).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(t.high - t0.high)).toBeLessThanOrEqual(1e-12);
    }
  });
});
