/**
 * Blunt fin trailing edges (src/base/fin-trailing-edge.ts): the
 * transcription against 0008's data file, the band recomputed from its
 * evidence, the thin-layer limit, the laminar input band and its
 * extrapolation rule, the term's arithmetic and the refusals. Recorded in
 * docs/design/0010-base-drag-and-total.md, section 5.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  RM_A51J25_FIG7_CURVE,
  TN_D1056_TABLE_II,
  TR1109_FIG29A_TURBULENT,
  TR1109_FIG29B_LAMINAR,
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
    const f8 = rows.filter((x) => x[0] === 'TR 1109' && x[1] === '8');
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

describe('the band, recomputed from its evidence', () => {
  it('reproduces 0008: TR 1109 0.969 to 1.082 and 0.933 to 1.010, RM A51J25 0.961 to 1.067, X-15 0.934 to 1.201', () => {
    const e = finTrailingEdgeBandEvidence();
    expect(e.tr1109Fig8.min).toBeCloseTo(0.969, 3);
    expect(e.tr1109Fig8.max).toBeCloseTo(1.082, 3);
    expect(e.tr1109Fig29aOverFig8.min).toBeCloseTo(0.933, 3);
    expect(e.tr1109Fig29aOverFig8.max).toBeCloseTo(1.01, 3);
    expect(e.rmA51j25).toMatchObject({ count: 11 });
    expect(e.rmA51j25.min).toBeCloseTo(0.961, 3);
    expect(e.rmA51j25.max).toBeCloseTo(1.067, 3);
    // blunt_te_2d_base.md says 19 points; table II has 18 power-off rows at M 1.52 to 3.24.
    expect(e.x15).toMatchObject({ count: 18 });
    expect(e.x15.min).toBeCloseTo(0.934, 3);
    expect(e.x15.max).toBeCloseTo(1.201, 3);
  });

  it('rounded outward: 0.93 to 1.21', () => {
    expect(FIN_TRAILING_EDGE_BAND).toEqual({ low: 0.93, high: 1.21 });
  });
});

describe('the thin-layer limit', () => {
  it('fig. 29(a) at 1.0 lies within 0.4%, 1.4%, 1.8% of its lowest-abscissa value; at 4.5 it has fallen 12%, 15%, 29%', () => {
    const drop = TR1109_FIG29A_TURBULENT.map((c) => {
      const first = 1 - c.points[0]!.ratio;
      const at = (x: number) => 1 - c.points.find((p) => p.x === x)!.ratio;
      return [1 - at(1.0) / first, 1 - at(4.5) / first].map((v) => Math.round(1000 * v) / 10);
    });
    expect(drop).toEqual([
      [0.4, 11.8],
      [1.4, 15.0],
      [1.8, 29.3],
    ]);
    expect(THIN_LAYER_LIMIT).toBe(1.0);
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
    expect(
      finTrailingEdgeBaseDrag({ ...edges, transitionReynolds: [1e6] }).laminar,
    ).toBeUndefined();
    const t = finTrailingEdgeBaseDrag({ ...edges, transitionReynolds: [1e6, 3e6] });
    expect(t.laminar).toBeDefined();
    expect(t.laminarInput.low).toBeCloseTo(Math.min(0, (t.laminar!.low - 1) * t.cd), 15);
    expect(t.laminarInput.high).toBeCloseTo(Math.max(0, (t.laminar!.high - 1) * t.cd), 15);
  });

  it('is zero for sharp trailing edges', () => {
    expect(finTrailingEdgeBaseDrag({ ...edges, thickness: 0 }).cd).toBe(0);
  });

  it('refuses Mach numbers outside 1.5 to 3.2, swept and laminar edges, thick layers', () => {
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edges, mach: 1.45 }))).toBe('mach-range');
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edges, mach: 3.25 }))).toBe('mach-range');
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
