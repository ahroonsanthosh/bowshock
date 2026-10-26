/**
 * Linearised supersonic flow over a slender body of revolution at zero
 * incidence (T. von Karman and N. B. Moore, Trans. ASME 54 (1932) 303; in
 * the form of H. Ashley and M. Landahl, Aerodynamics of Wings and Bodies,
 * 1965, chapter 6): a sanity check of the size and the trends of a
 * boat-tail's pressure drag (docs/design/0023-boat-tails.md), not a
 * reference.
 *
 * Sources on the axis of strength f(x) = U S'(x) / (2 pi) = U R R' (the
 * slender body's boundary condition, S the cross-section's area) give the
 * perturbation potential
 *
 *   phi(x, r) = -integral from 0 to x - beta r of f(xi) / sqrt((x - xi)^2 - beta^2 r^2) d(xi),
 *
 * beta = sqrt(M^2 - 1), and with xi = x - beta r cosh(tau) and f(0) = 0 (a
 * sharp tip) the axial perturbation velocity
 *
 *   u = phi_x = -integral from 0 to acosh(x / (beta r)) of f'(x - beta r cosh tau) d(tau).
 *
 * The surface pressure is slender-body theory's, Cp = -2 u / U - R'^2. At a
 * corner of the profile f jumps by df, and f' holds df delta(xi - xc),
 * which adds -df / sqrt((x - xc)^2 - beta^2 r^2) to u: an integrable
 * singularity on the surface a distance beta R behind the corner, where the
 * Mach cone of the corner's axial source meets it. The shoulder's expansion
 * is therefore placed beta R downstream of the shoulder, and the check is
 * one of size and trend only. (Slender-body theory proper, the limit of
 * this near the axis, has u of order 1 / (x - xc) just behind the corner,
 * and an unbounded boat-tail drag.)
 */

import {
  bodyBreakpoints,
  bodyLength,
  bodyRadius,
  shoulderPosition,
  type Body,
} from '../geometry/body';

export interface LinearBodyOptions {
  readonly mach: number;
  /** Intervals of the integrals in tau and along the boat-tail. */
  readonly intervals: number;
}

/**
 * The boat-tail's pressure drag on the body's cross-section by linearised
 * theory (see the file's header), from the shoulder to the base, positive
 * pulling the body back.
 */
export function linearBoatTailDrag(body: Body, options: LinearBodyOptions): number {
  const tail = body.boatTail;
  if (tail === undefined) throw new RangeError('the body has no boat-tail');
  const { mach, intervals: n } = options;
  const beta = Math.sqrt(mach * mach - 1);
  const R = body.nose.baseRadius;
  const xs = shoulderPosition(body);
  const xb = bodyLength(body);
  const slope = -(R - tail.baseRadius) / tail.length;
  const { smooth, corners } = axialVelocity(body, options);
  // Cp r dr/dx without the corners' singular parts, by Gauss-Legendre on
  // n panels; those parts, each zero ahead of its Mach cone's foot x* and
  // like 1 / sqrt(x - x*) behind it, with x = x* + t^2.
  const cpSmooth = (x: number) => -2 * smooth(x) - slope * slope;
  let integral = gauss((x) => cpSmooth(x) * bodyRadius(body, x) * slope, xs, xb, n);
  for (const c of corners) {
    // The foot: (x - xc)^2 = beta^2 r(x)^2 on the boat-tail, or on the
    // cylinder ahead of it for corners ahead of the shoulder.
    const s = (x: number) => (x - c.x) ** 2 - (beta * bodyRadius(body, x)) ** 2;
    let lo = Math.max(c.x, xs);
    let hi = xb;
    if (!(s(hi) > 0)) continue;
    if (s(lo) < 0) {
      for (let k = 0; k < 200; k++) {
        const mid = 0.5 * (lo + hi);
        if (s(mid) < 0) lo = mid;
        else hi = mid;
      }
    } else hi = lo;
    const foot = hi;
    const singular = (x: number) =>
      (2 * c.jump * bodyRadius(body, x) * slope) / Math.sqrt(Math.max(s(x), 0));
    const span = Math.sqrt(xb - foot);
    integral += gauss((t) => singular(foot + t * t) * 2 * t, 0, span, n);
  }
  // C = 2 / R^2 * integral of Cp r dr, positive on a boat-tail (dr < 0)
  // where the pressure is below the free stream's.
  return (2 * integral) / (R * R);
}

/** u on the surface: its smooth part, and the jumps of f at the corners. */
function axialVelocity(body: Body, options: LinearBodyOptions) {
  const beta = Math.sqrt(options.mach * options.mach - 1);
  const L = body.nose.length;
  const h = 1e-6 * L;
  const radius = (x: number) => bodyRadius(body, x);
  const breaks = bodyBreakpoints(body).filter((x) => x > 0);
  /** R' within the segment holding x (one-sided at a breakpoint). */
  const slopeAt = (x: number) => {
    const a = breaks.some((b) => b > x - h && b <= x) ? x : x - h;
    const b = breaks.some((p) => p >= x && p < x + h) ? x : x + h;
    return (radius(b) - radius(a)) / (b - a);
  };
  const f = (x: number) => radius(x) * slopeAt(x);
  const fPrime = (x: number) => (f(x + h) - f(x - h)) / (2 * h);
  const corners = breaks
    .map((x) => ({ x, jump: radius(x) * (slopeAt(x + 0.5 * h) - slopeAt(x - 0.5 * h)) }))
    .filter((c) => Math.abs(c.jump) > 1e-9);
  const smooth = (x: number) => {
    const r = radius(x);
    const top = Math.acosh(Math.max(x / (beta * r), 1));
    // The midpoint rule in tau, skipping samples within 2h of a corner
    // (whose jump is taken exactly, apart).
    let u = 0;
    const m = options.intervals;
    for (let k = 0; k < m; k++) {
      const tau = ((k + 0.5) * top) / m;
      const xi = x - beta * r * Math.cosh(tau);
      if (corners.some((c) => Math.abs(xi - c.x) < 2 * h)) continue;
      u -= (fPrime(xi) * top) / m;
    }
    return u;
  };
  return { smooth, corners };
}

const NODES = [-0.906179845938664, -0.5384693101056831, 0, 0.5384693101056831, 0.906179845938664];
const WEIGHTS = [
  0.23692688505618908, 0.47862867049936647, 0.5688888888888889, 0.47862867049936647,
  0.23692688505618908,
];

/** Five-point Gauss-Legendre on n equal panels. */
function gauss(g: (x: number) => number, a: number, b: number, n: number): number {
  let sum = 0;
  for (let k = 0; k < n; k++) {
    const p = a + ((b - a) * k) / n;
    const q = a + ((b - a) * (k + 1)) / n;
    for (let i = 0; i < NODES.length; i++) {
      sum += 0.5 * (q - p) * WEIGHTS[i]! * g(0.5 * (p + q) + 0.5 * (q - p) * NODES[i]!);
    }
  }
  return sum;
}
