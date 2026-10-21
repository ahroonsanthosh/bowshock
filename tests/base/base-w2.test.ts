/**
 * The body base below Mach 1.5 (src/base/base-w2.ts; docs/design/0015-fins-at-the-base.md section 11, W2 of
 * 0014): the readings held to their records, the two readings of RM L52E06 fig. 8 against each other, the band
 * and its nominal by hand, the term and its routing through bodyBaseDrag, fins at the base there through the
 * rebuilt factor, and the refusals.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bodyBaseDrag, FINS_ON_BASE_ROUTING_LABEL } from '../../src/base/base-drag';
import {
  L52E06_FIG8_A,
  TN3819_FIG18_FREE_FLIGHT_OVER_CURVE,
  TN3819_FIG18_FREE_FLIGHT_ROUND7,
  W2_BAND,
  W2_CURVATURE_BOUND,
  W2_LABEL,
  W2_MACH_RANGE,
  w2FreeFlightRatios,
} from '../../src/base/base-w2';
import {
  COMPILED_CURVE_BAND,
  COMPILED_CURVE_CURVATURE_BOUND,
  compiledCurveValue,
  interpolationErrorBound,
} from '../../src/base/compiled-curve';
import { finsOnBaseFactorW1 } from '../../src/base/fins-on-base-w1';
import { BaseRefusal } from '../../src/base/refusal';
import { TN3819_FIG18_ROUND7 } from '../../src/base/tn3819-fig18';
import { doubleWedge } from '../../src/fins/section';

const D = 'docs/research/total-drag/data/';
const curve = (m: number) => Math.abs(compiledCurveValue(m, 'lessNegative'));

describe('the readings', () => {
  it("RM L52E06 fig. 8, A: the first held to its output (the adopted run at each M), round 6's to its csv", () => {
    const out = readFileSync(D + 'w2_l52e06_fig8_output.txt', 'utf8').split('\n');
    const first = L52E06_FIG8_A.find((r) => r.reading === 'w2 first')!.points;
    for (const p of first) {
      const line = out.find((l) => l.trim().startsWith(`A at M ${p.mach.toFixed(3)}:`))!;
      expect(Number(line.split(':')[1]!.trim())).toBe(p.cdb);
    }
    expect(out.filter((l) => l.trim().startsWith('A at M')).length).toBe(first.length);
    const csv = readFileSync(D + 'fins_at_base_w1_second.csv', 'utf8')
      .split('\n')
      .filter((l) => l.startsWith('RM L52E06,8,'))
      .map((l) => l.split(','));
    const second = L52E06_FIG8_A.find((r) => r.reading === 'round 6')!.points;
    for (const p of second) {
      const x = csv.find((y) => Number(y[3]) === p.mach)!;
      expect([Number(x[5]), Number(x[7])]).toEqual([p.cdb, p.error]);
    }
  });

  it('the two readings of fig. 8 agree within their combined errors', () => {
    const first = L52E06_FIG8_A.find((r) => r.reading === 'w2 first')!.points;
    const second = L52E06_FIG8_A.find((r) => r.reading === 'round 6')!.points;
    let compared = 0;
    for (const p of second) {
      const q = first.find((x) => x.mach === p.mach);
      if (q === undefined) continue;
      compared++;
      expect(Math.abs(p.cdb - q.cdb)).toBeLessThanOrEqual(p.error + q.error);
    }
    expect(compared).toBe(8);
  });

  it("TN 3819 fig. 18's free-flight curve over the curves, held to 0008's reading", () => {
    const out = readFileSync(D + 'love18_ff_output.txt', 'utf8');
    for (const p of TN3819_FIG18_FREE_FLIGHT_OVER_CURVE) {
      expect(out).toContain(
        `free flight / curves at M ${p.mach.toFixed(3)}: ${p.low.toFixed(3)} to ${p.high.toFixed(3)}`,
      );
    }
  });

  it("fig. 18's free-flight curve: round 7 held to its file, and paired with 0008's within their errors", () => {
    const file = readFileSync(D + 'round7/tn3819_fig18.csv', 'utf8')
      .split('\n')
      .filter((l) => l.startsWith('"free-flight curve'))
      .map((l) => l.split('",')[1]!.split(','));
    for (const p of TN3819_FIG18_FREE_FLIGHT_ROUND7) {
      const x = file.find(
        (f) => (f[0] === 'at M' || f[0] === 'extremum') && Number(f[1]) === p.mach,
      )!;
      expect([Number(x[3]), Number(x[4])]).toEqual([p.pB, p.error]);
    }
    // 0008's values (scripts/love18_ff.py), +-0.001 taken, against round 7 interpolated between its points.
    const r7 = [...TN3819_FIG18_FREE_FLIGHT_ROUND7].sort((a, b) => a.mach - b.mach);
    for (const [m, p] of [
      [1.057, -0.207],
      [1.149, -0.1928],
      [1.159, -0.1934],
      [1.214, -0.1976],
    ] as const) {
      const k = r7.findIndex((q) => q.mach > m);
      const [a, b] = [r7[k - 1]!, r7[k]!];
      const v = a.pB + ((m - a.mach) / (b.mach - a.mach)) * (b.pB - a.pB);
      expect(Math.abs(p - v)).toBeLessThanOrEqual(0.001 + Math.max(a.error, b.error));
      expect(Math.abs(p - v)).toBeLessThan(0.0006);
    }
  });
});

describe('the curve below Mach 1.5: read twice, and its interpolation bound', () => {
  it("the bound from M 1.5 does not hold below; round 7's rows every 0.1 set it there", () => {
    const at = (m: number) => TN3819_FIG18_ROUND7.find((r) => r.mach === m)!.lessNegative;
    // Round 7's row against the chord of its neighbours, and what the bound from M 1.5 allows mid-interval.
    const off11 = Math.abs(at(1.1) - 0.5 * (at(1.0) + at(1.2)));
    const off13 = Math.abs(at(1.3) - 0.5 * (at(1.2) + at(1.4)));
    expect(off11).toBeCloseTo(0.0006, 6);
    expect(off13).toBeCloseTo(0.00055, 6);
    expect(0.5 * 0.1 * 0.1 * COMPILED_CURVE_CURVATURE_BOUND).toBeLessThan(off13);
    // The basic curve's bend at M 1.2: 2 (0.026 - 0.012) / 0.2.
    expect(W2_CURVATURE_BOUND).toBeCloseTo(0.14, 6);
    expect(0.5 * 0.1 * 0.1 * W2_CURVATURE_BOUND).toBeGreaterThan(off11);
    const r = bodyBaseDrag({
      afterbody: 'cylinder',
      boundaryLayerAtBase: 'turbulent',
      baseAreaRatio: 1,
      mach: 1.3,
    });
    expect(r.curve.interpolationError).toBeCloseTo(
      (interpolationErrorBound(1.3) * W2_CURVATURE_BOUND) / COMPILED_CURVE_CURVATURE_BOUND,
      14,
    );
    expect(r.curve.bracketReadTwice).toBe(true);
    expect(W2_LABEL).toContain(
      "the curve's rows below 1.5 and fig. 18's free-flight curve read twice",
    );
  });
});

describe('the band and the nominal', () => {
  it('low end 0.82 carried down; high end the largest free-flight datum plus its error, rounded outward', () => {
    expect(W2_BAND.low).toBe(COMPILED_CURVE_BAND.low);
    // The first reading at M 1.055, 0.2389 +-0.0012, where the curve runs along the 0.24 gridline.
    const largest = (0.2389 + 0.0012) / curve(1.055);
    expect(Math.max(...w2FreeFlightRatios().map((r) => r.ratio))).toBeCloseTo(largest, 12);
    expect(largest).toBeCloseTo(1.3011, 4);
    expect(W2_BAND.high).toBe(1.31);
    expect(W2_BAND.nominal).toBeCloseTo(1.065, 12);
    // Every free-flight datum below M 1.5 lies above the curve and inside the band.
    for (const r of w2FreeFlightRatios()) {
      expect(r.ratio).toBeGreaterThan(1);
      expect(r.ratio).toBeLessThanOrEqual(W2_BAND.high);
    }
  });
});

describe('the term (bodyBaseDrag)', () => {
  const base = {
    afterbody: 'cylinder' as const,
    boundaryLayerAtBase: 'turbulent' as const,
    baseAreaRatio: 1,
  };

  it('at M 1.2: the curve times the midpoint, the band from 0.82 to 1.31 of the curve, plus interpolation', () => {
    const r = bodyBaseDrag({ ...base, mach: 1.2 });
    const q = curve(1.2);
    expect(r.cd).toBeCloseTo(q * 1.065, 12);
    expect(r.low).toBeCloseTo(q * 0.82 - r.curve.interpolationError * 1.065, 12);
    expect(r.high).toBeCloseTo(q * 1.31 + r.curve.interpolationError * 1.065, 12);
    expect(r.curveBand).toMatchObject({ low: 0.82, high: 1.31, source: 'w2' });
    expect(r.labels[0]).toBe(W2_LABEL);
    expect(r.curve.bracketReadTwice).toBe(true);
  });

  it('the band steps at M 1.5, and so does the nominal (a method choice, 0015 section 11)', () => {
    const below = bodyBaseDrag({ ...base, mach: 1.4999 });
    const at = bodyBaseDrag({ ...base, mach: 1.5 });
    expect(below.cd / at.cd).toBeCloseTo(1.065, 3);
    expect(at.curveBand).toMatchObject({ low: 0.82, high: 1.08, nominal: 1, source: 'compiled' });
  });

  it('refused below Mach 1.0', () => {
    expect(W2_MACH_RANGE).toEqual([1.0, 1.5]);
    expect(() => bodyBaseDrag({ ...base, mach: 0.99 })).toThrow(BaseRefusal);
  });

  it('fins at the base below Mach 1.5: the rebuilt factor, since the present one refuses', () => {
    const fins = {
      count: 4,
      thicknessRatio: 0.024,
      section: 'other' as const,
      trailingEdgeAheadOfBase: 0,
      nearBase: {
        section: doubleWedge(0.024, 0.5),
        sectionFamily: 'other' as const,
        tanLeadingEdgeSweep: 0,
        tanTrailingEdgeSweep: 0,
      },
    };
    const r = bodyBaseDrag({ ...base, mach: 1.3, fins });
    expect(r.finsOnBaseSource).toBe('rebuilt');
    expect(r.labels.some((l) => l.includes(FINS_ON_BASE_ROUTING_LABEL))).toBe(true);
    const f = finsOnBaseFactorW1(1.3, { ...fins.nearBase, count: 4, trailingEdgeAheadOfBase: 0 });
    expect(r.cd).toBeCloseTo(curve(1.3) * 1.065 * f.nominal, 12);
    // Swept fins of a sharp section below M 1.5, and fins ahead of the base, are refused.
    const swept = { ...fins, nearBase: { ...fins.nearBase, tanLeadingEdgeSweep: 1 } };
    expect(() => bodyBaseDrag({ ...base, mach: 1.3, fins: swept })).toThrow(/below M 1.5/);
    expect(() =>
      bodyBaseDrag({ ...base, mach: 1.3, fins: { ...fins, trailingEdgeAheadOfBase: 0.5 } }),
    ).toThrow(BaseRefusal);
    // Fins a chord or more ahead: the curve alone.
    const ahead = bodyBaseDrag({
      ...base,
      mach: 1.3,
      fins: { ...fins, trailingEdgeAheadOfBase: 1.2 },
    });
    expect(ahead.finsOnBase).toBeUndefined();
    expect(ahead.cd).toBeCloseTo(curve(1.3) * 1.065, 12);
  });
});
