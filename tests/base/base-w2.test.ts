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
import { doubleWedge, type SymmetricSection } from '../../src/fins/section';

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
    // The low end's source, named (the review of 2026-10-27): a tunnel datum above M 1.5, carried down.
    expect(W2_LABEL).toContain(
      'times 1.040, the midpoint of its band 0.77 to 1.31 over the curve: its high end set on free-flight ' +
        'data at Mach 1.0 to 1.3 (RM L52E06 fig. 8, TN 3819 fig. 18) and carried to 1.5, its low end the ' +
        'band of Mach 1.5 to 3.0 carried down, which a sting-supported tunnel body with a radome nose sets ' +
        'at Mach 1.62 (RM L52J21a, 0014 section 10.7 (ah); 0015 section 11)',
    );
  });
});

describe('the band and the nominal', () => {
  it('low end carried down (0.77 since 0014 10.7 (ah), 0.82 before); high end the largest free-flight datum plus its error, rounded outward', () => {
    expect(W2_BAND.low).toBe(COMPILED_CURVE_BAND.low);
    // The first reading at M 1.055, 0.2389 +-0.0012, where the curve runs along the 0.24 gridline.
    const largest = (0.2389 + 0.0012) / curve(1.055);
    expect(Math.max(...w2FreeFlightRatios().map((r) => r.ratio))).toBeCloseTo(largest, 12);
    expect(largest).toBeCloseTo(1.3011, 4);
    expect(W2_BAND.high).toBe(1.31);
    expect(W2_BAND.low).toBe(0.77);
    // The nominal is the band's midpoint (0015 section 11.1): 1.04, 1.065 before (ah).
    expect(W2_BAND.nominal).toBeCloseTo(1.04, 12);
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

  it('at M 1.2: the curve times the midpoint, the band from 0.77 to 1.31 of the curve, plus interpolation', () => {
    const r = bodyBaseDrag({ ...base, mach: 1.2 });
    const q = curve(1.2);
    expect(r.cd).toBeCloseTo(q * 1.04, 12);
    expect(r.low).toBeCloseTo(q * 0.77 - r.curve.interpolationError * 1.04, 12);
    expect(r.high).toBeCloseTo(q * 1.31 + r.curve.interpolationError * 1.04, 12);
    expect(r.curveBand).toMatchObject({ low: 0.77, high: 1.31, source: 'w2' });
    expect(r.labels[0]).toBe(W2_LABEL);
    expect(r.curve.bracketReadTwice).toBe(true);
  });

  it('the band steps at M 1.5, and so does the nominal (a method choice, 0015 section 11)', () => {
    const below = bodyBaseDrag({ ...base, mach: 1.4999 });
    const at = bodyBaseDrag({ ...base, mach: 1.5 });
    expect(below.cd / at.cd).toBeCloseTo(1.04, 3);
    expect(at.curveBand).toMatchObject({ low: 0.77, high: 1.17, nominal: 1, source: 'compiled' });
  });

  it('refused below Mach 1.0', () => {
    expect(W2_MACH_RANGE).toEqual([1.0, 1.5]);
    expect(() => bodyBaseDrag({ ...base, mach: 0.99 })).toThrow(BaseRefusal);
  });

  it('four unswept 10% arcs below Mach 1.5: a member whose label names the tunnel excess it carries', () => {
    const n = 200;
    const xs = Array.from({ length: n + 1 }, (_, k) => k / n);
    const arc10 = { x: xs, halfThickness: xs.map((s) => 2 * 0.1 * s * (1 - s)) };
    const fins = {
      count: 4,
      thicknessRatio: 0.1,
      section: 'circular-arc' as const,
      tanLeadingEdge: 0,
      tanTrailingEdge: 0,
      trailingEdgeAheadOfBase: 0,
      nearBase: {
        section: arc10,
        sectionFamily: 'circular-arc' as const,
        tanLeadingEdgeSweep: 0,
        tanTrailingEdgeSweep: 0,
      },
    };
    const r = bodyBaseDrag({ ...base, mach: 1.2, fins });
    const f = r.finsOnBase as ReturnType<typeof finsOnBaseFactorW1>;
    expect(f.analogy).toBe(false);
    // Its high end on W2's term (0015 section 11.2) carries the M 2.41 tunnel excess (0015 section 3.1).
    expect(f.high).toBeCloseTo(1.6601, 4);
    expect(f.label).toMatch(
      /^estimated on component data: the rebuilt fins-on-base factor \(0015\), measured on/,
    );
    expect(f.label).toContain(
      'its high end carrying the tunnel excess measured at M 2.41 (0.2282)',
    );
    expect(f.label).not.toContain('the zero member reaches down');
  });

  it("the steps 0015 section 11.2 quotes, at M 1.5 and 1.62, and the half-widths on W2's term", () => {
    const n = 200;
    const xs = Array.from({ length: n + 1 }, (_, k) => k / n);
    const arc10: SymmetricSection = { x: xs, halfThickness: xs.map((s) => 2 * 0.1 * s * (1 - s)) };
    const finsOf = (
      count: number,
      t: number,
      section: SymmetricSection,
      family: 'circular-arc' | 'other',
    ) => ({
      count,
      thicknessRatio: t,
      section: family,
      tanLeadingEdge: 0,
      tanTrailingEdge: 0,
      trailingEdgeAheadOfBase: 0,
      nearBase: { section, sectionFamily: family, tanLeadingEdgeSweep: 0, tanTrailingEdgeSweep: 0 },
    });
    const arcs = finsOf(4, 0.1, arc10, 'circular-arc');
    const wedges = finsOf(3, 0.024, doubleWedge(0.024, 0.5), 'other');
    const term = (
      fins: typeof arcs & { readonly rootChordOverDiameter?: number },
      mach: number,
    ) => {
      const r = bodyBaseDrag({ ...base, mach, fins });
      return [r.cd, r.low, r.high].map((x) => Math.round(1e4 * x) / 1e4);
    };
    // M 1.5, where W2's 1.04 ends (1.065 before 0014 10.7 (ah)) and TN 2360's ratio members begin.
    expect(term(arcs, 1.5 - 1e-9)[0]).toBe(0.2847);
    expect(term(arcs, 1.5)[0]).toBe(0.2817);
    expect(term(wedges, 1.5 - 1e-9)).toEqual([0.2283, 0.0918, 0.3648]);
    expect(term(wedges, 1.5)).toEqual([0.2002, 0.0992, 0.2892]);
    // M 1.62, where the zero member goes from RM L52E06's 0.838 to RM L52J21a's 0.938.
    expect(term(wedges, 1.6)).toEqual([0.1967, 0.0958, 0.2857]);
    expect(term(wedges, 1.62 - 1e-9)).toEqual([0.1947, 0.0953, 0.2824]);
    expect(term(wedges, 1.62)).toEqual([0.2031, 0.1101, 0.2838]);
    expect(term(arcs, 1.62 - 1e-9)[0]).toBeCloseTo(term(arcs, 1.62)[0]!, 3);
    // Fins ahead of the base (0015 section 3.3): refused below M 1.5, and measured at M 1.5 with TN 2360's root
    // chord of 1.5 body diameters, which these numbers need (any other chord refused).
    const chord = { rootChordOverDiameter: 1.5 };
    const w4 = { ...wedges, ...chord, trailingEdgeAheadOfBase: 0.4 };
    const a2 = { ...arcs, ...chord, trailingEdgeAheadOfBase: 0.2 };
    const a4 = { ...arcs, ...chord, trailingEdgeAheadOfBase: 0.4 };
    for (const f of [w4, a2, a4]) {
      expect(() => term(f, 1.5 - 1e-9)).toThrow(
        /below Mach 1\.5 no measurement with fins ahead of the base is known/,
      );
      expect(() => term({ ...f, rootChordOverDiameter: 2.0 }, 1.5)).toThrow(
        /root chord is 2\.00 body diameters/,
      );
    }
    // With the compiled curve's band 0.77 to 1.17 (0014 10.7 (ah) and its addenda); with 0.82 to 1.08 before
    // it, [0.1629, 0.1159, 0.1935], [0.2262, 0.1698, 0.26] and [0.1894, 0.1497, 0.2101]; with 0.77 to 1.13,
    // high ends 0.2017, 0.2713 and 0.2195.
    expect(term(w4, 1.5)).toEqual([0.1629, 0.1078, 0.2082]);
    expect(term(a2, 1.5)).toEqual([0.2262, 0.1585, 0.2804]);
    expect(term(a4, 1.5)).toEqual([0.1894, 0.1403, 0.2271]);
    // Below M 1.5, on W2's term, +-32.8% to +-35.9% on F (sharp sections and plates alike; +-31.7% to
    // +-34.9% before 0014 10.7 (ah) moved W2's midpoint from 1.065 to 1.04).
    const hw = Array.from({ length: 501 }, (_, k) => 1.0 + k * 0.000999).map((m) => {
      const f = bodyBaseDrag({ ...base, mach: m, fins: wedges }).finsOnBase!;
      return Math.round((1000 * (f.high - f.low)) / 2 / f.nominal) / 10;
    });
    expect([Math.min(...hw), Math.max(...hw)]).toEqual([32.8, 35.9]);
  }, 120_000);

  it('fins at the base below Mach 1.5: the rebuilt factor, since the present one refuses', () => {
    const fins = {
      count: 4,
      thicknessRatio: 0.024,
      section: 'other' as const,
      tanLeadingEdge: 0,
      tanTrailingEdge: 0,
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
    // The reference, built on fig. 35's free-flight line over the curve, applies to the curve itself, not
    // on top of W2's midpoint, 1.04; the zero member applies to W2's term (0015 section 11.2).
    const g = r.finsOnBase as typeof f;
    expect(g.upper.band.low).toBeCloseTo(f.upper.band.low / 1.04, 12);
    expect(g.upper.band.high).toBeCloseTo(f.upper.band.high / 1.04, 12);
    expect(g.lower.band).toEqual(f.lower.band);
    expect(g.nominal).toBeCloseTo(0.5 * (f.lower.band.low + f.upper.band.high / 1.04), 12);
    expect(r.cd).toBeCloseTo(curve(1.3) * 1.04 * g.nominal, 12);
    expect(r.labels[1]).toContain("apply to Love's curve itself");
    // Swept fins of a sharp section below M 1.5 are refused.
    const swept = {
      ...fins,
      tanLeadingEdge: 1,
      nearBase: { ...fins.nearBase, tanLeadingEdgeSweep: 1 },
    };
    expect(() => bodyBaseDrag({ ...base, mach: 1.3, fins: swept })).toThrow(/below M 1.5/);
    expect(() =>
      bodyBaseDrag({
        ...base,
        mach: 1.3,
        fins: { ...swept, trailingEdgeAheadOfBase: 0.5 },
      }),
    ).toThrow(BaseRefusal);
    // Fins within a chord ahead of the base, at any position, chord given or not: refused below M 1.5 (0015
    // section 3.3; the bound built on 2026-10-26 was withdrawn after the review).
    for (const xc of [0.2, 0.4, 0.5]) {
      for (const c of [{}, { rootChordOverDiameter: 1.5 }]) {
        expect(() =>
          bodyBaseDrag({
            ...base,
            mach: 1.3,
            fins: { ...fins, ...c, trailingEdgeAheadOfBase: xc },
          }),
        ).toThrow(/below Mach 1\.5 no measurement with fins ahead of the base is known/);
      }
    }
    // Fins exactly a chord ahead: refused below M 1.5 like every position ahead. More than a chord
    // ahead: refused at any chord (the curve alone served there until 2026-10-27; 0014 section 10.7 (ad)).
    for (const c of [{}, { rootChordOverDiameter: 1.5 }]) {
      expect(() =>
        bodyBaseDrag({ ...base, mach: 1.3, fins: { ...fins, ...c, trailingEdgeAheadOfBase: 1 } }),
      ).toThrow(/below Mach 1\.5 no measurement with fins ahead of the base is known/);
      for (const x of [1.2, 3]) {
        expect(() =>
          bodyBaseDrag({ ...base, mach: 1.3, fins: { ...fins, ...c, trailingEdgeAheadOfBase: x } }),
        ).toThrow(/^fins ending more than a root chord ahead of the base/);
      }
    }
    // The body without fins keeps the curve alone (W2's term).
    expect(bodyBaseDrag({ ...base, mach: 1.3 }).cd).toBeCloseTo(curve(1.3) * W2_BAND.nominal, 12);
  });

  it("0015 section 3.6's rows below M 1.5, on one basis: W2's term as served, and Love's curve", () => {
    // The factor function's raw output below M 1.5 holds the zero member as a ratio to the body without fins
    // (W2's term) and the reference over Love's curve: two bases. bodyBaseDrag serves both on W2's term.
    const r4 = (x: number) => Math.round(1e4 * x) / 1e4;
    const plate: SymmetricSection = {
      x: [0, 0.1, 1],
      halfThickness: [0, 0.012, 0.012],
      bluntTrailingEdge: true,
    };
    const finsOf = (section: SymmetricSection, tanLe: number, flatFaced: boolean) => ({
      count: 3,
      thicknessRatio: 0.024,
      section: 'other' as const,
      tanLeadingEdge: tanLe,
      tanTrailingEdge: 0,
      trailingEdgeAheadOfBase: 0,
      ...(flatFaced ? { flatFaced: true } : {}),
      nearBase: {
        section,
        sectionFamily: 'other' as const,
        tanLeadingEdgeSweep: tanLe,
        tanTrailingEdgeSweep: 0,
      },
    });
    const rows: [number, ReturnType<typeof finsOf>, number[], number[], number][] = [
      // M, fins, on W2's term [low, nominal, high], on Love's curve [low, nominal, high], half-width %;
      // with W2's nominal 1.04 since 0014 10.7 (ah) (with 1.065 before it: [0.8379, 1.2295, 1.6211] and
      // [0.8924, 1.3095, 1.7265], 31.9, at M 1.2; [0.8379, 1.2873, 1.7367] and [0.8924, 1.371, 1.8496],
      // 34.9, at M 1.0).
      [
        1.2,
        finsOf(doubleWedge(0.024, 0.5), 0, false),
        [0.8379, 1.249, 1.6601],
        [0.8714, 1.299, 1.7265],
        32.9,
      ],
      [1.2, finsOf(plate, 1, true), [0.8379, 1.249, 1.6601], [0.8714, 1.299, 1.7265], 32.9],
      [
        1.0,
        finsOf(doubleWedge(0.024, 0.5), 0, false),
        [0.8379, 1.3082, 1.7784],
        [0.8714, 1.3605, 1.8496],
        35.9,
      ],
    ];
    for (const [m, fins, w2, love, hw] of rows) {
      const f = bodyBaseDrag({ ...base, mach: m, fins }).finsOnBase!;
      expect([f.low, f.nominal, f.high].map(r4)).toEqual(w2);
      expect([f.low, f.nominal, f.high].map((x) => r4(W2_BAND.nominal * x))).toEqual(love);
      expect(Math.round((1000 * (f.high - f.low)) / 2 / f.nominal) / 10).toBe(hw);
    }
  });
});
