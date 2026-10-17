import { describe, expect, it } from 'vitest';
import { pressureDragFromProfile } from '../../src/analysis/forces';
import { bodyRadius, type Body } from '../../src/geometry/body';
import { noseTipSlope } from '../../src/geometry/nose';
import { characteristics } from '../../src/validation/characteristics';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const gamma = 1.4;
const deg = Math.PI / 180;
const cone = (half: number): Body => ({
  nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(half * deg), baseRadius: 0.5 },
  cylinderLength: 0,
});

/**
 * Pressure drag of the nose from the wall pressures of the march. The
 * integral is closed at the end of the nose with the pressure interpolated
 * there (extrapolated from the last two points where the march ends short
 * of it); carrying the last point's pressure across the gap instead is
 * first order in the gap, which on a nose with a corner at its base reaches
 * a tenth of its length.
 */
const noseDrag = (body: Body, mach: number, wall: readonly { x: number; p: number }[]) => {
  const L = body.nose.length;
  const beyond = wall.findIndex((w) => w.x >= L);
  const k = beyond > 0 ? beyond : wall.length - 1;
  const a = wall[k - 1]!;
  const b = wall[k]!;
  const end = { x: L, p: a.p + ((b.p - a.p) * (L - a.x)) / (b.x - a.x) };
  const tip = taylorMaccoll(mach, Math.atan(noseTipSlope(body.nose)), gamma);
  return pressureDragFromProfile(
    [...wall.filter((w) => w.x < L), end],
    (x) => bodyRadius(body, x),
    { pressure: 1, dynamicPressure: 0.5 * gamma * mach * mach },
    body.nose.baseRadius,
    tip.surfacePressureRatio,
  );
};

describe('method of characteristics on cones: it stays conical', () => {
  // Measured when written (wall pressure, shock angle against
  // Taylor-Maccoll, worst over the march) on 40 and 80 intervals: M 3,
  // 20 deg: 8.7e-6 and 6.6e-6 rad, 2.2e-6 and 1.7e-6; M 2, 15 deg: 1.9e-5
  // and 2.4e-5, 5.0e-6 and 6.1e-6. On 80 and 160: M 1.5, 10 deg: 2.8e-5 and
  // 1.2e-5, 6.9e-6 and 3.0e-6; M 1.3, 7 deg: 9.9e-5 and 1.3e-5, 2.5e-5 and
  // 3.2e-6 (with the starting line in equal steps of polar angle, M 1.5
  // gave 4.3e-3 on 160 intervals and the march failed at M 1.3).
  it.each([
    { mach: 3, half: 20, pressure: 3e-6, angle: 2.5e-6 },
    { mach: 2, half: 15, pressure: 7e-6, angle: 9e-6 },
    { mach: 1.5, half: 10, pressure: 4e-5, angle: 1.8e-5 },
    { mach: 1.3, half: 7, pressure: 1.4e-4, angle: 1.8e-5 },
  ])(
    "M = $mach, $half deg: the body pressure and the shock angle are Taylor-Maccoll's",
    ({ mach, half, pressure, angle }) => {
      const exact = taylorMaccoll(mach, half * deg, gamma);
      const sol = characteristics(cone(half), { mach, gamma, intervals: 80, start: 1e-3 });
      for (const w of sol.wall) {
        expect(Math.abs(w.p / exact.surfacePressureRatio - 1)).toBeLessThan(pressure);
      }
      for (const s of sol.shock) expect(Math.abs(s.angle - exact.shockAngle)).toBeLessThan(angle);
      expect(sol.penetration).toBe(0);
    },
  );

  it('converges at second order, mass balance included', () => {
    // Measured when written: both fall by 3.8 and 3.9 from 20 to 40 to 80
    // intervals.
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

  it.each([
    { mach: 2, calibers: 10, chi: 0.01 },
    { mach: 1.5, calibers: 5, chi: 0.1 },
    { mach: 1.2, calibers: 3, chi: 0.86 },
  ])(
    'M = $mach, $calibers-caliber cone, its shock $chi deg from the C+ lines behind it: second order',
    ({ mach, calibers }) => {
      // With the starting line in equal steps of polar angle the march
      // failed on the first and third on 160 and 320 intervals, and gave the
      // second's pressure 7e-2 wrong on 160. Measured when written: worst
      // wall-pressure errors 3.4e-5, 2.2e-5 and 2.3e-5 on 160 intervals,
      // falling by 4.0 on 320.
      const half = Math.atan(0.5 / calibers) / deg;
      const exact = taylorMaccoll(mach, half * deg, gamma).surfacePressureRatio;
      const worst = (n: number) =>
        Math.max(
          ...characteristics(cone(half), { mach, gamma, intervals: n, start: 1e-3 }).wall.map((w) =>
            Math.abs(w.p / exact - 1),
          ),
        );
      const coarse = worst(160);
      const fine = worst(320);
      expect(coarse).toBeLessThan(5e-5);
      expect(coarse / fine).toBeGreaterThan(3.5);
    },
    60_000,
  );
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
    // Measured when written: at most 6.8e-6 between 160 and 320 intervals,
    // 3.7e-6 between 320 and 640, and 1.7e-6 from moving the start line,
    // although downstream of x/d = 2.4, where the weakening shock runs
    // nearly parallel to the C+ lines behind it, the wall points spread to
    // 0.24 apart on 160 intervals.
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
      expect(Math.abs(cpAt(coarse, x) - cpAt(fine, x))).toBeLessThan(5e-5);
      expect(Math.abs(cpAt(nearer, x) - cpAt(fine, x))).toBeLessThan(5e-5);
    }
  }, 60_000);

  it('gives the forebody pressure drag, converged to 1e-6: Cd = 0.098803', () => {
    // An exact reference for drag on a curved nose. Measured when written:
    // 0.09880130 (160 intervals), 0.09880289 (320), 0.09880328 (640),
    // 0.09880338 (1280), converging at second order to 0.0988034.
    const drag = (n: number) =>
      noseDrag(
        ogive,
        1.98,
        characteristics(ogive, { mach: 1.98, gamma, intervals: n, start: 1e-3 }).wall,
      );
    const fine = drag(640);
    expect(Math.abs(drag(320) - fine)).toBeLessThan(1e-6);
    expect(fine).toBeCloseTo(0.098803, 5);
  }, 120_000);

  it.each([
    { mach: 3.5, half: 25 },
    { mach: 4, half: 20 },
    { mach: 4, half: 25 },
    { mach: 5, half: 30 },
  ])(
    'M = $mach, $half deg, where C- lines run near parallel to the axis: still second order',
    ({ mach, half }) => {
      // The axisymmetric term's 1 / sin(theta - mu) is singular where
      // theta = mu; it is integrated as sin(theta) / M along the arc
      // length. Measured when written: worst wall-pressure errors 2.8e-6 to
      // 5.8e-6 on 40 intervals, falling by 4 on 80.
      const exact = taylorMaccoll(mach, half * deg, gamma).surfacePressureRatio;
      const worst = (n: number) =>
        Math.max(
          ...characteristics(cone(half), { mach, gamma, intervals: n, start: 1e-3 }).wall.map((w) =>
            Math.abs(w.p / exact - 1),
          ),
        );
      const coarse = worst(40);
      const fine = worst(80);
      expect(coarse).toBeLessThan(1e-5);
      expect(Math.log2(coarse / fine)).toBeGreaterThan(1.8);
    },
  );
});

describe('method of characteristics on long tangent ogives', () => {
  it('runs on the 5.75-caliber ogive of NACA RM A53E01 at M = 1.96 to 1.98, smoothly in Mach', () => {
    // The march once refused M = 1.96 and 1.97, the tip cone's own ray
    // lying a few 1e-15 rad outside its Taylor-Maccoll samples. Measured
    // when written: 0.03079422, 0.03078073, 0.03076719, 0.03075402 and
    // 0.03074072, second differences under 2e-7.
    const body: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 5.75, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const drags = [1.96, 1.965, 1.97, 1.975, 1.98].map((mach) =>
      noseDrag(
        body,
        mach,
        characteristics(body, { mach, gamma, intervals: 160, start: 1e-3 }).wall,
      ),
    );
    for (let k = 1; k + 1 < drags.length; k++) {
      expect(Math.abs(drags[k]! - 0.5 * (drags[k - 1]! + drags[k + 1]!))).toBeLessThan(1e-6);
    }
  }, 60_000);

  it('converges on a 10-caliber ogive at M = 1.5, where the shock is 0.1 deg from the C+ lines', () => {
    // With the starting line in equal steps of polar angle the drag was
    // 0.006 on 160 intervals and 0.011 on 320. Measured when written:
    // 0.01117724 and 0.01117644.
    const body: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 10, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const drag = (n: number) =>
      noseDrag(
        body,
        1.5,
        characteristics(body, { mach: 1.5, gamma, intervals: n, start: 1e-3 }).wall,
      );
    expect(Math.abs(drag(160) - drag(320))).toBeLessThan(2e-6);
  }, 60_000);
});
