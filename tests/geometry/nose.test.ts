import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  noseRadius,
  noseTipSlope,
  validateNose,
  type Nose,
  type NoseShape,
} from '../../src/geometry/nose';

/** Order-one values in steps of 1e-3 (fc.double draws many degenerate values). */
const value = (min: number, max: number) =>
  fc.integer({ min: Math.round(1000 * min), max: Math.round(1000 * max) }).map((n) => n / 1000);

const shape: fc.Arbitrary<NoseShape> = fc.oneof(
  fc.constant({ kind: 'conical' } as const),
  value(0, 1).map((parameter) => ({ kind: 'ogive', parameter }) as const),
  fc.constant({ kind: 'ellipsoid' } as const),
  value(0.05, 1).map((exponent) => ({ kind: 'power', exponent }) as const),
  value(0, 1).map((parameter) => ({ kind: 'parabolic', parameter }) as const),
  value(0, 1 / 3).map((parameter) => ({ kind: 'haack', parameter }) as const),
);
const sharpShape: fc.Arbitrary<NoseShape> = fc.oneof(
  fc.constant({ kind: 'conical' } as const),
  value(0, 1).map((parameter) => ({ kind: 'ogive', parameter }) as const),
  value(0, 1).map((parameter) => ({ kind: 'parabolic', parameter }) as const),
  fc.constant({ kind: 'power', exponent: 1 } as const),
);

const nose: fc.Arbitrary<Nose> = fc.record({
  shape,
  length: value(0.2, 10),
  baseRadius: value(0.05, 2),
});

/** Slope of the profile by central differences. */
function slope(n: Nose, x: number, h = 1e-6 * n.length): number {
  return (noseRadius(n, x + h) - noseRadius(n, x - h)) / (2 * h);
}

describe('nose profiles', () => {
  it('property: start at the tip, end at the base radius, and widen monotonically', () => {
    fc.assert(
      fc.property(nose, (n) => {
        validateNose(n);
        expect(noseRadius(n, 0)).toBeCloseTo(0, 12);
        expect(noseRadius(n, n.length)).toBeCloseTo(n.baseRadius, 10);
        let previous = 0;
        for (let k = 1; k <= 200; k++) {
          const r = noseRadius(n, (n.length * k) / 200);
          expect(r).toBeGreaterThanOrEqual(previous - 1e-12 * n.baseRadius);
          previous = r;
        }
      }),
      { seed: 101 },
    );
  });

  it('cone: straight sides', () => {
    const n: Nose = { shape: { kind: 'conical' }, length: 3, baseRadius: 0.5 };
    expect(noseRadius(n, 1.2)).toBeCloseTo(0.2, 14);
  });

  it('property: tangent ogive is a circular arc meeting the body tangentially', () => {
    fc.assert(
      fc.property(value(0.5, 10), value(0.05, 2), (length, baseRadius) => {
        fc.pre(length >= baseRadius);
        const n: Nose = { shape: { kind: 'ogive', parameter: 1 }, length, baseRadius };
        // The arc radius of a tangent ogive is (R^2 + L^2) / (2R), centred
        // level with the base and that far below the profile's base point.
        const rho = (baseRadius ** 2 + length ** 2) / (2 * baseRadius);
        for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
          const x = t * length;
          const y = noseRadius(n, x);
          expect(Math.hypot(x - length, y - (baseRadius - rho))).toBeCloseTo(rho, 9);
        }
        expect(slope(n, length - 1e-4 * length)).toBeLessThan(2e-3 * (baseRadius / length) + 1e-9);
      }),
      { seed: 102 },
    );
  });

  it('property: every ogive of the family is a circular arc through tip and base', () => {
    fc.assert(
      fc.property(value(0.05, 1), value(0.5, 10), value(0.05, 2), (p, length, baseRadius) => {
        fc.pre(length >= baseRadius);
        const n: Nose = { shape: { kind: 'ogive', parameter: p }, length, baseRadius };
        // Fit the circle through three profile points; the others must lie on it.
        const pts = [0.2, 0.5, 0.8].map((t) => [t * length, noseRadius(n, t * length)] as const);
        const centre = circumcentre(pts[0]!, pts[1]!, pts[2]!);
        const rho = Math.hypot(pts[0]![0] - centre[0], pts[0]![1] - centre[1]);
        for (const t of [0, 0.05, 0.35, 0.65, 0.95, 1]) {
          const x = t * length;
          expect(Math.hypot(x - centre[0], noseRadius(n, x) - centre[1]) / rho).toBeCloseTo(1, 7);
        }
      }),
      { seed: 103 },
    );
  });

  it('ogive: tends to the cone as the parameter tends to zero, and is the cone below 0.001', () => {
    const cone: Nose = { shape: { kind: 'conical' }, length: 3, baseRadius: 0.5 };
    const below: Nose = { shape: { kind: 'ogive', parameter: 9e-4 }, length: 3, baseRadius: 0.5 };
    const near: Nose = { shape: { kind: 'ogive', parameter: 2e-3 }, length: 3, baseRadius: 0.5 };
    for (const x of [0.5, 1.5, 2.5]) {
      // As OpenRocket: parameters below 0.001 give the cone exactly.
      expect(noseRadius(below, x)).toBe(noseRadius(cone, x));
      expect(Math.abs(noseRadius(near, x) - noseRadius(cone, x))).toBeLessThan(1e-3 * 0.5);
    }
  });

  it('ogive shorter than its radius: the ogive of length R, compressed along x (as OpenRocket)', () => {
    const short: Nose = { shape: { kind: 'ogive', parameter: 1 }, length: 0.25, baseRadius: 0.5 };
    const square: Nose = { shape: { kind: 'ogive', parameter: 1 }, length: 0.5, baseRadius: 0.5 };
    for (const t of [0.2, 0.5, 0.9]) {
      expect(noseRadius(short, 0.25 * t)).toBeCloseTo(noseRadius(square, 0.5 * t), 14);
    }
  });

  it('property: ellipsoid lies on the ellipse with semi-axes L and R', () => {
    fc.assert(
      fc.property(value(0.2, 10), value(0.05, 2), value(0, 1), (length, baseRadius, t) => {
        const n: Nose = { shape: { kind: 'ellipsoid' }, length, baseRadius };
        const y = noseRadius(n, t * length);
        expect((1 - t) ** 2 + (y / baseRadius) ** 2).toBeCloseTo(1, 12);
      }),
      { seed: 104 },
    );
  });

  it('power series: r = R (x / L)^n, the cone at n = 1', () => {
    const half: Nose = { shape: { kind: 'power', exponent: 0.5 }, length: 4, baseRadius: 1 };
    expect(noseRadius(half, 1)).toBeCloseTo(0.5, 14);
    const one: Nose = { shape: { kind: 'power', exponent: 1 }, length: 4, baseRadius: 1 };
    expect(noseRadius(one, 1)).toBeCloseTo(0.25, 14);
  });

  it('parabolic series: the cone at K = 0, tangent to the body at K = 1', () => {
    const cone: Nose = { shape: { kind: 'parabolic', parameter: 0 }, length: 4, baseRadius: 1 };
    expect(noseRadius(cone, 1)).toBeCloseTo(0.25, 14);
    const tangent: Nose = { shape: { kind: 'parabolic', parameter: 1 }, length: 4, baseRadius: 1 };
    expect(Math.abs(slope(tangent, 4 - 1e-4))).toBeLessThan(1e-4);
    // A parabola: constant second derivative, -2K R / ((2 - K) L^2).
    const h = 1e-3;
    const second =
      (noseRadius(tangent, 2 + h) - 2 * noseRadius(tangent, 2) + noseRadius(tangent, 2 - h)) /
      h ** 2;
    expect(second).toBeCloseTo(-2 / 16, 6);
  });

  it('property: Haack series area slope has only the first two sine terms in theta', () => {
    // With x = L (1 - cos theta) / 2 and base area S_b, slender-body theory's
    // minimum-drag bodies have dS/dx = (4 S_b / (pi L)) (sin theta
    // + (3C / 4) sin 2 theta): only the sin theta term for the von Karman
    // ogive (C = 0), plus sin 2 theta for the LV-Haack.
    fc.assert(
      fc.property(
        value(0, 1 / 3),
        value(0.5, 10),
        value(0.05, 2),
        value(0.1, 0.9),
        (c, length, baseRadius, t) => {
          const n: Nose = { shape: { kind: 'haack', parameter: c }, length, baseRadius };
          const theta = Math.acos(1 - 2 * t);
          const x = t * length;
          const h = 1e-5 * length;
          const area = (s: number) => Math.PI * noseRadius(n, s) ** 2;
          const dSdx = (area(x + h) - area(x - h)) / (2 * h);
          const sb = Math.PI * baseRadius ** 2;
          const expected =
            ((4 * sb) / (Math.PI * length)) * (Math.sin(theta) + 0.75 * c * Math.sin(2 * theta));
          expect(dSdx / expected).toBeCloseTo(1, 6);
        },
      ),
      { seed: 105 },
    );
  });

  it('rejects parameters outside each shape’s range', () => {
    const bad: NoseShape[] = [
      { kind: 'ogive', parameter: 1.1 },
      { kind: 'power', exponent: 0 },
      { kind: 'parabolic', parameter: -0.1 },
      { kind: 'haack', parameter: 0.34 },
    ];
    for (const shape of bad) {
      expect(() => {
        validateNose({ shape, length: 1, baseRadius: 0.2 });
      }).toThrow(RangeError);
    }
    expect(() => {
      validateNose({ shape: { kind: 'conical' }, length: 0, baseRadius: 0.2 });
    }).toThrow(RangeError);
  });

  // Tip slope: sharp and blunt noses.
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

/** Centre of the circle through three points. */
function circumcentre(
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
): [number, number] {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const a2 = a[0] ** 2 + a[1] ** 2;
  const b2 = b[0] ** 2 + b[1] ** 2;
  const c2 = c[0] ** 2 + c[1] ** 2;
  return [
    (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d,
    (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d,
  ];
}
