/**
 * An independent computation of the linear thickness wave drag of a fin on
 * a plane wall, by the supersonic area rule (Hayes; Lomax and Heaslet), for
 * checking src/fins/linear-wave-drag.ts by a different formulation. It
 * follows the audit's hayes_fin.py
 * (docs/research/total-drag/audit/scripts/hayes_fin.py) in what it
 * computes, but integrates each cut exactly instead of by Fourier series:
 *
 * - The fin and its image form a planar wing of span 2s. Its wave drag is
 *   the average over roll angle theta of the von Karman drags of the area
 *   distributions cut by the oblique Mach planes x - beta cos(theta) y = X:
 *   D / q = (1 / pi) Int_0^pi D(theta) dtheta, and the fin's is half.
 * - For a cut, S'(X) = sum_k 2 lambda_k (measure in y of the cut line inside
 *   segment k). With straight segment lines S' is continuous and piecewise
 *   linear in X, with breakpoints where the cut passes a planform vertex,
 *   and zero at both ends; so S'' is piecewise constant and von Karman's
 *   D / q = -(1 / (2 pi)) Int Int S''(X1) S''(X2) log|X1 - X2| dX1 dX2
 *   is a finite double sum of rectangle integrals of log|X1 - X2|, in
 *   closed form with G(u) = u^2 log|u| / 2 - 3 u^2 / 4.
 * - D(theta) is even about pi/2 (the wing is symmetric in y), smooth
 *   except where the cut passes two vertices at once (kinks) or runs
 *   parallel to a segment line (logarithmic singularities). The integral
 *   over (0, pi/2) is split at all those angles and each piece integrated
 *   by the tanh-sinh rule, which converges at log singular ends.
 */

import type { Planform } from '../../../src/fins/planform';
import { planformArea } from '../../../src/fins/planform';
import { gaussLegendre } from '../../../src/fins/quadrature';
import type { SymmetricSection } from '../../../src/fins/section';

interface Wing {
  readonly s: number;
  readonly a: number[];
  readonly b: number[];
  readonly slope: number[];
}

function wing(planform: Planform, section: SymmetricSection): Wing {
  const dTan = planform.tanTrailingEdge - planform.tanLeadingEdge;
  const a = section.x.map((f) => f * planform.rootChord);
  const b = section.x.map((f) => planform.tanLeadingEdge + f * dTan);
  const slope: number[] = [];
  for (let k = 0; k + 1 < section.x.length; k++) {
    slope.push(
      (section.halfThickness[k + 1]! - section.halfThickness[k]!) /
        (section.x[k + 1]! - section.x[k]!),
    );
  }
  return { s: planform.span, a, b, slope };
}

/**
 * Measure of u in [0, s] with (X - aLo) + (c - bLo) u >= 0 and
 * (aHi - X) + (bHi - c) u > 0: the part of the cut x = X + c u (u = |y| on
 * one side, c = beta cos(theta) times the side's sign) inside one segment.
 */
function measure(
  X: number,
  c: number,
  aLo: number,
  bLo: number,
  aHi: number,
  bHi: number,
  s: number,
): number {
  let lo = 0;
  let hi = s;
  for (const [A, B] of [
    [X - aLo, c - bLo],
    [aHi - X, bHi - c],
  ] as const) {
    if (B === 0) {
      if (A < 0) return 0;
    } else if (B > 0) {
      lo = Math.max(lo, -A / B);
    } else {
      hi = Math.min(hi, -A / B);
    }
  }
  return Math.max(hi - lo, 0);
}

/** S'(X) of the wing (fin and image) for the cut slope bc = beta cos(theta). */
export function areaSlope(w: Wing, bc: number, X: number): number {
  let sp = 0;
  for (let k = 0; k < w.slope.length; k++) {
    const lam = w.slope[k]!;
    if (lam === 0) continue;
    for (const side of [1, -1]) {
      sp += 2 * lam * measure(X, bc * side, w.a[k]!, w.b[k]!, w.a[k + 1]!, w.b[k + 1]!, w.s);
    }
  }
  return sp;
}

/** Breakpoints of S'(X): X = x_vertex - bc y_vertex over the planform's vertices. */
export function breakpoints(w: Wing, bc: number): number[] {
  const xs: number[] = [];
  for (let k = 0; k < w.a.length; k++) {
    xs.push(w.a[k]!);
    for (const side of [1, -1]) xs.push(w.a[k]! + w.b[k]! * w.s - bc * side * w.s);
  }
  xs.sort((p, q) => p - q);
  const out: number[] = [];
  for (const x of xs) if (out.length === 0 || x > out[out.length - 1]!) out.push(x);
  return out;
}

/** Second antiderivative of log|u|, and the first. */
const G = (u: number) => (u === 0 ? 0 : (u * u * Math.log(Math.abs(u))) / 2 - (3 * u * u) / 4);
const H = (u: number) => (u === 0 ? 0 : u * Math.log(Math.abs(u)) - u);

const GL12 = gaussLegendre(12);
const GL16 = gaussLegendre(16);

/**
 * Int_a^b Int_c^d log|x - y| dy dx, evaluated without the cancellation the
 * closed form suffers when one interval is much shorter than the other or
 * both are far apart: a product Gauss rule when the rectangle is at least
 * its own size from the diagonal (log is smooth there), a Gauss rule over
 * the short interval of the exact inner integral when the lengths differ by
 * more than 1e3, the closed form otherwise.
 */
export function rectangleLogIntegral(a: number, b: number, c: number, d: number): number {
  const la = b - a;
  const lc = d - c;
  const gap = Math.max(c - b, a - d, 0);
  const big = Math.max(la, lc);
  if (gap >= big) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const x = a + (la * (GL12.nodes[i]! + 1)) / 2;
      for (let j = 0; j < 12; j++) {
        const y = c + (lc * (GL12.nodes[j]! + 1)) / 2;
        sum += GL12.weights[i]! * GL12.weights[j]! * Math.log(Math.abs(x - y));
      }
    }
    return (sum * la * lc) / 4;
  }
  if (Math.min(la, lc) >= 1e-3 * big) return G(b - c) - G(a - c) - G(b - d) + G(a - d);
  const [p, q, r, t] = la <= lc ? [a, b, c, d] : [c, d, a, b];
  let sum = 0;
  for (let i = 0; i < 16; i++) {
    const x = p + ((q - p) * (GL16.nodes[i]! + 1)) / 2;
    sum += GL16.weights[i]! * (H(x - r) - H(x - t));
  }
  return (sum * (q - p)) / 2;
}

/** Von Karman drag over q of one cut, from S'' piecewise constant. */
export function cutDrag(w: Wing, bc: number): number {
  const X = breakpoints(w, bc);
  const sp = X.map((x) => areaSlope(w, bc, x));
  const m = X.length - 1;
  const s2: number[] = [];
  for (let i = 0; i < m; i++) s2.push((sp[i + 1]! - sp[i]!) / (X[i + 1]! - X[i]!));
  let sum = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      sum += s2[i]! * s2[j]! * rectangleLogIntegral(X[i]!, X[i + 1]!, X[j]!, X[j + 1]!);
    }
  }
  return -sum / (2 * Math.PI);
}

/** Angles in (0, pi/2] where D(theta) has a kink or a log singularity. */
function splitAngles(w: Wing, beta: number): number[] {
  const vertices: [number, number][] = [];
  for (let k = 0; k < w.a.length; k++) {
    vertices.push([w.a[k]!, 0]);
    vertices.push([w.a[k]! + w.b[k]! * w.s, w.s]);
    vertices.push([w.a[k]! + w.b[k]! * w.s, -w.s]);
  }
  const angles = [0, Math.PI / 2];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const [xi, yi] = vertices[i]!;
      const [xj, yj] = vertices[j]!;
      if (yi === yj) continue;
      const c = Math.abs((xj - xi) / (yj - yi));
      if (c <= beta) angles.push(Math.acos(c / beta));
    }
  }
  angles.sort((p, q) => p - q);
  const out: number[] = [];
  for (const t of angles) if (out.length === 0 || t - out[out.length - 1]! > 1e-12) out.push(t);
  return out;
}

/**
 * tanh-sinh rule on [0, 1] at step 2^-level: [u, 1 - u, weight]. Nodes
 * within 1e-9 of either end are dropped: there the cut is so nearly
 * parallel to a segment line that S' cannot be evaluated accurately, and
 * the dropped part of a log-singular integrand is of order 1e-8 of it.
 */
function tanhSinh(level: number): [number, number, number][] {
  const h = 2 ** -level;
  const out: [number, number, number][] = [];
  for (let j = -Math.ceil(4 / h); j <= Math.ceil(4 / h); j++) {
    const t = j * h;
    const z = (Math.PI / 2) * Math.sinh(t);
    const u = 1 / (1 + Math.exp(-2 * z));
    const v = 1 / (1 + Math.exp(2 * z));
    const w = (h * (Math.PI / 2) * Math.cosh(t)) / (2 * Math.cosh(z) ** 2);
    if (u < 1e-9 || v < 1e-9) continue;
    out.push([u, v, w]);
  }
  return out;
}

export interface AreaRuleDrag {
  readonly cd3d: number;
  readonly cdStrip: number;
  readonly ratio: number;
}

/** Linear thickness drag of one fin on a plane wall by the area rule. */
export function areaRuleWaveDrag(
  planform: Planform,
  section: SymmetricSection,
  mach: number,
  level = 6,
): AreaRuleDrag {
  const beta = Math.sqrt(mach * mach - 1);
  const w = wing(planform, section);
  const angles = splitAngles(w, beta);
  const rule = tanhSinh(level);
  let integral = 0;
  for (let i = 0; i + 1 < angles.length; i++) {
    const lo = angles[i]!;
    const hi = angles[i + 1]!;
    let piece = 0;
    for (const [u, v, wt] of rule) {
      // theta from whichever end is nearer, to keep its distance exact.
      const theta = u < 0.5 ? lo + (hi - lo) * u : hi - (hi - lo) * v;
      piece += wt * cutDrag(w, beta * Math.cos(theta));
    }
    integral += piece * (hi - lo);
  }
  // Average over (0, pi) is twice the integral over (0, pi/2), over pi.
  const dragWing = (2 * integral) / Math.PI;
  const area = planformArea(planform);
  const cd3d = dragWing / 2 / area;
  let lam2 = 0;
  for (let k = 0; k < w.slope.length; k++) {
    lam2 += w.slope[k]! ** 2 * (section.x[k + 1]! - section.x[k]!);
  }
  const cdStrip = (4 / beta) * lam2;
  return { cd3d, cdStrip, ratio: cd3d / cdStrip };
}

export { wing as areaRuleWing };
