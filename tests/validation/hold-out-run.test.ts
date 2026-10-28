/**
 * The hold-out run's machinery (src/validation/hold-out-run.ts), validated
 * without BRL Report 934: on the DREV gate's 11 shots it must reproduce the
 * values tests/validation/basic-finner.test.ts records (the corrected run's
 * totals, bands, residuals and tolerances; the second run's components and
 * input bands, which the correction did not move), and its rebuilt-factor
 * body base must equal the library's wherever the library itself routes to
 * the rebuilt factor. The corners' input band, the trailing-edge scaling and
 * the present model's refusal where the library routes elsewhere are
 * exercised here too, so that the BRL run uses no path this file has not
 * run.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { bodyBaseDrag, type BaseFins } from '../../src/base/base-drag';
import { COMPILED_CURVE_BAND } from '../../src/base/compiled-curve';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { doubleWedge, singleWedge, type SymmetricSection } from '../../src/fins/section';
import { finnedBodyComponents, type FinnedBody } from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import { combineComponents } from '../../src/total/total-drag';
import {
  BASIC_FINNER_CLUSTERS,
  BASIC_FINNER_GEOMETRY as G,
  BASIC_FINNER_SHOTS,
} from '../../src/validation/basic-finner';
import {
  CONDITIONS_BAND,
  clusterSpread,
  modelCase,
  rebuiltBodyBase,
  verdictOf,
  withTrailingEdgeScaled,
  type HoldOutCase,
  type HoldOutConfiguration,
  type ModelledCase,
} from '../../src/validation/hold-out-run';

const gamma = 1.4;
const half = (G.coneHalfAngleDegrees * Math.PI) / 180;
const noseLength = G.length / 20 / Math.tan(half);
const drevBody = (fins: Partial<FinnedBody['fins']> = {}): FinnedBody => ({
  body: {
    nose: { shape: { kind: 'conical' }, length: noseLength, baseRadius: 0.5 },
    cylinderLength: G.length - noseLength,
  },
  afterbody: 'cylinder',
  fins: {
    count: G.finCount,
    planform: trapezoidalPlanform({ rootChord: G.finChord, span: G.finSpan, leadingEdgeSweep: 0 }),
    section: singleWedge(G.finTrailingEdgeThickness / G.finChord),
    sectionFamily: 'other',
    leadingEdgeRadius: G.finLeadingEdgeRadius,
    trailingEdgeAheadOfBase: 0,
    ...fins,
  },
});
const temperatureOf = (a: number) => a ** 2 / (gamma * 287.05);
const temperature = temperatureOf(343.7);
const transitionReynolds = [5e5, 1.6e6, 3e6];
const drev: HoldOutConfiguration = {
  body: drevBody(),
  coneHalfAngle: half,
  inputs: { transitionReynolds, wallTemperature: temperature },
};
const gated = BASIC_FINNER_SHOTS.filter((s) => s.use === 'gate');
const caseOf = (s: (typeof gated)[number], corners: HoldOutCase['corners'] = []): HoldOutCase => ({
  id: s.shot,
  mach: s.mach,
  measured: s.cx0,
  conditions: { mach: s.mach, temperature, reynoldsPerLength: s.reynolds / G.length },
  corners,
});
const clusterOf = (m: number) => BASIC_FINNER_CLUSTERS.findIndex(([a, b]) => m >= a && m <= b);
const spreads = BASIC_FINNER_CLUSTERS.map(([a, b]) =>
  clusterSpread(gated.filter((s) => s.mach >= a && s.mach <= b).map((s) => s.cx0)),
);

/**
 * tests/validation/basic-finner.test.ts, as recorded there: the corrected run's total, band,
 * residual and tolerance (CORRECTED), and the second run's input bands and its components
 * other than the body base (RECORDED), with the corrected body base. The compiled curve's band was
 * 0.82 to 1.08 at that run; 0014 10.7 (ah) widened it after, to 0.77 to 1.13 (1.18 until round 19's
 * blind readings of TR 1051, the third addendum to (ah)), which moves the body
 * base's band ends by the change times its term (`widenedBy`), and nothing else.
 */
const DREV_RECORDED = [
  ['DA95021318', 0.61337, 0.52964, 0.72961, -0.0316, -0.2455, 0.2347, -0.04664, 0.01551],
  ['DA95021529', 0.59523, 0.51642, 0.70632, 0.0046, -0.2404, 0.2333, -0.04467, 0.01596],
  ['DA95021308', 0.59398, 0.51557, 0.70471, -0.0454, -0.2404, 0.2333, -0.0448, 0.01601],
  ['DA95021328', 0.48114, 0.41873, 0.5717, 0.0392, -0.2204, 0.2644, -0.03302, 0.02042],
  ['DA95020907', 0.47866, 0.41666, 0.56873, -0.0014, -0.2204, 0.2649, -0.03292, 0.02057],
  ['DA95021317', 0.46994, 0.40944, 0.55801, 0.0065, -0.2189, 0.2656, -0.03201, 0.0209],
  ['DA95020927', 0.43137, 0.37631, 0.51225, 0.0339, -0.2699, 0.2846, -0.02881, 0.02259],
  ['DA95020906', 0.4215, 0.36798, 0.50018, -0.051, -0.2686, 0.286, -0.02786, 0.02303],
  ['DA95020916', 0.42056, 0.36721, 0.49904, 0.0747, -0.2684, 0.2861, -0.02778, 0.02308],
  ['DA95030603', 0.39509, 0.34591, 0.46771, -0.0255, -0.2004, 0.2567, -0.02533, 0.02411],
  ['DA95022205', 0.39507, 0.3459, 0.46768, -0.0483, -0.2004, 0.2567, -0.02534, 0.02413],
] as const;
/** Components in the order nose, body friction, fin friction, leading edges, fin wave drag, body base (corrected), trailing-edge base. */
const DREV_COMPONENTS = [
  [0.11054, 0.08038, 0.03604, 0.04394, 0.01655, 0.21873, 0.10719],
  [0.10897, 0.07911, 0.03546, 0.04422, 0.01602, 0.20816, 0.1033],
  [0.10885, 0.07916, 0.03549, 0.04424, 0.01598, 0.20726, 0.10301],
  [0.09677, 0.06878, 0.03089, 0.04631, 0.01215, 0.15201, 0.07423],
  [0.09647, 0.06863, 0.03083, 0.04636, 0.01206, 0.15083, 0.07347],
  [0.09558, 0.06749, 0.03031, 0.0465, 0.01179, 0.14709, 0.07118],
  [0.09168, 0.06321, 0.02845, 0.0471, 0.01064, 0.12939, 0.0609],
  [0.09061, 0.06183, 0.02784, 0.04725, 0.01033, 0.12553, 0.05811],
  [0.0905, 0.06172, 0.02779, 0.04727, 0.0103, 0.12514, 0.05784],
  [0.08783, 0.05797, 0.02613, 0.04764, 0.00953, 0.11518, 0.05081],
  [0.08781, 0.05801, 0.02615, 0.04764, 0.00953, 0.11514, 0.05078],
] as const;

/** What 0014 10.7 (ah) adds to the body base's band ends, in C_D, for a body base term `cd`. */
const widenedBy = (cd: number) => ({
  low: (COMPILED_CURVE_BAND.low - 0.82) * cd,
  high: (COMPILED_CURVE_BAND.high - 1.08) * cd,
});

let present: ModelledCase[] = [];
let rebuilt: ModelledCase[] = [];

beforeAll(() => {
  present = gated.map((s) => modelCase(drev, caseOf(s), 'present'));
  rebuilt = gated.map((s) => modelCase(drev, caseOf(s), 'rebuilt'));
}, 1_800_000);

describe('the harness on the DREV gate', { timeout: 1_800_000 }, () => {
  it('has the DREV cluster spreads of 0008 (-3.3/+2.0, -2.2/+3.4, -7.6/+4.5, -1.2/+1.2 %)', () => {
    expect(spreads.map((c) => [c.lo, c.hi].map((x) => Math.round(1000 * x) / 10))).toEqual([
      [-3.3, 2.0],
      [-2.2, 3.4],
      [-7.6, 4.5],
      [-1.2, 1.2],
    ]);
  });

  it('the present model reproduces every recorded value of basic-finner.test.ts at the 11 shots', () => {
    expect(present.length).toBe(11);
    present.forEach((m, k) => {
      const r = DREV_RECORDED[k]!;
      expect(m.id).toBe(r[0]);
      expect(m.refusals).toEqual([]);
      expect(m.parts.base?.finsOnBaseSource).toBe('present');
      const t = m.total!;
      const v = verdictOf(t, gated[k]!.cx0, spreads[clusterOf(m.mach)]!);
      const w = widenedBy(DREV_COMPONENTS[k]![5]);
      expect(Math.abs(t.cd - r[1])).toBeLessThan(1e-5);
      expect(Math.abs(t.low - (r[2] + w.low))).toBeLessThan(1e-5);
      expect(Math.abs(t.high - (r[3] + w.high))).toBeLessThan(1e-5);
      expect(Math.abs(v.residual - r[4])).toBeLessThan(1e-4);
      expect(Math.abs(v.tolerance[0] - (r[5] + w.low / r[1]))).toBeLessThan(1e-4);
      expect(Math.abs(v.tolerance[1] - (r[6] + w.high / r[1]))).toBeLessThan(1e-4);
      expect(Math.abs(v.inputLow - r[7])).toBeLessThan(1e-5);
      expect(Math.abs(v.inputHigh - r[8])).toBeLessThan(1e-5);
      expect(v.inside).toBe(true);
      expect(t.inputs.map((i) => i.name)).toEqual(['transition', 'wall temperature', 'roughness']);
      t.components.forEach((c, j) => {
        expect(Math.abs(c.cd - DREV_COMPONENTS[k]![j]!)).toBeLessThan(1e-5);
      });
    });
  });

  it('the tolerances after the correction, as basic-finner.test.ts states them with the band widened by 0014 10.7 (ah) and its third addendum: -21.5% to -28.5%, +25.1% to +30.1% (+21.0% to +24.7% without the wall)', () => {
    const v = present.map((m, k) =>
      verdictOf(m.total!, gated[k]!.cx0, spreads[clusterOf(m.mach)]!),
    );
    const r = (x: number[]) =>
      [Math.min(...x), Math.max(...x)].map((y) => Math.round(1000 * y) / 10);
    expect(r(v.map((x) => x.tolerance[0]))).toEqual([-28.5, -21.5]);
    expect(r(v.map((x) => x.tolerance[1]))).toEqual([25.1, 30.1]);
    expect(r(v.map((x) => x.highWithoutWall))).toEqual([21.0, 24.7]);
    expect(v.map((x) => Math.round(1000 * x.residual) / 10)).toEqual([
      -3.2, 0.5, -4.5, 3.9, -0.1, 0.7, 3.4, -5.1, 7.5, -2.6, -4.8,
    ]);
  });

  it("the present model's total is the library's, to the last bit", () => {
    gated.forEach((s, k) => {
      const c = caseOf(s);
      const parts = finnedBodyComponents(
        drev.body,
        c.conditions,
        exactConeNoseWaveDrag(s.mach, half),
        drev.inputs,
      );
      const t = combineComponents(parts.components, parts.inputs);
      expect([present[k]!.total!.cd, present[k]!.total!.low, present[k]!.total!.high]).toEqual([
        t.cd,
        t.low,
        t.high,
      ]);
    });
  });

  it("the rebuilt factor refuses the DREV Basic Finner's wedges at every shot (0015 sections 1, 4, 9), every other component computed", () => {
    for (const m of rebuilt) {
      expect(m.total).toBeUndefined();
      expect(m.refusals.map((r) => [r.component, r.reason])).toEqual([
        ['body base', 'fin-trailing-edge'],
      ]);
      expect(m.refusals[0]!.message).toMatch(/^faces that diverge to a blunt trailing edge/);
      expect(m.corners).toEqual([]);
    }
  });
});

describe("the rebuilt body base equals the library's where the library routes to the rebuilt factor", () => {
  const near = (section: SymmetricSection, tanLe = 0, tanTe = 0) => ({
    section,
    sectionFamily: 'other' as const,
    tanLeadingEdgeSweep: tanLe,
    tanTrailingEdgeSweep: tanTe,
  });
  const fins = (count: number, t: number, nb: ReturnType<typeof near>): BaseFins => ({
    count,
    thicknessRatio: t,
    section: 'other',
    tanLeadingEdge: nb.tanLeadingEdgeSweep,
    tanTrailingEdge: nb.tanTrailingEdgeSweep,
    trailingEdgeAheadOfBase: 0,
    nearBase: nb,
  });
  const cases: [number, BaseFins][] = [];
  for (const mach of [1.5, 1.6, 1.8, 2.0, 2.4, 2.8, 3.0]) {
    cases.push([mach, fins(3, 0.05, near(doubleWedge(0.05)))]);
    cases.push([mach, fins(3, 0.1, near(doubleWedge(0.1)))]);
  }
  for (const mach of [2.0, 2.3, 2.5, 2.9]) {
    cases.push([mach, fins(4, 0.05, near(doubleWedge(0.05), Math.tan((30 * Math.PI) / 180), 0))]);
  }
  for (const mach of [1.62, 2.0, 2.4]) {
    cases.push([mach, fins(4, 0.08, near(doubleWedge(0.08), 1, 0))]);
  }

  it('three fins, swept fins (W1b, 45 deg): term and band ends identical', () => {
    for (const [mach, f] of cases) {
      const lib = bodyBaseDrag({
        mach,
        afterbody: 'cylinder',
        boundaryLayerAtBase: 'turbulent',
        baseAreaRatio: 1,
        fins: f,
      });
      expect(lib.finsOnBaseSource).toBe('rebuilt');
      const r = rebuiltBodyBase(mach, f);
      expect([r.component.cd, r.component.low, r.component.high]).toEqual([
        lib.cd,
        lib.low,
        lib.high,
      ]);
      expect(r.factor.nominal).toBe(lib.finsOnBase!.nominal);
    }
  });

  it('below Mach 1.5 (W2) it is not composed', () => {
    expect(() => rebuiltBodyBase(1.4, cases[0]![1])).toThrow(/W2/);
  });

  it("through the harness: three fins routed to the rebuilt factor give the library's total; the present model is refused there", () => {
    const three: HoldOutConfiguration = {
      ...drev,
      body: drevBody({ count: 3, leadingEdgeRadius: 0 }),
    };
    const s = gated[0]!;
    const c = caseOf(s);
    const lib = finnedBodyComponents(
      three.body,
      c.conditions,
      exactConeNoseWaveDrag(s.mach, half),
      three.inputs,
    );
    // The library's own routing refuses the wedges too (the rebuilt factor takes no diverging faces);
    // with a sharp double wedge it serves.
    expect(lib.refusals.map((r) => r.reason)).toEqual(['fin-trailing-edge']);
    const dw: HoldOutConfiguration = {
      ...drev,
      body: drevBody({ count: 3, leadingEdgeRadius: 0, section: doubleWedge(0.08) }),
    };
    for (const mach of [1.6, 1.8, 2.4]) {
      const cc = { ...c, mach, conditions: { ...c.conditions, mach } };
      const p = finnedBodyComponents(
        dw.body,
        cc.conditions,
        exactConeNoseWaveDrag(mach, half),
        dw.inputs,
      );
      expect(p.refusals).toEqual([]);
      expect(p.base?.finsOnBaseSource).toBe('rebuilt');
      const t = combineComponents(p.components, p.inputs);
      const m = modelCase(dw, cc, 'rebuilt');
      expect(m.refusals).toEqual([]);
      expect([m.total!.cd, m.total!.low, m.total!.high]).toEqual([t.cd, t.low, t.high]);
      expect(m.total!.components.map((x) => x.name)).toEqual(t.components.map((x) => x.name));
      const pm = modelCase(dw, cc, 'present');
      expect(pm.total).toBeUndefined();
      expect(pm.refusals.map((r) => [r.component, r.reason])).toEqual([
        ['body base', 'present-factor'],
      ]);
      expect(pm.refusals[0]!.message).toMatch(/fins-on-base factor is measured with four fins/);
    }
    // Where the present factor serves (four double wedges, M 2.4), the rebuilt model replaces its body base.
    const four: HoldOutConfiguration = {
      ...drev,
      body: drevBody({ leadingEdgeRadius: 0, section: doubleWedge(0.08) }),
    };
    const cc = { ...c, mach: 2.4, conditions: { ...c.conditions, mach: 2.4 } };
    const pm = modelCase(four, cc, 'present');
    const rm = modelCase(four, cc, 'rebuilt');
    expect(pm.parts.base?.finsOnBaseSource).toBe('present');
    const rb = rebuiltBodyBase(2.4, {
      count: 4,
      thicknessRatio: 0.08,
      section: 'other',
      tanLeadingEdge: 0,
      tanTrailingEdge: 0,
      trailingEdgeAheadOfBase: 0,
      nearBase: near(doubleWedge(0.08)),
    });
    const pb = pm.total!.components.find((x) => x.name === 'body base')!;
    expect(Math.abs(rm.total!.cd - (pm.total!.cd - pb.cd + rb.component.cd))).toBeLessThan(1e-12);
    expect(rm.total!.inputs).toEqual(pm.total!.inputs);
  });
});

describe('the corners and the trailing-edge scaling, on DREV shots', { timeout: 1_800_000 }, () => {
  it("corners at the nominal conditions give a zero band; Table V's speed of sound, 343.4 to 344.0 m/s, moves no total at the fourth decimal", () => {
    for (const k of [0, 5, 10]) {
      const s = gated[k]!;
      const base = caseOf(s);
      const same = modelCase(
        drev,
        { ...base, corners: [{ name: 'nominal', conditions: base.conditions }] },
        'present',
      );
      const band = same.total!.inputs.find((i) => i.name === CONDITIONS_BAND)!;
      expect([band.low, band.high]).toEqual([0, 0]);
      expect(same.total!.cd).toBe(present[k]!.total!.cd);
      const corners = [343.4, 344.0].map((a) => ({
        name: `a ${a} m/s`,
        conditions: { ...base.conditions, temperature: temperatureOf(a) },
      }));
      const m = modelCase(drev, { ...base, corners }, 'present');
      const b = m.total!.inputs.find((i) => i.name === CONDITIONS_BAND)!;
      expect(b.low).toBeLessThanOrEqual(0);
      expect(b.high).toBeGreaterThanOrEqual(0);
      expect(Math.max(-b.low, b.high)).toBeLessThan(5e-5);
      expect(m.corners.map((x) => x.trailingEdge)).toEqual(
        m.corners.map(
          () => m.total!.components.find((x) => x.name === 'fin trailing-edge base')!.cd,
        ),
      );
      // A corner's total equals the library's at that corner.
      const lib = finnedBodyComponents(
        drev.body,
        corners[0]!.conditions,
        exactConeNoseWaveDrag(s.mach, half),
        {},
      );
      expect(m.corners[0]!.cd).toBe(lib.components.reduce((a, x) => a + x.cd, 0));
    }
  });

  it('the trailing-edge term scaled: by 1 the total unchanged; by 0.5 the term, its band and its laminar change halved', () => {
    for (const m of present) {
      const same = withTrailingEdgeScaled(m, 1);
      expect([same.cd, same.low, same.high]).toEqual([m.total!.cd, m.total!.low, m.total!.high]);
      expect(same.inputs.map((i) => [i.low, i.high])).toEqual(
        m.total!.inputs.map((i) => [i.low, i.high]),
      );
      const te = m.total!.components.find((x) => x.name === 'fin trailing-edge base')!;
      const h = withTrailingEdgeScaled(m, 0.5);
      expect(Math.abs(h.cd - (m.total!.cd - 0.5 * te.cd))).toBeLessThan(1e-12);
      expect(Math.abs(h.low - (m.total!.low - 0.5 * te.low))).toBeLessThan(1e-12);
      expect(Math.abs(h.high - (m.total!.high - 0.5 * te.high))).toBeLessThan(1e-12);
      // The low end of the transition input is the run to 3e6 with the trailing edges laminar.
      const states = m.parts.transitionStates;
      const lowest = states.reduce((a, s) => (s.low < a.low ? s : a));
      const t = h.inputs.find((i) => i.name === 'transition')!;
      expect(t.low).toBeLessThanOrEqual(lowest.friction + 0.5 * lowest.trailingEdge.low + 1e-15);
    }
  });
});
