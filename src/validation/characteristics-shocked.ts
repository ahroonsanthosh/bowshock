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

import type { Body } from '../geometry/body';
import {
  characteristicNetwork,
  startingData,
  type CharacteristicsFromOptions,
  type CharacteristicsSolution,
  type NetworkOptions,
  type Point,
  type ProfileBody,
  type StartingLine,
} from './characteristics';
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
    // A wave angle past the weak branch's sonic point is too steep: the
    // residual grows with the wave angle, so it counts as positive.
    if (!(net.machOf(down).m > 1)) return { up, down, residual: Infinity };
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
  // Secant on the wave angle, from the old one, kept inside the bracket
  // the residuals so far give (the residual grows with the wave angle): a
  // step that leaves it, or one from an infinite residual, bisects
  // instead; with no wave angle yet too steep it steps up, and with none
  // yet too shallow it goes halfway to the upstream Mach angle. Below the
  // Mach angle the shock has no strength and the residual no longer
  // changes: a positive one there leaves the shock a Mach wave.
  let lo = -Infinity;
  let hi = Infinity;
  const bracket = (beta: number, residual: number) => {
    if (residual < 0) lo = Math.max(lo, beta);
    else hi = Math.min(hi, beta);
  };
  let b0 = s.beta;
  let e0 = at(b0);
  bracket(b0, e0.residual);
  let b1 = s.beta * (1 - 1e-4);
  let e1 = at(b1);
  bracket(b1, e1.residual);
  for (let it = 0; it < 120; it++) {
    if (Math.abs(b1 - b0) <= 1e-15 || e1.residual === 0) break;
    const flat = e1.residual === e0.residual;
    if (flat && Number.isFinite(e1.residual) && e1.residual > 0) break;
    let b2 = flat ? NaN : b1 - (e1.residual * (b1 - b0)) / (e1.residual - e0.residual);
    if (!(b2 > lo && b2 < hi)) {
      if (Number.isFinite(lo) && Number.isFinite(hi)) b2 = 0.5 * (lo + hi);
      else if (Number.isFinite(hi)) {
        const mach = Math.asin(1 / net.machOf(e1.up).m) + e1.up.theta;
        b2 = 0.5 * (Math.min(hi, b1) + mach);
      } else b2 = lo + 2 * Math.abs(b1 - b0) + 1e-6;
    }
    b0 = b1;
    e0 = e1;
    b1 = b2;
    e1 = at(b1);
    bracket(b1, e1.residual);
  }
  const { up, down } = e1;
  return { x: up.x, y: up.y, beta: b1, up, down };
}

/** A C- line of the march, from its top to the body, and its embedded shock if any. */
interface Line {
  readonly points: Point[];
  /** Index of the shock's upstream side; the downstream side follows it. */
  readonly shock: { readonly index: number; readonly beta: number } | null;
}

export interface ShockedSolution extends CharacteristicsSolution {
  /** The embedded shock's points, in order: position, wave angle, pressure ratio across it. */
  readonly embedded: readonly {
    readonly x: number;
    readonly y: number;
    readonly beta: number;
    readonly pressureRatio: number;
  }[];
  /** Where it formed, or null if it did not. */
  readonly formed: { readonly x: number; readonly y: number } | null;
  /** Where it reached the bow shock, or null if it did not. */
  readonly merged: { readonly x: number; readonly y: number } | null;
  /**
   * The fewest points on a line less the first march's number at the same
   * step (the shock's two sides counted as one), over the lines: negative
   * where absorbed points left a line shorter; with `reseed`, after it
   * (never negative).
   */
  readonly shortfall: number;
  /** Points inserted by re-seeding, over the march. */
  readonly inserted: number;
}

export interface ShockedOptions extends CharacteristicsFromOptions {
  /** Verification only (characteristicNetwork). */
  readonly network?: NetworkOptions;
  /**
   * The fourth march (W6 README section 10): each new line re-seeded to
   * the first march's number of points, the longest gaps halved first.
   * Off, the march is the third, as recorded.
   */
  readonly reseed?: boolean;
}

/** Signed distance of c from the line through a at the given angle (positive above-left). */
function side(a: { x: number; y: number }, angle: number, c: { x: number; y: number }) {
  return (c.y - a.y) * Math.cos(angle) - (c.x - a.x) * Math.sin(angle);
}

/**
 * The march of characteristicsFrom with an embedded shock fitted (see the
 * file's header), from the same starting data.
 */
export function characteristicsFromShocked(
  body: Body | ProfileBody,
  start: StartingLine,
  options: ShockedOptions,
): ShockedSolution {
  const { mach, gamma } = options;
  const net = characteristicNetwork(body, mach, gamma, options.network);
  const { radius, interiorPoint, wallPoint, shockPoint, entropy, entropyAt } = net;
  const { data, kWall, startPsi, startMassDefect, width, m } = startingData(net, start, options);

  // The entropy behind the embedded shock by stream function; elsewhere the
  // network's (the data's, then the bow shock's history).
  const behind: { psi: number; k: number }[] = [];
  const kAll = (psi: number) => {
    const n = behind.length;
    if (n === 0 || psi < behind[0]!.psi || psi > behind[n - 1]!.psi) return entropyAt(psi);
    if (n === 1) return behind[0]!.k;
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (behind[mid]!.psi <= psi) lo = mid;
      else hi = mid;
    }
    const a = behind[lo]!;
    const b = behind[hi]!;
    return a.k + ((b.k - a.k) * (psi - a.psi)) / (b.psi - a.psi);
  };

  const wall: { x: number; p: number }[] = [{ x: data[m]!.x, p: data[m]!.p }];
  const shock: { x: number; y: number; angle: number }[] = [
    { x: data[0]!.x, y: data[0]!.y, angle: start.shockAngle },
  ];
  const embedded: { x: number; y: number; beta: number; pressureRatio: number }[] = [];
  let formed: { x: number; y: number } | null = null;
  let merged: { x: number; y: number } | null = null;
  let massBalance = 0;
  let penetration = 0;

  /** Is b ahead of a along the C- line through a (farther from its top)? */
  const ahead = (a: Point, b: Point) => {
    const angle = net.coefficients(a, -1).angle;
    return (b.x - a.x) * Math.cos(angle) + (b.y - a.y) * Math.sin(angle) > 0;
  };

  /** Records an embedded shock point and the entropy behind it. */
  const recordShock = (sides: ShockSides) => {
    embedded.push({
      x: sides.x,
      y: sides.y,
      beta: sides.beta,
      pressureRatio: sides.down.p / sides.up.p,
    });
    if (behind.length === 0 || sides.up.psi > behind[behind.length - 1]!.psi) {
      behind.push({ psi: sides.up.psi, k: sides.down.k });
    }
  };

  /**
   * A new C- line from `head`, meeting the C+ lines from the old line's
   * points from index `first` on, then the body; null where it reaches
   * beyond the body's end.
   */
  const step = (head: Point, old: Line, first: number): Line | null => {
    const points: Point[] = [head];
    let shockIndex: number | null = null;
    let shockBeta = 0;
    const u = old.shock?.index ?? -1;
    let j = first;
    while (j < old.points.length) {
      const prev = points[points.length - 1]!;
      if (old.shock && j === u) {
        // The embedded shock's new point, from the last upstream point.
        const s: ShockSides = {
          x: old.points[u]!.x,
          y: old.points[u]!.y,
          beta: old.shock.beta,
          up: old.points[u]!,
          down: old.points[u + 1]!,
        };
        const upA = old.points[Math.max(u - 1, 0)]!;
        const downB = old.points[Math.min(u + 2, old.points.length - 1)]!;
        const next = embeddedShockPoint(net, gamma, s, prev, upA, downB, kAll);
        recordShock(next);
        shockIndex = points.length;
        shockBeta = next.beta;
        points.push(next.up, next.down);
        j = u + 2;
        continue;
      }
      const q = interiorPoint(prev, old.points[j]!, kAll);
      if (old.shock && j < u) {
        // Upstream: a C+ that reaches the shock (its old line continued)
        // before the new line is absorbed.
        if (side(old.points[u]!, old.shock.beta, q) < 0) {
          j++;
          continue;
        }
      } else if (shockIndex !== null) {
        // Downstream: a C+ that reaches the shock before the new line meets
        // it is absorbed (it falls behind the line's last point).
        if (!ahead(prev, q)) {
          j++;
          continue;
        }
      } else if (!ahead(prev, q) && points.length >= 2) {
        // No shock yet: two C+ lines cross. A shock forms where they do, at
        // zero strength, between the old points j - 1 and j: where the
        // C+ chords from them to the new line (a to prev, b to q) cross,
        // which lies between the two lines as the order of their ends
        // reverses. (The crossing of the straight C+ lines through a and b
        // at their own angles, used first, can lie anywhere when they are
        // nearly parallel: README section 9.4.)
        const a = old.points[j - 1]!;
        const b = old.points[j]!;
        const da = { x: prev.x - a.x, y: prev.y - a.y };
        const db = { x: q.x - b.x, y: q.y - b.y };
        const det = da.x * db.y - da.y * db.x;
        const t =
          det === 0
            ? 0.5
            : Math.min(Math.max(((b.x - a.x) * db.y - (b.y - a.y) * db.x) / det, 0), 1);
        const x = a.x + t * da.x;
        const y = a.y + t * da.y;
        const at: Point = { ...lerp(a, b, 0.5), x, y };
        const beta = 0.5 * (Math.atan2(da.y, da.x) + Math.atan2(db.y, db.x));
        const s: ShockSides = { x, y, beta, up: at, down: at };
        formed ??= { x, y };
        // The new line's last point came from a's C+, which ends at the
        // shock: drop it and meet the shock from the point before.
        points.pop();
        const from = points[points.length - 1]!;
        const next = embeddedShockPoint(net, gamma, s, from, a, b, kAll);
        recordShock(next);
        shockIndex = points.length;
        shockBeta = next.beta;
        points.push(next.up, next.down);
        j++;
        continue;
      }
      penetration = Math.max(penetration, (radius(q.x) - q.y) / width);
      points.push(q);
      j++;
    }
    const w = wallPoint(points[points.length - 1]!, kWall);
    if (w === null) return null;
    points.push(w);
    // As characteristicsFrom's: relative to the starting line's mass flux
    // in the triangle of its dependence, to the line's own (its bow-shock
    // point's stream function) in the march.
    const flux = first === 0 ? data[0]!.psi : head.psi;
    massBalance = Math.max(massBalance, Math.abs(w.psi - startPsi) / flux);
    wall.push({ x: w.x, p: w.p });
    return {
      points,
      shock: shockIndex === null ? null : { index: shockIndex, beta: shockBeta },
    };
  };

  let shortfall = 0;
  let inserted = 0;
  /**
   * The re-seeding rule (README section 10): while the line has fewer
   * points than `target` (the shock's two sides counted as one), its
   * longest gap, never the shock's, nearest the top on a tie, takes a
   * point at its middle in chord length, interpolated (cubic, through the
   * gap's points and their outer neighbours on the same side of the
   * shock; linear where that side has fewer than four), its entropy from
   * the table at its stream function. Records the shortfall after (the
   * third march's, without `reseed`, from absorption alone).
   */
  const reseed = (line: Line, target: number): Line => {
    const count = () => points.length - (shockAt === null ? 0 : 1);
    const points = [...line.points];
    let shockAt = line.shock?.index ?? null;
    while (options.reseed && count() < target) {
      let best = -1;
      let longest = -1;
      for (let i = 0; i + 1 < points.length; i++) {
        if (i === shockAt) continue;
        const gap = Math.hypot(points[i + 1]!.x - points[i]!.x, points[i + 1]!.y - points[i]!.y);
        if (gap > longest) {
          longest = gap;
          best = i;
        }
      }
      // The side of the shock the gap lies on, as a range of indices.
      const lo = shockAt === null || best > shockAt ? (shockAt === null ? 0 : shockAt + 1) : 0;
      const hi = shockAt === null || best > shockAt ? points.length - 1 : shockAt;
      const ids =
        best - 1 >= lo && best + 2 <= hi ? [best - 1, best, best + 1, best + 2] : [best, best + 1];
      const chord = [0];
      for (let k = 1; k < ids.length; k++) {
        const a = points[ids[k - 1]!]!;
        const b = points[ids[k]!]!;
        chord.push(chord[k - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
      }
      const g = ids.length === 4 ? 1 : 0;
      const t = 0.5 * (chord[g]! + chord[g + 1]!);
      const weights = ids.map((_, a) => {
        let w = 1;
        for (let b = 0; b < ids.length; b++) {
          if (b !== a) w *= (t - chord[b]!) / (chord[a]! - chord[b]!);
        }
        return w;
      });
      const mix = (f: (q: Point) => number) =>
        weights.reduce((sum, w, a) => sum + w * f(points[ids[a]!]!), 0);
      const psi = mix((q) => q.psi);
      const q: Point = {
        x: mix((q) => q.x),
        y: mix((q) => q.y),
        theta: mix((q) => q.theta),
        p: mix((q) => q.p),
        psi,
        k: kAll(psi),
      };
      points.splice(best + 1, 0, q);
      if (shockAt !== null && best < shockAt) shockAt++;
      inserted++;
    }
    shortfall = Math.min(shortfall, count() - target);
    return {
      points,
      shock: shockAt === null ? null : { index: shockAt, beta: line.shock!.beta },
    };
  };

  const result = () => ({
    wall,
    shock,
    massBalance,
    startMassDefect,
    penetration,
    embedded,
    formed,
    merged,
    shortfall,
    inserted,
  });
  // The triangle of the data's dependence, as characteristicsFrom.
  let line: Line = { points: [data[m]!], shock: null };
  for (let a = m - 1; a >= 0; a--) {
    const next = step(data[a]!, line, 0);
    if (next === null) return result();
    line = reseed(next, 2 * (m - a) + 1);
  }
  options.onLine?.(line.points);
  // The march, each new line from a bow-shock point.
  let beta = start.shockAngle;
  for (;;) {
    if (line.shock && line.shock.index <= 1) {
      // The embedded shock has reached the bow shock: the bow shock goes on
      // alone, the shock's upstream side dropped.
      const at = line.points[line.shock.index]!;
      merged ??= { x: at.x, y: at.y };
      const points = [...line.points];
      points.splice(line.shock.index, 1);
      line = { points, shock: null };
    }
    const s = shockPoint(line.points[0]!, beta, line.points[1]!);
    beta = s.beta;
    entropy.push({ psi: s.point.psi, k: s.point.k });
    const next = step(s.point, line, 2);
    if (next === null) break;
    shock.push({ x: s.point.x, y: s.point.y, angle: beta });
    line = reseed(next, 2 * m + 1);
    options.onLine?.(line.points);
  }
  return result();
}
