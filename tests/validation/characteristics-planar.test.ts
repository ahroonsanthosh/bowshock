/**
 * The planar method of characteristics (src/validation/characteristics-planar.ts), the reference of rung (b3)
 * (docs/design/0021-3d-euler-fins.md 4.2): on double wedges, whose reflected waves do not reach the surface,
 * it must give shock-expansion theory's exact drag (registered: within 1e-7 of the drag); on a hexagon, whose
 * reflections land on the surface, it must converge under refinement at an observed order between 1.5 and
 * 2.5 (registered for 320 to 2560 intervals in the research run; here on coarser lines, as a smoke check).
 */

import { describe, expect, it } from 'vitest';
import { doubleWedge, hexagonal, type SymmetricSection } from '../../src/fins/section';
import { exactSectionDrag } from '../../src/fins/section-drag';
import {
  planarCharacteristics,
  planarSectionDragCoefficient,
} from '../../src/validation/characteristics-planar';

const GAMMA = 1.4;
const upper = (s: SymmetricSection) => ({ x: s.x, y: s.halfThickness });
const cdOf = (s: SymmetricSection, mach: number, intervals: number) =>
  planarSectionDragCoefficient(
    planarCharacteristics(upper(s), { mach, gamma: GAMMA, intervals }),
    mach,
    GAMMA,
  );

describe('planar characteristics', () => {
  for (const [tc, mach] of [
    [0.05, 2],
    [0.08, 1.5],
    [0.05, 3],
  ] as const) {
    it(`reproduces shock-expansion theory on a double wedge, t/c ${tc}, Mach ${mach}, within 1e-7`, () => {
      const section = doubleWedge(tc);
      const exact = exactSectionDrag(section, mach);
      expect(exact.exact).toBe(true);
      expect(Math.abs(cdOf(section, mach, 160) / exact.cd - 1)).toBeLessThan(1e-7);
    });
  }

  it('reproduces shock-expansion theory on a hexagon whose reflected waves miss the surface', () => {
    // t/c 0.05, 15% bevels, Mach 2: the waves reflected from the shock leave the surface behind.
    const section = hexagonal(0.05, 0.15);
    const se = exactSectionDrag(section, 2, { neglectReflectedWaves: true }).cd;
    expect(Math.abs(cdOf(section, 2, 40) / se - 1)).toBeLessThan(1e-7);
  });

  it(
    'converges at second order on a hexagon whose reflected waves land on its surface',
    { timeout: 120_000 },
    () => {
      const section = hexagonal(0.08, 0.15);
      const cds = [40, 80, 160].map((n) => cdOf(section, 2, n));
      const order = Math.log2((cds[0]! - cds[1]!) / (cds[1]! - cds[2]!));
      expect(order).toBeGreaterThan(1.5);
      expect(order).toBeLessThan(2.5);
      // The reflected waves raise the drag above shock-expansion theory's, by about 2.2e-4 of it.
      const se = exactSectionDrag(section, 2, { neglectReflectedWaves: true }).cd;
      expect(cds[2]! / se - 1).toBeGreaterThan(1e-4);
      expect(cds[2]! / se - 1).toBeLessThan(4e-4);
    },
  );

  it('refuses a detached leading-edge shock', () => {
    // A 14.0 deg bevel at Mach 1.5, beyond the 12.1 deg attachment limit.
    expect(() => cdOf(hexagonal(0.05, 0.1), 1.5, 20)).toThrow(RangeError);
  });
});
