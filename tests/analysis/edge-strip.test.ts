/**
 * The 2D strip of a rounded fin edge (src/analysis/edge-strip.ts): the planar fitted flow over the edge's
 * normal section converges, and its standoff and sonic reach are of the size Billig's cylinder correlation
 * gives (a correlation of measured shock shapes: a plausibility check, not a reference).
 */

import { describe, expect, it } from 'vitest';
import { billigCylinder, edgeStrip } from '../../src/analysis/edge-strip';

describe('rounded edge strip', () => {
  it(
    "converges at normal Mach 2, its standoff within 15% of Billig's",
    { timeout: 300_000 },
    () => {
      const s = edgeStrip({
        edge: 'rounded',
        mach: 2,
        gamma: 1.4,
        nj: 12,
        refinement: 1,
        maxIterations: 100_000,
      });
      expect(s.fit.converged).toBe(true);
      // Measured on 16 cells across: 1.329 against Billig's 1.241; y* 3.66 half-thicknesses.
      expect(Math.abs(s.standoff / billigCylinder(2).standoff - 1)).toBeLessThan(0.15);
      expect(s.sonicPoint).not.toBeNull();
      expect(s.yStar).toBeGreaterThan(2);
      expect(s.yStar).toBeLessThan(6);
    },
  );
});
