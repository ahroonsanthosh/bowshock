/**
 * The Basic Finner's BRL sub-class on the drag page (src/app/total-drag.ts;
 * docs/design/0014-refusals.md section 10.7 (q)): the one set of cases
 * labelled validated, at exactly the conditions at which BRL Report 934's
 * range A tested the present model and it passed (0020). Its bounds held
 * to the run's recorded output; inside and just outside every bound of
 * both windows; sharp against rounded fin leading edges; the class
 * unchanged and still an estimate; and the page's total at each of the
 * seven rounds against the run's recorded value.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { outward } from '../../src/app/band';
import {
  displayText,
  gateDisplay,
  INSIDE_PENDING_TEXT,
  SUB_CLASS_PENDING_TEXT,
  totalDragDisplay,
  VALIDATED_HEADLINE,
} from '../../src/app/total-drag-display';
import {
  ASSUMED_CAVEAT,
  BASIC_FINNER_CLASS,
  basicFinnerClass,
  basicFinnerForm,
  BRL934_SUB_CLASS,
  brl934SubClass,
  CLASS_CLAIM,
  ESTIMATE_CLAIM,
  PUBLISHED_BRL934,
  ROUNDED_EDGE_CAVEAT,
  SUB_CLASS_DESCRIPTION,
  SUB_CLASS_TEMPERATURE_SENSITIVITY,
  SUSPENDED_REASON,
  totalDragView,
  VALIDATED_CLAIM,
  type NoseState,
  type TotalDragForm,
  type TotalDragView,
} from '../../src/app/total-drag';
import { COMPILED_CURVE_BAND } from '../../src/base/compiled-curve';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import type { TotalDrag } from '../../src/total/total-drag';
import { basicFinnerBodyAsTyped } from '../../src/validation/basic-finner';
import {
  BRL934_AIR,
  brl934ConditionSet,
  BRL934_TRANSITION_REYNOLDS,
} from '../../src/validation/brl934';

/** The run's recorded output, as it came out (0020). */
interface RecordedRound {
  round: number;
  mach: number;
  model: string;
  cd0: number;
  reynoldsOnLength: { nominal: number; low: number; high: number };
  outcome: {
    refused: boolean;
    cd: number;
    low: number;
    high: number;
    residual: number;
    tolerance: [number, number];
    inside: boolean;
  };
  components: { name: string; cd: number; low: number; high: number }[];
  inputs: { name: string; low: number; high: number }[];
}
const RUN = (
  JSON.parse(
    readFileSync(
      new URL('../../docs/research/base-and-total/runs/brl934-range-a.json', import.meta.url),
      'utf8',
    ),
  ) as { rounds: RecordedRound[] }
).rounds.filter((r) => r.model === 'present');

const exactNose = (form: TotalDragForm): NoseState => ({
  kind: 'solved',
  verified: true,
  component: exactConeNoseWaveDrag(
    form.mach,
    Math.atan(form.body.nose.baseRadius / form.body.nose.length),
  ),
});
const totalOf = (view: TotalDragView): TotalDrag => {
  if (view.kind !== 'total') throw new Error(`expected a total, got ${JSON.stringify(view)}`);
  return view.total;
};

/** The Basic Finner with sharp fin leading edges, at a condition. */
const sharp = (mach: number, reynoldsOnLength: number, temperature = 293): TotalDragForm => ({
  ...basicFinnerForm(mach, reynoldsOnLength),
  leadingEdgeRadius: 0,
  temperature,
});
/** A round as the run took it: its nominal conditions (0.80 in, 293 K) and its inputs. */
const roundForm = (mach: number, leadingEdgeRadius = 0): TotalDragForm => {
  const nominal = brl934ConditionSet(mach).nominal;
  const f = basicFinnerForm(mach, nominal.reynoldsPerLength * 10);
  expect(f.body.cylinderLength + f.body.nose.length).toBeCloseTo(10, 12);
  return {
    ...f,
    leadingEdgeRadius,
    temperature: nominal.temperature,
    transitionReynolds: [...BRL934_TRANSITION_REYNOLDS],
    wallTemperature: BRL934_AIR.temperatureNominal,
  };
};

describe('the bounds, from the run', () => {
  it("the Mach ends are the rounds'; the Reynolds number per unit Mach number the run's, the same at every round, rounded inward to four figures", () => {
    expect(RUN.map((r) => r.round)).toEqual([2591, 2588, 2590, 2596, 2589, 3263, 3264]);
    const groups = [RUN.slice(0, 5), RUN.slice(5)];
    BRL934_SUB_CLASS.windows.forEach((w, k) => {
      const g = groups[k]!;
      expect(w.mach).toEqual([g[0]!.mach, g.at(-1)!.mach]);
    });
    // Re / M depends only on the diameter and the air: one range at all seven rounds.
    const lows = RUN.map((r) => r.reynoldsOnLength.low / r.mach);
    const highs = RUN.map((r) => r.reynoldsOnLength.high / r.mach);
    for (const x of lows) expect(x / lows[0]! - 1).toBeLessThan(1e-12);
    for (const x of highs) expect(x / highs[0]! - 1).toBeLessThan(1e-12);
    expect(Math.round(lows[0]!)).toBe(4422072);
    expect(Math.round(highs[0]!)).toBe(4855414);
    const [k0, k1] = BRL934_SUB_CLASS.reynoldsPerMach;
    expect([k0, k1]).toEqual([4.423e6, 4.855e6]);
    // Never wider than run, within a unit of the fourth figure of it.
    expect(k0).toBeGreaterThanOrEqual(Math.max(...lows));
    expect(k1).toBeLessThanOrEqual(Math.min(...highs));
    expect(k0 - lows[0]!).toBeLessThan(1e3);
    expect(highs[0]! - k1).toBeLessThan(1e3);
    // The air range of the run (0014 section 10.6 item 2).
    expect([...BRL934_SUB_CLASS.temperature]).toEqual([...BRL934_AIR.temperatureRange]);
  });
});

describe('the sub-class rule', { timeout: 60_000 }, () => {
  const inside = (form: TotalDragForm) => brl934SubClass(form).inside;
  const [k0, k1] = BRL934_SUB_CLASS.reynoldsPerMach;

  it('inside at both Mach ends of both windows at both ends of Re / M and of the air; outside just beyond each bound', () => {
    for (const w of BRL934_SUB_CLASS.windows) {
      const [m0, m1] = w.mach;
      for (const m of [m0, m1]) {
        for (const k of [k0, k1]) expect(inside(sharp(m, k * m))).toBe(true);
        expect(inside(sharp(m, k0 * m * (1 - 1e-4)))).toBe(false);
        expect(inside(sharp(m, k1 * m * (1 + 1e-4)))).toBe(false);
      }
      const mm = (m0 + m1) / 2;
      const rm = ((k0 + k1) / 2) * mm;
      expect(inside(sharp(m0 - 1e-3, rm))).toBe(false);
      expect(inside(sharp(m1 + 1e-3, rm))).toBe(false);
      for (const t of [288, 298]) expect(inside(sharp(mm, rm, t))).toBe(true);
      for (const t of [287.9, 298.1]) expect(inside(sharp(mm, rm, t))).toBe(false);
    }
  });

  it("the first rule's box corners, beyond any round, are outside now (the independent review)", () => {
    // Round 2591 at Mach 1.801 reached 8.7446e6 at most; 3264 at 2.468, 1.0914e7 at least.
    expect(inside(sharp(1.801, 8.87e6))).toBe(false);
    expect(inside(sharp(2.468, 1.072e7))).toBe(false);
    expect(brl934SubClass(sharp(1.801, 8.87e6)).outside).toEqual([
      "the Reynolds number on length, 8.870e6, is outside the range A run's 4.423e6 to " +
        '4.855e6 times the Mach number (7.966e6 to 8.744e6 at Mach 1.801)',
    ]);
    // Each round's own nominal is inside.
    for (const r of RUN) expect(inside(sharp(r.mach, r.reynoldsOnLength.nominal))).toBe(true);
  });

  it('two windows, no interpolation: the gap is outside at any Reynolds number', () => {
    for (const m of [1.83, 2.0, 2.15, 2.42, 2.47]) {
      for (const k of [k0, (k0 + k1) / 2, k1]) expect(inside(sharp(m, k * m))).toBe(false);
    }
    expect(brl934SubClass(sharp(2.0, 9.3e6)).outside).toEqual([
      "Mach 2 lies in neither window BRL Report 934's range A tested (Mach 1.801 to 1.827 or " +
        '2.423 to 2.468, nothing between them)',
    ]);
    expect(brl934SubClass(sharp(1.81, 8.4e6, 300)).outside).toEqual([
      "the static temperature, 300 K, is outside the range's air at that test, 288 to 298 K",
    ]);
  });

  it('the temperature at a given Reynolds number, 288 to 298 K: the total moves from its value at 293 K by at most SUB_CLASS_TEMPERATURE_SENSITIVITY', () => {
    let largest = 0;
    for (const w of BRL934_SUB_CLASS.windows) {
      for (const m of w.mach) {
        for (const k of [k0, k1]) {
          const cd = (t: number) => {
            const form = sharp(m, k * m, t);
            expect(inside(form)).toBe(true);
            return totalOf(totalDragView(form, exactNose(form))).cd;
          };
          const ref = cd(293);
          for (const t of [288, 298]) largest = Math.max(largest, Math.abs(cd(t) / ref - 1));
        }
      }
    }
    // 9.4e-5 when measured.
    expect(largest).toBeLessThan(SUB_CLASS_TEMPERATURE_SENSITIVITY);
    expect(Math.round(1e4 * largest) / 1e4).toBe(SUB_CLASS_TEMPERATURE_SENSITIVITY);
  });

  it('the shape: the Basic Finner within 0.5%, with sharp fin leading edges only', () => {
    const f = sharp(1.81, 8.4e6);
    const c = BASIC_FINNER_CLASS;
    expect(inside(f)).toBe(true);
    const variants: [number, (x: number) => TotalDragForm][] = [
      [
        c.noseLength,
        (x) => ({
          ...f,
          body: { nose: { ...f.body.nose, length: x }, cylinderLength: c.length - x },
        }),
      ],
      [c.length, (x) => ({ ...f, body: { ...f.body, cylinderLength: x - c.noseLength } })],
      [c.rootChord, (x) => ({ ...f, rootChord: x })],
      [c.span, (x) => ({ ...f, span: x })],
      [
        c.trailingEdgeThickness,
        (x) => ({ ...f, section: { kind: 'single-wedge', trailingEdgeThickness: x } }),
      ],
    ];
    for (const [v, make] of variants) {
      for (const k of [0.996, 1.004]) expect(inside(make(v * k))).toBe(true);
      for (const k of [0.994, 1.006]) {
        const s = brl934SubClass(make(v * k));
        expect(s.inside).toBe(false);
        expect(s.shape.length).toBe(1);
      }
    }
    // Any rounded edge is outside, DREV's included; the reason says so plainly.
    for (const r of [1e-6, 0.004]) {
      const s = brl934SubClass({ ...f, leadingEdgeRadius: r });
      expect(s.inside).toBe(false);
      expect(s.shape).toEqual([`the fin leading edges are rounded (${r} cal radius), not sharp`]);
    }
    expect(inside({ ...f, finCount: 3 })).toBe(false);
    expect(inside({ ...f, trailingEdgeAheadOfBase: 0.5 })).toBe(false);
    expect(inside({ ...f, section: { kind: 'double-wedge', thickness: 0.08, ridge: 0.5 } })).toBe(
      false,
    );
    expect(
      inside({
        ...f,
        body: { ...f.body, nose: { ...f.body.nose, shape: { kind: 'ogive', parameter: 1 } } },
      }),
    ).toBe(false);
  });

  it('the class and the sub-class are disjoint: no case lies in both', () => {
    for (const mach of [1.799, 1.81, 2.0, 2.15]) {
      for (const re of [8.4e6, 1.19e7, 1.6e7, 2.0e7]) {
        for (const r of [0, 0.004]) {
          const form = { ...basicFinnerForm(mach, re), leadingEdgeRadius: r };
          expect(basicFinnerClass(form).inside && brl934SubClass(form).inside).toBe(false);
        }
      }
    }
  });
});

describe(
  'the claim: validated inside the sub-class, the class unchanged',
  { timeout: 120_000 },
  () => {
    it('a total inside either window is validated, said plainly, with its caveats', () => {
      for (const [mach, re] of [
        [1.801, 4.423e6 * 1.801],
        [1.814, 8.4e6],
        [1.827, 4.855e6 * 1.827],
        [2.423, 4.423e6 * 2.423],
        [2.45, 1.15e7],
        [2.468, 4.855e6 * 2.468],
      ] as const) {
        for (const t of [288, 293, 298]) {
          const form = sharp(mach, re, t);
          const v = totalDragView(form, exactNose(form));
          if (v.kind !== 'total') throw new Error(JSON.stringify(v));
          expect(v.claim).toEqual({
            kind: 'validated',
            text: VALIDATED_CLAIM,
            caveats: [ASSUMED_CAVEAT, ROUNDED_EDGE_CAVEAT],
          });
          expect(v.subClass.inside).toBe(true);
          expect(v.check.inside).toBe(false);
          // The body base on the present factor, measured (not bounded).
          const base = v.total.components.find((c) => c.name === 'body base')!;
          expect(base.label).toContain('an analogy, not a measurement');
        }
      }
      // What the label says, in plain words (0014 section 10.7 (q)).
      for (const words of [
        'tested once',
        'seven rounds',
        '+3.9% to +11.0%',
        'the model reads low at every round (mean +7.3%)',
        '+-25% to +-28%',
        'the pass alone says little',
      ])
        expect(VALIDATED_CLAIM).toContain(words);
      expect(VALIDATED_CLAIM).not.toContain('about +-27%');
      expect(ASSUMED_CAVEAT).toContain('assumed, not printed in the report');
      expect(ASSUMED_CAVEAT).toContain('the residuals rise to +14.5% to +22.3%');
      expect(ROUNDED_EDGE_CAVEAT).toContain(
        'refused in the run at the five rounds at Mach 1.80 to 1.83',
      );
      expect(ROUNDED_EDGE_CAVEAT).toContain('-1.1% and -4.2%: a sensitivity, not a verdict');
    });

    it('just outside a window, or in the gap: an estimate, with the sub-class conditions it fails among the reasons', () => {
      const form = sharp(1.85, 8.4e6);
      const v = totalDragView(form, exactNose(form));
      if (v.kind !== 'total') throw new Error(v.kind);
      expect(v.claim.kind).toBe('estimate');
      if (v.claim.kind !== 'estimate') return;
      expect(v.claim.text).toBe(ESTIMATE_CLAIM);
      expect(v.claim.reasons).toEqual([
        'the leading-edge radius is 0 cal, not 0.004 within 0.5%',
        'the Reynolds number on length, 8.40e6, is outside 1.19e7 to 2.0e7',
        "Mach 1.85 lies in neither window BRL Report 934's range A tested (Mach 1.801 to 1.827 " +
          'or 2.423 to 2.468, nothing between them)',
      ]);
    });

    it('sharp against rounded at each round: sharp validated; rounded (0.004 cal) refused at Mach 1.801 to 1.803, an estimate elsewhere', () => {
      const shown = RUN.map((r) => {
        const a = roundForm(r.mach, 0);
        const va = totalDragView(a, exactNose(a));
        if (va.kind !== 'total') throw new Error(va.kind);
        expect(va.claim.kind).toBe('validated');
        const b = roundForm(r.mach, 0.004);
        const vb = totalDragView(b, exactNose(b));
        if (vb.kind === 'refused') {
          return [r.round, vb.refusals.map((x) => `${x.component}: ${x.reason}`).join(', ')];
        }
        if (vb.kind !== 'total') throw new Error(vb.kind);
        expect(vb.claim.kind).toBe('estimate');
        expect(vb.claim.text).toBe(ESTIMATE_CLAIM);
        return [r.round, `estimate, ${(vb.total.cd - va.total.cd).toFixed(4)}`];
      });
      // As 0020 section 4 found: at Mach 1.80 the edge's Reynolds number on its diameter lies below
      // 6.7e3 at the nominal (refused); at 1.814 and 1.827 only at a corner, so the nominal is served.
      // Where served, the edge adds about 0.04 in C_D, and the case is outside both.
      expect(shown).toEqual([
        [2591, 'fin leading edges: leading-edge-range'],
        [2588, 'fin leading edges: leading-edge-range'],
        [2590, 'fin leading edges: leading-edge-range'],
        [2596, 'estimate, 0.0402'],
        [2589, 'estimate, 0.0403'],
        [3263, 'estimate, 0.0437'],
        [3264, 'estimate, 0.0439'],
      ]);
    });

    it("the class: the Basic Finner's values unchanged, an estimate, its reason revised (the test run and passed, outside it)", () => {
      const shown = [1.8, 2.0, 2.15].map((mach) => {
        const form = basicFinnerForm(mach);
        const v = totalDragView(form, exactNose(form));
        if (v.kind !== 'total') throw new Error(v.kind);
        expect(v.claim).toEqual({
          kind: 'estimate',
          text: CLASS_CLAIM,
          reasons: [SUSPENDED_REASON],
        });
        return totalOf(v).cd.toFixed(4);
      });
      // As tests/app/total-drag.test.ts holds them, unchanged by the sub-class.
      expect(shown).toEqual(['0.6131', '0.5493', '0.5176']);
      expect(SUSPENDED_REASON).not.toContain('until');
      expect(SUSPENDED_REASON).toContain('has been run and passed');
      expect(SUSPENDED_REASON).toContain('at conditions outside this class');
      expect(SUSPENDED_REASON).toContain('7.96e6 to 8.87e6');
      expect(CLASS_CLAIM).toContain('does not validate it');
    });
  },
);

describe('the page against the run: the seven rounds', { timeout: 120_000 }, () => {
  it("the page's total at each round, with the run's nose, is the run's recorded value: total, bands, components, inputs", () => {
    for (const r of RUN) {
      const form = roundForm(r.mach);
      const v = totalDragView(form, exactNose(form));
      if (v.kind !== 'total') throw new Error(`${r.round}: ${v.kind}`);
      const t = v.total;
      expect(r.outcome.refused).toBe(false);
      // The run's values, plus what 0014 10.7 (ah) added after it to the body base's band ends: the
      // change in the compiled curve's band (0.82 to 1.08 at the run, 0.77 to 1.17 now) times its term.
      const bodyBase = r.components.find((c) => c.name === 'body base')!;
      const w = {
        low: (COMPILED_CURVE_BAND.low - 0.82) * bodyBase.cd,
        high: (COMPILED_CURVE_BAND.high - 1.08) * bodyBase.cd,
      };
      expect(
        [
          t.cd - r.outcome.cd,
          t.low - (r.outcome.low + w.low),
          t.high - (r.outcome.high + w.high),
        ].every((d) => Math.abs(d) < 1e-12),
      ).toBe(true);
      expect(t.components.map((c) => c.name)).toEqual(r.components.map((c) => c.name));
      t.components.forEach((c, j) => {
        const run = r.components[j]!;
        const moved = c.name === 'body base' ? w : { low: 0, high: 0 };
        expect(c.cd).toBe(run.cd);
        expect(Math.abs(c.low - (run.low + moved.low))).toBeLessThan(1e-12);
        expect(Math.abs(c.high - (run.high + moved.high))).toBeLessThan(1e-12);
      });
      // The run's "diameter and air" band is its own (the corners); the library's inputs are equal.
      expect(t.inputs.map((i) => [i.name, i.low, i.high])).toEqual(
        r.inputs.filter((i) => i.name !== 'diameter and air').map((i) => [i.name, i.low, i.high]),
      );
      expect(v.claim.kind).toBe('validated');
      // The page's Basic Finner, typed to six decimals, moves the total by under 1e-8.
      const typed = { ...form, body: basicFinnerBodyAsTyped() };
      expect(Math.abs(totalOf(totalDragView(typed, exactNose(typed))).cd - t.cd)).toBeLessThan(
        1e-8,
      );
    }
  });

  it("the page's nose is its solve of the cone: within the fitted solver's allowance of Taylor-Maccoll, under 8e-6 in C_D at every round", () => {
    for (const r of RUN) {
      const nose = r.components[0]!;
      expect(nose.name).toBe('nose wave drag');
      // The allowance, 7e-5 of the value (0006): the run's nose band is exactly it.
      expect(nose.high - nose.cd).toBeCloseTo(7e-5 * nose.cd, 15);
      expect(7e-5 * nose.cd).toBeLessThan(8e-6);
    }
  });

  it('the published table is the run, rounded as the page rounds, and the residuals are the recorded ones', () => {
    expect(PUBLISHED_BRL934.map((p) => p.round)).toEqual(RUN.map((r) => r.round));
    PUBLISHED_BRL934.forEach((p, k) => {
      const r = RUN[k]!;
      expect(p.mach).toBe(r.mach);
      expect(p.cd0).toBe(Math.round(1e4 * r.cd0) / 1e4);
      expect(p.cd).toBe(Math.round(1e4 * r.outcome.cd) / 1e4);
      expect([p.low, p.high]).toEqual(outward(r.outcome.low, r.outcome.high, 4).map(Number));
      expect(p.residual).toBe(Math.round(1000 * r.outcome.residual) / 10);
      expect(p.tolerance).toEqual(r.outcome.tolerance.map((x) => Math.round(1000 * x) / 10));
      expect(r.outcome.inside).toBe(true);
    });
    const residuals = PUBLISHED_BRL934.map((p) => p.residual);
    expect([Math.min(...residuals), Math.max(...residuals)]).toEqual([3.9, 11.0]);
    const mean = RUN.reduce((a, r) => a + r.outcome.residual, 0) / RUN.length;
    expect(Math.round(1000 * mean) / 10).toBe(7.3);
  });

  it('the tolerances with the band the library carries now, as the claim and the table state them', () => {
    // The run's, plus the body base's band ends moved by the change in the compiled curve's band since it
    // (0.82 to 1.08 at the run; 0014 10.7 (ah) and its third addendum), over the modelled total.
    const now = RUN.map((r) => {
      const base = r.components.find((c) => c.name === 'body base')!.cd;
      return [
        r.outcome.tolerance[0] + ((COMPILED_CURVE_BAND.low - 0.82) * base) / r.outcome.cd,
        r.outcome.tolerance[1] + ((COMPILED_CURVE_BAND.high - 1.08) * base) / r.outcome.cd,
      ] as const;
    });
    const pc = (x: number) => `${x > 0 ? '+' : ''}${(Math.round(1000 * x) / 10).toFixed(1)}%`;
    const lo = now.map((x) => x[0]);
    const hi = now.map((x) => x[1]);
    const stated = `${pc(Math.max(...lo))} to ${pc(Math.min(...lo))} and ${pc(Math.min(...hi))} to ${pc(Math.max(...hi))}`;
    expect(stated).toBe('-26.5% to -29.0% and +30.4% to +31.0%');
    expect(VALIDATED_CLAIM).toContain(`its tolerances there would now be ${stated}.`);
    expect(displayText(gateDisplay())).toContain(
      `a wider band and the tolerances would be ${stated}; no residual and no verdict changes`,
    );
  });
});

describe('the display', { timeout: 60_000 }, () => {
  it("a validated total: the headline and the box in the 'ok' tone, the claim and its caveats, no reasons", () => {
    const form = roundForm(2.423);
    const blocks = totalDragDisplay(totalDragView(form, exactNose(form)));
    const head = blocks[0]!;
    const box = blocks[1]!;
    if (head.kind !== 'paragraph' || box.kind !== 'box') throw new Error('expected a total');
    expect(head.tone).toBe('ok');
    expect(head.text).toBe(
      `Total C_D = 0.4314, model-form band 0.3652 to 0.5320 (-15.4% to +23.4%): ${VALIDATED_HEADLINE}`,
    );
    expect(box.tone).toBe('ok');
    expect(box.blocks.map((b) => (b.kind === 'paragraph' ? b.text : b.kind))).toEqual([
      VALIDATED_CLAIM,
      ASSUMED_CAVEAT,
      ROUNDED_EDGE_CAVEAT,
    ]);
    expect(displayText(blocks)).not.toContain('Not validated because');
  });

  it('waiting for the nose: inside the sub-class, the class, or neither', () => {
    const text = (form: TotalDragForm) =>
      displayText(totalDragDisplay(totalDragView(form, { kind: 'pending' })));
    expect(text(sharp(1.81, 8.4e6))).toContain(SUB_CLASS_PENDING_TEXT);
    expect(text(basicFinnerForm(2.0))).toContain(INSIDE_PENDING_TEXT);
    const neither = text(sharp(2.0, 9.3e6));
    expect(neither).toContain("outside the Basic Finner's class and its BRL sub-class");
    expect(neither).toContain('lies in neither window');
  });

  it("the details: the sub-class in words and range A's seven rounds", () => {
    const blocks = gateDisplay();
    expect(displayText(blocks)).toContain(SUB_CLASS_DESCRIPTION);
    const brl = blocks.flatMap((b) => (b.kind === 'table' ? [b] : []))[1]!;
    expect(brl.rows.length).toBe(7);
    expect(brl.rows[0]).toEqual([
      '2591',
      '1.801',
      '0.6033',
      '0.5804 (0.4980 to 0.6974)',
      '+3.9%',
      '-27.1% to +27.0%',
    ]);
    expect(SUB_CLASS_DESCRIPTION).toContain(
      'at Mach 1.801 to 1.827 or 2.423 to 2.468, nothing between them (Mach 1.827 to 2.423 was ' +
        'not tested), with the Reynolds number on length 4.423e6 to 4.855e6 times the Mach number',
    );
    expect(SUB_CLASS_DESCRIPTION).toContain('some pairs inside (288 K at the lowest');
    expect(SUB_CLASS_DESCRIPTION).toContain("tolerance on each dimension is the class's");
  });
});
