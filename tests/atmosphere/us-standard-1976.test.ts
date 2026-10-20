/**
 * The U.S. Standard Atmosphere, 1976 (src/atmosphere/us-standard-1976.ts)
 * against the document's own tables (./us-standard-1976-tables.ts: Tables
 * I and III, metric units, by geometric and by geopotential altitude,
 * typed from the NTRS scan). Each value is typed as printed, so that its
 * precision is read from its digits, and is compared in units of its last
 * printed digit:
 *
 * - the pressure column is truncated, not rounded: at all 22 altitudes the
 *   computed pressure lies at or above the printed one, by 0 to 0.96 of a
 *   unit (rounding would put about half of them below). The test holds it
 *   to that: 0 <= computed - printed < 1 unit;
 * - every other column is rounded: the computed value lies within half a
 *   unit of the printed one, except three of the 110 values, which lie
 *   0.51 to 0.52 of a unit away (listed below, each held within 0.53).
 *   The altitude columns show the same: 42 of 44 paired altitudes round to
 *   the printed meter, and two lie 0.52 m away (also listed).
 */

import { describe, expect, it } from 'vitest';
import {
  ALTITUDE_RANGE,
  atmosphereAtGeopotential,
  geometricAltitude,
  geopotentialAltitude,
  standardAtmosphere,
  TOP_GEOPOTENTIAL_ALTITUDE,
  type StandardAtmosphere,
} from '../../src/atmosphere/us-standard-1976';
import { GEOMETRIC, GEOPOTENTIAL, type Row } from './us-standard-1976-tables';

/** One unit of the last digit printed: '1.1393e3' gives 0.1, '294.651' 0.001. */
function unit(printed: string): number {
  const [mantissa, exponent = '0'] = printed.split('e');
  const decimals = mantissa!.split('.')[1]?.length ?? 0;
  return 10 ** (Number(exponent) - decimals);
}

const QUANTITIES = [
  ['t', 'temperature', (a: StandardAtmosphere) => a.temperature],
  // Printed in millibars.
  ['p', 'pressure', (a: StandardAtmosphere) => a.pressure / 100],
  ['rho', 'density', (a: StandardAtmosphere) => a.density],
  ['cs', 'speed of sound', (a: StandardAtmosphere) => a.speedOfSound],
  ['mu', 'dynamic viscosity', (a: StandardAtmosphere) => a.dynamicViscosity],
  ['eta', 'kinematic viscosity', (a: StandardAtmosphere) => a.kinematicViscosity],
] as const;

/**
 * The rounded values the computation misses by more than half a unit, as
 * `altitude quantity`, with their offset in units (geometric rows).
 */
const BEYOND_HALF_A_UNIT: Readonly<Record<string, number>> = {
  '5500 cs': 0.51,
  '40000 eta': 0.52,
  '46000 rho': -0.52,
};

/** Computed minus printed, in units of the last printed digit, for each value of each row. */
function offsets(
  rows: readonly Row[],
  at: (altitude: number) => StandardAtmosphere,
): { key: string; quantity: string; offset: number; where: string }[] {
  return rows.flatMap((row) => {
    const a = at(row.altitude);
    return QUANTITIES.map(([quantity, name, value]) => ({
      key: `${row.altitude} ${quantity}`,
      quantity,
      offset: (value(a) - Number(row[quantity])) / unit(row[quantity]),
      where: `${name} at ${row.altitude} m (pp. ${row.pages.join(' and ')}), printed ${row[quantity]}`,
    }));
  });
}

/** Every value outside the tables' printing: truncated pressure, every other column rounded. */
function misses(
  rows: readonly Row[],
  at: (altitude: number) => StandardAtmosphere,
  beyond: Readonly<Record<string, number>> = {},
): string[] {
  // A relative 1e-9 for the floating-point rounding of values lying on a boundary.
  const eps = 1e-9;
  return offsets(rows, at)
    .filter(({ key, quantity, offset }) => {
      if (quantity === 'p') return !(offset >= -eps && offset < 1);
      const allowed = beyond[key];
      return allowed === undefined
        ? Math.abs(offset) > 0.5 + eps
        : !(Math.abs(offset) <= 0.53 && Math.sign(offset) === Math.sign(allowed));
    })
    .map(({ where, offset }) => `${where}: off by ${offset.toFixed(3)} of a unit`);
}

describe('the U.S. Standard Atmosphere, 1976, against its own tables', () => {
  it('the unit of a printed value is read from its digits', () => {
    expect(unit('1.1393e3')).toBeCloseTo(0.1, 15);
    expect(unit('294.651')).toBeCloseTo(1e-3, 15);
    expect(unit('1.8206e-5')).toBeCloseTo(1e-9, 20);
    expect(unit('-1000')).toBe(1);
  });

  it('Tables I and III by geometric altitude, -1 km to 50 km: every value as printed', () => {
    expect(misses(GEOMETRIC, standardAtmosphere, BEYOND_HALF_A_UNIT)).toEqual([]);
    // The values beyond half a unit, as recorded.
    const found = offsets(GEOMETRIC, standardAtmosphere).filter(
      (o) => o.quantity !== 'p' && Math.abs(o.offset) > 0.5,
    );
    expect(Object.fromEntries(found.map((o) => [o.key, Math.round(100 * o.offset) / 100]))).toEqual(
      BEYOND_HALF_A_UNIT,
    );
  });

  it("Tables I and III by geopotential altitude, at the layer bases 11, 20, 32 and 47 km' and the top, 51 km'", () => {
    expect(misses(GEOPOTENTIAL, atmosphereAtGeopotential)).toEqual([]);
  });

  it('the pressure column is truncated: every computed pressure at or above the printed one', () => {
    const p = [
      ...offsets(GEOMETRIC, standardAtmosphere),
      ...offsets(GEOPOTENTIAL, atmosphereAtGeopotential),
    ]
      .filter((o) => o.quantity === 'p')
      .map((o) => o.offset);
    expect(p.length).toBe(22);
    expect(Math.min(...p)).toBeGreaterThan(-1e-9);
    expect(Math.max(...p)).toBeCloseTo(0.96, 2);
    // Read as rounded, 6 of these 22 would miss by more than half a unit.
    expect(p.filter((x) => x > 0.5).length).toBe(6);
  });

  it('the largest relative difference of each quantity from the tables', () => {
    const largest = new Map<string, number>();
    for (const [rows, at] of [
      [GEOMETRIC, standardAtmosphere],
      [GEOPOTENTIAL, atmosphereAtGeopotential],
    ] as const) {
      for (const row of rows) {
        const a = at(row.altitude);
        for (const [quantity, , value] of QUANTITIES) {
          const relative = Math.abs(value(a) / Number(row[quantity]) - 1);
          largest.set(quantity, Math.max(largest.get(quantity) ?? 0, relative));
        }
      }
    }
    const r = (x: number) => Number(x.toPrecision(2));
    expect(Object.fromEntries([...largest].map(([q, x]) => [q, r(x)]))).toEqual({
      t: 2.2e-6,
      p: 6.9e-5,
      rho: 3e-5,
      cs: 1.6e-5,
      mu: 2.4e-5,
      eta: 3.6e-5,
    });
  });

  it('geometric and geopotential altitude, eqs. (18) and (19), as the tables pair them', () => {
    const paired = [
      ...GEOMETRIC.map((row) => [row, geopotentialAltitude(row.altitude)] as const),
      ...GEOPOTENTIAL.map((row) => [row, geometricAltitude(row.altitude)] as const),
    ];
    const off = paired.filter(([row, other]) => Math.abs(other - Number(row.other)) > 0.5);
    // 45669.52 m' printed 45669, and 51412.48 m printed 51413.
    expect(off.map(([row, other]) => [row.altitude, Math.round(100 * other) / 100])).toEqual([
      [46000, 45669.52],
      [51000, 51412.48],
    ]);
    for (const [row, other] of off) expect(Math.abs(other - Number(row.other))).toBeLessThan(0.53);
    for (const row of GEOPOTENTIAL) {
      expect(geopotentialAltitude(geometricAltitude(row.altitude))).toBeCloseTo(row.altitude, 8);
    }
  });

  it('the layers join: temperature and pressure are continuous at each base', () => {
    for (const base of [11000, 20000, 32000, 47000]) {
      const below = atmosphereAtGeopotential(base - 1e-6);
      const at = atmosphereAtGeopotential(base);
      expect(Math.abs(at.temperature / below.temperature - 1)).toBeLessThan(1e-9);
      expect(Math.abs(at.pressure / below.pressure - 1)).toBeLessThan(1e-9);
    }
  });

  it("the range served: 5 km below sea level to 51 km' (51.41 km); outside it, a RangeError", () => {
    expect(ALTITUDE_RANGE[0]).toBe(-5000);
    expect(TOP_GEOPOTENTIAL_ALTITUDE).toBe(51000);
    expect(ALTITUDE_RANGE[1]).toBeCloseTo(51412.48, 2);
    expect(() => standardAtmosphere(-5000.1)).toThrow(RangeError);
    expect(() => standardAtmosphere(51413)).toThrow(RangeError);
    expect(() => atmosphereAtGeopotential(51000.1)).toThrow(RangeError);
    expect(() => standardAtmosphere(Number.NaN)).toThrow(RangeError);
    expect(standardAtmosphere(ALTITUDE_RANGE[1]).geopotentialAltitude).toBeCloseTo(51000, 6);
    expect(standardAtmosphere(-5000).temperature).toBeCloseTo(320.676, 3);
  });
});
