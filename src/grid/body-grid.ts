/**
 * Structured grids around axisymmetric bodies with sharp noses, generated
 * automatically from the body profile (design: docs/design/0004-grids.md).
 *
 * Topology (H): grid lines of constant i are vertical; the lower boundary
 * (jMin) is the axis upstream of the tip and the body surface behind it,
 * the upper boundary (jMax) the outer boundary, iMin the inflow plane and
 * iMax the outflow plane at the end of the body. Breakpoints of the profile
 * (tip, shoulder) lie on grid lines.
 *
 * The outer boundary is a straight line inclined at 1.2 times the angle of
 * the conical shock that the nose tip would carry (Taylor-Maccoll), or more
 * where needed to keep that shock several cells inside it, so the bow shock
 * stays inside it while the cells follow the growing shock layer.
 * Blunt noses, whose profile leaves the tip vertically, need a different
 * topology and are refused, as is any grid that fails the quality checks
 * of quality.ts.
 */

import { bodyBreakpoints, bodyLength, bodyRadius, validateBody, type Body } from '../geometry/body';
import { noseTipSlope } from '../geometry/nose';
import { taylorMaccoll } from '../validation/taylor-maccoll';
import { QUALITY_LIMITS, gridQuality, qualityFailures } from './quality';
import { gridFromFunction, type StructuredGrid } from './structured';

export interface BodyGridOptions {
  /**
   * Cells from the body to the outer boundary on the base grid of a
   * family; the cells along the body follow from it and the geometry.
   */
  readonly nj: number;
  /**
   * Refinement of the base grid: 1, 2, 4, ... The grid has refinement
   * times as many cells in each direction, and keeps every node of the
   * coarser grids of its family, as grid-convergence studies need.
   * Default 1.
   */
  readonly refinement?: number;
  readonly mach: number;
  readonly gamma: number;
}

export interface BodyGrid {
  readonly grid: StructuredGrid;
  /** Grid index i of the nose tip (the first body node). */
  readonly iTip: number;
  /** Angle of the outer boundary to the axis, radians. */
  readonly outerAngle: number;
}

/** A generated grid failed its quality checks; it is refused, not returned. */
export class GridQualityError extends Error {
  override readonly name = 'GridQualityError';
}

/** Least margin of the outer boundary over the tip's conical shock angle. */
const OUTER_ANGLE_FACTOR = 1.2;
/**
 * Least number of cells of the base grid between the tip's conical shock
 * line and the outer boundary, anywhere along the body. A captured shock
 * spreads over two to three cells; with fewer than three between them the
 * outer cells, where the free stream is imposed, feel it.
 */
const OUTER_CELLS_ABOVE_SHOCK = 3;
/**
 * Steepest tip the H topology serves: its vertical grid lines meet the
 * nose at 90 deg minus the tip half-angle, and wall cells need at least
 * QUALITY_LIMITS.minWallAngle.
 */
const MAX_TIP_HALF_ANGLE = Math.PI / 2 - QUALITY_LIMITS.minWallAngle;

export function bodyGrid(body: Body, options: BodyGridOptions): BodyGrid {
  validateBody(body);
  const { mach, gamma } = options;
  const refinement = options.refinement ?? 1;
  if (!(Number.isInteger(options.nj) && options.nj >= 4)) {
    throw new RangeError('a body grid needs at least 4 cells across');
  }
  if (!(Number.isInteger(Math.log2(refinement)) && refinement >= 1)) {
    throw new RangeError('the refinement must be 1, 2, 4, 8, ...');
  }
  const nj = options.nj * refinement;
  const tipSlope = noseTipSlope(body.nose);
  if (!Number.isFinite(tipSlope)) {
    throw new RangeError(
      'blunt noses (profile vertical at the tip) are not supported yet: they need a grid around the stagnation point',
    );
  }
  const tipHalfAngle = Math.atan(tipSlope);
  if (tipHalfAngle > MAX_TIP_HALF_ANGLE) {
    throw new RangeError(
      `tip half-angles above ${toDegrees(MAX_TIP_HALF_ANGLE)} deg are not supported yet, got ${toDegrees(tipHalfAngle)} deg`,
    );
  }
  // Throws if the shock on the tip would detach.
  const shock = taylorMaccoll(mach, tipHalfAngle, gamma).shockAngle;
  const maxOuterAngle = (shock + Math.PI / 2) / 2;

  const R = body.nose.baseRadius;
  const xEnd = bodyLength(body);
  // The domain starts one body radius upstream of the tip, where the outer
  // boundary is half a radius above the axis.
  const xStart = -R;

  // Stretching towards the body along each vertical line of height h:
  // y = wall + h (e^(b eta) - 1) / (e^b - 1) for eta = j / nj, with
  // b = ln(1 + h / R), capped: close to uniform where the outer boundary is
  // near the body, graded where it is far. The cells next to the wall are
  // then e^b times flatter than those at the outer boundary; spacing the
  // columns at the geometric mean of the two gives both the same aspect
  // ratio, e^(b / 2), at most QUALITY_LIMITS.maxAspectRatio with the cap.
  const maxStrength = 2 * Math.log(QUALITY_LIMITS.maxAspectRatio);
  const acrossFor = (angle: number) => (x: number) => {
    const wall = bodyRadius(body, x);
    const h = 0.5 * R + (x - xStart) * Math.tan(angle) - wall;
    return { wall, h, b: Math.min(Math.log1p(h / R), maxStrength) };
  };

  // On the convex profiles served here the bow shock weakens downstream and
  // stays below the tip's conical shock line, x tan(shock). Base-grid cells
  // between that line and the outer boundary, fewest along the body:
  const cellsAboveShock = (angle: number) => {
    const across = acrossFor(angle);
    let fewest = Infinity;
    for (let k = 1; k <= 64; k++) {
      const x = (xEnd * k) / 64;
      const { wall, h, b } = across(x);
      const eta = Math.log1p((Math.expm1(b) * (x * Math.tan(shock) - wall)) / h) / b;
      fewest = Math.min(fewest, options.nj * (1 - eta));
    }
    return fewest;
  };
  let outerAngle = Math.min(OUTER_ANGLE_FACTOR * shock, maxOuterAngle);
  if (cellsAboveShock(outerAngle) < OUTER_CELLS_ABOVE_SHOCK) {
    if (cellsAboveShock(maxOuterAngle) < OUTER_CELLS_ABOVE_SHOCK) {
      throw new GridQualityError(
        `the outer boundary cannot keep the bow shock ${OUTER_CELLS_ABOVE_SHOCK} cells inside it; use more cells across`,
      );
    }
    // Smallest angle that keeps the margin, by bisection.
    let low = outerAngle;
    let high = maxOuterAngle;
    for (let k = 0; k < 50; k++) {
      const mid = (low + high) / 2;
      if (cellsAboveShock(mid) < OUTER_CELLS_ABOVE_SHOCK) low = mid;
      else high = mid;
    }
    outerAngle = high;
  }
  const across = acrossFor(outerAngle);
  const columnSpacing = (x: number) => {
    const { h, b } = across(x);
    return (h * b * Math.exp(b / 2)) / (Math.expm1(b) * nj);
  };
  const xs = columnPositions(
    [xStart, ...bodyBreakpoints(body)],
    (x) => 1 / columnSpacing(x),
    refinement,
  );
  const ni = xs.length - 1;
  const iTip = xs.indexOf(0);
  const grid = gridFromFunction(ni, nj, (i, j) => {
    const x = xs[i]!;
    const { wall, h, b } = across(x);
    return [x, wall + (h * Math.expm1((b * j) / nj)) / Math.expm1(b)];
  });
  const failures = qualityFailures(gridQuality(grid));
  if (failures.length > 0) {
    throw new GridQualityError(
      `the generated grid fails its quality checks: ${failures.join('; ')}`,
    );
  }
  return { grid, iTip, outerAngle };
}

function toDegrees(radians: number): string {
  return ((radians * 180) / Math.PI).toFixed(1);
}

/**
 * Node positions along x for a target density of nodes per unit length:
 * within each interval between breakpoints the cumulative density is
 * divided into a whole number of equal parts, so every breakpoint lies on
 * a node and the spacing varies smoothly.
 *
 * The count in each interval is rounded at the base resolution and then
 * multiplied by the refinement, and the density is tabulated at a
 * resolution set by the base grid; a refined grid therefore divides each
 * base interval into exactly `refinement` parts, reproducing every coarser
 * node of its family.
 */
function columnPositions(
  breakpoints: readonly number[],
  density: (x: number) => number,
  refinement: number,
): number[] {
  const xs = [breakpoints[0]!];
  for (let k = 1; k < breakpoints.length; k++) {
    const a = breakpoints[k - 1]!;
    const b = breakpoints[k]!;
    // Tabulate at least 64 samples per node of the base grid (estimated
    // from the density at the ends of the interval).
    const baseNodes = (((density(a) + density(b)) / 2) * (b - a)) / refinement;
    const samples = Math.max(2048, 64 * Math.ceil(baseNodes));
    // Cumulative density by the trapezoidal rule.
    const at = (n: number) => a + ((b - a) * n) / samples;
    const cumulative = [0];
    for (let n = 1; n <= samples; n++) {
      cumulative.push(
        cumulative[n - 1]! + 0.5 * (density(at(n - 1)) + density(at(n))) * (at(n) - at(n - 1)),
      );
    }
    const total = cumulative[samples]!;
    const count = refinement * Math.max(1, Math.round(total / refinement));
    let n = 0;
    for (let m = 1; m < count; m++) {
      const target = (total * m) / count;
      while (cumulative[n + 1]! < target) n++;
      const f = (target - cumulative[n]!) / (cumulative[n + 1]! - cumulative[n]!);
      xs.push(at(n) + f * (at(n + 1) - at(n)));
    }
    xs.push(b);
  }
  return xs;
}
