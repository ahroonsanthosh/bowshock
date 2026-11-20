/**
 * The wedge-flat section (a plate bevelled at the leading edge only, to a
 * square trailing edge; docs/design/0014-refusals.md W12): its shape, and its
 * faces' exact drag against an oblique-shock solution written here,
 * independent of src/validation/gas-dynamics.ts.
 */

import { describe, expect, it } from 'vitest';
import { finWaveDrag } from '../../src/fins/fin-wave-drag';
import { trapezoidalPlanform } from '../../src/fins/planform';
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

  it('its linear 3D ratio on a rectangle is 1 - b / (2 pi beta s), the tip Mach cone alone (root a wall)', () => {
    // Linear theory, the bevel's slope constant over b (chords) and the flat's zero: only sources on the
    // bevel interact, and with beta s >= b the tip Mach cone from the bevel never reaches the root, so the
    // drag lost to the tip is the bevel's own, b^2 / (pi beta^2) against 2 b s / beta for the strip.
    for (const [mach, span, b] of [
      [2, 1, 0.2],
      [1.5, 0.5, 0.3],
      [3, 2, 0.1],
      [1.8, 0.8, 0.25],
    ] as const) {
      const beta = Math.sqrt(mach * mach - 1);
      expect(beta * span).toBeGreaterThanOrEqual(b);
      const w = finWaveDrag(
        trapezoidalPlanform({ rootChord: 1, span, leadingEdgeSweep: 0 }),
        wedgeFlat(0.04, b),
        mach,
      );
      const closed = 1 - b / (2 * Math.PI * beta * span);
      expect(Math.abs(w.ratio - closed)).toBeLessThanOrEqual(Math.max(1e-6, w.quadratureError));
    }
  });
});
