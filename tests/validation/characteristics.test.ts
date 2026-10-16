import { describe, expect, it } from 'vitest';
import type { Body } from '../../src/geometry/body';
import { characteristics } from '../../src/validation/characteristics';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const gamma = 1.4;
const deg = Math.PI / 180;
const cone = (half: number): Body => ({
  nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(half * deg), baseRadius: 0.5 },
  cylinderLength: 0,
});

describe('method of characteristics on cones: it stays conical', () => {
  // Measured when written (wall pressure, shock angle against
  // Taylor-Maccoll, worst over the march): M 3, 20 deg: 1.4e-4 and 1.4e-5
  // rad with 40 intervals, 3.5e-5 and 3.4e-6 with 80; M 2, 15 deg: 6.7e-4
  // and 9.0e-5, 1.5e-4 and 2.3e-5; M 1.5, 10 deg: 1.4e-2 and 1.2e-3 with
  // 80, 4.3e-3 and 3.1e-4 with 160.
  it.each([
    { mach: 3, half: 20, n: 80, pressure: 5e-5, angle: 5e-6 },
    { mach: 2, half: 15, n: 80, pressure: 2e-4, angle: 3e-5 },
    { mach: 1.5, half: 10, n: 160, pressure: 5e-3, angle: 4e-4 },
  ])(
    "M = $mach, $half deg: the body pressure and the shock angle are Taylor-Maccoll's",
    ({ mach, half, n, pressure, angle }) => {
      const exact = taylorMaccoll(mach, half * deg, gamma);
      const sol = characteristics(cone(half), { mach, gamma, intervals: n, start: 1e-3 });
      for (const w of sol.wall) {
        expect(Math.abs(w.p / exact.surfacePressureRatio - 1)).toBeLessThan(pressure);
      }
      for (const s of sol.shock) expect(Math.abs(s.angle - exact.shockAngle)).toBeLessThan(angle);
      expect(sol.penetration).toBe(0);
    },
  );

  it('converges at second order, mass balance included', () => {
    const exact = taylorMaccoll(3, 20 * deg, gamma);
    const errors = [20, 40, 80].map((n) => {
      const sol = characteristics(cone(20), { mach: 3, gamma, intervals: n, start: 1e-3 });
      const worst = Math.max(
        ...sol.wall.map((w) => Math.abs(w.p / exact.surfacePressureRatio - 1)),
      );
      return { worst, mass: sol.massBalance };
    });
    for (let k = 1; k < errors.length; k++) {
      expect(errors[k - 1]!.worst / errors[k]!.worst).toBeGreaterThan(3.5);
      expect(errors[k - 1]!.mass / errors[k]!.mass).toBeGreaterThan(3.5);
    }
  });
});

describe('method of characteristics on the TN 3716 ogive (M = 1.98)', () => {
  const ogive: Body = {
    nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
    cylinderLength: 7,
  };
  const q = 0.5 * gamma * 1.98 ** 2;
  const cpAt = (wall: readonly { x: number; p: number }[], x: number) => {
    let k = 0;
    while (k < wall.length - 2 && wall[k + 1]!.x < x) k++;
    const a = wall[k]!;
    const b = wall[k + 1]!;
    return (a.p + ((b.p - a.p) * (x - a.x)) / (b.x - a.x) - 1) / q;
  };

  it('is converged: halving the mesh and moving the start line change Cp by under 5e-5', () => {
    // Measured when written: at most 2.0e-5 between 160 and 320 intervals,
    // and 6e-6 between 320 and 640. Downstream of x/d = 2.4, where the
    // weakening shock runs nearly parallel to the C+ lines behind it, the
    // wall points spread to about 0.1 apart on the 160-interval mesh, so
    // interpolated values there are taken from 320 intervals.
    const stations = [0.22, 0.89, 1.61, 2.95, 3.62, 4.06, 6.28, 8.06];
    const coarse = characteristics(ogive, { mach: 1.98, gamma, intervals: 160, start: 1e-3 }).wall;
    const fine = characteristics(ogive, { mach: 1.98, gamma, intervals: 320, start: 1e-3 }).wall;
    const nearer = characteristics(ogive, {
      mach: 1.98,
      gamma,
      intervals: 320,
      start: 2.5e-4,
    }).wall;
    for (const x of stations) {
      if (x < 2.4) expect(Math.abs(cpAt(coarse, x) - cpAt(fine, x))).toBeLessThan(5e-5);
      expect(Math.abs(cpAt(nearer, x) - cpAt(fine, x))).toBeLessThan(5e-5);
    }
  }, 60_000);
});
