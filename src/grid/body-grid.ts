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
 * the conical shock that the nose tip would carry (Taylor-Maccoll), so the
 * bow shock stays inside it while the cells follow the growing shock layer.
 * Blunt noses, whose profile leaves the tip vertically, need a different
 * topology and are refused, as is any grid that fails the quality checks
 * of quality.ts.
 */

import {
  bodyBreakpoints,
  bodyRadius,
  noseTipSlope,
  validateBody,
  type Body,
} from '../geometry/body';
import { taylorMaccoll } from '../validation/taylor-maccoll';
import { gridQuality, qualityFailures } from './quality';
import { gridFromFunction, type StructuredGrid } from './structured';

export interface BodyGridOptions {
  /**
   * Cells from the body to the outer boundary. The number of cells along
   * the body follows from it and the geometry, so that doubling nj refines
   * the whole grid systematically.
   */
  readonly nj: number;
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

/** Margin of the outer boundary over the tip's conical shock angle. */
const OUTER_ANGLE_FACTOR = 1.2;
/** Largest cell aspect ratio the stretching may produce (see QUALITY_LIMITS). */
const MAX_ASPECT_RATIO = 10;

export function bodyGrid(body: Body, options: BodyGridOptions): BodyGrid {
  validateBody(body);
  const { nj, mach, gamma } = options;
  if (!(Number.isInteger(nj) && nj >= 4)) {
    throw new RangeError('a body grid needs at least 4 cells across');
  }
  const tipSlope = noseTipSlope(body.nose);
  if (!Number.isFinite(tipSlope)) {
    throw new RangeError(
      'blunt noses (profile vertical at the tip) are not supported yet: they need a grid around the stagnation point',
    );
  }
  // Throws if the shock on the tip would detach.
  const shock = taylorMaccoll(mach, Math.atan(tipSlope), gamma).shockAngle;
  const outerAngle = Math.min(OUTER_ANGLE_FACTOR * shock, (shock + Math.PI / 2) / 2);

  const R = body.nose.baseRadius;
  // The domain starts one body radius upstream of the tip, where the outer
  // boundary is half a radius above the axis.
  const xStart = -R;
  const outer = (x: number) => 0.5 * R + (x - xStart) * Math.tan(outerAngle);

  // Stretching towards the body along each vertical line of height h:
  // y = wall + h (e^(b eta) - 1) / (e^b - 1) for eta = j / nj, with
  // b = ln(1 + h / R), capped: close to uniform where the outer boundary is
  // near the body, graded where it is far. The cells next to the wall are
  // then e^b times flatter than those at the outer boundary; spacing the
  // columns at the geometric mean of the two gives both the same aspect
  // ratio, e^(b / 2), at most 10 with the cap. Everything is a function of
  // the geometry and nj only, so doubling nj refines systematically.
  const height = (x: number) => outer(x) - bodyRadius(body, x);
  const strength = (h: number) => Math.min(Math.log1p(h / R), Math.log(MAX_ASPECT_RATIO ** 2));
  const columnSpacing = (x: number) => {
    const h = height(x);
    const b = strength(h);
    return (h * b * Math.exp(b / 2)) / (Math.expm1(b) * nj);
  };
  const xs = columnPositions([xStart, ...bodyBreakpoints(body)], (x) => 1 / columnSpacing(x));
  const ni = xs.length - 1;
  const iTip = xs.indexOf(0);
  const grid = gridFromFunction(ni, nj, (i, j) => {
    const x = xs[i]!;
    const wall = bodyRadius(body, x);
    const h = outer(x) - wall;
    const b = strength(h);
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

/**
 * Node positions along x for a target density of nodes per unit length:
 * within each interval between breakpoints the cumulative density is
 * divided into a whole number of equal parts, so every breakpoint lies on
 * a node and the spacing varies smoothly.
 */
function columnPositions(breakpoints: readonly number[], density: (x: number) => number): number[] {
  const SAMPLES = 2048;
  const xs = [breakpoints[0]!];
  for (let k = 1; k < breakpoints.length; k++) {
    const a = breakpoints[k - 1]!;
    const b = breakpoints[k]!;
    // Cumulative density by the trapezoidal rule.
    const at = (n: number) => a + ((b - a) * n) / SAMPLES;
    const cumulative = [0];
    for (let n = 1; n <= SAMPLES; n++) {
      cumulative.push(
        cumulative[n - 1]! + 0.5 * (density(at(n - 1)) + density(at(n))) * (at(n) - at(n - 1)),
      );
    }
    const total = cumulative[SAMPLES]!;
    const count = Math.max(1, Math.round(total));
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
