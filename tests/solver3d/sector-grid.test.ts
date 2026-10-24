/**
 * The sector grid for sharp sections (src/solver3d/sector-grid.ts, docs/design/0021-3d-euler-fins.md 2 and
 * revision 3f): on rung (c)'s plane wall a rectangular double-wedge fin meets every gate of 2.11 but for the
 * slab cells revision 3f exempts; the counts make every level whole; edges swept more than 40 deg are refused.
 */

import { describe, expect, it } from 'vitest';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { decompose } from '../../src/solver3d/multiblock';
import {
  doubleWedge3D,
  MAX_SWEEP_DEG,
  sectorGrid,
  sectorQuality,
  SectorRefusal,
  type SectorInput,
} from '../../src/solver3d/sector-grid';
import { obliqueShock } from '../../src/validation/gas-dynamics';

const tc = 0.06;
const beta = obliqueShock(2, Math.atan(tc), 1.4).beta;
const plane = (sweepDeg: number): SectorInput => ({
  bodyRadius: 0,
  fins: 1,
  rootLeadingEdge: 0.5,
  shoulder: -Infinity,
  base: 1.5 + Math.tan((sweepDeg * Math.PI) / 180),
  planform: trapezoidalPlanform({
    rootChord: 1,
    span: 1,
    leadingEdgeSweep: (sweepDeg * Math.PI) / 180,
    trailingEdgeSweep: (sweepDeg * Math.PI) / 180,
  }),
  section: doubleWedge3D(tc),
  tanTipShock: Math.tan(beta),
  planeWall: { zMax: 1.5 * Math.tan(beta) + 0.2 },
});

describe('sector grid, sharp sections', () => {
  it(
    'passes every gate on the plane wall, but for the exempt slab cells',
    { timeout: 300_000 },
    () => {
      const s = sectorGrid(plane(0), 0);
      const q = sectorQuality(s);
      expect(q.failures).toEqual([]);
      expect(q.exempt.cells).toBeGreaterThan(0);
      // Every count on L0 a multiple of 8, so that L1 to L3 are whole.
      for (const n of [...s.counts.columns, s.counts.rowsBelow, s.counts.rowsAbove, s.counts.theta])
        expect(n % 8).toBe(0);
      // The blocks tile the grid but for the holes, and their interfaces point-match.
      const dec = decompose(s.grid, s.boxes, [], true);
      expect(dec.shares.length).toBeGreaterThan(0);
    },
  );

  it('refuses edges swept more than 40 deg, with the reason', () => {
    expect(MAX_SWEEP_DEG).toBe(40);
    expect(() => sectorGrid(plane(41), 0)).toThrow(SectorRefusal);
    expect(() => sectorGrid(plane(41), 0)).toThrow(/swept 41.0 deg/);
  });
});
