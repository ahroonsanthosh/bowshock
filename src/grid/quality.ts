/**
 * Quality measures of a structured grid, and the limits generated grids
 * must meet (docs/design/0004-grids.md).
 */

import { nodeIndex, type StructuredGrid } from './structured';

export interface GridQuality {
  /** Smallest interior angle of any cell, radians. */
  readonly minAngle: number;
  /** Smallest interior angle of the cells along jMin (the wall), radians. */
  readonly minWallAngle: number;
  /**
   * Largest size ratio of neighbouring cells: of their widths along i and
   * of their heights along j.
   */
  readonly maxSizeRatio: number;
  /** Largest ratio of a cell's longer to shorter mean side length. */
  readonly maxAspectRatio: number;
  /** Smallest cell area (planar); positive for a valid grid. */
  readonly minArea: number;
}

export const QUALITY_LIMITS = {
  // Set by measurement on generated grids, whose skewed cells lie near the
  // steep outer boundary at low Mach numbers: on cone-cylinders at Mach 1.1
  // to 1.5, with angles down to 12.3 deg, the cone pressure matches
  // Taylor-Maccoll within 0.16% on the coarsest grids, 0.02% on the next.
  // It is not a general accuracy limit: through smooth gradients, uniformly
  // skewed cells of 12 deg drop the scheme to about first order (a
  // manufactured solution: 13 times the error of square cells on 128 cells;
  // 30 deg keeps order 1.84). Each result's error is measured on nested
  // grids regardless (docs/design/0005-solution-verification.md).
  minAngle: (12 * Math.PI) / 180,
  minWallAngle: (60 * Math.PI) / 180,
  maxSizeRatio: 1.3,
  maxAspectRatio: 10,
} as const;

export interface QualityLimits {
  readonly minAngle: number;
  readonly minWallAngle: number;
  readonly maxSizeRatio: number;
  readonly maxAspectRatio: number;
}

/**
 * The limits for the grids of the fitted bow shock, whose lines end on
 * the shock (docs/design/0006-shock-fitting.md, "The quality gates on
 * fitted grids"). Measured against exact or converged reference drags on
 * nj = 20, 40 and 80: a secant ogive at Mach 3 with wall cells at 53.4 to
 * 53.8 deg (a 36 deg tip) converges at order 1.93 and extrapolates within
 * 1.6e-6, its band containing its error; a parabolic nose at Mach 5 with
 * wall cells at 44.5 deg and aspect ratios of 16 to 17 is within 2.3e-6
 * of its reference on nj = 40 and 80, though not yet at a steady order.
 * Aspect ratios of 10.6 to 11.9 (long bodies, a slender nose at Mach 1.2)
 * converge as the families below 10 do. The wall angle is set between the
 * two families' angles, the aspect ratio just above the largest measured
 * at a steady order.
 */
export const FITTED_QUALITY_LIMITS: QualityLimits = {
  ...QUALITY_LIMITS,
  minWallAngle: (50 * Math.PI) / 180,
  maxAspectRatio: 12,
};

export function gridQuality(grid: StructuredGrid): GridQuality {
  const { ni, nj, x, y } = grid;
  const node = (i: number, j: number) => {
    const k = nodeIndex(grid, i, j);
    return [x[k]!, y[k]!] as const;
  };
  let minAngle = Math.PI;
  let minWallAngle = Math.PI;
  let minArea = Infinity;
  let maxAspectRatio = 1;
  const width = new Float64Array(ni * nj);
  const height = new Float64Array(ni * nj);
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      // Corners counter-clockwise: (i, j), (i+1, j), (i+1, j+1), (i, j+1).
      const corners = [node(i, j), node(i + 1, j), node(i + 1, j + 1), node(i, j + 1)];
      let area = 0;
      for (let k = 0; k < 4; k++) {
        const [ax, ay] = corners[k]!;
        const [bx, by] = corners[(k + 1) % 4]!;
        area += 0.5 * (ax * by - bx * ay);
        const [px, py] = corners[(k + 3) % 4]!;
        const angle = Math.acos(
          Math.max(
            -1,
            Math.min(
              1,
              ((bx - ax) * (px - ax) + (by - ay) * (py - ay)) /
                (Math.hypot(bx - ax, by - ay) * Math.hypot(px - ax, py - ay)),
            ),
          ),
        );
        minAngle = Math.min(minAngle, angle);
        if (j === 0) minWallAngle = Math.min(minWallAngle, angle);
      }
      minArea = Math.min(minArea, area);
      const side = (a: number, b: number) =>
        Math.hypot(corners[b]![0] - corners[a]![0], corners[b]![1] - corners[a]![1]);
      const w = 0.5 * (side(0, 1) + side(3, 2));
      const h = 0.5 * (side(0, 3) + side(1, 2));
      width[i + j * ni] = w;
      height[i + j * ni] = h;
      maxAspectRatio = Math.max(maxAspectRatio, w / h, h / w);
    }
  }
  let maxSizeRatio = 1;
  const ratio = (a: number, b: number) => Math.max(a / b, b / a);
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      const c = i + j * ni;
      if (i + 1 < ni) maxSizeRatio = Math.max(maxSizeRatio, ratio(width[c]!, width[c + 1]!));
      if (j + 1 < nj) maxSizeRatio = Math.max(maxSizeRatio, ratio(height[c]!, height[c + ni]!));
    }
  }
  return { minAngle, minWallAngle, maxSizeRatio, maxAspectRatio, minArea };
}

/** The limits a grid fails, as readable messages (empty if it passes). */
export function qualityFailures(q: GridQuality, limits: QualityLimits = QUALITY_LIMITS): string[] {
  const deg = (r: number) => `${((r * 180) / Math.PI).toFixed(1)} deg`;
  const failures: string[] = [];
  // Written as !(value within limit) so that NaN, from a degenerate cell,
  // fails rather than slipping through.
  if (!(q.minArea > 0)) failures.push('a cell has non-positive area');
  if (!(q.minAngle >= limits.minAngle)) {
    failures.push(`cell angle ${deg(q.minAngle)} below ${deg(limits.minAngle)}`);
  }
  if (!(q.minWallAngle >= limits.minWallAngle)) {
    failures.push(`wall cell angle ${deg(q.minWallAngle)} below ${deg(limits.minWallAngle)}`);
  }
  if (!(q.maxSizeRatio <= limits.maxSizeRatio)) {
    failures.push(
      `neighbouring cells differ in size by ${q.maxSizeRatio.toFixed(2)} (limit ${limits.maxSizeRatio})`,
    );
  }
  if (!(q.maxAspectRatio <= limits.maxAspectRatio)) {
    failures.push(
      `cell aspect ratio ${q.maxAspectRatio.toFixed(1)} above ${limits.maxAspectRatio}`,
    );
  }
  return failures;
}
