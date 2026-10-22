import { beforeAll, describe, expect, it } from 'vitest';
import { solveTransonic, transonicProblem } from '../../src/analysis/transonic-flow';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { GpuEuler2D, gpuPrimitive2D, type GpuState2D } from '../../src/engine-gpu/euler2d-gpu';
import { GpuEuler2DTwoFloat } from '../../src/engine-gpu/euler2d-two-float';
import type { Body } from '../../src/geometry/body';
import { pressureFromConserved2D } from '../../src/scheme/gas';
import { requireDevice } from './device';

/**
 * The transonic domain on the GPU (design record 0013, "The GPU solve"):
 * the far-field boundary and the implicit steps of the 32-bit engine
 * against the CPU's (G1, G2), and the two-float solver (step 4b).
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

  it('red-black implicit steps follow the CPU twin step for step, the CFL number ramped from 1', async () => {
    const cpu = new Euler2D(problem.config);
    cpu.setInitialCondition(() => problem.freeStream.state);
    let cfl = 1;
    for (let n = 0; n < 30; n++) {
      cpu.iterateImplicit(1, cfl, 1.5, { kind: 'redBlack', sweeps: 2 });
      cfl = Math.min(1000, cfl * 1.2);
    }
    const s = await gpuSolver();
    try {
      s.setInitialCondition(() => problem.freeStream.state);
      await s.setImplicitCfl(1);
      await s.iterateImplicit(30, { cfl: 1000, sweeps: 2 });
      // Measured when written: 2.8e-6.
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

describe('GpuEuler2DTwoFloat: the transonic solve in two-float', () => {
  /** An Euler2D holding conserved variables read back from the GPU. */
  function evaluator(q: Float64Array): Euler2D {
    const { ni } = problem.config.grid;
    const ev = new Euler2D(problem.config);
    ev.setCellPrimitives((i, j) => {
      const c = 4 * (i + j * ni);
      const rho = q[c]!;
      return {
        rho,
        u: q[c + 1]! / rho,
        v: q[c + 2]! / rho,
        p: pressureFromConserved2D(rho, q[c + 1]!, q[c + 2]!, q[c + 3]!, gamma),
      };
    });
    return ev;
  }

  it("its residual is the CPU's double one, on a rough state", async () => {
    const rough = new Euler2D(problem.config);
    rough.setInitialCondition(() => problem.freeStream.state);
    rough.iterate(60);
    const s = await GpuEuler2DTwoFloat.create(device, problem.config);
    try {
      s.setCellPrimitives((i, j) => rough.primitive(i, j));
      const gpu = await s.residual();
      const cpu = rough.residualVector();
      let worst = 0;
      let largest = 0;
      for (let k = 0; k < cpu.length; k++) {
        worst = Math.max(worst, Math.abs(gpu[k]! - cpu[k]!));
        largest = Math.max(largest, Math.abs(cpu[k]!));
      }
      // Measured when written: 2.2e-9 of the largest (1.4e-10), on cells
      // whose faces carry fluxes times areas of order 1e3: about 1e-13 of
      // them, the two-float precision.
      expect(worst).toBeLessThan(1e-8 * largest);
    } finally {
      s.destroy();
    }
  }, 600_000);

  it("holds the CPU's converged solution, its drag within 1e-10, with no wander", async () => {
    const cpu = solveTransonic(problem, {
      noise: 1e-12,
      maxSteps: 40000,
      checkEvery: 50,
      cfl: 1000,
      depth: 8,
      plainSteps: 200,
    });
    expect(cpu.converged).toBe(true);
    const s = await GpuEuler2DTwoFloat.create(device, problem.config);
    try {
      s.setCellPrimitives((i, j) => cpu.solver.primitive(i, j));
      await s.setImplicitCfl(1000);
      const drags: number[] = [];
      for (let k = 0; k < 4; k++) {
        await s.iterateImplicit(250, { cfl: 1000, sweeps: 2 });
        drags.push(problem.drag(evaluator(await s.readConserved())) / cpu.drag - 1);
      }
      // Measured when written, every 250 steps over 3,000: -4.5e-12 to
      // -9.5e-12 (the 32-bit engine: up to 7.1e-5).
      for (const d of drags) expect(Math.abs(d)).toBeLessThan(1e-10);
    } finally {
      s.destroy();
    }
  }, 1_800_000);
});
