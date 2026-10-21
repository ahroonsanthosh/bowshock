/**
 * The fins-on-base factor of 0008 section 3.4 (src/base/fins-on-base.ts),
 * as corrected on 2026-10-20 (0010 section 11): the two readings of TN 3819
 * fig. 35's free-flight curve as identified, the band on them (the tunnel
 * excess carried, the identity-swap allowance), the factor bounded, not
 * measured, above the curve's end, labels and refusals. And the record:
 * the superseded readings (on estimate B above M 2.15), 0008's band and
 * round 3's recomputation reproduced from them, and the round 5 findings
 * on the factor as it then stood. Recorded in
 * docs/design/0010-base-drag-and-total.md, sections 1.3 and 11.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compiledCurveValue } from '../../src/base/compiled-curve';
import {
  FINS_ON_BASE_BOUNDED,
  FINS_ON_BASE_LABEL_ANALOGY,
  FINS_ON_BASE_LABEL_MEASURED,
  FINS_ON_BASE_ROWS,
  finsOnBaseBoundedLabel,
  finsOnBaseFactor,
  finsOnBaseRows,
  tunnelExcess,
  type FinsOnBaseRow,
} from '../../src/base/fins-on-base';
import { BaseRefusal } from '../../src/base/refusal';
import {
  FIG35_FREE_FLIGHT_END,
  FIG35_IDENTITY_SWAP,
  FIG35_IDENTITY_SWAP_SUPERSEDED,
  TN3819_FIG35_ESTIMATES,
  TN3819_FIG35_FREE_FLIGHT,
  TN3819_FIG35_SUPERSEDED,
  TN3819_FIG35_TUNNEL,
  type Fig35Point,
} from '../../src/base/tn3819-fig35';

const [first, second] = TN3819_FIG35_FREE_FLIGHT;
const oldFirst = TN3819_FIG35_SUPERSEDED.filter((r) => r.reading === 'first');
const oldRound3 = TN3819_FIG35_SUPERSEDED.filter((r) => r.reading === 'round 3');
const row = <T extends { mach: number }>(rows: readonly T[], m: number): T | undefined =>
  rows.find((r) => Math.abs(r.mach - m) < 1e-9);
const noFins = (m: number) => Math.abs(compiledCurveValue(m, 'lessNegative'));
const wedge = {
  count: 4,
  thicknessRatio: 0.08,
  section: 'other' as const,
  tanLeadingEdge: 0,
  tanTrailingEdge: 0,
};
const r4 = (x: number) => Math.round(1e4 * x) / 1e4;

/** A line's value at M, linear between its points; undefined outside them. */
function valueAt(points: readonly Fig35Point[], m: number): number | undefined {
  for (let k = 0; k < points.length; k++) {
    const p = points[k]!;
    if (Math.abs(p.mach - m) < 1e-9) return p.pB;
    const q = points[k + 1];
    if (q !== undefined && m > p.mach && m < q.mach)
      return p.pB + ((m - p.mach) / (q.mach - p.mach)) * (q.pB - p.pB);
  }
  return undefined;
}

/** The factor as the code builds it from rows: the ends interpolated linearly, the midpoint. */
function factorAt(rows: readonly FinsOnBaseRow[], m: number) {
  let k = 0;
  while (k + 2 < rows.length && m > rows[k + 1]!.mach) k++;
  const a = rows[k]!;
  const b = rows[k + 1]!;
  const t = m <= a.mach ? 0 : (m - a.mach) / (b.mach - a.mach);
  const low = a.low + t * (b.low - a.low);
  const high = a.high + t * (b.high - a.high);
  return { low, high, nominal: 0.5 * (low + high) };
}

/** The factor's rows as they stood until 2026-10-20 (0010 section 1.3). */
const SUPERSEDED_MACHS = [
  1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.41, 2.5, 2.6, 2.7, 2.8, 2.85, 2.9, 2.97, 3.0,
];
const supersededRows = (options: Parameters<typeof finsOnBaseRows>[0] = {}) =>
  finsOnBaseRows({
    readings: TN3819_FIG35_SUPERSEDED,
    identitySwapSpan: FIG35_IDENTITY_SWAP_SUPERSEDED,
    machs: SUPERSEDED_MACHS,
    ...options,
  });
const OLD_ROWS = supersededRows();

describe('the two readings of the identified free-flight curve', () => {
  it('hold the readings as recorded', () => {
    const csv = (path: string) =>
      readFileSync(path, 'utf8')
        .split('\n')
        .slice(1)
        .filter((l) => /^\d/.test(l))
        .map((l) => l.split(',').slice(0, 3).map(Number));
    const dir = 'docs/research/total-drag/fig35-free-flight';
    expect(first!.points.map((p) => [p.mach, p.pB, p.error])).toEqual(
      csv(`${dir}/reading1/tn3819_fig35_free_flight_reading1.csv`),
    );
    expect(second!.points.map((p) => [p.mach, p.pB, p.error])).toEqual(
      csv(`${dir}/reading2/free_flight_8c28afe.csv`),
    );
    // Both end the line at M 2.563; the factor's measured rows end at M 2.56.
    expect(first!.points.at(-1)!.mach).toBe(2.56);
    expect(second!.points.at(-1)!.mach).toBe(2.563);
    expect(FIG35_FREE_FLIGHT_END).toBe(2.56);
  });

  it('agree within their combined errors at all 32 Mach numbers both read, by 0.0018 at most (M 2.15)', () => {
    let largest = { d: 0, m: 0 };
    let paired = 0;
    for (const p of first!.points) {
      const q = second!.points.find((x) => Math.abs(x.mach - p.mach) < 1e-9);
      if (q === undefined) continue;
      paired++;
      const d = Math.abs(p.pB - q.pB);
      expect(d, `M ${p.mach}`).toBeLessThanOrEqual(p.error + q.error);
      if (d > largest.d) largest = { d, m: p.mach };
    }
    expect(paired).toBe(32);
    expect(r4(largest.d)).toBe(0.0018);
    expect(largest.m).toBe(2.15);
  });

  it('the superseded readings: on the free-flight curve to M 2.1 (within 0.0003), on estimate B at M 2.2 to 2.6 (within 0.0004)', () => {
    const b = TN3819_FIG35_ESTIMATES.find(
      (e) => e.estimate === 'B' && e.reading === 'identified, first',
    )!;
    for (const r of TN3819_FIG35_SUPERSEDED) {
      for (const p of r.points) {
        if (p.extrapolated === true) continue;
        if (p.mach >= 1.1 && p.mach <= 2.1 && p.mach !== 1.7) {
          expect(
            Math.abs(p.pB - valueAt(first!.points, p.mach)!),
            `${r.reading} M ${p.mach}`,
          ).toBeLessThanOrEqual(3e-4 + 1e-12);
        }
        if (p.mach >= 2.2 && p.mach <= 2.6) {
          const onB = valueAt(b.points, p.mach)!;
          expect(Math.abs(p.pB - onB), `${r.reading} M ${p.mach}`).toBeLessThanOrEqual(
            4e-4 + 1e-12,
          );
          // and away from the free-flight curve (which ends at M 2.56), by 0.003 to 0.015
          const ff = valueAt(first!.points, p.mach);
          if (ff !== undefined) expect(Math.abs(p.pB - ff)).toBeGreaterThan(0.0025);
        }
      }
    }
    // At the knee, M 1.70, round 3's -0.2588 lies 0.0034 from the curve (P_B changes by that
    // in 0.015 of M there); no row of the factor is below M 1.80.
    expect(r4(Math.abs(oldRound3[0]!.points.find((p) => p.mach === 1.7)!.pB + 0.2622))).toBe(
      0.0034,
    );
  });

  it('the identity-swap allowance, 0.0077 at M 1.75 to 2.56: the largest distance to the nearer estimate, in either reading', () => {
    let largest = { d: 0, m: 0, which: '', reading: '' };
    for (const r of TN3819_FIG35_FREE_FLIGHT) {
      const est = TN3819_FIG35_ESTIMATES.filter((e) => e.reading === r.reading);
      for (const p of r.points) {
        if (p.mach < 1.75 - 1e-9 || p.mach > 2.56 + 1e-9) continue;
        const ds = est
          .map((e) => ({ which: e.estimate, v: valueAt(e.points, p.mach) }))
          .filter((x): x is { which: 'A' | 'B'; v: number } => x.v !== undefined)
          .map((x) => ({ which: x.which, d: Math.abs(p.pB - x.v) }));
        if (ds.length === 0) continue;
        const near = ds.reduce((a, b) => (b.d < a.d ? b : a));
        expect(near.d).toBeLessThanOrEqual(FIG35_IDENTITY_SWAP.error + 1e-12);
        if (near.d > largest.d) largest = { ...near, m: p.mach, reading: r.reading };
      }
    }
    expect(FIG35_IDENTITY_SWAP).toEqual({ from: 1.75, to: 2.56, error: 0.0077 });
    expect(r4(largest.d)).toBe(0.0077);
    expect(largest).toMatchObject({ which: 'B', m: 1.8, reading: 'identified, second' });
  });
});

describe('the superseded readings, and the band as 0008 and round 3 computed it', () => {
  it("hold 0008's first reading exactly", () => {
    const lines = readFileSync('docs/research/total-drag/data/love_fig35_tn3819.csv', 'utf8')
      .split('\n')
      .filter((l) => l.startsWith('free_flight_finned,'));
    expect(lines.length).toBe(12);
    const points = oldFirst[0]!.points.filter((p) => p.extrapolated !== true);
    lines.forEach((l, k) => {
      const [, m, p, err] = l.split(',');
      expect([points[k]!.mach, points[k]!.pB, points[k]!.error]).toEqual([
        Number(m),
        Number(p),
        Number(err),
      ]);
    });
  });

  it('agree with each other within their combined reading errors wherever both read', () => {
    // Largest difference: 0.0003 (M 2.2), against combined errors of 0.004 to 0.009.
    let largest = 0;
    for (const p of oldFirst[0]!.points) {
      if (p.extrapolated === true) continue;
      const q = oldRound3[0]!.points.find((x) => x.mach === p.mach);
      if (q === undefined) continue;
      const d = Math.abs(p.pB - q.pB);
      largest = Math.max(largest, d);
      expect(d).toBeLessThanOrEqual(p.error + q.error);
    }
    expect(largest).toBeCloseTo(0.0003, 6);
    for (const a of TN3819_FIG35_TUNNEL.filter((t) => t.reading === 'first')) {
      const b = TN3819_FIG35_TUNNEL.find((t) => t.reading === 'round 3' && t.mach === a.mach)!;
      expect(Math.abs(a.withFins - b.withFins)).toBeLessThanOrEqual(0.001 + 0.0009);
      expect(Math.abs(a.withoutFins - b.withoutFins)).toBeLessThanOrEqual(0.001 + 0.0009);
    }
  });

  it("0008's table from the first reading alone, without the carry or the swap error", () => {
    const lines = readFileSync('docs/research/total-drag/data/love_fig35_factor.csv', 'utf8')
      .split('\n')
      .filter((l) => /^\d/.test(l));
    const machs = lines.map((l) => Number(l.split(',')[0]));
    const rows = finsOnBaseRows({
      readings: oldFirst,
      tunnel: TN3819_FIG35_TUNNEL.filter((t) => t.reading === 'first'),
      carryTunnelExcess: false,
      identitySwap: false,
      machs,
    });
    lines.forEach((l, k) => {
      const [, , pNoFins, fFree, , fLow, fHigh] = l.split(',').map(Number);
      const r = rows[k]!;
      // 0008 interpolated the no-fin curve from fewer nodes: at M 2.6 it has -0.1126
      // against the table's -0.1124, which moves F by 0.0023; elsewhere within 0.0005.
      const tol = machs[k] === 2.6 ? 2.5e-3 : 6e-4;
      expect(Math.abs(r.pBNoFins - pNoFins!), `M ${machs[k]}`).toBeLessThan(2.1e-4);
      expect(Math.abs(r.freeFlight[0]!.factor - fFree!), `M ${machs[k]}`).toBeLessThan(tol);
      expect(Math.abs(r.low - fLow!), `M ${machs[k]}`).toBeLessThan(tol);
      expect(Math.abs(r.high - fHigh!), `M ${machs[k]}`).toBeLessThan(tol);
    });
  });

  it("round 3's recomputation from its own reading, within 0.002", () => {
    // drag-audit/round3/readings/fig35_factor_recomputed.txt (low, high); round 3 placed
    // the tunnel symbols at M 1.502, 2.003, 2.405 and took the no-fin curve at 2.97 as
    // -0.0974 (here -0.0975).
    const expected: [number, number, number][] = [
      [1.8, 1.24, 1.53],
      [2.0, 1.144, 1.386],
      [2.2, 1.106, 1.378],
      [2.4, 1.121, 1.371],
      [2.6, 1.133, 1.302],
      [2.8, 1.144, 1.326],
      [2.97, 1.147, 1.355],
      [3.0, 1.147, 1.357],
    ];
    const rows = finsOnBaseRows({
      readings: oldRound3,
      tunnel: TN3819_FIG35_TUNNEL.filter((t) => t.reading === 'round 3'),
      carryTunnelExcess: false,
      identitySwap: false,
      machs: expected.map((e) => e[0]),
    });
    expected.forEach(([m, lo, hi], k) => {
      expect(Math.abs(rows[k]!.low - lo), `M ${m}`).toBeLessThan(2e-3);
      expect(Math.abs(rows[k]!.high - hi), `M ${m}`).toBeLessThan(2e-3);
    });
  });

  it('the superseded rows: tunnel excess 0.14, 0.07, 0.11; the high end 1.411 at 2.5 to 1.465 at 3.0', () => {
    const e = tunnelExcess(TN3819_FIG35_SUPERSEDED);
    const largest = (m: number) => Math.max(...e.filter((x) => x.mach === m).map((x) => x.excess));
    expect(largest(1.5)).toBeCloseTo(0.1398, 4);
    expect(largest(2.0)).toBeCloseTo(0.0715, 4);
    expect(largest(2.41)).toBeCloseTo(0.1126, 4);
    expect(row(OLD_ROWS, 2.4)!.high).toBeCloseTo(1.371, 3);
    expect(row(OLD_ROWS, 2.5)!.high).toBeCloseTo(1.411, 3);
    expect(row(OLD_ROWS, 3.0)!.high).toBeCloseTo(1.465, 3);
    expect(row(OLD_ROWS, 2.2)!.low).toBeCloseTo(1.101, 3);
  });
});

describe('the band adopted, M 1.80 to 2.56', () => {
  it('has a row at every Mach number both readings read, each read twice', () => {
    expect(FINS_ON_BASE_ROWS.map((r) => r.mach)).toEqual([
      1.8, 1.85, 1.9, 1.95, 2.0, 2.05, 2.1, 2.15, 2.2, 2.25, 2.3, 2.35, 2.4, 2.45, 2.5, 2.55, 2.56,
    ]);
    expect(FINS_ON_BASE_ROWS.every((r) => r.readCount === 2)).toBe(true);
  });

  it('the tunnel exceeds free flight at every tunnel Mach number: 0.141, 0.076, 0.208', () => {
    const e = tunnelExcess();
    const largest = (m: number) => Math.max(...e.filter((x) => x.mach === m).map((x) => x.excess));
    expect(r4(largest(1.5))).toBe(0.1409);
    expect(r4(largest(2.0))).toBe(0.0757);
    expect(r4(largest(2.41))).toBe(0.2083);
  });

  it('is the envelope of both readings', () => {
    for (const r of FINS_ON_BASE_ROWS) {
      expect(r.freeFlight.length).toBe(2);
      for (const f of r.freeFlight) {
        expect(r.low).toBeLessThanOrEqual(1 + 0.5 * (f.factor - f.error - 1) + 1e-12);
        expect(r.high).toBeGreaterThanOrEqual(f.factor + f.error - 1e-12);
      }
    }
  });

  it('the identity-swap error sets every reading error at M 1.80 to 2.56', () => {
    for (const r of FINS_ON_BASE_ROWS) {
      for (const f of r.freeFlight) expect(f.error).toBeCloseTo(0.0077 / noFins(r.mach), 12);
    }
  });

  it('beyond M 2.41 the high end carries the largest excess, 0.2083: 1.3664 at 2.45 to 1.3612 at 2.56', () => {
    for (const r of FINS_ON_BASE_ROWS) {
      if (r.mach <= 2.41) {
        expect(r.carried).toBeUndefined();
        expect(r.high).toBeCloseTo(
          Math.max(r.tunnel!, ...r.freeFlight.map((f) => f.factor + f.error)),
          12,
        );
      } else {
        const top = Math.max(...r.freeFlight.map((f) => f.factor));
        expect(r.high).toBeCloseTo(top + 0.2083, 4);
      }
    }
    expect(r4(row(FINS_ON_BASE_ROWS, 2.45)!.high)).toBe(1.3664);
    expect(r4(row(FINS_ON_BASE_ROWS, 2.56)!.high)).toBe(1.3612);
  });

  it('the rows: F on the free-flight curve (the larger reading) 1.510 at M 1.80 to 1.153 at 2.56, the band 1.228 to 1.559 at M 1.80 and 1.043 to 1.361 at 2.56', () => {
    const at = (m: number) => {
      const r = row(FINS_ON_BASE_ROWS, m)!;
      return [r4(Math.max(...r.freeFlight.map((f) => f.factor))), r4(r.low), r4(r.high)];
    };
    expect(at(1.8)).toEqual([1.5099, 1.2282, 1.559]);
    expect(at(2.15)).toEqual([1.2448, 1.0875, 1.3797]);
    expect(at(2.4)).toEqual([1.1642, 1.0502, 1.3714]);
    expect(at(2.56)).toEqual([1.1529, 1.0427, 1.3612]);
  });

  it('its half-width is at most 13.3% of the midpoint (11.9% to 2.15)', () => {
    const halfWidth = (r: FinsOnBaseRow) => (r.high - r.low) / (r.high + r.low);
    const largest = Math.max(...FINS_ON_BASE_ROWS.map(halfWidth));
    expect(largest).toBeGreaterThan(0.132);
    expect(largest).toBeLessThan(0.133);
    const toClassTop = Math.max(...FINS_ON_BASE_ROWS.filter((r) => r.mach <= 2.15).map(halfWidth));
    expect(toClassTop).toBeLessThan(0.119);
  });

  it('what moved inside the class, superseded to corrected (0010 section 11.7), and why', () => {
    // On the Basic Finner the base is the reference area, so the body base's C_D moves by
    // |P_B, no fins| times the nominal factor's change.
    const machs = [1.799, 1.846, 1.85, 2.0, 2.15];
    const r5 = (x: number) => Math.round(1e5 * x) / 1e5;
    const moved = (to: readonly FinsOnBaseRow[], from: readonly FinsOnBaseRow[], at = machs) =>
      at.map((m) => r5(noFins(m) * (factorAt(to, m).nominal - factorAt(from, m).nominal)));
    expect(moved(FINS_ON_BASE_ROWS, OLD_ROWS)).toEqual([
      0.00105, -0.00031, -0.00042, -0.00082, -0.00123,
    ]);
    // The swap allowance alone, 0.005 to 0.0077 (+0.000675 at M 1.799, on the last digit's edge).
    const allowance = moved(supersededRows({ identitySwapSpan: FIG35_IDENTITY_SWAP }), OLD_ROWS);
    [0.00067, 0.00022, 0.00018, -0.00068, -0.00068].forEach((x, k) => {
      expect(Math.abs(allowance[k]! - x)).toBeLessThanOrEqual(1e-5 + 1e-12);
    });
    // Reading 2's -0.2369 at M 1.80, through the high end.
    expect(moved(FINS_ON_BASE_ROWS, finsOnBaseRows({ readings: [first!] }), [1.799])).toEqual([
      0.00035,
    ]);
    // The rows every 0.05, so a row at M 1.85.
    const oldMachs = SUPERSEDED_MACHS.filter((m) => m <= 2.5);
    expect(moved(FINS_ON_BASE_ROWS, finsOnBaseRows({ machs: oldMachs }), [1.846, 1.85])).toEqual([
      -0.00072, -0.00079,
    ]);
    // At M 2.15 the superseded factor leaned toward its M 2.2 row, on estimate B.
    expect(
      moved(
        FINS_ON_BASE_ROWS,
        supersededRows({ identitySwapSpan: FIG35_IDENTITY_SWAP }),
        [2.15],
      )[0],
    ).toBe(-0.00056);
    // The band at M 1.80.
    const o = factorAt(OLD_ROWS, 1.8);
    const n = factorAt(FINS_ON_BASE_ROWS, 1.8);
    expect([o.low, o.high, n.low, n.high].map(r4)).toEqual([1.2365, 1.5373, 1.2282, 1.559]);
  });
});

describe("bounded, not measured, above the curve's end (M 2.56 to 3.0)", () => {
  it("from no fin effect, F = 1, to the M 2.56 row's high end, 1.3612; served at the midpoint, 1.1806", () => {
    const end = FINS_ON_BASE_ROWS.at(-1)!;
    expect(FINS_ON_BASE_BOUNDED).toEqual({ from: 2.56, to: 3.0, low: 1, high: end.high });
    for (const m of [2.5601, 2.663, 2.8, 2.97, 3.0]) {
      const f = finsOnBaseFactor(m, wedge);
      expect(f.bounded).toBe(true);
      expect([f.low, f.high]).toEqual([1, end.high]);
      expect(f.nominal).toBeCloseTo(0.5 * (1 + end.high), 15);
      expect(r4(f.nominal)).toBe(1.1806);
    }
    expect(finsOnBaseFactor(2.56, wedge).bounded).toBe(false);
    expect(finsOnBaseFactor(2.56, wedge).high).toBe(end.high);
  });

  it("Love's estimates A and B, both readings, lie inside it at every Mach number read from 2.6 to 3.0", () => {
    const b = FINS_ON_BASE_BOUNDED;
    let n = 0;
    for (const e of TN3819_FIG35_ESTIMATES) {
      for (const p of e.points.filter((x) => x.mach > b.from)) {
        const F = p.pB / compiledCurveValue(p.mach, 'lessNegative');
        const err = p.error / noFins(p.mach);
        expect(F - err, `${e.estimate} ${e.reading} M ${p.mach}`).toBeGreaterThanOrEqual(b.low);
        expect(F + err, `${e.estimate} ${e.reading} M ${p.mach}`).toBeLessThanOrEqual(b.high);
        n++;
      }
    }
    expect(n).toBe(21);
  });

  it('carried as a ratio, not an increment: the increment would give 1.428 at M 3.0; sqrt(M^2 - 1) |P_B,no fins| moves 1.2% from 2.56 to 3.0', () => {
    const end = FINS_ON_BASE_ROWS.at(-1)!;
    const increment = (m: number) =>
      1 + ((FINS_ON_BASE_BOUNDED.high - 1) * end.pBNoFins) / compiledCurveValue(m, 'lessNegative');
    expect(Math.round(1000 * increment(3.0)) / 1000).toBe(1.428);
    const scale = (m: number) => Math.sqrt(m * m - 1) * noFins(m);
    expect(Math.round(1000 * (scale(3.0) / scale(2.56) - 1)) / 10).toBe(1.2);
  });

  it("the ordering rests on the bound's margin, not on a trend: F 1.153 at the end, 1.18 at M 3.0 with the fin effect held in P_B; Love's estimates rise from M 2.6 to 3.0 (A 1.20 to 1.23, B 1.29 to 1.33)", () => {
    const end = FINS_ON_BASE_ROWS.at(-1)!;
    const fEnd = Math.max(...end.freeFlight.map((f) => f.factor));
    expect(r4(fEnd)).toBe(1.1529);
    const held = 1 + ((fEnd - 1) * end.pBNoFins) / compiledCurveValue(3.0, 'lessNegative');
    expect(Math.round(100 * held) / 100).toBe(1.18);
    // The margin above both is the tunnel excess carried.
    expect(FINS_ON_BASE_BOUNDED.high - fEnd).toBeCloseTo(0.2083, 4);
    for (const e of TN3819_FIG35_ESTIMATES) {
      const pts = e.points.filter((x) => x.mach > FINS_ON_BASE_BOUNDED.from);
      const F = pts.map((p) => p.pB / compiledCurveValue(p.mach, 'lessNegative'));
      expect(F.at(-1)!, `${e.estimate} ${e.reading}`).toBeGreaterThan(F[0]!);
      const [lo, hi] = e.estimate === 'A' ? [1.195, 1.235] : [1.285, 1.335];
      for (const f of F) {
        expect(f).toBeGreaterThan(lo);
        expect(f).toBeLessThan(hi);
      }
    }
  });

  it('steps at M 2.56: the nominal from 1.2020 to 1.1806, about -0.0024 in the body base on its area, the low end from 1.043 to 1', () => {
    const row = finsOnBaseFactor(2.56, wedge);
    const above = finsOnBaseFactor(2.5601, wedge);
    expect([row.nominal, above.nominal].map(r4)).toEqual([1.202, 1.1806]);
    expect(r4((above.nominal - row.nominal) * noFins(2.56))).toBe(-0.0024);
    expect([row.low, above.low].map((x) => Math.round(1000 * x) / 1000)).toEqual([1.043, 1]);
  });

  it('is labelled bounded, not measured, with its bounds', () => {
    const f = finsOnBaseFactor(2.8, wedge);
    expect(f.label).toBe(finsOnBaseBoundedLabel(true));
    expect(f.label.startsWith('bounded, not measured: ')).toBe(true);
    expect(f.label).toContain('no fin effect (F = 1');
    expect(f.label).toContain('M 2.56');
    expect(f.label).toContain('F = 1.361');
    expect(f.label).toContain('applied by analogy to these fins');
    expect(finsOnBaseFactor(2.8, { ...wedge, section: 'circular-arc' }).label).toBe(
      finsOnBaseBoundedLabel(false),
    );
  });
});

describe('the factor', () => {
  it('interpolates the rows linearly; nominal is the midpoint', () => {
    const a = row(FINS_ON_BASE_ROWS, 2.4)!;
    const b = row(FINS_ON_BASE_ROWS, 2.45)!;
    const f = finsOnBaseFactor(2.414, wedge);
    const t = (2.414 - 2.4) / 0.05;
    expect(f.low).toBeCloseTo(a.low + t * (b.low - a.low), 12);
    expect(f.high).toBeCloseTo(a.high + t * (b.high - a.high), 12);
    expect(f.nominal).toBeCloseTo(0.5 * (f.low + f.high), 15);
    for (const m of [1.8, 1.846, 2.0, 2.348, 2.414, 2.5, 2.56]) {
      expect(finsOnBaseFactor(m, wedge).nominal).toBeCloseTo(
        factorAt(FINS_ON_BASE_ROWS, m).nominal,
        14,
      );
    }
  });

  it('is labelled a correlation on circular-arc fins and an analogy on any other section, to M 2.56', () => {
    expect(finsOnBaseFactor(2, { ...wedge, section: 'circular-arc' }).label).toBe(
      FINS_ON_BASE_LABEL_MEASURED,
    );
    const w = finsOnBaseFactor(2, wedge);
    expect(w.label).toBe(FINS_ON_BASE_LABEL_ANALOGY);
    expect(w.label.startsWith('an analogy, not a measurement')).toBe(true);
    expect(w.analogy).toBe(true);
    expect(w.bounded).toBe(false);
  });

  it('flags the range end; every row rests on two readings', () => {
    for (const m of [1.8, 2.15, 2.414, 2.56, 2.8]) {
      expect(finsOnBaseFactor(m, wedge).singleReading).toBe(false);
      expect(finsOnBaseFactor(m, wedge).extrapolated).toBe(false);
    }
    const end = finsOnBaseFactor(1.799, wedge);
    expect(end.atRangeEnd).toBe(true);
    expect(end.low).toBe(FINS_ON_BASE_ROWS[0]!.low);
  });

  it('refuses other fin counts, thicknesses and Mach numbers', () => {
    const reason = (f: () => unknown) => {
      try {
        f();
      } catch (e) {
        expect(e).toBeInstanceOf(BaseRefusal);
        return (e as BaseRefusal).reason;
      }
      return 'none';
    };
    expect(reason(() => finsOnBaseFactor(2, { ...wedge, count: 3 }))).toBe('fin-count');
    expect(reason(() => finsOnBaseFactor(2, { ...wedge, thicknessRatio: 0.04 }))).toBe(
      'fin-thickness',
    );
    expect(reason(() => finsOnBaseFactor(2, { ...wedge, thicknessRatio: 0.12 }))).toBe(
      'fin-thickness',
    );
    expect(reason(() => finsOnBaseFactor(1.797, wedge))).toBe('mach-range');
    expect(reason(() => finsOnBaseFactor(1.6, wedge))).toBe('mach-range');
    expect(reason(() => finsOnBaseFactor(3.01, wedge))).toBe('mach-range');
    expect(() => finsOnBaseFactor(3.01, wedge)).toThrow(
      'the fins-on-base factor is read at Mach 1.8 to 2.56 and bounded to 3 (TN 3819 fig. 35), asked Mach 3.01',
    );
  });

  it('refuses fins swept at either edge, and so any tapered planform, in the measured and the bounded parts (0014 section 10.7)', () => {
    const t45 = Math.tan(Math.PI / 4);
    const swept = [
      // The review's probe: four 8% double wedges swept 45 deg at both edges, at the base
      // (RM L52J21a measures F 0.96 to 1.12 for such fins, below this factor's band).
      { tanLeadingEdge: t45, tanTrailingEdge: t45 },
      { tanLeadingEdge: t45, tanTrailingEdge: 0 }, // a clipped delta
      { tanLeadingEdge: 0, tanTrailingEdge: -0.3 }, // trailing edge swept forward
      { tanLeadingEdge: 0.4, tanTrailingEdge: 0.2 }, // tapered, both edges swept back
    ];
    for (const m of [1.8, 2.0, 2.56, 2.8, 3.0]) {
      for (const s of swept) {
        for (const section of ['other', 'circular-arc'] as const) {
          let reason = 'none';
          try {
            finsOnBaseFactor(m, { ...wedge, ...s, section });
          } catch (e) {
            expect(e).toBeInstanceOf(BaseRefusal);
            reason = (e as BaseRefusal).reason;
          }
          expect(reason, `M ${m}, ${section}, ${JSON.stringify(s)}`).toBe('fin-sweep');
        }
      }
    }
    expect(() =>
      finsOnBaseFactor(2.8, { ...wedge, tanLeadingEdge: t45, tanTrailingEdge: t45 }),
    ).toThrow(
      'the fins-on-base factor is measured on unswept fins (TN 3819 figs. 33 and 35, TN 2360); ' +
        'fins at the base swept 45.0 deg at the leading edge and 45.0 deg at the trailing edge ' +
        'are not covered (a tapered planform has a swept edge), since sweep changes the factor ' +
        '(TN 3819 fig. 34, RM L52J21a; design record 0014, section 5.1)',
    );
    // Unswept, rectangular fins are served as before.
    expect(finsOnBaseFactor(2.0, wedge).bounded).toBe(false);
    expect(finsOnBaseFactor(2.8, wedge).bounded).toBe(true);
  });
});

describe('the factor as it stood before the correction: the round 5 findings', () => {
  it("between rows the ends are interpolated, not the rule applied at the shot's M: at M 2.414 the high end 1.3728, not 1.3997 (round 5, findings 2, 3)", () => {
    // The rows were every Mach number of either reading in M 1.80 to 3.00; the rule of 0010
    // section 1.3 evaluated at a Mach number is a row there.
    const at241 = row(OLD_ROWS, 2.41)!;
    const above = supersededRows({ machs: [2.41 + 1e-9] })[0]!;
    expect(at241.high).toBeCloseTo(1.371, 3);
    expect(at241.high).toBe(at241.tunnel);
    expect(above.high - at241.high).toBeCloseTo(0.0279, 4);
    // At each gated shot of the Basic Finner: the body base (area ratio 1) by the rule
    // at the shot's M, minus the code's, in C_D.
    const shots = [1.846, 1.85, 2.348, 2.364, 2.414, 2.663, 2.741, 2.749, 2.969, 2.97];
    const differences = shots.map((m) => {
      const code = factorAt(OLD_ROWS, m);
      const rule = supersededRows({ machs: [m] })[0]!;
      const q = noFins(m);
      return Math.round(1e5 * (0.5 * (rule.low + rule.high) - code.nominal) * q) / 1e5 + 0;
    });
    expect(differences).toEqual([
      -0.00033, -0.00037, -0.00037, -0.00023, 0.00164, 0.00003, -0.00001, -0.00001, 0, 0,
    ]);
    const code = factorAt(OLD_ROWS, 2.414);
    const rule = supersededRows({ machs: [2.414] })[0]!;
    expect(code.high).toBeCloseTo(1.3728, 4);
    expect(rule.high).toBeCloseTo(1.3997, 4);
    expect(0.5 * (rule.low + rule.high)).toBeCloseTo(1.2605, 4);
    expect(code.nominal).toBeCloseTo(1.2471, 4);
    const q = noFins(2.414);
    const dF = 0.5 * (rule.low + rule.high) - code.nominal;
    expect((rule.high - code.high + 0.08 * dF) * q).toBeCloseTo(0.0034, 4);
  });

  it("round 3's tunnel pairs at the tunnels' M 1.50, 2.00, 2.41, not its read 1.502, 2.003, 2.405: the M 2.41 row's high end 1.3710, else 1.3667; the body base at M 2.414 0.00025 higher (round 5, finding 6)", () => {
    const read: Record<number, number> = { 1.5: 1.502, 2.0: 2.003, 2.41: 2.405 };
    const moved = TN3819_FIG35_TUNNEL.map((t) =>
      t.reading === 'round 3' ? { ...t, mach: read[t.mach]! } : t,
    );
    const rows = supersededRows({ tunnel: moved });
    expect(row(OLD_ROWS, 2.41)!.high).toBeCloseTo(1.371, 3);
    expect(row(rows, 2.41)!.high).toBeCloseTo(1.3667, 4);
    const d = (factorAt(OLD_ROWS, 2.414).nominal - factorAt(rows, 2.414).nominal) * noFins(2.414);
    expect(Math.round(1e5 * d) / 1e5).toBe(0.00025);
  });

  it("round 3's reading error at M 2.97 and 3.00 is +-0.003 (its factor script), not its method note's +-0.002: the rows' low ends 1.146 and 1.147, else 1.150 and 1.151; the body base at M 2.97 0.00019 lower (round 5, finding 5)", () => {
    const r3 = oldRound3[0]!;
    expect(r3.points.filter((p) => p.mach >= 2.97).map((p) => [p.mach, p.pB, p.error])).toEqual([
      [2.97, -0.129, 0.003],
      [3.0, -0.1278, 0.003],
    ]);
    const at002 = TN3819_FIG35_SUPERSEDED.map((r) =>
      r.reading === 'round 3'
        ? { ...r, points: r.points.map((p) => (p.mach >= 2.97 ? { ...p, error: 0.002 } : p)) }
        : r,
    );
    const rows = supersededRows({ readings: at002, machs: [2.97, 3.0] });
    expect(rows.map((r) => Math.round(1000 * r.low) / 1000)).toEqual([1.15, 1.151]);
    expect([2.97, 3.0].map((m) => Math.round(1000 * row(OLD_ROWS, m)!.low) / 1000)).toEqual([
      1.146, 1.147,
    ]);
    const d =
      (0.5 * (rows[0]!.low + rows[0]!.high) - factorAt(OLD_ROWS, 2.97).nominal) * noFins(2.97);
    expect(Math.round(1e5 * d) / 1e5).toBe(0.00019);
  });
});
