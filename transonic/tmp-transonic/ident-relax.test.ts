/**
 * Bit identity of the default implicit steps (LU-SGS, with and without
 * Anderson) before and after the relaxation option: the committed source
 * (extracted to the scratchpad) against the working tree, on the cone's
 * base grid at Mach 1.1, 300 steps. Writes the comparison to
 * tests/tmp-transonic/ident-relax.txt.
 */
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import * as now from '../../src/analysis/transonic-flow';
import * as before from '../../../../../../../tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/identHEAD/src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};

it('ident', { timeout: 3_600_000 }, () => {
  const out: string[] = [];
  for (const depth of [0, 8]) {
    const options = { mach: 1.1, gamma: 1.4, refinement: 1, farField: 100, cylinder: 10 };
    const solve = { noise: 1e-30, maxSteps: 300, checkEvery: 100, cfl: 1000, depth, plainSteps: 100 };
    const a = before.solveTransonic(before.transonicProblem(cone, options), solve);
    const b = now.solveTransonic(now.transonicProblem(cone, options), solve);
    const qa = a.solver.conserved();
    const qb = b.solver.conserved();
    let differ = 0;
    for (let k = 0; k < qa.length; k++) if (qa[k] !== qb[k]) differ++;
    out.push(`depth ${depth}: steps ${a.steps} ${b.steps}, drag ${a.drag} ${b.drag}, identical ${a.drag === b.drag}, values differing ${differ} of ${qa.length}`);
  }
  writeFileSync('tests/tmp-transonic/ident-relax.txt', out.join('\n') + '\n');
});
