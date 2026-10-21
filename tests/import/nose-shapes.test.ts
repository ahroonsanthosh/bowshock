/**
 * Each of OpenRocket's nose shapes, read from a file, has the radius
 * profile OpenRocket gives it: OpenRocket's definitions
 * (core/.../rocketcomponent/Transition.java, Shape.getRadius, read for the
 * formulas and written here from them) against src/geometry/nose.ts's
 * noseRadius on the shape the importer maps the file to.
 */

import { describe, expect, it } from 'vitest';
import { noseRadius, type Nose } from '../../src/geometry/nose';
import { importOrk } from '../../src/import/index';
import { bytesOf, document, nose, stage, tube } from './build';

/** OpenRocket's MathUtil.safeSqrt: the square root, zero for a negative argument. */
const safeSqrt = (d: number) => (d < 0 ? 0 : Math.sqrt(d));

/** OpenRocket's radius of a nose of aft radius R and length L at x from the tip. */
function openRocketRadius(shape: string, x: number, R: number, L: number, p: number): number {
  switch (shape) {
    case 'conical':
      return (R * x) / L;
    case 'ogive': {
      // A nose shorter than its radius is the ogive of length R, compressed.
      if (L < R) {
        x = (x * R) / L;
        L = R;
      }
      if (p < 0.001) return (R * x) / L;
      const rho = safeSqrt(
        ((L * L + R * R) * (((2 - p) * L) ** 2 + (p * R) ** 2)) / (4 * (p * R) ** 2),
      );
      const Lc = L / p;
      const y0 = safeSqrt(rho * rho - Lc * Lc);
      return safeSqrt(rho * rho - (Lc - x) ** 2) - y0;
    }
    case 'ellipsoid': {
      const s = (x * R) / L;
      return safeSqrt(2 * R * s - s * s);
    }
    case 'power':
      if (p <= 0.00001) return x <= 0.00001 ? 0 : R;
      return R * (x / L) ** p;
    case 'parabolic':
      return (R * ((2 * x) / L - p * (x / L) ** 2)) / (2 - p);
    case 'haack': {
      const t = Math.acos(1 - (2 * x) / L);
      return R * safeSqrt((t - Math.sin(2 * t) / 2 + p * Math.sin(t) ** 3) / Math.PI);
    }
    default:
      throw new Error(shape);
  }
}

async function importedNose(shape: string, parameter: number | undefined, L: number, R: number) {
  const xml = document([
    stage([
      nose({
        shape,
        length: L,
        radius: String(R),
        ...(parameter === undefined ? {} : { parameter }),
      }),
      tube({ radius: String(R) }),
    ]),
  ]);
  const { mapping } = await importOrk(bytesOf(xml), { fileName: 'nose.ork' });
  const design = mapping.design;
  if (design === null) throw new Error(JSON.stringify(mapping.notRepresented));
  const n: Nose = {
    shape: design.nose.shape,
    length: design.nose.length,
    baseRadius: design.nose.diameter / 2,
  };
  return n;
}

/** Largest difference over the profile, relative to the base radius. */
function largestDifference(shape: string, p: number, n: Nose): number {
  let worst = 0;
  for (let k = 0; k <= 400; k++) {
    const x = (n.length * k) / 400;
    const ours = noseRadius(n, x);
    const theirs = openRocketRadius(shape, x, n.baseRadius, n.length, p);
    worst = Math.max(worst, Math.abs(ours - theirs) / n.baseRadius);
  }
  return worst;
}

const CASES: readonly (readonly [string, readonly number[]])[] = [
  ['conical', [0]],
  ['ogive', [1, 0.8, 0.5, 0.25, 0.05, 0.0011, 0.0009, 0]],
  ['ellipsoid', [0]],
  ['power', [1, 0.75, 0.5, 0.3, 0.1, 0.01]],
  ['parabolic', [1, 0.75, 0.5, 0.25, 0]],
  ['haack', [0, 0.1, 1 / 3]],
];

describe("each OpenRocket nose shape keeps OpenRocket's radius profile", () => {
  for (const [shape, parameters] of CASES) {
    for (const p of parameters) {
      for (const [L, R] of [
        [0.1, 0.0125],
        [0.53, 0.07],
        [0.01, 0.02], // shorter than its radius
      ] as const) {
        it(`${shape}${parameters.length > 1 ? ` ${p}` : ''}, length ${L} m, base radius ${R} m`, async () => {
          const n = await importedNose(shape, ORK_PARAMETER(shape, p), L, R);
          // OpenRocket's ogive subtracts two nearly equal terms for small
          // parameters; src/geometry rearranges them, so the two agree to
          // OpenRocket's own rounding there, and to 1e-12 elsewhere.
          const tolerance = shape === 'ogive' && p < 0.1 ? 1e-9 : 1e-12;
          expect(largestDifference(shape, p, n)).toBeLessThan(tolerance);
        });
      }
    }
  }
});

/** The parameter as written in the file (none for the shapes without one). */
function ORK_PARAMETER(shape: string, p: number): number | undefined {
  return shape === 'conical' || shape === 'ellipsoid' ? undefined : p;
}

describe('nose shapes the design cannot hold', () => {
  it("a power series at OpenRocket's flat-face limit (a flat-faced cylinder in OpenRocket)", async () => {
    for (const p of [0, 1e-5]) {
      const xml = document([stage([nose({ shape: 'power', parameter: p }), tube()])]);
      const { mapping } = await importOrk(bytesOf(xml), { fileName: 'flat.ork' });
      expect(mapping.design).toBeNull();
      expect(mapping.notRepresented[0]).toMatchObject({
        type: 'nosecone',
        effect: 'no-design',
        reason: expect.stringMatching(/flat face/) as unknown,
      });
    }
  });

  it('a parameter outside the range OpenRocket accepts', async () => {
    const xml = document([stage([nose({ shape: 'haack', parameter: 0.5 }), tube()])]);
    const { mapping } = await importOrk(bytesOf(xml), { fileName: 'haack.ork' });
    expect(mapping.design).toBeNull();
    expect(mapping.notRepresented[0]!.reason).toMatch(/lies outside 0 to 0\.333333/);
  });

  it('a shape OpenRocket does not know', async () => {
    const xml = document([stage([nose({ shape: 'bulbous' }), tube()])]);
    const { mapping } = await importOrk(bytesOf(xml), { fileName: 'x.ork' });
    expect(mapping.design).toBeNull();
    expect(mapping.notRepresented[0]!.reason).toMatch(/"bulbous" is not one OpenRocket knows/);
  });
});
