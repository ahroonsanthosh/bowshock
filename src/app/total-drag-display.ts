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
import { outward, outwardPercent } from './band';
import {
  BAND_CAVEAT,
  BASIC_FINNER_CLASS,
  BASIC_FINNER_REYNOLDS_PER_MACH,
  BASIC_FINNER_TEMPERATURE,
  BREAKDOWN_NOTE,
  CLASS_DESCRIPTION,
  NOT_REPRESENTED,
  noseComponentOf,
  OFFSET_CAVEAT,
  parseNumber,
  parseNumberList,
  PUBLISHED_GATE,
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
    default:
      return { kind: 'single-wedge', trailingEdgeThickness: thickness };
  }
}

/** The inputs of ./total-drag.ts from the nose solve's body and Mach number and the fields. */
export function formOf(body: Body, mach: number, f: TotalDragFields): TotalDragForm {
  const roughGiven = [f.roughnessLow, f.roughnessHigh, f.roughnessSource].some(
    (t) => t.trim() !== '',
  );
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
    reynoldsOnLength: parseNumber(f.reynoldsOnLength),
    temperature: parseNumber(f.temperature),
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

/** The nose solve's fields for the Basic Finner: its cone, and the cylinder to 10 cal overall. */
export const BASIC_FINNER_NOSE_FIELDS = {
  shape: 'conical',
  noseLength: BASIC_FINNER_CLASS.noseLength.toFixed(3),
  bodyLength: (
    BASIC_FINNER_CLASS.length - Number(BASIC_FINNER_CLASS.noseLength.toFixed(3))
  ).toFixed(3),
} as const;

/**
 * The Basic Finner's fins and range conditions at a Mach number (its
 * Reynolds number about 6.6e6 times the Mach number), keeping the inputs
 * (transition, wall temperature, roughness) of `current`.
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
    reynoldsOnLength: Number.isFinite(mach)
      ? (BASIC_FINNER_REYNOLDS_PER_MACH * mach).toExponential(2).replace('e+', 'e')
      : current.reynoldsOnLength,
    temperature: BASIC_FINNER_TEMPERATURE.toFixed(2),
  };
}

/** Which of the fields that depend on the planform and section are asked, and the thickness's name. */
export function fieldsShown(f: Pick<TotalDragFields, 'planform' | 'section'>): {
  readonly sweeps: boolean;
  readonly taperRatio: boolean;
  readonly ridge: boolean;
  readonly bevels: boolean;
  readonly thicknessLabel: string;
} {
  return {
    sweeps: f.planform === 'trapezoidal',
    taperRatio: f.planform === 'clipped-delta',
    ridge: f.section === 'double-wedge',
    bevels: f.section === 'hexagonal',
    thicknessLabel: f.section === 'single-wedge' ? 'Trailing-edge thickness' : 'Largest thickness',
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
            }),
          };
  }
}

// ------------------------------------------------------------ the display

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
  /** The claim, set apart. */
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
export const NEAR_MACH_3_TEXT =
  'This Mach number lies nearer those two shots, at Mach 2.97, than any other gated shot.';
export const ESTIMATE_TOLERANCE_TEXT =
  'Even inside the class the test is wide: its tolerance was -19.5% to -26.2% and +23.1% to ' +
  '+27.4% of the modelled total.';

/** The total-drag output for a view. */
export function totalDragDisplay(view: TotalDragView): DisplayBlock[] {
  switch (view.kind) {
    case 'refused':
      return [
        p('Total drag refused: no number is given. Every reason:', 'warn', true),
        list(view.refusals.map((r) => `${r.component} (${r.reason}): ${r.message}.`)),
      ];
    case 'pending':
      return view.check.inside
        ? [
            p(PENDING_TEXT, 'plain', true),
            p(
              'This case lies inside the class tested by the Basic Finner: the total will be ' +
                'labelled validated on it, with the tolerance and the offset at Mach 2.97 beside it.',
              'muted',
            ),
          ]
        : [
            p(PENDING_TEXT, 'plain', true),
            p(
              'This case lies outside the class tested by the Basic Finner, so the total will be ' +
                'an estimate, not validated:',
              'muted',
            ),
            list(view.check.outside),
          ];
    case 'total': {
      const { total, claim } = view;
      const validated = claim.kind === 'validated';
      const claimBlocks: DisplayBlock[] =
        claim.kind === 'validated'
          ? [
              p(claim.text),
              ...claim.caveats.map((c) =>
                p(c, claim.nearMach3 && c === OFFSET_CAVEAT ? 'warn' : 'plain'),
              ),
              ...(claim.nearMach3 ? [p(NEAR_MACH_3_TEXT, 'warn')] : []),
            ]
          : [
              p(claim.text),
              p('Outside the class because:'),
              list(claim.reasons),
              p(ESTIMATE_TOLERANCE_TEXT),
            ];
      return [
        p(
          `Total C_D = ${total.cd.toFixed(DIGITS)}, model-form band ${interval(total.low, total.high)} ` +
            `(${outwardPercent(total.low / total.cd - 1, total.high / total.cd - 1)})` +
            (validated ? '' : ': an estimate, not validated'),
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

/** When the computation itself fails unexpectedly: no number. */
export function failureDisplay(message: string): DisplayBlock[] {
  return [p(`The total could not be computed: ${message}. No number is given.`, 'warn', true)];
}

const signedPercent = (x: number) => `${x > 0 ? '+' : ''}${x.toFixed(1)}%`;

/** The class in words and the gate's 11 shots as published in 0010 section 4.2. */
export function gateDisplay(): DisplayBlock[] {
  return [
    p(CLASS_DESCRIPTION, 'muted'),
    {
      kind: 'table',
      caption:
        'The Basic Finner gate, second run, as published in design record 0010 section 4.2, ' +
        'with the tolerances re-derived after an independent audit (its section 10; residual: ' +
        'measured CX0 over modelled, minus 1; values to the nearest last digit shown)',
      head: ['Shot', 'Mach', 'CX0 measured', 'Modelled C_D (band)', 'Residual', 'Tolerance'],
      rows: PUBLISHED_GATE.map((s) => [
        s.shot,
        s.mach.toFixed(3),
        s.cx0.toFixed(3),
        `${s.cd.toFixed(4)} (${s.low.toFixed(4)} to ${s.high.toFixed(4)})`,
        signedPercent(s.residual),
        `${signedPercent(s.tolerance[0])} to ${signedPercent(s.tolerance[1])}`,
      ]),
      numeric: [1, 2, 3, 4, 5],
    },
    p(
      'In the gate the nose was the exact Taylor-Maccoll value, and the inputs were a laminar ' +
        'run to Re_T 5e5, 1.6e6 and 3e6 and the wall from adiabatic to the air temperature; the ' +
        "tolerance adds those input bands and each Mach cluster's own shot-to-shot spread to the " +
        'model-form band. The five shots at Mach 1.06 to 1.33 are refused, as on this page.',
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
