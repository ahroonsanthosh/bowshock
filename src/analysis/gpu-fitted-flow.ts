/**
 * The fitted-shock problems of src/analysis/fitted-flow.ts on the GPU
 * engine (src/engine-gpu/shock-fitting-gpu.ts): the fit stops when the
 * drag, evaluated from the flow in double precision at each check, has
 * settled to the GPU's noise and the shock has stopped moving.
 */

import { isGpuFlux } from '../engine-gpu/euler1d-gpu';
import { GpuMemoryLimitError, type GpuEuler2DConfig } from '../engine-gpu/euler2d-gpu';
import { fitShockGpu, type GpuShockFit, type LiveFit } from '../engine-gpu/shock-fitting-gpu';
import type { Body } from '../geometry/body';
import { noseTipSlope } from '../geometry/nose';
import type { StructuredGrid } from '../grid/structured';
import { refineUntilVerified } from '../verification/grid-convergence';
import {
  bluntFitFamily,
  bluntNoseRefusal,
  bluntStartInChunks,
  FALLBACK_COLUMN_DENSITY,
  fittedCaseFailure,
  fittedDragFloor,
  fittedGridFailure,
  sharpFitProblem,
  wallDrag,
  type BluntStart,
  type FitProblem,
} from './fitted-flow';
import {
  GPU_NOISE,
  type LevelReport,
  type VerifiedDrag,
  type VerifiedDragOptions,
} from './verified-drag';

export interface GpuFittedFlowOptions {
  readonly maxIterations: number;
  /** Flow steps per move of the shock (each move by one step's worth). */
  readonly stepsPerMove: number;
  /** Steps between convergence checks. */
  readonly checkEvery: number;
  /** Largest shock speed over the free stream's sound speed at convergence. */
  readonly speedTolerance: number;
  /** The drag's rate of convergence per check known from a coarser grid (SettlingValue). */
  readonly knownRate?: number | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly onProgress?: ((iterations: number, maxSpeed: number, drag: number) => void) | undefined;
  /** The fit as it runs, for drawing it (fitShockGpu's onLive). */
  readonly onLive?: ((live: LiveFit | null) => void) | undefined;
  /** Awaited between batches of steps, to pause (fitShockGpu's gate). */
  readonly gate?: (() => Promise<void>) | undefined;
}

/** What a page may add to watch and pause the verified drag's fits; neither changes a number. */
export interface GpuFitWatch {
  /** Each grid's fit as it runs, with its refinement, and null once it is released. */
  readonly onLive?: ((live: LiveFit | null, refinement: number) => void) | undefined;
  /** Awaited between batches of steps (and of the blunt start's steps): hold it to pause. */
  readonly gate?: (() => Promise<void>) | undefined;
  /** After each convergence check: the steps so far, the shock's fastest speed over the sound speed, the drag. */
  readonly onCheck?:
    ((refinement: number, iterations: number, maxSpeed: number, drag: number) => void) | undefined;
}

export interface GpuFittedFlow {
  readonly fit: GpuShockFit;
  /** Forebody pressure drag coefficient on the body's cross-section. */
  readonly drag: number;
}

export async function gpuFittedFlow(
  device: GPUDevice,
  problem: FitProblem,
  options: GpuFittedFlowOptions,
): Promise<GpuFittedFlow> {
  const free = Array.from({ length: problem.lines.length - 1 }, () => problem.freeStream);
  const configFor = (grid: StructuredGrid): GpuEuler2DConfig => {
    const { flux, source, ...rest } = problem.configFor(grid, free);
    if (!isGpuFlux(flux)) throw new RangeError(`the GPU engine has no ${flux} flux`);
    if (source !== undefined) throw new RangeError('the GPU engine has no source terms');
    return { ...rest, flux };
  };
  const fit = await fitShockGpu({
    device,
    lines: problem.lines,
    heights: problem.heights,
    nj: problem.nj,
    baseRadius: problem.baseRadius,
    configFor,
    initial: problem.initial,
    freeStream: problem.freeStream,
    firstNode: problem.firstNode,
    stepsPerMove: options.stepsPerMove,
    checkEvery: options.checkEvery,
    // The wall's fluxes in double precision, by the CPU engine's scheme.
    monitor: (grid, cell) => wallDrag(problem, grid, cell),
    noise: GPU_NOISE,
    speedTolerance: options.speedTolerance,
    knownRate: options.knownRate,
    maxIterations: options.maxIterations,
    signal: options.signal,
    onProgress: options.onProgress,
    onLive: options.onLive,
    gate: options.gate,
  });
  return { fit, drag: fit.value };
}

/**
 * The problem on a grid refined by 2, started from the converged fit on
 * the grid before: on nested grids (every coarser line and node fraction
 * is one of the finer grid's) each finer cell lies inside one coarser
 * cell, whose state it takes, and the shock's heights are interpolated
 * along the body. The converged state does not depend on the start, only
 * the steps to reach it. Null where the grids are not nested.
 */
export function startedFrom(
  fine: FitProblem,
  coarse: FitProblem,
  fit: GpuShockFit,
): FitProblem | null {
  const n = coarse.lines.length - 1;
  if (fine.lines.length - 1 !== 2 * n || fine.nj !== 2 * coarse.nj) return null;
  const scale = Math.abs(coarse.lines[n]!.x - coarse.lines[0]!.x);
  for (let k = 0; k <= n; k++) {
    const a = coarse.lines[k]!;
    const b = fine.lines[2 * k]!;
    if (!(Math.abs(a.x - b.x) <= 1e-12 * scale && Math.abs(a.y - b.y) <= 1e-12 * scale))
      return null;
    for (let j = 0; j <= coarse.nj; j++) {
      if (!(Math.abs(a.fractions![j]! - b.fractions![2 * j]!) <= 1e-12)) return null;
    }
  }
  const heights = fine.lines.map((l, i) => {
    if (i % 2 === 0) return fit.heights[i / 2]!;
    const a = coarse.lines[(i - 1) / 2]!;
    const b = coarse.lines[(i + 1) / 2]!;
    const t = (l.x - a.x) / (b.x - a.x);
    return fit.heights[(i - 1) / 2]! * (1 - t) + fit.heights[(i + 1) / 2]! * t;
  });
  return {
    ...fine,
    heights,
    initial: (i, j) => fit.cell(Math.floor(i / 2), Math.floor(j / 2)),
  };
}

/** Base grid cells across, as for the captured-shock grids. */
const BASE_NJ = 20;
/**
 * Steps between convergence checks on the base grid; scaled with the
 * refinement. A grid started from the one before has converged within a
 * few hundred steps, and the drag must settle over two checks after the
 * first, so frequent checks shorten it (a check costs one read of the
 * flow and an evaluation at the wall).
 */
const CHECK_EVERY = 250;
/** Largest number of checks per grid: 30000 steps on the base grid. */
const MAX_CHECKS = 120;
/**
 * Largest shock speed at convergence, over the free stream's sound speed:
 * several times the 32-bit noise at which the speeds settle, which grows
 * with the Mach number (measured at nj = 20: up to 1.2e-6 on the Mach 2
 * hemisphere-cylinder, 4e-6 on a 20 degree cone at Mach 5). The drag's
 * own settling is the main test.
 */
const FITTED_SPEED_TOLERANCE = 3e-5;

/**
 * Steps of a blunt nose's captured start (on the CPU) between returns to
 * the browser's event loop: about a tenth of a second on the base grid.
 */
const START_CHUNK = 50;

/** Resolves on a later task of the event loop, after pending input and rendering. */
function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

class FitNotConverged extends Error {}
class InvalidCase extends Error {}
/** A grid that fails only the fitted grids' quality gates (fittedGridFailure). */
class GridRefused extends InvalidCase {
  constructor(
    readonly refinement: number,
    reason: string,
  ) {
    super(reason);
  }
}

/**
 * The forebody pressure drag with the bow shock fitted, on the GPU, on
 * grids refined by 2 up to the finest allowed, with its measured error
 * band: the procedure of verifiedForebodyDrag (src/analysis/verified-drag.ts)
 * with the fitted solver, whose systematic floor is the caller's.
 */
export async function verifiedFittedDragGpu(
  device: GPUDevice,
  body: Body,
  options: Omit<VerifiedDragOptions, 'noise'> & GpuFitWatch,
): Promise<VerifiedDrag> {
  // Blunt noses: the family of problems, once its captured start is computed.
  let blunt: ((refinement: number) => FitProblem) | null = null;
  let reports: LevelReport[] = [];
  let lastRefinement = 1;
  // The last grid's problem and converged fit, to start the next from.
  let previous: { problem: FitProblem; fit: GpuShockFit } | null = null;
  // The sharp grids' column density: the usual layout's, or the fallback's.
  let columnDensity: number | undefined;
  const solveAt = async (refinement: number): Promise<number> => {
    lastRefinement = refinement;
    const problemOptions = {
      mach: options.mach,
      gamma: options.gamma,
      nj: BASE_NJ,
      refinement,
      ...(columnDensity === undefined ? {} : { columnDensity }),
    };
    const fresh = blunt ? blunt(refinement) : sharpFitProblem(body, problemOptions);
    const problem = (previous && startedFrom(fresh, previous.problem, previous.fit)) ?? fresh;
    const checkEvery = CHECK_EVERY * refinement;
    const { fit, drag } = await gpuFittedFlow(device, problem, {
      maxIterations: MAX_CHECKS * checkEvery,
      stepsPerMove: 1,
      checkEvery,
      speedTolerance: FITTED_SPEED_TOLERANCE,
      // A grid started from the one before may begin too close to its
      // limit to show its own rate of convergence: it takes that grid's.
      knownRate: previous?.fit.rate,
      signal: options.signal,
      onProgress: (iterations, speed, value) => {
        options.onCheck?.(refinement, iterations, speed, value);
        options.onProgress?.(refinement, iterations, value);
      },
      onLive:
        options.onLive === undefined
          ? undefined
          : (live) => {
              options.onLive?.(live, refinement);
            },
      gate: options.gate,
    });
    if (!fit.converged) {
      throw new FitNotConverged(
        `the fit stopped after ${fit.iterations} iterations with the shock moving at ${fit.maxSpeed.toExponential(1)} of the sound speed or the drag still changing`,
      );
    }
    const gridFailure = fittedGridFailure(fit.grid);
    if (gridFailure !== undefined) throw new GridRefused(refinement, gridFailure);
    const failure = fittedCaseFailure(problem, fit.grid, fit.cell);
    if (failure !== undefined) throw new InvalidCase(failure);
    previous = { problem, fit };
    const report = {
      refinement,
      cells: { ni: fit.grid.ni, nj: fit.grid.nj },
      iterations: fit.iterations,
      drag,
    };
    reports.push(report);
    options.onLevel?.(report);
    return drag;
  };
  try {
    const refusal = bluntNoseRefusal(body, options.mach);
    if (refusal !== undefined) throw new InvalidCase(refusal);
    let start: BluntStart | null = null;
    if (!Number.isFinite(noseTipSlope(body.nose))) {
      const familyOptions = { mach: options.mach, gamma: options.gamma, nj: BASE_NJ };
      const gate = options.gate;
      start = await bluntStartInChunks(body, familyOptions, {
        chunk: START_CHUNK,
        pause:
          gate === undefined
            ? nextTask
            : async () => {
                await nextTask();
                await gate();
              },
        signal: options.signal,
        onProgress: options.onStart,
      });
      blunt = bluntFitFamily(body, familyOptions, start);
    }
    const floor = fittedDragFloor(options.floor, start);
    const verified = () =>
      refineUntilVerified(solveAt, {
        ...options,
        floor,
        noise: GPU_NOISE,
        // A finer grid too large for this GPU, or whose fit does not
        // converge, leaves the band of the grids before it, as if a coarser
        // finest grid had been chosen; a case refused on any grid stays
        // refused.
        stopOn: (error) =>
          error instanceof GpuMemoryLimitError
            ? error.message
            : error instanceof FitNotConverged
              ? `its fit did not converge (${error.message})`
              : undefined,
      });
    try {
      return { ...(await verified()), kind: 'solved', reports, floor };
    } catch (error) {
      // A sharp nose whose grid fails only the quality gates: its whole
      // family again, with more columns; refused only if that one is too.
      if (blunt !== null || !(error instanceof GridRefused)) throw error;
      options.onFallback?.(error.refinement, error.message);
      columnDensity = FALLBACK_COLUMN_DENSITY;
      previous = null;
      reports = [];
      try {
        const result = await verified();
        return { ...result, kind: 'solved', reports, columnDensity, floor };
      } catch (fallbackError) {
        if (!(fallbackError instanceof InvalidCase)) throw fallbackError;
        throw new InvalidCase(
          `${fallbackError.message} (with ${FALLBACK_COLUMN_DENSITY} times as many columns, solved because the usual grid at refinement ${error.refinement} fails its quality checks)`,
        );
      }
    }
  } catch (error) {
    if (options.signal?.aborted === true) return { kind: 'cancelled', reports };
    if (error instanceof FitNotConverged) {
      return { kind: 'not-converged', refinement: lastRefinement, reason: error.message };
    }
    if (error instanceof InvalidCase) {
      return { kind: 'invalid', refinement: lastRefinement, reason: error.message };
    }
    if (error instanceof GpuMemoryLimitError) {
      return {
        kind: 'invalid',
        refinement: lastRefinement,
        reason: `${error.message}; choose a coarser finest grid or a shorter body`,
      };
    }
    throw error;
  }
}
