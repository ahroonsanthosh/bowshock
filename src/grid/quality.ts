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
  /** Largest size ratio of neighbouring cells along i and along j. */
  readonly maxSizeRatio: number;
  /** Largest ratio of a cell's longer to shorter mean side length. */
  readonly maxAspectRatio: number;
  /** Smallest cell area (planar); positive for a valid grid. */
  readonly minArea: number;
}

export const QUALITY_LIMITS = {
  minAngle: (30 * Math.PI) / 180,
  minWallAngle: (60 * Math.PI) / 180,
  maxSizeRatio: 1.3,
  maxAspectRatio: 10,
} as const;

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
export function qualityFailures(q: GridQuality): string[] {
  const deg = (r: number) => `${((r * 180) / Math.PI).toFixed(1)} deg`;
  const failures: string[] = [];
  if (!(q.minArea > 0)) failures.push('a cell has non-positive area');
  if (q.minAngle < QUALITY_LIMITS.minAngle) {
    failures.push(`cell angle ${deg(q.minAngle)} below 30 deg`);
  }
  if (q.minWallAngle < QUALITY_LIMITS.minWallAngle) {
    failures.push(`wall cell angle ${deg(q.minWallAngle)} below 60 deg`);
  }
  if (q.maxSizeRatio > QUALITY_LIMITS.maxSizeRatio) {
    failures.push(`neighbouring cells differ in size by ${q.maxSizeRatio.toFixed(2)} (limit 1.3)`);
  }
  if (q.maxAspectRatio > QUALITY_LIMITS.maxAspectRatio) {
    failures.push(`cell aspect ratio ${q.maxAspectRatio.toFixed(1)} above 10`);
  }
  return failures;
}
