/** Node spacing shared by the grid generators (docs/design/0004-grids.md). */

/**
 * Node positions along a line (x, or arc length along a curve) for a
 * target density of nodes per unit length: within each interval between breakpoints the cumulative density is
 * divided into a whole number of equal parts, so every breakpoint lies on
 * a node and the spacing varies smoothly.
 *
 * The count in each interval is rounded at the base resolution and then
 * multiplied by the refinement, and the density is tabulated at a
 * resolution set by the base grid; a refined grid therefore divides each
 * base interval into exactly `refinement` parts, reproducing every coarser
 * node of its family.
 */
export function columnPositions(
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
