/**
 * Blunt fin trailing edges (src/base/fin-trailing-edge.ts): the
 * transcription against 0008's data file, the band recomputed from its
 * evidence on both readings, the thin-layer limit, the laminar input band
 * and its extrapolation rule, the term's arithmetic, the vacuum bound
 * (round 5) and the refusals. Recorded in
 * docs/design/0010-base-drag-and-total.md, sections 5.1 and 10.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  RM_A51J25_FIG7_CURVE,
  RM_A51J25_FIG7_CURVE_SECOND,
  TN_D1056_TABLE_II,
  TR1109_FIG29A_TURBULENT,
  TR1109_FIG29A_TURBULENT_SECOND,
  TR1109_FIG29B_LAMINAR,
  TR1109_FIG29B_LAMINAR_SECOND,
  TR1109_FIG8_SYMBOLS,
} from '../../src/base/blunt-te-2d';
import {
  FIN_TRAILING_EDGE_BAND,
  FIN_TRAILING_EDGE_LABEL_ANALOGY,
  FIN_TRAILING_EDGE_LABEL_FREE,
  finTrailingEdgeBandEvidence,
  finTrailingEdgeBaseDrag,
  laminarOverTurbulent,
  THIN_LAYER_LIMIT,
  thinLayerBasePressure,
  tr1109CurveValue,
} from '../../src/base/fin-trailing-edge';
import { BaseRefusal } from '../../src/base/refusal';
import { vacuumBaseDrag } from '../../src/base/vacuum';
import { BASIC_FINNER_GEOMETRY, BASIC_FINNER_SHOTS } from '../../src/validation/basic-finner';

const rows = readFileSync('docs/research/total-drag/data/blunt_te_2d_base.csv', 'utf8')
  .split('\n')
  .filter((l) => l.trim() !== '' && !l.startsWith('#') && !l.startsWith('source,'))
  .map((l) => l.split(','));

const reason = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(BaseRefusal);
    return (e as BaseRefusal).reason;
  }
  return 'none';
};

describe('the transcription, against 0008 data file (first readings)', () => {
  it('holds RM A51J25 fig. 7 mean curve', () => {
    const curve = rows.filter((r) => r[0] === 'RM A51J25' && r[2] === 'mean curve');
    expect(curve.length).toBe(RM_A51J25_FIG7_CURVE.length);
    curve.forEach((r, k) => {
      expect([RM_A51J25_FIG7_CURVE[k]!.mach, RM_A51J25_FIG7_CURVE[k]!.ratio]).toEqual([
        Number(r[3]),
        Number(r[7]),
      ]);
    });
  });

  it('holds TR 1109 fig. 29, turbulent and laminar, and fig. 8', () => {
    const check = (fig: string, curves: typeof TR1109_FIG29A_TURBULENT) => {
      const r = rows.filter((x) => x[0] === 'TR 1109' && x[1] === fig);
      const flat = curves.flatMap((c) => c.points.map((p) => [c.mach, p.x, p.ratio]));
      expect(r.map((x) => [Number(x[3]), Number(x[5]), Number(x[7])])).toEqual(flat);
    };
    check('29(a)', TR1109_FIG29A_TURBULENT);
    check('29(b)', TR1109_FIG29B_LAMINAR);
    const all8 = rows.filter((x) => x[0] === 'TR 1109' && x[1] === '8');
    // The first reading's point at M 3.1, X 2.0, 0.275 does not exist (round 4): dropped.
    const f8 = all8.filter((x) => !(x[3] === '3.1' && x[5] === '2.00' && x[7] === '0.275'));
    expect(all8.length - f8.length).toBe(1);
    expect(f8.map((x) => [Number(x[3]), Number(x[5]), Number(x[7])])).toEqual(
      TR1109_FIG8_SYMBOLS.map((s) => [s.mach, s.x, s.ratio]),
    );
    f8.forEach((x, k) => {
      expect(x[2]).toBe(`symbol (curve ${TR1109_FIG8_SYMBOLS[k]!.curve.toFixed(3)})`);
    });
  });

  it('holds TN D-1056 table II (the mean of the orifices recorded)', () => {
    const x15 = rows.filter((x) => x[0] === 'TN D-1056');
    expect(x15.length).toBe(TN_D1056_TABLE_II.length);
    x15.forEach((x, k) => {
      expect(TN_D1056_TABLE_II[k]!.mach).toBe(Number(x[3]));
      expect(TN_D1056_TABLE_II[k]!.cp).toBeCloseTo(Number(x[7]), 3);
    });
  });

  it("TN 3819 fig. 5's line A reproduces the curve within 0.987 to 1.018 (a reading check)", () => {
    const lineA = rows.filter((x) => x[0] === 'TN 3819' && x[2] === 'line A (Chapman compilation)');
    const r = lineA.map((x) => Number(x[7]) / thinLayerBasePressure(Number(x[3])));
    expect(Math.min(...r)).toBeCloseTo(0.987, 3);
    expect(Math.max(...r)).toBeCloseTo(1.018, 3);
  });
});

describe('the band, recomputed from its evidence on both readings', () => {
  const e = finTrailingEdgeBandEvidence();
  const rounded = e.items.map((i) => [
    i.item,
    i.reading,
    i.count,
    Math.round(1000 * i.min) / 1000,
    Math.round(1000 * i.max) / 1000,
  ]);
  const firstOnly = new Set(['first', 'curve first', 'symbols first, curve first']);

  it('the first reading reproduces 0008: TR 1109 0.969 to 1.082 and 0.933 to 1.010, RM A51J25 0.961 to 1.067, X-15 0.934 to 1.201', () => {
    // blunt_te_2d_base.md says 19 X-15 points; table II has 18 power-off rows at M 1.52 to 3.24.
    expect(rounded.filter((r) => firstOnly.has(r[1] as string))).toEqual([
      ['TR 1109 fig. 8', 'first', 32, 0.969, 1.082],
      ['TR 1109 fig. 29(a) over fig. 8', 'first', 6, 0.933, 1.01],
      ['RM A51J25 fig. 7 symbols', 'symbols first, curve first', 11, 0.961, 1.067],
      ['X-15 fin', 'curve first', 18, 0.934, 1.201],
    ]);
  });

  it("the second reading reproduces the reader's 0.953 to 1.072, 0.946 to 1.011, 0.939 to 1.057 (0.935 at the curve's end value), 0.936 to 1.204", () => {
    expect(rounded.filter((r) => !firstOnly.has(r[1] as string))).toEqual([
      ['TR 1109 fig. 8', 'second', 32, 0.953, 1.072],
      ['TR 1109 fig. 29(a) over fig. 8', 'second', 6, 0.946, 1.011],
      ['RM A51J25 fig. 7 symbols', 'symbols first, curve second', 11, 0.941, 1.065],
      ['RM A51J25 fig. 7 symbols', 'symbols second, curve first', 11, 0.942, 1.057],
      ['RM A51J25 fig. 7 symbols', 'symbols second, curve second', 11, 0.935, 1.057],
      ['X-15 fin', 'curve second', 18, 0.936, 1.204],
    ]);
  });

  it('the envelope, 0.933 to 1.204, rounded outward: 0.93 to 1.21', () => {
    expect(e.min).toBeCloseTo(0.9333, 4);
    expect(e.max).toBeCloseTo(1.2038, 4);
    expect(FIN_TRAILING_EDGE_BAND).toEqual({ low: 0.93, high: 1.21 });
  });

  it("the nominal curve is the first reading; the second agrees within -0.005 to +0.003 at M' 1.50 to 4.00", () => {
    const s = RM_A51J25_FIG7_CURVE_SECOND;
    const d = RM_A51J25_FIG7_CURVE.filter((p) => p.mach >= 1.5).map((p) => {
      let k = 0;
      while (k + 2 < s.length && p.mach > s[k + 1]!.mach) k++;
      const a = s[k]!;
      const b = s[k + 1]!;
      return p.ratio - (a.ratio + ((p.mach - a.mach) / (b.mach - a.mach)) * (b.ratio - a.ratio));
    });
    expect(Math.min(...d)).toBeGreaterThan(-0.0055);
    expect(Math.max(...d)).toBeLessThan(0.0035);
    expect(s.filter((p) => !p.blind).map((p) => p.mach)).toEqual([1.5, 1.55, 1.6]);
  });
});

describe('the thin-layer limit', () => {
  const drop = (curves: typeof TR1109_FIG29A_TURBULENT) =>
    curves.map((c) => {
      const first = 1 - c.points[0]!.ratio;
      const at = (x: number) => 1 - c.points.find((p) => p.x === x)!.ratio;
      return [1 - at(1.0) / first, 1 - at(4.5) / first].map((v) => Math.round(1000 * v) / 10);
    });

  it('fig. 29(a) at 1.0 lies within 0.4%, 1.4%, 1.8% of its lowest-abscissa value; at 4.5 it has fallen 12%, 15%, 29%', () => {
    expect(drop(TR1109_FIG29A_TURBULENT)).toEqual([
      [0.4, 11.8],
      [1.4, 15.0],
      [1.8, 29.3],
    ]);
    expect(THIN_LAYER_LIMIT).toBe(1.0);
  });

  it('second reading, from X 0.45: within 0.2%, 1.5%, 4.0% at 1.0; fallen 11%, 15%, 31% at 4.5', () => {
    expect(TR1109_FIG29A_TURBULENT_SECOND.map((c) => c.points[0]!.x)).toEqual([0.45, 0.45, 0.45]);
    expect(drop(TR1109_FIG29A_TURBULENT_SECOND)).toEqual([
      [0.2, 11.4],
      [1.5, 15.1],
      [4.0, 30.9],
    ]);
  });

  it("at the Basic Finner fins' 0.688 to 0.762, the second reading's M 3.1 base drag is 1.5% to 2.2% below its value at 0.45", () => {
    const c = TR1109_FIG29A_TURBULENT_SECOND[2]!;
    expect(c.mach).toBe(3.1);
    const d = (x: number) => 1 - tr1109CurveValue(c, x)!.low;
    expect(Math.round(1000 * (1 - d(0.688) / d(0.45))) / 10).toBe(1.5);
    expect(Math.round(1000 * (1 - d(0.762) / d(0.45))) / 10).toBe(2.2);
  });
});

describe('the laminar input band', () => {
  it("reproduces 0008's three ratios at the read points 0.75 and 0.010: 1.26, 0.87, 0.94", () => {
    const r = TR1109_FIG29A_TURBULENT.map((t) => {
      const l = TR1109_FIG29B_LAMINAR.find((c) => c.mach === t.mach)!;
      return (1 - tr1109CurveValue(l, 0.01)!.low) / (1 - tr1109CurveValue(t, 0.75)!.low);
    });
    expect(r.map((x) => Math.round(100 * x) / 100)).toEqual([1.26, 0.87, 0.94]);
  });

  it("the second reading gives the reader's 1.265, 0.878, 0.945 there", () => {
    const r = TR1109_FIG29A_TURBULENT_SECOND.map((t) => {
      const l = TR1109_FIG29B_LAMINAR_SECOND.find((c) => c.mach === t.mach)!;
      return (1 - tr1109CurveValue(l, 0.01)!.low) / (1 - tr1109CurveValue(t, 0.75)!.low);
    });
    expect(r.map((x) => Math.round(1000 * x) / 1000)).toEqual([1.265, 0.878, 0.945]);
  });

  it('interpolates within the read range, envelopes the end value and the extrapolation within one interval, refuses beyond', () => {
    const lam15 = TR1109_FIG29B_LAMINAR[0]!;
    const within = tr1109CurveValue(lam15, 0.012)!;
    expect(within.extrapolated).toBe(false);
    expect(within.low).toBeCloseTo(0.409, 12);
    expect(within.high).toBe(within.low);
    const below = tr1109CurveValue(lam15, 0.0089)!;
    expect(below.extrapolated).toBe(true);
    expect(below.high).toBe(0.358);
    expect(below.low).toBeCloseTo(0.358 - (0.102 / 0.004) * 0.0011, 12);
    expect(tr1109CurveValue(lam15, 0.0059)).toBeUndefined();
    expect(tr1109CurveValue(lam15, 0.006)).toBeDefined();
    expect(reason(() => laminarOverTurbulent(12.5, 1e9))).toBe('beyond-read-range');
  });

  it('is the envelope over M 1.5, 2.0 and 3.1, widened where extrapolated', () => {
    const inside = laminarOverTurbulent(12.5, 1.19e6);
    expect(inside.laminarAbscissa).toBeCloseTo(0.01146, 5);
    expect(inside.turbulentAbscissa).toBeCloseTo(0.762, 3);
    expect(inside.extrapolated).toBe(false);
    expect(inside.low).toBe(Math.min(...inside.byMach.map((m) => m.low)));
    expect(inside.high).toBe(Math.max(...inside.byMach.map((m) => m.high)));
    // At Re_c 1.98e6: c/[h Re^(1/2)] 0.0089 below M 1.5 and 2.0's first read point 0.010,
    // c/[h Re^(1/5)] 0.688 below M 3.1's first, 0.75.
    const outside = laminarOverTurbulent(12.5, 1.98e6);
    expect(outside.byMach.map((m) => m.extrapolated)).toEqual([true, true, true]);
    expect(outside.high).toBeGreaterThan(inside.high);
  });

  it("over the Basic Finner fins' Re_c 1.19e6 to 1.98e6: -15.4% to +32.0% (+26.5% at the read range's end), against the reader's -15% to +29% (+32% extrapolated)", () => {
    const at = (re: number) => laminarOverTurbulent(12.5, re);
    expect(at(1.19e6).low).toBeCloseTo(0.8457, 4);
    expect(at(1.19e6).high).toBeCloseTo(1.1936, 4);
    expect(at(1.98e6).high).toBeCloseTo(1.3198, 4);
    expect(at(1.98e6).extrapolated).toBe(true);
    // c/[h Re^(1/2)] = 0.010: the M 1.5 laminar curve's first read point in both readings.
    const end = at((12.5 / 0.01) ** 2);
    expect(end.byMach[0]!.extrapolated).toBe(false);
    expect(end.high).toBeCloseTo(1.2648, 4);
    for (const re of [1.3e6, 1.5e6, 1.6e6, 1.8e6]) {
      expect(at(re).low).toBeGreaterThan(at(1.19e6).low);
      expect(at(re).high).toBeLessThan(at(1.98e6).high);
    }
  });
});

describe('the term', () => {
  const edges = {
    mach: 2.4,
    count: 4,
    thickness: 0.06,
    span: 1,
    chord: 1,
    tanSweep: 0,
    inBasePlane: true,
    layer: 'turbulent' as const,
    reynoldsPerLength: 1.5e6,
    referenceArea: Math.PI / 4,
  };

  it('is -P_B n h s / A_ref with the band 0.93 to 1.21, an analogy in the base plane', () => {
    const t = finTrailingEdgeBaseDrag(edges);
    const cd = (-thinLayerBasePressure(2.4) * 4 * 0.06) / (Math.PI / 4);
    expect(t.cd).toBeCloseTo(cd, 15);
    expect(t.low).toBeCloseTo(0.93 * cd, 15);
    expect(t.high).toBeCloseTo(1.21 * cd, 15);
    expect(t.label).toBe(FIN_TRAILING_EDGE_LABEL_ANALOGY);
    expect(t.label.startsWith('an analogy, not a measurement')).toBe(true);
    expect(finTrailingEdgeBaseDrag({ ...edges, inBasePlane: false }).label).toBe(
      FIN_TRAILING_EDGE_LABEL_FREE,
    );
    expect(t.laminarInput).toEqual({ low: 0, high: 0 });
  });

  it('carries the laminar input only when a transition input reaches the trailing edge', () => {
    const turbulent = finTrailingEdgeBaseDrag({ ...edges, transitionReynolds: [1e6] });
    expect(turbulent.laminar).toBeUndefined();
    expect(turbulent.laminarTerm).toBeUndefined();
    expect(turbulent.chordReynolds).toBe(1.5e6);
    const t = finTrailingEdgeBaseDrag({ ...edges, transitionReynolds: [1e6, 3e6] });
    expect(t.laminar).toBeDefined();
    // At M 2.4 the laminar ends lie inside the vacuum bound: nothing clamped.
    expect(t.vacuumClamped).toEqual([]);
    expect(t.laminarTerm!.low).toBeCloseTo(t.laminar!.low * t.cd, 15);
    expect(t.laminarTerm!.high).toBeCloseTo(t.laminar!.high * t.cd, 15);
    expect(t.laminarInput.low).toBeCloseTo(Math.min(0, (t.laminar!.low - 1) * t.cd), 15);
    expect(t.laminarInput.high).toBeCloseTo(Math.max(0, (t.laminar!.high - 1) * t.cd), 15);
  });

  it("the vacuum bound is 2 / (gamma M^2) on the edges' area", () => {
    const t = finTrailingEdgeBaseDrag(edges);
    expect(t.vacuum).toBeCloseTo((vacuumBaseDrag(2.4) * 4 * 0.06) / (Math.PI / 4), 15);
    expect(vacuumBaseDrag(2.4)).toBeCloseTo(2 / (1.4 * 2.4 * 2.4), 15);
    expect(t.high).toBeLessThan(t.vacuum);
  });

  it('is zero for sharp trailing edges', () => {
    expect(finTrailingEdgeBaseDrag({ ...edges, thickness: 0 }).cd).toBe(0);
  });

  it('refuses Mach numbers outside 1.0 to 3.2, swept and laminar edges, thick layers', () => {
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edges, mach: 0.99 }))).toBe('mach-range');
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edges, mach: 3.25 }))).toBe('mach-range');
    // Below Mach 1.5 (0019 section 3.4.1; tests/base/fin-trailing-edge-transonic.test.ts): this
    // edge's c / [h Re^(1/5)] = 1 / (0.06 x 1.5e6^0.2) = 0.97 lies beyond what the sets reach there.
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edges, mach: 1.45 }))).toBe('thick-layer');
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edges, tanSweep: 0.1 }))).toBe(
      'swept-trailing-edge',
    );
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edges, layer: 'laminar' }))).toBe(
      'laminar-trailing-edge',
    );
    // c / [h Re^(1/5)] = 1 / (0.01 x 1.5e6^0.2) = 5.8.
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edges, thickness: 0.01 }))).toBe(
      'thick-layer',
    );
  });
});

describe("the vacuum bound at the Basic Finner's 11 gated shots (round 5)", () => {
  // The Basic Finner's edges: four, 0.08 cal thick over the 1 cal span, chord 1 cal, on
  // the cylinder's cross-section; Re_c from Table V's Reynolds number on the 10 cal length.
  const G = BASIC_FINNER_GEOMETRY;
  const shots = BASIC_FINNER_SHOTS.filter((s) => s.use === 'gate').map((s) => ({
    mach: s.mach,
    t: finTrailingEdgeBaseDrag({
      mach: s.mach,
      count: G.finCount,
      thickness: G.finTrailingEdgeThickness,
      span: G.finSpan,
      chord: G.finChord,
      tanSweep: 0,
      inBasePlane: true,
      layer: 'turbulent',
      reynoldsPerLength: s.reynolds / G.length,
      transitionReynolds: [5e5, 1.6e6, 3e6],
      referenceArea: Math.PI / 4,
    }),
  }));

  it('the term and its band lie inside the bound: the high end at 0.72 to 0.93 of it', () => {
    for (const { mach, t } of shots) {
      expect(t.vacuum).toBeCloseTo((2 / (1.4 * mach * mach)) * (0.32 / (Math.PI / 4)), 12);
      expect(t.cd).toBeLessThan(t.vacuum);
      expect(t.high).toBeLessThan(t.vacuum);
    }
    const r = shots.map(({ t }) => t.high / t.vacuum);
    expect(Math.round(1000 * Math.min(...r)) / 1000).toBe(0.721);
    expect(Math.round(1000 * Math.max(...r)) / 1000).toBe(0.931);
  });

  it("the laminar band's high end is clamped at M 2.969 and 2.970 only: 1.320 and 1.319 of the term would mean p_b < 0; at the bound 1.2995 and 1.2994", () => {
    const clamped = shots.filter(({ t }) => t.vacuumClamped.length > 0);
    expect(clamped.map(({ mach }) => mach)).toEqual([2.969, 2.97]);
    for (const { t } of clamped) {
      expect(t.vacuumClamped).toEqual(['laminar high end']);
      expect(t.laminarTerm!.high).toBe(t.vacuum);
      expect(t.laminar!.high * t.cd).toBeGreaterThan(t.vacuum);
      // The laminar ratio's high end implies p_b / p_inf = 1 - ratio (1 - p_b,turbulent / p_inf) < 0.
    }
    expect(clamped.map(({ t }) => Math.round(1000 * t.laminar!.high) / 1000)).toEqual([
      1.32, 1.319,
    ]);
    expect(clamped.map(({ t }) => Math.round(1e4 * (t.vacuum / t.cd)) / 1e4)).toEqual([
      1.2995, 1.2994,
    ]);
    // Elsewhere the laminar high end lies below the bound (at most 0.975 of it, M 2.749).
    const free = shots.filter(({ t }) => t.vacuumClamped.length === 0);
    for (const { t } of free) expect(t.laminarTerm!.high).toBeLessThan(t.vacuum);
    expect(
      Math.round(1000 * Math.max(...free.map(({ t }) => t.laminarTerm!.high / t.vacuum))) / 1000,
    ).toBe(0.975);
  });
});
