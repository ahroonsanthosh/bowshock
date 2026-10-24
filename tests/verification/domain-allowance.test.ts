import { describe, expect, it } from 'vitest';
import {
  DECAY_LIMIT,
  domainAllowance,
  powerLawRatio,
  Q_FAST,
  ratiosNotShrinking,
  Q_SLOW,
  tailFactor,
} from '../../src/verification/domain-allowance';

/** The nested domains' own far radii (base radius 1): 55.1, 100.6, 224.2 and 408.7. */
const D = [55.10160405104679, 100.60719837318378, 224.2118229126046, 408.7461074989818] as const;
const family100 = [D[0], D[1], D[2]] as const;
const family224 = [D[1], D[2], D[3]] as const;

describe('domain allowance (design record 0013, "The allowance rule corrected for sign reversal")', () => {
  it('its constants: T and rho_fast over the page’s distances', () => {
    expect(Q_SLOW).toBe(0.35);
    expect(Q_FAST).toBe(3);
    expect(tailFactor(D[1], D[2])).toBeCloseTo(3.0887, 4);
    expect(tailFactor(D[2], D[3])).toBeCloseTo(4.2754, 4);
    expect(tailFactor(10, 20)).toBeCloseTo(3.6422, 4);
    expect(powerLawRatio(D[0], D[1], D[2])).toBeCloseTo(0.1788, 4);
    expect(powerLawRatio(D[1], D[2], D[3])).toBeCloseTo(0.0829, 4);
    expect(powerLawRatio(5, 10, 20)).toBeCloseTo(0.125, 12);
  });

  it('a geometric decay: the remainder beyond the family domain, |b| / (1 - rho), plus m', () => {
    // Changes 4e-4, then 2e-4, then 1e-4, ...: the remainder beyond the
    // family's domain is 2e-4 + 1e-4 + ... = 4e-4.
    const a = domainAllowance([1, 1 + 4e-4, 1 + 6e-4], family100, 1e-7);
    expect(a.kind).toBe('decaying');
    if (a.kind === 'refused') return;
    expect(a.measurability).toBeCloseTo(2 * 1e-7 * (1 + 6e-4), 18);
    expect(a.allowance).toBeCloseTo(4e-4 + a.measurability, 15);
    expect(a.changes[0]).toBeCloseTo(4e-4, 15);
    expect(a.changes[1]).toBeCloseTo(2e-4, 15);
  });

  it('a power law in the distance is bounded where its changes fall by DECAY_LIMIT or less', () => {
    // C(D) = 1 - D^-q on 55.1, 100.6, 224.2: the remainder at 100.6 is
    // 100.6^-q, which the allowance must contain.
    for (const q of [0.8, 1, 1.35, 2, 2.5, 4]) {
      const C = (d: number) => 1 - d ** -q;
      const a = domainAllowance([C(D[0]), C(D[1]), C(D[2])], family100, 1e-12);
      const rho = (C(D[2]) - C(D[1])) / (C(D[1]) - C(D[0]));
      if (rho > DECAY_LIMIT) {
        expect(a.kind, `q ${q}`).toBe('refused');
        continue;
      }
      expect(a.kind, `q ${q}`).toBe(q > Q_FAST ? 'turning' : 'decaying');
      if (a.kind === 'refused') continue;
      expect(a.allowance, `q ${q}`).toBeGreaterThanOrEqual(D[1] ** -q);
    }
  });

  it('the served long noses: a decaying case on shrinking ratios now takes the turning bound (wider, the safe way)', () => {
    // A 5.5-caliber nose's served family (55.1, 122.9, 224.2 radii): a =
    // 1e-3, b = 4e-4 (rho 0.4) was 'decaying', 4e-4 / 0.6 = 6.7e-4; it is
    // now 'turning', |b| + T |a| = 4e-4 + 4.27e-3 = 4.7e-3. Every served
    // nose longer than 5 calibers is affected the same way: wider bands.
    const long = [55.1, 122.94, 224.21] as const;
    expect(ratiosNotShrinking(...long)).toBe(false);
    const a = domainAllowance([0.05, 0.051, 0.0514], long, 1e-9);
    expect(a.kind).toBe('turning');
    if (a.kind === 'refused') return;
    expect(a.allowance - a.measurability).toBeCloseTo(
      4e-4 + tailFactor(long[1], long[2]) * 1e-3,
      9,
    );
    expect(a.allowance).toBeGreaterThan(4.6e-3);
    expect(a.allowance).toBeLessThan(4.8e-3);
  });

  it('the scale: m = 2 nu scale, so a near-zero drag with noise on S is not refused for its noise', () => {
    // Pure noise about a drag near 1e-4, nu = 1e-7 on S = 0.01: the three
    // values differ by 1e-9, which is below m = 2e-9 only on the scale S.
    const values = [1e-4, 1e-4 + 1e-9, 1e-4 - 5e-10] as const;
    const onValue = domainAllowance(values, family224, 1e-7);
    const onScale = domainAllowance(values, family224, 1e-7, 0.01);
    expect(onValue.kind).not.toBe('unmeasurable');
    expect(onScale.kind).toBe('unmeasurable');
    expect(onScale.measurability).toBeCloseTo(2e-9, 15);
    expect(() => domainAllowance(values, family224, 1e-7, -1)).toThrow(/scale/);
  });

  it('changes below the measurability level: the turning bound, never below m', () => {
    const noise = 1e-6;
    const values = [0.1, 0.1 + 1e-7, 0.1 - 5e-8] as const;
    const a = domainAllowance(values, family100, noise);
    expect(a.kind).toBe('unmeasurable');
    if (a.kind === 'refused') return;
    const m = 2 * noise * 0.1000001;
    expect(a.measurability).toBeCloseTo(m, 15);
    expect(a.allowance).toBeCloseTo(1.5e-7 + tailFactor(D[1], D[2]) * 1.5e-7 + m, 15);
    expect(a.allowance).toBeGreaterThanOrEqual(m);
  });

  it('more noise never narrows an allowance (review S3 (b))', () => {
    const cases: (readonly [number, number, number])[] = [
      [0.1, 0.1 + 4e-6, 0.1 + 6e-6],
      [0.1, 0.1 + 6.4e-6, 0.1 + 6.28e-6],
      [1, 1 + 1e-7, 1 + 1.5e-7],
    ];
    for (const values of cases) {
      let last = 0;
      for (const noise of [1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4]) {
        const a = domainAllowance(values, family100, noise);
        if (a.kind === 'refused') continue;
        expect(a.allowance).toBeGreaterThanOrEqual(last);
        last = a.allowance;
      }
    }
  });

  it('refused: changes that do not fall, whatever their signs', () => {
    // The 5-caliber ogive at Mach 1.05 on regridded domains (for
    // orientation): -1.22e-4, then -1.07e-4.
    const slow = domainAllowance([0.041951, 0.0418288, 0.0417219], family100, 2e-6);
    expect(slow.kind).toBe('refused');
    if (slow.kind === 'refused') expect(slow.reason).toMatch(/does not fall/);
    const flip = domainAllowance([1, 1 + 1e-4, 1 + 3e-5], family100, 1e-9);
    expect(flip.kind).toBe('refused');
    const fromNothing = domainAllowance([1, 1, 1 + 1e-4], family100, 1e-9);
    expect(fromNothing.kind).toBe('refused');
  });

  it('the reviewer’s synthetic A1: a tiny b after a large a is the effect turning, not decaying', () => {
    // c1 = +1.5e-3, c2 = +2e-6, and the effect reverses beyond 224.2 radii:
    // the true remainder at 100.6 radii is -6e-5.
    const own = 0.105;
    const a = domainAllowance([own - 1.5e-3, own, own + 2e-6], family100, 1e-7);
    expect(a.kind).toBe('turning');
    if (a.kind === 'refused') return;
    expect(a.allowance).toBeGreaterThanOrEqual(6e-5);
    expect(a.allowance).toBeCloseTo(2e-6 + tailFactor(D[1], D[2]) * 1.5e-3 + a.measurability, 12);
  });

  // The nested base-grid runs of the cone (and, at Mach 1.0, the 5-caliber
  // ogive) on 55.1, 100.6, 224.2 and 408.7 radii (0013, "Build progress";
  // the reviewer's runs at 1.017 and 1.019). The noise is set so that
  // nu max|C| = 3.5e-6, as the rule's test sets it.
  const nested: Record<string, readonly [number, number, number, number]> = {
    'cone 1.0': [0.0897884889365743, 0.09171531708471234, 0.09292826439834694, 0.09328843962216965],
    'ogive 1.0': [
      0.015531346369411083, 0.01717069015991946, 0.018406814640679985, 0.01886773676334449,
    ],
    'cone 1.01': [
      0.09975348457485804, 0.10261026960618434, 0.10351345309568905, 0.1034732094263092,
    ],
    'cone 1.017': [
      0.10705714504693876, 0.10867885189626623, 0.10861848369816539, 0.10861920667252987,
    ],
    'cone 1.019': [
      0.10848387332398875, 0.10952523377135431, 0.10942235964505104, 0.10942451701124896,
    ],
    'cone 1.02': [0.10903164228339668, 0.109800801244637, 0.10969795361513447, 0.10969998420500345],
  };
  const noiseFor = (v: readonly number[]) => 3.5e-6 / Math.max(...v.map(Math.abs));

  it('the reviewer’s table, family on 100.6 radii: every allowance contains C(408.7) - C(100.6)', () => {
    const expected: Record<string, string> = {
      'cone 1.0': 'refused',
      'ogive 1.0': 'refused',
      'cone 1.01': 'decaying',
      'cone 1.017': 'turning',
      'cone 1.019': 'turning',
      'cone 1.02': 'turning',
    };
    for (const [name, v] of Object.entries(nested)) {
      const three = [v[0], v[1], v[2]] as const;
      const a = domainAllowance(three, family100, noiseFor(three));
      expect(a.kind, name).toBe(expected[name]);
      if (a.kind === 'refused') continue;
      expect(a.allowance, name).toBeGreaterThanOrEqual(Math.abs(v[3] - v[1]));
    }
  });

  it('the family moved to 224.2 radii (decision 7.3): every case turns, Mach 1.0 included', () => {
    // The re-review of dd6c423, item 2, coded for 0014 10.7 (y): on the
    // moved family's ratios (2.23 then 1.82) the geometric remainder is
    // not a bound, so Mach 1.0, which decays (rho 0.30 and 0.37), takes
    // the turning bound |b| + T max(|a|, |b|): 5.55e-3 on the cone (6% of
    // its drag) and 5.75e-3 on the ogive, instead of 5.12e-4 and 7.35e-4.
    expect(ratiosNotShrinking(...family224)).toBe(false);
    expect(ratiosNotShrinking(...family100)).toBe(true);
    expect(ratiosNotShrinking(5, 10, 20)).toBe(true);
    const T = tailFactor(D[2], D[3]);
    const expected: Record<string, [string, number]> = {
      'cone 1.0': ['turning', 3.6018e-4 + T * 1.21295e-3],
      'ogive 1.0': ['turning', 4.6092e-4 + T * 1.23597e-3],
      'cone 1.01': ['turning', 3.902e-3],
      'cone 1.017': ['turning', 2.588e-4],
      'cone 1.019': ['turning', 4.42e-4],
      'cone 1.02': ['turning', 4.418e-4],
    };
    for (const [name, v] of Object.entries(nested)) {
      const three = [v[1], v[2], v[3]] as const;
      const a = domainAllowance(three, family224, noiseFor(three));
      const [kind, allowance] = expected[name]!;
      expect(a.kind, name).toBe(kind);
      if (a.kind === 'refused') continue;
      expect(Math.abs(a.allowance - a.measurability - allowance), name).toBeLessThan(1e-6);
    }
  });

  it('a pure power law on every distance set the driver uses: the allowance is at least the true remainder', () => {
    // The pre-registered test of the re-review's item 2 (0014 10.7 (y)):
    // exponents 0.35 to 3, each allowance at least C(inf) - C(D1). The
    // distance sets are the grids' own (transonicGrid): the cone's served
    // and moved families, the served families of 5.5, 8 and 10 caliber
    // noses (whose far boundary is 10 nose lengths, so their ratios shrink
    // outward too: the revision of (y), finding 1), and the real cylinder
    // distances 5.5251, 10, 21.9986 calibers.
    const sets: readonly (readonly [number, number, number])[] = [
      family100,
      family224,
      [55.1, 122.94, 224.21],
      [82.32, 183.52, 334.61],
      [100.61, 224.21, 408.75],
      [122.94, 224.21, 499.3],
      [183.52, 334.61, 744.99],
      [224.21, 408.75, 909.99],
      [5.5251, 10, 21.9986],
    ];
    for (const distances of sets) {
      for (const q of [0.35, 0.5, 0.8, 1, 1.35, 2, 3]) {
        const C = (d: number) => 1 - d ** -q;
        const [d0, d1, d2] = distances;
        const a = domainAllowance([C(d0), C(d1), C(d2)], distances, 1e-12);
        if (a.kind === 'refused') continue;
        expect(a.allowance, `q ${q} on ${distances.join(', ')}`).toBeGreaterThanOrEqual(d1 ** -q);
      }
    }
  });
});
