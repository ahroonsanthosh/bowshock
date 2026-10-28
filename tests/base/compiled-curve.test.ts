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
  BODY_ALONE_IN_DOMAIN,
  COMPILED_CURVE_BAND,
  COMPILED_CURVE_CURVATURE_BOUND,
  COMPILED_CURVE_MACH_RANGE,
  compiledCurveBandEvidence,
  compiledCurveBasePressure,
  compiledCurveValue,
  interpolationErrorBound,
  roundedOutward,
  twiceReadNodes,
} from '../../src/base/compiled-curve';
import {
  L52J21A_FIG31_33D,
  L52J21A_FIG31_33D_OTHER_R,
  TN3819_FIG33,
  TN3819_FIG35_TUNNEL_W1,
} from '../../src/base/fins-on-base-w1-data';
import { BaseRefusal } from '../../src/base/refusal';
import { TN3819_FIG35_TUNNEL } from '../../src/base/tn3819-fig35';
import {
  TN3819_FIG18_CHECKS,
  TN3819_FIG18_CURVE_READING_ERROR,
  TN3819_FIG18_CURVES,
  TN3819_FIG18_MISREADS,
  TN3819_FIG18_ROUND7,
  TN2360_FIG5_FIG7_BODY_ALONE,
  TN2360_FIG5_FIG7_ROUND6_SUPERSEDED,
  TN3819_FIG18_TUNNEL,
  TR1051_FIG23B_FAIRED_SUPERSEDED,
  TR1051_FIG23B_THINNEST,
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

  it('holds the adopted table (the audit) exactly from M 1.0 to 3.5, but its one misread', () => {
    const audit = csv('docs/research/total-drag/audit/readings/tn3819_fig18.csv').filter(
      (l) => !/^s\d/.test(l),
    );
    const inRange = audit
      .map((l) => l.split(',').map(Number))
      .filter(([m]) => m! >= 1 && m! <= 3.5);
    expect(inRange.length).toBe(TN3819_FIG18_CURVES.length);
    inRange.forEach(([m, more, less], k) => {
      const row = TN3819_FIG18_CURVES[k]!;
      const mis = TN3819_FIG18_MISREADS.find((x) => x.mach === m && x.curve === 'lessNegative');
      expect([row.mach, row.moreNegative]).toEqual([m, more]);
      if (mis === undefined) {
        expect(row.lessNegative).toBe(less);
      } else {
        // The audit's value is the misread; the row holds round 7's (0015 section 7).
        expect(mis.value).toBe(less);
        expect(row.lessNegative).toBe(mis.replacedBy);
      }
    });
    expect(TN3819_FIG18_MISREADS.map((x) => [x.mach, x.curve])).toEqual([[1.4, 'lessNegative']]);
  });

  it("round 7, held to its file and paired with the audit's rows: one misread, at M 1.4", () => {
    const file = csv('docs/research/total-drag/data/round7/tn3819_fig18.csv')
      .slice(1)
      .map((l) =>
        l.match(/("[^"]*"|[^,]*)(,|$)/g)!.map((x) => x.replace(/,$/, '').replace(/"/g, '')),
      );
    const at = (curve: string, m: number) =>
      file.find((f) => f[0]!.startsWith(curve) && f[1] === 'at M' && Number(f[2]) === m)!;
    for (const r of TN3819_FIG18_ROUND7) {
      const less = at('Love', r.mach);
      expect([Number(less[4]), Number(less[5])]).toEqual([r.lessNegative, r.lessNegativeError]);
      const more = at('Chapman', r.mach);
      expect([Number(more[4]), Number(more[5])]).toEqual([r.moreNegative, r.moreNegativeError]);
    }
    expect(TN3819_FIG18_ROUND7.length).toBe(9);
    // Paired with the audit's rows (0014 section 10.1, rule 5): within the combined errors but one.
    const audit = new Map(
      csv('docs/research/total-drag/audit/readings/tn3819_fig18.csv')
        .filter((l) => !/^s\d/.test(l))
        .map((l) => l.split(',').map(Number))
        .map(([m, more, less]) => [m!, { moreNegative: more!, lessNegative: less! }]),
    );
    const beyond: string[] = [];
    for (const r of TN3819_FIG18_ROUND7) {
      const a = audit.get(r.mach);
      if (a === undefined) continue;
      for (const c of ['moreNegative', 'lessNegative'] as const) {
        const e = c === 'moreNegative' ? r.moreNegativeError : r.lessNegativeError;
        if (Math.abs(a[c] - r[c]) > e + TN3819_FIG18_CURVE_READING_ERROR + 1e-12) {
          beyond.push(`${r.mach} ${c}`);
        }
      }
    }
    expect(beyond).toEqual(['1.4 lessNegative']);
    // The third evidence: fig. 35's no-fin curve, both readings, -0.1774 and -0.1775 at M 1.4.
    for (const v of [-0.1774, -0.1775]) {
      expect(Math.abs(v - TN3819_FIG18_MISREADS[0]!.replacedBy)).toBeLessThanOrEqual(
        0.0002 + 0.0003,
      );
      expect(Math.abs(v - TN3819_FIG18_MISREADS[0]!.value)).toBeGreaterThan(0.001 + 0.0003);
    }
    // Chapman minus basic: 0.0034 to 0.0042 at the neighbouring rows in both readings; round 1's 0.0014 at 1.4.
    const sep = (m: number) => {
      const r = TN3819_FIG18_ROUND7.find((x) => x.mach === m)!;
      return r.lessNegative - r.moreNegative;
    };
    for (const m of [1.2, 1.4, 1.5]) expect(sep(m)).toBeGreaterThan(0.0033);
    expect(-0.1796 - -0.181).toBeLessThan(0.0015);
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

  it('the body-alone sets of 0014 10.7 (ah), every reading, against both curves', () => {
    const b = compiledCurveBandEvidence().bodyAlone;
    // TN 2360: TN 3819 figs. 33 and 35 (10), and figs. 5 and 7's ten body-alone symbols, every reading of
    // round 20 (23: the partly hidden symbol at R 0.765e6 carries five).
    expect(BODY_ALONE_IN_DOMAIN.filter((r) => r.set === 'TN 2360')).toHaveLength(33);
    expect(BODY_ALONE_IN_DOMAIN.filter((r) => r.set === 'Langley 9 in')).toHaveLength(5);
    // RM L52J21a: W1's 10 pairs about R 8.06e6 and the 14 outside that window (the review of 2026-10-27).
    expect(BODY_ALONE_IN_DOMAIN.filter((r) => r.set === 'RM L52J21a')).toHaveLength(48);
    expect(BODY_ALONE_IN_DOMAIN.filter((r) => r.set === 'TR 1051')).toHaveLength(6);
    // TN 2360's body alone: since round 20, fig. 5(a)'s symbol at M 1.5, R 0.765e6, reader B's -0.2026, over
    // the served curve sets its high end, and fig. 5(b)'s at M 2.0, R 1.83e6, reader B's -0.1473, over the
    // more negative curve its low end (1.0027 to 1.1241 with TN 3819 figs. 33 and 35 alone).
    expect(b['TN 2360'].min).toBeCloseTo(-0.1473 / compiledCurveValue(2.0, 'moreNegative'), 12);
    expect(b['TN 2360'].min).toBeCloseTo(0.9846, 4);
    expect(b['TN 2360'].max).toBeCloseTo(-0.2026 / compiledCurveValue(1.5, 'lessNegative'), 12);
    expect(b['TN 2360'].max).toBeCloseTo(1.1691, 4);
    const tn3819 = BODY_ALONE_IN_DOMAIN.filter(
      (r) => r.set === 'TN 2360' && r.source.startsWith('TN 3819'),
    ).flatMap((r) =>
      (['moreNegative', 'lessNegative'] as const).map((c) => r.pB / compiledCurveValue(r.mach, c)),
    );
    expect(Math.min(...tn3819)).toBeCloseTo(1.0027, 4);
    expect(Math.max(...tn3819)).toBeCloseTo(0.1948 / 0.1733, 12);
    expect(b['Langley 9 in'].min).toBeCloseTo(0.9639, 4);
    expect(b['Langley 9 in'].max).toBeCloseTo(1.0006, 4);
    // RM L52J21a: the radome nose at M 1.62, round 7's -0.1331, over the more negative curve.
    expect(b['RM L52J21a'].min).toBeCloseTo(-0.1331 / compiledCurveValue(1.62, 'moreNegative'), 12);
    expect(b['RM L52J21a'].min).toBeCloseTo(0.7731, 4);
    // The ogive nose at M 1.93, R 7.23e6, the first reading's -0.1525, over the served curve (1.0235 within
    // W1's window alone); the fourteen pairs outside it span 0.7766 to 1.0241, so the band does not move.
    expect(b['RM L52J21a'].max).toBeCloseTo(-0.1525 / compiledCurveValue(1.93, 'lessNegative'), 12);
    expect(b['RM L52J21a'].max).toBeCloseTo(1.0241, 4);
    const outside = L52J21A_FIG31_33D_OTHER_R.flatMap((p) =>
      (['moreNegative', 'lessNegative'] as const).map((c) => p.pB / compiledCurveValue(p.mach, c)),
    );
    expect(Math.min(...outside)).toBeCloseTo(0.7766, 4);
    expect(Math.max(...outside)).toBeCloseTo(1.0241, 4);
    // TR 1051 at its thinnest measured symbols (round 19): the low end reader B's -0.1379 at M 2.0 over the
    // more negative curve, the high end reader B's -0.1127 at M 2.9 over the served curve.
    expect(b['TR 1051'].min).toBeCloseTo(-0.1379 / compiledCurveValue(2.0, 'moreNegative'), 12);
    expect(b['TR 1051'].min).toBeCloseTo(0.9218, 4);
    expect(b['TR 1051'].max).toBeCloseTo(-0.1127 / compiledCurveValue(2.9, 'lessNegative'), 12);
    expect(b['TR 1051'].max).toBeCloseTo(1.1253, 4);
  });

  it('rounded outward: 0.77 to 1.17 (0014 10.7 (ah) with rounds 19 and 20; 1.18, then 1.13, before); the tunnel symbols and Herrin and Dutton alone gave 0.82 to 1.08', () => {
    expect(COMPILED_CURVE_BAND).toEqual({ low: 0.77, high: 1.17 });
    const e = compiledCurveBandEvidence();
    expect(e.min).toBeCloseTo(0.7731, 4);
    expect(e.max).toBeCloseTo(1.1691, 4);
    expect(COMPILED_CURVE_BAND.low).toBeLessThanOrEqual(e.min);
    expect(COMPILED_CURVE_BAND.high).toBeGreaterThanOrEqual(e.max);
    const before = {
      low: Math.floor(100 * Math.min(e.tunnel.min, e.herrinDutton.min)) / 100,
      high: Math.ceil(100 * Math.max(e.tunnel.max, e.herrinDutton.max)) / 100,
    };
    expect(before).toEqual({ low: 0.82, high: 1.08 });
  });

  it("0008 section 3.3's rounding, outward to two decimals, on synthetic ends: down at the low end, up at the high end, an end on the second decimal kept", () => {
    expect(roundedOutward(0.7731, 1.162)).toEqual({ low: 0.77, high: 1.17 });
    expect(roundedOutward(0.7781, 1.1691)).toEqual({ low: 0.77, high: 1.17 });
    expect(roundedOutward(0.8237, 1.0783)).toEqual({ low: 0.82, high: 1.08 });
    expect(roundedOutward(0.77, 1.17)).toEqual({ low: 0.77, high: 1.17 });
    expect(roundedOutward(0.77 - 1e-12, 1.17 + 1e-12)).toEqual({ low: 0.77, high: 1.17 });
    // Just past a decimal: a guard set too wide (1e-2 in place of 1e-9) would keep these on it.
    expect(roundedOutward(0.7731, 1.1601)).toEqual({ low: 0.77, high: 1.17 });
    expect(roundedOutward(0.76995, 1.1601)).toEqual({ low: 0.76, high: 1.17 });
    const e = compiledCurveBandEvidence();
    expect(COMPILED_CURVE_BAND).toEqual(roundedOutward(e.min, e.max));
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

/**
 * 0008 section 3.3's rule, "every base data set opened at these conditions is used to set this band", applied
 * by 0014 section 10.7 (ah): every body-alone base pressure read twice in the curve's domain (Mach 1.5 to 3.0,
 * cylindrical afterbody, turbulent, no fins, power off), each paired reading, lies inside the band served
 * on the curve. The readings are taken from the data modules where main holds them, and typed here for
 * TR 1051 (first from docs/research/total-drag/data/base_sources.md, so that these tests ran, and failed, on
 * the code before (ah); since round 19 from its pairing, audit/round19/pairing/pairing.csv).
 */
describe('every body-alone base pressure read twice in the domain lies inside the served band (0014 10.7 (ah))', () => {
  const served = (mach: number) =>
    bodyBaseDrag({
      mach,
      afterbody: 'cylinder',
      boundaryLayerAtBase: 'turbulent',
      baseAreaRatio: 1,
    });
  const expectInside = (what: string, mach: number, pB: number) => {
    const r = served(mach);
    const at = `${what}: M ${mach}, P_B ${pB}, served ${r.low.toFixed(4)} to ${r.high.toFixed(4)}`;
    expect(-pB, at).toBeGreaterThanOrEqual(r.low);
    expect(-pB, at).toBeLessThanOrEqual(r.high);
  };

  it("TN 2360's body alone at Mach 1.5 and 2.0: TN 3819 fig. 33 (two readings), fig. 35's no-fin tunnel symbol (three)", () => {
    const fig33 = TN3819_FIG33.filter((p) => p.thicknessRatio === 0 && p.mach <= 2.0);
    const fig35 = [...TN3819_FIG35_TUNNEL, ...TN3819_FIG35_TUNNEL_W1].filter(
      (p) => p.source === 'ref. 26',
    );
    expect(fig33).toHaveLength(4);
    expect(fig35).toHaveLength(6);
    // At M 1.5 these are 1.119 to 1.124 times the curve (-0.1733): outside 0.82 to 1.08, the band before (ah).
    for (const p of fig33) expectInside(`TN 3819 fig. 33, ${p.reading}`, p.mach, p.pB);
    for (const p of fig35) expectInside(`TN 3819 fig. 35, ${p.reading}`, p.mach, p.withoutFins);
  });

  it("the Langley 9 in tunnel's body alone at Mach 2.41 (TN 3819 figs. 33 and 35)", () => {
    const fig33 = TN3819_FIG33.filter((p) => p.thicknessRatio === 0 && p.mach > 2.0);
    const fig35 = [...TN3819_FIG35_TUNNEL, ...TN3819_FIG35_TUNNEL_W1].filter(
      (p) => p.source === 'Langley 9 in',
    );
    expect(fig33.length + fig35.length).toBe(5);
    for (const p of fig33) expectInside(`TN 3819 fig. 33, ${p.reading}`, p.mach, p.pB);
    for (const p of fig35) expectInside(`TN 3819 fig. 35, ${p.reading}`, p.mach, p.withoutFins);
  });

  it("RM L52J21a's unfinned bodies (figs. 31 to 33 (d)), every nose and both readings, the radome at M 1.62 among them", () => {
    expect(L52J21A_FIG31_33D).toHaveLength(20);
    expect(L52J21A_FIG31_33D_OTHER_R).toHaveLength(28);
    // The radome nose at M 1.62: 0.800 and 0.796 times the curve, below 0.82, the band's low end before (ah).
    for (const p of [...L52J21A_FIG31_33D, ...L52J21A_FIG31_33D_OTHER_R]) {
      expectInside(`RM L52J21a ${p.nose}, R ${p.reynolds}, ${p.reading}`, p.mach, p.pB);
    }
  });

  it("RM L52J21a's pairs outside W1's window: held to the pairing record, each within its combined error", () => {
    // docs/research/total-drag/data/w1_round7_pairing_output.txt: every pair of figs. 31 to 33 (d) at R 7e6
    // to 9.5e6, the first reading (R to 0.01e6, +-0.002) against round 7's (R to 0.01e6, its error).
    const text = readFileSync('docs/research/total-drag/data/w1_round7_pairing_output.txt', 'utf8');
    const block = text.slice(
      text.indexOf('=== RM L52J21a figs. 31 to 33 (d)'),
      text.indexOf('=== The zero'),
    );
    let mach = 0;
    const pairs: {
      mach: number;
      nose: string;
      r1: number;
      p1: number;
      r7: number;
      p7: number;
      e7: number;
    }[] = [];
    for (const line of block.split('\n')) {
      const m = /^ {2}M ([0-9.]+)$/.exec(line);
      if (m) mach = Number(m[1]);
      const q =
        /^ {4}(conical|ogive|radome) +R ([0-9.]+) (-[0-9.]+) \(score [0-9.]+\) +round 7 \S+ R ([0-9.]+) (-[0-9.]+) \+-([0-9.]+)/.exec(
          line,
        );
      if (q) {
        pairs.push({
          mach,
          nose: q[1]!,
          r1: Number(q[2]) * 1e6,
          p1: Number(q[3]),
          r7: Number(q[4]) * 1e6,
          p7: Number(q[5]),
          e7: Number(q[6]),
        });
      }
    }
    expect(pairs).toHaveLength(24);
    const all = [...L52J21A_FIG31_33D, ...L52J21A_FIG31_33D_OTHER_R];
    const firsts = all.filter((p) => p.reading === 'w1 first');
    const sevens = all.filter((p) => p.reading === 'round 7');
    expect(firsts).toHaveLength(24);
    expect(sevens).toHaveLength(24);
    for (const p of pairs) {
      const first = firsts.filter(
        (x) => x.mach === p.mach && x.nose === p.nose && Math.abs(x.reynolds - p.r1) < 0.006e6,
      );
      const seven = sevens.filter(
        (x) => x.mach === p.mach && x.nose === p.nose && Math.abs(x.reynolds - p.r7) < 0.006e6,
      );
      expect(first.map((x) => x.pB)).toEqual([p.p1]);
      expect(seven.map((x) => [x.pB, x.error])).toEqual([[p.p7, p.e7]]);
      expect(Math.abs(p.p1 - p.p7)).toBeLessThanOrEqual(0.002 + p.e7 + 1e-12);
    }
    // W1's window holds the pairs within 0.6e6 of R 8.06e6 (by the first reading's R), the rest lie outside.
    for (const x of L52J21A_FIG31_33D_OTHER_R.filter((p) => p.reading === 'w1 first')) {
      expect(Math.abs(x.reynolds - 8.06e6)).toBeGreaterThan(0.6e6);
    }
    // Read once, not used: round 7's second square at M 1.93, R 7.33e6, -0.1494.
    expect(all.some((x) => x.pB === -0.1494)).toBe(false);
  });

  it('TR 1051 fig. 23(b), the thinnest measured sting symbol at M 1.5, 2.0 and 2.9, both blind readings (round 19)', () => {
    // audit/round19/pairing/pairing.csv, the first symbol of each Mach number, readers A and B. At M 2.9 they
    // are 1.124 and 1.125 times the curve.
    const readings: readonly [number, number][] = [
      [1.5, -0.1722],
      [1.5, -0.1723],
      [2.0, -0.138],
      [2.0, -0.1379],
      [2.9, -0.1126],
      [2.9, -0.1127],
    ];
    for (const [mach, pB] of readings) expectInside('TR 1051 fig. 23(b)', mach, pB);
  });

  it("TR 1051's data held to round 19's pairing; the faired values (ah) first used kept, superseded, as the record", () => {
    const rows = csv('docs/research/total-drag/audit/round19/pairing/pairing.csv').slice(1);
    const thinnest = rows
      .map((l) => l.split(','))
      .filter((c) => c[2] === '1')
      .map((c) => ({
        mach: Number(c[0]),
        dOverH: [Number(c[4]), Number(c[6])],
        a: Number(c[12]),
        aErr: Number(c[13]),
        b: Number(c[14]),
        bErr: Number(c[15]),
        verdict: c[20],
      }));
    expect(thinnest.map((t) => t.mach)).toEqual([1.5, 2.0, 2.9]);
    TR1051_FIG23B_THINNEST.forEach((p, k) => {
      const t = thinnest[k]!;
      expect(p.mach).toBe(t.mach);
      expect([...p.dOverH]).toEqual(t.dOverH);
      expect([p.readerA, p.errorA, p.readerB, p.errorB]).toEqual([t.a, t.aErr, t.b, t.bErr]);
      expect(t.verdict).toBe('AGREES');
    });
    // Each Mach number's first symbol lies at d/h 0.30 or above: at 0.35 for M 1.5, 0.30 for M 2.0 and 2.9.
    expect(TR1051_FIG23B_THINNEST.map((p) => Math.round(100 * p.dOverH[1]) / 100)).toEqual([
      0.35, 0.3, 0.3,
    ]);
    // Superseded: the readings at d/h 0.35 on the faired curves. At M 1.5, the same symbol, they lie 0.0017 to
    // 0.0038 more negative than the blind pair, beyond its summed errors (0.0008).
    expect(TR1051_FIG23B_FAIRED_SUPERSEDED.map((p) => [p.mach, p.first, p.audit])).toEqual([
      [1.5, -0.174, -0.176],
      [2.0, -0.141, -0.147],
      [2.9, -0.115, -0.118],
    ]);
    const m15 = TR1051_FIG23B_THINNEST[0]!;
    for (const v of [
      TR1051_FIG23B_FAIRED_SUPERSEDED[0]!.first,
      TR1051_FIG23B_FAIRED_SUPERSEDED[0]!.audit,
    ]) {
      expect(Math.min(...[m15.readerA, m15.readerB].map((x) => x - v))).toBeGreaterThan(
        m15.errorA + m15.errorB,
      );
    }
    expect(BODY_ALONE_IN_DOMAIN.some((r) => r.pB === -0.118 || r.pB === -0.115)).toBe(false);
  });

  it('TN 2360 figs. 5 and 7, the body alone at every tripped station, Mach 1.5 and 2.0, every reading of both blind readers (round 20)', () => {
    // At M 1.5 they are 1.125 to 1.169 times the curve (-0.1733), three of the five symbols above 1.13, the
    // band's end before round 20.
    expect(TN2360_FIG5_FIG7_BODY_ALONE).toHaveLength(10);
    for (const p of TN2360_FIG5_FIG7_BODY_ALONE) {
      for (const pB of [...p.readingsA, ...p.readingsB]) {
        expectInside(`TN 2360 fig. ${p.figure}, R ${p.reynolds?.[0] ?? '-'}`, p.mach, pB);
      }
    }
  });

  it("TN 2360 figs. 5 and 7 held to round 20's pairing; round 6's single readings kept, superseded, as the record", () => {
    // A CSV line with quoted fields.
    const fields = (line: string) => {
      const out: string[] = [];
      let cur = '';
      let quoted = false;
      for (let k = 0; k < line.length; k++) {
        const ch = line[k]!;
        if (quoted) {
          if (ch === '"' && line[k + 1] === '"') {
            cur += '"';
            k++;
          } else if (ch === '"') quoted = false;
          else cur += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') {
          out.push(cur);
          cur = '';
        } else cur += ch;
      }
      out.push(cur);
      return out;
    };
    const [head, ...rows] = csv('docs/research/total-drag/audit/round20/pairing/pairing.csv').map(
      fields,
    );
    const col = (name: string) => head!.indexOf(name);
    const alone = rows.filter((c) => ['tail off', 'without tail'].includes(c[col('config_key')]!));
    expect(alone).toHaveLength(10);
    expect(rows).toHaveLength(60);
    expect(rows.every((c) => c[col('verdict')] === 'AGREES')).toBe(true);
    alone.forEach((c, k) => {
      const p = TN2360_FIG5_FIG7_BODY_ALONE[k]!;
      const figure = c[col('figure')] === '7' ? '7' : `${c[col('figure')]}(${c[col('panel')]})`;
      expect([p.figure, p.mach]).toEqual([figure, Number(c[col('mach')])]);
      const readings = [...c[col('all_readings')]!.matchAll(/([AB])\d+\(x=[-\d.]+ y=([-\d.]+)\)/g)];
      expect([...p.readingsA]).toEqual(
        readings.filter((r) => r[1] === 'A').map((r) => Number(r[2])),
      );
      expect([...p.readingsB]).toEqual(
        readings.filter((r) => r[1] === 'B').map((r) => Number(r[2])),
      );
      expect([p.errorA, p.errorB]).toEqual([
        Number(c[col('A_y_error')]),
        Number(c[col('B_y_error')]),
      ]);
      if (p.figure === '7') expect(p.reynolds).toBeUndefined();
      else {
        expect([...p.reynolds!]).toEqual([
          Math.round(1e3 * Number(c[col('A_x')])) * 1e3,
          Math.round(1e3 * Number(c[col('B_x')])) * 1e3,
        ]);
      }
    });
    // Every one enters; nothing of round 6 does.
    const tn2360 = BODY_ALONE_IN_DOMAIN.filter((r) => r.source.startsWith('TN 2360 fig.'));
    expect(tn2360).toHaveLength(23);
    expect(tn2360.every((r) => /, round 20 [AB]\d$/.test(r.source))).toBe(true);
    // Superseded: round 6's readings (audit/round6/readings/), which (ah) listed as checked and not used.
    const round6 = (file: string, series: string) =>
      csv(`docs/research/total-drag/audit/round6/readings/${file}`)
        .slice(1)
        .map((l) => l.split(','))
        .filter((c) => c[1] === series)
        .map((c) => [Number(c[2]), Number(c[3])]);
    expect(
      TN2360_FIG5_FIG7_ROUND6_SUPERSEDED.map((p) => [p.reynolds ?? p.mach, p.pB]).sort(
        (x, y) => x[0]! - y[0]! || x[1]! - y[1]!,
      ),
    ).toEqual(
      [
        ...round6('tn2360_fig5a.csv', 'tail off (dome)'),
        ...round6('tn2360_fig5b.csv', 'tail off (dome)'),
        ...round6('tn2360_fig7.csv', 'present tests without tail (circle)').map(([m, pB]) => [
          Math.round(10 * m!) / 10,
          pB,
        ]),
      ].sort((x, y) => x[0]! - y[0]! || x[1]! - y[1]!),
    );
  });

  it("TN 3819 fig. 18's tunnel symbols at M 1.5 to 3.0 and Herrin and Dutton, as before", () => {
    for (const s of TN3819_FIG18_TUNNEL.filter((t) => t.mach <= 3.0)) {
      expectInside('fig. 18 symbol, first', s.mach, s.first);
      expectInside('fig. 18 symbol, audit', s.mach, s.audit);
    }
    const q = 0.5 * 1.4 * 2.46 ** 2;
    for (const ratio of [0.553, 0.575]) expectInside('Herrin and Dutton', 2.46, (ratio - 1) / q);
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
      expect(r.low).toBeCloseTo(0.77 * cd - e, 15);
      expect(r.high).toBeCloseTo(1.17 * cd + e, 15);
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
      fins: {
        count: 4,
        thicknessRatio: 0.08,
        section: 'other',
        tanLeadingEdge: 0,
        tanTrailingEdge: 0,
        trailingEdgeAheadOfBase: 0,
      },
    });
    const f = r.finsOnBase!;
    const q = -compiledCurveValue(2.4, 'lessNegative');
    expect(r.cd).toBeCloseTo(q * f.nominal, 15);
    expect(r.low).toBeCloseTo(r.cd - 0.23 * r.cd + (f.low - f.nominal) * q, 15);
    expect(r.high).toBeCloseTo(r.cd + 0.17 * r.cd + (f.high - f.nominal) * q, 15);
    expect(r.labels[1]).toMatch(/^an analogy, not a measurement/);
  });

  it('never reaches the vacuum bound 2 / (gamma M^2): the high end at most 0.9486 of it (M 3.0, fins at the base; 0.9199 with 0.77 to 1.13, 0.8840 before 0014 10.7 (ah), 0.9535 before the correction of 0010 section 11), 0.711 without fins (0.686 with 1.13, 0.656 before (ah))', () => {
    const fins = {
      count: 4,
      thicknessRatio: 0.08,
      section: 'other' as const,
      tanLeadingEdge: 0,
      tanTrailingEdge: 0,
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
    expect(withFins).toBeCloseTo(0.9486, 4);
    expect(at(3.0, true).high / at(3.0, true).vacuum).toBe(withFins);
    expect(Math.round(1000 * without) / 1000).toBe(0.711);
  });

  it('fins a chord or more ahead: the plain curve withdrawn (2026-10-27), refused', () => {
    // Until 2026-10-27 these fins took the plain curve: 0.1447 (0.1187 to 0.1563) a chord ahead
    // at Mach 2.0, a band that misses TN 2360's measurement there (0014 section 10.7 (ad)). Now a
    // chord ahead takes the rebuilt factor, which needs the section (not given here), and beyond a
    // chord nothing is measured: refused at every Mach number the curve covers.
    const fins = (x: number) => ({
      count: 4,
      thicknessRatio: 0.05,
      section: 'other' as const,
      tanLeadingEdge: 0,
      tanTrailingEdge: 0,
      trailingEdgeAheadOfBase: x,
    });
    for (const mach of [1.0, 1.4, 1.5, 2.0, 2.5, 3.0]) {
      for (const x of [1, 1.0001, 1.2, 2, 5]) {
        refusedWith('fins-near-base', () =>
          bodyBaseDrag({
            mach,
            afterbody: 'cylinder',
            boundaryLayerAtBase: 'turbulent',
            baseAreaRatio: 1,
            fins: fins(x),
          }),
        );
      }
    }
    let message = '';
    try {
      bodyBaseDrag({
        mach: 2.0,
        afterbody: 'cylinder',
        boundaryLayerAtBase: 'turbulent',
        baseAreaRatio: 1,
        fins: fins(2),
      });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(
      /^fins ending more than a root chord ahead of the base \(2 root chords\): /,
    );
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
          fins: {
            count: 4,
            thicknessRatio: 0.08,
            section: 'other',
            tanLeadingEdge: 0,
            tanTrailingEdge: 0,
            trailingEdgeAheadOfBase: x,
          },
        }),
      );
    }
  });
});
