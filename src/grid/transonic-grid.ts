/**
 * Grids for transonic flow (Mach 1 to about 1.2) around a sharp nose
 * followed by a long cylinder, the cylinder standing for a wind-tunnel
 * sting: the domain reaches far upstream, sideways and downstream, since
 * the bow shock stands far ahead of the nose (at Mach 1 at infinity) and
 * the flow over the body is partly subsonic (design:
 * docs/design/0013-transonic.md).
 *
 * Topology, sharp noses (H, as body-grid.ts): grid lines of constant i
 * are vertical; jMin is the axis ahead of the tip and the body behind it,
 * jMax a far boundary at a constant radius, iMin a far boundary upstream
 * and iMax the plane ending the cylinder downstream. The tip and the
 * shoulder lie on grid lines.
 *
 * Topology, blunt noses (C, as blunt-grid.ts): grid lines of constant i
 * leave the body along its normal, fanning out from the nose; jMin is the
 * body from the stagnation point to the end of the cylinder, iMin the axis
 * ahead of the stagnation point, jMax one far boundary, a quarter circle
 * about the stagnation point continued by a line at the far radius, and
 * iMax the plane ending the cylinder.
 *
 * Spacing (TRANSONIC_SPACING): cells grow geometrically away from the
 * body, by e^growth per cell on the base grid (e^(growth / refinement) on
 * its refinements), from the wall spacing at the wall and from the tip
 * and the shoulder along the axis, so that the far boundaries cost few
 * cells; along the nose the columns are at most `nose` apart. Away from
 * the body the lines lean so that the cells there are not hundreds of
 * times taller than wide; next to the axis far upstream they stay flat
 * (aspect ratios up to about 350), in a flow close to the free stream, so
 * the aspect-ratio gate of the near-body grids is not applied. The
 * spacing depends only on the geometry and the base grid, and a refined
 * grid divides every base cell into refinement x refinement cells, so the
 * grids of a family nest.
 */

import { bodyRadius, validateBody, type Body } from '../geometry/body';
import { noseRadius, noseTipSlope } from '../geometry/nose';
import { columnPositions } from './spacing';
import { gridFromFunction, type StructuredGrid } from './structured';

export interface TransonicGridOptions {
  /** Refinement of the base grid: 1, 2, 4, ... */
  readonly refinement: number;
  /**
   * Distance of the far boundaries from the axis (jMax) and from the tip
   * (iMin), in body radii, at least; rounded up to a whole number of
   * base cells across.
   */
  readonly farField: number;
  /** Length of the cylinder solved behind the nose, in calibers (body diameters). */
  readonly cylinder: number;
  /** The base grid's spacings (default TRANSONIC_SPACING), for studies of the grid itself. */
  readonly spacing?: Partial<TransonicSpacing>;
}

/** The base grid's spacings, in body radii. */
export interface TransonicSpacing {
  /** Height of the cells at the wall. */
  readonly wall: number;
  /** Growth of the cell size per cell away from the body and along the axis: e^growth. */
  readonly growth: number;
  /** Column spacing at the tip. */
  readonly tip: number;
  /** Column spacing at the shoulder (the end of the nose). */
  readonly shoulder: number;
  /** Largest column spacing along the nose. */
  readonly nose: number;
  /** Growth of the column spacing along the nose, from the tip and the shoulder. */
  readonly noseGrowth: number;
}

export interface TransonicGrid {
  readonly grid: StructuredGrid;
  /** Grid index i of the nose tip (the stagnation point) and of the shoulder (the end of the nose). */
  readonly iTip: number;
  readonly iShoulder: number;
  /** Radius of the far boundary (jMax) and position of the upstream one (iMin). */
  readonly farRadius: number;
  readonly xUpstream: number;
  /** Position of the plane ending the cylinder (iMax). */
  readonly xEnd: number;
  /** Cells across on the base grid. */
  readonly baseNj: number;
  /**
   * H for sharp noses (jMin the axis ahead of the tip and the body, iMin
   * a far boundary upstream), C for blunt ones (jMin the body, iMin the
   * axis ahead of the stagnation point); see the module comment.
   */
  readonly topology: 'H' | 'C';
}

/**
 * The base grid's spacings. At a cone's shoulder, where the flow turns
 * sonic around a corner, the columns are closer than at the tip: on a
 * 7 deg cone at Mach 1.05 a shoulder spacing of 0.02 instead of 0.05 body
 * radii moved the drag on the base grid by 1.7e-3 of its value, all of it
 * from the last tenth of the cone, while the same change at the tip moved
 * nothing there (the tip's overshoot is set by the wall spacing, the
 * cone being thinner than a wall cell over its first few columns).
 */
export const TRANSONIC_SPACING: TransonicSpacing = {
  wall: 0.05,
  growth: 0.2,
  tip: 0.05,
  shoulder: 0.02,
  nose: 0.2,
  noseGrowth: 0.1,
};

export function transonicGrid(body: Body, options: TransonicGridOptions): TransonicGrid {
  validateBody(body);
  const refinement = options.refinement;
  if (!(Number.isInteger(Math.log2(refinement)) && refinement >= 1)) {
    throw new RangeError('the refinement must be 1, 2, 4, 8, ...');
  }
  const blunt = !Number.isFinite(noseTipSlope(body.nose));
  const R = body.nose.baseRadius;
  const L = body.nose.length;
  if (!(options.cylinder > 0)) throw new RangeError('the transonic domain needs a cylinder');
  if (!(options.farField * R > 4 * Math.max(R, L))) {
    throw new RangeError('the far boundaries must lie beyond four nose lengths');
  }
  const s = { ...TRANSONIC_SPACING, ...options.spacing };
  const wall = s.wall * R;
  const growth = s.growth;
  // Cells across on the base grid: geometric growth from the wall spacing
  // reaches the far radius in this many cells.
  const baseNj = Math.ceil(Math.log1p((growth * options.farField * R) / wall) / growth - 1e-9);
  const farRadius = (wall / growth) * Math.expm1(growth * baseNj);
  const xUpstream = -farRadius;
  const xEnd = L + 2 * R * options.cylinder;
  const nj = baseNj * refinement;
  if (blunt) {
    const blunt = bluntGrid(body, s, refinement, baseNj, farRadius, xEnd);
    return { ...blunt, farRadius, xUpstream, xEnd, baseNj };
  }

  // Column spacing along x: from the tip and the shoulder, growing
  // geometrically (spacing a + growth * distance gives a size ratio of
  // e^growth between neighbouring base cells), at most s.nose along the
  // nose.
  const tipSpacing = s.tip * R;
  const shoulderSpacing = s.shoulder * R;
  const spacing = (x: number) => {
    if (x <= 0) return tipSpacing + growth * -x;
    if (x >= L) return shoulderSpacing + growth * (x - L);
    return Math.min(
      tipSpacing + s.noseGrowth * x,
      shoulderSpacing + s.noseGrowth * (L - x),
      s.nose * R,
    );
  };
  const xs = columnPositions([xUpstream, 0, L, xEnd], (x) => refinement / spacing(x), refinement);
  const iTip = xs.indexOf(0);
  const iShoulder = xs.indexOf(L);

  // Across: on each line, from the wall at radius r_w to the far radius H,
  // f = (e^(b eta) - 1) / (e^b - 1) of the way, eta = j / nj, with
  // b = growth * baseNj: the first base cell is s.wall high on the axis
  // (slightly less on the body), and each next one e^growth higher.
  // Near the body the lines are vertical; further out they lean, by f^2
  // of the way, to points spaced evenly along the far boundary, so that
  // far from the body the cells are not much taller than wide (the
  // columns are dense along the body only).
  const b = growth * baseNj;
  const ni = xs.length - 1;
  const grid = gridFromFunction(ni, nj, (i, j) => {
    const x = xs[i]!;
    const r = bodyRadius(body, x);
    const f = Math.expm1((b * j) / nj) / Math.expm1(b);
    const xFar = xUpstream + ((xEnd - xUpstream) * i) / ni;
    return [x + (xFar - x) * f * f, r + (farRadius - r) * f];
  });
  return { grid, iTip, iShoulder, farRadius, xUpstream, xEnd, baseNj, topology: 'H' };
}

/** Samples of a blunt nose's profile for its arc length. */
const PROFILE_SAMPLES = 20000;
/**
 * Half-width of the window over which a C grid's line averages the body
 * normal, in multiples of the distance from the wall (as blunt-grid.ts).
 */
const SMOOTHING = 0.25;
/** Largest rate at which that half-width shrinks towards the end of the body. */
const MAX_WIDTH_SLOPE = 0.5;
/** Samples of the normal across that window. */
const WINDOW_SAMPLES = 64;

/**
 * The C grid of a blunt nose (see the module comment), on the spacings of
 * the sharp noses' grid: along the body by arc length (s.tip at the
 * stagnation point), across by the same geometric growth to the far
 * boundary. Each line leaves its body point P along the body normal n and
 * bends towards its point Q on the far boundary, the points Q evenly
 * spaced along it: node = P + d (f (1 - f) n + f^2 u), with d = |Q - P|,
 * u = (Q - P) / d and f the fraction of the way across, so the cells meet
 * the wall at right angles and reach the far boundary exactly.
 */
function bluntGrid(
  body: Body,
  s: TransonicSpacing,
  refinement: number,
  baseNj: number,
  farRadius: number,
  xEnd: number,
): { grid: StructuredGrid; iTip: number; iShoulder: number; topology: 'C' } {
  const { nose } = body;
  const L = nose.length;
  const R = nose.baseRadius;
  // The profile by arc length, sampled in u with x = L u^2, which clusters
  // the samples at the tip where the profile is vertical.
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
  const sEnd = sNose + (xEnd - L);
  const uAt = (arc: number) => {
    let low = 0;
    let high = PROFILE_SAMPLES;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (sOf[mid]! <= arc) low = mid;
      else high = mid;
    }
    const f = (arc - sOf[low]!) / (sOf[high]! - sOf[low]!);
    return uOf[low]! + Math.min(Math.max(f, 0), 1) / PROFILE_SAMPLES;
  };
  /** The body point at arc length `arc` from the stagnation point, and its outward normal. */
  const surface = (arc: number) => {
    if (arc >= sNose) return { x: L + (arc - sNose), y: R, nx: 0, ny: 1 };
    const u = uAt(arc);
    if (u === 0) return { x: 0, y: 0, nx: -1, ny: 0 };
    const e = 1e-7;
    const ua = Math.max(u - e, 0);
    const ub = Math.min(u + e, 1);
    const tx = profileX(ub) - profileX(ua);
    const ty = profileR(ub) - profileR(ua);
    const t = Math.hypot(tx, ty);
    return { x: profileX(u), y: profileR(u), nx: -ty / t, ny: tx / t };
  };
  if (!(Math.abs(surface(sNose * (1 - 1e-9)).nx) < 1e-3)) {
    throw new RangeError(
      'blunt noses that do not meet the body tangentially are not supported by the transonic grid yet',
    );
  }

  // Along the body: s.tip at the stagnation point, s.shoulder at the
  // shoulder, growing by s.noseGrowth along the nose up to s.nose apart,
  // and by s.growth along the cylinder.
  const spacing = (arc: number) =>
    arc >= sNose
      ? s.shoulder * R + s.growth * (arc - sNose)
      : Math.min(
          s.tip * R + s.noseGrowth * arc,
          s.shoulder * R + s.noseGrowth * (sNose - arc),
          s.nose * R,
        );
  const arcs = columnPositions([0, sNose, sEnd], (arc) => refinement / spacing(arc), refinement);
  const iShoulder = arcs.indexOf(sNose);
  const points = arcs.map(surface);

  // The far boundary by arc length: a quarter circle of the far radius
  // about the stagnation point, from the axis upstream to above it, then
  // the line at the far radius to the end of the cylinder.
  const quarter = (Math.PI / 2) * farRadius;
  const farLength = quarter + xEnd;
  const far = (t: number): [number, number] =>
    t <= quarter
      ? [-farRadius * Math.cos(t / farRadius), farRadius * Math.sin(t / farRadius)]
      : [t - quarter, farRadius];

  // Angle of the body normal to the upstream axis: 0 at the stagnation
  // point, pi / 2 on the cylinder; odd about the stagnation point (the
  // mirror image of the body) and pi / 2 beyond the end of the body.
  const normalAngle = (arc: number): number => {
    if (arc < 0) return -normalAngle(-arc);
    if (arc >= sNose) return Math.PI / 2;
    const p = surface(arc);
    return Math.atan2(p.ny, -p.nx);
  };
  // At a distance h from the wall a line follows the normal averaged
  // over the body within SMOOTHING h of its foot: the exact normals would
  // fan out from the nose and stay parallel along the cylinder, and the
  // cells at the shoulder would jump in width (by 4.7 times on a
  // hemisphere). The window closes at the end of the body, keeping the
  // last line vertical: its half-width is the harmonic combination of
  // SMOOTHING h and MAX_WIDTH_SLOPE times the distance to the end, which
  // shrinks smoothly (a minimum would turn the lines abruptly where it
  // switches, by 2.5 times in width on a hemisphere) and by at most
  // MAX_WIDTH_SLOPE per unit length. Along a row of nodes both ends of the
  // window then move downstream, so the average of the angle, which grows
  // along the body, grows too, and no two lines turn towards each other.
  const direction = (arc: number, h: number): [number, number] => {
    const a = SMOOTHING * h;
    const c = MAX_WIDTH_SLOPE * (sEnd - arc);
    const w = a + c > 0 ? (a * c) / (a + c) : 0;
    if (arc === 0 || w === 0) {
      const angle = normalAngle(arc);
      return [-Math.cos(angle), Math.sin(angle)];
    }
    let sum = 0;
    for (let k = 0; k < WINDOW_SAMPLES; k++) {
      sum += normalAngle(arc - w + (2 * w * (k + 0.5)) / WINDOW_SAMPLES);
    }
    const angle = sum / WINDOW_SAMPLES;
    return [-Math.cos(angle), Math.sin(angle)];
  };

  const nj = baseNj * refinement;
  const ni = arcs.length - 1;
  const b = s.growth * baseNj;
  const grid = gridFromFunction(ni, nj, (i, j) => {
    const p = points[i]!;
    const [qx, qy] = i === ni ? [xEnd, farRadius] : far((farLength * i) / ni);
    const d = Math.hypot(qx - p.x, qy - p.y);
    const ux = (qx - p.x) / d;
    const uy = (qy - p.y) / d;
    const f = Math.expm1((b * j) / nj) / Math.expm1(b);
    const along = f * (1 - f);
    const [nx, ny] = direction(arcs[i]!, d * f);
    return [p.x + d * (along * nx + f * f * ux), p.y + d * (along * ny + f * f * uy)];
  });
  return { grid, iTip: 0, iShoulder, topology: 'C' };
}
