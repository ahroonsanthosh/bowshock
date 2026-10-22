/**
 * The fitted solver's wall pressure (BODY, MACH, REFS as fitted-ck.test.ts),
 * written to tests/tmp-transonic/dumps/fitted-<body>-m<mach>-r<r>.json as
 * { drag, wall: [{ x, y, cp }] }, the fit stopped once the drag's estimated
 * remaining change is below 1e-9 of it on two checks running.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { bluntFitProblem, fittedFlow, sharpFitProblem } from './snap/src/analysis/fitted-flow';
import type { Body } from './snap/src/geometry/body';
import { noseTipSlope } from './snap/src/geometry/nose';

const bodies: Record<string, Body> = {
  ell2c8: { nose: { shape: { kind: 'ellipsoid' }, length: 2, baseRadius: 1 }, cylinderLength: 8 },
  hemi: { nose: { shape: { kind: 'ellipsoid' }, length: 1, baseRadius: 1 }, cylinderLength: 4 },
};

it('fitted wall pressure', () => {
  const name = process.env.BODY ?? 'ell2c8';
  const mach = Number(process.env.MACH ?? 1.2);
  const refs = (process.env.REFS ?? '1,2').split(',').map(Number);
  const body = bodies[name]!;
  const sharp = Number.isFinite(noseTipSlope(body.nose));
  mkdirSync('tests/tmp-transonic/dumps', { recursive: true });
  for (const refinement of refs) {
    const options = { mach, gamma: 1.4, nj: 20, refinement };
    const problem = sharp ? sharpFitProblem(body, options) : bluntFitProblem(body, options);
    const drags: number[] = [];
    let below = 0;
    const { fit, drag } = fittedFlow(problem, 40_000 * refinement, {
      onCheck: (s) => {
        const d = problem.drag(s.solver.boundaryFluxes('jMin'));
        drags.push(d);
        if (drags.length < 3) return false;
        const [a, b, c] = drags.slice(-3) as [number, number, number];
        const r = Math.abs((c - b) / (b - a));
        const est = r < 1 ? (Math.abs(c - b) * r) / (1 - r) : Infinity;
        below = est < 1e-9 * Math.abs(c) ? below + 1 : 0;
        return below >= 2;
      },
    });
    const q = 0.7 * mach * mach;
    const wall = fit.solver.boundaryFluxes('jMin').map((f) => ({
      x: f.x,
      y: f.y,
      cp: (f.flux[1] * f.nx + f.flux[2] * f.ny - 1) / q,
    }));
    writeFileSync(
      `tests/tmp-transonic/dumps/fitted-${name}-m${mach}-r${refinement}.json`,
      JSON.stringify({ drag, iterations: fit.iterations, wall }),
    );
  }
});
