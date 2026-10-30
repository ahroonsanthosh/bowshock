/**
 * Steady supersonic flow over one surface of a symmetric hexagonal fin
 * section (a front bevel of half-angle delta over a fraction b of the
 * chord, a flat, a rear bevel of the same angle and length) at zero
 * incidence, by the planar method of characteristics with the leading-edge
 * shock fitted and every wave reflected from it carried by the net: the
 * measurement of design record 0009 section 9 (W9(a)), registered before
 * this code was written. Nothing on the page calls it.
 *
 * Along the characteristics dy/dx = tan(theta +- mu), planar rotational
 * flow with the total enthalpy constant gives Q dp +- d(theta) = 0, Q =
 * cot(mu) / (rho V^2) (NASA TN D-2970's equations (10) to (13), as
 * ./characteristics.ts uses them, without the axisymmetric term), with the
 * entropy K = p / rho^gamma constant along streamlines. They are used in
 * Prandtl-Meyer form,
 *
 *   d(nu) -+ d(theta) + C d(ln K) = 0 along C+-,  C = sqrt(M^2 - 1) / (gamma (gamma - 1) M^2),
 *
 * so that where the flow is homentropic the relations are exact (nu -+
 * theta constant) and the method reproduces shock-expansion theory to
 * round-off wherever no reflected wave arrives. K at a point comes from the
 * stream function: the free stream crossing the shock below height y
 * carries psi = rho_inf V_inf y, the shock's history gives ln K(psi), and
 * psi is integrated along each C- line from where it starts by the
 * trapezoid rule; psi at the wall, which should vanish, is the mass
 * balance.
 *
 * The flow is solved in two parts (0009 section 9.2). (1) The step, the
 * front bevel followed by a flat without end: uniform behind the straight
 * shock up to the head of the front corner's fan, which meets the shock at
 * P; the fan a simple wave up to the C- line from P; beyond it C- lines
 * marched from the shock to the wall, each starting where the next C+ line
 * reaches the shock, every line keeping the same number of points (as
 * ./characteristics.ts marches). Below the fan's tail ray the line from P
 * carries N - 1 points of the uniform flow, so that the C+ characteristics
 * leaving the flat between the corner and the first landing are in the net
 * (without them a strip of fixed width never refined: 0009 section 9's note
 * of 2026-10-30). (2) The rear corner's region, bounded by
 * the C+ characteristic through the rear corner, the rear bevel (continued
 * past the trailing edge as a straight wall) and the C- line through the
 * trailing edge: data on that C+ characteristic, traced through the step's
 * net, C- lines marched from the data across the rear corner's centred fan
 * and the reflections from the bevel. The step is computed on demand, as
 * far as the trace needs it.
 *
 * Interpolation (0009 section 9.2, as ruled in its note of 2026-10-30,
 * 9.12): the trace's state at each crossing of a C- line of the step is
 * linear in the pressure, theta and psi along the segment it crosses, ln K
 * from ln K(psi) and nu from the pressure and K; the data points, b / N
 * apart in arc length along the trace, are linear in arc length between its
 * crossings, in the same variables. The pressure and theta are continuous
 * across the streamline through P, where K(psi) has a kink, and nu is not.
 * Interpolating nu instead (as first registered) is kept as a diagnostic.
 * The rear corner's wall state is the step's, nu linear in x between its
 * wall points (the wall's entropy is constant).
 *
 * Resolution: N, each fan's turn in N equal steps; the data b / N apart.
 * A case fails (CharacteristicsFailure) where a point is not supersonic,
 * the net folds, the rear region reaches the shock, or a unit process does
 * not converge in 50 iterations to 1e-13.
 *
 * Units: the free stream's pressure and density 1. Angles in radians.
 * Tested in tests/validation/planar-characteristics.test.ts (0009 section
 * 9.3's T1 to T5).
 */

import { normalShock, obliqueShock, prandtlMeyer, deflectionAngle } from './gas-dynamics';

/** Why the method stops on a case (0009 section 9.2, "Where the method stops"). */
export class CharacteristicsFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CharacteristicsFailure';
  }
}

/**
 * Errors planted on purpose, for the checks of 0009 section 9.3's T4 only:
 * the entropy term left out, its sign flipped, or each new interior point
 * given the ln K of the point before it on its C- line instead of ln K(psi).
 */
export type PlantedError = 'no-entropy-term' | 'entropy-term-sign' | 'previous-k';

/** A point of the net. */
export interface NetPoint {
  x: number;
  y: number;
  /** Flow angle, radians from the free stream. */
  th: number;
  /** Prandtl-Meyer angle. */
  nu: number;
  /** ln of K = p / rho^gamma (the free stream's 0). */
  lnK: number;
  /** Stream function, zero on the wall. */
  psi: number;
  // Derived from nu and ln K:
  M: number;
  mu: number;
  /** sqrt(M^2 - 1) / (gamma (gamma - 1) M^2). */
  C: number;
  /** Static pressure over the free stream's. */
  p: number;
  /** Mass flux density rho V. */
  rhoV: number;
}

const TOLERANCE = 1e-13;
const ITERATIONS = 50;

/** The gas relations at the free stream's total enthalpy. */
export interface Gas {
  readonly gamma: number;
  readonly mach: number;
  readonly vInf: number;
  /** A point with its state derived from nu and ln K. */
  readonly point: (
    x: number,
    y: number,
    th: number,
    nu: number,
    lnK: number,
    psi: number,
  ) => NetPoint;
  /** Sets a point's nu and ln K and derives the rest. */
  readonly set: (pt: NetPoint, nu: number, lnK: number) => void;
  readonly machOfNu: (nu: number) => number;
  /** nu from the pressure and ln K at the total enthalpy. */
  readonly nuOfPressure: (p: number, lnK: number) => number;
}

/** The gas at the total enthalpy of a free stream of Mach number `mach`. */
export function gasAt(mach: number, gamma = 1.4): Gas {
  const vInf = mach * Math.sqrt(gamma);
  const cp = gamma / (gamma - 1);
  const h0 = cp + 0.5 * vInf * vInf;
  const k = (gamma + 1) / (gamma - 1);
  const sk = Math.sqrt(k);
  const nuMax = (Math.PI / 2) * (sk - 1);
  /** M from nu: Newton on m = sqrt(M^2 - 1) inside a bracket, to round-off. */
  const machOfNu = (nu: number): number => {
    if (!(nu > 0 && nu < nuMax)) {
      throw new CharacteristicsFailure(`a point is not supersonic (Prandtl-Meyer angle ${nu})`);
    }
    const f = (m: number) => sk * Math.atan(m / sk) - Math.atan(m) - nu;
    let lo = 0;
    let hi = 1;
    while (f(hi) < 0) hi *= 2;
    let m = 0.5 * (lo + hi);
    for (let it = 0; it < 100; it++) {
      const fm = f(m);
      if (fm < 0) lo = m;
      else hi = m;
      const d = 1 / (1 + (m * m) / k) - 1 / (1 + m * m);
      let next = m - fm / d;
      if (!(next > lo && next < hi)) next = 0.5 * (lo + hi);
      const done = Math.abs(next - m) <= 1e-16 * (1 + m);
      m = next;
      if (done || hi - lo <= 1e-16 * (1 + m)) break;
    }
    return Math.sqrt(1 + m * m);
  };
  const set = (pt: NetPoint, nu: number, lnK: number) => {
    const M = machOfNu(nu);
    const h = h0 / (1 + 0.5 * (gamma - 1) * M * M);
    const c2 = h / cp;
    const p = Math.exp(cp * Math.log(c2) - lnK / (gamma - 1));
    const rho = p / c2;
    pt.nu = nu;
    pt.lnK = lnK;
    pt.M = M;
    pt.mu = Math.asin(1 / M);
    pt.C = Math.sqrt(M * M - 1) / (gamma * (gamma - 1) * M * M);
    pt.p = p;
    pt.rhoV = rho * M * Math.sqrt(gamma * c2);
  };
  const point = (x: number, y: number, th: number, nu: number, lnK: number, psi: number) => {
    const pt = { x, y, th, nu: 0, lnK: 0, psi, M: 0, mu: 0, C: 0, p: 0, rhoV: 0 };
    set(pt, nu, lnK);
    return pt;
  };
  const nuOfPressure = (p: number, lnK: number) => {
    const c2 = Math.exp(((gamma - 1) / gamma) * (Math.log(p) + lnK / (gamma - 1)));
    const m2 = (2 / (gamma - 1)) * (h0 / (cp * c2) - 1);
    if (!(m2 > 1)) throw new CharacteristicsFailure('a point is not supersonic');
    return prandtlMeyer(Math.sqrt(m2), gamma);
  };
  return { gamma, mach, vInf, point, set, machOfNu, nuOfPressure };
}

/** Where rays from a (angle ta) and b (angle tb) meet: the point and the distances along each. */
function intersect(
  ax: number,
  ay: number,
  ta: number,
  bx: number,
  by: number,
  tb: number,
): { x: number; y: number; u: number; v: number } {
  const eax = Math.cos(ta);
  const eay = Math.sin(ta);
  const ebx = Math.cos(tb);
  const eby = Math.sin(tb);
  const d = eax * eby - eay * ebx;
  const wx = bx - ax;
  const wy = by - ay;
  const u = (wx * eby - wy * ebx) / d;
  const v = (wx * eay - wy * eax) / d;
  return { x: ax + u * eax, y: ay + u * eay, u, v };
}

/** Mass flux across the segment from c up to a (positive toward larger psi), trapezoid rule. */
function flux(c: NetPoint, a: NetPoint): number {
  const dx = a.x - c.x;
  const dy = a.y - c.y;
  return (
    0.5 *
    (c.rhoV * (Math.cos(c.th) * dy - Math.sin(c.th) * dx) +
      a.rhoV * (Math.cos(a.th) * dy - Math.sin(a.th) * dx))
  );
}

/** A straight wall: through (x0, y0) at angle `angle`, its entropy `lnK`. */
export interface Wall {
  readonly x0: number;
  readonly y0: number;
  readonly angle: number;
  readonly lnK: number;
}

/** The unit processes of the net, on a gas and an entropy history. */
export function unitProcesses(gas: Gas, lnKOf: (psi: number) => number, planted?: PlantedError) {
  const term = planted === 'no-entropy-term' ? 0 : planted === 'entropy-term-sign' ? -1 : 1;

  /** Where the C- line from a meets the C+ line from b. */
  const interior = (a: NetPoint, b: NetPoint): NetPoint => {
    const c = { ...b };
    gas.set(c, 0.5 * (a.nu + b.nu), 0.5 * (a.lnK + b.lnK));
    c.th = 0.5 * (a.th + b.th);
    for (let it = 0; ; it++) {
      if (it >= ITERATIONS) throw new CharacteristicsFailure('an interior point did not converge');
      const am = 0.5 * (a.th - a.mu + c.th - c.mu);
      const ap = 0.5 * (b.th + b.mu + c.th + c.mu);
      const s = intersect(a.x, a.y, am, b.x, b.y, ap);
      if (!(s.u > 0) || !(s.v >= 0)) {
        throw new CharacteristicsFailure('the net folds: an interior point lies behind its lines');
      }
      const old = { x: c.x, y: c.y, nu: c.nu, th: c.th };
      c.x = s.x;
      c.y = s.y;
      c.psi = a.psi - flux(c, a);
      const lnK = planted === 'previous-k' ? a.lnK : lnKOf(c.psi);
      const cm = 0.5 * (a.C + c.C);
      const cpl = 0.5 * (b.C + c.C);
      const rm = a.nu + a.th - term * cm * (lnK - a.lnK);
      const rp = b.nu - b.th - term * cpl * (lnK - b.lnK);
      c.th = 0.5 * (rm - rp);
      gas.set(c, 0.5 * (rm + rp), lnK);
      const change = Math.max(
        Math.abs(c.x - old.x),
        Math.abs(c.y - old.y),
        Math.abs(c.nu - old.nu),
        Math.abs(c.th - old.th),
      );
      if (change < TOLERANCE) return c;
    }
  };

  /** Where the C- line from a meets a straight wall. */
  const wall = (a: NetPoint, w: Wall): NetPoint => {
    const c = { ...a };
    for (let it = 0; ; it++) {
      if (it >= ITERATIONS) throw new CharacteristicsFailure('a wall point did not converge');
      const am = 0.5 * (a.th - a.mu + c.th - c.mu);
      const s = intersect(a.x, a.y, am, w.x0, w.y0, w.angle);
      if (!(s.u > 0) || !(s.v > 0)) {
        throw new CharacteristicsFailure(
          'the net folds: a C- line meets the wall behind its start',
        );
      }
      const old = { x: c.x, y: c.y, nu: c.nu };
      c.x = s.x;
      c.y = s.y;
      c.th = w.angle;
      const cm = 0.5 * (a.C + c.C);
      gas.set(c, a.nu + a.th - w.angle - term * cm * (w.lnK - a.lnK), w.lnK);
      c.psi = a.psi - flux(c, a);
      const change = Math.max(
        Math.abs(c.x - old.x),
        Math.abs(c.y - old.y),
        Math.abs(c.nu - old.nu),
      );
      if (change < TOLERANCE) return c;
    }
  };

  return { interior, wall, term };
}

/** The state behind an oblique shock of wave angle beta in the free stream. */
function behindShock(gas: Gas, beta: number): { th: number; nu: number; lnK: number; M: number } {
  const { mach, gamma } = gas;
  const th = deflectionAngle(mach, beta, gamma);
  const s = normalShock(mach * Math.sin(beta), gamma);
  const M = s.downstreamMach / Math.sin(beta - th);
  if (!(M > 1)) throw new CharacteristicsFailure('the flow behind the shock is not supersonic');
  return {
    th,
    nu: prandtlMeyer(M, gamma),
    lnK: Math.log(s.pressureRatio / s.densityRatio ** gamma),
    M,
  };
}

/** The flow over the step: the front bevel and a flat without end (0009 section 9.2, part 1). */
export interface Step {
  readonly gas: Gas;
  readonly delta: number;
  readonly bevel: number;
  /** The bevel's rise, b tan(delta). */
  readonly h: number;
  /** Wave angle of the straight shock and the state behind it. */
  readonly beta0: number;
  readonly p1: number;
  readonly lnK1: number;
  /** The uniform state behind the front corner's fan (theta 0). */
  readonly nu2: number;
  /** P: where the head of the front corner's fan meets the shock. */
  readonly P: { readonly x: number; readonly y: number };
  /** The C- lines, from the shock to the wall, the line from P first. */
  readonly lines: NetPoint[][];
  /** The wall points of the flat, the line from P's first. */
  readonly wallPoints: NetPoint[];
  /** ln K as a function of psi, from the shock's history. */
  readonly lnKOf: (psi: number) => number;
  /** Marches one more C- line. */
  readonly extend: () => void;
  /** The largest |psi| at the wall over the lines computed, over rho_inf V_inf y_P. */
  readonly massBalance: () => number;
  /** A uniform point behind the front corner's fan. */
  readonly region2: (x: number, y: number, psi: number) => NetPoint;
}

/** The step's flow, started: the line from P across the simple fan, and its wall point. */
export function stepFlow(
  mach: number,
  delta: number,
  bevel: number,
  intervals: number,
  options: { gamma?: number; planted?: PlantedError } = {},
): Step {
  const gamma = options.gamma ?? 1.4;
  const N = intervals;
  if (!(Number.isInteger(N) && N >= 2)) throw new RangeError('at least two intervals are needed');
  const gas = gasAt(mach, gamma);
  let shock;
  try {
    shock = obliqueShock(mach, delta, gamma);
  } catch {
    throw new CharacteristicsFailure('the leading-edge shock is detached');
  }
  if (!(shock.downstreamMach > 1)) {
    throw new CharacteristicsFailure('the flow behind the leading-edge shock is subsonic');
  }
  const beta0 = shock.beta;
  const p1 = shock.pressureRatio;
  const lnK1 = Math.log(p1 / shock.densityRatio ** gamma);
  const nu1 = prandtlMeyer(shock.downstreamMach, gamma);
  const nu2 = nu1 + delta;
  const h = bevel * Math.tan(delta);

  // Entropy history: below the streamline through P the straight shock's.
  const histPsi: number[] = [];
  const histLnK: number[] = [];
  const lnKOf = (psi: number): number => {
    const n = histPsi.length;
    if (psi <= histPsi[0]!) return histLnK[0]!;
    if (psi >= histPsi[n - 1]!) return histLnK[n - 1]!;
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (histPsi[mid]! <= psi) lo = mid;
      else hi = mid;
    }
    const a = histPsi[lo]!;
    const b = histPsi[hi]!;
    return histLnK[lo]! + ((histLnK[hi]! - histLnK[lo]!) * (psi - a)) / (b - a);
  };
  const up = unitProcesses(gas, lnKOf, options.planted);

  // The fan's rays from the corner C1 = (b, h), each with its exact simple-wave state.
  const ray = (k: number, x: number, y: number, psi: number) =>
    gas.point(x, y, delta * (1 - k / N), nu1 + (delta * k) / N, lnK1, psi);
  const head = ray(0, bevel, h, 0);
  const pHit = intersect(0, 0, beta0, bevel, h, head.th + head.mu);
  if (!(pHit.u > 0 && pHit.v > 0))
    throw new CharacteristicsFailure('the fan does not meet the shock');
  const P = { x: pHit.x, y: pHit.y };
  const psiP = gas.vInf * P.y;
  histPsi.push(0, psiP);
  histLnK.push(lnK1, lnK1);

  const flat: Wall = { x0: bevel, y0: h, angle: 0, lnK: lnK1 };
  const line0: NetPoint[] = [ray(0, P.x, P.y, psiP)];
  for (let k = 1; k <= N; k++) {
    const a = line0[k - 1]!;
    const r = ray(k, 0, 0, 0);
    const s = intersect(a.x, a.y, 0.5 * (a.th - a.mu + r.th - r.mu), bevel, h, r.th + r.mu);
    if (!(s.u > 0 && s.v > 0))
      throw new CharacteristicsFailure('the line from P misses a ray of the fan');
    r.x = s.x;
    r.y = s.y;
    r.psi = a.psi - flux(r, a);
    line0.push(r);
  }
  // Below the fan's tail ray the line from P runs straight through the
  // uniform flow to the flat. The C+ characteristics that leave the flat
  // between the corner and its landing cross it there; N - 1 of them, equally
  // spaced along it, carry that flow into the net, so that no strip of the
  // net keeps a width that does not shrink as 1 / N (0009 section 9.2,
  // "Resolution").
  const landing = up.wall(line0[N]!, flat);
  const tail = line0[N]!;
  for (let j = 1; j < N; j++) {
    const f = j / N;
    const pt = gas.point(
      tail.x + f * (landing.x - tail.x),
      tail.y + f * (landing.y - tail.y),
      tail.th,
      tail.nu,
      lnK1,
      0,
    );
    const prev = line0[line0.length - 1]!;
    pt.psi = prev.psi - flux(pt, prev);
    line0.push(pt);
  }
  line0.push(up.wall(line0[line0.length - 1]!, flat));
  const lines: NetPoint[][] = [line0];
  const betas: number[] = [beta0];
  const wallPoints: NetPoint[] = [line0[line0.length - 1]!];
  let balance = Math.abs(line0[line0.length - 1]!.psi);

  /** The shock point where the C+ line from b meets the shock from s (wave angle betaS). */
  const shockPoint = (s: NetPoint, betaS: number, b: NetPoint): { pt: NetPoint; beta: number } => {
    const at = (beta: number) => {
      const st = behindShock(gas, beta);
      const c = gas.point(0, 0, st.th, st.nu, st.lnK, 0);
      const q = intersect(
        s.x,
        s.y,
        0.5 * (betaS + beta),
        b.x,
        b.y,
        0.5 * (b.th + b.mu + c.th + c.mu),
      );
      c.x = q.x;
      c.y = q.y;
      const cpl = 0.5 * (b.C + c.C);
      const residual = c.nu - b.nu - (c.th - b.th) + up.term * cpl * (c.lnK - b.lnK);
      return { c, residual, q };
    };
    let b0 = betaS;
    let b1 = betaS * (1 - 1e-4);
    let r0 = at(b0).residual;
    let r1 = at(b1).residual;
    for (let it = 0; it < 60 && Math.abs(b1 - b0) > 1e-16 && r1 !== r0; it++) {
      const b2 = b1 - (r1 * (b1 - b0)) / (r1 - r0);
      b0 = b1;
      r0 = r1;
      b1 = b2;
      r1 = at(b1).residual;
    }
    const final = at(b1);
    if (!(Math.abs(final.residual) < 1e-12))
      throw new CharacteristicsFailure('a shock point did not converge');
    if (!(final.q.u > 0 && final.q.v > 0))
      throw new CharacteristicsFailure('the net folds at the shock');
    final.c.psi = gas.vInf * final.c.y;
    return { pt: final.c, beta: b1 };
  };

  const extend = () => {
    const line = lines[lines.length - 1]!;
    const n = line.length - 1;
    const s = shockPoint(line[0]!, betas[betas.length - 1]!, line[1]!);
    if (!(s.pt.psi > histPsi[histPsi.length - 1]!)) {
      throw new CharacteristicsFailure('the net folds: the shock points do not advance');
    }
    histPsi.push(s.pt.psi);
    histLnK.push(s.pt.lnK);
    const next: NetPoint[] = [s.pt];
    for (let i = 1; i < n; i++) next.push(up.interior(next[i - 1]!, line[i + 1]!));
    const w = up.wall(next[n - 1]!, flat);
    if (!(w.x > wallPoints[wallPoints.length - 1]!.x)) {
      throw new CharacteristicsFailure('the net folds: the wall points do not advance');
    }
    next.push(w);
    lines.push(next);
    betas.push(s.beta);
    wallPoints.push(w);
    balance = Math.max(balance, Math.abs(w.psi));
  };

  return {
    gas,
    delta,
    bevel,
    h,
    beta0,
    p1,
    lnK1,
    nu2,
    P,
    lines,
    wallPoints,
    lnKOf,
    extend,
    massBalance: () => balance / psiP,
    region2: (x: number, y: number, psi: number) => gas.point(x, y, 0, nu2, lnK1, psi),
  };
}

/** The rear region's data: the m-th point along the data line, or undefined past its end. */
export type DataSource = (m: number) => NetPoint | undefined;

export interface RearRegionOptions {
  readonly gas: Gas;
  readonly lnKOf: (psi: number) => number;
  readonly data: DataSource;
  /** The corner's turn (the bevel's half-angle; 0 for a flat wall throughout). */
  readonly turn: number;
  readonly intervals: number;
  /** The wall from the corner on (its angle -turn), and its entropy. */
  readonly wall: Wall;
  /** Stop after the first line whose wall point reaches this x. */
  readonly stopX: number;
  readonly planted?: PlantedError;
  /** Largest number of lines before the march is taken as failed. */
  readonly maxLines?: number;
}

export interface RearRegion {
  /** The lines, the corner's first. */
  readonly lines: NetPoint[][];
  /** The wall points, the corner's last ray first. */
  readonly wallPoints: NetPoint[];
  /** The largest |psi| at the wall over the lines. */
  readonly largestWallPsi: number;
}

/**
 * The rear corner's region (0009 section 9.2, part 2): from data on the C+
 * characteristic through the corner (the first datum at the corner), C-
 * lines marched across the corner's centred fan and the reflections from
 * the wall, to the wall.
 */
export function rearRegion(options: RearRegionOptions): RearRegion {
  const { gas, turn, intervals: N, wall } = options;
  const up = unitProcesses(gas, options.lnKOf, options.planted);
  const corner = options.data(0);
  if (corner === undefined) throw new RangeError('the data need a first point, at the corner');
  // The corner's line: the fan's rays, all at the corner, the last on the wall.
  const first: NetPoint[] = [corner];
  if (turn > 0) {
    for (let k = 1; k <= N; k++) {
      const pt = { ...corner };
      gas.set(pt, corner.nu + (turn * k) / N, wall.lnK);
      pt.th = corner.th - (turn * k) / N;
      pt.psi = 0;
      first.push(pt);
    }
  }
  const lines: NetPoint[][] = [first];
  const wallPoints: NetPoint[] = [first[first.length - 1]!];
  let largest = 0;
  const maxLines = options.maxLines ?? 1000 * N;
  for (let m = 1; ; m++) {
    if (m > maxLines) throw new CharacteristicsFailure('the rear region did not reach its end');
    const d = options.data(m);
    if (d === undefined) break;
    const prev = lines[lines.length - 1]!;
    const next: NetPoint[] = [d];
    for (let i = 1; i < prev.length; i++) next.push(up.interior(next[i - 1]!, prev[i]!));
    const w = up.wall(next[next.length - 1]!, wall);
    if (!(w.x > wallPoints[wallPoints.length - 1]!.x)) {
      throw new CharacteristicsFailure('the net folds: the wall points do not advance');
    }
    next.push(w);
    lines.push(next);
    wallPoints.push(w);
    largest = Math.max(largest, Math.abs(w.psi));
    if (w.x >= options.stopX) break;
  }
  return { lines, wallPoints, largestWallPsi: largest };
}

/**
 * The integral of Cp over the wall's rise from the first wall point to x =
 * xEnd, by the trapezoid rule, the last interval cut at xEnd by linear
 * interpolation of Cp and y (0009 section 9.2, "The drag").
 */
export function riseIntegral(
  wall: readonly { readonly x: number; readonly y: number; readonly cp: number }[],
  xEnd: number,
): number {
  let sum = 0;
  for (let i = 0; i + 1 < wall.length; i++) {
    const a = wall[i]!;
    const b = wall[i + 1]!;
    if (a.x >= xEnd) break;
    if (b.x <= xEnd) {
      sum += 0.5 * (a.cp + b.cp) * (b.y - a.y);
    } else {
      const t = (xEnd - a.x) / (b.x - a.x);
      const cp = a.cp + t * (b.cp - a.cp);
      const y = a.y + t * (b.y - a.y);
      sum += 0.5 * (a.cp + cp) * (y - a.y);
      return sum;
    }
  }
  if (wall[wall.length - 1]!.x < xEnd) throw new RangeError('the wall points end before xEnd');
  return sum;
}

/** One crossing of the trace with a C- line of the step. */
export interface Crossing {
  x: number;
  y: number;
  th: number;
  nu: number;
  psi: number;
}

/**
 * Which variable the trace interpolates beside theta and psi: the pressure,
 * nu then taken from the pressure and K(psi), as ruled in 0009 section
 * 9.12 (across the streamline through P, where K(psi) has a kink, the
 * pressure has none and nu has one); or nu, as first registered, kept as
 * the diagnostic run beside it on every node.
 */
export type TraceInterpolation = 'nu' | 'pressure';

/**
 * The C+ characteristic through the rear corner, traced through the step's
 * net (0009 section 9.2, "How the two parts meet"), and the data points
 * b / N apart along it.
 */
export function rearData(
  step: Step,
  xCorner: number,
  intervals: number,
  interpolation: TraceInterpolation = 'pressure',
): DataSource & { readonly crossings: readonly Readonly<Crossing>[] } {
  const { gas, wallPoints } = step;
  /** The interpolated variable (Crossing.nu holds it): the pressure, or nu. */
  const pOf = (pt: NetPoint) => (interpolation === 'nu' ? pt.nu : pt.p);
  const spacing = step.bevel / intervals;
  // The corner's state: uniform if no C- line of the step has landed ahead of it.
  let firstLine: number;
  let cornerNu: number;
  if (xCorner < wallPoints[0]!.x) {
    firstLine = 0;
    cornerNu = step.nu2;
  } else {
    while (wallPoints[wallPoints.length - 1]!.x <= xCorner) step.extend();
    let k = 0;
    while (wallPoints[k + 1]!.x <= xCorner) k++;
    const a = wallPoints[k]!;
    const b = wallPoints[k + 1]!;
    cornerNu = a.nu + ((b.nu - a.nu) * (xCorner - a.x)) / (b.x - a.x);
    firstLine = k + 1;
  }
  const cornerVar =
    interpolation === 'nu' ? cornerNu : gas.point(0, 0, 0, cornerNu, step.lnK1, 0).p;
  const trace: Crossing[] = [{ x: xCorner, y: step.h, th: 0, nu: cornerVar, psi: 0 }];
  const length: number[] = [0];
  let nextLine = firstLine;

  const derived = (c: Crossing) => {
    const lnK = step.lnKOf(c.psi);
    const nu = interpolation === 'nu' ? c.nu : gas.nuOfPressure(c.nu, lnK);
    return gas.point(c.x, c.y, c.th, nu, lnK, c.psi);
  };

  /** Crosses the next C- line of the step. */
  const cross = () => {
    while (step.lines.length <= nextLine) step.extend();
    const line = step.lines[nextLine]!;
    const from = derived(trace[trace.length - 1]!);
    let est = from;
    let found: Crossing | undefined;
    for (let it = 0; it < ITERATIONS; it++) {
      const dir = 0.5 * (from.th + from.mu + est.th + est.mu);
      const ex = Math.cos(dir);
      const ey = Math.sin(dir);
      let hit: Crossing | undefined;
      for (let i = 0; i + 1 < line.length; i++) {
        const P = line[i]!;
        const Q = line[i + 1]!;
        const dx = Q.x - P.x;
        const dy = Q.y - P.y;
        const den = ex * dy - ey * dx;
        if (den === 0) continue;
        const wx = P.x - from.x;
        const wy = P.y - from.y;
        const u = (wx * dy - wy * dx) / den;
        const t = (wx * ey - wy * ex) / den;
        if (t >= 0 && t <= 1 && u > 0) {
          hit = {
            x: P.x + t * dx,
            y: P.y + t * dy,
            th: P.th + t * (Q.th - P.th),
            nu: pOf(P) + t * (pOf(Q) - pOf(P)),
            psi: P.psi + t * (Q.psi - P.psi),
          };
          break;
        }
      }
      if (hit === undefined) {
        throw new CharacteristicsFailure("the rear corner's characteristic reaches the shock");
      }
      const change =
        found === undefined
          ? Infinity
          : Math.max(Math.abs(hit.x - found.x), Math.abs(hit.y - found.y));
      found = hit;
      est = derived(hit);
      if (change < TOLERANCE) break;
      if (it === ITERATIONS - 1) throw new CharacteristicsFailure('the trace did not converge');
    }
    const last = trace[trace.length - 1]!;
    trace.push(found!);
    length.push(length[length.length - 1]! + Math.hypot(found!.x - last.x, found!.y - last.y));
    nextLine++;
  };

  const source = (m: number) => {
    const s = m * spacing;
    while (length[length.length - 1]! < s) cross();
    let k = 0;
    while (k + 1 < length.length - 1 && length[k + 1]! < s) k++;
    if (m === 0) return derived(trace[0]!);
    const a = trace[k]!;
    const b = trace[k + 1]!;
    const t = (s - length[k]!) / (length[k + 1]! - length[k]!);
    return derived({
      x: a.x + t * (b.x - a.x),
      y: a.y + t * (b.y - a.y),
      th: a.th + t * (b.th - a.th),
      nu: a.nu + t * (b.nu - a.nu),
      psi: a.psi + t * (b.psi - a.psi),
    });
  };
  return Object.assign(source, { crossings: trace });
}

export interface HexagonSolution {
  /** Wave drag of both surfaces over the chord, by the method. */
  readonly cd: number;
  /** One surface's: the front bevel's and the rear bevel's parts. */
  readonly frontBevel: number;
  readonly rearBevel: number;
  /** Mass balance: the largest |psi| at the wall over every line, over rho_inf V_inf y_P. */
  readonly massBalance: number;
  /** R_N of 0009 section 9.3's T3 (NaN if the step has no second line). */
  readonly firstReflection: number;
  /** Where the C- line from P lands on the step's flat (T5). */
  readonly firstLanding: number;
  /** The wall pressure (over the free stream's) on the flat, from the front corner to the rear corner. */
  readonly flat: readonly { readonly x: number; readonly p: number }[];
  /** The wall pressure on the rear bevel, from its corner past the trailing edge. */
  readonly bevel: readonly { readonly x: number; readonly p: number }[];
  readonly stepLines: number;
  readonly rearLines: number;
}

/**
 * One surface of the symmetric hexagon (half-angle delta, bevels b of the
 * chord, chord 1) at Mach `mach`, with N intervals in each fan.
 */
export function hexagonCharacteristics(
  mach: number,
  delta: number,
  bevel: number,
  intervals: number,
  options: { gamma?: number; interpolation?: TraceInterpolation } = {},
): HexagonSolution {
  if (!(bevel > 0 && bevel < 0.5))
    throw new RangeError('the bevels must leave a flat between them');
  const step = stepFlow(mach, delta, bevel, intervals, options);
  const { gas, h } = step;
  const xCorner = 1 - bevel;
  const data = rearData(step, xCorner, intervals, options.interpolation);
  const rear = rearRegion({
    gas,
    lnKOf: step.lnKOf,
    data,
    turn: delta,
    intervals,
    wall: { x0: xCorner, y0: h, angle: -delta, lnK: step.lnK1 },
    stopX: 1,
  });
  const q = 0.5 * gas.gamma * mach * mach;
  const frontBevel = ((step.p1 - 1) / q) * h;
  const rearBevel = riseIntegral(
    rear.wallPoints.map((w) => ({ x: w.x, y: w.y, cp: (w.p - 1) / q })),
    1,
  );
  // R_N needs the step's second line.
  if (step.lines.length < 2) step.extend();
  const l0 = step.lines[0]!;
  const firstReflection = (step.lines[1]![0]!.p - l0[1]!.p) / (l0[1]!.p - l0[0]!.p);
  const flat = [
    { x: bevel, p: step.region2(0, 0, 0).p },
    ...step.wallPoints.filter((w) => w.x <= xCorner).map((w) => ({ x: w.x, p: w.p })),
  ];
  if (step.wallPoints[0]!.x < xCorner) {
    flat.push({ x: xCorner, p: data(0)!.p });
  }
  const yP = step.P.y;
  const balance = Math.max(step.massBalance(), rear.largestWallPsi / (gas.vInf * yP));
  return {
    cd: 2 * (frontBevel + rearBevel),
    frontBevel,
    rearBevel,
    massBalance: balance,
    firstReflection,
    firstLanding: step.wallPoints[0]!.x,
    flat,
    bevel: rear.wallPoints.map((w) => ({ x: w.x, p: w.p })),
    stepLines: step.lines.length,
    rearLines: rear.lines.length,
  };
}
