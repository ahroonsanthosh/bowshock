/**
 * Rounded leading edges swept beyond 60 deg, bounded, not measured
 * (src/fins/rounded-leading-edge.ts; docs/design/0016-fin-edges-of-flat-plates.md
 * section 21.2; 0014 section 10.7 (ab)): the lower bound is the term at the
 * sweep at its band's low end, the upper the term at 60 deg at its band's
 * high end, the midpoint served; the ordering's ingredients (the term falls
 * with sweep; fig. 12's per-span drag falls with yaw) and the domain.
 */

import { describe, expect, it } from 'vitest';
import { FinRefusal } from '../../src/fins/refusal';
import { RM_A55H31_FIG12, RM_A55H31_FIG12_SECOND } from '../../src/fins/rm-a55h31';
import {
  pitotPressureCoefficient,
  roundedLeadingEdgeDrag,
  ROUNDED_EDGE_BAND,
  roundedEdgeBandLow,
  sweepChecks,
  transonicFrontSide,
} from '../../src/fins/rounded-leading-edge';

const deg = Math.PI / 180;
const radius = 0.0015;

const at = (mach: number, sweepDeg: number, re = 2e5) =>
  roundedLeadingEdgeDrag({
    mach,
    radius,
    faceAngle: 0,
    tanLeadingEdgeSweep: Math.tan(sweepDeg * deg),
    reynoldsOnDiameter: re,
  });

function failure(f: () => unknown): FinRefusal {
  try {
    f();
  } catch (e) {
    if (e instanceof FinRefusal) return e;
    throw e;
  }
  throw new Error('expected a refusal');
}

/**
 * The term at sweep S beyond 60 deg, unbounded, from the served function at
 * 45 deg: at the same normal Mach and Reynolds numbers it has the same band
 * (the allowance is flat from 14.3 deg), and the term scales with cos^2(S).
 */
function termBeyond(mach: number, sweepDeg: number, re: number) {
  const c = Math.cos(sweepDeg * deg);
  const c45 = Math.cos(45 * deg);
  const t = at((mach * c) / c45, 45, (re * c) / c45);
  return {
    dragPerSpan: t.dragPerSpan * ((c * c) / (c45 * c45)),
    band: t.band,
    normalMach: t.normalMach,
  };
}

describe('the bounds', () => {
  it('Mach 3.0 at 62 deg: the term at 62 deg at its low end, the term at 60 deg at its high end', () => {
    const e = at(3.0, 62);
    const lower = termBeyond(3.0, 62, 2e5);
    const upper = at(3.0, 60);
    expect(upper.bounded).toBeUndefined();
    expect(lower.normalMach).toBeCloseTo(3 * Math.cos(62 * deg), 12);
    const low = lower.dragPerSpan * lower.band.low;
    const high = upper.dragPerSpan * upper.band.high;
    expect(e.bounded!.low).toBeCloseTo(low, 14);
    expect(e.bounded!.high).toBeCloseTo(high, 14);
    expect(e.dragPerSpan).toBeCloseTo(0.5 * (low + high), 14);
    expect(e.band.low * e.dragPerSpan).toBeCloseTo(low, 14);
    expect(e.band.high * e.dragPerSpan).toBeCloseTo(high, 14);
    expect(e.normalMach).toBeCloseTo(lower.normalMach, 12);
    expect(e.bounded!.upperNormalMach).toBeCloseTo(1.5, 12);
    expect(e.sweepDegrees).toBeCloseTo(62, 9);
    // The gap is wide: the upper end is more than twice the lower.
    expect(high / low).toBeGreaterThan(1.5);
  });

  it('the label says bounded, both bounds, and that the lower ordering rests on one point', () => {
    const e = at(2.8, 63);
    expect(e.label.startsWith('bounded, not measured: swept 63.0 deg, beyond the 60 deg')).toBe(
      true,
    );
    expect(e.label).toMatch(/between the independence principle at 63\.0 deg/);
    expect(e.label).toMatch(
      /and the same term at 60 deg, the largest sweep checked on yawed cylinders/,
    );
    expect(e.label).toMatch(/the band the whole gap/);
    expect(e.label).toMatch(
      /rests on one yawed point \(Penland's at 75\.1 deg, with an end effect\)/,
    );
    expect(e.label).toMatch(/\(0016 section 21\.2\)$/);
  });

  it('at 60 deg itself nothing changes: the measured term, not bounded', () => {
    const e = at(3.0, 60);
    expect(e.bounded).toBeUndefined();
    expect(e.label.startsWith('an analogy')).toBe(true);
  });

  it('just beyond 60 deg the band grows from the 60 deg one without a gap below it', () => {
    // Re 3e5 on the diameter: the normal component stays above TN 2960's 1e5 at both sweeps.
    const e60 = at(3.0, 60, 3e5);
    const e = at(3.0, 60.01, 3e5);
    expect(e.bounded!.high).toBeCloseTo(e60.dragPerSpan * e60.band.high, 14);
    expect(e.bounded!.low).toBeLessThan(e60.dragPerSpan * e60.band.low * 1.0001);
    expect(e.bounded!.low).toBeGreaterThan(e60.dragPerSpan * e60.band.low * 0.99);
  });
});

describe('the ordering', () => {
  it('kappa Cp_pitot rises with the normal Mach number, so the term falls with sweep', () => {
    const f = (mn: number) =>
      (mn < 1.49 ? transonicFrontSide(mn).nominal : 1) * pitotPressureCoefficient(mn);
    let prev = -Infinity;
    for (let k = 0; k <= 2000; k++) {
      const mn = 1 + k * 0.001;
      const v = f(mn);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
    // So the lower bound falls with sweep and stays below the upper, at Mach 3 to 70.5 deg.
    let last = Infinity;
    for (let s = 60.5; s <= 70.5; s += 0.5) {
      const e = at(3.0, s, 2e5);
      expect(e.bounded!.low).toBeLessThan(last);
      expect(e.bounded!.low).toBeLessThan(e.bounded!.high);
      last = e.bounded!.low;
    }
  });

  it("fig. 12's front side per unit span falls with yaw on every series, both readings", () => {
    for (const reading of [RM_A55H31_FIG12, RM_A55H31_FIG12_SECOND]) {
      for (const source of ['present tests', 'reference 1'] as const) {
        const series = sweepChecks(reading)
          .filter((c) => c.source === source)
          .map((c) => ({ yaw: c.yaw, perSpan: c.gauge / Math.cos(c.yaw * deg) }))
          .sort((a, b) => a.yaw - b.yaw);
        let prev = 1;
        for (const p of series) {
          expect(p.perSpan).toBeLessThan(prev);
          prev = p.perSpan;
        }
      }
    }
  });

  it("the record's numbers: Penland's per-span drag 0.243 to 0.249 at 59.8 deg, 0.059 to 0.068 at 75.1", () => {
    const perSpan = (reading: typeof RM_A55H31_FIG12, yaw: number) => {
      const c = sweepChecks(reading).find((x) => x.source === 'reference 1' && x.yaw === yaw)!;
      return {
        perSpan: c.gauge / Math.cos(c.yaw * deg),
        r: c.r,
        model: c.model / Math.cos(c.yaw * deg),
      };
    };
    const a = perSpan(RM_A55H31_FIG12, 59.8);
    const b = perSpan(RM_A55H31_FIG12_SECOND, 59.8);
    const c = perSpan(RM_A55H31_FIG12, 75.1);
    const d = perSpan(RM_A55H31_FIG12_SECOND, 75.1);
    expect(a.perSpan).toBeCloseTo(0.2432, 3);
    expect(b.perSpan).toBeCloseTo(0.2489, 3);
    expect(c.perSpan).toBeCloseTo(0.0683, 3);
    expect(d.perSpan).toBeCloseTo(0.0591, 3);
    // r at 75.1 deg on both readings: above the allowance's low end.
    expect(c.r).toBeCloseTo(1.17, 2);
    expect(d.r).toBeCloseTo(1.013, 3);
    // The check that sets nothing: the bounds at the point's own conditions (M 6.86, M_n 1.76).
    const m = 6.86;
    const model60 =
      (Math.cos(60 * deg) ** 2 * pitotPressureCoefficient(m * Math.cos(60 * deg))) /
      pitotPressureCoefficient(m);
    expect(model60).toBeCloseTo(0.2434, 4);
    const lowEnd = c.model * roundedEdgeBandLow(m * Math.cos(75.1 * deg)) * 0.95;
    const highEnd = model60 * ROUNDED_EDGE_BAND.high * 1.22;
    expect(lowEnd).toBeCloseTo(0.0549, 3);
    expect(highEnd).toBeCloseTo(0.315, 3);
    for (const p of [c.perSpan, d.perSpan]) {
      expect(p).toBeGreaterThan(lowEnd);
      expect(p).toBeLessThan(highEnd);
    }
  });
});

describe('the domain: both terms must be served', () => {
  it('Mach 2.0 at 62 deg: the normal Mach number at the sweep below 1.0, refused with the reasons', () => {
    const e = failure(() => at(2.0, 62));
    expect(e.reason).toBe('leading-edge-range');
    expect(e.message).toMatch(/^a rounded leading edge swept 62\.0 deg, beyond the 60 deg/);
    expect(e.message).toMatch(
      /is served only bounded, between the term at its sweep and the term at 60 deg/,
    );
    expect(e.message).toMatch(
      /at 62\.0 deg, the Mach number normal to the edge, M cos\(sweep\), 0\.9389 is below 1\.0/,
    );
    expect(e.message).not.toMatch(/(\): |; and )at 60 deg,/);
  });

  it('Mach 3.0 beyond 70.5 deg: refused', () => {
    expect(failure(() => at(3.0, 71)).reason).toBe('leading-edge-range');
    expect(at(3.0, 70.5).bounded).toBeDefined();
  });

  it("the Reynolds number's normal component at the sweep below 6.7e3, at 60 deg above it", () => {
    // 1.4e4 on the diameter: 6573 at 62 deg, 7000 at 60.
    const e = failure(() => at(3.0, 62, 1.4e4));
    expect(e.message).toMatch(
      /at 62\.0 deg, Reynolds number 657\d on the edge's diameter \(normal component\) is below 6700/,
    );
    expect(e.message).not.toMatch(/(\): |; and )at 60 deg,/);
  });

  it('both terms refused: both reasons', () => {
    // Re 1.2e4: 6000 at 60 deg, 5634 at 62 deg.
    const e = failure(() => at(3.0, 62, 1.2e4));
    expect(e.message).toMatch(/at 62\.0 deg, Reynolds number/);
    expect(e.message).toMatch(/; and at 60 deg, Reynolds number/);
  });
});
