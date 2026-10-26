/**
 * A population of amateur and student rockets that fly beyond Mach 1, for
 * the refusal audit of docs/design/0014-refusals.md. Every weight and range
 * is stated in ./README.md with its source or marked as an assumption.
 *
 * Deterministic: a seeded generator (mulberry32), so a re-run gives the same
 * population.
 */

export type NoseKind =
  | 'von-karman'
  | 'lv-haack'
  | 'tangent-ogive'
  | 'conical'
  | 'ellipsoid'
  | 'parabolic'
  | 'power-half';

export type SectionKind =
  /** Flat plate, leading edge rounded to a full radius, square-cut trailing edge. */
  | 'rounded-le-square-te'
  /** Flat plate, both edges rounded. */
  | 'rounded-both'
  /** Flat plate, both edges square-cut. */
  | 'square-both'
  /** Flat plate, both edges bevelled to a sharp edge (wedge-flat-wedge). */
  | 'bevel-both'
  /** Flat plate, leading edge bevelled sharp, trailing edge square-cut. */
  | 'bevel-le-square-te'
  /** Sharp double wedge or other sharp airfoil (high-power composite fins). */
  | 'double-wedge';

export type PlanformKind = 'rectangular' | 'clipped-delta' | 'swept-te';

export interface Rocket {
  readonly id: number;
  /** Body diameter, metres. */
  readonly diameter: number;
  readonly nose: NoseKind;
  /** Nose length over diameter. */
  readonly noseFineness: number;
  /** Tip radius over base radius; 0 for a sharp tip (below 0.02, see README). */
  readonly tipRadiusRatio: number;
  /** Overall length (to the base) over diameter. */
  readonly overallFineness: number;
  readonly finCount: 3 | 4;
  readonly planform: PlanformKind;
  /** Root chord, span, tip chord, metres; sweeps in degrees. */
  readonly rootChord: number;
  readonly span: number;
  readonly tipChord: number;
  readonly leadingEdgeSweepDeg: number;
  readonly trailingEdgeSweepDeg: number;
  readonly section: SectionKind;
  /** Fin thickness, metres. */
  readonly thickness: number;
  /** Bevel half-angle where bevelled, degrees. */
  readonly bevelDeg: number;
  /** Root trailing edge ahead of the base, in root chords. */
  readonly trailingEdgeAheadChords: number;
  readonly boatTail: boolean;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Weights {
  readonly nose: Readonly<Record<NoseKind, number>>;
  readonly roundedTip: number;
  readonly fourFins: number;
  readonly planform: Readonly<Record<PlanformKind, number>>;
  readonly section: Readonly<Record<SectionKind, number>>;
  /** Shares of fins at the base, within a chord of it, a chord or more ahead. */
  readonly finPosition: readonly [number, number, number];
  readonly boatTail: number;
}

/** The baseline weights (README: sources and assumptions). */
export const BASELINE: Weights = {
  nose: {
    'von-karman': 0.45,
    'lv-haack': 0.03,
    'tangent-ogive': 0.3,
    conical: 0.12,
    ellipsoid: 0.03,
    parabolic: 0.04,
    'power-half': 0.03,
  },
  roundedTip: 0.5,
  fourFins: 0.45,
  planform: { rectangular: 0.05, 'clipped-delta': 0.65, 'swept-te': 0.3 },
  section: {
    'rounded-le-square-te': 0.3,
    'rounded-both': 0.15,
    'square-both': 0.15,
    'bevel-both': 0.2,
    'bevel-le-square-te': 0.1,
    'double-wedge': 0.1,
  },
  finPosition: [0.85, 0.1, 0.05],
  boatTail: 0.15,
};

function pick<K extends string>(r: number, weights: Readonly<Record<K, number>>): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let acc = 0;
  for (const [k, w] of entries) {
    acc += w / total;
    if (r < acc) return k;
  }
  return entries[entries.length - 1]![0];
}

const uniform = (r: number, lo: number, hi: number) => lo + r * (hi - lo);

/** Diameters, metres, with their shares (README). */
export const DIAMETERS: readonly (readonly [number, number])[] = [
  [0.038, 0.15],
  [0.054, 0.3],
  [0.075, 0.2],
  [0.098, 0.2],
  [0.152, 0.15],
];

/** Fin thickness range by diameter, metres (G10 and plywood stock, README). */
function thicknessRange(d: number): [number, number] {
  if (d <= 0.04) return [0.0016, 0.0024];
  if (d <= 0.06) return [0.0016, 0.0032];
  if (d <= 0.08) return [0.0024, 0.0032];
  if (d <= 0.1) return [0.0032, 0.0048];
  return [0.0032, 0.0064];
}

function noseFineness(kind: NoseKind, r: number): number {
  switch (kind) {
    case 'von-karman':
    case 'lv-haack':
      return uniform(r, 4, 6);
    case 'tangent-ogive':
    case 'conical':
    case 'parabolic':
    case 'power-half':
      return uniform(r, 3, 5);
    case 'ellipsoid':
      return uniform(r, 2, 3);
  }
}

export function population(n: number, seed = 20261020, w: Weights = BASELINE): Rocket[] {
  const rand = mulberry32(seed);
  const out: Rocket[] = [];
  for (let id = 0; id < n; id++) {
    let rd = rand();
    let diameter = DIAMETERS[DIAMETERS.length - 1]![0];
    for (const [d, share] of DIAMETERS) {
      if (rd < share) {
        diameter = d;
        break;
      }
      rd -= share;
    }
    const nose = pick(rand(), w.nose);
    const fineness = noseFineness(nose, rand());
    // Ellipsoids have no tip to round; the rest by the share.
    const rounded = nose !== 'ellipsoid' && rand() < w.roundedTip;
    const tipRadiusRatio = rounded ? uniform(rand(), 0.03, 0.15) : 0;
    const overallFineness = uniform(rand(), 8, 18);
    const finCount = rand() < w.fourFins ? 4 : 3;
    const planform = pick(rand(), w.planform);
    const rootChord = uniform(rand(), 1.0, 2.5) * diameter;
    const span = uniform(rand(), 0.6, 1.5) * diameter;
    let tipChord: number;
    let le: number;
    let te: number;
    if (planform === 'rectangular') {
      tipChord = rootChord;
      le = 0;
      te = 0;
    } else if (planform === 'clipped-delta') {
      tipChord = uniform(rand(), 0.2, 0.6) * rootChord;
      le = (Math.atan((rootChord - tipChord) / span) * 180) / Math.PI;
      te = 0;
    } else {
      // Leading edge swept 20 to 60 deg, trailing edge swept back, tip chord 0.3 to 0.7 root.
      le = uniform(rand(), 20, 60);
      tipChord = uniform(rand(), 0.3, 0.7) * rootChord;
      const tanTe = Math.tan((le * Math.PI) / 180) - (rootChord - tipChord) / span;
      te = (Math.atan(tanTe) * 180) / Math.PI;
      if (te < 1) {
        // Would sweep the trailing edge forward: a clipped delta instead.
        le = (Math.atan((rootChord - tipChord) / span) * 180) / Math.PI;
        te = 0;
      }
    }
    const section = pick(rand(), w.section);
    const [tLo, tHi] = thicknessRange(diameter);
    const thickness = uniform(rand(), tLo, tHi);
    const bevelDeg = uniform(rand(), 8, 15);
    const rp = rand();
    const [atBase, near] = w.finPosition;
    const boatTail = rand() < w.boatTail;
    const rx = rand();
    // A boat-tail starts behind the fins: their trailing edges then lie a
    // boat-tail's length ahead of the base, 0.3 to 0.9 root chords (RIT's
    // 6 in boat-tail behind 12 in fins, README).
    const trailingEdgeAheadChords = boatTail
      ? uniform(rx, 0.3, 0.9)
      : rp < atBase
        ? 0
        : rp < atBase + near
          ? uniform(rx, 0.1, 0.9)
          : uniform(rx, 1.0, 1.5);
    // The fins lie on the cylinder, with at least a calibre of it ahead of them.
    const shortest = fineness + (rootChord / diameter) * (1 + trailingEdgeAheadChords) + 1;
    out.push({
      id,
      diameter,
      nose,
      noseFineness: fineness,
      tipRadiusRatio,
      overallFineness: Math.max(overallFineness, shortest),
      finCount,
      planform,
      rootChord,
      span,
      tipChord,
      leadingEdgeSweepDeg: le,
      trailingEdgeSweepDeg: te,
      section,
      thickness,
      bevelDeg,
      trailingEdgeAheadChords,
      boatTail,
    });
  }
  return out;
}

/** The International Standard Atmosphere to 20 km: temperature K, density kg/m^3, viscosity Pa s. */
export function atmosphere(altitudeKm: number): { t: number; rho: number; mu: number; a: number } {
  const R = 287.05287;
  const g = 9.80665;
  let t: number;
  let p: number;
  if (altitudeKm <= 11) {
    t = 288.15 - 6.5 * altitudeKm;
    p = 101325 * (t / 288.15) ** (g / (R * 0.0065));
  } else {
    t = 216.65;
    const p11 = 101325 * (216.65 / 288.15) ** (g / (R * 0.0065));
    p = p11 * Math.exp((-g * (altitudeKm - 11) * 1000) / (R * t));
  }
  const rho = p / (R * t);
  const mu = (1.458e-6 * t ** 1.5) / (t + 110.4);
  return { t, rho, mu, a: Math.sqrt(1.4 * R * t) };
}

export const MACH_BANDS = [
  [1.0, 1.2],
  [1.2, 1.5],
  [1.5, 1.8],
  [1.8, 3.0],
] as const;

/** Altitude at the condition, km: 60% at 0 to 5, 30% at 5 to 12, 10% at 12 to 20 (README). */
export function drawAltitude(r1: number, r2: number): number {
  if (r1 < 0.6) return uniform(r2, 0, 5);
  if (r1 < 0.9) return uniform(r2, 5, 12);
  return uniform(r2, 12, 20);
}

/**
 * The boat-tail's shape (design record 0023 section 6, registered
 * 2026-10-26 before its served range exists). Its length is the
 * population's own: a boat-tail starts behind the fins, whose trailing
 * edges lie 0.3 to 0.9 root chords ahead of the base. Its base is a motor
 * retainer's, RETAINER_WALLS wider than the motor: the largest standard
 * motor whose retainer fits inside the body, or the next size down
 * (assumptions, README). Its angle follows. The size is drawn from a
 * generator of its own for each rocket, keyed on its id, so that the
 * population above is unchanged and a rocket's shape does not depend on
 * which others are drawn.
 */
export const BOAT_TAIL_SEED = 20261026;

/** Standard motor diameters, metres. */
export const MOTOR_DIAMETERS: readonly number[] = [0.018, 0.024, 0.029, 0.038, 0.054, 0.075, 0.098];

/** A motor retainer's diameter over the motor's, metres (two 3 mm walls; assumption, README). */
export const RETAINER_WALLS = 0.006;

/** Share of boat-tails ending at the next motor size down from the largest that fits (the rest at that one). */
export const SMALLER_MOTOR = 1 / 3;

export interface BoatTailShape {
  /** From the shoulder to the base, calibres. */
  readonly lengthCalibres: number;
  /** Base diameter over the body's. */
  readonly baseRatio: number;
  /** Half-angle, degrees. */
  readonly angleDeg: number;
}

/** A rocket's boat-tail shape, or undefined if it has none. */
export function boatTailShape(
  r: Rocket,
  seed = BOAT_TAIL_SEED,
  smallerMotor = SMALLER_MOTOR,
): BoatTailShape | undefined {
  if (!r.boatTail) return undefined;
  const draw = mulberry32((seed ^ Math.imul(r.id + 1, 0x9e3779b1)) >>> 0)();
  const fits = MOTOR_DIAMETERS.filter((m) => m + RETAINER_WALLS < r.diameter);
  const motor = fits[Math.max(0, fits.length - (draw < smallerMotor ? 2 : 1))]!;
  const baseRatio = (motor + RETAINER_WALLS) / r.diameter;
  const lengthCalibres = (r.trailingEdgeAheadChords * r.rootChord) / r.diameter;
  const angleDeg = (Math.atan((1 - baseRatio) / (2 * lengthCalibres)) * 180) / Math.PI;
  return { lengthCalibres, baseRatio, angleDeg };
}
