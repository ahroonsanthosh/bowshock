/**
 * What a refused total still shows (docs/design/0011-total-drag-on-the-page.md
 * section 10, the owner's decision 7.8): every part `finnedBodyComponents`
 * serves, each with its band and label, unchanged; and a one-sided floor,
 * "a floor, not an estimate", the sum of the served parts' low ends and the
 * input bands' low ends, offered only where every refused part is shown not
 * to be negative (section 10.3), else withheld with every reason (10.4).
 *
 * Which refused parts are not negative:
 *
 * - fin friction and the fins' trailing-edge base: always (shear along the
 *   stream; a base pressure below the free stream's);
 * - fin wave drag of a closed section (sharp at both edges): always (a
 *   closed body's drag in steady flow, design record 0019 section 3.2
 *   (L1) to (L3));
 * - fin wave drag of a single wedge (a half-body with a base) and the
 *   leading edges of a flat plate (a half-body with parallel faces): only
 *   with supersonic edges (`supersonicEdgeFailures`), where neither the
 *   trailing edge nor the body's base reaches them ((L4), (L5));
 * - the leading edges of any other section, the body base and the nose:
 *   not argued, so the floor is withheld.
 *
 * The formulas of (L5) are re-implemented here, not imported:
 * src/fins/rounded-edge-bounded.ts stays unwired, as its test pins.
 */

import { tipChord } from '../fins/planform';
import { isFlatPlate, type SymmetricSection } from '../fins/section';
import type { FinnedBody, FinnedBodyComponents, FlightConditions } from './finned-body';
import type { DragComponent, InputBand } from './total-drag';

const GAMMA = 1.4;

/** The lowest free-stream Mach number at which a refused edge counts as not negative (0011 section 10.3, item 1). */
export const FLOOR_EDGE_MACH = 1.5;
/** 0019 section 3.2 (L5): the transonic similarity parameter's magnitude, (4/pi)^(2/3). */
export const FLOOR_XI_MIN = (4 / Math.PI) ** (2 / 3);
/** 0019 section 3.2 (L5): the boundary layer's displacement growth along the body, rad. */
const BOUNDARY_LAYER_TURNING = 0.004;
/** 0019 section 3.2 (L5): the free stream's floor for the boundary layer alone. */
const FREE_STREAM_FLOOR = 1.06;

/** The floor's label, word for word (0011 section 10.5), the refused parts named. */
export function floorLabel(refused: readonly string[], withInputs: boolean): string {
  return (
    "a floor, not an estimate: the sum of the served parts' low ends; the refused parts " +
    `(${refused.join(', ')}) are not negative` +
    (withInputs ? "; the input bands' low ends are added" : '')
  );
}

export type RefusedFloor =
  | {
      readonly kind: 'floor';
      /** C_D: the sum of the served parts' low ends and the input bands' low ends. */
      readonly value: number;
      /** The refused parts, each named once. */
      readonly refused: readonly string[];
      /** Whether an input band's low end below zero is in it. */
      readonly withInputs: boolean;
      /** `floorLabel`'s text. */
      readonly label: string;
    }
  | { readonly kind: 'withheld'; readonly reasons: readonly string[] };

export interface PartNotShown {
  readonly name: string;
  readonly reason: string;
}

export interface RefusedTotalParts {
  /** Every part served, as `finnedBodyComponents` reports it. */
  readonly served: readonly DragComponent[];
  /** The input bands, as reported. */
  readonly inputs: readonly InputBand[];
  /** Parts `src/total` computed that are not the fin as drawn (0011 section 10.1). */
  readonly notShown: readonly PartNotShown[];
  readonly floor: RefusedFloor;
}

/** The nose term's state, for the floor: served, or why it gives no part. */
export type NoseForFloor =
  { readonly kind: 'served' } | { readonly kind: 'not-solved'; readonly reason: string };

const NOSE = 'nose wave drag';

const fixed = (x: number, digits: number) => x.toFixed(digits);

/**
 * Every condition of 0011 section 10.3's "supersonic edges" the fins fail,
 * in words; empty where all four hold.
 */
export function supersonicEdgeFailures(config: FinnedBody, conditions: FlightConditions): string[] {
  const { fins } = config;
  const mach = conditions.mach;
  const out: string[] = [];
  if (!(mach >= FLOOR_EDGE_MACH)) {
    out.push(`the Mach number ${mach} is below ${FLOOR_EDGE_MACH.toFixed(1)}`);
  }
  const tanLe = Math.abs(fins.planform.tanLeadingEdge);
  const tanTe = Math.abs(fins.planform.tanTrailingEdge);
  const machLe = mach * Math.cos(Math.atan(tanLe));
  if (!(machLe >= 1)) {
    out.push(`the Mach number normal to the leading edge, ${fixed(machLe, 3)}, is below 1`);
  }
  // The trailing edge's thickness at the shortest chord, and the largest (for the body's flow).
  const root = fins.planform.rootChord;
  const tip = tipChord(fins.planform);
  const shortest = Math.min(root, tip);
  const plate = isFlatPlate(fins.section) ? fins.section : undefined;
  let tShort: number;
  let tLargest: number;
  if (plate !== undefined) {
    tShort = plate.thickness;
    tLargest = plate.thickness;
  } else {
    const s = fins.section as SymmetricSection;
    const h = s.bluntTrailingEdge === true ? s.halfThickness[s.halfThickness.length - 1]! : 0;
    const maxH = Math.max(...s.halfThickness);
    tShort = 2 * h * shortest;
    tLargest = 2 * maxH * Math.max(root, tip);
  }
  const cosTe = Math.cos(Math.atan(tanTe));
  const machTe = mach * cosTe;
  const tau = tShort / (shortest * cosTe);
  const xi =
    tau > 0 ? (1 - machTe * machTe) / ((GAMMA + 1) * machTe * machTe * tau) ** (2 / 3) : -Infinity;
  if (!(machTe > 1 && xi <= -FLOOR_XI_MIN)) {
    out.push(
      `the flow normal to the trailing edge is not supersonic outside its transonic range ` +
        `(normal Mach number ${fixed(machTe, 3)}` +
        (Number.isFinite(xi)
          ? `, transonic parameter ${fixed(xi, 2)} against at most -${fixed(FLOOR_XI_MIN, 3)}`
          : '') +
        ')',
    );
  }
  if (tanLe > 0) {
    const theta =
      BOUNDARY_LAYER_TURNING +
      (fins.count * tLargest) / (2 * Math.PI * config.body.nose.baseRadius * tanLe);
    const floor = Math.max(
      FREE_STREAM_FLOOR,
      Math.sqrt(1 + 2 * ((3 * (GAMMA + 1) * theta) / 2) ** (2 / 3)),
    );
    if (!(mach >= floor)) {
      out.push(
        `the Mach number ${mach} is below ${fixed(floor, 3)}, the lowest at which the flow along ` +
          "the body stays supersonic past these fins' swept leading edges (design record 0019, " +
          'section 3.2 (L5))',
      );
    }
  }
  return out;
}

/**
 * Whether a refused part is shown not to be negative (0011 section 10.3):
 * null where it is, else the reason the floor is withheld.
 */
export function refusedPartWithholds(
  name: string,
  config: FinnedBody,
  conditions: FlightConditions,
): string | null {
  const plate = isFlatPlate(config.fins.section) ? config.fins.section : undefined;
  const edges = () => supersonicEdgeFailures(config, conditions);
  switch (name) {
    case 'fin friction':
    case 'fin trailing-edge base':
      return null;
    case 'fin wave drag': {
      if (plate !== undefined) return null; // zero by the geometry; never refused
      const s = config.fins.section as SymmetricSection;
      if (s.bluntTrailingEdge !== true) return null; // a closed section
      const failed = edges();
      return failed.length === 0
        ? null
        : 'the fin wave drag of a single wedge (a blunt trailing edge) is refused, and its faces ' +
            'are shown not to be negative only with supersonic edges (design record 0011, section ' +
            `10.3): ${failed.join('; ')}`;
    }
    case 'fin leading edges': {
      if (plate === undefined) {
        return (
          'the rounded leading edge of this section is refused, and with it the faces of the ' +
          'rounded wedge; the sign of the two together is not argued (design record 0011, ' +
          'section 10.3)'
        );
      }
      const failed = edges();
      return failed.length === 0
        ? null
        : "the fin leading edges are refused, and a flat plate's leading edge is shown not to " +
            "be negative only with supersonic edges, its trailing edge and the body's base " +
            `lowering it otherwise (design record 0011, section 10.3): ${failed.join('; ')}`;
    }
    case 'body base':
      return (
        'the body base is refused, and its sign with these fins or this afterbody is not ' +
        'argued (design record 0011, section 10.2)'
      );
    default:
      return `the ${name} is refused, and its sign is not argued (design record 0011, section 10.3)`;
  }
}

/** The text of a part not shown (0011 section 10.5). */
export const SHARP_SECTION_NOT_SHOWN =
  'it is computed for the sharp section, and the faces of the rounded wedge are not computed ' +
  'while its rounded leading edge is refused';

/**
 * The parts a refused total shows, and its floor or every reason it is
 * withheld. `parts` is `finnedBodyComponents`' result for this
 * configuration, its first component the nose term given (shown only where
 * `nose` is served).
 */
export function refusedTotalParts(
  config: FinnedBody,
  conditions: FlightConditions,
  parts: FinnedBodyComponents,
  nose: NoseForFloor,
): RefusedTotalParts {
  const refusedNames = [...new Set(parts.refusals.map((r) => r.component))];
  const withheld: string[] = [];
  if (nose.kind !== 'served') withheld.push(nose.reason);
  let served = parts.components.filter((c) => nose.kind === 'served' || c.name !== NOSE);
  const notShown: PartNotShown[] = [];
  // A rounded leading edge refused on a section that is not a plate: the wave drag computed is
  // the sharp section's, not the fin's (0011 section 10.1).
  const roundedOnSection =
    !isFlatPlate(config.fins.section) &&
    config.fins.leadingEdgeRadius !== 0 &&
    refusedNames.includes('fin leading edges');
  if (roundedOnSection && served.some((c) => c.name === 'fin wave drag')) {
    served = served.filter((c) => c.name !== 'fin wave drag');
    notShown.push({ name: 'fin wave drag', reason: SHARP_SECTION_NOT_SHOWN });
  }
  for (const name of refusedNames) {
    if (name === NOSE) continue; // the nose's reason is `nose`'s
    const reason = refusedPartWithholds(name, config, conditions);
    if (reason !== null && !withheld.includes(reason)) withheld.push(reason);
  }
  const inputs = parts.inputs;
  if (withheld.length > 0) {
    return { served, inputs, notShown, floor: { kind: 'withheld', reasons: withheld } };
  }
  const withInputs = inputs.some((i) => i.low < 0);
  const value =
    served.reduce((sum, c) => sum + c.low, 0) + inputs.reduce((sum, i) => sum + i.low, 0);
  const refused = refusedNames.filter((n) => n !== NOSE);
  return {
    served,
    inputs,
    notShown,
    floor: {
      kind: 'floor',
      value,
      refused,
      withInputs,
      label: floorLabel(refused, withInputs),
    },
  };
}
