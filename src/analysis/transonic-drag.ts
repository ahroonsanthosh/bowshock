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
 * 3. the far boundaries' and the cylinder's allowances (domainAllowance,
 *    the rule corrected for sign reversal) from the base grid on nested
 *    domains, solved right after the base grid: 55.1 and 224.2 radii (from
 *    Mach 1.05; below it the family moves to 224.2 radii and its
 *    neighbours are 100.6 and 408.7), 5 and 20 calibers;
 * 4. the band: the procedure's, plus the floor, plus both allowances;
 *    for a cone with an exact solution, the solve's error against it must
 *    lie inside the band, and the label reports it.
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
import { dampedOscillationBound, SettlingValue } from '../verification/iterative-convergence';
import { GpuMemoryLimitError, GpuPrecisionError } from '../engine-gpu/gpu-common';
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
   * The current state's density residual, root mean square per unit
   * volume, evaluated in double precision (Euler2D.densityResidualNorm).
   */
  residual(): Promise<number>;
  /**
   * Check the device's arithmetic on the current state: its residual
   * against the CPU's double one. Throws GpuPrecisionError if the low
   * parts are lost. Called once per solve, after the first steps of the
   * first grid (review of aed95b0, S5). Required, so that no engine skips
   * it by omission; the CPU engine, in double precision, passes at once.
   */
  checkPrecision(): Promise<void>;
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
 * procedure's own extrapolation missed the exact values by 6.8e-6 of the
 * value (5.6e-7 absolute; cone, Mach 1.2) and 1.1e-6 of it (1.0e-7
 * absolute; cone, 1.1, r = 2 to 16), both well within the floor of 7e-5 of
 * the value.
 */
export const TRANSONIC_DRAG_FLOOR = FITTED_DRAG_FLOOR;
/** A grid's drag has settled when it changes by less than this, relative (SettlingValue). */
export const SETTLE_NOISE = 1e-7;
/** Or when its remaining change, estimated geometrically, is below this on two checks. */
export const GEOMETRIC_NOISE = 1e-9;
/** Checks after settling over which the drag's wander is measured. */
export const WANDER_CHECKS = 4;
/**
 * Settled needs the residual at most this fraction of the largest seen on
 * the grid. Every converged grid of the CPU families fell further (to
 * 0.15 at worst: the cone's r = 8 at Mach 1.2, started from r = 4).
 */
export const RESIDUAL_FALL = 0.5;
/** A residual this many times its first value on a grid means the iteration diverges. */
export const RESIDUAL_DIVERGENCE = 100;
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
/**
 * Below NEAR_SONIC_LIMIT the family's own grid is its far boundaries'
 * grid continued, node for node, to this multiple of them (224.2 radii
 * for 100), and the allowances' far-boundary neighbours are the grid
 * itself and the grid continued to twice as far again (100.6 and 408.7
 * radii): the allowance rule's pre-registered next step, taken by the
 * owner's decision 7.3 of 2026-10-22 (0013, "Mach 1.0: the family moved to
 * 224.2 radii").
 */
export const NEAR_SONIC_FAMILY_SCALE = 2;
/** The allowances' nested cylinders (calibers). */
export const CYLINDER_DOMAINS = [5, 20] as const;

/**
 * The family's domain and the allowances' nested ones, for this body and
 * Mach number (radii and calibers, as asked of the grid: 50, 100, 200 and
 * 400 radii give 55.1, 100.6, 224.2 and 408.7 for a base radius of 1).
 * `family.nested`, where present, is the continuation of the family's own
 * grid (below NEAR_SONIC_LIMIT).
 */
export interface TransonicDomains {
  readonly family: {
    readonly farField: number;
    readonly cylinder: number;
    readonly nested?: { readonly farField: number };
  };
  readonly farField: readonly [number, number, number];
  readonly cylinder: readonly [number, number, number];
}

export function transonicDomains(body: Body, mach = NEAR_SONIC_LIMIT): TransonicDomains {
  const R = body.nose.baseRadius;
  const farField = Math.max(FAMILY_DOMAIN.farField, (10 * body.nose.length) / R);
  const cylinder = [CYLINDER_DOMAINS[0], FAMILY_DOMAIN.cylinder, CYLINDER_DOMAINS[1]] as const;
  if (mach < NEAR_SONIC_LIMIT) {
    const own = NEAR_SONIC_FAMILY_SCALE * farField;
    return {
      family: { farField, cylinder: FAMILY_DOMAIN.cylinder, nested: { farField: own } },
      farField: [farField, own, NEAR_SONIC_FAMILY_SCALE * own],
      cylinder,
    };
  }
  return {
    family: { farField, cylinder: FAMILY_DOMAIN.cylinder },
    farField: [FAR_FIELD_SCALES[0] * farField, farField, FAR_FIELD_SCALES[1] * farField],
    cylinder,
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
  /** Those domains as asked: radii for the far boundaries, calibers for the cylinder. */
  readonly domains: readonly [number, number, number];
  /** The grids' own distances (far radii, or cylinder lengths in calibers), which the rule uses. */
  readonly distances: readonly [number, number, number];
  readonly result: DomainAllowance;
}

/** Whether an exact solution exists for this nose at this Mach number, and which. */
export interface ReferenceNote {
  readonly exact: boolean;
  readonly note: string;
  /**
   * Where an exact solution exists, computed by the driver for this nose
   * and Mach number: its drag coefficient, the solve's error against it
   * (value - exact), and whether the band contains that error. Never part
   * of the band.
   */
  readonly check?: { readonly value: number; readonly error: number; readonly inside: boolean };
}

/** What the label names as the procedure's validation, where no exact solution exists. */
export const VALIDATION_CASES =
  'the procedure was validated against Taylor-Maccoll’s exact solution on the 7 deg cone at Mach 1.1 and 1.2, and against the method of characteristics on the 5-caliber ogive at 1.2';

/**
 * Why a transonic solve gives no value, as a code the page words (the
 * sentence in `message` says the same with the case's numbers):
 * - 'near-sonic': below NEAR_SONIC_LIMIT (Mach 1.05), until the
 *   allowance rule passes its pre-registered test lower down (0013,
 *   serving rule 8);
 * - 'blunt-nose': the grids of blunt noses have no nested domains yet, so
 *   the far boundaries' allowance cannot be measured;
 * - 'vertical-tip': a pointed nose whose surface meets the axis at a
 *   right angle (Haack noses, power-law noses below exponent 1): the H
 *   grid needs a finite tip angle, and the C grid has no nested domains;
 * - 'no-band': the procedure gives no band from the grids (`estimate`
 *   says why; `finer` may offer one more grid);
 * - 'far-field', 'cylinder': that effect does not fall fast enough, as
 *   the domain grows, to bound what lies beyond (domainAllowance);
 * - 'domain': the grids cannot be built for this body (transonicGrid's
 *   reason in `message`);
 * - 'device-memory': a grid is too large for the engine's device;
 * - 'device-precision': the device loses the low parts of its two-float
 *   arithmetic (its self-test, or its residual against the CPU's once per
 *   solve).
 */
export type TransonicRefusalReason =
  | 'near-sonic'
  | 'blunt-nose'
  | 'vertical-tip'
  | 'no-band'
  | 'far-field'
  | 'cylinder'
  | 'domain'
  | 'device-memory'
  | 'device-precision';
export const TRANSONIC_REFUSAL_REASONS: readonly TransonicRefusalReason[] = [
  'near-sonic',
  'blunt-nose',
  'vertical-tip',
  'no-band',
  'far-field',
  'cylinder',
  'domain',
  'device-memory',
  'device-precision',
];

/**
 * Why a grid did not converge: 'not-settled', its drag did not settle
 * within the steps allowed; 'not-finite', its drag became NaN or infinite;
 * 'diverging', its residual grew to RESIDUAL_DIVERGENCE times its first.
 */
export type TransonicNotConvergedReason = 'not-settled' | 'not-finite' | 'diverging';
export const TRANSONIC_NOT_CONVERGED_REASONS: readonly TransonicNotConvergedReason[] = [
  'not-settled',
  'not-finite',
  'diverging',
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

/** The transonic grids cannot be built for this body (transonicGrid's RangeError). */
class DomainError extends Error {}

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
    return body.nose.shape.kind === 'ellipsoid' || body.nose.tipRadius !== undefined
      ? {
          kind: 'refused',
          reason: 'blunt-nose',
          message:
            body.nose.tipRadius !== undefined
              ? 'a rounded (blunted) tip has not been checked against a reference yet, so its error is not known; and the far boundaries’ allowance needs nested domains, which the grids of blunt noses do not have yet'
              : 'the far boundaries’ allowance needs nested domains, which the grids of blunt noses do not have yet',
          levels: [],
        }
      : {
          kind: 'refused',
          reason: 'vertical-tip',
          message:
            'this nose is pointed but its surface meets the axis at a right angle, which the transonic grid for pointed noses cannot follow, and the grid for blunt noses has no nested domains for the far boundaries’ allowance yet',
          levels: [],
        };
  }
  const levels: TransonicLevel[] = [];
  // Cell updates so far, every grid counted.
  let work = 0;
  const domains = transonicDomains(body, mach);
  // A grid of the family, or of an allowance: the family's own grid with
  // its far boundaries or cylinder moved (nested), node for node.
  const problemOf = (refinement: number, nested?: Nested) => {
    const merged = { ...domains.family.nested, ...nested };
    try {
      return transonicProblem(body, {
        mach,
        gamma,
        refinement,
        farField: domains.family.farField,
        cylinder: domains.family.cylinder,
        ...(Object.keys(merged).length === 0 ? {} : { nested: merged }),
      });
    } catch (error) {
      // Only the grids' own refusals are 'domain' refusals; any other
      // RangeError is a fault and is thrown (re-review of dd6c423).
      if (error instanceof RangeError) throw new DomainError(error.message);
      throw error;
    }
  };
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
    if (!(error instanceof DomainError)) throw error;
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
    const baseSolution = await solveGrid(
      engine,
      problems.base,
      null,
      options,
      { what: 'grid' },
      true,
    );
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
    ): Promise<TransonicAllowance> => {
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
      const values = [smaller.drag, baseSolution.drag, larger.drag] as const;
      const distanceOf = (problem: TransonicProblem) =>
        allowance === 'farField'
          ? problem.grid.farRadius / body.nose.baseRadius
          : (problem.grid.xEnd - body.nose.length) / (2 * body.nose.baseRadius);
      const distances = [
        distanceOf(nested[0]),
        distanceOf(problems.base),
        distanceOf(nested[1]),
      ] as const;
      const noise = Math.max(smaller.noise, baseSolution.noise, larger.noise);
      return {
        values,
        domains: sizes,
        distances,
        result: domainAllowance(values, distances, noise),
      };
    };
    // The allowances do not depend on the family's band (0013, "The
    // allowance rule corrected for sign reversal"), so a refusal stops the
    // request here, after the base grids only.
    const allowances = {
      farField: await allowanceOf('farField', problems.farField, domains.farField),
      cylinder: await allowanceOf('cylinder', problems.cylinder, domains.cylinder),
    } as const;
    for (const [reason, what, a] of [
      ['far-field', 'far boundaries', allowances.farField.result],
      ['cylinder', 'cylinder', allowances.cylinder.result],
    ] as const) {
      if (a.kind === 'refused') {
        return { kind: 'refused', reason, message: `the ${what}: ${a.reason}`, levels, allowances };
      }
    }
    const farAllowance = allowances.farField.result;
    const cylinderAllowance = allowances.cylinder.result;

    // The family's finer grids, each started from the one before.
    let previous: { problem: TransonicProblem; cells: TransonicCells; rate: number } = {
      problem: problems.base,
      cells: baseSolution.cells,
      rate: baseSolution.rate,
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
      previous = { problem, cells: result.cells, rate: result.rate };
    }

    // The procedure, with the noise measured.
    const noise = Math.max(...levels.slice(-4).map((l) => l.noise));
    const values = levels.map((l) => l.drag);
    const estimate = gridConvergence(values.slice(-4), { orderTolerance: ORDER_TOLERANCE, noise });
    const bandOf = (e: ConvergenceEstimate) => (e.kind === 'unresolved' ? 0 : e.uncertainty);
    const grids = bandOf(estimate);
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
    const value = estimate.value;
    const parts = {
      grids,
      floor: TRANSONIC_DRAG_FLOOR * Math.abs(value),
      farField: farAllowance.kind === 'refused' ? 0 : farAllowance.allowance,
      cylinder: cylinderAllowance.kind === 'refused' ? 0 : cylinderAllowance.allowance,
    };
    const band = parts.grids + parts.floor + parts.farField + parts.cylinder;
    const exact = exactDrag(body, mach, gamma);
    if (exact !== null) {
      // The exact solution, computed here for this cone and Mach number
      // (review of aed95b0, S6): the label names it only with the check.
      const error = value - exact.value;
      if (!(Math.abs(error) <= band)) {
        return {
          kind: 'refused',
          reason: 'no-band',
          message: `the band (${band.toExponential(2)}) does not contain the solve's error against the exact solution (Taylor-Maccoll's ${exact.value.toFixed(7)}): ${error.toExponential(2)}`,
          levels,
          estimate,
          allowances,
        };
      }
    }
    const reference: ReferenceNote =
      exact === null
        ? referenceNote(body, mach, gamma)
        : {
            exact: true,
            note: exact.note,
            check: { value: exact.value, error: value - exact.value, inside: true },
          };
    const head =
      reference.check === undefined
        ? `verified by grid convergence, with no exact reference at this Mach number (${reference.note}); ${VALIDATION_CASES}`
        : `verified by grid convergence, and checked here against the exact solution (${reference.note}): exact ${reference.check.value.toFixed(7)}, the solve's error ${reference.check.error.toExponential(2)}, inside the band`;
    // What the domain's allowances rest on (review of aed95b0, S6, and
    // re-review of dd6c423): each kind's own assumption, always for a
    // turning allowance, and for the others where the allowances are most
    // of the band.
    const assumed = parts.farField + parts.cylinder;
    const notes: string[] = [];
    for (const [what, a] of [
      ['far boundaries', farAllowance],
      ['cylinder', cylinderAllowance],
    ] as const) {
      const dominant = assumed > parts.grids + parts.floor;
      if (a.kind === 'turning' || (a.kind === 'unmeasurable' && dominant)) {
        notes.push(
          `the ${what}' allowance (${a.allowance.toExponential(2)}) assumes that the part of their effect still to come beyond the largest domain solved decays as D^-0.8 or faster, or is no larger than the largest change measured; it is checked against no reference`,
        );
      } else if (a.kind === 'decaying' && dominant) {
        notes.push(
          `the ${what}' allowance (${a.allowance.toExponential(2)}) assumes that their effect keeps falling at least geometrically beyond the largest domain solved; it is checked against no reference`,
        );
      }
    }
    if (assumed > parts.grids + parts.floor) {
      notes.unshift(
        `most of the band (${assumed.toExponential(2)} of ${band.toExponential(2)}) is the allowance for the truncated domain`,
      );
    }
    const label = [head, ...notes].join('; ');
    return {
      kind: 'solved',
      value,
      band,
      parts,
      estimate,
      noise,
      levels,
      allowances,
      reference,
      label,
    };
  } catch (error) {
    if (error instanceof Cancelled) return { kind: 'cancelled', levels };
    if (error instanceof GpuPrecisionError) {
      return {
        kind: 'refused',
        reason: 'device-precision',
        message: `this device's arithmetic is not precise enough for the transonic solve: ${error.message}`,
        levels,
      };
    }
    if (error instanceof GpuMemoryLimitError) {
      return {
        kind: 'refused',
        reason: 'device-memory',
        message: `a grid is too large for this device: ${error.message}`,
        levels,
      };
    }
    if (error instanceof DomainError) {
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
 * shoulder cannot reach it). For other noses the page states none. The
 * driver itself computes the exact drag where one exists (exactDrag) and
 * the label claims it only with that check.
 */
export function referenceNote(body: Body, mach: number, gamma: number): ReferenceNote {
  const exact = exactDrag(body, mach, gamma);
  if (exact !== null) return { exact: true, note: exact.note };
  if (body.nose.shape.kind === 'conical' && body.nose.tipRadius === undefined) {
    try {
      taylorMaccoll(mach, Math.atan(body.nose.baseRadius / body.nose.length), gamma);
      return { exact: false, note: 'the cone’s conical surface flow would be subsonic' };
    } catch {
      return { exact: false, note: 'the cone’s shock would detach' };
    }
  }
  return { exact: false, note: 'none is computed for this nose' };
}

/**
 * The exact forebody drag coefficient where one exists: a cone whose
 * Taylor-Maccoll surface flow is supersonic carries its conical surface
 * pressure all the way to the shoulder, so its pressure drag on the base
 * area is that pressure coefficient. Null elsewhere.
 */
export function exactDrag(
  body: Body,
  mach: number,
  gamma: number,
): { readonly value: number; readonly note: string } | null {
  if (body.nose.shape.kind !== 'conical' || body.nose.tipRadius !== undefined) return null;
  try {
    const flow = taylorMaccoll(mach, Math.atan(body.nose.baseRadius / body.nose.length), gamma);
    if (!(flow.surfaceMach > 1)) return null;
    return {
      value: flow.surfacePressureCoefficient,
      note: `Taylor-Maccoll's, surface Mach number ${flow.surfaceMach.toFixed(3)}`,
    };
  } catch {
    return null;
  }
}

interface GridSolution {
  readonly drag: number;
  readonly steps: number;
  /** Steps times cells. */
  readonly cellUpdates: number;
  readonly seconds: number;
  readonly noise: number;
  readonly cells: TransonicCells;
  /** The settling test's rate per check, for the next grid of the family (SettlingValue). */
  readonly rate: number;
}

/**
 * Solve one grid until its drag settles, then watch it for WANDER_CHECKS
 * more checks. Settled means all of:
 * - the settling test passed (SettlingValue at SETTLE_NOISE, with the
 *   coarser grid's rate where the grid starts from its solution), or the
 *   geometric remaining change is below GEOMETRIC_NOISE on two checks;
 * - that remaining change is finite (changes that grow are not
 *   settling);
 * - the residual has fallen to RESIDUAL_FALL of the largest seen on this
 *   grid and still changes, so a solver that stopped moving does not
 *   count;
 * - the damped-oscillation bound on the drag's history has at least one
 *   fitted window (about 30 checks), decays and is within SETTLE_NOISE of
 *   the drag, so a slow oscillation pausing at a turning point does not
 *   count.
 * The grid's noise is the largest of SETTLE_NOISE, the wander over the
 * watched checks, the geometric remaining change and the oscillation
 * bound (review of aed95b0, S1). A residual that grows to
 * RESIDUAL_DIVERGENCE times its first value stops the grid as diverging.
 */
async function solveGrid(
  engine: TransonicEngine,
  problem: TransonicProblem,
  start: { problem: TransonicProblem; cells: TransonicCells; rate: number } | null,
  options: TransonicDragOptions,
  role: GridRole,
  checkPrecision = false,
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
    // A grid started from a coarser one's solution may start too close to
    // its limit to show a rate of its own (SettlingValue's documentation).
    const settling = new SettlingValue(SETTLE_NOISE, start?.rate ?? Number.NaN);
    const history: number[] = [];
    let steps = 0;
    let drag = Number.NaN;
    let passes = 0;
    let remaining = Infinity;
    let oscillation = 0;
    let firstResidual = Number.NaN;
    let largestResidual = 0;
    let lastResidual = Number.NaN;
    let settled = false;
    while (steps < maxSteps) {
      if (options.signal?.aborted === true) throw new Cancelled();
      await solver.iterate(every);
      steps += every;
      if (checkPrecision && steps === every) await solver.checkPrecision();
      drag = await solver.drag();
      if (!Number.isFinite(drag)) {
        throw new NotConverged(refinement, 'not-finite', 'the drag is not finite');
      }
      const residual = await solver.residual();
      if (Number.isNaN(firstResidual)) firstResidual = residual;
      if (residual > RESIDUAL_DIVERGENCE * firstResidual) {
        throw new NotConverged(
          refinement,
          'diverging',
          `the residual grew from ${firstResidual.toExponential(2)} to ${residual.toExponential(2)}`,
        );
      }
      largestResidual = Math.max(largestResidual, residual);
      const moving = residual !== lastResidual;
      lastResidual = residual;
      options.onProgress?.(
        role.what === 'grid'
          ? { what: 'grid', refinement, steps, drag }
          : { ...role, refinement: 1, steps, drag },
      );
      history.push(drag);
      remaining = geometricRemaining(history);
      passes = remaining <= GEOMETRIC_NOISE * Math.abs(drag) ? passes + 1 : 0;
      const settlingPassed = settling.add(drag);
      if (!(settlingPassed || passes >= 2)) continue;
      if (!Number.isFinite(remaining)) continue;
      if (!(moving && residual <= RESIDUAL_FALL * largestResidual)) continue;
      const fit = dampedOscillationBound(history, 10 * GEOMETRIC_NOISE * Math.abs(drag));
      oscillation = fit.bound;
      // No window fitted yet (fewer than about 30 checks): keep going, so
      // that a grid paused at a turning point of a slow oscillation is not
      // taken as settled (re-review of dd6c423).
      if (fit.fitted > 0 && fit.decaying && oscillation <= SETTLE_NOISE * Math.abs(drag)) {
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
      remaining / scale,
      oscillation / scale,
    );
    return {
      drag,
      steps,
      cellUpdates: steps * problem.config.grid.ni * problem.config.grid.nj,
      seconds: (performance.now() - t0) / 1000,
      noise,
      cells: await solver.cells(),
      rate: settling.rateToPassOn,
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
      residual: () => Promise.resolve(solver.densityResidualNorm()),
      // Double precision throughout: nothing to check.
      checkPrecision: () => Promise.resolve(),
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
