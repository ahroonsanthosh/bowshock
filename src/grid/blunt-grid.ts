/**
 * Structured grids around axisymmetric bodies with blunt noses, whose
 * profile leaves the tip vertically and whose bow shock stands off ahead
 * of it (design: docs/design/0004-grids.md).
 *
 * Topology (C): grid lines of constant i are straight lines from the body,
 * close to its normals where the normal varies slowly; they fan out from
 * the nose and are vertical along the cylinder. The lower boundary (jMin)
 * is the body from the tip to its end, the upper boundary (jMax) the outer
 * boundary, iMin the axis ahead of the tip (the stagnation streamline) and
 * iMax the outflow plane at the end of the body.
 *
 * The outer boundary is a circular arc ahead of the nose, at the scale of
 * the tip's blunt part, continued by a straight line, placed by rules
 * measured on solutions (see the constants below); or a curve the caller
 * gives, such as a captured bow shock pushed out by a margin. Nothing in
 * the generator proves the bow shock lies inside it; callers check that
 * the cells along it are still at the free stream, or fit the shock from a
 * captured start.
 */

import { boatTailAngle, bodyLength, validateBody, type Body } from '../geometry/body';
import { boatTailBaseSpacing } from './boat-tail-columns';
import { noseRadius, noseTipSlope } from '../geometry/nose';
import { QUALITY_LIMITS, gridQuality, qualityFailures, type QualityLimits } from './quality';
import { GridQualityError } from './body-grid';
import { columnPositions } from './spacing';
import { gridFromFunction, type StructuredGrid } from './structured';

export interface BluntGridOptions {
  /** Cells from the body to the outer boundary on the base grid of a family. */
  readonly nj: number;
  /** Refinement of the base grid: 1, 2, 4, ...; every coarser node is kept. Default 1. */
  readonly refinement?: number;
  readonly mach: number;
  /**
   * The outer boundary as a curve of points ordered outwards from the axis
   * (the first on it, ahead of the tip), followed by straight segments and
   * continued beyond the last point along the last segment, in place of the
   * generator's arc and line: for example the bow shock captured on a first
   * grid, pushed out by a margin (src/analysis/fitted-flow.ts).
   */
  readonly outerBoundary?: readonly { readonly x: number; readonly y: number }[] | undefined;
  /**
   * Apply the generated grids' quality gates (default true). Off where the
   * grid is not the one solved for the answer: the captured start of a
   * shock fit, and the lines of its finer grids, whose own grids are
   * gated once the shock has settled (FITTED_QUALITY_LIMITS).
   */
  readonly gated?: boolean;
  /** Overrides of the placement constants, for measurement only. */
  readonly tuning?: Partial<BluntGridTuning>;
  /**
   * On a body with a boat-tail: the axial position of the base asked for,
   * where the body solved goes on as the boat-tail's cone continued
   * (src/analysis/fitted-flow.ts). The base is then a grid line, and the
   * columns over the boat-tail follow src/grid/boat-tail-columns.ts.
   */
  readonly boatTailBase?: number;
}

/** A straight grid line from the body: its body point, direction and length. */
export interface GridLine {
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
  /** Distance along the line from the body to the outer boundary. */
  readonly h: number;
  /**
   * Fractions of the height at which the nodes lie, 0 to 1 (nj + 1 of
   * them), if fixed (see withFixedFractions); otherwise the stretching is
   * recomputed for each height.
   */
  readonly fractions?: readonly number[];
}

export interface BluntGrid {
  readonly grid: StructuredGrid;
  /** The lines of constant i, from iMin to iMax; for refitting the outer boundary. */
  readonly lines: readonly GridLine[];
  /** Distance of the outer boundary ahead of the tip, along the axis. */
  readonly outerStandoff: number;
  /** Angle of the straight part of the generator's outer boundary to the axis, radians. */
  readonly outerAngle: number;
  /** Length scale of the tip's blunt part: the x at which the profile crosses r = x. */
  readonly tipScale: number;
  /** Length scale that places the outer boundary ahead of the tip. */
  readonly scale: number;
  /**
   * Whether that scale lies below the base radius, or the tip is sharp:
   * the tip's blunt part is far smaller than the body (the Haack series,
   * the power series) or has no scale, and the boundary, at the tip's
   * scale ahead of the tip, is generous at the body scale. Never on
   * ellipsoids, which keep one scale.
   */
  readonly twoScale: boolean;
  /**
   * On a body with a boat-tail, the base grid's column width at the base,
   * along the body (boatTailBaseSpacing): its cone is continued past the
   * base by BOAT_TAIL_CONTINUATION_COLUMNS of these on the first grid of a
   * family.
   */
  readonly boatTailSpacing?: number;
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

export interface BluntGridTuning {
  /** Outer boundary ahead of the tip, in multiples of the Billig standoff. */
  readonly standoffFactor: number;
  /** Radius of the outer boundary's arc, in multiples of the nose's length scale. */
  readonly arcRadiusFactor: number;
  /**
   * The length scale of the outer boundary is at most this many times the
   * tip scale (the x at which the profile crosses r = x: the radius of a
   * sphere, 0.6 of the base radius on a 3:1 ellipsoid, and far below the
   * base radius on a Haack nose, whose r ~ x^(3/4) tip is a cusp).
   */
  readonly tipScaleFactor: number;
  /**
   * Half-width of the window over which the grid lines average the body
   * normal, in multiples of the distance to the outer boundary.
   */
  readonly smoothing: number;
  /**
   * Largest ratio of neighbouring cells the fan at a sharp tip is sized
   * for, below the size-ratio gate: the fan's angle decays by this factor
   * per wall cell.
   */
  readonly fanRatio: number;
  /** Largest rate of change of that half-width along the body. */
  readonly maxWidthSlope: number;
}

export const DEFAULT_TUNING: BluntGridTuning = {
  standoffFactor: 2,
  arcRadiusFactor: 2,
  tipScaleFactor: 2,
  smoothing: 0.25,
  fanRatio: 1.25,
  maxWidthSlope: 0.5,
};

/** Noses blunter than a sphere of this many base radii are refused (near-flat faces). */
const MAX_NOSE_RADIUS = 10;
/**
 * Largest angle at which a nose may meet the cylinder, radians: the lines
 * turn through it over the smoothing window, and the cells either side of
 * the window's edge differ in width by about 1 + 2 angle (measured below
 * the gate's 1.3 at 7 deg, a 3-caliber power-series nose of exponent 3/4).
 */
const MAX_SHOULDER_ANGLE = (15 * Math.PI) / 180;
/** Samples of the half-width along the body (clustered at the tip). */
const WIDTH_SAMPLES = 4096;
/** Samples of the half-width along the body at equal steps (ellipsoids). */
const UNIFORM_WIDTH_SAMPLES = 1024;
/** Samples of the density of lines along the body (clustered at the tip). */
const SPACING_SAMPLES = 8192;
/** Samples of the normal across that window. */
const WINDOW_SAMPLES = 64;
/** Samples of the nose profile for its arc length. */
const PROFILE_SAMPLES = 20000;

export function bluntBodyGrid(body: Body, options: BluntGridOptions): BluntGrid {
  validateBody(body);
  const { mach } = options;
  const refinement = options.refinement ?? 1;
  const tuning = { ...DEFAULT_TUNING, ...options.tuning };
  if (!(Number.isInteger(options.nj) && options.nj >= 4)) {
    throw new RangeError('a body grid needs at least 4 cells across');
  }
  if (!(Number.isInteger(Math.log2(refinement)) && refinement >= 1)) {
    throw new RangeError('the refinement must be 1, 2, 4, 8, ...');
  }
  if (!(mach > 1)) throw new RangeError('blunt-body grids are for supersonic free streams');
  const { nose } = body;
  // A sharp tip is served too, for the Mach numbers at which its bow
  // shock detaches: the limit of a two-scale nose, whose normal turns at
  // the tip instead of over the length of a blunt part.
  const sharp = Number.isFinite(noseTipSlope(nose));
  // Ellipsoid noses keep the grids their families were measured on in
  // docs/design/0006-shock-fitting.md, which the page serves: one length
  // scale, the window's half-width tabulated at equal steps, the density
  // of lines evaluated exactly and the spacing's slope limited. The other
  // noses take the two-scale grid of docs/design/0004-grids.md.
  const ellipsoid = nose.shape.kind === 'ellipsoid';
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
  // A boat-tail: its cone from the shoulder at sShoulder, with lines kept
  // vertical over it (as along the cylinder), to the base asked for at
  // sBase and the end of the body solved at sEnd.
  const tail = body.boatTail;
  const cosTail = Math.cos(boatTailAngle(body));
  const sinTail = Math.sin(boatTailAngle(body));
  const sShoulder = sNose + body.cylinderLength;
  const xShoulder = L + body.cylinderLength;
  const sEnd = tail ? sShoulder + tail.length / cosTail : sNose + body.cylinderLength;
  const sBase = tail
    ? sShoulder + ((options.boatTailBase ?? bodyLength(body)) - xShoulder) / cosTail
    : sEnd;
  if (tail && !(sBase > sShoulder && sBase <= sEnd * (1 + 1e-12))) {
    throw new RangeError('the base asked for must lie on the boat-tail');
  }
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
    if (tail && s > sShoulder) {
      const d = s - sShoulder;
      return { x: xShoulder + d * cosTail, y: R - d * sinTail, nx: 0, ny: 1 };
    }
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
  // A nose meeting the cylinder at an angle (the power series) fans the
  // normals out of a corner; the window below averages the jump in the
  // normal as it averages jumps in the curvature, so the lines turn through
  // it over the window's width, which the size-ratio gate allows up to
  // MAX_SHOULDER_ANGLE. The last line is vertical whatever the corner.
  const shoulder = surface(sNose * (1 - 1e-9));
  const shoulderAngle = Math.atan2(-shoulder.nx, shoulder.ny);
  if (!(shoulderAngle <= MAX_SHOULDER_ANGLE)) {
    throw new RangeError(
      `blunt noses meeting the body at more than ${((MAX_SHOULDER_ANGLE * 180) / Math.PI).toFixed(0)} deg are not supported yet, got ${((shoulderAngle * 180) / Math.PI).toFixed(1)} deg`,
    );
  }

  // Length scales of the nose. The radius of curvature at the tip, r^2 / 2x
  // in the limit, sizes a rounded tip; the tip scale, the x at which the
  // profile crosses the line r = x from the tip (the radius of a sphere),
  // sizes the blunt part of a tip whose curvature is unbounded, such as
  // the Haack series' (r ~ x^(3/4) there, its blunt part 1.4e-3 of the
  // diameter on a 5-caliber nose). The outer boundary is placed at the
  // larger of the tip radius and the smaller of the base radius and a few
  // tip scales: the tip scale where it is far smaller than the body. On
  // ellipsoids it is the larger of the tip radius and the base radius.
  const xSmall = 1e-6 * L;
  const tipRadius = noseRadius(nose, xSmall) ** 2 / (2 * xSmall);
  if (!(tipRadius <= MAX_NOSE_RADIUS * R)) {
    throw new RangeError('noses that are nearly flat at the tip are not supported yet');
  }
  const tipScale = (() => {
    if (sharp) return 0;
    if (noseRadius(nose, L) > L) return L;
    let low = 0;
    let high = L;
    for (let k = 0; k < 200; k++) {
      const mid = 0.5 * (low + high);
      if (noseRadius(nose, mid) > mid) low = mid;
      else high = mid;
    }
    return 0.5 * (low + high);
  })();
  // A sharp tip has no blunt part: its detached shock stands off at a
  // distance set by the body and the Mach number, which the captured
  // start measures, so the generator's own boundary is at the body scale.
  // Ellipsoids keep the base radius as the scale whatever their length,
  // as their families were measured (docs/design/0006-shock-fitting.md):
  // one scale, the generator's grid the family's.
  const scale = ellipsoid
    ? Math.max(tipRadius, R)
    : sharp
      ? R
      : Math.max(tipRadius, Math.min(R, tuning.tipScaleFactor * tipScale));

  // Outer boundary: an arc of arcRadiusFactor times the length scale,
  // standoffFactor Billig standoffs ahead of the tip, until its tangent
  // reaches the outer angle; then a straight line at that angle, halfway
  // between the normal shock and the Mach angle (the steepest outer
  // boundary of the grids for sharp noses). The bow shock of a blunt nose
  // stays well above the Mach angle for many body radii: on a
  // hemisphere-cylinder at Mach 3 still 14 deg above it 8 radii behind the
  // tip. And it flattens away from the nose, so the arc is wider than the
  // nose's blunt part (docs/design/0004-grids.md). On a two-scale nose this
  // boundary is generous at the body scale (on a 3-caliber Haack nose at
  // Mach 2 the first captured shock lies at 0.40 to 0.54 of the height
  // past the first percent of the nose),
  // so the fitted solver uses it only for a first captured solution and
  // passes the shock it finds back as `outerBoundary`.
  const outerAngle = (Math.PI / 2 + Math.asin(1 / mach)) / 2;
  const arcRadius = tuning.arcRadiusFactor * scale;
  const custom = options.outerBoundary;
  const outerStandoff = custom
    ? -custom[0]!.x
    : tuning.standoffFactor * billigStandoff(mach, scale);
  const centre = arcRadius - outerStandoff;
  const yJoin = arcRadius * Math.cos(outerAngle);
  const xJoin = centre - arcRadius * Math.sin(outerAngle);
  if (custom) {
    if (custom.length < 2 || custom[0]!.y !== 0) {
      throw new RangeError('the outer boundary needs at least two points, the first on the axis');
    }
    for (let k = 1; k < custom.length; k++) {
      if (!(custom[k]!.y > custom[k - 1]!.y)) {
        throw new RangeError('the outer boundary must be ordered outwards from the axis');
      }
    }
  }
  /** Axial position of the outer boundary at height y (increasing in y). */
  const outerX = (y: number): number => {
    if (!custom) {
      return y <= yJoin
        ? centre - Math.sqrt(arcRadius * arcRadius - y * y)
        : xJoin + (y - yJoin) / Math.tan(outerAngle);
    }
    let low = 0;
    let high = custom.length - 1;
    if (y >= custom[high]!.y) low = high - 1;
    else {
      while (high - low > 1) {
        const mid = (low + high) >> 1;
        if (custom[mid]!.y <= y) low = mid;
        else high = mid;
      }
    }
    const a = custom[low]!;
    const b = custom[low + 1]!;
    return a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x);
  };

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

  // The window's half-width at sample points s along the body, limited to
  // change by at most maxWidthSlope per unit length.
  const widthAt = (s: number) => {
    const p = surface(s);
    return Math.min(tuning.smoothing * lengthAlong(s, p.nx, p.ny), sEnd - s);
  };
  /**
   * The half-width tabulated at UNIFORM_WIDTH_SAMPLES equal steps along
   * the body: the ellipsoids' grids, as their families were measured
   * (docs/design/0006-shock-fitting.md).
   */
  const uniformHalfWidth = () => {
    const widths = new Float64Array(UNIFORM_WIDTH_SAMPLES + 1);
    const step = sEnd / UNIFORM_WIDTH_SAMPLES;
    for (let k = 0; k <= UNIFORM_WIDTH_SAMPLES; k++) widths[k] = widthAt(k * step);
    for (let k = 1; k <= UNIFORM_WIDTH_SAMPLES; k++) {
      widths[k] = Math.min(widths[k]!, widths[k - 1]! + tuning.maxWidthSlope * step);
    }
    for (let k = UNIFORM_WIDTH_SAMPLES - 1; k >= 0; k--) {
      widths[k] = Math.min(widths[k]!, widths[k + 1]! + tuning.maxWidthSlope * step);
    }
    return (s: number) => {
      const t = Math.min(Math.max(s / step, 0), UNIFORM_WIDTH_SAMPLES);
      const k = Math.min(Math.floor(t), UNIFORM_WIDTH_SAMPLES - 1);
      return widths[k]! + (t - k) * (widths[k + 1]! - widths[k]!);
    };
  };
  /**
   * The half-width tabulated at WIDTH_SAMPLES points clustered at the tip
   * (s proportional to the square of the index), where the layer of a
   * two-scale nose is thin and the window with it.
   */
  const clusteredHalfWidth = () => {
    const widthS = new Float64Array(WIDTH_SAMPLES + 1);
    const widths = new Float64Array(WIDTH_SAMPLES + 1);
    for (let k = 0; k <= WIDTH_SAMPLES; k++) {
      widthS[k] = (sEnd * k * k) / (WIDTH_SAMPLES * WIDTH_SAMPLES);
      widths[k] = widthAt(widthS[k]!);
    }
    for (let k = 1; k <= WIDTH_SAMPLES; k++) {
      widths[k] = Math.min(
        widths[k]!,
        widths[k - 1]! + tuning.maxWidthSlope * (widthS[k]! - widthS[k - 1]!),
      );
    }
    for (let k = WIDTH_SAMPLES - 1; k >= 0; k--) {
      widths[k] = Math.min(
        widths[k]!,
        widths[k + 1]! + tuning.maxWidthSlope * (widthS[k + 1]! - widthS[k]!),
      );
    }
    return (s: number) => {
      const t = Math.min(
        Math.max(Math.sqrt(Math.max(s, 0) / sEnd) * WIDTH_SAMPLES, 0),
        WIDTH_SAMPLES,
      );
      const k = Math.min(Math.floor(t), WIDTH_SAMPLES - 1);
      const f = (Math.min(Math.max(s, 0), sEnd) - widthS[k]!) / (widthS[k + 1]! - widthS[k]!);
      return widths[k]! + Math.min(Math.max(f, 0), 1) * (widths[k + 1]! - widths[k]!);
    };
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
  // of half-width `smoothing` times the distance to the outer boundary:
  // where the curvature jumps (the shoulder of a hemisphere-cylinder) or
  // grows without bound (a tip with r ~ x^n, n > 1/2), exact normals would
  // fan out abruptly and neighbouring outer cells would jump in size. The
  // window is symmetric about the tip, keeping the first line on the axis,
  // and closes at the end of the body, keeping the last one vertical. Its
  // half-width is tabulated (clustered at the tip, where the layer is thin
  // and the window with it) and limited to change by at most
  // `maxWidthSlope` per unit length, so both ends of the window only move
  // downstream: the average of the normal's angle, which increases along
  // a convex body, then increases too, and no two lines turn towards each
  // other. Near a cusp-like tip the window turns the lines into a fan
  // (their angle rising linearly with s, at a rate of a few per layer
  // height), which keeps the outer cells of equal width, at the price of
  // wall angles below the right angle over the first few cells.
  const halfWidth = ellipsoid ? uniformHalfWidth() : clusteredHalfWidth();
  // At a sharp tip the normal jumps by tipJump, from the axis to the
  // tip's normal. The window would spread the jump into a fan linear in
  // s over its width, and end it abruptly where it stops straddling the
  // tip, where the outer cells then jump in width (by 1.9 to 2.5 on the
  // tips measured). The jump is taken out of the normal before the
  // window averages it, and the lines fan through it as
  // tipJump (1 - exp(-s / fanScale)): their angle decays geometrically,
  // by fanRatio per wall cell at the tip, as the size-ratio gate allows,
  // and most of it is in the first cell (0.22 of the jump at 1.25, the
  // most any fan within the gate can give), which meets the wall at
  // 90 deg less the rest: on a 37 deg tip 48 deg, on a 45 deg tip 55 deg.
  // The wall cells at the tip are the geometric mean of the cell heights
  // along the line and across the fan (the spacing rule below), so the
  // scale that gives that decay solves fanScale = c h / (nj sqrt(1 + K))
  // with K = tipJump h / fanScale and c = 1 / ln(fanRatio).
  const tipJump = sharp ? normalAngle(sNose * 1e-9) : 0;
  const fanScale = (() => {
    if (!sharp) return Infinity;
    const h = lengthAlong(0, -1, 0);
    const c = 1 / Math.log(tuning.fanRatio) / options.nj;
    return (h * (-tipJump + Math.sqrt(tipJump * tipJump + 4 * c * c))) / 2;
  })();
  const fan = (s: number) => tipJump * -Math.expm1(-s / fanScale);
  /** Angle of the grid line from the body point at s, odd about the tip. */
  const lineAngle = (s: number): number => {
    // The window about the tip averages an odd function: exactly zero.
    if (s === 0) return 0;
    if (s < 0) return -lineAngle(-s);
    if (s >= sEnd) return Math.PI / 2;
    const w = halfWidth(s);
    let sum = 0;
    for (let k = 0; k < WINDOW_SAMPLES; k++) {
      const t = s - w + (2 * w * (k + 0.5)) / WINDOW_SAMPLES;
      sum += normalAngle(t) - Math.sign(t) * tipJump;
    }
    return sum / WINDOW_SAMPLES + fan(s);
  };
  /** Rate at which the grid lines turn along the body. */
  const turnRate = (s: number) => {
    // Over a quarter of the window: the tabulated half-width has corners,
    // where a shorter difference would see the angle's slope jump.
    // ... and within the fan at a sharp tip, over a quarter of its scale.
    const e = Math.max(
      Math.min(halfWidth(s) / 4, Math.max(fanScale / 4, s / 8)),
      sEnd / PROFILE_SAMPLES,
    );
    return (lineAngle(s + e) - lineAngle(s - e)) / (2 * e);
  };
  const line = (s: number) => {
    const angle = lineAngle(s);
    const dx = -Math.cos(angle);
    const dy = Math.sin(angle);
    return { dx, dy, h: lengthAlong(s, dx, dy) };
  };

  const strength = (h: number) => lineStrength(h, R);

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
  // The density of lines, 1 / spacing, tabulated (clustered at the tip
  // like the window's half-width): the column positions sample it at
  // sixty-four points per line of the base grid, estimated from the ends,
  // where the dense tip of a two-scale nose makes that millions of
  // evaluations of the window average.
  const tabulatedDensity = () => {
    const densityS = new Float64Array(SPACING_SAMPLES + 1);
    const densities = new Float64Array(SPACING_SAMPLES + 1);
    for (let k = 0; k <= SPACING_SAMPLES; k++) {
      densityS[k] = (sEnd * k * k) / (SPACING_SAMPLES * SPACING_SAMPLES);
      densities[k] = 1 / spacing(densityS[k]!);
    }
    return (s: number) => {
      const t = Math.min(
        Math.max(Math.sqrt(Math.max(s, 0) / sEnd) * SPACING_SAMPLES, 0),
        SPACING_SAMPLES,
      );
      const k = Math.min(Math.floor(t), SPACING_SAMPLES - 1);
      const f = (Math.min(Math.max(s, 0), sEnd) - densityS[k]!) / (densityS[k + 1]! - densityS[k]!);
      return densities[k]! + Math.min(Math.max(f, 0), 1) * (densities[k + 1]! - densities[k]!);
    };
  };
  // Over a boat-tail the columns of src/grid/boat-tail-columns.ts, along
  // the body's arc length, the outer cells those of the generator's lines;
  // past the base the base's width.
  const boatTail = tail
    ? boatTailBaseSpacing({
        length: sBase - sShoulder,
        radius: R,
        shoulder: sShoulder,
        base: sBase,
        baseNj: options.nj,
        outerHeight: (t) => outerCellHeight(line(t).h, options.nj, R),
      })
    : undefined;
  const withBoatTail = (usual: (s: number) => number) =>
    boatTail
      ? (s: number) =>
          s < sNose
            ? usual(s)
            : s < sBase
              ? Math.max(usual(s), refinement / boatTail(s))
              : refinement / boatTail(sBase)
      : usual;
  const breakpoints = tail
    ? [
        0,
        sNose,
        ...(body.cylinderLength > 0 ? [sShoulder] : []),
        sBase,
        ...(sEnd > sBase * (1 + 1e-12) ? [sEnd] : []),
      ]
    : body.cylinderLength > 0
      ? [0, sNose, sEnd]
      : [0, sNose];
  // On ellipsoids the spacing's slope is limited (src/grid/spacing.ts):
  // where the lines stop turning, at the shoulder at low Mach numbers, it
  // would otherwise grow by up to 1.9 times from one cell to the next. The
  // other noses take the density as tabulated, without the limit: their
  // families were measured so (0006), on grids built on the captured
  // shock, which the fitted grids' gates check.
  const ss = ellipsoid
    ? columnPositions(
        breakpoints,
        withBoatTail((s) => 1 / spacing(s)),
        refinement,
        {
          maxSpacingSlope: 0.15,
        },
      )
    : columnPositions(breakpoints, withBoatTail(tabulatedDensity()), refinement);
  const lines = ss.map((s) => {
    const p = surface(s);
    return { x: p.x, y: p.y, ...line(s) };
  });
  const grid = gridOnLines(
    lines,
    lines.map((l) => l.h),
    nj,
    R,
    options.gated ?? true,
  );
  return {
    grid,
    lines,
    outerStandoff,
    outerAngle,
    tipScale,
    scale,
    twoScale: sharp || scale < R,
    ...(boatTail ? { boatTailSpacing: boatTail(sBase) } : {}),
  };
}

/**
 * Stretching towards the body along a line of length h, as on the grids
 * for sharp noses: eta = (e^(b xi) - 1) / (e^b - 1), with b = ln(1 + h / R)
 * capped by the aspect-ratio limit (R the body radius).
 */
function lineStrength(h: number, radius: number): number {
  return Math.min(Math.log1p(h / radius), 2 * Math.log(QUALITY_LIMITS.maxAspectRatio));
}

/** Fraction of the height of node j of nj along a line of stretching strength b. */
function stretchedFraction(b: number, j: number, nj: number): number {
  return Math.expm1((b * j) / nj) / Math.expm1(b);
}

/** Height of the outermost of nj cells along a line of height h, with the stretching of the generator. */
export function outerCellHeight(h: number, nj: number, baseRadius: number): number {
  return h * (1 - stretchedFraction(lineStrength(h, baseRadius), nj - 1, nj));
}

/**
 * The lines with their node fractions fixed at those of their current
 * heights: as the outer boundary moves, each node keeps its fraction of
 * the line's height. A fitted shock moves the boundary in small steps;
 * with fixed fractions every metric difference splits into differences
 * fixed once and small changes of height (docs/design/0006-shock-fitting.md).
 */
export function withFixedFractions(
  lines: readonly GridLine[],
  nj: number,
  baseRadius: number,
): GridLine[] {
  return lines.map((l) => {
    const b = lineStrength(l.h, baseRadius);
    return {
      ...l,
      fractions: Array.from({ length: nj + 1 }, (_, j) => stretchedFraction(b, j, nj)),
    };
  });
}

/**
 * The grid of nj cells across on the given lines, each cut at its own
 * height (the distance to the outer boundary): the nodes of the C grid for
 * a given outer boundary, such as a fitted shock. Refused if it fails the
 * quality gates.
 */
export function gridOnLines(
  lines: readonly GridLine[],
  heights: readonly number[],
  nj: number,
  baseRadius: number,
  /** Apply the quality gates (off for the intermediate grids of a shock fit). */
  gated = true,
): StructuredGrid {
  if (heights.length !== lines.length) throw new RangeError('one height per line is needed');
  const grid = gridFromFunction(lines.length - 1, nj, (i, j) => {
    const l = lines[i]!;
    const h = heights[i]!;
    const d = h * (l.fractions?.[j] ?? stretchedFraction(lineStrength(h, baseRadius), j, nj));
    return [l.x + d * l.dx, l.y + d * l.dy];
  });
  if (gated) assertGridQuality(grid);
  return grid;
}

/** Throws a GridQualityError naming the quality gates the grid fails, if any. */
export function assertGridQuality(
  grid: StructuredGrid,
  limits: QualityLimits = QUALITY_LIMITS,
): void {
  const failures = qualityFailures(gridQuality(grid), limits);
  if (failures.length > 0) {
    throw new GridQualityError(
      `the generated grid fails its quality checks: ${failures.join('; ')}`,
    );
  }
}
