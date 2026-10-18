// Throwaway: the captured-shock solver's wall pressure on one grid, with the configuration of
// verifiedForebodyDrag, iterated for the steps its level took. Env: CASE, REF, STEPS, OUT.
import { test } from 'vitest';
import { append, bodyOf, caseOf, gamma } from './common';
import { Euler2D, type Euler2DConfig } from './snap/src/engine-cpu/euler2d';
import { bodyGrid } from './snap/src/grid/body-grid';
import { forebodyPressureDrag } from './snap/src/analysis/forces';
import { freeStreamAt } from './snap/src/analysis/verified-drag';

const OUT = process.env.OUT!;
const c = caseOf(process.env.CASE!);
const refinement = Number(process.env.REF);
const steps = Number(process.env.STEPS);

test(`captured profile ${c.id} ${refinement}`, () => {
  const failures: string[][] = [];
  (globalThis as { SUBTIP_GATE_FAILURES?: string[][] }).SUBTIP_GATE_FAILURES = failures;
  const body = bodyOf(c);
  const { state: freeStream, ...free } = freeStreamAt(c.mach, gamma);
  const { grid } = bodyGrid(body, { nj: 20, refinement, mach: c.mach, gamma });
  const config: Euler2DConfig = {
    grid, geometry: 'axisymmetric', gamma, flux: 'hllc', limiter: 'vanAlbada',
    reconstruction: 'sharedScaled', timeIntegrator: 'ssprk2', cfl: 0.8, timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'inflow', state: freeStream },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'inflow', state: freeStream },
    },
  };
  const solver = new Euler2D(config);
  solver.setInitialCondition(() => freeStream);
  const batch = 500 * refinement;
  const drags: number[] = [];
  for (let done = 0; done < steps; done += batch) {
    solver.iterate(batch);
    drags.push(forebodyPressureDrag(solver.boundaryFluxes('jMin'), free, body.nose.baseRadius));
  }
  const wall = solver.boundaryFluxes('jMin').map((f) => ({ x: f.x, y: f.y, p: f.flux[1] * f.nx + f.flux[2] * f.ny }));
  append({ kind: 'captured-profile', id: c.id, refinement, steps, drag: drags[drags.length - 1], drags, wall, gateFailures: failures }, OUT);
});
