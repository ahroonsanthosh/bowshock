/**
 * What the 3D view draws of a flow, built on the CPU from the meridional
 * field (src/render3d/field.ts) for the GPU: iso-lines to revolve into
 * shells, the fitted shock's line, streamlines, the slices' triangles,
 * all in the meridional plane (x, r) unless said otherwise.
 */

import { isoLines, niceLevels, simplifyLine, type IsoLine } from './contours';
import { dualMesh, fieldBounds, quadVertices, type DualMesh, type MeridionalField } from './field';
import {
  dualValues,
  quantityRange,
  quantityScale,
  type Quantity,
  type ColourRange,
  type QuantityScale,
  type Units,
} from './quantities';
import { refineMesh } from './resample';
import { seedRadii, traceStreamline, type Streamline } from './streamlines';

export interface FlowGeometry {
  readonly mesh: DualMesh;
  readonly scale: QuantityScale;
  /** Colour range of the quantity. */
  readonly range: ColourRange;
  /** The quantity at the dual mesh's vertices. */
  readonly values: Float64Array;
  readonly levels: number[];
  readonly isoLines: IsoLine[];
  /** The fitted shock: the dual mesh's outer row, with the values behind it. */
  readonly shock: { x: number[]; r: number[]; value: number[] };
  readonly streamlines: Streamline[];
  /** Extent of the computed region. */
  readonly bounds: { xMin: number; xMax: number; rMax: number };
}

export interface FlowGeometryOptions {
  readonly quantity: Quantity;
  readonly units?: Units | undefined;
  /** Iso-surfaces wanted (about; at round levels). */
  readonly isoCount?: number;
  /** Streamlines per meridional plane. */
  readonly streamlineCount?: number;
  /** Where nothing is drawn beyond (the rocket's base), if before the field's end. */
  readonly xEnd?: number | undefined;
  /** A quicker build for live frames on a slow adapter: coarser resampling and tracing. */
  readonly draft?: boolean | undefined;
}

export function flowGeometry(field: MeridionalField, options: FlowGeometryOptions): FlowGeometry {
  const mesh = dualMesh(field);
  const scale = quantityScale(field, options.quantity, options.units);
  const values = dualValues(mesh, scale);
  const range = quantityRange(field, scale);
  // Levels inside both the colour range and the cells' own values (the
  // free stream's value can widen the colour range, but no surface lies
  // outside the cells' values).
  const lo = Math.max(range.min, range.cellMin);
  const hi = Math.min(range.max, range.cellMax);
  const levels = niceLevels(lo, hi, options.isoCount ?? 7);
  // On a finer, smooth resampling (./resample.ts): about 800 columns.
  const k = Math.min(
    Math.max(Math.round((options.draft === true ? 300 : 800) / (mesh.ni + 1)), 1),
    6,
  );
  const fine = refineMesh(mesh, values, k);
  const bounds0 = fieldBounds(field);
  const tolerance = 2e-4 * Math.hypot(bounds0.xMax - bounds0.xMin, bounds0.rMax);
  const lines = levels.flatMap((level) =>
    isoLines(fine.grid, fine.values, level).map((l) => simplifyLine(l, tolerance)),
  );
  const NI = mesh.ni + 2;
  const top = (mesh.nj + 1) * NI;
  const shock = { x: [] as number[], r: [] as number[], value: [] as number[] };
  for (let I = 0; I <= mesh.ni + 1; I++) {
    shock.x.push(mesh.x[top + I]!);
    shock.r.push(mesh.r[top + I]!);
    shock.value.push(values[top + I]!);
  }
  const bounds = fieldBounds(field);
  const xEnd = Math.min(options.xEnd ?? bounds.xMax, bounds.xMax);
  // Seeds from near the axis to the shock's radius at the end drawn, so
  // that every streamline seeded meets the shock and is traced through the
  // computed flow.
  const rShockEnd = shockRadiusAt(shock, xEnd);
  const count = options.streamlineCount ?? 14;
  const inner = Math.max(0.02 * rShockEnd, mesh.r[(mesh.nj + 1) * NI]! * 1.5);
  const radii = seedRadii(inner, 0.97 * rShockEnd, count);
  // Each seeded a little ahead of where it meets the shock (a fifth of
  // the region's length), in the free stream.
  const lead = 0.2 * (xEnd - bounds.xMin);
  const streamlines = radii.map((r0) =>
    traceStreamline(mesh, r0, {
      xUpstream: bounds.xMin,
      upstreamLength: lead,
      maxCellStep: options.draft === true ? 0.5 : 0.25,
      values,
      freeValue: scale.freeValue,
    }),
  );
  return {
    mesh,
    scale,
    range,
    values,
    levels,
    isoLines: lines,
    shock,
    streamlines,
    bounds: { ...bounds, xMax: xEnd },
  };
}

/** The shock's radius at x (its line's, by linear interpolation; its last radius beyond). */
export function shockRadiusAt(shock: { x: number[]; r: number[] }, x: number): number {
  for (let k = 1; k < shock.x.length; k++) {
    if (shock.x[k]! >= x) {
      const f = (x - shock.x[k - 1]!) / (shock.x[k]! - shock.x[k - 1]! || 1);
      return shock.r[k - 1]! + Math.min(Math.max(f, 0), 1) * (shock.r[k]! - shock.r[k - 1]!);
    }
  }
  return shock.r[shock.r.length - 1]!;
}

/** Floats per point of revolve.wgsl: (x, r, nx, nr), then (value, length along its line, 0, 0). */
export const POINT_FLOATS = 8;

/**
 * Lines of the meridional plane to revolve (revolve.wgsl): their points,
 * each with its unit normal in the plane and its value, and the first
 * point of each segment (the next point is its other end). Each point is
 * turned to every azimuth once and shared by the quads on either side.
 */
export interface RevolvedLines {
  /** POINT_FLOATS per point. */
  readonly points: Float32Array<ArrayBuffer>;
  /** The first point of each segment. */
  readonly segments: Uint32Array<ArrayBuffer>;
}

/**
 * Polylines (x, r, their normals and values) for revolve.wgsl, cut at
 * x = xEnd (the base: nothing of the flow is drawn beyond it), so that the
 * surfaces need no test per pixel.
 */
export function revolvedLines(
  lines: readonly {
    readonly x: readonly number[];
    readonly r: readonly number[];
    readonly nx: readonly number[];
    readonly nr: readonly number[];
    readonly value: readonly number[];
  }[],
  xEnd = Infinity,
): RevolvedLines {
  const points: number[] = [];
  const segments: number[] = [];
  for (const l of lines) {
    // Each point with its length along the line from its start.
    const along: number[] = [0];
    for (let k = 1; k < l.x.length; k++) {
      along.push(along[k - 1]! + Math.hypot(l.x[k]! - l.x[k - 1]!, l.r[k]! - l.r[k - 1]!));
    }
    const at = (k: number) => [l.x[k]!, l.r[k]!, l.nx[k]!, l.nr[k]!, l.value[k]!, along[k]!];
    // A piece of the line on the near side of xEnd, as it is walked.
    let open = false;
    const add = (q: number[]) => {
      if (open) segments.push(points.length / POINT_FLOATS - 1);
      points.push(q[0]!, q[1]!, q[2]!, q[3]!, q[4]!, q[5]!, 0, 0);
      open = true;
    };
    for (let k = 0; k < l.x.length; k++) {
      const q = at(k);
      const inside = q[0]! <= xEnd;
      if (k > 0) {
        const p = at(k - 1);
        const was = p[0]! <= xEnd;
        if (was !== inside) {
          const f = (xEnd - p[0]!) / (q[0]! - p[0]!);
          const cut = p.map((v, i) => v + f * (q[i]! - v));
          cut[0] = xEnd;
          add(cut);
          if (!inside) open = false;
        }
      }
      if (inside) add(q);
    }
  }
  return { points: new Float32Array(points), segments: new Uint32Array(segments) };
}

/** Iso-lines for revolve.wgsl, each at its level, cut at x = xEnd. */
export function shellSegments(
  lines: readonly IsoLine[],
  valueOf: (line: IsoLine) => number,
  xEnd = Infinity,
): RevolvedLines {
  return revolvedLines(
    lines.map((l) => ({ ...l, value: l.x.map(() => valueOf(l)) })),
    xEnd,
  );
}

/** The shock's line for revolve.wgsl, with its normals and the values behind it, cut at x = xEnd. */
export function shockSegments(
  shock: {
    x: number[];
    r: number[];
    value: number[];
  },
  xEnd = Infinity,
): RevolvedLines {
  const n = shock.x.length;
  const nx: number[] = [];
  const nr: number[] = [];
  for (let k = 0; k < n; k++) {
    const a = Math.max(k - 1, 0);
    const b = Math.min(k + 1, n - 1);
    const dx = shock.x[b]! - shock.x[a]!;
    const dr = shock.r[b]! - shock.r[a]!;
    const len = Math.hypot(dx, dr) || 1;
    nx.push(-dr / len);
    nr.push(dx / len);
  }
  return revolvedLines([{ ...shock, nx, nr }], xEnd);
}

/**
 * The triangles of revolved lines at `sectors` azimuths (point p at sector
 * s is vertex p * (sectors + 1) + s): two per segment and sector.
 */
export function revolvedIndices(
  segments: Uint32Array<ArrayBuffer>,
  sectors: number,
): Uint32Array<ArrayBuffer> {
  const s1 = sectors + 1;
  const out = new Uint32Array(6 * segments.length * sectors);
  let o = 0;
  for (const p of segments) {
    const a = p * s1;
    const b = (p + 1) * s1;
    for (let s = 0; s < sectors; s++) {
      out[o++] = a + s;
      out[o++] = b + s;
      out[o++] = b + s + 1;
      out[o++] = a + s;
      out[o++] = b + s + 1;
      out[o++] = a + s + 1;
    }
  }
  return out;
}

/** Floats per segment of ribbon.wgsl: (x, y, z, value) at each end, then each end's brightness. */
export const LINE_FLOATS = 12;

/**
 * Polylines (x, r, value, and optionally a brightness per point, else 1)
 * as segments for ribbon.wgsl, in the plane z = 0 (turned by azimuth there).
 */
export function meridionalLineSegments(
  lines: readonly {
    x: readonly number[];
    r: readonly number[];
    value: readonly number[];
    brightness?: readonly number[];
  }[],
): Float32Array<ArrayBuffer> {
  const count = lines.reduce((s, l) => s + Math.max(l.x.length - 1, 0), 0);
  const data = new Float32Array(LINE_FLOATS * count);
  let o = 0;
  for (const l of lines) {
    for (let k = 0; k + 1 < l.x.length; k++) {
      const b0 = l.brightness?.[k] ?? 1;
      const b1 = l.brightness?.[k + 1] ?? 1;
      data.set(
        [
          l.x[k]!,
          l.r[k]!,
          0,
          l.value[k]!,
          l.x[k + 1]!,
          l.r[k + 1]!,
          0,
          l.value[k + 1]!,
          b0,
          b1,
          0,
          0,
        ],
        o,
      );
      o += LINE_FLOATS;
    }
  }
  return data;
}

/** 3D segments (each end x, y, z) for ribbon.wgsl, with value 0 and brightness 1. */
export function segments3d(
  pairs: readonly (readonly [readonly number[], readonly number[]])[],
): Float32Array<ArrayBuffer> {
  const data = new Float32Array(LINE_FLOATS * pairs.length);
  pairs.forEach(([a, b], k) => {
    data.set([a[0]!, a[1]!, a[2]!, 0, b[0]!, b[1]!, b[2]!, 0, 1, 1, 0, 0], LINE_FLOATS * k);
  });
  return data;
}

/** The edges of the box [xMin, xMax] x [-h, h] x [-h, h]. */
export function boxEdges(xMin: number, xMax: number, h: number): Float32Array<ArrayBuffer> {
  const c = (i: number) => [i & 1 ? xMax : xMin, i & 2 ? h : -h, i & 4 ? h : -h];
  const pairs: [number[], number[]][] = [];
  for (let i = 0; i < 8; i++) {
    for (const bit of [1, 2, 4]) {
      if (!(i & bit)) pairs.push([c(i), c(i | bit)]);
    }
  }
  return segments3d(pairs);
}

/**
 * The meridional field as triangles (x, y, z, value) in the half-plane at
 * azimuth phi: two per dual quad.
 */
export function meridionalSliceTriangles(
  mesh: DualMesh,
  values: ArrayLike<number>,
  phis: readonly number[],
): Float32Array<ArrayBuffer> {
  const quads = (mesh.ni + 1) * (mesh.nj + 1);
  const data = new Float32Array(phis.length * quads * 6 * 4);
  let o = 0;
  for (const phi of phis) {
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const put = (k: number) => {
      data[o++] = mesh.x[k]!;
      data[o++] = mesh.r[k]! * c;
      data[o++] = mesh.r[k]! * s;
      data[o++] = values[k]!;
    };
    for (let J = 0; J <= mesh.nj; J++) {
      for (let I = 0; I <= mesh.ni; I++) {
        const [a, b, cc, d] = quadVertices(mesh, I, J);
        put(a);
        put(b);
        put(cc);
        put(a);
        put(cc);
        put(d);
      }
    }
  }
  return data;
}

/**
 * The field across the axis at x: the values along the radius, from the
 * wall to the shock, sampled on the dual mesh's column through x, as a
 * disc of rings (x, y, z, value), `sectors` round.
 */
export function crossSliceTriangles(
  mesh: DualMesh,
  values: ArrayLike<number>,
  x: number,
  sectors: number,
): Float32Array<ArrayBuffer> {
  const NI = mesh.ni + 2;
  // The column of dual quads whose wall edge spans x.
  let I = -1;
  for (let k = 0; k <= mesh.ni; k++) {
    if (mesh.x[k]! <= x && mesh.x[k + 1]! >= x) {
      I = k;
      break;
    }
  }
  if (I < 0) return new Float32Array(0);
  // Radii and values where each row of the column meets x (lines of
  // constant J, linear between the column's two vertices).
  const ring: { r: number; v: number }[] = [];
  for (let J = 0; J <= mesh.nj + 1; J++) {
    const a = I + J * NI;
    const b = a + 1;
    const dx = mesh.x[b]! - mesh.x[a]!;
    const f = dx !== 0 ? Math.min(Math.max((x - mesh.x[a]!) / dx, 0), 1) : 0;
    ring.push({
      r: mesh.r[a]! + f * (mesh.r[b]! - mesh.r[a]!),
      v: values[a]! + f * (values[b]! - values[a]!),
    });
  }
  const data = new Float32Array((ring.length - 1) * sectors * 6 * 4);
  let o = 0;
  const put = (r: number, phi: number, v: number) => {
    data[o++] = x;
    data[o++] = r * Math.cos(phi);
    data[o++] = r * Math.sin(phi);
    data[o++] = v;
  };
  for (let k = 0; k + 1 < ring.length; k++) {
    const p = ring[k]!;
    const q = ring[k + 1]!;
    for (let s = 0; s < sectors; s++) {
      const a0 = (2 * Math.PI * s) / sectors;
      const a1 = (2 * Math.PI * (s + 1)) / sectors;
      put(p.r, a0, p.v);
      put(q.r, a0, q.v);
      put(q.r, a1, q.v);
      put(p.r, a0, p.v);
      put(q.r, a1, q.v);
      put(p.r, a1, p.v);
    }
  }
  return data;
}

/** The field's edge in the half-plane at phi (the wall, the shock, the inflow and outflow planes). */
export function meridionalOutline(mesh: DualMesh): { x: number[]; r: number[] } {
  const NI = mesh.ni + 2;
  const x: number[] = [];
  const r: number[] = [];
  const add = (k: number) => {
    x.push(mesh.x[k]!);
    r.push(mesh.r[k]!);
  };
  for (let I = 0; I <= mesh.ni + 1; I++) add(I);
  for (let J = 1; J <= mesh.nj + 1; J++) add(mesh.ni + 1 + J * NI);
  for (let I = mesh.ni; I >= 0; I--) add(I + (mesh.nj + 1) * NI);
  for (let J = mesh.nj; J >= 0; J--) add(J * NI);
  return { x, r };
}
