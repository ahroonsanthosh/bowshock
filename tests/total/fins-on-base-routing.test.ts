/**
 * Which fins-on-base factor the body base uses (src/base/base-drag.ts;
 * docs/design/0015-fins-at-the-base.md section 5; 0014 section 10.3): the
 * present factor wherever it serves, the rebuilt one only where the
 * present one refuses, and the Basic Finner's gate numbers unchanged.
 */

import { describe, expect, it } from 'vitest';
import { FINS_ON_BASE_ROUTING_LABEL, bodyBaseDrag, type BaseFins } from '../../src/base/base-drag';
import { finsOnBaseFactor } from '../../src/base/fins-on-base';
import {
  W1_FLAT_RELIEF_LOW,
  finsOnBaseFactorW1,
  type FinsOnBaseFactorW1,
} from '../../src/base/fins-on-base-w1';
import { BaseRefusal } from '../../src/base/refusal';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { doubleWedge, flatPlate, singleWedge, type SymmetricSection } from '../../src/fins/section';
import { baseFinsOf, finnedBodyComponents, type FinnedBody } from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import { combineComponents } from '../../src/total/total-drag';
import { BASIC_FINNER_GEOMETRY as G, BASIC_FINNER_SHOTS } from '../../src/validation/basic-finner';

const near = (section: SymmetricSection, tanLe = 0, tanTe = 0) => ({
  section,
  sectionFamily: 'other' as const,
  tanLeadingEdgeSweep: tanLe,
  tanTrailingEdgeSweep: tanTe,
});
// The present factor's edge sweeps follow the rebuilt factor's input unless given (the planform's own).
const fins = (over: Partial<BaseFins>): BaseFins => ({
  count: 4,
  thicknessRatio: 0.08,
  section: 'other',
  tanLeadingEdge: over.nearBase?.tanLeadingEdgeSweep ?? 0,
  tanTrailingEdge: over.nearBase?.tanTrailingEdgeSweep ?? 0,
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
  it('three fins, Mach 1.5 to 1.8: rebuilt, labelled with the routing', () => {
    const cases: [number, BaseFins, string][] = [
      [
        2.5,
        fins({ count: 3, thicknessRatio: 0.024, nearBase: near(doubleWedge(0.024), 1) }),
        'fin-count',
      ],
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

  it('four thin unswept fins at M 1.8 to 3.0: the present factor, extended below its 5% data (0016 section 18)', () => {
    const thin = fins({ thicknessRatio: 0.024, nearBase: near(doubleWedge(0.024)) });
    const r = base(2.5, thin);
    expect(r.finsOnBaseSource).toBe('present');
    expect(r.finsOnBase!.low).toBe(1);
    const at5 = finsOnBaseFactor(2.5, { ...thin, thicknessRatio: 0.05 });
    expect(r.finsOnBase!.high).toBe(at5.high);
    expect(r.labels[1]).toContain("extended below the data's 5% thickness");
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

describe('swept fins at the base (0014 section 10.7): the rebuilt factor, not a refusal', () => {
  const t45 = Math.tan((45 * Math.PI) / 180);
  it("swept fins get the rebuilt factor's value and band; the same fins unswept keep the present factor", () => {
    for (const mach of [1.8, 2.0, 2.4, 2.8]) {
      // Four 8% double wedges, the leading edge swept 45 deg, the trailing edge unswept: the present
      // factor refuses the sweep.
      const swept = fins({ thicknessRatio: 0.08, nearBase: near(doubleWedge(0.08), t45, 0) });
      expect(() => finsOnBaseFactor(mach, swept)).toThrow(/unswept fins/);
      const r = base(mach, swept);
      const w = finsOnBaseFactorW1(mach, {
        ...swept.nearBase!,
        count: 4,
        trailingEdgeAheadOfBase: 0,
      });
      expect(r.finsOnBaseSource).toBe('rebuilt');
      expect(r.presentRefusal?.reason).toBe('fin-sweep');
      expect([r.finsOnBase!.low, r.finsOnBase!.nominal, r.finsOnBase!.high]).toEqual([
        w.low,
        w.nominal,
        w.high,
      ]);
      expect(r.cd).toBeCloseTo(-r.curve.pB * w.nominal, 12);
      expect(r.parts.finsOnBase[0]).toBeCloseTo((w.low - w.nominal) * -r.curve.pB, 12);
      expect(r.parts.finsOnBase[1]).toBeCloseTo((w.high - w.nominal) * -r.curve.pB, 12);
      expect(r.labels[1]).toContain(FINS_ON_BASE_ROUTING_LABEL);
      // The same fins unswept: the present factor, its numbers unchanged.
      const unswept = fins({ thicknessRatio: 0.08, nearBase: near(doubleWedge(0.08)) });
      const u = base(mach, unswept);
      const p = finsOnBaseFactor(mach, unswept);
      expect(u.finsOnBaseSource).toBe('present');
      expect([u.finsOnBase!.low, u.finsOnBase!.nominal, u.finsOnBase!.high]).toEqual([
        p.low,
        p.nominal,
        p.high,
      ]);
    }
    // A sharp section with a swept trailing edge (either way) at the base: refused by both, with a plain
    // reason (0015 section 3.4): no such fins are measured at the base (and none swept forward anywhere), and
    // linear theory gives the faces behind a 45 deg edge 1.67 times the unswept fin's pressures at M 1.6.
    for (const tanTe of [t45, -t45]) {
      const both = fins({ thicknessRatio: 0.045, nearBase: near(doubleWedge(0.045), t45, tanTe) });
      let e: unknown;
      try {
        base(1.6, both);
      } catch (x) {
        e = x;
      }
      expect(e).toBeInstanceOf(BaseRefusal);
      expect((e as BaseRefusal).reason).toBe('fin-sweep');
      // Aft: not measured closer to the base than RM L52J21a's fins, with linear theory's factor; forward:
      // not measured anywhere (RM L52J21a's edge is swept aft).
      expect((e as BaseRefusal).message).toMatch(
        tanTe > 0 ? /deg aft at M 1\.6/ : /deg forward at M 1\.6/,
      );
      if (tanTe > 0) expect((e as BaseRefusal).message).toContain('1.67 times');
    }
    // Through the total: a tapered planform at the base goes to the rebuilt factor.
    const tapered: FinnedBody = {
      body: { nose: { shape: { kind: 'conical' }, length: 2, baseRadius: 0.5 }, cylinderLength: 8 },
      afterbody: 'cylinder',
      fins: {
        count: 4,
        planform: trapezoidalPlanform({
          rootChord: 1,
          span: 1,
          leadingEdgeSweep: Math.PI / 4,
          trailingEdgeSweep: 0,
        }),
        section: doubleWedge(0.08),
        sectionFamily: 'other',
        leadingEdgeRadius: 0,
        trailingEdgeAheadOfBase: 0,
      },
    };
    const c = finnedBodyComponents(
      tapered,
      { mach: 2.0, temperature: 290, reynoldsPerLength: 1.5e6 },
      exactConeNoseWaveDrag(2.0, Math.atan(0.25)),
    );
    expect(c.base?.finsOnBaseSource).toBe('rebuilt');
    expect(c.base?.presentRefusal?.reason).toBe('fin-sweep');
  });
});

describe('fins thinner than 5% at some station (0016 section 18) in the rebuilt factor (0015 section 3.6)', () => {
  it('the thinnest station sets the lower member; no low end of F = 1, the zero member lying below', () => {
    // Four unswept double wedges, 10% at the tip and 4% at the root, at M 1.6, where the present factor
    // refuses the Mach number: the rebuilt factor brackets both stations.
    const tip = doubleWedge(0.1, 0.5);
    const thin = fins({
      thicknessRatio: 0.1,
      thinnest: { thicknessRatio: 0.04, spanShareBelow: 0.5 },
      nearBase: near(tip),
    });
    const r = base(1.6, thin);
    const w = r.finsOnBase as FinsOnBaseFactorW1;
    expect(r.finsOnBaseSource).toBe('rebuilt');
    expect(w.lower).toMatchObject({ thickness: 0 });
    expect(w.upper).toMatchObject({ thickness: 0.1, count: 4 });
    expect(w.tauLow).toBeCloseTo(0.02, 12);
    const scaled: SymmetricSection = {
      ...tip,
      halfThickness: tip.halfThickness.map((h) => h * 0.4),
    };
    const direct = finsOnBaseFactorW1(1.6, {
      ...near(tip),
      spanSections: [scaled],
      count: 4,
      trailingEdgeAheadOfBase: 0,
    });
    expect([w.low, w.nominal, w.high]).toEqual([direct.low, direct.nominal, direct.high]);
    expect(w.low).toBeLessThan(1);
    // Without the thinner station, the lower member would be four fins t/c 0.05.
    const tipOnly = base(1.6, fins({ thicknessRatio: 0.1, nearBase: near(tip) }));
    expect((tipOnly.finsOnBase as FinsOnBaseFactorW1).lower).toMatchObject({ thickness: 0.05 });
  });

  it('a flat plate of one thickness on a tapered planform: bounded from RM L52E06 relief, the tip setting the upper member', () => {
    // A clipped delta swept 45 deg at the leading edge, taper 0.4: t/c 0.03 at the root, 0.075 at the tip.
    const planform = trapezoidalPlanform({
      rootChord: 1,
      span: 0.6,
      leadingEdgeSweep: Math.PI / 4,
    });
    const plateFins = {
      count: 4,
      planform,
      section: flatPlate(0.03, 'rounded', 'square'),
      sectionFamily: 'other' as const,
      leadingEdgeRadius: 0,
      trailingEdgeAheadOfBase: 0,
    };
    const b = baseFinsOf(plateFins);
    expect(b.thicknessRatio).toBeCloseTo(0.075, 12);
    expect(b.thinnest?.thicknessRatio).toBeCloseTo(0.03, 12);
    const r = base(2.0, b);
    const w = r.finsOnBase as FinsOnBaseFactorW1;
    expect(r.finsOnBaseSource).toBe('rebuilt');
    // Plates are not among the present factor's families (0014 section 10.7).
    expect(r.presentRefusal?.reason).toBe('flat-plate-fins');
    expect(w.bounded).toBe(true);
    expect(w.low).toBe(W1_FLAT_RELIEF_LOW);
    expect(w.upper).toMatchObject({ thickness: 0.1 });
    // A rounded trailing edge has no section the rebuilt factor takes: the present factor's refusal stands.
    const rounded = baseFinsOf({ ...plateFins, section: flatPlate(0.03, 'rounded', 'rounded') });
    expect(rounded.nearBase).toBeUndefined();
    expect(() => base(2.0, rounded)).toThrow(BaseRefusal);
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
          tanLeadingEdge: 0,
          tanTrailingEdge: 0,
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
