// W6 probe, stage A: the generator's C grids for capped tangent ogives, no
// solve. For each cap ratio, Mach number and refinement: the cap's
// geometry, the generator's grid and its quality against both gate sets.
// Env: RATIOS, MACHS, REFS, CAL, CYL, TREE (a label for the tree run).
import { it } from 'vitest';
import { cappedNose, noseRadius } from '../../src/geometry/nose';
import { bluntBodyGrid } from '../../src/grid/blunt-grid';
import {
  FITTED_QUALITY_LIMITS,
  QUALITY_LIMITS,
  gridQuality,
  qualityFailures,
} from '../../src/grid/quality';
import { append, cappedOgive, caseId, deg } from './common';

const list = (v: string | undefined, d: string) => (v ?? d).split(',').map(Number);
const RATIOS = list(process.env.RATIOS, '0.03,0.05,0.1,0.15');
const MACHS = list(process.env.MACHS, '1.3,2,3');
const REFS = list(process.env.REFS, '1,2,4');
const CAL = Number(process.env.CAL ?? 5);
const CYL = Number(process.env.CYL ?? 2);
const TREE = process.env.TREE ?? 'unknown';

it('cap geometry', () => {
  for (const ratio of RATIOS) {
    const body = cappedOgive(CAL, ratio, CYL);
    const c = cappedNose(body.nose);
    const rn = body.nose.tipRadius!;
    const xt = c.tangentX;
    const e = 1e-7;
    const slope = (x: number) => (noseRadius(body.nose, x + e) - noseRadius(body.nose, x - e)) / (2 * e);
    append({
      kind: 'geometry',
      tree: TREE,
      id: caseId(CAL, ratio, 0, CYL),
      rn,
      offset: c.offset,
      parentLength: c.parent.length,
      tangentX: xt,
      tangentR: noseRadius(body.nose, xt),
      tangentAngleDeg: deg(Math.atan(slope(xt + 1e-5))),
      slopeJumpAtTangent: slope(xt + 1e-5) - slope(xt - 1e-5),
      radiusAtEnd: noseRadius(body.nose, body.nose.length),
    });
  }
});

it('generator grids', () => {
  for (const ratio of RATIOS) {
    for (const mach of MACHS) {
      for (const refinement of REFS) {
        const body = cappedOgive(CAL, ratio, CYL);
        const id = `${caseId(CAL, ratio, mach, CYL)} nj20x${refinement}`;
        const t0 = performance.now();
        try {
          const g = bluntBodyGrid(body, { nj: 20, refinement, mach, gated: false });
          const q = gridQuality(g.grid);
          const extra = g as unknown as { twoScale?: boolean; tipScale?: number; scale?: number };
          append({
            kind: 'generator',
            tree: TREE,
            id,
            ni: g.grid.ni,
            nj: g.grid.nj,
            outerStandoff: g.outerStandoff,
            twoScale: extra.twoScale,
            tipScale: extra.tipScale,
            scale: extra.scale,
            quality: {
              minAngle: deg(q.minAngle),
              wall: deg(q.minWallAngle),
              sizeRatio: q.maxSizeRatio,
              aspect: q.maxAspectRatio,
            },
            generatedGates: qualityFailures(q, QUALITY_LIMITS),
            fittedGates: qualityFailures(q, FITTED_QUALITY_LIMITS),
            seconds: (performance.now() - t0) / 1000,
          });
        } catch (error) {
          append({ kind: 'generator', tree: TREE, id, error: String(error) });
        }
      }
    }
  }
});
