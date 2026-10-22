/** Reviewer probe: base-grid cone on nested far boundaries 55.1/100.6/224.2/408.7 at MACH; prints domainAllowance. */
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { solveTransonic, transonicProblem } from '../../src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';
import { domainAllowance } from '../../src/verification/domain-allowance';

const deg = Math.PI / 180;
const cone7: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};

it('far probe', () => {
  const mach = Number(process.env.MACH);
  const out = process.env.OUT!;
  const drags: number[] = [];
  const list = (process.env.DOMAINS ?? '50,100,200,400').split(',').map(Number);
  for (const nested of list.map((d) => (d === 100 ? undefined : { farField: d }))) {
    const problem = transonicProblem(cone7, {
      mach, gamma: 1.4, refinement: 1, farField: 100, cylinder: 10,
      ...(nested === undefined ? {} : { nested }),
    });
    const s = solveTransonic(problem, {
      noise: 1e-7, maxSteps: 80000, checkEvery: 50, cfl: 1000, depth: 0, plainSteps: 200,
      knownRate: Number.NaN, geometricNoise: 1e-9,
    });
    drags.push(s.drag);
    appendFileSync(out, JSON.stringify({ mach, nested: nested ?? null, farRadius: problem.grid.farRadius, drag: s.drag, converged: s.converged, steps: s.steps, stoppedBy: s.stoppedBy }) + '\n');
  }
  
}, 1e8);
