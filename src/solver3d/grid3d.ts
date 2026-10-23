/**
 * Structured three-dimensional grid blocks and their metrics, for the 3D
 * Euler engine of docs/design/0021-3d-euler-fins.md (section 3.1).
 *
 * A block's nodes are given in a coordinate space (c0, c1, c2):
 * - 'cylindrical': (x, r, theta), x along the axis, r the radius, theta the
 *   angle; the physical point is (x, r cos theta, r sin theta);
 * - 'planar': Cartesian (x, y, z).
 * Index directions: i along c0, j along c1, k along c2 (right-handed in the
 * coordinate space, so that the i-face normals point to increasing i).
 *
 * Every face's area vector is computed by exact quadrature of the bilinear
 * face in the coordinate space (2 x 2 Gauss points; each integrand is a
 * polynomial of degree at most 2 in each face parameter): in cylindrical
 * blocks the physical area vector in the local basis (e_x, e_r, e_theta),
 *   S = (integral of r n_x dA, integral of r n_r dA, integral of n_theta dA),
 * and in planar blocks the integral of n dA. Each face is stored once and
 * shared by its two cells, so a closed cell's faces sum, to round-off, to
 * (0, V_coord, 0) in cylindrical blocks (the divergence theorem for the
 * fields (r, 0, 0), (0, r, 0) and (0, 0, 1)) and to zero in planar ones. The
 * radial pressure source is integrated over the sum of the r components, so
 * a uniform stream along x is kept to round-off on any grid (0021 3.1).
 */

export type Geometry3D = 'cylindrical' | 'planar';

export interface StructuredGrid3D {
  /** Cells in each direction. */
  readonly ni: number;
  readonly nj: number;
  readonly nk: number;
  /** Node coordinates, node (i, j, k) at i + (ni + 1) (j + (nj + 1) k). */
  readonly c0: Float64Array;
  readonly c1: Float64Array;
  readonly c2: Float64Array;
}

/** Area vectors of one family of faces, three components each, in the order of faceIndex. */
export interface FaceSet3D {
  readonly s0: Float64Array;
  readonly s1: Float64Array;
  readonly s2: Float64Array;
}

export interface GridMetrics3D {
  readonly ni: number;
  readonly nj: number;
  readonly nk: number;
  readonly geometry: Geometry3D;
  /** i-faces: (ni + 1) nj nk, face (i, j, k) between cells (i - 1, j, k) and (i, j, k). */
  readonly iFaces: FaceSet3D;
  /** j-faces: ni (nj + 1) nk. */
  readonly jFaces: FaceSet3D;
  /** k-faces: ni nj (nk + 1). */
  readonly kFaces: FaceSet3D;
  /** Physical volume: the integral of r over the coordinate volume (cylindrical), or the volume. */
  readonly volume: Float64Array;
  /** The volume the radial source is integrated over: the sum of the faces' r components (cylindrical; zero planar). */
  readonly sourceVolume: Float64Array;
  /** Coordinate-space centroid of each cell. */
  readonly centroid0: Float64Array;
  readonly centroid1: Float64Array;
  readonly centroid2: Float64Array;
}

export function nodeIndex3D(
  g: { readonly ni: number; readonly nj: number },
  i: number,
  j: number,
  k: number,
): number {
  return i + (g.ni + 1) * (j + (g.nj + 1) * k);
}

export function iFaceIndex(
  m: { readonly ni: number; readonly nj: number },
  i: number,
  j: number,
  k: number,
): number {
  return i + (m.ni + 1) * (j + m.nj * k);
}
export function jFaceIndex(
  m: { readonly ni: number; readonly nj: number },
  i: number,
  j: number,
  k: number,
): number {
  return i + m.ni * (j + (m.nj + 1) * k);
}
export function kFaceIndex(
  m: { readonly ni: number; readonly nj: number },
  i: number,
  j: number,
  k: number,
): number {
  return i + m.ni * (j + m.nj * k);
}
export function cellIndex3D(
  m: { readonly ni: number; readonly nj: number },
  i: number,
  j: number,
  k: number,
): number {
  return i + m.ni * (j + m.nj * k);
}

/** A grid from a node function (i, j, k) -> coordinates. */
export function gridFromFunction3D(
  ni: number,
  nj: number,
  nk: number,
  node: (i: number, j: number, k: number) => readonly [number, number, number],
): StructuredGrid3D {
  const n = (ni + 1) * (nj + 1) * (nk + 1);
  const c0 = new Float64Array(n);
  const c1 = new Float64Array(n);
  const c2 = new Float64Array(n);
  for (let k = 0; k <= nk; k++) {
    for (let j = 0; j <= nj; j++) {
      for (let i = 0; i <= ni; i++) {
        const p = node(i, j, k);
        const q = i + (ni + 1) * (j + (nj + 1) * k);
        c0[q] = p[0];
        c1[q] = p[1];
        c2[q] = p[2];
      }
    }
  }
  return { ni, nj, nk, c0, c1, c2 };
}

const G = [0.5 - 0.5 / Math.sqrt(3), 0.5 + 0.5 / Math.sqrt(3)] as const;

type Vec3 = [number, number, number];

/**
 * The area vector of the bilinear face with corners a (s = 0, t = 0), b (1, 0), c (1, 1), d (0, 1) in the
 * coordinate space, the normal X_s x X_t, weighted for cylindrical blocks (component 1 of each point is r).
 */
export function faceVector(a: Vec3, b: Vec3, c: Vec3, d: Vec3, geometry: Geometry3D): Vec3 {
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  for (const s of G) {
    for (const t of G) {
      // X(s, t) = (1-s)(1-t) a + s(1-t) b + s t c + (1-s) t d
      const xs: Vec3 = [0, 0, 0];
      const xt: Vec3 = [0, 0, 0];
      for (let q = 0; q < 3; q++) {
        xs[q] = (1 - t) * (b[q]! - a[q]!) + t * (c[q]! - d[q]!);
        xt[q] = (1 - s) * (d[q]! - a[q]!) + s * (c[q]! - b[q]!);
      }
      const r = (1 - s) * (1 - t) * a[1] + s * (1 - t) * b[1] + s * t * c[1] + (1 - s) * t * d[1];
      const n0 = xs[1] * xt[2] - xs[2] * xt[1];
      const n1 = xs[2] * xt[0] - xs[0] * xt[2];
      const n2 = xs[0] * xt[1] - xs[1] * xt[0];
      const w = geometry === 'cylindrical' ? r : 1;
      s0 += 0.25 * w * n0;
      s1 += 0.25 * w * n1;
      s2 += 0.25 * n2;
    }
  }
  return [s0, s1, s2];
}

/** Volume integrals of a trilinear cell (corners in the order of the unit cube's (i, j, k) bits): [V, int r dV, centroid]. */
function cellIntegrals(
  p: readonly Vec3[],
  geometry: Geometry3D,
): { coord: number; weighted: number; centroid: Vec3 } {
  let coord = 0;
  let weighted = 0;
  const m: Vec3 = [0, 0, 0];
  for (const u of G) {
    for (const v of G) {
      for (const w of G) {
        const sh = (bi: number, bj: number, bk: number) =>
          (bi ? u : 1 - u) * (bj ? v : 1 - v) * (bk ? w : 1 - w);
        const X: Vec3 = [0, 0, 0];
        const Xu: Vec3 = [0, 0, 0];
        const Xv: Vec3 = [0, 0, 0];
        const Xw: Vec3 = [0, 0, 0];
        for (let n = 0; n < 8; n++) {
          const bi = n & 1;
          const bj = (n >> 1) & 1;
          const bk = (n >> 2) & 1;
          const du = (bi ? 1 : -1) * (bj ? v : 1 - v) * (bk ? w : 1 - w);
          const dv = (bi ? u : 1 - u) * (bj ? 1 : -1) * (bk ? w : 1 - w);
          const dw = (bi ? u : 1 - u) * (bj ? v : 1 - v) * (bk ? 1 : -1);
          const s = sh(bi, bj, bk);
          for (let q = 0; q < 3; q++) {
            const c = p[n]![q]!;
            X[q] = X[q]! + s * c;
            Xu[q] = Xu[q]! + du * c;
            Xv[q] = Xv[q]! + dv * c;
            Xw[q] = Xw[q]! + dw * c;
          }
        }
        const J =
          Xu[0] * (Xv[1] * Xw[2] - Xv[2] * Xw[1]) -
          Xu[1] * (Xv[0] * Xw[2] - Xv[2] * Xw[0]) +
          Xu[2] * (Xv[0] * Xw[1] - Xv[1] * Xw[0]);
        coord += 0.125 * J;
        weighted += 0.125 * J * (geometry === 'cylindrical' ? X[1] : 1);
        for (let q = 0; q < 3; q++) m[q] = m[q]! + 0.125 * J * X[q]!;
      }
    }
  }
  return { coord, weighted, centroid: [m[0] / coord, m[1] / coord, m[2] / coord] };
}

export function computeMetrics3D(grid: StructuredGrid3D, geometry: Geometry3D): GridMetrics3D {
  const { ni, nj, nk, c0, c1, c2 } = grid;
  const P = (i: number, j: number, k: number): Vec3 => {
    const q = i + (ni + 1) * (j + (nj + 1) * k);
    return [c0[q]!, c1[q]!, c2[q]!];
  };
  const set = (n: number): FaceSet3D => ({
    s0: new Float64Array(n),
    s1: new Float64Array(n),
    s2: new Float64Array(n),
  });
  const iFaces = set((ni + 1) * nj * nk);
  const jFaces = set(ni * (nj + 1) * nk);
  const kFaces = set(ni * nj * (nk + 1));
  const store = (f: FaceSet3D, q: number, v: Vec3) => {
    f.s0[q] = v[0];
    f.s1[q] = v[1];
    f.s2[q] = v[2];
  };
  for (let k = 0; k < nk; k++)
    for (let j = 0; j < nj; j++)
      for (let i = 0; i <= ni; i++)
        // s along j, t along k: e_1 x e_2 = e_0.
        store(
          iFaces,
          i + (ni + 1) * (j + nj * k),
          faceVector(P(i, j, k), P(i, j + 1, k), P(i, j + 1, k + 1), P(i, j, k + 1), geometry),
        );
  for (let k = 0; k < nk; k++)
    for (let j = 0; j <= nj; j++)
      for (let i = 0; i < ni; i++)
        // s along k, t along i: e_2 x e_0 = e_1.
        store(
          jFaces,
          i + ni * (j + (nj + 1) * k),
          faceVector(P(i, j, k), P(i, j, k + 1), P(i + 1, j, k + 1), P(i + 1, j, k), geometry),
        );
  for (let k = 0; k <= nk; k++)
    for (let j = 0; j < nj; j++)
      for (let i = 0; i < ni; i++)
        // s along i, t along j: e_0 x e_1 = e_2.
        store(
          kFaces,
          i + ni * (j + nj * k),
          faceVector(P(i, j, k), P(i + 1, j, k), P(i + 1, j + 1, k), P(i, j + 1, k), geometry),
        );

  const cells = ni * nj * nk;
  const volume = new Float64Array(cells);
  const sourceVolume = new Float64Array(cells);
  const centroid0 = new Float64Array(cells);
  const centroid1 = new Float64Array(cells);
  const centroid2 = new Float64Array(cells);
  for (let k = 0; k < nk; k++) {
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const corners: Vec3[] = [];
        for (let n = 0; n < 8; n++)
          corners.push(P(i + (n & 1), j + ((n >> 1) & 1), k + ((n >> 2) & 1)));
        const { weighted, centroid } = cellIntegrals(corners, geometry);
        const c = i + ni * (j + nj * k);
        volume[c] = weighted;
        centroid0[c] = centroid[0];
        centroid1[c] = centroid[1];
        centroid2[c] = centroid[2];
        if (geometry === 'cylindrical') {
          const fi0 = i + (ni + 1) * (j + nj * k);
          const fj0 = i + ni * (j + (nj + 1) * k);
          const fk0 = i + ni * (j + nj * k);
          sourceVolume[c] =
            iFaces.s1[fi0 + 1]! -
            iFaces.s1[fi0]! +
            (jFaces.s1[fj0 + ni]! - jFaces.s1[fj0]!) +
            (kFaces.s1[fk0 + ni * nj]! - kFaces.s1[fk0]!);
        }
      }
    }
  }
  return {
    ni,
    nj,
    nk,
    geometry,
    iFaces,
    jFaces,
    kFaces,
    volume,
    sourceVolume,
    centroid0,
    centroid1,
    centroid2,
  };
}
