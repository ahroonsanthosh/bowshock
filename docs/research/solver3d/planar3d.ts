/**
 * The 3D engine in planar mode on a section extruded across two layers between mirror faces, in 0009 section
 * 2.4's domain (x / c from -0.3 to 1.2, 1.4 chords high): the setup of rungs (b2) and (b3) of
 * docs/design/0021-3d-euler-fins.md (4.2), as in rung-b.test.ts (copied, so that the queued (b2) run is left
 * as committed).
 */

import { type SymmetricSection } from '../../../src/fins/section';
import { Euler3D } from '../../../src/solver3d/euler3d';
import type { Primitive3D } from '../../../src/solver3d/flux3d';
import { gridFromFunction3D, type StructuredGrid3D } from '../../../src/solver3d/grid3d';

export const GAMMA = 1.4;
const X_MIN = -0.3;
const X_MAX = 1.2;
const HEIGHT = 1.4;
const DZ = 0.05;

/** The section's upper surface at x (0 outside the chord). */
export function surface(section: SymmetricSection, x: number): number {
  if (x <= 0 || x >= 1) return 0;
  for (let k = 1; k < section.x.length; k++) {
    if (x <= section.x[k]!) {
      const [x0, x1] = [section.x[k - 1]!, section.x[k]!];
      const [g0, g1] = [section.halfThickness[k - 1]!, section.halfThickness[k]!];
      return g0 + ((g1 - g0) * (x - x0)) / (x1 - x0);
    }
  }
  return 0;
}

/** Column positions: per segment (ahead, each of the section's, behind), uniform, with the counts given. */
export function columns(section: SymmetricSection, perSegment: (k: number) => number): number[] {
  const xs = [X_MIN, ...section.x, X_MAX];
  const nodes = [X_MIN];
  for (let k = 0; k + 1 < xs.length; k++) {
    const n = perSegment(k);
    for (let i = 1; i <= n; i++) nodes.push(i === n ? xs[k + 1]! : xs[k]! + ((xs[k + 1]! - xs[k]!) * i) / n);
  }
  return nodes;
}

export function grid3D(section: SymmetricSection, xNodes: readonly number[], nj: number): StructuredGrid3D {
  return gridFromFunction3D(xNodes.length - 1, nj, 2, (i, j, k) => {
    const x = xNodes[i]!;
    const y0 = surface(section, x);
    return [x, y0 + ((HEIGHT - y0) * j) / nj, k * DZ];
  });
}

export function engine3D(grid: StructuredGrid3D, mach: number): Euler3D {
  const free: Primitive3D = { rho: 1, u: mach * Math.sqrt(GAMMA), v: 0, w: 0, p: 1 };
  const e = new Euler3D({
    grid,
    geometry: 'planar',
    gamma: GAMMA,
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'inflow', state: free },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'outflow' },
      kMin: { kind: 'wall' },
      kMax: { kind: 'wall' },
    },
  });
  e.setCellPrimitives(() => free);
  return e;
}

/** Section drag coefficient per unit span: both surfaces, on the chord. */
export function sectionDrag(e: Euler3D, mach: number): number {
  const f = e.sideFluxes('jMin');
  const { jFaces, ni, nk } = e.metrics;
  let d = 0;
  for (let k = 0; k < nk; k++)
    for (let i = 0; i < ni; i++) {
      const t = i + ni * k;
      // The face's x-momentum flux is the wall's pressure p S_x on the fluid, S pointing into the fluid (out of
      // the body); the body's drag is -(p - p_inf) S_x.
      d -= f[5 * t + 1]! - 1 * jFaces.s0[i + ni * (0 + (e.metrics.nj + 1) * k)]!;
    }
  const q = 0.5 * GAMMA * mach * mach;
  return (2 * d) / (q * nk * DZ);
}

/** Iterate until the density residual has fallen by 1e11 and the drag changes by less than 1e-11 a chunk. */
export function converge(
  e: Euler3D,
  mach: number,
  chunk: number,
  maxSteps: number,
): { cd: number; steps: number; change: number; residual: number } {
  const r0 = e.densityResidualNorm();
  let previous = Number.NaN;
  let steps = 0;
  let change = Infinity;
  let cd = Number.NaN;
  let residual = 1;
  while (steps < maxSteps) {
    e.iterate(chunk);
    steps += chunk;
    cd = sectionDrag(e, mach);
    change = Math.abs(cd / previous - 1);
    previous = cd;
    residual = e.densityResidualNorm() / r0;
    if (residual < 1e-11 && change < 1e-11) break;
  }
  return { cd, steps, change, residual };
}
