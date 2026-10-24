/**
 * A sharp-only pre-spike: AN UNREGISTERED LOOK, not 0021 2.11's spike, and used for no criterion (the
 * coordinator's ruling of 2026-10-24). The sector generator (src/solver3d/sector-grid.ts) on the first 24
 * sharp-sectioned rockets of the refusal population (docs/research/refusals/population.ts: bevel-both,
 * bevel-LE square-TE, double wedge), at Mach 1.5, 2 and 3, on L0, with revision 3f's slab exemption (N_TIP = 32) and sweep
 * refusal. Stand-ins of a look: the envelope's slope is the tip's leading-wedge shock at the free-stream Mach
 * number (the local 2D flow is not solved), and the bow-shock refusal is not checked.
 *
 * Writes out/pre-spike.json: per case the refusal or the gates' outcome (failing cells per gate, the exempt
 * cells and their worst values, the cell count, the seconds).
 *   ONLY=./pre-spike.test.ts nice -n 10 npx vitest run --config docs/research/solver3d/vitest.config.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { population } from '../refusals/population';
import {
  bevelledPlate3D,
  doubleWedge3D,
  sectorGrid,
  sectorQuality,
  SectorRefusal,
  type SharpSection3D,
} from '../../../src/solver3d/sector-grid';
import { obliqueShock } from '../../../src/validation/gas-dynamics';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
const DEG = Math.PI / 180;

test('pre-spike (a look): sharp sections from the population', { timeout: 86_400_000 }, () => {
  mkdirSync(OUT, { recursive: true });
  const sharp = population(4000).filter((r) => ['bevel-both', 'bevel-le-square-te', 'double-wedge'].includes(r.section)).slice(0, 24);
  const results: Record<string, unknown>[] = [];
  const write = () =>
    writeFileSync(
      join(OUT, 'pre-spike.json'),
      JSON.stringify({ date: new Date().toISOString(), label: 'an unregistered look, not the spike; used for no criterion', results }, null, 2) + '\n',
    );
  for (const r of sharp) {
    const R = r.diameter / 2;
    const base = r.overallFineness * r.diameter;
    const rootLE = base - r.trailingEdgeAheadChords * r.rootChord - r.rootChord;
    const section: SharpSection3D =
      r.section === 'double-wedge'
        ? doubleWedge3D(r.thickness)
        : bevelledPlate3D(r.thickness, r.bevelDeg * DEG, r.section === 'bevel-both' ? 'bevel' : 'square');
    // The tip's leading wedge: the bevel, or the double wedge's half-angle on the tip chord.
    const wedge = r.section === 'double-wedge' ? Math.atan(r.thickness / r.tipChord) : r.bevelDeg * DEG;
    for (const mach of [1.5, 2, 3]) {
      const id = `rocket ${r.id} (${r.section}, ${r.planform}, ${r.finCount} fins, t ${(r.thickness * 1000).toFixed(2)} mm, root ${(r.rootChord * 1000).toFixed(0)} mm, span ${(r.span * 1000).toFixed(0)} mm, LE ${r.leadingEdgeSweepDeg.toFixed(1)} deg) M ${mach}`;
      const t0 = Date.now();
      try {
        let tanTipShock: number;
        try {
          tanTipShock = Math.tan(obliqueShock(mach, wedge, 1.4).beta);
        } catch {
          results.push({ id, refused: 'the tip leading-edge shock detaches (2.7: sharp sections with a detached shock are refused)' });
          write();
          continue;
        }
        const s = sectorGrid(
          {
            bodyRadius: R,
            fins: r.finCount,
            rootLeadingEdge: rootLE,
            shoulder: r.noseFineness * r.diameter,
            base,
            planform: {
              rootChord: r.rootChord,
              span: r.span,
              tanLeadingEdge: Math.tan(r.leadingEdgeSweepDeg * DEG),
              tanTrailingEdge: Math.tan(r.trailingEdgeSweepDeg * DEG),
            },
            section,
            tanTipShock,
          },
          0,
        );
        const q = sectorQuality(s);
        results.push({
          id,
          cells: q.cells,
          counts: s.counts,
          failing: q.failing,
          failures: q.failures,
          exempt: q.exempt,
          worst: { minAngleDeg: q.minAngleDeg, minWallAngleDeg: q.minWallAngleDeg, maxSizeRatio: q.maxSizeRatio, maxAspectRatio: q.maxAspectRatio },
          passes: q.failures.length === 0,
          seconds: (Date.now() - t0) / 1000,
        });
      } catch (e) {
        if (!(e instanceof SectorRefusal || e instanceof RangeError)) throw e;
        results.push({ id, refused: e.message });
      }
      write();
    }
  }
  write();
});
