/**
 * Steady supersonic flow over a pointed body of revolution at zero
 * incidence by the method of characteristics: an exact inviscid reference,
 * independent of the finite-volume solver, for noses other than cones.
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
 * balance of the solution.
 *
 * The march starts on a C- line of the Taylor-Maccoll flow of the cone
 * tangent at the tip, close to the tip, where the nose differs from that
 * cone by the square of the distance. Corners in the profile (which need an
 * expansion fan) and subsonic flow are refused. Shock points are not spaced
 * by control: where the shock weakens towards a Mach wave the C+ lines meet
 * it at a shallow angle and the network stretches downstream, so results
 * are used only where refinement shows them converged. Tested on cones at
 * Mach 1.5 to 5 and half-angles up to 30 deg, including cases whose C-
 * lines run parallel to the axis; at Mach 1.3 on a 7 deg cone the march
 * fails on the meshes tried.
 */

import { bodyBreakpoints, bodyLength, bodyRadius, type Body } from '../geometry/body';
import { noseTipSlope } from '../geometry/nose';
import { deflectionAngle, normalShock } from './gas-dynamics';
import { coneFlowField } from './taylor-maccoll';

export interface CharacteristicsOptions {
  readonly mach: number;
  readonly gamma: number;
  /** Points on each characteristic line from the shock to the body, minus one. */
  readonly intervals: number;
  /** Distance of the starting line from the tip, along the shock, over the nose length. */
  readonly start: number;
}

export interface CharacteristicsSolution {
  /** Body points, downstream order: x, and pressure over the free-stream pressure. */
  readonly wall: readonly { readonly x: number; readonly p: number }[];
  /** Shock points: x, y and wave angle (radians). */
  readonly shock: readonly { readonly x: number; readonly y: number; readonly angle: number }[];
  /** Largest |psi| at the body over the free-stream mass flux inside the shock. */
  readonly massBalance: number;
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

export function characteristics(
  body: Body,
  options: CharacteristicsOptions,
): CharacteristicsSolution {
  const { mach, gamma, intervals: n } = options;
  if (!(Number.isInteger(n) && n >= 2)) throw new RangeError('at least two intervals are needed');
  // Free stream: p = rho = 1, so a^2 = gamma.
  const vInf = mach * Math.sqrt(gamma);
  const cp = gamma / (gamma - 1);
  const enthalpy = cp + 0.5 * vInf * vInf;
  const xEnd = bodyLength(body);
  const L = body.nose.length;

  const derived = (pt: Pick<Point, 'p' | 'k'>) => {
    const rho = (pt.p / pt.k) ** (1 / gamma);
    const h = (cp * pt.p) / rho;
    const v2 = 2 * (enthalpy - h);
    const m = Math.sqrt(v2 / ((gamma * pt.p) / rho));
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
      throw new RangeError('corners in the profile need an expansion fan, not implemented');
    }
  }

  // Entropy as a function of the stream function, from the shock history.
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
  // In polar coordinates (r, phi) a C- line, direction alpha = theta - mu,
  // satisfies dr/dphi = r cot(alpha - phi); march from the shock ray to the
  // cone in equal steps of phi, with substeps.
  const startRadius = options.start * L;
  let line: Point[] = [];
  {
    const dLogR = (phi: number) => {
      const s = conicalState(phi);
      const { mu } = derived({ p: s.p, k: k0 });
      return 1 / Math.tan(s.theta - mu - phi);
    };
    let logR = Math.log(startRadius);
    const sub = 16;
    const dphi = (tipAngle - beta0) / (n * sub);
    for (let i = 0; i <= n; i++) {
      const phi = beta0 + i * sub * dphi;
      if (i > 0) {
        for (let s = 0; s < sub; s++) {
          const f = beta0 + ((i - 1) * sub + s) * dphi;
          // Classical fourth-order Runge-Kutta in phi for ln r.
          const k1 = dLogR(f);
          const k2 = dLogR(f + dphi / 2);
          const k4 = dLogR(Math.max(f + dphi, tipAngle));
          logR += (dphi / 6) * (k1 + 4 * k2 + k4);
        }
      }
      const r = Math.exp(logR);
      const s = conicalState(Math.max(phi, tipAngle));
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

  /** The wall point of the C- line from a, or null if it lies beyond the body. */
  const wallPoint = (a: Point): Point | null => {
    const ca = coefficients(a, -1);
    const c: Point = { ...a, k: k0 };
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

  const wall = [{ x: line[n]!.x, p: line[n]!.p }];
  const shock = [{ x: line[0]!.x, y: line[0]!.y, angle: beta0 }];
  let beta = beta0;
  let massBalance = 0;
  let penetration = 0;
  for (;;) {
    const next: Point[] = [];
    const s = shockPoint(line[0]!, beta, line[1]!);
    beta = s.beta;
    next.push(s.point);
    entropy.push({ psi: s.point.psi, k: s.point.k });
    for (let i = 1; i < n; i++) {
      const q = interiorPoint(next[i - 1]!, line[i + 1]!);
      penetration = Math.max(penetration, (radius(q.x) - q.y) / (line[0]!.y - radius(line[0]!.x)));
      next.push(q);
    }
    const w = wallPoint(next[n - 1]!);
    // The body ends at xEnd: the march stops at the last line ending on it.
    if (w === null) break;
    next.push(w);
    massBalance = Math.max(massBalance, Math.abs(w.psi) / s.point.psi);
    wall.push({ x: w.x, p: w.p });
    shock.push({ x: s.point.x, y: s.point.y, angle: beta });
    line = next;
  }
  return { wall, shock, massBalance, penetration };
}
