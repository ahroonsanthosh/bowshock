import { describe, expect, it } from 'vitest';
import { gaussLegendre, sineSquaredRule } from '../../src/fins/quadrature';

describe('Gauss-Legendre rule', () => {
  it('integrates polynomials of degree 2n - 1 exactly, and not degree 2n', () => {
    for (const n of [1, 2, 5, 12, 24, 48, 128]) {
      const { nodes, weights } = gaussLegendre(n);
      for (const p of [0, 1, 2 * n - 2, 2 * n - 1]) {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += weights[i]! * nodes[i]! ** p;
        const exact = p % 2 === 1 ? 0 : 2 / (p + 1);
        expect(Math.abs(sum - exact)).toBeLessThan(2e-15 * n);
      }
      // Degree 2n is not exact: the error is 2^(2n+1) (n!)^4 / ((2n+1) ((2n)!)^2),
      // 1.8e-7 at n = 12, below round-off from n = 24.
      if (n <= 12) {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += weights[i]! * nodes[i]! ** (2 * n);
        expect(Math.abs(sum - 2 / (2 * n + 1))).toBeGreaterThan(1e-7);
      }
    }
  });

  it('matches nodes and weights computed in 50-digit decimal arithmetic', () => {
    // Newton's method on P_n in Python's decimal module at 50 digits
    // (docs/research/fin-wave-drag/gl_decimal.py), rounded to doubles.
    // numpy's leggauss agrees except its first weight at n = 24, 1.2e-13 off.
    const reference: [number, number, number, number][] = [
      [5, 0, -0.906179845938664, 0.23692688505618908],
      [5, 1, -0.5384693101056831, 0.47862867049936647],
      [24, 0, -0.9951872199970213, 0.0123412297999872],
      [24, 1, -0.9747285559713095, 0.028531388628933663],
      [24, 2, -0.9382745520027328, 0.04427743881741981],
    ];
    for (const [n, i, x, w] of reference) {
      const rule = gaussLegendre(n);
      expect(Math.abs(rule.nodes[i]! - x)).toBeLessThan(2e-16);
      expect(Math.abs(rule.weights[i]! / w - 1)).toBeLessThan(2e-14);
    }
    expect(gaussLegendre(5).nodes[2]).toBe(0);
  });

  it('the sin^2 rule integrates inverse-square-root end singularities', () => {
    // Int_0^1 du / sqrt(u (1 - u)) = pi; the substitution makes it smooth.
    for (const n of [8, 24]) {
      const { nodes, weights } = sineSquaredRule(n);
      let sum = 0;
      for (let i = 0; i < n; i++) sum += weights[i]! / Math.sqrt(nodes[i]! * (1 - nodes[i]!));
      expect(Math.abs(sum - Math.PI)).toBeLessThan(1e-12);
    }
  });
});
