/**
 * The drag curve (docs/design/0017-rocketeer-interface.md section 8),
 * without the DOM: C_D against Mach 1.0 to the flight's highest Mach
 * number, every 0.2 (or 0.1), each point what the logic returns there.
 *
 * At the start every point is put to the logic with the nose pending: a
 * point refused for reasons other than the nose is final at once and costs
 * no GPU time. The others are solved one at a time, coarse to fine, by the
 * nose solve the drag page uses (passed in, so that it is tested with a
 * stand-in): after each grid the point is provisional (the logic's total
 * with the nose at that grid's value, no band); when the solve ends it is
 * `totalDragView(form, noseStateOf(outcome))`, a number with its band and
 * claim, or no number with every reason.
 */

import type { LevelReport, VerifiedDrag } from '../analysis/verified-drag';
import type { Body } from '../geometry/body';
import { designForm, type Excludable, type NotModelled } from '../rocket/adapter';
import type { RocketDesign } from '../rocket/design';
import type { ComponentRefusal } from '../total/total-drag';
import type { NoseEnd } from './status-words';
import { NO_WEBGPU, noseStateOf, type NoseSolveError } from './total-drag-display';
import {
  noseComponentOf,
  totalDragView,
  type TotalDragForm,
  type TotalDragView,
} from './total-drag';

/** The Mach numbers of a curve: from 1.0 every `step` to the highest flown, at most 3.0. */
export function curveMachs(maxMach: number, step: number): number[] {
  const top = Math.min(maxMach, 3);
  const machs: number[] = [];
  for (let k = 0; ; k++) {
    // Rounded to the step's decimals, so that 1.2 is 1.2, not 1.2000000000000002.
    const mach = Number((1 + k * step).toFixed(2));
    if (mach > top + 1e-9) break;
    machs.push(mach);
  }
  return machs;
}

/**
 * The order in which points are solved, coarse to fine: the first and the
 * last, then the middle of each interval between points already taken,
 * left to right, level by level. A curve stopped early still spans its range.
 */
export function solveOrder(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const order = [0, count - 1];
  let intervals: [number, number][] = [[0, count - 1]];
  while (intervals.length > 0) {
    const next: [number, number][] = [];
    for (const [a, b] of intervals) {
      if (b - a < 2) continue;
      const m = Math.floor((a + b) / 2);
      order.push(m);
      next.push([a, m], [m, b]);
    }
    intervals = next;
  }
  return order;
}

/** The nose solve the page uses, as the curve calls it. */
export interface NoseSolveHooks {
  /** The logic's inputs at this point, for drawing the rocket solved (the 3D view's). */
  readonly form: TotalDragForm;
  readonly signal: AbortSignal;
  /** After each grid. */
  readonly onLevel: (report: LevelReport) => void;
}
export type NoseSolver = (
  body: Body,
  mach: number,
  hooks: NoseSolveHooks,
) => Promise<VerifiedDrag | NoseSolveError>;

/** What a finished point shows. */
export type PointResult =
  | {
      readonly kind: 'total';
      readonly view: Extract<TotalDragView, { kind: 'total' }>;
      /** The parts left out by the user's choice, for every label. */
      readonly without: readonly string[];
    }
  | {
      readonly kind: 'refused';
      readonly refusals: readonly ComponentRefusal[];
      /** How the nose's solve ended, where it is the nose that gave no term. */
      readonly nose: NoseEnd | null;
    }
  | { readonly kind: 'not-modelled'; readonly features: readonly NotModelled[] }
  | { readonly kind: 'choose'; readonly excludable: readonly Excludable[] };

export type PointState =
  | { readonly kind: 'waiting' }
  | {
      readonly kind: 'solving';
      /** Grids solved so far, and in all. */
      readonly grid: number;
      readonly grids: number;
      /** The logic's total with the nose at the latest grid's value: no band, no claim. */
      readonly provisional: number | null;
    }
  | { readonly kind: 'done'; readonly result: PointResult }
  | { readonly kind: 'stopped' };

export interface CurvePoint {
  readonly mach: number;
  readonly state: PointState;
  /** The nose solve's outcome, for Details (null where none ran). */
  readonly nose: VerifiedDrag | NoseSolveError | null;
  /** Wall time of its solve, seconds, and the cell updates it took. */
  readonly seconds: number;
  readonly cellUpdates: number;
}

export interface CurveOptions {
  readonly design: RocketDesign;
  /** The user chose to compute without the parts bowshock does not model. */
  readonly without: boolean;
  readonly step: number;
  /** The finest refinement of the nose's grids (8: 160 cells across, four grids). */
  readonly finest: number;
  /** No WebGPU: every point needing the nose is refused with that reason. */
  readonly noGpu?: boolean;
}

/** Grids of a solve to `finest`: 1, 2, 4, ... finest. */
export const gridsTo = (finest: number) => Math.round(Math.log2(finest)) + 1;

/** One curve: its points, solved one at a time; `stop` cancels the solve under way. */
export class CurveRun {
  readonly points: CurvePoint[];
  private readonly forms: (TotalDragForm | null)[];
  private readonly controller = new AbortController();
  private finished = false;
  private began = false;

  constructor(
    readonly options: CurveOptions,
    private readonly solve: NoseSolver,
    private readonly onChange: (run: CurveRun, index: number) => void,
  ) {
    const machs = curveMachs(options.design.flight.maxMach, options.step);
    this.forms = [];
    this.points = machs.map((mach) => {
      const point = this.initial(mach);
      return point;
    });
  }

  /** Whether the run has ended (all points done or stopped). */
  get done(): boolean {
    return this.finished;
  }

  /** Started and not yet done (a preview, never run, is neither). */
  get running(): boolean {
    return this.began && !this.finished;
  }

  /** The indices still to solve, in the order they will be. */
  get queue(): number[] {
    const waiting = this.points.flatMap((p, k) => (p.state.kind === 'waiting' ? [k] : []));
    return solveOrder(waiting.length).map((k) => waiting[k]!);
  }

  /** The point being solved, if any. */
  get current(): number | null {
    const k = this.points.findIndex((p) => p.state.kind === 'solving');
    return k < 0 ? null : k;
  }

  /** Stop the solve under way and every point after it. */
  stop(): void {
    this.controller.abort();
  }

  /** Solve every point that needs the nose, in order; resolves when done or stopped. */
  async run(): Promise<void> {
    this.began = true;
    const grids = gridsTo(this.options.finest);
    for (const k of this.queue) {
      if (this.controller.signal.aborted) break;
      const form = this.forms[k]!;
      const mach = this.points[k]!.mach;
      this.set(k, { state: { kind: 'solving', grid: 0, grids, provisional: null } });
      const started = Date.now();
      let cellUpdates = 0;
      let levels = 0;
      const outcome = await this.solve(form.body, mach, {
        form,
        signal: this.controller.signal,
        onLevel: (report) => {
          levels += 1;
          cellUpdates += report.cells.ni * report.cells.nj * report.iterations;
          this.set(k, {
            state: {
              kind: 'solving',
              grid: levels,
              grids,
              provisional: provisionalTotal(form, report.drag, levels),
            },
            seconds: (Date.now() - started) / 1000,
            cellUpdates,
          });
        },
      });
      const seconds = (Date.now() - started) / 1000;
      if (outcome.kind === 'cancelled') {
        this.set(k, { state: { kind: 'stopped' }, nose: outcome, seconds, cellUpdates });
        break;
      }
      const nose = noseStateOf(outcome);
      if (nose === null) {
        // The GPU failed: this point has no number, and nothing more can be solved.
        this.set(k, {
          state: {
            kind: 'done',
            result: { kind: 'refused', refusals: [], nose: 'gpu-failed' },
          },
          nose: outcome,
          seconds,
          cellUpdates,
        });
        break;
      }
      this.set(k, {
        state: { kind: 'done', result: this.resultOf(k, totalDragView(form, nose), outcome) },
        nose: outcome,
        seconds,
        cellUpdates,
      });
    }
    for (let k = 0; k < this.points.length; k++) {
      if (this.points[k]!.state.kind === 'waiting') this.set(k, { state: { kind: 'stopped' } });
    }
    this.finished = true;
    this.onChange(this, -1);
  }

  /** A point before any solve: final if the rocket or the logic gives no number whatever the nose. */
  private initial(mach: number): CurvePoint {
    const blank = { mach, nose: null, seconds: 0, cellUpdates: 0 };
    const o = this.options;
    const asked = designForm(o.design, mach, { without: o.without });
    if (asked.kind !== 'form') {
      this.forms.push(null);
      const result: PointResult =
        asked.kind === 'choose'
          ? { kind: 'choose', excludable: asked.excludable }
          : { kind: 'not-modelled', features: asked.features };
      return { ...blank, state: { kind: 'done', result } };
    }
    this.forms.push(asked.form);
    if (o.noGpu === true) {
      const view = totalDragView(asked.form, NO_WEBGPU);
      if (view.kind === 'refused') {
        return {
          ...blank,
          state: {
            kind: 'done',
            result: {
              kind: 'refused',
              refusals: view.refusals,
              nose: view.refusals.some((r) => r.component === 'nose wave drag')
                ? 'no-webgpu'
                : null,
            },
          },
        };
      }
    }
    const view = totalDragView(asked.form, { kind: 'pending' });
    if (view.kind === 'refused') {
      return {
        ...blank,
        state: { kind: 'done', result: { kind: 'refused', refusals: view.refusals, nose: null } },
      };
    }
    return { ...blank, state: { kind: 'waiting' } };
  }

  /** A finished point's result from the logic's view and the nose's outcome. */
  private resultOf(
    k: number,
    view: TotalDragView,
    outcome: VerifiedDrag | NoseSolveError,
  ): PointResult {
    if (view.kind === 'total') {
      const asked = designForm(this.options.design, this.points[k]!.mach, {
        without: this.options.without,
      });
      return { kind: 'total', view, without: asked.kind === 'form' ? asked.without : [] };
    }
    if (view.kind === 'pending') {
      // A solved nose never leaves the total pending.
      throw new Error('the total is pending after the nose was solved');
    }
    return { kind: 'refused', refusals: view.refusals, nose: noseEnd(outcome) };
  }

  private set(k: number, change: Partial<CurvePoint>): void {
    this.points[k] = { ...this.points[k]!, ...change };
    this.onChange(this, k);
  }
}

/** How a nose solve that gave no term ended. */
export function noseEnd(outcome: VerifiedDrag | NoseSolveError): NoseEnd | null {
  switch (outcome.kind) {
    case 'solved':
      return outcome.uncertainty === undefined ? 'no-band' : null;
    case 'invalid':
      return 'invalid';
    case 'not-converged':
      return 'not-converged';
    case 'error':
      return outcome.gpuFailed ? 'gpu-failed' : 'refused-case';
    case 'cancelled':
      return null;
  }
}

/**
 * The logic's total with the nose at one grid's value and no band: a
 * provisional point's value, shown without a band or claim and never
 * exported. Null where the logic gives no total.
 */
export function provisionalTotal(form: TotalDragForm, drag: number, grids: number): number | null {
  const view = totalDragView(form, {
    kind: 'solved',
    component: noseComponentOf({ value: drag, uncertainty: 0, grids }),
  });
  return view.kind === 'total' ? view.total.cd : null;
}

/**
 * The time a point takes on this GPU, seconds, from what has been
 * measured: the last finished point's own time, or, before one has
 * finished, the cell rate of the grids solved so far times the work of a
 * point (the cell updates each grid has needed, measured on the Basic
 * Finner: each grid about `GROWTH` times the one before). Null before any
 * grid is solved.
 */
export function secondsPerPoint(run: CurveRun): number | null {
  const finished = run.points.filter(
    (p) => p.state.kind === 'done' && p.nose !== null && p.nose.kind === 'solved',
  );
  if (finished.length > 0) return finished[finished.length - 1]!.seconds;
  const going = run.points.find((p) => p.cellUpdates > 0 && p.seconds > 0);
  if (going === undefined || going.state.kind !== 'solving') return null;
  const rate = going.cellUpdates / going.seconds;
  // The first grid's work, grown geometrically over the grids of a point.
  const n = going.state.grids;
  const first = going.cellUpdates / sumGrowth(going.state.grid);
  return (first * sumGrowth(n)) / rate;
}

/**
 * The work of each grid over the one before it, as measured on the Basic
 * Finner at Mach 2 on SwiftShader (scripts/time-point.mjs): four times the
 * cells, and about twice the steps.
 */
export const GROWTH = 8;
const sumGrowth = (grids: number) => (GROWTH ** grids - 1) / (GROWTH - 1);
