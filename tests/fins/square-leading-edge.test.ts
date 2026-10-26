/**
 * Square-cut leading edges, bounded, not measured
 * (src/fins/square-leading-edge.ts; docs/design/0016-fin-edges-of-flat-plates.md
 * section 21.1; 0014 section 10.7 (aa)): the bounds from the normal-shock
 * relations written out here independently, the band the whole gap and its
 * midpoint, the sweep allowance on both bounds, the domain and every reason.
 */

import { describe, expect, it } from 'vitest';
import { FinRefusal } from '../../src/fins/refusal';
import { SMALLEST_TESTED_SWEEP, SWEEP_ALLOWANCE_SERVED } from '../../src/fins/rounded-leading-edge';
import {
  SONIC_PRESSURE_RATIO,
  SQUARE_EDGE_MACH_RANGE,
  SQUARE_EDGE_REYNOLDS_FLOOR,
  sonicPressureCoefficient,
  squareLeadingEdgeDrag,
} from '../../src/fins/square-leading-edge';

const deg = Math.PI / 180;
const g = 1.4;

/** Pitot over static behind a normal shock, from the Rankine-Hugoniot and isentropic relations. */
function pitotOverStatic(m: number): number {
  const p2 = 1 + ((2 * g) / (g + 1)) * (m * m - 1);
  const m2sq = (1 + ((g - 1) / 2) * m * m) / (g * m * m - (g - 1) / 2);
  return p2 * (1 + ((g - 1) / 2) * m2sq) ** (g / (g - 1));
}
/** The two bounds' pressure coefficients at a normal Mach number, written out. */
function bounds(m: number): { star: number; pitot: number } {
  const q = (g / 2) * m * m;
  const p02 = pitotOverStatic(m);
  const star = (2 / (g + 1)) ** (g / (g - 1));
  return { star: (star * p02 - 1) / q, pitot: (p02 - 1) / q };
}

function failure(f: () => unknown): FinRefusal {
  try {
    f();
  } catch (e) {
    if (e instanceof FinRefusal) return e;
    throw e;
  }
  throw new Error('expected a refusal');
}

const edge = (mach: number, sweepDeg = 0, t = 0.003, re = 1e5) =>
  squareLeadingEdgeDrag({
    mach,
    thickness: t,
    tanLeadingEdgeSweep: Math.tan(sweepDeg * deg),
    reynoldsOnThickness: re,
  });

describe('the bounds', () => {
  it('the sonic pressure ratio is (2 / 2.4)^3.5', () => {
    expect(SONIC_PRESSURE_RATIO).toBeCloseTo(0.528281787717174, 14);
  });

  it("Cp* behind a normal shock: zero at Mach 1, 0.7071 at 2, the record's table to 0.001", () => {
    expect(sonicPressureCoefficient(1)).toBeCloseTo(0, 12);
    const table: [number, number, number][] = [
      [1.2, 0.27, 1.396],
      [1.5, 0.51, 1.532],
      [2.0, 0.707, 1.657],
      [2.5, 0.801, 1.72],
      [3.0, 0.853, 1.756],
    ];
    for (const [m, star, pitot] of table) {
      expect(sonicPressureCoefficient(m)).toBeCloseTo(bounds(m).star, 12);
      expect(Math.abs(sonicPressureCoefficient(m) - star)).toBeLessThan(5e-4);
      expect(Math.abs(bounds(m).pitot - pitot)).toBeLessThan(5e-4);
    }
    expect(sonicPressureCoefficient(2) / bounds(2).pitot).toBeCloseTo(0.4266, 4);
    expect(() => sonicPressureCoefficient(0.99)).toThrow(RangeError);
  });
});

describe('the term, unswept', () => {
  it('Mach 2: between Cp* t and Cp_pitot t, the midpoint served, the band the whole gap', () => {
    const t = 0.003;
    const e = edge(2, 0, t);
    const b = bounds(2);
    expect(e.lowerPerSpan).toBeCloseTo(b.star * t, 15);
    expect(e.upperPerSpan).toBeCloseTo(b.pitot * t, 15);
    expect(e.dragPerSpan).toBeCloseTo(0.5 * (b.star + b.pitot) * t, 15);
    expect(e.band.low * e.dragPerSpan).toBeCloseTo(b.star * t, 15);
    expect(e.band.high * e.dragPerSpan).toBeCloseTo(b.pitot * t, 15);
    // The record's numbers: 0.43 to 1.0 of the pitot term, midpoint 1.18, +-40%.
    expect(e.lowerPerSpan / e.upperPerSpan).toBeCloseTo(0.4266, 4);
    expect(e.dragPerSpan / t).toBeCloseTo(1.182, 3);
    expect(e.band.high - 1).toBeCloseTo(1 - e.band.low, 12);
    expect(e.band.high - 1).toBeCloseTo(0.402, 3);
    expect(e.allowance).toEqual({ low: 1, high: 1 });
    expect(
      e.label.startsWith(
        'bounded, not measured: between the sonic pressure behind a normal shock (p*) and the pitot pressure on the whole face',
      ),
    ).toBe(true);
    expect(e.label).toMatch(/Cp 0\.707 to 1\.657 on the thickness at M_n 2\.000/);
    expect(e.label).toMatch(/the band is the whole gap between them/);
    expect(e.label).toMatch(/root and tip not represented/);
    expect(e.label).not.toMatch(/swept/);
  });

  it('Mach 1.0 exactly: the lower bound is zero drag', () => {
    const e = edge(1);
    expect(e.lowerPerSpan).toBeCloseTo(0, 15);
    expect(e.band.low).toBeCloseTo(0, 12);
    expect(e.band.high).toBeCloseTo(2, 12);
  });

  it('the term scales with the thickness and the lower bound never exceeds the upper', () => {
    expect(edge(2.2, 0, 0.006).dragPerSpan).toBeCloseTo(2 * edge(2.2, 0, 0.003).dragPerSpan, 15);
    for (let m = 1; m <= 3.0001; m += 0.05) {
      const e = edge(Math.min(m, 3));
      expect(e.band.low).toBeLessThanOrEqual(1);
      expect(e.band.low).toBeGreaterThanOrEqual(0);
      expect(e.band.high).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('the term, swept (the independence principle and the sweep allowance on both bounds)', () => {
  it('45 deg at Mach 2.5: the bounds at M_n, on q cos^2, times 0.95 and 1.22', () => {
    const t = 0.0032;
    const e = edge(2.5, 45, t);
    const mn = 2.5 * Math.cos(45 * deg);
    const c2 = Math.cos(45 * deg) ** 2;
    const b = bounds(mn);
    expect(e.normalMach).toBeCloseTo(mn, 14);
    expect(e.lowerPerSpan).toBeCloseTo(b.star * c2 * t, 15);
    expect(e.upperPerSpan).toBeCloseTo(b.pitot * c2 * t, 15);
    expect(e.allowance).toEqual({
      low: SWEEP_ALLOWANCE_SERVED.low,
      high: SWEEP_ALLOWANCE_SERVED.high,
    });
    expect(SWEEP_ALLOWANCE_SERVED).toEqual({ low: 0.95, high: 1.22 });
    const low = b.star * c2 * t * 0.95;
    const high = b.pitot * c2 * t * 1.22;
    expect(e.dragPerSpan).toBeCloseTo(0.5 * (low + high), 15);
    expect(e.band.low * e.dragPerSpan).toBeCloseTo(low, 15);
    expect(e.band.high * e.dragPerSpan).toBeCloseTo(high, 15);
    expect(e.label).toMatch(/swept 45\.0 deg: the independence principle/);
    expect(e.label).toMatch(
      /0\.950 to 1\.220 here, 0\.95 to 1\.22 from 14\.3 deg\), an analogy for a flat face/,
    );
  });

  it('below the smallest yaw tested the allowance tapers to none unswept', () => {
    const half = SMALLEST_TESTED_SWEEP / 2;
    const e = edge(2, half);
    expect(e.allowance.low).toBeCloseTo(1 - 0.05 / 2, 12);
    expect(e.allowance.high).toBeCloseTo(1 + 0.22 / 2, 12);
  });

  it('60 deg itself is served', () => {
    expect(edge(2.4, 60).normalMach).toBeCloseTo(1.2, 12);
  });
});

describe('the domain: every reason given', () => {
  it('beyond 60 deg of sweep', () => {
    const e = failure(() => edge(3, 60.5));
    expect(e.reason).toBe('square-leading-edge');
    expect(e.message).toMatch(
      /^a square-cut leading edge is served bounded, not measured, only where its bounds hold/,
    );
    expect(e.message).toMatch(/swept 60\.5 deg is refused/);
    expect(e.message).toMatch(/reach 60 deg \(RM A55H31 fig\. 12\)/);
  });

  it('a normal Mach number below 1.0, shown with the digits that keep it below', () => {
    const e = failure(() => edge(1.5, 48.2));
    expect(e.reason).toBe('square-leading-edge');
    expect(e.message).toMatch(
      /the Mach number normal to the edge, M cos\(sweep\), 0\.999\d* is below 1\.0/,
    );
    expect(e.message).toMatch(/no shock stands in the flow normal to the edge/);
    expect(SQUARE_EDGE_MACH_RANGE).toEqual([1.0, 3.0]);
  });

  it('above 3.0, and the Reynolds number below 6.7e3: both, joined', () => {
    const e = failure(() => edge(3.1, 0, 0.003, 5e3));
    expect(e.message).toMatch(/the Mach number 3\.10 is above 3\.0/);
    expect(e.message).toMatch(
      /; and the Reynolds number 5\.00e\+3|; and the Reynolds number 5000 on the plate's thickness is below 6700/,
    );
    expect(SQUARE_EDGE_REYNOLDS_FLOOR).toBe(6.7e3);
  });

  it("the Reynolds number's normal component decides", () => {
    // 1e4 on the thickness at 50 deg: 6428, below the floor.
    const e = failure(() => edge(2.5, 50, 0.003, 1e4));
    expect(e.message).toMatch(/thickness \(normal component\) is below 6700/);
    expect(edge(2.5, 45, 0.003, 1e4).reynoldsOnThickness).toBeCloseTo(1e4 * Math.cos(45 * deg), 6);
  });

  it('bad inputs', () => {
    expect(failure(() => edge(2, NaN)).message).toMatch(/bad leading-edge sweep/);
    expect(failure(() => edge(2, 0, 0)).message).toMatch(/bad plate thickness/);
  });
});
