import { describe, expect, it } from 'vitest';
import { gridConvergence, refineUntilVerified } from '../../src/verification/grid-convergence';

const options = { orderTolerance: 0.3 };
/** Values phi(h) on grids of cell size h = 1, 1/2, 1/4, ... (coarsest first). */
const family = (phi: (h: number) => number, grids = 4) =>
  Array.from({ length: grids }, (_, k) => phi(2 ** -k));

describe('grid convergence index (Celik et al., ratio 2)', () => {
  it('recovers the order and the limit of an exactly second-order sequence', () => {
    const estimate = gridConvergence(
      family((h) => 0.3 + 0.04 * h * h),
      options,
    );
    expect(estimate.asymptotic).toBe(true);
    if (!estimate.asymptotic) return;
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
    expect(estimate.asymptotic).toBe(true);
    if (!estimate.asymptotic) return;
    expect(estimate.order).toBeCloseTo(1, 12);
    expect(estimate.uncertainty / Math.abs(estimate.value + 1)).toBeCloseTo(1.25, 10);
  });

  it('caps the order at 2: faster convergence never narrows the band', () => {
    const estimate = gridConvergence(
      family((h) => 2 + 0.5 * h ** 3),
      options,
    );
    expect(estimate.asymptotic).toBe(true);
    if (!estimate.asymptotic) return;
    expect(estimate.order).toBeCloseTo(3, 12);
    // With p = 2 the band exceeds the true error by more than 1.25.
    expect(estimate.uncertainty).toBeGreaterThan(1.25 * Math.abs(estimate.value - 2));
  });

  it('refuses a band when the coarse grid is not in the asymptotic range', () => {
    // First order on fine grids, dominated by a fourth-order part on coarse
    // ones: the two triples disagree on the order (3.9 and 3.3).
    const phi = (h: number) => 1 + 0.1 * h + 5 * h ** 4;
    const estimate = gridConvergence(family(phi), options);
    expect(estimate.asymptotic).toBe(false);
    if (estimate.asymptotic) return;
    expect(estimate.reason).toMatch(/orders of the two finest triples differ/);
    // With more grids the same sequence becomes asymptotic.
    const longer = gridConvergence(family(phi, 9), options);
    expect(longer.asymptotic).toBe(true);
  });

  it('gives no band for oscillation, growth, unmeasurable changes or too few grids', () => {
    const cases: [number[], RegExp][] = [
      [[1, 1.1, 1.05, 1.07], /oscillate/],
      [[1, 1.001, 1.003, 1.007], /do not shrink/],
      [[1, 1, 1, 1], /too small to measure/],
      [[1.2, 1.1, 1.05], /four grids/],
    ];
    for (const [values, reason] of cases) {
      const estimate = gridConvergence(values, options);
      expect(estimate.asymptotic).toBe(false);
      if (!estimate.asymptotic) expect(estimate.reason).toMatch(reason);
    }
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
      { ...options, tolerance: 1e-4, maxRefinement: 64 },
    );
    expect(result.verified).toBe(true);
    // Bands 1.25 |e21| / 3: 7.8e-4 at refinement 8, 2.0e-4 at 16, 4.9e-5 at 32.
    expect(solved).toEqual([1, 2, 4, 8, 16, 32]);
    if (result.estimate.asymptotic) expect(result.estimate.uncertainty).toBeLessThanOrEqual(1e-4);
  });

  it('never verifies on fewer than four grids, however small the changes', async () => {
    const result = await refineUntilVerified(second, {
      ...options,
      tolerance: 1,
      maxRefinement: 4,
    });
    expect(result.verified).toBe(false);
    expect(result.levels).toHaveLength(3);
  });

  it('reports an unverified value when the tolerance is out of reach', async () => {
    const result = await refineUntilVerified(second, {
      ...options,
      tolerance: 1e-9,
      maxRefinement: 16,
    });
    expect(result.verified).toBe(false);
    expect(result.estimate.asymptotic).toBe(true);
  });
});
