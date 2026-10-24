import { describe, expect, it } from 'vitest';
import type { TransonicEngine } from '../../src/analysis/transonic-drag';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import {
  cpuFallback,
  explicitEngine,
  FALLBACK_CFL,
  MAX_STEPS,
  MAX_STEPS_EXPLICIT,
  NotConverged,
  problemOf,
  solveGrid,
  solveGridStably,
  type MidCheckpoint,
  type MidState,
} from '../../docs/research/nose-model-form/solve-common';

// (y) item 18: the stable stepping path. Synthetic engines on a real
// (small) problem: nothing here solves a flow.

interface Behaviour {
  /** The drag converged to (reached geometrically from 1% off). */
  readonly limit: number;
  /** The residual grows from this step on (a divergence), if set. */
  readonly divergeAt?: number;
  /** The drag is NaN from this step on, if set. */
  readonly nanAt?: number;
  /** A drag that never settles (a wander), if set. */
  readonly wander?: number;
}

function engineOf(b: Behaviour, calls: { count: number }): TransonicEngine {
  return (problem) => {
    calls.count++;
    let steps = 0;
    return Promise.resolve({
      start: () => Promise.resolve(),
      iterate: (n) => {
        steps += n;
        return Promise.resolve();
      },
      drag: () => {
        if (b.nanAt !== undefined && steps >= b.nanAt) return Promise.resolve(Number.NaN);
        const wander = (b.wander ?? 0) * Math.sin(steps / 37);
        return Promise.resolve(b.limit * (1 + 0.01 * 0.99 ** steps + wander));
      },
      residual: () => {
        if (b.divergeAt !== undefined && steps >= b.divergeAt)
          return Promise.resolve(1e-2 * 1.5 ** ((steps - b.divergeAt) / 50));
        return Promise.resolve(1e-2 * 0.99 ** steps + 1e-13 / (1 + steps));
      },
      cells: () => Promise.resolve(() => problem.freeStream.state),
      checkPrecision: () => Promise.resolve(),
      destroy: () => undefined,
    });
  };
}

const problem = problemOf(1.1, 1);
const quiet = () => undefined;

describe('(y) item 18: solveGridStably', () => {
  it('a divergence of the implicit steps falls back to the explicit steps, and the path is recorded', async () => {
    const implicit = { count: 0 };
    const explicit = { count: 0 };
    const implicit10 = { count: 0 };
    const fallback = {
      explicit: engineOf({ limit: 0.1 }, explicit),
      implicit10: engineOf({ limit: 0.1 }, implicit10),
    };
    const solved = await solveGridStably(
      engineOf({ limit: 0.1, divergeAt: 400 }, implicit),
      problem,
      null,
      't',
      quiet,
      false,
      fallback,
    );
    expect(solved.result.path).toBe('explicit');
    expect(solved.result.drag).toBeCloseTo(0.1, 6);
    expect([implicit.count, explicit.count, implicit10.count]).toEqual([1, 1, 0]);
  });

  it('a divergence of the explicit steps too falls back to the implicit steps at CFL 10', async () => {
    const counts = [{ count: 0 }, { count: 0 }, { count: 0 }];
    const solved = await solveGridStably(
      engineOf({ limit: 0.1, divergeAt: 400 }, counts[0]!),
      problem,
      null,
      't',
      quiet,
      false,
      {
        explicit: engineOf({ limit: 0.1, nanAt: 300 }, counts[1]!),
        implicit10: engineOf({ limit: 0.1 }, counts[2]!),
      },
    );
    expect(solved.result.path).toBe('implicit10');
    expect(counts.map((c) => c.count)).toEqual([1, 1, 1]);
  });

  it('a divergence of every path is "not converged" (diverged), with every reason', async () => {
    const counts = [{ count: 0 }, { count: 0 }, { count: 0 }];
    await expect(
      solveGridStably(
        engineOf({ limit: 0.1, divergeAt: 400 }, counts[0]!),
        problem,
        null,
        't',
        quiet,
        false,
        {
          explicit: engineOf({ limit: 0.1, divergeAt: 200 }, counts[1]!),
          implicit10: engineOf({ limit: 0.1, nanAt: 100 }, counts[2]!),
        },
      ),
    ).rejects.toMatchObject({ kind: 'diverged' });
    try {
      await solveGridStably(
        engineOf({ limit: 0.1, divergeAt: 400 }, counts[0]!),
        problem,
        null,
        't',
        quiet,
        false,
        {
          explicit: engineOf({ limit: 0.1, divergeAt: 200 }, counts[1]!),
          implicit10: engineOf({ limit: 0.1, nanAt: 100 }, counts[2]!),
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(NotConverged);
      expect((error as Error).message).toMatch(
        /implicit: .*residual grew.*; explicit: .*; implicit10: .*not finite/,
      );
    }
  });

  it('a settled grid never falls back: the fallback engines are not even constructed', async () => {
    const implicit = { count: 0 };
    const explicit = { count: 0 };
    const solved = await solveGridStably(
      engineOf({ limit: 0.1 }, implicit),
      problem,
      null,
      't',
      quiet,
      false,
      {
        explicit: engineOf({ limit: 0.1 }, explicit),
        implicit10: engineOf({ limit: 0.1 }, explicit),
      },
    );
    expect(solved.result.path).toBe('implicit');
    expect([implicit.count, explicit.count]).toEqual([1, 0]);
  });

  it('a step-cap miss does not fall back: it is "not converged" (cap) at once', async () => {
    const counts = [{ count: 0 }, { count: 0 }];
    // A wander that never settles: solveGrid itself at a small cap.
    await expect(
      solveGrid(
        engineOf({ limit: 0.1, wander: 1e-3 }, counts[0]!),
        problem,
        null,
        't',
        quiet,
        false,
        2000,
      ),
    ).rejects.toMatchObject({ kind: 'cap' });
    // Through solveGridStably the fallback is not used on a cap miss.
    const stably = (async () => {
      try {
        await solveGridStably(
          engineOf({ limit: 0.1, wander: 1e-3 }, counts[0]!),
          { ...problem, options: { ...problem.options } },
          null,
          't',
          quiet,
          false,
          {
            explicit: engineOf({ limit: 0.1 }, counts[1]!),
            implicit10: engineOf({ limit: 0.1 }, counts[1]!),
          },
        );
      } catch (error) {
        return error as NotConverged;
      }
      return null;
    })();
    const error = await stably;
    expect(error).toBeInstanceOf(NotConverged);
    expect(error!.kind).toBe('cap');
    expect(counts[1]!.count).toBe(0);
  }, 120_000);

  it('on the explicit path a cap miss goes on to CFL 10; on the implicit path it is final', async () => {
    const counts = [{ count: 0 }, { count: 0 }, { count: 0 }];
    // The implicit steps diverge; the explicit steps wander and hit their
    // cap (3,000 here in place of the registered 2,000,000, the test's only
    // override); the implicit steps at CFL 10 settle.
    const solved = await solveGridStably(
      engineOf({ limit: 0.1, divergeAt: 400 }, counts[0]!),
      problem,
      null,
      't',
      quiet,
      false,
      {
        explicit: engineOf({ limit: 0.1, wander: 1e-3 }, counts[1]!),
        implicit10: engineOf({ limit: 0.1 }, counts[2]!),
      },
      () => null,
      3000,
    );
    expect(solved.result.path).toBe('implicit10');
    expect(counts.map((c) => c.count)).toEqual([1, 1, 1]);
  });

  it('the step count and the residual marks carry across a restart: the cap is per grid', async () => {
    const counts = [{ count: 0 }];
    const holder = new Euler2D(problem.config);
    holder.setCellPrimitives(() => problem.freeStream.state);
    const saved = holder.conserved();
    // A wandering grid continued at step 1,900 of a cap of 2,000 stops
    // after about 100 more steps, as 'cap'.
    const mid: MidCheckpoint = {
      everySeconds: 1e9,
      load: () => ({ conserved: saved, steps: 1900, firstResidual: 1e-2, largestResidual: 1e-2 }),
      save: () => undefined,
    };
    let taken = 0;
    const counting: TransonicEngine = async (p) => {
      const inner = await engineOf({ limit: 0.1, wander: 1e-3 }, counts[0]!)(p);
      return {
        ...inner,
        iterate: (n) => {
          taken += n;
          return inner.iterate(n);
        },
      };
    };
    await expect(
      solveGrid(counting, problem, null, 't', quiet, false, 2000, mid),
    ).rejects.toMatchObject({ kind: 'cap' });
    expect(taken).toBeLessThanOrEqual(150);
    // The first residual restored: a residual of 1e-2 against a saved first
    // residual of 1e-6 is a divergence at the first check.
    const low: MidCheckpoint = {
      ...mid,
      load: () => ({ conserved: saved, steps: 100, firstResidual: 1e-6, largestResidual: 1e-6 }),
    };
    await expect(
      solveGrid(engineOf({ limit: 0.1 }, counts[0]!), problem, null, 't', quiet, false, 2000, low),
    ).rejects.toMatchObject({ kind: 'diverged' });
    // And the save carries them: what is saved is what is loaded.
    const seen: MidState[] = [];
    const recording: MidCheckpoint = {
      everySeconds: 0,
      load: () => null,
      save: (st) => seen.push(st),
    };
    await solveGrid(
      engineOf({ limit: 0.1 }, counts[0]!),
      problem,
      null,
      't',
      quiet,
      false,
      MAX_STEPS,
      recording,
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]!.steps).toBeGreaterThan(seen[0]!.steps);
    expect(seen[0]!.firstResidual).toBeCloseTo(1e-2 * 0.99 ** 50, 10);
  }, 120_000);

  it('without fallback engines (the GPU kit) a divergence is thrown at once', async () => {
    await expect(
      solveGridStably(
        engineOf({ limit: 0.1, divergeAt: 400 }, { count: 0 }),
        problem,
        null,
        't',
        quiet,
      ),
    ).rejects.toMatchObject({ kind: 'diverged' });
  });

  it('a fallback path with a saved mid-grid state skips the paths before it', async () => {
    const counts = [{ count: 0 }, { count: 0 }, { count: 0 }];
    const holder = new Euler2D(problem.config);
    holder.setCellPrimitives(() => problem.freeStream.state);
    const saved = holder.conserved();
    const mid =
      (loadFor: string): ((path: string) => MidCheckpoint | null) =>
      (path) => ({
        everySeconds: 1e9,
        load: () =>
          path === loadFor
            ? { conserved: saved, steps: 500, firstResidual: 1e-2, largestResidual: 1e-2 }
            : null,
        save: () => undefined,
      });
    const solved = await solveGridStably(
      engineOf({ limit: 0.1 }, counts[0]!),
      problem,
      null,
      't',
      quiet,
      false,
      {
        explicit: engineOf({ limit: 0.1 }, counts[1]!),
        implicit10: engineOf({ limit: 0.1 }, counts[2]!),
      },
      mid('explicit'),
    );
    expect(solved.result.path).toBe('explicit');
    expect(counts.map((c) => c.count)).toEqual([0, 1, 0]);
  });

  it('the registered constants and the CPU fallback engines', () => {
    expect(MAX_STEPS_EXPLICIT).toBe(2_000_000);
    expect(MAX_STEPS).toBe(400_000);
    expect(FALLBACK_CFL).toBe(10);
    const f = cpuFallback();
    expect(typeof f.explicit).toBe('function');
    expect(typeof f.implicit10).toBe('function');
    expect(typeof explicitEngine()).toBe('function');
  });
});
