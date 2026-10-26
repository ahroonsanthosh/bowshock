import { describe, expect, it } from 'vitest';
import {
  baseRadiusOf,
  boatTailAngle,
  bodyBreakpoints,
  bodyLength,
  bodyRadius,
  shoulderPosition,
  validateBody,
  type Body,
} from '../../src/geometry/body';
import { noseRadius } from '../../src/geometry/nose';

describe('bodies', () => {
  it('nose then cylinder, with breakpoints at the tip, shoulder and end', () => {
    const body: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 7,
    };
    expect(bodyRadius(body, -1)).toBe(0);
    expect(bodyRadius(body, 1.5)).toBe(noseRadius(body.nose, 1.5));
    expect(bodyRadius(body, 5)).toBe(0.5);
    // Beyond the end the cylinder continues.
    expect(bodyRadius(body, 12)).toBe(0.5);
    expect(bodyBreakpoints(body)).toEqual([0, 3, 10]);
    expect(bodyLength(body)).toBe(10);
    expect(baseRadiusOf(body)).toBe(0.5);
    expect(boatTailAngle(body)).toBe(0);
  });

  it('a conical boat-tail behind the cylinder: its shoulder, cone, angle and base (0023)', () => {
    const body: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 5,
      boatTail: { length: 1, baseRadius: 0.4 },
    };
    expect(shoulderPosition(body)).toBe(8);
    expect(bodyLength(body)).toBe(9);
    expect(bodyBreakpoints(body)).toEqual([0, 3, 8, 9]);
    expect(bodyRadius(body, 8)).toBe(0.5);
    expect(bodyRadius(body, 8.5)).toBeCloseTo(0.45, 15);
    expect(bodyRadius(body, 9)).toBeCloseTo(0.4, 15);
    // Beyond the base the cone continues, down to the axis.
    expect(bodyRadius(body, 10)).toBeCloseTo(0.3, 15);
    expect(bodyRadius(body, 20)).toBe(0);
    expect(boatTailAngle(body)).toBeCloseTo(Math.atan(0.1), 15);
    expect(baseRadiusOf(body)).toBe(0.4);
    // Straight behind the nose too, with no cylinder.
    const short: Body = { ...body, cylinderLength: 0 };
    expect(bodyBreakpoints(short)).toEqual([0, 3, 4]);
    expect(bodyRadius(short, 3.5)).toBeCloseTo(0.45, 15);
  });

  it('refuses a boat-tail that does not narrow, or has no length', () => {
    const nose = { shape: { kind: 'conical' }, length: 3, baseRadius: 0.5 } as const;
    expect(() => {
      validateBody({ nose, cylinderLength: 1, boatTail: { length: 0, baseRadius: 0.4 } });
    }).toThrow(/positive length/);
    for (const baseRadius of [0, 0.5, 0.6]) {
      expect(() => {
        validateBody({ nose, cylinderLength: 1, boatTail: { length: 1, baseRadius } });
      }).toThrow(/below the body's radius/);
    }
    expect(() => {
      validateBody({ nose, cylinderLength: 1, boatTail: { length: 1, baseRadius: 0.3 } });
    }).not.toThrow();
  });
});
