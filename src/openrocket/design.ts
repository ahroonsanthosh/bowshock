/**
 * The design the import produces: a stand-in for src/rocket's RocketDesign
 * until it is committed, holding what the drag model takes, in metres.
 * The body reuses src/geometry's Body and Nose (and so NoseShape); the
 * fin section is the flat plate of the w34-fin-edges branch
 * (src/fins/section.ts FlatPlate there), with its thickness in metres.
 *
 * docs/design/0018-openrocket-import.md section 4.
 */

import type { Body } from '../geometry/body';

/** A flat plate of uniform thickness with the shapes of its edges (a rounded edge is a full radius). */
export interface FlatPlateSection {
  readonly kind: 'flat-plate';
  /** Metres. */
  readonly thickness: number;
  readonly leadingEdge: 'rounded' | 'square';
  readonly trailingEdge: 'rounded' | 'square';
}

/** One set of identical fins, evenly spaced round the body, with straight edges and a tip parallel to the root. */
export interface DesignFinSet {
  readonly count: number;
  readonly rootChord: number;
  /** Zero for a pointed tip. */
  readonly tipChord: number;
  /** Exposed span, from the body's surface to the tip. */
  readonly span: number;
  /** Axial distance from the root's leading edge to the tip's leading edge (negative: swept forward). */
  readonly sweepLength: number;
  /** Distance of the root's trailing edge ahead of the base (0: at the base). */
  readonly trailingEdgeAheadOfBase: number;
  readonly section: FlatPlateSection;
}

/** A nose and a cylinder to a flat base, with at most one fin set; lengths in metres. */
export interface ImportedDesign {
  readonly body: Body;
  readonly fins: DesignFinSet | null;
}
