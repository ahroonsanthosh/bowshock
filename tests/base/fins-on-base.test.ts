/**
 * The fins-on-base factor of 0008 section 3.4 (src/base/fins-on-base.ts):
 * the two readings of TN 3819 fig. 35, 0008's band and the round-3
 * recomputation reproduced, the band adopted (the tunnel excess carried to
 * M 3, the identity-swap error), labels and refusals. Recorded in
 * docs/design/0010-base-drag-and-total.md, section 1.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compiledCurveValue } from '../../src/base/compiled-curve';
import {
  FINS_ON_BASE_LABEL_ANALOGY,
  FINS_ON_BASE_LABEL_MEASURED,
  FINS_ON_BASE_ROWS,
  finsOnBaseFactor,
  finsOnBaseRows,
  tunnelExcess,
} from '../../src/base/fins-on-base';
import { BaseRefusal } from '../../src/base/refusal';
import { TN3819_FIG35_FREE_FLIGHT, TN3819_FIG35_TUNNEL } from '../../src/base/tn3819-fig35';

const first = TN3819_FIG35_FREE_FLIGHT.filter((r) => r.reading === 'first');
const round3 = TN3819_FIG35_FREE_FLIGHT.filter((r) => r.reading === 'round 3');
const row = <T extends { mach: number }>(rows: readonly T[], m: number): T | undefined =>
  rows.find((r) => Math.abs(r.mach - m) < 1e-9);

describe('the readings of fig. 35', () => {
  it("hold 0008's first reading exactly", () => {
    const lines = readFileSync('docs/research/total-drag/data/love_fig35_tn3819.csv', 'utf8')
      .split('\n')
      .filter((l) => l.startsWith('free_flight_finned,'));
    expect(lines.length).toBe(12);
    const points = first[0]!.points.filter((p) => p.extrapolated !== true);
    lines.forEach((l, k) => {
      const [, m, p, err] = l.split(',');
      expect([points[k]!.mach, points[k]!.pB, points[k]!.error]).toEqual([
        Number(m),
        Number(p),
        Number(err),
      ]);
    });
  });

  it('agree within their combined reading errors wherever both read the line', () => {
    // Largest difference: 0.0003 (M 2.2), against combined errors of 0.004 to 0.009.
    let largest = 0;
    for (const p of first[0]!.points) {
      if (p.extrapolated === true) continue;
      const q = round3[0]!.points.find((x) => x.mach === p.mach);
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
});

describe('the band as 0008 and round 3 computed it', () => {
  it("0008's table from the first reading alone, without the carry or the swap error", () => {
    const lines = readFileSync('docs/research/total-drag/data/love_fig35_factor.csv', 'utf8')
      .split('\n')
      .filter((l) => /^\d/.test(l));
    const machs = lines.map((l) => Number(l.split(',')[0]));
    const rows = finsOnBaseRows({
      readings: first,
      tunnel: TN3819_FIG35_TUNNEL.filter((t) => t.reading === 'first'),
      carryTunnelExcess: false,
      identitySwap: false,
      machs,
    });
    lines.forEach((l, k) => {
      const [, , noFins, fFree, , fLow, fHigh] = l.split(',').map(Number);
      const r = rows[k]!;
      // 0008 interpolated the no-fin curve from fewer nodes: at M 2.6 it has -0.1126
      // against the table's -0.1124, which moves F by 0.0023; elsewhere within 0.0005.
      const tol = machs[k] === 2.6 ? 2.5e-3 : 6e-4;
      expect(Math.abs(r.pBNoFins - noFins!), `M ${machs[k]}`).toBeLessThan(2.1e-4);
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
      readings: round3,
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
});

describe('the band adopted', () => {
  it('the tunnel exceeds free flight at every tunnel Mach number: 0.14, 0.07, 0.11', () => {
    const e = tunnelExcess();
    const largest = (m: number) => Math.max(...e.filter((x) => x.mach === m).map((x) => x.excess));
    expect(largest(1.5)).toBeCloseTo(0.1398, 4);
    expect(largest(2.0)).toBeCloseTo(0.0715, 4);
    expect(largest(2.41)).toBeCloseTo(0.1126, 4);
    // Only round 3 read the free-flight line at M 1.50.
    expect(e.filter((x) => x.mach === 1.5).every((x) => x.lineReading === 'round 3')).toBe(true);
  });

  it('is the envelope of both readings', () => {
    for (const r of FINS_ON_BASE_ROWS) {
      for (const f of r.freeFlight) {
        expect(r.low).toBeLessThanOrEqual(1 + 0.5 * (f.factor - f.error - 1) + 1e-12);
        expect(r.high).toBeGreaterThanOrEqual(f.factor + f.error - 1e-12);
      }
    }
  });

  it('beyond M 2.41 the high end carries the largest excess: 1.411 at 2.5 to 1.465 at 3.0', () => {
    const excess = 0.1397701381907306;
    for (const r of FINS_ON_BASE_ROWS) {
      if (r.mach <= 2.41) {
        expect(r.carried).toBeUndefined();
        expect(r.high).toBeCloseTo(
          Math.max(r.tunnel!, ...r.freeFlight.map((f) => f.factor + f.error)),
          12,
        );
      } else {
        const top = Math.max(...r.freeFlight.map((f) => f.factor));
        expect(r.high).toBeCloseTo(top + excess, 12);
      }
    }
    expect(row(FINS_ON_BASE_ROWS, 2.4)!.high).toBeCloseTo(1.371, 3);
    expect(row(FINS_ON_BASE_ROWS, 2.5)!.high).toBeCloseTo(1.411, 3);
    expect(row(FINS_ON_BASE_ROWS, 3.0)!.high).toBeCloseTo(1.465, 3);
  });

  it('the identity-swap error at M 1.75 to 2.35 widens the low end there', () => {
    for (const m of [1.8, 2.0, 2.2, 2.3]) {
      const r = row(FINS_ON_BASE_ROWS, m)!;
      const noFins = Math.abs(compiledCurveValue(m, 'lessNegative'));
      // Both readings state less (0.002 to 0.005); the swap allowance sets 0.005.
      for (const f of r.freeFlight) expect(f.error).toBeCloseTo(0.005 / noFins, 12);
    }
    expect(row(FINS_ON_BASE_ROWS, 2.2)!.low).toBeCloseTo(1.101, 3);
  });

  it('its half-width is at most 12.2% of the midpoint', () => {
    let largest = 0;
    for (const r of FINS_ON_BASE_ROWS)
      largest = Math.max(largest, (r.high - r.low) / (r.high + r.low));
    expect(largest).toBeLessThan(0.122);
    expect(largest).toBeGreaterThan(0.121);
  });

  it('rows at M 2.9 and 2.97 rest on round 3 alone, 3.0 on extrapolations', () => {
    expect(row(FINS_ON_BASE_ROWS, 2.85)!.readCount).toBe(2);
    expect(row(FINS_ON_BASE_ROWS, 2.9)!.readCount).toBe(1);
    expect(row(FINS_ON_BASE_ROWS, 2.97)!.readCount).toBe(1);
    expect(row(FINS_ON_BASE_ROWS, 3.0)!.readCount).toBe(0);
  });
});

describe('the factor', () => {
  const wedge = { count: 4, thicknessRatio: 0.08, section: 'other' as const };

  it('interpolates the rows linearly; nominal is the midpoint', () => {
    const a = row(FINS_ON_BASE_ROWS, 2.6)!;
    const b = row(FINS_ON_BASE_ROWS, 2.7)!;
    const f = finsOnBaseFactor(2.663, wedge);
    const t = 0.63;
    expect(f.low).toBeCloseTo(a.low + t * (b.low - a.low), 12);
    expect(f.high).toBeCloseTo(a.high + t * (b.high - a.high), 12);
    expect(f.nominal).toBeCloseTo(0.5 * (f.low + f.high), 15);
  });

  it('is labelled a correlation on circular-arc fins and an analogy on any other section', () => {
    expect(finsOnBaseFactor(2, { ...wedge, section: 'circular-arc' }).label).toBe(
      FINS_ON_BASE_LABEL_MEASURED,
    );
    const w = finsOnBaseFactor(2, wedge);
    expect(w.label).toBe(FINS_ON_BASE_LABEL_ANALOGY);
    expect(w.label.startsWith('an analogy, not a measurement')).toBe(true);
    expect(w.analogy).toBe(true);
  });

  it('flags single readings and the range end', () => {
    expect(finsOnBaseFactor(2.969, wedge).singleReading).toBe(true);
    expect(finsOnBaseFactor(2.749, wedge).singleReading).toBe(false);
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
  });
});
