/**
 * Rounded leading edges on flat, tapered and swept fins
 * (src/fins/rounded-leading-edge.ts; docs/design/0016-fin-edges-of-flat-plates.md,
 * W4): the new readings held to their data file, TN 2960's other front
 * sides and what they show, the yawed-cylinder checks and the sweep
 * allowance recomputed from them, the plate's nose, the swept term and its
 * band, and the refusal of normal Mach numbers below 1.49 with its reasons.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FinRefusal } from '../../src/fins/refusal';
import { RM_A55H31_FIG11, RM_A55H31_FIG12, RM_A55H31_TABLE2 } from '../../src/fins/rm-a55h31';
import {
  pitotPressureCoefficient,
  REYNOLDS_ALLOWANCE,
  ROUNDED_EDGE_BAND,
  roundedLeadingEdgeDrag,
  stagnationPressureCoefficient,
  SWEEP_ALLOWANCE,
  SWEEP_LIMIT_DEGREES,
  sweepChecks,
  tn2960FrontSides,
} from '../../src/fins/rounded-leading-edge';
import { TN2960_FRONT_SIDES } from '../../src/fins/tn2960';

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

  it('r = 1.067 (30 deg, M 3.9); 0.998, 1.007, 1.034, 0.990 (14 to 60 deg, M 6.86); set apart: 1.120, 1.226, 0.866', () => {
    expect(checks.map((c) => Math.round(1000 * c.r) / 1000)).toEqual([
      1.067, 1.12, 1.226, 0.998, 1.007, 1.034, 0.99, 0.866,
    ]);
    expect(checks.filter((c) => c.flag !== undefined).map((c) => c.yaw)).toEqual([
      45.1, 60.1, 75.5,
    ]);
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

  it('the gauge conversion moves each unflagged point down by 0% to 7% (the most at 59.9 deg)', () => {
    for (const c of checks.filter((x) => x.flag === undefined)) {
      const v = RM_A55H31_FIG12.find((p) => p.yaw === c.yaw)!.value;
      expect(c.gauge / v).toBeGreaterThan(0.928);
      expect(c.gauge / v).toBeLessThanOrEqual(1.0);
    }
  });

  it('the allowance: 0.99 to 1.07, rounded outward; served to 60 deg, the largest unflagged yaw', () => {
    expect(SWEEP_ALLOWANCE).toEqual({ low: 0.99, high: 1.07 });
    const used = checks.filter((c) => c.flag === undefined);
    expect(Math.max(...used.map((c) => c.yaw))).toBeLessThanOrEqual(SWEEP_LIMIT_DEGREES);
    expect(Math.max(...used.map((c) => c.yaw))).toBeGreaterThan(SWEEP_LIMIT_DEGREES - 0.5);
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

  it('swept: at the normal Mach number on the normal dynamic pressure; band 0.98 to 1.14', () => {
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
    expect(t.band).toEqual({ low: 0.98, high: 1.14 });
    expect(t.label).toMatch(/swept 40\.0 deg: the independence principle/);
    expect(t.label).toMatch(/RM A55H31 figs\. 11, 12, read once, the second reading pending/);
    expect(t.label.startsWith('an analogy, not a measurement')).toBe(true);
  });

  it('swept and extrapolated in Reynolds number (normal component below 1e5): 0.95 to 1.17', () => {
    const t = roundedLeadingEdgeDrag({
      mach: 2.8,
      radius: 0.0015,
      faceAngle: 0,
      tanLeadingEdgeSweep: Math.tan(40 * deg),
      reynoldsOnDiameter: 1.2e5,
    });
    expect(t.regime).toBe('extrapolated in Reynolds number');
    expect(t.band).toEqual({
      low: Math.floor((ROUNDED_EDGE_BAND.low - REYNOLDS_ALLOWANCE) * 0.99 * 100 + 1e-9) / 100,
      high: Math.ceil((ROUNDED_EDGE_BAND.high + REYNOLDS_ALLOWANCE) * 1.07 * 100 - 1e-9) / 100,
    });
    expect(t.band).toEqual({ low: 0.95, high: 1.17 });
  });

  it('refuses a normal Mach number below 1.49, with the subsonic and transonic reasons', () => {
    const e = failure(() =>
      roundedLeadingEdgeDrag({
        mach: 2.0,
        radius: 0.0015,
        faceAngle: 0,
        tanLeadingEdgeSweep: Math.tan(45 * deg),
        reynoldsOnDiameter: 2e5,
      }),
    );
    expect(e.reason).toBe('leading-edge-range');
    expect(e.message).toMatch(/normal to the edge, M cos\(sweep\), 1\.414 is below 1\.49/);
    expect(e.message).toMatch(/0\.10 to 0\.39 of the modified-Newtonian value at M 0\.05 to 0\.70/);
    expect(e.message).toMatch(/between M 0\.7 and 1\.49 TN 2960 has no pressure distribution/);
  });

  it('refuses sweeps beyond 60 deg; takes 60 itself', () => {
    const at = (s: number) => () =>
      roundedLeadingEdgeDrag({
        mach: 3.0,
        radius: 0.0015,
        faceAngle: 0,
        tanLeadingEdgeSweep: Math.tan(s * deg),
        reynoldsOnDiameter: 2e5,
      });
    expect(failure(at(60.2)).reason).toBe('swept-leading-edge');
    expect(at(60)().normalMach).toBeCloseTo(1.5, 12);
  });
});
