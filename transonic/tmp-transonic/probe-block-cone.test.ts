import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { forebodyPressureDrag } from '../../src/analysis/forces';
import { freeStreamAt } from '../../src/analysis/verified-drag';
import { bodyGrid } from '../../src/grid/body-grid';

const out = `tests/tmp-transonic/probe-block-cone-${process.env.TAG ?? 'a'}.jsonl`;
const deg = Math.PI / 180;
it('block on a supersonic cone', () => {
  const body = {
    nose: { shape: { kind: 'conical' as const }, length: 0.5 / Math.tan(15 * deg), baseRadius: 0.5 },
    cylinderLength: 2,
  };
  const mach = Number(process.env.MACH ?? 2);
  const { grid } = bodyGrid(body, { nj: 20, mach, gamma: 1.4 });
  const fs = freeStreamAt(mach, 1.4);
  const s = new Euler2D({
    grid,
    geometry: 'axisymmetric',
    gamma: 1.4,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'inflow', state: fs.state },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'inflow', state: fs.state },
    },
  });
  s.setInitialCondition(() => fs.state);
  let cfl = 1;
  const scheme = process.env.SCHEME ?? 'block';
  const t0 = performance.now();
  for (let k = 0; k < 50; k++) {
    for (let m = 0; m < 20; m++) {
      if (scheme === 'block')
        s.iterateBlockImplicit(1, cfl, 0.1, (process.env.SOURCE ?? 'damped') as 'damped');
      else if (scheme === 'scalar') s.iterateImplicit(1, cfl, 1.5);
      else s.iterate(1);
      cfl = Math.min(Number(process.env.CFL ?? 1000), cfl * 1.2);
    }
    const drag = forebodyPressureDrag(s.boundaryFluxes('jMin'), fs, 0.5);
    const residual = s.densityResidualNorm();
    appendFileSync(
      out,
      JSON.stringify({ scheme, steps: s.steps, drag, residual, seconds: (performance.now() - t0) / 1000 }) +
        '\n',
    );
    if (residual < 1e-13) break;
  }
});
