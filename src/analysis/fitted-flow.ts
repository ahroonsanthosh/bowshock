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
import { noseBaseSlope, noseTipSlope } from '../geometry/nose';
import {
  bluntBodyGrid,
  gridOnLines,
  outerCellHeight,
  withFixedFractions,
  type BluntGrid,
  type BluntGridOptions,
  type GridLine,
} from '../grid/blunt-grid';
import { FITTED_QUALITY_LIMITS, gridQuality, qualityFailures } from '../grid/quality';
import { columnPositions } from '../grid/spacing';
import { gridFromFunction, nodeIndex, type StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';
import { capturedShockHeights, fitShock, type ShockFit } from '../solver/shock-fitting';
import { normalShock } from '../validation/gas-dynamics';
import { coneFlowField, taylorMaccoll } from '../validation/taylor-maccoll';
import { refineUntilVerified, type VerifiedValue } from '../verification/grid-convergence';
import { forebodyPressureDrag } from './forces';
import {
  CPU_NOISE,
  ORDER_TOLERANCE,
  TWO_SCALE_DRAG_FLOOR,
  freeStreamAt,
  outflowMach,
} from './verified-drag';

export interface FittedFlowOptions {
  readonly mach: number;
  readonly gamma: number;
  /** Cells from the body to the shock on the base grid. */
  readonly nj: number;
  /** Refinement of the base grid: 1, 2, 4, ... */
  readonly refinement: number;
  readonly maxIterations: number;
  /**
   * Sharp noses: the density of the columns along the body, times the
   * usual layout's (default 1). FALLBACK_COLUMN_DENSITY lays out the
   * family solved where the usual one fails the fitted grids' gates.
   */
  readonly columnDensity?: number;
}

/**
 * Column density of the family a sharp nose is solved on again where its
 * usual family fails the fitted grids' gates (fittedGridFailure): the
 * wall cells at the end of a long solved cylinder at low Mach numbers,
 * flattened under a far shock, exceed the aspect limit of 13 (13.7 and
 * 14.1 on a 3-caliber tangent ogive at Mach 1.2, nj = 40 and 80) and
 * reach 8.5 at this density. A family at this density gives the usual
 * family's value to 1.5e-5 on a 3-caliber tangent ogive at Mach 1.35
 * (docs/design/0006-shock-fitting.md).
 */
export const FALLBACK_COLUMN_DENSITY = 1.5;

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

/** A blunt nose's solved body (solvedBluntBody), and its start grid. */
export interface SolvedBluntBody {
  readonly body: Body;
  /** The base grid of the family (the captured start's), on the captured outer boundary. */
  readonly base: BluntGrid;
}

/**
 * The body a blunt nose's fit solves: solvedBody's, its cylinder
 * lengthened a caliber at a time, by at most MAX_BLUNT_EXTENSION calibers,
 * until the start grid's neighbouring cells differ in size by no more
 * than the fitted grids' gate allows. The C grid's lines average the body
 * normal over a window that closes at the end of the body (keeping the
 * outflow plane vertical); on a short cylinder at low Mach numbers, where
 * the outer boundary lies far out, they turn vertical over the last few
 * cells, which then fan out (docs/design/0006-shock-fitting.md,
 * "Ellipsoids at low Mach numbers"). If no length passes, the shortest is
 * solved, and the fitted grid's gates decide. As for solvedBody, the drag
 * is that of the body asked for wherever the flow leaves its end
 * supersonically (baseMach).
 */
export function solvedBluntBody(asked: Body, options: BluntFamilyOptions): SolvedBluntBody {
  const steps = solvedBluntSteps(asked, options);
  for (;;) {
    const step = steps.next();
    if (step.done === true) return step.value;
  }
}

/** Calibers of cylinder solvedBluntBody may add to solvedBody's. */
const MAX_BLUNT_EXTENSION = 7;

/** solvedBluntBody, yielding after each length it refuses (a page can return to its event loop). */
function* solvedBluntSteps(
  asked: Body,
  options: BluntFamilyOptions,
): Generator<void, SolvedBluntBody> {
  const shortest = solvedBody(asked);
  const caliber = 2 * asked.nose.baseRadius;
  let first: SolvedBluntBody | undefined;
  for (let extra = 0; ; extra++) {
    const body = { ...shortest, cylinderLength: shortest.cylinderLength + extra * caliber };
    // Not gated: only the start, the grids solved for the drag are (as
    // bluntFitFamily's lines).
    const base = bluntBodyGrid(body, { nj: options.nj, mach: options.mach, gated: false });
    // A two-scale nose's family is built on its captured shock
    // (secondCapture), so the generator's own grid says nothing of it: its
    // cylinder is solvedBody's, and the fitted grids' gates decide.
    if (base.twoScale) return { body, base };
    if (gridQuality(base.grid).maxSizeRatio <= FITTED_QUALITY_LIMITS.maxSizeRatio) {
      return { body, base };
    }
    first ??= { body, base };
    if (extra === MAX_BLUNT_EXTENSION) return first;
    yield;
  }
}

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
 * behind it is 3.3% below the Taylor-Maccoll value of an endless cone on
 * 20 cells across, 1.7% on 80, still changing.
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

/**
 * Why the grid a fitted shock settled on is not served, or undefined if it
 * is: the gates set for fitted grids on measurement (FITTED_QUALITY_LIMITS),
 * a limit of the grids rather than of the flow.
 */
export function fittedGridFailure(grid: StructuredGrid): string | undefined {
  const failures = qualityFailures(gridQuality(grid), FITTED_QUALITY_LIMITS);
  return failures.length > 0
    ? `the grid on the fitted shock fails its quality checks (${failures.join('; ')}): a limit of the present grids, not of the flow`
    : undefined;
}

/**
 * Why the converged flow of a problem is not served, or undefined if it
 * is: the grid the shock settled on must meet the gates set for fitted
 * grids on measurement (FITTED_QUALITY_LIMITS), the flow must leave the
 * grid supersonic, where the outflow condition holds, and nothing behind
 * the end of the body asked for may reach the body (baseMach). The same
 * checks on the CPU and the GPU.
 */
export function fittedCaseFailure(
  problem: FitProblem,
  grid: StructuredGrid,
  cell: (i: number, j: number) => Primitive2D,
): string | undefined {
  const gridFailure = fittedGridFailure(grid);
  if (gridFailure !== undefined) return gridFailure;
  const outflow = outflowMach(problem.configFor(grid, []), cell);
  if (!(outflow > 1)) {
    return `the flow leaves the grid at an axial Mach number of ${outflow.toFixed(3)}, where the outflow condition does not hold; a longer body behind the nose, or a higher Mach number, is needed`;
  }
  const base = baseMach(problem, grid, cell);
  if (!(base > 1)) {
    return `the flow at the end of the body is subsonic (axial Mach number ${base.toFixed(3)}), so what lies behind the base could reach the body ahead of it, and the base is not modelled; a longer body behind the nose, or a higher Mach number, is needed`;
  }
  return undefined;
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
  const density = options.columnDensity ?? 1;
  const xs = columnPositions(breakpoints, (x) => density / spacing(x), refinement);
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
  // The inflow plane, normal to the axis, imposes all four states of the
  // tip cone's conical flow. The axial Mach number of that flow is least on
  // the surface: tested there, on the tip cone itself, so the test does not
  // depend on the grid. Where it exceeds 1 the flow crosses the plane
  // supersonically. Where it does not, but the surface flow is supersonic
  // and the nose meets the body tangentially, the drag still converges at
  // second order, to a value that moving the plane does not change, and a
  // second, differently laid out family converges to the same value
  // (measured on tangent ogives of 3 calibers at Mach 1.35 and 2 calibers
  // at Mach 1.6, within 1.5e-5 and 2.0e-6, 0006). At a corner
  // the cells ahead of it converge at an order of about 0.35, and where the
  // surface flow is subsonic the body behind the tip reaches it, with no
  // such reference measured yet: both refused.
  const surface = conical(tipAngle);
  const surfaceSound = Math.sqrt((gamma * surface.p) / surface.rho);
  const surfaceMach = Math.hypot(surface.u, surface.v) / surfaceSound;
  const axialMach = surface.u / surfaceSound;
  if (!(axialMach > 1) && (!(surfaceMach > 1) || noseBaseSlope(body.nose) > 0)) {
    const degrees = ((tipAngle * 180) / Math.PI).toFixed(1);
    throw new RangeError(
      surfaceMach > 1
        ? `at Mach ${mach} the flow behind a tip of ${degrees} deg half-angle crosses the solver's starting plane, normal to the axis, at an axial Mach number of ${axialMach.toFixed(2)} at the surface, below 1, which this solver handles only where the nose meets the body without a corner: at a corner the drag converges too slowly to be verified; this needs a sharper or longer nose, a nose tangent to the body, or a higher Mach number`
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
  /** The body solved (solvedBluntBody). */
  readonly body: Body;
  /** The base grid's lines. */
  readonly lines: readonly GridLine[];
  /** The captured shock's heights along them (capturedShockHeights). */
  readonly heights: readonly number[];
  /** The captured grid, reaching past the shock to the outer boundary. */
  readonly grid: StructuredGrid;
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
  let stage = bluntCapture(solvedBluntBody(asked, options), options);
  stage.solver.iterate(CAPTURED_START_STEPS);
  const second = secondCapture(options, stage);
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
  const steps = solvedBluntSteps(asked, options);
  let step = steps.next();
  while (step.done !== true) {
    run.signal?.throwIfAborted();
    await run.pause();
    step = steps.next();
  }
  let stage = bluntCapture(step.value, options);
  const total = (stage.grid.twoScale ? 2 : 1) * CAPTURED_START_STEPS;
  let done = 0;
  const capture = async (s: CaptureStage) => {
    for (let n = 0; n < CAPTURED_START_STEPS;) {
      run.signal?.throwIfAborted();
      const chunk = Math.min(run.chunk, CAPTURED_START_STEPS - n);
      s.solver.iterate(chunk);
      n += chunk;
      done += chunk;
      run.onProgress?.(done, total);
      await run.pause();
    }
  };
  await capture(stage);
  const second = secondCapture(options, stage);
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
  readonly body: Body;
  readonly grid: BluntGrid;
  readonly solver: Euler2D;
  readonly start: () => BluntStart;
}

/**
 * The captured-shock problem on a blunt family's base grid, from the free
 * stream: the generator's own grid, or on a two-scale nose the grid built
 * on the first captured shock (secondCapture), whose boundary the
 * family's grids then share.
 */
function bluntCapture(
  { body, base }: SolvedBluntBody,
  options: BluntFamilyOptions,
  outerBoundary?: OuterBoundary,
): CaptureStage {
  const { mach, gamma } = options;
  const free = freeStreamAt(mach, gamma).state;
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
    body,
    grid: base,
    solver,
    start: () => ({
      body,
      lines: base.lines,
      heights: capturedShockHeights(solver, base.grid, base.lines, free),
      grid: base.grid,
      cell: (i, j) => solver.primitive(i, j),
      ...(outerBoundary ? { outerBoundary } : {}),
    }),
  };
}

/**
 * The second stage of a two-scale nose's start, or null on a nose whose
 * generator's boundary is at the body scale (spheres and ellipsoids). The
 * generator's boundary is placed at the scale of the tip's blunt part, so
 * that the lines near the tip are sized for it, but is generous at the
 * body scale, where it keeps the angle the blunt bodies need: on a
 * 3-caliber Haack nose at Mach 2 the captured shock lies at a tenth of its
 * height at the tip and 0.42 along the nose, and the lines' spacing and
 * node fractions are sized from the boundary. So the grid the family
 * starts on is built on that captured shock, pushed out by
 * BOUNDARY_MARGIN of its height along each line and at least
 * BOUNDARY_CELLS cells of the base grid (along the cylinder, where the
 * lines are long and their outer cells stretched, the fraction alone
 * leaves two), and the shock captured on it is the family's start. Not
 * gated: only the start; the grids solved for the drag are
 * (fittedCaseFailure).
 */
function secondCapture(options: BluntFamilyOptions, first: CaptureStage): CaptureStage | null {
  if (!first.grid.twoScale) return null;
  const { body } = first;
  const R = body.nose.baseRadius;
  const free = freeStreamAt(options.mach, options.gamma).state;
  const heights = capturedShockHeights(first.solver, first.grid.grid, first.grid.lines, free);
  const distances = heights.map((shock) => {
    let d = (1 + BOUNDARY_MARGIN) * shock;
    for (let k = 0; k < 20; k++) {
      d = Math.max(d, shock + BOUNDARY_CELLS * outerCellHeight(d, options.nj, R));
    }
    return d;
  });
  // The boundary only has to contain the shock, so it is smoothed further
  // than the start is (BOUNDARY_SMOOTHING passes of 1-2-1, mirrored at the
  // axis): a captured shock far from the body, as at Mach 1.2, is stepped
  // enough after the start's smoothing to bend the outer cells.
  for (let pass = 0; pass < BOUNDARY_SMOOTHING; pass++) {
    const copy = [...distances];
    const n = copy.length - 1;
    distances[0] = 0.5 * (copy[0]! + copy[1]!);
    for (let i = 1; i < n; i++) {
      distances[i] = 0.25 * copy[i - 1]! + 0.5 * copy[i]! + 0.25 * copy[i + 1]!;
    }
    distances[n] = 0.5 * (copy[n]! + copy[n - 1]!);
  }
  const outerBoundary = first.grid.lines.map((l, i) => {
    const d = distances[i]!;
    return { x: l.x + d * l.dx, y: l.y + d * l.dy };
  });
  // The captured shock's last height is its last column's, so the
  // boundary's last segment would bend flat where the shock still rises
  // (at Mach 1.2 by 30 deg, which jumps the last outer cells' widths by
  // 1.6): the last point continues the segment before it to the last line.
  const n = outerBoundary.length - 1;
  if (n >= 2) {
    const a = outerBoundary[n - 2]!;
    const b = outerBoundary[n - 1]!;
    const last = first.grid.lines[n]!;
    const y = b.y + ((last.x - b.x) * (b.y - a.y)) / (b.x - a.x);
    if (y > b.y) outerBoundary[n] = { x: last.x, y };
  }
  const base = bluntBodyGrid(body, {
    nj: options.nj,
    mach: options.mach,
    outerBoundary,
    gated: false,
  });
  return bluntCapture({ body, base }, options, outerBoundary);
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
  const { body } = start;
  const { mach, gamma, nj: baseNj } = options;
  const R = body.nose.baseRadius;
  const free = freeStreamAt(mach, gamma).state;
  const axis: Euler2DConfig['boundaries']['iMin'] = { kind: 'wall' };
  return (refinement) => {
    // Not gated: the grid each fit settles on is (fittedCaseFailure).
    const fine =
      refinement === 1
        ? start.lines
        : bluntBodyGrid(body, {
            nj: baseNj,
            refinement,
            mach,
            outerBoundary: start.outerBoundary,
            gated: false,
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
      initial: shockLayerStart(start, lines, refinement),
      firstNode: 'symmetry',
      drag: (wall) => forebodyDrag(wall, mach, gamma, R),
      askedEnd: bodyLength(asked),
    };
  };
}

/**
 * The captured start in each cell of a fitted grid on `lines`, refined by
 * `refinement` from the base grid: on the base grid's column, at the same
 * fraction of the shock layer, linear between the captured cells either
 * side. The fitted grid ends at the shock and the captured one far beyond
 * it, so the cell of the same index would lie 1.5 to 1.7 times farther
 * out, and the outer part of the layer would start in the free stream.
 */
function shockLayerStart(
  start: BluntStart,
  lines: readonly GridLine[],
  refinement: number,
): (i: number, j: number) => Primitive2D {
  const { grid } = start;
  // Fraction of the captured shock's height at node (i, j) of the captured grid.
  const fraction = (i: number, j: number) => {
    const l = start.lines[i]!;
    const k = nodeIndex(grid, i, j);
    return ((grid.x[k]! - l.x) * l.dx + (grid.y[k]! - l.y) * l.dy) / start.heights[i]!;
  };
  const centre = (i: number, j: number) =>
    0.25 * (fraction(i, j) + fraction(i + 1, j) + fraction(i, j + 1) + fraction(i + 1, j + 1));
  return (i, j) => {
    const a = lines[i]!.fractions!;
    const b = lines[i + 1]!.fractions!;
    const s = 0.25 * (a[j]! + a[j + 1]! + b[j]! + b[j + 1]!);
    const column = Math.floor(i / refinement);
    let jj = 0;
    while (jj < grid.nj - 2 && centre(column, jj + 1) < s) jj++;
    const c0 = centre(column, jj);
    const t = Math.min(Math.max((s - c0) / (centre(column, jj + 1) - c0), 0), 1);
    const p = start.cell(column, jj);
    const q = start.cell(column, jj + 1);
    return {
      rho: p.rho + t * (q.rho - p.rho),
      u: p.u + t * (q.u - p.u),
      v: p.v + t * (q.v - p.v),
      p: p.p + t * (q.p - p.p),
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

/**
 * Why a blunt nose the fitted solver could solve is not served, or
 * undefined if it is. Ellipsoids are served (0006). Of the noses solved as
 * two-scale families (docs/design/0004-grids.md), only the Von Karman
 * (LD-Haack, C = 0) nose has been checked against a reference, the method
 * of characteristics from the fitted flow (0006), and it is served only
 * inside the outline of the lengths and Mach numbers checked
 * (VON_KARMAN_REFERENCES); other two-scale noses (the other Haack noses,
 * the power series) are refused, as are sharp tips whose shock detaches
 * (by sharpFitProblem).
 */
export function bluntNoseRefusal(body: Body, mach: number): string | undefined {
  const { shape, length, baseRadius } = body.nose;
  if (Number.isFinite(noseTipSlope(body.nose)) || shape.kind === 'ellipsoid') return undefined;
  if (!(shape.kind === 'haack' && shape.parameter === 0)) {
    return 'of the blunt noses whose tip curvature is unbounded, only the Von Karman (LD-Haack) nose has been checked against a reference so far';
  }
  const calibers = length / (2 * baseRadius);
  if (insideOutline(VON_KARMAN_REFERENCES, [calibers, mach])) return undefined;
  const checked = VON_KARMAN_REFERENCES.map(([c, m]) => `${c} at Mach ${m}`).join(', ');
  return `a Von Karman nose of ${calibers} calibers at Mach ${mach} lies outside the referenced range (the outline of the noses checked against a reference, in calibers: ${checked})`;
}

/**
 * The Von Karman noses checked against the method of characteristics
 * (0006, "Two-scale noses"): nose length in calibers, Mach number.
 */
export const VON_KARMAN_REFERENCES: readonly (readonly [number, number])[] = [
  [1, 1.5],
  [1, 2],
  [1, 3],
  [3, 2],
  [3, 3],
  [5, 1.5],
];

/**
 * Whether a point lies inside the outline (the convex hull) of the given
 * points, or on it: a point, a segment or a polygon. Within 1e-9 of the
 * points' extent in each coordinate.
 */
export function insideOutline(
  points: readonly (readonly [number, number])[],
  [x, y]: readonly [number, number],
): boolean {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const sx = Math.max(...xs) - Math.min(...xs) || 1;
  const sy = Math.max(...ys) - Math.min(...ys) || 1;
  // Scaled to the points' extent, so that calibers and Mach numbers count alike.
  const scaled = points.map(([px, py]) => [px / sx, py / sy] as const);
  const p = [x / sx, y / sy] as const;
  const tolerance = 1e-9;
  const cross = (o: readonly number[], a: readonly number[], b: readonly number[]) =>
    (a[0]! - o[0]!) * (b[1]! - o[1]!) - (a[1]! - o[1]!) * (b[0]! - o[0]!);
  // The hull, counterclockwise (Andrew's monotone chain).
  const sorted = [...scaled].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = (list: (readonly [number, number])[]) => {
    const h: (readonly [number, number])[] = [];
    for (const q of list) {
      while (h.length >= 2 && cross(h[h.length - 2]!, h[h.length - 1]!, q) <= tolerance) h.pop();
      h.push(q);
    }
    h.pop();
    return h;
  };
  const hull = [...half(sorted), ...half([...sorted].reverse())];
  if (hull.length <= 2) {
    // A point or a segment: within the tolerance of it.
    const [a, b] = [hull[0] ?? sorted[0]!, hull[1] ?? hull[0] ?? sorted[0]!];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t =
      dx * dx + dy * dy > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy) : 0;
    const u = Math.min(Math.max(t, 0), 1);
    return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy) <= tolerance;
  }
  return hull.every((a, k) => cross(a, hull[(k + 1) % hull.length]!, p) >= -tolerance);
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
/** Passes of 1-2-1 smoothing of that boundary's distances along the lines. */
const BOUNDARY_SMOOTHING = 50;

/**
 * The allowance for an error the grid family cannot show, relative: the
 * caller's (FITTED_DRAG_FLOOR on the page), raised to TWO_SCALE_DRAG_FLOOR
 * on a two-scale nose (a start with its own outer boundary), whose
 * extrapolation from three grids misses its references by up to 2.44e-4
 * (0006, "Two-scale noses").
 */
export function fittedDragFloor(floor: number, start: BluntStart | null): number {
  return start?.outerBoundary ? Math.max(floor, TWO_SCALE_DRAG_FLOOR) : floor;
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
  /** As VerifiedDragOptions.onFallback (src/analysis/verified-drag.ts). */
  readonly onFallback?: (refinement: number, reason: string) => void;
}

export type VerifiedFittedDrag =
  | (VerifiedValue & {
      readonly kind: 'solved';
      /** The column density of the family solved, where not the usual layout's. */
      readonly columnDensity?: number;
      /** The allowance included in the band, relative (fittedDragFloor). */
      readonly floor: number;
    })
  | {
      readonly kind: 'not-converged' | 'invalid';
      readonly refinement: number;
      readonly reason: string;
    };

/** Base grid cells across, as for the captured-shock grids. */
const FITTED_BASE_NJ = 20;

/**
 * The forebody pressure drag with the bow shock fitted, on grids refined
 * by 2 up to the finest allowed, with its measured error band: the
 * procedure of src/analysis/verified-drag.ts with the CPU fitted-shock
 * solver. A grid whose fit does not converge, or whose flow the page's
 * checks refuse (fittedCaseFailure), stops the run without a value, but
 * for a sharp nose whose grid fails only the quality gates: its whole
 * family is then solved again with FALLBACK_COLUMN_DENSITY times as many
 * columns, and refused only if that family is too.
 */
export async function verifiedFittedDrag(
  body: Body,
  options: VerifiedFittedDragOptions,
): Promise<VerifiedFittedDrag> {
  const refusal = bluntNoseRefusal(body, options.mach);
  if (refusal !== undefined) return { kind: 'invalid', refinement: 1, reason: refusal };
  const familyOptions = { mach: options.mach, gamma: options.gamma, nj: FITTED_BASE_NJ };
  const start = Number.isFinite(noseTipSlope(body.nose)) ? null : bluntStart(body, familyOptions);
  const blunt = start ? bluntFitFamily(body, familyOptions, start) : null;
  const floor = fittedDragFloor(options.floor, start);
  const family = (columnDensity?: number) =>
    refineUntilVerified(
      (refinement) => {
        const flowOptions = {
          mach: options.mach,
          gamma: options.gamma,
          nj: FITTED_BASE_NJ,
          refinement,
          maxIterations: options.iterationsPerRefinement * refinement,
          ...(columnDensity === undefined ? {} : { columnDensity }),
        };
        const problem = blunt ? blunt(refinement) : sharpFitProblem(body, flowOptions);
        const { fit, drag } = fittedFlow(problem, flowOptions.maxIterations);
        if (!fit.converged) {
          throw new FitNotConverged(
            refinement,
            `the fit stopped after ${fit.iterations} iterations with the shock moving at ${fit.maxSpeed.toExponential(1)} of the sound speed and a residual of ${fit.residual.toExponential(1)}`,
          );
        }
        const gridFailure = fittedGridFailure(fit.grid);
        if (gridFailure !== undefined) throw new GridRefused(refinement, gridFailure);
        const failure = fittedCaseFailure(problem, fit.grid, (i, j) => fit.solver.primitive(i, j));
        if (failure !== undefined) throw new FitRefused(refinement, failure);
        options.onLevel?.(refinement, drag, fit);
        return drag;
      },
      {
        orderTolerance: ORDER_TOLERANCE,
        noise: CPU_NOISE,
        floor,
        tolerance: options.tolerance,
        maxRefinement: options.maxRefinement,
      },
    );
  try {
    try {
      return { ...(await family()), kind: 'solved', floor };
    } catch (error) {
      if (blunt !== null || !(error instanceof GridRefused)) throw error;
      options.onFallback?.(error.refinement, error.message);
      try {
        const result = await family(FALLBACK_COLUMN_DENSITY);
        return { ...result, kind: 'solved', columnDensity: FALLBACK_COLUMN_DENSITY, floor };
      } catch (fallbackError) {
        if (!(fallbackError instanceof FitRefused)) throw fallbackError;
        throw new FitRefused(
          fallbackError.refinement,
          `${fallbackError.message} (with ${FALLBACK_COLUMN_DENSITY} times as many columns, solved because the usual grid at refinement ${error.refinement} fails its quality checks)`,
        );
      }
    }
  } catch (error) {
    // FitRefused extends FitNotConverged: tested first.
    if (error instanceof FitRefused) {
      return { kind: 'invalid', refinement: error.refinement, reason: error.message };
    }
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

class FitRefused extends FitNotConverged {}

/** A grid that fails only the fitted grids' quality gates (fittedGridFailure). */
class GridRefused extends FitRefused {}
