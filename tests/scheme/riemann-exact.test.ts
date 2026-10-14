import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { GAMMA_AIR, soundSpeed, type Primitive1D } from '../../src/scheme/gas';
import {
  sampleRiemann,
  solveStarRegion,
  VacuumError,
  type StarRegion,
} from '../../src/scheme/riemann-exact';
import { TORO_TESTS } from '../../src/validation/toro-tests';

const gamma = GAMMA_AIR;

/** Relative difference, safe near zero. */
function relDiff(a: number, b: number, floor = 1e-300): number {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), floor);
}

/** Rankine-Hugoniot residuals across a shock moving at speed S, in its own frame. */
function rankineHugoniotResiduals(ahead: Primitive1D, behind: Primitive1D, S: number) {
  const wA = ahead.u - S;
  const wB = behind.u - S;
  const hA = (gamma * ahead.p) / ((gamma - 1) * ahead.rho);
  const hB = (gamma * behind.p) / ((gamma - 1) * behind.rho);
  const massA = ahead.rho * wA;
  const massB = behind.rho * wB;
  const momA = ahead.rho * wA * wA + ahead.p;
  const momB = behind.rho * wB * wB + behind.p;
  return {
    mass: relDiff(massA, massB, Math.abs(ahead.rho * S) + 1e-300),
    momentum: relDiff(momA, momB),
    enthalpy: relDiff(hA + 0.5 * wA * wA, hB + 0.5 * wB * wB),
  };
}

function shockSpeed(side: Primitive1D, pStar: number, direction: -1 | 1): number {
  const a = soundSpeed(side.rho, side.p, gamma);
  return (
    side.u +
    direction *
      a *
      Math.sqrt(((gamma + 1) / (2 * gamma)) * (pStar / side.p) + (gamma - 1) / (2 * gamma))
  );
}

/** Check every wave of an exact solution against the conservation laws. */
function expectPhysicallyConsistent(left: Primitive1D, right: Primitive1D, star: StarRegion) {
  const starL = { rho: star.rhoStarL, u: star.uStar, p: star.pStar };
  const starR = { rho: star.rhoStarR, u: star.uStar, p: star.pStar };

  for (const [side, starSide, dir] of [
    [left, starL, -1],
    [right, starR, 1],
  ] as const) {
    const wave = dir === -1 ? star.leftWave : star.rightWave;
    if (wave === 'shock') {
      const r = rankineHugoniotResiduals(side, starSide, shockSpeed(side, star.pStar, dir));
      expect(r.mass).toBeLessThan(1e-10);
      expect(r.momentum).toBeLessThan(1e-10);
      expect(r.enthalpy).toBeLessThan(1e-10);
    } else {
      // Isentropic: p / rho^gamma unchanged.
      expect(
        relDiff(side.p / Math.pow(side.rho, gamma), starSide.p / Math.pow(starSide.rho, gamma)),
      ).toBeLessThan(1e-10);
      // Riemann invariant u -/+ 2a/(gamma-1) unchanged across the fan.
      const inv = (w: Primitive1D) => w.u - (dir * 2 * soundSpeed(w.rho, w.p, gamma)) / (gamma - 1);
      const scale = Math.abs(inv(side)) + soundSpeed(side.rho, side.p, gamma);
      expect(Math.abs(inv(side) - inv(starSide)) / scale).toBeLessThan(1e-10);
    }
  }
}

describe('exact Riemann solver', () => {
  describe('Toro chapter 4 test problems', () => {
    for (const test of TORO_TESTS) {
      it(`${test.name}: star pressure and velocity match the published values`, () => {
        const star = solveStarRegion(test.left, test.right, gamma);
        // Published values are rounded to 5 or 6 significant figures, so
        // agreement is required to the precision printed.
        expect(Math.abs(star.pStar - test.published.pStar)).toBeLessThanOrEqual(
          test.published.pStarTolerance,
        );
        expect(Math.abs(star.uStar - test.published.uStar)).toBeLessThanOrEqual(
          test.published.uStarTolerance,
        );
      });

      it(`${test.name}: satisfies the conservation laws across every wave`, () => {
        const star = solveStarRegion(test.left, test.right, gamma);
        expectPhysicallyConsistent(test.left, test.right, star);
      });
    }
  });

  it('identifies the wave pattern of the Sod problem', () => {
    const star = solveStarRegion({ rho: 1, u: 0, p: 1 }, { rho: 0.125, u: 0, p: 0.1 }, gamma);
    expect(star.leftWave).toBe('rarefaction');
    expect(star.rightWave).toBe('shock');
  });

  it('returns the uniform state when left and right are equal', () => {
    const w = { rho: 1.3, u: 0.4, p: 2.1 };
    const star = solveStarRegion(w, w, gamma);
    expect(relDiff(star.pStar, w.p)).toBeLessThan(1e-14);
    expect(Math.abs(star.uStar - w.u)).toBeLessThan(1e-14);
    for (const s of [-5, -1, 0, 0.4, 1, 5]) {
      const sample = sampleRiemann(w, w, star, s, gamma);
      expect(relDiff(sample.rho, w.rho)).toBeLessThan(1e-13);
      expect(relDiff(sample.p, w.p)).toBeLessThan(1e-13);
    }
  });

  it('throws VacuumError when the states fly apart fast enough to create a vacuum', () => {
    expect(() =>
      solveStarRegion({ rho: 1, u: -10, p: 0.4 }, { rho: 1, u: 10, p: 0.4 }, gamma),
    ).toThrow(VacuumError);
  });

  it('rejects non-physical input states', () => {
    expect(() => solveStarRegion({ rho: -1, u: 0, p: 1 }, { rho: 1, u: 0, p: 1 }, gamma)).toThrow(
      RangeError,
    );
    expect(() => solveStarRegion({ rho: 1, u: 0, p: 0 }, { rho: 1, u: 0, p: 1 }, gamma)).toThrow(
      RangeError,
    );
  });

  // Random but physical, non-vacuum states. The ranges span pressure ratios
  // of up to 1e6 and Mach numbers of order 10, wider than any rocket flow.
  const state = fc.record({
    rho: fc.double({ min: 1e-3, max: 1e3, noNaN: true }),
    u: fc.double({ min: -20, max: 20, noNaN: true }),
    p: fc.double({ min: 1e-3, max: 1e3, noNaN: true }),
  });
  const nonVacuumPair = fc
    .tuple(state, state)
    .filter(
      ([l, r]) =>
        (2 / (gamma - 1)) * (soundSpeed(l.rho, l.p, gamma) + soundSpeed(r.rho, r.p, gamma)) >
        (r.u - l.u) * 1.01,
    );

  it('property: conservation laws hold for random states', () => {
    fc.assert(
      fc.property(nonVacuumPair, ([left, right]) => {
        expectPhysicallyConsistent(left, right, solveStarRegion(left, right, gamma));
      }),
      { numRuns: 2000, seed: 20261014 },
    );
  });

  it('property: mirror symmetry (swap and reflect the states)', () => {
    fc.assert(
      fc.property(nonVacuumPair, ([left, right]) => {
        const a = solveStarRegion(left, right, gamma);
        const b = solveStarRegion({ ...right, u: -right.u }, { ...left, u: -left.u }, gamma);
        expect(relDiff(a.pStar, b.pStar)).toBeLessThan(1e-12);
        const uScale = Math.abs(left.u) + Math.abs(right.u) + soundSpeed(left.rho, left.p, gamma);
        expect(Math.abs(a.uStar + b.uStar) / uScale).toBeLessThan(1e-12);
      }),
      { numRuns: 1000, seed: 7 },
    );
  });

  it('property: Galilean invariance (adding a uniform velocity)', () => {
    fc.assert(
      fc.property(
        nonVacuumPair,
        fc.double({ min: -10, max: 10, noNaN: true }),
        ([left, right], V) => {
          const a = solveStarRegion(left, right, gamma);
          const b = solveStarRegion(
            { ...left, u: left.u + V },
            { ...right, u: right.u + V },
            gamma,
          );
          expect(relDiff(a.pStar, b.pStar)).toBeLessThan(1e-12);
          const uScale =
            Math.abs(left.u) +
            Math.abs(right.u) +
            Math.abs(V) +
            soundSpeed(left.rho, left.p, gamma);
          expect(Math.abs(a.uStar + V - b.uStar) / uScale).toBeLessThan(1e-12);
        },
      ),
      { numRuns: 1000, seed: 11 },
    );
  });

  it('property: the sampled solution is continuous at rarefaction heads and tails', () => {
    fc.assert(
      fc.property(nonVacuumPair, ([left, right]) => {
        const star = solveStarRegion(left, right, gamma);
        const edges: number[] = [];
        if (star.leftWave === 'rarefaction') {
          const aL = soundSpeed(left.rho, left.p, gamma);
          const aStar = aL * Math.pow(star.pStar / left.p, (gamma - 1) / (2 * gamma));
          edges.push(left.u - aL, star.uStar - aStar);
        }
        if (star.rightWave === 'rarefaction') {
          const aR = soundSpeed(right.rho, right.p, gamma);
          const aStar = aR * Math.pow(star.pStar / right.p, (gamma - 1) / (2 * gamma));
          edges.push(right.u + aR, star.uStar + aStar);
        }
        // A continuous profile has a jump across [s - eps, s + eps] that
        // shrinks in proportion to eps; a true discontinuity does not shrink.
        const jump = (s: number, eps: number) => {
          const before = sampleRiemann(left, right, star, s - eps, gamma);
          const after = sampleRiemann(left, right, star, s + eps, gamma);
          return Math.max(relDiff(before.p, after.p), relDiff(before.rho, after.rho));
        };
        for (const s of edges) {
          const scale = 1 + Math.abs(s);
          const coarse = jump(s, 1e-6 * scale);
          const fine = jump(s, 1e-8 * scale);
          expect(fine).toBeLessThanOrEqual(0.02 * coarse + 1e-12);
        }
      }),
      { numRuns: 1000, seed: 13 },
    );
  });
});
