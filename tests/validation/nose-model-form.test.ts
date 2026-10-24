import { describe, expect, it } from 'vitest';
import {
  allowanceAt,
  BOX_FINENESS,
  BOX_MACH,
  boxOf,
  COVERAGE_LIMIT,
  evaluateCase,
  noseBand,
  publishedFloor,
  type Box,
  type MeasuredCase,
} from '../../src/validation/nose-model-form';

// Synthetic bodies only: no source's values (0022 section 4.3 is checked
// here before any reading reaches it).

/** A cone of `fineness` calibers, base radius 0.5. */
const cone = (fineness: number) => (x: number) => (0.5 * x) / fineness;

function coneCase(over: Partial<MeasuredCase> & Pick<MeasuredCase, 'readings'>): MeasuredCase {
  return {
    id: 'synthetic cone',
    family: 'cone',
    fineness: 4,
    mach: 2,
    reynolds: '1e6 on d',
    radius: cone(4),
    inviscidCp: () => 0.1,
    cpUncertainty: 0.002,
    seen: false,
    ...over,
  };
}

const xs = [0.4, 1, 1.6, 2.2, 2.8, 3.4, 4];
const uniform = (cp: number) => xs.map((x) => ({ x, cp }));

describe('0022 4.3: the like-for-like difference', () => {
  it('is zero when the measured pressures equal the inviscid ones at the stations, whatever the shape', () => {
    // A tangent-ogive-like profile and a non-linear inviscid Cp.
    const radius = (x: number) => 0.5 * Math.sin((Math.PI / 2) * (x / 3)) ** 0.8;
    const inviscidCp = (x: number) => 0.3 * Math.exp(-x) - 0.05 * x;
    const stations = [0.2, 0.7, 1.3, 2, 2.6, 3].map((x) => ({ x, cp: inviscidCp(x) }));
    const res = evaluateCase(
      coneCase({
        family: 'tangent ogive',
        fineness: 3,
        radius,
        inviscidCp,
        readings: [{ label: 'equal', stations }],
      }),
    );
    for (const e of res.evaluations) expect(Math.abs(e.r)).toBeLessThan(1e-14);
  });

  it('on a cone of constant Cp, a uniform excess d gives r = d (1 - r1^2 / R^2), the tip stretch carrying none', () => {
    const d = 0.08;
    const res = evaluateCase(
      coneCase({ readings: [{ label: 'x', stations: uniform(0.1 * (1 + d)) }] }),
    );
    const r1 = 0.5 * (0.4 / 4);
    const expected = d * (1 - (r1 * r1) / 0.25);
    expect(res.evaluations[0]!.r).toBeCloseTo(expected, 12);
    // The inviscid nose drag of a constant-Cp cone is that Cp.
    expect(res.inviscidNoseDrag).toBeCloseTo(0.1, 12);
  });

  it('stations behind the shoulder are not on the nose and are left out', () => {
    const res = evaluateCase(
      coneCase({
        readings: [{ label: 'x', stations: [...uniform(0.1), { x: 5, cp: 9 }, { x: 6, cp: -9 }] }],
      }),
    );
    expect(res.stations).toEqual(xs);
    expect(Math.abs(res.evaluations[0]!.r)).toBeLessThan(1e-14);
  });

  it('the last station is held to the shoulder', () => {
    // Stations end at x = 3 of a 4-caliber cone; the measured last value is
    // 0.2 against 0.1: the held stretch carries 0.1 (1 - (3/4)^2).
    const stations = [0.4, 1, 2, 3].map((x) => ({ x, cp: x === 3 ? 0.2 : 0.1 }));
    const res = evaluateCase(coneCase({ readings: [{ label: 'x', stations }] }));
    const e = res.evaluations[0]!;
    const trapezoid = 0.5 * 0.1 * ((0.5 * 3) / 4) ** 2 - 0.5 * 0.1 * ((0.5 * 2) / 4) ** 2;
    const held = 0.1 * (0.25 - ((0.5 * 3) / 4) ** 2);
    expect(e.measuredDrag - e.inviscidDrag).toBeCloseTo((trapezoid + held) / 0.25, 12);
  });
});

describe('0022 4.3 items 3 and 5: coverage and the uncertainty terms', () => {
  it('reports the share outside the orifices and refuses a body above a tenth', () => {
    // Constant Cp: the share outside is the uncovered area, (x1 / L)^2 here.
    const near = evaluateCase(coneCase({ readings: [{ label: 'x', stations: uniform(0.1) }] }));
    expect(near.uncoveredShare).toBeCloseTo((0.4 / 4) ** 2, 10);
    expect(near.sets).toBe(true);
    const far = [1.4, 2, 3, 4].map((x) => ({ x, cp: 0.1 }));
    const res = evaluateCase(coneCase({ readings: [{ label: 'x', stations: far }] }));
    expect(res.uncoveredShare).toBeCloseTo((1.4 / 4) ** 2, 10);
    expect(res.uncoveredShare).toBeGreaterThan(COVERAGE_LIMIT);
    expect(res.sets).toBe(false);
    expect(res.halfWidth).toBeNull();
    // Its evaluations are still reported.
    expect(res.evaluations).toHaveLength(1);
  });

  it('u_meas = e A_bias / D_inv and u_unc = A_unc max|dCp| / D_inv', () => {
    const stations = uniform(0.1).map((s, i) => (i === 3 ? { ...s, cp: 0.13 } : s));
    const res = evaluateCase(coneCase({ readings: [{ label: 'x', stations }] }));
    const e = res.evaluations[0]!;
    const aCov = 1 - (0.4 / 4) ** 2;
    expect(res.coveredArea).toBeCloseTo(aCov, 12);
    expect(e.uMeas).toBeCloseTo((0.002 * aCov) / 0.1, 10);
    expect(e.uUnc).toBeCloseTo(((1 - aCov) * 0.03) / 0.1, 10);
    expect(e.halfWidth).toBeCloseTo(Math.abs(e.r) + e.uMeas + e.uUnc, 14);
  });

  it('the stretch behind the last orifice counts in the uncovered share', () => {
    // Ahead of the first orifice 1% of the drag, behind the last 9.75%:
    // neither alone exceeds a tenth, together they do.
    const stations = [0.4, 1, 2, 3, 3.8].map((x) => ({ x, cp: 0.1 }));
    const res = evaluateCase(coneCase({ readings: [{ label: 'x', stations }] }));
    expect(res.uncoveredShare).toBeCloseTo((0.4 / 4) ** 2 + (1 - (3.8 / 4) ** 2), 10);
    expect(res.uncoveredShare).toBeGreaterThan(COVERAGE_LIMIT);
    expect(res.sets).toBe(false);
  });

  it('u_meas acts from the first orifice to the shoulder: the held value carries the bias too', () => {
    // Stations end at 3 of 4 calibers; a uniform bias e on every reading
    // moves the like-for-like drag by e (R^2 - r1^2) / R^2, and u_meas is
    // exactly that over D_inv.
    const e = 0.002;
    const stations = [0.4, 1, 2, 3].map((x) => ({ x, cp: 0.1 }));
    const base = evaluateCase(coneCase({ readings: [{ label: 'x', stations }] }));
    const biased = evaluateCase(
      coneCase({
        readings: [{ label: 'x', stations: stations.map((s) => ({ ...s, cp: s.cp + e })) }],
      }),
    );
    const area = 1 - (0.4 / 4) ** 2;
    expect(base.biasArea).toBeCloseTo(area, 12);
    expect(base.coveredArea).toBeCloseTo((3 / 4) ** 2 - (0.4 / 4) ** 2, 12);
    const shift = biased.evaluations[0]!.measuredDrag - base.evaluations[0]!.measuredDrag;
    expect(shift).toBeCloseTo(e * area, 12);
    expect(base.evaluations[0]!.uMeas).toBeCloseTo(
      (e * area) / base.evaluations[0]!.inviscidDrag,
      12,
    );
  });

  it('takes every ambiguous cell each way and every reading, and keeps the largest', () => {
    const a = uniform(0.1).map((s, i) =>
      i === 2
        ? { ...s, alternatives: [0.12] }
        : i === 4
          ? { ...s, alternatives: [0.09, 0.115] }
          : s,
    );
    const b = uniform(0.104);
    const res = evaluateCase(
      coneCase({
        readings: [
          { label: 'first', stations: a },
          { label: 'second', stations: b },
        ],
      }),
    );
    expect(res.evaluations).toHaveLength(2 * 3 + 1);
    expect(res.halfWidth).toBe(Math.max(...res.evaluations.map((e) => e.halfWidth)));
    const first = res.evaluations.filter((e) => e.reading === 'first');
    expect(new Set(first.map((e) => e.cps.join(','))).size).toBe(6);
  });

  it('refuses readings that disagree on the stations', () => {
    expect(() =>
      evaluateCase(
        coneCase({
          readings: [
            { label: 'a', stations: uniform(0.1) },
            { label: 'b', stations: uniform(0.1).slice(1) },
          ],
        }),
      ),
    ).toThrow(/disagree/);
  });
});

describe('0022 section 5: the published floors', () => {
  it('TN 3716 14.4% and RM A53E01 16.1%, from the published figures as sources.md gives them', () => {
    expect(publishedFloor([0.1068, 0.108], 0.0988, 0.005)).toBeCloseTo(0.1437, 4);
    expect(publishedFloor([0.0298, 0.0298], 0.03074, 0.004)).toBeCloseTo(0.1607, 4);
  });
});

describe('0022 4.4: the union of boxes, the floor a lower limit only', () => {
  const box = (over: Partial<Box>): Box => ({
    id: 'b',
    family: 'tangent ogive',
    fineness: 3,
    mach: 1.98,
    reynolds: 'x',
    seen: true,
    halfWidth: 0.1,
    floor: null,
    ...over,
  });
  const a = box({ id: 'a', fineness: 3, halfWidth: 0.1, floor: 0.144 });
  const b = box({ id: 'b', fineness: 5.75, halfWidth: 0.2, floor: 0.161 });

  it('covers a case only inside a box: never between two (no hull)', () => {
    expect(allowanceAt([a, b], 'tangent ogive', 4.5, 1.98)).toBeNull();
    expect(allowanceAt([a, b], 'tangent ogive', 3 + BOX_FINENESS, 1.98 + BOX_MACH)).not.toBeNull();
    expect(allowanceAt([a, b], 'tangent ogive', 3 + BOX_FINENESS + 1e-6, 1.98)).toBeNull();
    expect(allowanceAt([a, b], 'tangent ogive', 3, 1.98 + BOX_MACH + 1e-6)).toBeNull();
    expect(allowanceAt([a, b], 'cone', 3, 1.98)).toBeNull();
  });

  it('the floor holds against a narrower half-width and gives way to a wider one', () => {
    expect(allowanceAt([a], 'tangent ogive', 3, 1.98)!.halfWidth).toBe(0.144);
    expect(allowanceAt([b], 'tangent ogive', 5.75, 1.98)!.halfWidth).toBe(0.2);
  });

  it('a body that set nothing still carries its floor; one with neither carries nothing', () => {
    expect(
      allowanceAt([box({ halfWidth: null, floor: 0.144 })], 'tangent ogive', 3, 1.98)!.halfWidth,
    ).toBe(0.144);
    expect(
      allowanceAt([box({ halfWidth: null, floor: null })], 'tangent ogive', 3, 1.98),
    ).toBeNull();
  });

  it('overlapping boxes: the largest; seenOnly only when every one is seen', () => {
    const c = box({ id: 'c', fineness: 3.2, halfWidth: 0.3, floor: null, seen: false });
    const al = allowanceAt([a, c], 'tangent ogive', 3.1, 1.98)!;
    expect(al.halfWidth).toBe(0.3);
    expect(al.boxes.map((x) => x.id)).toEqual(['a', 'c']);
    expect(al.seenOnly).toBe(false);
    expect(allowanceAt([a], 'tangent ogive', 3.1, 1.98)!.seenOnly).toBe(true);
  });

  it('boxOf carries the case and its floor', () => {
    const res = evaluateCase(coneCase({ readings: [{ label: 'x', stations: uniform(0.1) }] }));
    const bx = boxOf(res, 0.05);
    expect(bx).toMatchObject({ family: 'cone', fineness: 4, mach: 2, floor: 0.05, seen: false });
    expect(bx.halfWidth).toBe(res.halfWidth);
  });
});

describe('0022 4.3, the sign rule: the nose band in the total', () => {
  it('is symmetric, the allowance on the term and the numerical band beside it', () => {
    const { low, high } = noseBand(0.1, 0.15, 1e-5);
    expect(low).toBeCloseTo(0.085 - 1e-5, 14);
    expect(high).toBeCloseTo(0.115 + 1e-5, 14);
  });
});
