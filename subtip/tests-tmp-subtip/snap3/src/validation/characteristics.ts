/**
 * Steady supersonic flow over a body of revolution at zero incidence by
 * the method of characteristics: an inviscid reference, independent of
 * the finite-volume solver and converged far below its errors (to about
 * 1e-6 in drag), for noses other than cones.
 *
 * Along the Mach lines dy/dx = tan(theta +- mu) the Euler equations of
 * rotational axisymmetric flow reduce to
 *
 *   cot(mu) / (rho V^2) dp +- d(theta) = -sin(theta) / (M sin(theta +- mu)) dy/y,
 *
 * with the total enthalpy constant and the entropy constant along
 * streamlines (NASA TN D-2970, M. Inouye, J. V. Rakich and H. Lomax, 1965,
 * equations (10) to (13)). In isentropic flow, where cot(mu) dp / (rho V^2)
 * = -d(nu), these become term for term the irrotational relations of NASA
 * TN D-3550 (L. B. Callis, 1966, equations (A1) to (A3)):
 * d(nu) -+ d(theta) = sin(mu) sin(theta) / sin(theta +- mu) dy/y. The
 * solver is tested on cones against Taylor-Maccoll
 * (tests/validation/characteristics.test.ts).
 *
 * The network marches along right-running (C-) characteristics from the
 * shock to the body. Each new line starts at a shock point, found from the
 * oblique-shock relations and the left-running (C+) characteristic from the
 * previous line; interior points lie where the new C- line meets the C+
 * lines from the previous one; the line ends on the body. Each unit process
 * averages the coefficients over its segments and iterates to convergence
 * (second order). The entropy (here K = p / rho^gamma) of a point is taken
 * from the stream function: the free stream crossing the shock inside radius
 * y carries psi = rho V y^2 / 2 (per radian), so the shock history gives
 * K(psi), and psi is integrated along each new line from the shock. The
 * stream function at the body, which should vanish, measures the mass
 * balance. On the starting line it is a fixed defect of that line on any
 * nose but a cone (1.8e-3 of the mass inside the shock on a 3-caliber
 * tangent ogive at Mach 3 with start 1e-3, proportional to start), which
 * the march then carries unchanged; so the balance of the march is the
 * change of psi at the body from the starting line. On a curved nose
 * K - K(0) grows as the square root of psi at the body, the shock angle
 * changing linearly from the tip, and the order falls: on that ogive at
 * Mach 3 and 4 the body pressure converges at order 1.3 to 1.8 and the
 * drag (integrated at high order) at 1.6 to 1.7, against 2 at Mach 1.5
 * and with K held constant, and the mass balance at 1.5.
 *
 * `characteristics` starts the march on a C- line of the Taylor-Maccoll
 * flow of the cone tangent at a sharp tip, close to the tip, where the
 * nose differs from that cone by the square of the distance. Its points
 * are spaced so that each line starts the same ratio farther along the
 * shock, however close the C+ lines behind a weak shock run to it.
 *
 * `characteristicsFrom` starts it from given data instead: the flow on a
 * curve from the body to the shock that is supersonic and crosses both
 * families of characteristics, such as a line behind the subsonic region
 * of a blunt nose. The data's entropy, which may vary across the curve,
 * gives K(psi) inside the curve's shock point, the shock history outside
 * it. Between the curve and the C- line from its shock point the flow
 * depends on the data and the body alone: there the C- lines from the
 * curve's points, each meeting the C+ lines from the points below it and
 * then those reflected from the body, fill the triangle of the data's
 * dependence and reach the body one after another, and the last, from the
 * shock point, is the first line of the march. With m intervals on the
 * curve its C- lines have 2m.
 *
 * Corners in the profile (which need an expansion fan) and subsonic flow
 * are refused; a slope that is continuous across a breakpoint is accepted
 * even where the curvature is unbounded (the Haack series meets the
 * cylinder with its slope vanishing as the square root of the distance).
 * Further shock points are not spaced by control: where the shock weakens
 * along a curved nose the C+ lines meet it at a shallower angle and the
 * network stretches downstream, so results are used only where refinement
 * shows them converged. Tested on cones at Mach 1.2 to 5 and half-angles
 * from 2.9 to 30 deg, including cases whose C- lines run parallel to the
 * axis and cases whose shock lies within 0.01 deg of the C+ lines behind
 * it.
 */

import { bodyBreakpoints, bodyLength, bodyRadius, type Body } from '../geometry/body';
import { noseTipSlope } from '../geometry/nose';
import { deflectionAngle, normalShock } from './gas-dynamics';
import { coneFlowField } from './taylor-maccoll';

/** A point of the network: free-stream pressure and density 1. */
export interface CharacteristicPoint {
  readonly x: number;
  readonly y: number;
  /** Flow angle to the axis, radians. */
  readonly theta: number;
  readonly p: number;
  /** Entropy measure p / rho^gamma. */
  readonly k: number;
  /** Stream function, per radian. */
  readonly psi: number;
}

export interface CharacteristicsOptions {
  readonly mach: number;
  readonly gamma: number;
  /** Points on each characteristic line from the shock to the body, minus one. */
  readonly intervals: number;
  /** Distance of the starting line from the tip, along the shock, over the nose length. */
  readonly start: number;
  /**
   * Called with each C- line of the march from the shock to the body, in
   * that order, the starting line first.
   */
  readonly onLine?: (line: readonly CharacteristicPoint[]) => void;
}

export interface CharacteristicsSolution {
  /** Body points, downstream order: x, and pressure over the free-stream pressure. */
  readonly wall: readonly { readonly x: number; readonly p: number }[];
  /** Shock points: x, y and wave angle (radians). */
  readonly shock: readonly { readonly x: number; readonly y: number; readonly angle: number }[];
  /**
   * Mass balance of the march: the largest change of psi at the body from
   * its value on the starting line, over the free-stream mass flux inside
   * the shock. It vanishes under refinement.
   */
  readonly massBalance: number;
  /**
   * |psi| at the body end of the starting line over the free-stream mass
   * flux inside its shock point: on a cone the quadrature error of that
   * line, on any other nose of order `start` whatever the mesh, the conical
   * data ending on the tip cone while the body lies inside it. From given
   * data, the mass the data do not balance, with the quadrature error.
   */
  readonly startMassDefect: number;
  /**
   * Deepest that a mesh point falls inside the body, over the width of the
   * shock layer: zero for a resolved mesh, vanishing under refinement.
   */
  readonly penetration: number;
}

interface Point {
  x: number;
  y: number;
  /** Flow angle to the axis. */
  theta: number;
  p: number;
  /** Entropy measure p / rho^gamma. */
  k: number;
  /** Stream function, per radian; zero on the body. */
  psi: number;
}

/** What a march accumulates: the body and shock points, and its checks. */
interface MarchRecord {
  readonly wall: { x: number; p: number }[];
  readonly shock: { x: number; y: number; angle: number }[];
  massBalance: number;
  penetration: number;
}

/** The unit processes of the network on a body in a free stream (p = rho = 1). */
function network(body: Body, mach: number, gamma: number) {
  // Free stream: p = rho = 1, so a^2 = gamma.
  const vInf = mach * Math.sqrt(gamma);
  const cp = gamma / (gamma - 1);
  const enthalpy = cp + 0.5 * vInf * vInf;
  const xEnd = bodyLength(body);
  const L = body.nose.length;

  /** Mach number of a point from its pressure and entropy (NaN where none). */
  const machOf = (pt: Pick<Point, 'p' | 'k'>) => {
    const rho = (pt.p / pt.k) ** (1 / gamma);
    const h = (cp * pt.p) / rho;
    const v2 = 2 * (enthalpy - h);
    return { rho, v2, m: Math.sqrt(v2 / ((gamma * pt.p) / rho)) };
  };
  const derived = (pt: Pick<Point, 'p' | 'k'>) => {
    const { rho, v2, m } = machOf(pt);
    if (!(m > 1)) throw new RangeError('the flow is not supersonic: no characteristics solution');
    return { rho, v: Math.sqrt(v2), m, mu: Math.asin(1 / m) };
  };
  /**
   * Compatibility coefficients: Q dp +- d(theta) = -R dy / y, written with
   * R dy = S dl, S = sin(theta) / M and dl the length along the
   * characteristic (dy = sin(theta +- mu) dl): R itself is singular where
   * the characteristic runs parallel to the axis, theta = -+ mu, while S dl
   * stays finite there.
   */
  const coefficients = (pt: Point, sign: 1 | -1) => {
    const d = derived(pt);
    return {
      q: 1 / (Math.tan(d.mu) * d.rho * d.v * d.v),
      s: Math.sin(pt.theta) / d.m,
      angle: pt.theta + sign * d.mu,
      rho: d.rho,
      v: d.v,
    };
  };

  const radius = (x: number) => bodyRadius(body, x);
  const slope = (x: number) => {
    const h = 1e-6 * L;
    return Math.atan((radius(x + h) - radius(x - h)) / (2 * h));
  };
  const corners = bodyBreakpoints(body).filter((x) => x > 0 && x < xEnd);
  for (const x of corners) {
    if (Math.abs(slope(x - 1e-4 * L) - slope(x + 1e-4 * L)) > 1e-3) {
      // Nearer the breakpoint a continuous slope differs across it by
      // less, a corner by the same: one-sided secants at 1e-8 of the nose
      // length (on the LD-Haack nose of 2 calibers they differ by 8e-5).
      const e = 1e-8 * L;
      const before = Math.atan((radius(x - e) - radius(x - 2 * e)) / e);
      const after = Math.atan((radius(x + 2 * e) - radius(x + e)) / e);
      if (Math.abs(before - after) > 1e-3) {
        throw new RangeError('corners in the profile need an expansion fan, not implemented');
      }
    }
  }

  // Entropy as a function of the stream function, in increasing psi: the
  // starting line's, then the shock history.
  const entropy: { psi: number; k: number }[] = [];
  const entropyAt = (psi: number) => {
    if (psi <= entropy[0]!.psi) return entropy[0]!.k;
    let lo = 0;
    let hi = entropy.length - 1;
    if (psi >= entropy[hi]!.psi) return entropy[hi]!.k;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (entropy[mid]!.psi <= psi) lo = mid;
      else hi = mid;
    }
    const a = entropy[lo]!;
    const b = entropy[hi]!;
    return a.k + ((b.k - a.k) * (psi - a.psi)) / (b.psi - a.psi);
  };
  /** Mass flux per radian across the segment from a to b (toward larger psi positive). */
  const massFlux = (a: Point, b: Point) => {
    const fa = coefficients(a, 1);
    const fb = coefficients(b, 1);
    const ga = fa.rho * fa.v * a.y;
    const gb = fb.rho * fb.v * b.y;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return (
      0.5 *
      (ga * (Math.cos(a.theta) * dy - Math.sin(a.theta) * dx) +
        gb * (Math.cos(b.theta) * dy - Math.sin(b.theta) * dx))
    );
  };

  // Oblique shock in the free stream at wave angle beta.
  const behindShock = (beta: number) => {
    const s = normalShock(mach * Math.sin(beta), gamma);
    const p = s.pressureRatio;
    return { theta: deflectionAngle(mach, beta, gamma), p, k: p / s.densityRatio ** gamma };
  };

  const converge = (step: () => number) => {
    for (let it = 0; it < 50; it++) if (step() < 1e-13) return;
  };

  const shockPoint = (s: Point, sBeta: number, b: Point): { point: Point; beta: number } => {
    const cb = coefficients(b, 1);
    const at = (beta: number) => {
      const post = behindShock(beta);
      let c: Point = { x: b.x, y: b.y, theta: post.theta, p: post.p, k: post.k, psi: 0 };
      // Intersection of the shock from s with the C+ line from b.
      const cc = coefficients(c, 1);
      const ls = Math.tan(0.5 * (sBeta + beta));
      const lc = Math.tan(0.5 * (cb.angle + cc.angle));
      const x = (b.y - s.y + ls * s.x - lc * b.x) / (ls - lc);
      c = { ...c, x, y: s.y + ls * (x - s.x) };
      const cc2 = coefficients(c, 1);
      const q = 0.5 * (cb.q + cc2.q);
      const r = 0.5 * (cb.s + cc2.s) * Math.hypot(c.x - b.x, c.y - b.y);
      const residual = q * (c.p - b.p) + (c.theta - b.theta) + r / (0.5 * (c.y + b.y));
      return { c, residual };
    };
    // Secant iteration on the wave angle.
    let b0 = sBeta;
    let b1 = sBeta * (1 - 1e-4);
    let r0 = at(b0).residual;
    let r1 = at(b1).residual;
    for (let it = 0; it < 60 && Math.abs(b1 - b0) > 1e-15; it++) {
      const b2 = b1 - (r1 * (b1 - b0)) / (r1 - r0);
      b0 = b1;
      r0 = r1;
      b1 = b2;
      r1 = at(b1).residual;
    }
    const point = at(b1).c;
    point.psi = 0.5 * vInf * point.y ** 2;
    return { point, beta: b1 };
  };

  const interiorPoint = (a: Point, b: Point): Point => {
    const ca = coefficients(a, -1);
    const cb = coefficients(b, 1);
    const c: Point = { ...b };
    converge(() => {
      const cm = coefficients(c, -1);
      const cpl = coefficients(c, 1);
      const lm = Math.tan(0.5 * (ca.angle + cm.angle));
      const lp = Math.tan(0.5 * (cb.angle + cpl.angle));
      const x = (b.y - a.y + lm * a.x - lp * b.x) / (lm - lp);
      const y = a.y + lm * (x - a.x);
      const qm = 0.5 * (ca.q + cm.q);
      const rm = (0.5 * (ca.s + cm.s) * Math.hypot(x - a.x, y - a.y)) / (0.5 * (y + a.y));
      const qp = 0.5 * (cb.q + cpl.q);
      const rp = (0.5 * (cb.s + cpl.s) * Math.hypot(x - b.x, y - b.y)) / (0.5 * (y + b.y));
      // qm (p - pa) - (theta - theta_a) = -rm;  qp (p - pb) + (theta - theta_b) = -rp.
      const p = (qm * a.p - a.theta + qp * b.p + b.theta - rm - rp) / (qm + qp);
      const theta = qp * (b.p - p) + b.theta - rp;
      const change = Math.max(
        Math.abs(x - c.x),
        Math.abs(y - c.y),
        Math.abs(p - c.p),
        Math.abs(theta - c.theta),
      );
      Object.assign(c, { x, y, p, theta });
      c.psi = a.psi - massFlux(c, a);
      c.k = entropyAt(c.psi);
      return change;
    });
    return c;
  };

  /**
   * The wall point of the C- line from a, with the entropy of the body's
   * streamline, or null if it lies beyond the body.
   */
  const wallPoint = (a: Point, kWall: number): Point | null => {
    const ca = coefficients(a, -1);
    const c: Point = { ...a, k: kWall };
    const end = { beyond: false };
    converge(() => {
      const cm = coefficients(c, -1);
      const lm = Math.tan(0.5 * (ca.angle + cm.angle));
      // Where the C- line from a meets the body: bisection.
      const f = (x: number) => a.y + lm * (x - a.x) - radius(x);
      let lo = a.x;
      let hi = a.x + Math.max(a.y - radius(a.x), 1e-12) / Math.max(-lm, 1e-3) + 1e-12;
      // A C- line that has not met the body by twice the remaining length
      // never meets it before the end.
      while (f(hi) > 0 && hi < xEnd + (xEnd - a.x)) hi += hi - lo;
      if (f(hi) > 0) {
        end.beyond = true;
        return 0;
      }
      for (let it = 0; it < 200 && hi - lo > 1e-15 * (1 + hi); it++) {
        const mid = 0.5 * (lo + hi);
        if (f(mid) > 0) lo = mid;
        else hi = mid;
      }
      const x = 0.5 * (lo + hi);
      if (x > xEnd) {
        end.beyond = true;
        return 0;
      }
      const y = radius(x);
      const theta = slope(x);
      const qm = 0.5 * (ca.q + cm.q);
      const rm = (0.5 * (ca.s + cm.s) * Math.hypot(x - a.x, y - a.y)) / (0.5 * (y + a.y));
      const p = a.p + (theta - a.theta - rm) / qm;
      const change = Math.max(Math.abs(x - c.x), Math.abs(p - c.p), Math.abs(theta - c.theta));
      Object.assign(c, { x, y, p, theta });
      return change;
    });
    if (end.beyond) return null;
    c.psi = a.psi - massFlux(c, a);
    return c;
  };

  return {
    vInf,
    cp,
    enthalpy,
    machOf,
    derived,
    radius,
    slope,
    entropy,
    massFlux,
    behindShock,
    shockPoint,
    interiorPoint,
    wallPoint,
  };
}

type Network = ReturnType<typeof network>;

/**
 * The march from a C- line from the shock to the body (`first`, whose
 * shock point has wave angle beta0) to the last line that ends on the
 * body, adding its points to `record`. `startPsi` is psi at the body end
 * of the starting line, `kWall` the entropy on the body.
 */
function march(
  net: Network,
  first: Point[],
  beta0: number,
  startPsi: number,
  kWall: number,
  record: MarchRecord,
  onLine?: (line: readonly CharacteristicPoint[]) => void,
): void {
  const { radius, entropy, shockPoint, interiorPoint, wallPoint } = net;
  const n = first.length - 1;
  let line = first;
  let beta = beta0;
  for (;;) {
    const next: Point[] = [];
    const s = shockPoint(line[0]!, beta, line[1]!);
    beta = s.beta;
    next.push(s.point);
    entropy.push({ psi: s.point.psi, k: s.point.k });
    for (let i = 1; i < n; i++) {
      const q = interiorPoint(next[i - 1]!, line[i + 1]!);
      record.penetration = Math.max(
        record.penetration,
        (radius(q.x) - q.y) / (line[0]!.y - radius(line[0]!.x)),
      );
      next.push(q);
    }
    const w = wallPoint(next[n - 1]!, kWall);
    // The body ends at xEnd: the march stops at the last line ending on it.
    if (w === null) break;
    next.push(w);
    record.massBalance = Math.max(record.massBalance, Math.abs(w.psi - startPsi) / s.point.psi);
    record.wall.push({ x: w.x, p: w.p });
    record.shock.push({ x: s.point.x, y: s.point.y, angle: beta });
    onLine?.(next);
    line = next;
  }
}

export function characteristics(
  body: Body,
  options: CharacteristicsOptions,
): CharacteristicsSolution {
  const { mach, gamma, intervals: n } = options;
  if (!(Number.isInteger(n) && n >= 2)) throw new RangeError('at least two intervals are needed');
  const net = network(body, mach, gamma);
  const { cp, enthalpy, vInf, derived, radius, slope, entropy, massFlux, behindShock } = net;
  const L = body.nose.length;

  // Starting line: a C- line of the tip cone's conical flow.
  const tipAngle = Math.atan(noseTipSlope(body.nose));
  const field = coneFlowField(mach, tipAngle, gamma);
  const beta0 = field.flow.shockAngle;
  const k0 = behindShock(beta0).k;
  const vMax = Math.sqrt(2 * enthalpy);
  const conicalState = (polar: number) => {
    const c = field.at(polar);
    const v = c.speed * vMax;
    const h = enthalpy - 0.5 * v * v;
    // h = cp K rho^(gamma - 1) with the conical flow's entropy K = k0.
    const rho = (h / (cp * k0)) ** (1 / (gamma - 1));
    return { theta: c.flowAngle, p: k0 * rho ** gamma };
  };
  // In polar coordinates (r, phi) a characteristic of direction alpha
  // satisfies dr/dphi = r cot(alpha - phi): the starting C- line (alpha =
  // theta - mu) runs from the shock ray to the cone, and the C+ line (alpha
  // = theta + mu) from each of its points to the shock. The points are
  // spaced uniformly in A = ln r + B, B being the gain in ln r along the
  // point's C+ line up to the shock: A is the log radius at which that C+
  // line meets the shock, so each line of the march starts the same ratio
  // farther along the shock, as in the self-similar network of the conical
  // flow that the march settles into after n lines anyway. Equal steps in
  // phi fail near a weak shock: the C+ lines behind it run within the small
  // angle chi = delta + mu2 - beta of it, so the first point below the
  // shock sends its C+ line out about 1 + dphi / chi times farther, and
  // where (beta - cone) / chi exceeds the number of intervals (up to some
  // 7000 on the noses of the nose-drag page) the network folds within a few
  // lines, or ends the march short of the body's end.
  const startRadius = options.start * L;
  const line: Point[] = [];
  {
    const slopes = (phi: number) => {
      const s = conicalState(phi);
      const { mu } = derived({ p: s.p, k: k0 });
      return { minus: 1 / Math.tan(s.theta - mu - phi), plus: 1 / Math.tan(s.theta + mu - phi) };
    };
    // ln r on the C- line and A on a fine grid in phi, by Simpson's rule.
    const fine = 64 * n;
    const phis = [beta0];
    const logRs = [Math.log(startRadius)];
    let previous = slopes(beta0);
    const dLogRs = [previous.minus];
    const arrivals = [logRs[0]!];
    let gain = 0;
    for (let j = 1; j <= fine; j++) {
      const phi = j === fine ? tipAngle : beta0 + ((tipAngle - beta0) * j) / fine;
      const h = phi - phis[j - 1]!;
      const mid = slopes(phis[j - 1]! + h / 2);
      const next = slopes(phi);
      const logR = logRs[j - 1]! + (h / 6) * (previous.minus + 4 * mid.minus + next.minus);
      // B grows towards the cone, where phi decreases.
      gain -= (h / 6) * (previous.plus + 4 * mid.plus + next.plus);
      phis.push(phi);
      logRs.push(logR);
      dLogRs.push(next.minus);
      arrivals.push(logR + gain);
      previous = next;
    }
    // A increases strictly from the shock to the cone: the C+ lines of
    // neighbouring points do not cross. Invert it for equal steps, with
    // cubic Hermite interpolation of ln r between the fine points.
    const spread = arrivals[fine]! - arrivals[0]!;
    let j = 0;
    for (let i = 0; i <= n; i++) {
      const target = arrivals[0]! + (spread * i) / n;
      while (j < fine - 1 && arrivals[j + 1]! < target) j++;
      const t =
        i === n
          ? 1
          : Math.min(Math.max((target - arrivals[j]!) / (arrivals[j + 1]! - arrivals[j]!), 0), 1);
      const h = phis[j + 1]! - phis[j]!;
      const phi = i === n ? tipAngle : phis[j]! + t * h;
      const r = Math.exp(
        (2 * t ** 3 - 3 * t ** 2 + 1) * logRs[j]! +
          (t ** 3 - 2 * t ** 2 + t) * h * dLogRs[j]! +
          (-2 * t ** 3 + 3 * t ** 2) * logRs[j + 1]! +
          (t ** 3 - t ** 2) * h * dLogRs[j + 1]!,
      );
      const s = conicalState(phi);
      line.push({
        x: r * Math.cos(phi),
        y: r * Math.sin(phi),
        theta: s.theta,
        p: s.p,
        k: k0,
        psi: 0,
      });
    }
    // The last point is on the tip cone; put it on the body, which differs
    // from the cone by the square of the distance from the tip.
    const w = line[n]!;
    w.y = radius(w.x);
    w.theta = slope(w.x);
    line[0]!.psi = 0.5 * vInf * line[0]!.y ** 2;
    for (let i = 1; i <= n; i++) line[i]!.psi = line[i - 1]!.psi - massFlux(line[i]!, line[i - 1]!);
    entropy.push({ psi: 0, k: k0 }, { psi: line[0]!.psi, k: k0 });
  }
  // The starting line's own defect, which every later line carries.
  const startPsi = line[n]!.psi;
  const startMassDefect = Math.abs(startPsi) / line[0]!.psi;

  const record: MarchRecord = {
    wall: [{ x: line[n]!.x, p: line[n]!.p }],
    shock: [{ x: line[0]!.x, y: line[0]!.y, angle: beta0 }],
    massBalance: 0,
    penetration: 0,
  };
  options.onLine?.(line);
  march(net, line, beta0, startPsi, k0, record, options.onLine);
  const { wall, shock, massBalance, penetration } = record;
  return { wall, shock, massBalance, startMassDefect, penetration };
}

/** The flow at a point of a starting line: free-stream pressure and density 1. */
export interface StartingState {
  readonly x: number;
  readonly y: number;
  readonly rho: number;
  /** Axial and radial velocity. */
  readonly u: number;
  readonly v: number;
  readonly p: number;
}

export interface StartingLine {
  /**
   * The flow along a curve from the body to the shock, in that order: the
   * first point on the body, the last just behind the shock, and enough
   * between for cubic interpolation along the curve (at least four in
   * all). The first point's flow is turned to the body's slope; the last
   * point's flow is taken as the oblique-shock state at `shockAngle`, which
   * its own should approximate, so only its position is used.
   */
  readonly points: readonly StartingState[];
  /** Wave angle of the shock at the last point, radians. */
  readonly shockAngle: number;
}

export interface CharacteristicsFromOptions {
  readonly mach: number;
  readonly gamma: number;
  /**
   * Points on each characteristic line of the march from the shock to the
   * body, minus one: even, as the starting curve gets half as many.
   */
  readonly intervals: number;
  /**
   * Called with each C- line of the march from the shock to the body, the
   * one from the curve's shock point first.
   */
  readonly onLine?: (line: readonly CharacteristicPoint[]) => void;
}

/**
 * The method of characteristics from given data on a curve from the body
 * to the shock (see the file's header), marched to the end of the body.
 * The wall points start at the curve's body point, the shock points at its
 * shock point.
 */
export function characteristicsFrom(
  body: Body,
  start: StartingLine,
  options: CharacteristicsFromOptions,
): CharacteristicsSolution {
  const { mach, gamma, intervals: n } = options;
  if (!(Number.isInteger(n) && n >= 4 && n % 2 === 0)) {
    throw new RangeError('an even number of intervals, at least four, is needed');
  }
  const given = start.points;
  const last = given.length - 1;
  if (last < 3) throw new RangeError('the starting line needs at least four points');
  const net = network(body, mach, gamma);
  const { vInf, machOf, radius, slope, entropy, massFlux, behindShock } = net;
  const { interiorPoint, wallPoint } = net;

  // Arc length along the given points, and the variables the march uses.
  const sigma = [0];
  for (let k = 1; k <= last; k++) {
    const step = Math.hypot(given[k]!.x - given[k - 1]!.x, given[k]!.y - given[k - 1]!.y);
    if (!(step > 0)) throw new RangeError('the starting points must be distinct, in order');
    sigma.push(sigma[k - 1]! + step);
  }
  const length = sigma[last]!;
  const foot = given[0]!;
  if (!(Math.abs(foot.y - radius(foot.x)) <= 1e-9 * length)) {
    throw new RangeError('the starting line must begin on the body');
  }
  const samples = given.map((q) => ({
    x: q.x,
    y: q.y,
    p: q.p,
    theta: Math.atan2(q.v, q.u),
    k: q.p / q.rho ** gamma,
  }));
  samples[0] = { ...samples[0]!, y: radius(foot.x), theta: slope(foot.x) };
  const post = behindShock(start.shockAngle);
  samples[last] = { ...samples[last]!, p: post.p, theta: post.theta, k: post.k };
  /** Cubic interpolation through the four samples nearest to arc length s. */
  const sampleAt = (s: number) => {
    let k = 0;
    while (k < last - 1 && sigma[k + 1]! <= s) k++;
    const k0 = Math.min(Math.max(k - 1, 0), last - 3);
    const weights = [0, 1, 2, 3].map((a) => {
      let w = 1;
      for (let b = 0; b < 4; b++) {
        if (b !== a) w *= (s - sigma[k0 + b]!) / (sigma[k0 + a]! - sigma[k0 + b]!);
      }
      return w;
    });
    const mix = (f: (q: (typeof samples)[number]) => number) =>
      weights.reduce((sum, w, a) => sum + w * f(samples[k0 + a]!), 0);
    return {
      x: mix((q) => q.x),
      y: mix((q) => q.y),
      theta: mix((q) => q.theta),
      p: mix((q) => q.p),
      k: mix((q) => q.k),
    };
  };

  // The march's starting points on the curve, equally spaced in arc
  // length, from the shock (0) to the body (m).
  const m = n / 2;
  const data: Point[] = [];
  for (let a = 0; a <= m; a++) {
    const q = a === 0 ? samples[last] : a === m ? samples[0] : sampleAt((length * (m - a)) / m);
    data.push({ x: q.x, y: q.y, theta: q.theta, p: q.p, k: q.k, psi: 0 });
  }
  for (let a = 0; a <= m; a++) {
    const q = data[a]!;
    const { m: local } = machOf(q);
    if (!(local > 1)) {
      throw new RangeError(
        `the starting line must be supersonic: Mach ${local.toFixed(3)} at (${q.x.toFixed(4)}, ${q.y.toFixed(4)})`,
      );
    }
    // Both characteristics through the point leave the curve downstream:
    // the curve's direction from the body to the shock lies between the
    // C+ direction and the C- direction turned by pi.
    const up = data[Math.max(a - 1, 0)]!;
    const down = data[Math.min(a + 1, m)]!;
    const phi = Math.atan2(up.y - down.y, up.x - down.x);
    const mu = Math.asin(1 / local);
    if (!(phi > q.theta + mu && phi < q.theta - mu + Math.PI)) {
      throw new RangeError('the starting line must cross both families of characteristics');
    }
  }
  data[0]!.psi = 0.5 * vInf * data[0]!.y ** 2;
  for (let a = 1; a <= m; a++) data[a]!.psi = data[a - 1]!.psi - massFlux(data[a]!, data[a - 1]!);
  for (let a = m; a >= 0; a--) {
    if (a < m && !(data[a]!.psi > data[a + 1]!.psi)) {
      throw new RangeError('the flow must cross the starting line downstream');
    }
    entropy.push({ psi: data[a]!.psi, k: data[a]!.k });
  }
  const kWall = data[m]!.k;
  const startPsi = data[m]!.psi;
  const startMassDefect = Math.abs(startPsi) / data[0]!.psi;
  const width = data[0]!.y - radius(data[0]!.x);

  const record: MarchRecord = {
    wall: [{ x: data[m]!.x, p: data[m]!.p }],
    shock: [{ x: data[0]!.x, y: data[0]!.y, angle: start.shockAngle }],
    massBalance: 0,
    penetration: 0,
  };
  // The triangle of the data's dependence: the C- line from the curve's
  // point a meets the C+ lines from the points below it and those from the
  // body points of the lines before, then reaches the body itself.
  let line: Point[] = [data[m]!];
  for (let a = m - 1; a >= 0; a--) {
    const next: Point[] = [data[a]!];
    for (let k = 1; k <= line.length; k++) {
      const q = interiorPoint(next[k - 1]!, line[k - 1]!);
      record.penetration = Math.max(record.penetration, (radius(q.x) - q.y) / width);
      next.push(q);
    }
    const w = wallPoint(next[next.length - 1]!, kWall);
    // The data's own C- lines reach beyond the end of the body.
    if (w === null) return { ...record, startMassDefect };
    next.push(w);
    record.massBalance = Math.max(record.massBalance, Math.abs(w.psi - startPsi) / data[0]!.psi);
    record.wall.push({ x: w.x, p: w.p });
    line = next;
  }
  options.onLine?.(line);
  march(net, line, start.shockAngle, startPsi, kWall, record, options.onLine);
  const { wall, shock, massBalance, penetration } = record;
  return { wall, shock, massBalance, startMassDefect, penetration };
}
