/** Quality of the transonic C grids of blunt noses (no solve). */
import { appendFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { Body } from '../../src/geometry/body';
import { transonicGrid } from '../../src/grid/transonic-grid';
import { gridQuality } from '../../src/grid/quality';

const deg = Math.PI / 180;
it('blunt grid quality', () => {
  const out = 'tests/tmp-transonic/probe-blunt-grid.jsonl';
  writeFileSync(out, '');
  for (const L of [1, 2, 3]) {
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: L, baseRadius: 1 },
      cylinderLength: 0,
    };
    for (const refinement of [1, 2]) {
      const g = transonicGrid(body, { refinement, farField: 100, cylinder: 10 });
      const q = gridQuality(g.grid);
      if (refinement === 1) {
        writeFileSync(
          `tests/tmp-transonic/probe-blunt-grid-L${L}.json`,
          JSON.stringify({ ni: g.grid.ni, nj: g.grid.nj, x: Array.from(g.grid.x), y: Array.from(g.grid.y) }),
        );
      }
      appendFileSync(
        out,
        JSON.stringify({
          L,
          refinement,
          ni: g.grid.ni,
          nj: g.grid.nj,
          iShoulder: g.iShoulder,
          topology: g.topology,
          minAngle: q.minAngle / deg,
          minWallAngle: q.minWallAngle / deg,
          maxSizeRatio: q.maxSizeRatio,
          maxAspectRatio: q.maxAspectRatio,
        }) + '\n',
      );
    }
  }
});
