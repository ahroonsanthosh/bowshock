/**
 * Structured grids around axisymmetric bodies with blunt noses, whose
 * profile leaves the tip vertically and whose bow shock stands off ahead
 * of it (design: docs/design/0004-grids.md).
 *
 * Topology (C): grid lines of constant i are straight normals to the body,
 * so the cells meet the wall at right angles; they fan out from the nose
 * and are vertical along the cylinder. The lower boundary (jMin) is the
 * body from the tip to its end, the upper boundary (jMax) the outer
 * boundary, iMin the axis ahead of the tip (the stagnation streamline) and
 * iMax the outflow plane at the end of the body.
 *
 * The outer boundary is a circular arc ahead of the nose continued by a
 * straight line, placed by rules measured on solutions (see the constants
 * below). Nothing in the generator proves the bow shock lies inside it;
 * callers check that the cells along it are still at the free stream.
 */

import { validateBody, type Body } from '../geometry/body';
import { noseRadius, noseTipSlope } from '../geometry/nose';
import { QUALITY_LIMITS, gridQuality, qualityFailures } from './quality';
import { GridQualityError } from './body-grid';
import { columnPositions } from './spacing';
import { gridFromFunction, type StructuredGrid } from './structured';

export interface BluntGridOptions {
  /** Cells from the body to the outer boundary on the base grid of a family. */
  readonly nj: number;
  /** Refinement of the base grid: 1, 2, 4, ...; every coarser node is kept. Default 1. */
  readonly refinement?: number;
  readonly mach: number;
}

export interface BluntGrid {
  readonly grid: StructuredGrid;
  /** Distance of the outer boundary ahead of the tip, along the axis. */
  readonly outerStandoff: number;
  /** Angle of the straight part of the outer boundary to the axis, radians. */
  readonly outerAngle: number;
}

/**
 * Shock standoff of a sphere of radius `radius` at Mach number `mach`, the
 * correlation of F. S. Billig, "Shock-wave shapes around spherical- and
 * cylindrical-nosed bodies", J. Spacecraft Rockets 4 (1967) 822-823:
 * 0.143 exp(3.24 / M^2) times the radius. Used only to place the outer
 * boundary.
 */
export function billigStandoff(mach: number, radius: number): number {
  return 0.143 * Math.exp(3.24 / (mach * mach)) * radius;
}

/** Outer boundary ahead of the tip, in multiples of the Billig standoff. */
const OUTER_STANDOFF_FACTOR = 2;
/** Radius of the outer boundary's arc, in multiples of the nose's length scale. */
const OUTER_ARC_RADIUS = 2;
/** Noses blunter than a sphere of this many base radii are refused (near-flat faces). */
const MAX_NOSE_RADIUS = 10;
/**
 * Half-width of the window over which the grid lines average the body
 * normal, in multiples of the distance to the outer boundary.
 */
const SMOOTHING = 0.25;
/** Largest rate of change of that half-width along the body. */
const MAX_WIDTH_SLOPE = 0.5;
/** Samples of the half-width along the body. */
const WIDTH_SAMPLES = 1024;
/** Samples of the normal across that window. */
const WINDOW_SAMPLES = 64;
/** Samples of the nose profile for its arc length. */
const PROFILE_SAMPLES = 20000;

export function bluntBodyGrid(body: Body, options: BluntGridOptions): BluntGrid {
  validateBody(body);
  const { mach } = options;
  const refinement = options.refinement ?? 1;
  if (!(Number.isInteger(options.nj) && options.nj >= 4)) {
    throw new RangeError('a body grid needs at least 4 cells across');
  }
  if (!(Number.isInteger(Math.log2(refinement)) && refinement >= 1)) {
    throw new RangeError('the refinement must be 1, 2, 4, 8, ...');
  }
  if (!(mach > 1)) throw new RangeError('blunt-body grids are for supersonic free streams');
  const { nose } = body;
  if (Number.isFinite(noseTipSlope(nose))) {
    throw new RangeError('the nose is sharp: use the grid for sharp noses');
  }
  const L = nose.length;
  const R = nose.baseRadius;

  // The nose profile by arc length, sampled in u with x = L u^2, which
  // clusters samples at the tip where the profile is vertical.
  const profileX = (u: number) => L * u * u;
  const profileR = (u: number) => noseRadius(nose, profileX(u));
  const uOf = new Float64Array(PROFILE_SAMPLES + 1);
  const sOf = new Float64Array(PROFILE_SAMPLES + 1);
  for (let k = 1; k <= PROFILE_SAMPLES; k++) {
    const u0 = (k - 1) / PROFILE_SAMPLES;
    const u1 = k / PROFILE_SAMPLES;
    uOf[k] = u1;
    sOf[k] = sOf[k - 1]! + Math.hypot(profileX(u1) - profileX(u0), profileR(u1) - profileR(u0));
  }
  const sNose = sOf[PROFILE_SAMPLES]!;
  const sEnd = sNose + body.cylinderLength;
  const uAt = (s: number) => {
    let low = 0;
    let high = PROFILE_SAMPLES;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (sOf[mid]! <= s) low = mid;
      else high = mid;
    }
    const f = (s - sOf[low]!) / (sOf[high]! - sOf[low]!);
    return uOf[low]! + Math.min(Math.max(f, 0), 1) / PROFILE_SAMPLES;
  };

  // The body point at arc length s (exactly on the profile) and its outward
  // normal.
  const surface = (s: number) => {
    if (s >= sNose) {
      return { x: L + (s - sNose), y: R, nx: 0, ny: 1 };
    }
    const u = uAt(s);
    const x = profileX(u);
    const y = profileR(u);
    if (u === 0) return { x, y, nx: -1, ny: 0 };
    const e = 1e-7;
    const ua = Math.max(u - e, 0);
    const ub = Math.min(u + e, 1);
    const tx = profileX(ub) - profileX(ua);
    const ty = profileR(ub) - profileR(ua);
    const t = Math.hypot(tx, ty);
    return { x, y, nx: -ty / t, ny: tx / t };
  };
  // A nose meeting the cylinder at an angle would fan the normals out of a
  // corner, and the outflow plane would not be vertical.
  const shoulder = surface(sNose * (1 - 1e-9));
  if (!(Math.abs(shoulder.nx) < 1e-3)) {
    throw new RangeError(
      'blunt noses that do not meet the body tangentially are not supported yet',
    );
  }

  // Length scale of the nose: the radius of curvature at the tip, r^2 / 2x
  // in the limit, and at least the base radius.
  const xSmall = 1e-6 * L;
  const tipRadius = noseRadius(nose, xSmall) ** 2 / (2 * xSmall);
  if (!(tipRadius <= MAX_NOSE_RADIUS * R)) {
    throw new RangeError('noses that are nearly flat at the tip are not supported yet');
  }
  const scale = Math.max(tipRadius, R);

  // Outer boundary: an arc of radius OUTER_ARC_RADIUS times the nose's
  // length scale, OUTER_STANDOFF_FACTOR Billig standoffs ahead of the tip,
  // until its tangent reaches the outer angle; then a straight line at that
  // angle, halfway between the normal shock and the Mach angle (the
  // steepest outer boundary of the grids for sharp noses). The bow shock of
  // a blunt nose stays well above the Mach angle for many body radii: on a
  // hemisphere-cylinder at Mach 3 still 14 deg above it 8 radii behind the
  // tip. And it flattens away from the nose, so the arc is wider than the
  // nose (docs/design/0004-grids.md).
  const outerStandoff = OUTER_STANDOFF_FACTOR * billigStandoff(mach, scale);
  const outerAngle = (Math.PI / 2 + Math.asin(1 / mach)) / 2;
  const arcRadius = OUTER_ARC_RADIUS * scale;
  const centre = arcRadius - outerStandoff;
  const yJoin = arcRadius * Math.cos(outerAngle);
  const xJoin = centre - arcRadius * Math.sin(outerAngle);
  /** Axial position of the outer boundary at height y (increasing in y). */
  const outerX = (y: number) =>
    y <= yJoin
      ? centre - Math.sqrt(arcRadius * arcRadius - y * y)
      : xJoin + (y - yJoin) / Math.tan(outerAngle);

  /** Distance from the body point at s to the outer boundary along the direction (dx, dy). */
  const lengthAlong = (s: number, dx: number, dy: number) => {
    const p = surface(s);
    const outside = (d: number) => p.x + d * dx - outerX(p.y + d * dy) <= 0;
    if (outside(0)) {
      throw new RangeError('the body reaches the outer boundary; the nose is not supported yet');
    }
    let high = R;
    while (!outside(high)) high *= 2;
    let low = 0;
    for (let k = 0; k < 60; k++) {
      const mid = (low + high) / 2;
      if (outside(mid)) high = mid;
      else low = mid;
    }
    return high;
  };

  // Angle of the body normal to the upstream axis, 0 at the tip and pi / 2
  // on the cylinder; continued as an odd function ahead of the tip (the
  // mirror image of the body) and as pi / 2 beyond its end.
  const normalAngle = (s: number): number => {
    if (s < 0) return -normalAngle(-s);
    if (s >= sNose) return Math.PI / 2;
    const p = surface(s);
    return Math.atan2(p.ny, -p.nx);
  };
  // The grid lines follow the normal averaged over a window along the body
  // of half-width SMOOTHING times the distance to the outer boundary: where
  // the curvature jumps (the shoulder of a hemisphere-cylinder) or grows
  // without bound (a tip with r ~ x^n, n > 1/2), exact normals would fan
  // out abruptly and neighbouring outer cells would jump in size. The
  // window is symmetric about the tip, keeping the first line on the axis,
  // and closes at the end of the body, keeping the last one vertical.
  // Its half-width is tabulated and limited to change by at most
  // MAX_WIDTH_SLOPE per unit length, so both ends of the window only move
  // downstream: the average of the normal's angle, which increases along
  // a convex body, then increases too, and no two lines turn towards each
  // other.
  const widths = new Float64Array(WIDTH_SAMPLES + 1);
  const step = sEnd / WIDTH_SAMPLES;
  for (let k = 0; k <= WIDTH_SAMPLES; k++) {
    const p = surface(k * step);
    widths[k] = Math.min(SMOOTHING * lengthAlong(k * step, p.nx, p.ny), sEnd - k * step);
  }
  for (let k = 1; k <= WIDTH_SAMPLES; k++) {
    widths[k] = Math.min(widths[k]!, widths[k - 1]! + MAX_WIDTH_SLOPE * step);
  }
  for (let k = WIDTH_SAMPLES - 1; k >= 0; k--) {
    widths[k] = Math.min(widths[k]!, widths[k + 1]! + MAX_WIDTH_SLOPE * step);
  }
  const halfWidth = (s: number) => {
    const t = Math.min(Math.max(s / step, 0), WIDTH_SAMPLES);
    const k = Math.min(Math.floor(t), WIDTH_SAMPLES - 1);
    return widths[k]! + (t - k) * (widths[k + 1]! - widths[k]!);
  };
  /** Angle of the grid line from the body point at s, odd about the tip. */
  const lineAngle = (s: number): number => {
    // The window about the tip averages an odd function: exactly zero.
    if (s === 0) return 0;
    if (s < 0) return -lineAngle(-s);
    if (s >= sEnd) return Math.PI / 2;
    const w = halfWidth(s);
    let sum = 0;
    for (let k = 0; k < WINDOW_SAMPLES; k++) {
      sum += normalAngle(s - w + (2 * w * (k + 0.5)) / WINDOW_SAMPLES);
    }
    return sum / WINDOW_SAMPLES;
  };
  /** Rate at which the grid lines turn along the body. */
  const turnRate = (s: number) => {
    // Over a quarter of the window: the tabulated half-width has corners,
    // where a shorter difference would see the angle's slope jump.
    const e = Math.max(halfWidth(s) / 4, sEnd / PROFILE_SAMPLES);
    return (lineAngle(s + e) - lineAngle(s - e)) / (2 * e);
  };
  const line = (s: number) => {
    const angle = lineAngle(s);
    const dx = -Math.cos(angle);
    const dy = Math.sin(angle);
    return { dx, dy, h: lengthAlong(s, dx, dy) };
  };

  // Stretching towards the body along each line of length h, as on the
  // grids for sharp noses: eta = (e^(b xi) - 1) / (e^b - 1), with
  // b = ln(1 + h / R) capped by the aspect-ratio limit.
  const maxStrength = 2 * Math.log(QUALITY_LIMITS.maxAspectRatio);
  const strength = (h: number) => Math.min(Math.log1p(h / R), maxStrength);

  const nj = options.nj * refinement;
  // Spacing along the body: the cells next to the wall are as long as the
  // geometric mean of their height and of the height of the outer cells,
  // allowing for the lines spreading by 1 + h d(angle)/ds; both then have
  // about the same aspect ratio (on the cylinder, the rule of the
  // sharp-nose grids).
  const spacing = (s: number) => {
    const { h } = line(s);
    const b = strength(h);
    const wallHeight = (h * b) / (Math.expm1(b) * nj);
    return (wallHeight * Math.exp(b / 2)) / Math.sqrt(1 + turnRate(s) * h);
  };
  const breakpoints = body.cylinderLength > 0 ? [0, sNose, sEnd] : [0, sNose];
  const ss = columnPositions(breakpoints, (s) => 1 / spacing(s), refinement);
  const columns = ss.map((s) => {
    const p = surface(s);
    const l = line(s);
    return { x: p.x, y: p.y, ...l, b: strength(l.h) };
  });
  const grid = gridFromFunction(ss.length - 1, nj, (i, j) => {
    const c = columns[i]!;
    const d = (c.h * Math.expm1((c.b * j) / nj)) / Math.expm1(c.b);
    return [c.x + d * c.dx, c.y + d * c.dy];
  });
  const failures = qualityFailures(gridQuality(grid));
  if (failures.length > 0) {
    throw new GridQualityError(
      `the generated grid fails its quality checks: ${failures.join('; ')}`,
    );
  }
  return { grid, outerStandoff, outerAngle };
}
