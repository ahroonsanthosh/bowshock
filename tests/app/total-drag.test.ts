/**
 * The total drag on the drag page (src/app/total-drag.ts): the class rule
 * of docs/design/0011-total-drag-on-the-page.md section 3, the glue
 * between the page's inputs and src/total, and the claims. On the Basic
 * Finner's 11 gated shots the page's numbers are the gate's
 * (tests/validation/basic-finner.test.ts, 0010 section 4.2), with the nose
 * given as the gate gave it.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { FITTED_DRAG_FLOOR, TWO_SCALE_DRAG_FLOOR } from '../../src/analysis/verified-drag';
import { ALTITUDE_RANGE, standardAtmosphere } from '../../src/atmosphere/us-standard-1976';
import { flightConditionOf } from '../../src/app/flight-condition';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { roundedLeadingEdgeDrag, TN2960_RANGE } from '../../src/fins/rounded-leading-edge';
import { doubleWedge, singleWedge } from '../../src/fins/section';
import { BLUNT_AHEAD_OF_BASE, bodyBaseDrag, type BaseFins } from '../../src/base/base-drag';
import { COMPILED_CURVE_BAND } from '../../src/base/compiled-curve';
import {
  finnedBodyComponents,
  SWEPT_EDGE_BOUNDED_REASON,
  type FinnedBody,
} from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import { combineComponents, type TotalDrag } from '../../src/total/total-drag';
import {
  BASIC_FINNER_CLUSTERS,
  BASIC_FINNER_GEOMETRY as G,
  BASIC_FINNER_SHOTS,
} from '../../src/validation/basic-finner';
import { outward, outwardPercent } from '../../src/app/band';
import { displayText, gateDisplay, totalDragDisplay } from '../../src/app/total-drag-display';
import { claimWords, SWEPT_EDGE_BOUNDED_WORDS } from '../../src/app/status-words';
import {
  ABOVE_THE_CLASS,
  BASIC_FINNER_CLASS,
  BASIC_FINNER_REYNOLDS_PER_MACH,
  BOUNDED_REASON,
  boundedReasons,
  W1_BOUNDED_REASON,
  BASIC_FINNER_TEMPERATURE,
  TEMPERATURE_SENSITIVITY,
  basicFinnerClass,
  basicFinnerForm,
  configurationOf,
  ESTIMATE_CLAIM,
  FINS_BAND_NOTE,
  FINS_ON_BASE_BOUNDED_NOTE,
  FINS_ON_BASE_NOTE,
  GATE_TRANSITION_REYNOLDS,
  noseComponentOf,
  allowanceText,
  bandCaveat,
  CLASS_CLAIM,
  CLASS_DESCRIPTION,
  PUBLISHED_GATE,
  totalDragView,
  SUSPENDED_REASON,
  type Claim,
  type NoseState,
  type TotalDragForm,
  type TotalDragView,
} from '../../src/app/total-drag';

const gated = BASIC_FINNER_SHOTS.filter((s) => s.use === 'gate');
const reported = BASIC_FINNER_SHOTS.filter((s) => s.use === 'reported');

/** The nose as the gate gave it: Taylor-Maccoll with the fitted solver's floor. */
const exactNose = (form: TotalDragForm): NoseState => {
  const n = form.body.nose;
  return {
    kind: 'solved',
    verified: true,
    component: exactConeNoseWaveDrag(form.mach, Math.atan(n.baseRadius / n.length)),
  };
};
const gateForm = (s: (typeof gated)[number]): TotalDragForm => ({
  ...basicFinnerForm(s.mach, s.reynolds),
  transitionReynolds: GATE_TRANSITION_REYNOLDS,
  wallTemperature: BASIC_FINNER_TEMPERATURE,
});
const totalOf = (view: TotalDragView): TotalDrag => {
  if (view.kind !== 'total') throw new Error(`expected a total, got ${view.kind}`);
  return view.total;
};
const reasons = (view: TotalDragView) =>
  view.kind === 'refused' ? view.refusals.map((r) => `${r.component}: ${r.reason}`) : [];
/** An estimate's reasons; a validated claim has none (it has caveats). */
const reasonsOf = (claim: Claim): readonly string[] => {
  if (claim.kind !== 'estimate') throw new Error(`expected an estimate, got ${claim.kind}`);
  return claim.reasons;
};

describe('the class rule', { timeout: 60_000 }, () => {
  it('the Basic Finner at its gated shots to Mach 2.15, and the default at Mach 2, are inside; the shots above, outside by their Mach number alone', () => {
    const below = gated.filter((s) => s.mach <= 2.15);
    expect(below.map((s) => s.mach)).toEqual([1.799, 1.846, 1.85]);
    for (const s of below)
      expect(basicFinnerClass(gateForm(s))).toEqual({ inside: true, outside: [] });
    // The eight at Mach 2.35 to 2.97 tested a total whose fins-on-base factor rests on a
    // prediction drawn in TN 3819 fig. 35 (0010 section 7).
    const above = gated.filter((s) => s.mach > 2.15);
    expect(above.length).toBe(8);
    for (const s of above) {
      expect(basicFinnerClass(gateForm(s))).toEqual({
        inside: false,
        outside: [`Mach ${s.mach} is outside 1.799 to 2.15${ABOVE_THE_CLASS}`],
      });
    }
    expect(basicFinnerClass(basicFinnerForm()).inside).toBe(true);
  });

  it("fig. 2's printed cone length, 2.84 cal, with the body to 10.00, is inside", () => {
    const f = basicFinnerForm();
    const form = {
      ...f,
      body: { ...f.body, nose: { ...f.body.nose, length: 2.84 }, cylinderLength: 7.16 },
    };
    expect(basicFinnerClass(form).inside).toBe(true);
  });

  it('each dimension: inside within 0.5%, outside beyond it, with one reason', () => {
    const f = basicFinnerForm();
    const c = BASIC_FINNER_CLASS;
    const variants: [string, number, (x: number) => TotalDragForm][] = [
      [
        'nose',
        c.noseLength,
        (x) => ({
          ...f,
          body: { nose: { ...f.body.nose, length: x }, cylinderLength: c.length - x },
        }),
      ],
      [
        'length',
        c.length,
        (x) => ({ ...f, body: { ...f.body, cylinderLength: x - c.noseLength } }),
      ],
      ['chord', c.rootChord, (x) => ({ ...f, rootChord: x })],
      ['span', c.span, (x) => ({ ...f, span: x })],
      [
        'trailing edge',
        c.trailingEdgeThickness,
        (x) => ({ ...f, section: { kind: 'single-wedge', trailingEdgeThickness: x } }),
      ],
      ['leading edge', c.leadingEdgeRadius, (x) => ({ ...f, leadingEdgeRadius: x })],
    ];
    for (const [, v, make] of variants) {
      for (const k of [0.996, 1.004]) expect(basicFinnerClass(make(v * k)).inside).toBe(true);
      for (const k of [0.994, 1.006]) {
        const check = basicFinnerClass(make(v * k));
        expect(check.inside).toBe(false);
        expect(check.outside.length).toBe(1);
      }
    }
  });

  it('other noses, fin counts, planforms, positions and sections are outside', () => {
    const f = basicFinnerForm();
    const outside = (form: TotalDragForm) => basicFinnerClass(form).outside;
    expect(
      outside({
        ...f,
        body: { ...f.body, nose: { ...f.body.nose, shape: { kind: 'ogive', parameter: 1 } } },
      }),
    ).toEqual(["the nose is not a cone (the Basic Finner's is a 20 deg cone)"]);
    expect(outside({ ...f, finCount: 3 })).toEqual(['3 fins, not 4']);
    expect(
      outside({
        ...f,
        planform: { kind: 'trapezoidal', leadingEdgeSweepDegrees: 10, trailingEdgeSweepDegrees: 0 },
      }),
    ).toEqual(['the fins are not rectangular (unswept, of constant chord)']);
    expect(
      basicFinnerClass({
        ...f,
        planform: { kind: 'trapezoidal', leadingEdgeSweepDegrees: 0, trailingEdgeSweepDegrees: 0 },
      }).inside,
    ).toBe(true);
    expect(outside({ ...f, planform: { kind: 'clipped-delta', taperRatio: 0.5 } }).length).toBe(1);
    expect(outside({ ...f, trailingEdgeAheadOfBase: 1 })).toEqual([
      'the fins end 1 cal ahead of the base, not at it',
    ]);
    expect(
      outside({ ...f, section: { kind: 'double-wedge', thickness: 0.08, ridge: 0.5 } }),
    ).toEqual(['the fin section is not a single wedge with a blunt trailing edge']);
    expect(outside({ ...f, leadingEdgeRadius: 0 }).length).toBe(1);
  });

  it('Mach 1.799 to 2.15, Reynolds number 1.19e7 to 2.0e7 on length, 216.65 to 320 K', () => {
    const f = basicFinnerForm();
    const at = (mach: number, re: number, t = BASIC_FINNER_TEMPERATURE) =>
      basicFinnerClass({ ...f, mach, reynoldsOnLength: re, temperature: t }).inside;
    expect(BASIC_FINNER_CLASS.mach).toEqual([1.799, 2.15]);
    expect(BASIC_FINNER_CLASS.reynoldsOnLength).toEqual([1.19e7, 2.0e7]);
    expect(at(1.799, 1.19e7)).toBe(true);
    expect(at(2.15, 2.0e7)).toBe(true);
    expect(at(1.798, 1.5e7)).toBe(false);
    expect(at(2.151, 1.5e7)).toBe(false);
    expect(at(3.0, 2.0e7)).toBe(false);
    // Above the class the reason says why it stops there; below it, the reason is the range.
    const outside = (mach: number) =>
      basicFinnerClass({ ...f, mach, reynoldsOnLength: 1.5e7 }).outside;
    expect(outside(2.4)).toEqual([
      "Mach 2.4 is outside 1.799 to 2.15 (above Mach 2.15 the gate tested a fins-on-base factor read from one of Love's estimates in TN 3819 fig. 35, not from its free-flight curve; the factor corrected since has no hold-out there)",
    ]);
    expect(outside(1.7)).toEqual(['Mach 1.7 is outside 1.799 to 2.15']);
    expect(at(2.0, 1.189e7)).toBe(false);
    expect(at(2.0, 2.001e7)).toBe(false);
    expect(BASIC_FINNER_CLASS.temperature).toEqual([216.65, 320]);
    expect(at(2.0, 1.6e7, 216.65)).toBe(true);
    expect(at(2.0, 1.6e7, 320)).toBe(true);
    expect(at(2.0, 1.6e7, 288.15)).toBe(true);
    expect(at(2.0, 1.6e7, 216.6)).toBe(false);
    expect(at(2.0, 1.6e7, 320.1)).toBe(false);
    expect(
      basicFinnerClass({ ...f, mach: 2.0, reynoldsOnLength: 1.6e7, temperature: 330 }).outside,
    ).toEqual(['the static temperature, 330 K, is outside 216.65 to 320 K']);
    for (const s of reported) expect(at(s.mach, s.reynolds)).toBe(false);
    // The range's air from Table V's speed of sound, 343.4 to 344.0 m/s: about 294 K.
    const t = (a: number) => a ** 2 / (1.4 * 287.05);
    expect([t(343.4), t(344.0)].map((x) => Math.round(10 * x) / 10)).toEqual([293.4, 294.5]);
  });

  it("a standard atmosphere's air lies in the class's temperatures from 4,896 m below sea level to 51 km", () => {
    const f = basicFinnerForm(2.0, 1.6e7);
    const inside = (z: number) =>
      basicFinnerClass({ ...f, temperature: standardAtmosphere(z).temperature }).inside;
    expect([-4897, -4896, 0, 11000, 20000, 47000, ALTITUDE_RANGE[1]].map(inside)).toEqual([
      false,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
    // Its coldest, 216.65 K, from 11 to 20 km' (Table 4), the class's low end.
    expect(standardAtmosphere(15000).temperature).toBeCloseTo(216.65, 12);
    // The range's 293.95 K about 890 m below sea level.
    expect(standardAtmosphere(-892).temperature).toBeCloseTo(293.95, 2);
    // At sea level the Basic Finner's 30 mm body gives 6.99e6 per unit Mach number, 5.6% above
    // the range's 6.62e6 (its air warmer, 293.95 K).
    const c = flightConditionOf({
      altitude: 0,
      altitudeUnit: 'm',
      mach: 1,
      diameterMm: 1000 * G.caliberMetres,
      lengthCalibers: G.length,
    });
    if (c.kind !== 'ok') throw new Error('expected a condition');
    expect(c.value.reynoldsOnLength).toBeCloseTo(6.99e6, -4);
    expect(c.value.reynoldsOnLength / BASIC_FINNER_REYNOLDS_PER_MACH - 1).toBeCloseTo(0.056, 3);
  });

  it(
    'what the tolerances allow: each dimension at +-0.5% moves the total by under 0.2%, all together under 0.6%',
    { timeout: 120_000 },
    () => {
      const c = BASIC_FINNER_CLASS;
      // The largest change of the total over the class's Mach numbers, per dimension.
      const largest = new Map<string, number>();
      for (const mach of [1.8, 2.0, 2.15]) {
        const base = basicFinnerForm(mach);
        const ref = totalOf(totalDragView(base, exactNose(base))).cd;
        const moved = (form: TotalDragForm) =>
          Math.abs(totalOf(totalDragView(form, exactNose(form))).cd / ref - 1);
        for (const k of [1 - c.dimensionTolerance, 1 + c.dimensionTolerance]) {
          const forms: [string, TotalDragForm][] = [
            [
              'cone length',
              {
                ...base,
                body: {
                  nose: { ...base.body.nose, length: c.noseLength * k },
                  cylinderLength: c.length - c.noseLength * k,
                },
              },
            ],
            [
              'overall length',
              { ...base, body: { ...base.body, cylinderLength: c.length * k - c.noseLength } },
            ],
            ['root chord', { ...base, rootChord: k }],
            ['span', { ...base, span: k }],
            [
              'trailing-edge thickness',
              {
                ...base,
                section: {
                  kind: 'single-wedge',
                  trailingEdgeThickness: c.trailingEdgeThickness * k,
                },
              },
            ],
            ['leading-edge radius', { ...base, leadingEdgeRadius: c.leadingEdgeRadius * k }],
          ];
          for (const [name, form] of forms) {
            expect(basicFinnerClass(form).inside).toBe(true);
            largest.set(name, Math.max(largest.get(name) ?? 0, moved(form)));
          }
        }
      }
      const r = (x: number) => Math.round(1e4 * x) / 100;
      expect(Object.fromEntries([...largest].map(([n, x]) => [n, r(x)]))).toEqual({
        'cone length': 0.17,
        'overall length': 0.09,
        'root chord': 0.01,
        span: 0.17,
        'trailing-edge thickness': 0.12,
        'leading-edge radius': 0.04,
      });
      const sum = [...largest.values()].reduce((a, x) => a + x, 0);
      expect(sum).toBeLessThan(0.006);
    },
  );

  it(
    "the box's corners: at Mach 1.8 and 2.0e7, and Mach 2.15 and 1.19e7, the model lies 1.6% below and 0.7% above the shots' line",
    { timeout: 60_000 },
    () => {
      // The shots lie near Re = 6.6e6 M on length (one range, one air);
      // the box of 0010 section 7 takes its corners too.
      const cd = (mach: number, re: number) => {
        const form = basicFinnerForm(mach, re);
        return totalOf(totalDragView(form, exactNose(form))).cd;
      };
      const k = BASIC_FINNER_REYNOLDS_PER_MACH;
      const low = cd(1.8, 2.0e7) / cd(1.8, k * 1.8) - 1;
      const high = cd(2.15, 1.19e7) / cd(2.15, k * 2.15) - 1;
      expect(low).toBeGreaterThan(-0.0165);
      expect(low).toBeLessThan(-0.0155);
      expect(high).toBeGreaterThan(0.006);
      expect(high).toBeLessThan(0.007);
      const ratios = gated.map((s) => s.reynolds / s.mach);
      expect(Math.min(...ratios)).toBeGreaterThan(6.53e6);
      expect(Math.max(...ratios)).toBeLessThan(6.72e6);
      expect(k).toBeCloseTo(6.618e6, -3);
    },
  );

  it(
    "the static temperature over the class, 216.65 to 320 K: the total moves from its value at the range's air by at most 0.13%",
    { timeout: 300_000 },
    () => {
      // Swept at the class's Mach numbers 1.8, 2.0 and 2.15, with the Reynolds number held at
      // each of its ends and inside, 1.6e7; the reference is the range's air, 293.95 K.
      const temperatures = [216.65, ...Array.from({ length: 11 }, (_, k) => 220 + 10 * k)];
      expect(temperatures.at(-1)).toBe(320);
      let largest = { change: 0, at: '' };
      for (const mach of [1.8, 2.0, 2.15]) {
        for (const reynoldsOnLength of [1.19e7, 1.6e7, 2.0e7]) {
          const base = { ...basicFinnerForm(mach, reynoldsOnLength) };
          const cd = (temperature: number) => {
            const form = { ...base, temperature };
            expect(basicFinnerClass(form).inside).toBe(true);
            return totalOf(totalDragView(form, exactNose(form))).cd;
          };
          const ref = cd(BASIC_FINNER_TEMPERATURE);
          for (const t of temperatures) {
            const change = Math.abs(cd(t) / ref - 1);
            if (change > largest.change)
              largest = { change, at: `M ${mach}, Re ${reynoldsOnLength}, ${t} K` };
          }
        }
      }
      // 0.128%, at the class's corner of highest Mach and lowest Reynolds number, coldest air
      // (0.206% at Mach 3.0 when the class ran to it).
      expect(largest.at).toBe('M 2.15, Re 11900000, 216.65 K');
      expect(Math.round(1e4 * largest.change) / 1e4).toBe(TEMPERATURE_SENSITIVITY);
      expect(TEMPERATURE_SENSITIVITY).toBe(0.0013);
      // Against the residuals, -7.7% to +4.5%, and the tolerance, about -20% to +27%: small.
      expect(CLASS_DESCRIPTION).toContain('at most 0.13%');
    },
  );
});

describe('the Basic Finner default as the page shows it', { timeout: 60_000 }, () => {
  it('at Mach 1.8 to 3.0, the range Reynolds number, no inputs: an estimate everywhere (inside the class the claim suspended, above it outside), its band rounded outward', () => {
    const shown = [1.8, 2.0, 2.15, 2.4, 2.75, 2.97, 3.0].map((mach) => {
      const form = basicFinnerForm(mach);
      const v = totalDragView(form, exactNose(form));
      if (v.kind !== 'total') throw new Error(v.kind);
      expect(v.claim.kind).toBe('estimate');
      expect(basicFinnerClass(form).inside).toBe(mach <= 2.15);
      expect(v.claim.text).toBe(mach <= 2.15 ? CLASS_CLAIM : ESTIMATE_CLAIM);
      expect(reasonsOf(v.claim)).toEqual(
        mach <= 2.15
          ? [SUSPENDED_REASON]
          : [
              `Mach ${mach} is outside 1.799 to 2.15${ABOVE_THE_CLASS}`,
              ...(mach > 2.56 ? [BOUNDED_REASON] : []),
            ],
      );
      const t = v.total;
      return [
        t.cd.toFixed(4),
        outward(t.low, t.high, 4).join(' to '),
        outwardPercent(t.low / t.cd - 1, t.high / t.cd - 1),
      ];
    });
    // With the corrected fins-on-base factor (0010 section 11); before it, at the same Mach
    // numbers: 0.6121, 0.5501, 0.5188, 0.4768, 0.4320, 0.4072, 0.4040. The bands with the compiled
    // curve's band 0.77 to 1.17 (0014 10.7 (ah) and its addenda; with 0.77 to 1.18 before round 19 the
    // high ends were +22.6%, +21.6%, +21.9%, +21.9%, +21.7%, +21.3%, +21.2%, with 0.77 to 1.13 before round
    // 20 +20.8%, +19.9%, +20.3%, +20.4%, +20.2%, +19.9%, +19.8%); with 0.82 to 1.08 before (ah): -13.7% to
    // +19.0%,
    // -12.5% to +18.2%, -12.9% to +18.7%, -12.9% to +18.8%, -12.7% to +18.7%, -12.5% to +18.4%,
    // -12.4% to +18.3%.
    expect(shown).toEqual([
      ['0.6131', '0.5184 to 0.7490', '-15.5% to +22.2%'],
      ['0.5493', '0.4717 to 0.6656', '-14.2% to +21.2%'],
      ['0.5176', '0.4428 to 0.6292', '-14.5% to +21.6%'],
      ['0.4725', '0.4041 to 0.5745', '-14.5% to +21.6%'],
      ['0.4203', '0.3606 to 0.5100', '-14.2% to +21.4%'],
      ['0.3951', '0.3401 to 0.4781', '-14.0% to +21.1%'],
      ['0.3919', '0.3377 to 0.4738', '-13.9% to +21.0%'],
    ]);
  });

  it('the claim suspended (0010 section 11.7): an estimate, not validated, with the corrected band, never refused, inside the class (M 1.8, 2.0, 2.15) and above it (M 2.3, 2.5, 2.9), on the page and in the library', () => {
    const shown = [1.8, 2.0, 2.15, 2.3, 2.5, 2.9].map((mach) => {
      const form = basicFinnerForm(mach);
      const v = totalDragView(form, exactNose(form));
      if (v.kind !== 'total') throw new Error(`refused at M ${mach}: ${reasons(v).join(', ')}`);
      expect(v.claim.kind).toBe('estimate');
      // The reason says plainly why: inside the class, the suspension; above it, the class.
      expect(reasonsOf(v.claim)[0]).toBe(
        mach <= 2.15 ? SUSPENDED_REASON : `Mach ${mach} is outside 1.799 to 2.15${ABOVE_THE_CLASS}`,
      );
      // Nowhere in what the page shows is the total called validated.
      const said = displayText(totalDragDisplay(v));
      expect(said).toContain(': an estimate, not validated');
      // (The other uses of the word are body friction's band, validated on friction data, and,
      // outside the class, the BRL sub-class it lies outside, 0014 section 10.7 (q).)
      expect(
        said
          .replace(/not validated/gi, '')
          .replace("friction's band is validated on wind-tunnel and flight data of friction", '')
          .replace('(whose validated claim is suspended;', '')
          .replace('outside its narrow validated sub-class', ''),
      ).not.toMatch(/validated/i);
      const base = v.total.components.find((c) => c.name === 'body base')!;
      expect(base.label).toContain(
        mach > 2.56 ? 'bounded, not measured' : 'an analogy, not a measurement',
      );
      // The library: src/total with the same configuration refuses nothing.
      const c = configurationOf(form);
      const nose = exactNose(form);
      if (c.kind !== 'ok' || nose.kind !== 'solved') throw new Error('unreachable');
      const lib = finnedBodyComponents(
        c.value.config,
        c.value.conditions,
        nose.component,
        c.value.inputs,
      );
      expect(lib.refusals).toEqual([]);
      expect(combineComponents(lib.components, lib.inputs).cd).toBe(v.total.cd);
      expect(lib.base!.finsOnBase!.bounded).toBe(mach > 2.56);
      const t = v.total;
      return [
        t.cd.toFixed(4),
        outward(t.low, t.high, 4).join(' to '),
        outwardPercent(t.low / t.cd - 1, t.high / t.cd - 1),
      ];
    });
    // The compiled curve's band 0.77 to 1.17 (0014 10.7 (ah) and its addenda).
    expect(shown).toEqual([
      ['0.6131', '0.5184 to 0.7490', '-15.5% to +22.2%'],
      ['0.5493', '0.4717 to 0.6656', '-14.2% to +21.2%'],
      ['0.5176', '0.4428 to 0.6292', '-14.5% to +21.6%'],
      ['0.4896', '0.4182 to 0.5958', '-14.6% to +21.7%'],
      ['0.4564', '0.3926 to 0.5528', '-14.0% to +21.2%'],
      ['0.4028', '0.3462 to 0.4881', '-14.1% to +21.2%'],
    ]);
  });

  it('carries the notes the labels do not: the fins one-sided band, the fins-on-base factor', () => {
    const at = (mach: number) => {
      const form = basicFinnerForm(mach);
      const v = totalDragView(form, exactNose(form));
      if (v.kind !== 'total') throw new Error(v.kind);
      return v.notes;
    };
    expect(at(2.4)).toEqual([FINS_BAND_NOTE, FINS_ON_BASE_NOTE]);
    expect(at(1.799).some((n) => n.includes('the M 1.80 row is taken'))).toBe(true);
    // Every row rests on two readings; above the curve's end, the bounded note.
    expect(at(2.56)).toEqual([FINS_BAND_NOTE, FINS_ON_BASE_NOTE]);
    expect(at(2.57)).toEqual([FINS_BAND_NOTE, FINS_ON_BASE_NOTE, FINS_ON_BASE_BOUNDED_NOTE]);
    expect(at(2.99)).toEqual([FINS_BAND_NOTE, FINS_ON_BASE_NOTE, FINS_ON_BASE_BOUNDED_NOTE]);
    // Fins a chord ahead took the plain curve, with no factor and no note on it, until 2026-10-27;
    // refused now (0014 section 10.7 (ad)): no total, so no notes. The wedges' blunt trailing edge is
    // named first, and the position (Mach 2.4, a chord of one diameter) beside it.
    const clear = { ...basicFinnerForm(2.4), trailingEdgeAheadOfBase: 1 };
    const v = totalDragView(clear, exactNose(clear));
    expect(v.kind).toBe('refused');
    expect(reasons(v)).toEqual(['body base: fin-trailing-edge']);
    const message = v.kind === 'refused' ? v.refusals[0]!.message : '';
    expect(message.startsWith(`${BLUNT_AHEAD_OF_BASE} 1 root chords ahead of the base: `)).toBe(
      true,
    );
    expect(message).toMatch(
      /; its position is refused too: above Mach 2\.0 .*; and the fins' root chord is 1\.00 body diameters/,
    );
  });
});

describe('the page against the gate: the 11 shots', { timeout: 120_000 }, () => {
  const half = (G.coneHalfAngleDegrees * Math.PI) / 180;
  const noseLength = G.length / 20 / Math.tan(half);
  // The gate's configuration, built as tests/validation/basic-finner.test.ts builds it.
  const asTranscribed: FinnedBody = {
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
  const temperature = 343.7 ** 2 / (1.4 * 287.05);
  let views: TotalDragView[] = [];
  let gate: TotalDrag[] = [];
  beforeAll(() => {
    views = gated.map((s) => totalDragView(gateForm(s), exactNose(gateForm(s))));
    gate = gated.map((s) => {
      const parts = finnedBodyComponents(
        asTranscribed,
        { mach: s.mach, temperature, reynoldsPerLength: s.reynolds / G.length },
        exactConeNoseWaveDrag(s.mach, half),
        { transitionReynolds: [5e5, 1.6e6, 3e6], wallTemperature: temperature },
      );
      return combineComponents(parts.components, parts.inputs);
    });
    // 22 totals with their inputs: seconds each under load.
  }, 300_000);

  it("every number the page shows is the gate's: the total, each band, each component", () => {
    views.forEach((v, k) => {
      const t = totalOf(v);
      const g = gate[k]!;
      for (const [a, b] of [
        [t.cd, g.cd],
        [t.low, g.low],
        [t.high, g.high],
      ] as const) {
        expect(Math.abs(a - b)).toBeLessThan(1e-12);
      }
      expect(t.components.map((c) => c.name)).toEqual(g.components.map((c) => c.name));
      t.components.forEach((c, j) => {
        const d = g.components[j]!;
        expect(
          Math.abs(c.cd - d.cd) + Math.abs(c.low - d.low) + Math.abs(c.high - d.high),
        ).toBeLessThan(1e-12);
        expect(c.label).toBe(d.label);
      });
      expect(t.inputs.map((i) => i.name)).toEqual(g.inputs.map((i) => i.name));
      t.inputs.forEach((i, j) => {
        expect(
          Math.abs(i.low - g.inputs[j]!.low) + Math.abs(i.high - g.inputs[j]!.high),
        ).toBeLessThan(1e-12);
      });
    });
  });

  it('the table the page publishes is the corrected gate (0010 section 11), held to the library, with the second run beside it (section 4.2)', () => {
    expect(PUBLISHED_GATE.map((p) => p.secondRun)).toEqual([
      -3.0, 0.4, -4.6, 3.2, -0.9, -0.3, 0.7, -7.7, 4.5, -5.4, -7.6,
    ]);
    const cx0 = (m: number) => gated.find((s) => s.mach === m)!.cx0;
    const spread = BASIC_FINNER_CLUSTERS.map(([a, b]) => {
      const v = gated.filter((s) => s.mach >= a && s.mach <= b).map((s) => s.cx0);
      const mean = v.reduce((p, q) => p + q, 0) / v.length;
      return { lo: Math.min(...v) / mean - 1, hi: Math.max(...v) / mean - 1 };
    });
    expect(PUBLISHED_GATE.map((p) => p.shot)).toEqual(gated.map((s) => s.shot));
    // The table is the corrected run's: its bands and tolerances were formed with the compiled
    // curve's band at the run, 0.82 to 1.08. The library's carry 0.77 to 1.17 since 0014 10.7 (ah) and its
    // addenda,
    // so the table is held to the library less that widening of the body base's band ends (the
    // change in the band's end times the body base term); the totals and residuals are the same.
    const atTheRun = (t: TotalDrag) => {
      const base = t.components.find((c) => c.name === 'body base')!.cd;
      return {
        low: t.low - (COMPILED_CURVE_BAND.low - 0.82) * base,
        high: t.high - (COMPILED_CURVE_BAND.high - 1.08) * base,
      };
    };
    // The band rounded outward, as every band on the page is (src/app/band.ts).
    expect(PUBLISHED_GATE.map((p) => [p.cd, p.low, p.high])).toEqual(
      views.map((v) => {
        const t = totalOf(v);
        const r = atTheRun(t);
        return [Math.round(1e4 * t.cd) / 1e4, ...outward(r.low, r.high, 4).map(Number)];
      }),
    );
    PUBLISHED_GATE.forEach((p, k) => {
      const t = totalOf(views[k]!);
      const r = atTheRun(t);
      expect(p.mach).toBe(gated[k]!.mach);
      expect(p.cx0).toBe(cx0(p.mach));
      expect(p.residual).toBe(Math.round(1000 * (p.cx0 / t.cd - 1)) / 10);
      const inLow = t.inputs.reduce((a, i) => a + i.low, 0);
      const inHigh = t.inputs.reduce((a, i) => a + i.high, 0);
      const s = spread[BASIC_FINNER_CLUSTERS.findIndex(([a, b]) => p.mach >= a && p.mach <= b)]!;
      expect(p.tolerance).toEqual(
        [(r.low + inLow) / t.cd - 1 + s.lo, (r.high + inHigh) / t.cd - 1 + s.hi].map(
          (x) => Math.round(1000 * x) / 10,
        ),
      );
    });
    // The tolerances with the band the library carries now (0014 10.7 (ah) and its third addendum), as the
    // table's caption states them.
    const now = PUBLISHED_GATE.map((p, k) => {
      const t = totalOf(views[k]!);
      const inLow = t.inputs.reduce((a, i) => a + i.low, 0);
      const inHigh = t.inputs.reduce((a, i) => a + i.high, 0);
      const s = spread[BASIC_FINNER_CLUSTERS.findIndex(([a, b]) => p.mach >= a && p.mach <= b)]!;
      return [(t.low + inLow) / t.cd - 1 + s.lo, (t.high + inHigh) / t.cd - 1 + s.hi] as const;
    });
    const pc = (x: number) => `${x > 0 ? '+' : ''}${(Math.round(1000 * x) / 10).toFixed(1)}%`;
    const lo = now.map((x) => x[0]);
    const hi = now.map((x) => x[1]);
    const stated = `${pc(Math.max(...lo))} to ${pc(Math.min(...lo))} and ${pc(Math.min(...hi))} to ${pc(Math.max(...hi))}`;
    expect(stated).toBe('-21.5% to -28.5% and +26.5% to +31.3%');
    // The caption word for word: what the table shows (the run's values, F4's widening at the Mach
    // 1.799 row) and what it does not ((ah)'s widening of the body base's band), with the tolerances
    // the library gives now.
    const table = gateDisplay().find((b) => b.kind === 'table');
    if (table?.kind !== 'table') throw new Error('expected the gate table');
    expect(table.caption).toBe(
      'The Basic Finner gate re-run with the corrected fins-on-base factor (design record 0010 ' +
        'section 11): a recorded correction made after the residuals were known, not a new test, ' +
        'beside the second run (its section 4.2); tolerances as re-derived after an independent ' +
        'audit (its section 10); residual: measured CX0 over modelled, minus 1; each band rounded ' +
        'outward, other values to the nearest last digit shown; bands and tolerances as the run ' +
        "formed them, except that the trailing edges' band at the Mach 1.799 shot widened at both " +
        'ends since (design record 0019 section 3.4.1, F4), also after the gate was used, and that ' +
        "row shows it; the body base's band was widened after the run too (design record 0014, " +
        'section 10.7 (ah)), which the table does not show: a total on this page now shows a wider ' +
        `band and the tolerances would be ${stated}; no residual and no verdict changes`,
    );
  });

  it('every shot is an estimate: the three at Mach 1.80 to 1.85, inside the class, with the suspension as the reason; the eight above Mach 2.15 outside it', () => {
    views.forEach((v, k) => {
      if (v.kind !== 'total') throw new Error('expected a total');
      const mach = gated[k]!.mach;
      expect(v.claim.kind).toBe('estimate');
      if (mach <= 2.15) {
        expect(v.claim.text).toBe(CLASS_CLAIM);
        expect(reasonsOf(v.claim)).toEqual([SUSPENDED_REASON]);
        return;
      }
      expect(v.claim.text).toBe(ESTIMATE_CLAIM);
      // The five above M 2.56 also carry the bounded factor (0014 section 10.2).
      expect(reasonsOf(v.claim)).toEqual([
        `Mach ${mach} is outside 1.799 to 2.15${ABOVE_THE_CLASS}`,
        ...(mach > 2.56 ? [BOUNDED_REASON] : []),
      ]);
    });
    expect(gated.filter((s) => basicFinnerClass(gateForm(s)).inside).length).toBe(3);
  });

  it('the five shots at Mach 1.06 to 1.33 are refused, with every reason and no number', () => {
    for (const s of reported) {
      const form = { ...gateForm(gated[0]!), mach: s.mach, reynoldsOnLength: s.reynolds };
      const v = totalDragView(form, exactNose(form));
      expect(v.kind).toBe('refused');
      const r = reasons(v);
      // The leading edges' Reynolds number refuses them to M 1.25; at 1.33 they are served (0016 section 11).
      if (s.mach < 1.3) expect(r).toContain('fin leading edges: leading-edge-range');
      else expect(r).not.toContain('fin leading edges: leading-edge-range');
      // The base below Mach 1.5 is served (W2), but not with the Basic Finner's wedges at it (0015).
      expect(r).toContain('body base: fin-trailing-edge');
      // Below M 1.5 the fins' own-drag band is not carried (0014 section 10.7 (f)); it is the first reason.
      expect(r).toContain('fin friction: fins-own-drag-mach');
      expect(r).toContain('fin wave drag: fins-own-drag-mach');
    }
  });
});

describe('the nose term and the states of the solve', { timeout: 60_000 }, () => {
  it("is the page's solved value and band, unchanged", () => {
    const c = noseComponentOf({ value: 0.0968, uncertainty: 1.2e-5, grids: 4 });
    expect(c.name).toBe('nose wave drag');
    expect([c.cd, c.low, c.high]).toEqual([0.0968, 0.0968 - 1.2e-5, 0.0968 + 1.2e-5]);
    expect(c.label).toContain('solved on this page');
    expect(c.label).toContain('4 grids');
  });

  it("states the solve's own allowance: 7e-5, or 8e-4 on a Von Karman nose", () => {
    expect(allowanceText(FITTED_DRAG_FLOOR)).toBe('7e-5');
    expect(allowanceText(TWO_SCALE_DRAG_FLOOR)).toBe('8e-4');
    const usual = noseComponentOf({ value: 0.0968, uncertainty: 1.2e-5, grids: 4 });
    expect(usual.band).toContain('an allowance of 7e-5 of the value');
    const vk = { value: 0.0804, uncertainty: 8.7e-5, grids: 4, floor: TWO_SCALE_DRAG_FLOOR };
    expect(noseComponentOf(vk).band).toContain('an allowance of 8e-4 of the value');
    // Where its four-grid band has been checked against a reference: said so.
    expect(noseComponentOf(vk).band).toContain(
      'a band from four grids has been checked against a reference on two noses',
    );
    expect(usual.band).not.toContain('four grids');
    expect(bandCaveat(FITTED_DRAG_FLOOR, 4)).toBe('');
    expect(bandCaveat(FITTED_DRAG_FLOOR, 5)).toBe('');
    // The sentences in full: which noses were checked, and that a band of
    // five grids (320 cells across) was not.
    expect(bandCaveat(TWO_SCALE_DRAG_FLOOR, 4)).toBe(
      'On Von Karman noses a band from four grids has been checked against a reference on two noses so far (1 and 3 calibers at Mach 2).',
    );
    expect(bandCaveat(TWO_SCALE_DRAG_FLOOR, 5)).toBe(
      'On Von Karman noses a band from four grids has been checked against a reference on two noses (1 and 3 calibers at Mach 2); a band from 5 grids, as here, has not been checked on any.',
    );
    expect(noseComponentOf({ ...vk, grids: 5 }).band).toContain('a band from 5 grids, as here');
  });

  it('before the solve: the other components are checked, no number is given', () => {
    const v = totalDragView(basicFinnerForm(), { kind: 'pending' });
    expect(v.kind).toBe('pending');
    if (v.kind !== 'pending') return;
    expect(v.check).toEqual({ inside: true, outside: [] });
    // DREV's rounded edge, at the class's conditions: outside the BRL sub-class by both.
    expect(v.subClass.inside).toBe(false);
    expect(v.subClass.shape).toEqual([
      'the fin leading edges are rounded (0.004 cal radius), not sharp',
    ]);
  });

  it('a nose without a band refuses the total, with any other reason beside it', () => {
    const f = basicFinnerForm();
    const no = {
      kind: 'refused',
      message: 'the nose wave drag has no measured error band',
    } as const;
    expect(reasons(totalDragView(f, no))).toEqual(['nose wave drag: not-verified']);
    expect(reasons(totalDragView({ ...f, mach: 1.6 }, no))).toEqual([
      'nose wave drag: not-verified',
      'body base: fin-trailing-edge',
    ]);
  });

  it('the page solve feeds the total as given: the total moves by the nose term alone', () => {
    const f = basicFinnerForm(2.4, 1.6e7);
    const exact = exactNose(f);
    if (exact.kind !== 'solved') throw new Error('unreachable');
    const solved = noseComponentOf({
      value: exact.component.cd * (1 + 3e-5),
      uncertainty: 1e-5,
      grids: 4,
    });
    const a = totalOf(totalDragView(f, exact));
    const b = totalOf(totalDragView(f, { kind: 'solved', verified: true, component: solved }));
    expect(b.cd - a.cd).toBeCloseTo(solved.cd - exact.component.cd, 14);
    expect(b.components[0]).toBe(solved);
    expect(b.high - b.low - (a.high - a.low)).toBeCloseTo(
      2e-5 - (exact.component.high - exact.component.low),
      14,
    );
  });
});

describe(
  'outside the class: an estimate, not validated, with every reason',
  { timeout: 60_000 },
  () => {
    const f = basicFinnerForm(2.0, 1.6e7);
    const estimate = (form: TotalDragForm) => {
      const nose = noseComponentOf({ value: 0.09, uncertainty: 1e-5, grids: 4 });
      const v = totalDragView(form, { kind: 'solved', verified: true, component: nose });
      if (v.kind !== 'total')
        throw new Error(`expected a total, got ${v.kind}: ${reasons(v).join(', ')}`);
      return v;
    };

    it('a tangent ogive nose, at a Reynolds number outside the class', () => {
      const v = estimate({
        ...f,
        body: { ...f.body, nose: { ...f.body.nose, shape: { kind: 'ogive', parameter: 1 } } },
        reynoldsOnLength: 4e7,
      });
      expect(v.claim.kind).toBe('estimate');
      expect(v.claim.text).toBe(ESTIMATE_CLAIM);
      expect(reasonsOf(v.claim)).toEqual([
        "the nose is not a cone (the Basic Finner's is a 20 deg cone)",
        'the Reynolds number on length, 4.00e7, is outside 1.19e7 to 2.0e7',
      ]);
    });

    it("sharp double-wedge fins one chord ahead of the base, TN 2360's root chord: the measured factor", () => {
      // A root chord of 1.5 calibres, as TN 2360's fins, one chord ahead at Mach 2.0: the rebuilt
      // factor at x/c 1.0 (0015 section 3.3), not the plain curve (withdrawn 2026-10-27).
      const v = estimate({
        ...f,
        section: { kind: 'double-wedge', thickness: 0.06, ridge: 0.5 },
        leadingEdgeRadius: 0,
        rootChord: 1.5,
        trailingEdgeAheadOfBase: 1.5,
      });
      expect(v.claim.kind).toBe('estimate');
      expect(v.total.components.map((c) => c.name)).toEqual([
        'nose wave drag',
        'body friction',
        'fin friction',
        'fin wave drag',
        'body base',
      ]);
      const base = v.total.components.find((c) => c.name === 'body base')!;
      expect(base.label).not.toContain('not validated with fins');
      expect(base.label).toContain('measured with a root chord of 1.5 body diameters');
      expect(reasonsOf(v.claim)).toContain('the fins end 1.5 cal ahead of the base, not at it');
    });

    it("the same fins with the Basic Finner's root chord of 1 calibre, one chord ahead: refused", () => {
      // The reviewer's second case (x/c 0.67 in TN 2360's terms, a chord of 1 diameter): served on the
      // plain curve until 2026-10-27; refused now by the chord rule (0014 section 10.7 (ad)).
      const form: TotalDragForm = {
        ...f,
        section: { kind: 'double-wedge', thickness: 0.06, ridge: 0.5 },
        leadingEdgeRadius: 0,
        trailingEdgeAheadOfBase: 1,
      };
      const v = totalDragView(form, exactNose(form));
      expect(reasons(v)).toEqual(['body base: fins-near-base']);
      expect(v.kind === 'refused' && v.refusals[0]!.message).toMatch(
        /^fins ending 1 root chords ahead of the base at Mach 2: the fins' root chord is 1\.00 body diameters, and TN 2360 measures fins ahead of the base only with a root chord of 1\.5 body diameters/,
      );
    });
  },
);

describe('refusals: every reason, no number', { timeout: 60_000 }, () => {
  const f = basicFinnerForm(2.4, 1.6e7);
  const nose = exactNose(f);

  it('below Mach 1.8 with fins at the base; swept fins; a laminar base', () => {
    // The present factor refuses M 1.6; the rebuilt factor (0015) refuses the Basic Finner's wedges,
    // thickest at their blunt trailing edge, and says the present factor refuses too.
    const v = totalDragView({ ...f, mach: 1.6 }, exactNose({ ...f, mach: 1.6 }));
    expect(reasons(v)).toEqual(['body base: fin-trailing-edge']);
    expect(JSON.stringify(v)).toContain('the present factor (0010 section 1.3) refuses it too');
    expect(
      reasons(
        totalDragView(
          {
            ...f,
            planform: {
              kind: 'trapezoidal',
              leadingEdgeSweepDegrees: 10,
              trailingEdgeSweepDegrees: 10,
            },
          },
          nose,
        ),
      ),
    ).toEqual([
      // The fins end at the base: the present factor refuses swept fins (0014 section 10.7), and the
      // rebuilt factor (0015) refuses the wedges' blunt trailing edge.
      'body base: fin-trailing-edge',
      'fin trailing-edge base: swept-trailing-edge',
    ]);
    expect(reasons(totalDragView({ ...f, transitionReynolds: [2e7] }, nose))).toEqual([
      'body base: laminar-base',
    ]);
    // Three fins: the present factor refuses the count; the rebuilt factor (0015) is tried and
    // refuses the Basic Finner's single wedges, thickest at their blunt trailing edge.
    expect(reasons(totalDragView({ ...f, finCount: 3 }, nose))).toEqual([
      'body base: fin-trailing-edge',
    ]);
  });

  it('a rounded leading edge on a double wedge; a clipped delta with a blunt trailing edge', () => {
    expect(
      reasons(
        totalDragView(
          { ...f, section: { kind: 'double-wedge', thickness: 0.06, ridge: 0.5 } },
          nose,
        ),
      ),
    ).toEqual(['fin leading edges: leading-edge-geometry']);
    const r = reasons(
      totalDragView({ ...f, planform: { kind: 'clipped-delta', taperRatio: 0.5 } }, nose),
    );
    // Since 0016 the blunt trailing edge of fins of varying chord is integrated along the span;
    // the swept leading edge, the fins ending at the base, is refused by the present factor (0014
    // 10.7), and the rebuilt factor (0015) refuses the single wedges' blunt trailing edge.
    expect(r).toEqual(['fin leading edges: leading-edge-geometry', 'body base: fin-trailing-edge']);
  });

  it('inputs the page cannot take, all listed', () => {
    const v = totalDragView(
      {
        ...f,
        span: -1,
        rootChord: 8,
        reynoldsOnLength: Number.NaN,
        transitionReynolds: [0],
        roughness: { low: 0, high: 0.01, source: ' ' },
      },
      nose,
    );
    expect(v.kind).toBe('refused');
    if (v.kind !== 'refused') return;
    const messages = v.refusals.map((r) => r.message);
    expect(messages).toContain('the Reynolds number on length must be a positive number');
    expect(messages).toContain('the span must be a positive number');
    expect(messages).toContain('a transition Reynolds number (0) must be a positive number');
    expect(messages).toContain('a roughness band needs its source');
    expect(messages.some((m) => m.startsWith('the fins must lie on the cylinder'))).toBe(true);
    expect(messages.some((m) => m.includes('root chord and span must be positive'))).toBe(true);
  });

  it('a roughness band with its source is carried as an input band, labelled as supplied here', () => {
    const v = totalDragView(
      { ...f, roughness: { low: 0, high: 0.01, source: 'my estimate' } },
      nose,
    );
    const r = totalOf(v).inputs.find((i) => i.name === 'roughness')!;
    expect([r.low, r.high]).toEqual([0, 0.01]);
    expect(r.label).toBe('input: roughness, supplied on this page: my estimate');
    expect(configurationOf({ ...f, roughness: { low: 0.01, high: 0.02, source: 'x' } }).kind).toBe(
      'refused',
    );
  });
});

describe('found in the libraries (0011 section 6)', { timeout: 60_000 }, () => {
  it("the fins-on-base factor does not depend on the fins' size: 0.1 cal of span as 1 cal", () => {
    const base = (span: number) => {
      const form = { ...basicFinnerForm(2.0), span };
      const v = totalDragView(form, exactNose(form));
      if (v.kind !== 'total') throw new Error(v.kind);
      expect(v.claim.text).toBe(span === 1 ? CLASS_CLAIM : ESTIMATE_CLAIM);
      const b = v.total.components.find((c) => c.name === 'body base')!;
      return [b.cd, b.low, b.high];
    };
    expect(base(0.1)).toEqual(base(1));
  });

  it("a rounded leading edge above TN 2960's Reynolds numbers (1e5 to 1e6) is refused, no longer 'measured' (0010 section 10, finding 11)", () => {
    const at = (reynoldsOnDiameter: number) => () =>
      roundedLeadingEdgeDrag({
        mach: 2,
        radius: 0.004,
        faceAngle: 0.036,
        tanLeadingEdgeSweep: 0,
        reynoldsOnDiameter,
      }).regime;
    expect(TN2960_RANGE.reynolds).toEqual([1e5, 1e6]);
    expect(at(5e5)()).toBe('measured');
    expect(at(5e6)).toThrow(/above 1000000, the highest at which a front-side pressure/);
  });

  it("the leading-edge and trailing-edge labels say 'tested only in the total' (0010 section 7)", () => {
    const form = basicFinnerForm(2.4);
    const v = totalDragView(form, exactNose(form));
    if (v.kind !== 'total') throw new Error(v.kind);
    for (const name of ['fin leading edges', 'fin trailing-edge base']) {
      const label = v.total.components.find((c) => c.name === name)!.label;
      expect(label.startsWith('an analogy, not a measurement')).toBe(true);
      expect(label).toContain('tested only in the total');
    }
  });
});

describe('a bounded fins-on-base factor is named in the claim (0014 section 10.2)', () => {
  const body = (mach: number, fins: BaseFins) =>
    bodyBaseDrag({
      mach,
      afterbody: 'cylinder',
      boundaryLayerAtBase: 'turbulent',
      baseAreaRatio: 1,
      fins,
    });
  it("the present factor's reason, or the rebuilt factor's, by which one is bounded", () => {
    const four = {
      count: 4,
      thicknessRatio: 0.08,
      section: 'other' as const,
      tanLeadingEdge: 0,
      tanTrailingEdge: 0,
      trailingEdgeAheadOfBase: 0,
    };
    expect(boundedReasons(body(2.8, four))).toEqual([BOUNDED_REASON]);
    expect(boundedReasons(body(2.4, four))).toEqual([]);
    const near = {
      section: doubleWedge(0.024, 0.5),
      sectionFamily: 'other' as const,
      tanLeadingEdgeSweep: 0,
      tanTrailingEdgeSweep: 0,
    };
    const three = { ...four, count: 3, thicknessRatio: 0.024, nearBase: near };
    expect(boundedReasons(body(2.8, three))).toEqual([W1_BOUNDED_REASON]);
    expect(boundedReasons(body(2.4, three))).toEqual([]);
    expect(boundedReasons(undefined)).toEqual([]);
    // Components the library marks bounded (0016 section 21.2), each named once, after the base's.
    const edge = {
      name: 'fin leading edges',
      cd: 0.01,
      low: 0.005,
      high: 0.015,
      label: 'x',
      band: 'x',
      bounded: SWEPT_EDGE_BOUNDED_REASON,
    };
    expect(boundedReasons(undefined, [edge, edge])).toEqual([SWEPT_EDGE_BOUNDED_REASON]);
    expect(boundedReasons(body(2.8, four), [edge])).toEqual([
      BOUNDED_REASON,
      SWEPT_EDGE_BOUNDED_REASON,
    ]);
    const plain = { name: edge.name, cd: 0.01, low: 0.005, high: 0.015, label: 'x', band: 'x' };
    expect(boundedReasons(undefined, [plain])).toEqual([]);
  });
});

describe('flat-plate fins on the page (0016)', { timeout: 60_000 }, () => {
  const f = basicFinnerForm(2.8, 1.6e7);
  const plate = (leadingEdge: 'rounded' | 'square', trailingEdge: 'square' | 'rounded') => ({
    ...f,
    section: { kind: 'flat-plate' as const, thickness: 0.05, leadingEdge, trailingEdge },
    planform: { kind: 'clipped-delta' as const, taperRatio: 0.4 },
    rootChord: 1.5,
    // At the base: two calibres ahead (here until 2026-10-27) the body base is refused now
    // (0014 section 10.7 (ad)).
    trailingEdgeAheadOfBase: 0,
  });

  it('a plate is a flat plate of the thickness asked; the leading-edge radius is not used', () => {
    const c = configurationOf({ ...plate('rounded', 'square'), leadingEdgeRadius: Number.NaN });
    if (c.kind !== 'ok') throw new Error(JSON.stringify(c.refusals));
    expect(c.value.config.fins.section).toEqual({
      kind: 'flat-plate',
      thickness: 0.05,
      leadingEdge: 'rounded',
      trailingEdge: 'square',
    });
    expect(c.value.config.fins.leadingEdgeRadius).toBe(0);
    expect(basicFinnerClass(plate('rounded', 'square')).outside).toContain(
      'the fin section is not a single wedge with a blunt trailing edge',
    );
    // The hidden radius field is not checked on a plate (0016 section 16): no "NaN cal".
    const outside = basicFinnerClass({
      ...plate('rounded', 'square'),
      leadingEdgeRadius: Number.NaN,
    }).outside;
    expect(outside.some((x) => x.includes('leading-edge radius'))).toBe(false);
  });

  it('a rounded leading edge and a square trailing edge: a total, an estimate', () => {
    const form = plate('rounded', 'square');
    const v = totalDragView(form, exactNose(form));
    if (v.kind !== 'total') throw new Error(JSON.stringify(v));
    expect(v.claim.kind).toBe('estimate');
    expect(v.total.components.find((c) => c.name === 'fin wave drag')!.cd).toBe(0);
  });

  it('rounded leading edges swept 66.4 deg at Mach 2.8: the bounded edge served among the parts, the total refused at the base', () => {
    // Since main's A5 (f88ecbe) no served total holds a rounded edge swept past 60 deg: at the base the
    // fins-on-base factors measure sweeps of 60 deg or less, more than a chord ahead the body base is
    // refused, and within a chord it is served only at Mach 1.5 to 2.0, where M cos(sweep) is below
    // 1.0 past 60 deg. The edge is served among the refused total's parts, bounded, and names it.
    const form = {
      ...plate('rounded', 'square'),
      planform: { kind: 'clipped-delta' as const, taperRatio: 0.2 },
      rootChord: 2,
      span: 0.7,
    };
    const v = totalDragView(form, exactNose(form));
    if (v.kind !== 'refused') throw new Error(`expected a refusal, got ${v.kind}`);
    expect(reasons(v)).toEqual(['body base: fin-sweep']);
    const le = v.parts!.served.find((c) => c.name === 'fin leading edges')!;
    expect(le.bounded).toBe(SWEPT_EDGE_BOUNDED_REASON);
    expect(le.label.startsWith('bounded, not measured: swept 66.4 deg')).toBe(true);
    // The claim's words for a total that holds it, should one be served (boundedReasons, above).
    expect(
      claimWords({
        kind: 'estimate',
        text: ESTIMATE_CLAIM,
        reasons: boundedReasons(undefined, [le]),
      }),
    ).toBe(SWEPT_EDGE_BOUNDED_WORDS);
  });

  it('square-cut leading edges and rounded trailing edges: refused, with the reasons', () => {
    const a = plate('square', 'square');
    expect(reasons(totalDragView(a, exactNose(a)))).toEqual([
      'fin leading edges: square-leading-edge',
    ]);
    const b = plate('rounded', 'rounded');
    expect(reasons(totalDragView(b, exactNose(b)))).toEqual([
      // At the base, the rounded trailing edge refused for the body base too (0015 section 4).
      'body base: fin-trailing-edge',
      'fin trailing-edge base: rounded-trailing-edge',
    ]);
  });

  it('a negative or missing plate thickness is an input refusal', () => {
    const c = configurationOf({
      ...plate('rounded', 'square'),
      section: {
        kind: 'flat-plate',
        thickness: -1,
        leadingEdge: 'rounded',
        trailingEdge: 'square',
      },
    });
    expect(c.kind).toBe('refused');
  });
});
