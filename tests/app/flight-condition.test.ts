/**
 * The flight condition from an altitude, a Mach number and a diameter
 * (src/app/flight-condition.ts): the free stream of the U.S. Standard
 * Atmosphere, 1976 at that altitude, checked against the document's own
 * Table III values (tests/atmosphere/us-standard-1976-tables.ts), and the
 * Reynolds number on the body's overall length.
 */

import { describe, expect, it } from 'vitest';
import {
  altitudeRangeText,
  flightConditionOf,
  FOOT,
  type FlightCondition,
  type FlightConditionAsked,
} from '../../src/app/flight-condition';
import { GEOMETRIC } from '../atmosphere/us-standard-1976-tables';

const ok = (asked: FlightConditionAsked): FlightCondition => {
  const c = flightConditionOf(asked);
  if (c.kind !== 'ok') throw new Error(c.reasons.join('; '));
  return c.value;
};
/** The Basic Finner's shape, 30 mm across, 10 calibers long. */
const asked = (altitude: number, mach = 2): FlightConditionAsked => ({
  altitude,
  altitudeUnit: 'm',
  mach,
  diameterMm: 30,
  lengthCalibers: 10,
});
const row = (z: number) => GEOMETRIC.find((r) => r.altitude === z)!;

describe('the flight condition from altitude, Mach number and diameter', () => {
  it('at sea level, Mach 2, 30 mm across and 10 calibers long: the tables give Re = 1.398e7', () => {
    const c = ok(asked(0));
    const r = row(0);
    expect(c.altitude).toBe(0);
    expect(c.temperature).toBe(288.15);
    expect(c.pressure).toBe(101325);
    expect(c.length).toBeCloseTo(0.3, 15);
    // Table III, p. 101: C_s = 340.29 m/s, eta = 1.4607e-5 m^2/s.
    expect(Math.abs(c.speed - 2 * Number(r.cs))).toBeLessThan(2 * 0.005);
    expect(Math.abs(c.kinematicViscosity - Number(r.eta))).toBeLessThan(0.5e-9);
    const fromTables = (2 * Number(r.cs) * 0.3) / Number(r.eta);
    expect(Math.abs(c.reynoldsOnLength / fromTables - 1)).toBeLessThan(5e-5);
    expect(c.reynoldsOnLength.toExponential(3)).toBe('1.398e+7');
  });

  it('at each altitude of the tables, the speed and Reynolds number from their speed of sound and kinematic viscosity', () => {
    for (const r of GEOMETRIC) {
      const mach = 3;
      const c = ok(asked(r.altitude, mach));
      expect(Math.abs(c.temperature - Number(r.t))).toBeLessThan(0.5e-3 + 1e-9);
      // Half a unit of C_s, 0.005 m/s, and 0.51 of a unit at 5.5 km (../atmosphere).
      expect(Math.abs(c.speed - mach * Number(r.cs))).toBeLessThan(mach * 0.0052);
      const fromTables = (mach * Number(r.cs) * 0.3) / Number(r.eta);
      // Within the tables' own rounding of C_s and eta (each under 4e-5 relative here).
      expect(Math.abs(c.reynoldsOnLength / fromTables - 1)).toBeLessThan(6e-5);
    }
  });

  it('the Reynolds number is the speed times the length over the kinematic viscosity, linear in each', () => {
    const c = ok(asked(5500, 2));
    expect(c.reynoldsOnLength).toBeCloseTo((c.speed * c.length) / c.kinematicViscosity, 6);
    expect(c.speed).toBeCloseTo(2 * c.speedOfSound, 12);
    const twice = ok({ ...asked(5500, 4), diameterMm: 60, lengthCalibers: 5 });
    expect(twice.reynoldsOnLength / c.reynoldsOnLength).toBeCloseTo(2, 12);
    expect(c.density).toBeCloseTo(c.pressure / ((8.31432e3 / 28.9644) * c.temperature), 12);
  });

  it('in feet: the international foot, 0.3048 m', () => {
    expect(FOOT).toBe(0.3048);
    const metres = ok(asked(3048));
    const feet = ok({ ...asked(10000), altitudeUnit: 'ft' });
    expect(feet.altitude).toBeCloseTo(3048, 9);
    expect(feet.reynoldsOnLength).toBeCloseTo(metres.reynoldsOnLength, 3);
    expect(feet.temperature).toBeCloseTo(metres.temperature, 9);
  });

  it('the range served, said in the unit asked, rounded inward', () => {
    expect(altitudeRangeText('m')).toBe('-5,000 to 51,412 m');
    expect(altitudeRangeText('ft')).toBe('-16,404 to 168,676 ft');
    expect(flightConditionOf(asked(51412)).kind).toBe('ok');
    expect(flightConditionOf({ ...asked(168676), altitudeUnit: 'ft' }).kind).toBe('ok');
    expect(flightConditionOf({ ...asked(-16404), altitudeUnit: 'ft' }).kind).toBe('ok');
  });

  it('refused, with every reason and no number: outside the range, not a number, no diameter', () => {
    expect(flightConditionOf(asked(60000))).toEqual({
      kind: 'refused',
      reasons: [
        'the altitude must lie within -5,000 to 51,412 m above sea level, the range of the ' +
          'U.S. Standard Atmosphere, 1976 here (to the top of the stratopause)',
      ],
    });
    expect(flightConditionOf({ ...asked(200000), altitudeUnit: 'ft' })).toEqual({
      kind: 'refused',
      reasons: [
        'the altitude must lie within -16,404 to 168,676 ft above sea level, the range of the ' +
          'U.S. Standard Atmosphere, 1976 here (to the top of the stratopause)',
      ],
    });
    expect(
      flightConditionOf({
        altitude: Number.NaN,
        altitudeUnit: 'm',
        mach: 0,
        diameterMm: -30,
        lengthCalibers: Number.NaN,
      }),
    ).toEqual({
      kind: 'refused',
      reasons: [
        'the altitude must be a number',
        'the Mach number must be a positive number',
        'the diameter must be a positive number of millimeters',
        'the overall length must be a positive number of calibers',
      ],
    });
    expect(flightConditionOf({ ...asked(0), diameterMm: 0 }).kind).toBe('refused');
  });
});
