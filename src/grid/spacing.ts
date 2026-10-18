/** Node spacing shared by the grid generators (docs/design/0004-grids.md). */

export interface ColumnOptions {
  /**
   * Largest rate of change of the spacing along the line, if limited (the
   * blunt-nose grids): the spacing 1 / density is replaced by the largest
   * function below it whose slope is at most this, across the breakpoints
   * too, so neighbouring cells of the base grid differ in length by at
   * most about this fraction. Where the spacing already changes more
   * slowly, the density is left exactly as given.
   */
  readonly maxSpacingSlope?: number;
}

/**
 * Node positions along a line (x, or arc length along a curve) for a
 * target density of nodes per unit length: within each interval between
 * breakpoints the cumulative density is divided into a whole number of
 * equal parts, so every breakpoint lies on a node and the spacing varies
 * smoothly.
 *
 * The count in each interval is rounded at the base resolution and then
 * multiplied by the refinement, and the density is tabulated at a
 * resolution set by the base grid; a refined grid therefore divides each
 * base interval into exactly `refinement` parts, reproducing every coarser
 * node of its family. The density must scale with the refinement exactly
 * (a power of 2), as the generators' do (their spacing is inversely
 * proportional to the cells across); the limit on the spacing's slope is
 * applied to the base grid's spacing, so it keeps that.
 */
export function columnPositions(
  breakpoints: readonly number[],
  density: (x: number) => number,
  refinement: number,
  options: ColumnOptions = {},
): number[] {
  // The tabulated density of each interval: at least 64 samples per node
  // of the base grid (estimated from the density at its ends).
  const tables = breakpoints.slice(1).map((b, k) => {
    const a = breakpoints[k]!;
    const baseNodes = (((density(a) + density(b)) / 2) * (b - a)) / refinement;
    const samples = Math.max(2048, 64 * Math.ceil(baseNodes));
    const at = (n: number) => a + ((b - a) * n) / samples;
    const values = new Float64Array(samples + 1);
    for (let n = 0; n <= samples; n++) values[n] = density(at(n));
    return { b, samples, at, values };
  });
  if (options.maxSpacingSlope !== undefined) {
    limitSpacingSlope(tables, refinement, options.maxSpacingSlope);
  }
  const xs = [breakpoints[0]!];
  for (const { b, samples, at, values } of tables) {
    // Cumulative density by the trapezoidal rule.
    const cumulative = new Float64Array(samples + 1);
    for (let n = 1; n <= samples; n++) {
      cumulative[n] =
        cumulative[n - 1]! + 0.5 * (values[n - 1]! + values[n]!) * (at(n) - at(n - 1));
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

/**
 * Replaces the tabulated density (in place) by that of the largest
 * spacing below the given one whose slope is at most `slope`: two passes
 * over all the samples, in order along the line. On the base grid's
 * spacing (the density divided by the refinement, exact for a power of
 * 2), so every grid of a family gets the same limited spacing, scaled.
 */
function limitSpacingSlope(
  tables: readonly {
    readonly samples: number;
    readonly at: (n: number) => number;
    readonly values: Float64Array;
  }[],
  refinement: number,
  slope: number,
): void {
  if (!(slope > 0)) throw new RangeError('the spacing slope limit must be positive');
  // All the samples in order along the line; each breakpoint appears twice,
  // at the end of one interval and the start of the next.
  const xs: number[] = [];
  const spacings: number[] = [];
  for (const t of tables) {
    for (let n = 0; n <= t.samples; n++) {
      xs.push(t.at(n));
      spacings.push(refinement / t.values[n]!);
    }
  }
  const limited = [...spacings];
  for (let k = 1; k < limited.length; k++) {
    limited[k] = Math.min(limited[k]!, limited[k - 1]! + slope * (xs[k]! - xs[k - 1]!));
  }
  for (let k = limited.length - 2; k >= 0; k--) {
    limited[k] = Math.min(limited[k]!, limited[k + 1]! + slope * (xs[k + 1]! - xs[k]!));
  }
  let k = 0;
  for (const t of tables) {
    for (let n = 0; n <= t.samples; n++, k++) {
      if (limited[k]! < spacings[k]!) t.values[n] = refinement / limited[k]!;
    }
  }
}
