/**
 * The two-float GPU solver against the CPU: its residual on a rough
 * state, its implicit steps against the CPU twin, and the drag's wander
 * from the CPU's converged solution. Reports through the failure message.
 */
import { it } from 'vitest';
import { solveTransonic, transonicProblem } from '../../src/analysis/transonic-flow';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { GpuEuler2DTwoFloat } from '../../src/engine-gpu/euler2d-two-float';
import type { Body } from '../../src/geometry/body';
import { pressureFromConserved2D } from '../../src/scheme/gas';
import { requireDevice } from '../gpu/device';

const gamma = 1.4;
const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};

it('gpu two-float', { timeout: 7_200_000 }, async () => {
  const device = await requireDevice();
  const out: string[] = [];
  for (const mach of [1.1, 1.05]) {
    const problem = transonicProblem(cone, { mach, gamma, refinement: 1, farField: 100, cylinder: 10 });
    const { ni } = problem.config.grid;
    const evaluate = (q: Float64Array) => {
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
    };
    // The residual on a rough state: 60 explicit CPU steps from the free stream.
    const rough = new Euler2D(problem.config);
    rough.setInitialCondition(() => problem.freeStream.state);
    rough.iterate(60);
    const gpu = await GpuEuler2DTwoFloat.create(device, problem.config);
    gpu.setCellPrimitives((i, j) => rough.primitive(i, j));
    const rg = await gpu.residual();
    const rc = rough.residualVector();
    let worst = 0;
    let scale = 0;
    for (let k = 0; k < rc.length; k++) {
      worst = Math.max(worst, Math.abs(rg[k]! - rc[k]!));
      scale = Math.max(scale, Math.abs(rc[k]!));
    }
    out.push(`M ${mach}: residual on a rough state, largest difference ${worst.toExponential(2)} of largest ${scale.toExponential(2)} (${(worst / scale).toExponential(2)})`);
    // Step for step from the free stream against the CPU twin.
    const cpu = new Euler2D(problem.config);
    cpu.setInitialCondition(() => problem.freeStream.state);
    let cfl = 1;
    for (let n = 0; n < 30; n++) {
      cpu.iterateImplicit(1, cfl, 1.5, { kind: 'redBlack', sweeps: 2 });
      cfl = Math.min(1000, cfl * 1.2);
    }
    gpu.setCellPrimitives(() => problem.freeStream.state);
    await gpu.setImplicitCfl(1);
    const t0 = performance.now();
    await gpu.iterateImplicit(30, { cfl: 1000, sweeps: 2 });
    const ms = (performance.now() - t0) / 30;
    const after = evaluate(await gpu.readConserved());
    let worstP = 0;
    for (let j = 0; j < problem.config.grid.nj; j++) {
      for (let i = 0; i < ni; i++) {
        const p = cpu.primitive(i, j).p;
        worstP = Math.max(worstP, Math.abs(after.primitive(i, j).p / p - 1));
      }
    }
    out.push(`M ${mach}: 30 implicit steps, worst pressure difference ${worstP.toExponential(2)}, ${ms.toFixed(1)} ms per step`);
    // The wander from the CPU's converged solution, and where the GPU settles.
    const base = solveTransonic(problem, { noise: 1e-12, maxSteps: 40000, checkEvery: 50, cfl: 1000, depth: 8, plainSteps: 200 });
    gpu.setCellPrimitives((i, j) => base.solver.primitive(i, j));
    await gpu.setImplicitCfl(1000);
    const samples: number[] = [];
    for (let k = 0; k < 12; k++) {
      await gpu.iterateImplicit(250, { cfl: 1000, sweeps: 2 });
      samples.push(problem.drag(evaluate(await gpu.readConserved())) / base.drag - 1);
    }
    out.push(`M ${mach}: CPU drag ${base.drag} (${base.steps} steps); GPU drag relative to it every 250 steps: ${samples.map((d) => d.toExponential(2)).join(' ')}`);
    gpu.destroy();
  }
  throw new Error('MEASURED\n' + out.join('\n'));
});
