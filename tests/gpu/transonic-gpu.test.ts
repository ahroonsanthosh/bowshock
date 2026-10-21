import { beforeAll, describe, expect, it } from 'vitest';
import { solveTransonic, transonicProblem } from '../../src/analysis/transonic-flow';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { GpuEuler2D, gpuPrimitive2D, type GpuState2D } from '../../src/engine-gpu/euler2d-gpu';
import type { Body } from '../../src/geometry/body';
import { requireDevice } from './device';

/**
 * The transonic domain on the GPU engine (design record 0013, "The GPU
 * solve", G1): the far-field boundary of euler2d.wgsl against the CPU's.
 */

const gamma = 1.4;
const deg = Math.PI / 180;
// The 7 deg cone of NACA TN 4233 with its sting, Mach 1.1, base grid.
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};
const problem = transonicProblem(cone, {
  mach: 1.1,
  gamma,
  refinement: 1,
  farField: 100,
  cylinder: 10,
});
let device: GPUDevice;

beforeAll(async () => {
  device = await requireDevice();
});

async function gpuSolver(): Promise<GpuEuler2D> {
  const { flux, ...rest } = problem.config;
  if (flux !== 'hllc') throw new Error('the transonic problem uses HLLC');
  return GpuEuler2D.create(device, { ...rest, flux });
}

function worstPressureDifference(cpu: Euler2D, state: GpuState2D): number {
  const { ni, nj } = cpu.metrics;
  let worst = 0;
  for (let c = 0; c < ni * nj; c++) {
    const p = cpu.primitive(c % ni, Math.floor(c / ni)).p;
    worst = Math.max(worst, Math.abs(gpuPrimitive2D(state, c, gamma).p - p) / p);
  }
  return worst;
}

describe('GpuEuler2D: far-field boundaries (transonic domain)', () => {
  it('follows the CPU engine step for step from the free stream', async () => {
    const cpu = new Euler2D(problem.config);
    cpu.setInitialCondition(() => problem.freeStream.state);
    cpu.iterate(100);
    const s = await gpuSolver();
    try {
      s.setInitialCondition(() => problem.freeStream.state);
      await s.iterate(100);
      // Measured when written: 4.9e-6.
      expect(worstPressureDifference(cpu, await s.readState())).toBeLessThan(2e-5);
    } finally {
      s.destroy();
    }
  }, 600_000);

  it("holds the CPU's converged solution, its drag within its 32-bit wander", async () => {
    const cpu = solveTransonic(problem, {
      noise: 1e-9,
      maxSteps: 4000,
      checkEvery: 50,
      cfl: 1000,
      depth: 8,
      plainSteps: 200,
    });
    expect(cpu.converged).toBe(true);
    const s = await gpuSolver();
    try {
      const { ni } = problem.config.grid;
      s.setCellPrimitives((i, j) => cpu.solver.primitive(i, j));
      await s.iterate(500);
      const state = await s.readState();
      const evaluator = new Euler2D(problem.config);
      evaluator.setCellPrimitives((i, j) => gpuPrimitive2D(state, i + j * ni, gamma));
      const drag = problem.drag(evaluator);
      // The GPU's drag wanders about the CPU's with its 32-bit residual:
      // near sonic by more than the 2e-6 of supersonic flows (0005).
      // Measured when written, sampled from 100 to 5,000 steps: -6.2e-6 to
      // +4.8e-6 (design record 0013, "G1").
      expect(Math.abs(drag / cpu.drag - 1)).toBeLessThan(1e-5);
      expect(worstPressureDifference(cpu.solver, state)).toBeLessThan(1e-4);
    } finally {
      s.destroy();
    }
  }, 1_200_000);
});
