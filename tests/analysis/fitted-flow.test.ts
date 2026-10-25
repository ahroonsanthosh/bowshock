import { describe, expect, it } from 'vitest';
import {
  FALLBACK_COLUMN_DENSITY,
  baseMach,
  bluntFitFamily,
  bluntFitProblem,
  bluntFittedFlow,
  bluntNoseRefusal,
  bluntStart,
  bluntStartInChunks,
  fittedDragFloor,
  fittedFlow,
  insideOutline,
  sharpFitProblem,
  sharpFittedFlow,
  solvedBluntBody,
  verifiedFittedDrag,
  VON_KARMAN_REFERENCES,
  wallDrag,
  type BluntStart,
} from '../../src/analysis/fitted-flow';
import { startedFrom } from '../../src/analysis/gpu-fitted-flow';
import type { GpuShockFit } from '../../src/engine-gpu/shock-fitting-gpu';
import { TWO_SCALE_DRAG_FLOOR } from '../../src/analysis/verified-drag';
import type { Body } from '../../src/geometry/body';
import { bluntBodyGrid, gridOnLines } from '../../src/grid/blunt-grid';
import { FITTED_QUALITY_LIMITS, gridQuality, qualityFailures } from '../../src/grid/quality';
import { normalShock, stagnationPressureRatio } from '../../src/validation/gas-dynamics';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const gamma = 1.4;
const deg = Math.PI / 180;
const options = { gamma, nj: 20, refinement: 1, maxIterations: 20_000 };

describe('flow with the bow shock fitted (design record 0006)', () => {
  it('Mach 3, 20 deg cone: drag within 0.03% of Taylor-Maccoll on the coarsest grid, at second order', () => {
    // The page's claim rests on the order: a regression that kept the
    // coarsest grid within 3e-4 would show in the ratio. Measured when
    // written: +0.1017% on 10 cells across, +0.0251% on that grid refined
    // twice (with the captured shock, -0.395% on 20 cells across), falling
    // by 4.05, and extrapolated at second order to within 4.3e-6 of the
    // exact drag.
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(20 * deg), baseRadius: 0.5 },
      cylinderLength: 4,
    };
    const exact = taylorMaccoll(3, 20 * deg, gamma).surfacePressureCoefficient;
    const error = (refinement: number) => {
      const { fit, drag } = sharpFittedFlow(cone, { ...options, nj: 10, refinement, mach: 3 });
      expect(fit.converged).toBe(true);
      return drag / exact - 1;
    };
    const coarse = error(1);
    const fine = error(2);
    expect(Math.abs(fine)).toBeLessThan(3e-4);
    expect(coarse / fine).toBeGreaterThan(3.9);
    expect(coarse / fine).toBeLessThan(4.1);
    expect(Math.abs(fine - (coarse - fine) / 3)).toBeLessThan(1e-5);
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

  it('lengthens the solved cylinder of a blunt nose until its start grid meets the size-ratio gate', () => {
    // The 1.5-caliber ellipsoid at Mach 1.2: on one and two calibers of
    // cylinder the lines turn vertical over the last cells, which then
    // differ in size by 1.35 and 1.38 (measured when written); on three by
    // 1.24.
    const asked: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 1.5, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const familyOptions = { mach: 1.2, gamma, nj: 20 };
    const { body, base } = solvedBluntBody(asked, familyOptions);
    expect(body.cylinderLength).toBe(3);
    expect(body.nose).toEqual(asked.nose);
    expect(gridQuality(base.grid).maxSizeRatio).toBeLessThanOrEqual(
      FITTED_QUALITY_LIMITS.maxSizeRatio,
    );
    // A body that passes keeps its cylinder, as the measured families of
    // 0006 do (the 3:1 ellipsoid with two calibers at Mach 2), and a bare
    // nose gets the one caliber always solved.
    const ellipsoid3: Body = { ...asked, nose: { ...asked.nose, length: 3 }, cylinderLength: 2 };
    expect(solvedBluntBody(ellipsoid3, { ...familyOptions, mach: 2 }).body.cylinderLength).toBe(2);
    const bare: Body = { ...ellipsoid3, cylinderLength: 0 };
    expect(solvedBluntBody(bare, { ...familyOptions, mach: 3 }).body.cylinderLength).toBe(1);
  }, 120_000);

  it('a lengthened blunt family nests exactly at refinements 2, 4 and 8 (Mach 1.2)', () => {
    // What startedFrom and nestedHeights need, on a family whose spacing's
    // slope is limited and whose cylinder is lengthened. The start's
    // heights are made up: the nesting does not depend on them.
    const asked: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 1.5, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const familyOptions = { mach: 1.2, gamma, nj: 20 };
    const { body, base } = solvedBluntBody(asked, familyOptions);
    const start: BluntStart = {
      body,
      lines: base.lines,
      heights: base.lines.map((l) => 0.4 * l.h),
      grid: base.grid,
      cell: () => ({ rho: 1, u: 1.2 * Math.sqrt(gamma), v: 0, p: 1 }),
    };
    const family = bluntFitFamily(asked, familyOptions, start);
    let coarse = family(1);
    expect(coarse.lines.at(-1)!.x).toBe(body.nose.length + body.cylinderLength);
    for (const refinement of [2, 4, 8]) {
      const fine = family(refinement);
      expect(fine.lines.length - 1).toBe(2 * (coarse.lines.length - 1));
      expect(fine.nj).toBe(2 * coarse.nj);
      coarse.lines.forEach((a, k) => {
        const b = fine.lines[2 * k]!;
        expect(b.x).toBe(a.x);
        expect(b.y).toBe(a.y);
        expect(fine.heights[2 * k]).toBe(coarse.heights[k]);
        a.fractions!.forEach((f, j) => {
          expect(b.fractions![2 * j]).toBe(f);
        });
      });
      const fit = { heights: coarse.heights, cell: coarse.initial } as unknown as GpuShockFit;
      expect(startedFrom(fine, coarse, fit)).not.toBeNull();
      coarse = fine;
    }
  }, 300_000);

  it('a two-scale family nests exactly at refinements 2, 4 and 8 on its outer boundary (Haack)', () => {
    // A two-scale nose keeps solvedBody's cylinder (its family's grid is
    // built on the captured shock, not the generator's), and every grid
    // of its family shares the start's outer boundary (secondCapture's;
    // here, and the start's heights, made up).
    const asked: Body = {
      nose: { shape: { kind: 'haack', parameter: 0 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    const familyOptions = { mach: 2, gamma, nj: 20 };
    const { body, base: first } = solvedBluntBody(asked, familyOptions);
    expect(first.twoScale).toBe(true);
    expect(body).toEqual(asked);
    const outerBoundary = first.lines.map((l) => ({
      x: l.x + 0.4 * l.h * l.dx,
      y: l.y + 0.4 * l.h * l.dy,
    }));
    const base = bluntBodyGrid(body, { nj: 20, mach: 2, outerBoundary, gated: false });
    const start: BluntStart = {
      body,
      lines: base.lines,
      heights: base.lines.map((l) => 0.6 * l.h),
      grid: base.grid,
      cell: () => ({ rho: 1, u: 2 * Math.sqrt(gamma), v: 0, p: 1 }),
      outerBoundary,
    };
    const family = bluntFitFamily(asked, familyOptions, start);
    let coarse = family(1);
    expect(coarse.lines).toHaveLength(base.lines.length);
    for (const refinement of [2, 4, 8]) {
      const fine = family(refinement);
      expect(fine.lines.length - 1).toBe(2 * (coarse.lines.length - 1));
      expect(fine.nj).toBe(2 * coarse.nj);
      coarse.lines.forEach((a, k) => {
        const b = fine.lines[2 * k]!;
        expect(b.x).toBe(a.x);
        expect(b.y).toBe(a.y);
        expect(fine.heights[2 * k]).toBe(coarse.heights[k]);
        a.fractions!.forEach((f, j) => {
          expect(b.fractions![2 * j]).toBe(f);
        });
      });
      const fit = { heights: coarse.heights, cell: coarse.initial } as unknown as GpuShockFit;
      expect(startedFrom(fine, coarse, fit)).not.toBeNull();
      coarse = fine;
    }
  }, 600_000);

  it('serves ellipsoids, and Von Karman noses inside the outline of their references only', () => {
    const nose = (shape: Body['nose']['shape'], calibers: number): Body => ({
      nose: { shape, length: calibers, baseRadius: 0.5 },
      cylinderLength: 1,
    });
    const vonKarman = { kind: 'haack', parameter: 0 } as const;
    expect(bluntNoseRefusal(nose({ kind: 'ellipsoid' }, 6), 1.2)).toBeUndefined();
    for (const [calibers, mach] of VON_KARMAN_REFERENCES) {
      expect(bluntNoseRefusal(nose(vonKarman, calibers), mach)).toBeUndefined();
    }
    expect(bluntNoseRefusal(nose(vonKarman, 8), 1.2)).toMatch(/outside the referenced range/);
    // The outline's edge from 5 calibers at Mach 2 to 3 at Mach 3.
    expect(bluntNoseRefusal(nose(vonKarman, 4), 2.5)).toBeUndefined();
    expect(bluntNoseRefusal(nose(vonKarman, 4.1), 2.5)).toMatch(/outside the referenced range/);
    expect(bluntNoseRefusal(nose(vonKarman, 5), 2.1)).toMatch(/outside the referenced range/);
    expect(bluntNoseRefusal(nose({ kind: 'haack', parameter: 1 / 3 }, 3), 2)).toMatch(
      /only the Von Karman/,
    );
    expect(bluntNoseRefusal(nose({ kind: 'power', exponent: 0.75 }, 3), 2)).toMatch(
      /only the Von Karman/,
    );
    // Sharp tips are the sharp problem's to refuse (a detached shock).
    expect(bluntNoseRefusal(nose({ kind: 'ogive', parameter: 1 }, 1), 1.2)).toBeUndefined();
    // The outline: a point, a segment, a polygon.
    expect(insideOutline([[3, 2]], [3, 2])).toBe(true);
    expect(insideOutline([[3, 2]], [3, 2.1])).toBe(false);
    expect(
      insideOutline(
        [
          [1, 2],
          [3, 2],
        ],
        [2, 2],
      ),
    ).toBe(true);
    expect(
      insideOutline(
        [
          [1, 2],
          [3, 2],
        ],
        [2, 2.01],
      ),
    ).toBe(false);
    const quad: [number, number][] = [
      [1, 2],
      [3, 2],
      [3, 3],
      [5, 1.5],
    ];
    expect(insideOutline(quad, [3, 2])).toBe(true);
    expect(insideOutline(quad, [4, 2])).toBe(true);
    expect(insideOutline(quad, [5, 1.5])).toBe(true);
    expect(insideOutline(quad, [5, 2])).toBe(false);
    expect(insideOutline(quad, [1, 1.5])).toBe(false);
    // The allowance: raised on a two-scale start only.
    const start = (outerBoundary?: { x: number; y: number }[]) =>
      ({ ...(outerBoundary ? { outerBoundary } : {}) }) as unknown as BluntStart;
    expect(fittedDragFloor(7e-5, null)).toBe(7e-5);
    expect(fittedDragFloor(7e-5, start())).toBe(7e-5);
    expect(fittedDragFloor(7e-5, start([{ x: -1, y: 0 }]))).toBe(TWO_SCALE_DRAG_FLOOR);
  });

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

  it('a chunked blunt start returns to the caller between the cylinder lengths it tries', async () => {
    // The 1.5-caliber ellipsoid at Mach 1.2 tries one, two and three
    // calibers: a pause after each refused length, before the capture,
    // where a page can stop it.
    const body: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 1.5, baseRadius: 0.5 },
      cylinderLength: 1,
    };
    const controller = new AbortController();
    let pauses = 0;
    const started = bluntStartInChunks(
      body,
      { mach: 1.2, gamma, nj: 20 },
      {
        chunk: 50,
        pause: () => {
          pauses++;
          controller.abort();
          return Promise.resolve();
        },
        signal: controller.signal,
        onProgress: () => {
          throw new Error('the capture should not start');
        },
      },
    );
    await expect(started).rejects.toThrow(/aborted/);
    expect(pauses).toBe(1);
  }, 120_000);

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

  it('a tip whose conical flow crosses the starting plane subsonically is refused, but for a tangent nose with supersonic surface flow', () => {
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
    // At Mach 1.35 its surface flow is supersonic (Mach 1.04) but its axial
    // component (0.98) is not: served, since the ogive meets the cylinder
    // without a corner (measured in 0006); on every grid.
    for (const refinement of [1, 8]) {
      expect(() => sharpFitProblem(ogive, { gamma, nj: 20, refinement, mach: 1.35 })).not.toThrow();
    }
    // So is a 2-caliber tangent ogive at Mach 1.6, near the least Mach
    // number at which it is served: surface Mach 1.0036, axial 0.886 (0006).
    const short: Body = { ...ogive, nose: { ...ogive.nose, length: 2 } };
    expect(() => sharpFitProblem(short, { gamma, nj: 20, refinement: 1, mach: 1.6 })).not.toThrow();
    expect(() => sharpFitProblem(short, { gamma, nj: 20, refinement: 1, mach: 1.59 })).toThrow(
      /is subsonic at the surface \(Mach 0.99\)/,
    );
    // A 24 deg cone at Mach 1.5: supersonic surface flow (Mach 1.04), whose
    // axial component (0.95) crosses the plane normal to the axis
    // subsonically, and a corner at the cylinder: refused, on every grid.
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(24 * deg), baseRadius: 0.5 },
      cylinderLength: 2,
    };
    for (const refinement of [1, 8]) {
      expect(() => sharpFitProblem(cone, { gamma, nj: 20, refinement, mach: 1.5 })).toThrow(
        /crosses the solver's starting plane, normal to the axis, at an axial Mach number of 0.95 at the surface, below 1, which this solver handles only where the nose meets the body without a corner/,
      );
    }
  });

  it('Mach 1.35, 3-caliber tangent ogive, axially subsonic tip: second order towards the measured value', async () => {
    // Measured in 0006 on the page's family (nj = 20 to 160, each grid
    // converged to 1e-10 of its drag): 0.1081856017, 0.1077785038,
    // 0.1076868609, 0.1076656809, at orders 2.15 and 2.11, extrapolated
    // to 0.1076586209 (band 8.8e-6, 1.6e-5 with the floor); a family laid
    // out at 1.5 times the column density extrapolates to 1.5e-5 of it.
    // Measured when written on the coarser family of 10 cells across:
    // +2.075e-2 and +4.730e-3 of that value, falling by 4.39.
    const ogive: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    const reference = 0.1076586209;
    const drag = (nj: number, refinement: number) => {
      const flow = sharpFittedFlow(ogive, { ...options, nj, refinement, mach: 1.35 });
      expect(flow.fit.converged).toBe(true);
      return flow.drag;
    };
    const coarse = drag(10, 1) / reference - 1;
    const fine = drag(10, 2) / reference - 1;
    expect(fine).toBeGreaterThan(0);
    expect(fine).toBeLessThan(5e-3);
    expect(coarse / fine).toBeGreaterThan(4.1);
    expect(coarse / fine).toBeLessThan(4.7);
    // The page's base grid, as in the family above, through the verified
    // procedure: its grid passes the gates, so it is solved as before the
    // fallback to more columns existed, to the last bit (the value measured
    // then).
    const fallbacks: number[] = [];
    const result = await verifiedFittedDrag(ogive, {
      mach: 1.35,
      gamma,
      maxRefinement: 1,
      floor: 0,
      tolerance: 0,
      iterationsPerRefinement: 20_000,
      onFallback: (refinement) => fallbacks.push(refinement),
    });
    expect(fallbacks).toEqual([]);
    expect(result.kind).toBe('solved');
    if (result.kind === 'solved') {
      expect(result.columnDensity).toBeUndefined();
      expect(result.levels[0]!.value).toBe(0.1081856016981207);
    }
  }, 900_000);

  it('a sharp nose whose usual grid fails only the quality gates is solved again with more columns', async () => {
    // A 3-caliber tangent ogive with 30 calibers of cylinder at Mach 1.5:
    // on 20 cells across the usual grid's wall cells at the end of the
    // cylinder, under a far shock, reach an aspect ratio of 18.0 (measured
    // when written), above the 13 allowed; with 1.5 times the columns
    // every grid passes.
    const ogive: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 30,
    };
    const fallbacks: { refinement: number; reason: string }[] = [];
    const result = await verifiedFittedDrag(ogive, {
      mach: 1.5,
      gamma,
      maxRefinement: 1,
      floor: 0,
      tolerance: 0,
      iterationsPerRefinement: 20_000,
      onFallback: (refinement, reason) => fallbacks.push({ refinement, reason }),
    });
    expect(fallbacks).toHaveLength(1);
    expect(fallbacks[0]!.refinement).toBe(1);
    expect(fallbacks[0]!.reason).toMatch(
      /fails its quality checks \(cell aspect ratio 18.0 above 13\)/,
    );
    expect(result.kind).toBe('solved');
    if (result.kind === 'solved') {
      expect(result.columnDensity).toBe(FALLBACK_COLUMN_DENSITY);
      // Measured when written: 0.10583491196235459 on 184 columns.
      expect(Math.abs(result.levels[0]!.value / 0.10583491196235459 - 1)).toBeLessThan(1e-12);
    }
  }, 900_000);

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
