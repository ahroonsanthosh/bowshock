/**
 * Step B5 of docs/design/0008-total-drag.md: the Basic Finner gate (DREV
 * TM 9703, free flight; src/validation/basic-finner.ts), the 11 shots at
 * Mach 1.80 to 2.97 that took part in no band. Nothing here is tuned on
 * them (0008 section 6.1). Result and interpretation:
 * docs/design/0010-base-drag-and-total.md, section 4.2.
 *
 * The second run, made once (2026-10-19), after the fin-edge terms were
 * implemented with the choices of 0010 section 5 and the independent
 * reader's round-4 report was applied (the trailing-edge area 0.32 cal^2,
 * every band the envelope of both readings). Its values are recorded here
 * as they came out. The first run was refused for the two fin-edge terms;
 * its assertions are in this file's version at commit 3d9978a (0010
 * section 6).
 *
 * The configuration as transcribed: a 10 deg half-angle cone (nose 2.836
 * cal, fig. 2's "2.84"), a cylinder to 10.0 cal, four rectangular fins of
 * 1 cal chord and span at the base, single wedges from a leading edge of
 * radius 0.004 cal (the tangent geometry) to a blunt trailing edge 0.08
 * cal thick across the span. Conditions: Mach number and Reynolds number
 * per shot (Table V, on the 0.300 m length); the static temperature from
 * the range's speed of sound, 343.7 m/s; the nose drag exact
 * (Taylor-Maccoll) with the fitted solver's floor as its band. Inputs:
 * transition (laminar runs to Re_T 5e5, 1.6e6 and 3e6), the wall from
 * adiabatic to the air temperature.
 *
 * Tolerance on the residual CX0 / modelled - 1 (0008 sections 6.2 B5 and
 * 6.3): the model-form band (every component's), plus the input bands
 * (transition on friction, low side; the trailing edges' laminar band,
 * both sides; the wall temperature, high side), plus the shot-to-shot
 * spread of the shot's Mach cluster, all over the modelled total.
 *
 * Verdict: every one of the 11 shots lies inside its tolerance, so the
 * gate passes.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { singleWedge } from '../../src/fins/section';
import {
  finnedBodyComponents,
  finnedBodyTotalDrag,
  type FinnedBody,
} from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import { combineComponents, type TotalDrag } from '../../src/total/total-drag';
import {
  BASIC_FINNER_CLUSTERS,
  BASIC_FINNER_GEOMETRY as G,
  BASIC_FINNER_SHOTS,
} from '../../src/validation/basic-finner';

const gamma = 1.4;
const half = (G.coneHalfAngleDegrees * Math.PI) / 180;
const noseLength = G.length / 20 / Math.tan(half);
const asTranscribed: FinnedBody = {
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
  },
};
const temperature = 343.7 ** 2 / (gamma * 287.05);
const transitionReynolds = [5e5, 1.6e6, 3e6];
const inputs = { transitionReynolds, wallTemperature: temperature };
const gated = BASIC_FINNER_SHOTS.filter((s) => s.use === 'gate');
const conditionsOf = (s: (typeof gated)[number]) => ({
  mach: s.mach,
  temperature,
  reynoldsPerLength: s.reynolds / G.length,
});

const COMPONENTS = [
  'nose wave drag',
  'body friction',
  'fin friction',
  'fin leading edges',
  'fin wave drag',
  'body base',
  'fin trailing-edge base',
];

/**
 * The second run as it came out (0010 section 4.2): the modelled total, its
 * model-form band, the sums of the input bands, the residual, the
 * tolerance, and the components in the order of COMPONENTS.
 */
const RECORDED = [
  {
    shot: 'DA95021318',
    cd: 0.61232,
    low: 0.53113,
    high: 0.72612,
    inputLow: -0.04664,
    inputHigh: 0.03625,
    residual: -0.0299,
    tolerance: [-0.2417, 0.265],
    components: [0.11054, 0.08038, 0.03604, 0.04394, 0.01655, 0.21768, 0.10719],
  },
  {
    shot: 'DA95021529',
    cd: 0.59554,
    low: 0.51805,
    high: 0.70528,
    inputLow: -0.04467,
    inputHigh: 0.03713,
    residual: 0.0041,
    tolerance: [-0.2381, 0.2665],
    components: [0.10897, 0.07911, 0.03546, 0.04422, 0.01602, 0.20846, 0.1033],
  },
  {
    shot: 'DA95021308',
    cd: 0.5944,
    low: 0.51721,
    high: 0.70387,
    inputLow: -0.0448,
    inputHigh: 0.0369,
    residual: -0.0461,
    tolerance: [-0.2382, 0.2661],
    components: [0.10885, 0.07916, 0.03549, 0.04424, 0.01598, 0.20768, 0.10301],
  },
  {
    shot: 'DA95021328',
    cd: 0.48458,
    low: 0.42498,
    high: 0.57198,
    inputLow: -0.03302,
    inputHigh: 0.04005,
    residual: 0.0318,
    tolerance: [-0.2132, 0.2968],
    components: [0.09677, 0.06878, 0.03089, 0.04631, 0.01215, 0.15545, 0.07423],
  },
  {
    shot: 'DA95020907',
    cd: 0.48237,
    low: 0.4234,
    high: 0.56903,
    inputLow: -0.03292,
    inputHigh: 0.03988,
    residual: -0.0091,
    tolerance: [-0.2126, 0.2961],
    components: [0.09647, 0.06863, 0.03083, 0.04636, 0.01206, 0.15454, 0.07347],
  },
  {
    shot: 'DA95021317',
    cd: 0.47449,
    low: 0.41738,
    high: 0.55872,
    inputLow: -0.03201,
    inputHigh: 0.04026,
    residual: -0.0031,
    tolerance: [-0.2099, 0.2961],
    components: [0.09558, 0.06749, 0.03031, 0.0465, 0.01179, 0.15164, 0.07118],
  },
  {
    shot: 'DA95020927',
    cd: 0.44275,
    low: 0.3892,
    high: 0.52099,
    inputLow: -0.02881,
    inputHigh: 0.04027,
    residual: 0.0073,
    tolerance: [-0.2615, 0.3123],
    components: [0.09168, 0.06321, 0.02845, 0.0471, 0.01064, 0.14078, 0.0609],
  },
  {
    shot: 'DA95020906',
    cd: 0.43323,
    low: 0.38081,
    high: 0.50965,
    inputLow: -0.02786,
    inputHigh: 0.04035,
    residual: -0.0767,
    tolerance: [-0.2608, 0.3142],
    components: [0.09061, 0.06183, 0.02784, 0.04725, 0.01033, 0.13727, 0.05811],
  },
  {
    shot: 'DA95020916',
    cd: 0.43233,
    low: 0.38003,
    high: 0.50858,
    inputLow: -0.02778,
    inputHigh: 0.04032,
    residual: 0.0455,
    tolerance: [-0.2607, 0.3143],
    components: [0.0905, 0.06172, 0.02779, 0.04727, 0.0103, 0.13691, 0.05784],
  },
  {
    shot: 'DA95030603',
    cd: 0.40716,
    low: 0.35796,
    high: 0.47858,
    inputLow: -0.02533,
    inputHigh: 0.04036,
    residual: -0.0544,
    tolerance: [-0.1949, 0.2864],
    components: [0.08783, 0.05797, 0.02613, 0.04764, 0.00953, 0.12724, 0.05081],
  },
  {
    shot: 'DA95022205',
    cd: 0.40713,
    low: 0.35795,
    high: 0.47855,
    inputLow: -0.02534,
    inputHigh: 0.04032,
    residual: -0.0765,
    tolerance: [-0.1949, 0.2863],
    components: [0.08781, 0.05801, 0.02615, 0.04764, 0.00953, 0.1272, 0.05078],
  },
];

interface Shot {
  readonly shot: string;
  readonly mach: number;
  readonly total: TotalDrag;
  readonly inputLow: number;
  readonly inputHigh: number;
  readonly residual: number;
  readonly tolerance: readonly [number, number];
  /** The high end without the wall-temperature input. */
  readonly highWithoutWall: number;
}

const clusterSpread = BASIC_FINNER_CLUSTERS.map(([a, b]) => {
  const v = gated.filter((s) => s.mach >= a && s.mach <= b).map((s) => s.cx0);
  const mean = v.reduce((p, q) => p + q, 0) / v.length;
  return { lo: Math.min(...v) / mean - 1, hi: Math.max(...v) / mean - 1 };
});
const clusterOf = (m: number) => BASIC_FINNER_CLUSTERS.findIndex(([a, b]) => m >= a && m <= b);

let shots: Shot[] = [];

beforeAll(() => {
  shots = gated.map((s) => {
    const parts = finnedBodyComponents(
      asTranscribed,
      conditionsOf(s),
      exactConeNoseWaveDrag(s.mach, half),
      inputs,
    );
    expect(parts.refusals).toEqual([]);
    const total = combineComponents(parts.components, parts.inputs);
    const inputLow = total.inputs.reduce((a, i) => a + i.low, 0);
    const inputHigh = total.inputs.reduce((a, i) => a + i.high, 0);
    const wall = total.inputs.find((i) => i.name === 'wall temperature')!;
    const spread = clusterSpread[clusterOf(s.mach)]!;
    return {
      shot: s.shot,
      mach: s.mach,
      total,
      inputLow,
      inputHigh,
      residual: s.cx0 / total.cd - 1,
      tolerance: [
        (total.low + inputLow) / total.cd - 1 + spread.lo,
        (total.high + inputHigh) / total.cd - 1 + spread.hi,
      ],
      highWithoutWall: (total.high + inputHigh - wall.high) / total.cd - 1 + spread.hi,
    };
  });
});

describe('the gate, second run: 11 shots at Mach 1.80 to 2.97', { timeout: 120_000 }, () => {
  it('has the 11 shots in four clusters, with the cluster spreads of 0008', () => {
    expect(gated.length).toBe(11);
    expect(gated.every((s) => clusterOf(s.mach) >= 0)).toBe(true);
    expect(clusterSpread.map((c) => [c.lo, c.hi].map((x) => Math.round(1000 * x) / 10))).toEqual([
      [-3.3, 2.0],
      [-2.2, 3.4],
      [-7.6, 4.5],
      [-1.2, 1.2],
    ]);
  });

  it('the total computes at every shot, with the seven components and four inputs', () => {
    for (const s of shots) {
      expect(s.total.components.map((c) => c.name)).toEqual(COMPONENTS);
      expect(s.total.inputs.map((i) => i.name)).toEqual([
        'transition',
        'wall temperature',
        'roughness',
        'transition at the fin trailing edges',
      ]);
    }
    const s = gated[0]!;
    expect(
      finnedBodyTotalDrag(
        asTranscribed,
        conditionsOf(s),
        exactConeNoseWaveDrag(s.mach, half),
        inputs,
      ).cd,
    ).toBeCloseTo(shots[0]!.total.cd, 12);
  });

  it('per shot as recorded', () => {
    shots.forEach((s, k) => {
      const r = RECORDED[k]!;
      expect(s.shot).toBe(r.shot);
      expect(Math.abs(s.total.cd - r.cd)).toBeLessThan(1e-5);
      expect(Math.abs(s.total.low - r.low)).toBeLessThan(1e-5);
      expect(Math.abs(s.total.high - r.high)).toBeLessThan(1e-5);
      expect(Math.abs(s.inputLow - r.inputLow)).toBeLessThan(1e-5);
      expect(Math.abs(s.inputHigh - r.inputHigh)).toBeLessThan(1e-5);
      expect(Math.abs(s.residual - r.residual)).toBeLessThan(1e-4);
      expect(Math.abs(s.tolerance[0] - r.tolerance[0]!)).toBeLessThan(1e-4);
      expect(Math.abs(s.tolerance[1] - r.tolerance[1]!)).toBeLessThan(1e-4);
      s.total.components.forEach((c, j) => {
        expect(Math.abs(c.cd - r.components[j]!)).toBeLessThan(1e-5);
      });
    });
  });

  it('the residuals: -3.0, +0.4, -4.6, +3.2, -0.9, -0.3, +0.7, -7.7, +4.5, -5.4, -7.6 %', () => {
    expect(shots.map((s) => Math.round(1000 * s.residual) / 10)).toEqual([
      -3.0, 0.4, -4.6, 3.2, -0.9, -0.3, 0.7, -7.7, 4.5, -5.4, -7.6,
    ]);
    const mean = shots.reduce((a, s) => a + s.residual, 0) / shots.length;
    expect(Math.round(1000 * mean) / 10).toBe(-1.9);
  });

  it('the tolerances: -19.5% to -26.2% and +26.5% to +31.4% (+22.7% to +26.1% without the wall)', () => {
    const lo = shots.map((s) => s.tolerance[0]);
    const hi = shots.map((s) => s.tolerance[1]);
    const noWall = shots.map((s) => s.highWithoutWall);
    const r = (v: number[]) =>
      [Math.min(...v), Math.max(...v)].map((x) => Math.round(1000 * x) / 10);
    expect(r(lo)).toEqual([-26.2, -19.5]);
    expect(r(hi)).toEqual([26.5, 31.4]);
    expect(r(noWall)).toEqual([22.7, 26.1]);
  });

  it('every shot lies inside its tolerance: the gate passes', () => {
    const failed = shots.filter(
      (s) => !(s.residual >= s.tolerance[0] && s.residual <= s.tolerance[1]),
    );
    expect(failed.map((s) => s.shot)).toEqual([]);
  });

  it('every residual lies inside the model-form band alone (-12.0% to -13.3%, +17.5% to +18.6%)', () => {
    for (const s of shots) {
      const lo = s.total.low / s.total.cd - 1;
      const hi = s.total.high / s.total.cd - 1;
      expect(lo).toBeGreaterThan(-0.134);
      expect(lo).toBeLessThan(-0.12);
      expect(hi).toBeGreaterThan(0.175);
      expect(hi).toBeLessThan(0.187);
      expect(s.residual).toBeGreaterThan(lo);
      expect(s.residual).toBeLessThan(hi);
    }
  });

  it('per cluster: mean, min, max and standard deviation of the residuals', () => {
    const stats = BASIC_FINNER_CLUSTERS.map(([a, b]) => {
      const v = shots.filter((s) => s.mach >= a && s.mach <= b).map((s) => s.residual);
      const mean = v.reduce((p, q) => p + q, 0) / v.length;
      const sd = Math.sqrt(v.reduce((p, q) => p + (q - mean) ** 2, 0) / (v.length - 1));
      return [
        v.length,
        ...[mean, Math.min(...v), Math.max(...v), sd].map((x) => Math.round(1000 * x) / 10),
      ];
    });
    expect(stats).toEqual([
      [3, -2.4, -4.6, 0.4, 2.6],
      [3, 0.7, -0.9, 3.2, 2.2],
      [3, -0.8, -7.7, 4.5, 6.3],
      [2, -6.5, -7.6, -5.4, 1.6],
    ]);
  });

  it("the components' shares of the modelled total", () => {
    const share = (k: number, name: string) =>
      shots[k]!.total.components.find((c) => c.name === name)!.cd / shots[k]!.total.cd;
    // Body base 31% to 36%, fin trailing-edge base 12% to 18%, nose 18% to 22%, leading edges 7% to 12%.
    for (let k = 0; k < shots.length; k++) {
      expect(share(k, 'body base')).toBeGreaterThan(0.31);
      expect(share(k, 'body base')).toBeLessThan(0.36);
      expect(share(k, 'fin trailing-edge base')).toBeGreaterThan(0.12);
      expect(share(k, 'fin trailing-edge base')).toBeLessThan(0.18);
      expect(share(k, 'nose wave drag')).toBeGreaterThan(0.18);
      expect(share(k, 'nose wave drag')).toBeLessThan(0.22);
      expect(share(k, 'fin leading edges')).toBeGreaterThan(0.07);
      expect(share(k, 'fin leading edges')).toBeLessThan(0.12);
    }
  });

  it('labels: the leading edges extrapolated in Reynolds number at M 1.80 to 2.41, covered by RM A55H31 at 2.66 to 2.97; the trailing edges an analogy', () => {
    for (const s of shots) {
      const le = s.total.components.find((c) => c.name === 'fin leading edges')!.label;
      const te = s.total.components.find((c) => c.name === 'fin trailing-edge base')!.label;
      expect(le).toContain('an analogy, not a measurement');
      expect(le).toContain(s.mach < 2.48 ? 'extrapolated in Reynolds number' : 'RM A55H31');
      expect(te.startsWith('an analogy, not a measurement')).toBe(true);
    }
  });

  it('the two fin-edge terms carry 24% to 25% of the total; within a cluster the model changes by at most 3.0%', () => {
    const edges = shots.map(
      (s) =>
        s.total.components
          .filter((c) => c.name === 'fin leading edges' || c.name === 'fin trailing-edge base')
          .reduce((a, c) => a + c.cd, 0) / s.total.cd,
    );
    expect(Math.min(...edges)).toBeGreaterThan(0.24);
    expect(Math.max(...edges)).toBeLessThan(0.25);
    const changes = BASIC_FINNER_CLUSTERS.map(([a, b]) => {
      const v = shots.filter((s) => s.mach >= a && s.mach <= b).map((s) => s.total.cd);
      return Math.max(...v) / Math.min(...v) - 1;
    });
    expect(Math.round(1000 * Math.max(...changes)) / 10).toBe(3.0);
  });

  it('the input bands: transition -0.0187 to -0.0301, wall +0.0155 to +0.0241, the trailing edges -0.0066/+0.0163 to -0.0165/+0.0207, extrapolated above M 2.3', () => {
    const input = (s: Shot, n: string) => s.total.inputs.find((i) => i.name === n)!;
    const r4 = (v: number[]) =>
      [Math.min(...v), Math.max(...v)].map((x) => Math.round(1e4 * x) / 1e4);
    expect(r4(shots.map((s) => input(s, 'transition').low))).toEqual([-0.0301, -0.0187]);
    expect(shots.every((s) => input(s, 'transition').high === 0)).toBe(true);
    expect(r4(shots.map((s) => input(s, 'wall temperature').high))).toEqual([0.0155, 0.0241]);
    const te = shots.map((s) => input(s, 'transition at the fin trailing edges'));
    expect(r4(te.map((i) => i.low))).toEqual([-0.0165, -0.0066]);
    expect(r4(te.map((i) => i.high))).toEqual([0.0162, 0.0212]);
    expect([te[0]!.low, te[0]!.high].map((x) => Math.round(1e4 * x) / 1e4)).toEqual([
      -0.0165, 0.0207,
    ]);
    expect([te[9]!.low, te[9]!.high].map((x) => Math.round(1e4 * x) / 1e4)).toEqual([
      -0.0066, 0.0163,
    ]);
    expect(
      shots.filter((_, k) => te[k]!.label.includes('extrapolated')).map((s) => s.mach),
    ).toEqual(shots.filter((s) => s.mach > 2.3).map((s) => s.mach));
    expect(shots.filter((s) => s.mach > 2.3).length).toBe(8);
  });

  it('the five shots at Mach 1.06 to 1.33 are refused (reported, not gated)', () => {
    for (const s of BASIC_FINNER_SHOTS.filter((x) => x.use === 'reported')) {
      const r = finnedBodyComponents(
        asTranscribed,
        conditionsOf(s),
        exactConeNoseWaveDrag(s.mach, half),
        inputs,
      );
      const reasons = r.refusals.map((x) => x.reason);
      expect(reasons).toContain('leading-edge-range');
      expect(reasons).toContain('mach-range');
      if (s.mach < 1.2) expect(reasons).toContain('detached-shock');
    }
  });
});
