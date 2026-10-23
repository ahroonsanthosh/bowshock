/**
 * The 3D view's rocket (src/render3d) from the same geometry as the
 * builder's drawing and the side view (./geometry.ts), in calibres: the
 * body the solver is given (./adapter.ts) and the first fin set as drawn
 * there (its outline, thickness, place and roll), so that one geometry
 * serves every view (docs/design/0017-rocketeer-interface.md section 6.1).
 * It is drawn for any rocket the builder makes, whether or not the drag
 * logic takes it; what the 3D view cannot draw is named, never drawn
 * otherwise.
 */

import { doubleWedge, singleWedge, type SymmetricSection } from '../fins/section';
import type { PlateEdge, PlateSection, Rocket } from '../render3d/rocket-mesh';
import { solverBody } from './adapter';
import type { FinEdge, FinSetDesign, RocketDesign } from './design';
import { rocketGeometry } from './geometry';

export interface SceneRocketOf {
  /** The rocket to draw; null if the 3D view cannot draw its body. */
  readonly rocket: Rocket | null;
  /** What of the rocket the 3D view does not draw, in words ("the elliptical fins"). */
  readonly missing: readonly string[];
}

/** A fin's root trailing edge within this of the base (calibres) is at the base. */
const AT_BASE = 1e-9;

/** A flat fin's edge as the 3D view draws it, lengths in calibres. */
function plateEdge(edge: FinEdge, d: number): PlateEdge {
  return edge.kind === 'bevelled' ? { bevel: edge.length / d } : edge.kind;
}

/** The section as drawn: a plate at its own size, or a wedge or diamond in chord units. */
function sectionOf(
  fins: FinSetDesign,
  d: number,
  rootChord: number,
): SymmetricSection | PlateSection | null {
  const s = fins.section;
  const t = fins.thickness / d;
  switch (s.kind) {
    case 'flat':
      return {
        kind: 'flat-plate',
        thickness: t,
        leadingEdge: plateEdge(s.leadingEdge, d),
        trailingEdge: plateEdge(s.trailingEdge, d),
      };
    case 'wedge':
      return singleWedge(t / rootChord);
    case 'diamond':
      return doubleWedge(t / rootChord, s.ridge);
    case 'airfoil':
      return null;
  }
}

/** The 3D view's rocket for this design, and what of it the view does not draw. */
export function sceneRocketOf(design: RocketDesign): SceneRocketOf {
  const missing: string[] = [];
  const { body, whole } = solverBody(design);
  if (!whole) {
    return {
      rocket: null,
      missing: ['the rocket (the 3D view draws a body of one diameter to a flat base)'],
    };
  }
  const geometry = rocketGeometry(design);
  const set = design.finSets[0];
  const drawn = geometry.fins[0];
  if (design.finSets.length > 1) missing.push('the fin sets after the first');
  if (set === undefined || drawn === undefined) return { rocket: { body }, missing };
  if (set.planform.kind !== 'trapezoidal') {
    missing.push(`the ${set.planform.kind} fins`);
    return { rocket: { body }, missing };
  }
  // The outline as drawn: root leading edge, tip leading edge, tip trailing edge, root trailing edge.
  const [rootLead, tipLead, tipTrail, rootTrail] = drawn.outline as [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
  ];
  const span = tipLead[1];
  const rootChord = rootTrail[0] - rootLead[0];
  const section = sectionOf(set, design.nose.diameter, rootChord);
  if (section === null) {
    missing.push(`the ${set.section.kind} fins`);
    return { rocket: { body }, missing };
  }
  const ahead = geometry.length - rootTrail[0];
  return {
    rocket: {
      body,
      fins: {
        count: drawn.count,
        planform: {
          rootChord,
          span,
          tanLeadingEdge: (tipLead[0] - rootLead[0]) / span,
          tanTrailingEdge: (tipTrail[0] - rootTrail[0]) / span,
        },
        section,
        trailingEdgeAheadOfBase: Math.abs(ahead) <= AT_BASE ? 0 : ahead,
        roll: (drawn.rotation * Math.PI) / 180,
      },
    },
    missing,
  };
}
