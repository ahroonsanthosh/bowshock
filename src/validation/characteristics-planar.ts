/**
 * Steady supersonic planar flow over the upper surface of a sharp polygonal fin section (a double wedge, a
 * hexagon) by the method of characteristics, with the leading-edge shock fitted and the expansion fans at the
 * convex corners centred: the reference of rung (b3) of docs/design/0021-3d-euler-fins.md (section 4.2), the
 * extension to planar flow that docs/design/0009-fin-wave-drag.md section 7 names. It sees what
 * shock-expansion theory leaves out: the waves of each fan meet the leading-edge shock, bend and weaken it,
 * and reflect from it towards the surface, and the entropy behind the bent shock varies across streamlines.
 *
 * Along the Mach lines dy/dx = tan(theta +- mu) of rotational planar flow (total enthalpy H constant, entropy
 * K = p / rho^gamma constant along streamlines), Q dp +- d(theta) = 0 with Q = sqrt(M^2 - 1) / (rho V^2): the
 * axisymmetric relations of src/validation/characteristics.ts without their dy / y term. Written with the
 * Prandtl-Meyer angle nu(p, K) (at fixed H, d(nu)/dp = -Q), they read
 *
 *   d(theta) - d(nu) + nu_K dK = 0 along C+,   d(theta) + d(nu) - nu_K dK = 0 along C-,
 *
 * exact where the entropy is uniform (a centred fan and the uniform regions are then reproduced to round-off,
 * whatever the fan's resolution), the entropy term averaged over each segment's ends where it is not.
 * The network marches along right-running (C-) lines from the shock to the surface. Each new line starts at
 * a shock point a set step along the shock from the last (so that the network does not stretch where the
 * weakened shock runs nearly parallel to the C+ lines behind it); the C+ lines of the previous line that
 * reach the shock within the step end there, the C+ through the new shock point is found on the previous
 * line, and the shock angle comes from the oblique-shock relations and that C+ line's compatibility
 * relation. The new line's interior points lie where it meets the remaining C+ lines; it ends on the
 * surface. The line that ends exactly at a convex corner (found by shortening the shock step) carries the
 * corner's centred fan: points at the corner, the flow angle stepped from the upstream surface's to the
 * downstream one's and nu with it; each emits a C+ line. Directions and the entropy term are averaged over
 * the two ends of each segment and the unit processes iterate (second order). The entropy of a point comes
 * from the stream function, integrated down each line from the shock, where the free stream entering at
 * height y carries psi = rho V y; the shock history gives K(psi). The stream function at the surface, which
 * should vanish, measures the mass balance.
 *
 * Refused: a detached or subsonic leading-edge shock, a concave corner, subsonic flow anywhere.
 */

import { deflectionAngle, normalShock, obliqueShock, prandtlMeyer } from './gas-dynamics';

/** A polygonal upper surface: points from the leading edge (0, 0) to the trailing edge, x increasing. */
export interface PlanarSurface {
  readonly x: readonly number[];
  readonly y: readonly number[];
}

export interface PlanarCharacteristicsOptions {
  readonly mach: number;
  readonly gamma: number;
  /** Intervals of the first line, from the shock to the first corner. */
  readonly intervals: number;
  /** Fan points per radian of turning at a corner (default 100 per radian at 80 intervals, in proportion). */
  readonly fanPointsPerRadian?: number;
}

export interface PlanarCharacteristicsSolution {
  /** Surface points in downstream order: x, y, pressure over the free stream's (corners appear twice). */
  readonly wall: readonly { readonly x: number; readonly y: number; readonly p: number }[];
  /** The upper surface's drag: the integral of (p - p_inf) dy, over the free stream's pressure. */
  readonly dragOverPressure: number;
  /** Largest |psi| at a surface point, over rho V times that line's shock height. */
  readonly massBalance: number;
  readonly lines: number;
}

interface Pt {
  readonly x: number;
  readonly y: number;
  readonly theta: number;
  readonly nu: number;
  readonly k: number;
  psi: number;
  readonly p: number;
  readonly rho: number;
  readonly v: number;
  readonly mu: number;
  /** d(nu)/dK at fixed p. */
  readonly nuK: number;
}

/** Root of f between a and b (f(a), f(b) of opposite signs) by the Illinois method. */
function illinois(
  f: (x: number) => number,
  a: number,
  b: number,
  fa: number,
  fb: number,
  tol: number,
): number {
  if (fa === 0) return a;
  if (fb === 0) return b;
  let side = 0;
  for (let it = 0; it < 200; it++) {
    const c = (a * fb - b * fa) / (fb - fa);
    const fc = f(c);
    if (fc === 0 || Math.abs(b - a) <= tol) return c;
    if (Math.sign(fc) === Math.sign(fb)) {
      b = c;
      fb = fc;
      if (side === -1) fa *= 0.5;
      side = -1;
    } else {
      a = c;
      fa = fc;
      if (side === 1) fb *= 0.5;
      side = 1;
    }
  }
  return (a * fb - b * fa) / (fb - fa);
}

export function planarCharacteristics(
  surface: PlanarSurface,
  options: PlanarCharacteristicsOptions,
): PlanarCharacteristicsSolution {
  const { mach, gamma: g } = options;
  const n = options.intervals;
  if (!(Number.isInteger(n) && n >= 4)) throw new RangeError('at least four intervals are needed');
  const segments = surface.x.length - 1;
  const angle = (s: number) =>
    Math.atan2(surface.y[s + 1]! - surface.y[s]!, surface.x[s + 1]! - surface.x[s]!);
  for (let s = 1; s < segments; s++) {
    if (angle(s) > angle(s - 1) + 1e-15) throw new RangeError('concave corners are not handled');
  }
  const fanPerRadian = options.fanPointsPerRadian ?? (100 * n) / 80;
  const chord = surface.x[segments]! - surface.x[0]!;
  // Free stream: p = rho = 1, sound speed sqrt(gamma).
  const vInf = mach * Math.sqrt(g);
  const enthalpy = g / (g - 1) + 0.5 * vInf * vInf;
  const nuMax = (Math.PI / 2) * (Math.sqrt((g + 1) / (g - 1)) - 1);
  /** Mach number from nu, by Newton from a bracketing start (to round-off). */
  const machOfNu = (nu: number) => {
    if (!(nu >= 0 && nu < nuMax))
      throw new RangeError(`nu = ${nu} is outside the Prandtl-Meyer range`);
    let lo = 1;
    let hi = 2;
    while (prandtlMeyer(hi, g) < nu) hi *= 2;
    let m = 0.5 * (lo + hi);
    for (let it = 0; it < 100; it++) {
      const r = prandtlMeyer(m, g) - nu;
      if (r < 0) lo = m;
      else hi = m;
      const d = Math.sqrt(m * m - 1) / (m * (1 + 0.5 * (g - 1) * m * m));
      let next = m - r / d;
      if (!(next > lo && next < hi)) next = 0.5 * (lo + hi);
      if (Math.abs(next - m) <= 1e-16 * m) return next;
      m = next;
    }
    return m;
  };
  const make = (x: number, y: number, theta: number, nu: number, k: number, psi: number): Pt => {
    const m = machOfNu(nu);
    const m2 = m * m;
    const a2 = (2 * enthalpy) / (m2 + 2 / (g - 1));
    const p = (a2 / (g * k ** (1 / g))) ** (g / (g - 1));
    const rho = (g * p) / a2;
    const v = m * Math.sqrt(a2);
    if (!(m > 1)) throw new RangeError(`subsonic flow at (${x}, ${y})`);
    const dnudm2 = Math.sqrt(m2 - 1) / (2 * m2 * (1 + 0.5 * (g - 1) * m2));
    const dm2dk = -(2 * enthalpy) / (a2 * g * k);
    return { x, y, theta, nu, k, psi, p, rho, v, mu: Math.asin(1 / m), nuK: dnudm2 * dm2dk };
  };
  const nuOf = (p: number, k: number) => {
    const rho = (p / k) ** (1 / g);
    const a2 = (g * p) / rho;
    const v2 = 2 * (enthalpy - a2 / (g - 1));
    const m = Math.sqrt(v2 / a2);
    if (!(m > 1)) throw new RangeError(`subsonic flow: M = ${m}`);
    return prandtlMeyer(m, g);
  };
  const behindShock = (beta: number) => {
    const s = normalShock(mach * Math.sin(beta), g);
    const k = s.pressureRatio / s.densityRatio ** g;
    return { theta: deflectionAngle(mach, beta, g), nu: nuOf(s.pressureRatio, k), k };
  };
  const first = obliqueShock(mach, angle(0), g);
  const k1 = first.pressureRatio / first.densityRatio ** g;
  const nu1 = nuOf(first.pressureRatio, k1);
  const history: { psi: number; k: number }[] = [{ psi: 0, k: k1 }];
  const kOf = (psi: number) => {
    if (psi <= history[0]!.psi) return history[0]!.k;
    const last = history[history.length - 1]!;
    if (psi >= last.psi) return last.k;
    // The first entry at or above psi (psi increases along the history), by bisection.
    let lo = 0;
    let hi = history.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (history[mid]!.psi < psi) lo = mid;
      else hi = mid;
    }
    const a = history[lo]!;
    const b = history[hi]!;
    return b.psi === a.psi ? b.k : a.k + ((b.k - a.k) * (psi - a.psi)) / (b.psi - a.psi);
  };
  /** The mass flux across the segment from a to b, positive for the flow crossing it from left to right. */
  const flux = (a: Pt, b: Pt) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return (
      0.5 *
      (a.rho * a.v * (Math.cos(a.theta) * dy - Math.sin(a.theta) * dx) +
        b.rho * b.v * (Math.cos(b.theta) * dy - Math.sin(b.theta) * dx))
    );
  };
  /** Where the lines through a at angle ta and through b at angle tb meet; s is the distance from a. */
  const intersect = (ax: number, ay: number, ta: number, bx: number, by: number, tb: number) => {
    const ca = Math.cos(ta);
    const sa = Math.sin(ta);
    const cb = Math.cos(tb);
    const sb = Math.sin(tb);
    const det = -ca * sb + sa * cb;
    const s = (-(bx - ax) * sb + (by - ay) * cb) / det;
    return { x: ax + s * ca, y: ay + s * sa, s };
  };
  const converged = (P: Pt, Q: Pt) =>
    Math.abs(P.nu - Q.nu) <= 1e-15 &&
    Math.abs(P.theta - Q.theta) <= 1e-15 &&
    Math.abs(P.x - Q.x) + Math.abs(P.y - Q.y) <= 1e-15 * chord;

  /** Interior point: the C+ from a (previous line) meets the C- from b (this line, above). */
  const interior = (a: Pt, b: Pt): Pt => {
    let P = b;
    for (let it = 0; it < 60; it++) {
      const tp = 0.5 * (a.theta + a.mu + P.theta + P.mu);
      const tm = 0.5 * (b.theta - b.mu + P.theta - P.mu);
      const xy = intersect(a.x, a.y, tp, b.x, b.y, tm);
      // psi falls down the line from b by the flux across b -> P; K follows from psi.
      const psi = b.psi + flux(b, { ...P, x: xy.x, y: xy.y });
      const k = kOf(psi);
      const A = a.theta - a.nu - 0.5 * (a.nuK + P.nuK) * (k - a.k);
      const B = b.theta + b.nu + 0.5 * (b.nuK + P.nuK) * (k - b.k);
      const next = make(xy.x, xy.y, 0.5 * (A + B), 0.5 * (B - A), k, psi);
      const done = it > 0 && converged(next, P);
      P = next;
      if (done) break;
    }
    return P;
  };

  /** Where the C- from b meets the line of segment s (within the segment or beyond its end). */
  const wallPoint = (b: Pt, s: number): Pt => {
    const th = angle(s);
    let P = b;
    for (let it = 0; it < 60; it++) {
      const tm = 0.5 * (b.theta - b.mu + P.theta - P.mu);
      const xy = intersect(surface.x[s]!, surface.y[s]!, th, b.x, b.y, tm);
      const nu = b.theta + b.nu - 0.5 * (b.nuK + P.nuK) * (k1 - b.k) - th;
      const trial = make(xy.x, xy.y, th, nu, k1, 0);
      trial.psi = b.psi + flux(b, trial);
      const done = it > 0 && converged(trial, P);
      P = trial;
      if (done) break;
    }
    return P;
  };

  /**
   * The new shock point a step ds along the shock from s0, and the C+ through it, whose foot lies on the
   * previous line between points j and j + 1, near jGuess.
   */
  const shockPoint = (
    line: readonly Pt[],
    s0: { x: number; y: number; beta: number },
    ds: number,
    jGuess: number,
  ) => {
    const at = (j: number, f: number): Pt => {
      const a = line[j]!;
      const c = line[j + 1]!;
      return make(
        a.x + f * (c.x - a.x),
        a.y + f * (c.y - a.y),
        a.theta + f * (c.theta - a.theta),
        a.nu + f * (c.nu - a.nu),
        a.k + f * (c.k - a.k),
        0,
      );
    };
    const solve = (beta: number) => {
      const post = behindShock(beta);
      const bm = 0.5 * (s0.beta + beta);
      const pt = make(
        s0.x + ds * Math.cos(bm),
        s0.y + ds * Math.sin(bm),
        post.theta,
        post.nu,
        post.k,
        0,
      );
      const missOf = (b: Pt) => {
        const t = 0.5 * (b.theta + b.mu + pt.theta + pt.mu);
        return (pt.x - b.x) * Math.sin(t) - (pt.y - b.y) * Math.cos(t);
      };
      const j0 = Math.max(0, jGuess - 2);
      const j1 = Math.min(line.length - 2, jGuess + 2);
      let foot: Pt | undefined;
      let best = { j: j0, f: 0, m: Infinity };
      let mPrev = missOf(line[j0]!);
      for (let j = j0; j <= j1 && !foot; j++) {
        const mNext = missOf(line[j + 1]!);
        if (Math.abs(mPrev) < best.m) best = { j, f: 0, m: Math.abs(mPrev) };
        if (Math.abs(mNext) < best.m) best = { j, f: 1, m: Math.abs(mNext) };
        if (Math.sign(mPrev) !== Math.sign(mNext)) {
          const jj = j;
          const f = illinois((f) => missOf(at(jj, f)), 0, 1, mPrev, mNext, 1e-16);
          foot = at(jj, f);
        }
        mPrev = mNext;
      }
      // Only for trial shock angles far from the root: the nearest point, so the residual stays monotone.
      foot ??= at(best.j, best.f);
      const residual =
        pt.theta - pt.nu - (foot.theta - foot.nu - 0.5 * (foot.nuK + pt.nuK) * (pt.k - foot.k));
      return { pt, residual };
    };
    const lo = Math.asin(1 / mach) + 1e-9;
    const hi = s0.beta + 0.02;
    const rlo = solve(lo).residual;
    const rhi = solve(hi).residual;
    if (Math.sign(rlo) === Math.sign(rhi))
      throw new RangeError(`no shock angle fits at x = ${s0.x}`);
    const beta = illinois((b) => solve(b).residual, lo, hi, rlo, rhi, 1e-16);
    const { pt } = solve(beta);
    pt.psi = vInf * pt.y;
    return { pt, beta };
  };

  // The first line: the C- through the first corner, in the uniform flow behind the straight shock.
  const c0 = make(surface.x[1]!, surface.y[1]!, angle(0), nu1, k1, 0);
  const top = intersect(c0.x, c0.y, angle(0) - c0.mu, 0, 0, first.beta);
  let line: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    line.push(make(top.x + f * (c0.x - top.x), top.y + f * (c0.y - top.y), angle(0), nu1, k1, 0));
  }
  line[0]!.psi = vInf * top.y;
  for (let i = 1; i <= n; i++) line[i]!.psi = line[i - 1]!.psi + flux(line[i - 1]!, line[i]!);
  history.push({ psi: line[0]!.psi, k: k1 });
  const ds0 = Math.hypot(top.x - c0.x, top.y - c0.y) / n;
  let shock = { x: top.x, y: top.y, beta: first.beta };
  const wall: { x: number; y: number; p: number }[] = [
    { x: surface.x[0]!, y: surface.y[0]!, p: first.pressureRatio },
    { x: c0.x, y: c0.y, p: c0.p },
  ];
  let massBalance = Math.abs(line[n]!.psi) / (vInf * top.y);
  let lines = 1;

  /** Append the fan of the corner at the start of segment s to the line ending at that corner. */
  const addFan = (s: number) => {
    const c = line[line.length - 1]!;
    const turn = angle(s - 1) - angle(s);
    const nf = Math.max(2, Math.ceil(turn * fanPerRadian));
    for (let f = 1; f <= nf; f++) {
      const d = (turn * f) / nf;
      line.push(make(c.x, c.y, angle(s - 1) - d, c.nu + d, k1, c.psi));
    }
    wall.push({ x: c.x, y: c.y, p: line[line.length - 1]!.p });
  };

  /** March a new line with shock step ds, ending where it meets segment s's line. */
  const newLine = (ds: number, s: number) => {
    // The C+ lines of points 1 .. j reach the shock within the step and end there.
    let j = 0;
    while (j + 2 < line.length) {
      const b = line[j + 1]!;
      const r = intersect(shock.x, shock.y, shock.beta, b.x, b.y, b.theta + b.mu).s;
      if (!(r > 0 && r <= ds)) break;
      j++;
    }
    const { pt, beta } = shockPoint(line, shock, ds, j);
    const next: Pt[] = [pt];
    for (let i = j + 1; i < line.length; i++) next.push(interior(line[i]!, next[next.length - 1]!));
    next.push(wallPoint(next[next.length - 1]!, s));
    return { next, beta, shockPt: pt };
  };
  const accept = (r: ReturnType<typeof newLine>) => {
    line = r.next;
    shock = { x: r.shockPt.x, y: r.shockPt.y, beta: r.beta };
    history.push({ psi: r.shockPt.psi, k: r.shockPt.k });
    const w = line[line.length - 1]!;
    massBalance = Math.max(massBalance, Math.abs(w.psi) / (vInf * r.shockPt.y));
    lines++;
  };
  const wallX = (r: ReturnType<typeof newLine>) => r.next[r.next.length - 1]!.x;

  for (let s = 1; s < segments; s++) {
    addFan(s);
    const xEnd = surface.x[s + 1]!;
    for (;;) {
      const r = newLine(ds0, s);
      if (wallX(r) < xEnd) {
        accept(r);
        const w = r.next[r.next.length - 1]!;
        wall.push({ x: w.x, y: w.y, p: w.p });
        continue;
      }
      // The line that ends exactly at the segment's end: a shorter shock step. A step of zero reproduces the
      // last line, which ends short of it.
      const xLast = line[line.length - 1]!.x;
      let best = r;
      const ds = illinois(
        (d) => {
          best = newLine(d, s);
          return wallX(best) - xEnd;
        },
        0,
        ds0,
        xLast - xEnd,
        wallX(r) - xEnd,
        1e-15 * ds0,
      );
      best = newLine(ds, s);
      const end = best.next[best.next.length - 1]!;
      if (Math.abs(end.x - xEnd) > 1e-9 * chord)
        throw new RangeError('no line lands on the corner');
      best.next[best.next.length - 1] = { ...end, x: xEnd, y: surface.y[s + 1]! };
      accept(best);
      wall.push({ x: xEnd, y: surface.y[s + 1]!, p: end.p });
      break;
    }
  }

  let drag = 0;
  for (let i = 1; i < wall.length; i++) {
    const a = wall[i - 1]!;
    const b = wall[i]!;
    drag += (0.5 * (a.p + b.p) - 1) * (b.y - a.y);
  }
  return { wall, dragOverPressure: drag, massBalance, lines };
}

/** The section drag coefficient (both surfaces, chord 1) from the upper surface's integral. */
export function planarSectionDragCoefficient(
  solution: PlanarCharacteristicsSolution,
  mach: number,
  gamma: number,
): number {
  return (2 * solution.dragOverPressure) / (0.5 * gamma * mach * mach);
}
