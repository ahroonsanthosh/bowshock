import { describe, expect, it } from 'vitest';
import { machAngle, stagnationPressureRatio } from '../../src/validation/gas-dynamics';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const gamma = 1.4;
const deg = Math.PI / 180;

describe('Taylor-Maccoll cone flow', () => {
  it('reproduces the NPARC/WIND validation case: 10 deg cone at Mach 2.35', () => {
    // NASA Glenn NPARC Alliance validation archive, "Conical Shock on a 10
    // Degree Cone at Mach 2.35" (https://www.grc.nasa.gov/WWW/wind/valid/
    // cone10/cone10.html). Its theory table (from the HAP program of Heiser
    // and Pratt) gives M = 2.2677 behind the shock and M = 2.1469 on the
    // cone; five CFD codes on the same page give a surface pressure of
    // p/p1 = 1.3740 to 1.3741 and a grid-converged surface Mach number of
    // 2.1467886.
    //
    // The same table's shock angle (27.1843 deg) and static ratios (p/p1 =
    // 1.1781 behind the shock, 1.4234 on the cone) are inconsistent with its
    // own Mach numbers: at a 27.1843 deg shock, energy conservation forces
    // M = 2.245 behind it, not 2.2677; and isentropic flow to M = 2.1469
    // gives p/p1 = 1.3741, not 1.4234. Both tabulated pressures are about
    // 3.6% above the consistent values, which is why the page reports a
    // 3.5% "error" for every CFD code. We test against the self-consistent
    // values: the tabulated Mach numbers and the CFD surface pressure.
    const flow = taylorMaccoll(2.35, 10 * deg, gamma);
    expect(flow.postShockMach).toBeCloseTo(2.2677, 3);
    expect(flow.surfaceMach).toBeCloseTo(2.1469, 3);
    expect(Math.abs(flow.surfaceMach - 2.1467886)).toBeLessThan(2e-4);
    expect(Math.abs(flow.surfacePressureRatio - 1.37405)).toBeLessThan(5e-4);
    // And it is self-consistent: surface pressure isentropic from the
    // surface Mach number.
    const isentropic =
      stagnationPressureRatio(2.35, gamma) / stagnationPressureRatio(flow.surfaceMach, gamma);
    expect(flow.surfacePressureRatio).toBeCloseTo(isentropic, 3);
  });

  it('converges as the integration tolerance tightens', () => {
    const at = (tolerance: number) => taylorMaccoll(2, 15 * deg, gamma, tolerance).surfaceMach;
    const reference = at(1e-14);
    expect(Math.abs(at(1e-8) - reference)).toBeLessThan(1e-6);
    expect(Math.abs(at(1e-11) - reference)).toBeLessThan(Math.abs(at(1e-8) - reference) + 1e-12);
    expect(Math.abs(at(1e-11) - reference)).toBeLessThan(1e-9);
  });

  it('approaches slender-body theory as the cone angle tends to zero', () => {
    // Slender-body theory for a cone of half-angle theta, with
    // beta = sqrt(M^2 - 1): Cp = 2 theta^2 (ln(2 / (beta theta)) - 1/2). It is
    // the small-angle limit, so agreement must improve as theta shrinks, and
    // the shock must approach the Mach angle.
    const mach = 3;
    const slender = (theta: number) =>
      2 * theta * theta * (Math.log(2 / (Math.sqrt(mach * mach - 1) * theta)) - 0.5);
    const mismatch = (cone: number) =>
      Math.abs(
        taylorMaccoll(mach, cone * deg, gamma).surfacePressureCoefficient / slender(cone * deg) - 1,
      );
    expect(mismatch(0.5)).toBeLessThan(mismatch(1));
    expect(mismatch(1)).toBeLessThan(mismatch(2));
    expect(mismatch(0.5)).toBeLessThan(5e-3);
    const thin = taylorMaccoll(mach, 0.05 * deg, gamma);
    expect(thin.shockAngle - machAngle(mach)).toBeGreaterThan(0);
    expect(thin.shockAngle - machAngle(mach)).toBeLessThan(1e-8);
  });

  it('compresses isentropically between the shock and the cone', () => {
    // The flow keeps turning behind a conical shock, unlike behind a wedge:
    // the surface pressure exceeds the post-shock pressure, and the surface
    // Mach number is lower than the post-shock Mach number.
    for (const [mach, cone] of [
      [1.5, 10],
      [2, 20],
      [4, 30],
    ] as const) {
      const flow = taylorMaccoll(mach, cone * deg, gamma);
      expect(flow.surfacePressureRatio).toBeGreaterThan(flow.postShockPressureRatio);
      expect(flow.surfaceMach).toBeLessThan(flow.postShockMach);
      expect(flow.shockAngle).toBeGreaterThan(cone * deg);
    }
  });

  it('refuses cones beyond shock detachment', () => {
    expect(() => taylorMaccoll(1.5, 40 * deg, gamma)).toThrow(RangeError);
  });
});
