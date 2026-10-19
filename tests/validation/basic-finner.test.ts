/**
 * Step B5 of docs/design/0008-total-drag.md: the Basic Finner gate (DREV
 * TM 9703, free flight; src/validation/basic-finner.ts), the 11 shots at
 * Mach 1.80 to 2.97 that took part in no band. Nothing here is tuned on
 * them (0008 section 6.1). Result and interpretation:
 * docs/design/0010-base-drag-and-total.md, section 4.
 *
 * The configuration as transcribed: a 10 deg half-angle cone (nose 2.836
 * cal, fig. 2's "2.84"), a cylinder to 10.0 cal, four rectangular fins of
 * 1 cal chord and span at the base, single wedges from a leading edge of
 * radius 0.004 cal to a blunt trailing edge 0.08 cal thick across the span
 * (the reading of "conical in shape" that fig. 2's side view suggests).
 * Conditions: Mach number and Reynolds number per shot (Table V, on the
 * 0.300 m length); the static temperature from the range's speed of sound,
 * 343.7 m/s (Table V: 343.4 to 344.0, which changes no value below at the
 * fourth decimal); the nose drag exact (Taylor-Maccoll) with the fitted
 * solver's floor as its band.
 *
 * Verdict: the total is refused, so the gate fails and the configuration is
 * refused. Two components have no method with a measured band: the base of
 * the blunt fin trailing edges (Love's two-dimensional base pressures, not
 * transcribed) and the fin leading-edge radius (0008 B4 refuses blunt
 * leading edges). The rest is reported as a diagnostic, never as a total:
 * the partial sum of every component that has a band, with the shots'
 * residuals against it, and the scales of what is missing.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { singleWedge } from '../../src/fins/section';
import {
  finnedBodyComponents,
  finnedBodyTotalDrag,
  type FinnedBody,
  type FinnedBodyComponents,
} from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import { combineComponents, TotalDragRefusal, type TotalDrag } from '../../src/total/total-drag';
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
const gated = BASIC_FINNER_SHOTS.filter((s) => s.use === 'gate');
const conditionsOf = (s: (typeof gated)[number]) => ({
  mach: s.mach,
  temperature,
  reynoldsPerLength: s.reynolds / G.length,
});

/**
 * The partial sum per shot, as recorded in 0010 (adiabatic wall): its
 * value and model-form band, the transition band (Re_T 5e5 to 3e6), the
 * wall-temperature band (adiabatic to the range air), and the residual
 * CX0 / partial - 1.
 */
const RECORDED = [
  {
    shot: 'DA95021318',
    cd: 0.46508,
    low: 0.3932,
    high: 0.55472,
    transition: -0.0301,
    wall: 0.01551,
    residual: 0.2772,
  },
  {
    shot: 'DA95021529',
    cd: 0.45179,
    low: 0.38334,
    high: 0.53808,
    transition: -0.02916,
    wall: 0.01596,
    residual: 0.3236,
  },
  {
    shot: 'DA95021308',
    cd: 0.45091,
    low: 0.38274,
    high: 0.53698,
    transition: -0.02924,
    wall: 0.01601,
    residual: 0.2575,
  },
  {
    shot: 'DA95021328',
    cd: 0.36691,
    low: 0.31438,
    high: 0.43625,
    transition: -0.02347,
    wall: 0.02042,
    residual: 0.3627,
  },
  {
    shot: 'DA95020907',
    cd: 0.36539,
    low: 0.31344,
    high: 0.43413,
    transition: -0.02342,
    wall: 0.02057,
    residual: 0.3082,
  },
  {
    shot: 'DA95021317',
    cd: 0.3596,
    low: 0.30936,
    high: 0.42634,
    transition: -0.02285,
    wall: 0.0209,
    residual: 0.3153,
  },
  {
    shot: 'DA95020927',
    cd: 0.33728,
    low: 0.28849,
    high: 0.40139,
    transition: -0.02094,
    wall: 0.02259,
    residual: 0.3223,
  },
  {
    shot: 'DA95020906',
    cd: 0.33032,
    low: 0.28246,
    high: 0.39315,
    transition: -0.02034,
    wall: 0.02303,
    residual: 0.211,
  },
  {
    shot: 'DA95020916',
    cd: 0.32967,
    low: 0.28192,
    high: 0.39238,
    transition: -0.0203,
    wall: 0.02308,
    residual: 0.3711,
  },
  {
    shot: 'DA95030603',
    cd: 0.31097,
    low: 0.26583,
    high: 0.3702,
    transition: -0.01874,
    wall: 0.02411,
    residual: 0.2381,
  },
  {
    shot: 'DA95022205',
    cd: 0.31097,
    low: 0.26584,
    high: 0.3702,
    transition: -0.01875,
    wall: 0.02413,
    residual: 0.2091,
  },
];

interface Shot {
  readonly shot: string;
  readonly mach: number;
  readonly cx0: number;
  readonly parts: FinnedBodyComponents;
  readonly partial: TotalDrag;
  readonly residual: number;
  /** The tolerance on the residual: model-form band, transition, the cluster's spread. */
  readonly tolerance: readonly [number, number];
  /** The same with the wall-temperature band added. */
  readonly toleranceWithWall: readonly [number, number];
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
      { transitionReynolds, wallTemperature: temperature },
    );
    const partial = combineComponents(parts.components, parts.inputs);
    const input = (n: string) => partial.inputs.find((i) => i.name === n)!;
    const spread = clusterSpread[clusterOf(s.mach)]!;
    const lo = (partial.low + input('transition').low) / partial.cd - 1 + spread.lo;
    const hi = partial.high / partial.cd - 1 + spread.hi;
    return {
      shot: s.shot,
      mach: s.mach,
      cx0: s.cx0,
      parts,
      partial,
      residual: s.cx0 / partial.cd - 1,
      tolerance: [lo, hi],
      toleranceWithWall: [lo, hi + input('wall temperature').high / partial.cd],
    };
  });
});

describe('the gate: 11 shots at Mach 1.80 to 2.97', { timeout: 120_000 }, () => {
  it('has the 11 shots in four clusters', () => {
    expect(gated.length).toBe(11);
    expect(gated.every((s) => clusterOf(s.mach) >= 0)).toBe(true);
  });

  it('the total is refused at every shot: blunt fin leading and trailing edges', () => {
    for (const s of gated) {
      let caught: unknown;
      try {
        finnedBodyTotalDrag(asTranscribed, conditionsOf(s), exactConeNoseWaveDrag(s.mach, half), {
          transitionReynolds,
        });
      } catch (e) {
        caught = e;
      }
      expect(caught, `M ${s.mach}`).toBeInstanceOf(TotalDragRefusal);
      expect((caught as TotalDragRefusal).refusals.map((r) => r.reason)).toEqual([
        'blunt-leading-edge',
        'fin-trailing-edge-base',
      ]);
    }
  });

  it('with the leading edges taken as sharp, as 0008 describes them, still refused', () => {
    const sharpEdged = { ...asTranscribed, fins: { ...asTranscribed.fins, leadingEdgeRadius: 0 } };
    for (const s of gated) {
      expect(() =>
        finnedBodyTotalDrag(sharpEdged, conditionsOf(s), exactConeNoseWaveDrag(s.mach, half)),
      ).toThrow(TotalDragRefusal);
    }
  });

  it('the five shots at Mach 1.06 to 1.33 are refused too (reported, not gated)', () => {
    for (const s of BASIC_FINNER_SHOTS.filter((x) => x.use === 'reported')) {
      const r = finnedBodyComponents(
        asTranscribed,
        conditionsOf(s),
        exactConeNoseWaveDrag(s.mach, half),
      );
      const reasons = r.refusals.map((x) => x.reason);
      expect(reasons).toContain('mach-range');
      expect(reasons).toContain('fin-trailing-edge-base');
      if (s.mach < 1.2) expect(reasons).toContain('detached-shock');
    }
  });
});

describe(
  'diagnostic: the partial sum, every component with a band (not a total)',
  { timeout: 120_000 },
  () => {
    it('per shot as recorded in 0010', () => {
      shots.forEach((s, k) => {
        const r = RECORDED[k]!;
        expect(s.shot).toBe(r.shot);
        const input = (n: string) => s.partial.inputs.find((i) => i.name === n)!;
        expect(Math.abs(s.partial.cd - r.cd)).toBeLessThan(1e-5);
        expect(Math.abs(s.partial.low - r.low)).toBeLessThan(1e-5);
        expect(Math.abs(s.partial.high - r.high)).toBeLessThan(1e-5);
        expect(Math.abs(input('transition').low - r.transition)).toBeLessThan(1e-5);
        expect(Math.abs(input('wall temperature').high - r.wall)).toBeLessThan(1e-5);
        expect(Math.abs(s.residual - r.residual)).toBeLessThan(1e-4);
      });
    });

    it('the data lie 20.9% to 37.1% above the partial sum at every shot', () => {
      const r = shots.map((s) => s.residual);
      expect(Math.min(...r)).toBeCloseTo(0.2091, 3);
      expect(Math.max(...r)).toBeCloseTo(0.3711, 3);
    });

    it('per cluster: mean and spread of the residuals', () => {
      const stats = BASIC_FINNER_CLUSTERS.map(([a, b]) => {
        const v = shots.filter((s) => s.mach >= a && s.mach <= b).map((s) => s.residual);
        const mean = v.reduce((p, q) => p + q, 0) / v.length;
        return [mean, Math.min(...v), Math.max(...v)].map((x) => Math.round(1000 * x) / 10);
      });
      expect(stats).toEqual([
        [28.6, 25.7, 32.4],
        [32.9, 30.8, 36.3],
        [30.1, 21.1, 37.1],
        [22.4, 20.9, 23.8],
      ]);
    });

    it('no shot lies below the partial tolerance: nothing computed already exceeds the data', () => {
      for (const s of shots) expect(s.residual).toBeGreaterThan(s.tolerance[0]);
    });

    it('above its tolerance at 10 shots of 11, at 8 with the wall-temperature band', () => {
      // The missing terms are positive (base drag of a blunt edge, the drag of a rounded
      // leading edge), so the full model lies above the partial sum: no verdict follows.
      const above = shots.filter((s) => s.residual > s.tolerance[1]).map((s) => s.mach);
      const aboveWall = shots.filter((s) => s.residual > s.toleranceWithWall[1]).map((s) => s.mach);
      expect(above).toEqual([1.799, 1.846, 1.85, 2.348, 2.364, 2.414, 2.663, 2.749, 2.969, 2.97]);
      expect(aboveWall).toEqual([1.799, 1.846, 1.85, 2.348, 2.364, 2.414, 2.663, 2.749]);
    });

    it('the gap the missing terms would have to fill lies within their physical scales', () => {
      // Trailing edges: at most the vacuum limit -P_B = 2 / (gamma M^2) on 4 x 0.08 x 1 cal^2
      // (on 4 x 0.04 x 1 if the thickness tapers to the tip). Leading edges: pitot pressure on
      // the frontal height 4 x 0.008 x 1 cal^2, the scale (not a bound) of a rounded edge.
      for (const s of shots) {
        const m = s.mach;
        const gap = s.cx0 - s.partial.cd;
        const vacuum =
          (4 * G.finTrailingEdgeThickness * G.finSpan * (2 / (gamma * m * m))) / (Math.PI / 4);
        const shockP = 1 + ((2 * gamma) / (gamma + 1)) * (m * m - 1);
        const m2 = Math.sqrt(((gamma - 1) * m * m + 2) / (2 * gamma * m * m - (gamma - 1)));
        const pitot = (shockP * (1 + 0.2 * m2 * m2) ** 3.5 - 1) / (0.7 * m * m);
        const leadingEdges = (4 * 2 * G.finLeadingEdgeRadius * G.finSpan * pitot) / (Math.PI / 4);
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThan(vacuum + leadingEdges);
      }
    });
  },
);
