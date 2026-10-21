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
 *   apart, each component with its band and label, and the claim, always
 *   "estimate, not validated": inside the class of `basicFinnerClass`
 *   because its validated claim is suspended (0010 section 11.7), outside
 *   it with every condition it fails.
 */

import { FITTED_DRAG_FLOOR } from '../analysis/verified-drag';
import type { BodyBaseDrag } from '../base/base-drag';
import { FIG35_FREE_FLIGHT_END } from '../base/tn3819-fig35';
import { clippedDeltaPlanform, trapezoidalPlanform, type Planform } from '../fins/planform';
import {
  doubleWedge,
  flatPlate,
  hexagonal,
  singleWedge,
  type FlatPlate,
  type SymmetricSection,
} from '../fins/section';
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
import {
  BASIC_FINNER_GEOMETRY,
  BASIC_FINNER_SHOTS,
  basicFinnerBody,
} from '../validation/basic-finner';

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
    }
  /** A flat plate of uniform thickness (sheet stock), its edges rounded (a full radius) or square-cut. */
  | {
      readonly kind: 'flat-plate';
      readonly thickness: number;
      readonly leadingEdge: 'rounded' | 'square';
      readonly trailingEdge: 'square' | 'rounded';
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
  /** 0 is sharp. Not used for a flat plate, whose rounded edge is a full radius. */
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
  return {
    body: basicFinnerBody(),
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
 * Conservative by design: what the gate did not test is outside, and so
 * is what it tested on a prediction, not a measurement (Mach 2.15 to 3.0).
 * Its validated claim is suspended (0010 section 11.7): the class is kept
 * for the registered test of the corrected factor, BRL 934's range A, which
 * covers its Mach range at BRL's conditions (0014 section 10.6), and a case
 * inside it is an estimate with that reason.
 */
export const BASIC_FINNER_CLASS = {
  /** Relative tolerance on every dimension. */
  dimensionTolerance: 0.005,
  noseLength: basicFinnerBody().nose.length,
  length: BASIC_FINNER_GEOMETRY.length,
  finCount: BASIC_FINNER_GEOMETRY.finCount,
  rootChord: BASIC_FINNER_GEOMETRY.finChord,
  span: BASIC_FINNER_GEOMETRY.finSpan,
  trailingEdgeThickness: BASIC_FINNER_GEOMETRY.finTrailingEdgeThickness,
  leadingEdgeRadius: BASIC_FINNER_GEOMETRY.finLeadingEdgeRadius,
  /**
   * From the lowest gated shot (M 1.799) to 2.15, 0010 section 7's top:
   * above it the fins-on-base factor the gate tested was read from one of
   * Love's estimates in TN 3819 fig. 35, not the free-flight curve, and the
   * factor corrected since (0010 section 11) has no hold-out there.
   */
  mach: [Math.min(...gated.map((s) => s.mach)), 2.15] as const,
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

/** Why the class stops at Mach 2.15, said with a Mach number above it (0010 section 7). */
export const ABOVE_THE_CLASS =
  " (above Mach 2.15 the gate tested a fins-on-base factor read from one of Love's estimates in " +
  'TN 3819 fig. 35, not from its free-flight curve; the factor corrected since has no hold-out ' +
  'there)';

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
  // A flat plate's radius field is hidden (its rounded edge is a full radius), so it is not
  // checked there (0016 section 16).
  if (form.section.kind !== 'flat-plate' && !near(form.leadingEdgeRadius, c.leadingEdgeRadius)) {
    out.push(
      `the leading-edge radius is ${fmt(form.leadingEdgeRadius)} cal, not ` +
        `${c.leadingEdgeRadius} within ${pct}`,
    );
  }
  if (!(form.mach >= c.mach[0] && form.mach <= c.mach[1])) {
    out.push(
      `Mach ${fmt(form.mach)} is outside ${c.mach[0]} to ${c.mach[1]}` +
        (form.mach > c.mach[1] ? ABOVE_THE_CLASS : ''),
    );
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
 * class's Mach numbers 1.8, 2.0 and 2.15 and Reynolds numbers 1.19e7, 1.6e7
 * and 2.0e7, the largest at Mach 2.15, Re 1.19e7 and 216.65 K
 * (tests/app/total-drag.test.ts; 0011 section 3).
 */
export const TEMPERATURE_SENSITIVITY = 0.0013;
const sensitivity = `${(100 * TEMPERATURE_SENSITIVITY).toFixed(2)}%`;

/** The class in words, for the page. */
export const CLASS_DESCRIPTION =
  "The Basic Finner's class, as this page decides it (design record 0011), kept for its next " +
  "registered test, which covers its Mach range at BRL's conditions (design record 0014, " +
  'section 10.6); its validated claim is suspended since the fins-on-base ' +
  'factor was corrected after its test (design record 0010, section 11.7). The Basic Finner as ' +
  'transcribed, a ' +
  '20 deg cone (2.836 cal) on a cylinder to a flat base, 10.0 cal overall; four rectangular fins ' +
  'of 1.0 cal root chord and span, their trailing edges at the base; single-wedge sections from a ' +
  '0.004 cal leading-edge radius to a blunt trailing edge 0.08 cal thick; every dimension within ' +
  '0.5%; Mach 1.799 to 2.15 (above it the gate tested a fins-on-base factor read from one of ' +
  "Love's estimates in TN 3819 fig. 35, not from its free-flight curve, and the factor corrected " +
  'since has no hold-out there); Reynolds number 1.19e7 to 2.0e7 on length; static temperature ' +
  `216.65 to 320 K (the shots flew at about 294 K; across this span the modelled total moves by ` +
  `at most ${sensitivity}); zero incidence, power off.`;

// ------------------------------------------------------------- the claims

/**
 * Inside the class (0010 section 11.7): the validated claim is suspended.
 * The class passed its hold-out test (0010 section 4.2), but the
 * fins-on-base factor was corrected after it (0010 section 11), and by 0008
 * section 6.1 a term changed after a test is not validated by it. The class
 * is kept for the registered test of the corrected factor (0014 section
 * 10.5), which covers its Mach range at BRL's conditions, not the whole
 * class: BRL's Reynolds numbers and sharp leading edges lie outside it (0014
 * section 10.6). No total on the page is labelled validated.
 */
export const CLASS_CLAIM =
  "Estimate, not validated: this case lies inside the Basic Finner's class, whose total drag " +
  'passed a hold-out test in free flight (DREV TM 9703: 11 shots at Mach 1.80 to 2.97; design ' +
  'record 0010, section 4.2), but that claim is suspended: the fins-on-base factor was corrected ' +
  'after the test (design record 0010, section 11), and a term changed after a test is not ' +
  'validated by it (design record 0008, section 6.1). The class is kept for its next registered ' +
  "test, BRL Report 934's range A (Mach 1.5 to 2.47), which covers its Mach range, at BRL's " +
  'conditions (design record 0014, section 10.6).';
/** The reason given with it. */
export const SUSPENDED_REASON =
  'the fins-on-base factor was corrected after the Basic Finner gate (design record 0010, ' +
  'section 11), so by design record 0008 section 6.1 the claim is suspended until the ' +
  "registered test of the corrected factor, BRL Report 934's range A, is run and passes";
/** Outside the class. */
export const ESTIMATE_CLAIM =
  "Estimate, not validated: this case lies outside the Basic Finner's class, the one class " +
  'whose total drag has been tested against free flight (its claim is suspended meanwhile; ' +
  'design record 0010, section 11.7). Each component is inside the domain of its own band, so ' +
  'the total is computed, but no total-drag measurement tests this configuration or condition, ' +
  'and the component bands are estimates here.';
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

/**
 * Every total is an estimate (0010 section 11.7): there is no validated
 * claim while the Basic Finner's is suspended, and so no path to one.
 */
export interface Claim {
  readonly kind: 'estimate';
  readonly text: string;
  readonly reasons: readonly string[];
}

/**
 * Inside the class, the suspended claim and its reason; outside it, every
 * condition it fails. A total with a component bounded, not measured, also
 * names that component (0014 section 10.2).
 */
function claimOf(check: ClassCheck, bounded: readonly string[]): Claim {
  return check.inside
    ? { kind: 'estimate', text: CLASS_CLAIM, reasons: [SUSPENDED_REASON, ...bounded] }
    : { kind: 'estimate', text: ESTIMATE_CLAIM, reasons: [...check.outside, ...bounded] };
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
  if (form.section.kind !== 'flat-plate') {
    nonNegative('fins', 'the leading-edge radius', form.leadingEdgeRadius);
  }
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
  let section: SymmetricSection | FlatPlate | undefined;
  try {
    const s = form.section;
    const c = form.rootChord;
    section =
      s.kind === 'single-wedge'
        ? singleWedge(s.trailingEdgeThickness / c)
        : s.kind === 'double-wedge'
          ? doubleWedge(s.thickness / c, s.ridge)
          : s.kind === 'hexagonal'
            ? hexagonal(s.thickness / c, s.frontBevel, s.rearBevel)
            : flatPlate(s.thickness, s.leadingEdge, s.trailingEdge);
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
          leadingEdgeRadius: form.section.kind === 'flat-plate' ? 0 : form.leadingEdgeRadius,
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

/** Above the end of TN 3819 fig. 35's free-flight curve (src/base/fins-on-base.ts, 0010 section 11). */
export const FINS_ON_BASE_BOUNDED_NOTE =
  `Fins-on-base factor: above M ${FIG35_FREE_FLIGHT_END}, where the free-flight curve of TN 3819 ` +
  'fig. 35 ends, no free-flight data exist, so it is bounded, not measured: between no fin ' +
  `effect and its value at M ${FIG35_FREE_FLIGHT_END}, its band the whole gap, and the total is ` +
  'an estimate, not validated (0010 section 11).';
/** The reason a total with a bounded factor is an estimate (0014 section 10.2). */
export const BOUNDED_REASON =
  "the body base's fins-on-base factor is bounded, not measured, above Mach " +
  `${FIG35_FREE_FLIGHT_END}, where the free-flight curve of TN 3819 fig. 35 ends`;

/** What the components' labels do not carry. */
function notesOf(base: BodyBaseDrag | undefined): string[] {
  const notes = [FINS_BAND_NOTE];
  // Flags of the fins-on-base factor (0010 sections 1.3 and 11).
  const f = base?.finsOnBase;
  if (f === undefined) return notes;
  notes.push(FINS_ON_BASE_NOTE);
  if (f.atRangeEnd) {
    notes.push(
      'Fins-on-base factor: this Mach number lies below M 1.80 by no more than the reading error ' +
        "of TN 3819 fig. 35's abscissa (0.002), so the M 1.80 row is taken (0010 section 1.3).",
    );
  }
  if (f.bounded) notes.push(FINS_ON_BASE_BOUNDED_NOTE);
  else if (f.singleReading) {
    notes.push(
      'Fins-on-base factor: at this Mach number it rests on one reading of the free-flight curve ' +
        'of TN 3819 fig. 35, not two (0010 section 11).',
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
    claim: claimOf(check, parts.base?.finsOnBase?.bounded === true ? [BOUNDED_REASON] : []),
    notes: notesOf(parts.base),
  };
}

// --------------------------------------------------------- the gate, as published

export interface PublishedShot {
  readonly shot: string;
  readonly mach: number;
  readonly cx0: number;
  /** Modelled C_D and its model-form band, corrected (0010 section 11). */
  readonly cd: number;
  readonly low: number;
  readonly high: number;
  /** CX0 / modelled - 1, percent to one decimal, corrected. */
  readonly residual: number;
  /** The tolerance on the residual, percent to one decimal, corrected. */
  readonly tolerance: readonly [number, number];
  /** The second run's residual, as 0010 section 4.2 publishes it, before the correction. */
  readonly secondRun: number;
}

/**
 * The gate re-run with the corrected fins-on-base factor (0010 section 11), a recorded
 * correction made after the residuals were known, not a validation: the modelled totals, bands,
 * residuals and tolerances (round 5's arithmetic, 0010 section 10) held to the library by the
 * tests, with the second run's residual beside each (0010 section 4.2). Each band is rounded
 * outward, as every band on the page is (./band.ts), so that the table and a total's headline
 * show the same interval for the same shot; the other values to the nearest last digit.
 */
export const PUBLISHED_GATE: readonly PublishedShot[] = [
  {
    shot: 'DA95021318',
    mach: 1.799,
    cx0: 0.594,
    cd: 0.6134,
    low: 0.5296,
    high: 0.7297,
    residual: -3.2,
    tolerance: [-24.6, 23.5],
    secondRun: -3.0,
  },
  {
    shot: 'DA95021529',
    mach: 1.846,
    cx0: 0.598,
    cd: 0.5952,
    low: 0.5164,
    high: 0.7064,
    residual: 0.5,
    tolerance: [-24.0, 23.3],
    secondRun: 0.4,
  },
  {
    shot: 'DA95021308',
    mach: 1.85,
    cx0: 0.567,
    cd: 0.594,
    low: 0.5155,
    high: 0.7048,
    residual: -4.5,
    tolerance: [-24.0, 23.3],
    secondRun: -4.6,
  },
  {
    shot: 'DA95021328',
    mach: 2.348,
    cx0: 0.5,
    cd: 0.4811,
    low: 0.4187,
    high: 0.5718,
    residual: 3.9,
    tolerance: [-22.0, 26.4],
    secondRun: 3.2,
  },
  {
    shot: 'DA95020907',
    mach: 2.364,
    cx0: 0.478,
    cd: 0.4787,
    low: 0.4166,
    high: 0.5688,
    residual: -0.1,
    tolerance: [-22.0, 26.5],
    secondRun: -0.9,
  },
  {
    shot: 'DA95021317',
    mach: 2.414,
    cx0: 0.473,
    cd: 0.4699,
    low: 0.4094,
    high: 0.5581,
    residual: 0.7,
    tolerance: [-21.9, 26.6],
    secondRun: -0.3,
  },
  {
    shot: 'DA95020927',
    mach: 2.663,
    cx0: 0.446,
    cd: 0.4314,
    low: 0.3763,
    high: 0.5123,
    residual: 3.4,
    tolerance: [-27.0, 28.5],
    secondRun: 0.7,
  },
  {
    shot: 'DA95020906',
    mach: 2.741,
    cx0: 0.4,
    cd: 0.4215,
    low: 0.3679,
    high: 0.5002,
    residual: -5.1,
    tolerance: [-26.9, 28.6],
    secondRun: -7.7,
  },
  {
    shot: 'DA95020916',
    mach: 2.749,
    cx0: 0.452,
    cd: 0.4206,
    low: 0.3672,
    high: 0.4991,
    residual: 7.5,
    tolerance: [-26.8, 28.6],
    secondRun: 4.5,
  },
  {
    shot: 'DA95030603',
    mach: 2.969,
    cx0: 0.385,
    cd: 0.3951,
    low: 0.3459,
    high: 0.4678,
    residual: -2.6,
    tolerance: [-20.0, 25.7],
    secondRun: -5.4,
  },
  {
    shot: 'DA95022205',
    mach: 2.97,
    cx0: 0.376,
    cd: 0.3951,
    low: 0.3458,
    high: 0.4677,
    residual: -4.8,
    tolerance: [-20.0, 25.7],
    secondRun: -7.6,
  },
];
