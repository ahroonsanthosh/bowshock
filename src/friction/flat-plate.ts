/**
 * Skin friction on a smooth flat plate at constant pressure, laminar from
 * the leading edge to a given transition Reynolds number and turbulent
 * after it.
 *
 * - Laminar: the compressible similarity solution (./laminar.ts) with
 *   Sutherland's law and constant Prandtl number.
 * - Turbulent: van Driest II with the Karman-Schoenherr law
 *   (./van-driest.ts).
 * - Transition: a step at Re_x = Re_T. The turbulent layer starts from a
 *   virtual origin placed so that its momentum thickness at Re_T equals the
 *   laminar one there, and grows by the turbulent law from that origin.
 *   This is the procedure NACA TN 3097 (pp. 8 to 9) uses to refer its
 *   cylinder data to "completely turbulent flow starting with zero
 *   boundary-layer thickness" (a turbulent length whose momentum thickness
 *   "just matches" the measured one), and that NACA RM A53D02 (p. 8)
 *   applies at transition on a body ("an origin for a fully turbulent
 *   boundary layer which would have the same thickness as the laminar
 *   boundary layer at transition"). Momentum is continuous through the
 *   step, so the drag of the plate is 2 theta at its end; the local cf
 *   jumps up at Re_T. A transition region of finite length is not modelled.
 *
 * Wall temperature: either given (the same for both regimes) or adiabatic,
 * in which case each regime has its own adiabatic wall temperature, the
 * laminar one from the similarity solution (recovery factor about
 * sqrt(Pr)) and the turbulent one at the turbulent recovery factor
 * (default 0.89).
 */

import { laminarSimilarity, type LaminarSimilarity } from './laminar';
import {
  SUTHERLAND_TEMPERATURE,
  TURBULENT_RECOVERY_FACTOR,
  vanDriestFactors,
  vanDriestLocalCfAtReynolds,
  vanDriestMomentumReynolds,
  vanDriestReynoldsForMomentum,
  type VanDriestFactors,
} from './van-driest';

export interface FlatPlateConditions {
  /** Edge (here free-stream) Mach number. */
  readonly mach: number;
  /** Edge static temperature, kelvin. */
  readonly temperature: number;
  /** Wall temperature, kelvin; omitted for an adiabatic wall. */
  readonly wallTemperature?: number;
  /**
   * Transition Reynolds number on the distance from the leading edge:
   * 0 (the default) is turbulent from the leading edge, Infinity laminar
   * throughout.
   */
  readonly transitionReynolds?: number;
  /** Ratio of specific heats; default 1.4. */
  readonly gamma?: number;
  /** Prandtl number of the laminar solution; default 0.72. */
  readonly prandtl?: number;
  /** Sutherland's constant, kelvin; default 110.4. */
  readonly sutherlandTemperature?: number;
  /** Turbulent recovery factor; default 0.89. */
  readonly recoveryFactor?: number;
}

export interface FlatPlateFriction {
  readonly transitionReynolds: number;
  /** The laminar solution, when there is a laminar run. */
  readonly laminar: LaminarSimilarity | undefined;
  readonly turbulent: VanDriestFactors;
  /**
   * Re_x of the turbulent layer's virtual origin, measured from the
   * leading edge (0 when turbulent from the leading edge).
   */
  readonly turbulentOrigin: number;
  /** Momentum-thickness Reynolds number at Re_x. */
  momentumReynolds(reX: number): number;
  /** Laminar local cf at Re_x (Re_x <= Re_T). */
  laminarLocalCf(reX: number): number;
  /** Turbulent local cf at Re_x (Re_x >= Re_T), from the virtual origin. */
  turbulentLocalCf(reX: number): number;
  /** Local cf at Re_x: laminar below Re_T, turbulent from Re_T on. */
  localCf(reX: number): number;
  /** Average cf over the plate from the leading edge to Re_x: 2 Re_theta / Re_x. */
  averageCf(reX: number): number;
}

export function flatPlateFriction(conditions: FlatPlateConditions): FlatPlateFriction {
  const reT = conditions.transitionReynolds ?? 0;
  if (!(reT >= 0)) throw new RangeError(`the transition Reynolds number must be >= 0, got ${reT}`);
  const gamma = conditions.gamma ?? 1.4;
  const sutherlandTemperature = conditions.sutherlandTemperature ?? SUTHERLAND_TEMPERATURE;
  const turbulent = vanDriestFactors({
    mach: conditions.mach,
    temperature: conditions.temperature,
    recoveryFactor: conditions.recoveryFactor ?? TURBULENT_RECOVERY_FACTOR,
    gamma,
    sutherlandTemperature,
    ...(conditions.wallTemperature === undefined
      ? {}
      : { wallTemperature: conditions.wallTemperature }),
  });
  const laminar =
    reT > 0
      ? laminarSimilarity({
          mach: conditions.mach,
          temperature: conditions.temperature,
          prandtl: conditions.prandtl ?? 0.72,
          gamma,
          viscosity: { kind: 'sutherland', temperature: sutherlandTemperature },
          ...(conditions.wallTemperature === undefined
            ? {}
            : { wallTemperature: conditions.wallTemperature }),
        })
      : undefined;
  const cl = laminar?.cfSqrtRe ?? 0;

  // Virtual origin: the turbulent length with the laminar momentum
  // thickness at transition. The Karman-Schoenherr law starts at
  // Re_theta,inc = 1/2 (see ./karman-schoenherr.ts); a laminar layer
  // thinner than that (Re_T of order 1) starts the turbulent one there.
  let turbulentOrigin = 0;
  if (reT > 0 && Number.isFinite(reT)) {
    const reThetaT = cl * Math.sqrt(reT);
    const equivalent =
      turbulent.fTheta * reThetaT > 0.5 ? vanDriestReynoldsForMomentum(reThetaT, turbulent) : 0;
    turbulentOrigin = reT - equivalent;
  }

  const laminarLocalCf = (reX: number) => cl / Math.sqrt(reX);
  const turbulentLocalCf = (reX: number) =>
    vanDriestLocalCfAtReynolds(reX - turbulentOrigin, turbulent);
  const momentumReynolds = (reX: number) =>
    reX < reT ? cl * Math.sqrt(reX) : vanDriestMomentumReynolds(reX - turbulentOrigin, turbulent);
  return {
    transitionReynolds: reT,
    laminar,
    turbulent,
    turbulentOrigin,
    momentumReynolds,
    laminarLocalCf,
    turbulentLocalCf,
    localCf: (reX) => (reX < reT ? laminarLocalCf(reX) : turbulentLocalCf(reX)),
    averageCf: (reX) => (2 * momentumReynolds(reX)) / reX,
  };
}
