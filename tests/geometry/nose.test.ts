import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  cappedNose,
  noseBaseSlope,
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

  // Base slope: the junction with the body, a corner where it is positive.
  it('property: the base slope of every nose matches its profile', () => {
    fc.assert(
      fc.property(shape, value(0.2, 10), value(0.05, 2), (shape, length, baseRadius) => {
        // The Haack series reaches its zero base slope as the square root
        // of the distance from the base (tested below), too slowly for a
        // difference to resolve.
        fc.pre(shape.kind !== 'haack');
        const nose: Nose = { shape, length, baseRadius };
        // Second-order one-sided difference at the base, error O(h^2).
        const h = 1e-5 * length;
        const r = (x: number) => noseRadius(nose, x);
        const numerical = (3 * r(length) - 4 * r(length - h) + r(length - 2 * h)) / (2 * h);
        expect(Math.abs(noseBaseSlope(nose) - numerical)).toBeLessThan(
          1e-6 * (1 + baseRadius / length),
        );
      }),
      { seed: 112 },
    );
  });

  it('the tangent ogive and the parabola of parameter 1 meet the body without a corner', () => {
    for (const length of [0.6, 1, 3, 10]) {
      const tangent: Nose = { shape: { kind: 'ogive', parameter: 1 }, length, baseRadius: 0.5 };
      const parabola: Nose = {
        shape: { kind: 'parabolic', parameter: 1 },
        length,
        baseRadius: 0.5,
      };
      expect(noseBaseSlope(tangent)).toBe(0);
      expect(noseBaseSlope(parabola)).toBe(0);
      // Their secant and partial siblings meet it at a corner.
      expect(
        noseBaseSlope({ ...tangent, shape: { kind: 'ogive', parameter: 0.5 } }),
      ).toBeGreaterThan(0);
      expect(
        noseBaseSlope({ ...parabola, shape: { kind: 'parabolic', parameter: 0.5 } }),
      ).toBeGreaterThan(0);
      expect(noseBaseSlope({ ...tangent, shape: { kind: 'conical' } })).toBe(0.5 / length);
    }
  });

  it('the Haack series meets the body without a corner, its slope falling as the square root', () => {
    for (const parameter of [0, 1 / 3]) {
      const haack: Nose = { shape: { kind: 'haack', parameter }, length: 3, baseRadius: 0.5 };
      expect(noseBaseSlope(haack)).toBe(0);
      const secant = (h: number) => (noseRadius(haack, 3) - noseRadius(haack, 3 - h)) / h;
      expect(secant(1e-6) / secant(4e-6)).toBeCloseTo(0.5, 3);
    }
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

  it('a tangent ogive no longer than its radius has radius 0 at its tip, not 0 / 0', () => {
    // Found by the OpenRocket import's profile comparison: the arc's centre
    // lies on the axis there, and the rearranged form was 0 / 0 at the tip.
    for (const [length, baseRadius] of [
      [0.5, 0.5],
      [0.01, 0.02],
      [0.3, 0.7],
    ] as const) {
      const n: Nose = { shape: { kind: 'ogive', parameter: 1 }, length, baseRadius };
      expect(noseRadius(n, 0)).toBe(0);
      for (let k = 1; k <= 100; k++) {
        expect(Number.isFinite(noseRadius(n, (length * k) / 100))).toBe(true);
      }
    }
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

describe('rounded tips (a sphere cap tangent to the profile)', () => {
  // r_n from 0.001 to 0.499 of R = 0.5: up to just below the base radius,
  // where the parent's length grows without bound (the review's cases).
  const capped: fc.Arbitrary<Nose> = fc.record({
    shape: fc.oneof(
      fc.constant({ kind: 'ogive', parameter: 1 } as const),
      fc.constant({ kind: 'haack', parameter: 0 } as const),
      fc.constant({ kind: 'parabolic', parameter: 1 } as const),
      fc.constant({ kind: 'conical' } as const),
    ),
    length: value(1, 8),
    baseRadius: fc.constant(0.5),
    tipRadius: fc.integer({ min: 5, max: 4995 }).map((n) => n / 10000),
  });

  /** The cap's continuity and the parent's profile behind it, on one nose. */
  const checkCap = (n: Nose) => {
    validateNose(n);
    const rn = n.tipRadius!;
    const c = cappedNose(n);
    // The tip on the axis, exactly; the curvature there 1 / r_n.
    expect(noseRadius(n, 0)).toBe(0);
    expect(c.centreX).toBe(rn);
    const x = 1e-6 * Math.min(rn, c.tangentX);
    expect(noseRadius(n, x) ** 2 / (2 * x)).toBeCloseTo(rn, 6);
    // Every point of the cap at r_n from its centre.
    for (let k = 1; k < 10; k++) {
      const xx = (c.tangentX * k) / 10;
      expect(Math.abs(Math.hypot(xx - rn, noseRadius(n, xx)) - rn)).toBeLessThan(
        1e-12 * rn + 1e-15,
      );
    }
    // At the tangent point the radius and slope are continuous.
    const e = 1e-6 * c.tangentX;
    const left = (noseRadius(n, c.tangentX) - noseRadius(n, c.tangentX - e)) / e;
    const right = (noseRadius(n, c.tangentX + e) - noseRadius(n, c.tangentX)) / e;
    expect(Math.abs(left - right)).toBeLessThan(1e-4 * (1 + Math.abs(left)));
    // Behind it the parent's profile, shifted by the offset.
    const xb = 0.5 * (c.tangentX + n.length);
    // (value for value but on the Haack series, whose profile behind the
    // cap is computed without the cancellation of noseRadius's formula).
    const behind = noseRadius(c.parent, xb + c.offset);
    expect(Math.abs(noseRadius(n, xb) - behind)).toBeLessThanOrEqual(
      n.shape.kind === 'haack' ? 1e-12 * behind : 0,
    );
    return c;
  };

  it('property: the cap is a sphere on the axis that meets the profile without a kink', () => {
    fc.assert(
      fc.property(capped, (n) => {
        checkCap(n);
      }),
      { seed: 202 },
    );
  });

  it('property: the overall length is kept, the base radius and base slope are the shape’s', () => {
    fc.assert(
      fc.property(capped, (n) => {
        const c = cappedNose(n);
        expect(Math.abs(c.parent.length - n.length - c.offset)).toBeLessThan(
          1e-12 * c.parent.length,
        );
        expect(c.offset).toBeGreaterThan(0);
        expect(noseRadius(n, n.length)).toBe(n.baseRadius);
        expect(noseBaseSlope(n)).toBe(noseBaseSlope(c.parent));
        expect(noseTipSlope(n)).toBe(Infinity);
        let previous = 0;
        for (let k = 1; k <= 400; k++) {
          const r = noseRadius(n, (n.length * k) / 400);
          expect(r).toBeGreaterThanOrEqual(previous);
          previous = r;
        }
      }),
      { seed: 203 },
    );
  });

  /**
   * The tangent ogive's cap in closed form, independent of cappedNose: the
   * sphere centred on the axis at a and internally tangent to the arc of
   * radius rho = (R^2 + Lp^2) / (2 R) centred at (Lp, R - rho) has
   * (Lp - a)^2 = (rho - r_n)^2 - (rho - R)^2 = (R - r_n) (2 rho - r_n - R)
   * (written so, without the cancellation of the squares when rho is
   * large); the tangent point lies on the line of the two centres, rho from
   * the arc's; the parent's length solves Lp - (a - r_n) = length, by
   * bisection here. They agree with cappedNose to 1e-12.
   */
  const ogiveCap = (length: number, R: number, rn: number) => {
    const at = (lp: number) => {
      const rho = (R * R + lp * lp) / (2 * R);
      const a = lp - Math.sqrt((R - rn) * (2 * rho - rn - R));
      return { offset: a - rn, xt: lp + ((a - lp) * rho) / (rho - rn) };
    };
    let lo = length;
    let hi = 2 * length;
    while (hi - at(hi).offset < length) hi *= 2;
    for (let k = 0; k < 200; k++) {
      const mid = 0.5 * (lo + hi);
      if (mid - at(mid).offset < length) lo = mid;
      else hi = mid;
    }
    const { offset, xt } = at(0.5 * (lo + hi));
    return { parentLength: 0.5 * (lo + hi), offset, tangentX: xt - offset };
  };

  it('the tangent ogive against its closed form, from small caps to r_n just below R', () => {
    // The W6 probe's case (a 5-caliber ogive, 0.05 R): offset 0.1054666264,
    // tangent point 0.02026925579.
    const probe = cappedNose({
      shape: { kind: 'ogive', parameter: 1 },
      length: 5,
      baseRadius: 0.5,
      tipRadius: 0.025,
    });
    expect(probe.offset).toBeCloseTo(0.1054666264, 10);
    expect(probe.tangentX).toBeCloseTo(0.02026925579, 10);
    for (const [length, rn] of [
      [5, 0.025],
      [3, 0.0005],
      [3, 0.075],
      [3, 0.4],
      [3, 0.49],
      [3, 0.499],
      [8, 0.4995],
      [1, 0.45],
    ] as const) {
      const c = cappedNose({
        shape: { kind: 'ogive', parameter: 1 },
        length,
        baseRadius: 0.5,
        tipRadius: rn,
      });
      const exact = ogiveCap(length, 0.5, rn);
      expect(Math.abs(c.parent.length / exact.parentLength - 1), `${length} ${rn}`).toBeLessThan(
        1e-12,
      );
      expect(Math.abs(c.offset - exact.offset), `${length} ${rn}`).toBeLessThan(
        1e-12 * exact.parentLength,
      );
      expect(Math.abs(c.tangentX - exact.tangentX), `${length} ${rn}`).toBeLessThan(
        1e-12 * exact.parentLength,
      );
    }
    // The review's case: r_n 0.499 on a 3-caliber ogive needs a parent of
    // 55.926 calibers; no flat stretch inside the nose.
    const big = cappedNose({
      shape: { kind: 'ogive', parameter: 1 },
      length: 3,
      baseRadius: 0.5,
      tipRadius: 0.499,
    });
    expect(big.parent.length).toBeCloseTo(55.926, 2);
  });

  it('small caps on a Von Karman nose: the slope from its formula, down to r_n / R of 2e-8', () => {
    for (const ratio of [2e-8, 2e-6, 2e-4, 2e-2]) {
      const n: Nose = {
        shape: { kind: 'haack', parameter: 0 },
        length: 5,
        baseRadius: 0.5,
        tipRadius: 0.5 * ratio,
      };
      const c = checkCap(n);
      // The sphere tangent at the tangent point has radius r_n: f sqrt(1 + f'^2)
      // with the slope from the cap's own geometry, (r_n - x) / r there.
      const r = noseRadius(n, c.tangentX);
      const capSlope = (c.centreX - c.tangentX) / r;
      expect(r * Math.sqrt(1 + capSlope * capSlope)).toBeCloseTo(n.tipRadius!, 12);
    }
  });

  it('refuses tip radii outside (0, R), and on shapes other than the four offered', () => {
    const base = { shape: { kind: 'ogive', parameter: 1 } as const, length: 3, baseRadius: 0.5 };
    expect(() => {
      validateNose({ ...base, tipRadius: 0 });
    }).toThrow(RangeError);
    expect(() => {
      validateNose({ ...base, tipRadius: 0.5 });
    }).toThrow(RangeError);
    expect(() => {
      validateNose({ ...base, tipRadius: -0.1 });
    }).toThrow(RangeError);
    expect(() => {
      validateNose({ shape: { kind: 'ellipsoid' }, length: 3, baseRadius: 0.5, tipRadius: 0.05 });
    }).toThrow(/already rounded/);
    expect(() => {
      validateNose({ ...base, length: 0.5, tipRadius: 0.05 });
    }).toThrow(/already rounded/);
    for (const shape of [
      { kind: 'ogive', parameter: 0.5 },
      { kind: 'power', exponent: 0.4 },
      { kind: 'power', exponent: 0.75 },
      { kind: 'haack', parameter: 1 / 3 },
      { kind: 'parabolic', parameter: 0.5 },
    ] as const) {
      expect(() => {
        validateNose({ shape, length: 3, baseRadius: 0.5, tipRadius: 0.05 });
      }, shape.kind).toThrow(/offered on the tangent ogive/);
    }
    expect(() => cappedNose(base)).toThrow(/no tip radius/);
    expect(() => {
      validateNose({ ...base, tipRadius: 0.05 });
    }).not.toThrow();
    // An out-of-range parameter with a tip radius: both reasons.
    expect(() => {
      validateNose({
        shape: { kind: 'ogive', parameter: 1.5 },
        length: 3,
        baseRadius: 0.5,
        tipRadius: 0.05,
      });
    }).toThrow(/the ogive parameter must lie in \[0, 1\], got 1.5; a tip radius is offered on/);
  });

  it('takes a tip radius on the cone by any of its names, with the cone’s cap', () => {
    const cone = cappedNose({
      shape: { kind: 'conical' },
      length: 3,
      baseRadius: 0.5,
      tipRadius: 0.05,
    });
    for (const shape of [
      { kind: 'ogive', parameter: 0.0005 },
      { kind: 'parabolic', parameter: 0 },
      { kind: 'power', exponent: 1 },
    ] as const) {
      const n: Nose = { shape, length: 3, baseRadius: 0.5, tipRadius: 0.05 };
      expect(() => {
        validateNose(n);
      }, shape.kind).not.toThrow();
      const c = cappedNose(n);
      expect(Math.abs(c.offset - cone.offset), shape.kind).toBeLessThan(1e-14);
      expect(Math.abs(c.tangentX - cone.tangentX), shape.kind).toBeLessThan(1e-12);
    }
  });

  it('refuses a tip radius too close to R for its parent’s length to be resolved, with that reason', () => {
    // r_n within 5e-10 of R: the uncapped ogive behind it would be about
    // 1e5 calibers long, and the overall length is no longer kept to
    // 1e-12 in double precision (without the check, off by 1.1e-7).
    expect(() => {
      validateNose({
        shape: { kind: 'ogive', parameter: 1 },
        length: 3,
        baseRadius: 0.5,
        tipRadius: 0.4999999995,
      });
    }).toThrow(
      /too close to the base radius: the uncapped profile behind it would be about .* calibers long/,
    );
  });

  /**
   * The Haack series' area function A(theta) = theta - sin(2 theta) / 2 +
   * C sin^3 theta by its full Taylor series, summed until the terms
   * vanish: sum over k >= 1 of (-1)^(k+1) 2^(2k) theta^(2k+1) / (2k+1)!,
   * accurate to rounding for theta <= 1, independent of the series the
   * code truncates at theta^11 below 0.1 and of the formula it uses above.
   */
  const haackArea = (theta: number, c: number) => {
    let term = (4 * theta ** 3) / 6;
    let sum = 0;
    for (let k = 1; Math.abs(term) > 1e-30 * Math.abs(sum) || k === 1; k++) {
      sum += term;
      term *= (-4 * theta * theta) / ((2 * k + 2) * (2 * k + 3));
    }
    return sum + c * Math.sin(theta) ** 3;
  };

  it('a capped Von Karman nose behind its cap: radius and slope against the full series, theta 0.01 to 1', () => {
    for (const [length, ratio] of [
      [3, 1e-4],
      [5, 1e-4],
      [3, 1e-3],
    ] as const) {
      const n: Nose = {
        shape: { kind: 'haack', parameter: 0 },
        length,
        baseRadius: 0.5,
        tipRadius: 0.5 * ratio,
      };
      const c = cappedNose(n);
      const Lp = c.parent.length;
      for (const theta of [0.01, 0.02, 0.05, 0.09, 0.0999, 0.1, 0.1001, 0.11, 0.2, 0.5, 0.68, 1]) {
        const xp = Lp * Math.sin(theta / 2) ** 2;
        const x = xp - c.offset;
        expect(x, `${length} ${ratio} ${theta}`).toBeGreaterThan(c.tangentX);
        const area = haackArea(theta, 0);
        const r = 0.5 * Math.sqrt(area / Math.PI);
        // The code's error: below theta 0.1 its series to theta^11 (1e-16);
        // above, theta - sin(2 theta) / 2 itself, which cancels to about
        // 1e-16 / theta^2 of A.
        const tolerance = theta < 0.1 ? 4e-16 : 4e-16 / (theta * theta);
        expect(Math.abs(noseRadius(n, x) / r - 1), `${length} ${ratio} ${theta}`).toBeLessThan(
          tolerance,
        );
        // dr/dx = R sin(theta) (2 + 3 C cos(theta)) / (Lp sqrt(pi A)), here by
        // central differences of the capped profile.
        const slope = (0.5 * Math.sin(theta) * 2) / (Lp * Math.sqrt(Math.PI * area));
        const h = 1e-5 * x;
        const fd = (noseRadius(n, x + h) - noseRadius(n, x - h)) / (2 * h);
        expect(Math.abs(fd / slope - 1), `${length} ${ratio} ${theta}`).toBeLessThan(1e-8);
      }
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
