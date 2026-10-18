import { describe, expect, it } from 'vitest';
import { flatPlateFriction } from '../../src/friction/flat-plate';
import { laminarSimilarity } from '../../src/friction/laminar';
import {
  vanDriestAverageCf,
  vanDriestFactors,
  vanDriestLocalCfAtReynolds,
} from '../../src/friction/van-driest';

const BASE = { mach: 2, temperature: 220 } as const;

describe('flat plate with transition', () => {
  it('turbulent from the leading edge by default: van Driest II', () => {
    const plate = flatPlateFriction(BASE);
    const f = vanDriestFactors(BASE);
    expect(plate.laminar).toBeUndefined();
    expect(plate.turbulentOrigin).toBe(0);
    for (const re of [1e6, 3e7]) {
      expect(plate.averageCf(re)).toBeCloseTo(vanDriestAverageCf(re, f), 15);
      expect(plate.localCf(re)).toBeCloseTo(vanDriestLocalCfAtReynolds(re, f), 15);
    }
  });

  it('laminar throughout with an infinite transition Reynolds number', () => {
    const plate = flatPlateFriction({ ...BASE, transitionReynolds: Infinity });
    const cl = laminarSimilarity(BASE).cfSqrtRe;
    for (const re of [1e5, 1e7]) {
      expect(plate.localCf(re)).toBeCloseTo(cl / Math.sqrt(re), 15);
      expect(plate.averageCf(re)).toBeCloseTo((2 * cl) / Math.sqrt(re), 15);
    }
  });

  it('the momentum thickness is continuous at transition and the local cf jumps up', () => {
    for (const reT of [3e5, 1.6e6, 5e6]) {
      const plate = flatPlateFriction({ ...BASE, transitionReynolds: reT });
      const below = plate.momentumReynolds(reT * (1 - 1e-12));
      const above = plate.momentumReynolds(reT);
      expect(Math.abs(above / below - 1)).toBeLessThan(1e-9);
      expect(plate.turbulentLocalCf(reT)).toBeGreaterThan(1.5 * plate.laminarLocalCf(reT));
      // A laminar layer is thinner than a turbulent one at the same Re_x:
      // the virtual origin lies downstream of the leading edge.
      expect(plate.turbulentOrigin).toBeGreaterThan(0);
      expect(plate.turbulentOrigin).toBeLessThan(reT);
      // The average friction lies between the laminar and turbulent plates.
      const re = 3e7;
      const turbulent = flatPlateFriction(BASE).averageCf(re);
      expect(plate.averageCf(re)).toBeLessThan(turbulent);
      expect(plate.averageCf(re)).toBeGreaterThan(0.8 * turbulent);
    }
  });

  it('each regime has its own adiabatic wall; a given wall temperature serves both', () => {
    const plate = flatPlateFriction({ ...BASE, transitionReynolds: 1e6 });
    const k = 0.2 * BASE.mach * BASE.mach;
    expect(plate.turbulent.wallTemperature).toBeCloseTo(220 * (1 + 0.89 * k), 10);
    const rLam = (plate.laminar!.wallTemperature / 220 - 1) / k;
    expect(rLam).toBeCloseTo(plate.laminar!.recoveryFactor!, 12);
    expect(rLam).toBeGreaterThan(0.83);
    expect(rLam).toBeLessThan(0.87);
    const fixed = flatPlateFriction({ ...BASE, transitionReynolds: 1e6, wallTemperature: 300 });
    expect(fixed.turbulent.wallTemperature).toBe(300);
    expect(fixed.laminar!.wallTemperature).toBeCloseTo(300, 12);
  });
});
