import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { forebodyPressureDrag } from '../../src/analysis/forces';
import { freeStreamAt } from '../../src/analysis/verified-drag';
import { transonicGrid } from '../../src/grid/transonic-grid';
import { gridQuality } from '../../src/grid/quality';

const out = 'tests/tmp-transonic/probe-speed.jsonl';
const deg = Math.PI / 180;
it('speed', () => {
  const half = (6 + 59 / 60) * deg;
  const body = {
    nose: { shape: { kind: 'conical' as const }, length: 1 / Math.tan(half), baseRadius: 1 },
    cylinderLength: 0,
  };
  const mach = Number(process.env.MACH ?? 1.05);
  const g = transonicGrid(body, { refinement: 1, farField: 100, cylinder: 10 });
  const q = gridQuality(g.grid);
  appendFileSync(
    out,
    JSON.stringify({
      ni: g.grid.ni,
      nj: g.grid.nj,
      iTip: g.iTip,
      iShoulder: g.iShoulder,
      farRadius: g.farRadius,
      minAngle: q.minAngle / deg,
      minWall: q.minWallAngle / deg,
      size: q.maxSizeRatio,
      aspect: q.maxAspectRatio,
    }) + '\n',
  );
  const fs = freeStreamAt(mach, 1.4);
  const s = new Euler2D({
    grid: g.grid,
    geometry: 'axisymmetric',
    gamma: 1.4,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'farField', state: fs.state },
      iMax: { kind: 'farField', state: fs.state },
      jMin: { kind: 'wall' },
      jMax: { kind: 'farField', state: fs.state },
    },
  });
  s.setInitialCondition(() => fs.state);
  const t0 = performance.now();
  for (let k = 0; k < 40; k++) {
    s.iterate(500);
    const drag = forebodyPressureDrag(s.boundaryFluxes('jMin'), fs, 1);
    appendFileSync(
      out,
      JSON.stringify({
        mach,
        steps: s.steps,
        seconds: (performance.now() - t0) / 1000,
        drag,
        residual: s.densityResidualNorm(),
      }) + '\n',
    );
  }
});
