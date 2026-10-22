/**
 * The flight condition from what a rocketry team knows, without the DOM:
 * an altitude (meters or feet above mean sea level), a Mach number and the
 * body's diameter in millimeters give, in the U.S. Standard Atmosphere,
 * 1976 (src/atmosphere/us-standard-1976.ts), the free-stream speed, static
 * temperature and kinematic viscosity, and the Reynolds number on the
 * body's overall length (its length in calibers times the diameter):
 *
 *   V = M C_s(Z),   Re_L = V L / eta(Z),   L = (length in calibers) d.
 *
 * The drag page asks this by default and gives the total the Reynolds
 * number and temperature it implies (docs/design/0011-total-drag-on-the-page.md
 * section 9). Real air departs from the standard one (a hot day, humidity);
 * the page also takes the Reynolds number and temperature directly.
 */

import { ALTITUDE_RANGE, standardAtmosphere } from '../atmosphere/us-standard-1976';

/** The international foot, exactly (U.S. Standard Atmosphere, 1976, Table 1). */
export const FOOT = 0.3048;

export type AltitudeUnit = 'm' | 'ft';

/** The flight condition as a team gives it. */
export interface FlightConditionAsked {
  /** Geometric altitude above mean sea level, in `altitudeUnit`. */
  readonly altitude: number;
  readonly altitudeUnit: AltitudeUnit;
  readonly mach: number;
  /** The body's diameter, mm (the caliber). */
  readonly diameterMm: number;
  /** The body's overall length, calibers. */
  readonly lengthCalibers: number;
}

/** The free stream it implies, SI units. */
export interface FlightCondition {
  /** Geometric altitude, m. */
  readonly altitude: number;
  /** Static temperature, K. */
  readonly temperature: number;
  /** Static pressure, N/m^2. */
  readonly pressure: number;
  /** kg/m^3. */
  readonly density: number;
  /** m/s. */
  readonly speedOfSound: number;
  /** Free-stream speed, m/s. */
  readonly speed: number;
  /** m^2/s. */
  readonly kinematicViscosity: number;
  /** The body's overall length, m. */
  readonly length: number;
  /** Free-stream Reynolds number on the overall length. */
  readonly reynoldsOnLength: number;
}

const grouped = (x: number) => Math.round(x).toLocaleString('en-US');

/** The range of altitudes served, in the unit asked, as the page says it. */
export function altitudeRangeText(unit: AltitudeUnit): string {
  const scale = unit === 'm' ? 1 : 1 / FOOT;
  // Rounded inward: every altitude in the range said is served.
  const low = Math.ceil(ALTITUDE_RANGE[0] * scale);
  const high = Math.floor(ALTITUDE_RANGE[1] * scale);
  return `${grouped(low)} to ${grouped(high)} ${unit}`;
}

/**
 * The free stream for an altitude, Mach number and diameter, or every
 * reason it cannot be given (no number).
 */
export function flightConditionOf(
  asked: FlightConditionAsked,
):
  | { readonly kind: 'ok'; readonly value: FlightCondition }
  | { readonly kind: 'refused'; readonly reasons: readonly string[] } {
  const reasons: string[] = [];
  const altitude = asked.altitude * (asked.altitudeUnit === 'm' ? 1 : FOOT);
  if (!Number.isFinite(asked.altitude)) {
    reasons.push('the altitude must be a number');
  } else if (!(altitude >= ALTITUDE_RANGE[0] && altitude <= ALTITUDE_RANGE[1])) {
    reasons.push(
      `the altitude must lie within ${altitudeRangeText(asked.altitudeUnit)} above sea level, ` +
        'the range of the U.S. Standard Atmosphere, 1976 here (to the top of the stratopause)',
    );
  }
  if (!(asked.mach > 0 && Number.isFinite(asked.mach))) {
    reasons.push('the Mach number must be a positive number');
  }
  if (!(asked.diameterMm > 0 && Number.isFinite(asked.diameterMm))) {
    reasons.push('the diameter must be a positive number of millimeters');
  }
  if (!(asked.lengthCalibers > 0 && Number.isFinite(asked.lengthCalibers))) {
    reasons.push('the overall length must be a positive number of calibers');
  }
  if (reasons.length > 0) return { kind: 'refused', reasons };
  const air = standardAtmosphere(altitude);
  const speed = asked.mach * air.speedOfSound;
  const length = (asked.lengthCalibers * asked.diameterMm) / 1000;
  return {
    kind: 'ok',
    value: {
      altitude,
      temperature: air.temperature,
      pressure: air.pressure,
      density: air.density,
      speedOfSound: air.speedOfSound,
      speed,
      kinematicViscosity: air.kinematicViscosity,
      length,
      reynoldsOnLength: (speed * length) / air.kinematicViscosity,
    },
  };
}
