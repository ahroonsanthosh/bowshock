import { describe, expect, it } from 'vitest';
import {
  NEAR_SONIC_LIMIT,
  SETTLE_NOISE,
  TRANSONIC_DRAG_FLOOR,
  transonicNoseTerm,
  verifiedTransonicDrag,
  transonicDomains,
  type TransonicEngine,
  type TransonicLevel,
} from '../../src/analysis/transonic-drag';
import { GpuMemoryLimitError } from '../../src/engine-gpu/gpu-common';
import type { FlowSource } from '../../src/render/flow-renderer';
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
      residual: () => Promise.resolve(0.01 * (s.rate ?? 0.99) ** steps + 1e-12 / (1 + steps)),
      cells: () => Promise.resolve(() => problem.freeStream.state),
      destroy: () => undefined,
    });
  };
}

const options = { mach: 1.1, gamma: 1.4, finest: 8, checkEvery: 20 } as const;

describe('verifiedTransonicDrag (design record 0013, "What a page solve does")', () => {
  it('a monotone family: the band is the procedure’s, the floor and both allowances', async () => {
    // Second order towards 0.1, the far boundaries' effect falling by 0.3
    // per step outward, the cylinder's below the measurability level.
    const exact = 0.1;
    const farEffect = (far = 100) => (far === 50 ? -4e-5 : far === 200 ? 1.2e-5 : 0);
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
    // c1 = +4e-5, c2 = +1.2e-5: rho = 0.3, allowance 1.2e-5 / 0.7 plus the
    // measurability level 2 nu max|C|.
    const far = result.allowances.farField.result;
    expect(far.kind).toBe('decaying');
    expect(far.measurability).toBeCloseTo(2 * result.noise * (exact + 4e-4 + 1.2e-5), 12);
    expect(Math.abs(result.parts.farField - far.measurability - 1.2e-5 / 0.7)).toBeLessThan(2e-8);
    // The cylinder's changes (1e-9) are below the measurability level:
    // the turning bound, at least that level.
    const cylinder = result.allowances.cylinder.result;
    expect(cylinder.kind).toBe('unmeasurable');
    expect(result.parts.cylinder).toBeGreaterThanOrEqual(cylinder.measurability);
    expect(result.parts.cylinder).toBeLessThan(1e-7);
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
      transonicNoseTerm({ kind: 'refused', reason: 'near-sonic', message: 'not yet', levels: [] }),
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
      // The expected work: r = 8's steps times their growth from r = 4,
      // and the work of this solve, which a solve to r = 16 repeats.
      const [r4, r8] = result.levels.slice(-2);
      const finer = result.finer!;
      expect(finer.refinement).toBe(16);
      expect(finer.cells).toBe(4 * r8!.cells.ni * r8!.cells.nj);
      expect(finer.steps).toBe(Math.round(r8!.steps * Math.max(1, r8!.steps / r4!.steps)));
      expect(finer.cellUpdates).toBe(finer.steps * finer.cells);
      const family = result.levels.reduce((sum, l) => sum + l.steps * l.cells.ni * l.cells.nj, 0);
      // With the four allowance grids, more than the family alone.
      expect(finer.repeatedCellUpdates).toBeGreaterThan(family);
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
      // Decided on the base grids, before any finer grid is solved.
      expect(result.levels.map((l) => l.refinement)).toEqual([1]);
    }
  });

  it('the reviewer’s A1 through the driver: a tiny change after a large one is bounded as a turn', async () => {
    // c1 = +1.5e-3, c2 = +2e-6, and the true remainder at 100.6 radii -6e-5.
    const own = 0.105;
    const result = await verifiedTransonicDrag(
      cone,
      options,
      synthetic({
        converged: (r, far) =>
          own + 2e-4 / r ** 2 - 2e-4 / 64 + (far === 50 ? -1.5e-3 : far === 200 ? 2e-6 : 0),
      }),
    );
    expect(result.kind).toBe('solved');
    if (result.kind !== 'solved') return;
    expect(result.allowances.farField.result.kind).toBe('turning');
    expect(result.parts.farField).toBeGreaterThanOrEqual(6e-5);
    expect(result.allowances.farField.distances[1]).toBeCloseTo(100.607, 3);
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
        residual: () => Promise.resolve(0.01 * 0.9 ** steps + 1e-12 / (1 + steps)),
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

  it('gives each grid to draw as it starts, and null before releasing it; nothing from the CPU', async () => {
    const events: string[] = [];
    let created = 0;
    const base = synthetic({ converged: (r) => 0.04 + 1e-4 / r ** 2 });
    const drawable: TransonicEngine = async (problem) => {
      const solver = await base(problem);
      const id = created++;
      return {
        ...solver,
        live: () => {
          events.push(`live ${id}`);
          return { ni: id } as unknown as FlowSource;
        },
        destroy: () => {
          events.push(`destroy ${id}`);
          solver.destroy();
        },
      };
    };
    const seen: (number | null)[] = [];
    const onLive = (source: FlowSource | null) => {
      seen.push(source === null ? null : source.ni);
      events.push(source === null ? 'null' : `shown ${source.ni}`);
    };
    const result = await verifiedTransonicDrag(ogive, { ...options, onLive }, drawable);
    expect(result.kind).toBe('solved');
    // Eight grids: the family's four and the allowances' four, each shown
    // once and released after its null.
    expect(created).toBe(8);
    expect(seen).toEqual([0, null, 1, null, 2, null, 3, null, 4, null, 5, null, 6, null, 7, null]);
    expect(events).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 7].flatMap((id) => [
        `live ${id}`,
        `shown ${id}`,
        'null',
        `destroy ${id}`,
      ]),
    );
    // An engine with nothing to draw (the CPU's) gives nothing.
    const none: (FlowSource | null)[] = [];
    await verifiedTransonicDrag(
      ogive,
      { ...options, onLive: (s) => none.push(s) },
      synthetic({ converged: (r) => 0.04 + 1e-4 / r ** 2 }),
    );
    expect(none).toEqual([]);
  });

  it('a slow damped oscillation does not settle at a turning point: the noise covers the iteration error', async () => {
    // The reviewer's A4: period 6,000 steps, decay time 1,800 steps (the
    // nested Mach 1.02 base run's fit), checks every 50.
    const target = (r: number) => 0.1098 + 1e-4 / r;
    const oscillating: TransonicEngine = (problem) => {
      const value = target(problem.options.refinement);
      let steps = 0;
      return Promise.resolve({
        start: () => Promise.resolve(),
        iterate: (n) => {
          steps += n;
          return Promise.resolve();
        },
        drag: () =>
          Promise.resolve(
            value *
              (1 + 0.3 * Math.exp(-steps / 1800) * Math.cos((2 * Math.PI * steps) / 6000 + 0.3)),
          ),
        residual: () => Promise.resolve(Math.exp(-steps / 1800) + 1e-12 / (1 + steps)),
        cells: () => Promise.resolve(() => problem.freeStream.state),
        destroy: () => undefined,
      });
    };
    const levels: TransonicLevel[] = [];
    await verifiedTransonicDrag(
      cone,
      { ...options, checkEvery: 50, onLevel: (l) => levels.push(l) },
      oscillating,
    );
    expect(levels.length).toBe(4);
    for (const level of levels) {
      const error = Math.abs(level.drag / target(level.refinement) - 1);
      expect(error, `r = ${level.refinement}`).toBeLessThanOrEqual(level.noise);
      // Conservative: the geometric remaining change read across a turning
      // point inflates it (3.3e-6 here, measured when written).
      expect(level.noise).toBeLessThan(1e-5);
    }
  });

  it('a solver that stops moving, or whose drag changes grow, does not settle; a growing residual diverges', async () => {
    const stub =
      (drag: (steps: number) => number, residual: (steps: number) => number): TransonicEngine =>
      (problem) => {
        let steps = 0;
        return Promise.resolve({
          start: () => Promise.resolve(),
          iterate: (n) => {
            steps += n;
            return Promise.resolve();
          },
          drag: () => Promise.resolve(drag(steps)),
          residual: () => Promise.resolve(residual(steps)),
          cells: () => Promise.resolve(() => problem.freeStream.state),
          destroy: () => undefined,
        });
      };
    const short = { ...options, maxSteps: 3000 };
    // Frozen from the start: the same drag and the same residual every check.
    const frozen = await verifiedTransonicDrag(
      ogive,
      short,
      stub(
        () => 0.1,
        () => 1e-3,
      ),
    );
    expect(frozen).toMatchObject({ kind: 'not-converged', reason: 'not-settled', refinement: 1 });
    // Changes far below the settling noise, but growing.
    const growing = await verifiedTransonicDrag(
      ogive,
      short,
      stub(
        (n) => 0.1 + 1e-13 * 1.004 ** n,
        (n) => 1e-3 * 0.999 ** n,
      ),
    );
    expect(growing).toMatchObject({ kind: 'not-converged', reason: 'not-settled' });
    const diverging = await verifiedTransonicDrag(
      ogive,
      short,
      stub(
        (n) => 0.1 + 1e-3 * Math.sin(n / 100),
        (n) => 1e-3 * 1.01 ** n,
      ),
    );
    expect(diverging).toMatchObject({ kind: 'not-converged', reason: 'diverging' });
  });

  it('a long nose: the domains scale with its length; the allowances come right after the base grid', async () => {
    // The 10-caliber ogive, 20 radii long: 100 radii would leave the
    // smaller nested domain (50) inside the four nose lengths the grid
    // needs (review of aed95b0, S4, A5).
    const ogive10: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 20, baseRadius: 1 },
      cylinderLength: 0,
    };
    expect(transonicDomains(ogive10).farField).toEqual([100, 200, 400]);
    expect(transonicDomains(ogive).farField).toEqual([50, 100, 200]);
    expect(transonicDomains(cone).farField).toEqual([50, 100, 200]);
    const order: string[] = [];
    const result = await verifiedTransonicDrag(
      ogive10,
      {
        ...options,
        onProgress: (p) => {
          const key =
            p.what === 'grid' ? `grid ${p.refinement}` : `${p.allowance} ${p.domain} ${p.size}`;
          if (order[order.length - 1] !== key) order.push(key);
        },
      },
      synthetic({ converged: (r) => 0.0114 + 1e-5 / r ** 2 }),
    );
    expect(result.kind).toBe('solved');
    expect(order).toEqual([
      'grid 1',
      'farField 0 100',
      'farField 2 400',
      'cylinder 0 5',
      'cylinder 2 20',
      'grid 2',
      'grid 4',
      'grid 8',
    ]);
    if (result.kind === 'solved')
      expect(result.allowances.farField.domains).toEqual([100, 200, 400]);
  });

  it('a device too small is refused before any solve, or when a grid runs out of memory, with the grids before', async () => {
    let created = 0;
    const counting = synthetic({ converged: (r) => 0.04 + 1e-4 / r ** 2 });
    const small: TransonicEngine = Object.assign(
      (problem: TransonicProblem) => {
        created++;
        return counting(problem);
      },
      { refuses: (cells: { ni: number; nj: number }) => (cells.ni > 500 ? 'too large' : null) },
    );
    const before = await verifiedTransonicDrag(ogive, options, small);
    expect(before).toMatchObject({ kind: 'refused', reason: 'device-memory', levels: [] });
    expect(created).toBe(0);
    // Out of memory on creating r = 4: refused, with r = 1 and 2.
    const failing: TransonicEngine = (problem) =>
      problem.options.refinement === 4
        ? Promise.reject(new GpuMemoryLimitError('the GPU ran out of memory'))
        : counting(problem);
    const during = await verifiedTransonicDrag(ogive, options, failing);
    expect(during.kind).toBe('refused');
    if (during.kind === 'refused') {
      expect(during.reason).toBe('device-memory');
      expect(during.levels.map((l) => l.refinement)).toEqual([1, 2]);
    }
  });

  it('r = 16 is offered only where the device can hold it', async () => {
    const drags = [0.0944683, 0.0944644, 0.0944821, 0.0944913];
    const engine = synthetic({
      converged: (r, far, cylinder) =>
        (far ?? cylinder) === undefined ? drags[Math.log2(r)]! : drags[0]!,
    });
    const limited: TransonicEngine = Object.assign(engine, {
      refuses: (cells: { ni: number; nj: number }) => (cells.ni > 1000 ? 'too large' : null),
    });
    const result = await verifiedTransonicDrag(cone, options, limited);
    expect(result).toMatchObject({ kind: 'refused', reason: 'no-band' });
    if (result.kind === 'refused') expect(result.finer).toBeUndefined();
  });

  it('below Mach 1.05 the solve refuses (near-sonic) unless allowed; from 1.05 it serves', async () => {
    expect(NEAR_SONIC_LIMIT).toBe(1.05);
    const engine = synthetic({ converged: (r) => 0.1 + 1e-4 / r ** 2 });
    for (const mach of [1, 1.001, 1.0499]) {
      const result = await verifiedTransonicDrag(cone, { ...options, mach }, engine);
      expect(result.kind, `Mach ${mach}`).toBe('refused');
      if (result.kind === 'refused') {
        expect(result.reason).toBe('near-sonic');
        expect(result.message).toMatch(/below Mach 1.05/);
        expect(result.levels).toEqual([]);
      }
    }
    const at = await verifiedTransonicDrag(cone, { ...options, mach: 1.05 }, engine);
    expect(at.kind).toBe('solved');
    const allowed = await verifiedTransonicDrag(
      cone,
      { ...options, mach: 1, allowNearSonic: true },
      engine,
    );
    expect(allowed.kind).toBe('solved');
  });

  it('below Mach 1.05 the family moves to 224.2 radii, with 100.6 and 408.7 as its neighbours (decision 7.3)', async () => {
    expect(transonicDomains(cone, 1).family).toEqual({
      farField: 100,
      cylinder: 10,
      nested: { farField: 200 },
    });
    expect(transonicDomains(cone, 1).farField).toEqual([100, 200, 400]);
    expect(transonicDomains(cone, 1.05).farField).toEqual([50, 100, 200]);
    expect(transonicDomains(cone, 1.05).family.nested).toBeUndefined();
    // The cone's base-grid drags at Mach 1.0 on the nested domains (0013,
    // "Mach 1.0: the family moved to 224.2 radii"), with grids converging
    // at second order towards them.
    const measured: Record<number, number> = {
      100: 0.09171531708471234,
      200: 0.09292826439834694,
      400: 0.09328843962216965,
    };
    const asked: { far: number | undefined; cylinder: number | undefined; r: number }[] = [];
    const engine = synthetic({
      converged: (r, far, cylinder) => {
        asked.push({ far, cylinder, r });
        return measured[far ?? 100]! + 2e-4 / r ** 2;
      },
    });
    const result = await verifiedTransonicDrag(
      cone,
      { ...options, mach: 1, allowNearSonic: true },
      engine,
    );
    // Every grid of the family, and the cylinder's neighbours, on 224.2 radii.
    for (const a of asked) {
      if (a.r > 1 || a.cylinder !== undefined) expect(a.far).toBe(200);
    }
    expect(asked.filter((a) => a.r === 1).map((a) => a.far)).toEqual([200, 100, 400, 200, 200]);
    expect(result.kind).toBe('solved');
    if (result.kind !== 'solved') return;
    expect(result.allowances.farField.domains).toEqual([100, 200, 400]);
    const [c1, c2] = [measured[200]! - measured[100]!, measured[400]! - measured[200]!];
    expect(result.allowances.farField.result.kind).toBe('decaying');
    // rho 0.297: the allowance |c2| / (1 - rho), 5.12e-4, at least.
    expect(c2 / c1).toBeCloseTo(0.297, 3);
    expect(result.parts.farField).toBeGreaterThanOrEqual(Math.abs(c2) / (1 - c2 / c1));
    expect(result.parts.farField).toBeLessThan(5.2e-4);
  });

  it('the moved family at Mach 1.01: the effect turns beyond 224.2 radii, and the turning bound holds it', async () => {
    const measured: Record<number, number> = {
      100: 0.10261026960618434,
      200: 0.10351345309568905,
      400: 0.1034732094263092,
    };
    const result = await verifiedTransonicDrag(
      cone,
      { ...options, mach: 1.01, allowNearSonic: true },
      synthetic({ converged: (r, far) => measured[far ?? 100]! + 2e-4 / r ** 2 }),
    );
    expect(result.kind).toBe('solved');
    if (result.kind !== 'solved') return;
    const far = result.allowances.farField.result;
    expect(far.kind).toBe('turning');
    // |b| + T |a| + m: 4.02e-5 + 4.28 x 9.03e-4, 3.9e-3 (3.8% of the drag).
    expect(Math.abs(result.parts.farField - far.measurability - 3.902e-3)).toBeLessThan(2e-6);
  });

  it('blunt noses are refused, and Mach numbers outside the range throw', async () => {
    const engine = synthetic({ converged: () => 0.09 });
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
