/**
 * The rocket as a rocketeer describes it (./design.ts, metres) turned into
 * the drag logic's inputs at one Mach number (TotalDragForm of
 * src/app/total-drag.ts, lengths in calibres), or every feature the logic
 * cannot represent exactly, each with its reason and what could change it
 * (docs/design/0017-rocketeer-interface.md section 4.2). Nothing is
 * approximated here: a feature is mapped to a form that is the same shape,
 * or it is named.
 *
 * Parts the logic does not model but whose absence can be chosen (launch
 * lugs, rail buttons, pods, fillets, cant) are not refused: the page says
 * that bowshock does not model them and offers to compute the rocket
 * without them, and only once the user has chosen that (`without`) is a
 * form given, with those parts named, so that every number shown for it
 * is labelled as being without them (the owner's rule of 2026-10-21).
 */

import { flightConditionOf } from '../app/flight-condition';
import type { PlanformInput, SectionInput, TotalDragForm } from '../app/total-drag';
import type { FinSetDesign, OtherPart, RocketDesign } from './design';
import { baseStation } from './design';

/** A feature the logic cannot represent: no number while it is there. */
export interface NotModelled {
  /** The feature, in plain words ("a boat-tail"). */
  readonly feature: string;
  /** Why the logic cannot take it. */
  readonly reason: string;
  /** What the user could change to get a number. */
  readonly change: string;
}

/** A part bowshock does not model, which the user may choose to compute without. */
export interface Excludable {
  /** As the labels say it: "the launch lug", "the 2 rail buttons". */
  readonly part: string;
}

export type DesignForm =
  /** The logic's inputs; `without` names the parts left out by the user's choice (empty if none). */
  | { readonly kind: 'form'; readonly form: TotalDragForm; readonly without: readonly string[] }
  /** Features the logic cannot represent (and any parts to choose about, listed too). */
  | {
      readonly kind: 'not-modelled';
      readonly features: readonly NotModelled[];
      readonly excludable: readonly Excludable[];
    }
  /** Parts the user must choose to compute without before a number is given. */
  | { readonly kind: 'choose'; readonly excludable: readonly Excludable[] };

export interface AdapterOptions {
  /** The user chose "Compute without it" for the parts bowshock does not model. */
  readonly without: boolean;
  /**
   * Whether the logic takes flat plates of uniform thickness (SectionInput
   * 'flat-plate', on the w34-fin-edges branch until it reaches main).
   */
  readonly flatPlates?: boolean;
}

/** Relative difference within which two diameters are the same (rounding in a file). */
const SAME = 1e-9;
const sameLength = (a: number, b: number) => Math.abs(a - b) <= SAME * Math.max(a, b);

const DEG = 180 / Math.PI;

/** The parts the user may compute without, in the words the labels use. */
export function excludableParts(design: RocketDesign): Excludable[] {
  const parts: Excludable[] = [];
  const named = (p: OtherPart): string => {
    const what =
      p.kind === 'launch-lug'
        ? ['launch lug', 'launch lugs']
        : p.kind === 'rail-button'
          ? ['rail button', 'rail buttons']
          : p.kind === 'pod'
            ? ['pod', 'pods']
            : [p.name, p.name];
    return p.count === 1 ? `the ${what[0]!}` : `the ${p.count} ${what[1]!}`;
  };
  for (const p of design.otherParts) parts.push({ part: named(p) });
  for (const fins of design.finSets) {
    if (fins.filletRadius > 0) parts.push({ part: 'the fin fillets' });
    if (fins.cant !== 0) parts.push({ part: "the fins' cant" });
  }
  return parts;
}

/** The body: one diameter from the nose to a flat base, or what is not. */
function bodyOf(design: RocketDesign, flags: NotModelled[]): number {
  const d = design.nose.diameter;
  let cylinder = 0;
  for (const s of design.body) {
    if (s.kind === 'transition') {
      const narrows = s.aftDiameter < s.foreDiameter;
      flags.push({
        feature: narrows ? 'a boat-tail' : 'a transition',
        reason:
          'the drag logic takes one diameter from the nose to a flat base; base drag is ' +
          'measured only behind a straight body',
        change: 'a body of one diameter to a flat base',
      });
    } else if (!sameLength(s.diameter, d)) {
      flags.push({
        feature: 'body tubes of more than one diameter',
        reason: 'the drag logic takes one diameter from the nose to a flat base',
        change: "body tubes of the nose's diameter",
      });
    } else {
      cylinder += s.length;
    }
  }
  return cylinder;
}

/** The planform as the logic takes it, or why not. */
function planformOf(fins: FinSetDesign, flags: NotModelled[]): PlanformInput | null {
  const p = fins.planform;
  if (p.kind === 'elliptical') {
    flags.push({
      feature: 'elliptical fins',
      reason: 'the drag logic takes fins with straight edges (trapezoids)',
      change: 'trapezoidal fins',
    });
    return null;
  }
  if (p.kind === 'freeform') {
    flags.push({
      feature: 'freeform fins',
      reason: 'the drag logic takes fins with straight edges (trapezoids)',
      change: 'trapezoidal fins',
    });
    return null;
  }
  if (p.sweepLength === 0 && p.tipChord === p.rootChord) return { kind: 'rectangular' };
  return {
    kind: 'trapezoidal',
    leadingEdgeSweepDegrees: Math.atan2(p.sweepLength, p.span) * DEG,
    trailingEdgeSweepDegrees: Math.atan2(p.sweepLength + p.tipChord - p.rootChord, p.span) * DEG,
  };
}

/** Whether the fin's chord is the same along its span (then a section in chord units is exact). */
function constantChord(fins: FinSetDesign): boolean {
  const p = fins.planform;
  return p.kind === 'trapezoidal' && sameLength(p.tipChord, p.rootChord);
}

const TAPERED: Omit<NotModelled, 'feature'> = {
  reason:
    'the drag logic takes this section in proportion to the chord along the span, so on a ' +
    'tapered fin its thickness and bevels would shrink toward the tip, which the real fin’s ' +
    'do not',
  change: 'fins of constant chord, or flat plates with square or rounded edges',
};

/** The section as the logic takes it (lengths in calibres), or why not. */
function sectionOf(
  fins: FinSetDesign,
  d: number,
  flatPlates: boolean,
  flags: NotModelled[],
): { section: SectionInput; leadingEdgeRadius: number } | null {
  const s = fins.section;
  const t = fins.thickness / d;
  const root = fins.planform.kind === 'trapezoidal' ? fins.planform.rootChord : NaN;
  const inChordUnits = (feature: string): boolean => {
    if (constantChord(fins)) return true;
    flags.push({ feature: `tapered ${feature}`, ...TAPERED });
    return false;
  };
  switch (s.kind) {
    case 'airfoil':
      flags.push({
        feature: 'airfoil-shaped fins',
        reason: 'the drag logic has no section for a smooth airfoil',
        change: 'flat fins with bevelled edges, or a wedge or diamond section',
      });
      return null;
    case 'wedge':
      if (!inChordUnits('wedge fins')) return null;
      return {
        section: { kind: 'single-wedge', trailingEdgeThickness: t },
        leadingEdgeRadius: s.leadingEdgeRadius / d,
      };
    case 'diamond':
      if (!inChordUnits('diamond fins')) return null;
      return {
        section: { kind: 'double-wedge', thickness: t, ridge: s.ridge },
        leadingEdgeRadius: 0,
      };
    case 'flat': {
      const le = s.leadingEdge;
      const te = s.trailingEdge;
      if (le.kind === 'bevelled' && te.kind === 'bevelled') {
        if (!inChordUnits('fins with bevelled edges')) return null;
        return {
          section: {
            kind: 'hexagonal',
            thickness: t,
            frontBevel: le.length / root,
            rearBevel: te.length / root,
          },
          leadingEdgeRadius: 0,
        };
      }
      if (le.kind !== 'bevelled' && te.kind !== 'bevelled') {
        if (!flatPlates) {
          flags.push({
            feature: `flat fins with ${le.kind} leading and ${te.kind} trailing edges`,
            reason:
              'the drag logic takes flat plates of uniform thickness from its next update ' +
              '(design record 0016), not yet on this build',
            change: 'bevelled edges',
          });
          return null;
        }
        return plateSection(t, le.kind, te.kind);
      }
      flags.push({
        feature:
          le.kind === 'bevelled'
            ? `a bevelled leading edge with a ${te.kind} trailing edge`
            : `a ${le.kind} leading edge with a bevelled trailing edge`,
        reason:
          le.kind === 'bevelled' && te.kind === 'square'
            ? 'the fin methods have this section, but the drag logic’s inputs do not yet ' +
              '(design record 0014, F12)'
            : 'the drag logic has no section for this pair of edges',
        change: 'both edges bevelled, or neither',
      });
      return null;
    }
  }
}

/**
 * A flat plate as the logic takes it on the w34-fin-edges branch: its
 * thickness absolute (here in calibres), its edges as cut. Typed loosely
 * until the branch reaches main, where SectionInput has this member.
 */
function plateSection(
  thickness: number,
  leadingEdge: 'square' | 'rounded',
  trailingEdge: 'square' | 'rounded',
): { section: SectionInput; leadingEdgeRadius: number } {
  const plate = { kind: 'flat-plate', thickness, leadingEdge, trailingEdge };
  return { section: plate as unknown as SectionInput, leadingEdgeRadius: 0 };
}

/**
 * How far a station lies ahead of the base, m: zero when within a
 * millionth of a millimetre of it, the rounding of positions summed from
 * a file or a preset (the logic treats fins at the base as exactly there).
 */
export function aheadOfBase(design: RocketDesign, station: number): number {
  const ahead = baseStation(design) - station;
  return Math.abs(ahead) <= 1e-9 ? 0 : ahead;
}

/** The logic's inputs for this rocket at this Mach number, or why there are none. */
export function designForm(
  design: RocketDesign,
  mach: number,
  options: AdapterOptions,
): DesignForm {
  const flags: NotModelled[] = [];
  const d = design.nose.diameter;
  const cylinder = bodyOf(design, flags);
  if (design.finSets.length === 0) {
    flags.push({
      feature: 'a rocket without fins',
      reason: 'the drag logic takes a body with one set of fins',
      change: 'a set of fins',
    });
  } else if (design.finSets.length > 1) {
    flags.push({
      feature: 'more than one set of fins',
      reason: 'the drag logic takes one set of identical fins',
      change: 'one set of fins',
    });
  }
  const fins = design.finSets[0];
  const planform = fins === undefined ? null : planformOf(fins, flags);
  const section =
    fins === undefined || planform === null
      ? null
      : sectionOf(fins, d, options.flatPlates ?? false, flags);
  const excludable = excludableParts(design);
  if (flags.length > 0 || fins === undefined || planform === null || section === null) {
    return { kind: 'not-modelled', features: flags, excludable };
  }
  if (excludable.length > 0 && !options.without) return { kind: 'choose', excludable };

  const p = fins.planform as Extract<FinSetDesign['planform'], { kind: 'trapezoidal' }>;
  const body = {
    nose: { shape: design.nose.shape, length: design.nose.length / d, baseRadius: 0.5 },
    cylinderLength: cylinder / d,
  };
  const lengthCalibers = body.nose.length + body.cylinderLength;
  const condition = flightConditionOf({
    altitude: design.flight.altitude,
    altitudeUnit: 'm',
    mach,
    diameterMm: d * 1000,
    lengthCalibers,
  });
  const form: TotalDragForm = {
    body,
    mach,
    finCount: fins.count,
    planform,
    rootChord: p.rootChord / d,
    span: p.span / d,
    section: section.section,
    leadingEdgeRadius: section.leadingEdgeRadius,
    trailingEdgeAheadOfBase: aheadOfBase(design, fins.rootLeadingEdge + p.rootChord) / d,
    reynoldsOnLength: condition.kind === 'ok' ? condition.value.reynoldsOnLength : Number.NaN,
    temperature: condition.kind === 'ok' ? condition.value.temperature : Number.NaN,
    ...(condition.kind === 'ok' ? {} : { conditionRefusals: condition.reasons }),
    transitionReynolds: [],
    wallTemperature: undefined,
    roughness: undefined,
  };
  return { kind: 'form', form, without: excludable.map((e) => e.part) };
}

/** "without the launch lug and the fin fillets", or '' for none. */
export function withoutText(parts: readonly string[]): string {
  if (parts.length === 0) return '';
  const list =
    parts.length === 1
      ? parts[0]!
      : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]!}`;
  return `without ${list}`;
}
