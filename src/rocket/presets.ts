/**
 * The page's presets (docs/design/0017-rocketeer-interface.md section 9):
 * the Basic Finner, the reference projectile whose free flights tested the
 * total drag, exactly as the drag page has it, and two examples of common
 * amateur rockets, each labelled as an example, not a real rocket.
 */

import { BASIC_FINNER_GEOMETRY, BASIC_FINNER_LENGTHS } from '../validation/basic-finner';
import type { RocketDesign } from './design';

export interface Preset {
  readonly id: string;
  /** As the menu says it. */
  readonly label: string;
  /** One line under it. */
  readonly detail: string;
  readonly example: boolean;
  readonly design: RocketDesign;
}

const MM = 1e-3;

/**
 * The Basic Finner at sea level: its 30 mm caliber, the 20 deg cone and
 * the cylinder to six decimals of a caliber (BASIC_FINNER_LENGTHS, the
 * drag page's own), four rectangular fins of 1 cal chord and span, wedges
 * from a 0.004 cal leading-edge radius to a 0.08 cal trailing edge, at the
 * base.
 */
function basicFinner(): RocketDesign {
  const g = BASIC_FINNER_GEOMETRY;
  const d = g.caliberMetres;
  const nose = d * Number(BASIC_FINNER_LENGTHS.nose);
  const cylinder = d * Number(BASIC_FINNER_LENGTHS.cylinder);
  const chord = d * g.finChord;
  return {
    name: 'Basic Finner',
    nose: { shape: { kind: 'conical' }, length: nose, diameter: d },
    body: [{ kind: 'tube', length: cylinder, diameter: d }],
    finSets: [
      {
        count: g.finCount,
        planform: {
          kind: 'trapezoidal',
          rootChord: chord,
          tipChord: chord,
          span: d * g.finSpan,
          sweepLength: 0,
        },
        thickness: d * g.finTrailingEdgeThickness,
        section: { kind: 'wedge', leadingEdgeRadius: d * g.finLeadingEdgeRadius },
        rootLeadingEdge: nose + cylinder - chord,
        rotation: 0,
        cant: 0,
        filletRadius: 0,
      },
    ],
    otherParts: [],
    flight: { maxMach: 3, altitude: 0, from: "the preset's figure" },
    notes: [],
    source: { kind: 'preset', id: 'basic-finner' },
  };
}

/**
 * A 54 mm minimum-diameter high-power rocket: a 5-caliber tangent ogive,
 * four rectangular fins cut from 1/4 in (6.35 mm) sheet, both edges
 * bevelled over 20 mm, at the base; flown to Mach 2.4 at 1,200 m. (Flat
 * plates at the base are refused since main's e42d5d4, the one
 * measurement of them lying outside the base drag's data; bevelled sheet
 * fins of constant chord are served from Mach 2.0.)
 */
function highPower54(): RocketDesign {
  const d = 54 * MM;
  const nose = 270 * MM;
  const tube = 900 * MM;
  const chord = 100 * MM;
  return {
    name: 'Example: 54 mm high-power rocket',
    nose: { shape: { kind: 'ogive', parameter: 1 }, length: nose, diameter: d },
    body: [{ kind: 'tube', length: tube, diameter: d }],
    finSets: [
      {
        count: 4,
        planform: {
          kind: 'trapezoidal',
          rootChord: chord,
          tipChord: chord,
          span: 50 * MM,
          sweepLength: 0,
        },
        thickness: 6.35 * MM,
        section: {
          kind: 'flat',
          leadingEdge: { kind: 'bevelled', length: 20 * MM },
          trailingEdge: { kind: 'bevelled', length: 20 * MM },
        },
        rootLeadingEdge: nose + tube - chord,
        rotation: 0,
        cant: 0,
        filletRadius: 0,
      },
    ],
    otherParts: [],
    flight: { maxMach: 2.4, altitude: 1200, from: "the example's own figure" },
    notes: [],
    source: { kind: 'preset', id: 'example-54' },
  };
}

/**
 * A 98 mm rocket in the commonest hobby layout: an ogive nose, three
 * tapered, swept fins of 3/16 in (4.76 mm) sheet with rounded edges at the
 * base, and two rail buttons; flown to Mach 1.6 at 1,200 m.
 */
function hobby98(): RocketDesign {
  const d = 98 * MM;
  const nose = 400 * MM;
  const tube = 1400 * MM;
  const root = 200 * MM;
  return {
    name: 'Example: 98 mm rocket, three fins',
    nose: { shape: { kind: 'ogive', parameter: 1 }, length: nose, diameter: d },
    body: [{ kind: 'tube', length: tube, diameter: d }],
    finSets: [
      {
        count: 3,
        planform: {
          kind: 'trapezoidal',
          rootChord: root,
          tipChord: 80 * MM,
          span: 100 * MM,
          sweepLength: 120 * MM,
        },
        thickness: 4.76 * MM,
        section: {
          kind: 'flat',
          leadingEdge: { kind: 'rounded' },
          trailingEdge: { kind: 'rounded' },
        },
        rootLeadingEdge: nose + tube - root,
        rotation: 0,
        cant: 0,
        filletRadius: 0,
      },
    ],
    otherParts: [{ kind: 'rail-button', name: 'Rail buttons', count: 2 }],
    flight: { maxMach: 1.6, altitude: 1200, from: "the example's own figure" },
    notes: [],
    source: { kind: 'preset', id: 'example-98' },
  };
}

export const PRESETS: readonly Preset[] = [
  {
    id: 'basic-finner',
    label: 'Basic Finner',
    detail: 'The test rocket the total drag was checked on, 30 mm',
    example: false,
    design: basicFinner(),
  },
  {
    id: 'example-54',
    label: 'Example: 54 mm, four fins',
    detail: 'A high-power rocket with bevelled sheet fins, not a real rocket',
    example: true,
    design: highPower54(),
  },
  {
    id: 'example-98',
    label: 'Example: 98 mm, three fins',
    detail: 'The commonest hobby layout, not a real rocket',
    example: true,
    design: hobby98(),
  },
];

/** The preset with this id. */
export function preset(id: string): Preset {
  const found = PRESETS.find((p) => p.id === id);
  if (found === undefined) throw new Error(`no preset ${id}`);
  return found;
}
