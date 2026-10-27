/**
 * Which fins-on-base factor the body base uses (src/base/base-drag.ts;
 * docs/design/0015-fins-at-the-base.md section 5; 0014 section 10.3): the
 * present factor wherever it serves, the rebuilt one only where the
 * present one refuses, and the Basic Finner's gate numbers unchanged.
 */

import { describe, expect, it } from 'vitest';
import {
  BLUNT_AHEAD_OF_BASE,
  BLUNT_EDGE_NOTE,
  FINS_ON_BASE_ROUTING_LABEL,
  MORE_THAN_A_CHORD_AHEAD,
  ROUNDED_EDGE_NOTE,
  ROUNDED_PLATE_AHEAD_OF_BASE,
  bodyBaseDrag,
  type BaseFins,
} from '../../src/base/base-drag';
import { COMPILED_CURVE_BAND, compiledCurveBasePressure } from '../../src/base/compiled-curve';
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
import { refusalWords } from '../../src/app/status-words';
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

  it("fins ending within a chord of the base: rebuilt where measured (M 1.5 to 2.0, TN 2360's chord), refused else", () => {
    const f = fins({
      trailingEdgeAheadOfBase: 0.5,
      rootChordOverDiameter: 1.5,
      nearBase: near(doubleWedge(0.08)),
    });
    const r = base(1.8, f);
    expect(r.finsOnBaseSource).toBe('rebuilt');
    expect(r.labels[1]).toContain('it takes fins at the base only');
    expect((r.finsOnBase as FinsOnBaseFactorW1).bounded).toBe(false);
    // Another root chord, or none given, at M 1.8: refused (0015 section 3.3, the chord rule).
    expect(() => base(1.8, { ...f, rootChordOverDiameter: 2.5 })).toThrow(
      /root chord is 2\.50 body diameters/,
    );
    const noChord = { ...f };
    delete noChord.rootChordOverDiameter;
    expect(() => base(1.8, noChord)).toThrow(/is not given/);
    // Below M 1.5 (0015 section 3.3): every position ahead of the base refused.
    for (const xc of [0.2, 0.4, 0.5]) {
      expect(() => base(1.3, { ...f, trailingEdgeAheadOfBase: xc })).toThrow(
        /below Mach 1\.5 no measurement with fins ahead of the base is known/,
      );
    }
    expect(() => base(2.2, f)).toThrow(BaseRefusal);
    expect(() => base(2.2, f)).toThrow(
      /above Mach 2\.0 no measurement with fins ahead of the base is settled/,
    );
    // Without the section the rebuilt factor cannot run: refused as before.
    expect(() => base(1.8, fins({ trailingEdgeAheadOfBase: 0.5 }))).toThrow(/root chords ahead/);
  });

  it('the root chord over body diameter reaches the factor through baseFinsOf, from the body', () => {
    // A double wedge on a rectangular planform of root chord 1, ending half a chord ahead of the base, at M 1.8.
    const set = {
      count: 4,
      planform: trapezoidalPlanform({ rootChord: 1, span: 0.6, leadingEdgeSweep: 0 }),
      section: doubleWedge(0.08),
      sectionFamily: 'other' as const,
      leadingEdgeRadius: 0,
      trailingEdgeAheadOfBase: 0.5,
    };
    expect(baseFinsOf(set).rootChordOverDiameter).toBeUndefined();
    expect(baseFinsOf(set, 1 / 1.5).rootChordOverDiameter).toBeCloseTo(1.5, 12);
    expect(base(1.8, baseFinsOf(set, 1 / 1.5)).finsOnBaseSource).toBe('rebuilt');
    expect(() => base(1.8, baseFinsOf(set, 0.5))).toThrow(/root chord is 2\.00 body diameters/);
    expect(() => base(1.8, baseFinsOf(set))).toThrow(/is not given/);
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

  it("through the total, fins ahead of the base take the body's diameter: TN 2360's chord served, others refused", () => {
    // Unswept double wedges half a root chord ahead of the base, on a body of diameter 1, at M 1.8.
    const ahead = (rootChord: number): FinnedBody => ({
      body: { nose: { shape: { kind: 'conical' }, length: 2, baseRadius: 0.5 }, cylinderLength: 8 },
      afterbody: 'cylinder',
      fins: {
        count: 4,
        planform: trapezoidalPlanform({ rootChord, span: 1, leadingEdgeSweep: 0 }),
        section: doubleWedge(0.08),
        sectionFamily: 'other',
        leadingEdgeRadius: 0,
        trailingEdgeAheadOfBase: 0.5 * rootChord,
      },
    });
    const at = (rootChord: number) =>
      finnedBodyComponents(
        ahead(rootChord),
        { mach: 1.8, temperature: 290, reynoldsPerLength: 1.5e6 },
        exactConeNoseWaveDrag(1.8, Math.atan(0.25)),
      );
    expect(at(1.5).base?.finsOnBaseSource).toBe('rebuilt');
    const other = at(2.0);
    expect(other.base).toBeUndefined();
    const r = other.refusals.find((x) => x.component === 'body base')!;
    expect(r.reason).toBe('fins-near-base');
    expect(r.message).toContain("the fins' root chord is 2.00 body diameters");
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
    // Within a chord ahead of the base it is refused for its trailing edge, at every Mach number, its message
    // beginning so that the page words it near the base, with its position's reasons beside where they apply.
    for (const [mach, diameter, positionToo] of [
      [1.3, 1 / 1.5, true],
      [1.8, 1 / 1.5, false],
      [1.8, 0.5, true],
      [2.5, 1 / 1.5, true],
    ] as const) {
      const ahead = baseFinsOf(
        {
          ...plateFins,
          section: flatPlate(0.03, 'rounded', 'rounded'),
          trailingEdgeAheadOfBase: 0.5,
        },
        diameter,
      );
      try {
        base(mach, ahead);
        throw new Error('served');
      } catch (e) {
        expect(e).toBeInstanceOf(BaseRefusal);
        expect((e as BaseRefusal).reason).toBe('fin-trailing-edge');
        expect((e as BaseRefusal).message.startsWith(ROUNDED_PLATE_AHEAD_OF_BASE)).toBe(true);
        expect((e as BaseRefusal).message).toContain('a rounded trailing edge has no measurement');
        expect((e as BaseRefusal).message.includes('its position is refused too')).toBe(
          positionToo,
        );
      }
    }
  });
});

describe('fins a root chord or more ahead of the base: the plain curve withdrawn (0014 section 10.7 (ad), 2026-10-27)', () => {
  /** A circular arc of t/c tau (half-thickness 2 tau s (1 - s)). */
  const arc = (tau: number): SymmetricSection => {
    const x = Array.from({ length: 201 }, (_, k) => k / 200);
    return { x, halfThickness: x.map((v) => 2 * tau * v * (1 - v)) };
  };
  const arcs10 = (over: Partial<BaseFins> = {}): BaseFins =>
    fins({
      thicknessRatio: 0.1,
      nearBase: { ...near(arc(0.1)), sectionFamily: 'circular-arc' },
      rootChordOverDiameter: 1.5,
      trailingEdgeAheadOfBase: 1,
      ...over,
    });
  const refusalOf = (f: () => unknown): BaseRefusal => {
    try {
      f();
    } catch (e) {
      if (e instanceof BaseRefusal) return e;
      throw e;
    }
    throw new Error('served');
  };

  it("the reviewer's case: four unswept 10% arcs, root chord 1.5 diameters, one chord ahead, M 2.0, its band holding TN 2360's measurement", () => {
    // Served 0.1447 (0.1187 to 0.1563) on the plain curve until 2026-10-27. TN 2360 measured dPb -0.0096
    // (both readings) on a body-alone P_B of -0.1507: -0.1603, 1.107 times the curve, and at least 1.09
    // times it with every error moved toward less suction. The plain curve's band misses both.
    const curve = -compiledCurveBasePressure(2.0).pB;
    expect(Math.round(1e4 * curve) / 1e4).toBe(0.1447);
    expect(Math.round(1e4 * curve * COMPILED_CURVE_BAND.high) / 1e4).toBe(0.1563);
    const measured = 0.1507 + 0.0096;
    expect(measured / curve).toBeGreaterThan(1.107);
    expect(curve * COMPILED_CURVE_BAND.high).toBeLessThan(1.09 * curve);
    // Now: TN 2360's position, through the rebuilt factor.
    const r = base(2.0, arcs10());
    expect(r.finsOnBaseSource).toBe('rebuilt');
    expect(r.finsOnBase).toBeDefined();
    expect(r.labels[1]).toContain(
      'measured on 4 unswept circular-arc fins t/c 0.10 at x/c 1.00 (TN 2360 fig. 6',
    );
    expect(r.low).toBeLessThanOrEqual(1.09 * curve);
    expect(r.high).toBeGreaterThanOrEqual(measured);
    // A trailing edge within 1e-9 of a chord counts as a chord: the same numbers.
    const s = base(2.0, arcs10({ trailingEdgeAheadOfBase: 1 + 1e-12 }));
    expect([s.cd, s.low, s.high]).toEqual([r.cd, r.low, r.high]);
  });

  it("the reviewer's other case: a root chord of 1.0 diameter one chord ahead (x/c 0.67 in TN 2360's terms), refused by the chord rule", () => {
    for (const mach of [1.5, 1.8, 2.0]) {
      const e = refusalOf(() => base(mach, arcs10({ rootChordOverDiameter: 1.0 })));
      expect(e.reason).toBe('fins-near-base');
      expect(e.message).toContain(
        "the fins' root chord is 1.00 body diameters, and TN 2360 measures fins ahead of the base " +
          'only with a root chord of 1.5 body diameters',
      );
    }
  });

  it('every position beyond one chord ahead is refused, at any chord, section and Mach number, in plain words', () => {
    // Each without a chord; the chord added where given.
    const sections: [string, BaseFins][] = [
      [
        'four 10% arcs',
        fins({
          thicknessRatio: 0.1,
          nearBase: { ...near(arc(0.1)), sectionFamily: 'circular-arc' },
        }),
      ],
      ['four 8% double wedges', fins({ nearBase: near(doubleWedge(0.08)) })],
      ['no section given', fins({ thicknessRatio: 0.1 })],
    ];
    for (const [name, g] of sections) {
      for (const chord of [1.5, 1.0, 2.0, undefined]) {
        for (const x of [1 + 1e-6, 1.0001, 1.2, 1.5, 2, 3, 10]) {
          for (const mach of [1.0, 1.2, 1.5, 1.8, 2.0, 2.4, 3.0]) {
            const f: BaseFins =
              chord === undefined
                ? { ...g, trailingEdgeAheadOfBase: x }
                : { ...g, trailingEdgeAheadOfBase: x, rootChordOverDiameter: chord };
            const what = `${name}, chord ${chord}, x ${x}, M ${mach}`;
            const e = refusalOf(() => base(mach, f));
            expect(e.reason, what).toBe('fins-near-base');
            expect(e.message.startsWith(`${MORE_THAN_A_CHORD_AHEAD} (`), what).toBe(true);
            expect(e.message, what).toContain(
              'nothing measures the base drag with fins that far ahead',
            );
            expect(e.message, what).toContain('until 2026-10-27 they took the plain curve');
          }
        }
      }
    }
  });

  it('ahead of the base the position is named first: no refusal of the section leads to a change still refused there', () => {
    // At Mach 2.4 (no position measured), thick or swept fins are refused for the position, not for their
    // thickness or sweep, whose words would send the rocketeer to fins still refused half a chord ahead.
    const thick = fins({
      thicknessRatio: 0.14,
      nearBase: near(doubleWedge(0.14)),
      rootChordOverDiameter: 1.5,
      trailingEdgeAheadOfBase: 0.5,
    });
    expect(refusalOf(() => base(2.4, thick)).reason).toBe('fins-near-base');
    const swept = fins({
      nearBase: near(doubleWedge(0.08), 1, 1),
      rootChordOverDiameter: 1.5,
      trailingEdgeAheadOfBase: 0.5,
    });
    expect(refusalOf(() => base(2.4, swept)).reason).toBe('fins-near-base');
    // Where the position is measured (M 1.8, TN 2360's chord) the section's own refusal stands.
    expect(refusalOf(() => base(1.8, thick)).reason).not.toBe('fins-near-base');
  });

  it("a plate's rounded trailing edge: its words' change (square or sharp edges, at the base) is served; more than a chord ahead, both named", () => {
    // The review's N2 (2026-10-27): the words for a rounded plate near the base once offered fins a chord or
    // more ahead, refused now. Their change today, square trailing edges at the base, is served at every
    // Mach number of the curve.
    const plate = (trailingEdge: 'square' | 'rounded', x: number) => ({
      count: 4,
      planform: trapezoidalPlanform({ rootChord: 1, span: 0.6, leadingEdgeSweep: 0 }),
      section: flatPlate(0.03, 'rounded', trailingEdge),
      sectionFamily: 'other' as const,
      leadingEdgeRadius: 0,
      trailingEdgeAheadOfBase: x,
    });
    for (const mach of [1.0, 1.2, 1.5, 1.8, 2.0, 2.4, 3.0]) {
      const r = base(mach, baseFinsOf(plate('square', 0), 1 / 1.5));
      expect(r.finsOnBase, `M ${mach}`).toBeDefined();
    }
    const far = refusalOf(() => base(1.8, baseFinsOf(plate('rounded', 1.5), 1 / 1.5)));
    expect(far.reason).toBe('fins-near-base');
    expect(far.message.startsWith(MORE_THAN_A_CHORD_AHEAD)).toBe(true);
    expect(far.message).toContain(ROUNDED_EDGE_NOTE);
  });

  it("a blunt trailing edge the faces widen to (the Basic Finner's wedges) ahead of the base: refused for it, the position named where refused", () => {
    const wedges = (x: number) =>
      fins({
        nearBase: near(singleWedge(0.08)),
        rootChordOverDiameter: 1.5,
        trailingEdgeAheadOfBase: x,
      });
    const measured = refusalOf(() => base(1.8, wedges(0.5)));
    expect(measured.reason).toBe('fin-trailing-edge');
    expect(
      measured.message.startsWith(`${BLUNT_AHEAD_OF_BASE} 0.5 root chords ahead of the base: `),
    ).toBe(true);
    expect(measured.message).not.toContain('its position is refused too');
    expect(measured.message).not.toMatch(/ at the base[:;]/);
    const unmeasured = refusalOf(() => base(2.4, wedges(0.5)));
    expect(unmeasured.reason).toBe('fin-trailing-edge');
    expect(unmeasured.message).toContain('its position is refused too: above Mach 2.0');
    // More than a chord ahead: the position's refusal, the trailing edge named beside it.
    const far = refusalOf(() => base(1.8, wedges(1.5)));
    expect(far.reason).toBe('fins-near-base');
    expect(far.message).toContain(BLUNT_EDGE_NOTE);
    // The change the words name, sharp trailing edges at the base, is served at every Mach number.
    for (const mach of [1.0, 1.2, 1.5, 1.8, 2.0, 2.4, 3.0]) {
      const r = base(mach, fins({ nearBase: near(doubleWedge(0.08)) }));
      expect(r.finsOnBase, `M ${mach}`).toBeDefined();
    }
  });
});

describe('a refusal ahead of the base carries the same fins refused at the base (the review of b323511, finding 1)', () => {
  // Fins of root chord 2.0 body diameters (body diameter 1) ending half a chord ahead of the base, at M 1.8.
  const rocket = (
    count: number,
    section: SymmetricSection,
    leadingEdgeSweepDeg: number,
  ): FinnedBody => ({
    body: { nose: { shape: { kind: 'conical' }, length: 2, baseRadius: 0.5 }, cylinderLength: 8 },
    afterbody: 'cylinder',
    fins: {
      count,
      planform: trapezoidalPlanform({
        rootChord: 2,
        span: 1,
        leadingEdgeSweep: (leadingEdgeSweepDeg * Math.PI) / 180,
        trailingEdgeSweep: 0,
      }),
      section,
      sectionFamily: 'other',
      leadingEdgeRadius: 0,
      trailingEdgeAheadOfBase: 1,
    },
  });
  const baseRefusal = (c: FinnedBody) =>
    finnedBodyComponents(
      c,
      { mach: 1.8, temperature: 290, reynoldsPerLength: 1.5e6 },
      exactConeNoseWaveDrag(1.8, Math.atan(0.25)),
    ).refusals.find((r) => r.component === 'body base')!;

  it("the review's case: three 5% double wedges, clipped delta, leading edge 34.2 deg, x/c 0.5, M 1.8: position and sweep named", () => {
    const r = baseRefusal(rocket(3, doubleWedge(0.05), 34.2));
    expect(r.reason).toBe('fins-near-base');
    expect(r.message).toContain("the fins' root chord is 2.00 body diameters");
    expect(r.atBase?.reason).toBe('fin-sweep');
    expect(r.message).toContain('; at the base the same fins are refused too: ');
    const words = refusalWords(r);
    expect(words.reason).toMatch(/^fins ending ahead of the base: /);
    expect(words.reason).toContain(
      '; and with the fins at the base, with fins at the base, the base drag is measured with unswept fins only',
    );
    expect(words.change).toBe(
      "the fins' trailing edges at the base, and unswept fins of constant chord",
    );
  });

  it('where the same fins are served at the base, the position alone is named', () => {
    // Four unswept 8% double wedges: at the base the present factor serves them at M 1.8.
    const served = rocket(4, doubleWedge(0.08), 0);
    const atBase: FinnedBody = { ...served, fins: { ...served.fins, trailingEdgeAheadOfBase: 0 } };
    expect(
      finnedBodyComponents(
        atBase,
        { mach: 1.8, temperature: 290, reynoldsPerLength: 1.5e6 },
        exactConeNoseWaveDrag(1.8, Math.atan(0.25)),
      ).base?.finsOnBaseSource,
    ).toBe('present');
    const r = baseRefusal(served);
    expect(r.reason).toBe('fins-near-base');
    expect(r.atBase).toBeUndefined();
    expect('atBase' in r).toBe(false);
    expect(r.message).not.toContain('at the base the same fins are refused too');
    expect(refusalWords(r).change).toBe("the fins' trailing edges at the base");
  });

  it('more than a chord ahead too, and for a blunt trailing edge ahead of the base', () => {
    const far = rocket(3, doubleWedge(0.05), 34.2);
    const farther: FinnedBody = { ...far, fins: { ...far.fins, trailingEdgeAheadOfBase: 3 } };
    const r = baseRefusal(farther);
    expect(r.message.startsWith(MORE_THAN_A_CHORD_AHEAD)).toBe(true);
    expect(r.atBase?.reason).toBe('fin-sweep');
    // Five wedges thickening to a blunt trailing edge: refused for the trailing edge, and at the base for
    // their count, which comes first there.
    const five = rocket(5, singleWedge(0.08), 0);
    const b = baseRefusal(five);
    expect(b.reason).toBe('fin-trailing-edge');
    expect(b.message.startsWith(BLUNT_AHEAD_OF_BASE)).toBe(true);
    expect(b.atBase?.reason).toBe('fin-count');
    expect(refusalWords(b).change).toBe(
      'sharp trailing edges, with the fins ending at the base, and four fins',
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
