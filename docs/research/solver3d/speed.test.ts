/**
 * The CPU engine's speed, cell-steps a second (SSPRK2, two residuals a step), for the CPU plans of
 * docs/design/0021-3d-euler-fins.md section 5.2. Writes out/speed.json.
 *   ONLY=./speed.test.ts nice -n 10 npx vitest run --config docs/research/solver3d/vitest.config.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { Euler3D } from '../../../src/solver3d/euler3d';
import { gridFromFunction3D } from '../../../src/solver3d/grid3d';

const here = dirname(fileURLToPath(import.meta.url));

test('CPU engine speed', () => {
  const [ni, nj, nk] = [40, 30, 16];
  const grid = gridFromFunction3D(ni, nj, nk, (i, j, k) => [i / ni, 0.5 + j / nj, (0.5 * k) / nk]);
  const free = { rho: 1, u: 2 * Math.sqrt(1.4), v: 0, w: 0, p: 1 };
  const e = new Euler3D({
    grid,
    geometry: 'cylindrical',
    gamma: 1.4,
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'inflow', state: free },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'inflow', state: free },
      kMin: { kind: 'wall' },
      kMax: { kind: 'wall' },
    },
  });
  e.setCellPrimitives((i, j, k) => ({ ...free, v: 0.01 * Math.sin(i + j + k) }));
  e.iterate(5);
  const t0 = performance.now();
  const steps = 60;
  e.iterate(steps);
  const seconds = (performance.now() - t0) / 1000;
  const rate = (ni * nj * nk * steps) / seconds;
  mkdirSync(join(here, 'out'), { recursive: true });
  writeFileSync(
    join(here, 'out', 'speed.json'),
    JSON.stringify({ date: new Date().toISOString(), cells: ni * nj * nk, steps, seconds, cellStepsPerSecond: rate, secondsPerCellStep: 1 / rate, note: 'one core, niced, on the shared machine' }, null, 2) + '\n',
  );
});
