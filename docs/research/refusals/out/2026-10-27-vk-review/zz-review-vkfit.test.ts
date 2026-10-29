// Temporary review probe (not to be committed): the blunt path the page
// takes for the Von Karman noses the audit now serves, on the CPU twin, base
// grid (nj 20): converged, the fitted grids' gates and the case checks.
import { it } from 'vitest';
import {
  bluntFitFamily,
  bluntNoseRefusal,
  bluntStart,
  fittedCaseFailure,
  fittedFlow,
  fittedGridFailure,
} from '../src/analysis/fitted-flow';
import type { Body } from '../src/geometry/body';
import { gridQuality } from '../src/grid/quality';

const cases = (process.env.VK_CASES ?? '4.364,11.55,1.7541')
  .split(';')
  .map((s) => s.split(',').map(Number) as [number, number, number]);

it('Von Karman fits on the page path', { timeout: 7_200_000 }, () => {
  for (const [nose, cylinder, mach] of cases) {
    const body: Body = {
      nose: { shape: { kind: 'haack', parameter: 0 }, length: nose, baseRadius: 0.5 },
      cylinderLength: cylinder,
    };
    const t0 = Date.now();
    const refusal = bluntNoseRefusal(body, mach);
    const options = { mach, gamma: 1.4, nj: 20 };
    const start = bluntStart(body, options);
    const refinement = Number(process.env.REF ?? 1);
    const problem = bluntFitFamily(body, options, start)(refinement);
    const { fit, drag } = fittedFlow(problem, Number(process.env.ITER ?? 12000) * refinement);
    const q = gridQuality(fit.grid);
    const deg = 180 / Math.PI;
    console.log(
      `VK ${nose} cal, cylinder ${cylinder} cal, M ${mach}, refinement ${refinement}: refusal ${String(refusal)}; ` +
        `converged ${fit.converged} after ${fit.iterations} (speed ${fit.maxSpeed.toExponential(1)}); drag ${drag}; ` +
        `grid ${fit.grid.ni}x${fit.grid.nj}: min angle ${(q.minAngle * deg).toFixed(1)} deg, wall ${(q.minWallAngle * deg).toFixed(1)} deg (>= 50), ` +
        `size ratio ${q.maxSizeRatio.toFixed(3)}, aspect ${q.maxAspectRatio.toFixed(2)} (<= 13); ` +
        `grid gates ${String(fittedGridFailure(fit.grid))}; case ${String(fittedCaseFailure(problem, fit.grid, (i, j) => fit.solver.primitive(i, j)))}; ` +
        `${((Date.now() - t0) / 1000).toFixed(0)} s`,
    );
  }
});
