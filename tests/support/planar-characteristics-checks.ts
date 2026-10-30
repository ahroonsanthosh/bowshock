/**
 * The code checks of design record 0009 section 9.3 (T1 to T5) on the
 * planar method of characteristics (src/validation/planar-characteristics.ts):
 * each check's measured numbers, and the registered predicate it must meet.
 * Used by tests/validation/planar-characteristics.test.ts and by the record
 * docs/research/fin-wave-drag/w9/code-checks.test.ts.
 */

import { exactSectionDrag } from '../../src/fins/section-drag';
import { hexagonal } from '../../src/fins/section';
import {
  CharacteristicsFailure,
  gasAt,
  hexagonCharacteristics,
  rearRegion,
  riseIntegral,
  stepFlow,
  type NetPoint,
  type PlantedError,
} from '../../src/validation/planar-characteristics';
import { deflectionAngle, obliqueShock, prandtlMeyer } from '../../src/validation/gas-dynamics';
import { gaussLegendre } from '../../src/fins/quadrature';

const GAMMA = 1.4;
const DEG = Math.PI / 180;

/** The registered levels. */
export const LEVELS = [16, 32, 64, 128, 256] as const;

/** The four (theta, M) pairs of 9.3: half-angle in degrees, Mach number. */
export const PAIRS: readonly (readonly [number, number])[] = [
  [8, 1.6],
  [12, 2.2],
  [15, 3.0],
  [14, 1.6],
];

/** T1: the wedge over 0.1 of the chord and a flat to a square trailing edge, by the step part. */
export function t1(theta: number, mach: number, N: number): { drag: number; flatPressure: number } {
  const b = 0.1;
  const delta = theta * DEG;
  const step = stepFlow(mach, delta, b, N);
  const h = step.h;
  const lib = exactSectionDrag(
    { x: [0, b, 1], halfThickness: [0, h, h], bluntTrailingEdge: true },
    mach,
  );
  const q = 0.5 * GAMMA * mach * mach;
  const drag = 2 * ((step.p1 - 1) / q) * h;
  // The flat ahead of the landing of the line from P: the uniform flow, on every point the line from P
  // has there, and as the step holds it.
  const line0 = step.lines[0]!;
  const tailOn = line0.slice(N, line0.length);
  let worst = Math.abs(step.region2(0, 0, 0).p / lib.upper.faces[1]!.pressureRatio - 1);
  for (const pt of tailOn)
    worst = Math.max(worst, Math.abs(pt.p / lib.upper.faces[1]!.pressureRatio - 1));
  return { drag: Math.abs(drag / lib.cd - 1), flatPressure: worst };
}

/** T2's hexagons: t/c and bevel (section 2.1's table) and the Mach numbers. */
export const T2_CASES: readonly { tc: number; bevel: number; mach: number }[] = [
  { tc: 0.05, bevel: 0.15, mach: 2 },
  { tc: 0.05, bevel: 0.15, mach: 2.5 },
  { tc: 0.05, bevel: 0.15, mach: 3 },
  { tc: 0.05, bevel: 0.3, mach: 1.5 },
  { tc: 0.05, bevel: 0.3, mach: 2 },
  { tc: 0.05, bevel: 0.3, mach: 3 },
];

/** eps of a hexagon by the method at N, against the library's value with the reflections neglected. */
export function hexagonEps(
  tc: number,
  bevel: number,
  mach: number,
  N: number,
): { eps: number; exact: boolean } {
  const lib = exactSectionDrag(hexagonal(tc, bevel), mach, { neglectReflectedWaves: true });
  const s = hexagonCharacteristics(mach, Math.atan(tc / 2 / bevel), bevel, N);
  return { eps: s.cd / lib.cd - 1, exact: lib.exact };
}

/**
 * T3: the analytic reflection coefficient R = (Q - sigma) / (Q + sigma) at
 * the straight shock, written R = (s - k) / (s + k) with s = d(ln p_s) /
 * d(theta_s) along the shock polar and k = gamma M1^2 / sqrt(M1^2 - 1).
 */
export function analyticReflection(theta: number, mach: number): number {
  const shock = obliqueShock(mach, theta * DEG, GAMMA);
  const beta = shock.beta;
  const m1 = shock.downstreamMach;
  const p = shock.pressureRatio;
  const dpdb = ((2 * GAMMA) / (GAMMA + 1)) * mach * mach * Math.sin(2 * beta);
  const e = 1e-4;
  const th = (bb: number) => deflectionAngle(mach, bb, GAMMA);
  // Fourth-order central difference of the closed-form theta(beta).
  const dthdb =
    (-th(beta + 2 * e) + 8 * th(beta + e) - 8 * th(beta - e) + th(beta - 2 * e)) / (12 * e);
  const s = dpdb / (p * dthdb);
  const k = (GAMMA * m1 * m1) / Math.sqrt(m1 * m1 - 1);
  return (s - k) / (s + k);
}

/** T3: R_N, the method's first reflection. */
export function methodReflection(theta: number, mach: number, N: number): number {
  const step = stepFlow(mach, theta * DEG, 0.1, N);
  step.extend();
  const l0 = step.lines[0]!;
  return (step.lines[1]![0]!.p - l0[1]!.p) / (l0[1]!.p - l0[0]!.p);
}

/** Decreasing at each doubling over `errors` (ordered by N), the last at most `ratio` of the reference one. */
export function convergesAsRegistered(
  errors: readonly number[],
  reference: number,
  ratio: number,
  floor: number,
): boolean {
  if (!errors.every(Number.isFinite) || !Number.isFinite(reference)) return false;
  if (errors.every((e) => Math.abs(e) < floor)) return true;
  for (let i = 1; i < errors.length; i++)
    if (!(Math.abs(errors[i]!) < Math.abs(errors[i - 1]!))) return false;
  return Math.abs(errors[errors.length - 1]!) <= ratio * Math.abs(reference);
}

/** T4: the parallel shear flow of 9.3 (p = 1, theta = 0, ln K rising with psi to 0.044 at a height of 0.1). */
export function shearFlow(N: number, options: { planted?: PlantedError; mirror?: boolean } = {}) {
  const gas = gasAt(2, GAMMA);
  const cp = GAMMA / (GAMMA - 1);
  const h0 = cp + 0.5 * gas.vInf * gas.vInf;
  const top = 0.044;
  const local = (xi: number) => {
    const lnK = top * xi;
    const c2 = Math.exp(lnK / GAMMA);
    const m2 = (2 / (GAMMA - 1)) * (h0 / (cp * c2) - 1);
    const M = Math.sqrt(m2);
    const rhoV = (1 / c2) * M * Math.sqrt(GAMMA * c2);
    const mu = Math.asin(1 / M);
    return { lnK, M, rhoV, mu };
  };
  const rule = gaussLegendre(24);
  const integral = (xi: number, f: (s: number) => number) => {
    let sum = 0;
    for (let i = 0; i < rule.nodes.length; i++) {
      const s = 0.5 * xi * (rule.nodes[i]! + 1);
      sum += 0.5 * xi * rule.weights[i]! * f(s);
    }
    return sum;
  };
  const Psi = 0.1 / integral(1, (s) => 1 / local(s).rhoV);
  const yOf = (xi: number) => Psi * integral(xi, (s) => 1 / local(s).rhoV);
  const xOf = (xi: number) =>
    Psi * integral(xi, (s) => 1 / (Math.tan(local(s).mu) * local(s).rhoV));
  const sOf = (xi: number) =>
    Psi * integral(xi, (s) => 1 / (Math.sin(local(s).mu) * local(s).rhoV));
  const total = sOf(1);
  const spacing = 0.1 / N;
  const lnKOf = options.mirror
    ? (psi: number) => (top * (Psi - psi)) / Psi
    : (psi: number) => (top * psi) / Psi;
  const data = (m: number): NetPoint | undefined => {
    const target = m * spacing;
    if (target > total * (1 + 1e-14)) return undefined;
    let xi = target / total;
    for (let it = 0; it < 50; it++) {
      const l = local(xi);
      const step = (sOf(xi) - target) / (Psi / (Math.sin(l.mu) * l.rhoV));
      xi -= step;
      if (Math.abs(step) < 1e-16) break;
    }
    const l = local(xi);
    return gas.point(xOf(xi), yOf(xi), 0, prandtlMeyer(l.M, GAMMA), l.lnK, Psi * xi);
  };
  let rear;
  try {
    rear = rearRegion({
      gas,
      lnKOf,
      data,
      turn: 0,
      intervals: N,
      wall: { x0: 0, y0: 0, angle: 0, lnK: 0 },
      stopX: Infinity,
      ...(options.planted === undefined ? {} : { planted: options.planted }),
    });
  } catch (e) {
    // A planted error may make the march fail outright: no measure, which fails T4.
    if (!(e instanceof CharacteristicsFailure)) throw e;
    return { p: NaN, th: NaN, mass: NaN, lines: 0, failure: e.message };
  }
  let p = 0;
  let th = 0;
  for (const line of rear.lines) {
    for (const pt of line) {
      p = Math.max(p, Math.abs(pt.p - 1));
      th = Math.max(th, Math.abs(pt.th));
    }
  }
  return { p, th, mass: rear.largestWallPsi / Psi, lines: rear.lines.length, failure: undefined };
}

/** T4's predicate on the three measures over the levels. */
export function t4Passes(levels: readonly { p: number; th: number; mass: number }[]): boolean {
  // levels at N = 16, 32, 64, 128, 256: decreasing from 32 on, the last at most a ninth of N = 64's.
  const from32 = levels.slice(1);
  return (['p', 'th', 'mass'] as const).every((k) =>
    convergesAsRegistered(
      from32.map((l) => l[k]),
      levels[2]![k],
      1 / 9,
      1e-11,
    ),
  );
}

/**
 * T5: the exact landing on the flat of the C- line from P: across the
 * centred fan d(ln r) / d(phi) = -cot(2 mu) about the front corner, then
 * straight at the uniform flow's Mach angle to the flat. The quadrature is
 * in the Mach number across the fan, by composite Gauss-Legendre.
 */
export function exactLanding(theta: number, mach: number, panels = 64): number {
  const b = 0.1;
  const delta = theta * DEG;
  const shock = obliqueShock(mach, delta, GAMMA);
  const m1 = shock.downstreamMach;
  const nu1 = prandtlMeyer(m1, GAMMA);
  const h = b * Math.tan(delta);
  const mu1 = Math.asin(1 / m1);
  // P: the straight shock meets the fan's head ray.
  const ta = shock.beta;
  const tb = delta + mu1;
  const d = Math.cos(ta) * Math.sin(tb) - Math.sin(ta) * Math.cos(tb);
  const u = (b * Math.sin(tb) - h * Math.cos(tb)) / d;
  const P = { x: u * Math.cos(ta), y: u * Math.sin(ta) };
  const rP = Math.hypot(P.x - b, P.y - h);
  // M2 from nu1 + delta, by bisection to round-off.
  let lo = m1;
  let hi = 10;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (prandtlMeyer(mid, GAMMA) < nu1 + delta) lo = mid;
    else hi = mid;
  }
  const m2 = 0.5 * (lo + hi);
  const g = (M: number) => {
    const s = Math.sqrt(M * M - 1);
    const dnu = s / (M * (1 + 0.5 * (GAMMA - 1) * M * M));
    const dmu = -1 / (M * s);
    const mu = Math.asin(1 / M);
    return (-1 / Math.tan(2 * mu)) * (-dnu + dmu);
  };
  const rule = gaussLegendre(16);
  let lnRatio = 0;
  for (let k = 0; k < panels; k++) {
    const a = m1 + ((m2 - m1) * k) / panels;
    const c = m1 + ((m2 - m1) * (k + 1)) / panels;
    for (let i = 0; i < rule.nodes.length; i++) {
      lnRatio +=
        0.5 * (c - a) * rule.weights[i]! * g(0.5 * (a + c) + 0.5 * (c - a) * rule.nodes[i]!);
    }
  }
  const rT = rP * Math.exp(lnRatio);
  return b + 2 * rT * Math.cos(Math.asin(1 / m2));
}

/** T5: the method's landing at N. */
export function methodLanding(theta: number, mach: number, N: number): number {
  return stepFlow(mach, theta * DEG, 0.1, N).wallPoints[0]!.x;
}

/** The rear bevel's quadrature on a planted linear Cp: the method's integral and the exact one. */
export function quadratureCheck(): { method: number; exact: number } {
  const delta = 11 * DEG;
  const x0 = 0.9;
  const xs = [0.9, 0.913, 0.931, 0.94, 0.962, 0.97, 0.988, 0.9991, 1.0137];
  const y = (x: number) => -Math.tan(delta) * (x - x0);
  const cp = (x: number) => -0.31 + 0.85 * (x - x0);
  const method = riseIntegral(
    xs.map((x) => ({ x, y: y(x), cp: cp(x) })),
    1,
  );
  // Exact: integral of cp(x) dy from x0 to 1, dy = -tan(delta) dx.
  const F = (x: number) => -0.31 * (x - x0) + 0.425 * (x - x0) ** 2;
  const exact = -Math.tan(delta) * (F(1) - F(x0));
  return { method, exact };
}
