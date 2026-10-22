import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { Body } from '../../src/geometry/body';
import { gridQuality } from '../../src/grid/quality';
import { computeMetrics, nodeIndex } from '../../src/grid/structured';
import { transonicGrid } from '../../src/grid/transonic-grid';

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};

it('probe', () => {
  const out: string[] = [];
  const log = (...a: unknown[]) => out.push(a.map(String).join(' '));
  const plain = transonicGrid(cone, { refinement: 1, farField: 100, cylinder: 10 });
  log('plain', plain.grid.ni, plain.grid.nj, plain.farRadius, plain.xUpstream, plain.xEnd, plain.iTip);
  for (const nested of [{ farField: 50 }, { farField: 200 }, { farField: 400 }, { cylinder: 5 }, { cylinder: 20 }, { farField: 100 }]) {
    const g = transonicGrid(cone, { refinement: 1, farField: 100, cylinder: 10, nested });
    computeMetrics(g.grid, 'axisymmetric');
    const q = gridQuality(g.grid);
    // shared nodes
    const off = plain.iTip - g.iTip;
    let worst = 0;
    let shared = 0;
    for (let j = 0; j <= Math.min(plain.grid.nj, g.grid.nj); j++) {
      for (let i = 0; i <= g.grid.ni; i++) {
        const ip = i + off;
        if (ip < 0 || ip > plain.grid.ni) continue;
        const a = nodeIndex(plain.grid, ip, j);
        const b = nodeIndex(g.grid, i, j);
        worst = Math.max(worst, Math.abs(plain.grid.x[a]! - g.grid.x[b]!), Math.abs(plain.grid.y[a]! - g.grid.y[b]!));
        shared++;
      }
    }
    log(JSON.stringify(nested), g.grid.ni, g.grid.nj, g.farRadius.toFixed(2), g.xUpstream.toFixed(2), g.xEnd.toFixed(2), 'iTip', g.iTip,
      'minAngle', (q.minAngle / deg).toFixed(1), 'wall', (q.minWallAngle / deg).toFixed(1), 'size', q.maxSizeRatio.toFixed(3), 'aspect', q.maxAspectRatio.toFixed(0),
      'shared', shared, 'worst', worst);
  }
  writeFileSync('tests/tmp-transonic/nested-probe.txt', out.join('\n') + '\n');
});
