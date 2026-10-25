import { describe, expect, it } from 'vitest';
import {
  bluntFitFamily,
  bluntStart,
  bluntStartInChunks,
  fittedCaseFailure,
  fittedFlow,
} from '../../src/analysis/fitted-flow';
import { startedFrom } from '../../src/analysis/gpu-fitted-flow';
import type { GpuShockFit } from '../../src/engine-gpu/shock-fitting-gpu';
import type { Body } from '../../src/geometry/body';

/**
 * A two-scale family (docs/design/0004-grids.md) on the CPU: the
 * 1-caliber Von Karman nose with a caliber of body at Mach 2, one of the
 * families checked against the method of characteristics in
 * docs/design/0006-shock-fitting.md ("Two-scale noses"), where its drags
 * on nj = 20 and 40 were measured (each fit stopped once its remaining
 * iterative error was estimated below 1e-9 of the drag: 8.6e-12 and
 * 1.1e-11).
 */

const gamma = 1.4;
const vonKarman: Body = {
  nose: { shape: { kind: 'haack', parameter: 0 }, length: 1, baseRadius: 0.5 },
  cylinderLength: 1,
};
const familyOptions = { mach: 2, gamma, nj: 20 };
const MEASURED = [0.42909806331220435, 0.42869653925562817];

describe('two-scale noses on the CPU (design record 0006)', () => {
  it('a two-scale start in chunks is the same start, through both captures', async () => {
    const whole = bluntStart(vonKarman, familyOptions);
    expect(whole.outerBoundary).toBeDefined();
    const seen: [number, number][] = [];
    const chunked = await bluntStartInChunks(vonKarman, familyOptions, {
      chunk: 250,
      pause: () => Promise.resolve(),
      onProgress: (steps, total) => seen.push([steps, total]),
    });
    expect(chunked.heights).toEqual(whole.heights);
    expect(chunked.outerBoundary).toEqual(whole.outerBoundary);
    expect(chunked.cell(7, 3)).toEqual(whole.cell(7, 3));
    expect(seen.at(-1)).toEqual([6000, 6000]);
  }, 600_000);

  it('Von Karman nose, Mach 2: nj = 20 and 40 as measured, the finer started from the coarser', () => {
    const family = bluntFitFamily(vonKarman, familyOptions);
    const coarse = family(1);
    const first = fittedFlow(coarse, 40_000);
    expect(first.fit.converged).toBe(true);
    expect(
      fittedCaseFailure(coarse, first.fit.grid, (i, j) => first.fit.solver.primitive(i, j)),
    ).toBeUndefined();
    const fit = {
      heights: first.fit.heights,
      cell: (i: number, j: number) => first.fit.solver.primitive(i, j),
    } as unknown as GpuShockFit;
    const fine = startedFrom(family(2), coarse, fit);
    expect(fine).not.toBeNull();
    const second = fittedFlow(fine!, 80_000);
    expect(second.fit.converged).toBe(true);
    expect(
      fittedCaseFailure(fine!, second.fit.grid, (i, j) => second.fit.solver.primitive(i, j)),
    ).toBeUndefined();
    // The fits converge to shock speeds and residuals of 1e-12; the
    // measured values, from other starts, are within their estimated
    // iterative errors of them.
    expect(Math.abs(first.drag / MEASURED[0]! - 1)).toBeLessThan(1e-9);
    expect(Math.abs(second.drag / MEASURED[1]! - 1)).toBeLessThan(1e-9);
    // Two fits to round-off, the finer on 226 x 40 cells: past 1800 s on
    // four cores loaded at 13 to 17.
  }, 3_600_000);
});
