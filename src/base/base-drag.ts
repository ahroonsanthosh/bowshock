/**
 * Base drag of a body of revolution with a cylindrical afterbody, power
 * off, zero incidence, turbulent boundary layer at the base: step B3 of
 * docs/design/0008-total-drag.md (section 3). A library: nothing is
 * served on the page.
 *
 *   body base:  C_D = -P_B(M) F (A_base / A_ref)
 *
 * with P_B Love's basic curve of TN 3819 fig. 18 (./compiled-curve.ts) and
 * F the fins-on-base factor (./fins-on-base.ts) when fins end at the base,
 * F = 1 without fins near the base. The band adds linearly, as 0008
 * section 6.3 requires:
 *
 * - the compiled curve's band, measured over curve 0.82 to 1.08, on the
 *   term with the nominal F;
 * - the interpolation-error bound of the curve, times F and the area ratio;
 * - the fins-on-base band, (F_low - F) and (F_high - F) times -P_B and the
 *   area ratio.
 *
 * Fins: with their trailing edges at the base, the factor applies; ending
 * one root chord or more ahead of it, the plain curve (TN 2360 found the
 * increment nearly zero one chord fore or aft, not quantified), labelled
 * not validated with fins (0008 section 6.4: no total-drag case with fins
 * clear of the base was found); in between, refused (no data transcribed).
 *
 * Blunt fin trailing edges are a further base, ./fin-trailing-edge.ts.
 */

import {
  COMPILED_CURVE_BAND,
  compiledCurveBasePressure,
  type CompiledCurveBasePressure,
} from './compiled-curve';
import { finsOnBaseFactor, type FinsAtBase, type FinsOnBaseFactor } from './fins-on-base';
import { BaseRefusal } from './refusal';

export const COMPILED_CURVE_LABEL =
  'correlation: compiled base-pressure curve of TN 3819 fig. 18 (Love), band 0.82 to 1.08 ' +
  'measured over curve, estimated on its tunnel points and Herrin and Dutton, tested only in ' +
  'the total';

export interface BaseFins extends FinsAtBase {
  /** Distance of the fins' trailing edges ahead of the base, in root chords (0: at the base). */
  readonly trailingEdgeAheadOfBase: number;
}

export interface BodyBaseInput {
  /** Free-stream Mach number. */
  readonly mach: number;
  readonly afterbody: 'cylinder' | 'boat-tail' | 'flare';
  readonly boundaryLayerAtBase: 'turbulent' | 'laminar';
  /** Base area over the reference area of C_D. */
  readonly baseAreaRatio: number;
  readonly fins?: BaseFins;
}

export interface BodyBaseDrag {
  readonly cd: number;
  /** Lowest and highest C_D the model-form band allows (linear sum of its parts). */
  readonly low: number;
  readonly high: number;
  readonly curve: CompiledCurveBasePressure;
  /** The fins-on-base factor, when fins end at the base. */
  readonly finsOnBase: FinsOnBaseFactor | undefined;
  /** The band's parts, in C_D: [below, above] the nominal. */
  readonly parts: {
    readonly curveBand: readonly [number, number];
    readonly interpolation: readonly [number, number];
    readonly finsOnBase: readonly [number, number];
  };
  readonly labels: readonly string[];
}

export function bodyBaseDrag(input: BodyBaseInput): BodyBaseDrag {
  const { mach, afterbody, boundaryLayerAtBase, baseAreaRatio, fins } = input;
  if (afterbody !== 'cylinder') {
    throw new BaseRefusal(
      'afterbody',
      `the base-pressure correlation is for cylindrical afterbodies; a ${afterbody} is refused ` +
        '(0008 section 3.2: boat-tail effects not quantified by any opened source)',
    );
  }
  if (boundaryLayerAtBase !== 'turbulent') {
    throw new BaseRefusal(
      'laminar-base',
      'the base-pressure correlation is for turbulent boundary layers; a laminar layer at the ' +
        'base is refused',
    );
  }
  if (!(baseAreaRatio > 0 && Number.isFinite(baseAreaRatio))) {
    throw new BaseRefusal('input', `the base area ratio must be positive, got ${baseAreaRatio}`);
  }
  const curve = compiledCurveBasePressure(mach);
  const labels = [COMPILED_CURVE_LABEL];
  let factor: FinsOnBaseFactor | undefined;
  if (fins !== undefined) {
    const x = fins.trailingEdgeAheadOfBase;
    if (!(x >= 0 && Number.isFinite(x))) {
      throw new BaseRefusal('input', `the fins' trailing edges must lie at or ahead of the base`);
    }
    if (x === 0) {
      factor = finsOnBaseFactor(mach, fins);
      labels.push(factor.label);
    } else if (x < 1) {
      throw new BaseRefusal(
        'fins-near-base',
        `fins ending ${x} root chords ahead of the base: the fins-on-base factor is measured with ` +
          'the trailing edges at the base, and the variation to one chord ahead (TN 2360) is not ' +
          'transcribed',
      );
    } else {
      labels.push(
        'fins one chord or more ahead of the base: compiled curve without fins, not validated ' +
          'with fins (0008 section 6.4)',
      );
    }
  }
  const q = -curve.pB;
  const f = factor?.nominal ?? 1;
  const cd = q * f * baseAreaRatio;
  const curveBand = [
    (COMPILED_CURVE_BAND.low - 1) * cd,
    (COMPILED_CURVE_BAND.high - 1) * cd,
  ] as const;
  const e = curve.interpolationError * f * baseAreaRatio;
  const interpolation = [-e, e] as const;
  const finsBand =
    factor === undefined
      ? ([0, 0] as const)
      : ([
          (factor.low - factor.nominal) * q * baseAreaRatio,
          (factor.high - factor.nominal) * q * baseAreaRatio,
        ] as const);
  return {
    cd,
    low: cd + curveBand[0] + interpolation[0] + finsBand[0],
    high: cd + curveBand[1] + interpolation[1] + finsBand[1],
    curve,
    finsOnBase: factor,
    parts: { curveBand, interpolation, finsOnBase: finsBand },
    labels,
  };
}
