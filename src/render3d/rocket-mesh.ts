/**
 * The rocket as a triangle mesh: the body (the nose's exact profile and
 * the cylinder, src/geometry, revolved about the axis, x along it from
 * the tip) closed by a flat base, and the fins as solid panels (their
 * planform, src/fins/planform.ts, and symmetric section,
 * src/fins/section.ts) evenly spaced around the body. Lengths are those
 * of the geometry (calibers on the pages); y and z span the cross-section,
 * azimuth phi measured from +y towards +z.
 */

import type { Planform } from '../fins/planform';
import type { SymmetricSection } from '../fins/section';
import { bodyLength, bodyRadius, type Body } from '../geometry/body';
import { noseRadius } from '../geometry/nose';

export interface FinSet {
  readonly count: number;
  readonly planform: Planform;
  /** Half-thickness over chord along the chord (constant along the span). */
  readonly section: SymmetricSection;
  /** Distance of the root trailing edge ahead of the base. */
  readonly trailingEdgeAheadOfBase: number;
  /** Azimuth of the first fin, radians (default 0: the first fin along +y). */
  readonly roll?: number;
}

export interface Rocket {
  readonly body: Body;
  readonly fins?: FinSet | undefined;
}

/** Triangles with per-vertex normals; `part` per vertex: 0 body, 1 fins, 2 base. */
export interface TriangleMesh {
  readonly positions: Float32Array<ArrayBuffer>;
  readonly normals: Float32Array<ArrayBuffer>;
  readonly parts: Float32Array<ArrayBuffer>;
  readonly indices: Uint32Array<ArrayBuffer>;
}

/**
 * The nose's profile sampled so that the chords between samples stay
 * within `tolerance` of the true curve (bisection, on the distance of the
 * curve's points at a quarter, half and three quarters of each interval
 * from its chord): x from the tip to the nose's base, r = noseRadius(x).
 */
export function noseProfile(body: Body, tolerance = 2e-5): { x: number[]; r: number[] } {
  const nose = body.nose;
  const L = nose.length;
  const f = (x: number) => noseRadius(nose, x);
  const xs: number[] = [0];
  const split = (a: number, b: number, depth: number) => {
    const ra = f(a);
    const rb = f(b);
    const len = Math.hypot(b - a, rb - ra);
    const off = (x: number) => Math.abs((b - a) * (f(x) - ra) - (rb - ra) * (x - a)) / len;
    const dev = Math.max(off(0.75 * a + 0.25 * b), off(0.5 * (a + b)), off(0.25 * a + 0.75 * b));
    if (depth < 24 && (dev > tolerance || depth < 4)) {
      const m = 0.5 * (a + b);
      split(a, m, depth + 1);
      split(m, b, depth + 1);
    } else {
      xs.push(b);
    }
  };
  split(0, L, 0);
  return { x: xs, r: xs.map(f) };
}

class MeshBuilder {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly parts: number[] = [];
  readonly indices: number[] = [];

  vertex(p: readonly number[], n: readonly number[], part: number): number {
    this.positions.push(p[0]!, p[1]!, p[2]!);
    const len = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    this.normals.push(n[0]! / len, n[1]! / len, n[2]! / len);
    this.parts.push(part);
    return this.positions.length / 3 - 1;
  }

  triangle(a: number, b: number, c: number): void {
    this.indices.push(a, b, c);
  }

  build(): TriangleMesh {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      parts: new Float32Array(this.parts),
      indices: new Uint32Array(this.indices),
    };
  }
}

/**
 * Revolve a profile (x, r) with per-point meridional normals (nx, nr)
 * through `sectors` sectors of the full turn, as quads between rings.
 */
function revolve(
  m: MeshBuilder,
  x: readonly number[],
  r: readonly number[],
  nx: readonly number[],
  nr: readonly number[],
  sectors: number,
  part: number,
): void {
  const rings: number[][] = [];
  for (let k = 0; k < x.length; k++) {
    const ring: number[] = [];
    for (let s = 0; s <= sectors; s++) {
      const phi = (2 * Math.PI * s) / sectors;
      const c = Math.cos(phi);
      const sn = Math.sin(phi);
      ring.push(m.vertex([x[k]!, r[k]! * c, r[k]! * sn], [nx[k]!, nr[k]! * c, nr[k]! * sn], part));
    }
    rings.push(ring);
  }
  for (let k = 0; k + 1 < rings.length; k++) {
    const a = rings[k]!;
    const b = rings[k + 1]!;
    for (let s = 0; s < sectors; s++) {
      m.triangle(a[s]!, b[s]!, b[s + 1]!);
      m.triangle(a[s]!, b[s + 1]!, a[s + 1]!);
    }
  }
}

/** The body: nose and cylinder revolved, and the flat base, in `sectors` sectors. */
export function bodyMesh(body: Body, sectors = 160): TriangleMesh {
  const m = new MeshBuilder();
  addBody(m, body, sectors);
  return m.build();
}

function addBody(m: MeshBuilder, body: Body, sectors: number): void {
  const R = body.nose.baseRadius;
  const end = bodyLength(body);
  const nose = noseProfile(body);
  // Normals of the nose from the chords either side of each sample.
  const nx: number[] = [];
  const nr: number[] = [];
  const n = nose.x.length;
  for (let k = 0; k < n; k++) {
    const a = Math.max(k - 1, 0);
    const b = Math.min(k + 1, n - 1);
    const dx = nose.x[b]! - nose.x[a]!;
    const dr = nose.r[b]! - nose.r[a]!;
    nx.push(-dr);
    nr.push(dx);
  }
  revolve(m, nose.x, nose.r, nx, nr, sectors, 0);
  if (body.cylinderLength > 0) {
    revolve(m, [body.nose.length, end], [R, R], [0, 0], [1, 1], sectors, 0);
  }
  // The flat base, facing downstream.
  const centre = m.vertex([end, 0, 0], [1, 0, 0], 2);
  const ring: number[] = [];
  for (let s = 0; s <= sectors; s++) {
    const phi = (2 * Math.PI * s) / sectors;
    ring.push(m.vertex([end, R * Math.cos(phi), R * Math.sin(phi)], [1, 0, 0], 2));
  }
  for (let s = 0; s < sectors; s++) m.triangle(centre, ring[s + 1]!, ring[s]!);
}

/** The outline of a fin's section at one span station: points (x along, t across). */
function sectionOutline(
  section: SymmetricSection,
  leadingEdge: number,
  chord: number,
): { upper: [number, number][]; lower: [number, number][] } {
  const upper = section.x.map((f, k): [number, number] => [
    leadingEdge + f * chord,
    section.halfThickness[k]! * chord,
  ]);
  const lower = upper.map(([x, t]): [number, number] => [x, -t]);
  return { upper, lower };
}

/**
 * The fins: each a solid panel from its root, sunk slightly into the body
 * so that no gap shows against the faceted surface, to its tip; faces
 * flat-shaded.
 */
export function finsMesh(body: Body, fins: FinSet): TriangleMesh {
  const m = new MeshBuilder();
  addFins(m, body, fins);
  return m.build();
}

/** Where fin k's root leading edge lies, its azimuth, and its root and tip radii. */
export function finPlacement(body: Body, fins: FinSet, k: number) {
  const p = fins.planform;
  const rootTrailing = bodyLength(body) - fins.trailingEdgeAheadOfBase;
  const rootLeading = rootTrailing - p.rootChord;
  const rootRadius = bodyRadius(body, rootLeading + 0.5 * p.rootChord);
  return {
    rootLeading,
    phi: (fins.roll ?? 0) + (2 * Math.PI * k) / fins.count,
    rootRadius,
    tipRadius: rootRadius + p.span,
  };
}

function addFins(m: MeshBuilder, body: Body, fins: FinSet): void {
  const p = fins.planform;
  const tipChord = p.rootChord + p.span * (p.tanTrailingEdge - p.tanLeadingEdge);
  for (let k = 0; k < fins.count; k++) {
    const place = finPlacement(body, fins, k);
    const sunk = 0.04 * place.rootRadius;
    const er = [0, Math.cos(place.phi), Math.sin(place.phi)];
    const et = [0, -Math.sin(place.phi), Math.cos(place.phi)];
    // A point of the fin: x along the body, radius r, offset t across.
    const at = (x: number, r: number, t: number) => [
      x,
      r * er[1]! + t * et[1]!,
      r * er[2]! + t * et[2]!,
    ];
    const stations = [
      {
        r: place.rootRadius - sunk,
        le: place.rootLeading - sunk * p.tanLeadingEdge,
        chord: p.rootChord - sunk * (p.tanTrailingEdge - p.tanLeadingEdge),
      },
      { r: place.tipRadius, le: place.rootLeading + p.span * p.tanLeadingEdge, chord: tipChord },
    ];
    const outlines = stations.map((s) => sectionOutline(fins.section, s.le, s.chord));
    // A flat quad (a, b, c, d) with its own normal.
    const quad = (a: number[], b: number[], c: number[], d: number[]) => {
      const u = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
      const v = [d[0]! - a[0]!, d[1]! - a[1]!, d[2]! - a[2]!];
      const n = [
        u[1]! * v[2]! - u[2]! * v[1]!,
        u[2]! * v[0]! - u[0]! * v[2]!,
        u[0]! * v[1]! - u[1]! * v[0]!,
      ];
      const ia = m.vertex(a, n, 1);
      const ib = m.vertex(b, n, 1);
      const ic = m.vertex(c, n, 1);
      const id = m.vertex(d, n, 1);
      m.triangle(ia, ib, ic);
      m.triangle(ia, ic, id);
    };
    const [root, tip] = outlines as [(typeof outlines)[0], (typeof outlines)[0]];
    const [s0, s1] = stations as [(typeof stations)[0], (typeof stations)[0]];
    const n = root.upper.length;
    for (let q = 0; q + 1 < n; q++) {
      // Upper surface (t > 0), then lower, each facing out.
      quad(
        at(root.upper[q]![0], s0.r, root.upper[q]![1]),
        at(tip.upper[q]![0], s1.r, tip.upper[q]![1]),
        at(tip.upper[q + 1]![0], s1.r, tip.upper[q + 1]![1]),
        at(root.upper[q + 1]![0], s0.r, root.upper[q + 1]![1]),
      );
      quad(
        at(root.lower[q]![0], s0.r, root.lower[q]![1]),
        at(root.lower[q + 1]![0], s0.r, root.lower[q + 1]![1]),
        at(tip.lower[q + 1]![0], s1.r, tip.lower[q + 1]![1]),
        at(tip.lower[q]![0], s1.r, tip.lower[q]![1]),
      );
    }
    if (fins.section.bluntTrailingEdge === true) {
      // The flat base of the trailing edge.
      quad(
        at(root.upper[n - 1]![0], s0.r, root.upper[n - 1]![1]),
        at(tip.upper[n - 1]![0], s1.r, tip.upper[n - 1]![1]),
        at(tip.lower[n - 1]![0], s1.r, tip.lower[n - 1]![1]),
        at(root.lower[n - 1]![0], s0.r, root.lower[n - 1]![1]),
      );
    }
    // The tip face: a fan over the section's outline.
    const outline = [...tip.upper, ...tip.lower.slice(0, n).reverse()];
    const tipIndices = outline.map(([x, t]) => m.vertex(at(x, s1.r, t), er, 1));
    for (let q = 1; q + 1 < tipIndices.length; q++) {
      m.triangle(tipIndices[0]!, tipIndices[q]!, tipIndices[q + 1]!);
    }
  }
}

/** The whole rocket. */
export function rocketMesh(rocket: Rocket, sectors = 160): TriangleMesh {
  const m = new MeshBuilder();
  addBody(m, rocket.body, sectors);
  if (rocket.fins !== undefined && rocket.fins.count > 0) addFins(m, rocket.body, rocket.fins);
  return m.build();
}
