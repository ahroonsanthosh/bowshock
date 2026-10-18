import { describe, expect, it } from 'vitest';
import {
  baseMach,
  bluntFitFamily,
  bluntFitProblem,
  bluntFittedFlow,
  bluntStart,
  bluntStartInChunks,
  fittedFlow,
  sharpFitProblem,
  sharpFittedFlow,
  verifiedFittedDrag,
  wallDrag,
} from '../../src/analysis/fitted-flow';
import { startedFrom } from '../../src/analysis/gpu-fitted-flow';
import type { GpuShockFit } from '../../src/engine-gpu/shock-fitting-gpu';
import type { Body } from '../../src/geometry/body';
import { gridOnLines } from '../../src/grid/blunt-grid';
import { FITTED_QUALITY_LIMITS, gridQuality, qualityFailures } from '../../src/grid/quality';
import { normalShock, stagnationPressureRatio } from '../../src/validation/gas-dynamics';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const gamma = 1.4;
const deg = Math.PI / 180;
const options = { gamma, nj: 20, refinement: 1, maxIterations: 20_000 };

describe('flow with the bow shock fitted (design record 0006)', () => {
  it('Mach 3, 20 deg cone: converged, drag within 0.03% of Taylor-Maccoll on the coarsest grid', () => {
    // Measured when written: +0.0251% (nj = 20); with the captured shock -0.395%.
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(20 * deg), baseRadius: 0.5 },
      cylinderLength: 4,
    };
    const { fit, drag } = sharpFittedFlow(cone, { ...options, mach: 3 });
    expect(fit.converged).toBe(true);
    const exact = taylorMaccoll(3, 20 * deg, gamma).surfacePressureCoefficient;
    expect(Math.abs(drag / exact - 1)).toBeLessThan(3e-4);
  }, 600_000);

  it('Mach 2 hemisphere-cylinder: converged, stagnation pressure within 0.01% of the pitot value', () => {
    // Measured when written: +0.0076% (nj = 20); with the captured shock +9.7%.
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 0.5, baseRadius: 0.5 },
      cylinderLength: 4,
    };
    const { fit } = bluntFittedFlow(body, { ...options, mach: 2 });
    expect(fit.converged).toBe(true);
    const shock = normalShock(2, gamma);
    const pitot = shock.pressureRatio * stagnationPressureRatio(shock.downstreamMach, gamma);
    const face = fit.solver.boundaryFluxes('jMin')[0]!;
    const p = face.flux[1] * face.nx + face.flux[2] * face.ny;
    expect(Math.abs(p / pitot - 1)).toBeLessThan(1e-4);
  }, 600_000);

  it('blunt grid families nest: the finer grid has every line and node fraction of the coarser', () => {
    // What starting each grid from the converged one before needs
    // (startedFrom); the base problem is that of bluntFitProblem.
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 1.5, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    const family = bluntFitFamily(body, { mach: 2, gamma, nj: 20 });
    const coarse = family(1);
    const fine = family(2);
    const alone = bluntFitProblem(body, { mach: 2, gamma, nj: 20, refinement: 1 });
    expect(alone.heights).toEqual(coarse.heights);
    expect(alone.lines).toEqual(coarse.lines);
    expect(fine.lines.length - 1).toBe(2 * (coarse.lines.length - 1));
    expect(fine.nj).toBe(2 * coarse.nj);
    coarse.lines.forEach((a, k) => {
      const b = fine.lines[2 * k]!;
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(1e-13);
      expect(fine.heights[2 * k]).toBe(coarse.heights[k]);
      a.fractions!.forEach((f, j) => {
        expect(Math.abs(b.fractions![2 * j]! - f)).toBeLessThan(1e-14);
      });
    });
    // The page starts the finer grid from the coarser one's fit, at every
    // level of the family.
    const fit = { heights: coarse.heights, cell: coarse.initial } as unknown as GpuShockFit;
    const warm = startedFrom(fine, coarse, fit);
    expect(warm).not.toBeNull();
    expect(warm!.heights[2]).toBe(coarse.heights[1]);
    const finer = family(4);
    const fineFit = { heights: fine.heights, cell: fine.initial } as unknown as GpuShockFit;
    expect(startedFrom(finer, fine, fineFit)).not.toBeNull();
    fine.lines.forEach((a, k) => {
      a.fractions!.forEach((f, j) => {
        expect(finer.lines[2 * k]!.fractions![2 * j]).toBe(f);
      });
    });
  }, 600_000);

  it('a blunt start computed in chunks is the same start, and stops when aborted', async () => {
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 1, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    const familyOptions = { mach: 3, gamma, nj: 20 };
    const whole = bluntStart(body, familyOptions);
    const seen: number[] = [];
    const chunked = await bluntStartInChunks(body, familyOptions, {
      chunk: 7,
      pause: () => Promise.resolve(),
      onProgress: (steps) => seen.push(steps),
    });
    expect(chunked.heights).toEqual(whole.heights);
    expect(chunked.cell(5, 3)).toEqual(whole.cell(5, 3));
    expect(seen.at(-1)).toBe(3000);
    const controller = new AbortController();
    const stopped = bluntStartInChunks(body, familyOptions, {
      chunk: 50,
      pause: () => Promise.resolve(),
      signal: controller.signal,
      onProgress: (steps) => {
        if (steps >= 100) controller.abort();
      },
    });
    await expect(stopped).rejects.toThrow();
  }, 600_000);

  it('tests the base flow at the end of the body asked for, between grid columns', () => {
    // A cylinder shorter than the one caliber always solved, whose end
    // lies inside a column; a flow whose axial Mach number is linear in x.
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(20 * deg), baseRadius: 0.5 },
      cylinderLength: 0.3,
    };
    const problem = sharpFitProblem(cone, { gamma, nj: 20, refinement: 1, mach: 3 });
    const grid = gridOnLines(problem.lines, problem.heights, problem.nj, 0.5, false);
    const { lines } = problem;
    const end = cone.nose.length + 0.3;
    expect(lines.some((l) => Math.abs(l.x - end) < 1e-9)).toBe(false);
    const mach = (x: number) => 0.5 + 0.2 * x;
    const flow = (i: number) => ({
      rho: 1,
      u: Math.sqrt(gamma) * mach(0.5 * (lines[i]!.x + lines[i + 1]!.x)),
      v: 0,
      p: 1,
    });
    expect(baseMach(problem, grid, flow)).toBeCloseTo(mach(end), 12);
    // A bare nose ends at the corner, a grid line: the column just ahead
    // of it is tested, not one in the expansion behind.
    const bare: Body = { ...cone, cylinderLength: 0 };
    const p0 = sharpFitProblem(bare, { gamma, nj: 20, refinement: 1, mach: 3 });
    const g0 = gridOnLines(p0.lines, p0.heights, p0.nj, 0.5, false);
    const corner = p0.lines.findIndex((l) => l.x === bare.nose.length);
    expect(corner).toBeGreaterThan(0);
    const flow0 = (i: number) => ({
      rho: 1,
      u: Math.sqrt(gamma) * mach(0.5 * (p0.lines[i]!.x + p0.lines[i + 1]!.x)),
      v: 0,
      p: 1,
    });
    const ahead = mach(0.5 * (p0.lines[corner - 1]!.x + p0.lines[corner]!.x));
    expect(baseMach(p0, g0, flow0)).toBeCloseTo(ahead, 12);
  });

  it('a 36 deg tip passes the quality gates of fitted grids, set on its measured family (0006)', () => {
    // The secant ogive (0.5) of 1 caliber at Mach 3: wall cells at 53.4 deg,
    // which the generated grids' gate (60 deg) refuses.
    const ogive: Body = {
      nose: { shape: { kind: 'ogive', parameter: 0.5 }, length: 1, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    const problem = sharpFitProblem(ogive, { gamma, nj: 20, refinement: 1, mach: 3 });
    const quality = gridQuality(
      gridOnLines(problem.lines, problem.heights, problem.nj, 0.5, false),
    );
    expect(qualityFailures(quality).join()).toMatch(/wall cell angle/);
    expect(qualityFailures(quality, FITTED_QUALITY_LIMITS)).toEqual([]);
  });

  it('a bare nose is solved with a cylinder behind it only where the flow leaves its base supersonically', () => {
    // A 20 deg cone at Mach 3 leaves its base at Mach 2; the same grid
    // with the flow slowed to Mach 0.42 everywhere is refused.
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(20 * deg), baseRadius: 0.5 },
      cylinderLength: 0,
    };
    const problem = sharpFitProblem(cone, { gamma, nj: 20, refinement: 1, mach: 3 });
    const { fit } = fittedFlow(problem, 20_000);
    expect(fit.converged).toBe(true);
    expect(baseMach(problem, fit.grid, (i, j) => fit.solver.primitive(i, j))).toBeGreaterThan(1);
    const slow = { rho: 1, u: 0.5, v: 0, p: 1 };
    expect(baseMach(problem, fit.grid, () => slow)).toBeLessThan(1);
  }, 600_000);

  it('the drag from the rows of cells at the wall alone is the drag from the whole grid', () => {
    // The page evaluates it on a strip, the finest grids having millions of cells.
    const ogive: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const problem = sharpFitProblem(ogive, { gamma, nj: 20, refinement: 1, mach: 2 });
    const { fit, drag } = fittedFlow(problem, 20_000);
    expect(fit.converged).toBe(true);
    const strip = wallDrag(problem, fit.grid, (i, j) => fit.solver.primitive(i, j));
    expect(Math.abs(strip / drag - 1)).toBeLessThan(1e-14);
  }, 600_000);

  it('a tip too blunt for an attached shock is refused with its angle and what to change', () => {
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    expect(() => sharpFitProblem(cone, { gamma, nj: 20, refinement: 1, mach: 1.2 })).toThrow(
      /at Mach 1.2 the bow shock cannot stay attached to a tip of 45.0 deg half-angle; this needs a sharper or longer nose/,
    );
  });

  it('a tip whose conical flow crosses the starting plane subsonically is refused, with the reason', () => {
    // The 3-caliber tangent ogive at Mach 1.2: an 18.9 deg tip cone, its
    // surface flow at Mach 0.85.
    const ogive: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    expect(() => sharpFitProblem(ogive, { gamma, nj: 20, refinement: 1, mach: 1.2 })).toThrow(
      /at Mach 1.2 the flow over a tip of 18.9 deg half-angle is subsonic at the surface \(Mach 0.85\)/,
    );
    // At Mach 1.5 it is supersonic, and the problem is built.
    expect(() => sharpFitProblem(ogive, { gamma, nj: 20, refinement: 1, mach: 1.5 })).not.toThrow();
    // A 24 deg cone at Mach 1.5: supersonic surface flow (Mach 1.04), whose
    // axial component (0.95) crosses the plane normal to the axis
    // subsonically; on every grid.
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(24 * deg), baseRadius: 0.5 },
      cylinderLength: 2,
    };
    for (const refinement of [1, 8]) {
      expect(() => sharpFitProblem(cone, { gamma, nj: 20, refinement, mach: 1.5 })).toThrow(
        /crosses the solver's starting plane, normal to the axis, at an axial Mach number of 0.95/,
      );
    }
  });

  it('verified fitted drag: a grid that does not converge gives no value, only the reason', async () => {
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(20 * deg), baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const result = await verifiedFittedDrag(cone, {
      mach: 3,
      gamma,
      maxRefinement: 8,
      floor: 0,
      tolerance: 0,
      iterationsPerRefinement: 10,
    });
    expect(result.kind).toBe('not-converged');
    if (result.kind === 'not-converged') {
      expect(result.refinement).toBe(1);
      expect(result.reason).toMatch(/the fit stopped after 10 iterations/);
    }
  }, 600_000);
});
