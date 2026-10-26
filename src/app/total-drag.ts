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
 *   "validated" inside the narrow sub-class of `brl934SubClass`, the
 *   Basic Finner at the conditions of BRL Report 934's range A, which it
 *   passed (0014 section 10.7 (q)); "estimate, not validated" everywhere
 *   else: inside the class of `basicFinnerClass` because its validated
 *   claim is suspended (0010 section 11.7), outside both with every
 *   condition it fails.
 */

import { FITTED_DRAG_FLOOR, allowanceText, bandCaveat } from '../analysis/verified-drag';

export { allowanceText, bandCaveat };
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
  refusedTotalParts,
  type NoseForFloor,
  type RefusedTotalParts,
} from '../total/refused-floor';
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
 * Its validated claim is suspended (0010 section 11.7), and a case inside
 * it is an estimate with that reason. The registered test of the corrected
 * factor, BRL 934's range A, was run and passed (0020), but at conditions
 * outside the class (lower Reynolds numbers, sharp fin leading edges), so
 * it validates the narrow sub-class of `brl934SubClass` instead (0014
 * section 10.7 (q)); the class is kept, with its limits, for a test that
 * covers it.
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

/**
 * Every way the case's shape differs from the Basic Finner as transcribed,
 * each dimension within 0.5%; its fin leading edges DREV's 0.004 cal radius
 * (the class) or sharp (the BRL sub-class).
 */
function shapeOutside(form: TotalDragForm, leadingEdge: 'drev' | 'sharp'): string[] {
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
  if (form.section.kind !== 'flat-plate') {
    if (leadingEdge === 'drev' && !near(form.leadingEdgeRadius, c.leadingEdgeRadius)) {
      out.push(
        `the leading-edge radius is ${fmt(form.leadingEdgeRadius)} cal, not ` +
          `${c.leadingEdgeRadius} within ${pct}`,
      );
    }
    if (leadingEdge === 'sharp' && form.leadingEdgeRadius !== 0) {
      out.push(
        `the fin leading edges are rounded (${fmt(form.leadingEdgeRadius)} cal radius), not sharp`,
      );
    }
  }
  return out;
}

/** Whether the case lies inside the class that passed the Basic Finner gate, and if not, why. */
export function basicFinnerClass(form: TotalDragForm): ClassCheck {
  const c = BASIC_FINNER_CLASS;
  const out = shapeOutside(form, 'drev');
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
 * The Basic Finner's BRL sub-class (0014 section 10.7 (q)): the one set of
 * cases labelled validated, at exactly the conditions at which BRL Report
 * 934's range A tested the present model and it passed (0020). The Basic
 * Finner as transcribed, each dimension within 0.5%, with sharp fin
 * leading edges (0014 section 10.6 item 3) and the trailing edge constant
 * across the span (item 4, as a single wedge on a rectangular fin is
 * here); in one of two disjoint windows of Mach number, with nothing
 * between them, at the run's Reynolds number per unit Mach number; in the
 * run's air. Every bound is the run's, never wider: the Mach ends are its
 * rounds'; the Reynolds number on length over the Mach number is the same
 * range at every round, since it depends only on the diameter and the air,
 * 4.422072e6 to 4.855414e6 over the run's four corners
 * (docs/research/base-and-total/runs/brl934-range-a.json), rounded inward
 * to four significant figures. (The first rule, of a2e8211, took boxes of
 * Reynolds number over each window, whose corners lay up to 1.8% beyond
 * any round; corrected after the independent review, 0014 section 10.7
 * (q).) The Reynolds number and the temperature are checked apart, so a
 * pair the run never had (288 K at the lowest Reynolds number, say) is
 * inside; the temperature moves the total at a given Reynolds number by
 * little (`tests/app/brl934-sub-class.test.ts`).
 */
export const BRL934_SUB_CLASS = {
  windows: [{ mach: [1.801, 1.827] }, { mach: [2.423, 2.468] }],
  /** The Reynolds number on length over the Mach number. */
  reynoldsPerMach: [4.423e6, 4.855e6],
  /** 0014 section 10.6 item 2: the range's air, 288 to 298 K. */
  temperature: [288, 298],
} as const;

const machWindowsText =
  BRL934_SUB_CLASS.windows.map((w) => `${w.mach[0]} to ${w.mach[1]}`).join(' or ') +
  ', nothing between them';
const perMachText =
  `${sci(BRL934_SUB_CLASS.reynoldsPerMach[0], 3)} to ` +
  `${sci(BRL934_SUB_CLASS.reynoldsPerMach[1], 3)} times the Mach number`;

export interface SubClassCheck extends ClassCheck {
  /** The shape's differences alone (empty when it is the sub-class's shape). */
  readonly shape: readonly string[];
}

/**
 * Whether the case lies inside the BRL sub-class, and if not, why: its
 * shape's differences from it, and its conditions'.
 */
export function brl934SubClass(form: TotalDragForm): SubClassCheck {
  const shape = shapeOutside(form, 'sharp');
  const conditions: string[] = [];
  const m = form.mach;
  if (!BRL934_SUB_CLASS.windows.some((w) => m >= w.mach[0] && m <= w.mach[1])) {
    conditions.push(
      `Mach ${fmt(m)} lies in neither window BRL Report 934's range A tested ` +
        `(Mach ${machWindowsText})`,
    );
  }
  const re = form.reynoldsOnLength;
  const [k0, k1] = BRL934_SUB_CLASS.reynoldsPerMach;
  if (!(re >= k0 * m && re <= k1 * m)) {
    conditions.push(
      `the Reynolds number on length, ${sci(re, 3)}, is outside the range A run's ${perMachText}` +
        (Number.isFinite(m) && m > 0
          ? ` (${sci(k0 * m, 3)} to ${sci(k1 * m, 3)} at Mach ${fmt(m)})`
          : ''),
    );
  }
  const t = form.temperature;
  const [t0, t1] = BRL934_SUB_CLASS.temperature;
  if (!(t >= t0 && t <= t1)) {
    conditions.push(
      `the static temperature, ${fmt(t)} K, is outside the range's air at that test, ${t0} to ` +
        `${t1} K`,
    );
  }
  const outside = [...shape, ...conditions];
  return { inside: outside.length === 0, outside, shape };
}

/**
 * The largest change of the modelled total over the class's static
 * temperatures, from its value at the range's air, as a fraction: at the
 * class's Mach numbers 1.8, 2.0 and 2.15 and Reynolds numbers 1.19e7, 1.6e7
 * and 2.0e7, the largest at Mach 2.15, Re 1.19e7 and 216.65 K
 * (tests/app/total-drag.test.ts; 0011 section 3).
 */
export const TEMPERATURE_SENSITIVITY = 0.0013;
/**
 * The same over the BRL sub-class's 288 to 298 K, from 293 K, at both ends
 * of each Mach window and of its Reynolds number per unit Mach number
 * (tests/app/brl934-sub-class.test.ts).
 */
export const SUB_CLASS_TEMPERATURE_SENSITIVITY = 0.0001;
const sensitivity = `${(100 * TEMPERATURE_SENSITIVITY).toFixed(2)}%`;

/** The class in words, for the page. */
export const CLASS_DESCRIPTION =
  "The Basic Finner's class, as this page decides it (design record 0011): an estimate, not " +
  'validated. Its validated claim is suspended since the fins-on-base factor was corrected ' +
  "after its test (design record 0010, section 11.7); the corrected factor's registered test, " +
  "BRL Report 934's range A, passed at conditions outside the class (lower Reynolds numbers, " +
  'sharp fin leading edges), which make the narrow validated sub-class below (design record ' +
  '0014, section 10.7 (q)). The Basic Finner as transcribed, a ' +
  '20 deg cone (2.836 cal) on a cylinder to a flat base, 10.0 cal overall; four rectangular fins ' +
  'of 1.0 cal root chord and span, their trailing edges at the base; single-wedge sections from a ' +
  '0.004 cal leading-edge radius to a blunt trailing edge 0.08 cal thick; every dimension within ' +
  '0.5%; Mach 1.799 to 2.15 (above it the gate tested a fins-on-base factor read from one of ' +
  "Love's estimates in TN 3819 fig. 35, not from its free-flight curve, and the factor corrected " +
  'since has no hold-out there); Reynolds number 1.19e7 to 2.0e7 on length; static temperature ' +
  `216.65 to 320 K (the shots flew at about 294 K; across this span the modelled total moves by ` +
  `at most ${sensitivity}); zero incidence, power off.`;

/** The BRL sub-class in words, for the page's details (0014 section 10.7 (q)). */
export const SUB_CLASS_DESCRIPTION =
  "The Basic Finner's BRL sub-class, validated (design record 0014, section 10.7 (q)): the " +
  'Basic Finner as transcribed, each dimension within 0.5%, a sharp 20 deg cone on a cylinder ' +
  'to a flat base, 10.0 cal overall; four rectangular fins of 1.0 cal root chord and span, their ' +
  'trailing edges at the base, with sharp leading edges and single-wedge sections to a blunt ' +
  'trailing edge 0.08 cal thick across the span; at Mach ' +
  machWindowsText +
  ` (Mach 1.827 to 2.423 was not tested), with the Reynolds number on length ${perMachText}, ` +
  `as at every round; static temperature ` +
  `${BRL934_SUB_CLASS.temperature[0]} to ${BRL934_SUB_CLASS.temperature[1]} K; zero ` +
  "incidence, power off. These are BRL Report 934's range A as it was run (design record " +
  "0020): the models' diameter (0.78 to 0.82 in), the range's air (288 to 298 K) and the " +
  "fins' trailing-edge area (0.32 cal^2) are not printed in the report and were assumed " +
  '(design record 0014, section 10.6), and the fin leading edges were taken as sharp from ' +
  'period drawings of the model. The Reynolds number and the temperature are checked apart, so ' +
  'some pairs inside (288 K at the lowest Reynolds number, say) were never run; at a given ' +
  'Reynolds number the temperature moves the total by at most ' +
  `${(100 * SUB_CLASS_TEMPERATURE_SENSITIVITY).toFixed(2)}% over 288 to 298 K (and by at most ` +
  `${(100 * TEMPERATURE_SENSITIVITY).toFixed(2)}% over the class's 216.65 to 320 K). The 0.5% ` +
  "tolerance on each dimension is the class's, for typing; it was not tested.";

// ------------------------------------------------------------- the claims

/**
 * Inside the BRL sub-class (0014 section 10.7 (q)): validated, on one test,
 * said plainly. The full list (each round, the trailing-edge term halved,
 * the alternative readings) is in the page's details and in 0020.
 */
export const VALIDATED_CLAIM =
  "Validated: this case lies inside the Basic Finner's narrow sub-class at the conditions of " +
  "BRL Report 934's range A, where this model was tested once, against seven rounds in free " +
  'flight, and passed (design records 0020 and 0014, section 10.7 (q)). Measured over modelled ' +
  'was +3.9% to +11.0%: the model reads low at every round (mean +7.3%), inside tolerances of ' +
  '+-25% to +-28%. That tolerance is wide, so the pass alone says little (design record 0008, ' +
  'section 6.3).';
/** Stated beside it. */
export const ASSUMED_CAVEAT =
  "The models' diameter, the range's air and the fins' trailing-edge area at that test were " +
  'assumed, not printed in the report (design record 0014, section 10.6). The largest ' +
  'sensitivity of the run: with the trailing-edge area halved (a tapered edge), the residuals ' +
  'rise to +14.5% to +22.3%, still inside (design record 0020, section 4).';
export const ROUNDED_EDGE_CAVEAT =
  "DREV's rounded fin leading edge (0.004 cal), in place of the sharp one, was refused in the " +
  "run at the five rounds at Mach 1.80 to 1.83 (the Reynolds number on the edge's diameter " +
  'below 6.7e3, at the nominal or at an end of the diameter and air); at Mach 2.42 and 2.47 it ' +
  'lowers the residuals to -1.1% and -4.2%: a sensitivity, not a verdict (design record 0020, ' +
  'section 4).';
/**
 * Inside the class (0010 section 11.7): the validated claim is suspended.
 * The class passed its hold-out test (0010 section 4.2), but the
 * fins-on-base factor was corrected after it (0010 section 11), and by 0008
 * section 6.1 a term changed after a test is not validated by it. The
 * registered test of the corrected factor, BRL 934's range A, passed at
 * conditions outside the class (0014 section 10.7 (q)), so it validates the
 * BRL sub-class, not this.
 */
export const CLASS_CLAIM =
  "Estimate, not validated: this case lies inside the Basic Finner's class, whose total drag " +
  'passed a hold-out test in free flight (DREV TM 9703: 11 shots at Mach 1.80 to 2.97; design ' +
  'record 0010, section 4.2), but that claim is suspended: the fins-on-base factor was corrected ' +
  'after the test (design record 0010, section 11), and a term changed after a test is not ' +
  'validated by it (design record 0008, section 6.1). The corrected factor has since passed ' +
  "its registered test, BRL Report 934's range A, but at conditions outside this class, so " +
  'that test does not validate it (design record 0014, section 10.7 (q)).';
/** The reason given with it. */
export const SUSPENDED_REASON =
  'the fins-on-base factor was corrected after the Basic Finner gate (design record 0010, ' +
  'section 11), so by design record 0008 section 6.1 the gate no longer validates this class; ' +
  "the corrected factor's registered test, BRL Report 934's range A, has been run and passed " +
  '(design record 0020), but at conditions outside this class: inside its Mach range the ' +
  'rounds flew at Reynolds numbers of 7.96e6 to 8.87e6 on length, below its 1.19e7, and with ' +
  'sharp fin leading edges, not its 0.004 cal radius. Nothing has tested the corrected factor ' +
  'inside this class; that test validates only a narrow sub-class at its own conditions ' +
  '(design record 0014, section 10.7 (q))';
/** Outside the class and the sub-class. */
export const ESTIMATE_CLAIM =
  "Estimate, not validated: this case lies outside the Basic Finner's class (whose validated " +
  'claim is suspended; design record 0010, section 11.7) and outside its narrow validated ' +
  "sub-class at the conditions of BRL Report 934's range A (design record 0014, section 10.7 " +
  '(q)). Each component is inside the domain of its own band, so the total is computed, but ' +
  'no total-drag measurement tests this configuration or condition, and the component bands ' +
  'are estimates here.';
/** Every total (0008 section 6.3). */
export const BAND_CAVEAT =
  "The model-form band is the linear sum of the components' bands and is a minimum: each " +
  'component band is the range seen on a few data sets, not a coverage interval, so the true ' +
  'error can exceed it. The input bands are kept apart from it.';
/** The breakdown, as 0010 section 7 allows it to be claimed. */
export const BREAKDOWN_NOTE =
  'The breakdown: the nose wave drag is solved, its band the numerical error measured from the ' +
  "grids, without the inviscid model's own error (docs/validation/sources.md); body " +
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
 * Validated only inside the BRL sub-class (0014 section 10.7 (q)); every
 * other total is an estimate, with every reason.
 */
export type Claim =
  | { readonly kind: 'validated'; readonly text: string; readonly caveats: readonly string[] }
  | { readonly kind: 'estimate'; readonly text: string; readonly reasons: readonly string[] };

/**
 * Why a case outside both the class and the sub-class is outside: every
 * condition of the class it fails and, when it has the sub-class's shape
 * (sharp fin leading edges), the sub-class's conditions it fails too.
 */
export function outsideReasons(check: ClassCheck, sub: SubClassCheck): string[] {
  return [...check.outside, ...(sub.shape.length === 0 ? sub.outside : [])];
}

/**
 * Inside the BRL sub-class, validated; inside the class, the suspended
 * claim and its reason; outside both, every reason of `outsideReasons`. A
 * total with a component bounded, not measured, is an estimate and names
 * that component (0014 section 10.2); none lies in the sub-class's
 * windows.
 */
/**
 * Why a total whose nose term is not verified (its band measured but wider
 * than the solver's tolerance) is never more than an estimate: a tested
 * claim rests on a verified nose term, as the tests' own exact cone nose
 * was (explicit since 2026-10-23; 0011, 0014 section 10.7 (q)).
 */
export const NOSE_UNVERIFIED_REASON =
  "the nose's drag is not verified for this case (its error band, measured from the grids, is " +
  "wider than the solver's tolerance), so a tested claim does not apply";
/** Inside the BRL sub-class with the nose term not verified. */
export const SUB_CLASS_UNVERIFIED_CLAIM =
  "Estimate, not validated: this case lies inside the Basic Finner's narrow BRL sub-class, but " +
  "the validated claim there rests on a verified nose term, and this case's is not.";

function claimOf(
  check: ClassCheck,
  sub: SubClassCheck,
  bounded: readonly string[],
  noseVerified = true,
): Claim {
  const unverified = noseVerified ? [] : [NOSE_UNVERIFIED_REASON];
  if (sub.inside && bounded.length === 0 && !noseVerified) {
    return { kind: 'estimate', text: SUB_CLASS_UNVERIFIED_CLAIM, reasons: unverified };
  }
  if (sub.inside && bounded.length === 0) {
    return {
      kind: 'validated',
      text: VALIDATED_CLAIM,
      caveats: [ASSUMED_CAVEAT, ROUNDED_EDGE_CAVEAT],
    };
  }
  if (check.inside) {
    return {
      kind: 'estimate',
      text: CLASS_CLAIM,
      reasons: [SUSPENDED_REASON, ...bounded, ...unverified],
    };
  }
  return {
    kind: 'estimate',
    text: ESTIMATE_CLAIM,
    reasons: [...outsideReasons(check, sub), ...bounded, ...unverified],
  };
}

// ---------------------------------------------------------- configuration

export interface Configuration {
  readonly config: FinnedBody;
  readonly conditions: FlightConditions;
  readonly inputs: DragInputs;
}

/** The input of the fins' place, as its refusal names it (the page words it "the fins reach past the base"). */
export const FINS_AHEAD_OF_BASE = "the distance of the fins' trailing edges ahead of the base";

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
  nonNegative('fins', FINS_AHEAD_OF_BASE, form.trailingEdgeAheadOfBase);
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
  /** The allowance included in the band, relative (FITTED_DRAG_FLOOR if not given). */
  readonly floor?: number;
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
      'numerical error of the inviscid solve, measured from the grids, with an allowance of ' +
      `${allowanceText(solve.floor ?? FITTED_DRAG_FLOOR)} of the value (0006); the model's own error ` +
      'is not in this band (docs/validation/sources.md)' +
      (bandCaveat(solve.floor ?? FITTED_DRAG_FLOOR, solve.grids) === ''
        ? ''
        : `. ${bandCaveat(solve.floor ?? FITTED_DRAG_FLOOR, solve.grids)}`),
  };
}

export type NoseState =
  | {
      readonly kind: 'solved';
      readonly component: DragComponent;
      /**
       * Whether the nose term is verified: the solve's band within the
       * solver's tolerance, or an exact value (Taylor-Maccoll). Required, and
       * anything but true counts as not verified (fail closed): no claim is
       * then more than an estimate.
       */
      readonly verified: boolean;
    }
  /** Solved without a band, or not solved: the total is refused. */
  | { readonly kind: 'refused'; readonly message: string }
  /** Not yet solved for this nose, body and Mach number. */
  | { readonly kind: 'pending' };

// ----------------------------------------------------------------- the view

export type TotalDragView =
  | {
      readonly kind: 'refused';
      readonly refusals: readonly ComponentRefusal[];
      /**
       * The parts served, each with its band and label, and the floor or why
       * none is given (0011 section 10); null where nothing is computed (the
       * inputs refused, or a method failed).
       */
      readonly parts: RefusedTotalParts | null;
    }
  | { readonly kind: 'pending'; readonly check: ClassCheck; readonly subClass: SubClassCheck }
  | {
      readonly kind: 'total';
      readonly total: TotalDrag;
      /** The model-form band with every input band added linearly. */
      readonly withInputs: readonly [number, number];
      readonly check: ClassCheck;
      readonly subClass: SubClassCheck;
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
  'L52E06, NSWCDD/TR-92/509), wider than a measurement on these fins would give; for plates, ' +
  "bounded, not measured, from RM L52E06's relief with plates at the base. Some of its data are " +
  'read once, each named in its label: two noses of RM L52J21a at Mach 2.41, which do not set its ' +
  'lowest member above Mach 1.62 (set at Mach 1.93 on calls both readers agree on) but whose second ' +
  'reading could lower it; three symbols of TN 2360 fig. 6 at stations ahead of the base; and, for ' +
  "leading edges swept under 45 deg, NSWCDD/TR-92/509's table.";
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

/** The rebuilt factor's bounded values (0015 sections 3.1 and 4), named in the claim as 0014 section 10.2 asks. */
export const W1_BOUNDED_REASON =
  "the body base's rebuilt fins-on-base factor is bounded, not measured (flat faces at a square " +
  'trailing edge, fins ending ahead of the base below Mach 1.5, or above Mach ' +
  `${FIG35_FREE_FLIGHT_END}, where the free-flight curve of TN 3819 fig. 35 ends; 0015)`;

/** The bounded components a total contains, named in its claim (0014 section 10.2). */
export function boundedReasons(base: BodyBaseDrag | undefined): string[] {
  if (base?.finsOnBase?.bounded !== true) return [];
  return [base.finsOnBaseSource === 'rebuilt' ? W1_BOUNDED_REASON : BOUNDED_REASON];
}

/** What the components' labels do not carry. */
function notesOf(base: BodyBaseDrag | undefined): string[] {
  const notes = [FINS_BAND_NOTE];
  // Flags of the fins-on-base factor (0010 sections 1.3 and 11).
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

/** Why a nose gives no part to a refused total's floor (0011 section 10.4). */
export const NOSE_NOT_SOLVED_FLOOR = 'the nose wave drag has not been solved at this Mach number';
export const NOSE_REFUSED_FLOOR = 'the nose wave drag has no number (its reason is listed)';

function noseForFloor(nose: NoseState): NoseForFloor {
  switch (nose.kind) {
    case 'solved':
      return { kind: 'served' };
    case 'pending':
      return { kind: 'not-solved', reason: NOSE_NOT_SOLVED_FLOOR };
    case 'refused':
      return { kind: 'not-solved', reason: NOSE_REFUSED_FLOOR };
  }
}

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
    return { kind: 'refused', refusals: [...noseRefusal, ...configuration.refusals], parts: null };
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
      parts: null,
    };
  };
  let parts: ReturnType<typeof finnedBodyComponents>;
  try {
    parts = finnedBodyComponents(config, conditions, noseTerm, inputs);
  } catch (e) {
    return failed(e);
  }
  const refusals = [...noseRefusal, ...parts.refusals];
  if (refusals.length > 0) {
    return {
      kind: 'refused',
      refusals,
      parts: refusedTotalParts(config, conditions, parts, noseForFloor(nose)),
    };
  }
  const check = basicFinnerClass(form);
  const subClass = brl934SubClass(form);
  if (nose.kind !== 'solved') return { kind: 'pending', check, subClass };
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
    subClass,
    // Fail closed: only an explicit true counts (a state read from JSON may lack the flag).
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
    claim: claimOf(check, subClass, boundedReasons(parts.base), nose.verified === true),
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

// ------------------------------------------------------ the BRL test, as published

export interface PublishedRound {
  readonly round: number;
  readonly mach: number;
  /** BRL Report 934's zero-yaw drag coefficient, as the run derived it (0020 section 1). */
  readonly cd0: number;
  /** Modelled C_D and its model-form band, as the run recorded it. */
  readonly cd: number;
  readonly low: number;
  readonly high: number;
  /** CD0 / modelled - 1, percent to one decimal. */
  readonly residual: number;
  /** The tolerance on the residual, percent to one decimal. */
  readonly tolerance: readonly [number, number];
}

/**
 * BRL Report 934's range A, run once as registered (0020 section 2): the
 * present model at its seven rounds, sharp fin leading edges, every round
 * inside its tolerance. Held by the tests to the run's recorded output
 * (docs/research/base-and-total/runs/brl934-range-a.json) and to the
 * page's own total at each round; each band rounded outward, as every
 * band on the page is, the other values to the nearest last digit.
 */
export const PUBLISHED_BRL934: readonly PublishedRound[] = [
  {
    round: 2591,
    mach: 1.801,
    cd0: 0.6033,
    cd: 0.5804,
    low: 0.498,
    high: 0.6974,
    residual: 3.9,
    tolerance: [-27.1, 27.0],
  },
  {
    round: 2588,
    mach: 1.802,
    cd0: 0.6145,
    cd: 0.58,
    low: 0.4977,
    high: 0.6969,
    residual: 6.0,
    tolerance: [-27.1, 27.0],
  },
  {
    round: 2590,
    mach: 1.803,
    cd0: 0.6436,
    cd: 0.5796,
    low: 0.4974,
    high: 0.6964,
    residual: 11.0,
    tolerance: [-27.1, 27.0],
  },
  {
    round: 2596,
    mach: 1.814,
    cd0: 0.6236,
    cd: 0.5752,
    low: 0.4941,
    high: 0.6907,
    residual: 8.4,
    tolerance: [-27.0, 27.0],
  },
  {
    round: 2589,
    mach: 1.827,
    cd0: 0.6115,
    cd: 0.57,
    low: 0.4903,
    high: 0.6841,
    residual: 7.3,
    tolerance: [-26.8, 27.0],
  },
  {
    round: 3263,
    mach: 2.423,
    cd0: 0.4698,
    cd: 0.4314,
    low: 0.3725,
    high: 0.5189,
    residual: 8.9,
    tolerance: [-24.9, 27.9],
  },
  {
    round: 3264,
    mach: 2.468,
    cd0: 0.4484,
    cd: 0.424,
    low: 0.3662,
    high: 0.5098,
    residual: 5.8,
    tolerance: [-24.8, 28.0],
  },
];
