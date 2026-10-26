import { describe, expect, it } from 'vitest';
import { compiledCurveValue } from '../../src/base/compiled-curve';
import { effectiveExpansionAngle, loveBasePressure } from '../../src/base/love-boat-tail';
import { machFromPrandtlMeyer, prandtlMeyer } from '../../src/validation/gas-dynamics';

/** Love's method behind a boat-tail (design record 0023 section 4): its algebra, not its band. */

const deg = Math.PI / 180;
const gamma = 1.4;

describe("Love's base pressure behind a boat-tail", () => {
  it('reproduces the served cylinder curve on a long cylinder, from either reading', () => {
    for (const curve of ['lessNegative', 'moreNegative'] as const) {
      for (const mach of [1.5, 1.8, 2, 2.4, 3]) {
        const value = loveBasePressure({
          mach,
          machAhead: mach,
          pressureRatioAhead: 1,
          angle: 0,
          diameterRatio: 1,
          curve,
        });
        expect(value).toBeCloseTo(compiledCurveValue(mach, curve), 12);
      }
    }
  });

  it('turns the flow ahead of the base through delta_e - K beta, K = 0.85 + 0.15 h/D', () => {
    const mach = 2;
    const machAhead = 2.2;
    const pressureRatioAhead = 0.8;
    const angle = 8 * deg;
    for (const diameterRatio of [0.5, 0.75, 1]) {
      const value = loveBasePressure({
        mach,
        machAhead,
        pressureRatioAhead,
        angle,
        diameterRatio,
        curve: 'lessNegative',
      });
      const turn =
        effectiveExpansionAngle(machAhead, 'lessNegative') - (0.85 + 0.15 * diameterRatio) * angle;
      const machBase = machFromPrandtlMeyer(prandtlMeyer(machAhead, gamma) + turn, gamma);
      const ratio =
        ((1 + 0.2 * machAhead ** 2) / (1 + 0.2 * machBase ** 2)) ** 3.5 * pressureRatioAhead;
      expect(value).toBeCloseTo((ratio - 1) / (0.7 * mach * mach), 12);
    }
  });

  it('a boat-tail raises the base pressure at a given flow ahead of the base; the base pressure scales with it', () => {
    const at = (angleDeg: number, pressureRatioAhead = 1) =>
      loveBasePressure({
        mach: 2,
        machAhead: 2,
        pressureRatioAhead,
        angle: angleDeg * deg,
        diameterRatio: 0.7,
        curve: 'lessNegative',
      });
    expect(at(4)).toBeGreaterThan(at(0));
    expect(at(8)).toBeGreaterThan(at(4));
    // p_b is proportional to p_0 at a given M_0 and turn.
    const q = 0.7 * 4;
    expect(at(6, 0.9) * q + 1).toBeCloseTo(0.9 * (at(6) * q + 1), 12);
  });

  it('refuses a subsonic flow ahead of the base, and a boat-tail steeper than the expansion', () => {
    const input = {
      mach: 2,
      machAhead: 2,
      pressureRatioAhead: 1,
      angle: 0,
      diameterRatio: 1,
      curve: 'lessNegative',
    } as const;
    expect(() => loveBasePressure({ ...input, machAhead: 0.9 })).toThrow(/supersonic/);
    expect(() => loveBasePressure({ ...input, diameterRatio: 0 })).toThrow(/diameter ratio/);
    expect(() => loveBasePressure({ ...input, angle: 40 * deg })).toThrow(/exceeds/);
  });
});
