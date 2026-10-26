import { describe, expect, it } from 'vitest';
import {
  fittedCaseFailure,
  fittedFlow,
  sharpFitProblem,
  wallDrag,
} from '../../src/analysis/fitted-flow';
import { bodyLength, shoulderPosition, type Body } from '../../src/geometry/body';
import { gridOnLines } from '../../src/grid/blunt-grid';

/**
 * The fitted solve continued over a conical boat-tail (design record 0023
 * section 2.1): the body solved, its columns, the drag split, and one
 * family's coarsest grid against the method of characteristics.
 */

const gamma = 1.4;
const deg = Math.PI / 180;

/** 3-caliber tangent ogive, 3 calibers of cylinder, a 1-caliber 6 deg boat-tail. */
const body: Body = {
  nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
  cylinderLength: 3,
  boatTail: { length: 1, baseRadius: 0.5 - Math.tan(6 * deg) },
};

describe('the fitted solve over a boat-tail', () => {
  it('solves the boat-tail where it is, its cone continued past the base by four columns, the shoulder and base on grid lines', () => {
    const xs = shoulderPosition(body);
    const xb = bodyLength(body);
    const problem = (b: Body, refinement = 1, columnDensity = 1) =>
      sharpFitProblem(b, { mach: 2, gamma, nj: 20, refinement, columnDensity });
    let continuation = NaN;
    for (const refinement of [1, 2]) {
      const p = problem(body, refinement);
      const xsLines = p.lines.map((l) => l.x);
      expect(xsLines).toContain(xs);
      expect(xsLines).toContain(xb);
      expect(p.askedEnd).toBe(xb);
      expect(p.stepAspect).toBe(2);
      // Past the base: 4 columns of the base's width on the base grid, 8 on
      // the next, the same length.
      const past = xsLines.filter((x) => x >= xb);
      expect(past).toHaveLength(4 * refinement + 1);
      const width = past[1]! - past[0]!;
      past.slice(1).forEach((x, k) => {
        expect(x - past[k]!).toBeCloseTo(width, 12);
      });
      if (refinement === 1) continuation = past[4]! - xb;
      expect(past[past.length - 1]! - xb).toBeCloseTo(continuation, 12);
      // The lines follow the body: the cone continues past the base.
      const last = p.lines[p.lines.length - 1]!;
      expect(last.y).toBeCloseTo(0.5 - (1 + continuation) * Math.tan(6 * deg), 12);
      // Over the boat-tail: about 2 min(l, R) / nj or more (the count of
      // columns is rounded), at most l / (4 refinement).
      const over = xsLines.filter((x) => x >= xs && x <= xb);
      for (let k = 1; k < over.length; k++) {
        expect(over[k]! - over[k - 1]!).toBeGreaterThan((0.95 * 0.05) / refinement);
        expect(over[k]! - over[k - 1]!).toBeLessThan(0.25 / refinement + 1e-9);
      }
    }
    // ... of the denser family's columns where it is solved again.
    const dense = problem(body, 1, 1.5).lines;
    expect(dense[dense.length - 1]!.x - xb).toBeCloseTo(continuation / 1.5, 12);
    // ... or nine tenths of the cone's run to the axis, if shorter.
    const steep: Body = { ...body, boatTail: { length: 1, baseRadius: 0.05 } };
    const steepLines = problem(steep).lines;
    expect(steepLines[steepLines.length - 1]!.x - bodyLength(steep)).toBeCloseTo(
      (0.9 * 0.05) / 0.45,
      12,
    );
    // Under a far shock the columns widen to keep the outer cells within
    // the aspect gate (a 4 deg boat-tail of 2 calibers behind 5 calibers of
    // cylinder at Mach 1.5: 0.05 would give aspect ratios of 23).
    const far: Body = {
      ...body,
      cylinderLength: 5,
      boatTail: { length: 2, baseRadius: 0.5 - 2 * Math.tan(4 * deg) },
    };
    const farLines = sharpFitProblem(far, { mach: 1.5, gamma, nj: 20, refinement: 1 }).lines;
    const farXs = shoulderPosition(far);
    const widths = farLines
      .filter((l) => l.x > farXs)
      .map((l, k, all) => (k > 0 ? l.x - all[k - 1]!.x : NaN))
      .slice(1);
    expect(Math.min(...widths)).toBeGreaterThan(0.08);
    // The grids nest: every coarser line is one of the finer grid's.
    const coarse = sharpFitProblem(body, { mach: 2, gamma, nj: 20, refinement: 1 }).lines;
    const fine = sharpFitProblem(body, { mach: 2, gamma, nj: 20, refinement: 2 }).lines;
    expect(fine).toHaveLength(2 * (coarse.length - 1) + 1);
    coarse.forEach((l, k) => {
      expect(fine[2 * k]!.x).toBeCloseTo(l.x, 12);
    });
    // Without a boat-tail the body solved is as before: a caliber of cylinder past its end.
    const plain = sharpFitProblem(
      { nose: body.nose, cylinderLength: 3 },
      { mach: 2, gamma, nj: 20, refinement: 1 },
    );
    expect(plain.stepAspect).toBeUndefined();
    expect(plain.boatTailDrag).toBeUndefined();
    expect(plain.lines[plain.lines.length - 1]!.x).toBe(6);
  }, 60_000);

  it("splits the wall's drag at the shoulder and the base: the continuation counts in neither", () => {
    const p = sharpFitProblem(body, { mach: 2, gamma, nj: 20, refinement: 1 });
    const grid = gridOnLines(p.lines, p.heights, p.nj, p.baseRadius, false);
    const xs = shoulderPosition(body);
    const xb = bodyLength(body);
    const free = p.freeStream;
    const centre = (i: number) => 0.5 * (p.lines[i]!.x + p.lines[i + 1]!.x);
    // Gas at rest at the free stream's pressure, 2 over a part of the wall's
    // columns: the wall's pressure is then the cells' exactly.
    const raised = (from: number, to: number) => (i: number) => {
      const x = centre(i);
      return { rho: 1, u: 0, v: 0, p: x > from && x < to ? 2 : free.p };
    };
    const q = 0.5 * free.u * free.u;
    const R = 0.5;
    const rb = body.boatTail!.baseRadius;
    // On the boat-tail: (2 - 1) over the frustum's projected area, on pi R^2,
    // pulling the body back; the continuation raised too changes nothing.
    const tailOnly = wallDrag({ ...p, drag: p.boatTailDrag! }, grid, raised(xs, xb));
    expect(tailOnly).toBeCloseTo(-(R * R - rb * rb) / (q * R * R), 12);
    expect(wallDrag({ ...p, drag: p.boatTailDrag! }, grid, raised(xs, Infinity))).toBeCloseTo(
      tailOnly,
      12,
    );
    // ... and the forebody's drag does not see it.
    const nose = wallDrag(p, grid, raised(Infinity, Infinity));
    expect(wallDrag(p, grid, raised(xs, Infinity))).toBeCloseTo(nose, 12);
  }, 60_000);

  it('the coarsest grid (nj = 20) converges, passes the gates, and lies 0.82% above the method of characteristics', () => {
    // The march's boat-tail drag extrapolated from 640 to 2560 intervals,
    // 0.0345663454 (tests/validation/characteristics-corners.test.ts). On
    // nj = 20, 40 and 80 the fit gave 0.03484949, 0.03467422, 0.03460433
    // (docs/research/boat-tails/out/o3-c3-bt6-l1-m2.jsonl).
    const reference = 0.0345663454;
    const p = sharpFitProblem(body, { mach: 2, gamma, nj: 20, refinement: 1 });
    const { fit } = fittedFlow(p, 20_000);
    expect(fit.converged).toBe(true);
    const cell = (i: number, j: number) => fit.solver.primitive(i, j);
    expect(fittedCaseFailure(p, fit.grid, cell)).toBeUndefined();
    const tail = p.boatTailDrag!(fit.solver.boundaryFluxes('jMin'));
    expect(tail / reference - 1).toBeGreaterThan(0.0078);
    expect(tail / reference - 1).toBeLessThan(0.0086);
  }, 900_000);
});
