// Throwaway: the captured shock's height over the generator's boundary
// height, along each line of a two-scale nose's base grid (the first capture
// of bluntStart, 3000 steps from the free stream, as bluntCapture does it).
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { solvedBluntBody } from '../../src/analysis/fitted-flow';
import { freeStreamAt } from '../../src/analysis/verified-drag';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import type { Body } from '../../src/geometry/body';
import { capturedShockHeights } from '../../src/solver/shock-fitting';

const L = Number(process.env.L ?? 3);
const M = Number(process.env.M ?? 2);
const CYL = Number(process.env.CYL ?? 2);
const OUT = process.env.OUT ?? 'tests/tmp-ratio/ratio.json';

it('ratio', () => {
  const asked: Body = {
    nose: { shape: { kind: 'haack', parameter: 0 }, length: L, baseRadius: 0.5 },
    cylinderLength: CYL,
  };
  const options = { mach: M, gamma: 1.4, nj: 20 };
  const { base } = solvedBluntBody(asked, options);
  const free = freeStreamAt(M, 1.4).state;
  const axis = { kind: 'wall' } as const;
  const solver = new Euler2D({
    grid: base.grid,
    geometry: 'axisymmetric',
    gamma: 1.4,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: axis,
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'inflow', state: free },
    },
  });
  solver.setInitialCondition(() => free);
  solver.iterate(3000);
  const heights = capturedShockHeights(solver, base.grid, base.lines, free);
  const rows = base.lines.map((l, i) => ({ i, x: l.x, h: l.h, shock: heights[i]!, ratio: heights[i]! / l.h }));
  writeFileSync(OUT, JSON.stringify({ L, M, CYL, twoScale: base.twoScale, rows }, null, 1));
}, 3_600_000);
