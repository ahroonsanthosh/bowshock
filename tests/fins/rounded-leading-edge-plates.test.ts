/**
 * Rounded leading edges on flat, tapered and swept fins
 * (src/fins/rounded-leading-edge.ts; docs/design/0016-fin-edges-of-flat-plates.md,
 * W4): the new readings held to their data file, TN 2960's other front
 * sides and what they show, the yawed-cylinder checks and the sweep
 * allowance recomputed from them, the plate's nose, the swept term and its
 * band, and the refusal of normal Mach numbers below 1.0 with its reasons
 * (1.0 to 1.49: rounded-leading-edge-transonic.test.ts).
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FinRefusal } from '../../src/fins/refusal';
import {
  RM_A55H31_FIG11,
  RM_A55H31_FIG11_SECOND,
  RM_A55H31_FIG12,
  RM_A55H31_FIG12_SECOND,
  RM_A55H31_FIG12_THIRD_LOOK,
  RM_A55H31_TABLE2,
} from '../../src/fins/rm-a55h31';
import {
  pitotPressureCoefficient,
  REYNOLDS_ALLOWANCE,
  ROUNDED_EDGE_BAND,
  roundedLeadingEdgeDrag,
  stagnationPressureCoefficient,
  SWEEP_ALLOWANCE,
  SWEEP_ALLOWANCE_SERVED,
  SMALLEST_TESTED_SWEEP,
  sweepAllowanceAt,
  SWEEP_LIMIT_DEGREES,
  stagnationChecks,
  sweepChecks,
  tn2960FrontSides,
} from '../../src/fins/rounded-leading-edge';
import { TN2960_FRONT_SIDES, TN2960_FRONT_SIDES_SECOND } from '../../src/fins/tn2960';

const deg = Math.PI / 180;
/** A csv line's fields, a quoted field taken whole. */
const fields = (line: string) => {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
};
const rows = readFileSync('docs/research/total-drag/data/fin_edges_w34.csv', 'utf8')
  .split('\n')
  .filter((l) => l.trim() !== '' && !l.startsWith('#') && !l.startsWith('source,'))
  .map(fields);

const failure = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(FinRefusal);
    return e as FinRefusal;
  }
  throw new Error('not refused');
};

describe('the readings, against the data file (first readings)', () => {
  it("TN 2960 figs. 5(a), 5(b), 5(d), 5(e): every point of the csv's sets", () => {
    for (const c of TN2960_FRONT_SIDES) {
      const set = rows.filter((r) => r[0] === 'TN 2960' && r[2]!.startsWith(c.figure));
      const read = set.filter((r) => Number(r[3]) === c.mach && Number(r[5]) <= 92);
      const found = c.points.every((p) =>
        read.some((r) => Number(r[5]) === p.theta && Math.abs(Number(r[7]) - p.p) < 1e-9),
      );
      expect(found, `${c.figure} ${c.item}`).toBe(true);
    }
    expect(TN2960_FRONT_SIDES.length).toBe(14);
  });

  it('RM A55H31 figs. 11 and 12', () => {
    const of = (fig: string) =>
      rows
        .filter((r) => r[0] === 'RM A55H31' && r[1] === fig)
        .map((r) => [Number(r[3]), Number(r[5]), Number(r[7])]);
    expect(of('12')).toEqual(RM_A55H31_FIG12.map((p) => [p.mach, p.yaw, p.value]));
    expect(of('11')).toEqual(RM_A55H31_FIG11.map((p) => [p.mach, p.yaw, p.value]));
  });

  it("table II's stagnation pressures agree with Rayleigh's at yaw 0 (6.54 / 0.319 at M 3.94: 20.50 against 20.45)", () => {
    const t = RM_A55H31_TABLE2[0]!;
    const rayleigh = 1 + 0.7 * t.mach * t.mach * pitotPressureCoefficient(t.mach);
    expect(Math.abs(t.p[0]! / t.pInf / rayleigh - 1)).toBeLessThan(0.003);
  });
});

describe("TN 2960's other front sides (0016 section 2)", () => {
  const r = tn2960FrontSides();
  const by = (figure: string, item: string) =>
    r.find((x) => x.figure === figure && x.item === item)!;

  it('at supersonic Mach numbers they lie inside the band, 0.99 to 1.06: no change to it', () => {
    const sup = r.filter((x) => x.mach > 1);
    expect(sup.length).toBe(6);
    for (const x of sup) {
      expect(x.ratio).toBeGreaterThanOrEqual(ROUNDED_EDGE_BAND.low);
      expect(x.ratio).toBeLessThanOrEqual(ROUNDED_EDGE_BAND.high);
    }
    // fig. 5(e) at M 1.49 and 2.90: 0.994, 1.049; fig. 5(d) at M 1.98 by Reynolds number: 1.035 to 1.056.
    expect(Math.round(1000 * by('5(e)', 'M 1.49, between the symbols').ratio) / 1000).toBe(0.994);
    expect(Math.round(1000 * by('5(e)', 'M 2.90, between the symbols').ratio) / 1000).toBe(1.049);
    const d = r.filter((x) => x.figure === '5(d)' && x.item.includes('R '));
    expect(d.map((x) => Math.round(1000 * x.ratio) / 1000)).toEqual([1.035, 1.035, 1.056]);
  });

  it('at subsonic Mach numbers: 0.10 to 0.39 of modified Newtonian below the critical Reynolds number, a thrust above it', () => {
    const below = r.filter((x) => x.mach < 1 && !x.item.includes('above'));
    expect(below.length).toBe(6);
    expect(Math.round(100 * Math.min(...below.map((x) => x.ratio))) / 100).toBe(0.1);
    expect(Math.round(100 * Math.max(...below.map((x) => x.ratio))) / 100).toBe(0.39);
    const above = r.filter((x) => x.mach < 1 && x.item.includes('above'));
    expect(above.map((x) => Math.round(100 * x.ratio) / 100)).toEqual([-0.43, -0.4]);
    // Rising with Mach number at fig. 5(b)'s four: 0.15, 0.18, 0.28, 0.39.
    const b = r.filter((x) => x.figure === '5(b)').sort((p, q) => p.mach - q.mach);
    expect(b.map((x) => Math.round(100 * x.ratio) / 100)).toEqual([0.15, 0.18, 0.28, 0.39]);
  });

  it('with the second readings (0016 section 13): 0.10 to 0.41 below the critical Reynolds number, -0.43 to -0.40 above', () => {
    const second = TN2960_FRONT_SIDES_SECOND;
    // Every set but fig. 5(d)'s diamonds has a second reading.
    expect(second.length).toBe(13);
    for (const s of second)
      expect(r.some((x) => x.figure === s.figure && x.item === s.item)).toBe(true);
    const both = (f: (x: { readonly item: string; readonly mach: number }) => boolean) => [
      ...r.filter(f).map((x) => x.ratio),
      ...second
        .filter((s) =>
          f({
            item: s.item,
            mach: r.find((x) => x.item === s.item && x.figure === s.figure)!.mach,
          }),
        )
        .map((s) => s.ratio),
    ];
    const below = both((x) => x.mach < 1 && !x.item.includes('above'));
    expect([Math.min(...below), Math.max(...below)].map((v) => Math.round(100 * v) / 100)).toEqual([
      0.1, 0.41,
    ]);
    const above = both((x) => x.mach < 1 && x.item.includes('above'));
    expect([Math.min(...above), Math.max(...above)].map((v) => Math.round(100 * v) / 100)).toEqual([
      -0.43, -0.4,
    ]);
    // Supersonic: fig. 5(d)'s inside the band on both; fig. 5(e)'s M 1.49 symbols (the second
    // read symbols only, which sit 0.015 below the fairing on average) at 0.982.
    const sup = second.filter(
      (s) => r.find((x) => x.item === s.item && x.figure === s.figure)!.mach > 1,
    );
    for (const s of sup.filter((s) => s.figure === '5(d)')) {
      expect(s.ratio).toBeGreaterThanOrEqual(ROUNDED_EDGE_BAND.low);
      expect(s.ratio).toBeLessThanOrEqual(ROUNDED_EDGE_BAND.high);
    }
    expect(sup.find((s) => s.item.startsWith('M 1.49'))!.ratio).toBe(0.982);
  });

  it('the stagnation coefficient: isentropic below Mach 1, continuous with Rayleigh at 1', () => {
    expect(stagnationPressureCoefficient(0.7)).toBeCloseTo(
      ((1 + 0.2 * 0.49) ** 3.5 - 1) / 0.343,
      14,
    );
    expect(stagnationPressureCoefficient(1 - 1e-9)).toBeCloseTo(pitotPressureCoefficient(1), 7);
  });
});

describe('the independence principle on yawed cylinders (RM A55H31 figs. 11, 12)', () => {
  const checks = sweepChecks();

  it('r on the first reading, exact gauge conversion, at the stated yaws: 1.0685 (30 deg, M 3.9); 0.9958, 1.0073, 1.0303, 0.9869 (M 6.86); set apart: 1.1278, 1.2633, 1.1698', () => {
    expect(checks.map((c) => Math.round(1e4 * c.r) / 1e4)).toEqual([
      1.0685, 1.1278, 1.2633, 0.9958, 1.0073, 1.0303, 0.9869, 1.1698,
    ]);
    // r at the yaws the reports state (fig. 10's legend, p. 10; TN 3861 fig. 5), not where fig. 12
    // draws the symbols.
    expect(checks.map((c) => c.yaw)).toEqual([30, 45, 60, 14.3, 29.6, 45.1, 59.8, 75.1]);
    expect(checks.filter((c) => c.flag !== undefined).map((c) => c.readYaw)).toEqual([
      45.1, 60.1, 75.5,
    ]);
  });

  it("the exact conversion reproduces table II's gauge ratio at 30 deg (0.6487) from its absolute one", () => {
    // Table II's pressures (mm Hg), the 30 deg run scaled to the unyawed run's p_inf.
    const t0 = RM_A55H31_TABLE2[0]!;
    const t30 = RM_A55H31_TABLE2[1]!;
    const tz = (v: readonly number[]) => {
      let sum = 0;
      for (let k = 0; k < 6; k++) {
        const a = 15 * k * deg;
        const b = 15 * (k + 1) * deg;
        sum += 0.5 * (v[k]! * Math.cos(a) + v[k + 1]! * Math.cos(b)) * (b - a);
      }
      return sum;
    };
    const p30 = t30.p.map((x) => (x * t0.pInf) / t30.pInf);
    const L = 30 * deg;
    const absolute = (Math.cos(L) * tz(p30)) / tz(t0.p);
    const direct = (Math.cos(L) * (tz(p30) - t0.pInf)) / (tz(t0.p) - t0.pInf);
    const P = t0.p[0]! / t0.pInf;
    const ig = tz(t0.p) / t0.p[0]!;
    expect((absolute * P * ig - Math.cos(L)) / (P * ig - 1)).toBeCloseTo(direct, 12);
    expect(Math.round(1e4 * direct) / 1e4).toBe(0.6487);
  });

  it('the model is cos^3 times the pitot coefficients on the normal Mach number', () => {
    for (const c of checks) {
      const L = c.yaw * deg;
      expect(c.normalMach).toBeCloseTo(c.mach * Math.cos(L), 14);
      expect(c.model).toBeCloseTo(
        (Math.cos(L) ** 3 * pitotPressureCoefficient(c.normalMach)) /
          pitotPressureCoefficient(c.mach),
        14,
      );
    }
  });

  it('on the second reading, at the stated yaws: r 1.0720; 0.9950, 1.0117, 1.0335, 1.0100; set apart: 1.1287, 1.2101, 1.0130', () => {
    const second = sweepChecks(RM_A55H31_FIG12_SECOND);
    expect(second.map((c) => Math.round(1e4 * c.r) / 1e4)).toEqual([
      1.072, 1.1287, 1.2101, 0.995, 1.0117, 1.0335, 1.01, 1.013,
    ]);
    expect(second.filter((c) => c.flag !== undefined).map((c) => c.yaw)).toEqual([45, 60, 75.1]);
    second.forEach((c, i) => {
      expect(c.source).toBe(checks[i]!.source);
      expect(c.yaw).toBe(checks[i]!.yaw);
      // Fig. 12 draws every symbol below the stated yaw, 0.15 to 0.25 deg at all but 30 and 75
      // deg (0.09, 0.04; 0016 section 18).
      expect(c.yaw - c.readYaw).toBeGreaterThan(0.03);
      expect(c.yaw - c.readYaw).toBeLessThan(0.26);
    });
  });

  it('the measured allowance: 0.98 to 1.08, every point the reports do not set apart, both readings (M_n 3.38 to 6.65)', () => {
    expect(SWEEP_ALLOWANCE).toEqual({ low: 0.98, high: 1.08 });
    const used = checks.filter((c) => c.flag === undefined);
    expect(Math.min(...used.map((c) => c.normalMach))).toBeGreaterThan(3.37);
    expect(Math.max(...used.map((c) => c.yaw))).toBeLessThanOrEqual(SWEEP_LIMIT_DEGREES);
  });

  it("the third looks at the present tests' 45 and 60 deg rings place them where the second reading does; at the stated yaws r 1.1278, 1.2167", () => {
    const third = sweepChecks(RM_A55H31_FIG12_THIRD_LOOK);
    const second = sweepChecks(RM_A55H31_FIG12_SECOND);
    expect(third.map((c) => Math.round(1e4 * c.r) / 1e4)).toEqual([1.1278, 1.2167]);
    third.forEach((c, i) => {
      // Within 0.06 deg and 0.001 of the second reading as drawn; the first reading's 60 deg
      // ratio (0.170) is 0.005 high, misread.
      expect(Math.abs(c.readYaw - second[i + 1]!.readYaw)).toBeLessThan(0.06);
      expect(
        Math.abs(RM_A55H31_FIG12_THIRD_LOOK[i]!.value - RM_A55H31_FIG12_SECOND[i + 1]!.value),
      ).toBeLessThan(0.001);
    });
    expect(checks[2]!.r - third[1]!.r).toBeGreaterThan(0.04);
  });

  it('the served allowance at 60 deg (every served M_n is below 3.38): 0.95 to 1.22, containing every yawed datum at served sweeps and normal Mach numbers', () => {
    expect(SWEEP_ALLOWANCE_SERVED).toEqual({ low: 0.95, high: 1.22 });
    // RM A55H31's own tests at 45 and 60 deg (M_n 2.76, 1.95), the second reading and the third
    // looks at the stated yaws: 1.128 to 1.217. The first reading's 60 deg ratio, misread, set
    // aside (1.263).
    const atServed = [
      ...sweepChecks(RM_A55H31_FIG12_SECOND),
      ...sweepChecks(RM_A55H31_FIG12_THIRD_LOOK),
    ].filter((c) => c.yaw <= SWEEP_LIMIT_DEGREES + 0.5 && c.normalMach <= 3.0);
    expect(atServed.map((c) => Math.round(c.yaw))).toEqual([45, 60, 45, 60]);
    for (const c of atServed) {
      expect(c.r).toBeGreaterThanOrEqual(SWEEP_ALLOWANCE_SERVED.low);
      expect(c.r).toBeLessThanOrEqual(SWEEP_ALLOWANCE_SERVED.high);
    }
    // TN 3861's one crossflow point at a served sweep (Lord and Ulmann, about 60 deg, M_c 1.98 to
    // 2.03), its front side estimated from figs. 16 and 17 on both readings of fig. 16
    // (data/fin_edges_w34.md section 4): 0.995 to 1.079 of the unyawed, inside too.
    for (const r of [0.995, 1.079]) {
      expect(r).toBeGreaterThanOrEqual(SWEEP_ALLOWANCE_SERVED.low);
      expect(r).toBeLessThanOrEqual(SWEEP_ALLOWANCE_SERVED.high);
    }
  });

  it('the allowance: the full 0.95 to 1.22 from 14.3 deg, the smallest yaw tested, up, tapered linearly below it to none unswept; every datum inside', () => {
    expect(SMALLEST_TESTED_SWEEP).toBe(14.3);
    expect(sweepAllowanceAt(0)).toEqual({ low: 1, high: 1 });
    for (const d of [14.3, 20, 30, 45, 60])
      expect(sweepAllowanceAt(d)).toEqual(SWEEP_ALLOWANCE_SERVED);
    const half = sweepAllowanceAt(7.15);
    expect(half.low).toBeCloseTo(0.975, 12);
    expect(half.high).toBeCloseTo(1.11, 12);
    const data = [
      ...checks.filter((c) => c.flag === undefined),
      ...sweepChecks(RM_A55H31_FIG12_SECOND),
      ...sweepChecks(RM_A55H31_FIG12_THIRD_LOOK),
    ].filter((c) => c.yaw <= SWEEP_LIMIT_DEGREES);
    expect(data.length).toBe(14);
    expect(Math.min(...data.map((c) => c.yaw))).toBe(SMALLEST_TESTED_SWEEP);
    for (const c of data) {
      expect(c.r).toBeGreaterThanOrEqual(SWEEP_ALLOWANCE_SERVED.low);
      expect(c.r).toBeLessThanOrEqual(SWEEP_ALLOWANCE_SERVED.high);
    }
  });

  it("fig. 11 against Rayleigh's stagnation pressure at the normal Mach number: within 4% where unflagged, 10% to 13% high at 60 deg (M 3.9)", () => {
    const s = [...stagnationChecks(), ...stagnationChecks(RM_A55H31_FIG11_SECOND)];
    const at = (src: string, yaw: number) =>
      s.filter((c) => c.source === src && Math.abs(c.yaw - yaw) < 1).map((c) => c.ratio);
    for (const v of [
      ...at('reference 1', 30),
      ...at('reference 1', 45),
      ...at('present tests', 30),
    ]) {
      expect(Math.abs(v - 1)).toBeLessThan(0.04);
    }
    expect(at('present tests', 60).map((v) => Math.round(100 * v) / 100)).toEqual([1.1, 1.13]);
  });
});

describe('the nose term on flat and swept fins', () => {
  it('a flat plate (face angle 0): (2/3) Cp_pitot (2 r) per unit span exactly', () => {
    const t = roundedLeadingEdgeDrag({
      mach: 2.2,
      radius: 0.0015,
      faceAngle: 0,
      tanLeadingEdgeSweep: 0,
      reynoldsOnDiameter: 2e5,
    });
    expect(t.dragPerSpan).toBeCloseTo((2 / 3) * pitotPressureCoefficient(2.2) * 0.003, 16);
    expect(t.band).toEqual(ROUNDED_EDGE_BAND);
    expect(t.sweepDegrees).toBe(0);
  });

  it('swept: at the normal Mach number on the normal dynamic pressure; band 0.940 to 1.294 (the allowance at 40 deg)', () => {
    const sweep = 40;
    const t = roundedLeadingEdgeDrag({
      mach: 2.8,
      radius: 0.0015,
      faceAngle: 0,
      tanLeadingEdgeSweep: Math.tan(sweep * deg),
      reynoldsOnDiameter: 2e5,
    });
    const mn = 2.8 * Math.cos(sweep * deg);
    expect(t.normalMach).toBeCloseTo(mn, 14);
    expect(t.dragPerSpan).toBeCloseTo(
      (2 / 3) * pitotPressureCoefficient(mn) * Math.cos(sweep * deg) ** 2 * 0.003,
      16,
    );
    // Re_n 1.53e5: measured (TN 2960's Reynolds numbers, M_n 2.14).
    expect(t.regime).toBe('measured');
    expect(t.reynoldsOnDiameter).toBeCloseTo(2e5 * Math.cos(sweep * deg), 8);
    const a = sweepAllowanceAt(sweep);
    expect(t.band).toEqual({
      low: Math.floor(0.99 * a.low * 1000 + 1e-9) / 1000,
      high: Math.ceil(1.06 * a.high * 1000 - 1e-9) / 1000,
    });
    expect(t.band).toEqual({ low: 0.94, high: 1.294 });
    expect(t.label).toMatch(/swept 40\.0 deg: the independence principle/);
    expect(t.label).toMatch(
      /RM A55H31 figs\. 11, 12\), the band widened by 0\.950 to 1\.220 for it \(0\.95 to 1\.22 from 14\.3 deg, the smallest yaw tested, tapered below it to meet the unswept band\), the sweep allowance extrapolated in normal Mach number/,
    );
    expect(t.label).not.toMatch(/read once/);
    expect(t.label).toMatch(
      /and TN 3861's crossflow points; no yawed datum below M_n 1\.95 at a served sweep\) \(0016\)$/,
    );
    expect(t.label.startsWith('an analogy, not a measurement')).toBe(true);
  });

  it('swept and extrapolated in Reynolds number (normal component below 1e5): 0.912 to 1.330', () => {
    const t = roundedLeadingEdgeDrag({
      mach: 2.8,
      radius: 0.0015,
      faceAngle: 0,
      tanLeadingEdgeSweep: Math.tan(40 * deg),
      reynoldsOnDiameter: 1.2e5,
    });
    expect(t.regime).toBe('extrapolated in Reynolds number');
    expect(t.band).toEqual({
      low:
        Math.floor(
          (ROUNDED_EDGE_BAND.low - REYNOLDS_ALLOWANCE) * sweepAllowanceAt(40).low * 1000 + 1e-9,
        ) / 1000,
      high:
        Math.ceil(
          (ROUNDED_EDGE_BAND.high + REYNOLDS_ALLOWANCE) * sweepAllowanceAt(40).high * 1000 - 1e-9,
        ) / 1000,
    });
    expect(t.band).toEqual({ low: 0.912, high: 1.33 });
  });

  it('refuses a normal Mach number below 1.0 (1.0 to 1.49: section 11), with the subsonic reasons', () => {
    const e = failure(() =>
      roundedLeadingEdgeDrag({
        mach: 1.3,
        radius: 0.0015,
        faceAngle: 0,
        tanLeadingEdgeSweep: Math.tan(45 * deg),
        reynoldsOnDiameter: 2e5,
      }),
    );
    expect(e.reason).toBe('leading-edge-range');
    expect(e.message).toMatch(/normal to the edge, M cos\(sweep\), 0\.9192 is below 1\.0/);
    expect(e.message).toMatch(
      /0\.10 to 0\.41 of the modified-Newtonian value at\s+M 0\.05 to 0\.70/,
    );
  });

  it('bounds sweeps beyond 60 deg (0016 section 21.2); takes 60 itself as the measured term', () => {
    const at = (s: number) => () =>
      roundedLeadingEdgeDrag({
        mach: 3.0,
        radius: 0.0015,
        faceAngle: 0,
        tanLeadingEdgeSweep: Math.tan(s * deg),
        reynoldsOnDiameter: 2e5,
      });
    expect(at(60.2)().bounded).toBeDefined();
    expect(at(60)().bounded).toBeUndefined();
    expect(at(60)().normalMach).toBeCloseTo(1.5, 12);
  });
});
