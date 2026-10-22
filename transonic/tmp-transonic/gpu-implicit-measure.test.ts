/**
 * The GPU's red-black implicit steps against the CPU twin, and the drag's
 * 32-bit wander under them, on the cone's base grid (Mach from env-free
 * constant below). Reports through the failure message (browser mode).
 */
import { expect, it } from 'vitest';
import { solveTransonic, transonicProblem } from '../../src/analysis/transonic-flow';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { GpuEuler2D, gpuPrimitive2D, type GpuState2D } from '../../src/engine-gpu/euler2d-gpu';
import type { Body } from '../../src/geometry/body';
import { requireDevice } from '../gpu/device';

const gamma = 1.4;
const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};

function worst(cpu: Euler2D, state: GpuState2D): number {
  const { ni, nj } = cpu.metrics;
  let w = 0;
  for (let c = 0; c < ni * nj; c++) {
    const p = cpu.primitive(c % ni, Math.floor(c / ni)).p;
    w = Math.max(w, Math.abs(gpuPrimitive2D(state, c, gamma).p - p) / p);
  }
  return w;
}

it('gpu implicit', { timeout: 3_600_000 }, async () => {
  const device = await requireDevice();
  const out: string[] = [];
  for (const mach of [1.1, 1.05]) {
    const problem = transonicProblem(cone, { mach, gamma, refinement: 1, farField: 100, cylinder: 10 });
    const { flux, ...rest } = problem.config;
    expect(flux).toBe('hllc');
    const make = () => GpuEuler2D.create(device, { ...rest, flux: 'hllc' });
    const drag = (state: GpuState2D) => {
      const ev = new Euler2D(problem.config);
      const { ni } = problem.config.grid;
      ev.setCellPrimitives((i, j) => gpuPrimitive2D(state, i + j * ni, gamma));
      return problem.drag(ev);
    };
    // Step for step from the free stream, CFL ramped from 1 by 1.2.
    const cpu = new Euler2D(problem.config);
    cpu.setInitialCondition(() => problem.freeStream.state);
    let cfl = 1;
    for (let n = 0; n < 30; n++) {
      cpu.iterateImplicit(1, cfl, 1.5, { kind: 'redBlack', sweeps: 2 });
      cfl = Math.min(1000, cfl * 1.2);
    }
    const s = await make();
    s.setInitialCondition(() => problem.freeStream.state);
    await s.setImplicitCfl(1);
    const t0 = performance.now();
    await s.iterateImplicit(30, { cfl: 1000, sweeps: 2 });
    const state = await s.readState();
    out.push(`M ${mach}: 30 steps from the free stream, worst pressure difference ${worst(cpu, state).toExponential(2)}, ${((performance.now() - t0) / 30).toFixed(1)} ms per step`);
    s.destroy();
    // The wander from the CPU's converged solution.
    const base = solveTransonic(problem, { noise: 1e-10, maxSteps: 30000, checkEvery: 50, cfl: 1000, depth: 8, plainSteps: 200 });
    for (const mode of ['implicit', 'explicit']) {
      const g = await make();
      g.setCellPrimitives((i, j) => base.solver.primitive(i, j));
      await g.setImplicitCfl(1000);
      const samples: number[] = [];
      for (let k = 0; k < 12; k++) {
        if (mode === 'implicit') await g.iterateImplicit(250, { cfl: 1000, sweeps: 2 });
        else await g.iterate(250);
        samples.push(drag(await g.readState()) / base.drag - 1);
      }
      g.destroy();
      const largest = Math.max(...samples.map(Math.abs));
      out.push(`M ${mach} ${mode}: wander largest ${largest.toExponential(2)}; ${samples.map((d) => d.toExponential(1)).join(' ')}`);
    }
  }
  throw new Error('MEASURED\n' + out.join('\n'));
});
