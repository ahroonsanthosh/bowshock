import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fittedFlow, sharpFitProblem } from '../../src/analysis/fitted-flow';
import { gpuFittedFlow } from '../../src/analysis/gpu-fitted-flow';
import { GPU_NOISE } from '../../src/analysis/verified-drag';
import type { Body } from '../../src/geometry/body';
import { requireDevice } from './device';

/**
 * The fit over a boat-tail on the GPU (design record 0023 section 2.1):
 * the shock nodes' step limit in line-grid.wgsl as on the CPU, and both
 * terms watched as the fit settles.
 */

const gamma = 1.4;
const deg = Math.PI / 180;
let device: GPUDevice;
beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

describe('a boat-tail on the GPU', () => {
  it('3-caliber ogive, 6 deg boat-tail at Mach 2 (nj = 20): the CPU fit of the same problem, both terms', async () => {
    const body: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 3,
      boatTail: { length: 1, baseRadius: 0.5 - Math.tan(6 * deg) },
    };
    const problem = sharpFitProblem(body, { mach: 2, gamma, nj: 20, refinement: 1 });
    const cpu = fittedFlow(problem, 20_000);
    expect(cpu.fit.converged).toBe(true);
    const cpuTail = problem.boatTailDrag!(cpu.fit.solver.boundaryFluxes('jMin'));
    const gpu = await gpuFittedFlow(device, problem, {
      maxIterations: 30_000,
      stepsPerMove: 1,
      checkEvery: 250,
      speedTolerance: 3e-5,
    });
    expect(gpu.fit.converged).toBe(true);
    expect(Math.abs(gpu.drag / cpu.drag - 1), `GPU ${gpu.drag}, CPU ${cpu.drag}`).toBeLessThan(
      GPU_NOISE,
    );
    // The boat-tail's term is a third of the sum the fit watches: its own
    // noise up to three times the GPU's.
    expect(
      Math.abs(gpu.boatTailDrag! / cpuTail - 1),
      `GPU ${gpu.boatTailDrag}, CPU ${cpuTail}`,
    ).toBeLessThan(3 * GPU_NOISE);
  }, 1_800_000);
});
