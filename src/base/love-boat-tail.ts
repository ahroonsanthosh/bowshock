/**
 * The base pressure behind a boat-tail by Love's method (E. S. Love, NACA
 * TN 3819, 1957, pp. 14 to 18; design record 0023 section 4). Not served:
 * its band is set on the figures 0014 10.7 (ae) names, which have not been
 * read yet; until then every boat-tail's base is refused (B2).
 *
 * A cylindrical afterbody's base pressure depends on the Mach number M_0
 * and pressure p_0 just ahead of the base through an effective
 * two-dimensional expansion angle delta_e(M_0): the base pressure is the
 * Prandtl-Meyer expansion of the flow at M_0 through delta_e. Love's
 * delta_e is 0.85 of the measured wake convergence (his fig. 14), which
 * defines his basic curve (his fig. 18); here delta_e is taken from that
 * curve as 0010 serves it (./compiled-curve.ts), whose Mach number is the
 * free stream's and the flow ahead of whose base is the free stream's: so
 * this method reproduces the served curve on a long cylinder exactly. A
 * boat-tail of half-angle beta reduces the angle to delta_e - K beta, K
 * linear in the base-to-body diameter ratio from 0.85 at 0 to 1 at 1 (the
 * expansion at the shoulder of a boat-tail that ends at once is
 * two-dimensional, K = 1; 0.85 is the conversion of wake convergence to the
 * two-dimensional angle). M_0 and p_0 are the inviscid wall values just
 * ahead of the base, as Love took them from the method of characteristics
 * (part 1 of 0023 supplies them).
 */

import { compiledCurveValue } from './compiled-curve';
import type { CompiledCurveName } from './tn3819-fig18';
import { machFromPrandtlMeyer, prandtlMeyer } from '../validation/gas-dynamics';

export interface LoveBaseInput {
  /** Free-stream Mach number. */
  readonly mach: number;
  /** Mach number just ahead of the base (inviscid, at the wall). */
  readonly machAhead: number;
  /** Pressure just ahead of the base over the free stream's. */
  readonly pressureRatioAhead: number;
  /** Boat-tail half-angle, radians (0 for a cylinder). */
  readonly angle: number;
  /** Base diameter over the body's (1 for a cylinder). */
  readonly diameterRatio: number;
  /** Which reading of the cylinder's curve defines delta_e. */
  readonly curve: CompiledCurveName;
  readonly gamma?: number;
}

/** Pressure over the pressure of the flow at `mach` after it expands isentropically to `machAfter`. */
function isentropicRatio(mach: number, machAfter: number, gamma: number): number {
  const g = 0.5 * (gamma - 1);
  return ((1 + g * mach * mach) / (1 + g * machAfter * machAfter)) ** (gamma / (gamma - 1));
}

/**
 * The effective two-dimensional expansion angle at Mach number M, radians:
 * the Prandtl-Meyer turn that takes a stream at M to the cylinder's base
 * pressure there (the served curve, Mach number and flow ahead of the base
 * the free stream's).
 */
export function effectiveExpansionAngle(
  mach: number,
  curve: CompiledCurveName,
  gamma = 1.4,
): number {
  const ratio = 1 + 0.5 * gamma * mach * mach * compiledCurveValue(mach, curve);
  if (!(ratio > 0 && ratio < 1)) {
    throw new RangeError('the base curve gives no expansion at this Mach number');
  }
  const g = 0.5 * (gamma - 1);
  const machBase = Math.sqrt(((1 + g * mach * mach) * ratio ** (-(gamma - 1) / gamma) - 1) / g);
  return prandtlMeyer(machBase, gamma) - prandtlMeyer(mach, gamma);
}

/** Love's base pressure coefficient behind a boat-tail, on the free stream's dynamic pressure. */
export function loveBasePressure(input: LoveBaseInput): number {
  const gamma = input.gamma ?? 1.4;
  const { mach, machAhead, pressureRatioAhead, angle, diameterRatio, curve } = input;
  if (!(machAhead > 1)) throw new RangeError('the flow ahead of the base must be supersonic');
  if (!(diameterRatio > 0 && diameterRatio <= 1)) {
    throw new RangeError('the base-to-body diameter ratio must lie in (0, 1]');
  }
  if (!(angle >= 0)) throw new RangeError('a boat-tail narrows: its angle is not negative');
  const k = 0.85 + 0.15 * diameterRatio;
  const turn = effectiveExpansionAngle(machAhead, curve, gamma) - k * angle;
  if (!(turn > 0)) {
    throw new RangeError(
      "the boat-tail's angle exceeds the base's expansion: Love's method gives no base pressure",
    );
  }
  const machBase = machFromPrandtlMeyer(prandtlMeyer(machAhead, gamma) + turn, gamma);
  const ratio = isentropicRatio(machAhead, machBase, gamma) * pressureRatioAhead;
  return (ratio - 1) / (0.5 * gamma * mach * mach);
}
