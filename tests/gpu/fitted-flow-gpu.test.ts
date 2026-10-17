import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bluntFitProblem, fittedFlow } from '../../src/analysis/fitted-flow';
import { gpuFittedFlow } from '../../src/analysis/gpu-fitted-flow';
import { GPU_NOISE } from '../../src/analysis/verified-drag';
import type { Body } from '../../src/geometry/body';
import { requireDevice } from './device';

/**
 * The fitted-shock iteration run entirely on the GPU
 * (src/engine-gpu/shock-fitting-gpu.ts) against the CPU's fit of the same
 * problem on the same grids (design record 0006).
 */

const gamma = 1.4;
let device: GPUDevice;
beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

describe('fitted shock on the GPU', () => {
  it('Mach 2 hemisphere-cylinder: the CPU fit drag to within the GPU noise, the shock at rest', async () => {
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 0.5, baseRadius: 0.5 },
      cylinderLength: 4,
    };
    const problem = bluntFitProblem(body, { mach: 2, gamma, nj: 20, refinement: 1 });
    const cpu = fittedFlow(problem, 20_000);
    expect(cpu.fit.converged).toBe(true);
    const { fit, drag } = await gpuFittedFlow(device, problem, {
      maxIterations: 20_000,
      stepsPerMove: 1,
      checkEvery: 500,
      speedTolerance: 1e-5,
    });
    expect(fit.converged).toBe(true);
    // Measured when written: converged after 2500 steps (the CPU's needs
    // 4747 to reach 1e-12), 7e-8 from the CPU's drag, wandering by up to
    // 2.4e-7 when iterated on, with the shock speeds at 4e-7 to 1.2e-6 of
    // the sound speed.
    const difference = Math.abs(drag / cpu.drag - 1);
    expect(difference, `GPU ${drag}, CPU ${cpu.drag}`).toBeLessThan(GPU_NOISE);
  }, 900_000);
});
