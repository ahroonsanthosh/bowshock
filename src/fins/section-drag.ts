/**
 * Inviscid wave drag of a sharp fin section in two dimensions, at zero
 * incidence: exact by shock-expansion theory, and the linear (Ackeret) and
 * second-order (Busemann) theories it reduces to as the section thins.
 *
 * Shock-expansion theory (oblique shock or Prandtl-Meyer expansion at the
 * leading edge, Prandtl-Meyer expansions at every corner after it) gives the
 * pressure on each straight face of a convex polygon exactly, with one
 * condition: no wave reflected from the leading-edge shock may reach the
 * surface ahead of the trailing edge. Such waves arise where a corner's
 * expansion fan overtakes the shock and weakens it. `exactSectionDrag`
 * bounds where the first of them can land and refuses the case when that
 * lies on the chord (`firstReflection` below says how), unless the caller
 * asks for the shock-expansion value with the reflections neglected, which
 * is then labelled `exact: false`. It also refuses:
 *
 * - a detached leading-edge shock (deflection above the detachment angle),
 * - an attached shock with subsonic flow behind it (between the sonic and
 *   the detachment deflection), where corner waves reach the edge,
 * - a compression (concave) corner after the leading edge: its shock would
 *   overtake the expansion fans ahead of it close to the surface, and those
 *   interactions are not modelled,
 * - expansion beyond the Prandtl-Meyer limit, and subsonic free streams.
 *
 * The oblique-shock and Prandtl-Meyer relations are those of
 * src/validation/gas-dynamics.ts. Pressures are referred to the free stream;
 * cd is the drag of both surfaces over the chord, cd = sum over faces of
 * Cp dy (upper) and -Cp dy (lower).
 *
 * The thin-section theories, in the surface slopes delta (positive into the
 * stream: dy/dx on the upper surface, -dy/dx on the lower):
 *   Ackeret:  Cp = C1 delta,               cd = sum C1 delta^2 dx
 *   Busemann: Cp = C1 delta + C2 delta^2,  cd = sum (C1 delta^2 + C2 delta^3) dx
 *   C1 = 2 / beta,  C2 = ((gamma + 1) M^4 - 4 beta^2) / (2 beta^4),  beta^2 = M^2 - 1.
 * Busemann's second-order term cancels in the drag of sections whose faces
 * are fore-and-aft symmetric (sum of delta^3 dx = 0: the symmetric double
 * wedge, and hexagons with equal bevels), so there the exact drag differs
 * from Ackeret's at relative order (t/c)^2; otherwise at order t/c.
 * Tested in tests/fins/section-drag.test.ts; results in
 * docs/design/0009-fin-wave-drag.md.
 */

import {
  deflectionAngle,
  machAngle,
  machFromPrandtlMeyer,
  maxDeflectionWaveAngle,
  obliqueShock,
  prandtlMeyer,
  stagnationPressureRatio,
} from '../validation/gas-dynamics';
import { FinRefusal } from './refusal';
import {
  symmetricPolygon,
  validateSection,
  type Point,
  type Section,
  type SymmetricSection,
} from './section';

export interface FaceSolution {
  /** Chordwise extent of the face. */
  readonly x0: number;
  readonly x1: number;
  /** Flow deflection on the face, radians, positive into the stream. */
  readonly deflection: number;
  readonly mach: number;
  /** Static pressure over the free stream's. */
  readonly pressureRatio: number;
  readonly cp: number;
}

export interface SurfaceSolution {
  readonly faces: readonly FaceSolution[];
  /** This surface's part of cd: the sum of Cp times the face's rise into the stream. */
  readonly cd: number;
  /**
   * Wave angle of the leading-edge shock on this surface (radians from the
   * free stream), or undefined when the surface starts with an expansion or
   * along the stream.
   */
  readonly shockAngle: number | undefined;
  /**
   * Chord fraction ahead of which no wave reflected from the leading-edge
   * shock can reach this surface (Infinity when no such wave exists: no
   * leading-edge shock, or no corner). Bound: the head of the first corner's
   * fan meets the straight shock at P; every wave reflected there or later
   * travels along a descending characteristic at angle mu - theta below the
   * stream; across the expansion fans nu + theta is constant, so mu - theta
   * is a function of the Mach number alone, and it is unimodal (minimum at
   * M^2 = 4 / (3 - gamma)), so its largest value over the surface's states
   * is at a face state. The line from P at that steepest angle is
   * intersected with the surface. The bound neglects the change the
   * reflected waves themselves make to the states they cross.
   */
  readonly firstReflection: number;
}

export interface SectionDragOptions {
  /** Ratio of specific heats; default 1.4. */
  readonly gamma?: number;
  /**
   * Return the shock-expansion value even when a reflected wave can reach
   * the surface ahead of the trailing edge (the result is then labelled
   * `exact: false`). Default false: such cases are refused.
   */
  readonly neglectReflectedWaves?: boolean;
}

export interface ExactSectionDrag {
  /** Wave drag coefficient of both surfaces, on the chord. */
  readonly cd: number;
  /**
   * True when no reflected wave can reach either surface ahead of the
   * trailing edge, so cd is exact for the inviscid flow; false only when
   * the caller asked for `neglectReflectedWaves`.
   */
  readonly exact: boolean;
  readonly upper: SurfaceSolution;
  readonly lower: SurfaceSolution;
}

/** Corner turns smaller than this (radians) are taken as collinear faces. */
const COLLINEAR = 1e-12;

function asSection(section: Section | SymmetricSection): Section {
  if ('upper' in section) {
    validateSection(section);
    return section;
  }
  return symmetricPolygon(section);
}

const degrees = (rad: number) => ((rad * 180) / Math.PI).toFixed(3);

function checkMach(mach: number): void {
  if (!(mach > 1) || !Number.isFinite(mach)) {
    throw new FinRefusal(
      'subsonic-free-stream',
      `supersonic section theory needs a free-stream Mach number above 1, got ${mach}`,
    );
  }
}

/** Points of a surface in the frame where it is an upper surface (lower: y -> -y). */
function upperFrame(points: readonly Point[], sign: 1 | -1): Point[] {
  return points.map((p) => ({ x: p.x, y: sign * p.y }));
}

function solveSurface(
  points: readonly Point[],
  name: 'upper' | 'lower',
  mach: number,
  gamma: number,
): SurfaceSolution {
  const q = 0.5 * gamma * mach * mach;
  const n = points.length - 1;
  const deflection: number[] = [];
  for (let k = 0; k < n; k++) {
    const a = points[k]!;
    const b = points[k + 1]!;
    deflection.push(Math.atan2(b.y - a.y, b.x - a.x));
  }

  // Leading edge.
  const d0 = deflection[0]!;
  let m: number;
  let p: number;
  let shockAngle: number | undefined;
  if (d0 > COLLINEAR) {
    const thetaMax = deflectionAngle(mach, maxDeflectionWaveAngle(mach, gamma), gamma);
    if (d0 > thetaMax) {
      throw new FinRefusal(
        'detached-shock',
        `the ${name} surface turns the stream by ${degrees(d0)} deg at the leading edge, above the ` +
          `detachment angle of ${degrees(thetaMax)} deg at Mach ${mach}: the shock stands off the ` +
          'edge and shock-expansion theory does not apply',
      );
    }
    const shock = obliqueShock(mach, d0, gamma);
    if (!(shock.downstreamMach > 1)) {
      throw new FinRefusal(
        'subsonic-behind-shock',
        `behind the ${name} leading-edge shock the flow is subsonic (Mach ` +
          `${shock.downstreamMach.toFixed(4)}) at Mach ${mach}: the corner waves reach the edge ` +
          'and shock-expansion theory does not apply',
      );
    }
    m = shock.downstreamMach;
    p = shock.pressureRatio;
    shockAngle = shock.beta;
  } else if (d0 < -COLLINEAR) {
    [m, p] = expand(mach, 1, -d0, gamma, name);
  } else {
    m = mach;
    p = 1;
  }

  const faces: FaceSolution[] = [];
  let cd = 0;
  let firstCorner = -1;
  for (let k = 0; k < n; k++) {
    if (k > 0) {
      const turn = deflection[k]! - deflection[k - 1]!;
      if (turn > COLLINEAR) {
        throw new FinRefusal(
          'compression-corner',
          `the ${name} surface has a compression corner at x/c = ${points[k]!.x}: only convex ` +
            'sections (expansion corners after the leading edge) are supported',
        );
      }
      if (turn < -COLLINEAR) {
        [m, p] = expand(m, p, -turn, gamma, name);
        if (firstCorner < 0) firstCorner = k;
      }
    }
    faces.push({
      x0: points[k]!.x,
      x1: points[k + 1]!.x,
      deflection: deflection[k]!,
      mach: m,
      pressureRatio: p,
      cp: (p - 1) / q,
    });
    // In this frame (the surface as an upper surface) the face's drag is
    // Cp times its rise.
    cd += ((p - 1) / q) * (points[k + 1]!.y - points[k]!.y);
  }

  let firstReflection = Infinity;
  if (shockAngle !== undefined && firstCorner > 0) {
    firstReflection = reflectionBound(points, faces, firstCorner, shockAngle);
  }
  return { faces, cd, shockAngle, firstReflection };
}

/** Prandtl-Meyer expansion by `turn` radians from Mach m and pressure p. */
function expand(m: number, p: number, turn: number, gamma: number, name: string): [number, number] {
  const nu = prandtlMeyer(m, gamma) + turn;
  const nuMax = (Math.PI / 2) * (Math.sqrt((gamma + 1) / (gamma - 1)) - 1);
  if (!(nu < nuMax)) {
    throw new FinRefusal(
      'expansion-limit',
      `the ${name} surface turns the stream beyond the Prandtl-Meyer limit`,
    );
  }
  const m2 = machFromPrandtlMeyer(nu, gamma);
  return [m2, (p * stagnationPressureRatio(m, gamma)) / stagnationPressureRatio(m2, gamma)];
}

function reflectionBound(
  points: readonly Point[],
  faces: readonly FaceSolution[],
  firstCorner: number,
  shockAngle: number,
): number {
  const head = faces[firstCorner - 1]!;
  const alpha = head.deflection + machAngle(head.mach);
  const c = points[firstCorner]!;
  // Shock ray t (cos b, sin b) from the leading edge meets the fan head
  // c + u (cos a, sin a); alpha > shockAngle because the flow behind the
  // shock is supersonic (sin(b - theta) = Mn2 / M2 < 1 / M2).
  const t = (c.x * Math.sin(alpha) - c.y * Math.cos(alpha)) / Math.sin(alpha - shockAngle);
  const px = t * Math.cos(shockAngle);
  const py = t * Math.sin(shockAngle);
  if (px >= 1) return px;
  let descent = -Infinity;
  for (const f of faces) descent = Math.max(descent, machAngle(f.mach) - f.deflection);
  // P lies on the shock, above the surface; a wave that may run straight
  // down lands below P.
  if (descent >= Math.PI / 2) return px;
  const slope = Math.tan(descent);
  // First x >= px where the line y = py - slope (x - px) meets the surface.
  for (let k = 0; k + 1 < points.length; k++) {
    const a = points[k]!;
    const b = points[k + 1]!;
    if (b.x < px) continue;
    const lo = Math.max(a.x, px);
    const gap = (x: number) =>
      py - slope * (x - px) - (a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x));
    const g0 = gap(lo);
    if (g0 <= 0) return lo;
    const g1 = gap(b.x);
    if (g1 <= 0) return lo + (g0 / (g0 - g1)) * (b.x - lo);
  }
  return Infinity;
}

/**
 * Exact inviscid wave drag of a sharp convex section at zero incidence, by
 * shock-expansion theory (see the module comment for what is refused).
 */
export function exactSectionDrag(
  section: Section | SymmetricSection,
  mach: number,
  options: SectionDragOptions = {},
): ExactSectionDrag {
  checkMach(mach);
  const gamma = options.gamma ?? 1.4;
  const s = asSection(section);
  const upper = solveSurface(upperFrame(s.upper, 1), 'upper', mach, gamma);
  const lower = solveSurface(upperFrame(s.lower, -1), 'lower', mach, gamma);
  const exact = upper.firstReflection >= 1 && lower.firstReflection >= 1;
  if (!exact && options.neglectReflectedWaves !== true) {
    const [name, x] =
      upper.firstReflection <= lower.firstReflection
        ? ['upper', upper.firstReflection]
        : ['lower', lower.firstReflection];
    throw new FinRefusal(
      'reflected-wave',
      `a wave reflected from the leading-edge shock can reach the ${name} surface at x/c = ` +
        `${x.toFixed(3)}, ahead of the trailing edge, at Mach ${mach}: shock-expansion theory ` +
        'neglects it, so the drag would not be exact',
    );
  }
  return { cd: upper.cd + lower.cd, exact, upper, lower };
}

/** Busemann's coefficients of Cp = C1 delta + C2 delta^2. */
export function busemannCoefficients(mach: number, gamma = 1.4): { c1: number; c2: number } {
  checkMach(mach);
  const b2 = mach * mach - 1;
  return {
    c1: 2 / Math.sqrt(b2),
    c2: ((gamma + 1) * mach ** 4 - 4 * b2) / (2 * b2 * b2),
  };
}

/** Slopes into the stream and chordwise lengths of every face of both surfaces. */
function faceSlopes(section: Section): { delta: number; dx: number }[] {
  const out: { delta: number; dx: number }[] = [];
  for (const [surface, sign] of [
    [section.upper, 1],
    [section.lower, -1],
  ] as const) {
    for (let k = 0; k + 1 < surface.length; k++) {
      const a = surface[k]!;
      const b = surface[k + 1]!;
      out.push({ delta: (sign * (b.y - a.y)) / (b.x - a.x), dx: b.x - a.x });
    }
  }
  return out;
}

/** Ackeret's linear wave drag of a section, on the chord: (2 / beta) sum delta^2 dx. */
export function ackeretSectionDrag(section: Section | SymmetricSection, mach: number): number {
  const { c1 } = busemannCoefficients(mach);
  let cd = 0;
  for (const f of faceSlopes(asSection(section))) cd += c1 * f.delta * f.delta * f.dx;
  return cd;
}

/** Busemann's second-order wave drag of a section, on the chord. */
export function busemannSectionDrag(
  section: Section | SymmetricSection,
  mach: number,
  gamma = 1.4,
): number {
  const { c1, c2 } = busemannCoefficients(mach, gamma);
  let cd = 0;
  for (const f of faceSlopes(asSection(section))) {
    cd += (c1 * f.delta * f.delta + c2 * f.delta ** 3) * f.dx;
  }
  return cd;
}
