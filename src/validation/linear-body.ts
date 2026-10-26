/**
 * Linearised supersonic flow over a slender body of revolution at zero
 * incidence (T. von Karman and N. B. Moore, Trans. ASME 54 (1932) 303;
 * the form of H. Ashley and M. Landahl, Aerodynamics of Wings and Bodies,
 * 1965, section 6.3): a sanity check of the order of magnitude and the
 * trends of the boat-tail's pressure drag (docs/design/0023-boat-tails.md),
 * not a reference.
 *
 * Sources on the axis of strength f(x) = U S'(x) / (2 pi) (the slender
 * body's boundary condition, S the cross-section's area) give the
 * perturbation potential
 *
 *   phi(x, r) = -integral from 0 to x - beta r of f(xi) / sqrt((x - xi)^2 - beta^2 r^2) d(xi),
 *
 * beta = sqrt(M^2 - 1). With xi = x - beta r cosh(tau), and f(0) = 0 (a
 * sharp tip),
 *
 *   u = phi_x = -integral from 0 to T of f'(x - beta r cosh tau) d(tau),
 *   v = phi_r = beta integral from 0 to T of f'(x - beta r cosh tau) cosh(tau) d(tau),
 *
 * T = acosh(x / (beta r)), and the surface pressure Cp = -2 u / U - (v / U)^2
 * (the square of the cross-flow kept, as slender-body theory needs on a
 * body of revolution). At a corner of the profile f jumps by df, and f'
 * holds df delta(xi - xc), which adds -df / sqrt((x - xc)^2 - beta^2 r^2)
 * to u and beta (x - xc) / (beta r) times that, negated, to v: an
 * integrable singularity on the surface a distance beta r behind the
 * corner, where the Mach cone of the corner's axial source meets it. The
 * shoulder's expansion itself is therefore misplaced by beta R, and the
 * check is one of magnitude: slender-body theory proper, the limit of this
 * near the axis, has Cp of order 1 / (x - xc) behind the corner and an
 * unbounded boat-tail drag.
 */

import { bodyBreakpoints, bodyLength, bodyRadius, type Body } from '../geometry/body';

export interface LinearBodyOptions {
  readonly mach: number;
  /** Intervals of the integral in tau, and of the drag along the boat-tail. */
  readonly intervals: number;
}

/**
 * The linearised pressure coefficient on the body's surface at x, and the
 * boat-tail's pressure drag on the body's cross-section, from the
 * shoulder to the base (positive pulling the body back).
 */
export function linearBoatTailDrag(body: Body, options: LinearBodyOptions): number {
  const tail = body.boatTail;
  if (tail === undefined) throw new RangeError('the body has no boat-tail');
  const cp = linearSurfacePressure(body, options);
  const R = body.nose.baseRadius;
  const xs = body.nose.length + body.cylinderLength;
  const xb = bodyLength(body);
  // Gauss-Legendre on each of n panels in x (the integrand's singularity
  // at xs + beta r is integrable; the panels are refined towards it).
  const n = options.intervals;
  let integral = 0;
  const nodes = [-0.906179845938664, -0.5384693101056831, 0, 0.5384693101056831, 0.906179845938664];
  const weights = [
    0.23692688505618908, 0.47862867049936647, 0.5688888888888889, 0.47862867049936647,
    0.23692688505618908,
  ];
  for (let k = 0; k < n; k++) {
    const a = xs + ((xb - xs) * k) / n;
    const b = xs + ((xb - xs) * (k + 1)) / n;
    for (let g = 0; g < nodes.length; g++) {
      const x = 0.5 * (a + b) + 0.5 * (b - a) * nodes[g]!;
      const r = bodyRadius(body, x);
      const dr = -(R - tail.baseRadius) / tail.length;
      integral += 0.5 * (b - a) * weights[g]! * cp(x) * r * dr;
    }
  }
  // C = 2 / R^2 * integral of Cp r dr, positive on a boat-tail (dr < 0)
  // where the pressure is below the free stream's.
  return (2 * integral) / (R * R);
}

/** The linearised surface pressure coefficient along the body (see the file's header). */
export function linearSurfacePressure(
  body: Body,
  options: LinearBodyOptions,
): (x: number) => number {
  const { mach, intervals } = options;
  const beta = Math.sqrt(mach * mach - 1);
  const L = body.nose.length;
  const h = 1e-6 * L;
  // f = U R R' with U = 1; its derivative, and its jumps at corners.
  const radius = (x: number) => bodyRadius(body, x);
  const f = (x: number) => {
    const r = radius(x);
    return (r * (radius(x + h) - radius(x - h))) / (2 * h);
  };
  const fPrime = (x: number) => (f(x + h) - f(x - h)) / (2 * h);
  const corners = bodyBreakpoints(body)
    .filter((x) => x > 0)
    .map((x) => ({
      x,
      jump: radius(x) * ((radius(x + h) - radius(x)) / h - (radius(x) - radius(x - h)) / h),
    }))
    .filter((c) => Math.abs(c.jump) > 1e-9);
  return (x: number) => {
    const r = radius(x);
    const top = Math.acosh(Math.max(x / (beta * r), 1));
    // Smooth part, by the midpoint rule in tau, skipping the samples that
    // straddle a corner (whose jump is added exactly below).
    let u = 0;
    let v = 0;
    const m = intervals;
    for (let k = 0; k < m; k++) {
      const tau = ((k + 0.5) * top) / m;
      const xi = x - beta * r * Math.cosh(tau);
      if (corners.some((c) => Math.abs(xi - c.x) < 2 * h)) continue;
      const g = fPrime(xi);
      u -= (g * top) / m;
      v += (beta * g * Math.cosh(tau) * top) / m;
    }
    for (const c of corners) {
      const d = x - c.x;
      const s = d * d - beta * beta * r * r;
      if (!(s > 0)) continue;
      u -= c.jump / Math.sqrt(s);
      v += (d * c.jump) / (r * Math.sqrt(s));
    }
    return -2 * u - v * v;
  };
}
