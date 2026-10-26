import { describe, expect, it } from 'vitest';
import type { Body } from '../../src/geometry/body';
import { linearBoatTailDrag } from '../../src/validation/linear-body';

/** Linearised theory of a boat-tail's drag (design record 0023 section 2.2): a sanity check. */

const deg = Math.PI / 180;
const body = (angle: number, length: number, cylinder = 3): Body => ({
  nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
  cylinderLength: cylinder,
  boatTail: { length, baseRadius: 0.5 - length * Math.tan(angle * deg) },
});

describe('linearised theory of a boat-tail', () => {
  it('converges, and lies within 1.5% of the method of characteristics on a 6 deg boat-tail at Mach 2', () => {
    // Measured when written: 0.03502576, 0.03501692, 0.03501614,
    // 0.03501591, 0.03501583 on 200 to 3200 intervals; the march gives
    // 0.0345663 (tests/validation/characteristics-corners.test.ts).
    const fine = linearBoatTailDrag(body(6, 1), { mach: 2, intervals: 800 });
    expect(Math.abs(fine - 0.0350158)).toBeLessThan(1e-6);
    expect(fine / 0.0345663 - 1).toBeGreaterThan(0);
    expect(fine / 0.0345663 - 1).toBeLessThan(0.015);
  }, 120_000);

  it('grows with the angle and the length, and falls with the Mach number', () => {
    const at = (angle: number, length: number, mach: number) =>
      linearBoatTailDrag(body(angle, length), { mach, intervals: 400 });
    expect(at(8, 1, 2)).toBeGreaterThan(at(6, 1, 2));
    expect(at(6, 1.5, 2)).toBeGreaterThan(at(6, 1, 2));
    expect(at(6, 1, 3)).toBeLessThan(at(6, 1, 2));
  }, 120_000);

  it('refuses a body without a boat-tail', () => {
    expect(() =>
      linearBoatTailDrag({ nose: body(6, 1).nose, cylinderLength: 3 }, { mach: 2, intervals: 100 }),
    ).toThrow(/no boat-tail/);
  });
});
