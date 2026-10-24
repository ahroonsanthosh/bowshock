/**
 * The sharp-section path's solve on the CPU (docs/design/0021-3d-euler-fins.md 3.3, 3.9): the sector grid's
 * blocks (src/solver3d/sector-grid.ts) coupled across their interfaces (Euler3D.iterateCoupled), with 3.3's
 * boundaries, and the fins' pressure drag.
 *
 * - Start plane and envelope: two ghost layers, each cell the 2D field (src/solver3d/field2d.ts) at its own
 *   centroid, the first two cells inside mirrored across the boundary (across the plane x = x_s; across the
 *   envelope surface in the (x, r) plane); w = 0. A ghost centroid outside the 2D grid refuses the case.
 * - Base plane: zero-gradient outflow. Body, fin faces, tip face, the planes theta = 0 and pi / N: slip walls
 *   (the hole sides and the global walls). The slab's zero-height ends are faces of zero area.
 * - The start: the 2D field at every cell's centroid (the free stream where the 2D grid does not reach).
 * - The quantity (3.9): C_D = 2 N sum over the fin's wall faces of (p - p_inf) A_x / (q pi R^2), the fin's wall
 *   faces being the main block's displaced faces over the planform (rows up to the tip, x from the leading to
 *   the trailing edge; the fictitious plate behind a square trailing edge is not summed).
 */

import {
  Euler3D,
  SIDES_3D,
  type BoundaryCondition3D,
  type Euler3DConfig,
  type Side3D,
} from './euler3d';
import type { Field2D } from './field2d';
import type { Primitive3D } from './flux3d';
import { cellIndex3D, computeMetrics3D, nodeIndex3D } from './grid3d';
import { blockBoundaries, decompose, type Decomposition } from './multiblock';
import { sectorGrid, type SectorGrid, type SectorInput, SectorRefusal } from './sector-grid';

export interface SectorProblem {
  readonly sector: SectorGrid;
  readonly dec: Decomposition;
  readonly blocks: Euler3D[];
  /** The fins' pressure drag coefficient on the body's cross-section (3.9). */
  finDrag(): number;
  iterate(steps: number): void;
  /** Root-mean-square density residual over all the blocks' cells. */
  residual(): number;
}

export interface SectorProblemOptions {
  readonly input: SectorInput;
  readonly level: number;
  readonly mach: number;
  readonly gamma: number;
  /** The 2D field of the body's nose (finest 2D grid), in the same units, free stream rho = p = 1. */
  readonly field: Field2D;
  readonly cfl?: number;
}

export function sectorProblem(o: SectorProblemOptions): SectorProblem {
  const sector = sectorGrid(o.input, o.level);
  const dec = decompose(sector.grid, sector.boxes, [], true);
  const { gamma, mach, field } = o;
  const free: Primitive3D = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, w: 0, p: 1 };
  const at = (x: number, r: number): Primitive3D => {
    const s = field.at(x, r);
    if (!s)
      throw new SectorRefusal(
        `the 2D solution does not reach (${x.toPrecision(5)}, ${r.toPrecision(5)})`,
      );
    return { rho: s.rho, u: s.u, v: s.v, w: 0, p: s.p };
  };
  const xs = sector.startPlane;
  const blocks = dec.grids.map((g, b) => {
    const m = computeMetrics3D(g, 'cylindrical');
    // Ghost layers of a boundary side from the 2D field at the mirrored centroids of the first two cells.
    const ghosts = (side: Side3D): BoundaryCondition3D => {
      const layer = (gl: number) => {
        const out: Primitive3D[] = [];
        if (side === 'iMin') {
          for (let k = 0; k < g.nk; k++)
            for (let j = 0; j < g.nj; j++) {
              const q = cellIndex3D(m, gl, j, k);
              out.push(at(2 * xs - m.centroid0[q]!, m.centroid1[q]!));
            }
        } else {
          // jMax: the envelope; mirror across the face's line in the (x, r) plane.
          for (let k = 0; k < g.nk; k++)
            for (let i = 0; i < g.ni; i++) {
              const q = cellIndex3D(m, i, g.nj - 1 - gl, k);
              const n0 = nodeIndex3D(g, i, g.nj, k);
              const n1 = nodeIndex3D(g, i + 1, g.nj, k);
              const fx = 0.5 * (g.c0[n0]! + g.c0[n1]!);
              const fr = 0.5 * (g.c1[n0]! + g.c1[n1]!);
              const tx = g.c0[n1]! - g.c0[n0]!;
              const tr = g.c1[n1]! - g.c1[n0]!;
              const len = Math.hypot(tx, tr);
              const nx = -tr / len;
              const nr = tx / len;
              const px = m.centroid0[q]!;
              const pr = m.centroid1[q]!;
              const d = (px - fx) * nx + (pr - fr) * nr;
              out.push(at(px - 2 * d * nx, pr - 2 * d * nr));
            }
        }
        return out;
      };
      return { kind: 'faceStates', layer0: layer(0), layer1: layer(1) };
    };
    const global: Record<Side3D, BoundaryCondition3D> = {
      iMin: { kind: 'outflow' },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'outflow' },
      kMin: { kind: 'wall' },
      kMax: { kind: 'wall' },
    };
    const bc = blockBoundaries(dec, b, global, sector.grid);
    for (const side of SIDES_3D) {
      const role = dec.roles[b]![side];
      if (role.kind === 'boundary' && (side === 'iMin' || side === 'jMax')) bc[side] = ghosts(side);
    }
    const config: Euler3DConfig = {
      grid: g,
      geometry: 'cylindrical',
      gamma,
      timeIntegrator: 'ssprk2',
      cfl: o.cfl ?? 0.8,
      timeStepping: 'local',
      boundaries: bc,
    };
    const e = new Euler3D(config);
    e.setCellPrimitives((i, j, k) => {
      const q = cellIndex3D(m, i, j, k);
      const s = field.at(m.centroid0[q]!, m.centroid1[q]!);
      return s ? { rho: s.rho, u: s.u, v: s.v, w: 0, p: s.p } : free;
    });
    return e;
  });
  Euler3D.checkShares(blocks, dec.shares);
  // The fin's wall faces: the main block below the tip (box 1), its kMin faces over the planform.
  const below = 1;
  const finFace = (i: number, j: number) =>
    sector.onFin(i, j) &&
    sector.onFin(i + 1, j) &&
    sector.onFin(i, j + 1) &&
    sector.onFin(i + 1, j + 1);
  const q = 0.5 * gamma * mach * mach;
  const R = o.input.bodyRadius;
  return {
    sector,
    dec,
    blocks,
    finDrag() {
      Euler3D.fillLinkedGhosts(blocks, dec.links);
      const e = blocks[below]!;
      const f = e.sideFluxes('kMin');
      const { ni, nj, kFaces } = e.metrics;
      const box = dec.boxes[below]!;
      let sum = 0;
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++) {
          if (!finFace(i + box.i0, j + box.j0)) continue;
          const t = i + ni * j;
          // The face's x-momentum flux is the wall's pressure p S_x on the fluid (S into the fluid, out of
          // the fin); the fin's drag is -(p - p_inf) S_x.
          sum -= f[5 * t + 1]! - 1 * kFaces.s0[i + ni * j]!;
        }
      return (2 * o.input.fins * sum) / (q * Math.PI * R * R);
    },
    iterate(steps) {
      Euler3D.iterateCoupled(blocks, dec.links, dec.shares, steps);
    },
    residual() {
      Euler3D.fillLinkedGhosts(blocks, dec.links);
      let s = 0;
      let n = 0;
      for (const e of blocks) {
        const r = e.densityResidualNorm();
        const c = e.metrics.ni * e.metrics.nj * e.metrics.nk;
        s += r * r * c;
        n += c;
      }
      return Math.sqrt(s / n);
    },
  };
}
