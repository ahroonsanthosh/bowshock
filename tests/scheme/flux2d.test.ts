import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  FACE_FLUXES,
  FLUXES,
  faceFlux2D,
  hllcFaceFlux,
  godunovFaceFlux,
  type Primitive2D,
} from '../../src/scheme/flux';
import { GAMMA_AIR, soundSpeed, totalEnergy } from '../../src/scheme/gas';

const gamma = GAMMA_AIR;

const state2D = fc.record({
  rho: fc.double({ min: 1e-2, max: 1e2, noNaN: true }),
  u: fc.double({ min: -5, max: 5, noNaN: true }),
  v: fc.double({ min: -5, max: 5, noNaN: true }),
  p: fc.double({ min: 1e-2, max: 1e2, noNaN: true }),
});

/** Pairs whose normal Riemann problem has no vacuum, for any face direction. */
const pair2D = fc
  .tuple(state2D, state2D)
  .filter(
    ([l, r]) =>
      (2 / (gamma - 1)) * (soundSpeed(l.rho, l.p, gamma) + soundSpeed(r.rho, r.p, gamma)) >
      1.01 * Math.hypot(r.u - l.u, r.v - l.v),
  );
const angle = fc.double({ min: 0, max: 2 * Math.PI, noNaN: true });

function flux(name: keyof typeof FACE_FLUXES, l: Primitive2D, r: Primitive2D, theta: number) {
  const out = new Float64Array(4);
  faceFlux2D(FACE_FLUXES[name], l, r, Math.cos(theta), Math.sin(theta), gamma, out);
  return [...out];
}

function rotate(w: Primitive2D, theta: number): Primitive2D {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { ...w, u: c * w.u - s * w.v, v: s * w.u + c * w.v };
}

/** Scale of the terms in a 2D flux: magnitudes of momentum, pressure and energy flux. */
function scale(...ws: Primitive2D[]): number[] {
  const speed = Math.max(...ws.map((w) => Math.hypot(w.u, w.v) + soundSpeed(w.rho, w.p, gamma)));
  const m = Math.max(...ws.map((w) => w.rho)) * speed;
  const e = Math.max(...ws.map((w) => totalEnergy(w.rho, Math.hypot(w.u, w.v), w.p, gamma) + w.p));
  return [m, m * speed + Math.max(...ws.map((w) => w.p)), m * speed, e * speed];
}

function expectClose(a: number[], b: number[], scales: number[], tol = 1e-12): void {
  for (let i = 0; i < 4; i++) expect(Math.abs(a[i]! - b[i]!) / scales[i]!).toBeLessThan(tol);
}

describe.each(Object.keys(FACE_FLUXES) as (keyof typeof FACE_FLUXES)[])('%s 2D flux', (name) => {
  it('property: rotational invariance, F(R w, R n) = R F(w, n)', () => {
    fc.assert(
      fc.property(pair2D, angle, angle, ([l, r], theta, phi) => {
        const f = flux(name, l, r, theta);
        const g = flux(name, rotate(l, phi), rotate(r, phi), theta + phi);
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        const rotated = [f[0]!, c * f[1]! - s * f[2]!, s * f[1]! + c * f[2]!, f[3]!];
        expectClose(g, rotated, scale(l, r), 1e-11);
      }),
      { numRuns: 500, seed: 51 },
    );
  });

  it('property: consistency, F(w, w, n) is the physical flux through the face', () => {
    fc.assert(
      fc.property(state2D, angle, (w, theta) => {
        const nx = Math.cos(theta);
        const ny = Math.sin(theta);
        const un = w.u * nx + w.v * ny;
        const energy = totalEnergy(w.rho, Math.hypot(w.u, w.v), w.p, gamma);
        const exact = [
          w.rho * un,
          w.rho * un * w.u + w.p * nx,
          w.rho * un * w.v + w.p * ny,
          un * (energy + w.p),
        ];
        expectClose(flux(name, w, w, theta), exact, scale(w));
      }),
      { numRuns: 500, seed: 52 },
    );
  });

  it('reduces exactly to the 1D flux for zero tangential velocity and n = (1, 0)', () => {
    fc.assert(
      fc.property(pair2D, ([l, r]) => {
        const L = { ...l, v: 0 };
        const R = { ...r, v: 0 };
        const out1 = new Float64Array(3);
        FLUXES[name]({ rho: L.rho, u: L.u, p: L.p }, { rho: R.rho, u: R.u, p: R.p }, gamma, out1);
        const f = flux(name, L, R, 0);
        expect([f[0], f[1], f[3]]).toEqual([...out1]);
        expect(Math.abs(f[2]!)).toBe(0); // -0 and +0 are both exact
      }),
      { numRuns: 300, seed: 53 },
    );
  });
});

describe('HLLC in two dimensions', () => {
  it('resolves a stationary shear layer exactly (no mass or momentum exchange)', () => {
    // Same pressure, zero normal velocity, different density and tangential
    // velocity: an exact solution of the Euler equations that HLLC must
    // preserve, unlike HLL or Rusanov.
    const out = new Float64Array(4);
    hllcFaceFlux({ rho: 1, un: 0, ut: 0.8, p: 1 }, { rho: 0.3, un: 0, ut: -0.5, p: 1 }, gamma, out);
    expect(out[0]).toBe(0);
    expect(out[1]).toBeCloseTo(1, 14);
    expect(out[2]).toBe(0);
    expect(out[3]).toBe(0);
  });

  it('property: a moving shear and contact layer is transported exactly', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        fc.double({ min: -0.9, max: 0.9, noNaN: true }),
        fc.double({ min: -5, max: 5, noNaN: true }),
        fc.double({ min: -5, max: 5, noNaN: true }),
        (rhoL, rhoR, machish, utL, utR) => {
          const p = 1;
          const un = machish * Math.min(soundSpeed(rhoL, p, gamma), soundSpeed(rhoR, p, gamma));
          const L = { rho: rhoL, un, ut: utL, p };
          const R = { rho: rhoR, un, ut: utR, p };
          const a = new Float64Array(4);
          const b = new Float64Array(4);
          hllcFaceFlux(L, R, gamma, a);
          godunovFaceFlux(L, R, gamma, b);
          const s = scale({ rho: rhoL, u: un, v: utL, p }, { rho: rhoR, u: un, v: utR, p });
          expectClose([...a], [...b], s);
        },
      ),
      { numRuns: 500, seed: 54 },
    );
  });
});
