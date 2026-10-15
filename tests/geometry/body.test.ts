import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bodyBreakpoints, bodyRadius, noseTipSlope, type Body } from '../../src/geometry/body';
import { noseRadius, type Nose, type NoseShape } from '../../src/geometry/nose';

const value = (min: number, max: number) =>
  fc.integer({ min: Math.round(1000 * min), max: Math.round(1000 * max) }).map((n) => n / 1000);

const sharpShape: fc.Arbitrary<NoseShape> = fc.oneof(
  fc.constant({ kind: 'conical' } as const),
  value(0, 1).map((parameter) => ({ kind: 'ogive', parameter }) as const),
  value(0, 1).map((parameter) => ({ kind: 'parabolic', parameter }) as const),
  fc.constant({ kind: 'power', exponent: 1 } as const),
);

describe('bodies', () => {
  it('nose then cylinder, with breakpoints at the tip, shoulder and end', () => {
    const body: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 7,
    };
    expect(bodyRadius(body, -1)).toBe(0);
    expect(bodyRadius(body, 1.5)).toBe(noseRadius(body.nose, 1.5));
    expect(bodyRadius(body, 5)).toBe(0.5);
    expect(bodyBreakpoints(body)).toEqual([0, 3, 10]);
  });

  it('property: the tip slope of every sharp nose matches its profile', () => {
    fc.assert(
      fc.property(sharpShape, value(0.2, 10), value(0.05, 2), (shape, length, baseRadius) => {
        const nose: Nose = { shape, length, baseRadius };
        // A tangent ogive no longer than its radius is a quarter circle:
        // blunt (tested below).
        fc.pre(Number.isFinite(noseTipSlope(nose)));
        // Secant slopes r(h) / h, Richardson-extrapolated to cancel their
        // first-order error, r''(0) h / 2.
        const secant = (h: number) => noseRadius(nose, h) / h;
        const h = 1e-8 * length;
        const numerical = 2 * secant(h) - secant(2 * h);
        // Remaining error O(h^2), largest for ogives just longer than their
        // radius (nearly quarter circles); the cancellation-free radius
        // formula keeps round-off below it at this step.
        expect(noseTipSlope(nose) / numerical).toBeCloseTo(1, 6);
      }),
      { seed: 111 },
    );
  });

  it('a tangent ogive no longer than its radius is a quarter circle: blunt', () => {
    const quarter: Nose = { shape: { kind: 'ogive', parameter: 1 }, length: 0.5, baseRadius: 0.5 };
    expect(noseTipSlope(quarter)).toBe(Infinity);
    for (const x of [0.1, 0.25, 0.4]) {
      expect(Math.hypot(x - 0.5, noseRadius(quarter, x))).toBeCloseTo(0.5, 12);
    }
    const longer: Nose = { ...quarter, length: 0.51 };
    expect(Number.isFinite(noseTipSlope(longer))).toBe(true);
  });

  it('noses that leave the tip vertically are blunt (infinite tip slope)', () => {
    const blunt: NoseShape[] = [
      { kind: 'ellipsoid' },
      { kind: 'haack', parameter: 0 },
      { kind: 'haack', parameter: 1 / 3 },
      { kind: 'power', exponent: 0.5 },
      { kind: 'power', exponent: 0.9 },
    ];
    for (const shape of blunt) {
      const nose: Nose = { shape, length: 3, baseRadius: 0.5 };
      expect(noseTipSlope(nose)).toBe(Infinity);
      // The profile steepens without bound towards the tip (for r ~ x^n the
      // secant slope grows as x^(n - 1): slowly when n is near 1).
      const secant = (x: number) => noseRadius(nose, x) / x;
      expect(secant(1e-12)).toBeGreaterThan(3 * secant(1e-4));
    }
  });
});
