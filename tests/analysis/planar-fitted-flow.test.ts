/**
 * The 2D fitted engine in planar geometry over a sharp section (src/analysis/planar-fitted-flow.ts), the
 * independent check of rung (b3)'s characteristics reference (docs/design/0021-3d-euler-fins.md 4.2).
 */

import { describe, expect, it } from 'vitest';
import { planarSectionFit } from '../../src/analysis/planar-fitted-flow';
import { doubleWedge, hexagonal } from '../../src/fins/section';
import { exactSectionDrag } from '../../src/fins/section-drag';
import { nodeIndex } from '../../src/grid/structured';
import { obliqueShock } from '../../src/validation/gas-dynamics';

const GAMMA = 1.4;

describe('planar fitted flow over a sharp section', () => {
  it('holds the oblique-shock state and the straight shock ahead of the first corner', () => {
    const s = doubleWedge(0.05);
    const f = planarSectionFit(
      { x: s.x, y: s.halfThickness },
      { mach: 2, gamma: GAMMA, nj: 8, columnsPerChord: 24, refinement: 1, maxIterations: 20_000 },
    );
    expect(f.fit.converged).toBe(true);
    const shock = obliqueShock(2, Math.atan(0.05), GAMMA);
    const g = f.fit.grid;
    // Ahead of the ridge at x = 0.5 the flow is the uniform oblique-shock state, but for the reconstruction's
    // reach one cell downstream, which carries the corner's influence upstream, falling about 4 times a
    // column (measured: 1.7e-5 four columns ahead of the ridge, 5.4e-8 at the inflow plane, 6 ahead).
    let checked = 0;
    for (let i = 0; ; i++) {
      const xRight = g.x[nodeIndex(g, i + 1, 0)]!;
      if (xRight > 0.5 - 1e-12) break;
      const columnsAhead = Math.round((0.5 - xRight) / (xRight - g.x[nodeIndex(g, i, 0)]!));
      for (let j = 0; j < g.nj; j++) {
        const p = f.fit.solver.primitive(i, j);
        expect(Math.abs(p.p / shock.pressureRatio - 1)).toBeLessThan(1e-3 * 4 ** -columnsAhead);
      }
      // The shock node on the line at the column's left edge lies on the straight shock.
      const top = nodeIndex(g, i, g.nj);
      expect(Math.abs(Math.atan2(g.y[top]!, g.x[top]!) - shock.beta)).toBeLessThan(1e-7);
      checked++;
    }
    expect(checked).toBeGreaterThan(3);
  });

  it(
    'converges towards shock-expansion theory on a double wedge, and lands near it on a hexagon',
    { timeout: 300_000 },
    () => {
      const s = doubleWedge(0.05);
      const exact = exactSectionDrag(s, 2).cd;
      const errors = [1, 2].map((r) => {
        const f = planarSectionFit(
          { x: s.x, y: s.halfThickness },
          {
            mach: 2,
            gamma: GAMMA,
            nj: 8,
            columnsPerChord: 24,
            refinement: r,
            maxIterations: 20_000 * r,
          },
        );
        expect(f.fit.converged).toBe(true);
        return Math.abs(f.cd / exact - 1);
      });
      // Measured: 6.3e-3 and 2.6e-3 (first order, from the captured fan at the ridge).
      expect(errors[0]).toBeLessThan(1e-2);
      expect(errors[1]).toBeLessThan(0.5 * errors[0]!);
      const h = hexagonal(0.08, 0.15);
      const f = planarSectionFit(
        { x: h.x, y: h.halfThickness },
        { mach: 2, gamma: GAMMA, nj: 8, columnsPerChord: 24, refinement: 1, maxIterations: 20_000 },
      );
      expect(f.fit.converged).toBe(true);
      expect(
        Math.abs(f.cd / exactSectionDrag(h, 2, { neglectReflectedWaves: true }).cd - 1),
      ).toBeLessThan(2e-2);
    },
  );

  it('refuses a detached leading-edge shock', () => {
    const h = hexagonal(0.05, 0.1);
    expect(() =>
      planarSectionFit(
        { x: h.x, y: h.halfThickness },
        { mach: 1.5, gamma: GAMMA, nj: 8, columnsPerChord: 24, refinement: 1, maxIterations: 10 },
      ),
    ).toThrow(RangeError);
  });
});
