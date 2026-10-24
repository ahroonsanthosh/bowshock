/**
 * The quality gates of docs/design/0021-3d-euler-fins.md 2.11 on a 3D grid of blocks (0006's fitted grids'
 * gates, in every direction): positive volumes; neighbouring cells within 1.3 in size along each direction,
 * across block interfaces too; aspect ratio at most 13; cell angles at least 12 deg, and at least 50 deg at
 * the walls (the fin's faces, block L's edge surface, the body, the tip face). One exemption: the zero-height
 * ends of the slab for sharp tip sections, from the angle gate only.
 *
 * Measured as in 2D (src/grid/quality.ts), in physical space (cylindrical nodes mapped to Cartesian): a cell's
 * size along a direction is the mean length of its four edges in that direction; its aspect ratio the largest
 * of its three sizes over the smallest; its angles those of each face's corners; a wall cell's angles those
 * between the edges leaving the wall and the wall face's edges.
 */

import { computeMetrics3D, nodeIndex3D, type Geometry3D, type StructuredGrid3D } from './grid3d';

export const GATES_3D = {
  minAngleDeg: 12,
  minWallAngleDeg: 50,
  maxSizeRatio: 1.3,
  maxAspectRatio: 13,
} as const;

export interface CellRef {
  readonly i: number;
  readonly j: number;
  readonly k: number;
  readonly value: number;
}

export interface Quality3D {
  readonly cells: number;
  readonly minVolume: CellRef;
  readonly minAngleDeg: CellRef;
  readonly minWallAngleDeg: CellRef;
  readonly maxSizeRatio: CellRef & { readonly direction: 'i' | 'j' | 'k' };
  readonly maxAspectRatio: CellRef;
  /** Cells failing each gate. */
  readonly failing: {
    volume: number;
    angle: number;
    wallAngle: number;
    sizeRatio: number;
    aspectRatio: number;
  };
  readonly failures: string[];
}

export type WallSide = 'iMin' | 'iMax' | 'jMin' | 'jMax' | 'kMin' | 'kMax';

export interface QualityOptions {
  /** Is cell (i, j, k) part of the domain (in a block)? */
  readonly inDomain: (i: number, j: number, k: number) => boolean;
  /** The cell's faces that lie on a wall (gated at 50 deg). */
  readonly walls: (i: number, j: number, k: number) => readonly WallSide[];
  /** Cells exempt from the angle gate (the slab's zero-height ends). */
  readonly angleExempt?: (i: number, j: number, k: number) => boolean;
  /** Diagnostics: each failing cell with the gate it fails. */
  readonly onFail?: (i: number, j: number, k: number, gate: keyof Quality3D['failing'], detail?: string) => void;
}

type V3 = [number, number, number];

export function quality3D(
  grid: StructuredGrid3D,
  geometry: Geometry3D,
  o: QualityOptions,
): Quality3D {
  const { ni, nj, nk } = grid;
  const metrics = computeMetrics3D(grid, geometry);
  const P = (i: number, j: number, k: number): V3 => {
    const q = nodeIndex3D(grid, i, j, k);
    const a = grid.c0[q]!;
    const b = grid.c1[q]!;
    const c = grid.c2[q]!;
    return geometry === 'cylindrical' ? [a, b * Math.cos(c), b * Math.sin(c)] : [a, b, c];
  };
  const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
  const angle = (a: V3, b: V3) => {
    const la = len(a);
    const lb = len(b);
    if (la === 0 || lb === 0) return 0;
    return (
      (Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb)))) *
        180) /
      Math.PI
    );
  };
  const size = new Float64Array(3 * ni * nj * nk);
  const cell = (i: number, j: number, k: number) => i + ni * (j + nj * k);
  let cells = 0;
  const failing = { volume: 0, angle: 0, wallAngle: 0, sizeRatio: 0, aspectRatio: 0 };
  let minVolume: CellRef = { i: -1, j: -1, k: -1, value: Infinity };
  let minAngle: CellRef = { i: -1, j: -1, k: -1, value: 180 };
  let minWall: CellRef = { i: -1, j: -1, k: -1, value: 180 };
  let maxAspect: CellRef = { i: -1, j: -1, k: -1, value: 1 };
  // Corner offsets of the faces: each face as four corners in order.
  const faces: Record<WallSide, readonly V3[]> = {
    iMin: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    iMax: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    jMin: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    jMax: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 1, 1],
      [0, 1, 1],
    ],
    kMin: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
    kMax: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  };
  const leaving: Record<WallSide, V3> = {
    iMin: [1, 0, 0],
    iMax: [-1, 0, 0],
    jMin: [0, 1, 0],
    jMax: [0, -1, 0],
    kMin: [0, 0, 1],
    kMax: [0, 0, -1],
  };
  for (let k = 0; k < nk; k++)
    for (let j = 0; j < nj; j++)
      for (let i = 0; i < ni; i++) {
        if (!o.inDomain(i, j, k)) continue;
        cells++;
        const c = cell(i, j, k);
        const vol = metrics.volume[c]!;
        if (vol < minVolume.value) minVolume = { i, j, k, value: vol };
        if (!(vol > 0)) failing.volume++;
        const edge = (d: 0 | 1 | 2) => {
          let s = 0;
          for (const a of [0, 1])
            for (const b of [0, 1]) {
              const p0: V3 =
                d === 0 ? [i, j + a, k + b] : d === 1 ? [i + a, j, k + b] : [i + a, j + b, k];
              const p1: V3 = [
                p0[0] + (d === 0 ? 1 : 0),
                p0[1] + (d === 1 ? 1 : 0),
                p0[2] + (d === 2 ? 1 : 0),
              ];
              s += len(sub(P(...p1), P(...p0)));
            }
          return s / 4;
        };
        const s3 = [edge(0), edge(1), edge(2)];
        size.set(s3, 3 * c);
        const aspect = Math.max(...s3) / Math.min(...s3);
        if (aspect > maxAspect.value) maxAspect = { i, j, k, value: aspect };
        if (!(aspect <= GATES_3D.maxAspectRatio)) {
          failing.aspectRatio++;
          o.onFail?.(i, j, k, 'aspectRatio');
        }
        const exempt = o.angleExempt?.(i, j, k) ?? false;
        let cellMin = 180;
        let wallMin = 180;
        if (!exempt) {
          for (const f of Object.values(faces)) {
            for (let q = 0; q < 4; q++) {
              const at = (n: number) => {
                const d = f[(n + 4) % 4]!;
                return P(i + d[0], j + d[1], k + d[2]);
              };
              const a = angle(sub(at(q + 1), at(q)), sub(at(q - 1), at(q)));
              cellMin = Math.min(cellMin, a);
              if (a < minAngle.value) minAngle = { i, j, k, value: a };
            }
          }
        }
        for (const side of o.walls(i, j, k)) {
          const f = faces[side];
          const l = leaving[side];
          for (let q = 0; q < 4; q++) {
            const d = f[q]!;
            const base = P(i + d[0], j + d[1], k + d[2]);
            const up = P(i + d[0] + l[0], j + d[1] + l[1], k + d[2] + l[2]);
            const nx = f[(q + 1) % 4]!;
            const pv = f[(q + 3) % 4]!;
            for (const e of [nx, pv]) {
              const along = sub(P(i + e[0], j + e[1], k + e[2]), base);
              if (len(along) === 0 && exempt) continue;
              const a = angle(sub(up, base), along);
              wallMin = Math.min(wallMin, a);
              if (a < minWall.value) minWall = { i, j, k, value: a };
            }
          }
        }
        if (cellMin < GATES_3D.minAngleDeg) {
          failing.angle++;
          o.onFail?.(i, j, k, 'angle');
        }
        if (wallMin < GATES_3D.minWallAngleDeg) {
          failing.wallAngle++;
          o.onFail?.(i, j, k, 'wallAngle');
        }
      }
  let maxRatio: CellRef & { direction: 'i' | 'j' | 'k' } = {
    i: -1,
    j: -1,
    k: -1,
    value: 1,
    direction: 'i',
  };
  for (let k = 0; k < nk; k++)
    for (let j = 0; j < nj; j++)
      for (let i = 0; i < ni; i++) {
        if (!o.inDomain(i, j, k)) continue;
        const c = cell(i, j, k);
        const nbrs: [number, number, number, 0 | 1 | 2, 'i' | 'j' | 'k'][] = [
          [i + 1, j, k, 0, 'i'],
          [i, j + 1, k, 1, 'j'],
          [i, j, k + 1, 2, 'k'],
        ];
        let cellRatio = 1;
        let cellDir = '';
        for (const [a, b, d, dir, name] of nbrs) {
          if (a >= ni || b >= nj || d >= nk || !o.inDomain(a, b, d)) continue;
          const x = size[3 * c + dir]!;
          const y = size[3 * cell(a, b, d) + dir]!;
          const r = Math.max(x / y, y / x);
          if (r > cellRatio) cellDir = `${name} ${r.toFixed(2)}`;
          cellRatio = Math.max(cellRatio, r);
          if (r > maxRatio.value) maxRatio = { i, j, k, value: r, direction: name };
        }
        if (cellRatio > GATES_3D.maxSizeRatio) {
          failing.sizeRatio++;
          o.onFail?.(i, j, k, 'sizeRatio', cellDir);
        }
      }
  const failures: string[] = [];
  if (!(minVolume.value > 0))
    failures.push(
      `a cell has non-positive volume (${minVolume.i}, ${minVolume.j}, ${minVolume.k})`,
    );
  if (!(minAngle.value >= GATES_3D.minAngleDeg))
    failures.push(`cell angle ${minAngle.value.toFixed(1)} deg below 12 deg`);
  if (!(minWall.value >= GATES_3D.minWallAngleDeg))
    failures.push(`wall cell angle ${minWall.value.toFixed(1)} deg below 50 deg`);
  if (!(maxRatio.value <= GATES_3D.maxSizeRatio))
    failures.push(
      `neighbouring cells differ in size by ${maxRatio.value.toFixed(2)} along ${maxRatio.direction} (limit 1.3)`,
    );
  if (!(maxAspect.value <= GATES_3D.maxAspectRatio))
    failures.push(`cell aspect ratio ${maxAspect.value.toFixed(1)} above 13`);
  return {
    cells,
    minVolume,
    minAngleDeg: minAngle,
    minWallAngleDeg: minWall,
    maxSizeRatio: maxRatio,
    maxAspectRatio: maxAspect,
    failing,
    failures,
  };
}
