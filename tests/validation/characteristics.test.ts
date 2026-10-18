import { describe, expect, it } from 'vitest';
import { pressureDragFromProfile } from '../../src/analysis/forces';
import { bodyRadius, type Body } from '../../src/geometry/body';
import { noseTipSlope } from '../../src/geometry/nose';
import {
  characteristics,
  characteristicsFrom,
  type CharacteristicPoint,
  type CharacteristicsSolution,
  type StartingLine,
  type StartingState,
} from '../../src/validation/characteristics';
import { deflectionAngle, normalShock } from '../../src/validation/gas-dynamics';
import { coneFlowField, taylorMaccoll } from '../../src/validation/taylor-maccoll';
import { ELLIPSOID_START_LINE } from '../support/ellipsoid-start-line';

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
    // Measured when written: from 20 to 40 to 80 intervals the pressure
    // error falls by 3.8 and 3.9, the mass balance by 4.1 and 4.1.
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
  // Marches shared between the tests below.
  const solutions = new Map<string, CharacteristicsSolution>();
  const solve = (intervals: number, start: number) => {
    const key = `${intervals} ${start}`;
    let sol = solutions.get(key);
    if (!sol) {
      sol = characteristics(ogive, { mach: 1.98, gamma, intervals, start });
      solutions.set(key, sol);
    }
    return sol;
  };
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
    const coarse = solve(160, 1e-3).wall;
    const fine = solve(320, 1e-3).wall;
    const nearer = solve(320, 2.5e-4).wall;
    for (const x of stations) {
      expect(Math.abs(cpAt(coarse, x) - cpAt(fine, x))).toBeLessThan(5e-5);
      expect(Math.abs(cpAt(nearer, x) - cpAt(fine, x))).toBeLessThan(5e-5);
    }
  }, 60_000);

  it('gives the forebody pressure drag at second order, extrapolating to Cd = 0.0988034', () => {
    // A converged reference for drag on a curved nose, which the fitted
    // solver is held to within 1e-5 of its value and less (0006), so it is
    // held here to well below that. Measured when written: 0.09880130 (160
    // intervals), 0.09880289 (320), 0.09880328 (640), 0.09880338 (1280):
    // the differences fall by 4.08, and the second-order extrapolation from
    // 320 and 640 is 0.09880341.
    const drag = (n: number) => noseDrag(ogive, 1.98, solve(n, 1e-3).wall);
    const [d160, d320, d640] = [drag(160), drag(320), drag(640)];
    const ratio = (d320 - d160) / (d640 - d320);
    expect(ratio).toBeGreaterThan(3.5);
    expect(ratio).toBeLessThan(4.6);
    expect(Math.abs(d640 - d320)).toBeLessThan(6e-7);
    const extrapolated = d640 + (d640 - d320) / 3;
    expect(Math.abs(extrapolated - 0.0988034)).toBeLessThan(5e-8);
  }, 120_000);

  it('balances the mass of its march, apart from the starting line defect of order start', () => {
    // The conical starting data end on the tip cone, inside which the body
    // lies, so psi at the body end of the starting line is not zero, and
    // every later line carries that defect. Measured when written: 7.915e-4
    // of the mass inside the shock on 160 intervals, 7.950e-4 on 320 and
    // 1.985e-4 with the starting line four times nearer. Measured from the
    // starting line, the balance of the march is 1.75e-5 on 160 intervals,
    // 5.6e-6 on 320 and 1.1e-6 on 640; measured from zero, as it once was,
    // it stayed at the defect (1.75e-3 on 320 and 640 intervals at Mach 3,
    // the same nose on a 1-caliber cylinder).
    const coarse = solve(160, 1e-3);
    const fine = solve(320, 1e-3);
    const nearer = solve(320, 2.5e-4);
    expect(Math.abs(coarse.startMassDefect / fine.startMassDefect - 1)).toBeLessThan(0.01);
    expect(Math.abs(fine.startMassDefect / (4 * nearer.startMassDefect) - 1)).toBeLessThan(0.01);
    expect(fine.massBalance).toBeLessThan(1e-5);
    expect(coarse.massBalance / fine.massBalance).toBeGreaterThan(2.5);
  }, 60_000);

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

/**
 * Pressure drag (on the base area) of the body from the first wall point
 * to the end of the nose: the part that a march from given data covers,
 * closed at the end of the nose as noseDrag.
 */
const downstreamDrag = (body: Body, mach: number, wall: readonly { x: number; p: number }[]) => {
  const L = body.nose.length;
  const beyond = wall.findIndex((w) => w.x >= L);
  const k = beyond > 0 ? beyond : wall.length - 1;
  const a = wall[k - 1]!;
  const b = wall[k]!;
  const end = { x: L, p: a.p + ((b.p - a.p) * (L - a.x)) / (b.x - a.x) };
  return pressureDragFromProfile(
    [...wall.filter((w) => w.x < L), end],
    (x) => bodyRadius(body, x),
    { pressure: 1, dynamicPressure: 0.5 * gamma * mach * mach },
    body.nose.baseRadius,
    1,
  );
};

/** The full state from pressure, flow angle and entropy, at the free stream's total enthalpy. */
const stateOf = (
  mach: number,
  at: { x: number; y: number; p: number; theta: number; k: number },
): StartingState => {
  const cp = gamma / (gamma - 1);
  const enthalpy = cp + 0.5 * gamma * mach * mach;
  const rho = (at.p / at.k) ** (1 / gamma);
  const v = Math.sqrt(2 * (enthalpy - (cp * at.p) / rho));
  return { x: at.x, y: at.y, rho, u: v * Math.cos(at.theta), v: v * Math.sin(at.theta), p: at.p };
};

/** Entropy p / rho^gamma behind an oblique shock of wave angle beta. */
const shockEntropy = (mach: number, beta: number) => {
  const s = normalShock(mach * Math.sin(beta), gamma);
  return s.pressureRatio / s.densityRatio ** gamma;
};

/**
 * Taylor-Maccoll data on the straight line from the cone's surface at x0,
 * at angle phi to the axis, to its shock: count + 1 points.
 */
const coneLine = (
  mach: number,
  half: number,
  x0: number,
  phi: number,
  count: number,
): StartingLine => {
  const field = coneFlowField(mach, half, gamma);
  const beta = field.flow.shockAngle;
  const k = shockEntropy(mach, beta);
  const cp = gamma / (gamma - 1);
  const vMax = Math.sqrt(2 * (cp + 0.5 * gamma * mach * mach));
  const y0 = x0 * Math.tan(half);
  const h = (x0 * Math.tan(beta) - y0) / (Math.sin(phi) - Math.cos(phi) * Math.tan(beta));
  const points = Array.from({ length: count + 1 }, (_, j) => {
    const x = x0 + ((h * j) / count) * Math.cos(phi);
    const y = y0 + ((h * j) / count) * Math.sin(phi);
    const c = field.at(Math.min(Math.max(Math.atan2(y, x), half), beta));
    const v = c.speed * vMax;
    const rho = ((0.5 * (vMax * vMax - v * v)) / (cp * k)) ** (1 / (gamma - 1));
    return stateOf(mach, { x, y, p: k * rho ** gamma, theta: c.flowAngle, k });
  });
  return { points, shockAngle: beta };
};

/** Cubic Lagrange interpolation in t through the four of (ts, fs) nearest to t. */
const cubicAt = (ts: readonly number[], fs: readonly number[], t: number) => {
  let k = 0;
  while (k < ts.length - 2 && ts[k + 1]! <= t) k++;
  const k0 = Math.min(Math.max(k - 1, 0), ts.length - 4);
  let sum = 0;
  for (let a = 0; a < 4; a++) {
    let w = 1;
    for (let b = 0; b < 4; b++) if (b !== a) w *= (t - ts[k0 + b]!) / (ts[k0 + a]! - ts[k0 + b]!);
    sum += w * fs[k0 + a]!;
  }
  return sum;
};

/**
 * The march from the tip of a sharp nose, with its flow on the line x = x0
 * from the body to the shock: where each C- line crosses it, cubic in x
 * along the line; on the body, the wall pressure interpolated in x; on the
 * shock, its point and angle interpolated in x. Also the march's drag
 * downstream of the line.
 */
const flowOnLine = (body: Body, mach: number, intervals: number, x0: number) => {
  const inside: { x: number; y: number; p: number; theta: number; k: number }[] = [];
  let kWall = NaN;
  const onLine = (line: readonly CharacteristicPoint[]) => {
    kWall = line[line.length - 1]!.k;
    const i = line.findIndex((q, j) => j + 1 < line.length && q.x <= x0 && line[j + 1]!.x > x0);
    if (i < 0) return;
    const four = line.slice(Math.min(Math.max(i - 1, 0), line.length - 4)).slice(0, 4);
    const xs = four.map((q) => q.x);
    const at = (f: (q: CharacteristicPoint) => number) => cubicAt(xs, four.map(f), x0);
    inside.push({
      x: x0,
      y: at((q) => q.y),
      p: at((q) => q.p),
      theta: at((q) => q.theta),
      k: at((q) => q.k),
    });
  };
  const solution = characteristics(body, { mach, gamma, intervals, start: 1e-3, onLine });
  const shockXs = solution.shock.map((s) => s.x);
  const shockAngle = cubicAt(
    shockXs,
    solution.shock.map((s) => s.angle),
    x0,
  );
  const shockY = cubicAt(
    shockXs,
    solution.shock.map((s) => s.y),
    x0,
  );
  const wallP = cubicAt(
    solution.wall.map((w) => w.x),
    solution.wall.map((w) => w.p),
    x0,
  );
  inside.sort((a, b) => a.y - b.y);
  const y0 = bodyRadius(body, x0);
  const points = [
    stateOf(mach, { x: x0, y: y0, p: wallP, theta: 0, k: kWall }),
    ...inside.filter((q) => q.y > y0 && q.y < shockY).map((q) => stateOf(mach, q)),
    // Only its position counts: the march takes the oblique-shock state.
    stateOf(mach, {
      x: x0,
      y: shockY,
      p: 1,
      theta: deflectionAngle(mach, shockAngle, gamma),
      k: shockEntropy(mach, shockAngle),
    }),
  ];
  const wall = [{ x: x0, p: wallP }, ...solution.wall.filter((w) => w.x > x0)];
  const start: StartingLine = { points, shockAngle };
  return { start, downstream: downstreamDrag(body, mach, wall) };
};

describe('method of characteristics from given data on a line behind the tip', () => {
  const half = 20 * deg;
  const L = 0.5 / Math.tan(half);
  const exact = taylorMaccoll(3, half, gamma);

  it.each([
    { phi: 90, pressure: [2.4e-6, 6.0e-7], angle: [2.4e-6, 6.0e-7] },
    { phi: 110, pressure: [3.1e-6, 7.7e-7], angle: [3.1e-6, 7.7e-7] },
    { phi: 70, pressure: [1.9e-6, 4.6e-7], angle: [2.0e-6, 5.1e-7] },
  ])(
    'M = 3, 20 deg cone, from Taylor-Maccoll data on a line at $phi deg: it stays conical, at second order',
    ({ phi, pressure, angle }) => {
      // From the line at x0 = 0.3 L (110 deg is normal to the surface).
      // Measured when written, wall pressure and shock angle on 80 and 160
      // intervals: 2.30e-6 and 5.75e-7, 2.30e-6 and 5.75e-7 rad (90 deg);
      // 2.94e-6 and 7.36e-7, 2.95e-6 and 7.37e-7 (110 deg); 1.76e-6 and
      // 4.41e-7, 1.94e-6 and 4.85e-7 (70 deg); the drag downstream of the
      // line within 2.4e-7 of Cp (1 - (r0 / R)^2) on 160 intervals and
      // 3.5e-9 on 1280.
      const start = coneLine(3, half, 0.3 * L, phi * deg, 400);
      const r0 = 0.3 * L * Math.tan(half);
      [80, 160].forEach((n, k) => {
        const sol = characteristicsFrom(cone(20), start, { mach: 3, gamma, intervals: n });
        for (const w of sol.wall) {
          expect(Math.abs(w.p / exact.surfacePressureRatio - 1)).toBeLessThan(pressure[k]!);
        }
        for (const s of sol.shock) {
          expect(Math.abs(s.angle - exact.shockAngle)).toBeLessThan(angle[k]!);
        }
        expect(sol.penetration).toBe(0);
        // The march runs from the line's foot to the end of the cone.
        expect(sol.wall[0]!.x).toBeCloseTo(0.3 * L, 12);
        expect(sol.wall[sol.wall.length - 1]!.x).toBeGreaterThan(0.99 * L);
        if (n === 160) {
          const drag = downstreamDrag(cone(20), 3, sol.wall);
          const cp = exact.surfacePressureCoefficient * (1 - (r0 / 0.5) ** 2);
          expect(Math.abs(drag / cp - 1)).toBeLessThan(3e-7);
        }
      });
    },
  );

  it('the TN 3716 ogive from its own flow on the line x = L / 3: the same drag downstream, at second order', () => {
    // The data carry the rotational flow of the curved nose, its entropy
    // varying across the line. Measured when written, against the drag of
    // the march from the tip downstream of the line (0.0371580, 38% of the
    // nose's): from its data on 320 intervals, -1.27e-5 on 160 intervals
    // and -3.11e-6 on 320. From its data on 1280, -3.6e-6, -8.6e-7, -1.9e-7
    // and -2.2e-8 on 320 to 2560, extrapolating to within 2e-9 of the
    // march from the tip's own extrapolated value (3e-9 on lines at 0.1 L,
    // 2 L / 3 and normal to the body at L / 3).
    const ogive: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 7,
    };
    const { start, downstream } = flowOnLine(ogive, 1.98, 320, 1);
    const errors = [160, 320].map((n) => {
      const sol = characteristicsFrom(ogive, start, { mach: 1.98, gamma, intervals: n });
      return downstreamDrag(ogive, 1.98, sol.wall) - downstream;
    });
    expect(Math.abs(errors[1]!)).toBeLessThan(3.5e-6);
    expect(errors[0]! / errors[1]!).toBeGreaterThan(3.5);
  }, 120_000);

  it('refuses odd intervals, data off the body, subsonic data and lines within a Mach cone', () => {
    const start = coneLine(3, half, 0.3 * L, 90 * deg, 40);
    const run =
      (s: StartingLine, intervals = 40) =>
      () =>
        characteristicsFrom(cone(20), s, { mach: 3, gamma, intervals });
    expect(run(start, 41)).toThrow(/even number of intervals/);
    const off = start.points.map((q, j) => (j === 0 ? { ...q, y: q.y + 1e-3 } : q));
    expect(run({ ...start, points: off })).toThrow(/begin on the body/);
    // Twice as hot at the same total enthalpy: subsonic.
    const hot = start.points.map((q, j) => (j === 20 ? { ...q, rho: q.rho / 2 } : q));
    expect(run({ ...start, points: hot })).toThrow(/must be supersonic/);
    // At 45 deg the line lies within the Mach cone of the flow at the
    // surface (20 + 27 deg).
    expect(run(coneLine(3, half, 0.3 * L, 45 * deg, 40))).toThrow(
      /cross both families of characteristics/,
    );
  });

  it('accepts a shoulder whose slope is continuous with unbounded curvature (LD-Haack), not a corner', () => {
    // The profile is checked first, so data off the body show which bodies pass.
    const start = coneLine(3, half, 0.3 * L, 90 * deg, 40);
    const run = (body: Body) => () =>
      characteristicsFrom(body, start, { mach: 3, gamma, intervals: 40 });
    const haack: Body = {
      nose: { shape: { kind: 'haack', parameter: 0 }, length: 1, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    expect(run(haack)).toThrow(/begin on the body/);
    expect(run({ ...cone(20), cylinderLength: 2 })).toThrow(/corners in the profile/);
  });
});

describe('method of characteristics from the fitted flow behind a blunt nose', () => {
  it('3:1 ellipsoid at Mach 2, from its fitted flow on the line at x = 0.133: second order, and where the fitted drags converge', () => {
    // The data (nj = 80, tests/support/ellipsoid-start-line.ts) carry the
    // entropy layer of the blunt tip; 53% of the nose's drag lies
    // downstream of the line. The fitted solver's own drag downstream of
    // it on nj = 20, 40, 80 differs from the march from each grid's data
    // by 3.57e-3, 8.57e-4 and 2.02e-4 of it, falling by 4.2 per
    // refinement. Measured when written: the march on 640 intervals
    // within 4.3e-7 of its extrapolated value (5.3e-6 of it), and the
    // fitted drags, extrapolated at second order, within 2.5e-5 of it.
    const fitted = [0.08156460685053118, 0.08138950539346877, 0.0813475604206323];
    const s = ELLIPSOID_START_LINE;
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 3, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    const start: StartingLine = {
      points: s.x.map((x, k) => ({
        x,
        y: s.y[k]!,
        rho: s.rho[k]!,
        u: s.u[k]!,
        v: s.v[k]!,
        p: s.p[k]!,
      })),
      shockAngle: s.shockAngle,
    };
    const drags = [160, 320, 640].map((n) => {
      const sol = characteristicsFrom(body, start, { mach: s.mach, gamma, intervals: n });
      expect(sol.penetration).toBe(0);
      return downstreamDrag(body, s.mach, sol.wall);
    });
    expect((drags[0]! - drags[1]!) / (drags[1]! - drags[2]!)).toBeGreaterThan(3.5);
    const extrapolated = fitted[2]! + (fitted[2]! - fitted[1]!) / 3;
    expect(Math.abs(extrapolated / drags[2]! - 1)).toBeLessThan(3e-5);
  }, 120_000);
});
