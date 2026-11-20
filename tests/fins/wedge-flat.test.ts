/**
 * The wedge-flat section (a plate bevelled at the leading edge only, to a
 * square trailing edge; docs/design/0014-refusals.md W12): its shape, and its
 * faces' exact drag against an oblique-shock solution written here,
 * independent of src/validation/gas-dynamics.ts.
 */

import { describe, expect, it } from 'vitest';
import { exactSectionDrag } from '../../src/fins/section-drag';
import { validateSymmetricSection, wedgeFlat } from '../../src/fins/section';

const GAMMA = 1.4;

/** Flow deflection behind an oblique shock of wave angle beta (the theta-beta-M relation). */
function deflection(mach: number, beta: number): number {
  const s2 = Math.sin(beta) ** 2;
  return Math.atan(
    (2 / Math.tan(beta)) *
      ((mach * mach * s2 - 1) / (mach * mach * (GAMMA + Math.cos(2 * beta)) + 2)),
  );
}

/** The weak oblique shock's pressure coefficient at deflection theta, by bisection. */
function wedgeCp(mach: number, theta: number): number {
  const mu = Math.asin(1 / mach);
  // The largest deflection's wave angle, by ternary search on the unimodal deflection.
  let lo = mu;
  let hi = Math.PI / 2;
  for (let k = 0; k < 200; k++) {
    const a = lo + (hi - lo) / 3;
    const b = hi - (hi - lo) / 3;
    if (deflection(mach, a) < deflection(mach, b)) lo = a;
    else hi = b;
  }
  const betaMax = (lo + hi) / 2;
  if (theta > deflection(mach, betaMax)) throw new Error('detached');
  lo = mu;
  hi = betaMax;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (deflection(mach, mid) < theta) lo = mid;
    else hi = mid;
  }
  const beta = (lo + hi) / 2;
  const pressureRatio = 1 + ((2 * GAMMA) / (GAMMA + 1)) * (mach * mach * Math.sin(beta) ** 2 - 1);
  return (pressureRatio - 1) / ((GAMMA * mach * mach) / 2);
}

describe('wedgeFlat', () => {
  it('is a bevel to the full thickness, a flat, and a blunt trailing edge of that thickness', () => {
    const s = wedgeFlat(0.05, 0.2);
    expect(s).toEqual({
      x: [0, 0.2, 1],
      halfThickness: [0, 0.025, 0.025],
      bluntTrailingEdge: true,
    });
    expect(() => {
      validateSymmetricSection(s);
    }).not.toThrow();
  });

  it('refuses a thickness or a bevel that leaves no such section', () => {
    expect(() => wedgeFlat(0, 0.2)).toThrow(RangeError);
    expect(() => wedgeFlat(-0.05, 0.2)).toThrow(RangeError);
    expect(() => wedgeFlat(Number.NaN, 0.2)).toThrow(RangeError);
    expect(() => wedgeFlat(0.05, 0)).toThrow(RangeError);
    expect(() => wedgeFlat(0.05, 1)).toThrow(RangeError);
    expect(() => wedgeFlat(0.05, Number.NaN)).toThrow(RangeError);
  });

  it("its faces' drag is the bevel's oblique-shock pressure on the thickness, and exact", () => {
    // Bevel half-angles 8 to 15 deg (the audit population's), on short and long bevels, Mach 1.5 to 3:
    // waves reflected from the shock land on the flat, which carries no drag, so the value is exact.
    for (const [tc, deg, mach] of [
      [0.05, 8, 1.5],
      [0.04, 10, 2],
      [0.024, 12, 2.4],
      [0.06, 15, 3],
      [0.02, 15, 1.8],
    ] as const) {
      const bevel = tc / 2 / Math.tan((deg * Math.PI) / 180);
      const d = exactSectionDrag(wedgeFlat(tc, bevel), mach);
      expect(d.exact).toBe(true);
      expect(d.cd).toBeCloseTo(wedgeCp(mach, (deg * Math.PI) / 180) * tc, 12);
    }
  });
});
