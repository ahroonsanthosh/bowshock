import { describe, expect, it } from 'vitest';
import {
  bluntFittedFlow,
  sharpFittedFlow,
  verifiedFittedDrag,
} from '../../src/analysis/fitted-flow';
import type { Body } from '../../src/geometry/body';
import { normalShock, stagnationPressureRatio } from '../../src/validation/gas-dynamics';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const gamma = 1.4;
const deg = Math.PI / 180;
const options = { gamma, nj: 20, refinement: 1, maxIterations: 20_000 };

describe('flow with the bow shock fitted (design record 0006)', () => {
  it('Mach 3, 20 deg cone: converged, drag within 0.03% of Taylor-Maccoll on the coarsest grid', () => {
    // Measured when written: +0.0248% (nj = 20); with the captured shock -0.395%.
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
    // Measured when written: +0.0074% (nj = 20); with the captured shock +9.7%.
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
