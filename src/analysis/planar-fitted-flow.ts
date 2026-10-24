/**
 * The planar flow over the upper surface of a sharp polygonal fin section (a double wedge, a hexagon) with
 * the leading-edge shock fitted as the outer boundary: the 2D fitted engine of
 * docs/design/0006-shock-fitting.md in planar geometry, the independent check of the planar method of
 * characteristics that rung (b3) of docs/design/0021-3d-euler-fins.md (4.2) asks for. The two methods share
 * only the gas dynamics: this one captures the expansion fans and the waves they reflect from the shock on
 * a grid, the other follows them along characteristics.
 *
 * The domain starts at x0, half way along the first surface segment: ahead of the first corner the flow
 * between the straight attached shock and the surface is uniform (the oblique-shock state), so the inflow
 * plane imposes it exactly, and the drag of the surface ahead of x0 is exact. The grid lines are vertical,
 * through the surface's corners and evenly spaced on each segment between them; the nodes lie at even
 * fractions of the shock height. The domain ends at the trailing edge (supersonic outflow).
 */

import { type Euler2DConfig } from '../engine-cpu/euler2d';
import { gridOnLines, type GridLine } from '../grid/blunt-grid';
import type { StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';
import { fitShock, type ShockFit } from '../solver/shock-fitting';
import { obliqueShock } from '../validation/gas-dynamics';
import type { PlanarSurface } from '../validation/characteristics-planar';

export interface PlanarFitOptions {
  readonly mach: number;
  readonly gamma: number;
  /** Cells from the surface to the shock on the base grid. */
  readonly nj: number;
  /** Columns per chord on the base grid (each segment gets at least two). */
  readonly columnsPerChord: number;
  /** Refinement of the base grid: 1, 2, 4, 8. */
  readonly refinement: number;
  readonly maxIterations: number;
  readonly onProgress?: (iterations: number, maxSpeed: number, residual: number) => void;
}

export interface PlanarFit {
  readonly fit: ShockFit;
  /** Section drag coefficient (both surfaces, on the chord). */
  readonly cd: number;
  readonly cells: number;
}

/** Stopping test of the fit, as for the bodies (0006). */
const SPEED_TOLERANCE = 1e-12;
const RESIDUAL_TOLERANCE = 1e-12;

/** The grid lines and shock heights of a section's fitted problem (exported for the tests). */
export function planarFitLines(surface: PlanarSurface, options: PlanarFitOptions) {
  const { mach, gamma } = options;
  const n = surface.x.length - 1;
  const x0 = 0.5 * (surface.x[0]! + surface.x[1]!);
  const theta0 = Math.atan2(surface.y[1]! - surface.y[0]!, surface.x[1]! - surface.x[0]!);
  const shock = obliqueShock(mach, theta0, gamma);
  const chord = surface.x[n]! - surface.x[0]!;
  const yAt = (s: number, x: number) =>
    surface.y[s]! +
    ((surface.y[s + 1]! - surface.y[s]!) * (x - surface.x[s]!)) /
      (surface.x[s + 1]! - surface.x[s]!);
  const xs: { x: number; y: number }[] = [];
  for (let s = 0; s < n; s++) {
    const a = s === 0 ? x0 : surface.x[s]!;
    const b = surface.x[s + 1]!;
    const count =
      Math.max(2, Math.ceil(((b - a) / chord) * options.columnsPerChord)) * options.refinement;
    for (let k = s === 0 ? 0 : 1; k <= count; k++) {
      const x = a + ((b - a) * k) / count;
      xs.push({ x, y: k === count && s + 1 < n ? surface.y[s + 1]! : yAt(s, x) });
    }
  }
  const nj = options.nj * options.refinement;
  const fractions = Array.from({ length: nj + 1 }, (_, j) => j / nj);
  // First guess: the straight leading-edge shock.
  const lines: GridLine[] = xs.map(({ x, y }) => ({
    x,
    y,
    dx: 0,
    dy: 1,
    h: Math.max(x * Math.tan(shock.beta) - y, 1e-3 * chord),
    fractions,
  }));
  return { lines, nj, x0, theta0, shock, chord };
}

export function planarSectionFit(surface: PlanarSurface, options: PlanarFitOptions): PlanarFit {
  const { mach, gamma } = options;
  const { lines, nj, theta0, shock } = planarFitLines(surface, options);
  const vInf = mach * Math.sqrt(gamma);
  const free: Primitive2D = { rho: 1, u: vInf, v: 0, p: 1 };
  // The uniform flow behind the attached shock, along the first segment.
  const tangential = vInf * Math.cos(shock.beta);
  const normal = (vInf * Math.sin(shock.beta)) / shock.densityRatio;
  const speed = Math.hypot(tangential, normal);
  const behind: Primitive2D = {
    rho: shock.densityRatio,
    u: speed * Math.cos(theta0),
    v: speed * Math.sin(theta0),
    p: shock.pressureRatio,
  };
  const axialMach = behind.u / Math.sqrt((gamma * behind.p) / behind.rho);
  if (!(axialMach > 1)) {
    throw new RangeError(
      `the flow crosses the inflow plane at an axial Mach number of ${axialMach.toFixed(3)}`,
    );
  }
  const configFor = (grid: StructuredGrid, states: readonly Primitive2D[]): Euler2DConfig => ({
    grid,
    geometry: 'planar',
    gamma,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'faceStates', states: Array.from({ length: grid.nj }, () => behind) },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: {
        kind: 'faceStates',
        states: states.length > 0 ? states : Array.from({ length: grid.ni }, () => free),
      },
    },
  });
  const fit = fitShock({
    lines,
    heights: lines.map((l) => l.h),
    nj,
    gridFor: (h, gated) => gridOnLines(lines, h, nj, 1, gated),
    configFor,
    initial: () => behind,
    freeStream: free,
    firstNode: 'fixed',
    speedTolerance: SPEED_TOLERANCE,
    residualTolerance: RESIDUAL_TOLERANCE,
    maxIterations: options.maxIterations,
    ...(options.onProgress ? { onProgress: options.onProgress } : {}),
  });
  // The pressure force on the surface: the wall faces' x-momentum flux (p n_x, n into the body), the free
  // stream's pressure taken off, and the exact uniform part ahead of x0.
  let force = (shock.pressureRatio - 1) * (0.5 * (surface.y[1]! - surface.y[0]!));
  for (const face of fit.solver.boundaryFluxes('jMin'))
    force += (face.flux[1] - face.nx) * face.area;
  const cd = (2 * force) / (0.5 * vInf * vInf);
  return { fit, cd, cells: fit.grid.ni * fit.grid.nj };
}
