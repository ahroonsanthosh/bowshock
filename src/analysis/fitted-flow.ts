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
  assertGridQuality,
  bluntBodyGrid,
  gridOnLines,
  outerCellHeight,
  withFixedFractions,
  type BluntGrid,
  type BluntGridOptions,
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
 * Smallest axial Mach number at the end of the body asked for, across
 * the layer, or Infinity if the domain ends there (the outflow check
 * covers it): where the end is a grid line (the corner at the base of a
 * bare nose, or a cylinder's end), in the column of cells just ahead of
 * it; elsewhere, in each row, interpolated in x between the centres of
 * the columns either side of it. Only where it exceeds 1 does nothing
 * behind the end reach the body: on a 26.6 deg cone at Mach 1.5, whose
 * conical surface flow is subsonic, the drag with 2 calibers of cylinder
 * behind it is 3.3% below the Taylor-Maccoll value of an endless cone.
 */
export function baseMach(
  problem: FitProblem,
  grid: StructuredGrid,
  cell: (i: number, j: number) => Primitive2D,
): number {
  const { lines, gamma, askedEnd } = problem;
  const n = lines.length - 1;
  const tolerance = 1e-12 * Math.abs(askedEnd);
  if (!(lines[n]!.x > askedEnd + tolerance)) return Infinity;
  const axialMach = (w: Primitive2D) => w.u / Math.sqrt((gamma * w.p) / w.rho);
  const across = (mach: (j: number) => number) => {
    let smallest = Infinity;
    for (let j = 0; j < grid.nj; j++) smallest = Math.min(smallest, mach(j));
    return smallest;
  };
  const line = lines.findIndex((l) => Math.abs(l.x - askedEnd) <= tolerance);
  if (line > 0) return across((j) => axialMach(cell(line - 1, j)));
  const centre = (i: number) => 0.5 * (lines[i]!.x + lines[i + 1]!.x);
  // The columns a and a + 1 whose centres enclose the end (or the first
  // two, if the end lies ahead of the first centre).
  let a = 0;
  while (a + 2 < n && centre(a + 1) <= askedEnd) a++;
  const t = Math.min(Math.max((askedEnd - centre(a)) / (centre(a + 1) - centre(a)), 0), 1);
  return across((j) => (1 - t) * axialMach(cell(a, j)) + t * axialMach(cell(a + 1, j)));
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
  // The inflow plane, normal to the axis, imposes all four states, which
  // holds only where the flow crosses it supersonically. The axial Mach
  // number of the conical flow is least on the surface: tested there, on
  // the tip cone itself, so the test does not depend on the grid. Where
  // the surface flow is subsonic the body behind the tip also reaches it
  // (the method of characteristics refuses those cases).
  const surface = conical(tipAngle);
  const surfaceSound = Math.sqrt((gamma * surface.p) / surface.rho);
  const surfaceMach = Math.hypot(surface.u, surface.v) / surfaceSound;
  const axialMach = surface.u / surfaceSound;
  if (!(axialMach > 1)) {
    const degrees = ((tipAngle * 180) / Math.PI).toFixed(1);
    throw new RangeError(
      surfaceMach > 1
        ? `at Mach ${mach} the flow behind a tip of ${degrees} deg half-angle crosses the solver's starting plane, normal to the axis, at an axial Mach number of ${axialMach.toFixed(2)} at the surface, below 1, where that plane cannot impose the tip's conical flow; this needs a sharper or longer nose, or a higher Mach number`
        : `at Mach ${mach} the flow over a tip of ${degrees} deg half-angle is subsonic at the surface (Mach ${surfaceMach.toFixed(2)}), so the body behind the tip reaches it, which this solver does not handle yet; this needs a sharper or longer nose, or a higher Mach number`,
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
  return bluntFitFamily(asked, options)(options.refinement);
}

/** What starts a family of blunt problems: a captured solution on its base grid. */
export interface BluntStart {
  /** The base grid's lines. */
  readonly lines: readonly GridLine[];
  /** The captured shock's heights along them (capturedShockHeights). */
  readonly heights: readonly number[];
  /** The captured solution in each cell of the base grid. */
  readonly cell: (i: number, j: number) => Primitive2D;
  /**
   * The outer boundary of the family's grids where it is not the
   * generator's own: on a two-scale nose, the shock captured on the
   * generator's grid pushed out by a margin (secondCapture).
   */
  readonly outerBoundary?: OuterBoundary;
}

type OuterBoundary = NonNullable<BluntGridOptions['outerBoundary']>;

/**
 * The captured solution that starts a blunt family, on the CPU engine:
 * CAPTURED_START_STEPS steps from the free stream on the base grid; on a
 * two-scale nose, again on the base grid built on that shock.
 */
export function bluntStart(asked: Body, options: BluntFamilyOptions): BluntStart {
  let stage = bluntCapture(asked, options);
  stage.solver.iterate(CAPTURED_START_STEPS);
  const second = secondCapture(asked, options, stage);
  if (second) {
    second.solver.iterate(CAPTURED_START_STEPS);
    stage = second;
  }
  return stage.start();
}

/**
 * bluntStart in chunks of `chunk` steps, awaiting `pause` after each (a
 * page stays responsive, and can stop it); the same solution, since each
 * step depends only on the state before it. Stops with the signal's
 * reason once it is aborted.
 */
export async function bluntStartInChunks(
  asked: Body,
  options: BluntFamilyOptions,
  run: {
    readonly chunk: number;
    readonly pause: () => Promise<void>;
    readonly signal?: AbortSignal | undefined;
    readonly onProgress?: ((steps: number, total: number) => void) | undefined;
  },
): Promise<BluntStart> {
  let stage = bluntCapture(asked, options);
  const total = (stage.grid.twoScale ? 2 : 1) * CAPTURED_START_STEPS;
  let done = 0;
  const capture = async (s: CaptureStage) => {
    for (let steps = 0; steps < CAPTURED_START_STEPS;) {
      run.signal?.throwIfAborted();
      const n = Math.min(run.chunk, CAPTURED_START_STEPS - steps);
      s.solver.iterate(n);
      steps += n;
      done += n;
      run.onProgress?.(done, total);
      await run.pause();
    }
  };
  await capture(stage);
  const second = secondCapture(asked, options, stage);
  if (second) {
    await capture(second);
    stage = second;
  }
  run.signal?.throwIfAborted();
  return stage.start();
}

export type BluntFamilyOptions = Omit<FitProblemOptions, 'refinement'>;

/** A captured-shock problem on a blunt family's base grid, and the start it gives. */
interface CaptureStage {
  readonly grid: BluntGrid;
  readonly solver: Euler2D;
  readonly start: () => BluntStart;
}

/**
 * The captured-shock problem on a blunt family's base grid, from the free
 * stream: on the generator's own grid, or on the grid built on the given
 * outer boundary. The generator's grid of a two-scale nose only has to
 * contain the shock (a second stage follows), so the quality gates apply
 * to the grid the family starts on.
 */
function bluntCapture(
  asked: Body,
  options: BluntFamilyOptions,
  outerBoundary?: OuterBoundary,
): CaptureStage {
  const body = solvedBody(asked);
  const { mach, gamma, nj } = options;
  const free = freeStreamAt(mach, gamma).state;
  const base = bluntBodyGrid(body, { nj, mach, outerBoundary, gated: false });
  if (outerBoundary || !base.twoScale) assertGridQuality(base.grid);
  const axis: Euler2DConfig['boundaries']['iMin'] = { kind: 'wall' };
  const solver = new Euler2D({
    ...engineConfig(base.grid, gamma, axis, []),
    boundaries: {
      iMin: axis,
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'inflow', state: free },
    },
  });
  solver.setInitialCondition(() => free);
  return {
    grid: base,
    solver,
    start: () => ({
      lines: base.lines,
      heights: capturedShockHeights(solver, base.grid, base.lines, free),
      cell: (i, j) => solver.primitive(i, j),
      ...(outerBoundary ? { outerBoundary } : {}),
    }),
  };
}

/**
 * The second stage of a two-scale nose's start, or null on a nose whose
 * generator's boundary is at the body scale (spheres, the ellipsoids
 * served). The generator's boundary is placed at the scale of the tip's
 * blunt part, so that the lines near the tip are sized for it, but is
 * generous at the body scale, where it keeps the angle the blunt bodies
 * need: on a 3-caliber Haack nose at Mach 2 the captured shock lies at a
 * tenth of its height at the tip and 0.42 along the nose, and the lines'
 * spacing and node fractions are sized from the boundary. So the grid the
 * family starts on is built on that captured shock, pushed out by
 * BOUNDARY_MARGIN of its height along each line and at least
 * BOUNDARY_CELLS cells of the base grid (along the cylinder, where the
 * lines are long and their outer cells stretched, the fraction alone
 * leaves two), and the shock captured on it is the family's start.
 */
function secondCapture(
  asked: Body,
  options: BluntFamilyOptions,
  first: CaptureStage,
): CaptureStage | null {
  if (!first.grid.twoScale) return null;
  const body = solvedBody(asked);
  const R = body.nose.baseRadius;
  const free = freeStreamAt(options.mach, options.gamma).state;
  const heights = capturedShockHeights(first.solver, first.grid.grid, first.grid.lines, free);
  const outerBoundary = first.grid.lines.map((l, i) => {
    const shock = heights[i]!;
    let d = (1 + BOUNDARY_MARGIN) * shock;
    for (let k = 0; k < 20; k++) {
      d = Math.max(d, shock + BOUNDARY_CELLS * outerCellHeight(d, options.nj, R));
    }
    return { x: l.x + d * l.dx, y: l.y + d * l.dy };
  });
  return bluntCapture(asked, options, outerBoundary);
}

/**
 * The blunt problems of a family of grids (refinement 1, 2, 4, ...), all
 * started from one captured solution on the base grid (bluntStart): each
 * line takes the node fractions of that solution's shock height,
 * interpolated along the body between the base grid's lines, so every
 * coarser line and node fraction is one of the finer grid's (the nesting
 * startedFrom needs to start each grid from the converged one before).
 */
export function bluntFitFamily(
  asked: Body,
  options: BluntFamilyOptions,
  start: BluntStart = bluntStart(asked, options),
): (refinement: number) => FitProblem {
  const body = solvedBody(asked);
  const { mach, gamma, nj: baseNj } = options;
  const R = body.nose.baseRadius;
  const free = freeStreamAt(mach, gamma).state;
  const axis: Euler2DConfig['boundaries']['iMin'] = { kind: 'wall' };
  return (refinement) => {
    const fine =
      refinement === 1
        ? start.lines
        : bluntBodyGrid(body, {
            nj: baseNj,
            refinement,
            mach,
            outerBoundary: start.outerBoundary,
          }).lines;
    const heights = nestedHeights(start.lines, start.heights, fine, refinement);
    const nj = baseNj * refinement;
    // Each line keeps the node fractions of the captured shock's height.
    const lines = withFixedFractions(
      fine.map((l, i) => ({ ...l, h: heights[i]! })),
      nj,
      R,
    );
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
      initial: (i, j) => start.cell(Math.floor(i / refinement), Math.floor(j / refinement)),
      firstNode: 'symmetry',
      drag: (wall) => forebodyDrag(wall, mach, gamma, R),
      askedEnd: bodyLength(asked),
    };
  };
}

/**
 * Heights on the lines of a grid refined by `refinement` from those on
 * the base grid's lines: the same on the base lines (every refinement-th
 * line), linear in the line's index between them. The weights m /
 * refinement are exact in binary, so the heights, and the node fractions
 * taken from them, of a grid refined by r are those of the grid refined
 * by 2r on its even lines: every grid of the family nests in the next.
 */
function nestedHeights(
  base: readonly GridLine[],
  baseHeights: readonly number[],
  fine: readonly GridLine[],
  refinement: number,
): number[] {
  const n = base.length - 1;
  if (fine.length - 1 !== refinement * n) {
    throw new RangeError('the refined grid does not have the lines of its base grid');
  }
  const scale = Math.hypot(base[n]!.x - base[0]!.x, base[n]!.y - base[0]!.y);
  for (let k = 0; k <= n; k++) {
    const a = base[k]!;
    const b = fine[refinement * k]!;
    if (!(Math.hypot(a.x - b.x, a.y - b.y) <= 1e-12 * scale)) {
      throw new RangeError('the refined grid does not have the lines of its base grid');
    }
  }
  const heights: number[] = [];
  for (let k = 0; k < n; k++) {
    for (let m = 0; m < refinement; m++) {
      const t = m / refinement;
      heights.push(baseHeights[k]! * (1 - t) + baseHeights[k + 1]! * t);
    }
  }
  heights.push(baseHeights[n]!);
  return heights;
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

/** Steps of the captured solution on the base grid that places the first shock. */
const CAPTURED_START_STEPS = 3000;
/**
 * Margin of a two-scale nose's outer boundary over the shock captured on
 * the generator's grid, as a fraction of the shock's height along each
 * line (secondCapture). The captured shock then lies about two thirds of
 * the way up each line.
 */
const BOUNDARY_MARGIN = 0.5;
/** ... and at least this many cells of the base grid above the captured shock. */
const BOUNDARY_CELLS = 3;

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
  const blunt = !Number.isFinite(noseTipSlope(body.nose))
    ? bluntFitFamily(body, { mach: options.mach, gamma: options.gamma, nj: FITTED_BASE_NJ })
    : null;
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
          ? fittedFlow(blunt(refinement), flowOptions.maxIterations)
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
