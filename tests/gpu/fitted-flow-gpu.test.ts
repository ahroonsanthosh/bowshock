import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  bluntFitFamily,
  bluntFitProblem,
  fittedFlow,
  sharpFitProblem,
} from '../../src/analysis/fitted-flow';
import { gpuFittedFlow, verifiedFittedDragGpu } from '../../src/analysis/gpu-fitted-flow';
import {
  FITTED_DRAG_FLOOR,
  GPU_NOISE,
  ORDER_TOLERANCE,
  type LevelReport,
} from '../../src/analysis/verified-drag';
import type { Body } from '../../src/geometry/body';
import { requireDevice } from './device';

/**
 * The fitted-shock iteration run entirely on the GPU
 * (src/engine-gpu/shock-fitting-gpu.ts) against the CPU's fit of the same
 * problem on the same grids (design record 0006).
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

  it('Mach 3, 20 deg bare cone: the CPU fit drag to within the GPU noise', async () => {
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(20 * deg), baseRadius: 0.5 },
      cylinderLength: 0,
    };
    const problem = sharpFitProblem(cone, { mach: 3, gamma, nj: 20, refinement: 1 });
    const cpu = fittedFlow(problem, 20_000);
    expect(cpu.fit.converged).toBe(true);
    const { fit, drag } = await gpuFittedFlow(device, problem, {
      maxIterations: 20_000,
      stepsPerMove: 1,
      checkEvery: 500,
      speedTolerance: 3e-5,
    });
    expect(fit.converged).toBe(true);
    // Measured when written on a 20 deg cone at Mach 5: within 1.8e-7.
    const difference = Math.abs(drag / cpu.drag - 1);
    expect(difference, `GPU ${drag}, CPU ${cpu.drag}`).toBeLessThan(GPU_NOISE);
  }, 900_000);

  it('the page path on a blunt nose: the CPU fits of the same problems within the GPU noise', async () => {
    // One captured start, in chunks, then refinement 2 started from the
    // converged refinement 1.
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 0.5, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const levels: LevelReport[] = [];
    const steps: number[] = [];
    const result = await verifiedFittedDragGpu(device, body, {
      mach: 3,
      gamma,
      tolerance: 0,
      maxRefinement: 2,
      floor: FITTED_DRAG_FLOOR,
      orderTolerance: ORDER_TOLERANCE,
      onLevel: (report) => levels.push(report),
      onStart: (done) => steps.push(done),
    });
    expect(result.kind).toBe('solved');
    expect(steps.at(-1)).toBe(3000);
    expect(levels.map((l) => l.refinement)).toEqual([1, 2]);
    const family = bluntFitFamily(body, { mach: 3, gamma, nj: 20 });
    for (const level of levels) {
      const cpu = fittedFlow(family(level.refinement), 40_000 * level.refinement);
      expect(cpu.fit.converged).toBe(true);
      const difference = Math.abs(level.drag / cpu.drag - 1);
      expect(
        difference,
        `refinement ${level.refinement}: GPU ${level.drag}, CPU ${cpu.drag}`,
      ).toBeLessThan(GPU_NOISE);
    }
  }, 1_800_000);

  it('the page refuses a tip whose flow is subsonic at the surface, with the reason', async () => {
    // A 26.6 deg cone at Mach 1.5: subsonic conical surface flow.
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 1, baseRadius: 0.5 },
      cylinderLength: 0,
    };
    await expect(
      verifiedFittedDragGpu(device, cone, {
        mach: 1.5,
        gamma,
        tolerance: 0,
        maxRefinement: 1,
        floor: FITTED_DRAG_FLOOR,
        orderTolerance: ORDER_TOLERANCE,
      }),
    ).rejects.toThrow(/is subsonic at the surface/);
  }, 900_000);
});
