/**
 * Blunt fin trailing edges with thick layers and on fins of varying chord
 * (src/base/fin-trailing-edge.ts; docs/design/0016-fin-edges-of-flat-plates.md,
 * W3(a) and W3(b)): the thick-layer factor recomputed from TR 1109 fig.
 * 29(a)'s two readings, its band, continuity at 1.0, the refusals; the term
 * integrated along the span against an independent quadrature; the laminar
 * part of the span in a transition state.
 */

import { describe, expect, it } from 'vitest';
import {
  TR1109_FIG29A_TURBULENT,
  TR1109_FIG29A_TURBULENT_SECOND,
  type Tr1109Curve,
} from '../../src/base/blunt-te-2d';
import {
  FIN_TRAILING_EDGE_BAND,
  finTrailingEdgeBaseDrag,
  laminarOverTurbulent,
  THICK_LAYER_LIMIT,
  THICK_LAYER_MACH_RANGE,
  thickLayerFactor,
  thinLayerBasePressure,
} from '../../src/base/fin-trailing-edge';
import { BaseRefusal } from '../../src/base/refusal';

const reason = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(BaseRefusal);
    return (e as BaseRefusal).reason;
  }
  return 'none';
};

/** D = 1 - p_b / p_inf on a read curve, linear between its points. */
const drag = (curves: readonly Tr1109Curve[], mach: number, x: number) => {
  const p = curves.find((c) => c.mach === mach)!.points;
  for (let k = 0; k + 1 < p.length; k++) {
    if (x >= p[k]!.x && x <= p[k + 1]!.x) {
      const t = (x - p[k]!.x) / (p[k + 1]!.x - p[k]!.x);
      return 1 - (p[k]!.ratio + t * (p[k + 1]!.ratio - p[k]!.ratio));
    }
  }
  throw new Error(`x ${x} not read`);
};
const k = (curves: readonly Tr1109Curve[], mach: number, x: number) =>
  drag(curves, mach, x) / drag(curves, mach, 1.0);
const READINGS = [TR1109_FIG29A_TURBULENT, TR1109_FIG29A_TURBULENT_SECOND];

describe('the thick-layer factor K = D(X) / D(1.0) on TR 1109 fig. 29(a)', () => {
  it('is read to 4.5 at M 1.5, 2.0 and 3.1 in both readings', () => {
    expect(THICK_LAYER_LIMIT).toBe(4.5);
    expect(THICK_LAYER_MACH_RANGE).toEqual([1.5, 3.1]);
    for (const r of READINGS) {
      expect(r.map((c) => c.mach)).toEqual([1.5, 2.0, 3.1]);
      for (const c of r) expect(c.points[c.points.length - 1]!.x).toBe(4.5);
    }
  });

  it('is 1 up to X 1.0, so the thin-layer term is unchanged there', () => {
    for (const m of [1.5, 1.8, 2.4, 3.0, 3.2]) {
      for (const x of [0.2, 0.69, 1.0]) {
        expect(thickLayerFactor(m, x)).toEqual({ nominal: 1, low: 1, high: 1, machNodes: [] });
      }
    }
  });

  it('falls with Mach number at every abscissa read, in both readings (so the bracketing curves bound it)', () => {
    for (const r of READINGS) {
      for (let x = 1.25; x <= 4.5 + 1e-9; x += 0.25) {
        const ks = [1.5, 2.0, 3.1].map((m) => k(r, m, x));
        expect(ks[1]!).toBeLessThan(ks[0]! + 1e-12);
        expect(ks[2]!).toBeLessThan(ks[1]!);
      }
    }
  });

  it('at 4.5: 0.885, 0.863, 0.719 (first reading), 0.887, 0.862, 0.720 (second)', () => {
    const at = (r: readonly Tr1109Curve[]) =>
      [1.5, 2.0, 3.1].map((m) => Math.round(1000 * k(r, m, 4.5)) / 1000);
    expect(at(TR1109_FIG29A_TURBULENT)).toEqual([0.885, 0.863, 0.719]);
    expect(at(TR1109_FIG29A_TURBULENT_SECOND)).toEqual([0.887, 0.862, 0.72]);
  });

  it('nominal: the first reading linear in Mach number; ends: both readings at the bracketing curves', () => {
    for (const [m, x] of [
      [1.5, 2.2],
      [1.8, 3.3],
      [2.0, 1.4],
      [2.5, 2.0],
      [3.1, 4.5],
      [2.75, 1.01],
    ] as const) {
      const f = thickLayerFactor(m, x);
      const nodes = m === 1.5 || m === 2.0 || m === 3.1 ? [m] : m < 2 ? [1.5, 2.0] : [2.0, 3.1];
      expect(f.machNodes).toEqual(nodes);
      const a = nodes[0]!;
      const b = nodes[nodes.length - 1]!;
      const ka = k(TR1109_FIG29A_TURBULENT, a, x);
      const kb = k(TR1109_FIG29A_TURBULENT, b, x);
      expect(f.nominal).toBeCloseTo(a === b ? ka : ka + ((m - a) / (b - a)) * (kb - ka), 14);
      const all = READINGS.flatMap((r) => nodes.map((n) => k(r, n, x)));
      expect(f.low).toBeCloseTo(Math.min(...all), 14);
      expect(f.high).toBeCloseTo(Math.max(...all), 14);
      expect(f.low).toBeLessThanOrEqual(f.nominal + 1e-15);
      expect(f.high).toBeGreaterThanOrEqual(f.nominal - 1e-15);
    }
  });

  it('is continuous at X 1.0', () => {
    for (const m of [1.5, 2.4, 3.1]) {
      const f = thickLayerFactor(m, 1 + 1e-9);
      expect(f.nominal).toBeCloseTo(1, 7);
      expect(f.high).toBeCloseTo(1, 7);
    }
  });

  it('refuses beyond X 4.5, and a thick layer outside Mach 1.5 to 3.1', () => {
    expect(reason(() => thickLayerFactor(2, 4.51))).toBe('thick-layer');
    expect(reason(() => thickLayerFactor(3.15, 1.2))).toBe('thick-layer');
    expect(reason(() => thickLayerFactor(1.45, 1.2))).toBe('thick-layer');
    expect(thickLayerFactor(2, 4.5).nominal).toBeCloseTo(k(TR1109_FIG29A_TURBULENT, 2, 4.5), 14);
  });
});

describe('the term with a thick layer, constant chord', () => {
  // A 3 mm plate edge on a 120 mm chord at Re' 1.6e7 per m: X = 0.12 / (0.003 x 1.92e6^0.2).
  const edges = {
    mach: 2.5,
    count: 3,
    thickness: 0.003,
    span: 0.08,
    chord: 0.12,
    tanSweep: 0,
    inBasePlane: true,
    layer: 'turbulent' as const,
    reynoldsPerLength: 1.6e7,
    referenceArea: Math.PI * 0.027 ** 2,
  };
  const x = 0.12 / (0.003 * (1.6e7 * 0.12) ** 0.2);

  it('is the thin-layer term times K, its band 0.93 and 1.21 times the term at K low and K high', () => {
    expect(x).toBeGreaterThan(2);
    expect(x).toBeLessThan(2.5);
    const t = finTrailingEdgeBaseDrag(edges);
    const thin = (-thinLayerBasePressure(2.5) * 3 * 0.003 * 0.08) / edges.referenceArea;
    const f = thickLayerFactor(2.5, x);
    expect(t.thinLayerParameter).toBeCloseTo(x, 14);
    expect(t.cd).toBeCloseTo(thin * f.nominal, 15);
    expect(t.low).toBeCloseTo(FIN_TRAILING_EDGE_BAND.low * thin * f.low, 15);
    expect(t.high).toBeCloseTo(FIN_TRAILING_EDGE_BAND.high * thin * f.high, 15);
    expect(t.thickLayer).toEqual(f);
    expect(t.label).toMatch(/a thick layer, c\/\[h Re_c\^\(1\/5\)\] 2\.\d\d/);
    // About -9% and +24% of the term at M 2.5 and X 2.2.
    expect(t.low / t.cd).toBeGreaterThan(0.88);
    expect(t.high / t.cd).toBeLessThan(1.27);
  });

  it('refuses a layer thicker than 4.5, and a thick layer at M 3.15', () => {
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edges, thickness: 0.001 }))).toBe(
      'thick-layer',
    );
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edges, mach: 3.15 }))).toBe('thick-layer');
  });
});

describe('fins of varying chord, unswept trailing edge (W3(b))', () => {
  // A clipped delta in sheet stock: root 0.12, tip 0.04, span 0.08; X 2.2 at the root, 0.9 at the tip.
  const edges = {
    mach: 2.2,
    count: 3,
    thickness: 0.003,
    span: 0.08,
    chord: 0.12,
    tipChord: 0.04,
    tipThickness: 0.003,
    tanSweep: 0,
    inBasePlane: true,
    layer: 'turbulent' as const,
    reynoldsPerLength: 1.6e7,
    referenceArea: Math.PI * 0.027 ** 2,
  };
  const chordAt = (y: number) => 0.12 - (0.08 * y) / 0.08;
  const xAt = (y: number) => chordAt(y) / (0.003 * (1.6e7 * chordAt(y)) ** 0.2);
  /** The midpoint rule on 20000 strips, an independent quadrature. */
  const strips = (f: (y: number) => number) => {
    const n = 20000;
    let s = 0;
    for (let i = 0; i < n; i++) s += f(((i + 0.5) * 0.08) / n) * (0.08 / n);
    return s;
  };

  it('integrates -P_B K h along the span: within 1e-5 of 20000 strips, the band ends likewise', () => {
    expect(xAt(0)).toBeGreaterThan(1);
    expect(xAt(0.08)).toBeLessThan(1);
    const t = finTrailingEdgeBaseDrag(edges);
    const q = (-thinLayerBasePressure(2.2) * 3 * 0.003) / edges.referenceArea;
    const ref = (end: 'nominal' | 'low' | 'high') =>
      q * strips((y) => thickLayerFactor(2.2, xAt(y))[end]);
    expect(Math.abs(t.cd / ref('nominal') - 1)).toBeLessThan(1e-5);
    expect(Math.abs(t.low / (FIN_TRAILING_EDGE_BAND.low * ref('low')) - 1)).toBeLessThan(1e-5);
    expect(Math.abs(t.high / (FIN_TRAILING_EDGE_BAND.high * ref('high')) - 1)).toBeLessThan(1e-5);
    expect(t.label).toMatch(/fins of varying chord, integrated along the span/);
    expect(t.thinLayerParameter).toBeCloseTo(xAt(0), 12);
    expect(t.vacuum).toBeCloseTo(
      ((2 / (1.4 * 2.2 * 2.2)) * 3 * 0.003 * 0.08) / edges.referenceArea,
      14,
    );
  });

  it('a section scaled with the chord: the thickness varies, c / h stays', () => {
    const t = finTrailingEdgeBaseDrag({ ...edges, thickness: 0.006, tipThickness: 0.002 });
    const q = (-thinLayerBasePressure(2.2) * 3) / edges.referenceArea;
    const h = (y: number) => 0.05 * chordAt(y);
    const x = (y: number) => chordAt(y) / (h(y) * (1.6e7 * chordAt(y)) ** 0.2);
    const ref = q * strips((y) => h(y) * thickLayerFactor(2.2, x(y)).nominal);
    expect(Math.abs(t.cd / ref - 1)).toBeLessThan(1e-5);
  });

  // The reference integrals below evaluate fig. 29's laminar reading at 16000 strips; under a
  // loaded machine that takes seconds, so the timeout states the real work.
  it(
    'a transition state leaves laminar the part of the span it reaches, integrated on that part alone',
    { timeout: 30_000 },
    () => {
      // Re_T 1.2e6 reaches chords up to 0.075, so y from 0.045 to the tip.
      const t = finTrailingEdgeBaseDrag({ ...edges, transitionReynolds: [5e5, 1.2e6, 3e6] });
      const [none, part, all] = t.laminarStates!;
      expect(none!.laminarSpanFraction).toBe(0);
      expect(none!.low).toBe(0);
      expect(none!.high).toBe(0);
      expect(part!.laminarSpanFraction).toBeCloseTo((0.08 - 0.045) / 0.08, 12);
      expect(all!.laminarSpanFraction).toBe(1);
      const q = (-thinLayerBasePressure(2.2) * 3 * 0.003) / edges.referenceArea;
      // Both ends from one pass of 8000 midpoint strips.
      const change = (y0: number) => {
        const n = 8000;
        let low = 0;
        let high = 0;
        for (let i = 0; i < n; i++) {
          const y = y0 + ((i + 0.5) * (0.08 - y0)) / n;
          const c = chordAt(y);
          const r = laminarOverTurbulent(c / 0.003, 1.6e7 * c);
          const w = thickLayerFactor(2.2, xAt(y)).nominal * ((0.08 - y0) / n);
          low += (r.low - 1) * w;
          high += (r.high - 1) * w;
        }
        return { low: q * low, high: q * high };
      };
      const partRef = change(0.045);
      expect(Math.abs(part!.low / partRef.low - 1)).toBeLessThan(1e-4);
      expect(Math.abs(part!.high / partRef.high - 1)).toBeLessThan(1e-4);
      expect(Math.abs(all!.high / change(0).high - 1)).toBeLessThan(1e-4);
      expect(t.laminarInput.low).toBe(Math.min(0, ...t.laminarStates!.map((s) => s.low)));
      expect(t.laminarInput.high).toBe(Math.max(0, ...t.laminarStates!.map((s) => s.high)));
      expect(t.laminarTerm).toBeUndefined();
    },
  );

  it('refuses a layer thicker than 4.5 anywhere along the span', () => {
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edges, chord: 0.6, tipChord: 0.1 }))).toBe(
      'thick-layer',
    );
  });
});
