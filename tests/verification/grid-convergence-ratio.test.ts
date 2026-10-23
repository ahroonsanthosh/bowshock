/**
 * The grid convergence procedure at a refinement ratio of 1.5 (docs/design/0021-3d-euler-fins.md 4.6): the
 * same rule as at 2, the ratio in the observed order, the extrapolation and the index.
 */

import { describe, expect, it } from 'vitest';
import { gridConvergence } from '../../src/verification/grid-convergence';

describe('gridConvergence at ratio 1.5', () => {
  it('recovers the order and the exact value of a second-order family', () => {
    const exact = 0.25;
    const h = [1, 1 / 1.5, 1 / 2.25, 1 / 3.375];
    const values = h.map((x) => exact + 0.01 * x * x);
    const e = gridConvergence(values, { orderTolerance: 0.5, noise: 1e-12, ratio: 1.5 });
    expect(e.kind).toBe('monotone');
    if (e.kind !== 'monotone') return;
    expect(e.order).toBeCloseTo(2, 10);
    expect(e.extrapolated).toBeCloseTo(exact, 12);
    // The band: 1.25 |e21| / (1.5^2 - 1).
    expect(e.uncertainty).toBeCloseTo((1.25 * Math.abs(values[2]! - values[3]!)) / 1.25, 12);
  });

  it('reads a first-order family at ratio 1.5 as first order, which at ratio 2 it would not be', () => {
    const h = [1, 1 / 1.5, 1 / 2.25, 1 / 3.375];
    const values = h.map((x) => 1 + 0.02 * x);
    const at15 = gridConvergence(values, { orderTolerance: 0.5, noise: 1e-12, ratio: 1.5 });
    const at2 = gridConvergence(values, { orderTolerance: 0.5, noise: 1e-12 });
    expect(at15.kind === 'monotone' && Math.abs(at15.order - 1) < 1e-9).toBe(true);
    expect(
      at2.kind === 'monotone' && Math.abs(at2.order - Math.log(1.5) / Math.log(2)) < 1e-9,
    ).toBe(true);
  });
});
