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
 * F the fins-on-base factor (./fins-on-base.ts or ./fins-on-base-w1.ts) when fins end at or near the base,
 * F = 1 without fins near the base. The band adds linearly, as 0008
 * section 6.3 requires:
 *
 * - the compiled curve's band, measured over curve 0.77 to 1.18 (0014
 *   section 10.7 (ah); 0.82 to 1.08 before), on the term with the nominal F;
 * - the interpolation-error bound of the curve, times F and the area ratio;
 * - the fins-on-base band, (F_low - F) and (F_high - F) times -P_B and the
 *   area ratio. Above M 2.56, where TN 3819 fig. 35's free-flight curve
 *   ends, the factor is bounded, not measured (0014 section 10.2), and its
 *   label carries the gap between the bounds in C_D.
 *
 * Fins: with their trailing edges at the base, the factor applies; ending
 * one root chord or more ahead of it, the plain curve (TN 2360 found the
 * increment nearly zero one chord fore or aft), labelled not validated
 * with fins (0008 section 6.4: no total-drag case with fins clear of the
 * base was found).
 *
 * Which factor (0014 sections 10.3 and 10.7, docs/design/0015-fins-at-the-base.md
 * section 5): the present factor (./fins-on-base.ts) for the fin families it
 * was measured on (unswept wedge, circular-arc and hexagonal sections, 5% to
 * 10%, with the extension below 5% of 0016 section 18), so the Basic Finner's
 * gated total keeps it; the rebuilt factor (./fins-on-base-w1.ts) where the
 * present factor refuses (fins other than four, swept at either edge, at Mach
 * 1.0 to 1.8, ending within a chord ahead of the base) and for flat-faced
 * fins (plates), which the present factor is not measured on, when the fins'
 * section and sweeps are given (`nearBase`); otherwise the present refusal
 * stands. Below Mach 1.5 the rebuilt factor's members built on fig. 35's
 * free-flight line apply to the curve itself, not on top of W2's midpoint
 * (0015 section 11.2). This routing holds until the owner decides otherwise
 * after BRL 934's run.
 *
 * The vacuum bound (./vacuum.ts): the term and its band's ends are each at
 * most 2 / (gamma M^2) times the area ratio, clamped there (`vacuumClamped`
 * lists what was; the parts are reported unclamped). Over M 1.5 to 3.0 no
 * value reaches it (the band's high end is at most 0.8840 of it, at M 3.0
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
  'correlation: compiled base-pressure curve of TN 3819 fig. 18 (Love), band ' +
  `${COMPILED_CURVE_BAND.low.toFixed(2)} to ${COMPILED_CURVE_BAND.high.toFixed(2)} measured over curve, ` +
  'set on every body-alone base pressure opened in its domain (0008 section 3.3, 0014 section 10.7 ' +
  '(ah)), tested only in the total';

export interface BaseFins extends FinsAtBase {
  /** Distance of the fins' trailing edges ahead of the base, in root chords (0: at the base). */
  readonly trailingEdgeAheadOfBase: number;
  /**
   * The fins' section and sweeps, for the rebuilt factor (./fins-on-base-w1.ts) where the present one
   * refuses; without them the present factor's refusal stands.
   */
  readonly nearBase?: Omit<FinsNearBase, 'count' | 'trailingEdgeAheadOfBase'>;
  /**
   * The thinnest station's thickness over chord and the share of the span
   * thinner than the factor's thinnest data (a flat plate of varying chord;
   * 0016 section 18). Absent: every station has thicknessRatio.
   */
  readonly thinnest?: { readonly thicknessRatio: number; readonly spanShareBelow: number };
  /**
   * Flat faces near the trailing edge (plates, and plates bevelled at the leading edge only): the present
   * factor is not measured on them, so they go to the rebuilt factor's flat-plate value, RM L52E06's relief
   * its low end (0014 section 10.7, 2026-10-21).
   */
  readonly flatFaced?: boolean;
}

/** Why the present factor refuses flat plates at the base (0014 section 10.7 (e); 0016 section 20). */
export const FLAT_PLATES_AT_BASE_REFUSAL =
  'the present fins-on-base factor is measured on wedge, circular-arc and hexagonal sections, not on ' +
  'fins with flat faces at the trailing edge (plates), which lower the base drag by up to 15% at the ' +
  'base (RM L52E06 fig. 7, F 0.85 to 0.88; 0014 section 10.7)';

/** The thinnest fins the fins-on-base factor's data hold: 5% thick (TN 2360, TN 3819 fig. 35). */
export const FINS_ON_BASE_THINNEST_DATA = 0.05;

/**
 * Fins thinner than the factor's 5% data at some station, none thicker than
 * 10% (0016 section 18, the coordinator's rule; since 0016 section 20 for the
 * wedge, circular-arc and hexagonal families only, flat plates being refused): the factor at 5%, its low
 * end taken as no fin effect (F = 1), the physical limit, since thinner fins
 * lower the base pressure less, its high end kept (it rests on the 10% fins
 * and the tunnel data), the nominal the midpoint.
 */
function extendedBelowThinnestData(
  f: FinsOnBaseFactor,
  thicknessRatio: number,
  spanShare: number,
): FinsOnBaseFactor {
  return {
    ...f,
    low: 1,
    nominal: 0.5 * (1 + f.high),
    label:
      `${f.label}; extended below the data's 5% thickness: t/c down to ` +
      `${thicknessRatio.toFixed(3)} over ${(100 * spanShare).toFixed(0)}% of the span, the low ` +
      'end taken as no fin effect (F = 1; thinner fins lower the base pressure less), the high ' +
      "end the factor's own, which rests on the 10% fins and the tunnel data (0016)",
  };
}

/** Which fins-on-base factor a body base used: the present one (0010 section 1.3) or the rebuilt one (0015). */
export type FinsOnBaseSource = 'present' | 'rebuilt';

/** The label added to the rebuilt factor's, saying why it, not the present factor, is used. */
export const FINS_ON_BASE_ROUTING_LABEL =
  'the rebuilt factor is used because the present factor (0010 section 1.3), which the Basic ' +
  "Finner's gated total keeps, does not cover these fins";

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
  // Below M 1.5 W2's continuation, which refuses below 1.0 with its own reason.
  const below = mach < W2_MACH_RANGE[1];
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
  const gapOf = (f: { readonly bounded: boolean; readonly low: number; readonly high: number }) =>
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
    // Below M 1.5 the served body base is W2's, the curve times its band's midpoint (1.04), a free-flight
    // correction. The rebuilt factor's members built on fig. 35's free-flight line are already free-flight
    // values over the curve itself, so they apply to the curve at nominal 1, not on top of W2's midpoint
    // (0015 section 11.2); the zero member and the flat plates' relief, ratios to the body without fins,
    // apply to W2's term as it is.
    const onW2Curve = (w: FinsOnBaseFactorW1): FinsOnBaseFactorW1 => {
      if (!below || curveRange.nominal === 1) return w;
      const s = 1 / curveRange.nominal;
      const scaled = (m: FinsOnBaseFactorW1['lower']): FinsOnBaseFactorW1['lower'] =>
        m.thickness === 0 || m.count === 0
          ? m
          : { ...m, band: { low: m.band.low * s, high: m.band.high * s } };
      const lower = scaled(w.lower);
      const upper = scaled(w.upper);
      const low = Math.min(lower.band.low, upper.band.low);
      const high = Math.max(lower.band.high, upper.band.high);
      return {
        ...w,
        lower,
        upper,
        low,
        high,
        nominal: 0.5 * (low + high),
        label:
          `${w.label}; below M 1.5 the members built on TN 3819 fig. 35's free-flight line apply to Love's ` +
          `curve itself, not to W2's body base ${curveRange.nominal.toFixed(3)} times it, so the factor is ` +
          `stated on W2's term (those members over ${curveRange.nominal.toFixed(3)}); at M 1.5 the term ` +
          `steps where W2's ${curveRange.nominal.toFixed(3)} ends (0015 section 11.2)`,
      };
    };
    const rebuilt = (): FinsOnBaseFactorW1 => {
      const near = fins.nearBase;
      if (near === undefined && fins.flatFaced === true && presentRefusal !== undefined) {
        throw new BaseRefusal(
          'fin-trailing-edge',
          `${presentRefusal.message}; the rebuilt factor's flat-plate value covers square trailing edges ` +
            'only: a rounded trailing edge has no measurement at the base (0015 section 4)',
        );
      }
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
      // A plate of one thickness on a tapered planform (`thinnest`): its thinnest station is the same section
      // scaled in thickness, and the rebuilt factor brackets every station (0015 section 3.6). It does not
      // take the present factor's thin-plate rule (low end F = 1): its members run from the zero member,
      // whose low end is measured relief below F = 1, to t/c 0.10, so a thinner station lies inside its
      // data and only moves the lower member down to the zero member (flat plates: RM L52E06's relief).
      const scale =
        fins.thinnest !== undefined && fins.thicknessRatio > 0
          ? fins.thinnest.thicknessRatio / fins.thicknessRatio
          : 1;
      const spanSections =
        near.spanSections ??
        (scale < 1 - 1e-12
          ? [{ ...near.section, halfThickness: near.section.halfThickness.map((h) => h * scale) }]
          : undefined);
      try {
        return onW2Curve(
          finsOnBaseFactorW1(mach, {
            ...near,
            ...(spanSections === undefined ? {} : { spanSections }),
            count: fins.count,
            trailingEdgeAheadOfBase: x,
          }),
        );
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
        // The present factor serves the fin families it was measured on (wedge, circular-arc and
        // hexagonal sections); flat-faced fins go to the rebuilt factor's flat-plate value (0014 section
        // 10.7, 2026-10-21).
        if (fins.flatFaced === true) {
          throw new BaseRefusal('flat-plate-fins', FLAT_PLATES_AT_BASE_REFUSAL);
        }
        // Thinner than the present factor's 5% data at some station, none thicker than 10% (0016
        // section 18): the factor at 5% with its low end F = 1.
        const thinnest = fins.thinnest?.thicknessRatio ?? fins.thicknessRatio;
        const thin = thinnest < FINS_ON_BASE_THINNEST_DATA && fins.thicknessRatio <= 0.1;
        factor = finsOnBaseFactor(
          mach,
          thin
            ? { ...fins, thicknessRatio: Math.max(fins.thicknessRatio, FINS_ON_BASE_THINNEST_DATA) }
            : fins,
        );
        if (thin) {
          factor = extendedBelowThinnestData(factor, thinnest, fins.thinnest?.spanShareBelow ?? 1);
        }
        source = 'present';
        // Bounded, not measured: the gap between the bounds in C_D beside it (0014 section 10.2).
        labels.push(`${factor.label}${gapOf(factor)}`);
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
