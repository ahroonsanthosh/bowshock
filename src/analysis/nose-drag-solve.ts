/**
 * Which solver serves the nose's wave drag at a Mach number, and one shape
 * for what either returns (design record 0013, serving rule 7): the
 * transonic solve (verifiedTransonicDrag) from Mach 1 to below 1.2, the
 * fitted solver (0006, verifiedFittedDragGpu) from 1.2. At 1.2 the two
 * agree within 2.7e-5 of the value on the cone and 1e-3 on the ogive.
 * Below Mach 1 neither serves. The page calls solveNoseDrag; the solvers
 * are passed in (gpuNoseDragSolvers on the page, stand-ins in tests).
 */

import {
  GpuExecutionError,
  GpuMemoryLimitError,
  GpuPrecisionError,
} from '../engine-gpu/gpu-common';
import type { Body } from '../geometry/body';
import type { FlowSource } from '../render/flow-renderer';
import type {
  TransonicDrag,
  TransonicDragOptions,
  TransonicFinerGrid,
  TransonicLevel,
} from './transonic-drag';
import { FITTED_DRAG_FLOOR, type LevelReport, type VerifiedDrag } from './verified-drag';

/** The lowest Mach number of each solver's range. */
export const TRANSONIC_FROM = 1;
export const FITTED_FROM = 1.2;

export type NoseSolver = 'transonic' | 'fitted';

/** The solver for a Mach number, or null below Mach 1 (subsonic: not served). */
export function solverFor(mach: number): NoseSolver | null {
  if (!Number.isFinite(mach) || mach < TRANSONIC_FROM) return null;
  return mach < FITTED_FROM ? 'transonic' : 'fitted';
}

export interface NoseDragRequest {
  readonly mach: number;
  readonly gamma: number;
  /** Finest refinement: 8, or 16 on request (both solvers offer it). */
  readonly finest: number;
  readonly signal?: AbortSignal;
  /** Progress as text, for a status line. */
  readonly onProgress?: (text: string) => void;
  /**
   * The grid being solved, either solver's, to draw as it converges, and
   * null just before its buffers are released (freeze the picture then).
   */
  readonly onLive?: (source: FlowSource | null) => void;
}

export interface NoseDragSolvers {
  readonly transonic: (body: Body, options: TransonicDragOptions) => Promise<TransonicDrag>;
  readonly fitted: (
    body: Body,
    options: {
      mach: number;
      gamma: number;
      maxRefinement: number;
      signal?: AbortSignal;
      onLive?: (source: FlowSource | null) => void;
    },
  ) => Promise<VerifiedDrag>;
}

/** One grid of either family, for a table of the grids solved. */
export interface NoseDragLevel {
  readonly refinement: number;
  readonly drag: number;
  readonly steps: number;
}

export type NoseDragStatus = 'band' | 'no-band' | 'refused' | 'not-converged' | 'cancelled';

/** What either solver returned, in one shape. */
export interface NoseDragOutcome {
  /** null below Mach 1. */
  readonly solver: NoseSolver | null;
  /**
   * 'band': a value with its band; 'no-band': a value the procedure gives
   * no band for (shown as unverified, if at all); 'refused': no value, and
   * `text` says why.
   */
  readonly status: NoseDragStatus;
  /** The finest grid's wave drag coefficient. */
  readonly value?: number;
  /**
   * The band's half-width, absolute: the value lies within value +- band
   * (VerifiedDrag.uncertainty's convention, for both solvers).
   */
  readonly band?: number;
  /** The label shown with the value, or the reason there is none. */
  readonly text: string;
  readonly levels: readonly NoseDragLevel[];
  /** A finer grid that may give a band, offered to the user, with its expected work (transonic). */
  readonly finer?: TransonicFinerGrid;
  /** The solver's own result, for the details. */
  readonly detail:
    | { readonly solver: 'transonic'; readonly result: TransonicDrag }
    | { readonly solver: 'fitted'; readonly result: VerifiedDrag }
    | null;
}

/**
 * The nose's wave drag at the request's Mach number from the solver that
 * serves it. A refusal by either solver comes back as status 'refused'
 * with its reason; a failure of the GPU itself is thrown.
 */
export async function solveNoseDrag(
  body: Body,
  request: NoseDragRequest,
  solvers: NoseDragSolvers,
): Promise<NoseDragOutcome> {
  const solver = solverFor(request.mach);
  if (solver === null) {
    return {
      solver,
      status: 'refused',
      text: 'below Mach 1 the nose drag is not served: the flow over it is subsonic',
      levels: [],
      detail: null,
    };
  }
  if (solver === 'transonic') {
    let result: TransonicDrag;
    try {
      result = await solvers.transonic(body, {
        mach: request.mach,
        gamma: request.gamma,
        finest: request.finest,
        ...(request.signal === undefined ? {} : { signal: request.signal }),
        ...(request.onLive === undefined ? {} : { onLive: request.onLive }),
        onProgress: (p) => {
          const where =
            p.what === 'grid'
              ? `Grid at refinement ${p.refinement}`
              : `Allowance for the ${p.allowance === 'farField' ? 'far boundaries' : 'cylinder'}, base grid on ${p.size} ${p.allowance === 'farField' ? 'radii' : 'calibers'}`;
          request.onProgress?.(`${where}: ${p.steps} steps, wave Cd so far ${p.drag.toFixed(6)}`);
        },
      });
    } catch (error) {
      // A grid too large for the device, or a device that loses the low
      // parts of two-float numbers, is a refusal, never an exception (the
      // driver refuses both itself; this covers any other solver).
      if (error instanceof GpuPrecisionError) {
        result = {
          kind: 'refused',
          reason: 'device-precision',
          message: error.message,
          levels: [],
        };
      } else if (error instanceof GpuMemoryLimitError) {
        result = { kind: 'refused', reason: 'device-memory', message: error.message, levels: [] };
      } else {
        throw error;
      }
    }
    return fromTransonic(result);
  }
  try {
    const result = await solvers.fitted(body, {
      mach: request.mach,
      gamma: request.gamma,
      maxRefinement: request.finest,
      ...(request.signal === undefined ? {} : { signal: request.signal }),
      ...(request.onLive === undefined ? {} : { onLive: request.onLive }),
    });
    return fromFitted(result);
  } catch (error) {
    // The fitted solver refuses bodies it does not serve by throwing; a
    // failed GPU is not a refusal.
    if (error instanceof GpuExecutionError) throw error;
    return {
      solver: 'fitted',
      status: 'refused',
      text: error instanceof Error ? error.message : String(error),
      levels: [],
      detail: null,
    };
  }
}

function transonicLevels(levels: readonly TransonicLevel[]): NoseDragLevel[] {
  return levels.map((l) => ({ refinement: l.refinement, drag: l.drag, steps: l.steps }));
}

function fromTransonic(result: TransonicDrag): NoseDragOutcome {
  const detail = { solver: 'transonic', result } as const;
  switch (result.kind) {
    case 'solved':
      return {
        solver: 'transonic',
        status: 'band',
        value: result.value,
        band: result.band,
        text: result.label,
        levels: transonicLevels(result.levels),
        detail,
      };
    case 'refused':
      return {
        solver: 'transonic',
        status: 'refused',
        text: result.message,
        levels: transonicLevels(result.levels),
        ...(result.finer === undefined ? {} : { finer: result.finer }),
        detail,
      };
    case 'not-converged':
      return {
        solver: 'transonic',
        status: 'not-converged',
        text: `the grid at refinement ${result.refinement} did not converge (${result.message})`,
        levels: transonicLevels(result.levels),
        detail,
      };
    case 'cancelled':
      return {
        solver: 'transonic',
        status: 'cancelled',
        text: 'stopped',
        levels: transonicLevels(result.levels),
        detail,
      };
  }
}

function fittedLevels(reports: readonly LevelReport[]): NoseDragLevel[] {
  return reports.map((r) => ({ refinement: r.refinement, drag: r.drag, steps: r.iterations }));
}

function fromFitted(result: VerifiedDrag): NoseDragOutcome {
  const detail = { solver: 'fitted', result } as const;
  switch (result.kind) {
    case 'solved': {
      const e = result.estimate;
      if (result.uncertainty !== undefined) {
        return {
          solver: 'fitted',
          status: 'band',
          value: e.value,
          band: result.uncertainty,
          text: `verified by grid convergence on ${result.levels.length} grids with the bow shock fitted, including an allowance of ${FITTED_DRAG_FLOOR.toExponential(0)} of the value`,
          levels: fittedLevels(result.reports),
          detail,
        };
      }
      return {
        solver: 'fitted',
        status: 'no-band',
        value: e.value,
        text: `no error band: ${e.kind === 'unresolved' ? e.reason : 'none measured'}`,
        levels: fittedLevels(result.reports),
        detail,
      };
    }
    case 'invalid':
      return {
        solver: 'fitted',
        status: 'refused',
        text: `on the grid at refinement ${result.refinement}, ${result.reason}`,
        levels: [],
        detail,
      };
    case 'not-converged':
      return {
        solver: 'fitted',
        status: 'not-converged',
        text: `the grid at refinement ${result.refinement} did not converge (${result.reason})`,
        levels: [],
        detail,
      };
    case 'cancelled':
      return {
        solver: 'fitted',
        status: 'cancelled',
        text: 'stopped',
        levels: fittedLevels(result.reports),
        detail,
      };
  }
}
