import { describe, expect, it } from 'vitest';
import { gridConvergence, refineUntilVerified } from '../../src/verification/grid-convergence';

const options = { orderTolerance: 0.3, noise: 1e-12 };
/** Values phi(h) on grids of cell size h = 1, 1/2, 1/4, ... (coarsest first). */
const family = (phi: (h: number) => number, grids = 4) =>
  Array.from({ length: grids }, (_, k) => phi(2 ** -k));

describe('grid convergence index (Celik et al., ratio 2)', () => {
  it('recovers the order and the limit of an exactly second-order sequence', () => {
    const estimate = gridConvergence(
      family((h) => 0.3 + 0.04 * h * h),
      options,
    );
    expect(estimate.kind).toBe('monotone');
    if (estimate.kind !== 'monotone') return;
    expect(estimate.order).toBeCloseTo(2, 12);
    expect(estimate.extrapolated).toBeCloseTo(0.3, 14);
    // The band is 1.25 times the true error of the finest value.
    expect(estimate.uncertainty / Math.abs(estimate.value - 0.3)).toBeCloseTo(1.25, 10);
  });

  it('first order: the band is 1.25 times the true error', () => {
    const estimate = gridConvergence(
      family((h) => -1 + 0.2 * h),
      options,
    );
    expect(estimate.kind).toBe('monotone');
    if (estimate.kind !== 'monotone') return;
    expect(estimate.order).toBeCloseTo(1, 12);
    expect(estimate.uncertainty / Math.abs(estimate.value + 1)).toBeCloseTo(1.25, 10);
  });

  it('caps the order at 2: faster convergence never narrows the band', () => {
    const estimate = gridConvergence(
      family((h) => 2 + 0.5 * h ** 3),
      options,
    );
    expect(estimate.kind).toBe('monotone');
    if (estimate.kind !== 'monotone') return;
    expect(estimate.order).toBeCloseTo(3, 12);
    // With p = 2 the band exceeds the true error by more than 1.25.
    expect(estimate.uncertainty).toBeGreaterThan(1.25 * Math.abs(estimate.value - 2));
  });

  it('refuses a band when the coarse grid is not in the asymptotic range', () => {
    // First order on fine grids, dominated by a fourth-order part on coarse
    // ones: the two triples disagree on the order (3.9 and 3.3).
    const phi = (h: number) => 1 + 0.1 * h + 5 * h ** 4;
    const estimate = gridConvergence(family(phi), options);
    expect(estimate.kind).toBe('unresolved');
    if (estimate.kind !== 'unresolved') return;
    expect(estimate.reason).toMatch(/orders of the two finest triples differ/);
    // With more grids the same sequence becomes asymptotic.
    const longer = gridConvergence(family(phi, 9), options);
    expect(longer.kind).toBe('monotone');
  });

  it('bounds an oscillation by the range of the three finest values', () => {
    const estimate = gridConvergence([1, 1.1, 1.05, 1.07], options);
    expect(estimate.kind).toBe('oscillatory');
    if (estimate.kind === 'oscillatory') expect(estimate.uncertainty).toBeCloseTo(0.05, 12);
  });

  it('gives no band for growth, unmeasurable changes or too few grids', () => {
    const cases: [number[], RegExp][] = [
      [[1, 1.001, 1.003, 1.007], /do not shrink/],
      [[1, 1, 1, 1], /too small to measure/],
      [[1.2, 1.1, 1.05], /four grids/],
    ];
    for (const [values, reason] of cases) {
      const estimate = gridConvergence(values, options);
      expect(estimate.kind).toBe('unresolved');
      if (estimate.kind === 'unresolved') expect(estimate.reason).toMatch(reason);
    }
  });
});

describe('the error band on measured cone-cylinder families', () => {
  // Mean cone surface pressure over 0.5 to 0.95 of the cone length (over
  // the free-stream pressure) on nj = 20, 40, 80 and 160, and the
  // Taylor-Maccoll value, measured when written
  // (docs/design/0005-solution-verification.md).
  const families: [string, number, number[]][] = [
    ['M 3, 20 deg', 2.79089952842, [2.78351098509, 2.78653016256, 2.78857768215, 2.78967376953]],
    ['M 2, 15 deg', 1.56629307899, [1.56674616602, 1.56616704408, 1.5661418598, 1.56619348995]],
    ['M 1.3, 10 deg', 1.16466347855, [1.16511515578, 1.16473539747, 1.16466553813, 1.16465784725]],
    ['M 1.41, 24 deg', 1.79216769814, [1.73233844783, 1.77139994048, 1.77685553456, 1.78443542194]],
  ];

  it.each(families)(
    '%s: a band is given only where it contains the true error',
    async (_, exact, values) => {
      const result = await refineUntilVerified((r) => values[Math.log2(r)]!, {
        orderTolerance: 0.5,
        noise: 1e-12,
        floor: 2e-4,
        tolerance: Infinity,
        maxRefinement: 8,
      });
      if (result.uncertainty !== undefined) {
        expect(Math.abs(result.estimate.value - exact)).toBeLessThanOrEqual(result.uncertainty);
      }
    },
  );

  it('with 32-bit noise on every value, bands are still given only where they hold', async () => {
    // The GPU engine's values differ from the CPU's by up to 1.1e-6
    // relative; perturb each value by up to that, in many patterns.
    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (const [, exact, values] of families) {
      for (let trial = 0; trial < 50; trial++) {
        const noisy = values.map((v) => v * (1 + 1.1e-6 * (2 * random() - 1)));
        const result = await refineUntilVerified((r) => noisy[Math.log2(r)]!, {
          orderTolerance: 0.5,
          noise: 1e-6,
          floor: 2e-4,
          tolerance: Infinity,
          maxRefinement: 8,
        });
        if (result.uncertainty !== undefined) {
          expect(Math.abs(result.estimate.value - exact)).toBeLessThanOrEqual(result.uncertainty);
        }
      }
    }
  });

  it('gives bands for the two families that converge cleanly, none for the others', async () => {
    const kinds = await Promise.all(
      families.map(
        async ([, , values]) =>
          (
            await refineUntilVerified((r) => values[Math.log2(r)]!, {
              orderTolerance: 0.5,
              noise: 1e-12,
              floor: 2e-4,
              tolerance: Infinity,
              maxRefinement: 8,
            })
          ).estimate.kind,
      ),
    );
    expect(kinds).toEqual(['monotone', 'oscillatory', 'unresolved', 'unresolved']);
  });
});

describe('refining until the value is verified', () => {
  const second = (refinement: number) => 0.3 + 0.04 / refinement ** 2;

  it('stops at the first grid whose error band meets the tolerance', async () => {
    const solved: number[] = [];
    const result = await refineUntilVerified(
      (r) => {
        solved.push(r);
        return second(r);
      },
      { ...options, floor: 0, tolerance: 1e-4, maxRefinement: 64 },
    );
    expect(result.verified).toBe(true);
    // Bands 1.25 |e21| / 3: 7.8e-4 at refinement 8, 2.0e-4 at 16, 4.9e-5 at 32.
    expect(solved).toEqual([1, 2, 4, 8, 16, 32]);
    expect(result.uncertainty).toBeLessThanOrEqual(1e-4);
  });

  it('never verifies on fewer than four grids, however small the changes', async () => {
    const result = await refineUntilVerified(second, {
      ...options,
      floor: 0,
      tolerance: 1,
      maxRefinement: 4,
    });
    expect(result.verified).toBe(false);
    expect(result.levels).toHaveLength(3);
  });

  it('reports an unverified value when the tolerance is out of reach', async () => {
    const result = await refineUntilVerified(second, {
      ...options,
      floor: 0,
      tolerance: 1e-9,
      maxRefinement: 16,
    });
    expect(result.verified).toBe(false);
    expect(result.estimate.kind).toBe('monotone');
  });
});
