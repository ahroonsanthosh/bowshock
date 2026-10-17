import { describe, expect, it } from 'vitest';
import {
  baseMach,
  bluntFittedFlow,
  fittedFlow,
  sharpFitProblem,
  sharpFittedFlow,
  verifiedFittedDrag,
  wallDrag,
} from '../../src/analysis/fitted-flow';
import type { Body } from '../../src/geometry/body';
import { normalShock, stagnationPressureRatio } from '../../src/validation/gas-dynamics';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const gamma = 1.4;
const deg = Math.PI / 180;
const options = { gamma, nj: 20, refinement: 1, maxIterations: 20_000 };

describe('flow with the bow shock fitted (design record 0006)', () => {
  it('Mach 3, 20 deg cone: converged, drag within 0.03% of Taylor-Maccoll on the coarsest grid', () => {
    // Measured when written: +0.0251% (nj = 20); with the captured shock -0.395%.
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(20 * deg), baseRadius: 0.5 },
      cylinderLength: 4,
    };
    const { fit, drag } = sharpFittedFlow(cone, { ...options, mach: 3 });
    expect(fit.converged).toBe(true);
    const exact = taylorMaccoll(3, 20 * deg, gamma).surfacePressureCoefficient;
    expect(Math.abs(drag / exact - 1)).toBeLessThan(3e-4);
  }, 600_000);

  it('Mach 2 hemisphere-cylinder: converged, stagnation pressure within 0.01% of the pitot value', () => {
    // Measured when written: +0.0076% (nj = 20); with the captured shock +9.7%.
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 0.5, baseRadius: 0.5 },
      cylinderLength: 4,
    };
    const { fit } = bluntFittedFlow(body, { ...options, mach: 2 });
    expect(fit.converged).toBe(true);
    const shock = normalShock(2, gamma);
    const pitot = shock.pressureRatio * stagnationPressureRatio(shock.downstreamMach, gamma);
    const face = fit.solver.boundaryFluxes('jMin')[0]!;
    const p = face.flux[1] * face.nx + face.flux[2] * face.ny;
    expect(Math.abs(p / pitot - 1)).toBeLessThan(1e-4);
  }, 600_000);

  it('a bare nose is solved with a cylinder behind it only where the flow leaves its base supersonically', () => {
    // A 20 deg cone at Mach 3 leaves its base at Mach 2; the same grid
    // with the flow slowed to Mach 0.42 everywhere is refused.
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(20 * deg), baseRadius: 0.5 },
      cylinderLength: 0,
    };
    const problem = sharpFitProblem(cone, { gamma, nj: 20, refinement: 1, mach: 3 });
    const { fit } = fittedFlow(problem, 20_000);
    expect(fit.converged).toBe(true);
    expect(baseMach(problem, fit.grid, (i, j) => fit.solver.primitive(i, j))).toBeGreaterThan(1);
    const slow = { rho: 1, u: 0.5, v: 0, p: 1 };
    expect(baseMach(problem, fit.grid, () => slow)).toBeLessThan(1);
  }, 600_000);

  it('the drag from the rows of cells at the wall alone is the drag from the whole grid', () => {
    // The page evaluates it on a strip, the finest grids having millions of cells.
    const ogive: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const problem = sharpFitProblem(ogive, { gamma, nj: 20, refinement: 1, mach: 2 });
    const { fit, drag } = fittedFlow(problem, 20_000);
    expect(fit.converged).toBe(true);
    const strip = wallDrag(problem, fit.grid, (i, j) => fit.solver.primitive(i, j));
    expect(Math.abs(strip / drag - 1)).toBeLessThan(1e-14);
  }, 600_000);

  it('a tip too blunt for an attached shock is refused with its angle and what to change', () => {
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    expect(() => sharpFitProblem(cone, { gamma, nj: 20, refinement: 1, mach: 1.2 })).toThrow(
      /at Mach 1.2 the bow shock cannot stay attached to a tip of 45.0 deg half-angle; this needs a sharper or longer nose/,
    );
  });

  it('a tip whose conical flow is subsonic near the surface is refused', () => {
    // The 3-caliber tangent ogive at Mach 1.2: an 18.9 deg tip cone, its
    // surface flow at Mach 0.85.
    const ogive: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    expect(() => sharpFitProblem(ogive, { gamma, nj: 20, refinement: 1, mach: 1.2 })).toThrow(
      /at Mach 1.2 the flow over a tip of 18.9 deg half-angle is subsonic near the surface/,
    );
    // At Mach 1.5 it is supersonic, and the problem is built.
    expect(() => sharpFitProblem(ogive, { gamma, nj: 20, refinement: 1, mach: 1.5 })).not.toThrow();
  });

  it('verified fitted drag: a grid that does not converge gives no value, only the reason', async () => {
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(20 * deg), baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const result = await verifiedFittedDrag(cone, {
      mach: 3,
      gamma,
      maxRefinement: 8,
      floor: 0,
      tolerance: 0,
      iterationsPerRefinement: 10,
    });
    expect(result.kind).toBe('not-converged');
    if (result.kind === 'not-converged') {
      expect(result.refinement).toBe(1);
      expect(result.reason).toMatch(/the fit stopped after 10 iterations/);
    }
  }, 600_000);
});
