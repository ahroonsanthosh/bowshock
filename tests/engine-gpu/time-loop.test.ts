import { describe, expect, it } from 'vitest';
import { RUNGE_KUTTA_STAGES, type TimeIntegrator } from '../../src/solver/runge-kutta';
import { NonPhysicalStateError } from '../../src/solver/errors';
import {
  GpuExecutionError,
  GpuMemoryLimitError,
  checkDispatchSize,
  withDeviceErrors,
} from '../../src/engine-gpu/gpu-common';
import {
  DT_LOG_SIZE,
  STATUS_NON_PHYSICAL,
  StepLedger,
  advanceInBatches,
  nextBatchSize,
  stagePlan,
  type StateIndex,
} from '../../src/engine-gpu/time-loop';

describe('stagePlan', () => {
  const integrators = Object.keys(RUNGE_KUTTA_STAGES) as TimeIntegrator[];
  const starts: StateIndex[] = [0, 1, 2];

  it.each(integrators)('%s: stages chain, and never write a buffer they read', (integrator) => {
    for (const current of starts) {
      const plan = stagePlan(current, integrator);
      expect(plan).toHaveLength(RUNGE_KUTTA_STAGES[integrator].length);
      plan.forEach((stage, n) => {
        expect(stage.u0).toBe(current);
        expect(stage.src).toBe(n === 0 ? current : plan[n - 1]!.dst);
        expect(stage.dst).not.toBe(stage.u0);
        expect(stage.dst).not.toBe(stage.src);
        expect(stage.coefficients).toBe(n);
      });
    }
  });
});

describe('StepLedger', () => {
  const log = (dts: number[]) => {
    const dtLog = new Float32Array(DT_LOG_SIZE);
    dts.forEach((dt, s) => (dtLog[s % DT_LOG_SIZE] = dt));
    return dtLog;
  };

  it('sums the logged time steps across batches in double precision', () => {
    const ledger = new StepLedger();
    const dts = Array.from({ length: 300 }, (_, s) => Math.fround(1e-3 * (1 + (s % 7))));
    const exact = (n: number) => dts.slice(0, n).reduce((a, b) => a + b, 0);
    // Two batches, each reading the log as it stands then: it is circular,
    // so by the second reading steps 256 to 299 have overwritten 0 to 43.
    const first = { gpuTime: exact(200), dt: dts[199]!, steps: 200, status: 0 };
    ledger.account({ ...first, dtLog: log(dts.slice(0, 200)) }, true);
    const second = { gpuTime: exact(300), dt: dts[299]!, steps: 300, status: 0 };
    ledger.account({ ...second, dtLog: log(dts) }, true);
    expect(ledger.steps).toBe(300);
    expect(ledger.elapsed).toBe(exact(300));
  });

  it('detects a GPU clock that drifted from the logged steps', () => {
    const ledger = new StepLedger();
    const dtLog = log([0.25, 0.25]);
    expect(() => {
      ledger.account({ gpuTime: 0.5 + 1e-9, dt: 0.25, steps: 2, status: 0, dtLog }, true);
    }).toThrow(/drifted/);
  });

  it('ignores the clock under local time stepping, but still counts steps', () => {
    const ledger = new StepLedger();
    ledger.account({ gpuTime: 123, dt: 1, steps: 5, status: 0, dtLog: log([]) }, false);
    expect(ledger.steps).toBe(5);
    expect(ledger.elapsed).toBe(0);
  });

  it('reports a non-physical state with the range of steps', () => {
    const ledger = new StepLedger();
    const reading = { gpuTime: 0, dt: 0, steps: 7, status: STATUS_NON_PHYSICAL, dtLog: log([]) };
    expect(() => {
      ledger.account(reading, false);
    }).toThrow(NonPhysicalStateError);
    expect(() => {
      ledger.account(reading, false);
    }).toThrow(/between steps 0 and 7/);
  });

  it('with the steps submitted, refuses a batch the GPU did not run in full', () => {
    // Work the GPU rejects or cannot run raises nothing; its step count
    // does not advance.
    const ledger = new StepLedger();
    const reading = (steps: number) => ({ gpuTime: 0, dt: 1, steps, status: 0, dtLog: log([]) });
    ledger.account(reading(250), false, 250);
    expect(ledger.steps).toBe(250);
    expect(() => {
      ledger.account(reading(250), false, 250);
    }).toThrow(GpuExecutionError);
    expect(() => {
      ledger.account(reading(400), false, 250);
    }).toThrow(/ran 150 of the 250 steps submitted/);
  });
});

/** A device with the limits and error scopes these checks use. */
function fakeDevice(errors: { validation?: string; memory?: string } = {}) {
  const scopes: GPUErrorFilter[] = [];
  return {
    limits: { maxComputeWorkgroupsPerDimension: 65535 },
    pushErrorScope: (filter: GPUErrorFilter) => scopes.push(filter),
    popErrorScope: () => {
      const filter = scopes.pop();
      const message = filter === 'validation' ? errors.validation : errors.memory;
      return Promise.resolve(message === undefined ? null : { message });
    },
  } as unknown as GPUDevice;
}

describe('device limits and errors', () => {
  it('refuses a dispatch of more workgroups than the device allows in one dimension', () => {
    expect(() => {
      checkDispatchSize(fakeDevice(), 65535 * 64, 64, 'a grid');
    }).not.toThrow();
    expect(() => {
      checkDispatchSize(fakeDevice(), 65535 * 64 + 1, 64, 'a grid');
    }).toThrow(GpuMemoryLimitError);
  });

  it('turns errors raised while creating into exceptions, destroying what was created', async () => {
    const destroyed: string[] = [];
    const destroy = (x: string) => destroyed.push(x);
    await expect(withDeviceErrors(fakeDevice(), 'a grid', () => 'engine', destroy)).resolves.toBe(
      'engine',
    );
    await expect(
      withDeviceErrors(fakeDevice({ memory: 'no memory' }), 'a grid', () => 'big', destroy),
    ).rejects.toThrow(GpuMemoryLimitError);
    await expect(
      withDeviceErrors(fakeDevice({ validation: 'bad layout' }), 'a grid', () => 'odd', destroy),
    ).rejects.toThrow(/a grid: bad layout/);
    expect(destroyed).toEqual(['big', 'odd']);
  });
});

describe('nextBatchSize', () => {
  it('asks for enough steps plus one, within the log size', () => {
    expect(nextBatchSize(1, 0.5, 0.1)).toBe(6);
    expect(nextBatchSize(1, 0, 1e-6)).toBe(DT_LOG_SIZE);
    expect(nextBatchSize(1, 1, 0.1)).toBe(1);
  });
});

describe('advanceInBatches', () => {
  /** A simulated GPU taking steps of a fixed size, stopping exactly at t_end. */
  function simulatedGpu(dt: number, tEnd: number) {
    const dtLog = new Float32Array(DT_LOG_SIZE);
    let time = 0;
    let steps = 0;
    const batches: number[] = [];
    return {
      batches,
      submit: (count: number) => {
        batches.push(count);
        for (let k = 0; k < count && time < tEnd; k++) {
          // The log holds f32 values; the clock sums exactly those.
          const step = Math.fround(Math.min(dt, tEnd - time));
          dtLog[steps % DT_LOG_SIZE] = step;
          time += step;
          steps += 1;
        }
      },
      read: () => Promise.resolve({ gpuTime: time, dt, steps, status: 0, dtLog }),
    };
  }

  it('starts with one step, then sizes batches to finish, and stops on arrival', async () => {
    const gpu = simulatedGpu(0.125, 1);
    const ledger = new StepLedger();
    await advanceInBatches(1, 1000, ledger, gpu.submit, gpu.read);
    expect(ledger.elapsed).toBe(1);
    expect(ledger.steps).toBe(8);
    expect(gpu.batches).toEqual([1, 8]);
  });

  it('throws when more than maxSteps steps would be needed', async () => {
    const gpu = simulatedGpu(1e-3, 1);
    await expect(advanceInBatches(1, 300, new StepLedger(), gpu.submit, gpu.read)).rejects.toThrow(
      /needed more than 300 steps/,
    );
  });
});
