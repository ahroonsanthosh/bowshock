/**
 * Linear supersonic thickness (zero-lift wave) drag of a thin fin on a
 * plane wall: a TypeScript port of the research's finwave.py
 * (docs/research/total-drag/scripts/finwave.py), with the same formulation
 * and quadrature, and two additions: the drag integrals are split at the
 * vertices' Mach cones (LinearDragResolution.splitAtMachCones), and each
 * result estimates its quadrature error.
 *
 * The fin's symmetric section (./section.ts, SymmetricSection) keeps its
 * shape and thickness ratio along the span, so each segment k between
 * chordwise breakpoints has a constant surface slope lambda_k and its
 * boundary lines are straight, x_k(y) = a_k + b_k |y|. The body is a plane
 * wall at y = 0, represented by the fin's image in it: the fin occupies
 * 0 <= y <= s and its mirror image -s <= y < 0, so the wall is a plane of
 * symmetry of the flow. A real body is curved; the plane wall is a stand-in
 * (for the ARCAS fin the body radius is about half the span).
 *
 * Source sheet (linear theory, zero lift):
 *   phi(x, y) = -(1/pi) Int Int lambda(xi, eta) / sqrt((x - xi)^2 - beta^2 (y - eta)^2) dxi deta
 * over the forward Mach cone. The xi integral of a constant-slope segment
 * is done analytically, so
 *   u(x, y) = -(1/pi) Int deta sum_k lambda_k [K(x - x_k(eta)) - K(x - x_{k+1}(eta))],
 *   K(d) = 1 / sqrt(d^2 - B^2) for d > B, else 0,  B = beta |y - eta|,
 * and Cp = -2u on the surface. The eta integral is split where a breakpoint
 * line meets the Mach cone (inverse-square-root ends) and at eta = y, 0,
 * +-s; each piece uses eta = a + (b - a) sin^2(t) with Gauss-Legendre in t.
 *
 * Drag of one fin, both faces, on its planform area S:
 *   CD = (2 / S) Int Int Cp lambda dx dy
 * integrated with the same sin^2 clustering in x (per segment, and per
 * piece between Mach cones) and in y (root and tip, and per piece). Strip
 * theory on the same planform (2D Ackeret at every
 * station): CD_strip = (4 / (beta S)) Int Int lambda^2 dx dy, which for a
 * section of constant shape is the 2D Ackeret drag on the chord.
 *
 * Verified in tests/fins/linear-wave-drag.test.ts against the four analytic
 * results the research checked (the 2D limit, the infinite swept wing with
 * supersonic edges, zero drag of the infinite swept wing with subsonic
 * edges, the tip-cone pressure of a constant-slope sheet), against an
 * independent supersonic area-rule computation, and for convergence of the
 * quadrature; results in docs/design/0009-fin-wave-drag.md.
 */

import { validatePlanform, planformArea, chordAt, type Planform } from './planform';
import { sineSquaredRule } from './quadrature';
import { FinRefusal } from './refusal';
import { validateSymmetricSection, type SymmetricSection } from './section';

/** Quadrature orders: Gauss points per piece in each direction. */
export interface LinearDragResolution {
  readonly span: number;
  readonly chord: number;
  readonly eta: number;
  /**
   * Split the chordwise integral of each station where the Mach cones of
   * the planform's vertices cross it, and the spanwise integral where they
   * cross a breakpoint line (default true). The surface pressure has kinks
   * there, which an unsplit rule converges over slowly and erratically.
   * false is finwave.py's integration (one piece per segment and one span
   * piece), kept to check the port against it.
   */
  readonly splitAtMachCones?: boolean;
}

/**
 * Default resolution: 24 points per piece. Its error in the 3D-to-strip
 * ratio, against the area rule, was at most 3.4e-6 on the 52 cases of 0009
 * section 3.3 (subsonic leading edges the worst; supersonic ones 1.8e-7).
 */
export const DEFAULT_RESOLUTION: LinearDragResolution = { span: 24, chord: 24, eta: 24 };

/** The fin as the method needs it: breakpoint lines and segment slopes. */
interface FinGeometry {
  readonly span: number;
  readonly a: Float64Array;
  readonly b: Float64Array;
  /** Slope of each segment (half-thickness over chord, per unit chord). */
  readonly slope: Float64Array;
}

function geometry(planform: Planform, section: SymmetricSection): FinGeometry {
  validatePlanform(planform);
  validateSymmetricSection(section);
  const n = section.x.length;
  const a = new Float64Array(n);
  const b = new Float64Array(n);
  const slope = new Float64Array(n - 1);
  const dTan = planform.tanTrailingEdge - planform.tanLeadingEdge;
  for (let k = 0; k < n; k++) {
    const f = section.x[k]!;
    a[k] = f * planform.rootChord;
    b[k] = planform.tanLeadingEdge + f * dTan;
  }
  for (let k = 0; k + 1 < n; k++) {
    slope[k] =
      (section.halfThickness[k + 1]! - section.halfThickness[k]!) /
      (section.x[k + 1]! - section.x[k]!);
  }
  return { span: planform.span, a, b, slope };
}

function betaOf(mach: number): number {
  if (!(mach > 1) || !Number.isFinite(mach)) {
    throw new FinRefusal(
      'subsonic-free-stream',
      `supersonic linear theory needs a free-stream Mach number above 1, got ${mach}`,
    );
  }
  return Math.sqrt(mach * mach - 1);
}

/**
 * Perturbation velocity u (over the free-stream speed) on the fin's
 * surface plane at (x, y), from the source sheet of the fin and its image.
 */
function perturbationU(fin: FinGeometry, beta: number, x: number, y: number, n: number): number {
  const s = fin.span;
  const nk = fin.a.length;
  const br: number[] = [-s, 0, s, y];
  for (let k = 0; k < nk; k++) {
    const a = fin.a[k]!;
    for (const sgn of [1, -1]) {
      // On the side sgn, x_k = a + bb eta; the Mach cone is x - x_k = beta |y - eta|.
      const bb = fin.b[k]! * sgn;
      let den = bb - beta;
      if (Math.abs(den) > 1e-14) br.push((x - a - beta * y) / den);
      den = bb + beta;
      if (Math.abs(den) > 1e-14) br.push((x - a + beta * y) / den);
    }
  }
  const pts = br.filter((p) => p >= -s - 1e-15 && p <= s + 1e-15).sort((p, q) => p - q);
  const rule = sineSquaredRule(n);
  let total = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const lo = pts[i]!;
    const hi = pts[i + 1]!;
    if (hi - lo < 1e-14) continue;
    let piece = 0;
    for (let j = 0; j < n; j++) {
      const eta = lo + (hi - lo) * rule.nodes[j]!;
      const bm = beta * Math.abs(y - eta);
      const bm2 = bm * bm;
      const ae = Math.abs(eta);
      let acc = 0;
      // Segment k contributes lambda_k [K(x - x_k) - K(x - x_{k+1})];
      // grouped by line, line k carries lambda_k - lambda_{k-1}.
      let previous = 0;
      for (let k = 0; k < nk; k++) {
        const lam = k < nk - 1 ? fin.slope[k]! : 0;
        const coefficient = lam - previous;
        previous = lam;
        if (coefficient === 0) continue;
        const d = x - (fin.a[k]! + fin.b[k]! * ae);
        const arg = d * d - bm2;
        if (d > bm && arg > 0) acc += coefficient / Math.sqrt(arg);
      }
      piece += acc * rule.weights[j]!;
    }
    total += piece * (hi - lo);
  }
  return -total / Math.PI;
}

export interface LinearWaveDrag {
  /** Linear 3D thickness drag of one fin, both faces, on its planform area. */
  readonly cd3d: number;
  /** Strip theory (2D Ackeret at every station) on the same area. */
  readonly cdStrip: number;
  /** cd3d / cdStrip. */
  readonly ratio: number;
  /** Estimated quadrature error of `ratio`, absolute (see `linearWaveDrag`). */
  readonly quadratureError: number;
}

/**
 * Vertices of the fin and its image whose downstream Mach cones carry the
 * kinks of the surface pressure: the root end of every breakpoint line
 * (where |y| bends it) and both tip ends (the fin's and the image's).
 */
function vertices(fin: FinGeometry): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k < fin.a.length; k++) {
    const tip = fin.a[k]! + fin.b[k]! * fin.span;
    out.push([fin.a[k]!, 0], [tip, fin.span], [tip, -fin.span]);
  }
  return out;
}

/** Sorted points of (lo, hi), with lo and hi, dropping pieces shorter than tol. */
function pieces(lo: number, hi: number, cuts: readonly number[], tol: number): number[] {
  const inner = cuts.filter((c) => c > lo + tol && c < hi - tol).sort((p, q) => p - q);
  const out = [lo];
  for (const c of inner) if (c - out[out.length - 1]! > tol) out.push(c);
  if (hi - out[out.length - 1]! <= tol) out.pop();
  out.push(hi);
  return out;
}

/**
 * Span stations in (0, s) where the drag per station has a kink: where a
 * vertex's Mach cone, x = x_v + beta |y - y_v|, crosses a breakpoint line.
 */
function spanCuts(fin: FinGeometry, beta: number, verts: readonly [number, number][]): number[] {
  const out: number[] = [];
  for (const [xv, yv] of verts) {
    for (let k = 0; k < fin.a.length; k++) {
      const a = fin.a[k]!;
      const b = fin.b[k]!;
      // Branch y >= yv: xv + beta (y - yv) = a + b y.
      if (Math.abs(beta - b) > 1e-14) {
        const y = (a - xv + beta * yv) / (beta - b);
        if (y >= yv && y > 0 && y < fin.span) out.push(y);
      }
      // Branch y <= yv: xv + beta (yv - y) = a + b y.
      if (Math.abs(beta + b) > 1e-14) {
        const y = (xv + beta * yv - a) / (beta + b);
        if (y <= yv && y > 0 && y < fin.span) out.push(y);
      }
    }
  }
  return out;
}

/**
 * Floor of the quadrature error estimate, relative: below it the estimate
 * was not shown to bound the error (0009, section 3.3).
 */
export const QUADRATURE_ERROR_FLOOR = 2e-7;

/** Twice the drag integrals Int Int Cp lambda and Int Int (2 / beta) lambda^2 over the fin. */
function integrate(
  fin: FinGeometry,
  beta: number,
  resolution: LinearDragResolution,
): [number, number] {
  const s = fin.span;
  const split = resolution.splitAtMachCones ?? true;
  const verts = vertices(fin);
  const yRule = sineSquaredRule(resolution.span);
  const yCuts = split ? pieces(0, s, spanCuts(fin, beta, verts), 1e-12 * s) : [0, s];
  let d3 = 0;
  let d2 = 0;
  for (let p = 0; p + 1 < yCuts.length; p++) {
    const y0 = yCuts[p]!;
    const dy = yCuts[p + 1]! - y0;
    for (let i = 0; i < resolution.span; i++) {
      const y = y0 + dy * yRule.nodes[i]!;
      const wy = dy * yRule.weights[i]!;
      const [sec3, sec2] = station(fin, beta, y, verts, resolution, split);
      d3 += 2 * sec3 * wy;
      d2 += 2 * sec2 * wy;
    }
  }
  return [d3, d2];
}

/**
 * Linear 3D and strip-theory thickness drag of a fin on a plane wall.
 *
 * `quadratureError` estimates the quadrature error of `ratio` (absolute):
 * the difference from the same integral with two thirds of the points per
 * piece, or QUADRATURE_ERROR_FLOOR times the ratio if larger. On the 52
 * cases of 0009 (section 3.3) it exceeded the error measured against the
 * area rule in every case; without the floor it fell short only where both
 * were below the floor.
 */
export function linearWaveDrag(
  planform: Planform,
  section: SymmetricSection,
  mach: number,
  resolution: LinearDragResolution = DEFAULT_RESOLUTION,
): LinearWaveDrag {
  const beta = betaOf(mach);
  const fin = geometry(planform, section);
  const [d3, d2] = integrate(fin, beta, resolution);
  const coarse = (n: number) => Math.max(1, Math.round((2 * n) / 3));
  const [c3, c2] = integrate(fin, beta, {
    ...resolution,
    span: coarse(resolution.span),
    chord: coarse(resolution.chord),
    eta: coarse(resolution.eta),
  });
  const area = planformArea(planform);
  const cd3d = d3 / area;
  const cdStrip = d2 / area;
  const ratio = cd3d / cdStrip;
  const quadratureError = Math.max(
    Math.abs(ratio - c3 / c2),
    QUADRATURE_ERROR_FLOOR * Math.abs(ratio),
  );
  return { cd3d, cdStrip, ratio, quadratureError };
}

/** Int Cp lambda dx and its 2D Ackeret counterpart at station y. */
function station(
  fin: FinGeometry,
  beta: number,
  y: number,
  verts: readonly [number, number][],
  resolution: Pick<LinearDragResolution, 'chord' | 'eta'>,
  split: boolean,
): [number, number] {
  const xRule = sineSquaredRule(resolution.chord);
  const xCuts = split ? verts.map(([xv, yv]) => xv + beta * Math.abs(y - yv)) : [];
  let sec3 = 0;
  let sec2 = 0;
  for (let k = 0; k < fin.slope.length; k++) {
    const lam = fin.slope[k]!;
    if (lam === 0) continue;
    const x0 = fin.a[k]! + fin.b[k]! * y;
    const x1 = fin.a[k + 1]! + fin.b[k + 1]! * y;
    const xs = pieces(x0, x1, xCuts, 1e-12 * (x1 - x0));
    for (let p = 0; p + 1 < xs.length; p++) {
      const lo = xs[p]!;
      const dx = xs[p + 1]! - lo;
      for (let j = 0; j < resolution.chord; j++) {
        const x = lo + dx * xRule.nodes[j]!;
        const cp = -2 * perturbationU(fin, beta, x, y, resolution.eta);
        sec3 += cp * lam * xRule.weights[j]! * dx;
      }
    }
    sec2 += ((2 * lam * lam) / beta) * (x1 - x0);
  }
  return [sec3, sec2];
}

/**
 * Linear 3D section drag at span station y (0 < y < span), both faces, on
 * the local chord.
 */
export function linearSectionDrag(
  planform: Planform,
  section: SymmetricSection,
  mach: number,
  y: number,
  resolution: Pick<LinearDragResolution, 'chord' | 'eta' | 'splitAtMachCones'> = DEFAULT_RESOLUTION,
): number {
  const beta = betaOf(mach);
  const fin = geometry(planform, section);
  if (!(y > 0 && y < fin.span)) throw new RangeError('the station must lie inside the span');
  const [sec3] = station(
    fin,
    beta,
    y,
    vertices(fin),
    resolution,
    resolution.splitAtMachCones ?? true,
  );
  return (2 * sec3) / chordAt(planform, y);
}

/**
 * Linear pressure coefficient on the fin surface at (x, y), with x from the
 * root leading edge (for tests and diagnostics).
 */
export function linearSurfacePressure(
  planform: Planform,
  section: SymmetricSection,
  mach: number,
  x: number,
  y: number,
  eta = DEFAULT_RESOLUTION.eta,
): number {
  return -2 * perturbationU(geometry(planform, section), betaOf(mach), x, y, eta);
}
