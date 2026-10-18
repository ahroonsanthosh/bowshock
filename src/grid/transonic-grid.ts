/**
 * Grids for transonic flow (Mach 1 to about 1.2) around a sharp nose
 * followed by a long cylinder, the cylinder standing for a wind-tunnel
 * sting: the domain reaches far upstream, sideways and downstream, since
 * the bow shock stands far ahead of the nose (at Mach 1 at infinity) and
 * the flow over the body is partly subsonic (design:
 * docs/design/0007-transonic.md).
 *
 * Topology (H, as body-grid.ts): grid lines of constant i are vertical;
 * jMin is the axis ahead of the tip and the body behind it, jMax a far
 * boundary at a constant radius, iMin a far boundary upstream and iMax
 * the plane ending the cylinder downstream. The tip and the shoulder lie
 * on grid lines.
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
import { noseTipSlope } from '../geometry/nose';
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
  /** Grid index i of the nose tip and of the shoulder (the end of the nose). */
  readonly iTip: number;
  readonly iShoulder: number;
  /** Radius of the far boundary (jMax) and position of the upstream one (iMin). */
  readonly farRadius: number;
  readonly xUpstream: number;
  /** Position of the plane ending the cylinder (iMax). */
  readonly xEnd: number;
  /** Cells across on the base grid. */
  readonly baseNj: number;
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
  if (!Number.isFinite(noseTipSlope(body.nose))) {
    throw new RangeError('blunt noses are not supported by the transonic grid yet');
  }
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
  return { grid, iTip, iShoulder, farRadius, xUpstream, xEnd, baseNj };
}
