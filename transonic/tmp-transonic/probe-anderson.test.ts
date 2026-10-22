import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { forebodyPressureDrag } from '../../src/analysis/forces';
import { freeStreamAt } from '../../src/analysis/verified-drag';
import { transonicGrid } from '../../src/grid/transonic-grid';
import { AndersonMixing } from '../../src/solver/anderson';
import { NonPhysicalStateError } from '../../src/solver/errors';

const out = `tests/tmp-transonic/probe-anderson-${process.env.TAG ?? 'a'}.jsonl`;
const deg = Math.PI / 180;
it('anderson', () => {
  const half = (6 + 59 / 60) * deg;
  const body = {
    nose: { shape: { kind: 'conical' as const }, length: 1 / Math.tan(half), baseRadius: 1 },
    cylinderLength: 0,
  };
  const mach = Number(process.env.MACH ?? 1.05);
  const refinement = Number(process.env.REF ?? 1);
  const depth = Number(process.env.DEPTH ?? 8);
  const start = Number(process.env.START ?? 200);
  const cflMax = Number(process.env.CFL ?? 1000);
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
  const n = 4 * g.grid.ni * g.grid.nj;
  const aa = new AndersonMixing(n, depth);
  let resets = 0;
  let best = Infinity;
  for (let k = 0; k < Number(process.env.BATCHES ?? 100); k++) {
    let fnorm = 0;
    for (let m = 0; m < 20; m++) {
      if (s.steps < start || depth === 0) {
        s.iterateImplicit(1, cfl, 1.5);
      } else {
        const x = s.conserved();
        const f = Float64Array.from(s.implicitCorrection(cfl, 1.5));
        fnorm = Math.sqrt(f.reduce((a, b) => a + b * b, 0) / n);
        if (fnorm > 10 * best) {
          aa.reset();
          resets++;
          best = fnorm;
        }
        best = Math.min(best, fnorm);
        const next = aa.next(x, f);
        try {
          s.setConserved(next);
        } catch (error) {
          if (!(error instanceof NonPhysicalStateError)) throw error;
          s.setConserved(x);
          s.iterateImplicit(1, cfl, 1.5);
          aa.reset();
          resets++;
        }
      }
      cfl = Math.min(cflMax, cfl * 1.2);
    }
    const drag = forebodyPressureDrag(s.boundaryFluxes('jMin'), fs, 1);
    const residual = s.densityResidualNorm();
    appendFileSync(
      out,
      JSON.stringify({
        mach,
        refinement,
        depth,
        cells: g.grid.ni * g.grid.nj,
        steps: s.steps,
        seconds: (performance.now() - t0) / 1000,
        drag,
        residual,
        fnorm,
        resets,
      }) + '\n',
    );
    if (residual < 1e-13) break;
  }
});
