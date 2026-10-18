import { describe, expect, it } from 'vitest';
import { solveTransonic, transonicProblem } from '../../src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';
import { TN4233_CONE_HALF_ANGLE } from '../../src/validation/cone-cylinder-tn4233';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const gamma = 1.4;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan(TN4233_CONE_HALF_ANGLE), baseRadius: 1 },
  cylinderLength: 0,
};

describe('transonic forebody drag (design record 0007)', () => {
  it('Mach 1.2, the 7 deg cone of NACA TN 4233: the base grid within 0.3% of Taylor-Maccoll', () => {
    // At Mach 1.2 the cone's surface flow is supersonic (Mach 1.14), so
    // the drag of the cone-cylinder is the conical value. Measured when
    // written: 0.0832184 on the base grid (+0.25%), 0.0830547 and
    // 0.0830207 on the next two (0007).
    const problem = transonicProblem(cone, {
      mach: 1.2,
      gamma,
      refinement: 1,
      farField: 100,
      cylinder: 10,
    });
    const solution = solveTransonic(problem, {
      noise: 1e-7,
      maxSteps: 4000,
      checkEvery: 50,
      cfl: 1000,
      depth: 8,
      plainSteps: 200,
    });
    expect(solution.converged).toBe(true);
    const exact = taylorMaccoll(1.2, TN4233_CONE_HALF_ANGLE, gamma).surfacePressureCoefficient;
    expect(Math.abs(solution.drag / exact - 1)).toBeLessThan(3e-3);
  }, 600_000);
});
