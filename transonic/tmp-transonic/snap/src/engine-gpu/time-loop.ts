/**
 * The CPU side of the GPU engines' time loops: which state buffer each
 * Runge-Kutta stage reads and writes, and the checks made between batches
 * of steps (status flag, step count, and the GPU clock against a
 * double-precision sum of the logged time steps).
 */

import { NonPhysicalStateError } from '../solver/errors';
import { GpuExecutionError } from './gpu-common';
import { RUNGE_KUTTA_STAGES, type TimeIntegrator } from '../solver/runge-kutta';

/** The most steps submitted in one batch; matches DT_LOG_SIZE in the shaders. */
export const DT_LOG_SIZE = 256;
/** Status flag set by the shaders when a cell becomes non-physical. */
export const STATUS_NON_PHYSICAL = 1;

/**
 * Whether a run asked to stop at `tEnd` has arrived. The GPU stores t_end in
 * 32 bits, so arrival means reaching the f32 value of tEnd.
 */
export function hasReached(time: number, tEnd: number): boolean {
  return time >= Math.fround(tEnd) * (1 - 1e-9);
}

/** Steps for the next batch towards `tEnd`: enough at time step `dt`, plus one. */
export function nextBatchSize(tEnd: number, elapsed: number, dt: number): number {
  return Math.min(Math.max(Math.ceil((tEnd - elapsed) / dt) + 1, 1), DT_LOG_SIZE);
}

/** Index of one of the three state buffers. */
export type StateIndex = 0 | 1 | 2;

export interface Stage {
  readonly u0: StateIndex;
  readonly src: StateIndex;
  readonly dst: StateIndex;
  /** Index into the stage coefficient buffers. */
  readonly coefficients: number;
}

/**
 * Buffer roles for each Runge-Kutta stage of one step. With the current
 * solution in buffer s, stages write alternately to the other two buffers,
 * so a stage never writes a buffer it reads.
 */
export function stagePlan(current: StateIndex, integrator: TimeIntegrator): Stage[] {
  const others = [((current + 1) % 3) as StateIndex, ((current + 2) % 3) as StateIndex] as const;
  return RUNGE_KUTTA_STAGES[integrator].map((_, n) => ({
    u0: current,
    src: n === 0 ? current : others[(n - 1) % 2]!,
    dst: others[n % 2]!,
    coefficients: n,
  }));
}

/**
 * Bind groups of the stage layout (coefficients, u0, src, dst), created on
 * first use and cached.
 */
export class StageBindGroups {
  private readonly groups = new Map<string, GPUBindGroup>();

  constructor(
    private readonly device: GPUDevice,
    private readonly layout: GPUBindGroupLayout,
    private readonly coefficientBuffers: readonly GPUBuffer[],
    private readonly stateBuffers: readonly [GPUBuffer, GPUBuffer, GPUBuffer],
  ) {}

  get(stage: Stage): GPUBindGroup {
    const key = `${stage.u0}${stage.src}${stage.dst}${stage.coefficients}`;
    let group = this.groups.get(key);
    if (group === undefined) {
      group = this.device.createBindGroup({
        label: `stage ${key}`,
        layout: this.layout,
        entries: [
          { binding: 0, resource: { buffer: this.coefficientBuffers[stage.coefficients]! } },
          { binding: 1, resource: { buffer: this.stateBuffers[stage.u0] } },
          { binding: 2, resource: { buffer: this.stateBuffers[stage.src] } },
          { binding: 3, resource: { buffer: this.stateBuffers[stage.dst] } },
        ],
      });
      this.groups.set(key, group);
    }
    return group;
  }
}

/** What the CPU reads back after each batch of steps. */
export interface ControlReading {
  /** t + t_error as kept by the GPU. */
  readonly gpuTime: number;
  /** The most recent time step. */
  readonly dt: number;
  readonly steps: number;
  readonly status: number;
  /** Time step of step s at index s mod DT_LOG_SIZE. */
  readonly dtLog: Float32Array;
}

/** Steps taken and simulated time, checked against the GPU after every batch. */
export class StepLedger {
  /** Steps accounted for. */
  steps = 0;
  /** Simulated time: double-precision sum of every logged time step. */
  elapsed = 0;

  reset(): void {
    this.steps = 0;
    this.elapsed = 0;
  }

  /**
   * Account for the steps of the latest batch. Throws NonPhysicalStateError
   * if the status flag is set. With `timeAccurate`, adds the logged time
   * steps and checks the GPU clock against their sum: a mismatch means the
   * GPU compiler defeated the clock's compensated summation. With
   * `submitted`, every one of that many steps must have run: work the GPU
   * rejects, or cannot run, raises no exception, and would otherwise read
   * back as a flow that has stopped changing.
   */
  account(reading: ControlReading, timeAccurate: boolean, submitted?: number): void {
    if ((reading.status & STATUS_NON_PHYSICAL) !== 0) {
      throw new NonPhysicalStateError(
        `non-physical state on the GPU between steps ${this.steps} and ${reading.steps}`,
      );
    }
    if (submitted !== undefined && reading.steps !== this.steps + submitted) {
      throw new GpuExecutionError(
        `the GPU ran ${reading.steps - this.steps} of the ${submitted} steps submitted: it rejected the work, ran out of memory or lost the device`,
      );
    }
    if (timeAccurate) {
      for (let s = this.steps; s < reading.steps; s++) {
        this.elapsed += reading.dtLog[s % DT_LOG_SIZE]!;
      }
      const drift = Math.abs(reading.gpuTime - this.elapsed);
      if (drift > 1e-10 * Math.max(this.elapsed, Number.MIN_VALUE)) {
        throw new Error(
          `GPU clock drifted from the sum of its time steps by ${drift.toExponential(2)}; ` +
            'this GPU compiler does not preserve compensated summation',
        );
      }
    }
    this.steps = reading.steps;
  }
}

/**
 * Advance a GPU time loop to `tEnd` with global time steps: submit batches
 * of steps sized from the latest time step (one step first, as none is
 * known yet), account for each batch, and stop on arrival. Throws if more
 * than `maxSteps` steps are needed.
 */
export async function advanceInBatches(
  tEnd: number,
  maxSteps: number,
  ledger: StepLedger,
  submitSteps: (count: number) => void,
  readControl: () => Promise<ControlReading>,
): Promise<void> {
  const firstStep = ledger.steps;
  let batch = 1;
  for (;;) {
    submitSteps(batch);
    const reading = await readControl();
    ledger.account(reading, true);
    if (hasReached(ledger.elapsed, tEnd)) return;
    if (ledger.steps - firstStep >= maxSteps) {
      throw new Error(`advanceTo(${tEnd}) needed more than ${maxSteps} steps`);
    }
    batch = nextBatchSize(tEnd, ledger.elapsed, reading.dt);
  }
}
