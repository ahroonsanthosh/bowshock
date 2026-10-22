/**
 * Rounded leading edges of flat plates at normal Mach numbers 1.0 to 1.49
 * (src/fins/rounded-leading-edge.ts; docs/design/0016-fin-edges-of-flat-plates.md
 * section 11, W4(e)): NASA CR-149372's readings held to their data file, the
 * front-side ratio kappa at its nodes and its monotone rise, fig. 5's
 * spread, the bracketing-node band (across the unmeasured 1.2 to 1.49
 * too), the sweep allowance widened below 1.49, the labels, and the
 * refusals below 1.0 with the airfoil series cited; and rounded wedges on
 * the same term (0016 section 12).
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MACHA_FIG5, MACHA_FIG8B } from '../../src/fins/macha';
import { FinRefusal } from '../../src/fins/refusal';
import {
  machaBlockageSpread,
  machaFrontSides,
  machaM12Round7,
  MACHA_READING_ERROR,
  pitotPressureCoefficient,
  REYNOLDS_ALLOWANCE,
  roundedLeadingEdgeDrag,
  tn2960FrontSides,
  TRANSONIC_NODES,
  transonicFrontSide,
} from '../../src/fins/rounded-leading-edge';

const deg = Math.PI / 180;
const r3 = (x: number) => Math.round(1000 * x) / 1000;
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
  .map(fields)
  .filter((r) => r[0] === 'NASA CR-149372');

const failure = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(FinRefusal);
    return e as FinRefusal;
  }
  throw new Error('not refused');
};

const plate = (mach: number, sweepDeg = 0, reynoldsOnDiameter = 2e5) =>
  roundedLeadingEdgeDrag({
    mach,
    radius: 0.0015,
    faceAngle: 0,
    tanLeadingEdgeSweep: Math.tan(sweepDeg * deg),
    reynoldsOnDiameter,
  });

describe('NASA CR-149372, against the data file (first readings)', () => {
  it("fig. 8b: every point of the code's sets is in the csv, and no other", () => {
    for (const c of MACHA_FIG8B) {
      const set = rows.filter((r) => r[1] === '8b' && Number(r[3]) === c.mach);
      expect(set.map((r) => [Number(r[5]), Number(r[7])]).sort((a, b) => a[0]! - b[0]!)).toEqual(
        c.points.map((p) => [p.theta, p.p]).sort((a, b) => a[0]! - b[0]!),
      );
    }
  });

  it("fig. 5: the shared curve and each cylinder's points", () => {
    const set = rows.filter((r) => r[1] === '5');
    const code = [...MACHA_FIG5.common, ...MACHA_FIG5.branches.flatMap((b) => b.points)];
    expect(set.length).toBe(code.length);
    for (const p of code) {
      expect(set.some((r) => Number(r[5]) === p.theta && Number(r[7]) === p.p)).toBe(true);
    }
  });

  it("fig. 8b's stagnation values agree with Rayleigh's to 0.7%", () => {
    for (const c of MACHA_FIG8B) {
      const s = c.points.find((p) => p.theta === 0)!;
      expect(Math.abs(s.p / pitotPressureCoefficient(c.mach) - 1)).toBeLessThan(0.007);
    }
  });
});

describe('kappa, the front side over modified Newtonian (0016 section 11)', () => {
  it('0.762, 0.831, 0.897 at M 1.0, 1.1, 1.2', () => {
    expect(machaFrontSides().map((x) => [x.mach, r3(x.ratio)])).toEqual([
      [1.0, 0.762],
      [1.1, 0.831],
      [1.2, 0.897],
    ]);
  });

  it("rises at every pair of nodes, and on to TN 2960's at 1.49, 1.98 and 2.90", () => {
    const k = machaFrontSides().map((x) => x.ratio);
    const tn = (m: number) =>
      tn2960FrontSides()
        .filter((x) => x.mach === m)
        .map((x) => x.ratio);
    const seq = [...k, Math.min(...tn(1.49)), Math.min(...tn(1.98)), Math.min(...tn(2.9))];
    seq.slice(1).forEach((v, i) => {
      expect(v).toBeGreaterThan(seq[i]!);
    });
  });

  it("fig. 5's blockage and run spread at M 1.0: -0.56%, -0.43%, -0.12%", () => {
    expect(
      machaBlockageSpread().map((s) => [s.diameterCm, Math.round(1e4 * s.change) / 1e4]),
    ).toEqual([
      [1.91, -0.0056],
      [3.81, -0.0043],
      [5.08, -0.0012],
    ]);
  });

  it('the second reading, its points outside the combined error kept (0016 section 16): kappa 0.768, 0.831, 0.896; the spread -0.91%, -0.81%, -0.49%', () => {
    expect(machaFrontSides('second').map((x) => r3(x.ratio))).toEqual([0.768, 0.831, 0.896]);
    expect(machaBlockageSpread('second').map((s) => Math.round(1e4 * s.change) / 1e4)).toEqual([
      -0.0091, -0.0081, -0.0049,
    ]);
  });

  it("the nodes: the mean of the readings (at M 1.2 round 7's too), their envelope widened by the 1% reading error and fig. 5's spread on both; 1.49 is the term above", () => {
    const k1 = machaFrontSides('first');
    const k2 = machaFrontSides('second');
    const sLow = Math.min(
      0,
      ...[...machaBlockageSpread('first'), ...machaBlockageSpread('second')].map((s) => s.change),
    );
    expect(r3(machaM12Round7())).toBe(0.899);
    TRANSONIC_NODES.slice(0, 3).forEach((n, i) => {
      const r = [k1[i]!.ratio, k2[i]!.ratio, ...(i === 2 ? [machaM12Round7()] : [])];
      expect(n.nominal).toBeCloseTo(r.reduce((x, y) => x + y, 0) / r.length, 15);
      expect(n.low).toBeCloseTo(Math.min(...r) * (1 - MACHA_READING_ERROR) * (1 + sLow), 15);
      expect(n.high).toBeCloseTo(Math.max(...r) * (1 + MACHA_READING_ERROR), 15);
    });
    // Hand values (four figures): 0.7651, 0.8307, 0.8973 nominal; M 1.2 low 0.8792, high 0.9080.
    expect(TRANSONIC_NODES.slice(0, 3).map((n) => Math.round(1e4 * n.nominal) / 1e4)).toEqual([
      0.7651, 0.8307, 0.8973,
    ]);
    expect(
      [TRANSONIC_NODES[2]!.low, TRANSONIC_NODES[2]!.high].map((x) => Math.round(1e4 * x) / 1e4),
    ).toEqual([0.8792, 0.908]);
    // The 1.49 node's low end: fig. 5(e)'s M 1.49 symbols (0.982) lower it to 0.98 (0016 section 16).
    expect(TRANSONIC_NODES[3]).toEqual({
      mach: 1.49,
      nominal: 1,
      low: 0.98,
      high: 1.06,
      source: 'TN 2960',
    });
  });

  it('between nodes: nominal linear, range from the lower node low to the upper node high; at a node, its own', () => {
    const [a, b, c, d] = TRANSONIC_NODES;
    const at105 = transonicFrontSide(1.05);
    expect(at105.nominal).toBeCloseTo((a!.nominal + b!.nominal) / 2, 14);
    expect([at105.low, at105.high]).toEqual([a!.low, b!.high]);
    expect(at105.machNodes).toEqual([1.0, 1.1]);
    expect(transonicFrontSide(1.1)).toEqual({
      nominal: b!.nominal,
      low: b!.low,
      high: b!.high,
      machNodes: [1.1],
    });
    // Across the unmeasured 1.2 to 1.49: from 1.2's lowest to TN 2960's highest.
    const at13 = transonicFrontSide(1.3);
    expect([at13.low, at13.high]).toEqual([c!.low, d!.high]);
    expect(at13.nominal).toBeCloseTo(c!.nominal + ((1.3 - 1.2) / 0.29) * (1 - c!.nominal), 14);
    expect(r3(at13.low / at13.nominal)).toBe(0.943);
    expect(r3(at13.high / at13.nominal)).toBe(1.136);
  });
});

describe('the term on a flat plate at M_n 1.0 to 1.49', () => {
  it('unswept at M 1.1: kappa times the modified-Newtonian nose, the node band', () => {
    const t = plate(1.1);
    const k = TRANSONIC_NODES[1]!;
    expect(t.dragPerSpan).toBeCloseTo(
      k.nominal * (2 / 3) * pitotPressureCoefficient(1.1) * 0.003,
      16,
    );
    expect(t.regime).toBe('measured');
    expect(t.band.low).toBeCloseTo(k.low / k.nominal, 15);
    expect(t.band.high).toBeCloseTo(k.high / k.nominal, 15);
    expect(t.transonic!.machNodes).toEqual([1.1]);
    expect(t.label).toMatch(/^an analogy, not a measurement: the front side of a cylinder/);
    expect(t.label).toMatch(/NASA CR-149372 figs\. 8b and 5\) and interpolated/);
    expect(t.label).not.toMatch(/read once/);
  });

  it('in the unmeasured 1.2 to 1.49, labelled interpolated across an unmeasured Mach range', () => {
    const t = plate(1.3);
    expect(t.label).toMatch(/^an analogy, interpolated across an unmeasured Mach range/);
    expect(t.label).toMatch(/between NASA CR-149372 at Mach 1\.2/);
  });

  it('below Re_n 1e5, extrapolated in Reynolds number, +-3% as above 1.49', () => {
    const t = plate(1.1, 0, 5e4);
    const k = TRANSONIC_NODES[1]!;
    expect(t.regime).toBe('extrapolated in Reynolds number');
    expect(t.band.low).toBeCloseTo(k.low / k.nominal - REYNOLDS_ALLOWANCE, 15);
    expect(t.band.high).toBeCloseTo(k.high / k.nominal + REYNOLDS_ALLOWANCE, 15);
  });

  it('swept: the allowance at 42 deg, 0.95 to 1.22, and so labelled (the hobby case, M 1.8 at 42 deg, M_n 1.338)', () => {
    const sweep = Math.atan(0.9) / deg;
    const t = plate(1.8, sweep, 1e5);
    const mn = 1.8 * Math.cos(sweep * deg);
    expect(t.normalMach).toBeCloseTo(mn, 14);
    const k = transonicFrontSide(mn);
    expect(t.dragPerSpan).toBeCloseTo(
      k.nominal * (2 / 3) * pitotPressureCoefficient(mn) * Math.cos(sweep * deg) ** 2 * 0.003,
      16,
    );
    expect(t.band).toEqual({ low: 0.854, high: 1.404 });
    expect(t.label).toMatch(
      /the band widened by 0\.950 to 1\.220 for it \(0\.95 to 1\.22 from 14\.3 deg, the smallest yaw tested, tapered below it to meet the unswept band\), the sweep allowance extrapolated in normal Mach number/,
    );
    // Round 7's blind re-read pairs with the first over 22 to 65 deg: no one-reading label.
    expect(t.label).not.toMatch(/one reading/);
  });

  it("the transonic Reynolds regime: measured only at CR-149372's Re_d 1.9e5 to 3.3e5", () => {
    expect(plate(1.1, 0, 2.5e5).regime).toBe('measured');
    expect(plate(1.1, 0, 1.5e5).regime).toBe('extrapolated in Reynolds number');
    expect(plate(1.1, 0, 5e5).regime).toBe('extrapolated in Reynolds number');
    expect(plate(1.6, 0, 5e5).regime).toBe('measured');
  });

  it('at M_n 1.49 and above, the term of 0016 sections 4 and 5, unchanged', () => {
    const a = plate(1.49);
    const b = roundedLeadingEdgeDrag({
      mach: 1.49,
      radius: 0.0015,
      faceAngle: 0,
      tanLeadingEdgeSweep: 0,
      reynoldsOnDiameter: 2e5,
    });
    expect(a).toEqual(b);
    expect(a.transonic).toBeUndefined();
    // At M_n 1.49 the low end is fig. 5(e)'s symbols' 0.98; from about 1.59, the band's 0.99.
    expect(a.band).toEqual({ low: 0.98, high: 1.06 });
    expect(plate(1.6).band).toEqual({ low: 0.99, high: 1.06 });
    const s = plate(2.8, 40);
    expect(s.band).toEqual({ low: 0.94, high: 1.294 });
  });
});

describe('refusals', () => {
  it('a plate below M_n 1.0, citing the airfoil series', () => {
    const e = failure(() => plate(1.3, 45));
    expect(e.reason).toBe('leading-edge-range');
    expect(e.message).toMatch(/normal to the edge, M cos\(sweep\), 0\.9192 is below 1\.0/);
    expect(e.message).toMatch(/RM L53L24a, NASA TP 2204, NASA TN D-3634/);
    expect(e.message).toMatch(/both readings: 0\.10 to 0\.41 of the modified-Newtonian value/);
    expect(plate(1.0).normalMach).toBe(1);
  });

  it('every failed condition is reported, not only the first (re-review of 2026-10-22, N6)', () => {
    // M 1.2 at 60 deg (M_n 0.6), the normal component of the Reynolds number 5e3 (below 6.7e3).
    const e = failure(() => plate(1.2, 60, 1e4));
    expect(e.reason).toBe('leading-edge-range');
    expect(e.message).toMatch(/normal to the edge, M cos\(sweep\), 0\.6000 is below 1\.0/);
    expect(e.message).toMatch(
      /; and Reynolds number 5000 on the edge's diameter \(normal component\) is below 6700/,
    );
    // Swept beyond 60 deg and below M_n 1.0: the sweep's code, both reasons.
    const f = failure(() => plate(1.2, 70));
    expect(f.reason).toBe('swept-leading-edge');
    expect(f.message).toMatch(/^a rounded leading edge swept 70\.0 deg is refused/);
    expect(f.message).toMatch(
      /; and the Mach number normal to the edge, M cos\(sweep\), 0\.4104 is below 1\.0/,
    );
    // Above the band's Mach numbers and the Reynolds numbers at once.
    const g = failure(() => plate(9, 0, 1e7));
    expect(g.message).toMatch(/the rounded-edge band covers Mach/);
    expect(g.message).toMatch(/; and Reynolds number .* is above/);
  });

  it('a rounded wedge below M_n 1.0, the same reasons', () => {
    const e = failure(() =>
      roundedLeadingEdgeDrag({
        mach: 0.95,
        radius: 0.0015,
        faceAngle: 0.036,
        tanLeadingEdgeSweep: 0,
        reynoldsOnDiameter: 2e5,
      }),
    );
    expect(e.reason).toBe('leading-edge-range');
    expect(e.message).toMatch(/0\.9500 is below 1\.0/);
    // At the boundary the message prints enough digits to stay true.
    const f = failure(() =>
      roundedLeadingEdgeDrag({
        mach: 0.9999999,
        radius: 0.0015,
        faceAngle: 0,
        tanLeadingEdgeSweep: 0,
        reynoldsOnDiameter: 2e5,
      }),
    );
    expect(f.message).toMatch(/0\.9999999 is below 1\.0/);
    const g = failure(() =>
      roundedLeadingEdgeDrag({
        mach: 2,
        radius: 0.0015,
        faceAngle: 0,
        tanLeadingEdgeSweep: 0,
        reynoldsOnDiameter: 1.0001e6,
      }),
    );
    expect(g.message).toMatch(/Reynolds number 1\.0001e\+6 on the edge's diameter is above/);
  });
});

describe('a rounded wedge at M_n 1.0 to 1.49 (the follow-up of 0016 section 11)', () => {
  it('kappa times its nose up to the tangent points, the same nodes, band and label as a plate', () => {
    const delta = 0.036;
    const w = roundedLeadingEdgeDrag({
      mach: 1.15,
      radius: 0.0015,
      faceAngle: delta,
      tanLeadingEdgeSweep: 0,
      reynoldsOnDiameter: 2e5,
    });
    const k = transonicFrontSide(1.15);
    const c = Math.cos(delta);
    expect(w.dragPerSpan).toBeCloseTo(
      k.nominal * pitotPressureCoefficient(1.15) * 0.0015 * 2 * (c - c ** 3 / 3),
      16,
    );
    const p = plate(1.15);
    expect(w.band).toEqual(p.band);
    expect(w.label).toBe(p.label);
    expect(w.transonic).toEqual(p.transonic);
  });
});
