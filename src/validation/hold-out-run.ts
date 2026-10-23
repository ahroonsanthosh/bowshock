/**
 * The machinery of a free-flight hold-out run, for a finned body of the
 * Basic Finner's kind: per case the modelled total with its model-form
 * band, its input bands, the residual measured / modelled - 1 and the
 * tolerance on it, built as the DREV gate builds it
 * (tests/validation/basic-finner.test.ts; docs/design/0010-base-drag-and-total.md
 * sections 4.1, 6.2 and 10.3; 0008 section 6.3): the linear sum, over the
 * modelled total, of every component's model-form band, the input bands, and
 * the spread of the case's Mach cluster (each measured value over the
 * cluster's mean). A case passes when its residual lies inside its tolerance
 * (rule 4 of docs/design/0014-refusals.md section 10.1).
 *
 * Written for BRL Report 934's range A (src/validation/brl934.ts,
 * tests/validation/brl934-range-a.test.ts) and validated on the DREV gate's
 * shots, whose recorded values it reproduces (tests/validation/hold-out-run.test.ts).
 *
 * Two body bases, every other component the library's (src/total/finned-body.ts):
 *
 * - 'present': the total as the library serves it, accepted only where its
 *   body base uses the present fins-on-base factor (0010 section 1.3,
 *   src/base/fins-on-base.ts). Where the library routes the body base to the
 *   rebuilt factor, or refuses it, the present model is refused, with the
 *   reason.
 * - 'rebuilt': the same components with the body base's fins-on-base factor
 *   the rebuilt one (W1, src/base/fins-on-base-w1.ts; 0015), asked directly
 *   whatever the routing would choose, and the term composed from it as
 *   src/base/base-drag.ts composes the rebuilt factor's term (held to it by
 *   the tests). Below Mach 1.5, where the body base is W2's
 *   (src/base/base-w2.ts), it is not composed here: no case of BRL 934's
 *   range A lies there (0014 section 10.5).
 *
 * Input bands beside the library's (transition, wall temperature,
 * roughness): where a case's conditions are known only to lie in a range
 * (BRL 934's model diameter and range air, 0014 section 10.6 items 1 and 2),
 * the total at each corner of the range against the total at the nominal
 * conditions, as one input band ('diameter and air'). A corner refused
 * refuses the case: its tolerance cannot be formed.
 */

import type { BaseFins } from '../base/base-drag';
import { W2_MACH_RANGE } from '../base/base-w2';
import { COMPILED_CURVE_BAND, compiledCurveBasePressure } from '../base/compiled-curve';
import { finsOnBaseFactorW1, type FinsOnBaseFactorW1 } from '../base/fins-on-base-w1';
import { BaseRefusal } from '../base/refusal';
import { vacuumBaseDrag } from '../base/vacuum';
import {
  baseFinsOf,
  finnedBodyComponents,
  type DragInputs,
  type FinnedBody,
  type FinnedBodyComponents,
  type FlightConditions,
} from '../total/finned-body';
import { exactConeNoseWaveDrag } from '../total/nose';
import {
  combineComponents,
  type ComponentRefusal,
  type DragComponent,
  type InputBand,
  type TotalDrag,
} from '../total/total-drag';

/** Which fins-on-base factor the body base takes. */
export type BodyBaseModel = 'present' | 'rebuilt';

export interface HoldOutConfiguration {
  readonly body: FinnedBody;
  /** The sharp cone's half-angle, radians (the nose wave drag is the exact Taylor-Maccoll value). */
  readonly coneHalfAngle: number;
  /** The library's inputs (transition, wall temperature, roughness), at the nominal conditions. */
  readonly inputs: DragInputs;
}

export interface HoldOutCase {
  readonly id: string;
  readonly mach: number;
  /** The measured zero-yaw drag coefficient, on the body's cross-section. */
  readonly measured: number;
  /** The nominal conditions. */
  readonly conditions: FlightConditions;
  /** The corners of the conditions' range, each with a name; none where the conditions are known. */
  readonly corners: readonly { readonly name: string; readonly conditions: FlightConditions }[];
}

/** The total at one corner of the conditions' range. */
export interface CornerTotal {
  readonly name: string;
  readonly cd: number;
  /** The fins' trailing-edge base term at the corner (0 when the fins have none). */
  readonly trailingEdge: number;
}

export interface ModelledCase {
  readonly id: string;
  readonly mach: number;
  readonly model: BodyBaseModel;
  /** Every refusal; the case is refused when there is any. */
  readonly refusals: readonly ComponentRefusal[];
  /** The total with every input band (the library's and 'diameter and air'), when not refused. */
  readonly total: TotalDrag | undefined;
  /** The library's components and states at the nominal conditions (the body base as the library routes it). */
  readonly parts: FinnedBodyComponents;
  /** The rebuilt factor, when it served ('rebuilt' only). */
  readonly rebuiltFactor: FinsOnBaseFactorW1 | undefined;
  readonly corners: readonly CornerTotal[];
}

/** The name of the input band formed from the corners. */
export const CONDITIONS_BAND = 'diameter and air';

/**
 * The rebuilt factor's body base, composed as src/base/base-drag.ts composes
 * it (cylindrical afterbody, turbulent layer at the base, the base area equal
 * to the reference area): the compiled curve times the factor's nominal, the
 * curve's band and its interpolation bound on that term, the factor's band
 * on the curve, each value at most the vacuum bound. Throws BaseRefusal as
 * the rebuilt factor does.
 */
export function rebuiltBodyBase(
  mach: number,
  fins: BaseFins,
): { component: DragComponent; factor: FinsOnBaseFactorW1 } {
  if (mach < W2_MACH_RANGE[1]) {
    throw new RangeError(
      `below Mach ${W2_MACH_RANGE[1]} the body base is W2's and is not composed here (asked ${mach})`,
    );
  }
  const near = fins.nearBase;
  if (near === undefined) {
    throw new BaseRefusal(
      'fins-near-base',
      "the fins' section and sweeps, which the rebuilt factor needs, are not given",
    );
  }
  const factor = finsOnBaseFactorW1(mach, {
    ...near,
    count: fins.count,
    trailingEdgeAheadOfBase: fins.trailingEdgeAheadOfBase,
  });
  const curve = compiledCurveBasePressure(mach);
  const q = -curve.pB;
  const f = factor.nominal;
  const vacuum = vacuumBaseDrag(mach);
  const atMostVacuum = (v: number) => Math.min(v, vacuum);
  const cd = atMostVacuum(q * f);
  const curveBand = [(COMPILED_CURVE_BAND.low - 1) * cd, (COMPILED_CURVE_BAND.high - 1) * cd];
  const e = curve.interpolationError * f;
  const finsBand = [(factor.low - f) * q, (factor.high - f) * q];
  return {
    component: {
      name: 'body base',
      cd,
      low: atMostVacuum(cd + curveBand[0]! - e + finsBand[0]!),
      high: atMostVacuum(cd + curveBand[1]! + e + finsBand[1]!),
      label: factor.label,
      band: "curve 0.82 to 1.08 (0008 section 3.3), interpolation, the rebuilt fins-on-base factor's band (0015)",
    },
    factor,
  };
}

function refusalOf(component: string, e: unknown): ComponentRefusal {
  if (e instanceof BaseRefusal) return { component, reason: e.reason, message: e.message };
  throw e;
}

/** The library's components at the conditions, with the body base the model's: components or refusals. */
function withBodyBase(
  parts: FinnedBodyComponents,
  config: HoldOutConfiguration,
  mach: number,
  model: BodyBaseModel,
): {
  components: DragComponent[];
  refusals: ComponentRefusal[];
  rebuiltFactor: FinsOnBaseFactorW1 | undefined;
} {
  const others = parts.refusals.filter((r) => r.component !== 'body base');
  const baseRefusal = parts.refusals.find((r) => r.component === 'body base');
  if (model === 'present') {
    if (baseRefusal !== undefined) {
      return { components: [], refusals: [...parts.refusals], rebuiltFactor: undefined };
    }
    if (parts.base?.finsOnBaseSource !== 'present') {
      // The library routes this body base to the rebuilt factor, or serves it without fins.
      const message =
        parts.base?.finsOnBaseSource === 'rebuilt'
          ? `the present fins-on-base factor refuses these fins (${parts.base.presentRefusal?.message ?? 'no reason given'}); the library serves the rebuilt factor here`
          : 'the body base takes no fins-on-base factor';
      return {
        components: [],
        refusals: [...others, { component: 'body base', reason: 'present-factor', message }],
        rebuiltFactor: undefined,
      };
    }
    return { components: [...parts.components], refusals: others, rebuiltFactor: undefined };
  }
  // The rebuilt factor, asked directly. The library's refusals that do not concern the factor
  // (the afterbody, a laminar layer at the base) stand.
  if (
    baseRefusal !== undefined &&
    (baseRefusal.reason === 'afterbody' || baseRefusal.reason === 'laminar-base')
  ) {
    return { components: [], refusals: [...parts.refusals], rebuiltFactor: undefined };
  }
  if (config.body.afterbody !== 'cylinder') {
    throw new RangeError('the rebuilt body base is composed for cylindrical afterbodies only');
  }
  try {
    const r = rebuiltBodyBase(mach, baseFinsOf(config.body.fins));
    const components = parts.components.map((c) => (c.name === 'body base' ? r.component : c));
    if (!components.includes(r.component)) {
      // The library refused its own body base (the factor): put the rebuilt one where it stands.
      const k = parts.components.findIndex((c) => c.name === 'fin trailing-edge base');
      components.splice(k < 0 ? components.length : k, 0, r.component);
    }
    return { components, refusals: others, rebuiltFactor: r.factor };
  } catch (e) {
    return {
      components: [],
      refusals: [...others, refusalOf('body base', e)],
      rebuiltFactor: undefined,
    };
  }
}

/** The fins' trailing-edge base term among the components (0 if none). */
function trailingEdgeOf(components: readonly DragComponent[]): number {
  return components.find((c) => c.name === 'fin trailing-edge base')?.cd ?? 0;
}

/** One case under one body-base model: its total with every input band, or its refusals. */
export function modelCase(
  config: HoldOutConfiguration,
  c: HoldOutCase,
  model: BodyBaseModel,
): ModelledCase {
  const nose = exactConeNoseWaveDrag(c.mach, config.coneHalfAngle);
  const parts = finnedBodyComponents(config.body, c.conditions, nose, config.inputs);
  const nominal = withBodyBase(parts, config, c.mach, model);
  const base = {
    id: c.id,
    mach: c.mach,
    model,
    parts,
    rebuiltFactor: nominal.rebuiltFactor,
  };
  if (nominal.refusals.length > 0) {
    return { ...base, refusals: nominal.refusals, total: undefined, corners: [] };
  }
  const cd = nominal.components.reduce((a, x) => a + x.cd, 0);
  const corners: CornerTotal[] = [];
  const cornerRefusals: ComponentRefusal[] = [];
  for (const corner of c.corners) {
    const p = finnedBodyComponents(config.body, corner.conditions, nose, {});
    const r = withBodyBase(p, config, c.mach, model);
    if (r.refusals.length > 0) {
      cornerRefusals.push(
        ...r.refusals.map((x) => ({ ...x, message: `at ${corner.name}: ${x.message}` })),
      );
      continue;
    }
    corners.push({
      name: corner.name,
      cd: r.components.reduce((a, x) => a + x.cd, 0),
      trailingEdge: trailingEdgeOf(r.components),
    });
  }
  if (cornerRefusals.length > 0) {
    return { ...base, refusals: cornerRefusals, total: undefined, corners };
  }
  const inputs: InputBand[] = [...parts.inputs];
  if (corners.length > 0) {
    const d = corners.map((x) => x.cd - cd);
    inputs.push({
      name: CONDITIONS_BAND,
      low: Math.min(0, ...d),
      high: Math.max(0, ...d),
      label: `input: the total at the corners of the conditions' range (${corners.map((x) => x.name).join('; ')}) against the nominal`,
    });
  }
  return {
    ...base,
    refusals: [],
    total: combineComponents(nominal.components, inputs),
    corners,
  };
}

/** A Mach cluster's spread: its least and greatest measured value over the cluster's mean, minus 1. */
export function clusterSpread(measured: readonly number[]): { lo: number; hi: number } {
  if (measured.length === 0) throw new RangeError('a cluster needs at least one case');
  const mean = measured.reduce((a, b) => a + b, 0) / measured.length;
  return { lo: Math.min(...measured) / mean - 1, hi: Math.max(...measured) / mean - 1 };
}

export interface Verdict {
  /** Sums of the input bands' ends, C_D. */
  readonly inputLow: number;
  readonly inputHigh: number;
  /** measured / modelled - 1. */
  readonly residual: number;
  /** The tolerance on the residual. */
  readonly tolerance: readonly [number, number];
  /** The tolerance's high end without the wall-temperature input. */
  readonly highWithoutWall: number;
  readonly inside: boolean;
}

/** Rule 4 of 0014 section 10.1, as the DREV gate computes it, for one served total. */
export function verdictOf(
  total: TotalDrag,
  measured: number,
  spread: { lo: number; hi: number },
): Verdict {
  const inputLow = total.inputs.reduce((a, i) => a + i.low, 0);
  const inputHigh = total.inputs.reduce((a, i) => a + i.high, 0);
  const wall = total.inputs.find((i) => i.name === 'wall temperature')?.high ?? 0;
  const residual = measured / total.cd - 1;
  const tolerance = [
    (total.low + inputLow) / total.cd - 1 + spread.lo,
    (total.high + inputHigh) / total.cd - 1 + spread.hi,
  ] as const;
  return {
    inputLow,
    inputHigh,
    residual,
    tolerance,
    highWithoutWall: (total.high + inputHigh - wall) / total.cd - 1 + spread.hi,
    inside: residual >= tolerance[0] && residual <= tolerance[1],
  };
}

/**
 * The total with the fins' trailing-edge base term scaled by `factor` (0.5:
 * the tapered alternative of 0014 section 10.6 item 4, "the trailing-edge
 * term halved, a bound by hand"): the term's nominal and band ends, its
 * laminar change in every transition state, and its value at every corner,
 * each times the factor; every other component and input as computed.
 */
export function withTrailingEdgeScaled(m: ModelledCase, factor: number): TotalDrag {
  if (m.total === undefined) throw new RangeError(`case ${m.id} is refused`);
  const components = m.total.components.map((c) =>
    c.name === 'fin trailing-edge base'
      ? {
          ...c,
          cd: factor * c.cd,
          low: factor * c.low,
          high: factor * c.high,
          label: `${c.label}; times ${factor} by hand`,
        }
      : c,
  );
  const cd = components.reduce((a, x) => a + x.cd, 0);
  const states = m.parts.transitionStates;
  const inputs = m.total.inputs.map((i) => {
    if (i.name === 'transition' && states.length > 0) {
      return {
        ...i,
        low: Math.min(0, ...states.map((s) => s.friction + factor * s.trailingEdge.low)),
        high: Math.max(0, ...states.map((s) => s.friction + factor * s.trailingEdge.high)),
      };
    }
    if (i.name === CONDITIONS_BAND) {
      const d = m.corners.map((x) => x.cd - (1 - factor) * x.trailingEdge - cd);
      return { ...i, low: Math.min(0, ...d), high: Math.max(0, ...d) };
    }
    return i;
  });
  return combineComponents(components, inputs);
}
