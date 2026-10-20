/**
 * Base drag of a body of revolution with a cylindrical afterbody, power
 * off, zero incidence, turbulent boundary layer at the base: step B3 of
 * docs/design/0008-total-drag.md (section 3). A library, served only as
 * part of the total drag (src/total).
 *
 *   body base:  C_D = -P_B(M) F (A_base / A_ref)
 *
 * with P_B Love's basic curve of TN 3819 fig. 18 (./compiled-curve.ts; below Mach 1.5, down to 1.0,
 * continued with W2's band and its nominal at the band's midpoint, ./base-w2.ts) and
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
 * increment nearly zero one chord fore or aft), labelled not validated
 * with fins (0008 section 6.4: no total-drag case with fins clear of the
 * base was found).
 *
 * Which factor (0014 section 10.3, docs/design/0015-fins-at-the-base.md
 * section 5): the present factor (./fins-on-base.ts) wherever it serves,
 * so the Basic Finner's validated total keeps it; the rebuilt factor
 * (./fins-on-base-w1.ts) only where the present factor refuses (fins other
 * than four, thinner than 5%, at Mach 1.5 to 1.8, or ending within a chord
 * ahead of the base), and only when the fins' section and sweeps are given
 * (`nearBase`); otherwise the present refusal stands. This routing holds
 * until the owner decides otherwise after BRL 934's run.
 *
 * The vacuum bound (./vacuum.ts): the term and its band's ends are each at
 * most 2 / (gamma M^2) times the area ratio, clamped there (`vacuumClamped`
 * lists what was; the parts are reported unclamped). Over M 1.5 to 3.0 no
 * value reaches it (the band's high end is at most 0.9535 of it, at M 3.0
 * with fins at the base; 0.656 without fins); the clamp is a guard.
 *
 * Blunt fin trailing edges are a further base, ./fin-trailing-edge.ts.
 */

import {
  COMPILED_CURVE_BAND,
  compiledCurveBasePressure,
  type CompiledCurveBasePressure,
} from './compiled-curve';
import { W2_BAND, W2_LABEL, W2_MACH_RANGE, w2CurveBasePressure } from './base-w2';
import { finsOnBaseFactor, type FinsAtBase, type FinsOnBaseFactor } from './fins-on-base';
import { finsOnBaseFactorW1, type FinsNearBase, type FinsOnBaseFactorW1 } from './fins-on-base-w1';
import { BaseRefusal } from './refusal';
import { vacuumBaseDrag } from './vacuum';

export const COMPILED_CURVE_LABEL =
  'correlation: compiled base-pressure curve of TN 3819 fig. 18 (Love), band 0.82 to 1.08 ' +
  'measured over curve, estimated on its tunnel points and Herrin and Dutton, tested only in ' +
  'the total';

export interface BaseFins extends FinsAtBase {
  /** Distance of the fins' trailing edges ahead of the base, in root chords (0: at the base). */
  readonly trailingEdgeAheadOfBase: number;
  /**
   * The fins' section and sweeps, for the rebuilt factor (./fins-on-base-w1.ts) where the present one
   * refuses; without them the present factor's refusal stands.
   */
  readonly nearBase?: Omit<FinsNearBase, 'count' | 'trailingEdgeAheadOfBase'>;
}

/** Which fins-on-base factor a body base used: the present one (0010 section 1.3) or the rebuilt one (0015). */
export type FinsOnBaseSource = 'present' | 'rebuilt';

/** The label added to the rebuilt factor's, saying why it, not the present factor, is used. */
export const FINS_ON_BASE_ROUTING_LABEL =
  'the rebuilt factor is used because the present factor (0010 section 1.3), which the Basic ' +
  "Finner's validated total keeps, does not cover these fins";

export interface BodyBaseInput {
  /** Free-stream Mach number. */
  readonly mach: number;
  readonly afterbody: 'cylinder' | 'boat-tail' | 'flare';
  readonly boundaryLayerAtBase: 'turbulent' | 'laminar';
  /** Base area over the reference area of C_D. */
  readonly baseAreaRatio: number;
  readonly fins?: BaseFins;
}

/** The curve's band over the curve, and the nominal's ratio to the curve (1 from M 1.5; W2's midpoint below). */
export interface CurveBand {
  readonly low: number;
  readonly high: number;
  readonly nominal: number;
  /** 'compiled' from M 1.5 (0008 section 3.3); 'w2' below (0015 section 11). */
  readonly source: 'compiled' | 'w2';
}

export interface BodyBaseDrag {
  readonly cd: number;
  /** Lowest and highest C_D the model-form band allows (linear sum of its parts). */
  readonly low: number;
  readonly high: number;
  readonly curve: CompiledCurveBasePressure;
  readonly curveBand: CurveBand;
  /** The fins-on-base factor, when fins end at the base or within a chord of it. */
  readonly finsOnBase: FinsOnBaseFactor | FinsOnBaseFactorW1 | undefined;
  /** Which factor that is (undefined without one). */
  readonly finsOnBaseSource: FinsOnBaseSource | undefined;
  /** Where the rebuilt factor is used: the present factor's refusal it stands in for (x/c within a chord: none). */
  readonly presentRefusal: BaseRefusal | undefined;
  /** The band's parts, in C_D: [below, above] the nominal. */
  readonly parts: {
    readonly curveBand: readonly [number, number];
    readonly interpolation: readonly [number, number];
    readonly finsOnBase: readonly [number, number];
  };
  readonly labels: readonly string[];
  /** The vacuum bound on the term, C_D: 2 / (gamma M^2) times the area ratio. No value here exceeds it. */
  readonly vacuum: number;
  /** The values the vacuum bound clamped, by name ('term', 'band high end'). */
  readonly vacuumClamped: readonly string[];
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
  // W2 (0015 section 11): below Mach 1.5 the curve continued, its band set on free-flight data.
  const below = mach >= W2_MACH_RANGE[0] && mach < W2_MACH_RANGE[1];
  const curve = below ? w2CurveBasePressure(mach) : compiledCurveBasePressure(mach);
  const curveRange: CurveBand = below
    ? { ...W2_BAND, source: 'w2' }
    : {
        low: COMPILED_CURVE_BAND.low,
        high: COMPILED_CURVE_BAND.high,
        nominal: 1,
        source: 'compiled',
      };
  const labels = [below ? W2_LABEL : COMPILED_CURVE_LABEL];
  // 0014 section 10.2: a bounded component states its gap's size in C_D beside it.
  const gapOf = (f: FinsOnBaseFactorW1) =>
    f.bounded
      ? `; the gap between the bounds is ${((f.high - f.low) * -curve.pB * curveRange.nominal * baseAreaRatio).toFixed(4)} ` +
        'in C_D'
      : '';
  let factor: FinsOnBaseFactor | FinsOnBaseFactorW1 | undefined;
  let source: FinsOnBaseSource | undefined;
  let presentRefusal: BaseRefusal | undefined;
  if (fins !== undefined) {
    const x = fins.trailingEdgeAheadOfBase;
    if (!(x >= 0 && Number.isFinite(x))) {
      throw new BaseRefusal('input', `the fins' trailing edges must lie at or ahead of the base`);
    }
    const rebuilt = (): FinsOnBaseFactorW1 => {
      const near = fins.nearBase;
      if (near === undefined) {
        throw (
          presentRefusal ??
          new BaseRefusal(
            'fins-near-base',
            `fins ending ${x} root chords ahead of the base: the present fins-on-base factor is ` +
              "measured with the trailing edges at the base, and the fins' section and sweeps, which " +
              'the rebuilt factor (0015) needs, are not given',
          )
        );
      }
      try {
        return finsOnBaseFactorW1(mach, { ...near, count: fins.count, trailingEdgeAheadOfBase: x });
      } catch (e) {
        if (!(e instanceof BaseRefusal) || presentRefusal === undefined) throw e;
        throw new BaseRefusal(
          e.reason,
          `${e.message}; the present factor (0010 section 1.3) refuses it too: ${presentRefusal.message}`,
        );
      }
    };
    if (x === 0) {
      try {
        factor = finsOnBaseFactor(mach, fins);
        source = 'present';
        labels.push(factor.label);
      } catch (e) {
        if (!(e instanceof BaseRefusal)) throw e;
        presentRefusal = e;
        const w1 = rebuilt();
        factor = w1;
        source = 'rebuilt';
        labels.push(`${w1.label}${gapOf(w1)}; ${FINS_ON_BASE_ROUTING_LABEL} (${e.message})`);
      }
    } else if (x < 1) {
      const w1 = rebuilt();
      factor = w1;
      source = 'rebuilt';
      labels.push(
        `${w1.label}${gapOf(w1)}; ${FINS_ON_BASE_ROUTING_LABEL} (it takes fins at the base only)`,
      );
    } else {
      labels.push(
        'fins one chord or more ahead of the base: compiled curve without fins, not validated ' +
          'with fins (0008 section 6.4)',
      );
    }
  }
  // The body's base pressure served: the curve times the band's nominal ratio (1 from M 1.5).
  const q = -curve.pB * curveRange.nominal;
  const f = factor?.nominal ?? 1;
  const vacuum = vacuumBaseDrag(mach) * baseAreaRatio;
  const vacuumClamped: string[] = [];
  const atMostVacuum = (value: number, what: string) => {
    if (value <= vacuum) return value;
    vacuumClamped.push(what);
    return vacuum;
  };
  const cd = atMostVacuum(q * f * baseAreaRatio, 'term');
  const curveBand = [
    (curveRange.low / curveRange.nominal - 1) * cd,
    (curveRange.high / curveRange.nominal - 1) * cd,
  ] as const;
  const e = curve.interpolationError * curveRange.nominal * f * baseAreaRatio;
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
    low: atMostVacuum(cd + curveBand[0] + interpolation[0] + finsBand[0], 'band low end'),
    high: atMostVacuum(cd + curveBand[1] + interpolation[1] + finsBand[1], 'band high end'),
    curve,
    curveBand: curveRange,
    finsOnBase: factor,
    finsOnBaseSource: source,
    presentRefusal,
    parts: { curveBand, interpolation, finsOnBase: finsBand },
    labels,
    vacuum,
    vacuumClamped,
  };
}
