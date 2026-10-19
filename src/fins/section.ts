/**
 * Sharp fin sections, in chord units, at zero incidence.
 *
 * A section is two polylines, the upper and the lower surface, each from
 * the leading edge at (0, 0) to the trailing edge at (1, 0) with x strictly
 * increasing; the free stream is along +x. Both edges are sharp (zero
 * thickness, finite wedge angle). Blunt or rounded edges are not sections
 * of this kind and are refused by `validateSection`.
 *
 * One exception, declared by the section itself: a blunt trailing edge
 * (`bluntTrailingEdge: true`), where the surfaces end at x = 1 apart, so
 * that the section ends in a flat base normal to the stream (the single
 * wedge of `singleWedge`, as on the Basic Finner's fins). The wave drag
 * computed for such a section by ./section-drag.ts and
 * ./linear-wave-drag.ts is that of its faces alone: in supersonic flow the
 * faces do not feel the base, and the base's own drag is a base-pressure
 * term, not modelled here (src/base refuses it until two-dimensional base
 * pressures are transcribed; docs/design/0010-base-drag-and-total.md).
 * Blunt or rounded leading edges stay refused.
 *
 * A symmetric section is given by its half-thickness at breakpoints along
 * the chord (the form the linear planform method of ./linear-wave-drag.ts
 * takes); `symmetricPolygon` turns it into the two surfaces.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * A sharp section: two polylines from (0, 0) to (1, 0), x strictly
 * increasing; with `bluntTrailingEdge`, to x = 1 with the upper surface
 * above the lower there.
 */
export interface Section {
  readonly upper: readonly Point[];
  readonly lower: readonly Point[];
  readonly bluntTrailingEdge?: boolean;
}

/**
 * A symmetric sharp section: half-thickness over chord at chordwise
 * breakpoints x (chord fractions, 0 to 1, strictly increasing), zero at
 * both ends and positive between; with `bluntTrailingEdge`, positive at
 * x = 1 too (a base of thickness twice the last half-thickness), and two
 * breakpoints suffice.
 */
export interface SymmetricSection {
  readonly x: readonly number[];
  readonly halfThickness: readonly number[];
  readonly bluntTrailingEdge?: boolean;
}

/**
 * A single wedge from a sharp leading edge to a blunt trailing edge of
 * thickness ratio t/c (the trailing edge's thickness over the chord).
 */
export function singleWedge(trailingEdgeThicknessRatio: number): SymmetricSection {
  if (!(trailingEdgeThicknessRatio > 0)) {
    throw new RangeError('the trailing-edge thickness ratio must be positive');
  }
  return { x: [0, 1], halfThickness: [0, trailingEdgeThicknessRatio / 2], bluntTrailingEdge: true };
}

/** Symmetric double wedge of thickness ratio t/c with its ridge at the chord fraction given. */
export function doubleWedge(thicknessRatio: number, ridge = 0.5): SymmetricSection {
  if (!(thicknessRatio > 0)) throw new RangeError('the thickness ratio must be positive');
  if (!(ridge > 0 && ridge < 1)) throw new RangeError('the ridge must lie inside the chord');
  return { x: [0, ridge, 1], halfThickness: [0, thicknessRatio / 2, 0] };
}

/**
 * Symmetric wedge-flat-wedge (hexagonal) section of thickness ratio t/c:
 * a leading-edge bevel over `frontBevel` of the chord, a flat, and a
 * trailing-edge bevel over `rearBevel` (default equal to the front).
 */
export function hexagonal(
  thicknessRatio: number,
  frontBevel: number,
  rearBevel = frontBevel,
): SymmetricSection {
  if (!(thicknessRatio > 0)) throw new RangeError('the thickness ratio must be positive');
  if (!(frontBevel > 0 && rearBevel > 0 && frontBevel + rearBevel < 1)) {
    throw new RangeError('the bevels must be positive and leave a flat between them');
  }
  const h = thicknessRatio / 2;
  return { x: [0, frontBevel, 1 - rearBevel, 1], halfThickness: [0, h, h, 0] };
}

/** Checks a symmetric section; throws RangeError with the reason. */
export function validateSymmetricSection(section: SymmetricSection): void {
  const { x, halfThickness: g } = section;
  const n = x.length;
  const blunt = section.bluntTrailingEdge === true;
  if (n < (blunt ? 2 : 3) || g.length !== n) {
    throw new RangeError(
      blunt
        ? 'a section with a blunt trailing edge needs at least two breakpoints and one thickness each'
        : 'a symmetric section needs at least three breakpoints and one thickness each',
    );
  }
  if (x[0] !== 0 || x[n - 1] !== 1) throw new RangeError('the breakpoints must run from 0 to 1');
  for (let k = 0; k < n; k++) {
    if (!Number.isFinite(x[k]!) || !Number.isFinite(g[k]!)) {
      throw new RangeError('the breakpoints must be finite');
    }
    if (k > 0 && !(x[k]! > x[k - 1]!)) {
      throw new RangeError('the breakpoints must increase strictly');
    }
  }
  if (g[0] !== 0) {
    throw new RangeError(
      'a sharp section has zero thickness at the leading edge (blunt edges are refused)',
    );
  }
  if (blunt) {
    if (!(g[n - 1]! > 0)) {
      throw new RangeError('a blunt trailing edge needs a positive thickness at x = 1');
    }
  } else if (g[n - 1] !== 0) {
    throw new RangeError(
      'a sharp section has zero thickness at both edges (blunt edges are refused unless the ' +
        'section declares a blunt trailing edge)',
    );
  }
  for (let k = 1; k < n - 1; k++) {
    if (!(g[k]! > 0)) throw new RangeError('the half-thickness must be positive inside the chord');
  }
}

/** The two surfaces of a symmetric section: y = +g on the upper, -g on the lower. */
export function symmetricPolygon(section: SymmetricSection): Section {
  validateSymmetricSection(section);
  const upper = section.x.map((x, k) => ({ x, y: section.halfThickness[k]! }));
  const lower = section.x.map((x, k) => ({ x, y: -section.halfThickness[k]! }));
  return section.bluntTrailingEdge === true
    ? { upper, lower, bluntTrailingEdge: true }
    : { upper, lower };
}

/** Thickness ratio t/c of a symmetric section: twice its largest half-thickness. */
export function symmetricThicknessRatio(section: SymmetricSection): number {
  return 2 * Math.max(...section.halfThickness);
}

function surfaceHeight(surface: readonly Point[], x: number): number {
  for (let k = 1; k < surface.length; k++) {
    const a = surface[k - 1]!;
    const b = surface[k]!;
    if (x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return surface[surface.length - 1]!.y;
}

/** Checks a section; throws RangeError with the reason. */
export function validateSection(section: Section): void {
  const blunt = section.bluntTrailingEdge === true;
  for (const [name, s] of [
    ['upper', section.upper],
    ['lower', section.lower],
  ] as const) {
    const n = s.length;
    if (n < 2) throw new RangeError(`the ${name} surface needs at least two points`);
    const first = s[0]!;
    const last = s[n - 1]!;
    if (first.x !== 0 || first.y !== 0 || last.x !== 1 || (!blunt && last.y !== 0)) {
      throw new RangeError(
        blunt
          ? `the ${name} surface must run from the leading edge (0, 0) to the trailing edge at x = 1`
          : `the ${name} surface must run from the leading edge (0, 0) to the trailing edge (1, 0)`,
      );
    }
    for (let k = 0; k < n; k++) {
      const p = s[k]!;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        throw new RangeError(`the ${name} surface has a non-finite point`);
      }
      if (k > 0 && !(p.x > s[k - 1]!.x)) {
        throw new RangeError(`x must increase strictly along the ${name} surface`);
      }
    }
  }
  // Positive thickness inside the chord (and at a blunt trailing edge):
  // both surfaces are piecewise linear, so checking at every vertex of
  // either suffices.
  const xs = [...section.upper, ...section.lower]
    .map((p) => p.x)
    .filter((x) => x > 0 && (x < 1 || blunt));
  if (xs.length === 0)
    throw new RangeError('a section needs thickness: add a vertex inside the chord');
  for (const x of xs) {
    if (!(surfaceHeight(section.upper, x) > surfaceHeight(section.lower, x))) {
      throw new RangeError(`the upper surface must lie above the lower one (at x = ${x})`);
    }
  }
}

/** Largest thickness of a section over its chord (t/c). */
export function thicknessRatio(section: Section): number {
  const xs = [...section.upper, ...section.lower].map((p) => p.x);
  let t = 0;
  for (const x of xs) {
    t = Math.max(t, surfaceHeight(section.upper, x) - surfaceHeight(section.lower, x));
  }
  return t;
}
