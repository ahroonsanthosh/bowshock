import { describe, expect, it } from 'vitest';
import {
  SETTLE_NOISE,
  TRANSONIC_DRAG_FLOOR,
  transonicNoseTerm,
  verifiedTransonicDrag,
  type TransonicEngine,
} from '../../src/analysis/transonic-drag';
import { noseComponentOf } from '../../src/app/total-drag';
import type { TransonicProblem } from '../../src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};
const ogive: Body = {
  nose: { shape: { kind: 'ogive', parameter: 1 }, length: 10, baseRadius: 1 },
  cylinderLength: 0,
};

interface Synthetic {
  /** The converged drag of a grid, from its refinement and its nested domain. */
  readonly converged: (refinement: number, far?: number, cylinder?: number) => number;
  /** Rate per step of the iteration's convergence to it. */
  readonly rate?: number;
  /** Amplitude of a wander that never settles, relative. */
  readonly wander?: number;
}

/**
 * An engine whose drag converges geometrically, from 1% off, to a
 * prescribed value per grid, with an optional wander: for testing the
 * driver's logic without solving anything.
 */
function synthetic(s: Synthetic): TransonicEngine {
  return (problem: TransonicProblem) => {
    const { refinement, nested } = problem.options;
    const target = s.converged(refinement, nested?.farField, nested?.cylinder);
    let steps = 0;
    return Promise.resolve({
      start: () => Promise.resolve(),
      iterate: (n) => {
        steps += n;
        return Promise.resolve();
      },
      drag: () => {
        const rate = s.rate ?? 0.99;
        const wander = (s.wander ?? 0) * Math.sin(steps / 37);
        return Promise.resolve(target * (1 + 0.01 * rate ** steps + wander));
      },
      cells: () => Promise.resolve(() => problem.freeStream.state),
      destroy: () => undefined,
    });
  };
}

const options = { mach: 1.1, gamma: 1.4, finest: 8, checkEvery: 20 } as const;

describe('verifiedTransonicDrag (design record 0013, "What a page solve does")', () => {
  it('a monotone family: the band is the procedure’s, the floor and both allowances', async () => {
    // Second order towards 0.1, the far boundaries' effect falling by 0.3
    // per step outward, the cylinder's negligible.
    const exact = 0.1;
    const farEffect = (far = 100) => (far === 50 ? -4e-5 : far === 200 ? 3.6e-6 : 0);
    const result = await verifiedTransonicDrag(
      ogive,
      options,
      synthetic({
        converged: (r, far, cylinder) =>
          exact + 4e-4 / r ** 2 + farEffect(far) + (cylinder === undefined ? 0 : 1e-9),
      }),
    );
    expect(result.kind).toBe('solved');
    if (result.kind !== 'solved') return;
    expect(result.estimate.kind).toBe('monotone');
    expect(result.levels.map((l) => l.refinement)).toEqual([1, 2, 4, 8]);
    // GCI on the finest triple at order 2: 1.25 |e21| / 3.
    const e21 = 4e-4 / 16 - 4e-4 / 64;
    // Within the iteration's remaining change (settled to 1e-7 of the drag).
    expect(Math.abs(result.parts.grids / ((1.25 * e21) / 3) - 1)).toBeLessThan(1e-3);
    expect(result.parts.floor).toBeCloseTo(TRANSONIC_DRAG_FLOOR * result.value, 15);
    // c1 = +4e-5, c2 = +3.6e-6: rho = 0.09, allowance 3.6e-6 / 0.91.
    expect(Math.abs(result.parts.farField / (3.6e-6 / (1 - 0.09)) - 1)).toBeLessThan(1e-2);
    expect(result.parts.cylinder).toBeLessThan(1e-8);
    expect(result.band).toBeCloseTo(
      result.parts.grids + result.parts.floor + result.parts.farField + result.parts.cylinder,
      15,
    );
    expect(result.noise).toBeGreaterThanOrEqual(SETTLE_NOISE);
    expect(result.reference.exact).toBe(false);
    expect(result.label).toMatch(/no exact reference/);
  });

  it('the nose term for the total: the band as a half-width, as the fitted solver gives it', async () => {
    const result = await verifiedTransonicDrag(
      ogive,
      options,
      synthetic({ converged: (r) => 0.04 + 1e-4 / r ** 2 }),
    );
    expect(result.kind).toBe('solved');
    if (result.kind !== 'solved') return;
    const term = transonicNoseTerm(result);
    expect(term).toEqual({
      kind: 'solved',
      solve: { value: result.value, uncertainty: result.band, grids: 4 },
    });
    if (term?.kind !== 'solved') return;
    const component = noseComponentOf(term.solve);
    expect(component.low).toBeCloseTo(result.value - result.band, 15);
    expect(component.high).toBeCloseTo(result.value + result.band, 15);
    expect(transonicNoseTerm({ kind: 'cancelled', levels: [] })).toBeNull();
    expect(
      transonicNoseTerm({ kind: 'refused', reason: 'mach-1', message: 'not yet', levels: [] }),
    ).toEqual({ kind: 'refused', message: 'the nose wave drag has no band: not yet' });
  });

  it('reports progress by grid and, for the allowances, by which one and which domain', async () => {
    const seen = new Set<string>();
    await verifiedTransonicDrag(
      ogive,
      {
        ...options,
        onProgress: (p) => {
          seen.add(
            p.what === 'grid'
              ? `grid ${p.refinement}`
              : `${p.allowance} ${p.domain} ${p.size} r${p.refinement}`,
          );
        },
      },
      synthetic({ converged: (r) => 0.04 + 1e-4 / r ** 2 }),
    );
    expect([...seen].sort()).toEqual([
      'cylinder 0 5 r1',
      'cylinder 2 20 r1',
      'farField 0 50 r1',
      'farField 2 200 r1',
      'grid 1',
      'grid 2',
      'grid 4',
      'grid 8',
    ]);
  });

  it('a cone whose conical flow is supersonic carries the exact-solution note', async () => {
    const result = await verifiedTransonicDrag(
      cone,
      options,
      synthetic({ converged: (r) => 0.0945 + 1e-4 / r ** 2 }),
    );
    expect(result.kind).toBe('solved');
    if (result.kind === 'solved') {
      expect(result.reference.exact).toBe(true);
      expect(result.label).toMatch(/Taylor-Maccoll/);
    }
  });

  it('the coarser triple oscillating, the finer monotone: refused, with r = 16 offered', async () => {
    // The cone at Mach 1.1 on r = 1 to 8 (0013): -3.9e-6, +1.77e-5, +9.1e-6.
    const drags = [0.0944683, 0.0944644, 0.0944821, 0.0944913];
    const result = await verifiedTransonicDrag(
      cone,
      options,
      synthetic({
        converged: (r, far, cylinder) =>
          (far ?? cylinder) === undefined ? drags[Math.log2(r)]! : drags[0]!,
      }),
    );
    expect(result.kind).toBe('refused');
    if (result.kind === 'refused') {
      expect(result.reason).toBe('no-band');
      expect(result.message).toMatch(/oscillate/);
      expect(result.finer?.refinement).toBe(16);
    }
  });

  it('far boundaries whose effect does not fall: refused with both changes', async () => {
    const result = await verifiedTransonicDrag(
      ogive,
      options,
      synthetic({
        converged: (r, far) =>
          0.04 + 1e-4 / r ** 2 + (far === 50 ? 1.2e-4 : far === 200 ? -1.1e-4 : 0),
      }),
    );
    expect(result.kind).toBe('refused');
    if (result.kind === 'refused') {
      expect(result.reason).toBe('far-field');
      expect(result.message).toMatch(/far boundaries.*does not fall/);
    }
  });

  it('a wander measured on the grids widens the noise, so changes below it cannot be measured', async () => {
    const result = await verifiedTransonicDrag(
      ogive,
      options,
      synthetic({ converged: (r) => 0.1 + 1e-6 / r ** 2, wander: 1e-5, rate: 0.9 }),
    );
    // Changes of 7.5e-7 and less against a measured wander of 1e-5: no band.
    expect(result.kind).not.toBe('solved');
  });

  it('a grid that does not settle: not converged, with its code and the grids solved before it', async () => {
    // The base grid settles; r = 2 never does (a drag that keeps drifting).
    const engine: TransonicEngine = (problem) => {
      let steps = 0;
      const drifting = problem.options.refinement > 1;
      return Promise.resolve({
        start: () => Promise.resolve(),
        iterate: (n) => {
          steps += n;
          return Promise.resolve();
        },
        drag: () =>
          Promise.resolve(drifting ? 0.1 + 1e-6 * steps : 0.1 * (1 + 0.01 * 0.9 ** steps)),
        cells: () => Promise.resolve(() => problem.freeStream.state),
        destroy: () => undefined,
      });
    };
    const result = await verifiedTransonicDrag(ogive, { ...options, maxSteps: 2000 }, engine);
    expect(result.kind).toBe('not-converged');
    if (result.kind === 'not-converged') {
      expect(result.reason).toBe('not-settled');
      expect(result.refinement).toBe(2);
      expect(result.levels.map((l) => l.refinement)).toEqual([1]);
    }
  });

  it('Mach 1.0 is refused unless allowed, and blunt noses are refused', async () => {
    const engine = synthetic({ converged: () => 0.09 });
    const m1 = await verifiedTransonicDrag(cone, { ...options, mach: 1 }, engine);
    expect(m1.kind).toBe('refused');
    if (m1.kind === 'refused') {
      expect(m1.reason).toBe('mach-1');
      expect(m1.message).toMatch(/Mach 1/);
    }
    const blunt: Body = {
      nose: { shape: { kind: 'ellipsoid' }, length: 2, baseRadius: 1 },
      cylinderLength: 0,
    };
    const b = await verifiedTransonicDrag(blunt, options, engine);
    expect(b.kind).toBe('refused');
    if (b.kind === 'refused') expect(b.reason).toBe('blunt-nose');
    await expect(verifiedTransonicDrag(cone, { ...options, mach: 1.3 }, engine)).rejects.toThrow(
      /Mach 1 to 1.2/,
    );
  });
});
