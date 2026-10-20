/**
 * The total drag on the drag page (src/app/total-drag.ts): the class rule
 * of docs/design/0011-total-drag-on-the-page.md section 3, the glue
 * between the page's inputs and src/total, and the claims. On the Basic
 * Finner's 11 gated shots the page's numbers are the gate's
 * (tests/validation/basic-finner.test.ts, 0010 section 4.2), with the nose
 * given as the gate gave it.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { ALTITUDE_RANGE, standardAtmosphere } from '../../src/atmosphere/us-standard-1976';
import { flightConditionOf } from '../../src/app/flight-condition';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { roundedLeadingEdgeDrag, TN2960_RANGE } from '../../src/fins/rounded-leading-edge';
import { singleWedge } from '../../src/fins/section';
import { finnedBodyComponents, type FinnedBody } from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import { combineComponents, type TotalDrag } from '../../src/total/total-drag';
import {
  BASIC_FINNER_CLUSTERS,
  BASIC_FINNER_GEOMETRY as G,
  BASIC_FINNER_SHOTS,
} from '../../src/validation/basic-finner';
import { outward, outwardPercent } from '../../src/app/band';
import {
  BASIC_FINNER_CLASS,
  BASIC_FINNER_REYNOLDS_PER_MACH,
  BASIC_FINNER_TEMPERATURE,
  TEMPERATURE_SENSITIVITY,
  basicFinnerClass,
  basicFinnerForm,
  configurationOf,
  ESTIMATE_CLAIM,
  FINS_BAND_NOTE,
  FINS_ON_BASE_NOTE,
  GATE_TRANSITION_REYNOLDS,
  noseComponentOf,
  OFFSET_CAVEAT,
  PUBLISHED_GATE,
  totalDragView,
  VALIDATED_CLAIM,
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

describe('the class rule', { timeout: 60_000 }, () => {
  it('the Basic Finner at its gated shots, and the default at Mach 2, are inside', () => {
    for (const s of gated)
      expect(basicFinnerClass(gateForm(s))).toEqual({ inside: true, outside: [] });
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

  it('Mach 1.799 to 3.0, Reynolds number 1.19e7 to 2.0e7 on length, 216.65 to 320 K', () => {
    const f = basicFinnerForm();
    const at = (mach: number, re: number, t = BASIC_FINNER_TEMPERATURE) =>
      basicFinnerClass({ ...f, mach, reynoldsOnLength: re, temperature: t }).inside;
    expect(BASIC_FINNER_CLASS.mach).toEqual([1.799, 3.0]);
    expect(BASIC_FINNER_CLASS.reynoldsOnLength).toEqual([1.19e7, 2.0e7]);
    expect(at(1.799, 1.19e7)).toBe(true);
    expect(at(3.0, 2.0e7)).toBe(true);
    expect(at(1.798, 1.5e7)).toBe(false);
    expect(at(3.001, 1.5e7)).toBe(false);
    expect(at(2.4, 1.189e7)).toBe(false);
    expect(at(2.4, 2.001e7)).toBe(false);
    expect(BASIC_FINNER_CLASS.temperature).toEqual([216.65, 320]);
    expect(at(2.4, 1.6e7, 216.65)).toBe(true);
    expect(at(2.4, 1.6e7, 320)).toBe(true);
    expect(at(2.4, 1.6e7, 288.15)).toBe(true);
    expect(at(2.4, 1.6e7, 216.6)).toBe(false);
    expect(at(2.4, 1.6e7, 320.1)).toBe(false);
    expect(
      basicFinnerClass({ ...f, mach: 2.4, reynoldsOnLength: 1.6e7, temperature: 330 }).outside,
    ).toEqual(['the static temperature, 330 K, is outside 216.65 to 320 K']);
    for (const s of reported) expect(at(s.mach, s.reynolds)).toBe(false);
    // The range's air from Table V's speed of sound, 343.4 to 344.0 m/s: about 294 K.
    const t = (a: number) => a ** 2 / (1.4 * 287.05);
    expect([t(343.4), t(344.0)].map((x) => Math.round(10 * x) / 10)).toEqual([293.4, 294.5]);
  });

  it("a standard atmosphere's air lies in the class's temperatures from 4,896 m below sea level to 51 km", () => {
    const f = basicFinnerForm(2.4, 1.6e7);
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
    'what the tolerances allow: each dimension at +-0.5% moves the total by under 0.2%, all together under 0.7%',
    { timeout: 120_000 },
    () => {
      const c = BASIC_FINNER_CLASS;
      // The largest change of the total over the Mach numbers, per dimension.
      const largest = new Map<string, number>();
      for (const mach of [1.8, 2.4, 3.0]) {
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
        'cone length': 0.19,
        'overall length': 0.09,
        'root chord': 0.01,
        span: 0.17,
        'trailing-edge thickness': 0.12,
        'leading-edge radius': 0.06,
      });
      const sum = [...largest.values()].reduce((a, x) => a + x, 0);
      expect(sum).toBeLessThan(0.007);
    },
  );

  it(
    "the box's corners: at Mach 1.8 and 2.0e7, and Mach 3.0 and 1.19e7, the model lies 1.6% below and 2.1% above the shots' line",
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
      const high = cd(3.0, 1.19e7) / cd(3.0, k * 3.0) - 1;
      expect(low).toBeGreaterThan(-0.0165);
      expect(low).toBeLessThan(-0.0155);
      expect(high).toBeGreaterThan(0.0195);
      expect(high).toBeLessThan(0.0215);
      const ratios = gated.map((s) => s.reynolds / s.mach);
      expect(Math.min(...ratios)).toBeGreaterThan(6.53e6);
      expect(Math.max(...ratios)).toBeLessThan(6.72e6);
      expect(k).toBeCloseTo(6.618e6, -3);
    },
  );

  it(
    "the static temperature over the class, 216.65 to 320 K: the total moves from its value at the range's air by at most 0.21%",
    { timeout: 300_000 },
    () => {
      // Swept at the class's Mach numbers 1.8, 2.4 and 3.0, with the Reynolds number held at
      // each of its ends and inside, 1.6e7; the reference is the range's air, 293.95 K.
      const temperatures = [216.65, ...Array.from({ length: 11 }, (_, k) => 220 + 10 * k)];
      expect(temperatures.at(-1)).toBe(320);
      let largest = { change: 0, at: '' };
      for (const mach of [1.8, 2.4, 3.0]) {
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
      // 0.206%, at the class's corner of highest Mach and lowest Reynolds number, coldest air.
      expect(largest.at).toBe('M 3, Re 11900000, 216.65 K');
      expect(Math.round(1e4 * largest.change) / 1e4).toBe(TEMPERATURE_SENSITIVITY);
      expect(TEMPERATURE_SENSITIVITY).toBe(0.0021);
      // Against the residuals, -7.7% to +4.5%, and the tolerance, about -20% to +27%: small.
      expect(VALIDATED_CLAIM).toContain('by at most 0.21%');
    },
  );
});

describe('the Basic Finner default as the page shows it', { timeout: 60_000 }, () => {
  it('at Mach 1.8 to 3.0, the range Reynolds number, no inputs: validated, its band rounded outward', () => {
    const shown = [1.8, 2.0, 2.4, 2.75, 2.97, 3.0].map((mach) => {
      const form = basicFinnerForm(mach);
      const v = totalDragView(form, exactNose(form));
      if (v.kind !== 'total') throw new Error(v.kind);
      expect(v.claim.kind).toBe('validated');
      const t = v.total;
      return [
        t.cd.toFixed(4),
        outward(t.low, t.high, 4).join(' to '),
        outwardPercent(t.low / t.cd - 1, t.high / t.cd - 1),
      ];
    });
    expect(shown).toEqual([
      ['0.6121', '0.5309 to 0.7259', '-13.3% to +18.6%'],
      ['0.5501', '0.4823 to 0.6493', '-12.4% to +18.1%'],
      ['0.4768', '0.4193 to 0.5615', '-12.1% to +17.8%'],
      ['0.4320', '0.3797 to 0.5083', '-12.1% to +17.7%'],
      ['0.4072', '0.3579 to 0.4786', '-12.1% to +17.6%'],
      ['0.4040', '0.3554 to 0.4746', '-12.1% to +17.5%'],
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
    expect(at(2.85).some((n) => n.includes('one reading'))).toBe(false);
    expect(at(2.88).some((n) => n.includes('one reading'))).toBe(true);
    expect(at(2.99).some((n) => n.includes('extrapolated'))).toBe(true);
    // Fins clear of the base take no factor, and no note on it.
    const clear = { ...basicFinnerForm(2.4), trailingEdgeAheadOfBase: 1 };
    const v = totalDragView(clear, exactNose(clear));
    if (v.kind !== 'total') throw new Error(v.kind);
    expect(v.notes).toEqual([FINS_BAND_NOTE]);
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

  it('the table the page publishes is 0010 section 4.2, held to the library', () => {
    const cx0 = (m: number) => gated.find((s) => s.mach === m)!.cx0;
    const spread = BASIC_FINNER_CLUSTERS.map(([a, b]) => {
      const v = gated.filter((s) => s.mach >= a && s.mach <= b).map((s) => s.cx0);
      const mean = v.reduce((p, q) => p + q, 0) / v.length;
      return { lo: Math.min(...v) / mean - 1, hi: Math.max(...v) / mean - 1 };
    });
    expect(PUBLISHED_GATE.map((p) => p.shot)).toEqual(gated.map((s) => s.shot));
    PUBLISHED_GATE.forEach((p, k) => {
      const t = totalOf(views[k]!);
      expect(p.mach).toBe(gated[k]!.mach);
      expect(p.cx0).toBe(cx0(p.mach));
      expect([p.cd, p.low, p.high]).toEqual(
        [t.cd, t.low, t.high].map((x) => Math.round(1e4 * x) / 1e4),
      );
      expect(p.residual).toBe(Math.round(1000 * (p.cx0 / t.cd - 1)) / 10);
      const inLow = t.inputs.reduce((a, i) => a + i.low, 0);
      const inHigh = t.inputs.reduce((a, i) => a + i.high, 0);
      const s = spread[BASIC_FINNER_CLUSTERS.findIndex(([a, b]) => p.mach >= a && p.mach <= b)]!;
      expect(p.tolerance).toEqual(
        [(t.low + inLow) / t.cd - 1 + s.lo, (t.high + inHigh) / t.cd - 1 + s.hi].map(
          (x) => Math.round(1000 * x) / 10,
        ),
      );
    });
  });

  it('every shot is labelled validated, the two at M 2.97 nearest the offset', () => {
    views.forEach((v, k) => {
      if (v.kind !== 'total') throw new Error('expected a total');
      expect(v.claim.kind).toBe('validated');
      if (v.claim.kind !== 'validated') return;
      expect(v.claim.text).toBe(VALIDATED_CLAIM);
      expect(v.claim.caveats).toContain(OFFSET_CAVEAT);
      expect(v.claim.nearMach3).toBe(gated[k]!.mach > 2.9);
    });
  });

  it('the five shots at Mach 1.06 to 1.33 are refused, with every reason and no number', () => {
    for (const s of reported) {
      const form = { ...gateForm(gated[0]!), mach: s.mach, reynoldsOnLength: s.reynolds };
      const v = totalDragView(form, exactNose(form));
      expect(v.kind).toBe('refused');
      const r = reasons(v);
      expect(r).toContain('fin leading edges: leading-edge-range');
      // The base below Mach 1.5 is served (W2), but not with the Basic Finner's wedges at it (0015).
      expect(r).toContain('body base: fin-trailing-edge');
      if (s.mach < 1.2) expect(r).toContain('fin wave drag: detached-shock');
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

  it('before the solve: the other components are checked, no number is given', () => {
    const v = totalDragView(basicFinnerForm(), { kind: 'pending' });
    expect(v).toEqual({ kind: 'pending', check: { inside: true, outside: [] } });
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
    const b = totalOf(totalDragView(f, { kind: 'solved', component: solved }));
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
    const f = basicFinnerForm(2.4, 1.6e7);
    const estimate = (form: TotalDragForm) => {
      const nose = noseComponentOf({ value: 0.09, uncertainty: 1e-5, grids: 4 });
      const v = totalDragView(form, { kind: 'solved', component: nose });
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
      if (v.claim.kind !== 'estimate') return;
      expect(v.claim.text).toBe(ESTIMATE_CLAIM);
      expect(v.claim.reasons).toEqual([
        "the nose is not a cone (the Basic Finner's is a 20 deg cone)",
        'the Reynolds number on length, 4.00e7, is outside 1.19e7 to 2.0e7',
      ]);
    });

    it('sharp double-wedge fins one chord ahead of the base', () => {
      const v = estimate({
        ...f,
        section: { kind: 'double-wedge', thickness: 0.06, ridge: 0.5 },
        leadingEdgeRadius: 0,
        trailingEdgeAheadOfBase: 1,
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
      expect(base.label).toContain('not validated with fins');
      if (v.claim.kind === 'estimate') expect(v.claim.reasons.length).toBe(3);
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
      'fin leading edges: swept-leading-edge',
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
    expect(r).toContain('fin leading edges: leading-edge-geometry');
    expect(r).toContain('fin trailing-edge base: input');
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
      const form = { ...basicFinnerForm(2.4), span };
      const v = totalDragView(form, exactNose(form));
      if (v.kind !== 'total') throw new Error(v.kind);
      expect(v.claim.kind).toBe(span === 1 ? 'validated' : 'estimate');
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
