/**
 * The transonic forebody pressure drag (Mach 1 to 1.2) with the error band
 * its own solve measures, as the page serves it (design record 0013, "The
 * path to the page" and the serving rules of 2026-10-21):
 *
 * 1. the nose on its family of nested grids, r = 1, 2, 4, 8 (16 on
 *    request), on far boundaries at 100.6 radii and 10 calibers of
 *    cylinder, each grid started from the coarser one's solution and
 *    solved until its drag settles, then watched for a few more checks to
 *    measure how much it still wanders;
 * 2. the procedure (gridConvergence) on the four finest grids, with the
 *    noise measured on those grids (never an assumed one);
 * 3. the far boundaries' and the cylinder's allowances (domainAllowance)
 *    from the base grid on nested domains: 55.1 and 224.2 radii, 5 and
 *    20 calibers;
 * 4. the band: the procedure's, plus the floor, plus both allowances.
 *
 * A case is refused only when no band can be given, with the reason. The
 * engine is passed in: the two-float GPU solver on the page
 * (gpu-transonic.ts), the CPU engine in tests.
 */

import { Euler2D } from '../engine-cpu/euler2d';
import type { Body } from '../geometry/body';
import { noseTipSlope } from '../geometry/nose';
import type { Primitive2D } from '../scheme/flux';
import { taylorMaccoll } from '../validation/taylor-maccoll';
import { domainAllowance, type DomainAllowance } from '../verification/domain-allowance';
import { gridConvergence, type ConvergenceEstimate } from '../verification/grid-convergence';
import { SettlingValue } from '../verification/iterative-convergence';
import { GpuMemoryLimitError } from '../engine-gpu/gpu-common';
import type { FlowSource } from '../render/flow-renderer';
import { transonicProblem, type TransonicOptions, type TransonicProblem } from './transonic-flow';

type Nested = NonNullable<TransonicOptions['nested']>;
import { FITTED_DRAG_FLOOR, ORDER_TOLERANCE } from './verified-drag';

/** Primitive state of cell (i, j). */
export type TransonicCells = (i: number, j: number) => Primitive2D;

/** A steady solver of one grid, on the CPU or the GPU. */
export interface TransonicGridSolver {
  /** Start from these cells, the CFL number's ramp from `cfl`. */
  start(cells: TransonicCells, cfl: number): Promise<void>;
  iterate(steps: number): Promise<void>;
  /** The forebody drag coefficient of the current state, evaluated in double precision. */
  drag(): Promise<number>;
  /** The current state, in double precision. */
  cells(): Promise<TransonicCells>;
  /**
   * The flow to draw as it converges, on the solver's device (GPU
   * engines only): its buffers live until destroy().
   */
  live?(): FlowSource;
  destroy(): void;
}

export interface TransonicEngine {
  (problem: TransonicProblem): Promise<TransonicGridSolver>;
  /**
   * Why this engine cannot take a grid of this size (its device's
   * memory or dispatch limits), or null: checked for the finest grid
   * before any solve, so that such a case is refused at once.
   */
  readonly refuses?: (cells: { readonly ni: number; readonly nj: number }) => string | null;
}

/**
 * The floor: an allowance for what a captured shock's family cannot show,
 * relative to the value. As the fitted solver's until the transonic
 * validation cases give a reason for another (0013, serving rule 3): the
 * procedure's own extrapolation missed the exact values by 6e-6 (cone,
 * Mach 1.2) and 1e-7 (cone, 1.1, r = 2 to 16).
 */
export const TRANSONIC_DRAG_FLOOR = FITTED_DRAG_FLOOR;
/** A grid's drag has settled when it changes by less than this, relative (SettlingValue). */
export const SETTLE_NOISE = 1e-7;
/** Or when its remaining change, estimated geometrically, is below this on two checks. */
export const GEOMETRIC_NOISE = 1e-9;
/** Checks after settling over which the drag's wander is measured. */
export const WANDER_CHECKS = 4;
/**
 * The lowest Mach number served: 1.05, the lowest at which a case is
 * certified with a negligible far-field allowance (the 7 deg cone, 0013).
 * Below it the solve refuses ('near-sonic') until the allowance rule
 * passes its pre-registered test there: on the cone at Mach 1.01 to 1.02
 * the far boundaries' effect changes sign as the domain grows, which the
 * rule tested so far does not bound (review of aed95b0, B1).
 */
export const NEAR_SONIC_LIMIT = 1.05;
/**
 * The family's far boundaries (radii, at least) and cylinder (calibers).
 * A long nose gets far boundaries 10 nose lengths out instead
 * (transonicDomains), so that the allowances' smaller domain still lies
 * beyond the four nose lengths the grid needs.
 */
export const FAMILY_DOMAIN = { farField: 100, cylinder: 10 } as const;
/** The allowances' nested domains, as multiples of the family's far boundaries. */
export const FAR_FIELD_SCALES = [0.5, 2] as const;
/** The allowances' nested cylinders (calibers). */
export const CYLINDER_DOMAINS = [5, 20] as const;

/** The family's domain and the allowances' nested ones, for this body (radii and calibers). */
export interface TransonicDomains {
  readonly family: { readonly farField: number; readonly cylinder: number };
  readonly farField: readonly [number, number, number];
  readonly cylinder: readonly [number, number, number];
}

export function transonicDomains(body: Body): TransonicDomains {
  const R = body.nose.baseRadius;
  const farField = Math.max(FAMILY_DOMAIN.farField, (10 * body.nose.length) / R);
  return {
    family: { farField, cylinder: FAMILY_DOMAIN.cylinder },
    farField: [FAR_FIELD_SCALES[0] * farField, farField, FAR_FIELD_SCALES[1] * farField],
    cylinder: [CYLINDER_DOMAINS[0], FAMILY_DOMAIN.cylinder, CYLINDER_DOMAINS[1]],
  };
}

export interface TransonicDragOptions {
  readonly mach: number;
  readonly gamma: number;
  /** Finest refinement to solve: 8, or 16 where the coarser grids leave the band unresolved. */
  readonly finest: number;
  /** Steps between checks of the drag on the base grid (times the refinement on the others). */
  readonly checkEvery?: number;
  /** Most steps on any one grid. */
  readonly maxSteps?: number;
  /** The CFL number a grid started from a coarser one's solution uses from its first step. */
  readonly cfl?: number;
  /**
   * Solve below NEAR_SONIC_LIMIT anyway, for the offline test of the
   * allowance rule there; the page never sets it.
   */
  readonly allowNearSonic?: boolean;
  /** After each check of a grid's drag. */
  readonly onProgress?: (progress: TransonicProgress) => void;
  /**
   * The grid being solved, to draw as it converges (GPU engines): given
   * when a grid starts, every grid of the family and of the allowances in
   * turn (onProgress says which), and null just before its buffers are
   * released, so that a view can freeze the picture in the callback.
   */
  readonly onLive?: (source: FlowSource | null) => void;
  readonly onLevel?: (level: TransonicLevel) => void;
  readonly signal?: AbortSignal;
}

/**
 * A check of a grid's drag during a solve: a grid of the family, or a
 * base grid of an allowance, with which allowance (the far boundaries or
 * the cylinder) and which of its three domains (0 the smaller, 2 the
 * larger; 1, the family's own, is the family's base grid) and that
 * domain's size (radii or calibers).
 */
export type TransonicProgress =
  | {
      readonly what: 'grid';
      readonly refinement: number;
      readonly steps: number;
      readonly drag: number;
    }
  | {
      readonly what: 'allowance';
      readonly allowance: 'farField' | 'cylinder';
      readonly domain: 0 | 2;
      readonly size: number;
      readonly refinement: 1;
      readonly steps: number;
      readonly drag: number;
    };

/** Which solve a grid serves, for its progress reports. */
type GridRole =
  | { readonly what: 'grid' }
  | {
      readonly what: 'allowance';
      readonly allowance: 'farField' | 'cylinder';
      readonly domain: 0 | 2;
      readonly size: number;
    };

/**
 * The r = 16 grid a refusal may offer (only when the solve stopped at
 * r = 8), with its expected work.
 */
export interface TransonicFinerGrid {
  readonly refinement: 16;
  readonly cells: number;
  /**
   * Its expected steps: r = 8's steps times their growth from r = 4 (at
   * least 1). An estimate on the high side: on the cone at Mach 1.1 (CPU,
   * LU-SGS) it gives 9,800 against the 7,300 measured.
   */
  readonly steps: number;
  /** Its expected cell updates: `steps` times `cells`. */
  readonly cellUpdates: number;
  /**
   * The cell updates this solve took (every grid of the family and of the
   * allowances), which a solve to r = 16 repeats before it reaches the
   * new grid.
   */
  readonly repeatedCellUpdates: number;
}

export interface TransonicLevel {
  readonly refinement: number;
  readonly cells: { readonly ni: number; readonly nj: number };
  readonly drag: number;
  readonly steps: number;
  readonly seconds: number;
  /**
   * The drag's uncertainty from the iteration, relative: the largest of
   * the settling test's noise, its remaining change estimated
   * geometrically, and its spread over WANDER_CHECKS checks after settling.
   */
  readonly noise: number;
}

export interface TransonicAllowance {
  /** Drag on the smaller, the family's own and the larger domain (base grid). */
  readonly values: readonly [number, number, number];
  /** Those domains: radii for the far boundaries, calibers for the cylinder. */
  readonly domains: readonly [number, number, number];
  readonly result: DomainAllowance;
}

/** Whether an exact solution exists for this nose at this Mach number, and which. */
export interface ReferenceNote {
  readonly exact: boolean;
  readonly note: string;
}

/**
 * Why a transonic solve gives no value, as a code the page words (the
 * sentence in `message` says the same with the case's numbers):
 * - 'near-sonic': below NEAR_SONIC_LIMIT (Mach 1.05), until the
 *   allowance rule passes its pre-registered test lower down (0013,
 *   serving rule 8);
 * - 'blunt-nose': the grids of blunt noses have no nested domains yet, so
 *   the far boundaries' allowance cannot be measured;
 * - 'no-band': the procedure gives no band from the grids (`estimate`
 *   says why; `finer` may offer one more grid);
 * - 'far-field', 'cylinder': that effect does not fall fast enough, as
 *   the domain grows, to bound what lies beyond (domainAllowance);
 * - 'domain': the grids cannot be built for this body (transonicGrid's
 *   reason in `message`);
 * - 'device-memory': a grid is too large for the engine's device.
 */
export type TransonicRefusalReason =
  'near-sonic' | 'blunt-nose' | 'no-band' | 'far-field' | 'cylinder' | 'domain' | 'device-memory';
export const TRANSONIC_REFUSAL_REASONS: readonly TransonicRefusalReason[] = [
  'near-sonic',
  'blunt-nose',
  'no-band',
  'far-field',
  'cylinder',
  'domain',
  'device-memory',
];

/**
 * Why a grid did not converge: 'not-settled', its drag did not settle
 * within the steps allowed; 'not-finite', its drag became NaN or infinite.
 */
export type TransonicNotConvergedReason = 'not-settled' | 'not-finite';
export const TRANSONIC_NOT_CONVERGED_REASONS: readonly TransonicNotConvergedReason[] = [
  'not-settled',
  'not-finite',
];

export type TransonicDrag =
  | {
      readonly kind: 'solved';
      /** The finest grid's drag coefficient. */
      readonly value: number;
      /**
       * The band's half-width, absolute: the drag lies within value +- band,
       * the convention of VerifiedDrag.uncertainty. It is the sum of `parts`,
       * each a half-width.
       */
      readonly band: number;
      readonly parts: {
        readonly grids: number;
        readonly floor: number;
        readonly farField: number;
        readonly cylinder: number;
      };
      readonly estimate: ConvergenceEstimate;
      /** The noise the procedure used: the largest of the levels' noises. */
      readonly noise: number;
      readonly levels: readonly TransonicLevel[];
      readonly allowances: {
        readonly farField: TransonicAllowance;
        readonly cylinder: TransonicAllowance;
      };
      readonly reference: ReferenceNote;
      readonly label: string;
    }
  | {
      readonly kind: 'refused';
      readonly reason: TransonicRefusalReason;
      readonly message: string;
      readonly levels: readonly TransonicLevel[];
      readonly estimate?: ConvergenceEstimate;
      readonly allowances?: {
        readonly farField: TransonicAllowance;
        readonly cylinder: TransonicAllowance;
      };
      /**
       * The finer grid that may give a band, where the procedure suggests
       * one, with its expected work, for the page to multiply by its own
       * measured rate of cell updates.
       */
      readonly finer?: TransonicFinerGrid;
    }
  | {
      readonly kind: 'not-converged';
      readonly refinement: number;
      readonly reason: TransonicNotConvergedReason;
      readonly message: string;
      /** The grids solved before it. */
      readonly levels: readonly TransonicLevel[];
    }
  | { readonly kind: 'cancelled'; readonly levels: readonly TransonicLevel[] };

class Cancelled extends Error {}

class NotConverged extends Error {
  constructor(
    readonly refinement: number,
    readonly reason: TransonicNotConvergedReason,
    message: string,
  ) {
    super(message);
  }
}

/**
 * The transonic forebody drag of `body` with its measured band (see the
 * module comment), solved with `engine`.
 */
export async function verifiedTransonicDrag(
  body: Body,
  options: TransonicDragOptions,
  engine: TransonicEngine,
): Promise<TransonicDrag> {
  const { mach, gamma } = options;
  if (!(mach >= 1 && mach < 1.2)) {
    throw new RangeError('the transonic solve serves Mach 1 to 1.2 (the fitted solver from 1.2)');
  }
  if (!(Number.isInteger(Math.log2(options.finest)) && options.finest >= 8)) {
    throw new RangeError('the finest refinement must be 8, 16, ...');
  }
  if (mach < NEAR_SONIC_LIMIT && options.allowNearSonic !== true) {
    return {
      kind: 'refused',
      reason: 'near-sonic',
      message: `below Mach ${NEAR_SONIC_LIMIT} the far boundaries' effect on the drag has no tested bound: on 100 radii it moves the drag by 2% (cone) to 10% (ogive) at Mach 1, and between Mach 1.01 and 1.02 it changes sign as the domain grows`,
      levels: [],
    };
  }
  if (!Number.isFinite(noseTipSlope(body.nose))) {
    return {
      kind: 'refused',
      reason: 'blunt-nose',
      message:
        'the far boundaries’ allowance needs nested domains, which the grids of blunt noses do not have yet',
      levels: [],
    };
  }
  const levels: TransonicLevel[] = [];
  // Cell updates so far, every grid counted.
  let work = 0;
  const domains = transonicDomains(body);
  const problemOf = (refinement: number, nested?: Nested) =>
    transonicProblem(body, {
      mach,
      gamma,
      refinement,
      ...domains.family,
      ...(nested === undefined ? {} : { nested }),
    });
  // Every base grid up front, and the finest grid's size against the
  // engine's limits: a body the domains do not fit, or a device too
  // small, is refused before anything is solved (review of aed95b0, S4).
  let problems: {
    readonly base: TransonicProblem;
    readonly farField: readonly [TransonicProblem, TransonicProblem];
    readonly cylinder: readonly [TransonicProblem, TransonicProblem];
  };
  try {
    problems = {
      base: problemOf(1),
      farField: [
        problemOf(1, { farField: domains.farField[0] }),
        problemOf(1, { farField: domains.farField[2] }),
      ],
      cylinder: [
        problemOf(1, { cylinder: domains.cylinder[0] }),
        problemOf(1, { cylinder: domains.cylinder[2] }),
      ],
    };
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return {
      kind: 'refused',
      reason: 'domain',
      message: `the transonic domain cannot be built for this body: ${error.message}`,
      levels,
    };
  }
  const cellsAt = (refinement: number) => ({
    ni: refinement * problems.base.config.grid.ni,
    nj: refinement * problems.base.config.grid.nj,
  });
  const tooLarge = engine.refuses?.(cellsAt(options.finest)) ?? null;
  if (tooLarge !== null) {
    return {
      kind: 'refused',
      reason: 'device-memory',
      message: `the finest grid (refinement ${options.finest}) is too large for this device: ${tooLarge}`,
      levels,
    };
  }
  try {
    // The family's base grid, then the allowances on base grids (as the
    // plan says: they cost seconds), then the finer grids.
    const baseSolution = await solveGrid(engine, problems.base, null, options, { what: 'grid' });
    const levelOf = (problem: TransonicProblem, result: GridSolution): TransonicLevel => ({
      refinement: problem.options.refinement,
      cells: { ni: problem.config.grid.ni, nj: problem.config.grid.nj },
      drag: result.drag,
      steps: result.steps,
      seconds: result.seconds,
      noise: result.noise,
    });
    work += baseSolution.cellUpdates;
    const baseLevel = levelOf(problems.base, baseSolution);
    levels.push(baseLevel);
    options.onLevel?.(baseLevel);
    const allowanceOf = async (
      allowance: 'farField' | 'cylinder',
      nested: readonly [TransonicProblem, TransonicProblem],
      sizes: readonly [number, number, number],
    ): Promise<{
      values: [number, number, number];
      noise: number;
      domains: readonly [number, number, number];
    }> => {
      const solveNested = (problem: TransonicProblem, domain: 0 | 2) =>
        solveGrid(engine, problem, null, options, {
          what: 'allowance',
          allowance,
          domain,
          size: sizes[domain],
        });
      const smaller = await solveNested(nested[0], 0);
      const larger = await solveNested(nested[1], 2);
      work += smaller.cellUpdates + larger.cellUpdates;
      return {
        values: [smaller.drag, baseSolution.drag, larger.drag],
        noise: Math.max(smaller.noise, baseSolution.noise, larger.noise),
        domains: sizes,
      };
    };
    const far = await allowanceOf('farField', problems.farField, domains.farField);
    const cylinder = await allowanceOf('cylinder', problems.cylinder, domains.cylinder);

    // The family's finer grids, each started from the one before.
    let previous: { problem: TransonicProblem; cells: TransonicCells } = {
      problem: problems.base,
      cells: baseSolution.cells,
    };
    for (let refinement = 2; refinement <= options.finest; refinement *= 2) {
      const problem = problemOf(refinement);
      const result: GridSolution = await solveGrid(engine, problem, previous, options, {
        what: 'grid',
      });
      work += result.cellUpdates;
      const level = levelOf(problem, result);
      levels.push(level);
      options.onLevel?.(level);
      previous = { problem, cells: result.cells };
    }

    // The procedure, with the noise measured.
    const noise = Math.max(...levels.slice(-4).map((l) => l.noise));
    const values = levels.map((l) => l.drag);
    const estimate = gridConvergence(values.slice(-4), { orderTolerance: ORDER_TOLERANCE, noise });
    const bandOf = (e: ConvergenceEstimate) => (e.kind === 'unresolved' ? 0 : e.uncertainty);
    const grids = bandOf(estimate);
    const farAllowance = domainAllowance(far.values, grids, far.noise);
    const cylinderAllowance = domainAllowance(cylinder.values, grids, cylinder.noise);
    const allowances = {
      farField: { values: far.values, domains: far.domains, result: farAllowance },
      cylinder: { values: cylinder.values, domains: cylinder.domains, result: cylinderAllowance },
    } as const;
    if (estimate.kind === 'unresolved') {
      const finer =
        finerMayResolve(values) &&
        options.finest === 8 &&
        (engine.refuses?.(cellsAt(16)) ?? null) === null
          ? finerGrid(levels, work)
          : undefined;
      return {
        kind: 'refused',
        reason: 'no-band',
        message: `no error band from the grids: ${estimate.reason}`,
        levels,
        estimate,
        allowances,
        ...(finer === undefined ? {} : { finer }),
      };
    }
    for (const [reason, what, a] of [
      ['far-field', 'far boundaries', farAllowance],
      ['cylinder', 'cylinder', cylinderAllowance],
    ] as const) {
      if (a.kind === 'refused') {
        return {
          kind: 'refused',
          reason,
          message: `the ${what}: ${a.reason}`,
          levels,
          estimate,
          allowances,
        };
      }
    }
    const value = estimate.value;
    const parts = {
      grids,
      floor: TRANSONIC_DRAG_FLOOR * Math.abs(value),
      farField: farAllowance.kind === 'refused' ? 0 : farAllowance.allowance,
      cylinder: cylinderAllowance.kind === 'refused' ? 0 : cylinderAllowance.allowance,
    };
    const reference = referenceNote(body, mach, gamma);
    return {
      kind: 'solved',
      value,
      band: parts.grids + parts.floor + parts.farField + parts.cylinder,
      parts,
      estimate,
      noise,
      levels,
      allowances,
      reference,
      label: reference.exact
        ? `verified by grid convergence; ${reference.note}`
        : `verified by grid convergence, with no exact reference at this Mach number (${reference.note}); the procedure was validated against exact solutions on the cone at Mach 1.1 and 1.2 and the ogive at 1.2`,
    };
  } catch (error) {
    if (error instanceof Cancelled) return { kind: 'cancelled', levels };
    if (error instanceof GpuMemoryLimitError) {
      return {
        kind: 'refused',
        reason: 'device-memory',
        message: `a grid is too large for this device: ${error.message}`,
        levels,
      };
    }
    if (error instanceof RangeError) {
      return {
        kind: 'refused',
        reason: 'domain',
        message: `the transonic domain cannot be built for this body: ${error.message}`,
        levels,
      };
    }
    if (error instanceof NotConverged) {
      return {
        kind: 'not-converged',
        refinement: error.refinement,
        reason: error.reason,
        message: error.message,
        levels,
      };
    }
    throw error;
  }
}

/** The r = 16 grid after r = 1 to 8, with its expected work (TransonicFinerGrid). */
function finerGrid(levels: readonly TransonicLevel[], work: number): TransonicFinerGrid {
  const [r4, r8] = levels.slice(-2) as [TransonicLevel, TransonicLevel];
  const cells = 4 * r8.cells.ni * r8.cells.nj;
  const steps = Math.round(r8.steps * Math.max(1, r8.steps / r4.steps));
  return { refinement: 16, cells, steps, cellUpdates: steps * cells, repeatedCellUpdates: work };
}

/**
 * Whether the four grids' refusal could be lifted by one more: the coarser
 * triple oscillates while the finer one is monotone (the cone at Mach 1.1
 * on r = 1 to 8, certified on r = 2 to 16).
 */
function finerMayResolve(values: readonly number[]): boolean {
  if (values.length < 4) return false;
  const [a, b, c, d] = values.slice(-4) as [number, number, number, number];
  const coarseOscillates = (b - a) * (c - b) < 0;
  const fineMonotone = (c - b) * (d - c) > 0 && Math.abs(d - c) < Math.abs(c - b);
  return coarseOscillates && fineMonotone;
}

/**
 * Whether an exact solution exists for this nose at this Mach number: for
 * a cone, Taylor-Maccoll's with its surface flow supersonic (so that the
 * shoulder cannot reach it). For other noses the page states none.
 */
export function referenceNote(body: Body, mach: number, gamma: number): ReferenceNote {
  if (body.nose.shape.kind === 'conical') {
    const angle = Math.atan(body.nose.baseRadius / body.nose.length);
    try {
      const flow = taylorMaccoll(mach, angle, gamma);
      if (flow.surfaceMach > 1) {
        return {
          exact: true,
          note: `an exact solution exists here (Taylor-Maccoll's, surface Mach number ${flow.surfaceMach.toFixed(3)}), and the band contains its error where measured`,
        };
      }
      return { exact: false, note: 'the cone’s conical surface flow would be subsonic' };
    } catch {
      return { exact: false, note: 'the cone’s shock would detach' };
    }
  }
  return { exact: false, note: 'none is computed for this nose' };
}

interface GridSolution {
  readonly drag: number;
  readonly steps: number;
  /** Steps times cells. */
  readonly cellUpdates: number;
  readonly seconds: number;
  readonly noise: number;
  readonly cells: TransonicCells;
}

/**
 * Solve one grid until its drag settles (SettlingValue at SETTLE_NOISE, or
 * the geometric remaining change below GEOMETRIC_NOISE on two checks),
 * then watch it for WANDER_CHECKS more checks.
 */
async function solveGrid(
  engine: TransonicEngine,
  problem: TransonicProblem,
  start: { problem: TransonicProblem; cells: TransonicCells } | null,
  options: TransonicDragOptions,
  role: GridRole,
): Promise<GridSolution> {
  const refinement = problem.options.refinement;
  const every = (options.checkEvery ?? 50) * refinement;
  const maxSteps = options.maxSteps ?? 400_000;
  const free = problem.freeStream.state;
  const solver = await engine(problem);
  const t0 = performance.now();
  let shown = false;
  try {
    if (start === null) {
      await solver.start(() => free, 1);
    } else {
      const ratio = refinement / start.problem.options.refinement;
      const coarse = start.cells;
      await solver.start(
        (i, j) => coarse(Math.floor(i / ratio), Math.floor(j / ratio)),
        options.cfl ?? 1000,
      );
    }
    if (options.onLive !== undefined && solver.live !== undefined) {
      options.onLive(solver.live());
      shown = true;
    }
    const settling = new SettlingValue(SETTLE_NOISE);
    const recent: number[] = [];
    let steps = 0;
    let drag = Number.NaN;
    let passes = 0;
    let remaining = Infinity;
    let settled = false;
    while (steps < maxSteps) {
      if (options.signal?.aborted === true) throw new Cancelled();
      await solver.iterate(every);
      steps += every;
      drag = await solver.drag();
      if (!Number.isFinite(drag)) {
        throw new NotConverged(refinement, 'not-finite', 'the drag is not finite');
      }
      options.onProgress?.(
        role.what === 'grid'
          ? { what: 'grid', refinement, steps, drag }
          : { ...role, refinement: 1, steps, drag },
      );
      recent.push(drag);
      if (recent.length > 3) recent.shift();
      remaining = geometricRemaining(recent);
      passes = remaining <= GEOMETRIC_NOISE * Math.abs(drag) ? passes + 1 : 0;
      if (settling.add(drag) || passes >= 2) {
        settled = true;
        break;
      }
    }
    if (!settled) {
      throw new NotConverged(
        refinement,
        'not-settled',
        `the drag did not settle within ${maxSteps} steps`,
      );
    }
    let low = drag;
    let high = drag;
    for (let k = 0; k < WANDER_CHECKS; k++) {
      if (options.signal?.aborted === true) throw new Cancelled();
      await solver.iterate(every);
      steps += every;
      drag = await solver.drag();
      low = Math.min(low, drag);
      high = Math.max(high, drag);
    }
    const scale = Math.abs(drag);
    const noise = Math.max(
      SETTLE_NOISE,
      (high - low) / scale,
      Number.isFinite(remaining) ? remaining / scale : 0,
    );
    return {
      drag,
      steps,
      cellUpdates: steps * problem.config.grid.ni * problem.config.grid.nj,
      seconds: (performance.now() - t0) / 1000,
      noise,
      cells: await solver.cells(),
    };
  } finally {
    if (shown) options.onLive?.(null);
    solver.destroy();
  }
}

/** Remaining change of a geometrically converging sequence from its last three values (as transonic-flow.ts). */
function geometricRemaining(values: readonly number[]): number {
  if (values.length < 3) return Infinity;
  const [a, b, c] = values.slice(-3) as [number, number, number];
  const d1 = b - a;
  const d2 = c - b;
  if (Math.abs(d2) <= 1e-12 * Math.abs(c)) return Math.abs(d2);
  if (d1 === 0) return Infinity;
  const r = Math.abs(d2 / d1);
  return r < 1 ? (Math.abs(d2) * r) / (1 - r) : Infinity;
}

/**
 * The CPU engine as a transonic engine: LU-SGS steps (or the given
 * relaxation), without Anderson acceleration, the CFL number ramped by 1.2
 * a step up to `cfl`.
 */
export function cpuTransonicEngine(cfl = 1000): TransonicEngine {
  return (problem) => {
    const solver = new Euler2D(problem.config);
    let current = 1;
    return Promise.resolve({
      start: (cells, startCfl) => {
        solver.setCellPrimitives(cells);
        current = startCfl;
        return Promise.resolve();
      },
      iterate: (steps) => {
        for (let n = 0; n < steps; n++) {
          solver.iterateImplicit(1, current);
          current = Math.min(cfl, current * 1.2);
        }
        return Promise.resolve();
      },
      drag: () => Promise.resolve(problem.drag(solver)),
      cells: () => {
        const q = solver.conserved();
        const copy = new Euler2D(problem.config);
        copy.setConserved(q);
        return Promise.resolve((i: number, j: number) => copy.primitive(i, j));
      },
      destroy: () => undefined,
    });
  };
}

/**
 * The nose term a transonic solve gives the total drag, in the shape the
 * page's noseComponentOf takes ({ value, uncertainty, grids }), so that
 * the transonic nose reaches the total exactly as the fitted one does and
 * the page never combines bands itself: `uncertainty` is the band's
 * half-width (value +- uncertainty), as for the fitted solver. A refusal
 * or a grid that did not converge gives a refusal with the reason; a solve
 * stopped gives null (no result: the total waits), as noseStateOf does.
 */
export type TransonicNoseTerm =
  | {
      readonly kind: 'solved';
      readonly solve: {
        readonly value: number;
        readonly uncertainty: number;
        readonly grids: number;
      };
    }
  | { readonly kind: 'refused'; readonly message: string };

export function transonicNoseTerm(result: TransonicDrag): TransonicNoseTerm | null {
  switch (result.kind) {
    case 'cancelled':
      return null;
    case 'refused':
      return { kind: 'refused', message: `the nose wave drag has no band: ${result.message}` };
    case 'not-converged':
      return {
        kind: 'refused',
        message: `the nose wave drag was not solved: the grid at refinement ${result.refinement} did not converge (${result.message})`,
      };
    case 'solved':
      return {
        kind: 'solved',
        solve: { value: result.value, uncertainty: result.band, grids: result.levels.length },
      };
  }
}
