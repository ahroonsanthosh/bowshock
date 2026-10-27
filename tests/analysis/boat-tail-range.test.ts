import { describe, expect, it } from 'vitest';
import {
  BOAT_TAIL_ALLOWANCE_SET,
  BOAT_TAIL_BASE_SET,
  BOAT_TAIL_MACH_RANGE,
  boatTailReasons,
  boatTailRefusal,
} from '../../src/analysis/boat-tail';
import { BOAT_TAIL_DRAG_FLOOR, boatTailVerified } from '../../src/analysis/fitted-flow';
import type { Body } from '../../src/geometry/body';

/** Where the boat-tail's own drag is served (design record 0023 section 2.5). */

const deg = Math.PI / 180;
const body = (
  angle: number,
  length: number,
  shape: Body['nose']['shape'] = { kind: 'ogive', parameter: 1 },
): Body => ({
  nose: { shape, length: 3, baseRadius: 0.5 },
  cylinderLength: 5,
  boatTail: { length, baseRadius: 0.5 - length * Math.tan(angle * deg) },
});

describe('the boat-tail term: where it is served', () => {
  it('at Mach 1.8 to 2.0 at most: no measured allowance elsewhere has passed its checks', () => {
    expect(BOAT_TAIL_MACH_RANGE).toEqual([1.8, 2.0]);
    const reasons = (mach: number) => boatTailRefusal(body(8, 1), mach) ?? '';
    expect(reasons(1.5)).toMatch(/no measurement at other Mach numbers/);
    expect(reasons(2.5)).toMatch(/no measurement at other Mach numbers/);
    expect(reasons(1.8)).not.toMatch(/no measurement at other Mach numbers/);
    expect(reasons(1.91)).not.toMatch(/no measurement at other Mach numbers/);
    expect(reasons(2.0)).not.toMatch(/no measurement at other Mach numbers/);
  });

  it('refuses blunt noses, and angles and lengths outside those checked, every reason given', () => {
    const blunt = boatTailRefusal(body(8, 1, { kind: 'haack', parameter: 0 }), 1.9) ?? '';
    expect(blunt).toMatch(/blunt nose/);
    expect(boatTailRefusal(body(20, 0.5), 1.9)).toMatch(/20.0 deg lies outside/);
    expect(boatTailRefusal(body(2, 1), 1.9)).toMatch(/2.0 deg lies outside/);
    expect(boatTailRefusal(body(8, 0.25), 1.9)).toMatch(/0.25 calibers long lies outside/);
    const all = boatTailRefusal(body(20, 3, { kind: 'haack', parameter: 0 }), 3) ?? '';
    for (const reason of [
      /blunt nose/,
      /no measurement at other Mach numbers/,
      /deg lies outside/,
      /calibers long/,
    ]) {
      expect(all).toMatch(reason);
    }
    // The same reasons, keyed (the population's coverage count).
    expect(
      boatTailReasons(body(20, 3, { kind: 'haack', parameter: 0 }), 3).map((r) => r.key),
    ).toEqual(['bluntNose', 'mach', 'angle', 'length', 'allowance', 'base']);
    expect(boatTailReasons(body(8, 1), 1.9).map((r) => r.key)).toEqual(['allowance', 'base']);
    expect(boatTailReasons({ nose: body(8, 1).nose, cylinderLength: 5 }, 3)).toEqual([]);
  });

  it('serves nothing: neither the allowance nor the base behind a boat-tail can be set; a body without a boat-tail has no term to refuse', () => {
    expect(BOAT_TAIL_ALLOWANCE_SET).toBe(false);
    expect(BOAT_TAIL_BASE_SET).toBe(false);
    const words = boatTailRefusal(body(8, 1), 1.9) ?? '';
    expect(words).toMatch(/splitter plate whose support was never tested/);
    expect(words).toMatch(/base pressure behind a boat-tail cannot be set/);
    expect(boatTailRefusal({ nose: body(8, 1).nose, cylinderLength: 5 }, 1.9)).toBeUndefined();
  });
});

describe("the boat-tail term's band", () => {
  it('four grids converging at order 1.4: the grid convergence index at that order plus the floor', () => {
    const exact = 0.05;
    const levels = [1, 2, 4, 8].map((refinement) => ({
      refinement,
      value: exact * (1 + 0.02 * refinement ** -1.4),
    }));
    const band = boatTailVerified(levels, 0);
    expect(band.estimate.kind).toBe('monotone');
    if (band.estimate.kind !== 'monotone') return;
    expect(band.estimate.order).toBeCloseTo(1.4, 9);
    const e21 = levels[2]!.value - levels[3]!.value;
    const gci = (1.25 * Math.abs(e21)) / (2 ** 1.4 - 1);
    expect(band.uncertainty).toBeCloseTo(gci + BOAT_TAIL_DRAG_FLOOR * levels[3]!.value, 15);
    // ... and it contains the finest grid's error.
    expect(band.uncertainty!).toBeGreaterThan(Math.abs(levels[3]!.value - exact));
    expect(band.floor).toBe(BOAT_TAIL_DRAG_FLOOR);
  });

  it('three grids give no band', () => {
    const band = boatTailVerified(
      [1, 2, 4].map((refinement) => ({ refinement, value: 0.05 * (1 + 0.02 / refinement) })),
      0,
    );
    expect(band.estimate.kind).toBe('unresolved');
    expect(band.uncertainty).toBeUndefined();
    expect(band.verified).toBe(false);
  });
});
