/**
 * The computed field as images in the meridional plane, for the textured
 * cut faces, the fibres along the flow (line integral convolution) and the
 * numerical schlieren (src/render3d/shaders/field-image.wgsl): the dual
 * mesh's vertices with what the GPU interpolates across each quad, and the
 * body's surface pressure for its colour. Everything here is the solver's
 * own field; the only thing not computed is the noise that the fibres'
 * texture is made from, which carries the direction and nothing else.
 */

import type { DualMesh, MeridionalField } from './field';

/** Floats per vertex of the field's image: clip x, y; velocity u, v (over the free stream's speed); value; schlieren. */
export const IMAGE_VERTEX_FLOATS = 6;

/** The box the image spans: x from xMin to xMax, r from 0 to rMax. */
export interface ImageBox {
  readonly xMin: number;
  readonly xMax: number;
  readonly rMax: number;
}

/** The schlieren's scale: log10 of |grad rho| D / rho_inf, its range shown from dark to light. */
export interface SchlierenScale {
  readonly lo: number;
  readonly hi: number;
}

export interface FieldImageMesh {
  readonly vertices: Float32Array<ArrayBuffer>;
  readonly indices: Uint32Array<ArrayBuffer>;
  readonly schlieren: SchlierenScale;
}

/**
 * The density gradient's magnitude at each dual vertex, |grad rho| times
 * `length` over the free stream's density: central differences in the
 * grid's index directions (one-sided at its edges), turned to x and r by
 * the grid's own metric.
 */
export function densityGradient(
  mesh: DualMesh,
  field: MeridionalField,
  length: number,
): Float64Array {
  const NI = mesh.ni + 2;
  const NJ = mesh.nj + 2;
  const rho = (k: number) => field.rho[mesh.cell[k]!]!;
  const out = new Float64Array(NI * NJ);
  const scale = length / field.freeStream.rho;
  for (let J = 0; J < NJ; J++) {
    for (let I = 0; I < NI; I++) {
      const i0 = Math.max(I - 1, 0);
      const i1 = Math.min(I + 1, NI - 1);
      const j0 = Math.max(J - 1, 0);
      const j1 = Math.min(J + 1, NJ - 1);
      const a = i0 + J * NI;
      const b = i1 + J * NI;
      const c = I + j0 * NI;
      const d = I + j1 * NI;
      const xXi = mesh.x[b]! - mesh.x[a]!;
      const rXi = mesh.r[b]! - mesh.r[a]!;
      const pXi = rho(b) - rho(a);
      const xEta = mesh.x[d]! - mesh.x[c]!;
      const rEta = mesh.r[d]! - mesh.r[c]!;
      const pEta = rho(d) - rho(c);
      const jac = xXi * rEta - xEta * rXi;
      if (!(Math.abs(jac) > 0)) continue;
      const px = (pXi * rEta - pEta * rXi) / jac;
      const pr = (xXi * pEta - xEta * pXi) / jac;
      out[I + J * NI] = Math.hypot(px, pr) * scale;
    }
  }
  return out;
}

/**
 * The dual mesh as triangles in the image's clip space (x across, r up),
 * each vertex with the velocity, the value shown and the schlieren's
 * brightness (log10 of the density gradient, from the 5th to the 99.5th
 * percentile of the vertices' values, 0 to 1).
 */
export function fieldImageMesh(
  mesh: DualMesh,
  field: MeridionalField,
  values: ArrayLike<number>,
  box: ImageBox,
  length: number,
): FieldImageMesh {
  const NI = mesh.ni + 2;
  const NJ = mesh.nj + 2;
  const f = field.freeStream;
  const speed = Math.hypot(f.u, f.v) || 1;
  const grad = densityGradient(mesh, field, length);
  const logs = Array.from(grad, (g) => Math.log10(Math.max(g, 1e-12)));
  const sorted = logs.filter((v) => v > -11).sort((p, q) => p - q);
  const lo = sorted.length > 0 ? sorted[Math.floor(0.05 * (sorted.length - 1))]! : -3;
  // The top: the 99.5th percentile, so that a corner's few vertices do not take the scale.
  const hi0 = sorted.length > 0 ? sorted[Math.floor(0.995 * (sorted.length - 1))]! : 0;
  const hi = hi0 > lo ? hi0 : lo + 1;
  const vertices = new Float32Array(NI * NJ * IMAGE_VERTEX_FLOATS);
  for (let k = 0; k < NI * NJ; k++) {
    const o = k * IMAGE_VERTEX_FLOATS;
    vertices[o] = (2 * (mesh.x[k]! - box.xMin)) / (box.xMax - box.xMin) - 1;
    vertices[o + 1] = (2 * mesh.r[k]!) / box.rMax - 1;
    vertices[o + 2] = mesh.u[k]! / speed;
    vertices[o + 3] = mesh.v[k]! / speed;
    vertices[o + 4] = values[k]!;
    vertices[o + 5] = Math.min(Math.max((logs[k]! - lo) / (hi - lo), 0), 1);
  }
  const indices = new Uint32Array((NI - 1) * (NJ - 1) * 6);
  let q = 0;
  for (let J = 0; J + 1 < NJ; J++) {
    for (let I = 0; I + 1 < NI; I++) {
      const a = I + J * NI;
      indices.set([a, a + 1, a + 1 + NI, a, a + 1 + NI, a + NI], q);
      q += 6;
    }
  }
  return { vertices, indices, schlieren: { lo, hi } };
}

/**
 * The pressure coefficient on the body's wall, as the solver has it (the
 * cells next to the wall), at `count` points evenly spaced from x = 0 to
 * x = length; ahead of the first cell, the first cell's; past the last
 * cell's centre to the field's end, the last's; beyond the field's end
 * (a field that stops before the base), NaN: not computed there.
 */
export function wallPressure(
  field: MeridionalField,
  length: number,
  count: number,
): { cp: Float64Array; min: number; max: number } {
  const { ni } = field;
  const f = field.freeStream;
  const q = 0.5 * f.rho * (f.u * f.u + f.v * f.v);
  const xs: number[] = [];
  const cps: number[] = [];
  for (let i = 0; i < ni; i++) {
    xs.push(0.5 * (field.x[i]! + field.x[i + 1]!));
    cps.push((field.p[i]! - f.p) / q);
  }
  const cp = new Float64Array(count);
  let k = 0;
  for (let n = 0; n < count; n++) {
    const x = (length * n) / Math.max(count - 1, 1);
    if (x > field.x[ni]! + 1e-9 * length) {
      cp[n] = NaN;
      continue;
    }
    while (k + 1 < xs.length && xs[k + 1]! < x) k++;
    if (x <= xs[0]!) cp[n] = cps[0]!;
    else if (k + 1 >= xs.length) cp[n] = cps[cps.length - 1]!;
    else {
      const t = (x - xs[k]!) / (xs[k + 1]! - xs[k]! || 1);
      cp[n] = cps[k]! + Math.min(Math.max(t, 0), 1) * (cps[k + 1]! - cps[k]!);
    }
  }
  return { cp, min: Math.min(...cps), max: Math.max(...cps) };
}

/**
 * White noise, `size` square, smeared along its second axis over `length`
 * texels (a box, wrapping): streaks to lay along the meridians of a sheet,
 * the direction of the flow on it (the flow has no swirl). A carrier for
 * direction only: it is not part of the solution.
 */
export function streakNoise(size: number, length: number, seed = 1): Uint8Array<ArrayBuffer> {
  const white = whiteNoise(size * size, seed);
  const out = new Uint8Array(size * size);
  for (let i = 0; i < size; i++) {
    let sum = 0;
    for (let k = 0; k < length; k++) sum += white[i + k * size]!;
    for (let j = 0; j < size; j++) {
      const mean = sum / length;
      // Contrast stretched back towards the white noise's (a box of n samples has 1/sqrt(n) of it).
      const v = 0.5 + (mean / 255 - 0.5) * Math.sqrt(length) * 0.9;
      out[i + j * size] = Math.round(255 * Math.min(Math.max(v, 0), 1));
      sum += white[i + ((j + length) % size) * size]! - white[i + j * size]!;
    }
  }
  return out;
}

/** `count` bytes of white noise from a small deterministic generator (the same every time). */
export function whiteNoise(count: number, seed = 1): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(count);
  let s = seed >>> 0 || 1;
  for (let k = 0; k < count; k++) {
    // xorshift32
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    out[k] = s & 255;
  }
  return out;
}
