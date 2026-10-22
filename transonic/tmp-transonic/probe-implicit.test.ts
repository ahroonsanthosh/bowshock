import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { forebodyPressureDrag } from '../../src/analysis/forces';
import { freeStreamAt } from '../../src/analysis/verified-drag';
import { transonicGrid } from '../../src/grid/transonic-grid';

const out = `tests/tmp-transonic/probe-implicit-${process.env.TAG ?? 'a'}.jsonl`;
const deg = Math.PI / 180;
it('implicit', () => {
  const half = (6 + 59 / 60) * deg;
  const body = {
    nose: { shape: { kind: 'conical' as const }, length: 1 / Math.tan(half), baseRadius: 1 },
    cylinderLength: 0,
  };
  const mach = Number(process.env.MACH ?? 1.05);
  const cflMax = Number(process.env.CFL ?? 100);
  const omega = Number(process.env.OMEGA ?? 1.5);
  const refinement = Number(process.env.REF ?? 1);
  const g = transonicGrid(body, { refinement, farField: 100, cylinder: 10 });
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
  let cfl = 1;
  for (let k = 0; k < Number(process.env.BATCHES ?? 60); k++) {
    for (let m = 0; m < 20; m++) {
      if (process.env.SCHEME === 'block') s.iterateBlockImplicit(1, cfl, Number(process.env.DELTA ?? 0.1), (process.env.SOURCE ?? 'damped') as 'damped', Number(process.env.SHARE ?? 0));
      else s.iterateImplicit(1, cfl, omega);
      cfl = Math.min(cflMax, cfl * 1.2);
    }
    const drag = forebodyPressureDrag(s.boundaryFluxes('jMin'), fs, 1);
    const residual = s.densityResidualNorm();
    const res = (s as unknown as { residual: { rho: Float64Array } }).residual.rho;
    const vol = s.metrics.volume;
    let worst = 0;
    let wi = -1;
    let wj = -1;
    for (let j = 0; j < g.grid.nj; j++) {
      for (let i = 0; i < g.grid.ni; i++) {
        const v = Math.abs(res[i + 2 + (j + 2) * (g.grid.ni + 4)]! / vol[i + j * g.grid.ni]!);
        if (v > worst) {
          worst = v;
          wi = i;
          wj = j;
        }
      }
    }
    appendFileSync(
      out,
      JSON.stringify({
        mach,
        cflMax,
        omega,
        refinement,
        cells: g.grid.ni * g.grid.nj,
        steps: s.steps,
        seconds: (performance.now() - t0) / 1000,
        drag,
        residual,
        worst,
        wi,
        wj,
        x: s.metrics.centroidX[wi + wj * g.grid.ni],
        y: s.metrics.centroidY[wi + wj * g.grid.ni],
      }) + '\n',
    );
    if (residual < 1e-13) break;
  }
});
