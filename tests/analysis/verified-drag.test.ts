import { describe, expect, it } from 'vitest';
import {
  cpuEngine,
  verifiedForebodyDrag,
  type EngineFactory,
} from '../../src/analysis/verified-drag';
import type { Body } from '../../src/geometry/body';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const gamma = 1.4;
const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(20 * deg), baseRadius: 0.5 },
  cylinderLength: 2,
};
const options = {
  mach: 3,
  gamma,
  tolerance: 1e-4,
  noise: 1e-12,
  floor: 2e-4,
  orderTolerance: 0.5,
};

describe('verified forebody drag', () => {
  it('reports a grid that never settles as not converged, never as a value', async () => {
    let calls = 0;
    // An engine whose wall pressure keeps drifting.
    const drifting: EngineFactory = () =>
      Promise.resolve({
        iterate: () => {
          calls += 1;
        },
        wallFluxes: () => [
          { x: 1, y: 0.5, nx: 0.3, ny: -0.95, area: 0.5, flux: [0, 1 + calls * 1e-3, 0, 0] },
        ],
      });
    const result = await verifiedForebodyDrag(cone, { ...options, maxRefinement: 8 }, drifting);
    expect(result.kind).toBe('not-converged');
    if (result.kind === 'not-converged') expect(result.reason).toMatch(/still changes/);
  });

  it('solves each grid to iterative convergence of the drag, which on a cone is the pressure coefficient', async () => {
    const levels: number[] = [];
    const result = await verifiedForebodyDrag(
      cone,
      { ...options, maxRefinement: 1, onLevel: (l) => levels.push(l.refinement) },
      cpuEngine,
    );
    expect(result.kind).toBe('solved');
    if (result.kind !== 'solved') return;
    expect(levels).toEqual([1]);
    // One grid gives no error band.
    expect(result.verified).toBe(false);
    expect(result.estimate.kind).toBe('unresolved');
    // Measured when written: -0.354% of the Taylor-Maccoll Cp on nj = 20.
    const cp = taylorMaccoll(3, 20 * deg, gamma).surfacePressureCoefficient;
    expect(Math.abs(result.reports[0]!.drag / cp - 1)).toBeLessThan(4e-3);
  }, 120_000);
});
