/**
 * Speed of the explicit steps, this branch's engine against the base
 * commit's (snapbase), on the manufactured-solution channel (64 x 64, both
 * geometries), alternating to share the machine's load. Same states
 * expected bit for bit.
 */
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Euler2D as Mine } from '../../src/engine-cpu/euler2d';
import { gridFromFunction } from '../../src/grid/structured';
import { MANUFACTURED_INFLOW, manufacturedCellSources, manufacturedState } from '../../src/validation/manufactured';
import { Euler2D as Base } from './snapbase/src/engine-cpu/euler2d';

const gamma = 1.4;
const n = 64;
const grid = gridFromFunction(n, n, (i, j) => {
  const x = i / n;
  const y = 1 + j / n;
  const bump = 0.04 * Math.sin(Math.PI * x) * Math.sin(Math.PI * (y - 1));
  return [x + bump, y + bump];
});

it('bench', () => {
  for (let round = 0; round < 3; round++) {
    for (const geometry of ['planar', 'axisymmetric'] as const) {
      const wall = { kind: 'wall' } as const;
      const config = {
        grid,
        geometry,
        gamma,
        flux: 'hllc',
        limiter: 'vanAlbada',
        reconstruction: 'shared',
        timeIntegrator: 'ssprk2',
        cfl: 0.8,
        timeStepping: 'local',
        boundaries: {
          iMin: { kind: 'inflow', state: MANUFACTURED_INFLOW(gamma) },
          iMax: { kind: 'outflow' },
          jMin: wall,
          jMax: wall,
        },
        source: manufacturedCellSources(grid, geometry, gamma),
      } as const;
      const times: Record<string, number> = {};
      const rho: Record<string, number> = {};
      for (const [name, E] of [
        ['base', Base],
        ['mine', Mine],
      ] as const) {
        const s = new E(config);
        s.setInitialCondition((x, y) => manufacturedState(x, y, gamma));
        const t0 = process.cpuUsage();
        s.iterate(300);
        const t = process.cpuUsage(t0);
        times[name] = (t.user + t.system) / 1e6;
        rho[name] = s.primitive(17, 23).rho;
      }
      appendFileSync(
        'tests/tmp-transonic/bench-base.jsonl',
        JSON.stringify({ round, geometry, ...times, same: rho.base === rho.mine }) + '\n',
      );
    }
  }
});
