import { describe, expect, it } from 'vitest';
import { bodyRadius, type Body } from '../../src/geometry/body';
import { characteristics } from '../../src/validation/characteristics';
import { normalShock, prandtlMeyer } from '../../src/validation/gas-dynamics';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

/**
 * The method of characteristics through an expansion corner (design record
 * 0023 section 2.2): the shoulder of a cone-cylinder, and of a boat-tail.
 */

const gamma = 1.4;
const deg = Math.PI / 180;

/** Mach number of the wall flow from its pressure, at entropy k and the free stream's total enthalpy. */
function wallMach(p: number, k: number, mach: number): number {
  const cp = gamma / (gamma - 1);
  const enthalpy = cp + 0.5 * gamma * mach * mach;
  const rho = (p / k) ** (1 / gamma);
  const h = (cp * p) / rho;
  return Math.sqrt((2 * (enthalpy - h)) / ((gamma - 1) * h));
}

/** The boat-tail's drag on the body's cross-section from the march's wall pressures, shoulder to base. */
function tailDrag(
  wall: readonly { x: number; p: number }[],
  body: Body,
  xs: number,
  xb: number,
  mach: number,
): number {
  let start = wall.findIndex((w) => w.x >= xs);
  while (wall[start + 1]!.x <= xs) start++;
  let integral = 0;
  for (let k = start; k + 1 < wall.length && wall[k]!.x < xb; k++) {
    const a = wall[k]!;
    let b = wall[k + 1]!;
    if (b.x > xb) b = { x: xb, p: a.p + ((xb - a.x) / (b.x - a.x)) * (b.p - a.p) };
    const ra = bodyRadius(body, a.x);
    const rb = bodyRadius(body, b.x);
    integral += (0.5 * (a.p + b.p) - 1) * ((rb * rb - ra * ra) / 2);
  }
  const R = body.nose.baseRadius;
  return (2 * integral) / (0.5 * gamma * mach * mach * R * R);
}

describe('method of characteristics through an expansion corner', () => {
  it('a 20 deg cone-cylinder at Mach 3: the cone flow up to the corner, then exactly the Prandtl-Meyer turn', () => {
    // Measured when written: the corner's pressure ahead of the fan, against
    // Taylor-Maccoll, -3.67e-5 and -1.02e-5 on 80 and 160 intervals (and
    // -8.6e-5, -2.0e-6 on 40 and 320).
    const mach = 3;
    const L = 0.5 / Math.tan(20 * deg);
    const body: Body = {
      nose: { shape: { kind: 'conical' }, length: L, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const tm = taylorMaccoll(mach, 20 * deg, gamma);
    const jump = normalShock(mach * Math.sin(tm.shockAngle), gamma);
    const k = jump.pressureRatio / jump.densityRatio ** gamma;
    const errors = [80, 160].map((n) => {
      const corner = characteristics(body, { mach, gamma, intervals: n, start: 1e-3 }).wall.filter(
        (w) => w.x === L,
      );
      expect(corner).toHaveLength(2);
      const [ahead, behind] = [corner[0]!.p, corner[1]!.p];
      // Across the fan the wall streamline turns through the corner's 20 deg.
      const turn =
        prandtlMeyer(wallMach(behind, k, mach), gamma) -
        prandtlMeyer(wallMach(ahead, k, mach), gamma);
      expect(Math.abs(turn - 20 * deg)).toBeLessThan(1e-9);
      return ahead / tm.surfacePressureRatio - 1;
    });
    expect(Math.abs(errors[0]!)).toBeLessThan(5e-5);
    expect(Math.abs(errors[1]!)).toBeLessThan(1.5e-5);
    expect(Math.abs(errors[1]!)).toBeLessThan(Math.abs(errors[0]!) / 2.5);
  }, 120_000);

  it("a boat-tail's drag converges to the march's own extrapolation (6 deg, 1 caliber, Mach 2)", () => {
    // 3-caliber tangent ogive, 3 calibers of cylinder, the boat-tail's cone
    // continued past its base by a body radius. Measured when written on
    // 640, 1280 and 2560 intervals: 0.03456621834, 0.03456631504,
    // 0.03456633780 (order 2.09), extrapolated 0.0345663454
    // (docs/research/boat-tails/out/o3-c3-bt6-l1-m2.jsonl); on 320, 0.0345659016.
    const mach = 2;
    const tan = Math.tan(6 * deg);
    const body: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 3,
      boatTail: { length: 1.5, baseRadius: 0.5 - 1.5 * tan },
    };
    const reference = 0.0345663454;
    const value = (n: number) =>
      tailDrag(
        characteristics(body, { mach, gamma, intervals: n, start: 1e-3 }).wall,
        body,
        6,
        7,
        mach,
      );
    const coarse = value(320);
    const fine = value(640);
    expect(Math.abs(coarse - reference)).toBeLessThan(6e-7);
    expect(Math.abs(fine - reference)).toBeLessThan(2e-7);
    expect(Math.abs(fine - reference)).toBeLessThan(Math.abs(coarse - reference) / 2);
  }, 300_000);
});
