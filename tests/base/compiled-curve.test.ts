/**
 * The compiled base-pressure curve of TN 3819 fig. 18 (src/base): the
 * transcription against 0008's data file, the second readings, the
 * interpolation and its error bound, the band recomputed from the data,
 * the base-drag arithmetic and the refusals. Recorded in
 * docs/design/0010-base-drag-and-total.md, section 1.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bodyBaseDrag, COMPILED_CURVE_LABEL } from '../../src/base/base-drag';
import {
  COMPILED_CURVE_BAND,
  COMPILED_CURVE_CURVATURE_BOUND,
  COMPILED_CURVE_MACH_RANGE,
  compiledCurveBandEvidence,
  compiledCurveBasePressure,
  compiledCurveValue,
  interpolationErrorBound,
  twiceReadNodes,
} from '../../src/base/compiled-curve';
import { BaseRefusal } from '../../src/base/refusal';
import {
  TN3819_FIG18_CHECKS,
  TN3819_FIG18_CURVE_READING_ERROR,
  TN3819_FIG18_CURVES,
  TN3819_FIG18_TUNNEL,
} from '../../src/base/tn3819-fig18';

const csv = (path: string) =>
  readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '' && !l.startsWith('#'));

const refusedWith = (reason: string, f: () => unknown) => {
  let caught: unknown;
  try {
    f();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(BaseRefusal);
  expect((caught as BaseRefusal).reason).toBe(reason);
};

describe('the transcription', () => {
  const lines = csv('docs/research/total-drag/data/love_tn3819_fig18.csv');

  it("holds 0008's curve rows exactly", () => {
    const rows = lines.filter((l) => l.startsWith('curve,'));
    expect(rows.length).toBe(16);
    for (const l of rows) {
      const [, m, more, less] = l.split(',');
      const row = TN3819_FIG18_CURVES.find((r) => r.mach === Number(m));
      expect(row, `M ${m}`).toBeDefined();
      expect(row!.moreNegative).toBe(Number(more));
      expect(row!.lessNegative).toBe(Number(less));
    }
  });

  it("holds 0008's twelve tunnel symbols, both readings, exactly", () => {
    const rows = lines.filter((l) => l.startsWith('data,'));
    expect(rows.length).toBe(12);
    rows.forEach((l, k) => {
      const [, m, first, audit] = l.split(',');
      const s = TN3819_FIG18_TUNNEL[k]!;
      expect([s.mach, s.first, s.audit]).toEqual([Number(m), Number(first), Number(audit)]);
    });
  });

  it('holds the adopted table (the audit) exactly from M 1.0 to 3.5', () => {
    const audit = csv('docs/research/total-drag/audit/readings/tn3819_fig18.csv').filter(
      (l) => !/^s\d/.test(l),
    );
    const inRange = audit
      .map((l) => l.split(',').map(Number))
      .filter(([m]) => m! >= 1 && m! <= 3.5);
    expect(inRange.length).toBe(TN3819_FIG18_CURVES.length);
    inRange.forEach(([m, more, less], k) => {
      const row = TN3819_FIG18_CURVES[k]!;
      expect([row.mach, row.moreNegative, row.lessNegative]).toEqual([m, more, less]);
    });
  });

  it('every second reading agrees with the adopted value within the combined reading error', () => {
    // 0008's reading rule: a larger difference would keep both readings and use the one
    // that widens the band. Largest difference measured: 0.0013 (round 3's bundle at M 3.243).
    let largest = 0;
    for (const c of TN3819_FIG18_CHECKS) {
      const row = TN3819_FIG18_CURVES.find((r) => r.mach === c.mach);
      expect(row, `M ${c.mach}`).toBeDefined();
      const d = Math.abs(c.value - row![c.curve]);
      largest = Math.max(largest, d);
      expect(d, `M ${c.mach} ${c.curve} (${c.source})`).toBeLessThanOrEqual(
        c.error + TN3819_FIG18_CURVE_READING_ERROR + 1e-12,
      );
    }
    expect(largest).toBeCloseTo(0.0013, 6);
  });

  it('both curves are read twice at every ratio Mach number from 1.5 to 3.5', () => {
    for (const m of [1.5, 1.63, 1.935, 2.0, 2.414, 2.5, 2.681, 3.0, 3.243, 3.497]) {
      for (const curve of ['moreNegative', 'lessNegative'] as const) {
        expect(
          TN3819_FIG18_CHECKS.some((c) => c.mach === m && c.curve === curve),
          `M ${m} ${curve}`,
        ).toBe(true);
      }
    }
  });
});

describe('interpolation', () => {
  it('reproduces every tabulated value and adds no extremum', () => {
    const rows = TN3819_FIG18_CURVES;
    for (const r of rows) {
      expect(compiledCurveValue(r.mach, 'lessNegative')).toBe(r.lessNegative);
      expect(compiledCurveValue(r.mach, 'moreNegative')).toBe(r.moreNegative);
    }
    for (let k = 0; k + 1 < rows.length; k++) {
      for (const t of [0.25, 0.5, 0.75]) {
        const m = rows[k]!.mach + t * (rows[k + 1]!.mach - rows[k]!.mach);
        for (const curve of ['lessNegative', 'moreNegative'] as const) {
          const v = compiledCurveValue(m, curve);
          const a = rows[k]![curve];
          const b = rows[k + 1]![curve];
          expect(v).toBeGreaterThanOrEqual(Math.min(a, b));
          expect(v).toBeLessThanOrEqual(Math.max(a, b));
        }
      }
    }
  });

  it('the curvature bound from the twice-read values is 0.0634, over both curves; the served curve alone gives 0.039', () => {
    expect(COMPILED_CURVE_CURVATURE_BOUND).toBeCloseTo(0.0634, 4);
    // Round 5, finding 10: the more negative curve sets the bound, so it is
    // conservative on the served (less negative) curve by a factor of 1.6.
    const curvature = (curve: 'lessNegative' | 'moreNegative') => {
      const n = twiceReadNodes(curve);
      let k = 0;
      for (let i = 1; i + 1 < n.length; i++) {
        const s1 = (n[i]!.value - n[i - 1]!.value) / (n[i]!.mach - n[i - 1]!.mach);
        const s2 = (n[i + 1]!.value - n[i]!.value) / (n[i + 1]!.mach - n[i]!.mach);
        k = Math.max(k, Math.abs((2 * (s2 - s1)) / (n[i + 1]!.mach - n[i - 1]!.mach)));
      }
      return k;
    };
    expect(curvature('moreNegative')).toBe(COMPILED_CURVE_CURVATURE_BOUND);
    expect(curvature('lessNegative')).toBeCloseTo(0.039, 3);
  });

  it('each single-read value in M 1.5 to 3.0 lies within the bound of the line through its neighbours', () => {
    // The bound for a node at distances h1 and h2 from its neighbours is K h1 h2 / 2;
    // agreement is allowed 0.0004 more, 0008's criterion for two readings to agree.
    const rows = TN3819_FIG18_CURVES;
    const read = (m: number, curve: string) =>
      TN3819_FIG18_CHECKS.some((c) => c.mach === m && c.curve === curve);
    let worst = -Infinity;
    for (let k = 1; k + 1 < rows.length; k++) {
      const [a, b, c] = [rows[k - 1]!, rows[k]!, rows[k + 1]!];
      if (b.mach < 1.5 || b.mach > 3.0) continue;
      for (const curve of ['lessNegative', 'moreNegative'] as const) {
        if (read(b.mach, curve)) continue;
        const t = (b.mach - a.mach) / (c.mach - a.mach);
        const deviation = Math.abs(b[curve] - (a[curve] + t * (c[curve] - a[curve])));
        const bound = 0.5 * (b.mach - a.mach) * (c.mach - b.mach) * COMPILED_CURVE_CURVATURE_BOUND;
        worst = Math.max(worst, deviation - bound);
        expect(deviation, `M ${b.mach} ${curve}`).toBeLessThanOrEqual(bound + 4e-4);
      }
    }
    // Measured: no single-read value exceeds its bound by more than 6e-5.
    expect(worst).toBeLessThan(6e-5);
  });

  it('the bound vanishes at the nodes and is at most 3.2e-4 in M 1.5 to 3.0', () => {
    for (const r of TN3819_FIG18_CURVES) expect(interpolationErrorBound(r.mach)).toBe(0);
    let largest = 0;
    for (let m = 1.5; m <= 3.0; m += 0.001) largest = Math.max(largest, interpolationErrorBound(m));
    expect(largest).toBeLessThan(3.2e-4);
    expect(largest).toBeGreaterThan(3.1e-4);
  });
});

describe('the band, recomputed from the data', () => {
  it('reproduces 0008 section 3.3: tunnel 0.856 to 1.078, Herrin and Dutton 0.824 to 0.885', () => {
    const e = compiledCurveBandEvidence();
    expect(e.tunnel.min).toBeCloseTo(0.856, 3);
    expect(e.tunnel.max).toBeCloseTo(1.078, 3);
    expect(e.herrinDutton.min).toBeCloseTo(0.824, 3);
    expect(e.herrinDutton.max).toBeCloseTo(0.885, 3);
  });

  it('rounded outward: 0.82 to 1.08', () => {
    expect(COMPILED_CURVE_BAND).toEqual({ low: 0.82, high: 1.08 });
    const e = compiledCurveBandEvidence();
    expect(COMPILED_CURVE_BAND.low).toBeLessThanOrEqual(e.min);
    expect(COMPILED_CURVE_BAND.high).toBeGreaterThanOrEqual(e.max);
  });

  it('the more negative curve lies inside the band about the served one', () => {
    for (const r of TN3819_FIG18_CURVES) {
      if (r.mach < 1.5 || r.mach > 3.0) continue;
      const ratio = r.moreNegative / r.lessNegative;
      expect(ratio).toBeGreaterThanOrEqual(COMPILED_CURVE_BAND.low);
      expect(ratio).toBeLessThanOrEqual(1.036);
    }
  });
});

describe('body base drag: the arithmetic', () => {
  it('without fins: -P_B times the area ratio, the curve band and the interpolation bound', () => {
    for (const mach of [1.5, 1.85, 2.35, 2.75, 3.0]) {
      const area = 0.8;
      const r = bodyBaseDrag({
        mach,
        afterbody: 'cylinder',
        boundaryLayerAtBase: 'turbulent',
        baseAreaRatio: area,
      });
      const p = compiledCurveBasePressure(mach);
      expect(p.pB).toBe(compiledCurveValue(mach, 'lessNegative'));
      const cd = -p.pB * area;
      const e = p.interpolationError * area;
      expect(r.cd).toBeCloseTo(cd, 15);
      expect(r.low).toBeCloseTo(0.82 * cd - e, 15);
      expect(r.high).toBeCloseTo(1.08 * cd + e, 15);
      expect(r.labels).toEqual([COMPILED_CURVE_LABEL]);
      expect(r.finsOnBase).toBeUndefined();
    }
  });

  it('fins at the base: the factor on the term, its band added linearly', () => {
    const r = bodyBaseDrag({
      mach: 2.4,
      afterbody: 'cylinder',
      boundaryLayerAtBase: 'turbulent',
      baseAreaRatio: 1,
      fins: { count: 4, thicknessRatio: 0.08, section: 'other', trailingEdgeAheadOfBase: 0 },
    });
    const f = r.finsOnBase!;
    const q = -compiledCurveValue(2.4, 'lessNegative');
    expect(r.cd).toBeCloseTo(q * f.nominal, 15);
    expect(r.low).toBeCloseTo(r.cd - 0.18 * r.cd + (f.low - f.nominal) * q, 15);
    expect(r.high).toBeCloseTo(r.cd + 0.08 * r.cd + (f.high - f.nominal) * q, 15);
    expect(r.labels[1]).toMatch(/^an analogy, not a measurement/);
  });

  it('never reaches the vacuum bound 2 / (gamma M^2): the high end at most 0.9535 of it (M 3.0, fins at the base), 0.656 without fins', () => {
    const fins = {
      count: 4,
      thicknessRatio: 0.08,
      section: 'other' as const,
      trailingEdgeAheadOfBase: 0,
    };
    const at = (mach: number, withFins: boolean) =>
      bodyBaseDrag({
        mach,
        afterbody: 'cylinder',
        boundaryLayerAtBase: 'turbulent',
        baseAreaRatio: 0.9,
        ...(withFins ? { fins } : {}),
      });
    let withFins = 0;
    let without = 0;
    for (let m = 1.5; m <= 3.0 + 1e-9; m += 0.001) {
      const plain = at(m, false);
      expect(plain.vacuum).toBeCloseTo((0.9 * 2) / (1.4 * m * m), 14);
      expect(plain.vacuumClamped).toEqual([]);
      without = Math.max(without, plain.high / plain.vacuum);
      if (m >= 1.8) {
        const r = at(m, true);
        expect(r.vacuumClamped).toEqual([]);
        withFins = Math.max(withFins, r.high / r.vacuum);
      }
    }
    withFins = Math.max(withFins, at(3.0, true).high / at(3.0, true).vacuum);
    expect(withFins).toBeCloseTo(0.9535, 4);
    expect(Math.round(1000 * without) / 1000).toBe(0.656);
  });

  it('fins a chord or more ahead: the plain curve, labelled not validated with fins', () => {
    const r = bodyBaseDrag({
      mach: 2.0,
      afterbody: 'cylinder',
      boundaryLayerAtBase: 'turbulent',
      baseAreaRatio: 1,
      fins: { count: 4, thicknessRatio: 0.05, section: 'other', trailingEdgeAheadOfBase: 1 },
    });
    expect(r.cd).toBeCloseTo(0.1447, 15);
    expect(r.finsOnBase).toBeUndefined();
    expect(r.labels[1]).toMatch(/not validated with fins/);
  });
});

describe('refusals', () => {
  const base = {
    mach: 2,
    afterbody: 'cylinder' as const,
    boundaryLayerAtBase: 'turbulent' as const,
    baseAreaRatio: 1,
  };

  it('Mach numbers outside 1.0 to 3.0 (below 1.5, W2: tests/base/base-w2.test.ts)', () => {
    expect(COMPILED_CURVE_MACH_RANGE).toEqual([1.5, 3.0]);
    for (const mach of [0.5, 0.9999, 3.0001, 3.5]) {
      refusedWith('mach-range', () => bodyBaseDrag({ ...base, mach }));
    }
    for (const mach of [1.0, 1.2, 1.4999]) {
      expect(bodyBaseDrag({ ...base, mach }).curveBand.source).toBe('w2');
    }
    expect(bodyBaseDrag({ ...base, mach: 1.5 }).curveBand.source).toBe('compiled');
  });

  it('boat-tails and flares', () => {
    refusedWith('afterbody', () => bodyBaseDrag({ ...base, afterbody: 'boat-tail' }));
    refusedWith('afterbody', () => bodyBaseDrag({ ...base, afterbody: 'flare' }));
  });

  it('a laminar boundary layer at the base', () => {
    refusedWith('laminar-base', () => bodyBaseDrag({ ...base, boundaryLayerAtBase: 'laminar' }));
  });

  it('fins ending less than a chord ahead of the base', () => {
    for (const x of [0.01, 0.5, 0.99]) {
      refusedWith('fins-near-base', () =>
        bodyBaseDrag({
          ...base,
          fins: { count: 4, thicknessRatio: 0.08, section: 'other', trailingEdgeAheadOfBase: x },
        }),
      );
    }
  });
});
