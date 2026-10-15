import { describe, expect, it } from 'vitest';
import { RUNGE_KUTTA_STAGES, type TimeIntegrator } from '../../src/solver/runge-kutta';
import { NonPhysicalStateError } from '../../src/solver/errors';
import {
  DT_LOG_SIZE,
  STATUS_NON_PHYSICAL,
  StepLedger,
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
});

describe('nextBatchSize', () => {
  it('asks for enough steps plus one, within the log size', () => {
    expect(nextBatchSize(1, 0.5, 0.1)).toBe(6);
    expect(nextBatchSize(1, 0, 1e-6)).toBe(DT_LOG_SIZE);
    expect(nextBatchSize(1, 1, 0.1)).toBe(1);
  });
});
