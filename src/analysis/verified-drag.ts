/**
 * The forebody pressure drag of a rocket body with its measured
 * discretisation error: solved on a nested family of generated grids,
 * each to iterative convergence of the drag itself, until the error band
 * is known and within the tolerance asked for (design:
 * docs/design/0005-solution-verification.md).
 *
 * The engine is passed in, so the same procedure runs on the CPU engine
 * (double precision) and on the GPU engine (32-bit, with its wall fluxes
 * evaluated in double precision on the CPU).
 */

import { Euler2D, type BoundaryFaceFlux, type Euler2DConfig } from '../engine-cpu/euler2d';
import type { Body } from '../geometry/body';
import { bodyGrid } from '../grid/body-grid';
import type { Primitive2D } from '../scheme/flux';
import { refineUntilVerified, type VerifiedValue } from '../verification/grid-convergence';
import { forebodyPressureDrag } from './forces';

/** A steady solver for one grid, started from the free stream. */
export interface SteadyEngine {
  iterate(steps: number): void | Promise<void>;
  /** Wall-face fluxes along the body (jMin) of the current state, in double precision. */
  wallFluxes(): readonly BoundaryFaceFlux[] | Promise<readonly BoundaryFaceFlux[]>;
  /** Smallest axial Mach number u / a in the cells next to the outflow plane. */
  outflowMach(): number | Promise<number>;
  destroy?(): void;
}

export type EngineFactory = (
  config: Euler2DConfig,
  freeStream: Primitive2D,
) => Promise<SteadyEngine>;

export interface VerifiedDragOptions {
  readonly mach: number;
  readonly gamma: number;
  /** Largest acceptable error band of the drag coefficient, absolute. */
  readonly tolerance: number;
  /** Finest refinement of the 20-cell base grid to try (1, 2, 4, ...). */
  readonly maxRefinement: number;
  /** Uncertainty of each value from iteration and arithmetic, relative (engine dependent). */
  readonly noise: number;
  /** Systematic error that does not shrink with the grid, relative to the value. */
  readonly floor: number;
  /** Agreement required between the observed orders of the two finest triples. */
  readonly orderTolerance: number;
  /** Called after each grid is solved. */
  readonly onLevel?: (level: LevelReport) => void;
  /** Called after each convergence check, with the grid's refinement and the drag so far. */
  readonly onProgress?: (refinement: number, iterations: number, drag: number) => void;
  /** Stops the run between convergence checks. */
  readonly signal?: AbortSignal;
}

export interface LevelReport {
  readonly refinement: number;
  readonly cells: { readonly ni: number; readonly nj: number };
  readonly iterations: number;
  readonly drag: number;
}

export type VerifiedDrag =
  | (VerifiedValue & { readonly kind: 'solved'; readonly reports: readonly LevelReport[] })
  | { readonly kind: 'not-converged'; readonly refinement: number; readonly reason: string }
  | { readonly kind: 'cancelled'; readonly reports: readonly LevelReport[] }
  | { readonly kind: 'invalid'; readonly refinement: number; readonly reason: string };

/**
 * Noise of the GPU engine's drag, relative: its 32-bit solutions give
 * forebody drag within 1.1e-6 of the CPU engine's on cones
 * (docs/design/0005-solution-verification.md).
 */
export const GPU_NOISE = 1e-6;
/** Noise of the CPU engine's drag, converged to residuals of 1e-13. */
export const CPU_NOISE = 1e-12;
/**
 * Agreement required between the observed orders of the two finest
 * triples of grids, set on the measured cone families (0005).
 */
export const ORDER_TOLERANCE = 0.5;

/** Base grid cells across, as validated (docs/design/0004-grids.md). */
const BASE_NJ = 20;
/** Steps per convergence check on the base grid; scaled with the refinement. */
const BATCH = 500;
/** Largest number of checks per grid before the iteration is declared stalled. */
const MAX_BATCHES = 60;

class IterationStalled extends Error {}
/** The outflow condition (zero gradient) holds only where the flow leaves supersonic. */
class SubsonicOutflow extends Error {}
class Cancelled extends Error {}

export async function verifiedForebodyDrag(
  body: Body,
  options: VerifiedDragOptions,
  engineFor: EngineFactory,
): Promise<VerifiedDrag> {
  const { mach, gamma } = options;
  const freeStream: Primitive2D = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
  const free = { pressure: 1, dynamicPressure: 0.5 * gamma * mach * mach };
  const reports: LevelReport[] = [];

  const solveAt = async (refinement: number): Promise<number> => {
    const { grid } = bodyGrid(body, { nj: BASE_NJ, refinement, mach, gamma });
    const config: Euler2DConfig = {
      grid,
      geometry: 'axisymmetric',
      gamma,
      flux: 'hllc',
      limiter: 'vanAlbada',
      reconstruction: 'shared',
      timeIntegrator: 'ssprk2',
      cfl: 0.8,
      timeStepping: 'local',
      boundaries: {
        iMin: { kind: 'inflow', state: freeStream },
        iMax: { kind: 'outflow' },
        jMin: { kind: 'wall' },
        jMax: { kind: 'inflow', state: freeStream },
      },
    };
    const engine = await engineFor(config, freeStream);
    try {
      // Iterate until the drag itself stops changing by more than its own
      // noise over a whole batch of steps.
      let previous = Number.NaN;
      for (let batch = 1; batch <= MAX_BATCHES; batch++) {
        if (options.signal?.aborted === true) throw new Cancelled();
        await engine.iterate(BATCH * refinement);
        const drag = forebodyPressureDrag(await engine.wallFluxes(), free, body.nose.baseRadius);
        options.onProgress?.(refinement, batch * BATCH * refinement, drag);
        if (!Number.isFinite(drag)) throw new IterationStalled('the solution is not finite');
        if (Math.abs(drag - previous) <= options.noise * Math.abs(drag)) {
          const outflow = await engine.outflowMach();
          if (!(outflow > 1)) {
            throw new SubsonicOutflow(
              `the flow leaves the grid at an axial Mach number of ${outflow.toFixed(3)}, where the outflow condition does not hold`,
            );
          }
          const report = {
            refinement,
            cells: { ni: grid.ni, nj: grid.nj },
            iterations: batch * BATCH * refinement,
            drag,
          };
          reports.push(report);
          options.onLevel?.(report);
          return drag;
        }
        previous = drag;
      }
      throw new IterationStalled(
        `the drag still changes by more than ${options.noise} of its value after ${MAX_BATCHES * BATCH * refinement} iterations`,
      );
    } finally {
      engine.destroy?.();
    }
  };

  let lastRefinement = 1;
  try {
    const result = await refineUntilVerified(async (refinement) => {
      lastRefinement = refinement;
      return solveAt(refinement);
    }, options);
    return { ...result, kind: 'solved', reports };
  } catch (error) {
    if (error instanceof IterationStalled) {
      return { kind: 'not-converged', refinement: lastRefinement, reason: error.message };
    }
    if (error instanceof Cancelled) return { kind: 'cancelled', reports };
    if (error instanceof SubsonicOutflow) {
      return { kind: 'invalid', refinement: lastRefinement, reason: error.message };
    }
    throw error;
  }
}

/** The CPU engine (double precision) as a steady engine. */
export const cpuEngine: EngineFactory = (config, freeStream) => {
  const solver = new Euler2D(config);
  solver.setInitialCondition(() => freeStream);
  return Promise.resolve({
    iterate: (steps) => {
      solver.iterate(steps);
    },
    wallFluxes: () => solver.boundaryFluxes('jMin'),
    outflowMach: () => outflowMach(config, (i, j) => solver.primitive(i, j)),
  });
};

/** Smallest u / a over the column of cells next to the outflow plane (iMax). */
export function outflowMach(
  config: Euler2DConfig,
  cell: (i: number, j: number) => Primitive2D,
): number {
  const { ni, nj } = config.grid;
  let smallest = Infinity;
  for (let j = 0; j < nj; j++) {
    const w = cell(ni - 1, j);
    smallest = Math.min(smallest, w.u / Math.sqrt((config.gamma * w.p) / w.rho));
  }
  return smallest;
}
