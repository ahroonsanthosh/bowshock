/**
 * The rebuilt fins-on-base factor (src/base/fins-on-base-w1.ts;
 * docs/design/0015-fins-at-the-base.md, W1 of 0014): every reading held
 * to the first-reading record, the members and the bracket checked against
 * independent arithmetic, the bands of section 3.6 asserted, the checks of
 * the sweep bracket on the RM-10 and RM L52J21a, and every refusal.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compiledCurveValue } from '../../src/base/compiled-curve';
import {
  L52E06_FIG7,
  L52J21A_FIG38C,
  L52J21A_FIG8,
  TN2360_FIG6,
  TN3819_FIG33,
  TN3819_FIG34,
  TN3819_FIG35_W1,
} from '../../src/base/fins-on-base-w1-data';
import {
  W1_BOUNDED_PREFIX,
  W1_FLAT_RELIEF_LOW,
  W1_MACH_RANGE,
  W1_RELIEF_LOW,
  flatPlateReliefs,
  ZERO_MEMBER,
  finsOnBaseFactorW1,
  largestTunnelExcess,
  memberBand,
  memberRatio,
  referenceBand,
  sectionBracket,
  trailingEdgeShape,
  type FinsNearBase,
} from '../../src/base/fins-on-base-w1';
import { BaseRefusal } from '../../src/base/refusal';
import { TN3819_FIG35_FREE_FLIGHT } from '../../src/base/tn3819-fig35';
import { doubleWedge, hexagonal, singleWedge, type SymmetricSection } from '../../src/fins/section';

const csv = readFileSync('docs/research/total-drag/data/fins_at_base_w1.csv', 'utf8')
  .split('\n')
  .filter((l) => l !== '' && !l.startsWith('#') && !l.startsWith('source,'))
  .map((l) => l.split(','));
const rows = (source: string, figure: string) =>
  csv.filter((r) => r[0] === source && r[1] === figure);

describe('the readings, held to the first-reading record', () => {
  it('TN 2360 fig. 6: every symbol, in order', () => {
    const r = [...rows('TN 2360', '6(a)'), ...rows('TN 2360', '6(b)')];
    expect(r.length).toBe(TN2360_FIG6.length);
    r.forEach((x, k) => {
      const p = TN2360_FIG6[k]!;
      const [kind, , tc] = x[2]!.split(' ');
      expect([p.mach, p.count, p.thicknessRatio, p.xc, p.dPb, p.error]).toEqual([
        Number(x[3]),
        kind === 'plane' ? 2 : 4,
        Number(tc),
        Number(x[4]),
        Number(x[5]),
        Number(x[7]),
      ]);
      expect(p.reading).toBe('w1 first');
    });
  });

  it('TN 3819 figs. 33, 34 and 35', () => {
    const r33 = rows('TN 3819', '33');
    expect(r33.map((x) => [Number(x[3]), Number(x[4]) / 100, Number(x[5]), Number(x[7])])).toEqual(
      TN3819_FIG33.map((p) => [p.mach, p.thicknessRatio, p.pB, p.error]),
    );
    const r34 = rows('TN 3819', '34');
    const w = r34.filter((x) => x[2]!.includes('with fins'));
    const wo = r34.filter((x) => x[2]!.includes('without fins'));
    expect(w.map((x) => Number(x[5]))).toEqual(TN3819_FIG34.map((p) => p.withFins));
    expect(wo.map((x) => Number(x[5]))).toEqual(TN3819_FIG34.map((p) => p.withoutFins));
    // The symbols' read abscissas: within 0.01 of the test Mach numbers held in the code.
    TN3819_FIG34.forEach((p, k) => {
      expect(Math.abs(Number(w[k]![3]) - p.mach)).toBeLessThan(0.011);
      expect(Math.abs(Number(wo[k]![3]) - p.mach)).toBeLessThan(0.011);
    });
    const r35 = rows('TN 3819', '35');
    expect(r35.map((x) => [Number(x[3]), Number(x[5]), Number(x[7])])).toEqual(
      TN3819_FIG35_W1[0]!.points.map((p) => [p.mach, p.pB, p.error]),
    );
    expect(r35.every((x) => /not blind/i.test(x[8]!))).toBe(true);
  });

  it('RM L52J21a figs. 38(c) and 8, and RM L52E06 fig. 7', () => {
    const r38 = rows('RM L52J21a', '38(c)');
    for (const p of L52J21A_FIG38C) {
      const at = r38.filter((x) => Number(x[3]) === p.mach);
      expect(Number(at.find((x) => x[2]!.includes('most negative'))![5])).toBe(p.mostNegative);
      expect(Number(at.find((x) => x[2]!.includes('most positive'))![5])).toBe(p.mostPositive);
    }
    const r8 = rows('RM L52J21a', '8');
    for (const p of L52J21A_FIG8) {
      const x = r8.find(
        (y) => Number(y[3]) === p.mach && y[2]!.includes(`${p.base} base: least negative`),
      )!;
      expect([Number(x[5]), Number(x[7])]).toEqual([p.leastNegative, p.error]);
    }
    const r7 = rows('RM L52E06', '7');
    const v = (m: number, s: string) => {
      const x = r7.find((y) => Number(y[3]) === m && y[2] === s);
      return x === undefined ? undefined : Number(x[5]);
    };
    for (const p of L52E06_FIG7) {
      expect(v(p.mach, 'A (no fins) rim')).toBe(p.rimNoFins);
      expect(v(p.mach, 'C (fins at the base) rim')).toBe(p.rimFins);
      expect(v(p.mach, 'A (no fins) centre')).toBe(p.centreNoFins);
      expect(v(p.mach, 'C (fins at the base) centre')).toBe(p.centreFins);
    }
  });

  it('agree with the readings already held where they overlap (checks, not used to set anything)', () => {
    // Fig. 33's points are TN 2360's at x/c = 0: the body alone and t/c 0.10 against fig. 6's runs.
    for (const m of [1.5, 2.0]) {
      const at = TN3819_FIG33.filter((q) => q.mach === m);
      const d10 =
        at.find((q) => q.thicknessRatio === 0.1)!.pB - at.find((q) => q.thicknessRatio === 0)!.pB;
      const runs = TN2360_FIG6.filter(
        (p) => p.mach === m && p.count === 4 && p.thicknessRatio === 0.1 && p.xc === 0,
      );
      expect(d10).toBeGreaterThanOrEqual(Math.min(...runs.map((p) => p.dPb)) - 0.003);
      expect(d10).toBeLessThanOrEqual(Math.max(...runs.map((p) => p.dPb)) + 0.003);
    }
    // This reading of fig. 35 below M 1.8 against round 3's (not blind): within their combined errors.
    const r3 = TN3819_FIG35_FREE_FLIGHT.find((r) => r.reading === 'round 3')!.points;
    for (const p of TN3819_FIG35_W1[0]!.points) {
      const q = r3.find((x) => Math.abs(x.mach - p.mach) < 1e-9);
      if (q === undefined) continue;
      expect(Math.abs(p.pB - q.pB)).toBeLessThanOrEqual(p.error + q.error);
    }
    // RM L52E06 (flat plates, square trailing edges, at the base, M 1.06 to 1.10): fins relieve the base.
    for (const p of L52E06_FIG7) expect(p.rimFins / p.rimNoFins).toBeLessThan(0.9);
  });
});

describe('the members', () => {
  it('the zero member: the largest relief at M >= 1.5, RM L52J21a fig. 38(c) over fig. 8', () => {
    // At M 1.93: dPb +0.0055 (+0.002), cylindrical base P_B -0.1465 (+0.002 toward less suction).
    const f = (0.1465 - 0.002) / (0.1465 - 0.002 + 0.0055 + 0.002);
    expect(W1_RELIEF_LOW).toBeCloseTo(f, 12);
    expect(W1_RELIEF_LOW).toBeCloseTo(0.95066, 5);
    expect(ZERO_MEMBER).toEqual({ low: W1_RELIEF_LOW, high: 1 });
    expect(memberBand(0, 4, 0, 2.5)).toEqual(ZERO_MEMBER);
    expect(memberBand(0.1, 0, 0, 2.5)).toEqual(ZERO_MEMBER);
  });

  it('the reference at M 2.0, by hand from the readings', () => {
    const noFins = Math.abs(compiledCurveValue(2.0, 'lessNegative'));
    // Both readings of the line at M 2.0 with the identity-swap error (0.005).
    const ff = [-0.1905, -0.1903].map((p) => Math.abs(p) / noFins);
    const low = Math.min(...ff) - 0.005 / noFins;
    // Tunnel: fig. 6's largest run, -0.0640 (+-0.002), over fig. 33's body alone -0.1507 (+-0.001).
    const tunnel = 1 + (0.064 + 0.002) / (0.1507 - 0.001);
    const r = referenceBand(2.0);
    expect(r.low).toBeCloseTo(low, 12);
    expect(r.tunnel).toBeCloseTo(tunnel, 12);
    expect(r.high).toBeCloseTo(tunnel, 12);
    expect(r.carried).toBeUndefined();
  });

  it('the reference beyond M 2.41 carries the largest tunnel excess (at M 1.5)', () => {
    const noFins = Math.abs(compiledCurveValue(1.5, 'lessNegative'));
    const leastLine = Math.min(0.2661, 0.266) / noFins;
    const tunnel15 = 1 + (0.1391 + 0.002) / (0.1948 - 0.001);
    expect(largestTunnelExcess()).toBeCloseTo(tunnel15 - leastLine, 12);
    const r = referenceBand(2.8);
    const ffMax = Math.max(...r.freeFlight.map((f) => f.factor));
    expect(r.carried).toBeCloseTo(ffMax + largestTunnelExcess(), 12);
    expect(r.high).toBeCloseTo(r.carried!, 12);
    expect(r.tunnel).toBeUndefined();
  });

  it("four fins t/c 0.05 at x/c 0: TN 2360's increment ratio over the reference, every run and reading", () => {
    // M 1.5: the member -0.0743 (fig. 6) and -0.0752 (fig. 33: -0.2700 + 0.1948, error 0.002);
    // the reference runs -0.1391, -0.1303, -0.1210 and fig. 33's -0.1305 (error 0.002).
    const members = [-0.0743, -0.27 + 0.1948];
    const refs = [-0.1391, -0.1303, -0.121, -0.3253 + 0.1948];
    const ratios: number[] = [];
    for (const m of members)
      for (const r of refs)
        for (const a of [m - 0.002, m + 0.002])
          for (const b of [r - 0.002, r + 0.002]) ratios.push(a / b);
    const r = memberRatio(0.05, 4, 0, 1.5)!;
    expect(r.low).toBeCloseTo(Math.min(...ratios), 12);
    expect(r.high).toBeCloseTo(Math.max(...ratios), 12);
    // Two fins t/c 0.05: measured at M 1.5 only, so a member there and nowhere else.
    expect(memberRatio(0.05, 2, 0, 2.0)).toBeUndefined();
    expect(memberBand(0.05, 2, 0, 1.5)).toBeDefined();
    expect(memberBand(0.05, 2, 0, 1.6)).toBeUndefined();
    // Between M 1.5 and 2.0: the envelope of the two ranges, times the reference's increment.
    const r15 = memberRatio(0.05, 4, 0, 1.5)!;
    const r20 = memberRatio(0.05, 4, 0, 2.0)!;
    const ref = referenceBand(1.8);
    const b = memberBand(0.05, 4, 0, 1.8)!;
    expect(b.low).toBeCloseTo(1 + Math.min(r15.low, r20.low) * (ref.low - 1), 12);
    expect(b.high).toBeCloseTo(1 + Math.max(r15.high, r20.high) * (ref.high - 1), 12);
    // Above M 2.0 the member is not measured.
    expect(memberBand(0.05, 4, 0, 2.1)).toBeUndefined();
  });

  it('positions ahead of the base: between the two bracketing stations of fig. 6', () => {
    const b = memberBand(0.1, 4, 0.5, 1.5)!;
    const s4 = memberBand(0.1, 4, 0.4, 1.5)!;
    const s6 = memberBand(0.1, 4, 0.6, 1.5)!;
    expect(b.low).toBeCloseTo(Math.min(s4.low, s6.low), 12);
    expect(b.high).toBeCloseTo(Math.max(s4.high, s6.high), 12);
    // At x/c 1.0 at M 1.5 the cruciform t/c 0.10 relieves the base (dPb +0.0155): F below 1.
    expect(memberBand(0.1, 4, 1.0, 1.5)!.high).toBeLessThan(1);
    expect(memberBand(0.1, 4, 0.5, 2.2)).toBeUndefined();
  });
});

describe('the section bracket', () => {
  it('a parabolic arc is its own member', () => {
    const n = 200;
    const x = Array.from({ length: n + 1 }, (_, k) => k / n);
    const arc: SymmetricSection = { x, halfThickness: x.map((s) => 2 * 0.07 * s * (1 - s)) };
    const r = sectionBracket(arc);
    expect(r.tauLow).toBeCloseTo(0.07, 3);
    expect(r.tauEq).toBeCloseTo(0.07, 3);
  });

  it('a double wedge t/c lies between the arcs t/c / 2 and t/c', () => {
    const r = sectionBracket(doubleWedge(0.024, 0.5));
    expect(r.tauLow).toBeCloseTo(0.012, 9);
    expect(r.tauEq).toBeCloseTo(0.024, 6);
  });

  it('a bevelled plate: tauEq = tan(bevel) / (2 (1 - s*)) with s* the bevel length', () => {
    const tc = 0.03;
    const bevel = 0.085;
    const tanB = tc / 2 / bevel;
    const r = sectionBracket(hexagonal(tc, bevel, bevel));
    expect(r.tauEq).toBeCloseTo(tanB / (2 * (1 - bevel)), 4);
    expect(r.tauLow).toBeCloseTo(tc, 4);
  });

  it('trailing edges', () => {
    expect(trailingEdgeShape(doubleWedge(0.05))).toBe('sharp');
    expect(trailingEdgeShape(singleWedge(0.08))).toBe('diverging');
    expect(
      trailingEdgeShape({
        x: [0, 0.1, 1],
        halfThickness: [0, 0.015, 0.015],
        bluntTrailingEdge: true,
      }),
    ).toBe('flat');
    expect(
      trailingEdgeShape({
        x: [0, 0.5, 1],
        halfThickness: [0, 0.03, 0.01],
        bluntTrailingEdge: true,
      }),
    ).toBe('converging-blunt');
  });
});

/** A flat plate with a sharp leading-edge bevel and a square trailing edge (the wedge-flat section). */
const plate = (tc: number): SymmetricSection => ({
  x: [0, 0.1, 1],
  halfThickness: [0, tc / 2, tc / 2],
  bluntTrailingEdge: true,
});

const fins = (over: Partial<FinsNearBase> = {}): FinsNearBase => ({
  count: 3,
  section: doubleWedge(0.024, 0.5),
  sectionFamily: 'other',
  tanLeadingEdgeSweep: 1,
  tanTrailingEdgeSweep: 0,
  trailingEdgeAheadOfBase: 0,
  ...over,
});

describe('the bands (0015 section 3.6)', () => {
  /** [M, case, low, nominal, high] as the record tabulates them. */
  const n = 200;
  const xs = Array.from({ length: n + 1 }, (_, k) => k / n);
  const arc10: SymmetricSection = { x: xs, halfThickness: xs.map((s) => 2 * 0.1 * s * (1 - s)) };
  const TABLE: [number, string, FinsNearBase, number, number, number][] = [
    [1.5, 'double wedge 2.4%, three fins, 45 deg', fins(), 0.9507, 1.2115, 1.4723],
    [1.8, 'double wedge 2.4%, three fins, 45 deg', fins(), 0.9507, 1.1822, 1.4137],
    [2.0, 'double wedge 2.4%, three fins, 45 deg', fins(), 0.9507, 1.1394, 1.3282],
    [2.5, 'double wedge 2.4%, three fins, 45 deg', fins(), 0.9507, 1.2076, 1.4645],
    [3.0, 'double wedge 2.4%, three fins, 45 deg', fins(), 0.9507, 1.2348, 1.5189],
    [
      1.8,
      'double wedge 2.4%, four fins, unswept',
      fins({ count: 4, tanLeadingEdgeSweep: 0 }),
      0.9507,
      1.1822,
      1.4137,
    ],
    [
      1.8,
      'bevelled plate 3%, three fins, 45 deg',
      fins({ section: hexagonal(0.03, 0.085, 0.085) }),
      0.9507,
      1.2532,
      1.5558,
    ],
    [
      1.8,
      'flat plate 2.4%, three fins, 45 deg (bounded)',
      fins({ section: plate(0.024) }),
      0.8379,
      1.1258,
      1.4137,
    ],
    [
      2.5,
      'flat plate 2.4%, three fins, 45 deg (bounded)',
      fins({ section: plate(0.024) }),
      0.8379,
      1.1512,
      1.4645,
    ],
    [
      1.8,
      'circular arc 10%, three fins, unswept',
      fins({ section: arc10, sectionFamily: 'circular-arc', tanLeadingEdgeSweep: 0 }),
      1.2229,
      1.3893,
      1.5558,
    ],
    [
      1.8,
      'double wedge 2.4%, three fins, 45 deg, x/c 0.5',
      fins({ trailingEdgeAheadOfBase: 0.5 }),
      0.9045,
      1.0892,
      1.2739,
    ],
  ];
  for (const [m, name, f, low, nominal, high] of TABLE) {
    it(`M ${m}: ${name}`, () => {
      const r = finsOnBaseFactorW1(m, f);
      expect(r.low).toBeCloseTo(low, 4);
      expect(r.nominal).toBeCloseTo(nominal, 4);
      expect(r.high).toBeCloseTo(high, 4);
      expect(r.nominal).toBeCloseTo(0.5 * (r.low + r.high), 12);
      expect(r.analogy).toBe(true);
      expect(r.secondReadingPending).toBe(true);
    });
  }

  it('the band is the envelope of the bracketing members', () => {
    const r = finsOnBaseFactorW1(1.8, fins());
    expect(r.lower).toMatchObject({ thickness: 0 });
    expect(r.upper).toMatchObject({ thickness: 0.05, count: 4 });
    expect(r.low).toBe(Math.min(r.lower.band.low, r.upper.band.low));
    expect(r.high).toBe(Math.max(r.lower.band.high, r.upper.band.high));
    // Above M 2.0 the t/c 0.05 member is not measured: the bracket widens to t/c 0.10.
    expect(finsOnBaseFactorW1(2.5, fins()).upper).toMatchObject({ thickness: 0.1, count: 4 });
  });

  it('a member is served as measured', () => {
    const n = 200;
    const x = Array.from({ length: n + 1 }, (_, k) => k / n);
    const arc5: SymmetricSection = { x, halfThickness: x.map((s) => 2 * 0.05 * s * (1 - s)) };
    const r = finsOnBaseFactorW1(
      1.7,
      fins({ count: 4, section: arc5, sectionFamily: 'circular-arc', tanLeadingEdgeSweep: 0 }),
    );
    expect(r.analogy).toBe(false);
    expect([r.low, r.high]).toEqual([
      memberBand(0.05, 4, 0, 1.7)!.low,
      memberBand(0.05, 4, 0, 1.7)!.high,
    ]);
    expect(r.label).toMatch(/measured on 4 unswept circular-arc fins t\/c 0.05/);
  });

  it('the sweep bracket holds the swept fins measured (RM-10, RM L52J21a): checks, not members', () => {
    // RM-10, 60 deg, t/c 0.10 (fig. 34): with over without fins lies inside the zero member to the
    // unswept t/c 0.10 member at each Mach number.
    for (const p of TN3819_FIG34) {
      const f = p.withFins / p.withoutFins;
      const m = Math.max(p.mach, W1_MACH_RANGE[0]);
      expect(f).toBeGreaterThan(ZERO_MEMBER.low);
      expect(f).toBeLessThan(referenceBand(m).low);
    }
    // RM L52J21a's 45 deg fins at R 8.06e6: every fin effect on the cylindrical base inside the bracket.
    for (const p of L52J21A_FIG38C) {
      const pb = Math.min(
        ...L52J21A_FIG8.filter((q) => q.base === 'cylindrical' && q.mach === p.mach).map((q) =>
          Math.abs(q.leastNegative),
        ),
      );
      expect(pb / (pb + p.mostPositive)).toBeGreaterThanOrEqual(ZERO_MEMBER.low);
      expect(pb / (pb + p.mostNegative)).toBeLessThan(referenceBand(p.mach).low);
    }
  });
});

describe('flat faces at a square trailing edge: bounded, not measured (0015 section 4)', () => {
  it("the lower bound: RM L52E06's lowest relief, rim at M 1.06, with its reading errors", () => {
    expect(W1_FLAT_RELIEF_LOW).toBeCloseTo((0.2181 - 0.002) / (0.2559 + 0.002), 12);
    expect(flatPlateReliefs().length).toBe(5);
    // Below the zero member's low end: RM L52E06's reduction is contained.
    expect(W1_FLAT_RELIEF_LOW).toBeLessThan(W1_RELIEF_LOW);
  });

  it('the whole gap, to the circular-arc member at least as thick', () => {
    const r = finsOnBaseFactorW1(1.8, fins({ section: plate(0.024) }));
    expect(r.bounded).toBe(true);
    expect(r.low).toBe(W1_FLAT_RELIEF_LOW);
    expect(r.upper).toMatchObject({ thickness: 0.05, count: 4 });
    expect(r.high).toBe(memberBand(0.05, 4, 0, 1.8)!.high);
    expect(r.nominal).toBeCloseTo(0.5 * (r.low + r.high), 12);
    expect(r.label.startsWith(W1_BOUNDED_PREFIX)).toBe(true);
    // A plate 6% thick is bounded by the t/c 0.10 member; at M 2.5, every plate is.
    expect(finsOnBaseFactorW1(1.8, fins({ section: plate(0.06) })).upper).toMatchObject({
      thickness: 0.1,
    });
    expect(finsOnBaseFactorW1(2.5, fins({ section: plate(0.024) })).upper).toMatchObject({
      thickness: 0.1,
    });
  });
});

describe('refusals', () => {
  const reason = (f: () => unknown) => {
    try {
      f();
    } catch (e) {
      if (e instanceof BaseRefusal) return e.reason;
      throw e;
    }
    return 'served';
  };
  it('each with its reason', () => {
    expect(reason(() => finsOnBaseFactorW1(2, fins({ count: 5 })))).toBe('fin-count');
    expect(reason(() => finsOnBaseFactorW1(2, fins({ count: 1 })))).toBe('fin-count');
    expect(reason(() => finsOnBaseFactorW1(2, fins({ section: singleWedge(0.08) })))).toBe(
      'fin-trailing-edge',
    );
    expect(
      reason(() =>
        finsOnBaseFactorW1(
          2,
          fins({
            section: { x: [0, 0.5, 1], halfThickness: [0, 0.03, 0.01], bluntTrailingEdge: true },
          }),
        ),
      ),
    ).toBe('fin-trailing-edge');
    expect(reason(() => finsOnBaseFactorW1(2, fins({ section: plate(0.12) })))).toBe(
      'fin-thickness',
    );
    expect(reason(() => finsOnBaseFactorW1(2, fins({ section: doubleWedge(0.11) })))).toBe(
      'fin-thickness',
    );
    expect(
      reason(() => finsOnBaseFactorW1(2, fins({ section: hexagonal(0.03, 0.05, 0.05) }))),
    ).toBe('fin-thickness');
    const tan = (d: number) => Math.tan((d * Math.PI) / 180);
    expect(reason(() => finsOnBaseFactorW1(2, fins({ tanLeadingEdgeSweep: tan(61) })))).toBe(
      'fin-sweep',
    );
    expect(reason(() => finsOnBaseFactorW1(2, fins({ tanLeadingEdgeSweep: tan(60) })))).toBe(
      'served',
    );
    expect(reason(() => finsOnBaseFactorW1(2, fins({ tanLeadingEdgeSweep: tan(45) })))).toBe(
      'served',
    );
    expect(reason(() => finsOnBaseFactorW1(2, fins({ tanLeadingEdgeSweep: tan(44) })))).toBe(
      'fin-sweep',
    );
    expect(reason(() => finsOnBaseFactorW1(2, fins({ tanLeadingEdgeSweep: tan(20) })))).toBe(
      'fin-sweep',
    );
    expect(
      reason(() =>
        finsOnBaseFactorW1(
          2,
          fins({ tanLeadingEdgeSweep: tan(50), tanTrailingEdgeSweep: tan(52) }),
        ),
      ),
    ).toBe('fin-sweep');
    expect(
      reason(() =>
        finsOnBaseFactorW1(2, fins({ tanLeadingEdgeSweep: 0, tanTrailingEdgeSweep: tan(10) })),
      ),
    ).toBe('fin-sweep');
    expect(reason(() => finsOnBaseFactorW1(2, fins({ tanLeadingEdgeSweep: 0 })))).toBe('served');
    expect(reason(() => finsOnBaseFactorW1(1.49, fins()))).toBe('mach-range');
    expect(reason(() => finsOnBaseFactorW1(3.01, fins()))).toBe('mach-range');
    expect(reason(() => finsOnBaseFactorW1(3.0, fins()))).toBe('served');
    expect(reason(() => finsOnBaseFactorW1(2.2, fins({ trailingEdgeAheadOfBase: 0.5 })))).toBe(
      'fins-near-base',
    );
    expect(reason(() => finsOnBaseFactorW1(1.8, fins({ trailingEdgeAheadOfBase: 0.5 })))).toBe(
      'served',
    );
  });
});
