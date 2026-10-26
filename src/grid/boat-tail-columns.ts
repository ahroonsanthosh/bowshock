/**
 * The columns over a conical boat-tail (design record 0023 section 2.1),
 * shared by the sharp noses' grids (src/analysis/fitted-flow.ts) and the
 * blunt noses' C grids (./blunt-grid.ts), measured along the body in the
 * coordinate each lays its columns out in (x, or arc length).
 *
 * The usual layouts size columns to the shock layer, whose outer cells far
 * along a long body are a body radius or more long: a few over the whole
 * boat-tail. Over the boat-tail the columns are BOAT_TAIL_SPACING times the
 * smaller of its length and the body's radius, over nj, growing ahead of
 * the shoulder by BOAT_TAIL_GRADING over nj per unit length (so that
 * neighbouring columns of the base grid differ in width by about that over
 * nj); never narrower than the base grid's outer cell over
 * BOAT_TAIL_ASPECT (so that under a far shock the outer cells stay within
 * the fitted grids' aspect gate); never wider than the boat-tail's length
 * over BOAT_TAIL_MIN_COLUMNS (so that rounding its count of columns changes
 * their width little). Past the base the body is the boat-tail's cone
 * continued by BOAT_TAIL_CONTINUATION_COLUMNS columns of the base's width
 * on the base grid. Every grid's widths are the base grid's over its
 * refinement, and the continuation does not depend on the refinement, so
 * a family's grids nest.
 */

/** Columns over a boat-tail: their length times nj, in the smaller of its length and the body's radius. */
export const BOAT_TAIL_SPACING = 2;
/** ... growing ahead of its shoulder by this over nj per unit length. */
export const BOAT_TAIL_GRADING = 3;
/**
 * ... and at least the base grid's outer cell over this: without it the
 * outer cells over the boat-tail of a long body reached aspect ratios of
 * 13.3 to 23.1 at Mach 1.5 to 2 (nj = 20, sharp noses), above the gate of
 * 13. The first guess of the shock (the tip's conical shock line) lies
 * above the converged shock, so the converged outer cells are smaller
 * still (aspect ratios of 7.0 to 8.3 on the thirteen reference cases).
 */
export const BOAT_TAIL_ASPECT = 10;
/** ... and at most the boat-tail's length over this, on the base grid. */
export const BOAT_TAIL_MIN_COLUMNS = 4;
/** Columns of the base grid over which the boat-tail's cone is continued past the base. */
export const BOAT_TAIL_CONTINUATION_COLUMNS = 4;

export interface BoatTailLayout {
  /** The boat-tail's length, in the coordinate the columns are laid out in. */
  readonly length: number;
  /** The body's radius. */
  readonly radius: number;
  /** Positions of the shoulder and the base, in that coordinate. */
  readonly shoulder: number;
  readonly base: number;
  /** Cells across on the base grid. */
  readonly baseNj: number;
  /** The base grid's outer cell height at a position (only called up to the base). */
  readonly outerHeight: (t: number) => number;
}

/** The base grid's column width over the boat-tail and ahead of it, at position t (constant past the base). */
export function boatTailBaseSpacing(layout: BoatTailLayout): (t: number) => number {
  const { length, radius, shoulder, base, baseNj, outerHeight } = layout;
  const finest = BOAT_TAIL_SPACING * Math.min(length, radius);
  return (t) =>
    Math.min(
      Math.max(
        (finest + BOAT_TAIL_GRADING * Math.max(shoulder - t, 0)) / baseNj,
        outerHeight(Math.min(t, base)) / BOAT_TAIL_ASPECT,
      ),
      t >= shoulder ? length / BOAT_TAIL_MIN_COLUMNS : Infinity,
    );
}
