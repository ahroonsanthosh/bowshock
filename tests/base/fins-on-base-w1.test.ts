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
  L52J21A_FIG31_33D,
  L52J21A_FIG38C,
  L52J21A_FIG8,
  L52J21A_FIG8_NOSE_CALLS,
  NSWC_LEADING_EDGE_SWEEP_DEG,
  NSWC_TR92_509_TABLE2,
  TN2360_FIG6,
  TN3819_FIG33,
  TN3819_FIG34,
  TN3819_FIG35_TUNNEL_W1,
  TN3819_FIG35_W1,
} from '../../src/base/fins-on-base-w1-data';
import {
  W1_BOUNDED_PREFIX,
  W1_FLAT_RELIEF_LOW,
  W1_MACH_RANGE,
  W1_RELIEF_LOW,
  W1_RELIEF_LOW_FIG38C,
  W1_RELIEF_MEASURED_FROM,
  W1_RELIEF_ON_ONE_CALL,
  W1_RELIEF_SINGLE_CALLS,
  W1_POSITION_CHORD_OVER_DIAMETER,
  W1_POSITION_CHORD_TOLERANCE,
  W1_SWEPT_TRAILING_EDGE_AHEAD,
  W1_ZERO_MEMBER_PENDING,
  flatPlateReliefs,
  noseCallReliefFactors,
  nswcFactors,
  zeroMember,
  ZERO_MEMBER,
  finsOnBaseFactorW1,
  largestTunnelExcess,
  memberBand,
  memberRatio,
  nearBasePositionReasons,
  referenceBand,
  sectionBracket,
  trailingEdgeShape,
  type FinsNearBase,
} from '../../src/base/fins-on-base-w1';
import { BaseRefusal } from '../../src/base/refusal';
import {
  FIG35_FREE_FLIGHT_END,
  FIG35_IDENTITY_SWAP,
  TN3819_FIG35_FREE_FLIGHT,
} from '../../src/base/tn3819-fig35';
import { doubleWedge, hexagonal, singleWedge, type SymmetricSection } from '../../src/fins/section';

const load = (path: string) =>
  readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l !== '' && !l.startsWith('#') && !l.startsWith('source,'))
    // The notes are free text (the second reading's may hold commas): only the first eight columns are used.
    .map((l) => l.split(','));
const csv = load('docs/research/total-drag/data/fins_at_base_w1.csv');
const csv2 = load('docs/research/total-drag/data/fins_at_base_w1_second.csv');
const rows = (source: string, figure: string) =>
  csv.filter((r) => r[0] === source && r[1] === figure);
const rows2 = (source: string, figure: string) =>
  csv2.filter((r) => r[0] === source && r[1] === figure);
const of = <T extends { reading: string }>(xs: readonly T[], reading: string) =>
  xs.filter((x) => x.reading === reading);

describe('the readings, held to the first- and second-reading records', () => {
  it('TN 2360 fig. 6: every symbol of each reading, in order', () => {
    for (const [reading, from] of [
      ['w1 first', rows],
      ['w1 second', rows2],
    ] as const) {
      const r = [...from('TN 2360', '6(a)'), ...from('TN 2360', '6(b)')];
      const held = of(TN2360_FIG6, reading);
      expect(r.length).toBe(held.length);
      r.forEach((x, k) => {
        const p = held[k]!;
        const [kind, , tc] = x[2]!.split(' ');
        expect([p.mach, p.count, p.thicknessRatio, p.xc, p.dPb, p.error]).toEqual([
          Number(x[3]),
          kind === 'plane' ? 2 : 4,
          Number(tc),
          Number(x[4]),
          Number(x[5]),
          Number(x[7]),
        ]);
      });
    }
    expect(TN2360_FIG6.length).toBe(40 + 40);
  });

  it('TN 3819 figs. 33, 34 and 35', () => {
    for (const [reading, from] of [
      ['w1 first', rows],
      ['w1 second', rows2],
    ] as const) {
      const r33 = from('TN 3819', '33');
      expect(
        r33.map((x) => [Number(x[3]), Number(x[4]) / 100, Number(x[5]), Number(x[7])]),
      ).toEqual(of(TN3819_FIG33, reading).map((p) => [p.mach, p.thicknessRatio, p.pB, p.error]));
      const r34 = from('TN 3819', '34');
      const w = r34.filter((x) => x[2]!.includes('with fins'));
      const wo = r34.filter((x) => x[2]!.includes('without fins'));
      const held34 = of(TN3819_FIG34, reading);
      expect(w.map((x) => Number(x[5]))).toEqual(held34.map((p) => p.withFins));
      expect(wo.map((x) => Number(x[5]))).toEqual(held34.map((p) => p.withoutFins));
      // The symbols' read abscissas: within 0.01 of the test Mach numbers held in the code.
      held34.forEach((p, k) => {
        expect(Math.abs(Number(w[k]![3]) - p.mach)).toBeLessThan(0.011);
        expect(Math.abs(Number(wo[k]![3]) - p.mach)).toBeLessThan(0.011);
        expect(p.error).toBe(Number(w[k]![7]));
      });
      // Fig. 35's line: only the first is held; round 6's first version of the line (its second here) is
      // superseded by the identified curve of ./tn3819-fig35.ts and stays in the csv as the record.
      if (reading === 'w1 first') {
        const r35 = from('TN 3819', '35').filter((x) => x[2]!.startsWith('free-flight'));
        expect(r35.map((x) => [Number(x[3]), Number(x[5]), Number(x[7])])).toEqual(
          TN3819_FIG35_W1.find((r) => r.reading === reading)!.points.map((p) => [
            p.mach,
            p.pB,
            p.error,
          ]),
        );
      }
    }
    expect(TN3819_FIG35_W1.map((r) => r.reading)).toEqual(['w1 first']);
    expect(rows('TN 3819', '35').every((x) => /not blind/i.test(x[8]!))).toBe(true);
    expect(rows2('TN 3819', '35').some((x) => /not blind/i.test(x[8]!))).toBe(false);
    // Fig. 35's tunnel pairs, the second reading.
    const t = rows2('TN 3819', '35').filter((x) => x[2]!.startsWith('tunnel'));
    for (const p of TN3819_FIG35_TUNNEL_W1) {
      const at = t.filter((x) => Number(x[3]) === p.mach && x[2]!.includes(p.source));
      expect(Number(at.find((x) => x[2]!.endsWith(' with fins'))![5])).toBe(p.withFins);
      expect(Number(at.find((x) => x[2]!.endsWith('without fins'))![5])).toBe(p.withoutFins);
      expect(Number(at[0]![7])).toBe(p.error);
    }
  });

  it('RM L52J21a figs. 38(c) and 8, and RM L52E06 fig. 7', () => {
    const r38 = rows('RM L52J21a', '38(c)');
    for (const p of L52J21A_FIG38C) {
      const at = r38.filter((x) => Number(x[3]) === p.mach);
      expect(Number(at.find((x) => x[2]!.includes('most negative'))![5])).toBe(p.mostNegative);
      expect(Number(at.find((x) => x[2]!.includes('most positive'))![5])).toBe(p.mostPositive);
    }
    const r8 = rows('RM L52J21a', '8');
    for (const p of of(L52J21A_FIG8, 'w1 first')) {
      const x = r8.find(
        (y) => Number(y[3]) === p.mach && y[2]!.includes(`${p.base} base: least negative`),
      )!;
      expect([Number(x[5]), Number(x[7])]).toEqual([p.leastNegative, p.error]);
    }
    // The second (round 6): each base's least negative row, leaving out the two stacks that are not symbols.
    const s8 = rows2('RM L52J21a', '8').filter((y) => !(y[8] ?? '').startsWith('not a symbol'));
    for (const p of of(L52J21A_FIG8, 'w1 second')) {
      const at = s8.filter((y) => Number(y[3]) === p.mach && y[2]!.startsWith(p.base));
      expect(Math.max(...at.map((y) => Number(y[5])))).toBe(p.leastNegative);
      expect(p.error).toBe(0.0007);
    }
    expect(of(L52J21A_FIG8, 'w1 second').length).toBe(6);
    expect(L52E06_FIG7.length).toBe(5);
    for (const p of L52E06_FIG7) {
      const r7 = p.reading === 'w1 first' ? rows('RM L52E06', '7') : rows2('RM L52E06', '7');
      const v = (m: number, s: string) => {
        const x = r7.find((y) => Number(y[3]) === m && y[2] === s);
        return x === undefined ? undefined : Number(x[5]);
      };
      expect(v(p.mach, 'A (no fins) rim')).toBe(p.rimNoFins);
      expect(v(p.mach, 'C (fins at the base) rim')).toBe(p.rimFins);
      expect(v(p.mach, 'A (no fins) centre')).toBe(p.centreNoFins);
      expect(v(p.mach, 'C (fins at the base) centre')).toBe(p.centreFins);
    }
  });

  it('first and second agree within their combined errors, except where 0015 section 7 flags them', () => {
    // Figs. 33 and 34: every symbol.
    for (const p of of(TN3819_FIG33, 'w1 first')) {
      const q = of(TN3819_FIG33, 'w1 second').find(
        (x) => x.mach === p.mach && x.thicknessRatio === p.thicknessRatio,
      )!;
      expect(Math.abs(p.pB - q.pB)).toBeLessThanOrEqual(p.error + q.error);
    }
    const s34 = of(TN3819_FIG34, 'w1 second');
    of(TN3819_FIG34, 'w1 first').forEach((p, k) => {
      expect(Math.abs(p.withFins - s34[k]!.withFins)).toBeLessThanOrEqual(p.error + s34[k]!.error);
      expect(Math.abs(p.withoutFins - s34[k]!.withoutFins)).toBeLessThanOrEqual(
        p.error + s34[k]!.error,
      );
    });
    // Fig. 35's line: this work's (M 1.40 to 1.80) against both readings of the identified curve (0010
    // section 11), with the identity-swap error where it applies.
    for (const r of TN3819_FIG35_FREE_FLIGHT) {
      for (const p of TN3819_FIG35_W1[0]!.points) {
        const q = r.points.find((x) => Math.abs(x.mach - p.mach) < 1e-9);
        if (q === undefined) continue;
        const swap = p.mach >= FIG35_IDENTITY_SWAP.from ? FIG35_IDENTITY_SWAP.error : 0;
        expect(Math.abs(p.pB - q.pB)).toBeLessThanOrEqual(
          Math.max(p.error, swap) + Math.max(q.error, swap),
        );
      }
    }
    // RM L52E06 fig. 7 at M 1.10, read by both.
    const a = L52E06_FIG7.find((p) => p.reading === 'w1 first' && p.mach === 1.1)!;
    const b = L52E06_FIG7.find((p) => p.reading === 'w1 second' && p.mach === 1.1)!;
    for (const k of ['rimNoFins', 'rimFins', 'centreNoFins', 'centreFins'] as const) {
      expect(Math.abs(a[k]! - b[k]!)).toBeLessThanOrEqual(a.error + b.error);
    }
    // TN 2360 fig. 6: every station's symbols, paired by value within a station. One pair beyond the
    // combined error (fig. 6(b), cruciform t/c 0.05 at x/c 1.0: 0.0024 against 0.0022), and four symbols
    // found by one reader only (two by each).
    let beyond = 0;
    let unmatched = 0;
    const key = (p: (typeof TN2360_FIG6)[number]) =>
      `${p.mach} ${p.count} ${p.thicknessRatio} ${p.xc}`;
    for (const k of new Set(TN2360_FIG6.map(key))) {
      const f = of(TN2360_FIG6, 'w1 first').filter((p) => key(p) === k);
      const s = of(TN2360_FIG6, 'w1 second').filter((p) => key(p) === k);
      while (f.length > 0 && s.length > 0) {
        let best = [0, 0];
        for (let i = 0; i < f.length; i++)
          for (let j = 0; j < s.length; j++)
            if (Math.abs(f[i]!.dPb - s[j]!.dPb) < Math.abs(f[best[0]!]!.dPb - s[best[1]!]!.dPb))
              best = [i, j];
        const [p] = f.splice(best[0]!, 1);
        const [q] = s.splice(best[1]!, 1);
        if (Math.abs(p!.dPb - q!.dPb) > p!.error + q!.error + 1e-12) beyond++;
      }
      unmatched += f.length + s.length;
    }
    expect(beyond).toBe(1);
    expect(unmatched).toBe(4);
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
    // This reading of fig. 35 below M 1.75 against the identified curve's first reading: within their
    // combined errors.
    const first35 = TN3819_FIG35_FREE_FLIGHT[0]!.points;
    for (const p of TN3819_FIG35_W1[0]!.points) {
      const q = first35.find((x) => Math.abs(x.mach - p.mach) < 1e-9);
      if (q === undefined || p.mach >= FIG35_IDENTITY_SWAP.from) continue;
      expect(Math.abs(p.pB - q.pB)).toBeLessThanOrEqual(p.error + q.error);
    }
    // RM L52E06 (flat plates, square trailing edges, at the base, M 1.06 to 1.10): fins relieve the base.
    for (const p of L52E06_FIG7) expect(p.rimFins / p.rimNoFins).toBeLessThan(0.9);
  });
});

describe('the members', () => {
  it('the zero member: the most relief RM L52J21a allows at M >= 1.5, its fig. 8 calls paired', () => {
    // Fig. 38(c) at M 1.93: dPb +0.0055 (+0.002), over the cylindrical base's least suction in either reading
    // of fig. 8 toward less suction: round 6's -0.1443 (+0.0007), below the first's -0.1465 (+0.002).
    const f = (0.1443 - 0.0007) / (0.1443 - 0.0007 + 0.0055 + 0.002);
    expect(W1_RELIEF_LOW_FIG38C).toBeCloseTo(f, 12);
    expect(W1_RELIEF_LOW_FIG38C).toBeCloseTo(0.95036, 5);
    // Fig. 8 over figs. 31 to 33 (d) by nose (0015 section 3.5): at M 1.93 the conical nose, called alike by
    // the first reading (-0.1468 +-0.002) and round 6, over this work's unfinned conical symbol at R 8.13e6
    // (-0.1524 +-0.002), each toward more relief.
    const g = (0.1468 - 0.002) / (0.1524 + 0.002);
    expect(W1_RELIEF_LOW).toBeCloseTo(g, 12);
    expect(W1_RELIEF_LOW).toBeCloseTo(0.93782, 5);
    expect(W1_RELIEF_ON_ONE_CALL).toBe(false);
    const least = noseCallReliefFactors().reduce((a, b) => (b.factor < a.factor ? b : a));
    expect(least).toMatchObject({
      mach: 1.93,
      nose: 'conical',
      callReading: 'w1 first',
      confirmed: true,
    });
    // Left out on pairing: the first reading's conical and radome calls at M 2.41 (round 7 separates the
    // circle and the diamond; the template did not) and round 6's ogive call at 1.62.
    expect(
      L52J21A_FIG8_NOSE_CALLS.filter((c) => c.leftOut !== undefined).map((c) => [
        c.reading,
        c.mach,
        c.nose,
      ]),
    ).toEqual([
      ['w1 first', 2.41, 'conical'],
      ['w1 first', 2.41, 'radome'],
      ['w1 second', 1.62, 'ogive'],
    ]);
    // Round 7's conical call at M 2.41 stands alone, so the member still waits on a second reading there;
    // on it the conical nose gives F down to 0.941, above the member.
    expect(W1_RELIEF_SINGLE_CALLS).toEqual([
      'the conical nose at M 2.41',
      'the radome nose at M 2.41',
    ]);
    expect(W1_ZERO_MEMBER_PENDING).toBe(true);
    const at241 = noseCallReliefFactors().filter((r) => r.mach === 2.41 && r.nose === 'conical');
    expect(Math.min(...at241.map((r) => r.factor))).toBeCloseTo(0.9412, 4);
    // The unfinned symbols used are round 7's and this work's that round 7 confirms (0015 section 7).
    expect(L52J21A_FIG31_33D.filter((u) => u.reading === 'round 7').length).toBe(10);
    expect(ZERO_MEMBER).toEqual({ low: W1_RELIEF_LOW, high: 1 });
    expect(memberBand(0, 4, 0, 2.5)).toEqual(ZERO_MEMBER);
    expect(memberBand(0.1, 0, 0, 2.5)).toEqual(ZERO_MEMBER);
    // Below M 1.5 (W2's part): down to RM L52E06's relief with flat plates.
    expect(memberBand(0, 4, 0, 1.3)).toEqual({ low: W1_FLAT_RELIEF_LOW, high: 1 });
    expect(zeroMember(1.3)).toEqual({ low: W1_FLAT_RELIEF_LOW, high: 1 });
    // RM L52J21a measures from M 1.62: below it the zero member keeps RM L52E06's lower relief, the safe side.
    expect(W1_RELIEF_MEASURED_FROM).toBe(1.62);
    expect(zeroMember(1.5)).toEqual({ low: W1_FLAT_RELIEF_LOW, high: 1 });
    expect(zeroMember(1.619)).toEqual({ low: W1_FLAT_RELIEF_LOW, high: 1 });
    expect(zeroMember(1.62)).toEqual(ZERO_MEMBER);
  });

  it('the reference at M 2.0, by hand from the readings', () => {
    const noFins = Math.abs(compiledCurveValue(2.0, 'lessNegative'));
    // Both readings of the identified line at M 2.0 with the identity-swap error (0.0077).
    const ff = [-0.1903, -0.1897].map((p) => Math.abs(p) / noFins);
    const low = Math.min(...ff) - 0.0077 / noFins;
    expect(low).toBeCloseTo(1.2578, 4);
    // Tunnel: fig. 6's largest run, -0.0640 (+-0.002), over fig. 33's body alone -0.1507 (+-0.001).
    const tunnel = 1 + (0.064 + 0.002) / (0.1507 - 0.001);
    const r = referenceBand(2.0);
    expect(r.low).toBeCloseTo(low, 12);
    expect(r.tunnel).toBeCloseTo(tunnel, 12);
    expect(r.high).toBeCloseTo(tunnel, 12);
    expect(r.carried).toBeUndefined();
  });

  it('the reference beyond M 2.41 carries the largest tunnel excess (at M 2.41), and is bounded above 2.56', () => {
    // M 1.5: TN 2360's largest run (first -0.1391 +-0.002; round 6 -0.1390 +-0.0021, a tie) over fig.
    // 33's body alone (first, -0.1948 +-0.001), against the least reading of the line (-0.2659).
    const at15 =
      1 +
      (0.1391 + 0.002) / (0.1948 - 0.001) -
      0.2659 / Math.abs(compiledCurveValue(1.5, 'lessNegative'));
    // M 2.41: round 3's Langley pair (-0.1648 and -0.1202, +-0.001), 1.3909, against the identified
    // curve's first reading, -0.1424 at M 2.4 and -0.1387 at 2.45, interpolated: 1.1628.
    const line241 = 0.1424 - 0.2 * (0.1424 - 0.1387);
    const tunnel241 = (0.1648 + 0.001) / (0.1202 - 0.001);
    const ff241 = line241 / Math.abs(compiledCurveValue(2.41, 'lessNegative'));
    expect(tunnel241).toBeCloseTo(1.3909, 4);
    expect(ff241).toBeCloseTo(1.1628, 4);
    expect(at15).toBeLessThan(tunnel241 - ff241);
    expect(largestTunnelExcess()).toBeCloseTo(tunnel241 - ff241, 12);
    expect(largestTunnelExcess()).toBeCloseTo(0.2282, 4);
    const r = referenceBand(2.5);
    const ffMax = Math.max(...r.freeFlight.map((f) => f.factor));
    expect(r.carried).toBeCloseTo(ffMax + largestTunnelExcess(), 12);
    expect(r.high).toBeCloseTo(r.carried!, 12);
    expect(r.tunnel).toBeUndefined();
    expect(r.bounded).toBe(false);
    // Above M 2.56, where the free-flight curve ends: from the zero member's low end to the high end at 2.56.
    const end = referenceBand(FIG35_FREE_FLIGHT_END);
    expect(end.bounded).toBe(false);
    for (const m of [2.57, 2.8, 3.0]) {
      expect(referenceBand(m)).toMatchObject({ low: W1_RELIEF_LOW, high: end.high, bounded: true });
    }
  });

  it('the reference member, low and high, as 0015 section 3.1 tabulates them', () => {
    const TABLE31: [number, number, number][] = [
      [1.5, 1.5228, 1.7281],
      [1.65, 1.5832, 1.6419],
      [1.8, 1.4563, 1.559],
      [2.0, 1.2578, 1.4409],
      [2.15, 1.175, 1.4226],
      [2.2, 1.16, 1.4165],
      [2.3, 1.1233, 1.4043],
      [2.41, 1.0996, 1.3909],
      [2.5, 1.0887, 1.3826],
      [2.56, 1.0855, 1.3811],
      [2.8, 0.9378, 1.3811],
      [3.0, 0.9378, 1.3811],
    ];
    for (const [m, low, high] of TABLE31) {
      const r = referenceBand(m);
      expect(r.low, `M ${m}`).toBeCloseTo(low, 4);
      expect(r.high, `M ${m}`).toBeCloseTo(high, 4);
    }
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

// TN 2360's root chord over body diameter by default, so that positions ahead of the base are served at M 1.5 to
// 2.0 where measured (0015 section 3.3); the chord rule's own tests set it.
const fins = (over: Partial<FinsNearBase> = {}): FinsNearBase => ({
  count: 3,
  section: doubleWedge(0.024, 0.5),
  sectionFamily: 'other',
  tanLeadingEdgeSweep: 1,
  tanTrailingEdgeSweep: 0,
  trailingEdgeAheadOfBase: 0,
  rootChordOverDiameter: 1.5,
  ...over,
});
/** The same fins with no root chord over body diameter given. */
const withoutChord = (f: FinsNearBase): FinsNearBase => {
  const copy = { ...f };
  delete copy.rootChordOverDiameter;
  return copy;
};

describe(
  'the band widths 0015 quotes (sections 1, 3.6, 4 and 11.2), held to the code',
  { timeout: 120_000 },
  () => {
    /** The extremes of the high end and the half-width (in %, to 0.1) over a Mach grid. */
    const scan = (f: FinsNearBase, ms: number[]) => {
      const rs = ms.map((m) => finsOnBaseFactorW1(m, f));
      const hw = rs.map((r) => Math.round((1000 * (r.high - r.low)) / 2 / r.nominal) / 10);
      const high = rs.map((r) => r.high);
      return {
        low: rs.map((r) => r.low),
        high: [Math.min(...high), Math.max(...high)],
        hw: [Math.min(...hw), Math.max(...hw)],
      };
    };
    const grid = (a: number, b: number, step = 0.001) =>
      Array.from({ length: Math.round((b - a) / step) + 1 }, (_, k) => a + k * step);
    const thin = [fins({ tanLeadingEdgeSweep: 0 }), fins({ section: doubleWedge(0.05, 0.5) })];
    const thinPlates = [fins({ section: plate(0.024) }), fins({ section: plate(0.05) })];
    const thickPlates = [fins({ section: plate(0.06) }), fins({ section: plate(0.1) })];

    it('sharp fins up to 5% thick at M 1.5 to 1.62: 0.84 up to 1.47 at M 1.5, 1.49 to 1.54 above it', () => {
      for (const f of thin) {
        const at = finsOnBaseFactorW1(1.5, f);
        expect([at.low, at.high]).toEqual([W1_FLAT_RELIEF_LOW, expect.closeTo(1.4723, 4)]);
        expect(Math.round((1000 * (at.high - at.low)) / 2 / at.nominal) / 10).toBe(27.5);
        // Just above M 1.5 the ratio range becomes the envelope of both tunnel Mach numbers' (3.2).
        const above = scan(f, [1.5 + 1e-9, ...grid(1.501, 1.619)]);
        expect(above.low.every((x) => x === W1_FLAT_RELIEF_LOW)).toBe(true);
        expect(above.high.map((x) => Math.round(100 * x) / 100)).toEqual([1.49, 1.54]);
        expect(above.hw).toEqual([28.0, 29.6]);
      }
    });

    it('sharp fins up to 5% thick at M 1.62 to 3.0: 0.94 up to 1.33 to 1.49', () => {
      for (const f of thin) {
        const r = scan(f, grid(1.62, 3.0));
        expect(r.low.every((x) => x === W1_RELIEF_LOW)).toBe(true);
        expect(r.high.map((x) => Math.round(100 * x) / 100)).toEqual([1.33, 1.49]);
        expect(r.hw).toEqual([17.2, 22.8]);
      }
    });

    it('flat plates up to 5% thick at M 1.5 to 3.0: 0.84 up to 1.33 to 1.54', () => {
      for (const f of thinPlates) {
        const r = scan(f, [1.5, 1.5 + 1e-9, ...grid(1.501, 3.0)]);
        expect(r.low.every((x) => x === W1_FLAT_RELIEF_LOW)).toBe(true);
        expect(r.high.map((x) => Math.round(100 * x) / 100)).toEqual([1.33, 1.54]);
        expect(r.hw).toEqual([22.6, 29.6]);
      }
    });

    it('thicker flat plates: +-34.7% at M 1.5, +-30.1% at 1.8, +-26.5% at 2.0, +-24.4% to +-24.5% at 2.5 to 3.0', () => {
      for (const f of thickPlates) {
        expect(scan(f, [1.5]).hw).toEqual([34.7, 34.7]);
        expect(scan(f, [1.8]).hw).toEqual([30.1, 30.1]);
        expect(scan(f, [2.0]).hw).toEqual([26.5, 26.5]);
        expect(scan(f, grid(2.5, 3.0)).hw).toEqual([24.4, 24.5]);
      }
    });

    it('a member: four 10% arcs above M 2.41 name the tunnel excess their high end carries', () => {
      const n = 200;
      const xs = Array.from({ length: n + 1 }, (_, k) => k / n);
      const arc10: SymmetricSection = {
        x: xs,
        halfThickness: xs.map((s) => 2 * 0.1 * s * (1 - s)),
      };
      const r = finsOnBaseFactorW1(
        2.5,
        fins({ count: 4, section: arc10, sectionFamily: 'circular-arc', tanLeadingEdgeSweep: 0 }),
      );
      expect(r.analogy).toBe(false);
      expect(r.label).toContain(
        "above M 2.41, the tunnels' last Mach number, the reference's high end",
      );
    });
  },
);

describe('the bands (0015 section 3.6)', () => {
  /** [M, case, low, nominal, high] as the record tabulates them. */
  const n = 200;
  const xs = Array.from({ length: n + 1 }, (_, k) => k / n);
  const arc10: SymmetricSection = { x: xs, halfThickness: xs.map((s) => 2 * 0.1 * s * (1 - s)) };
  const t30 = Math.tan((30 * Math.PI) / 180);
  // [M, case, fins, low, nominal, high, second reading pending (the zero member from M 1.5 rests on fig.
  // 38(c), read once; a moderate sweep on NSWC's Table 2, read once)].
  const TABLE: [number, string, FinsNearBase, number, number, number, boolean][] = [
    // Below M 1.62, where RM L52J21a's measurements begin, the zero member is RM L52E06's (read twice).
    [1.5, 'double wedge 2.4%, three fins, 45 deg', fins(), 0.8379, 1.1551, 1.4723, false],
    [1.8, 'double wedge 2.4%, three fins, 45 deg', fins(), 0.9378, 1.1769, 1.4161, true],
    [2.0, 'double wedge 2.4%, three fins, 45 deg', fins(), 0.9378, 1.133, 1.3282, true],
    [2.5, 'double wedge 2.4%, three fins, 45 deg', fins(), 0.9378, 1.1602, 1.3826, true],
    // Above M 2.56 the reference is bounded, not measured (0010 section 11): so is the bracket.
    [3.0, 'double wedge 2.4%, three fins, 45 deg (bounded)', fins(), 0.9378, 1.1594, 1.3811, true],
    [
      1.8,
      'double wedge 2.4%, four fins, unswept',
      fins({ count: 4, tanLeadingEdgeSweep: 0 }),
      0.9378,
      1.1769,
      1.4161,
      true,
    ],
    [
      1.8,
      'bevelled plate 3%, three fins, 45 deg',
      fins({ section: hexagonal(0.03, 0.085, 0.085) }),
      0.9378,
      1.2484,
      1.559,
      true,
    ],
    [
      1.8,
      'flat plate 2.4%, three fins, 45 deg (bounded)',
      fins({ section: plate(0.024) }),
      0.8379,
      1.127,
      1.4161,
      false,
    ],
    [
      2.5,
      'flat plate 2.4%, three fins, 45 deg (bounded)',
      fins({ section: plate(0.024) }),
      0.8379,
      1.1103,
      1.3826,
      false,
    ],
    [
      1.8,
      'circular arc 10%, three fins, unswept',
      fins({ section: arc10, sectionFamily: 'circular-arc', tanLeadingEdgeSweep: 0 }),
      1.2151,
      1.387,
      1.559,
      false,
    ],
    [
      1.8,
      'double wedge 2.4%, three fins, 45 deg, x/c 0.5',
      fins({ trailingEdgeAheadOfBase: 0.5 }),
      0.904,
      1.0897,
      1.2755,
      true,
    ],
    // W1b: the leading edge swept 30 deg, the trailing edge unswept, M 2.0 to 3.0.
    [
      2.0,
      'double wedge 2.4%, four fins, 30 deg, unswept trailing edge',
      fins({ count: 4, tanLeadingEdgeSweep: t30 }),
      0.9378,
      1.133,
      1.3282,
      true,
    ],
    [
      2.5,
      'double wedge 2.4%, three fins, 30 deg, unswept trailing edge',
      fins({ tanLeadingEdgeSweep: t30 }),
      0.9378,
      1.1602,
      1.3826,
      true,
    ],
    // W2's part, below M 1.5: the zero member down to RM L52E06's relief; the reference from fig. 35's line. This
    // is the factor function's own output, its zero member a ratio to the body without fins and its reference
    // over Love's curve, two bases; 0015 section 3.6 gives these rows on W2's term as served (base-w2.test.ts).
    [
      1.2,
      'double wedge 2.4%, three fins, unswept',
      fins({ tanLeadingEdgeSweep: 0 }),
      0.8379,
      1.2822,
      1.7265,
      false,
    ],
    [
      1.2,
      'flat plate 2.4%, three fins, 45 deg (bounded)',
      fins({ section: plate(0.024) }),
      0.8379,
      1.2822,
      1.7265,
      false,
    ],
    // From M 1.0 (the owner's decision of 2026-10-21, 0015 section 11.2).
    [
      1.0,
      'double wedge 2.4%, three fins, unswept, from M 1.0',
      fins({ tanLeadingEdgeSweep: 0 }),
      0.8379,
      1.3437,
      1.8496,
      false,
    ],
  ];
  for (const [m, name, f, low, nominal, high, pending] of TABLE) {
    it(`M ${m}: ${name}`, () => {
      const r = finsOnBaseFactorW1(m, f);
      expect(r.low).toBeCloseTo(low, 4);
      expect(r.nominal).toBeCloseTo(nominal, 4);
      expect(r.high).toBeCloseTo(high, 4);
      expect(r.nominal).toBeCloseTo(0.5 * (r.low + r.high), 12);
      expect(r.analogy).toBe(true);
      expect(r.secondReadingPending).toBe(pending);
    });
  }

  it('below Mach 1.5 the reference is the free-flight line with the tunnel excess carried', () => {
    const noFins = Math.abs(compiledCurveValue(1.2, 'lessNegative'));
    // Round 3's -0.2751 and round 6's -0.2750, each +-0.002 and +-0.0003.
    const r = referenceBand(1.2);
    expect(r.low).toBeCloseTo(Math.min(0.2751 - 0.002, 0.275 - 0.0003) / noFins, 12);
    expect(r.high).toBeCloseTo(0.2751 / noFins + largestTunnelExcess(), 12);
    expect(r.tunnel).toBeUndefined();
    // A member itself at M 1.4: four unswept 10% arcs.
    const m = finsOnBaseFactorW1(
      1.4,
      fins({ count: 4, section: arc10, sectionFamily: 'circular-arc', tanLeadingEdgeSweep: 0 }),
    );
    expect(m.analogy).toBe(false);
    expect([m.low, m.high]).toEqual([referenceBand(1.4).low, referenceBand(1.4).high]);
    // Below M 1.5 no ratio member: the bracket widens to the reference and the zero member.
    expect(finsOnBaseFactorW1(1.2, fins({ tanLeadingEdgeSweep: 0 })).upper).toMatchObject({
      thickness: 0.1,
      count: 4,
    });
  });

  it("the moderate-sweep bracket holds NSWCDD/TR-92/509's 43.9 deg fins (checks, not members)", () => {
    expect(NSWC_LEADING_EDGE_SWEEP_DEG).toBeCloseTo(43.88, 2);
    const tan = Math.tan((NSWC_LEADING_EDGE_SWEEP_DEG * Math.PI) / 180);
    for (const p of nswcFactors()) {
      if (p.thicknessRatio === 0.15) continue; // tauEq 0.15: the factor refuses it
      const r = finsOnBaseFactorW1(p.mach, {
        count: 4,
        section: doubleWedge(p.thicknessRatio, 0.5),
        sectionFamily: 'other',
        tanLeadingEdgeSweep: tan,
        tanTrailingEdgeSweep: 0,
        trailingEdgeAheadOfBase: 0,
      });
      // Inside the bracket with its +-5% (at least 0.055 below its top). At M 2.0 below the bounding
      // member's low end; at 2.5 inside the reference's band; at 3.0 the bracket is bounded (0015 3.4).
      expect(p.low).toBeGreaterThan(r.low);
      expect(p.high).toBeLessThan(r.high - 0.05);
      if (p.mach === 2.0) expect(p.factor).toBeLessThan(r.upper.band.low);
      if (p.mach === 2.5) expect(p.factor).toBeGreaterThan(r.upper.band.low);
      expect(r.bounded).toBe(p.mach === 3.0);
    }
    // Every factor grows with thickness at each Mach number (NSWC's own increments).
    for (const m of [2.0, 2.5, 3.0]) {
      const at = nswcFactors().filter((p) => p.mach === m);
      expect(at.map((p) => p.thicknessRatio)).toEqual([0.05, 0.1, 0.15]);
      expect(at[0]!.factor).toBeLessThan(at[1]!.factor);
      expect(at[1]!.factor).toBeLessThan(at[2]!.factor);
    }
  });

  it('NSWCDD/TR-92/509 Table 2, held to the transcription', () => {
    const t = readFileSync('docs/research/total-drag/data/nswc_tr92_509_table2.csv', 'utf8')
      .split('\n')
      .slice(1)
      .filter((l) => l !== '')
      .map((l) => l.split(','));
    for (const p of NSWC_TR92_509_TABLE2) {
      const x = t.find(
        (y) =>
          Number(y[0]) === p.config &&
          Number(y[4]) === p.mach &&
          Number(y[5]) === 0 &&
          (p.config === 1 || Number(y[3]) === 0),
      )!;
      expect(Number(x[6])).toBe(p.cdb);
      if (p.config !== 1) expect(Number(x[1])).toBe(p.thicknessRatio);
      expect(Number(x[2] === '' ? 0 : x[2])).toBe(0);
    }
    expect(NSWC_TR92_509_TABLE2.length).toBe(12);
  });

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

describe('a section that changes along the span (a plate of one thickness on a tapered planform)', () => {
  it('the upper member from the thickest station, the lower from the thinnest; no range of its own below', () => {
    // A double wedge 10% thick at the tip and 5% at the root (one thickness, the tip chord half the root's).
    const tip = doubleWedge(0.1, 0.5);
    const root = doubleWedge(0.05, 0.5);
    const four = { count: 4, tanLeadingEdgeSweep: 0, tanTrailingEdgeSweep: 0 };
    const tipOnly = finsOnBaseFactorW1(1.8, fins({ ...four, section: tip }));
    const both = finsOnBaseFactorW1(1.8, fins({ ...four, section: tip, spanSections: [root] }));
    // The tip alone: tauLow 0.05, so the lower member would be four fins t/c 0.05; the root is thinner
    // (tauLow 0.025), so the lower member is the zero member, which lies below any section.
    expect(tipOnly.lower).toMatchObject({ thickness: 0.05, count: 4 });
    expect(both.lower).toMatchObject({ thickness: 0 });
    expect(both.upper).toMatchObject({ thickness: 0.1, count: 4 });
    expect([both.tauLow, both.tauEq]).toEqual([0.025, 0.1]);
    expect(both.low).toBe(W1_RELIEF_LOW);
    expect(both.high).toBe(tipOnly.high);
    // Flat plates: the lower bound is RM L52E06's relief whatever the thickness, the upper member set by the
    // thickest station; a thinner root changes nothing.
    const plateTip = finsOnBaseFactorW1(2.5, fins({ ...four, section: plate(0.08) }));
    const plateBoth = finsOnBaseFactorW1(
      2.5,
      fins({ ...four, section: plate(0.08), spanSections: [plate(0.03)] }),
    );
    expect([plateBoth.low, plateBoth.nominal, plateBoth.high]).toEqual([
      plateTip.low,
      plateTip.nominal,
      plateTip.high,
    ]);
    // One trailing-edge shape at a time.
    expect(() =>
      finsOnBaseFactorW1(2.5, fins({ ...four, section: tip, spanSections: [plate(0.03)] })),
    ).toThrow(BaseRefusal);
  });
});

describe('flat faces at a square trailing edge: bounded, not measured (0015 section 4)', () => {
  it("the lower bound: RM L52E06's lowest relief, rim at M 1.06, with its reading errors", () => {
    expect(W1_FLAT_RELIEF_LOW).toBeCloseTo((0.2181 - 0.002) / (0.2559 + 0.002), 12);
    expect(flatPlateReliefs().length).toBe(9);
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
    // W1b: up to 45 deg with the trailing edge unswept, at M 2.0 to 3.0 only.
    expect(reason(() => finsOnBaseFactorW1(2, fins({ tanLeadingEdgeSweep: tan(44) })))).toBe(
      'served',
    );
    expect(reason(() => finsOnBaseFactorW1(3, fins({ tanLeadingEdgeSweep: tan(20) })))).toBe(
      'served',
    );
    expect(reason(() => finsOnBaseFactorW1(1.99, fins({ tanLeadingEdgeSweep: tan(44) })))).toBe(
      'fin-sweep',
    );
    expect(
      reason(() =>
        finsOnBaseFactorW1(
          2.5,
          fins({ tanLeadingEdgeSweep: tan(30), tanTrailingEdgeSweep: tan(10) }),
        ),
      ),
    ).toBe('fin-sweep');
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
    // Below M 1.5 (W2's part): from M 1.0; swept fins only with flat faces; positions ahead of the base
    // refused there and above M 2.0 (0015 section 3.3; a bound built on 2026-10-26 was withdrawn after review).
    expect(reason(() => finsOnBaseFactorW1(0.99, fins({ tanLeadingEdgeSweep: 0 })))).toBe(
      'mach-range',
    );
    expect(reason(() => finsOnBaseFactorW1(1.0, fins({ tanLeadingEdgeSweep: 0 })))).toBe('served');
    expect(reason(() => finsOnBaseFactorW1(1.09, fins({ tanLeadingEdgeSweep: 0 })))).toBe('served');
    expect(reason(() => finsOnBaseFactorW1(1.49, fins()))).toBe('fin-sweep');
    expect(reason(() => finsOnBaseFactorW1(1.49, fins({ section: plate(0.024) })))).toBe('served');
    expect(
      reason(() =>
        finsOnBaseFactorW1(1.3, fins({ tanLeadingEdgeSweep: 0, trailingEdgeAheadOfBase: 0.2 })),
      ),
    ).toBe('fins-near-base');
    expect(
      reason(() =>
        finsOnBaseFactorW1(1.3, fins({ tanLeadingEdgeSweep: 0, trailingEdgeAheadOfBase: 0.5 })),
      ),
    ).toBe('fins-near-base');
    expect(reason(() => finsOnBaseFactorW1(3.01, fins()))).toBe('mach-range');
    expect(reason(() => finsOnBaseFactorW1(3.0, fins()))).toBe('served');
    expect(reason(() => finsOnBaseFactorW1(2.2, fins({ trailingEdgeAheadOfBase: 0.5 })))).toBe(
      'fins-near-base',
    );
    expect(reason(() => finsOnBaseFactorW1(1.8, fins({ trailingEdgeAheadOfBase: 0.5 })))).toBe(
      'served',
    );
  });

  // A sharp section with a swept trailing edge: measured only with RM L52J21a's 45 deg fins, swept aft, their
  // root trailing edge 0.85 +-0.05 root chords ahead of the base (0015 section 3.4).
  const tan = (d: number) => Math.tan((d * Math.PI) / 180);
  const sweptTe = (xc: number, te: number) =>
    fins({ tanTrailingEdgeSweep: te, trailingEdgeAheadOfBase: xc });

  it('a trailing edge swept aft is served only from 0.9 root chords ahead of the base', () => {
    expect(W1_SWEPT_TRAILING_EDGE_AHEAD).toBe(0.9);
    for (const xc of [0, 0.1, 0.5, 0.8, 0.85, 0.89]) {
      for (const te of [tan(45), tan(10)]) {
        expect(
          reason(() => finsOnBaseFactorW1(1.8, sweptTe(xc, te))),
          `x/c ${xc}`,
        ).toBe('fin-sweep');
      }
    }
    for (const xc of [0.9, 1]) {
      expect(
        reason(() => finsOnBaseFactorW1(1.8, sweptTe(xc, tan(45)))),
        `x/c ${xc}`,
      ).toBe('served');
    }
    expect(() => finsOnBaseFactorW1(1.8, sweptTe(0.5, tan(45)))).toThrow(
      /ending 0\.5 root chords ahead/,
    );
    expect(() => finsOnBaseFactorW1(1.8, sweptTe(0.85, tan(45)))).toThrow(/served from 0\.9/);
    expect(() => finsOnBaseFactorW1(1.8, sweptTe(0, tan(45)))).toThrow(/sharp section at the base/);
  });

  it('a trailing edge swept forward is refused on a sharp section wherever it ends', () => {
    for (const xc of [0, 0.5, 0.9, 1]) {
      for (const te of [-tan(45), -tan(10)]) {
        expect(
          reason(() => finsOnBaseFactorW1(1.8, sweptTe(xc, te))),
          `x/c ${xc}`,
        ).toBe('fin-sweep');
        expect(() => finsOnBaseFactorW1(1.8, sweptTe(xc, te))).toThrow(/deg forward at M 1\.8/);
      }
    }
  });

  it("swept flat plates: bounded from RM L52E06's relief, either way, named in the label", () => {
    for (const te of [tan(45), -tan(45), 0]) {
      for (const xc of [0, 0.5]) {
        const r = finsOnBaseFactorW1(
          1.8,
          fins({ section: plate(0.024), tanTrailingEdgeSweep: te, trailingEdgeAheadOfBase: xc }),
        );
        expect(r.low).toBe(W1_FLAT_RELIEF_LOW);
        expect(r.label).toContain(
          "bracketed between RM L52E06's relief with flat plates at the base",
        );
        expect(r.label).not.toContain('bracketed between the zero member');
      }
    }
  });
});

describe('fins ending within a chord ahead of the base: what TN 2360 measures, and where they are served (0015 section 3.3)', () => {
  /** TN 2360 fig. 6's symbols of one member at one Mach number, both readings. */
  const pts = (m: 1.5 | 2.0, n: 2 | 4, t: 0.05 | 0.1, withSingle = true) =>
    TN2360_FIG6.filter(
      (p) =>
        p.mach === m &&
        p.count === n &&
        p.thicknessRatio === t &&
        (withSingle || p.singleReader !== true),
    );
  const MEMBERS = [
    [2, 0.05],
    [2, 0.1],
    [4, 0.05],
    [4, 0.1],
  ] as const;
  const r4 = (x: number) => Math.round(1e4 * x) / 1e4;

  it('the ordering, upper side: the increment ahead of the base is no larger than at it, within the errors', () => {
    for (const withSingle of [true, false]) {
      const margin: Record<string, number> = {};
      for (const m of [1.5, 2.0] as const) {
        for (const [n, t] of MEMBERS) {
          const ps = pts(m, n, t, withSingle);
          const ahead = ps.filter((p) => p.xc > 0);
          if (ahead.length === 0) continue;
          const atBase = ps.filter((p) => p.xc === 0);
          // Each end moved by its reading error toward more suction (a more negative dPb).
          margin[`${m} ${n} ${t}`] = r4(
            Math.min(...ahead.map((p) => p.dPb - p.error)) -
              Math.min(...atBase.map((p) => p.dPb - p.error)),
          );
          // Every symbol ahead against the base's most negative, within the two readings' errors.
          const most = atBase.reduce((a, b) => (b.dPb < a.dPb ? b : a));
          for (const p of ahead) {
            expect(
              p.dPb - most.dPb,
              `M ${m}, ${n} fins t/c ${t}, x/c ${p.xc}`,
            ).toBeGreaterThanOrEqual(-(p.error + most.error));
          }
        }
      }
      // 0014 section 10.7 (ad): at M 1.5 inside by 0.015 to 0.076; at 2.0 by 0.005 and 0.010, and four 10% fins
      // level with the base to 0.0002 (the symbols one reader alone found set none of these).
      expect(margin).toEqual(
        withSingle
          ? {
              '1.5 2 0.05': 0.0231,
              '1.5 2 0.1': 0.0147,
              '1.5 4 0.05': 0.0508,
              '1.5 4 0.1': 0.0764,
              '2 2 0.1': 0.005,
              '2 4 0.05': 0.01,
              '2 4 0.1': -0.0002,
            }
          : {
              '1.5 2 0.05': 0.0231,
              '1.5 2 0.1': 0.0147,
              '1.5 4 0.05': 0.0508,
              '1.5 4 0.1': 0.0792,
              '2 2 0.1': 0.005,
              '2 4 0.05': 0.01,
              '2 4 0.1': -0.0002,
            },
      );
    }
    // The four 10% fins at M 2.0, x/c 0.2: -0.0642 +-0.002 against the base's -0.0644 +-0.0002, equal within both.
    const four = pts(2.0, 4, 0.1);
    expect(Math.min(...four.filter((p) => p.xc === 0.2).map((p) => p.dPb))).toBe(-0.0642);
    expect(Math.min(...four.filter((p) => p.xc === 0).map((p) => p.dPb))).toBe(-0.0644);
  });

  it('the ordering, lower side: the most relief ahead of the base lies within the zero member', () => {
    /** The least F ahead of the base at M, over every member, symbol and body-alone reading, errors toward relief. */
    const fMin = (m: 1.5 | 2.0) => {
      const bodies = TN3819_FIG33.filter(
        (q) => Math.abs(q.mach - m) < 1e-9 && q.thicknessRatio === 0,
      );
      const fs: number[] = [];
      for (const [n, t] of MEMBERS) {
        for (const p of pts(m, n, t).filter((q) => q.xc > 0)) {
          for (const b of bodies) {
            fs.push(1 - Math.max(0, p.dPb + p.error) / (Math.abs(b.pB) - b.error));
          }
        }
      }
      return Math.min(...fs);
    };
    expect(r4(fMin(1.5))).toBe(0.9097);
    expect(r4(fMin(2.0))).toBe(0.9439);
    expect(fMin(1.5)).toBeGreaterThan(zeroMember(1.5).low);
    expect(fMin(2.0)).toBeGreaterThan(zeroMember(2.0).low);
    // Carried linearly in M from 2.0 and 1.5 to 1.0: 0.124 of relief, inside the zero member's 0.162.
    const at10 = 2 * (1 - fMin(1.5)) - (1 - fMin(2.0));
    expect(Math.round(1000 * at10) / 1000).toBe(0.124);
    expect(at10).toBeLessThan(1 - zeroMember(1.0).low);
    expect(r4(1 - zeroMember(1.0).low)).toBe(0.1621);
  });

  it('up to x/c 0.4 TN 2360 measures no relief at all, at M 1.5 and 2.0 only (the narrowing of (ad), withdrawn)', () => {
    // Every symbol at 0 < x/c <= 0.4, both Mach numbers, every member, moved by its error toward relief.
    const near = (m: 1.5 | 2.0) =>
      MEMBERS.flatMap(([n, t]) => pts(m, n, t)).filter((p) => p.xc > 0 && p.xc <= 0.4 + 1e-9);
    const towardRelief = [1.5, 2.0]
      .flatMap((m) => near(m as 1.5 | 2.0))
      .map((p) => p.dPb + p.error);
    expect(r4(Math.max(...towardRelief))).toBe(-0.0028);
    // As F over fig. 33's body alone (the largest body suction, which makes F least): at least 1.014.
    const fNear = Math.min(
      ...([1.5, 2.0] as const).flatMap((m) =>
        TN3819_FIG33.filter((q) => Math.abs(q.mach - m) < 1e-9 && q.thicknessRatio === 0).flatMap(
          (b) => near(m).map((p) => 1 - (p.dPb + p.error) / (Math.abs(b.pB) + b.error)),
        ),
      ),
    );
    expect(Math.round(1000 * fNear) / 1000).toBe(1.014);
    // Relief appears from x/c 0.6 (four 5% fins at M 1.5), the first station beyond the bound's reach.
    const relieving = ([1.5, 2.0] as const)
      .flatMap((m) => MEMBERS.flatMap(([n, t]) => pts(m, n, t)))
      .filter((p) => p.xc > 0 && p.dPb + p.error > 0);
    expect(Math.min(...relieving.map((p) => p.xc))).toBe(0.6);
  });

  it("the direction in Mach number: the fins' effect falls faster with distance at M 1.5 than at 2.0", () => {
    // At x/c 0.4, each symbol over the member's most negative at the base, for the three members measured at
    // both Mach numbers there.
    const frac = (m: 1.5 | 2.0, n: 2 | 4, t: 0.05 | 0.1) => {
      const ps = pts(m, n, t);
      const most = Math.min(...ps.filter((p) => p.xc === 0).map((p) => p.dPb));
      return ps.filter((p) => Math.abs(p.xc - 0.4) < 1e-9).map((p) => p.dPb / most);
    };
    const both = [
      [2, 0.1],
      [4, 0.05],
      [4, 0.1],
    ] as const;
    for (const [n, t] of both) {
      expect(Math.max(...frac(1.5, n, t))).toBeLessThan(Math.min(...frac(2.0, n, t)));
    }
    const pc = (xs: number[]) => [Math.min(...xs), Math.max(...xs)].map((x) => Math.round(100 * x));
    expect(pc(both.flatMap(([n, t]) => frac(1.5, n, t)))).toEqual([6, 63]);
    expect(pc(both.flatMap(([n, t]) => frac(2.0, n, t)))).toEqual([64, 98]);
  });

  /** A circular arc of t/c tau (half-thickness 2 tau s (1 - s)). */
  const arc = (tau: number): SymmetricSection => {
    const x = Array.from({ length: 201 }, (_, k) => k / 200);
    return { x, halfThickness: x.map((s) => 2 * tau * s * (1 - s)) };
  };
  const CASES: [string, FinsNearBase][] = [
    ['double wedge 2.4%, three fins, unswept', fins({ tanLeadingEdgeSweep: 0 })],
    [
      'four 10% circular arcs, unswept',
      fins({ count: 4, section: arc(0.1), sectionFamily: 'circular-arc', tanLeadingEdgeSweep: 0 }),
    ],
    [
      'four 5% circular arcs, unswept',
      fins({ count: 4, section: arc(0.05), sectionFamily: 'circular-arc', tanLeadingEdgeSweep: 0 }),
    ],
    [
      'double wedge 5%, two fins, unswept',
      fins({ count: 2, section: doubleWedge(0.05, 0.5), tanLeadingEdgeSweep: 0 }),
    ],
    ['flat plate 2.4%, three fins, 45 deg', fins({ section: plate(0.024) })],
  ];
  const refusal = (f: () => unknown): BaseRefusal => {
    try {
      f();
    } catch (e) {
      if (e instanceof BaseRefusal) return e;
      throw e;
    }
    throw new Error('served');
  };

  it('below M 1.5 every position ahead of the base is refused, the words naming the missing measurement', () => {
    for (const [name, c] of CASES) {
      for (const m of [1.0, 1.1, 1.2, 1.3, 1.4, 1.4999]) {
        // At the base the same fins are served, so the refusal is the position's alone.
        expect(finsOnBaseFactorW1(m, { ...c, trailingEdgeAheadOfBase: 0 }).low).toBeGreaterThan(0);
        for (const xc of [0.001, 0.2, 0.4, 0.6, 0.999]) {
          const e = refusal(() => finsOnBaseFactorW1(m, { ...c, trailingEdgeAheadOfBase: xc }));
          const what = `${name}, M ${m}, x/c ${xc}`;
          expect(e.reason, what).toBe('fins-near-base');
          expect(e.message, what).toContain(
            `fins ending ${Number(xc.toPrecision(3))} root chords ahead of the base at Mach ${m}: ` +
              'below Mach 1.5 no measurement with fins ahead of the base is known',
          );
          expect(e.message, what).toContain(
            "the fins' pressures grow as the Mach number falls (p. 7)",
          );
          expect(e.message, what).toContain('until such a measurement is found');
          // Fig. 32, at Mach 2.41, cannot settle a case below Mach 1.5, so the words do not lean on it.
          expect(e.message, what).not.toContain('fig. 32');
        }
      }
    }
    // The review's case: four unswept 5% arcs at x/c 0.4, M 1.2, served before as F 0.838 to 1.621.
    expect(
      refusal(() => finsOnBaseFactorW1(1.2, { ...CASES[2]![1], trailingEdgeAheadOfBase: 0.4 }))
        .reason,
    ).toBe('fins-near-base');
  });

  it("the chord rule: at M 1.5 to 2.0 positions are served only with TN 2360's root chord of 1.5 diameters", () => {
    expect(W1_POSITION_CHORD_OVER_DIAMETER).toBe(1.5);
    expect(W1_POSITION_CHORD_TOLERANCE).toBe(0.005);
    for (const m of [1.5, 1.8, 2.0]) {
      for (const xc of [0.001, 0.5, 0.999]) {
        const at = (c: number | undefined) =>
          finsOnBaseFactorW1(
            m,
            c === undefined
              ? withoutChord(fins({ tanLeadingEdgeSweep: 0, trailingEdgeAheadOfBase: xc }))
              : fins({
                  tanLeadingEdgeSweep: 0,
                  trailingEdgeAheadOfBase: xc,
                  rootChordOverDiameter: c,
                }),
          );
        const served = at(1.5);
        expect(served.label).toContain(
          'the position bracketed between the stations of TN 2360 fig. 6, measured with a root chord ' +
            'of 1.5 body diameters, as these fins have',
        );
        // Within 0.5% the same numbers; beyond it refused.
        for (const c of [1.5 * 0.996, 1.5 * 1.004]) {
          expect(at(c).low).toBe(served.low);
          expect(at(c).high).toBe(served.high);
        }
        for (const c of [1.5 * 0.994, 1.5 * 1.006, 1.0, 2.0, 3.0]) {
          const e = refusal(() => at(c));
          expect(e.reason, `M ${m}, x/c ${xc}, c/D ${c}`).toBe('fins-near-base');
          expect(e.message).toContain(
            `the fins' root chord is ${c.toFixed(2)} body diameters, and TN 2360 measures fins ahead ` +
              'of the base only with a root chord of 1.5 body diameters',
          );
          expect(e.message).not.toContain('below Mach 1.5');
          expect(e.message).not.toContain('above Mach 2.0');
        }
        const none = refusal(() => at(undefined));
        expect(none.reason).toBe('fins-near-base');
        expect(none.message).toContain("the fins' root chord over the body diameter");
        expect(none.message).toContain('is not given');
      }
    }
    // The swept fins served from 0.9 root chords ahead fall under the rule too.
    const swept = (c: number) =>
      fins({ tanTrailingEdgeSweep: 1, trailingEdgeAheadOfBase: 0.95, rootChordOverDiameter: c });
    expect(finsOnBaseFactorW1(1.8, swept(1.5)).swept).toBe(true);
    expect(refusal(() => finsOnBaseFactorW1(1.8, swept(1.18))).reason).toBe('fins-near-base');
    // At the base the chord does not enter: any chord, or none, is served.
    for (const c of [0.5, 1.0, 3.0]) {
      expect(finsOnBaseFactorW1(1.8, fins({ rootChordOverDiameter: c })).low).toBeGreaterThan(0);
    }
    expect(finsOnBaseFactorW1(1.8, withoutChord(fins())).low).toBeGreaterThan(0);
    expect(nearBasePositionReasons(1.2, 0, undefined)).toEqual([]);
  });

  it('above M 2.0 refused, its words saying what fig. 32 is now; every reason given together', () => {
    for (const m of [2.0001, 2.2, 2.41, 2.6, 3.0]) {
      for (const xc of [0.01, 0.5, 0.99]) {
        const e = refusal(() =>
          finsOnBaseFactorW1(m, fins({ tanLeadingEdgeSweep: 0, trailingEdgeAheadOfBase: xc })),
        );
        expect(e.reason).toBe('fins-near-base');
        expect(e.message).toContain(
          `fins ending ${xc} root chords ahead of the base at Mach ${m}: above Mach 2.0 no ` +
            'measurement with fins ahead of the base is settled',
        );
        expect(e.message).toContain(
          "TN 3819 fig. 32's, at Mach 2.41, is read three times but no method using it is written yet",
        );
        expect(e.message).not.toContain('awaits its second reading');
      }
    }
    // Above Mach 2.0 with another chord: both reasons.
    const both = refusal(() =>
      finsOnBaseFactorW1(
        2.2,
        fins({ tanLeadingEdgeSweep: 0, trailingEdgeAheadOfBase: 0.5, rootChordOverDiameter: 2.0 }),
      ),
    );
    expect(both.message).toContain('above Mach 2.0');
    expect(both.message).toContain("; and the fins' root chord is 2.00 body diameters");
    // Below Mach 1.5 with no chord given: both reasons.
    const below = refusal(() =>
      finsOnBaseFactorW1(
        1.2,
        withoutChord(fins({ tanLeadingEdgeSweep: 0, trailingEdgeAheadOfBase: 0.2 })),
      ),
    );
    expect(below.message).toContain('below Mach 1.5');
    expect(below.message).toContain('is not given');
  });
});
