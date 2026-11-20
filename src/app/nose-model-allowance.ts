/**
 * The nose's model-form allowance on the page (design record 0022,
 * registered as 0014 section 10.7 (w), wired by (am)): where a measured
 * wind-tunnel nose of the same family lies within +-0.25 calibers and
 * +-0.05 in Mach of the nose solved, the nose's band carries the measured
 * difference between the inviscid model and those pressures, symmetric
 * about the value, beside the numerical band; elsewhere the band is the
 * numerical error only, and says so.
 *
 * The boxes are the results of 0022's integration script on the paired
 * blind readings (`docs/research/nose-model-form/out/blind-run.json` and
 * `blind-run-2.json`), copied here to the bit and tested against those
 * files (tests/app/nose-model-allowance.test.ts). Every box rests on a set
 * seen before its registration: it may only widen, it is never a test, and
 * its label says so (0014 (w) item 3). Rows below Mach 1.05 (0014 (y)) are
 * not here: their results are not released.
 */

import type { Nose } from '../geometry/nose';
import {
  allowanceAt,
  type Allowance,
  type Box,
  type NoseFamily,
} from '../validation/nose-model-form';

/** A box of 0022 section 4.4 with the words the page gives its source. */
export interface NoseModelBox extends Box {
  /** The source in a reader's words: the report, the body, its Mach number and tunnel Reynolds number. */
  readonly source: string;
}

const TN4233_RE = 'tunnel Reynolds number 2.4e6 on the cone’s length';
const TN4233_FINENESS = 4.081989276071384;
const TN4233_A = 'TN 4233, 7 deg cone, table I(a), Ames 2- by 2-foot';
const TN4233_B = 'TN 4233, 7 deg cone, table I(b), Ames 14-foot';
const TN4233_REYNOLDS =
  '2.4e6 on the 5.50 in. cone length (text p. 7); the report does not say whether the 14-foot run used the same value (B)';

const tn4233 = (id: string, mach: number, halfWidth: number): NoseModelBox => ({
  id,
  family: 'cone',
  fineness: TN4233_FINENESS,
  mach,
  reynolds: TN4233_REYNOLDS,
  seen: true,
  measure: 'ratio',
  halfWidth,
  floor: null,
  source: `NACA TN 4233, a 7 deg cone of 4.08 calibers at Mach ${mach} (${TN4233_RE})`,
});

/** The measured boxes (0022 section 4.4), from the paired blind readings. */
export const NOSE_MODEL_BOXES: readonly NoseModelBox[] = [
  {
    id: 'TN 3716, 3-caliber tangent ogive',
    family: 'tangent ogive',
    fineness: 3,
    mach: 1.98,
    reynolds: '0.39x10^6 per inch (0.45e6 on the body diameter, as the text states)',
    seen: true,
    measure: 'ratio',
    halfWidth: 0.16414839743603604,
    floor: 0.144,
    source:
      'NACA TN 3716, a 3-caliber tangent ogive at Mach 1.98 (tunnel Reynolds number 0.45e6 on ' +
      'the diameter)',
  },
  {
    id: 'RM A53E01, 5.75-caliber tangent ogive (model 2)',
    family: 'tangent ogive',
    fineness: 5.75,
    mach: 1.98,
    reynolds:
      '0.5x10^6 per inch (text p. 5 and table II heading); the summary (p. 2) says about 0.5e6 on the body diameter: UNRESOLVED, recorded only; the script uses Re for nothing',
    seen: true,
    measure: 'ratio',
    halfWidth: 0.2126241678549045,
    floor: 0.161,
    source:
      'NACA RM A53E01, a 5.75-caliber tangent ogive at Mach 1.98 (tunnel Reynolds number 0.5e6, ' +
      'per inch in its text and on the diameter in its summary)',
  },
  tn4233(TN4233_A, 1.08, 0.10707290842275309),
  tn4233(TN4233_A, 1.1, 0.07724748643207757),
  tn4233(TN4233_A, 1.151, 0.08535501568537357),
  tn4233(TN4233_A, 1.2, 0.09410351519421374),
  tn4233(TN4233_A, 1.299, 0.0781551187911795),
  tn4233(TN4233_A, 1.4, 0.0558114247395896),
  tn4233(TN4233_B, 1.078, 0.12751870443103236),
  tn4233(TN4233_B, 1.1, 0.10585109194829448),
  {
    id: 'RM E51H17, 4.77 deg cone',
    family: 'cone',
    fineness: 5.991965126060028,
    mach: 3.85,
    reynolds:
      '3.85e6 in the summary (basis not stated) and 1.1e6 per foot in the text, both far below flight; the basis conflict is recorded, not resolved',
    seen: true,
    measure: 'ratio',
    halfWidth: 0.6649486135132016,
    floor: null,
    source:
      'NACA RM E51H17, a 4.77 deg cone of 5.99 calibers at Mach 3.85 (tunnel Reynolds number far ' +
      'below flight: 3.85e6 on a basis not stated, or 1.1e6 per foot)',
  },
];

/**
 * The family of 0022 section 4.4 a nose belongs to, where a measured box
 * can hold it: a cone, or a tangent ogive (the ogive parameter 1, an arc
 * meeting the body tangentially). Every other shape, the ogive's secant
 * portions included, has no measured box: null.
 */
export function noseFamilyOf(nose: Nose): NoseFamily | null {
  const s = nose.shape;
  if (s.kind === 'conical') return 'cone';
  if (s.kind === 'ogive' && s.parameter === 1) return 'tangent ogive';
  return null;
}

/** The allowance at this nose and Mach number (0022 section 4.4), or null outside every box. */
export function noseModelAllowance(nose: Nose, mach: number): NoseModelAllowance | null {
  const family = noseFamilyOf(nose);
  if (family === null) return null;
  const fineness = nose.length / (2 * nose.baseRadius);
  const found = allowanceAt(NOSE_MODEL_BOXES, family, fineness, mach);
  if (found === null || !(found.halfWidth > 0)) return null;
  const boxes = NOSE_MODEL_BOXES.filter((b) =>
    found.boxes.some((f) => f.id === b.id && f.mach === b.mach),
  );
  return { ...found, sources: boxes.map((b) => b.source) };
}

export interface NoseModelAllowance extends Allowance {
  /** Each containing box's source, in a reader's words. */
  readonly sources: readonly string[];
}
