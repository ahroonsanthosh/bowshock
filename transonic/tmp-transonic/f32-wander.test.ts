/**
 * How much of the GPU's drag wander at Mach 1.1 comes from storing the
 * state in 32 bits, and whether implicit steps damp it: the CPU engine
 * from its converged solution, rounding every conserved variable to 32
 * bits after each step (Math.fround), with explicit steps and with LU-SGS
 * steps; the drag sampled every 100 steps. Writes f32-wander.txt.
 */
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { solveTransonic, transonicProblem } from '../../src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};

it('f32 wander', { timeout: 7_200_000 }, () => {
  const out: string[] = [];
  const mach = Number(process.env.MACH ?? 1.1);
  const problem = transonicProblem(cone, { mach, gamma: 1.4, refinement: 1, farField: 100, cylinder: 10 });
  const base = solveTransonic(problem, { noise: 1e-10, maxSteps: 20000, checkEvery: 50, cfl: 1000, depth: 8, plainSteps: 200 });
  out.push(`converged ${base.converged} drag ${base.drag} steps ${base.steps}`);
  const start = base.solver.conserved().slice();
  for (const mode of ['explicit', 'lusgs', 'lusgs-cfl100', 'jacobi4']) {
    const s = base.solver;
    s.setConserved(start);
    const drags: number[] = [];
    for (let n = 0; n < 3000; n++) {
      if (mode === 'explicit') s.iterate(1);
      else if (mode === 'lusgs') s.iterateImplicit(1, 1000);
      else if (mode === 'lusgs-cfl100') s.iterateImplicit(1, 100);
      else s.iterateImplicit(1, 1000, 1.5, { kind: 'jacobi', sweeps: 4 });
      const q = s.conserved();
      for (let k = 0; k < q.length; k++) q[k] = Math.fround(q[k]!);
      s.setConserved(q);
      if ((n + 1) % 100 === 0) drags.push(problem.drag(s) / base.drag - 1);
    }
    const late = drags.slice(5);
    const max = Math.max(...late.map(Math.abs));
    const mean = late.reduce((a, b) => a + b, 0) / late.length;
    out.push(`${mode}: largest ${max.toExponential(2)}, mean ${mean.toExponential(2)}; ${drags.map((d) => d.toExponential(1)).join(' ')}`);
  }
  writeFileSync(`tests/tmp-transonic/f32-wander-m${mach}.txt`, out.join('\n') + '\n');
});
