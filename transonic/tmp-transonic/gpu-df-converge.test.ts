/**
 * The two-float GPU solver from the free stream on the cone's base grid:
 * steps until the drag settles (changes below 1e-9 of it over 200 steps,
 * twice running), and the drag against the CPU's converged value. Env-free;
 * reports through the failure message.
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

it('gpu two-float converge', { timeout: 7_200_000 }, async () => {
  const device = await requireDevice();
  const out: string[] = [];
  for (const [mach, sweeps] of [
    [1.2, 2],
    [1.1, 2],
    [1.1, 4],
    [1.05, 4],
  ] as const) {
    const problem = transonicProblem(cone, { mach, gamma, refinement: 1, farField: 100, cylinder: 10 });
    const { ni } = problem.config.grid;
    const dragOf = (q: Float64Array) => {
      const ev = new Euler2D(problem.config);
      ev.setCellPrimitives((i, j) => {
        const c = 4 * (i + j * ni);
        const rho = q[c]!;
        return { rho, u: q[c + 1]! / rho, v: q[c + 2]! / rho, p: pressureFromConserved2D(rho, q[c + 1]!, q[c + 2]!, q[c + 3]!, gamma) };
      });
      return problem.drag(ev);
    };
    const base = solveTransonic(problem, { noise: 1e-12, maxSteps: 40000, checkEvery: 50, cfl: 1000, depth: 8, plainSteps: 200 });
    const gpu = await GpuEuler2DTwoFloat.create(device, problem.config);
    gpu.setCellPrimitives(() => problem.freeStream.state);
    await gpu.setImplicitCfl(1);
    const t0 = performance.now();
    let previous = Number.NaN;
    let passes = 0;
    let steps = 0;
    let drag = Number.NaN;
    while (steps < 30000 && passes < 2) {
      await gpu.iterateImplicit(200, { cfl: 1000, sweeps });
      steps += 200;
      drag = dragOf(await gpu.readConserved());
      passes = Math.abs(drag - previous) < 1e-9 * Math.abs(drag) ? passes + 1 : 0;
      previous = drag;
    }
    const seconds = (performance.now() - t0) / 1000;
    out.push(`M ${mach}, red-black ${sweeps} sweeps: settled ${passes >= 2} after ${steps} steps (${seconds.toFixed(0)} s); drag ${drag} against the CPU's ${base.drag}: ${(drag / base.drag - 1).toExponential(2)}`);
    gpu.destroy();
  }
  throw new Error('MEASURED\n' + out.join('\n'));
});
