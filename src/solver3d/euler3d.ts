/**
 * Three-dimensional finite-volume Euler solver on one structured block, in
 * cylindrical (x, r, theta) or planar (x, y, z) coordinates: the CPU
 * reference engine of docs/design/0021-3d-euler-fins.md (sections 3.1 to
 * 3.3). In cylindrical blocks the equations are
 *
 *   d(r U)/dt + d(r F)/dx + d(r G)/dr + d(H)/dtheta = S,
 *   S = (0, 0, rho w^2 + p, -rho v w, 0),
 *
 * with (u, v, w) the velocity's components along (e_x, e_r, e_theta), and
 * each face's flux the physical normal flux through its area vector in that
 * basis (grid3d.ts). The source is integrated over each cell's source volume,
 * the sum of its faces' r components, so that a revolved axisymmetric state
 * has the 2D axisymmetric scheme's residual times the cell's angle (rung (a))
 * and a uniform stream along x is kept to round-off.
 *
 * Reused from the 2D engine (src/engine-cpu/euler2d.ts): HLLC with
 * Einfeldt's speeds, the scaled shared reconstruction, SSPRK2 with local time
 * steps, the wall mirrored after reconstruction, two ghost layers.
 */

import { RUNGE_KUTTA_STAGES, type TimeIntegrator } from '../solver/runge-kutta';
import { NonPhysicalStateError } from '../solver/errors';
import {
  computeMetrics3D,
  type Geometry3D,
  type GridMetrics3D,
  type StructuredGrid3D,
} from './grid3d';
import { hllc3DPacked, reconstructPacked, totalEnergy3D, type Primitive3D } from './flux3d';

export type Side3D = 'iMin' | 'iMax' | 'jMin' | 'jMax' | 'kMin' | 'kMax';
export const SIDES_3D: readonly Side3D[] = ['iMin', 'iMax', 'jMin', 'jMax', 'kMin', 'kMax'];

export type BoundaryCondition3D =
  /** Fixed state in both ghost layers. */
  | { readonly kind: 'inflow'; readonly state: Primitive3D }
  /**
   * Fixed states in the two ghost layers of each boundary face: layer 0 (next to the face) and layer 1, in
   * the order of the side's faces (boundaryFaceCount). The 2D kernels' faceStates puts one state in both
   * layers; this takes each layer's own (0021 section 2.1).
   */
  | {
      readonly kind: 'faceStates';
      readonly layer0: readonly Primitive3D[];
      readonly layer1: readonly Primitive3D[];
    }
  /** Zero-gradient extrapolation: supersonic outflow. */
  | { readonly kind: 'outflow' }
  /** Slip wall; also a mirror plane. */
  | { readonly kind: 'wall' }
  /** Periodic, paired with the opposite side. */
  | { readonly kind: 'periodic' };

export interface Euler3DConfig {
  readonly grid: StructuredGrid3D;
  readonly geometry: Geometry3D;
  readonly gamma: number;
  readonly timeIntegrator: TimeIntegrator;
  readonly cfl: number;
  readonly timeStepping: 'global' | 'local';
  readonly boundaries: Readonly<Record<Side3D, BoundaryCondition3D>>;
  /** Source integrated over each cell (for manufactured solutions): five values a cell, in cell order. */
  readonly source?: Float64Array;
}

const GHOSTS = 2;
const NV = 5;

export class Euler3D {
  readonly config: Euler3DConfig;
  readonly metrics: GridMetrics3D;
  steps = 0;
  private readonly pi: number;
  private readonly pj: number;
  private readonly state: Float64Array;
  private readonly stageA: Float64Array;
  private readonly stageB: Float64Array;
  private readonly residual: Float64Array;
  private readonly dt: Float64Array;
  private readonly fluxOut = new Float64Array(NV);
  private readonly left = new Float64Array(NV);
  private readonly right = new Float64Array(NV);
  private readonly prim: Float64Array;
  private readonly imposed = new Map<Side3D, Float64Array>();
  private faceStateLayers = new Map<Side3D, [readonly Primitive3D[], readonly Primitive3D[]]>();

  constructor(config: Euler3DConfig) {
    this.config = config;
    this.metrics = computeMetrics3D(config.grid, config.geometry);
    const { ni, nj, nk } = this.metrics;
    this.pi = ni + 2 * GHOSTS;
    this.pj = nj + 2 * GHOSTS;
    const size = NV * this.pi * this.pj * (nk + 2 * GHOSTS);
    this.state = new Float64Array(size);
    this.stageA = new Float64Array(size);
    this.stageB = new Float64Array(size);
    this.residual = new Float64Array(size);
    this.prim = new Float64Array(size);
    this.dt = new Float64Array(ni * nj * nk);
    for (const side of SIDES_3D) {
      const bc = config.boundaries[side];
      if (bc.kind === 'faceStates') this.setFaceStates(side, bc.layer0, bc.layer1);
      if (bc.kind === 'periodic') {
        const opposite = side.endsWith('Min')
          ? side.replace('Min', 'Max')
          : side.replace('Max', 'Min');
        if (config.boundaries[opposite as Side3D].kind !== 'periodic')
          throw new RangeError(`${side} periodic needs ${opposite} periodic`);
      }
    }
    if (config.source !== undefined && config.source.length !== NV * ni * nj * nk) {
      throw new RangeError('the source needs five values per cell');
    }
  }

  /** Faces on a side: nj nk on i sides, ni nk on j sides, ni nj on k sides; face t in that order. */
  boundaryFaceCount(side: Side3D): number {
    const { ni, nj, nk } = this.metrics;
    return side[0] === 'i' ? nj * nk : side[0] === 'j' ? ni * nk : ni * nj;
  }

  setFaceStates(
    side: Side3D,
    layer0: readonly Primitive3D[],
    layer1: readonly Primitive3D[],
  ): void {
    if (this.config.boundaries[side].kind !== 'faceStates')
      throw new RangeError(`${side} does not take face states`);
    const n = this.boundaryFaceCount(side);
    if (layer0.length !== n || layer1.length !== n)
      throw new RangeError(`${side} needs ${n} states in each layer`);
    this.faceStateLayers.set(side, [[...layer0], [...layer1]]);
  }

  /**
   * Impose the flux through each face of a side (five values a face, per unit area along the face's area vector's
   * direction, in the order of boundaryFaceCount), as a fitted shock's face does; null returns to the Riemann flux.
   */
  setFaceFluxes(side: Side3D, fluxes: Float64Array | null): void {
    if (fluxes === null) {
      this.imposed.delete(side);
      return;
    }
    if (fluxes.length !== NV * this.boundaryFaceCount(side))
      throw new RangeError(`${side} needs ${NV} values a face`);
    this.imposed.set(side, Float64Array.from(fluxes));
  }

  /** Padded index (times 5) of cell (i, j, k); ghost indices allowed (-2 .. n + 1). */
  private at(i: number, j: number, k: number): number {
    return NV * (i + GHOSTS + this.pi * (j + GHOSTS + this.pj * (k + GHOSTS)));
  }

  setCellPrimitives(cell: (i: number, j: number, k: number) => Primitive3D): void {
    const { ni, nj, nk } = this.metrics;
    for (let k = 0; k < nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++) this.store(this.state, this.at(i, j, k), cell(i, j, k));
    this.steps = 0;
    this.checkPhysical(this.state);
  }

  primitive(i: number, j: number, k: number): Primitive3D {
    return this.load(this.state, this.at(i, j, k));
  }

  private store(u: Float64Array, q: number, w: Primitive3D): void {
    u[q] = w.rho;
    u[q + 1] = w.rho * w.u;
    u[q + 2] = w.rho * w.v;
    u[q + 3] = w.rho * w.w;
    u[q + 4] = totalEnergy3D(w, this.config.gamma);
  }

  private load(u: Float64Array, q: number): Primitive3D {
    const rho = u[q]!;
    const uu = u[q + 1]! / rho;
    const v = u[q + 2]! / rho;
    const w = u[q + 3]! / rho;
    const p = (this.config.gamma - 1) * (u[q + 4]! - 0.5 * rho * (uu * uu + v * v + w * w));
    return { rho, u: uu, v, w, p };
  }

  /** The residual (net inflow, with the sources) of the current state: five values a cell, in cell order. */
  residualVector(): Float64Array {
    const { ni, nj, nk } = this.metrics;
    this.computeResidual(this.state);
    const out = new Float64Array(NV * ni * nj * nk);
    for (let k = 0; k < nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++) {
          const q = this.at(i, j, k);
          const c = NV * (i + ni * (j + nj * k));
          for (let n = 0; n < NV; n++) out[c + n] = this.residual[q + n]!;
        }
    return out;
  }

  /** Root-mean-square of d(rho)/dt over the cells. */
  densityResidualNorm(): number {
    const { ni, nj, nk, volume } = this.metrics;
    this.computeResidual(this.state);
    let s = 0;
    for (let k = 0; k < nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++) {
          const r = this.residual[this.at(i, j, k)]! / volume[i + ni * (j + nj * k)]!;
          s += r * r;
        }
    return Math.sqrt(s / (ni * nj * nk));
  }

  iterate(count: number): void {
    const stages = RUNGE_KUTTA_STAGES[this.config.timeIntegrator];
    for (let n = 0; n < count; n++) {
      this.computeTimeSteps();
      const u0 = this.state;
      let previous = u0;
      stages.forEach(({ a, b }, s) => {
        const out = s === stages.length - 1 ? u0 : s % 2 === 0 ? this.stageA : this.stageB;
        this.stage(u0, previous, a, b, out);
        previous = out;
      });
      this.steps += 1;
      this.checkPhysical(this.state);
    }
  }

  private stage(
    u0: Float64Array,
    src: Float64Array,
    a: number,
    b: number,
    out: Float64Array,
  ): void {
    this.computeResidual(src);
    const { ni, nj, nk, volume } = this.metrics;
    for (let k = 0; k < nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++) {
          const q = this.at(i, j, k);
          const c = i + ni * (j + nj * k);
          const factor = this.dt[c]! / volume[c]!;
          for (let n = 0; n < NV; n++)
            out[q + n] = a * u0[q + n]! + b * (src[q + n]! + factor * this.residual[q + n]!);
        }
  }

  /** CFL V / (sum over directions of |V . S| + a |S|, S the mean of the cell's two faces). */
  private computeTimeSteps(): void {
    const { ni, nj, nk, iFaces, jFaces, kFaces, volume } = this.metrics;
    const { cfl, gamma } = this.config;
    let smallest = Infinity;
    for (let k = 0; k < nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++) {
          const w = this.load(this.state, this.at(i, j, k));
          const a = Math.sqrt((gamma * w.p) / w.rho);
          const lam = (f: typeof iFaces, f0: number, f1: number) => {
            const sx = 0.5 * (f.s0[f0]! + f.s0[f1]!);
            const sy = 0.5 * (f.s1[f0]! + f.s1[f1]!);
            const sz = 0.5 * (f.s2[f0]! + f.s2[f1]!);
            return Math.abs(w.u * sx + w.v * sy + w.w * sz) + a * Math.hypot(sx, sy, sz);
          };
          const fi = i + (ni + 1) * (j + nj * k);
          const fj = i + ni * (j + (nj + 1) * k);
          const fk = i + ni * (j + nj * k);
          const c = i + ni * (j + nj * k);
          const dt =
            (cfl * volume[c]!) /
            (lam(iFaces, fi, fi + 1) + lam(jFaces, fj, fj + ni) + lam(kFaces, fk, fk + ni * nj));
          this.dt[c] = dt;
          smallest = Math.min(smallest, dt);
        }
    if (this.config.timeStepping === 'global') this.dt.fill(smallest);
  }

  private computeResidual(u: Float64Array): void {
    const { ni, nj, nk, iFaces, jFaces, kFaces, sourceVolume, geometry } = this.metrics;
    const { gamma } = this.config;
    const r = this.residual;
    this.fillGhosts(u);
    r.fill(0);
    const f = this.fluxOut;
    // Primitive variables of every padded cell that holds a state (ghost corners hold none).
    const P = this.prim;
    for (let q = 0; q < u.length; q += NV) {
      const rho = u[q]!;
      if (!(rho > 0)) continue;
      const uu = u[q + 1]! / rho;
      const v = u[q + 2]! / rho;
      const w = u[q + 3]! / rho;
      P[q] = rho;
      P[q + 1] = uu;
      P[q + 2] = v;
      P[q + 3] = w;
      P[q + 4] = (gamma - 1) * (u[q + 4]! - 0.5 * rho * (uu * uu + v * v + w * w));
    }
    const face = (
      set: typeof iFaces,
      fq: number,
      qL: number,
      qR: number,
      step: number,
      side: Side3D | null,
      t: number,
    ) => {
      const sx = set.s0[fq]!;
      const sy = set.s1[fq]!;
      const sz = set.s2[fq]!;
      const area = Math.hypot(sx, sy, sz);
      if (area === 0) return;
      const imposed = side === null ? undefined : this.imposed.get(side);
      if (imposed !== undefined) {
        for (let n = 0; n < NV; n++) f[n] = imposed[NV * t + n]!;
      } else {
        const nx = sx / area;
        const ny = sy / area;
        const nz = sz / area;
        const left = this.left;
        const right = this.right;
        reconstructPacked(P, qL - step, qL, qR, 1, gamma, left);
        reconstructPacked(P, qL, qR, qR + step, -1, gamma, right);
        if (!(left[0]! > 0 && left[4]! > 0 && right[0]! > 0 && right[4]! > 0)) {
          for (let n = 0; n < NV; n++) {
            left[n] = P[qL + n]!;
            right[n] = P[qR + n]!;
          }
        }
        if (side !== null && this.config.boundaries[side].kind === 'wall') {
          // The state outside the wall: the inside state, its velocity reflected about the face normal.
          const [inside, outside] = side.endsWith('Min') ? [right, left] : [left, right];
          const un = inside[1]! * nx + inside[2]! * ny + inside[3]! * nz;
          outside[0] = inside[0]!;
          outside[1] = inside[1]! - 2 * un * nx;
          outside[2] = inside[2]! - 2 * un * ny;
          outside[3] = inside[3]! - 2 * un * nz;
          outside[4] = inside[4]!;
        }
        hllc3DPacked(left, right, nx, ny, nz, gamma, f);
      }
      for (let n = 0; n < NV; n++) {
        const flux = f[n]! * area;
        r[qL + n] = r[qL + n]! - flux;
        r[qR + n] = r[qR + n]! + flux;
      }
    };
    const si = NV;
    const sj = NV * this.pi;
    const sk = NV * this.pi * this.pj;
    for (let k = 0; k < nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i <= ni; i++)
          face(
            iFaces,
            i + (ni + 1) * (j + nj * k),
            this.at(i - 1, j, k),
            this.at(i, j, k),
            si,
            i === 0 ? 'iMin' : i === ni ? 'iMax' : null,
            j + nj * k,
          );
    for (let k = 0; k < nk; k++)
      for (let j = 0; j <= nj; j++)
        for (let i = 0; i < ni; i++)
          face(
            jFaces,
            i + ni * (j + (nj + 1) * k),
            this.at(i, j - 1, k),
            this.at(i, j, k),
            sj,
            j === 0 ? 'jMin' : j === nj ? 'jMax' : null,
            i + ni * k,
          );
    for (let k = 0; k <= nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++)
          face(
            kFaces,
            i + ni * (j + nj * k),
            this.at(i, j, k - 1),
            this.at(i, j, k),
            sk,
            k === 0 ? 'kMin' : k === nk ? 'kMax' : null,
            i + ni * j,
          );

    if (geometry === 'cylindrical') {
      for (let k = 0; k < nk; k++)
        for (let j = 0; j < nj; j++)
          for (let i = 0; i < ni; i++) {
            const q = this.at(i, j, k);
            const w = this.load(u, q);
            const vol = sourceVolume[i + ni * (j + nj * k)]!;
            r[q + 2] = r[q + 2]! + (w.rho * w.w * w.w + w.p) * vol;
            r[q + 3] = r[q + 3]! - w.rho * w.v * w.w * vol;
          }
    }
    const src = this.config.source;
    if (src !== undefined) {
      for (let k = 0; k < nk; k++)
        for (let j = 0; j < nj; j++)
          for (let i = 0; i < ni; i++) {
            const q = this.at(i, j, k);
            const c = NV * (i + ni * (j + nj * k));
            for (let n = 0; n < NV; n++) r[q + n] = r[q + n]! + src[c + n]!;
          }
    }
  }

  /** Unit normal of boundary face t of a side, pointing to increasing index. */
  private boundaryNormal(side: Side3D, t: number): [number, number, number] {
    const { ni, nj, nk, iFaces, jFaces, kFaces } = this.metrics;
    let set: typeof iFaces;
    let fq: number;
    if (side[0] === 'i') {
      set = iFaces;
      const j = t % nj;
      const k = Math.floor(t / nj);
      fq = (side === 'iMin' ? 0 : ni) + (ni + 1) * (j + nj * k);
    } else if (side[0] === 'j') {
      set = jFaces;
      const i = t % ni;
      const k = Math.floor(t / ni);
      fq = i + ni * ((side === 'jMin' ? 0 : nj) + (nj + 1) * k);
    } else {
      set = kFaces;
      const i = t % ni;
      const j = Math.floor(t / ni);
      fq = i + ni * (j + nj * (side === 'kMin' ? 0 : nk));
    }
    const a = Math.hypot(set.s0[fq]!, set.s1[fq]!, set.s2[fq]!);
    return a === 0 ? [0, 0, 0] : [set.s0[fq]! / a, set.s1[fq]! / a, set.s2[fq]! / a];
  }

  /** [ghost, mirror, periodic image] padded indices for layer g of face t on a side. */
  private ghostCells(side: Side3D, t: number, g: number): [number, number, number] {
    const { ni, nj, nk } = this.metrics;
    if (side[0] === 'i') {
      const j = t % nj;
      const k = Math.floor(t / nj);
      return side === 'iMin'
        ? [this.at(-1 - g, j, k), this.at(g, j, k), this.at(ni - 1 - g, j, k)]
        : [this.at(ni + g, j, k), this.at(ni - 1 - g, j, k), this.at(g, j, k)];
    }
    if (side[0] === 'j') {
      const i = t % ni;
      const k = Math.floor(t / ni);
      return side === 'jMin'
        ? [this.at(i, -1 - g, k), this.at(i, g, k), this.at(i, nj - 1 - g, k)]
        : [this.at(i, nj + g, k), this.at(i, nj - 1 - g, k), this.at(i, g, k)];
    }
    const i = t % ni;
    const j = Math.floor(t / ni);
    return side === 'kMin'
      ? [this.at(i, j, -1 - g), this.at(i, j, g), this.at(i, j, nk - 1 - g)]
      : [this.at(i, j, nk + g), this.at(i, j, nk - 1 - g), this.at(i, j, g)];
  }

  private fillGhosts(u: Float64Array): void {
    for (const side of SIDES_3D) {
      const bc = this.config.boundaries[side];
      const n = this.boundaryFaceCount(side);
      for (let t = 0; t < n; t++) {
        const normal = bc.kind === 'wall' ? this.boundaryNormal(side, t) : null;
        for (let g = 0; g < GHOSTS; g++) {
          const [ghost, mirror, wrap] = this.ghostCells(side, t, g);
          if (bc.kind === 'inflow') {
            this.store(u, ghost, bc.state);
            continue;
          }
          if (bc.kind === 'faceStates') {
            this.store(u, ghost, this.faceStateLayers.get(side)![g]![t]!);
            continue;
          }
          const source = bc.kind === 'periodic' ? wrap : mirror;
          for (let v = 0; v < NV; v++) u[ghost + v] = u[source + v]!;
          if (normal !== null) {
            const mn =
              u[source + 1]! * normal[0] + u[source + 2]! * normal[1] + u[source + 3]! * normal[2];
            u[ghost + 1] = u[source + 1]! - 2 * mn * normal[0];
            u[ghost + 2] = u[source + 2]! - 2 * mn * normal[1];
            u[ghost + 3] = u[source + 3]! - 2 * mn * normal[2];
          }
        }
      }
    }
  }

  private checkPhysical(u: Float64Array): void {
    const { ni, nj, nk } = this.metrics;
    for (let k = 0; k < nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++) {
          const w = this.load(u, this.at(i, j, k));
          if (!(w.rho > 0 && w.p > 0 && Number.isFinite(w.u + w.v + w.w))) {
            throw new NonPhysicalStateError(
              `non-physical state in cell (${i}, ${j}, ${k}) after step ${this.steps}`,
            );
          }
        }
  }
}
