/**
 * A rocket as a rocketeer describes it: the model the page's builder edits
 * and the OpenRocket importer (src/import/) maps an .ork file into
 * (docs/design/0017-rocketeer-interface.md section 4).
 *
 * Every length is absolute, in metres, as OpenRocket stores them (its
 * radii are given here as diameters, twice its values); angles are in
 * degrees. The model describes the rocket's outside as it is, including
 * what the drag logic cannot represent (a boat-tail, an elliptical fin, a
 * launch lug, an airfoiled section): src/rocket/adapter.ts turns it into
 * the logic's inputs (TotalDragForm in src/app/total-drag.ts, in calibres)
 * and names every feature it cannot represent, with the reason. Nothing is
 * dropped here: a feature the model itself has no place for is kept as a
 * note (DesignNote), so that the page can say so.
 *
 * Positions run along the rocket's axis from the nose's tip, aft positive.
 * The nose and the body sections follow one another without gaps, in the
 * order given; the rocket's base is the aft end of the last body section
 * (or of the nose, if there is none).
 */

import type { NoseShape } from '../geometry/nose';

export interface RocketDesign {
  /** What to call it: the preset's name, or the rocket's name in the .ork. */
  readonly name: string;
  readonly nose: NoseDesign;
  /** The body behind the nose, front to back: tubes and transitions. */
  readonly body: readonly BodySection[];
  /** The fin sets, in any order. */
  readonly finSets: readonly FinSetDesign[];
  /** Other parts outside the body (launch lugs, rail buttons, pods). */
  readonly otherParts: readonly OtherPart[];
  readonly flight: FlightDesign;
  /** What the source held that this model has no place for, each said on the page. */
  readonly notes: readonly DesignNote[];
  readonly source: DesignSource;
}

/**
 * The nose cone: its shape and parameter as src/geometry/nose.ts takes them
 * (OpenRocket's own definitions: conical, ogive, ellipsoid, power, parabolic,
 * haack), from its tip to its aft end. A shoulder inside the body tube is
 * not part of the outside and is not given.
 */
export interface NoseDesign {
  readonly shape: NoseShape;
  /** From the tip to the aft end (OpenRocket's length), m. */
  readonly length: number;
  /** Outer diameter at the aft end (OpenRocket's aft radius times 2), m. */
  readonly diameter: number;
}

export type BodySection =
  /** A body tube (OpenRocket's BodyTube): a cylinder. */
  | {
      readonly kind: 'tube';
      readonly length: number;
      /** Outer diameter (OpenRocket's outer radius times 2), m. */
      readonly diameter: number;
    }
  /**
   * A transition (OpenRocket's Transition): a boat-tail when it narrows
   * aft, a shoulder or flare when it widens; its profile is a nose shape
   * between the two diameters.
   */
  | {
      readonly kind: 'transition';
      readonly length: number;
      readonly foreDiameter: number;
      readonly aftDiameter: number;
      readonly shape: NoseShape;
      /**
       * OpenRocket's clipped profile (its default for the ellipsoid, power
       * and Haack shapes): the part of a nose of the larger diameter that
       * lies between the two diameters, rather than the nose shape laid
       * between them. By default not clipped.
       */
      readonly clipped?: boolean;
    };

/** A set of identical fins spaced evenly around the body. */
export interface FinSetDesign {
  readonly count: number;
  readonly planform: FinPlanform;
  /** The fins' thickness (largest), m. */
  readonly thickness: number;
  readonly section: FinSection;
  /** From the nose's tip to the leading edge of the fins' root, m (OpenRocket's position, resolved). */
  readonly rootLeadingEdge: number;
  /**
   * Where the first fin points, degrees about the axis from straight up in
   * the side view, positive toward the viewer (OpenRocket's fin rotation);
   * the others follow at 360 / count apart. It changes only the drawing.
   */
  readonly rotation: number;
  /** Cant, degrees; 0 is aligned with the axis. */
  readonly cant: number;
  /** The fillets' radius where the fins meet the body, m; 0 is none. */
  readonly filletRadius: number;
}

/** One fin's outline, in its own plane: x aft from the root's leading edge, y out from the body's surface. */
export type FinPlanform =
  /**
   * OpenRocket's trapezoidal fin set. Rectangular is a trapezoid with the
   * tip chord equal to the root chord and no sweep.
   */
  | {
      readonly kind: 'trapezoidal';
      readonly rootChord: number;
      readonly tipChord: number;
      /** From the body's surface to the tip (OpenRocket's height), m. */
      readonly span: number;
      /** How far aft the tip's leading edge lies behind the root's (OpenRocket's sweep length), m. */
      readonly sweepLength: number;
    }
  /** OpenRocket's elliptical fin set: half an ellipse on the root chord. */
  | { readonly kind: 'elliptical'; readonly rootChord: number; readonly span: number }
  /** OpenRocket's freeform fin set: its outline's points, root leading edge first, m. */
  | { readonly kind: 'freeform'; readonly points: readonly (readonly [number, number])[] };

/** How a fin's edge is cut, seen in its section. */
export type FinEdge =
  /** Cut square: a flat face the fin's thickness across. */
  | { readonly kind: 'square' }
  /** Rounded to half a circle of the fin's thickness. */
  | { readonly kind: 'rounded' }
  /** Bevelled (tapered) to a sharp edge over this length along the chord, m. */
  | { readonly kind: 'bevelled'; readonly length: number };

/** The fins' section (their cross-section along the chord). */
export type FinSection =
  /** A flat plate of the fin's thickness, each edge cut as given (OpenRocket's square and rounded sections). */
  | { readonly kind: 'flat'; readonly leadingEdge: FinEdge; readonly trailingEdge: FinEdge }
  /**
   * A wedge, thickening steadily from the leading edge (sharp, or rounded to
   * `leadingEdgeRadius`) to a square trailing edge the fin's thickness
   * across: the Basic Finner's fins.
   */
  | { readonly kind: 'wedge'; readonly leadingEdgeRadius: number }
  /** A diamond (double wedge): sharp at both edges, thickest at `ridge`, a fraction of the chord. */
  | { readonly kind: 'diamond'; readonly ridge: number }
  /** OpenRocket's airfoil section: a smooth symmetric profile. */
  | { readonly kind: 'airfoil' };

/** An other part's size, m, as its source gives it: each field only where it applies. */
export interface PartSize {
  /** Along the axis. */
  readonly length?: number;
  /** Outer diameter. */
  readonly diameter?: number;
  readonly innerDiameter?: number;
  /** How far it stands out from the body's surface (rail buttons). */
  readonly height?: number;
  readonly baseHeight?: number;
  readonly flangeHeight?: number;
  readonly screwHeight?: number;
  /** Wall thickness (lugs, tube fins). */
  readonly thickness?: number;
  /** Between one and the next along the axis, for more than one. */
  readonly separation?: number;
  /** From the rocket's axis to the part's axis (pods, boosters). */
  readonly radialOffset?: number;
  /** How far it reaches aft of the base (an inner part or a motor reaching out). */
  readonly reachAftOfBase?: number;
}

/** A part outside the body other than fins. */
export interface OtherPart {
  readonly kind: 'launch-lug' | 'rail-button' | 'pod' | 'other';
  /** As the source names it. */
  readonly name: string;
  /** How many. */
  readonly count: number;
  /** Its size, where the source gives it. */
  readonly size?: PartSize;
  /** Its front, m from the nose's tip, where the source places it. */
  readonly front?: number;
  /** The first one's roll angle, degrees, where the source gives one. */
  readonly rotation?: number;
}

/** The flight the rocket makes, and the air the curve is computed in. */
export interface FlightDesign {
  /**
   * The highest Mach number the rocket flies to, marked on the curve (which
   * runs from Mach 1.0 to 3.0 whatever it is; 0017, the owner's rule).
   */
  readonly maxMach: number;
  /** Geometric altitude above mean sea level at which the curve is computed, m (U.S. Standard Atmosphere, 1976). */
  readonly altitude: number;
  /** Where these numbers came from, in plain words ("the file's simulation ..."); by default typed. */
  readonly from?: string;
}

/** Something in the source the model has no place for, as the importer says it. */
export interface DesignNote {
  /** What it is, in the source's words (a component's name, a setting). */
  readonly feature: string;
  /** Why it is not in the model, in plain words. */
  readonly reason: string;
}

export type DesignSource =
  | { readonly kind: 'preset'; readonly id: string }
  | { readonly kind: 'openrocket'; readonly fileName: string }
  | { readonly kind: 'typed' };

/** The rocket's base: the aft end of its last body section, m from the tip. */
export function baseStation(design: RocketDesign): number {
  return design.nose.length + design.body.reduce((sum, s) => sum + s.length, 0);
}
