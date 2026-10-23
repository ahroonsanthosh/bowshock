/**
 * Streamlines of the solved flow. At zero incidence the flow has no swirl,
 * so a streamline stays in the meridional plane it starts in: it is traced
 * once in that plane and the same curve, turned about the axis, is the
 * streamline at every azimuth (exactly, not an approximation).
 *
 * A streamline starts upstream in the undisturbed free stream (exact
 * there: the flow ahead of the bow shock is the free stream), runs
 * straight at its radius to the fitted shock, and from there is traced
 * through the computed field to the outflow plane at the base. Inside,
 * it is integrated in the dual mesh's own coordinates (xi, eta) =
 * (I + s, J + t) (src/render3d/field.ts), where the region is the
 * rectangle [0, ni + 1] x [0, nj + 1]: the step follows the interpolated
 * velocity, mapped through the inverse of the bilinear map, by the
 * midpoint rule, at most a quarter of a dual cell per step. The tracer
 * cannot leave the computed region: it stops at the outflow (or inflow)
 * plane, and at the wall or the shock (which the flow does not cross: it
 * is tangent to the wall, and passes the shock inwards) it is held on
 * the boundary.
 */

import { quadVertices, type DualMesh } from './field';

/** A streamline in the meridional plane, with the values along it. */
export interface Streamline {
  /** Upstream radius it starts at. */
  readonly seedRadius: number;
  readonly x: number[];
  readonly r: number[];
  /** Per point: interpolated values of the drawn quantity (one per dual vertex). */
  readonly value: number[];
  /** Per point: true where the point lies in the computed region (false in the free stream). */
  readonly computed: boolean[];
}

export interface TraceOptions {
  /** Where the streamlines start, upstream of the body, at the furthest. */
  readonly xUpstream: number;
  /** If given, each starts this far ahead of where it meets the shock (but not before xUpstream). */
  readonly upstreamLength?: number;
  /** The quantity drawn along the line, one value per dual vertex. */
  readonly values: ArrayLike<number>;
  /** Its value in the free stream. */
  readonly freeValue: number;
  /** Largest step in dual cells (default 0.25). */
  readonly maxCellStep?: number;
  /** Most steps inside (default 20 000). */
  readonly maxSteps?: number;
}

/**
 * Position, Jacobian and interpolation weights at computational
 * coordinates (xi, eta), in dual quad (I, J) (by default the one holding
 * the point; a point on a quad's edge belongs to both quads).
 */
function evaluate(mesh: DualMesh, xi: number, eta: number, quad?: { I: number; J: number }) {
  const I = quad?.I ?? Math.min(Math.max(Math.floor(xi), 0), mesh.ni);
  const J = quad?.J ?? Math.min(Math.max(Math.floor(eta), 0), mesh.nj);
  const s = xi - I;
  const t = eta - J;
  const [a, b, c, d] = quadVertices(mesh, I, J);
  const X = mesh.x;
  const R = mesh.r;
  const w = [(1 - s) * (1 - t), s * (1 - t), s * t, (1 - s) * t] as const;
  const k = [a, b, c, d] as const;
  let x = 0;
  let r = 0;
  let u = 0;
  let v = 0;
  for (let n = 0; n < 4; n++) {
    x += w[n]! * X[k[n]!]!;
    r += w[n]! * R[k[n]!]!;
    u += w[n]! * mesh.u[k[n]!]!;
    v += w[n]! * mesh.v[k[n]!]!;
  }
  const xs = (1 - t) * (X[b]! - X[a]!) + t * (X[c]! - X[d]!);
  const rs = (1 - t) * (R[b]! - R[a]!) + t * (R[c]! - R[d]!);
  const xt = (1 - s) * (X[d]! - X[a]!) + s * (X[c]! - X[b]!);
  const rt = (1 - s) * (R[d]! - R[a]!) + s * (R[c]! - R[b]!);
  return { x, r, u, v, xs, rs, xt, rt, k, w };
}

/**
 * The direction of the flow in computational coordinates, per unit length
 * travelled, in dual quad `quad` (by default the one holding the point).
 */
function direction(
  mesh: DualMesh,
  xi: number,
  eta: number,
  quad?: { I: number; J: number },
): [number, number] {
  const e = evaluate(mesh, xi, eta, quad);
  const speed = Math.hypot(e.u, e.v);
  if (speed === 0) return [0, 0];
  const det = e.xs * e.rt - e.xt * e.rs;
  const ux = e.u / speed;
  const vr = e.v / speed;
  return [(ux * e.rt - vr * e.xt) / det, (e.xs * vr - e.rs * ux) / det];
}

function valueAt(mesh: DualMesh, values: ArrayLike<number>, xi: number, eta: number): number {
  const e = evaluate(mesh, xi, eta);
  let q = 0;
  for (let n = 0; n < 4; n++) q += e.w[n]! * values[e.k[n]!]!;
  return q;
}

/** Position (x, r) at computational coordinates. */
export function positionAt(mesh: DualMesh, xi: number, eta: number): [number, number] {
  const e = evaluate(mesh, xi, eta);
  return [e.x, e.r];
}

/**
 * Where a free-stream line at radius r0 first meets the shock (the dual
 * mesh's row J = nj + 1, walked from I = 0): its xi, or null if it never
 * does.
 */
export function shockEntry(mesh: DualMesh, r0: number): number | null {
  const NI = mesh.ni + 2;
  const row = (mesh.nj + 1) * NI;
  for (let I = 0; I <= mesh.ni; I++) {
    const ra = mesh.r[row + I]!;
    const rb = mesh.r[row + I + 1]!;
    if ((ra - r0) * (rb - r0) <= 0 && ra !== rb) return I + (r0 - ra) / (rb - ra);
  }
  return null;
}

/** The streamline that starts upstream at radius r0. */
export function traceStreamline(mesh: DualMesh, r0: number, options: TraceOptions): Streamline {
  const { values, freeValue, xUpstream } = options;
  const maxCellStep = options.maxCellStep ?? 0.25;
  const maxSteps = options.maxSteps ?? 20_000;
  const NI = mesh.ni + 2;
  const xiEnd = mesh.ni + 1;
  const etaTop = mesh.nj + 1;
  const line: Streamline = { seedRadius: r0, x: [], r: [], value: [], computed: [] };
  const push = (x: number, r: number, value: number, computed: boolean) => {
    line.x.push(x);
    line.r.push(r);
    line.value.push(value);
    line.computed.push(computed);
  };
  const start = (xEntry: number) =>
    options.upstreamLength === undefined
      ? xUpstream
      : Math.max(xUpstream, xEntry - options.upstreamLength);
  // Where the inflow plane (I = 0) holds r0 below the shock (a sharp tip's
  // starting plane), the line enters there; else through the shock.
  let xi: number;
  let eta: number;
  const rInflowTop = mesh.r[(mesh.nj + 1) * NI]!;
  const rInflowBottom = mesh.r[0]!;
  if (r0 > rInflowBottom && r0 < rInflowTop) {
    push(start(mesh.x[0]!), r0, freeValue, false);
    xi = 0;
    let J = 0;
    while (J < mesh.nj && mesh.r[(J + 1) * NI]! < r0) J++;
    const ra = mesh.r[J * NI]!;
    const rb = mesh.r[(J + 1) * NI]!;
    eta = J + (r0 - ra) / (rb - ra);
  } else {
    const entry = shockEntry(mesh, r0);
    if (entry === null) {
      // Never meets the shock: the free stream all the way to the outflow plane.
      const xEnd = mesh.x[mesh.ni + 1 + (mesh.nj + 1) * NI]!;
      push(xUpstream, r0, freeValue, false);
      push(xEnd, r0, freeValue, false);
      return line;
    }
    push(start(positionAt(mesh, entry, etaTop)[0]), r0, freeValue, false);
    xi = entry;
    eta = etaTop;
  }
  let [x, r] = positionAt(mesh, xi, eta);
  // The free stream up to the shock, then the computed flow from it.
  push(x, r, freeValue, false);
  push(x, r, valueAt(mesh, values, xi, eta), true);
  // Each step stays inside one dual quad, ending on its edge if it would
  // leave it: the bilinear map's Jacobian changes from quad to quad, and a
  // step across an edge would follow neither quad's velocity.
  const quadAhead = (v: number, d: number, top: number) =>
    Math.min(Math.max(d >= 0 ? Math.floor(v) : Math.ceil(v) - 1, 0), top);
  // On the wall or the shock, a direction out of the region is turned along it.
  const along = (eta0: number, d: [number, number]): [number, number] => [
    d[0],
    (eta0 <= 0 && d[1] < 0) || (eta0 >= etaTop && d[1] > 0) ? 0 : d[1],
  ];
  const exitTime = (v: number, d: number, lo: number, hi: number) =>
    d > 0 ? (hi - v) / d : d < 0 ? (lo - v) / d : Infinity;
  for (let step = 0; step < maxSteps; step++) {
    let d1 = along(eta, direction(mesh, xi, eta));
    const quad = { I: quadAhead(xi, d1[0], mesh.ni), J: quadAhead(eta, d1[1], mesh.nj) };
    d1 = along(eta, direction(mesh, xi, eta, quad));
    const size1 = Math.max(Math.abs(d1[0]), Math.abs(d1[1]));
    if (size1 === 0) break;
    const box = (d: [number, number]) =>
      Math.min(exitTime(xi, d[0], quad.I, quad.I + 1), exitTime(eta, d[1], quad.J, quad.J + 1));
    const h1 = Math.min(maxCellStep / size1, box(d1));
    const d2 = along(eta, direction(mesh, xi + 0.5 * h1 * d1[0], eta + 0.5 * h1 * d1[1], quad));
    const exit = box(d2);
    const h = Math.min(h1, exit);
    let nextXi = xi + h * d2[0];
    let nextEta = eta + h * d2[1];
    if (h === exit) {
      // Onto the quad's edge exactly.
      const tx = exitTime(xi, d2[0], quad.I, quad.I + 1);
      if (tx === exit) nextXi = d2[0] > 0 ? quad.I + 1 : quad.I;
      else nextEta = d2[1] > 0 ? quad.J + 1 : quad.J;
    }
    nextEta = Math.min(Math.max(nextEta, 0), etaTop);
    const done = nextXi >= xiEnd || nextXi <= 0 || h === 0;
    xi = Math.min(Math.max(nextXi, 0), xiEnd);
    eta = nextEta;
    [x, r] = positionAt(mesh, xi, eta);
    push(x, r, valueAt(mesh, values, xi, eta), true);
    if (done) break;
  }
  return line;
}

/**
 * Seed radii: `count` radii evenly spaced from `inner` to `outer` (both
 * included).
 */
export function seedRadii(inner: number, outer: number, count: number): number[] {
  if (count <= 1) return [inner];
  return Array.from({ length: count }, (_, k) => inner + ((outer - inner) * k) / (count - 1));
}
