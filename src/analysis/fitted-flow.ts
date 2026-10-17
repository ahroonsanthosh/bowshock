/**
 * The flow around a rocket nose and body with the bow shock fitted as the
 * outer boundary (design: docs/design/0006-shock-fitting.md), on the CPU
 * engine, and its forebody pressure drag.
 *
 * Sharp noses: the domain starts just behind the tip, at x0, where the
 * flow is that of the cone tangent at the tip (Taylor-Maccoll), and the
 * grid lines are vertical. Blunt noses: the C grid of
 * src/grid/blunt-grid.ts, started from a captured solution. On both, each
 * line keeps the node fractions of its starting height as the shock
 * moves, so that the grids are those of the GPU fit
 * (src/engine-gpu/shock-fitting-gpu.ts).
 */

import { Euler2D, type BoundaryFaceFlux, type Euler2DConfig } from '../engine-cpu/euler2d';
import { bodyLength, bodyRadius, type Body } from '../geometry/body';
import { noseTipSlope } from '../geometry/nose';
import {
  bluntBodyGrid,
  gridOnLines,
  outerCellHeight,
  withFixedFractions,
  type BluntGrid,
  type GridLine,
} from '../grid/blunt-grid';
import { columnPositions } from '../grid/spacing';
import { gridFromFunction, nodeIndex, type StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';
import { capturedShockHeights, fitShock, type ShockFit } from '../solver/shock-fitting';
import { normalShock } from '../validation/gas-dynamics';
import { coneFlowField, taylorMaccoll } from '../validation/taylor-maccoll';
import { refineUntilVerified, type VerifiedValue } from '../verification/grid-convergence';
import { forebodyPressureDrag } from './forces';
import { CPU_NOISE, ORDER_TOLERANCE, freeStreamAt } from './verified-drag';

export interface FittedFlowOptions {
  readonly mach: number;
  readonly gamma: number;
  /** Cells from the body to the shock on the base grid. */
  readonly nj: number;
  /** Refinement of the base grid: 1, 2, 4, ... */
  readonly refinement: number;
  readonly maxIterations: number;
}

export interface FittedFlow {
  readonly fit: ShockFit;
  /** Forebody pressure drag coefficient on the body's cross-section. */
  readonly drag: number;
}

/** Start of the domain behind a sharp tip, in nose lengths. */
const SHARP_START = 1e-3;
/**
 * Cells along the body on sharp noses are this many times the across
 * spacing (at most; the quality gates allow 10).
 */
const SHARP_ASPECT = 2;
/** Stopping test of the fit: shock speeds over the free-stream sound speed. */
const SPEED_TOLERANCE = 1e-12;
/** ... and residual, relative to the free stream's on the first grid. */
const RESIDUAL_TOLERANCE = 1e-12;

function engineConfig(
  grid: StructuredGrid,
  gamma: number,
  iMin: Euler2DConfig['boundaries']['iMin'],
  shockStates: readonly Primitive2D[],
): Euler2DConfig {
  return {
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
      iMin,
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'faceStates', states: shockStates },
    },
  };
}

/**
 * The body the fit solves: at least SOLVED_CYLINDER calibers of cylinder
 * behind the nose. A zero-gradient outflow at the nose's base perturbs the
 * cells next to it: on a bare 10 degree cone at Mach 2 (nj = 20) the drag
 * moves by 6.6e-5 of its value, against 1.2e-7 between one and four
 * calibers of cylinder. Where the flow leaves the end of the body asked
 * for supersonically, nothing behind it reaches the body, and a cylinder
 * adds no pressure drag, so the drag is that of the body asked for; where
 * it does not, the case is refused (`baseMach`).
 */
function solvedBody(body: Body): Body {
  const cylinder = SOLVED_CYLINDER * 2 * body.nose.baseRadius;
  return { ...body, cylinderLength: Math.max(body.cylinderLength, cylinder) };
}

/** Shortest cylinder solved behind a nose, in calibers. */
const SOLVED_CYLINDER = 1;

/** A fitted-shock problem on a body: what the fit needs, on either engine. */
export interface FitProblem {
  /** The grid's lines, with their node fractions fixed (withFixedFractions). */
  readonly lines: readonly GridLine[];
  /** Starting shock heights along the lines. */
  readonly heights: readonly number[];
  readonly nj: number;
  readonly baseRadius: number;
  readonly gamma: number;
  readonly freeStream: Primitive2D;
  /** The engine on a grid, with these post-shock states on jMax (the free stream if none). */
  readonly configFor: (grid: StructuredGrid, shockStates: readonly Primitive2D[]) => Euler2DConfig;
  readonly initial: (i: number, j: number) => Primitive2D;
  readonly firstNode: 'symmetry' | 'fixed';
  /** The forebody pressure drag coefficient from the fluxes through the wall. */
  readonly drag: (wall: readonly BoundaryFaceFlux[]) => number;
  /**
   * Axial position of the end of the body asked for, where the solved one
   * may go on (solvedBody): the flow must leave it supersonically for the
   * part beyond not to reach back (`baseMach`).
   */
  readonly askedEnd: number;
}

/** Rows of cells next to the wall that hold the stencil of the wall's fluxes, with a margin. */
const WALL_ROWS = 4;

/**
 * The problem's drag from a flow on a grid, evaluated in double precision
 * by the CPU engine on the rows of cells next to the wall alone: the wall's
 * fluxes depend on nothing else, and the finest grids have millions of
 * cells.
 */
export function wallDrag(
  problem: FitProblem,
  grid: StructuredGrid,
  cell: (i: number, j: number) => Primitive2D,
): number {
  const rows = Math.min(WALL_ROWS, grid.nj);
  const strip = gridFromFunction(grid.ni, rows, (i, j) => {
    const k = nodeIndex(grid, i, j);
    return [grid.x[k]!, grid.y[k]!];
  });
  const config = problem.configFor(
    strip,
    Array.from({ length: grid.ni }, () => problem.freeStream),
  );
  const { iMin } = config.boundaries;
  const evaluator = new Euler2D({
    ...config,
    boundaries: {
      ...config.boundaries,
      iMin: iMin.kind === 'faceStates' ? { ...iMin, states: iMin.states.slice(0, rows) } : iMin,
    },
  });
  evaluator.setCellPrimitives(cell);
  return problem.drag(evaluator.boundaryFluxes('jMin'));
}

/**
 * Smallest axial Mach number in the column of cells just ahead of the end
 * of the body asked for, or Infinity if the domain ends there (the
 * outflow check covers it). Only where it exceeds 1 does nothing behind
 * the end reach the body: on a 26.6 deg cone at Mach 1.5, whose conical
 * surface flow is subsonic, the drag with 2 calibers of cylinder behind
 * it is 3.3% below the Taylor-Maccoll value of an endless cone.
 */
export function baseMach(
  problem: FitProblem,
  grid: StructuredGrid,
  cell: (i: number, j: number) => Primitive2D,
): number {
  const { lines, gamma } = problem;
  let end = 0;
  while (end + 1 < lines.length && lines[end + 1]!.x <= problem.askedEnd * (1 + 1e-12)) end++;
  if (end >= lines.length - 1) return Infinity;
  let smallest = Infinity;
  for (let j = 0; j < grid.nj; j++) {
    const w = cell(end - 1, j);
    smallest = Math.min(smallest, w.u / Math.sqrt((gamma * w.p) / w.rho));
  }
  return smallest;
}

export type FitProblemOptions = Omit<FittedFlowOptions, 'maxIterations'>;

/**
 * Sharp noses: the flow between the body and the fitted shock, from x0 to
 * the end, started from the conical flow of the tip.
 */
export function sharpFitProblem(asked: Body, options: FitProblemOptions): FitProblem {
  const body = solvedBody(asked);
  const { mach, gamma, nj: baseNj, refinement } = options;
  const R = body.nose.baseRadius;
  const L = body.nose.length;
  const xEnd = bodyLength(body);
  const free = freeStreamAt(mach, gamma).state;
  const tipAngle = Math.atan(noseTipSlope(body.nose));
  if (!Number.isFinite(tipAngle)) throw new RangeError('the nose is blunt: use bluntFitProblem');
  const cone = (() => {
    try {
      return coneFlowField(mach, tipAngle, gamma);
    } catch (error) {
      if (!(error instanceof RangeError && /detaches/.test(error.message))) throw error;
      const degrees = ((tipAngle * 180) / Math.PI).toFixed(1);
      throw new RangeError(
        `at Mach ${mach} the bow shock cannot stay attached to a tip of ${degrees} deg half-angle; this needs a sharper or longer nose, or a higher Mach number`,
        { cause: error },
      );
    }
  })();
  const beta = cone.flow.shockAngle;

  // The conical flow on a ray: the free stream's total enthalpy, and the
  // entropy behind the conical shock.
  const enthalpy = gamma / (gamma - 1) + 0.5 * free.u * free.u;
  const vMax = Math.sqrt(2 * enthalpy);
  const jump = normalShock(mach * Math.sin(beta), gamma);
  const entropy = jump.pressureRatio / jump.densityRatio ** gamma;
  const conical = (polar: number): Primitive2D => {
    const c = cone.at(Math.min(Math.max(polar, tipAngle), beta));
    const v = c.speed * vMax;
    const a2 = (gamma - 1) * (enthalpy - 0.5 * v * v);
    const rho = (a2 / gamma / entropy) ** (1 / (gamma - 1));
    return {
      rho,
      u: v * Math.cos(c.flowAngle),
      v: v * Math.sin(c.flowAngle),
      p: entropy * rho ** gamma,
    };
  };

  const nj = baseNj * refinement;
  const x0 = SHARP_START * L;
  // First guess: the tip's conical shock line.
  const guess = (x: number) => Math.max(x * Math.tan(beta) - bodyRadius(body, x), 1e-12 * L);
  const strength = (h: number) => Math.min(Math.log1p(h / R), 2 * Math.log(10));
  // Spacing along the body: SHARP_ASPECT times the geometric mean of the
  // wall and outer cell heights (as on the other grids).
  const spacing = (x: number) => {
    const h = guess(x);
    const b = strength(h);
    return (SHARP_ASPECT * h * b * Math.exp(b / 2)) / (Math.expm1(b) * nj);
  };
  const breakpoints = body.cylinderLength > 0 ? [x0, L, xEnd] : [x0, L];
  const xs = columnPositions(breakpoints, (x) => 1 / spacing(x), refinement);
  // Each line keeps the node fractions of its first guess as the shock moves.
  const lines = withFixedFractions(
    xs.map((x) => ({ x, y: bodyRadius(body, x), dx: 0, dy: 1, h: guess(x) })),
    nj,
    R,
  );
  const heights = lines.map((l) => l.h);
  const first = gridOnLines(lines, heights, nj, R, false);
  const midpoint = (k: number[]) => [
    k.reduce((s, q) => s + first.x[q]!, 0) / k.length,
    k.reduce((s, q) => s + first.y[q]!, 0) / k.length,
  ];
  const inflow = Array.from({ length: nj }, (_, j) => {
    const [x, y] = midpoint([nodeIndex(first, 0, j), nodeIndex(first, 0, j + 1)]);
    return conical(Math.atan2(y!, x!));
  });
  // The inflow plane imposes all four states, which holds only where the
  // flow crosses it supersonically: near the surface of a blunt tip cone
  // at a low Mach number it does not, and the downstream body would reach
  // the tip (the method of characteristics refuses these cases too).
  const slowest = Math.min(...inflow.map((w) => w.u / Math.sqrt((gamma * w.p) / w.rho)));
  if (!(slowest > 1)) {
    const degrees = ((tipAngle * 180) / Math.PI).toFixed(1);
    throw new RangeError(
      `at Mach ${mach} the flow over a tip of ${degrees} deg half-angle is subsonic near the surface (axial Mach number ${slowest.toFixed(2)}), which this solver does not handle; this needs a sharper or longer nose, or a higher Mach number`,
    );
  }
  // Ahead of x0 the nose is the tip cone, within (x0 / L)^2.
  const tipDrag =
    taylorMaccoll(mach, tipAngle, gamma).surfacePressureCoefficient *
    (bodyRadius(body, x0) / R) ** 2;
  return {
    lines,
    heights,
    nj,
    baseRadius: R,
    gamma,
    freeStream: free,
    configFor: (g, states) =>
      engineConfig(
        g,
        gamma,
        { kind: 'faceStates', states: inflow },
        states.length > 0 ? states : Array.from({ length: g.ni }, () => free),
      ),
    initial: (i, j) => {
      const [x, y] = midpoint([
        nodeIndex(first, i, j),
        nodeIndex(first, i + 1, j),
        nodeIndex(first, i, j + 1),
        nodeIndex(first, i + 1, j + 1),
      ]);
      return conical(Math.atan2(y!, x!));
    },
    firstNode: 'fixed',
    drag: (wall) => forebodyDrag(wall, mach, gamma, R) + tipDrag,
    askedEnd: bodyLength(asked),
  };
}

/**
 * Blunt noses: the flow between the body and the fitted shock on the C
 * grid, started from a captured solution (on the CPU).
 */
export function bluntFitProblem(asked: Body, options: FitProblemOptions): FitProblem {
  const body = solvedBody(asked);
  const { mach, gamma, nj: baseNj, refinement } = options;
  const R = body.nose.baseRadius;
  const free = freeStreamAt(mach, gamma).state;
  const { start, captured, heights } = bluntStart(body, options);
  const nj = baseNj * refinement;
  const axis: Euler2DConfig['boundaries']['iMin'] = { kind: 'wall' };
  // Each line keeps the node fractions of its height to the generator's
  // outer boundary, a function of the line's body point alone, so that on
  // a grid refined by 2 the fractions of line 2k are those of line k on
  // the base grid (the nesting that starting each grid from the one before
  // needs, `startedFrom`); the shock itself starts at the captured height.
  const lines = withFixedFractions(start.lines, nj, R).map((l, i) => ({ ...l, h: heights[i]! }));
  return {
    lines,
    heights,
    nj,
    baseRadius: R,
    gamma,
    freeStream: free,
    configFor: (g, states) =>
      engineConfig(
        g,
        gamma,
        axis,
        states.length > 0 ? states : Array.from({ length: g.ni }, () => free),
      ),
    initial: (i, j) => captured.primitive(i, j),
    firstNode: 'symmetry',
    drag: (wall) => forebodyDrag(wall, mach, gamma, R),
    askedEnd: bodyLength(asked),
  };
}

function forebodyDrag(
  wall: readonly BoundaryFaceFlux[],
  mach: number,
  gamma: number,
  baseRadius: number,
): number {
  return forebodyPressureDrag(wall, freeStreamAt(mach, gamma), baseRadius);
}

/** The fit of a problem on the CPU engine, and its drag. */
export function fittedFlow(problem: FitProblem, maxIterations: number): FittedFlow {
  const { lines, nj, baseRadius } = problem;
  const fit = fitShock({
    lines,
    heights: problem.heights,
    nj,
    gridFor: (h, gated) => gridOnLines(lines, h, nj, baseRadius, gated),
    configFor: problem.configFor,
    initial: problem.initial,
    freeStream: problem.freeStream,
    firstNode: problem.firstNode,
    speedTolerance: SPEED_TOLERANCE,
    residualTolerance: RESIDUAL_TOLERANCE,
    maxIterations,
  });
  return { fit, drag: problem.drag(fit.solver.boundaryFluxes('jMin')) };
}

/** Sharp noses on the CPU engine (sharpFitProblem). */
export function sharpFittedFlow(body: Body, options: FittedFlowOptions): FittedFlow {
  return fittedFlow(sharpFitProblem(body, options), options.maxIterations);
}

/** Blunt noses on the CPU engine (bluntFitProblem). */
export function bluntFittedFlow(body: Body, options: FittedFlowOptions): FittedFlow {
  return fittedFlow(bluntFitProblem(body, options), options.maxIterations);
}

/** Steps of the captured solution that places the first shock, per refinement. */
const CAPTURED_START_STEPS = 3000;
/**
 * Margin of the fit's outer boundary over the shock captured on the
 * generator's own grid, as a fraction of the shock's height along each
 * line. The generator's boundary is generous on two-scale noses (on a
 * 3-caliber Haack nose at Mach 2 the shock lies at a tenth of its height
 * at the tip and 0.42 along the nose), and the lines' spacing and node
 * fractions are sized from it, so a second grid is built on the captured
 * shock pushed out by this margin. The captured shock then lies about
 * two thirds of the way up each line, with at least three cells above it.
 */
const BOUNDARY_MARGIN = 0.5;
/** ... and at least this many cells of the base grid above the captured shock. */
const BOUNDARY_CELLS = 3;

export interface BluntStart {
  /** The grid the fit starts on, its outer boundary following the first captured shock. */
  readonly start: BluntGrid;
  /** The captured solution on that grid. */
  readonly captured: Euler2D;
  /** The captured shock's heights along its lines. */
  readonly heights: number[];
  /** The generator's own grid of the base family (refinement 1) and the shock captured on it. */
  readonly first: { readonly grid: BluntGrid; readonly heights: number[] };
}

/**
 * The captured start of a blunt nose's fit: the shock captured on the
 * generator's own base grid (ungated: it only has to contain the shock)
 * places the outer boundary of the grid the fit starts on, at every
 * refinement, so the family stays nested; the shock captured on that grid
 * is the fit's first guess.
 */
export function bluntStart(body: Body, options: FitProblemOptions): BluntStart {
  const { mach, gamma, nj: baseNj, refinement } = options;
  const free = freeStreamAt(mach, gamma).state;
  const capture = (grid: StructuredGrid, steps: number) => {
    const axis: Euler2DConfig['boundaries']['iMin'] = { kind: 'wall' };
    const solver = new Euler2D({
      ...engineConfig(grid, gamma, axis, []),
      boundaries: {
        iMin: axis,
        iMax: { kind: 'outflow' },
        jMin: { kind: 'wall' },
        jMax: { kind: 'inflow', state: free },
      },
    });
    solver.setInitialCondition(() => free);
    solver.iterate(steps);
    return solver;
  };
  const first = bluntBodyGrid(body, { nj: baseNj, refinement: 1, mach, gated: false });
  const firstCaptured = capture(first.grid, CAPTURED_START_STEPS);
  const firstHeights = capturedShockHeights(firstCaptured, first.grid, first.lines, free);
  const R = body.nose.baseRadius;
  const outerBoundary = first.lines.map((l, i) => {
    const shock = firstHeights[i]!;
    // The margin, or three cells of the base grid along the line, whichever
    // is larger: along the cylinder, where the lines are long and their
    // outer cells stretched, the fraction alone leaves two.
    let d = (1 + BOUNDARY_MARGIN) * shock;
    for (let k = 0; k < 20; k++) {
      d = Math.max(d, shock + BOUNDARY_CELLS * outerCellHeight(d, baseNj, R));
    }
    return { x: l.x + d * l.dx, y: l.y + d * l.dy };
  });
  const start = bluntBodyGrid(body, { nj: baseNj, refinement, mach, outerBoundary });
  const captured = capture(start.grid, CAPTURED_START_STEPS * refinement);
  const heights = capturedShockHeights(captured, start.grid, start.lines, free);
  return { start, captured, heights, first: { grid: first, heights: firstHeights } };
}

export interface VerifiedFittedDragOptions {
  readonly mach: number;
  readonly gamma: number;
  /** Finest refinement of the 20-cell base grid (1, 2, 4, ...). */
  readonly maxRefinement: number;
  /** Systematic error that does not shrink with the grid, relative (measured: 0006). */
  readonly floor: number;
  /** Largest acceptable band, absolute; 0 refines to the finest grid. */
  readonly tolerance: number;
  /** Fit iterations allowed per grid, times its refinement. */
  readonly iterationsPerRefinement: number;
  readonly onLevel?: (refinement: number, drag: number, fit: ShockFit) => void;
}

export type VerifiedFittedDrag =
  | (VerifiedValue & { readonly kind: 'solved' })
  | { readonly kind: 'not-converged'; readonly refinement: number; readonly reason: string };

/** Base grid cells across, as for the captured-shock grids. */
const FITTED_BASE_NJ = 20;

/**
 * The forebody pressure drag with the bow shock fitted, on grids refined
 * by 2 up to the finest allowed, with its measured error band: the
 * procedure of src/analysis/verified-drag.ts with the CPU fitted-shock
 * solver. A grid whose fit does not converge stops the run without a value.
 */
export async function verifiedFittedDrag(
  body: Body,
  options: VerifiedFittedDragOptions,
): Promise<VerifiedFittedDrag> {
  const blunt = !Number.isFinite(noseTipSlope(body.nose));
  try {
    const result = await refineUntilVerified(
      (refinement) => {
        const flowOptions = {
          mach: options.mach,
          gamma: options.gamma,
          nj: FITTED_BASE_NJ,
          refinement,
          maxIterations: options.iterationsPerRefinement * refinement,
        };
        const { fit, drag } = blunt
          ? bluntFittedFlow(body, flowOptions)
          : sharpFittedFlow(body, flowOptions);
        if (!fit.converged) {
          throw new FitNotConverged(
            refinement,
            `the fit stopped after ${fit.iterations} iterations with the shock moving at ${fit.maxSpeed.toExponential(1)} of the sound speed and a residual of ${fit.residual.toExponential(1)}`,
          );
        }
        options.onLevel?.(refinement, drag, fit);
        return drag;
      },
      {
        orderTolerance: ORDER_TOLERANCE,
        noise: CPU_NOISE,
        floor: options.floor,
        tolerance: options.tolerance,
        maxRefinement: options.maxRefinement,
      },
    );
    return { ...result, kind: 'solved' };
  } catch (error) {
    if (error instanceof FitNotConverged) {
      return { kind: 'not-converged', refinement: error.refinement, reason: error.message };
    }
    throw error;
  }
}

class FitNotConverged extends Error {
  constructor(
    readonly refinement: number,
    reason: string,
  ) {
    super(reason);
  }
}
