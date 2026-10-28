/**
 * Everything the drag page shows of the total drag, without the DOM: the
 * page's fields as typed turned into ./total-drag.ts's inputs, the nose
 * solve's outcome turned into the nose term, and the view turned into
 * display blocks (paragraphs, lists, tables) whose every string is final.
 * A page only reads its fields, calls these, and lays the blocks out
 * (./total-drag-render.ts does it for demos/nose-drag.html). Design:
 * docs/design/0011-total-drag-on-the-page.md.
 */

import type { VerifiedDrag } from '../analysis/verified-drag';
import { bodyLength, type Body } from '../geometry/body';
import { BASIC_FINNER_GEOMETRY, BASIC_FINNER_LENGTHS } from '../validation/basic-finner';
import type { RefusedTotalParts } from '../total/refused-floor';
import { outward, outwardPercent } from './band';
import { floorText, notShownLine, PARTS_CAPTION } from './refused-parts';
import { FOOT, flightConditionOf, type AltitudeUnit } from './flight-condition';
import {
  BAND_CAVEAT,
  BASIC_FINNER_CLASS,
  BASIC_FINNER_REYNOLDS_PER_MACH,
  BASIC_FINNER_TEMPERATURE,
  BREAKDOWN_NOTE,
  CLASS_DESCRIPTION,
  NOT_REPRESENTED,
  noseComponentOf,
  outsideReasons,
  parseNumber,
  parseNumberList,
  PUBLISHED_BRL934,
  PUBLISHED_GATE,
  SUB_CLASS_DESCRIPTION,
  type NoseState,
  type PlanformInput,
  type SectionInput,
  type TotalDragForm,
  type TotalDragView,
} from './total-drag';

// ------------------------------------------------------------- the fields

/** The total-drag fields as typed on the page (the body and Mach number are the nose solve's). */
export interface TotalDragFields {
  readonly finCount: string;
  /** 'rectangular', 'trapezoidal' or 'clipped-delta'. */
  readonly planform: string;
  /** Degrees. */
  readonly leadingEdgeSweep: string;
  readonly trailingEdgeSweep: string;
  readonly taperRatio: string;
  readonly rootChord: string;
  readonly span: string;
  /** 'single-wedge', 'double-wedge' or 'hexagonal'. */
  readonly section: string;
  /** The single wedge's trailing-edge thickness, or the others' largest. */
  readonly thickness: string;
  readonly ridge: string;
  readonly frontBevel: string;
  readonly rearBevel: string;
  readonly leadingEdgeRadius: string;
  readonly trailingEdgeAheadOfBase: string;
  /**
   * How the flight condition is given: 'altitude-m' or 'altitude-ft' (an
   * altitude in that unit and the diameter, in the standard atmosphere),
   * or 'reynolds' (the Reynolds number and temperature directly).
   */
  readonly conditionMode: string;
  /** Above mean sea level, in the unit of `conditionMode`. */
  readonly altitude: string;
  /** The body's diameter, mm. */
  readonly diameter: string;
  /** Asked directly ('reynolds'); otherwise implied by the altitude and diameter. */
  readonly reynoldsOnLength: string;
  readonly temperature: string;
  /** Numbers separated by commas or spaces; empty is fully turbulent only. */
  readonly transitionReynolds: string;
  /** Empty is adiabatic only. */
  readonly wallTemperature: string;
  /** All three empty is smooth; an empty end of a given band is zero. */
  readonly roughnessLow: string;
  readonly roughnessHigh: string;
  readonly roughnessSource: string;
}

/** An optional number: empty is none. */
function optional(text: string): number | undefined {
  return text.trim() === '' ? undefined : parseNumber(text);
}

function planformOf(f: TotalDragFields): PlanformInput {
  switch (f.planform) {
    case 'trapezoidal':
      return {
        kind: 'trapezoidal',
        leadingEdgeSweepDegrees: parseNumber(f.leadingEdgeSweep),
        trailingEdgeSweepDegrees: parseNumber(f.trailingEdgeSweep),
      };
    case 'clipped-delta':
      return { kind: 'clipped-delta', taperRatio: parseNumber(f.taperRatio) };
    default:
      return { kind: 'rectangular' };
  }
}

function sectionOf(f: TotalDragFields): SectionInput {
  const thickness = parseNumber(f.thickness);
  switch (f.section) {
    case 'double-wedge':
      return { kind: 'double-wedge', thickness, ridge: parseNumber(f.ridge) };
    case 'hexagonal':
      return {
        kind: 'hexagonal',
        thickness,
        frontBevel: parseNumber(f.frontBevel),
        rearBevel: parseNumber(f.rearBevel),
      };
    case 'plate-rounded-square':
      return { kind: 'flat-plate', thickness, leadingEdge: 'rounded', trailingEdge: 'square' };
    case 'plate-square-square':
      return { kind: 'flat-plate', thickness, leadingEdge: 'square', trailingEdge: 'square' };
    case 'plate-rounded-rounded':
      return { kind: 'flat-plate', thickness, leadingEdge: 'rounded', trailingEdge: 'rounded' };
    default:
      return { kind: 'single-wedge', trailingEdgeThickness: thickness };
  }
}

/** The section values that are flat plates (sheet stock). */
const isPlate = (section: string) => section.startsWith('plate-');

/** The unit of the altitude asked, or null when the Reynolds number is asked directly. */
export function altitudeUnitOf(conditionMode: string): AltitudeUnit | null {
  return conditionMode === 'reynolds' ? null : conditionMode === 'altitude-ft' ? 'ft' : 'm';
}

/**
 * The Reynolds number on length and the static temperature the total
 * takes: as typed in the direct mode; otherwise from the altitude, the
 * Mach number and the diameter in the standard atmosphere
 * (./flight-condition.ts), with every reason when they give none.
 */
export function conditionOf(
  body: Body,
  mach: number,
  f: TotalDragFields,
): {
  readonly reynoldsOnLength: number;
  readonly temperature: number;
  /** Empty when the condition is given. */
  readonly refusals: readonly string[];
} {
  const unit = altitudeUnitOf(f.conditionMode);
  if (unit === null) {
    return {
      reynoldsOnLength: parseNumber(f.reynoldsOnLength),
      temperature: parseNumber(f.temperature),
      refusals: [],
    };
  }
  const c = flightConditionOf({
    altitude: parseNumber(f.altitude),
    altitudeUnit: unit,
    mach,
    diameterMm: parseNumber(f.diameter),
    lengthCalibers: bodyLength(body),
  });
  return c.kind === 'ok'
    ? { reynoldsOnLength: c.value.reynoldsOnLength, temperature: c.value.temperature, refusals: [] }
    : { reynoldsOnLength: Number.NaN, temperature: Number.NaN, refusals: c.reasons };
}

/** 1.40e7, not 1.40e+7. */
const sci = (x: number, digits: number) => x.toExponential(digits).replace('e+', 'e');

/**
 * What the page shows read-only beside an altitude, Mach number and
 * diameter: the Reynolds number on length and the static temperature they
 * imply ('none' when they imply none; the reasons are in the total).
 */
export function impliedConditionText(
  body: Body,
  mach: number,
  f: TotalDragFields,
): { readonly reynolds: string; readonly temperature: string } {
  const c = conditionOf(body, mach, f);
  return c.refusals.length > 0
    ? { reynolds: 'none', temperature: 'none' }
    : { reynolds: sci(c.reynoldsOnLength, 2), temperature: `${c.temperature.toFixed(2)} K` };
}

/**
 * The altitude typed, said in another unit when the unit asked changes
 * (to the centimeter or the tenth of a foot); as typed if it is not a number.
 */
export function altitudeInUnit(text: string, from: AltitudeUnit, to: AltitudeUnit): string {
  const x = parseNumber(text);
  if (from === to || !Number.isFinite(x)) return text;
  return to === 'ft'
    ? String(Number((x / FOOT).toFixed(1)))
    : String(Number((x * FOOT).toFixed(2)));
}

/** The inputs of ./total-drag.ts from the nose solve's body and Mach number and the fields. */
export function formOf(body: Body, mach: number, f: TotalDragFields): TotalDragForm {
  const roughGiven = [f.roughnessLow, f.roughnessHigh, f.roughnessSource].some(
    (t) => t.trim() !== '',
  );
  const condition = conditionOf(body, mach, f);
  return {
    body,
    mach,
    finCount: parseNumber(f.finCount),
    planform: planformOf(f),
    rootChord: parseNumber(f.rootChord),
    span: parseNumber(f.span),
    section: sectionOf(f),
    leadingEdgeRadius: parseNumber(f.leadingEdgeRadius),
    trailingEdgeAheadOfBase: parseNumber(f.trailingEdgeAheadOfBase),
    reynoldsOnLength: condition.reynoldsOnLength,
    temperature: condition.temperature,
    ...(condition.refusals.length > 0 ? { conditionRefusals: condition.refusals } : {}),
    transitionReynolds: parseNumberList(f.transitionReynolds),
    wallTemperature: optional(f.wallTemperature),
    roughness: roughGiven
      ? {
          low: optional(f.roughnessLow) ?? 0,
          high: optional(f.roughnessHigh) ?? 0,
          source: f.roughnessSource,
        }
      : undefined,
  };
}

/**
 * The nose solve's fields for the Basic Finner: its cone and the cylinder
 * to 10 cal overall, to six decimals (BASIC_FINNER_LENGTHS), the body the
 * live flow page solves too (basicFinnerBodyAsTyped).
 */
export const BASIC_FINNER_NOSE_FIELDS = {
  shape: 'conical',
  noseLength: BASIC_FINNER_LENGTHS.nose,
  bodyLength: BASIC_FINNER_LENGTHS.cylinder,
} as const;

/**
 * The Basic Finner's fins and range conditions at a Mach number, keeping
 * the inputs (transition, wall temperature, roughness) and the altitude of
 * `current`. The range's air (293.95 K) was not a standard atmosphere, so
 * its Reynolds number (about 6.6e6 times the Mach number) and temperature
 * are given directly; the diameter is its 30.0 mm.
 */
export function basicFinnerFields(mach: number, current: TotalDragFields): TotalDragFields {
  const c = BASIC_FINNER_CLASS;
  return {
    ...current,
    finCount: String(c.finCount),
    planform: 'rectangular',
    rootChord: String(c.rootChord),
    span: String(c.span),
    section: 'single-wedge',
    thickness: String(c.trailingEdgeThickness),
    leadingEdgeRadius: String(c.leadingEdgeRadius),
    trailingEdgeAheadOfBase: '0',
    conditionMode: 'reynolds',
    diameter: String(1000 * BASIC_FINNER_GEOMETRY.caliberMetres),
    reynoldsOnLength: Number.isFinite(mach)
      ? sci(BASIC_FINNER_REYNOLDS_PER_MACH * mach, 2)
      : current.reynoldsOnLength,
    temperature: BASIC_FINNER_TEMPERATURE.toFixed(2),
  };
}

/** Which of the fields that depend on other fields are asked, and the names that change. */
export function fieldsShown(f: Pick<TotalDragFields, 'planform' | 'section' | 'conditionMode'>): {
  readonly sweeps: boolean;
  readonly taperRatio: boolean;
  readonly ridge: boolean;
  readonly bevels: boolean;
  /** Not for a flat plate, whose rounded edges are a full radius. */
  readonly leadingEdgeRadius: boolean;
  readonly thicknessLabel: string;
  /** The altitude and diameter, and the Reynolds number and temperature they imply. */
  readonly altitude: boolean;
  readonly altitudeLabel: string;
  /** The Reynolds number and temperature, typed. */
  readonly reynolds: boolean;
} {
  const unit = altitudeUnitOf(f.conditionMode);
  return {
    sweeps: f.planform === 'trapezoidal',
    taperRatio: f.planform === 'clipped-delta',
    ridge: f.section === 'double-wedge',
    bevels: f.section === 'hexagonal',
    leadingEdgeRadius: !isPlate(f.section),
    thicknessLabel:
      f.section === 'single-wedge'
        ? 'Trailing-edge thickness'
        : isPlate(f.section)
          ? 'Plate thickness'
          : 'Largest thickness',
    altitude: unit !== null,
    altitudeLabel: `Altitude (${unit ?? 'm'})`,
    reynolds: unit === null,
  };
}

/** The overall length shown beside the fields. */
export function overallLengthText(body: Body): string {
  const length = bodyLength(body);
  return Number.isFinite(length) ? `${Number(length.toFixed(4))} calibers` : '';
}

// ------------------------------------------------------------- the nose

/** What a nose solve is for: its body and Mach number. A total uses it only while these hold. */
export function noseKeyOf(body: Body, mach: number): string {
  return JSON.stringify([body, mach]);
}

/** The nose term without WebGPU. */
export const NO_WEBGPU: NoseState = {
  kind: 'refused',
  message: 'the nose wave drag is solved on the GPU, and this browser provides no WebGPU',
};

/** A solve that threw: a case the solver refuses, or a failure of the GPU. */
export interface NoseSolveError {
  readonly kind: 'error';
  readonly message: string;
  readonly gpuFailed: boolean;
}

/**
 * The nose term a solve's outcome gives the total: its value and band
 * when it has a band, a refusal with the reason when it has none or was
 * refused, and null (no result: the total waits) when stopped or when the
 * GPU failed.
 */
export function noseStateOf(outcome: VerifiedDrag | NoseSolveError): NoseState | null {
  switch (outcome.kind) {
    case 'cancelled':
      return null;
    case 'invalid':
      return {
        kind: 'refused',
        message: `the nose wave drag was not solved: on the grid at refinement ${outcome.refinement}, ${outcome.reason}`,
      };
    case 'not-converged':
      return {
        kind: 'refused',
        message: `the nose wave drag was not solved: the grid at refinement ${outcome.refinement} did not converge`,
      };
    case 'error':
      return outcome.gpuFailed
        ? null
        : {
            kind: 'refused',
            message: `the nose wave drag cannot be solved here: ${outcome.message}`,
          };
    case 'solved':
      return outcome.uncertainty === undefined
        ? {
            kind: 'refused',
            message:
              'the nose wave drag has no measured error band (not verified), and the total ' +
              'needs one',
          }
        : {
            kind: 'solved',
            component: noseComponentOf({
              value: outcome.estimate.value,
              uncertainty: outcome.uncertainty,
              grids: outcome.levels.length,
              floor: outcome.floor,
            }),
            verified: outcome.verified,
          };
  }
}

// ------------------------------------------------------------ the display

/** 'ok' only for a total inside the BRL sub-class, the one validated claim (0014 section 10.7 (q)). */
export type Tone = 'plain' | 'ok' | 'warn' | 'muted';

/** What the page lays out, every string final. */
export type DisplayBlock =
  | {
      readonly kind: 'paragraph';
      readonly text: string;
      readonly tone: Tone;
      /** The result itself, shown larger. */
      readonly headline: boolean;
    }
  | { readonly kind: 'list'; readonly items: readonly string[] }
  | {
      readonly kind: 'table';
      readonly caption: string;
      readonly head: readonly string[];
      readonly rows: readonly (readonly string[])[];
      /** Columns of numbers, which do not wrap. */
      readonly numeric: readonly number[];
    }
  /** The claim, set apart: validated only inside the BRL sub-class (0014 section 10.7 (q)). */
  | {
      readonly kind: 'box';
      readonly tone: 'ok' | 'warn';
      readonly blocks: readonly DisplayBlock[];
    };

const p = (text: string, tone: Tone = 'plain', headline = false): DisplayBlock => ({
  kind: 'paragraph',
  text,
  tone,
  headline,
});
const list = (items: readonly string[]): DisplayBlock => ({ kind: 'list', items });

/** C_D to four decimals; bands rounded outward to the same. */
const DIGITS = 4;
const interval = (low: number, high: number) => outward(low, high, DIGITS).join(' to ');

export const PENDING_TEXT =
  'No total yet: run the solve above for this nose, body and Mach number. The total takes its ' +
  'nose wave drag and band; the other components are computed here and none of them is refused.';
export const INSIDE_PENDING_TEXT =
  "This case lies inside the Basic Finner's class: the total will be an estimate, not " +
  'validated, while the claim is suspended (the fins-on-base factor was corrected after the ' +
  "test, and the corrected factor's own test passed at conditions outside the class; design " +
  'record 0010, section 11.7, and design record 0014, section 10.7 (q)).';
export const SUB_CLASS_PENDING_TEXT =
  "This case lies inside the Basic Finner's narrow BRL sub-class, the conditions at which BRL " +
  "Report 934's range A tested this model once and it passed: the total will be labelled " +
  'validated, with what that test can and cannot say (design record 0014, section 10.7 (q)).';
export const ESTIMATE_TOLERANCE_TEXT =
  "The Basic Finner's test was wide: with the corrected fins-on-base factor its tolerance is " +
  '-20.0% to -27.0% and +23.3% to +28.6% of the modelled total over the 11 shots (-24.0% to ' +
  '-24.8% and +23.3% to +23.5% at the three inside the class).';

/** The end of a validated total's headline: what it rests on, in a few words. */
export const VALIDATED_HEADLINE = "validated, on one test (BRL Report 934's range A)";

/** The total-drag output for a view. */
export function totalDragDisplay(view: TotalDragView): DisplayBlock[] {
  switch (view.kind) {
    case 'refused':
      return [
        p('Total drag refused: no number is given. Every reason:', 'warn', true),
        list(view.refusals.map((r) => `${r.component} (${r.reason}): ${r.message}.`)),
        ...(view.parts === null ? [] : refusedPartsBlocks(view.parts)),
      ];
    case 'pending':
      if (view.subClass.inside) {
        return [p(PENDING_TEXT, 'plain', true), p(SUB_CLASS_PENDING_TEXT, 'muted')];
      }
      return view.check.inside
        ? [p(PENDING_TEXT, 'plain', true), p(INSIDE_PENDING_TEXT, 'muted')]
        : [
            p(PENDING_TEXT, 'plain', true),
            p(
              "This case lies outside the Basic Finner's class and its BRL sub-class, so the " +
                'total will be an estimate, not validated:',
              'muted',
            ),
            list(outsideReasons(view.check, view.subClass)),
          ];
    case 'total': {
      // Validated only inside the BRL sub-class (0014 section 10.7 (q)); an estimate elsewhere.
      const { total, claim } = view;
      const validated = claim.kind === 'validated';
      const claimBlocks: DisplayBlock[] =
        claim.kind === 'validated'
          ? [p(claim.text), ...claim.caveats.map((c) => p(c))]
          : [
              p(claim.text),
              p('Not validated because:'),
              list(claim.reasons),
              p(ESTIMATE_TOLERANCE_TEXT),
            ];
      return [
        p(
          `Total C_D = ${total.cd.toFixed(DIGITS)}, model-form band ${interval(total.low, total.high)} ` +
            `(${outwardPercent(total.low / total.cd - 1, total.high / total.cd - 1)}): ` +
            (validated ? VALIDATED_HEADLINE : 'an estimate, not validated'),
          validated ? 'ok' : 'warn',
          true,
        ),
        { kind: 'box', tone: validated ? 'ok' : 'warn', blocks: claimBlocks },
        p(BAND_CAVEAT, 'muted'),
        {
          kind: 'table',
          caption:
            "Input bands: each the change of the total between its input's ends, kept apart " +
            'from the model-form band',
          head: ['Input', 'Change of C_D', 'What it is'],
          rows: total.inputs.map((i) => [
            i.name,
            i.low === 0 && i.high === 0 ? 'none' : interval(i.low, i.high),
            i.label,
          ]),
          numeric: [1],
        },
        p(
          'With every input band added linearly to the model-form band: ' +
            `${interval(view.withInputs[0], view.withInputs[1])}.`,
          'muted',
        ),
        {
          kind: 'table',
          caption: "Components, on the body's cross-section",
          head: ['Component', 'C_D', 'Band', 'Share', 'What it is', 'Band from'],
          rows: total.components.map((c) => [
            c.name,
            c.cd.toFixed(DIGITS),
            interval(c.low, c.high),
            `${Math.round((100 * c.cd) / total.cd)}%`,
            c.label,
            c.band,
          ]),
          numeric: [1, 2, 3],
        },
        p(BREAKDOWN_NOTE, 'muted'),
        list(view.notes),
        p(NOT_REPRESENTED, 'muted'),
      ];
    }
  }
}

/**
 * A refused total's parts served, each with its band and label, the input
 * bands where any is not zero, the parts not shown, and the floor or why
 * none is given (0011 section 10).
 */
function refusedPartsBlocks(parts: RefusedTotalParts): DisplayBlock[] {
  const out: DisplayBlock[] = [];
  if (parts.served.length > 0) {
    out.push({
      kind: 'table',
      caption: PARTS_CAPTION,
      head: ['Component', 'C_D', 'Band', 'What it is', 'Band from'],
      rows: parts.served.map((c) => [
        c.name,
        c.cd.toFixed(DIGITS),
        interval(c.low, c.high),
        c.label,
        c.band,
      ]),
      numeric: [1, 2],
    });
  }
  if (parts.inputs.some((i) => i.low !== 0 || i.high !== 0)) {
    out.push({
      kind: 'table',
      caption: "Input bands: each the change of the served parts between its input's ends",
      head: ['Input', 'Change of C_D', 'What it is'],
      rows: parts.inputs.map((i) => [
        i.name,
        i.low === 0 && i.high === 0 ? 'none' : interval(i.low, i.high),
        i.label,
      ]),
      numeric: [1],
    });
  }
  if (parts.notShown.length > 0) out.push(list(parts.notShown.map((x) => `${notShownLine(x)}.`)));
  out.push(p(floorText(parts.floor), parts.floor.kind === 'floor' ? 'plain' : 'muted'));
  return out;
}

/** When the computation itself fails unexpectedly: no number. */
export function failureDisplay(message: string): DisplayBlock[] {
  return [p(`The total could not be computed: ${message}. No number is given.`, 'warn', true)];
}

const signedPercent = (x: number) => `${x > 0 ? '+' : ''}${x.toFixed(1)}%`;

/**
 * The class in words and the gate's 11 shots, corrected, with the second run's residuals (0010
 * sections 4.2, 11); then the BRL sub-class in words and range A's seven rounds (0020).
 */
export function gateDisplay(): DisplayBlock[] {
  return [
    p(CLASS_DESCRIPTION, 'muted'),
    {
      kind: 'table',
      caption:
        'The Basic Finner gate re-run with the corrected fins-on-base factor (design record 0010 ' +
        'section 11): a recorded correction made after the residuals were known, not a new test, ' +
        'beside the second run (its section 4.2); tolerances as re-derived after an independent ' +
        'audit (its section 10); residual: measured CX0 over modelled, minus 1; each band rounded ' +
        'outward, other values to the nearest last digit shown; bands and tolerances as the run ' +
        "formed them, except that the trailing edges' band at the Mach 1.799 shot widened at both " +
        'ends since (design record 0019 section 3.4.1, F4), also after the gate was used, and that ' +
        "row shows it; the body base's band was widened after the run too (design record 0014, " +
        'section 10.7 (ah)), which the table does not show: a total on this page now shows a wider ' +
        'band and the tolerances would be -21.5% to -28.5% and +26.5% to +31.3%; no residual and ' +
        'no verdict changes',
      head: [
        'Shot',
        'Mach',
        'CX0 measured',
        'Modelled C_D (band)',
        'Residual',
        'Tolerance',
        'Second run',
      ],
      rows: PUBLISHED_GATE.map((s) => [
        s.shot,
        s.mach.toFixed(3),
        s.cx0.toFixed(3),
        `${s.cd.toFixed(4)} (${s.low.toFixed(4)} to ${s.high.toFixed(4)})`,
        signedPercent(s.residual),
        `${signedPercent(s.tolerance[0])} to ${signedPercent(s.tolerance[1])}`,
        signedPercent(s.secondRun),
      ]),
      numeric: [1, 2, 3, 4, 5, 6],
    },
    p(
      'In the gate the nose was the exact Taylor-Maccoll value, and the inputs were a laminar ' +
        'run to Re_T 5e5, 1.6e6 and 3e6 and the wall from adiabatic to the air temperature; the ' +
        "tolerance adds those input bands and each Mach cluster's own shot-to-shot spread to the " +
        'model-form band. The five shots at Mach 1.06 to 1.33 are refused, as on this page.',
      'muted',
    ),
    p(SUB_CLASS_DESCRIPTION, 'muted'),
    {
      kind: 'table',
      caption:
        "BRL Report 934's range A, run once as registered (design record 0020): the present " +
        'model at its seven rounds, with sharp fin leading edges; residual: zero-yaw CD0 over ' +
        'modelled, minus 1; each band rounded outward, other values to the nearest last digit ' +
        "shown; bands and tolerances as the run formed them: the body base's band was widened " +
        'after it (design record 0014, section 10.7 (ah)), so a total on this page now shows a ' +
        'wider band and the tolerances would be -26.5% to -29.0% and +30.4% to +31.0%; no ' +
        'residual and no verdict changes',
      head: ['Round', 'Mach', 'CD0 measured', 'Modelled C_D (band)', 'Residual', 'Tolerance'],
      rows: PUBLISHED_BRL934.map((r) => [
        String(r.round),
        r.mach.toFixed(3),
        r.cd0.toFixed(4),
        `${r.cd.toFixed(4)} (${r.low.toFixed(4)} to ${r.high.toFixed(4)})`,
        signedPercent(r.residual),
        `${signedPercent(r.tolerance[0])} to ${signedPercent(r.tolerance[1])}`,
      ]),
      numeric: [1, 2, 3, 4, 5],
    },
    p(
      'Every round lies inside its tolerance, and every residual is positive: the model reads ' +
        'low at every round, by 7.3% on average in both groups. In the run the nose was the ' +
        'exact Taylor-Maccoll value (on this page it is the solve, within its band of it), the ' +
        "models' diameter 0.78 to 0.82 in and the range's air 288 to 298 K were run at both ends " +
        'as an input band, and the inputs and the spread of each group of rounds were added as ' +
        "for the Basic Finner gate. Beside the verdict, not part of it: with DREV's 0.004 cal " +
        'rounded edge the rounds at Mach 1.80 to 1.83 are refused (the Reynolds number on the ' +
        "edge's diameter below 6.7e3, the lowest at which a rounded edge is served, at the " +
        'nominal or at an end of the diameter and air) and those at Mach 2.42 and 2.47 move to ' +
        '-1.1% and -4.2%; with the trailing-edge term halved (a tapered trailing edge, 0.16 ' +
        'cal^2) the residuals rise to +14.5% to +22.3%, every round still inside. The rebuilt ' +
        "fins-on-base factor refuses the Basic Finner's wedges at every round: it has no " +
        'hold-out (design record 0020).',
      'muted',
    ),
  ];
}

/** The text of blocks as a page shows it, block by block (for tests and plain-text views). */
export function displayText(blocks: readonly DisplayBlock[]): string {
  return blocks
    .map((b): string => {
      switch (b.kind) {
        case 'paragraph':
          return b.text;
        case 'list':
          return b.items.join('');
        case 'table':
          return [b.caption, ...b.head, ...b.rows.flat()].join('');
        case 'box':
          return displayText(b.blocks);
      }
    })
    .join('');
}
