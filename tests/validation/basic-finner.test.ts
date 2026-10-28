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
 * (transition; the wall temperature, high side), plus the shot-to-shot
 * spread of the shot's Mach cluster, all over the modelled total.
 *
 * Verdict: every one of the 11 shots lies inside its tolerance, so the
 * gate passes.
 *
 * Round 5 (2026-10-20, 0010 section 10): the band arithmetic was changed
 * after the hold-out was used, on the independent audit's findings 7 and
 * 8. The transition input is now evaluated as states of the boundary
 * layer: each transition Reynolds number moves the friction and, where it
 * leaves the fins laminar at their trailing edges, the trailing edges'
 * base together, where the second run added the trailing edges' laminar
 * band on both sides independently of the friction (its high end needs
 * laminar trailing edges on turbulent fins, a state no boundary layer
 * reaches). No base term or band end exceeds the vacuum bound. The
 * components, the model-form band and the residuals are unchanged; the
 * tolerance's high end narrows from +26.5% to +31.4% to +23.1% to +27.4%
 * (its low end is unchanged), and every shot still passes. RECORDED holds
 * the re-derived values (docs/research/base-and-total/runs/gate-round5.out)
 * with the second run's beside them.
 *
 * The correction (2026-10-21, 0010 section 11), a RECORDED CORRECTION, not
 * a validation: the fins-on-base factor had rested on readings of TN 3819
 * fig. 35 that followed estimate B, one of Love's predictions, above about M
 * 2.15. It now rests on two readings of the free-flight curve as identified,
 * which ends at M 2.563, and above M 2.56 it is bounded, not measured. The
 * correction was made on the figure's evidence alone, after these residuals
 * were known, and it moves the model toward the shots at high Mach number.
 * Only the body base moves; every other component and every input band is
 * the second run's. The hold-out is used: the gate is re-run to record the
 * corrected model against the shots, and the validated class stays where
 * the factor was on the free-flight curve before the correction, Mach 1.799
 * to 2.15 (0011 section 3). CORRECTED holds the corrected run
 * (docs/research/base-and-total/runs/gate-corrected.out).
 *
 * The compiled curve's band widened (2026-10-27, 0014 section 10.7 (ah)):
 * from 0.82 to 1.08, which the corrected run used, to 0.77 to 1.17 (1.18
 * until round 19's blind readings of TR 1051, 1.13 until round 20's of TN
 * 2360 figs. 5 and 7; the addenda to (ah)),
 * by 0008 section 3.3's rule applied to body-alone base pressures it had
 * left out.
 * This widens a band after the hold-out was used. It moves no total and no
 * residual: only the body base's band ends, each by the change in the
 * band's end times the body base term, and with them the model-form band
 * and the tolerance. CORRECTED keeps the corrected run's values; the tests
 * below check the model against them plus that widening (`widenedBy`), and
 * every shot is still inside its tolerance.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  finTrailingEdgeBaseDrag,
  type FinTrailingEdgeBase,
} from '../../src/base/fin-trailing-edge';
import { COMPILED_CURVE_BAND } from '../../src/base/compiled-curve';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { singleWedge } from '../../src/fins/section';
import {
  finnedBodyComponents,
  finnedBodyTotalDrag,
  type FinnedBody,
  type FinnedBodyComponents,
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
 * model-form band, the residual and the components in the order of
 * COMPONENTS, unchanged by round 5; the sums of the input bands and the
 * tolerance as re-derived after round 5 (gate-round5.out), with the second
 * run's input high end and tolerance high end in `secondRun`
 * (gate-second-run.out). The low ends did not change.
 */
const RECORDED = [
  {
    shot: 'DA95021318',
    cd: 0.61232,
    low: 0.53113,
    high: 0.72612,
    inputLow: -0.04664,
    inputHigh: 0.01551,
    residual: -0.0299,
    tolerance: [-0.2417, 0.2311],
    secondRun: { inputHigh: 0.03625, toleranceHigh: 0.265 },
    components: [0.11054, 0.08038, 0.03604, 0.04394, 0.01655, 0.21768, 0.10719],
  },
  {
    shot: 'DA95021529',
    cd: 0.59554,
    low: 0.51805,
    high: 0.70528,
    inputLow: -0.04467,
    inputHigh: 0.01596,
    residual: 0.0041,
    tolerance: [-0.2381, 0.231],
    secondRun: { inputHigh: 0.03713, toleranceHigh: 0.2665 },
    components: [0.10897, 0.07911, 0.03546, 0.04422, 0.01602, 0.20846, 0.1033],
  },
  {
    shot: 'DA95021308',
    cd: 0.5944,
    low: 0.51721,
    high: 0.70387,
    inputLow: -0.0448,
    inputHigh: 0.01601,
    residual: -0.0461,
    tolerance: [-0.2382, 0.231],
    secondRun: { inputHigh: 0.0369, toleranceHigh: 0.2661 },
    components: [0.10885, 0.07916, 0.03549, 0.04424, 0.01598, 0.20768, 0.10301],
  },
  {
    shot: 'DA95021328',
    cd: 0.48458,
    low: 0.42498,
    high: 0.57198,
    inputLow: -0.03302,
    inputHigh: 0.02042,
    residual: 0.0318,
    tolerance: [-0.2132, 0.2563],
    secondRun: { inputHigh: 0.04005, toleranceHigh: 0.2968 },
    components: [0.09677, 0.06878, 0.03089, 0.04631, 0.01215, 0.15545, 0.07423],
  },
  {
    shot: 'DA95020907',
    cd: 0.48237,
    low: 0.4234,
    high: 0.56903,
    inputLow: -0.03292,
    inputHigh: 0.02057,
    residual: -0.0091,
    tolerance: [-0.2126, 0.2561],
    secondRun: { inputHigh: 0.03988, toleranceHigh: 0.2961 },
    components: [0.09647, 0.06863, 0.03083, 0.04636, 0.01206, 0.15454, 0.07347],
  },
  {
    shot: 'DA95021317',
    cd: 0.47449,
    low: 0.41738,
    high: 0.55872,
    inputLow: -0.03201,
    inputHigh: 0.0209,
    residual: -0.0031,
    tolerance: [-0.2099, 0.2553],
    secondRun: { inputHigh: 0.04026, toleranceHigh: 0.2961 },
    components: [0.09558, 0.06749, 0.03031, 0.0465, 0.01179, 0.15164, 0.07118],
  },
  {
    shot: 'DA95020927',
    cd: 0.44275,
    low: 0.3892,
    high: 0.52099,
    inputLow: -0.02881,
    inputHigh: 0.02259,
    residual: 0.0073,
    tolerance: [-0.2615, 0.2724],
    secondRun: { inputHigh: 0.04027, toleranceHigh: 0.3123 },
    components: [0.09168, 0.06321, 0.02845, 0.0471, 0.01064, 0.14078, 0.0609],
  },
  {
    shot: 'DA95020906',
    cd: 0.43323,
    low: 0.38081,
    high: 0.50965,
    inputLow: -0.02786,
    inputHigh: 0.02303,
    residual: -0.0767,
    tolerance: [-0.2608, 0.2742],
    secondRun: { inputHigh: 0.04035, toleranceHigh: 0.3142 },
    components: [0.09061, 0.06183, 0.02784, 0.04725, 0.01033, 0.13727, 0.05811],
  },
  {
    shot: 'DA95020916',
    cd: 0.43233,
    low: 0.38003,
    high: 0.50858,
    inputLow: -0.02778,
    inputHigh: 0.02308,
    residual: 0.0455,
    tolerance: [-0.2607, 0.2744],
    secondRun: { inputHigh: 0.04032, toleranceHigh: 0.3143 },
    components: [0.0905, 0.06172, 0.02779, 0.04727, 0.0103, 0.13691, 0.05784],
  },
  {
    shot: 'DA95030603',
    cd: 0.40716,
    low: 0.35796,
    high: 0.47858,
    inputLow: -0.02533,
    inputHigh: 0.02411,
    residual: -0.0544,
    tolerance: [-0.1949, 0.2465],
    secondRun: { inputHigh: 0.04036, toleranceHigh: 0.2864 },
    components: [0.08783, 0.05797, 0.02613, 0.04764, 0.00953, 0.12724, 0.05081],
  },
  {
    shot: 'DA95022205',
    cd: 0.40713,
    low: 0.35795,
    high: 0.47855,
    inputLow: -0.02534,
    inputHigh: 0.02413,
    residual: -0.0765,
    tolerance: [-0.1949, 0.2465],
    secondRun: { inputHigh: 0.04032, toleranceHigh: 0.2863 },
    components: [0.08781, 0.05801, 0.02615, 0.04764, 0.00953, 0.1272, 0.05078],
  },
];

/**
 * The corrected run (gate-corrected.out and .json): the modelled total, its band, the
 * residual, the tolerance (round 5's arithmetic) and the body base with its band. The input
 * bands and the other six components are RECORDED's.
 */
const CORRECTED = [
  {
    shot: 'DA95021318',
    cd: 0.61337,
    low: 0.52964,
    high: 0.72961,
    residual: -0.0316,
    tolerance: [-0.2455, 0.2347],
    bodyBase: [0.21873, 0.15339, 0.2622],
  },
  {
    shot: 'DA95021529',
    cd: 0.59523,
    low: 0.51642,
    high: 0.70632,
    residual: 0.0046,
    tolerance: [-0.2404, 0.2333],
    bodyBase: [0.20816, 0.14733, 0.24817],
  },
  {
    shot: 'DA95021308',
    cd: 0.59398,
    low: 0.51557,
    high: 0.70471,
    residual: -0.0454,
    tolerance: [-0.2404, 0.2333],
    bodyBase: [0.20726, 0.14683, 0.24696],
  },
  {
    shot: 'DA95021328',
    cd: 0.48114,
    low: 0.41873,
    high: 0.5717,
    residual: 0.0392,
    tolerance: [-0.2204, 0.2644],
    bodyBase: [0.15201, 0.10447, 0.18435],
  },
  {
    shot: 'DA95020907',
    cd: 0.47866,
    low: 0.41666,
    high: 0.56873,
    residual: -0.0014,
    tolerance: [-0.2204, 0.2649],
    bodyBase: [0.15083, 0.10364, 0.18294],
  },
  {
    shot: 'DA95021317',
    cd: 0.46994,
    low: 0.40944,
    high: 0.55801,
    residual: 0.0065,
    tolerance: [-0.2189, 0.2656],
    bodyBase: [0.14709, 0.10112, 0.17836],
  },
  {
    shot: 'DA95020927',
    cd: 0.43137,
    low: 0.37631,
    high: 0.51225,
    residual: 0.0339,
    tolerance: [-0.2699, 0.2846],
    bodyBase: [0.12939, 0.08627, 0.15958],
  },
  {
    shot: 'DA95020906',
    cd: 0.4215,
    low: 0.36798,
    high: 0.50018,
    residual: -0.051,
    tolerance: [-0.2686, 0.286],
    bodyBase: [0.12553, 0.0836, 0.15491],
  },
  {
    shot: 'DA95020916',
    cd: 0.42056,
    low: 0.36721,
    high: 0.49904,
    residual: 0.0747,
    tolerance: [-0.2684, 0.2861],
    bodyBase: [0.12514, 0.08334, 0.15443],
  },
  {
    shot: 'DA95030603',
    cd: 0.39509,
    low: 0.34591,
    high: 0.46771,
    residual: -0.0255,
    tolerance: [-0.2004, 0.2567],
    bodyBase: [0.11518, 0.07663, 0.14221],
  },
  {
    shot: 'DA95022205',
    cd: 0.39507,
    low: 0.3459,
    high: 0.46768,
    residual: -0.0483,
    tolerance: [-0.2004, 0.2567],
    bodyBase: [0.11514, 0.07661, 0.14215],
  },
];

/** The compiled curve's band when the corrected run was made (0010 section 1.2), before 0014 10.7 (ah). */
const BAND_AT_THE_RUN = { low: 0.82, high: 1.08 } as const;

/** What 0014 10.7 (ah) adds to the body base's band ends, in C_D, for a body base term `cd`. */
const widenedBy = (cd: number) => ({
  low: (COMPILED_CURVE_BAND.low - BAND_AT_THE_RUN.low) * cd,
  high: (COMPILED_CURVE_BAND.high - BAND_AT_THE_RUN.high) * cd,
});

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
  readonly states: FinnedBodyComponents['transitionStates'];
  /** The trailing-edge term as src/base gives it, with its laminar band beside it. */
  readonly te: FinTrailingEdgeBase;
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
      states: parts.transitionStates,
      te: finTrailingEdgeBaseDrag({
        mach: s.mach,
        count: G.finCount,
        thickness: G.finTrailingEdgeThickness,
        span: G.finSpan,
        chord: G.finChord,
        tanSweep: 0,
        inBasePlane: true,
        layer: 'turbulent',
        reynoldsPerLength: s.reynolds / G.length,
        transitionReynolds,
        referenceArea: Math.PI / 4,
      }),
    };
  });
  // Eleven totals with their inputs: beyond the default 10 s when other
  // test files compute beside it.
}, 300_000);

describe(
  'the gate: 11 shots at Mach 1.80 to 2.97, the second run and its correction',
  { timeout: 120_000 },
  () => {
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

    it('the total computes at every shot, with the seven components and three inputs', () => {
      for (const s of shots) {
        expect(s.total.components.map((c) => c.name)).toEqual(COMPONENTS);
        expect(s.total.inputs.map((i) => i.name)).toEqual([
          'transition',
          'wall temperature',
          'roughness',
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

    it('per shot as recorded: every component but the body base and every input band as the second run gave them; the body base, the totals and the residuals as the correction moved them', () => {
      shots.forEach((s, k) => {
        const r = RECORDED[k]!;
        const c = CORRECTED[k]!;
        expect(s.shot).toBe(r.shot);
        expect(c.shot).toBe(r.shot);
        // The corrected run's values, plus 0014 10.7 (ah)'s widening of the body base's band.
        const w = widenedBy(c.bodyBase[0]!);
        expect(Math.abs(s.total.cd - c.cd)).toBeLessThan(1e-5);
        expect(Math.abs(s.total.low - (c.low + w.low))).toBeLessThan(1e-5);
        expect(Math.abs(s.total.high - (c.high + w.high))).toBeLessThan(1e-5);
        expect(Math.abs(s.inputLow - r.inputLow)).toBeLessThan(1e-5);
        expect(Math.abs(s.inputHigh - r.inputHigh)).toBeLessThan(1e-5);
        expect(Math.abs(s.residual - c.residual)).toBeLessThan(1e-4);
        expect(Math.abs(s.tolerance[0] - (c.tolerance[0]! + w.low / c.cd))).toBeLessThan(1e-4);
        expect(Math.abs(s.tolerance[1] - (c.tolerance[1]! + w.high / c.cd))).toBeLessThan(1e-4);
        s.total.components.forEach((x, j) => {
          if (x.name === 'body base') {
            const corrected = [c.bodyBase[0]!, c.bodyBase[1]! + w.low, c.bodyBase[2]! + w.high];
            expect(
              [x.cd, x.low, x.high]
                .map((v, i) => Math.abs(v - corrected[i]!))
                .every((d) => d < 1e-5),
            ).toBe(true);
          } else {
            expect(Math.abs(x.cd - r.components[j]!)).toBeLessThan(1e-5);
          }
        });
      });
    });

    it('the residuals: second run -3.0, +0.4, -4.6, +3.2, -0.9, -0.3, +0.7, -7.7, +4.5, -5.4, -7.6 %; corrected -3.2, +0.5, -4.5, +3.9, -0.1, +0.7, +3.4, -5.1, +7.5, -2.6, -4.8 %', () => {
      // The second run's, as recorded to four decimals (its percentages, published from the
      // full-precision values, round 0.04548 to +4.5 and -0.07646 to -7.6).
      expect(RECORDED.map((r) => r.residual)).toEqual([
        -0.0299, 0.0041, -0.0461, 0.0318, -0.0091, -0.0031, 0.0073, -0.0767, 0.0455, -0.0544,
        -0.0765,
      ]);
      const recordedMean = RECORDED.reduce((a, r) => a + r.residual, 0) / RECORDED.length;
      expect(Math.round(1000 * recordedMean) / 10).toBe(-1.9);
      expect(shots.map((s) => Math.round(1000 * s.residual) / 10)).toEqual([
        -3.2, 0.5, -4.5, 3.9, -0.1, 0.7, 3.4, -5.1, 7.5, -2.6, -4.8,
      ]);
      const mean = shots.reduce((a, s) => a + s.residual, 0) / shots.length;
      expect(Math.round(1000 * mean) / 10).toBe(-0.4);
      // The correction moves the model toward the shots at high Mach number: above M 2.56
      // (the bounded factor) the modelled total falls by 2.6% to 3.0%.
      shots.forEach((s, k) => {
        const fall = 1 - s.total.cd / RECORDED[k]!.cd;
        if (s.mach > 2.56) {
          expect(fall).toBeGreaterThan(0.0255);
          expect(fall).toBeLessThan(0.03);
        } else expect(Math.abs(fall)).toBeLessThan(0.01);
      });
    });

    it('the tolerances after the correction: -20.0% to -27.0% and +23.3% to +28.6% (+19.6% to +23.2% without the wall), and -21.5% to -28.5% and +26.5% to +31.3% (+22.2% to +25.9%) with the band widened after it (0014 10.7 (ah) and its addenda); after round 5, -19.5% to -26.2% and +23.1% to +27.4%', () => {
      const lo = shots.map((s) => s.tolerance[0]);
      const hi = shots.map((s) => s.tolerance[1]);
      const noWall = shots.map((s) => s.highWithoutWall);
      const r = (v: number[]) =>
        [Math.min(...v), Math.max(...v)].map((x) => Math.round(1000 * x) / 10);
      expect(r(lo)).toEqual([-28.5, -21.5]);
      expect(r(hi)).toEqual([26.5, 31.3]);
      expect(r(noWall)).toEqual([22.2, 25.9]);
      // The corrected run's own, as CORRECTED records them, before (ah).
      expect(r(CORRECTED.map((c) => c.tolerance[0]!))).toEqual([-27.0, -20.0]);
      expect(r(CORRECTED.map((c) => c.tolerance[1]!))).toEqual([23.3, 28.6]);
      // After round 5, as recorded to four decimals: -26.15% (published -26.2%) to -19.49%, +23.10% to +27.44%.
      const ends = (v: number[]) => [Math.min(...v), Math.max(...v)];
      expect(ends(RECORDED.map((x) => x.tolerance[0]!))).toEqual([-0.2615, -0.1949]);
      expect(ends(RECORDED.map((x) => x.tolerance[1]!))).toEqual([0.231, 0.2744]);
    });

    it("the second run's arithmetic reproduced: the trailing edges' laminar band added on its own gave +26.5% to +31.4%; that term is all that moved", () => {
      shots.forEach((s, k) => {
        const r = RECORDED[k]!;
        const transition = s.total.inputs.find((i) => i.name === 'transition')!;
        // The second run: friction alone (high end 0) plus the laminar band's high end, unclamped.
        const added = Math.max(0, (s.te.laminar!.high - 1) * s.te.cd);
        expect(transition.high).toBe(0);
        expect(Math.abs(s.inputHigh + added - r.secondRun.inputHigh)).toBeLessThan(1e-5);
        // On the second run's total (the correction moved the body base only).
        expect(Math.abs(r.tolerance[1]! + added / r.cd - r.secondRun.toleranceHigh)).toBeLessThan(
          2e-4,
        );
        // 3.4 to 4.1 points of the modelled total, as the audit computed.
        expect(added / r.cd).toBeGreaterThan(0.0338);
        expect(added / r.cd).toBeLessThan(0.0409);
      });
      const old = RECORDED.map((r) => r.secondRun.toleranceHigh);
      expect([Math.min(...old), Math.max(...old)].map((x) => Math.round(1000 * x) / 10)).toEqual([
        26.5, 31.4,
      ]);
    });

    it('every shot lies inside its tolerance, corrected as at the second run (a recorded correction, not a validation)', () => {
      const failed = shots.filter(
        (s) => !(s.residual >= s.tolerance[0] && s.residual <= s.tolerance[1]),
      );
      expect(failed.map((s) => s.shot)).toEqual([]);
      const recordedFailed = RECORDED.filter(
        (r) => !(r.residual >= r.tolerance[0]! && r.residual <= r.tolerance[1]!),
      );
      expect(recordedFailed).toEqual([]);
    });

    it('every residual lies inside the model-form band alone (-13.9% to -15.4%, +21.0% to +22.2% with the band widened by 0014 10.7 (ah) and its addenda; corrected -12.4% to -13.7%, +18.4% to +19.0%; second run -12.0% to -13.3%, +17.5% to +18.6%)', () => {
      for (const s of shots) {
        const lo = s.total.low / s.total.cd - 1;
        const hi = s.total.high / s.total.cd - 1;
        expect(lo).toBeGreaterThan(-0.1545);
        expect(lo).toBeLessThan(-0.1385);
        expect(hi).toBeGreaterThan(0.2095);
        expect(hi).toBeLessThan(0.2225);
        expect(s.residual).toBeGreaterThan(lo);
        expect(s.residual).toBeLessThan(hi);
      }
    });

    it('per cluster: mean, min, max and standard deviation of the residuals, corrected and as the second run gave them', () => {
      const stats = (v: { mach: number; residual: number }[]) =>
        BASIC_FINNER_CLUSTERS.map(([a, b]) => {
          const x = v.filter((s) => s.mach >= a && s.mach <= b).map((s) => s.residual);
          const mean = x.reduce((p, q) => p + q, 0) / x.length;
          const sd = Math.sqrt(x.reduce((p, q) => p + (q - mean) ** 2, 0) / (x.length - 1));
          return [
            x.length,
            ...[mean, Math.min(...x), Math.max(...x), sd].map((y) => Math.round(1000 * y) / 10),
          ];
        });
      expect(stats(shots)).toEqual([
        [3, -2.4, -4.5, 0.5, 2.6],
        [3, 1.5, -0.1, 3.9, 2.2],
        [3, 1.9, -5.1, 7.5, 6.4],
        [2, -3.7, -4.8, -2.6, 1.6],
      ]);
      // The second run's cluster means, from its residuals as recorded: -2.4, +0.7, -0.8, -6.5.
      expect(
        stats(RECORDED.map((r, k) => ({ mach: gated[k]!.mach, residual: r.residual }))).map(
          (c) => c[1],
        ),
      ).toEqual([-2.4, 0.7, -0.8, -6.5]);
    });

    it("the components' shares of the modelled total", () => {
      const share = (k: number, name: string) =>
        shots[k]!.total.components.find((c) => c.name === name)!.cd / shots[k]!.total.cd;
      // Body base 29% to 36%, fin trailing-edge base 12% to 18%, nose 18% to 23%, leading edges
      // 7% to 12.1% (second run: 31% to 36%, 12% to 18%, 18% to 22%, 7% to 12%).
      for (let k = 0; k < shots.length; k++) {
        expect(share(k, 'body base')).toBeGreaterThan(0.29);
        expect(share(k, 'body base')).toBeLessThan(0.36);
        expect(share(k, 'fin trailing-edge base')).toBeGreaterThan(0.12);
        expect(share(k, 'fin trailing-edge base')).toBeLessThan(0.18);
        expect(share(k, 'nose wave drag')).toBeGreaterThan(0.18);
        expect(share(k, 'nose wave drag')).toBeLessThan(0.23);
        expect(share(k, 'fin leading edges')).toBeGreaterThan(0.07);
        expect(share(k, 'fin leading edges')).toBeLessThan(0.121);
      }
    });

    it('labels: the leading edges extrapolated in Reynolds number at M 1.80 to 2.41, covered by RM A55H31 at 2.66 to 2.97; the trailing edges an analogy; the body base an analogy to M 2.41 and bounded, not measured, at 2.66 to 2.97', () => {
      for (const s of shots) {
        const le = s.total.components.find((c) => c.name === 'fin leading edges')!.label;
        const te = s.total.components.find((c) => c.name === 'fin trailing-edge base')!.label;
        const base = s.total.components.find((c) => c.name === 'body base')!.label;
        expect(le).toContain('an analogy, not a measurement');
        expect(le).toContain(s.mach < 2.48 ? 'extrapolated in Reynolds number' : 'RM A55H31');
        expect(te.startsWith('an analogy, not a measurement')).toBe(true);
        expect(base).toContain(
          s.mach < 2.56
            ? 'an analogy, not a measurement: the fins-on-base factor'
            : 'bounded, not measured: the fins-on-base factor',
        );
        if (s.mach > 2.56)
          expect(base).toMatch(/the gap between the bounds is 0\.0[34]\d\d in C_D/);
      }
    });

    it('the two fin-edge terms carry 24.6% to 25.1% of the total (24% to 25% at the second run); within a cluster the model changes by at most 3.3%', () => {
      const edges = shots.map(
        (s) =>
          s.total.components
            .filter((c) => c.name === 'fin leading edges' || c.name === 'fin trailing-edge base')
            .reduce((a, c) => a + c.cd, 0) / s.total.cd,
      );
      expect(Math.min(...edges)).toBeGreaterThan(0.246);
      expect(Math.max(...edges)).toBeLessThan(0.251);
      const changes = BASIC_FINNER_CLUSTERS.map(([a, b]) => {
        const v = shots.filter((s) => s.mach >= a && s.mach <= b).map((s) => s.total.cd);
        return Math.max(...v) / Math.min(...v) - 1;
      });
      expect(Math.round(1000 * Math.max(...changes)) / 10).toBe(3.3);
    });

    it('the input bands: transition -0.0253 to -0.0466 and 0, as states; wall +0.0155 to +0.0241', () => {
      const input = (s: Shot, n: string) => s.total.inputs.find((i) => i.name === n)!;
      const r4 = (v: number[]) =>
        [Math.min(...v), Math.max(...v)].map((x) => Math.round(1e4 * x) / 1e4);
      expect(r4(shots.map((s) => input(s, 'transition').low))).toEqual([-0.0466, -0.0253]);
      expect(shots.every((s) => input(s, 'transition').high === 0)).toBe(true);
      expect(r4(shots.map((s) => input(s, 'wall temperature').high))).toEqual([0.0155, 0.0241]);
      for (const s of shots) {
        // Two states per Re_T (the body with the run, or turbulent); every state lies below
        // the turbulent nominal, so the high end is the nominal: the laminar fins' friction
        // falls by more than their laminar base can rise.
        expect(s.states.length).toBe(6);
        expect(Math.max(...s.states.map((x) => x.high))).toBeLessThan(0);
        // The low end: the run to 3e6 on the body and the fins, the trailing edges laminar.
        const lowest = s.states.find((x) => x.low === input(s, 'transition').low)!;
        expect([lowest.reynolds, lowest.bodyTurbulent, lowest.laminarTrailingEdge]).toEqual([
          3e6,
          false,
          true,
        ]);
        // Re_T 3e6 leaves the fins laminar at every shot (Re_c 1.19e6 to 1.98e6), 1.6e6 at
        // the six shots up to M 2.364 (Re_c up to 1.56e6), 5e5 at none.
        const laminarAt = (reT: number) =>
          s.states.find((x) => x.reynolds === reT)!.laminarTrailingEdge;
        expect([laminarAt(5e5), laminarAt(1.6e6), laminarAt(3e6)]).toEqual([
          false,
          s.mach <= 2.364,
          true,
        ]);
      }
    });

    it("the trailing edges' laminar band beside the term: -0.0165/+0.0207 at M 1.80 to -0.0066/+0.0152 at M 2.97 (the high end at the vacuum bound there), extrapolated above M 2.3", () => {
      const r4 = (v: number[]) =>
        [Math.min(...v), Math.max(...v)].map((x) => Math.round(1e4 * x) / 1e4);
      const te = shots.map((s) => s.te.laminarInput);
      expect(r4(te.map((i) => i.low))).toEqual([-0.0165, -0.0066]);
      expect(r4(te.map((i) => i.high))).toEqual([0.0152, 0.0212]);
      expect([te[0]!.low, te[0]!.high].map((x) => Math.round(1e4 * x) / 1e4)).toEqual([
        -0.0165, 0.0207,
      ]);
      expect([te[9]!.low, te[9]!.high].map((x) => Math.round(1e4 * x) / 1e4)).toEqual([
        -0.0066, 0.0152,
      ]);
      expect(shots.filter((s) => s.te.laminar!.extrapolated).map((s) => s.mach)).toEqual(
        shots.filter((s) => s.mach > 2.3).map((s) => s.mach),
      );
      expect(shots.filter((s) => s.mach > 2.3).length).toBe(8);
      expect(
        shots
          .filter((s) => s.total.inputs[0]!.label.includes('clamped at the vacuum bound'))
          .map((s) => s.mach),
      ).toEqual([2.969, 2.97]);
    });

    it("the vacuum bound: no base term or band end exceeds it; at the tolerance's high end the trailing edges sit at 0.72 to 0.93 of it", () => {
      for (const s of shots) {
        const base = s.total.components.find((c) => c.name === 'body base')!;
        const vacuumBase = 2 / (gamma * s.mach * s.mach);
        expect(base.high).toBeLessThan(vacuumBase);
        const te = s.total.components.find((c) => c.name === 'fin trailing-edge base')!;
        expect([te.cd, te.low, te.high]).toEqual([s.te.cd, s.te.low, s.te.high]);
        expect(te.high).toBeLessThan(s.te.vacuum);
        expect(s.te.laminarTerm!.high).toBeLessThanOrEqual(s.te.vacuum);
      }
      // The transition input's high end is the turbulent nominal, so the trailing edges'
      // value at the tolerance's high end is their model-form high end.
      const r = shots.map(
        (s) =>
          s.total.components.find((c) => c.name === 'fin trailing-edge base')!.high / s.te.vacuum,
      );
      expect([Math.min(...r), Math.max(...r)].map((x) => Math.round(1000 * x) / 1000)).toEqual([
        0.721, 0.931,
      ]);
    });

    it('the five shots at Mach 1.06 to 1.33 are refused (reported, not gated); the leading edges from M_n 1.0 (0016 section 11)', () => {
      for (const s of BASIC_FINNER_SHOTS.filter((x) => x.use === 'reported')) {
        const r = finnedBodyComponents(
          asTranscribed,
          conditionsOf(s),
          exactConeNoseWaveDrag(s.mach, half),
          inputs,
        );
        const reasons = r.refusals.map((x) => x.reason);
        // The edge's Reynolds number on its diameter is below 6.7e3 to M 1.25; at 1.33 it is served.
        const le = r.refusals.find((x) => x.component === 'fin leading edges');
        if (s.mach < 1.3) expect(le?.message).toMatch(/^Reynolds number .* is below 6700/);
        else expect(le).toBeUndefined();
        expect(reasons).toContain('mach-range');
        // Below M 1.5 fin friction and the wedges' wave drag are refused first: the fins' own-drag
        // band is measured only at M 1.5 to 2.96 (0014 section 10.7 (f)).
        expect(
          r.refusals.filter((x) => x.reason === 'fins-own-drag-mach').map((x) => x.component),
        ).toEqual(['fin friction', 'fin wave drag']);
      }
    });
  },
);
