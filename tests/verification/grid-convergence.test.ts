import { describe, expect, it } from 'vitest';
import {
  DRAG_FLOOR,
  FITTED_DRAG_FLOOR,
  GPU_NOISE,
  ORDER_TOLERANCE,
} from '../../src/analysis/verified-drag';
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

  it('the scale option: the noise acts on the scale given, not on the values', () => {
    // Changes of 1e-8 on values near 1e-4 are measurable on the values
    // (10 x 1e-7 x 1e-4) but not on a scale of 0.01 (10 x 1e-7 x 0.01).
    const tiny = [1e-4 + 1.6e-8, 1e-4 + 8e-9, 1e-4 + 4e-9, 1e-4 + 2e-9];
    expect(gridConvergence(tiny, { noise: 1e-7, orderTolerance: 0.5 }).kind).toBe('monotone');
    expect(gridConvergence(tiny, { noise: 1e-7, orderTolerance: 0.5, scale: 0.01 }).kind).toBe(
      'unresolved',
    );
    expect(() => gridConvergence(tiny, { noise: 1e-7, orderTolerance: 0.5, scale: -1 })).toThrow(
      /scale/,
    );
  });

  it('bounds an oscillation by the range of the three finest values', () => {
    const estimate = gridConvergence([1, 1.1, 1.05, 1.07], options);
    expect(estimate.kind).toBe('oscillatory');
    if (estimate.kind === 'oscillatory') expect(estimate.uncertainty).toBeCloseTo(0.05, 12);
  });

  it('bounds a finest change below the noise by the order of the coarser grids', () => {
    // Second order, with the finest change (4.7e-6) under ten times the
    // noise (1e-5) and the coarser changes above it.
    const noise = 1e-6;
    const exact = family((h) => 1 + 1e-4 * h * h);
    const estimate = gridConvergence(exact, { orderTolerance: 0.3, noise });
    expect(estimate.kind).toBe('monotone');
    if (estimate.kind !== 'monotone') return;
    expect(estimate.order).toBeCloseTo(2, 6);
    // (4.7e-6 + 2e-6) * 1.25 / 3, against a true error of 1.6e-6.
    expect(estimate.uncertainty).toBeCloseTo(
      (1.25 * (1e-4 * (0.25 ** 2 - 0.125 ** 2) + 2e-6)) / 3,
      9,
    );
    // With every value perturbed by up to the noise, a band is still given
    // and still holds.
    let seed = 3;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let trial = 0; trial < 200; trial++) {
      const noisy = exact.map((v) => v * (1 + noise * (2 * random() - 1)));
      const result = gridConvergence(noisy, { orderTolerance: 0.3, noise });
      expect(result.kind).toBe('monotone');
      if (result.kind === 'monotone') {
        expect(Math.abs(result.value - 1)).toBeLessThanOrEqual(result.uncertainty);
      }
    }
  });

  it('gives no band when the finest change is below the noise but the coarser grids predict more', () => {
    // Second order on the coarser grids, predicting a finest change of
    // 2.5e-5, above what the noise hides; the values stop changing instead.
    const estimate = gridConvergence([1.0005, 1.0001, 1, 1], { orderTolerance: 0.3, noise: 1e-6 });
    expect(estimate.kind).toBe('unresolved');
    if (estimate.kind === 'unresolved') {
      expect(estimate.reason).toMatch(/below the noise but not the one the coarser grids predict/);
    }
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

  it('a finer grid that cannot be solved leaves the result of the grids before it, where allowed', async () => {
    // Second-order values; the grid of refinement 8 fails.
    const values = [1.04, 1.01, 1.0025];
    const solveAt = (r: number) => {
      if (r === 8) throw new RangeError('too large for this GPU');
      return values[Math.log2(r)]!;
    };
    const options = { orderTolerance: 0.5, noise: 1e-12, floor: 0, tolerance: 0, maxRefinement: 8 };
    const coarser = await refineUntilVerified(solveAt, { ...options, maxRefinement: 4 });
    const stopped = await refineUntilVerified(solveAt, {
      ...options,
      stopOn: (error) => (error instanceof RangeError ? error.message : undefined),
    });
    expect(stopped.stopped).toEqual({ refinement: 8, reason: 'too large for this GPU' });
    expect(stopped.levels).toEqual(coarser.levels);
    expect(stopped.uncertainty).toBe(coarser.uncertainty);
    // Without a reason to stop, or on the first grid, the failure stands.
    await expect(refineUntilVerified(solveAt, options)).rejects.toThrow('too large');
    await expect(
      refineUntilVerified(
        () => {
          throw new RangeError('refused');
        },
        { ...options, stopOn: () => 'any' },
      ),
    ).rejects.toThrow('refused');
  });

  it('with 32-bit noise on every value, bands are still given only where they hold', async () => {
    // The GPU engine's values differ from the CPU's by up to about 1.3e-6
    // relative (Mach 5); perturb each value by up to 2e-6, the noise the
    // GPU pipeline assumes, in many patterns.
    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (const [, exact, values] of families) {
      for (let trial = 0; trial < 50; trial++) {
        const noisy = values.map((v) => v * (1 + GPU_NOISE * (2 * random() - 1)));
        const result = await refineUntilVerified((r) => noisy[Math.log2(r)]!, {
          orderTolerance: 0.5,
          noise: GPU_NOISE,
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

describe('the error band on measured forebody drag families', () => {
  // Forebody pressure drag coefficient on nj = 20, 40, 80 and 160 (CPU,
  // unit-invariant shared reconstruction) and the exact value, measured
  // when written (docs/design/0005-solution-verification.md), and whether
  // 0005 records a band: on the cones, not on the ogive (orders 2.38 and
  // 3.58).
  const families: [string, number, number[], boolean][] = [
    // Taylor-Maccoll: on a cone-cylinder the forebody drag is the cone's Cp.
    [
      'M 2, 15 deg cone',
      0.202247528211,
      [0.202624275335, 0.202253760075, 0.202200780129, 0.202210320794],
      true,
    ],
    [
      'M 3, 20 deg cone',
      0.284269766415,
      [0.283146976102, 0.283533123407, 0.283840108049, 0.284038574914],
      true,
    ],
    // Method of characteristics (src/validation/characteristics.ts).
    [
      'M 1.98, TN 3716 ogive',
      0.098803,
      [0.0999981153572, 0.0989748823391, 0.0987781854786, 0.0987617126849],
      false,
    ],
  ];

  it.each(families)(
    '%s: a band where 0005 records one, and with the floor it contains the true error',
    async (_, exact, values, banded) => {
      for (const noise of [1e-12, GPU_NOISE]) {
        const result = await refineUntilVerified((r) => values[Math.log2(r)]!, {
          orderTolerance: ORDER_TOLERANCE,
          noise,
          floor: DRAG_FLOOR,
          tolerance: Infinity,
          maxRefinement: 8,
        });
        expect(result.uncertainty !== undefined, `band at noise ${noise}`).toBe(banded);
        if (result.uncertainty !== undefined) {
          expect(Math.abs(result.estimate.value - exact)).toBeLessThanOrEqual(result.uncertainty);
        }
      }
    },
  );

  it('with the GPU noise on every value, bands with the floor still contain the true error', async () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (const [name, exact, values, banded] of families) {
      // Measured when written: every trial of the cones given a band, none
      // of the ogive.
      let given = 0;
      for (let trial = 0; trial < 50; trial++) {
        const noisy = values.map((v) => v * (1 + GPU_NOISE * (2 * random() - 1)));
        const result = await refineUntilVerified((r) => noisy[Math.log2(r)]!, {
          orderTolerance: ORDER_TOLERANCE,
          noise: GPU_NOISE,
          floor: DRAG_FLOOR,
          tolerance: Infinity,
          maxRefinement: 8,
        });
        if (result.uncertainty !== undefined) {
          given++;
          expect(Math.abs(result.estimate.value - exact)).toBeLessThanOrEqual(result.uncertainty);
        }
      }
      expect(given, name).toBe(banded ? 50 : 0);
    }
  });
});

describe('the error band on a measured fitted-shock drag family', () => {
  // Forebody drag of a 5 deg cone-cylinder at Mach 1.3 with the bow shock
  // fitted, nj = 20 to 160 (CPU), and the Taylor-Maccoll value, measured
  // when written (docs/design/0006-shock-fitting.md): the one fitted
  // family on four grids, whose coarse triple had not settled.
  const exact = 0.0438339392;
  const values = [
    0.044070549346629566, 0.04388242259870105, 0.043846510789887654, 0.04383737369708205,
  ];
  const verify = (vs: readonly number[]) =>
    refineUntilVerified((r) => vs[Math.log2(r)]!, {
      orderTolerance: ORDER_TOLERANCE,
      noise: GPU_NOISE,
      floor: FITTED_DRAG_FLOOR,
      tolerance: Infinity,
      maxRefinement: 8,
    });

  it('gives a band, with the floor, that contains the true error', async () => {
    const result = await verify(values);
    expect(result.estimate.kind).toBe('monotone');
    expect(result.uncertainty).toBeDefined();
    // Measured when written: band 7.0e-6 against an error of 3.4e-6.
    expect(Math.abs(result.estimate.value - exact)).toBeLessThanOrEqual(result.uncertainty!);
  });

  it('with the GPU noise on every value, every band given still contains it', async () => {
    let seed = 13;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    // Measured when written: all 200 given a band.
    let given = 0;
    for (let trial = 0; trial < 200; trial++) {
      const noisy = values.map((v) => v * (1 + GPU_NOISE * (2 * random() - 1)));
      const result = await verify(noisy);
      if (result.uncertainty !== undefined) {
        given++;
        expect(Math.abs(result.estimate.value - exact)).toBeLessThanOrEqual(result.uncertainty);
      }
    }
    expect(given).toBe(200);
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
