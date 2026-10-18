/**
 * Transonic flow (Mach 1 to about 1.2) around a sharp nose followed by a
 * long cylinder standing for a wind-tunnel sting, with the bow shock
 * captured and far-field boundaries, on the CPU engine, and its forebody
 * pressure (wave) drag (design: docs/design/0007-transonic.md).
 *
 * The drag is that of the supersonic solvers: the pressure drag of the
 * body ahead of the end of the body asked for, on the body's
 * cross-section. The cylinder adds none (its surface is parallel to the
 * axis), so it is the nose's pressure drag with the body continuing as a
 * cylinder behind it; in the supersonic solvers, where the flow leaves
 * the end of the body supersonically, what lies behind cannot reach the
 * nose, so the two definitions agree wherever both apply (Mach 1.2 for
 * slender noses). Below that the flow behind the nose reaches it, and
 * the sting, not the base the total-drag work will model, is what lies
 * behind: its length and the far boundaries' distance are measured
 * errors (transonicGrid's farField and cylinder).
 */

import { Euler2D, type Euler2DConfig } from '../engine-cpu/euler2d';
import type { Body } from '../geometry/body';
import { transonicGrid, type TransonicGrid, type TransonicSpacing } from '../grid/transonic-grid';
import { AndersonMixing } from '../solver/anderson';
import { NonPhysicalStateError } from '../solver/errors';
import { FasMultigrid, type CycleOptions } from '../solver/multigrid';
import { SettlingValue } from '../verification/iterative-convergence';
import { forebodyPressureDrag } from './forces';
import { freeStreamAt, type FreeStream } from './verified-drag';

export interface TransonicOptions {
  readonly mach: number;
  readonly gamma: number;
  /** Refinement of the base grid: 1, 2, 4, ... */
  readonly refinement: number;
  /** Distance of the far boundaries, in body radii (transonicGrid). */
  readonly farField: number;
  /** Cylinder solved behind the nose, in calibers (transonicGrid). */
  readonly cylinder: number;
  /** The base grid's spacings (transonicGrid), for studies of the grid itself. */
  readonly spacing?: Partial<TransonicSpacing>;
}

export interface TransonicProblem {
  readonly body: Body;
  readonly options: TransonicOptions;
  readonly grid: TransonicGrid;
  readonly config: Euler2DConfig;
  readonly freeStream: FreeStream;
  /** Forebody pressure drag coefficient of a solution of the problem. */
  readonly drag: (solver: Euler2D) => number;
}

export function transonicProblem(body: Body, options: TransonicOptions): TransonicProblem {
  const grid = transonicGrid(body, options);
  const freeStream = freeStreamAt(options.mach, options.gamma);
  const far = { kind: 'farField', state: freeStream.state } as const;
  const config: Euler2DConfig = {
    grid: grid.grid,
    geometry: 'axisymmetric',
    gamma: options.gamma,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: { iMin: far, iMax: far, jMin: { kind: 'wall' }, jMax: far },
  };
  const R = body.nose.baseRadius;
  return {
    body,
    options,
    grid,
    config,
    freeStream,
    drag: (solver) => forebodyPressureDrag(solver.boundaryFluxes('jMin'), freeStream, R),
  };
}

export interface SolveOptions {
  /** Change of the drag, relative, that counts as none (SettlingValue). */
  readonly noise: number;
  /** Largest number of steps. */
  readonly maxSteps: number;
  /** Steps between convergence checks. */
  readonly checkEvery: number;
  /** Largest CFL number of the implicit steps (ramped up from 1 by 1.2 a step). */
  readonly cfl: number;
  /** Differences kept by the Anderson acceleration; 0 for plain LU-SGS steps. */
  readonly depth: number;
  /** Plain steps before the acceleration starts. */
  readonly plainSteps: number;
  /** Rate per check known from the coarser grid (SettlingValue). */
  readonly knownRate?: number;
  /**
   * Multigrid cycles over the coarser grids of the family (refinement
   * halved down to 1) instead of single-grid steps: checkEvery then
   * counts cycles, and depth and plainSteps are not used.
   */
  readonly multigrid?: Omit<CycleOptions, 'cfl'>;
  readonly onCheck?: (check: SolveCheck) => void;
}

export interface SolveCheck {
  readonly steps: number;
  readonly drag: number;
  readonly residual: number;
  readonly seconds: number;
}

export interface TransonicSolution {
  readonly solver: Euler2D;
  readonly drag: number;
  readonly converged: boolean;
  readonly steps: number;
  readonly seconds: number;
  /** Times the acceleration had to start over (a rejected step). */
  readonly restarts: number;
  readonly rate: number;
}

/**
 * Solve a problem from the free stream or from a solution on the coarser
 * grid of its family (refinement half as fine), each fine cell taking the
 * state of the coarse cell it lies in (the grids nest), until the drag
 * settles to within the noise (SettlingValue, which also estimates what
 * the remaining iterations would change).
 */
export function solveTransonic(
  problem: TransonicProblem,
  options: SolveOptions,
  start?: { readonly problem: TransonicProblem; readonly solver: Euler2D },
): TransonicSolution {
  const solver = new Euler2D(problem.config);
  const free = problem.freeStream.state;
  if (start === undefined) {
    solver.setInitialCondition(() => free);
  } else {
    const ratio = problem.options.refinement / start.problem.options.refinement;
    if (!(Number.isInteger(ratio) && ratio >= 1)) {
      throw new RangeError('a start must come from a coarser grid of the family');
    }
    solver.setCellPrimitives((i, j) =>
      start.solver.primitive(Math.floor(i / ratio), Math.floor(j / ratio)),
    );
  }
  const t0 = performance.now();
  const settling = new SettlingValue(options.noise, options.knownRate ?? Number.NaN);
  const n = 4 * problem.config.grid.ni * problem.config.grid.nj;
  const anderson = options.depth > 0 ? new AndersonMixing(n, options.depth) : null;
  let cfl = start === undefined ? 1 : options.cfl;
  let restarts = 0;
  let best = Infinity;
  let steps = 0;
  let drag = problem.drag(solver);
  const multigrid =
    options.multigrid !== undefined && problem.options.refinement > 1
      ? multigridFor(problem, solver)
      : null;
  while (steps < options.maxSteps) {
    for (let m = 0; m < options.checkEvery; m++) {
      if (multigrid !== null) {
        multigrid.cycle({ ...options.multigrid!, cfl });
        steps++;
        cfl = Math.min(options.cfl, cfl * 1.2);
        continue;
      }
      if (anderson === null || steps < options.plainSteps) {
        solver.iterateImplicit(1, cfl);
      } else {
        const x = solver.conserved();
        const f = Float64Array.from(solver.implicitCorrection(cfl));
        let norm = 0;
        for (let k = 0; k < n; k++) norm += f[k]! * f[k]!;
        if (norm > 100 * best) {
          anderson.reset();
          restarts++;
          best = norm;
        }
        best = Math.min(best, norm);
        try {
          solver.setConserved(anderson.next(x, f));
        } catch (error) {
          if (!(error instanceof NonPhysicalStateError)) throw error;
          solver.setConserved(x);
          solver.iterateImplicit(1, cfl);
          anderson.reset();
          restarts++;
        }
      }
      steps++;
      cfl = Math.min(options.cfl, cfl * 1.2);
    }
    drag = problem.drag(solver);
    if (!Number.isFinite(drag)) throw new NonPhysicalStateError('the drag is not finite');
    options.onCheck?.({
      steps,
      drag,
      residual: solver.densityResidualNorm(),
      seconds: (performance.now() - t0) / 1000,
    });
    if (settling.add(drag)) {
      return {
        solver,
        drag,
        converged: true,
        steps,
        seconds: (performance.now() - t0) / 1000,
        restarts,
        rate: settling.rateToPassOn,
      };
    }
  }
  return {
    solver,
    drag,
    converged: false,
    steps,
    seconds: (performance.now() - t0) / 1000,
    restarts,
    rate: settling.rateToPassOn,
  };
}

/** The multigrid of a problem's family below it: its coarser grids, down to the base grid. */
function multigridFor(problem: TransonicProblem, solver: Euler2D): FasMultigrid {
  const levels = [{ solver, forcing: null as Float64Array | null }];
  for (let r = problem.options.refinement / 2; r >= 1; r /= 2) {
    const coarse = transonicProblem(problem.body, { ...problem.options, refinement: r });
    const forcing = new Float64Array(4 * coarse.config.grid.ni * coarse.config.grid.nj);
    const coarseSolver = new Euler2D({ ...coarse.config, source: forcing });
    coarseSolver.setInitialCondition(() => problem.freeStream.state);
    levels.push({ solver: coarseSolver, forcing });
  }
  return new FasMultigrid(levels);
}
