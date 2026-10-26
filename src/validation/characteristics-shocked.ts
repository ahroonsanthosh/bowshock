/**
 * The method of characteristics from given data with an embedded shock
 * fitted (W6, docs/research/w6-build README section 9): a verification
 * reference for noses whose shock layer carries a recompression shock,
 * such as a rounded tip on a slender nose, where the march of
 * characteristicsFrom, which has no internal shock, cannot cross it.
 *
 * The march is characteristicsFrom's (C- lines from the bow shock to the
 * body, each from the one before, the first ones filling the triangle of
 * the starting data's dependence), with an embedded shock of the C+
 * family fitted as a discontinuity on each C- line:
 * - it forms, at zero strength, where two C+ characteristics of the march
 *   would cross (the points of a new C- line out of order along it);
 * - on each new C- line its point is where the line meets the shock
 *   continued from its point on the line before, at the mean of the two
 *   lines' wave angles; the upstream state there follows from the C-
 *   line's compatibility relation and that of the C+ arriving from the old
 *   line's upstream side (its foot interpolated on the old line); the
 *   downstream state from the oblique-shock relations at the wave angle,
 *   which is found (secant) so that the C+ arriving from the old line's
 *   downstream side satisfies its compatibility relation;
 * - C+ characteristics that reach the shock before the new line are
 *   absorbed (dropped), from both sides, as a shock absorbs its family;
 * - the streamlines that cross it take its entropy jump, a table of the
 *   entropy behind it by stream function;
 * - where it reaches the bow shock, the march goes on with the bow shock
 *   alone; the weak reflected wave of that interaction is neglected.
 */

import { characteristicNetwork, type Point } from './characteristics';
import { deflectionAngle, normalShock } from './gas-dynamics';

type Network = ReturnType<typeof characteristicNetwork>;

/** The flow on one side of the embedded shock at a point. */
export interface ShockSides {
  readonly x: number;
  readonly y: number;
  /** Wave angle to the axis, radians. */
  readonly beta: number;
  readonly up: Point;
  readonly down: Point;
}

/**
 * The state behind an oblique shock of wave angle `beta` (to the axis) in
 * the flow `up` (its own pressure, entropy and angle), or `up` itself if
 * the wave is no stronger than a Mach wave there.
 */
export function behindEmbeddedShock(net: Network, gamma: number, up: Point, beta: number): Point {
  const { m, rho } = net.machOf(up);
  const relative = beta - up.theta;
  const mn = m * Math.sin(relative);
  if (!(mn > 1)) return { ...up };
  const s = normalShock(mn, gamma);
  const p = up.p * s.pressureRatio;
  const r = rho * s.densityRatio;
  return {
    ...up,
    p,
    k: p / r ** gamma,
    theta: up.theta + deflectionAngle(m, relative, gamma),
  };
}

/** A point on the segment from a to b at fraction t, every variable linear. */
function lerp(a: Point, b: Point, t: number): Point {
  const mix = (f: (q: Point) => number) => f(a) + t * (f(b) - f(a));
  return {
    x: mix((q) => q.x),
    y: mix((q) => q.y),
    theta: mix((q) => q.theta),
    p: mix((q) => q.p),
    k: mix((q) => q.k),
    psi: mix((q) => q.psi),
  };
}

/**
 * The foot on the segment from a to b of the C+ characteristic through c
 * (its direction the mean of the foot's and c's C+ angles): the fraction t
 * in [0, 1] where the line from the foot passes through c, or the nearer
 * end if it lies beyond the segment, with the signed miss there.
 */
function plusFoot(net: Network, a: Point, b: Point, c: Point): Point {
  const cc = net.coefficients(c, 1);
  const miss = (t: number) => {
    const f = lerp(a, b, t);
    const angle = 0.5 * (net.coefficients(f, 1).angle + cc.angle);
    // Signed distance of c from the line through f at that angle.
    return (c.y - f.y) * Math.cos(angle) - (c.x - f.x) * Math.sin(angle);
  };
  let lo = 0;
  let hi = 1;
  let mLo = miss(lo);
  const mHi = miss(hi);
  if (mLo * mHi > 0) return lerp(a, b, Math.abs(mLo) < Math.abs(mHi) ? 0 : 1);
  for (let it = 0; it < 100 && hi - lo > 1e-15; it++) {
    const mid = 0.5 * (lo + hi);
    const mMid = miss(mid);
    if (mMid * mLo > 0) {
      lo = mid;
      mLo = mMid;
    } else {
      hi = mid;
    }
  }
  return lerp(a, b, 0.5 * (lo + hi));
}

/**
 * The embedded shock's point on a new C- line: the line comes down from
 * `a` (its last point upstream of the shock); the shock was at `s` on the
 * line before, whose upstream segment next to it runs from `upA` to s.up
 * and downstream segment from s.down to `downB`. Returns the shock's new
 * point and both its sides, the upstream entropy from `kUp` by stream
 * function.
 */
export function embeddedShockPoint(
  net: Network,
  gamma: number,
  s: ShockSides,
  a: Point,
  upA: Point,
  downB: Point,
  kUp: (psi: number) => number,
): ShockSides {
  /** Both sides at wave angle beta, and the downstream compatibility residual. */
  const at = (beta: number) => {
    const ca = net.coefficients(a, -1);
    const lineAngle = 0.5 * (s.beta + beta);
    const ls = Math.tan(lineAngle);
    let up: Point = { ...a };
    net.converge(() => {
      const cm = net.coefficients(up, -1);
      const lm = Math.tan(0.5 * (ca.angle + cm.angle));
      // The C- line from a meets the shock's line from s.
      const x = (a.y - s.y + ls * s.x - lm * a.x) / (ls - lm);
      const y = s.y + ls * (x - s.x);
      const foot = plusFoot(net, upA, s.up, { ...up, x, y });
      const cf = net.coefficients(foot, 1);
      const cpl = net.coefficients(up, 1);
      const qm = 0.5 * (ca.q + cm.q);
      const rm = (0.5 * (ca.s + cm.s) * Math.hypot(x - a.x, y - a.y)) / (0.5 * (y + a.y));
      const qp = 0.5 * (cf.q + cpl.q);
      const rp = (0.5 * (cf.s + cpl.s) * Math.hypot(x - foot.x, y - foot.y)) / (0.5 * (y + foot.y));
      // qm (p - pa) - (theta - theta_a) = -rm;  qp (p - pf) + (theta - theta_f) = -rp.
      const p = (qm * a.p - a.theta + qp * foot.p + foot.theta - rm - rp) / (qm + qp);
      const theta = qp * (foot.p - p) + foot.theta - rp;
      const change = Math.max(
        Math.abs(x - up.x),
        Math.abs(y - up.y),
        Math.abs(p - up.p),
        Math.abs(theta - up.theta),
      );
      const psi = a.psi - net.massFlux({ ...up, x, y, p, theta }, a);
      up = { x, y, p, theta, psi, k: kUp(psi) };
      return change;
    });
    const down = behindEmbeddedShock(net, gamma, up, beta);
    const foot = plusFoot(net, s.down, downB, down);
    const cf = net.coefficients(foot, 1);
    const cd = net.coefficients(down, 1);
    const qp = 0.5 * (cf.q + cd.q);
    const rp =
      (0.5 * (cf.s + cd.s) * Math.hypot(down.x - foot.x, down.y - foot.y)) /
      (0.5 * (down.y + foot.y));
    const residual = qp * (down.p - foot.p) + (down.theta - foot.theta) + rp;
    return { up, down, residual };
  };
  // Secant on the wave angle, from the old one.
  let b0 = s.beta;
  let b1 = s.beta * (1 - 1e-4);
  let r0 = at(b0).residual;
  let r1 = at(b1).residual;
  for (let it = 0; it < 60 && Math.abs(b1 - b0) > 1e-15 && r1 !== r0; it++) {
    const b2 = b1 - (r1 * (b1 - b0)) / (r1 - r0);
    b0 = b1;
    r0 = r1;
    b1 = b2;
    r1 = at(b1).residual;
  }
  const { up, down } = at(b1);
  return { x: up.x, y: up.y, beta: b1, up, down };
}
