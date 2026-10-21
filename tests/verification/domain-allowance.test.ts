import { describe, expect, it } from 'vitest';
import { DECAY_LIMIT, domainAllowance } from '../../src/verification/domain-allowance';

describe('domain allowance (design record 0013, "The allowance rule")', () => {
  it('a geometric decay: the remainder beyond the family domain, |c2| / (1 - rho)', () => {
    // Changes 4e-4, then 2e-4, then 1e-4, ...: the remainder beyond the
    // family's domain is 2e-4 + 1e-4 + ... = 4e-4.
    const a = domainAllowance([1, 1 + 4e-4, 1 + 6e-4], 1e-5, 1e-7);
    expect(a.kind).toBe('decaying');
    if (a.kind === 'refused') return;
    expect(a.allowance).toBeCloseTo(4e-4, 15);
    expect(a.changes[0]).toBeCloseTo(4e-4, 15);
    expect(a.changes[1]).toBeCloseTo(2e-4, 15);
  });

  it('a power law in the distance is bounded where its changes fall by DECAY_LIMIT or less', () => {
    // C(D) = 1 - D^-q on 55.1, 100.6, 224.2 (the page's domains): the
    // remainder at 100.6 is 100.6^-q, which the allowance must contain.
    for (const q of [0.8, 1, 1.35, 2]) {
      const C = (D: number) => 1 - D ** -q;
      const a = domainAllowance([C(55.1), C(100.6), C(224.2)], 0, 1e-12);
      const rho = (C(224.2) - C(100.6)) / (C(100.6) - C(55.1));
      if (rho > DECAY_LIMIT) {
        expect(a.kind).toBe('refused');
        continue;
      }
      expect(a.kind).toBe('decaying');
      if (a.kind === 'refused') continue;
      expect(a.allowance).toBeGreaterThanOrEqual(100.6 ** -q);
    }
  });

  it('negligible changes: below a quarter of the band, or below the noise; the larger one counts', () => {
    const quarter = domainAllowance([1, 1 + 2e-6, 1 - 1e-6], 2e-5, 1e-9);
    expect(quarter.kind).toBe('negligible');
    if (quarter.kind !== 'refused') expect(quarter.allowance).toBeCloseTo(3e-6, 15);
    const noise = domainAllowance([1, 1 + 5e-7, 1 - 5e-7], 0, 1e-7);
    expect(noise.kind).toBe('negligible');
  });

  it('refused: changes that do not fall, or change sign, above the band and the noise', () => {
    // The 5-caliber ogive at Mach 1.05 on regridded domains (for
    // orientation): -1.22e-4, then -1.07e-4.
    const slow = domainAllowance([0.041951, 0.0418288, 0.0417219], 7e-5, 2e-6);
    expect(slow.kind).toBe('refused');
    if (slow.kind === 'refused') expect(slow.reason).toMatch(/does not fall/);
    const flip = domainAllowance([1, 1 + 1e-4, 1 + 5e-5], 1e-5, 1e-9);
    expect(flip.kind).toBe('refused');
  });
});
