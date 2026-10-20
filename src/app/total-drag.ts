/**
 * The total drag on the drag page (demos/nose-drag.html), without the DOM:
 * the page's inputs turned into src/total's configuration, the nose term
 * taken from the page's own verified solve, and the claim the result may
 * carry. Design: docs/design/0011-total-drag-on-the-page.md; the claims
 * are those of docs/design/0010-base-drag-and-total.md section 7.
 *
 * What the page shows, from `totalDragView`:
 *
 * - **refused**: every reason src/total (or the nose solve, or an input)
 *   gives, and no number;
 * - **awaiting the nose**: every other component computes, but the nose
 *   has not been solved for this nose, body and Mach number (no number);
 * - **total**: src/total's C_D with its model-form band, each input band
 *   apart, each component with its band and label, and the claim:
 *   "validated on the Basic Finner" inside the class of `basicFinnerClass`,
 *   "estimate, not validated" outside it.
 */

import { FITTED_DRAG_FLOOR } from '../analysis/verified-drag';
import type { BodyBaseDrag } from '../base/base-drag';
import { clippedDeltaPlanform, trapezoidalPlanform, type Planform } from '../fins/planform';
import { doubleWedge, hexagonal, singleWedge, type SymmetricSection } from '../fins/section';
import { bodyLength, validateBody, type Body } from '../geometry/body';
import {
  finnedBodyComponents,
  type DragInputs,
  type FinnedBody,
  type FlightConditions,
} from '../total/finned-body';
import {
  bandWithInputs,
  combineComponents,
  type ComponentRefusal,
  type DragComponent,
  type TotalDrag,
} from '../total/total-drag';
import { BASIC_FINNER_GEOMETRY, BASIC_FINNER_SHOTS } from '../validation/basic-finner';

const DEG = Math.PI / 180;

export type PlanformInput =
  | { readonly kind: 'rectangular' }
  | {
      readonly kind: 'trapezoidal';
      readonly leadingEdgeSweepDegrees: number;
      readonly trailingEdgeSweepDegrees: number;
    }
  | { readonly kind: 'clipped-delta'; readonly taperRatio: number };

/** Thicknesses in calibres; ridge and bevels as fractions of the chord. */
export type SectionInput =
  | { readonly kind: 'single-wedge'; readonly trailingEdgeThickness: number }
  | { readonly kind: 'double-wedge'; readonly thickness: number; readonly ridge: number }
  | {
      readonly kind: 'hexagonal';
      readonly thickness: number;
      readonly frontBevel: number;
      readonly rearBevel: number;
    };

/** The page's inputs for the total, lengths in calibres. */
export interface TotalDragForm {
  /** The body of the nose solve: nose and cylinder to the flat base, base radius 0.5. */
  readonly body: Body;
  readonly mach: number;
  readonly finCount: number;
  readonly planform: PlanformInput;
  readonly rootChord: number;
  /** Exposed span, from the body's surface. */
  readonly span: number;
  readonly section: SectionInput;
  /** 0 is sharp. */
  readonly leadingEdgeRadius: number;
  /** Distance of the root trailing edge ahead of the base. */
  readonly trailingEdgeAheadOfBase: number;
  /** Free-stream Reynolds number on the body's overall length. */
  readonly reynoldsOnLength: number;
  /** Free-stream static temperature, kelvin. */
  readonly temperature: number;
  /**
   * Why a flight condition asked as altitude, Mach number and diameter
   * gives no Reynolds number and temperature (./flight-condition.ts);
   * absent or empty when it gives them, or when they are asked directly.
   */
  readonly conditionRefusals?: readonly string[];
  /** Transition Reynolds numbers bounding the transition band (empty: none). */
  readonly transitionReynolds: readonly number[];
  /** A wall temperature, kelvin, bounding the wall band (undefined: none). */
  readonly wallTemperature: number | undefined;
  /** A roughness band in C_D with its source (undefined: smooth). */
  readonly roughness:
    { readonly low: number; readonly high: number; readonly source: string } | undefined;
}

const gated = BASIC_FINNER_SHOTS.filter((s) => s.use === 'gate');

/**
 * The range's Reynolds number on length per unit Mach number, the mean
 * over the gated shots (6.53e6 to 6.72e6; one range, one air).
 */
export const BASIC_FINNER_REYNOLDS_PER_MACH =
  gated.reduce((a, s) => a + s.reynolds / s.mach, 0) / gated.length;

/** The Basic Finner (src/validation/basic-finner.ts) as the page's default. */
export function basicFinnerForm(
  mach = 2,
  reynoldsOnLength = BASIC_FINNER_REYNOLDS_PER_MACH * mach,
): TotalDragForm {
  const g = BASIC_FINNER_GEOMETRY;
  const noseLength = 0.5 / Math.tan(g.coneHalfAngleDegrees * DEG);
  return {
    body: {
      nose: { shape: { kind: 'conical' }, length: noseLength, baseRadius: 0.5 },
      cylinderLength: g.length - noseLength,
    },
    mach,
    finCount: g.finCount,
    planform: { kind: 'rectangular' },
    rootChord: g.finChord,
    span: g.finSpan,
    section: { kind: 'single-wedge', trailingEdgeThickness: g.finTrailingEdgeThickness },
    leadingEdgeRadius: g.finLeadingEdgeRadius,
    trailingEdgeAheadOfBase: 0,
    reynoldsOnLength,
    temperature: BASIC_FINNER_TEMPERATURE,
    transitionReynolds: [],
    wallTemperature: undefined,
    roughness: undefined,
  };
}

/**
 * The range's static temperature as the gate took it, kelvin: from its
 * speed of sound, 343.7 m/s (0010 section 4.1).
 */
export const BASIC_FINNER_TEMPERATURE = 343.7 ** 2 / (1.4 * 287.05);
/** The gate's transition input (0008 section 2.3, 0010 section 4.1). */
export const GATE_TRANSITION_REYNOLDS = [5e5, 1.6e6, 3e6] as const;

/** A number typed on the page; empty is NaN (refused), not 0 as Number('') would read it. */
export function parseNumber(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text);
}

/** Numbers separated by commas or spaces; empty is none. Anything else reads as NaN (refused). */
export function parseNumberList(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .filter((t) => t !== '')
    .map((t) => Number(t));
}

// ---------------------------------------------------------------- the class

/**
 * The class of 0010 section 7 as the page decides it (0011 section 3):
 * the Basic Finner as transcribed, each dimension within
 * `dimensionTolerance` of its value, at the Mach and Reynolds numbers of
 * 0010 section 7 (widened only to take in the gated shots themselves), at
 * static temperatures over which the model's sensitivity is measured.
 * Conservative by design: what the gate did not test is outside.
 */
export const BASIC_FINNER_CLASS = {
  /** Relative tolerance on every dimension. */
  dimensionTolerance: 0.005,
  noseLength: 0.5 / Math.tan(BASIC_FINNER_GEOMETRY.coneHalfAngleDegrees * DEG),
  length: BASIC_FINNER_GEOMETRY.length,
  finCount: BASIC_FINNER_GEOMETRY.finCount,
  rootChord: BASIC_FINNER_GEOMETRY.finChord,
  span: BASIC_FINNER_GEOMETRY.finSpan,
  trailingEdgeThickness: BASIC_FINNER_GEOMETRY.finTrailingEdgeThickness,
  leadingEdgeRadius: BASIC_FINNER_GEOMETRY.finLeadingEdgeRadius,
  /** From the lowest gated shot (M 1.799) to 0010 section 7's Mach 3.0. */
  mach: [Math.min(...gated.map((s) => s.mach)), 3.0] as const,
  /** From the lowest gated shot's Reynolds number (1.19e7) to 0010 section 7's 2.0e7. */
  reynoldsOnLength: [Math.min(...gated.map((s) => s.reynolds)), 2.0e7] as const,
  /**
   * 0010 section 7 does not name a static temperature. The shots flew in
   * the range's air (Table V's speed of sound, 343.4 to 344.0 m/s, is
   * 293.4 to 294.5 K); from 216.65 K (the standard atmosphere's coldest,
   * 11 to 20 km') to 320 K the modelled total moves from its value there
   * by at most `TEMPERATURE_SENSITIVITY` (0011 section 3).
   */
  temperature: [216.65, 320] as const,
} as const;

export interface ClassCheck {
  readonly inside: boolean;
  /** Every condition of the class this case does not meet; empty inside it. */
  readonly outside: readonly string[];
}

function near(value: number, target: number): boolean {
  return Math.abs(value - target) <= BASIC_FINNER_CLASS.dimensionTolerance * target * (1 + 1e-12);
}

const fmt = (x: number) => String(Number(x.toPrecision(4)));
/** 1.19e7, not 1.19e+7. */
const sci = (x: number, digits: number) => x.toExponential(digits).replace('e+', 'e');

/** Whether the case lies inside the class that passed the Basic Finner gate, and if not, why. */
export function basicFinnerClass(form: TotalDragForm): ClassCheck {
  const c = BASIC_FINNER_CLASS;
  const pct = `${100 * c.dimensionTolerance}%`;
  const out: string[] = [];
  const nose = form.body.nose;
  if (nose.shape.kind !== 'conical') {
    out.push(`the nose is not a cone (the Basic Finner's is a 20 deg cone)`);
  } else if (!near(nose.length, c.noseLength)) {
    out.push(
      `the cone is ${fmt(nose.length)} cal long, not the Basic Finner's ${c.noseLength.toFixed(3)} ` +
        `(a 20 deg cone) within ${pct}`,
    );
  }
  const length = bodyLength(form.body);
  if (!near(length, c.length)) {
    out.push(
      `the body is ${fmt(length)} cal long overall, not ${c.length.toFixed(1)} within ${pct}`,
    );
  }
  if (form.finCount !== c.finCount) out.push(`${form.finCount} fins, not ${c.finCount}`);
  const rectangular =
    form.planform.kind === 'rectangular' ||
    (form.planform.kind === 'trapezoidal' &&
      form.planform.leadingEdgeSweepDegrees === 0 &&
      form.planform.trailingEdgeSweepDegrees === 0) ||
    (form.planform.kind === 'clipped-delta' && form.planform.taperRatio === 1);
  if (!rectangular) out.push('the fins are not rectangular (unswept, of constant chord)');
  if (!near(form.rootChord, c.rootChord)) {
    out.push(
      `the root chord is ${fmt(form.rootChord)} cal, not ${c.rootChord.toFixed(1)} within ${pct}`,
    );
  }
  if (!near(form.span, c.span)) {
    out.push(`the span is ${fmt(form.span)} cal, not ${c.span.toFixed(1)} within ${pct}`);
  }
  if (form.trailingEdgeAheadOfBase !== 0) {
    out.push(`the fins end ${fmt(form.trailingEdgeAheadOfBase)} cal ahead of the base, not at it`);
  }
  if (form.section.kind !== 'single-wedge') {
    out.push('the fin section is not a single wedge with a blunt trailing edge');
  } else if (!near(form.section.trailingEdgeThickness, c.trailingEdgeThickness)) {
    out.push(
      `the trailing edge is ${fmt(form.section.trailingEdgeThickness)} cal thick, not ` +
        `${c.trailingEdgeThickness} within ${pct}`,
    );
  }
  if (!near(form.leadingEdgeRadius, c.leadingEdgeRadius)) {
    out.push(
      `the leading-edge radius is ${fmt(form.leadingEdgeRadius)} cal, not ` +
        `${c.leadingEdgeRadius} within ${pct}`,
    );
  }
  if (!(form.mach >= c.mach[0] && form.mach <= c.mach[1])) {
    out.push(`Mach ${fmt(form.mach)} is outside ${c.mach[0]} to ${c.mach[1].toFixed(1)}`);
  }
  const re = form.reynoldsOnLength;
  if (!(re >= c.reynoldsOnLength[0] && re <= c.reynoldsOnLength[1])) {
    out.push(
      `the Reynolds number on length, ${sci(re, 2)}, is outside ` +
        `${sci(c.reynoldsOnLength[0], 2)} to ${sci(c.reynoldsOnLength[1], 1)}`,
    );
  }
  const t = form.temperature;
  // A relative 1e-12 for the rounding of a temperature computed to an end: the standard
  // atmosphere's 216.65 K is carried up from sea level as 216.64999999999998.
  if (!(t >= c.temperature[0] * (1 - 1e-12) && t <= c.temperature[1] * (1 + 1e-12))) {
    out.push(
      `the static temperature, ${fmt(t)} K, is outside ${c.temperature[0]} to ` +
        `${c.temperature[1]} K`,
    );
  }
  return { inside: out.length === 0, outside: out };
}

/**
 * The largest change of the modelled total over the class's static
 * temperatures, from its value at the range's air, as a fraction: at the
 * class's Mach numbers 1.8, 2.4 and 3.0 and Reynolds numbers 1.19e7, 1.6e7
 * and 2.0e7, the largest at Mach 3.0, Re 1.19e7 and 216.65 K
 * (tests/app/total-drag.test.ts; 0011 section 3).
 */
export const TEMPERATURE_SENSITIVITY = 0.0021;
const sensitivity = `${(100 * TEMPERATURE_SENSITIVITY).toFixed(2)}%`;

/** The class in words, for the page. */
export const CLASS_DESCRIPTION =
  'The class, as this page decides it (design record 0011): the Basic Finner as transcribed, a ' +
  '20 deg cone (2.836 cal) on a cylinder to a flat base, 10.0 cal overall; four rectangular fins ' +
  'of 1.0 cal root chord and span, their trailing edges at the base; single-wedge sections from a ' +
  '0.004 cal leading-edge radius to a blunt trailing edge 0.08 cal thick; every dimension within ' +
  '0.5%; Mach 1.799 to 3.0; Reynolds number 1.19e7 to 2.0e7 on length; static temperature ' +
  `216.65 to 320 K (the shots flew at about 294 K; across this span the modelled total moves by ` +
  `at most ${sensitivity}); zero incidence, power off.`;

// ------------------------------------------------------------- the claims

/** Inside the class (0010 sections 4.2 and 7). */
export const VALIDATED_CLAIM =
  'Validated on the Basic Finner: this configuration and condition lie inside the one class whose ' +
  'total drag has passed a hold-out test, the Basic Finner in free flight (DREV TM 9703: 11 shots ' +
  'at Mach 1.80 to 2.97, Reynolds numbers 1.19e7 to 1.98e7 on length; design record 0010, section ' +
  '4.2). Measured over modelled, the 11 residuals were -7.7% to +4.5% (mean -1.9%), inside a ' +
  'tolerance of -19.5% to -26.2% and +23.1% to +27.4% of the modelled total (as re-derived ' +
  "after an independent audit, section 10). The shots flew in the range's air, about 294 K; " +
  'across static temperatures of 216.65 to 320 K the modelled total moves from its value there ' +
  `by at most ${sensitivity} (design record 0011, section 3).`;
export const TOLERANCE_CAVEAT =
  'That tolerance is wide: a pass at such a width says little by itself, and the residuals are ' +
  'the finding. The two fin-edge terms, both analogies, carry 24% to 25% of the Basic ' +
  "Finner's modelled total, and the body base carries the fins-on-base factor, itself an " +
  'analogy from circular-arc fins.';
export const OFFSET_CAVEAT =
  'At Mach 2.97 both shots lay below the model, by 5.4% and 7.6% (mean -6.5%), beyond that ' +
  "cluster's own spread of +-1.2%: a systematic offset inside the tolerance, not corrected (the " +
  'model is not retuned on its own hold-out).';
/** Beyond this Mach number the case is nearer the M 2.97 shots than the M 2.66 to 2.75 cluster. */
export const NEAR_MACH_3 = 2.86;
export const ESTIMATE_CLAIM =
  'Estimate, not validated: this case lies outside the one class whose total drag has passed a ' +
  'hold-out test (the Basic Finner). Each component is inside the domain of its own band, so the ' +
  'total is computed, but no total-drag measurement tests this configuration or condition, and ' +
  'the component bands are estimates here.';
/** Every total (0008 section 6.3). */
export const BAND_CAVEAT =
  "The model-form band is the linear sum of the components' bands and is a minimum: each " +
  'component band is the range seen on a few data sets, not a coverage interval, so the true ' +
  'error can exceed it. The input bands are kept apart from it.';
/** The breakdown, as 0010 section 7 allows it to be claimed. */
export const BREAKDOWN_NOTE =
  'The breakdown: the nose wave drag is solved, its band measured from the grids; body ' +
  "friction's band is validated on wind-tunnel and flight data of friction (0007); the bands " +
  'of the fin and base terms are estimated on data of each component and tested only in the ' +
  'total (0010 section 7).';
/** What src/total does not represent (src/total/finned-body.ts, 0010 section 3). */
export const NOT_REPRESENTED =
  "Not represented: the fin roots' share of the body's wetted area (4e-4 in C_D on the Basic " +
  "Finner), fin-body interference, the Mach number ahead of the base (the free stream's is " +
  "used), fin cant and roll, a tip bluntness the nose asked does not have (the Basic Finner's " +
  "0.004 cal meplat, 1.0e-4 in C_D at pitot pressure), the rounded leading edge's effect on the " +
  'fin faces; friction is at free-stream edge conditions. Zero incidence, power off, no plume.';

export type Claim =
  | {
      readonly kind: 'validated';
      readonly text: string;
      readonly caveats: readonly string[];
      /** The case is nearer the M 2.97 shots, whose offset applies most. */
      readonly nearMach3: boolean;
    }
  | { readonly kind: 'estimate'; readonly text: string; readonly reasons: readonly string[] };

function claimOf(form: TotalDragForm, check: ClassCheck): Claim {
  if (!check.inside) return { kind: 'estimate', text: ESTIMATE_CLAIM, reasons: check.outside };
  return {
    kind: 'validated',
    text: VALIDATED_CLAIM,
    caveats: [TOLERANCE_CAVEAT, OFFSET_CAVEAT],
    nearMach3: form.mach >= NEAR_MACH_3,
  };
}

// ---------------------------------------------------------- configuration

export interface Configuration {
  readonly config: FinnedBody;
  readonly conditions: FlightConditions;
  readonly inputs: DragInputs;
}

const refusal = (component: string, message: string): ComponentRefusal => ({
  component,
  reason: 'input',
  message,
});

/** src/total's configuration from the page's inputs, or every input it cannot take. */
export function configurationOf(form: TotalDragForm):
  | { readonly kind: 'ok'; readonly value: Configuration }
  | {
      readonly kind: 'refused';
      readonly refusals: readonly ComponentRefusal[];
    } {
  const bad: ComponentRefusal[] = [];
  const positive = (component: string, what: string, v: number) => {
    if (!(v > 0 && Number.isFinite(v))) {
      bad.push(refusal(component, `${what} must be a positive number`));
    }
  };
  const nonNegative = (component: string, what: string, v: number) => {
    if (!(v >= 0 && Number.isFinite(v))) {
      bad.push(refusal(component, `${what} must be zero or a positive number`));
    }
  };
  try {
    validateBody(form.body);
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    bad.push(refusal('body', e.message));
  }
  positive('flight condition', 'the Mach number', form.mach);
  const conditionRefusals = form.conditionRefusals ?? [];
  if (conditionRefusals.length > 0) {
    // The reasons of the altitude, Mach number and diameter asked, each once.
    for (const message of conditionRefusals) {
      if (!bad.some((b) => b.message === message)) bad.push(refusal('flight condition', message));
    }
  } else {
    positive('flight condition', 'the Reynolds number on length', form.reynoldsOnLength);
    positive('flight condition', 'the static temperature', form.temperature);
  }
  if (!(Number.isInteger(form.finCount) && form.finCount >= 1)) {
    bad.push(refusal('fins', 'the fin count must be a whole number, at least 1'));
  }
  positive('fins', 'the root chord', form.rootChord);
  positive('fins', 'the span', form.span);
  nonNegative('fins', 'the leading-edge radius', form.leadingEdgeRadius);
  nonNegative(
    'fins',
    "the distance of the fins' trailing edges ahead of the base",
    form.trailingEdgeAheadOfBase,
  );
  if (
    Number.isFinite(form.body.cylinderLength) &&
    form.rootChord > 0 &&
    form.trailingEdgeAheadOfBase >= 0 &&
    form.trailingEdgeAheadOfBase + form.rootChord > form.body.cylinderLength * (1 + 1e-12)
  ) {
    bad.push(
      refusal(
        'fins',
        `the fins must lie on the cylinder: their root chord (${fmt(form.rootChord)} cal) and ` +
          `distance ahead of the base (${fmt(form.trailingEdgeAheadOfBase)} cal) exceed its ` +
          `length (${fmt(form.body.cylinderLength)} cal)`,
      ),
    );
  }
  form.transitionReynolds.forEach((r) => {
    positive('inputs', `a transition Reynolds number (${r})`, r);
  });
  if (form.wallTemperature !== undefined) {
    positive('inputs', 'the wall temperature', form.wallTemperature);
  }
  const rough = form.roughness;
  if (rough !== undefined) {
    if (!(
      Number.isFinite(rough.low) &&
      Number.isFinite(rough.high) &&
      rough.low <= 0 &&
      rough.high >= 0
    )) {
      bad.push(
        refusal('inputs', 'a roughness band must run from zero or below to zero or above, in C_D'),
      );
    }
    if (rough.source.trim() === '')
      bad.push(refusal('inputs', 'a roughness band needs its source'));
  }

  let planform: Planform | undefined;
  try {
    const p = form.planform;
    planform =
      p.kind === 'rectangular'
        ? trapezoidalPlanform({ rootChord: form.rootChord, span: form.span, leadingEdgeSweep: 0 })
        : p.kind === 'trapezoidal'
          ? trapezoidalPlanform({
              rootChord: form.rootChord,
              span: form.span,
              leadingEdgeSweep: p.leadingEdgeSweepDegrees * DEG,
              trailingEdgeSweep: p.trailingEdgeSweepDegrees * DEG,
            })
          : clippedDeltaPlanform({
              rootChord: form.rootChord,
              span: form.span,
              taperRatio: p.taperRatio,
            });
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    bad.push(refusal('fin planform', e.message));
  }
  let section: SymmetricSection | undefined;
  try {
    const s = form.section;
    const c = form.rootChord;
    section =
      s.kind === 'single-wedge'
        ? singleWedge(s.trailingEdgeThickness / c)
        : s.kind === 'double-wedge'
          ? doubleWedge(s.thickness / c, s.ridge)
          : hexagonal(s.thickness / c, s.frontBevel, s.rearBevel);
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    bad.push(refusal('fin section', e.message));
  }
  if (bad.length > 0 || planform === undefined || section === undefined) {
    return { kind: 'refused', refusals: bad };
  }
  return {
    kind: 'ok',
    value: {
      config: {
        body: form.body,
        afterbody: 'cylinder',
        fins: {
          count: form.finCount,
          planform,
          section,
          // src/fins has no circular-arc section, so the fins-on-base factor
          // is always carried by analogy (0010 section 1.3).
          sectionFamily: 'other',
          leadingEdgeRadius: form.leadingEdgeRadius,
          trailingEdgeAheadOfBase: form.trailingEdgeAheadOfBase,
        },
      },
      conditions: {
        mach: form.mach,
        temperature: form.temperature,
        reynoldsPerLength: form.reynoldsOnLength / bodyLength(form.body),
      },
      inputs: {
        ...(form.transitionReynolds.length > 0
          ? { transitionReynolds: form.transitionReynolds }
          : {}),
        ...(form.wallTemperature === undefined ? {} : { wallTemperature: form.wallTemperature }),
        ...(rough === undefined
          ? {}
          : { roughness: { ...rough, source: `supplied on this page: ${rough.source.trim()}` } }),
      },
    },
  };
}

// ------------------------------------------------------------ the nose term

/** The page's verified nose solve, as it reports it. */
export interface NoseSolve {
  /** The finest grid's forebody pressure drag coefficient. */
  readonly value: number;
  /** Its error band, absolute, the grids' estimate plus the floor. */
  readonly uncertainty: number;
  /** Grids solved. */
  readonly grids: number;
}

/** The nose term src/total is given: the page's solved value and band, unchanged. */
export function noseComponentOf(solve: NoseSolve): DragComponent {
  return {
    name: 'nose wave drag',
    cd: solve.value,
    low: solve.value - solve.uncertainty,
    high: solve.value + solve.uncertainty,
    label:
      'solved on this page: the inviscid forebody pressure drag, bow shock fitted, finest of ' +
      `${solve.grids} grids (0006)`,
    band:
      `measured from the grids, with an allowance of ${FITTED_DRAG_FLOOR.toExponential(0)} of the ` +
      'value (0006)',
  };
}

export type NoseState =
  | { readonly kind: 'solved'; readonly component: DragComponent }
  /** Solved without a band, or not solved: the total is refused. */
  | { readonly kind: 'refused'; readonly message: string }
  /** Not yet solved for this nose, body and Mach number. */
  | { readonly kind: 'pending' };

// ----------------------------------------------------------------- the view

export type TotalDragView =
  | { readonly kind: 'refused'; readonly refusals: readonly ComponentRefusal[] }
  | { readonly kind: 'pending'; readonly check: ClassCheck }
  | {
      readonly kind: 'total';
      readonly total: TotalDrag;
      /** The model-form band with every input band added linearly. */
      readonly withInputs: readonly [number, number];
      readonly check: ClassCheck;
      readonly claim: Claim;
      /** What the labels do not carry: the fins' one-sided band, src/base's flags. */
      readonly notes: readonly string[];
    };

/** Why the fins' bands lie above their values (src/total/finned-body.ts, 0008 section 4.3). */
export const FINS_BAND_NOTE =
  'Fin friction and fin wave drag: their band runs from 1.01 to 1.59 times the value shown (the ' +
  "fins' own drag measured over modelled on the ARCAS increments, the wave drag's widened by its " +
  'quadrature error), above the value, since on those data the model was never above the ' +
  'measurement (0008 section 4.3).';

/** What src/base's fins-on-base factor does not depend on (src/base/fins-on-base.ts). */
export const FINS_ON_BASE_NOTE =
  "Fins-on-base factor: it does not depend here on the fins' span, chord or planform. It is " +
  'measured on one family of fins, four rectangular, unswept, 10% thick, of circular-arc ' +
  'section (TN 3819 fig. 35; its band reaches down to 5% thick on TN 2360), and src/base ' +
  'applies it as it is to any four fins ending at the base, 5% to 10% thick.';

/** The rebuilt factor, where it stands in for the present one (src/base/fins-on-base-w1.ts, 0015). */
export const FINS_ON_BASE_W1_NOTE =
  'Fins-on-base factor: the present factor does not cover these fins, so the rebuilt factor ' +
  '(design record 0015) is used: a band between measured families of circular-arc fins that ' +
  "bracket these fins' section, count, sweep and position (TN 2360, TN 3819, RM L52J21a, RM " +
  'L52E06, NSWCDD/TR-92/509), wider than a measurement on these fins would give. Its data are read ' +
  'twice, except the measured relief that sets its lowest member above Mach 1.5 (RM L52J21a) and, ' +
  "for leading edges swept under 45 deg, NSWCDD/TR-92/509's table, each read once.";

/** What the components' labels do not carry. */
function notesOf(base: BodyBaseDrag | undefined): string[] {
  const notes = [FINS_BAND_NOTE];
  // Flags of the fins-on-base factor (0010 section 1.3).
  const f = base?.finsOnBase;
  if (f === undefined) return notes;
  if (base?.finsOnBaseSource === 'rebuilt') {
    notes.push(FINS_ON_BASE_W1_NOTE);
    if (f.singleReading) {
      notes.push(
        'Fins-on-base factor: at this Mach number its reference rests on fewer than two readings ' +
          'of the free-flight line of TN 3819 fig. 35 (0015 section 3.1).',
      );
    }
    return notes;
  }
  notes.push(FINS_ON_BASE_NOTE);
  if (f.atRangeEnd) {
    notes.push(
      'Fins-on-base factor: this Mach number lies below M 1.80 by no more than the reading error ' +
        "of TN 3819 fig. 35's abscissa (0.002), so the M 1.80 row is taken (0010 section 1.3).",
    );
  }
  if (f.extrapolated) {
    notes.push(
      'Fins-on-base factor: above M 2.97 it is interpolated toward the M 3.0 row, where both ' +
        'readings of the free-flight line of TN 3819 fig. 35 are extrapolated (the round-3 ' +
        'reading by 0.01 in M; 0010 section 1.3).',
    );
  } else if (f.singleReading) {
    notes.push(
      'Fins-on-base factor: at this Mach number it rests on one reading of the free-flight line ' +
        'of TN 3819 fig. 35, not two (0010 section 1.3).',
    );
  }
  return notes;
}

/** A nose term that is never shown: used only to learn what the other components refuse. */
const UNSOLVED_NOSE: DragComponent = {
  name: 'nose wave drag',
  cd: 0,
  low: 0,
  high: 0,
  label: 'not solved',
  band: 'none',
};

/**
 * What the page shows for these inputs and this state of the nose solve:
 * refused (every reason, no number), awaiting the nose (no number), or
 * the total with its bands, labels and claim.
 */
export function totalDragView(form: TotalDragForm, nose: NoseState): TotalDragView {
  const configuration = configurationOf(form);
  const noseRefusal: ComponentRefusal[] =
    nose.kind === 'refused'
      ? [{ component: 'nose wave drag', reason: 'not-verified', message: nose.message }]
      : [];
  if (configuration.kind === 'refused') {
    return { kind: 'refused', refusals: [...noseRefusal, ...configuration.refusals] };
  }
  const { config, conditions, inputs } = configuration.value;
  const noseTerm = nose.kind === 'solved' ? nose.component : UNSOLVED_NOSE;
  // A method that fails (the laminar solution finding no solution, say)
  // is reported with its message, as a refusal: no number.
  const failed = (e: unknown): TotalDragView => {
    if (!(e instanceof Error)) throw e;
    return {
      kind: 'refused',
      refusals: [
        ...noseRefusal,
        { component: 'computation', reason: 'not-computed', message: e.message },
      ],
    };
  };
  let parts: ReturnType<typeof finnedBodyComponents>;
  try {
    parts = finnedBodyComponents(config, conditions, noseTerm, inputs);
  } catch (e) {
    return failed(e);
  }
  const refusals = [...noseRefusal, ...parts.refusals];
  if (refusals.length > 0) return { kind: 'refused', refusals };
  const check = basicFinnerClass(form);
  if (nose.kind !== 'solved') return { kind: 'pending', check };
  let total: TotalDrag;
  try {
    total = combineComponents(parts.components, parts.inputs);
  } catch (e) {
    return failed(e);
  }
  return {
    kind: 'total',
    total,
    withInputs: bandWithInputs(total),
    check,
    claim: claimOf(form, check),
    notes: notesOf(parts.base),
  };
}

// --------------------------------------------------------- the gate, as published

export interface PublishedShot {
  readonly shot: string;
  readonly mach: number;
  readonly cx0: number;
  /** Modelled C_D and its model-form band, as 0010 section 4.2 prints them. */
  readonly cd: number;
  readonly low: number;
  readonly high: number;
  /** CX0 / modelled - 1, percent to one decimal. */
  readonly residual: number;
  /** The tolerance on the residual, percent to one decimal. */
  readonly tolerance: readonly [number, number];
}

/**
 * The second gate run, as published in 0010 section 4.2, with the tolerances as re-derived
 * after the round 5 audit (0010 section 10; the second run's high ends were +26.5% to
 * +31.4%), held to the library by the tests.
 */
export const PUBLISHED_GATE: readonly PublishedShot[] = [
  {
    shot: 'DA95021318',
    mach: 1.799,
    cx0: 0.594,
    cd: 0.6123,
    low: 0.5311,
    high: 0.7261,
    residual: -3.0,
    tolerance: [-24.2, 23.1],
  },
  {
    shot: 'DA95021529',
    mach: 1.846,
    cx0: 0.598,
    cd: 0.5955,
    low: 0.5181,
    high: 0.7053,
    residual: 0.4,
    tolerance: [-23.8, 23.1],
  },
  {
    shot: 'DA95021308',
    mach: 1.85,
    cx0: 0.567,
    cd: 0.5944,
    low: 0.5172,
    high: 0.7039,
    residual: -4.6,
    tolerance: [-23.8, 23.1],
  },
  {
    shot: 'DA95021328',
    mach: 2.348,
    cx0: 0.5,
    cd: 0.4846,
    low: 0.425,
    high: 0.572,
    residual: 3.2,
    tolerance: [-21.3, 25.6],
  },
  {
    shot: 'DA95020907',
    mach: 2.364,
    cx0: 0.478,
    cd: 0.4824,
    low: 0.4234,
    high: 0.569,
    residual: -0.9,
    tolerance: [-21.3, 25.6],
  },
  {
    shot: 'DA95021317',
    mach: 2.414,
    cx0: 0.473,
    cd: 0.4745,
    low: 0.4174,
    high: 0.5587,
    residual: -0.3,
    tolerance: [-21.0, 25.5],
  },
  {
    shot: 'DA95020927',
    mach: 2.663,
    cx0: 0.446,
    cd: 0.4428,
    low: 0.3892,
    high: 0.521,
    residual: 0.7,
    tolerance: [-26.2, 27.2],
  },
  {
    shot: 'DA95020906',
    mach: 2.741,
    cx0: 0.4,
    cd: 0.4332,
    low: 0.3808,
    high: 0.5097,
    residual: -7.7,
    tolerance: [-26.1, 27.4],
  },
  {
    shot: 'DA95020916',
    mach: 2.749,
    cx0: 0.452,
    cd: 0.4323,
    low: 0.38,
    high: 0.5086,
    residual: 4.5,
    tolerance: [-26.1, 27.4],
  },
  {
    shot: 'DA95030603',
    mach: 2.969,
    cx0: 0.385,
    cd: 0.4072,
    low: 0.358,
    high: 0.4786,
    residual: -5.4,
    tolerance: [-19.5, 24.6],
  },
  {
    shot: 'DA95022205',
    mach: 2.97,
    cx0: 0.376,
    cd: 0.4071,
    low: 0.3579,
    high: 0.4786,
    residual: -7.6,
    tolerance: [-19.5, 24.7],
  },
];
