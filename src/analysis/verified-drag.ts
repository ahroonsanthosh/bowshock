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
import { SettlingValue } from '../verification/iterative-convergence';
import { forebodyPressureDrag } from './forces';

/** A steady solver for one grid, started from the free stream. */
export interface SteadyEngine {
  iterate(steps: number): void | Promise<void>;
  /** Wall-face fluxes along the body (jMin) of the current state, in double precision. */
  wallFluxes(): readonly BoundaryFaceFlux[] | Promise<readonly BoundaryFaceFlux[]>;
  /** The cell averages of the current state, in double precision. */
  cells(): CellState | Promise<CellState>;
  destroy?(): void;
}

/** Primitive state of cell (i, j). */
export type CellState = (i: number, j: number) => Primitive2D;

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
  /**
   * Called as the captured solution that starts a blunt nose's fit is
   * computed (on the CPU), with its steps so far and in all.
   */
  readonly onStart?: (steps: number, total: number) => void;
  /**
   * Called where a sharp nose's usual family of fitted grids fails their
   * quality gates and the family is solved again with FALLBACK_COLUMN_DENSITY
   * times as many columns (src/analysis/fitted-flow.ts), with the grid that
   * failed and why; the levels reported after it are the new family's.
   */
  readonly onFallback?: (refinement: number, reason: string) => void;
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
  | (VerifiedValue & {
      readonly kind: 'solved';
      readonly reports: readonly LevelReport[];
      /** The column density of the family solved, where not the usual layout's (onFallback). */
      readonly columnDensity?: number;
      /** The allowance included in the band, relative (the caller's floor, or a larger one). */
      readonly floor: number;
    })
  | { readonly kind: 'not-converged'; readonly refinement: number; readonly reason: string }
  | { readonly kind: 'cancelled'; readonly reports: readonly LevelReport[] }
  | { readonly kind: 'invalid'; readonly refinement: number; readonly reason: string };

/**
 * Noise of the GPU engine's drag, relative: its 32-bit solutions give
 * forebody drag within 1.1e-6 of the CPU engine's on cones and ogives at
 * Mach 1.3 to 5, but at Mach 5 the drag wanders between convergence
 * checks by up to 1.3e-6, from the rounding of pressure recovered from a
 * total energy dominated by kinetic energy (growing with M^2); 2e-6 covers
 * that range (docs/design/0005-solution-verification.md). Where the
 * page's fit stops on ellipsoids at Mach 1.2, its drag is up to 3.8e-6 from
 * the CPU's converged value (0006), a twentieth of FITTED_DRAG_FLOOR.
 */
export const GPU_NOISE = 2e-6;
/** Noise of the CPU engine's drag, converged to residuals of 1e-13. */
export const CPU_NOISE = 1e-12;
/**
 * Systematic error of the forebody drag that refinement does not remove,
 * relative: on the three drag families measured against exact solutions
 * (cones at Mach 2 and 3 against Taylor-Maccoll, the TN 3716 ogive at
 * Mach 1.98 against the method of characteristics, nj = 20 to 160), the
 * converged values settle up to 4.6e-4 from the exact ones; the floor is
 * about twice that (docs/design/0005-solution-verification.md).
 */
export const DRAG_FLOOR = 1e-3;
/**
 * The allowance for the forebody drag with the bow shock fitted
 * (docs/design/0006-shock-fitting.md), relative: an error the grid family
 * cannot show, since the procedure extrapolates at second order at most.
 * On the families measured against exact or converged reference values on
 * nj = 20, 40 and 80 (cones of 5 to 30 deg at Mach 1.3 to 3 against
 * Taylor-Maccoll; tangent ogives of 3 calibers at Mach 1.5 to 4 and of 5
 * at Mach 2, and 3-caliber secant-ogive and parabolic noses at Mach 2.5,
 * against the method of characteristics), the procedure's own
 * extrapolation (order capped at 2) of a family whose order has settled
 * lies at most 3.4e-5 of the value from the reference (the 5-caliber
 * ogive at Mach 2, observed order 2.11); the allowance is about twice
 * that. The cone at Mach 1.3, 5 deg, not settled on nj = 80, settles on
 * nj = 160 within 7.2e-6. Not covered by it: 10-caliber noses at Mach 1.2
 * and 1.5, which converge faster than second order, so that the capped
 * extrapolation misses by 1.3e-4 to 6.0e-4; their bands, placed on the
 * finest grid's value, still contain its error (by 1.56 to 2.05 times).
 */
export const FITTED_DRAG_FLOOR = 7e-5;
/**
 * The allowance for the fitted drag of a two-scale nose (Von Karman),
 * relative, in place of FITTED_DRAG_FLOOR. Against references from the
 * method of characteristics started from the fitted flow, on the families
 * that set the served region (fittedFlow's VON_KARMAN_REFERENCES), the
 * procedure's extrapolation from nj = 20, 40 and 80 misses by up to
 * 2.44e-4 of the value: on the 5-caliber nose at Mach 1.5, whose observed
 * order (2.28 on those grids) is capped at 2 while the references show
 * its convergence slowing (docs/design/0006-shock-fitting.md, "Two-scale
 * noses"). The allowance is twice that, rounded up.
 */
export const TWO_SCALE_DRAG_FLOOR = 5e-4;
/**
 * Agreement required between the observed orders of the two finest
 * triples of grids, set on the measured cone families (0005).
 */
export const ORDER_TOLERANCE = 0.5;

/**
 * Largest deviation from the free stream allowed in the cells along the
 * outer boundary (density and pressure relative, velocity over the speed
 * of sound): ahead of the bow shock the flow is undisturbed, to the
 * engines' precision.
 */
export const OUTER_TOLERANCE = 1e-5;

/** Base grid cells across, as validated (docs/design/0004-grids.md). */
const BASE_NJ = 20;
/** Steps per convergence check on the base grid; scaled with the refinement. */
const BATCH = 500;
/** Largest number of checks per grid before the iteration is declared stalled. */
const MAX_BATCHES = 60;

class IterationStalled extends Error {}
/**
 * The case is outside what the boundary conditions represent: the
 * zero-gradient outflow holds only where the flow leaves supersonic, and
 * the free stream imposed on the outer boundary only where the bow shock
 * stays inside it.
 */
class InvalidCase extends Error {}
class Cancelled extends Error {}

export interface FreeStream {
  readonly state: Primitive2D;
  readonly pressure: number;
  readonly dynamicPressure: number;
}

/**
 * The free stream of a case at Mach `mach`, with unit density and
 * pressure. Its speed is rounded to the nearest 32-bit value, so that the
 * GPU engine, which stores it in 32 bits, solves the same case as the CPU
 * engine, and the drag is normalised by its own dynamic pressure; the Mach
 * number then differs from `mach` by under 6e-8 of it.
 */
export function freeStreamAt(mach: number, gamma: number): FreeStream {
  const u = Math.fround(mach * Math.sqrt(gamma));
  return { state: { rho: 1, u, v: 0, p: 1 }, pressure: 1, dynamicPressure: 0.5 * u * u };
}

export async function verifiedForebodyDrag(
  body: Body,
  options: VerifiedDragOptions,
  engineFor: EngineFactory,
): Promise<VerifiedDrag> {
  const { mach, gamma } = options;
  const { state: freeStream, ...free } = freeStreamAt(mach, gamma);
  const reports: LevelReport[] = [];

  const solveAt = async (refinement: number): Promise<number> => {
    const { grid } = bodyGrid(body, { nj: BASE_NJ, refinement, mach, gamma });
    const config: Euler2DConfig = {
      grid,
      geometry: 'axisymmetric',
      gamma,
      flux: 'hllc',
      limiter: 'vanAlbada',
      reconstruction: 'sharedScaled',
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
      const settling = new SettlingValue(options.noise);
      for (let batch = 1; batch <= MAX_BATCHES; batch++) {
        if (options.signal?.aborted === true) throw new Cancelled();
        await engine.iterate(BATCH * refinement);
        const drag = forebodyPressureDrag(await engine.wallFluxes(), free, body.nose.baseRadius);
        options.onProgress?.(refinement, batch * BATCH * refinement, drag);
        if (!Number.isFinite(drag)) throw new IterationStalled('the solution is not finite');
        if (settling.add(drag)) {
          const cells = await engine.cells();
          const outflow = outflowMach(config, cells);
          if (!(outflow > 1)) {
            throw new InvalidCase(
              `the flow leaves the grid at an axial Mach number of ${outflow.toFixed(3)}, where the outflow condition does not hold`,
            );
          }
          const outer = outerDeviation(config, freeStream, cells);
          if (!(outer <= OUTER_TOLERANCE)) {
            throw new InvalidCase(
              `the flow along the outer boundary differs from the free stream by ${outer.toExponential(1)}: the bow shock reaches it`,
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
    return { ...result, kind: 'solved', reports, floor: options.floor };
  } catch (error) {
    if (error instanceof IterationStalled) {
      return { kind: 'not-converged', refinement: lastRefinement, reason: error.message };
    }
    if (error instanceof Cancelled) return { kind: 'cancelled', reports };
    if (error instanceof InvalidCase) {
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
    cells: () => (i, j) => solver.primitive(i, j),
  });
};

/** Smallest u / a over the column of cells next to the outflow plane (iMax). */
export function outflowMach(config: Euler2DConfig, cell: CellState): number {
  const { ni, nj } = config.grid;
  let smallest = Infinity;
  for (let j = 0; j < nj; j++) {
    const w = cell(ni - 1, j);
    smallest = Math.min(smallest, w.u / Math.sqrt((config.gamma * w.p) / w.rho));
  }
  return smallest;
}

/**
 * Largest deviation from the free stream over the row of cells along the
 * outer boundary (jMax): of density and pressure relative to the free
 * stream's, of the velocity components over its speed of sound.
 */
export function outerDeviation(
  config: Euler2DConfig,
  freeStream: Primitive2D,
  cell: CellState,
): number {
  const { ni, nj } = config.grid;
  const a = Math.sqrt((config.gamma * freeStream.p) / freeStream.rho);
  let largest = 0;
  for (let i = 0; i < ni; i++) {
    const w = cell(i, nj - 1);
    largest = Math.max(
      largest,
      Math.abs(w.rho / freeStream.rho - 1),
      Math.abs(w.p / freeStream.p - 1),
      Math.abs(w.u - freeStream.u) / a,
      Math.abs(w.v - freeStream.v) / a,
    );
  }
  return largest;
}
