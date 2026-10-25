import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  FALLBACK_COLUMN_DENSITY,
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
  TWO_SCALE_DRAG_FLOOR,
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

  it('the page path on an ellipsoid at Mach 1.2: where its fit stops, within 5e-6 of the CPU', async () => {
    // 1.5 calibers with 1 of body asked (solved with 3: solvedBluntBody).
    // The CPU's fit of the same problem converged to 1e-12 gives
    // 0.2474069016; measured when written, the GPU's 0.2474075928 (+2.8e-6),
    // above the 2e-6 assumed for its noise elsewhere (0006).
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 1.5, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const levels: LevelReport[] = [];
    const result = await verifiedFittedDragGpu(device, body, {
      mach: 1.2,
      gamma,
      tolerance: 0,
      maxRefinement: 1,
      floor: FITTED_DRAG_FLOOR,
      orderTolerance: ORDER_TOLERANCE,
      onLevel: (report) => levels.push(report),
    });
    expect(result.kind).toBe('solved');
    expect(levels).toHaveLength(1);
    expect(Math.abs(levels[0]!.drag / 0.2474069016 - 1)).toBeLessThan(5e-6);
  }, 1_800_000);

  it('the page path on a tangent ogive whose tip flow is axially subsonic: the CPU fit within the GPU noise', async () => {
    // A 3-caliber tangent ogive at Mach 1.35: supersonic surface flow
    // (Mach 1.04) with a subsonic axial component (0.98), served since the
    // ogive meets the cylinder without a corner (0006). The CPU's fit of
    // the page's base grid, converged to 1e-12, gives 0.1081856017.
    const ogive: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    const levels: LevelReport[] = [];
    const result = await verifiedFittedDragGpu(device, ogive, {
      mach: 1.35,
      gamma,
      tolerance: 0,
      maxRefinement: 1,
      floor: FITTED_DRAG_FLOOR,
      orderTolerance: ORDER_TOLERANCE,
      onLevel: (report) => levels.push(report),
    });
    expect(result.kind).toBe('solved');
    expect(levels).toHaveLength(1);
    const difference = Math.abs(levels[0]!.drag / 0.1081856017 - 1);
    expect(difference, `GPU ${levels[0]!.drag}`).toBeLessThan(GPU_NOISE);
  }, 1_800_000);

  it('the page path solves again with more columns where the usual grid fails the quality gates', async () => {
    // As on the CPU (tests/analysis/fitted-flow.test.ts): a 3-caliber
    // tangent ogive with 30 calibers of cylinder at Mach 1.5, whose usual
    // grid's wall cells at the end of the cylinder are too flat. The CPU's
    // fit of the grid with 1.5 times the columns, converged to 1e-12,
    // gives 0.10583491196235459.
    const ogive: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 30,
    };
    const levels: LevelReport[] = [];
    const fallbacks: number[] = [];
    const result = await verifiedFittedDragGpu(device, ogive, {
      mach: 1.5,
      gamma,
      tolerance: 0,
      maxRefinement: 1,
      floor: FITTED_DRAG_FLOOR,
      orderTolerance: ORDER_TOLERANCE,
      onLevel: (report) => levels.push(report),
      onFallback: (refinement) => fallbacks.push(refinement),
    });
    expect(fallbacks).toEqual([1]);
    expect(result.kind).toBe('solved');
    if (result.kind === 'solved') expect(result.columnDensity).toBe(FALLBACK_COLUMN_DENSITY);
    expect(levels).toHaveLength(1);
    const difference = Math.abs(levels[0]!.drag / 0.10583491196235459 - 1);
    expect(difference, `GPU ${levels[0]!.drag}`).toBeLessThan(GPU_NOISE);
  }, 1_800_000);

  it('the page path on a Von Karman nose: within the GPU noise of the CPU, with its allowance', async () => {
    // 1 caliber with 1 of body at Mach 2: a two-scale start (both
    // captures, in chunks on the CPU), then the fit on the GPU. The CPU's
    // fit of the same problem gives 0.42909806331220435 (0006,
    // "Two-scale noses"); the GPU's, measured again on the merged code
    // (2026-10-22, SwiftShader): 0.42909808121884696 (+4.17e-8).
    const body: Body = {
      nose: { shape: { kind: 'haack', parameter: 0 }, length: 1, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const levels: LevelReport[] = [];
    const steps: [number, number][] = [];
    const result = await verifiedFittedDragGpu(device, body, {
      mach: 2,
      gamma,
      tolerance: 0,
      maxRefinement: 1,
      floor: FITTED_DRAG_FLOOR,
      orderTolerance: ORDER_TOLERANCE,
      onLevel: (report) => levels.push(report),
      onStart: (done, total) => steps.push([done, total]),
    });
    expect(result.kind).toBe('solved');
    if (result.kind === 'solved') expect(result.floor).toBe(TWO_SCALE_DRAG_FLOOR);
    expect(steps.at(-1)).toEqual([6000, 6000]);
    expect(levels).toHaveLength(1);
    const difference = Math.abs(levels[0]!.drag / 0.42909806331220435 - 1);
    expect(difference, `GPU ${levels[0]!.drag}`).toBeLessThan(GPU_NOISE);
  }, 1_800_000);

  it('the page refuses two-scale noses other than the Von Karman nose checked, with the reason', async () => {
    const power: Body = {
      nose: { shape: { kind: 'power', exponent: 0.75 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    const result = await verifiedFittedDragGpu(device, power, {
      mach: 2,
      gamma,
      tolerance: 0,
      maxRefinement: 1,
      floor: FITTED_DRAG_FLOOR,
      orderTolerance: ORDER_TOLERANCE,
    });
    expect(result.kind).toBe('invalid');
    if (result.kind === 'invalid') expect(result.reason).toMatch(/only the Von Karman/);
  }, 60_000);

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
