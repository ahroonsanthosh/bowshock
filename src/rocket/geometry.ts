/**
 * The rocket's outside as drawn (docs/design/0017-rocketeer-interface.md
 * section 7), in calibres: the body's diameter is 1 (radius 0.5), the
 * solver's own unit, so the same geometry serves the builder's drawing,
 * the 2D side view over the flow and the 3D scene. x runs aft from the
 * nose's tip.
 *
 * The profile follows the nose's own formula (src/geometry/nose.ts). In
 * the side view (y up, the viewer on +z) fin k of n stands at the roll
 * angle phi = rotation + 360 k / n, measured from straight up toward the
 * viewer: a point of the fin at radius s from the axis is at y = s cos(phi),
 * and its faces, the thickness t apart, at y +- (t / 2) sin(phi). So the
 * fin's outline is seen squeezed by cos(phi) and widened by t sin(phi):
 * two of four fins at 0 deg are seen whole and one edge on (its
 * thickness), and three fins at 0 deg show one whole and two at half their
 * span beyond the body. Fins toward the viewer are drawn over the body,
 * those away from it behind (hidden where the body covers them).
 */

import { noseRadius, type NoseShape } from '../geometry/nose';
import type { FinPlanform, FinSetDesign, RocketDesign } from './design';

export type Point = readonly [number, number];

export interface FinGeometry {
  readonly count: number;
  /** The first fin's roll angle, degrees from straight up toward the viewer. */
  readonly rotation: number;
  /** One fin's outline in its own plane: x from the tip, y out from the body's surface; root leading edge first. */
  readonly outline: readonly Point[];
  /** The body's radius at the fins' root. */
  readonly rootRadius: number;
  readonly thickness: number;
}

export interface RocketGeometry {
  /** Metres in a calibre: the nose's diameter. */
  readonly calibre: number;
  /** The outside from the tip to the base, (x, r), r = 0.5 on the body tube. */
  readonly profile: readonly Point[];
  /** From the tip to the base. */
  readonly length: number;
  readonly fins: readonly FinGeometry[];
}

/** Points along a profile of a nose shape, denser near its start, where curved shapes bend most. */
function shapePoints(
  shape: NoseShape,
  x0: number,
  length: number,
  r0: number,
  r1: number,
  n: number,
): Point[] {
  // The shape's radius over its length, from 0 at its narrow end to |r1 - r0| at its wide end.
  const widens = r1 >= r0;
  const nose = { shape, length, baseRadius: Math.abs(r1 - r0) };
  const points: Point[] = [];
  for (let k = 0; k <= n; k++) {
    const f = (k / n) ** 1.5;
    if (widens) {
      points.push([x0 + f * length, r0 + noseRadius(nose, f * length)]);
    } else {
      // Narrowing (a boat-tail): the shape seen from its aft end.
      const g = 1 - f;
      points.push([x0 + g * length, r1 + noseRadius(nose, f * length)]);
    }
  }
  return widens ? points : points.reverse();
}

/** One fin's outline in its own plane, root leading edge first, clockwise seen from +z with y up. */
export function finOutline(p: FinPlanform, rootLeadingEdge: number): Point[] {
  switch (p.kind) {
    case 'trapezoidal':
      return [
        [rootLeadingEdge, 0],
        [rootLeadingEdge + p.sweepLength, p.span],
        [rootLeadingEdge + p.sweepLength + p.tipChord, p.span],
        [rootLeadingEdge + p.rootChord, 0],
      ];
    case 'elliptical': {
      const points: Point[] = [];
      const n = 32;
      for (let k = 0; k <= n; k++) {
        const a = Math.PI * (1 - k / n);
        points.push([
          rootLeadingEdge + (p.rootChord / 2) * (1 + Math.cos(a)),
          p.span * Math.sin(a),
        ]);
      }
      return points;
    }
    case 'freeform':
      return p.points.map(([x, y]) => [rootLeadingEdge + x, y]);
  }
}

/** The body's radius at x (calibres), from the profile. */
export function radiusAt(profile: readonly Point[], x: number): number {
  for (let k = 1; k < profile.length; k++) {
    const [x0, r0] = profile[k - 1]!;
    const [x1, r1] = profile[k]!;
    if (x >= x0 && x <= x1)
      return x1 === x0 ? Math.max(r0, r1) : r0 + ((x - x0) / (x1 - x0)) * (r1 - r0);
  }
  return 0;
}

/** The rocket's outside in calibres. */
export function rocketGeometry(design: RocketDesign): RocketGeometry {
  const c = design.nose.diameter;
  const cal = (m: number) => m / c;
  const profile: Point[] = shapePoints(
    design.nose.shape,
    0,
    cal(design.nose.length),
    0,
    cal(design.nose.diameter) / 2,
    96,
  );
  let x = cal(design.nose.length);
  for (const s of design.body) {
    const length = cal(s.length);
    if (s.kind === 'tube') {
      const r = cal(s.diameter) / 2;
      profile.push([x, r], [x + length, r]);
    } else {
      profile.push(
        ...shapePoints(s.shape, x, length, cal(s.foreDiameter) / 2, cal(s.aftDiameter) / 2, 32),
      );
    }
    x += length;
  }
  const fins = design.finSets.map((f: FinSetDesign): FinGeometry => {
    const outline = finOutline(f.planform, f.rootLeadingEdge).map(([px, py]): Point => [
      cal(px),
      cal(py),
    ]);
    return {
      count: f.count,
      rotation: f.rotation,
      outline,
      rootRadius: radiusAt(profile, cal(f.rootLeadingEdge)),
      thickness: cal(f.thickness),
    };
  });
  return { calibre: c, profile, length: x, fins };
}

/** A fin as seen from the side: the polygons that cover it, and whether it is behind the body. */
export interface SideFin {
  /** Convex polygons whose union is the fin seen from the side, (x, y). */
  readonly polygons: readonly (readonly Point[])[];
  /** Away from the viewer: drawn before the body, hidden where it covers it. */
  readonly behind: boolean;
  /** The fin's roll angle, degrees. */
  readonly roll: number;
  /** How much of its face the viewer sees, |cos(roll)|: 1 seen whole, 0 edge on. */
  readonly facing: number;
}

/** The convex hull of points (monotone chain), counter-clockwise. */
export function convexHull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Whether the outline is convex (then its view is one hull). */
function isConvex(outline: readonly Point[]): boolean {
  const n = outline.length;
  let sign = 0;
  for (let k = 0; k < n; k++) {
    const a = outline[k]!;
    const b = outline[(k + 1) % n]!;
    const c = outline[(k + 2) % n]!;
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < 1e-15) continue;
    const s = Math.sign(z);
    if (sign !== 0 && s !== sign) return false;
    sign = s;
  }
  return true;
}

/** Every fin seen from the side, behind ones first. */
export function sideViewFins(geometry: RocketGeometry): SideFin[] {
  const seen: SideFin[] = [];
  for (const set of geometry.fins) {
    for (let k = 0; k < set.count; k++) {
      const roll = set.rotation + (360 * k) / set.count;
      const phi = (roll * Math.PI) / 180;
      const cos = Math.cos(phi);
      const sin = Math.sin(phi);
      // Exactly in the plane of the drawing where the angle is a whole number of half turns.
      const towardViewer = Math.abs(sin) < 1e-12 ? 0 : sin;
      const half = (set.thickness / 2) * Math.abs(towardViewer);
      const squeezed = set.outline.map(([x, y]): Point => [
        x,
        (set.rootRadius + y) * (Math.abs(cos) < 1e-12 ? 0 : cos),
      ]);
      const up = squeezed.map(([x, y]): Point => [x, y + half]);
      const down = squeezed.map(([x, y]): Point => [x, y - half]);
      let polygons: Point[][];
      if (isConvex(set.outline)) {
        polygons = [convexHull([...up, ...down])];
      } else {
        // The union of the outline shifted up and down and the strips its edges sweep.
        polygons = [up, down];
        for (let e = 0; e < squeezed.length; e++) {
          const f = (e + 1) % squeezed.length;
          polygons.push([up[e]!, up[f]!, down[f]!, down[e]!]);
        }
      }
      seen.push({ polygons, behind: towardViewer < 0, roll, facing: Math.abs(cos) });
    }
  }
  return [...seen.filter((s) => s.behind), ...seen.filter((s) => !s.behind)];
}

/** The area of a polygon (shoelace), for tests. */
export function polygonArea(points: readonly Point[]): number {
  let twice = 0;
  for (let k = 0; k < points.length; k++) {
    const [x0, y0] = points[k]!;
    const [x1, y1] = points[(k + 1) % points.length]!;
    twice += x0 * y1 - x1 * y0;
  }
  return Math.abs(twice) / 2;
}
