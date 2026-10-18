/**
 * Turbulent skin friction on a smooth flat plate in compressible flow by
 * the van Driest II transformation (E. R. van Driest, "Problem of
 * aerodynamic heating", Aeron. Eng. Rev. 15(10), 1956, 26-41, as NASA TN
 * D-6945 cites it, ref. 2, calling it "the Van Driest method (II)"; the
 * paper not read), implemented as the NASA Turbulence Modeling
 * Resource states it for its high-Mach flat-plate case
 * (https://tmbwg.github.io/turbmodels/ZPGflatplateSS_val.html, equations
 * read from the page's images):
 *
 *   T_aw = T_e (1 + r (gamma - 1)/2 M^2),
 *   a = sqrt(r (gamma - 1)/2 M^2 T_e / T_w),   b = T_aw / T_w - 1,
 *   A = (2 a^2 - b) / sqrt(b^2 + 4 a^2),       B = b / sqrt(b^2 + 4 a^2),
 *   F_c = (T_aw / T_e - 1) / (asin A + asin B)^2,
 *   F_theta = mu_e / mu_w,
 *
 * and the compressible coefficient is the incompressible one at a
 * transformed Reynolds number:
 *
 *   cf = cf_inc(F_theta Re_theta) / F_c,
 *   CF = CF_inc(F_x Re_x) / F_c,   F_x = F_theta / F_c,
 *
 * Re_theta and Re_x being based on the edge (here free-stream) velocity,
 * density and viscosity. The two forms are the same law: with constant
 * F_c and F_theta the flat-plate momentum balance d(Re_theta)/d(Re_x) =
 * cf / 2 maps onto its incompressible form under these scalings. The
 * viscosity follows Sutherland's law, mu ~ T^(3/2) / (T + S), with
 * S = 110.4 K as on the TMR page; the recovery factor r = 0.89 is the TMR
 * page's value (NACA TN 3097, p. 14, quotes "the usual recovery factor
 * (0.89 +- 0.01)").
 *
 * The incompressible law is Karman-Schoenherr (./karman-schoenherr.ts).
 * The transformation is verified against the TMR tabulation in
 * tests/friction/van-driest.test.ts; how far it represents measured
 * friction is recorded in docs/design/0007-skin-friction.md.
 */

import {
  karmanSchoenherrAverageCf,
  karmanSchoenherrLocalCf,
  karmanSchoenherrMomentumReynolds,
  karmanSchoenherrReynoldsForMomentum,
  karmanSchoenherrY,
} from './karman-schoenherr';

/** Sutherland's constant of air used by the TMR page, kelvin. */
export const SUTHERLAND_TEMPERATURE = 110.4;
/** Turbulent recovery factor of the TMR page. */
export const TURBULENT_RECOVERY_FACTOR = 0.89;

/** Viscosity at temperature t over the viscosity at tRef, by Sutherland's law. */
export function sutherlandViscosityRatio(
  t: number,
  tRef: number,
  sutherlandTemperature = SUTHERLAND_TEMPERATURE,
): number {
  return (t / tRef) ** 1.5 * ((tRef + sutherlandTemperature) / (t + sutherlandTemperature));
}

export interface TurbulentConditions {
  /** Edge (here free-stream) Mach number, >= 0. */
  readonly mach: number;
  /** Edge static temperature, kelvin. */
  readonly temperature: number;
  /** Wall temperature, kelvin; omitted for the adiabatic wall at the recovery factor. */
  readonly wallTemperature?: number;
  /** Recovery factor r of the adiabatic wall temperature; default 0.89. */
  readonly recoveryFactor?: number;
  /** Ratio of specific heats; default 1.4. */
  readonly gamma?: number;
  /** Sutherland's constant, kelvin; default 110.4. */
  readonly sutherlandTemperature?: number;
}

export interface VanDriestFactors {
  /** cf = cf_inc / F_c. */
  readonly fc: number;
  /** Re_theta,inc = F_theta Re_theta; F_theta = mu_e / mu_w. */
  readonly fTheta: number;
  /** Re_x,inc = F_x Re_x; F_x = F_theta / F_c. */
  readonly fx: number;
  /** Adiabatic wall temperature at the recovery factor, kelvin. */
  readonly adiabaticWallTemperature: number;
  /** Wall temperature used, kelvin. */
  readonly wallTemperature: number;
}

export function vanDriestFactors(conditions: TurbulentConditions): VanDriestFactors {
  const {
    mach,
    temperature: te,
    recoveryFactor: r = TURBULENT_RECOVERY_FACTOR,
    gamma = 1.4,
    sutherlandTemperature = SUTHERLAND_TEMPERATURE,
  } = conditions;
  if (!(mach >= 0 && Number.isFinite(mach))) throw new RangeError(`bad Mach number ${mach}`);
  if (!(te > 0 && Number.isFinite(te))) throw new RangeError(`bad temperature ${te}`);
  if (!(r > 0 && r <= 1)) throw new RangeError(`the recovery factor must lie in (0, 1], got ${r}`);
  const m = 0.5 * (gamma - 1) * mach * mach;
  const taw = te * (1 + r * m);
  const tw = conditions.wallTemperature ?? taw;
  if (!(tw > 0 && Number.isFinite(tw))) throw new RangeError(`bad wall temperature ${tw}`);
  let fc: number;
  if (mach === 0) {
    // The limit of the formula as M -> 0: with a -> 0, asin A + asin B ->
    // 2 a (1 - sqrt(Te / Tw)) / |b| and b -> Te / Tw - 1, so F_c ->
    // ((1 + sqrt(Tw / Te)) / 2)^2 (1 for Tw = Te; checked against small M
    // in the tests).
    fc = ((1 + Math.sqrt(tw / te)) / 2) ** 2;
  } else {
    const a = Math.sqrt((r * m * te) / tw);
    const b = taw / tw - 1;
    const d = Math.sqrt(b * b + 4 * a * a);
    const angle = Math.asin((2 * a * a - b) / d) + Math.asin(b / d);
    fc = (taw / te - 1) / (angle * angle);
  }
  const fTheta = sutherlandViscosityRatio(te, tw, sutherlandTemperature);
  return { fc, fTheta, fx: fTheta / fc, adiabaticWallTemperature: taw, wallTemperature: tw };
}

/**
 * Local friction coefficient at the momentum-thickness Reynolds number
 * Re_theta, cf = cf_inc(F_theta Re_theta) / F_c, with the given
 * incompressible law of cf against Re_theta (Karman-Schoenherr by default;
 * the TMR's fit of it to compare with the TMR tabulation).
 */
export function vanDriestLocalCf(
  reTheta: number,
  factors: VanDriestFactors,
  incompressible: (reTheta: number) => number = karmanSchoenherrLocalCf,
): number {
  return incompressible(factors.fTheta * reTheta) / factors.fc;
}

/** Re_theta at Re_x on a flat plate turbulent from x = 0 (Karman-Schoenherr). */
export function vanDriestMomentumReynolds(reX: number, factors: VanDriestFactors): number {
  return karmanSchoenherrMomentumReynolds(factors.fx * reX) / factors.fTheta;
}

/** Re_x at which a flat plate turbulent from x = 0 reaches Re_theta (Karman-Schoenherr). */
export function vanDriestReynoldsForMomentum(reTheta: number, factors: VanDriestFactors): number {
  return karmanSchoenherrReynoldsForMomentum(factors.fTheta * reTheta) / factors.fx;
}

/** Local cf at Re_x on a flat plate turbulent from x = 0 (Karman-Schoenherr). */
export function vanDriestLocalCfAtReynolds(reX: number, factors: VanDriestFactors): number {
  const u = Math.log10(karmanSchoenherrY(factors.fx * reX));
  return (0.242 * 0.242) / (u * (u + 2 / Math.LN10)) / factors.fc;
}

/** Average CF over a flat plate turbulent from x = 0 with Reynolds number Re_x (Karman-Schoenherr). */
export function vanDriestAverageCf(reX: number, factors: VanDriestFactors): number {
  return karmanSchoenherrAverageCf(factors.fx * reX) / factors.fc;
}
