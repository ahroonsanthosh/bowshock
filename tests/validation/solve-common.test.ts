import { describe, expect, it } from 'vitest';
import type { TransonicEngine } from '../../src/analysis/transonic-drag';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  fileGridStore,
  fileMidCheckpoint,
  writeKept,
} from '../../docs/research/nose-model-form/mid-checkpoint';
import {
  cpuFallback,
  explicitEngine,
  FALLBACK_CFL,
  fallbackPaths,
  gridFingerprint,
  gridRecords,
  sameFingerprint,
  solveAllowance,
  solveGridKept,
  MAX_STEPS,
  MAX_STEPS_EXPLICIT,
  NotConverged,
  problemOf,
  solveGrid,
  solveGridStably,
  type GridFingerprint,
  type GridResult,
  type GridStore,
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

  it('without an explicit cap given, the explicit path runs under the registered MAX_STEPS_EXPLICIT', () => {
    const f = cpuFallback();
    const paths = fallbackPaths(f.implicit10, f);
    expect(paths.map((p) => p.path)).toEqual(['implicit', 'explicit', 'implicit10']);
    expect(paths[1]!.maxSteps).toBe(MAX_STEPS_EXPLICIT);
    expect(paths[0]!.maxSteps).toBe(MAX_STEPS);
    expect(paths[2]!.maxSteps).toBe(MAX_STEPS);
    expect(fallbackPaths(f.implicit10, null)).toHaveLength(1);
  });

  it('the file checkpoint: a state without its step count is not continued from; what is saved is loaded; the save is atomic', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mid-'));
    const ck = fileMidCheckpoint(join(dir, 'g'));
    expect(ck.load()).toBeNull();
    const state = new Float64Array([1, 2, 3, 4]);
    writeFileSync(join(dir, 'g-mid.bin'), Buffer.from(state.buffer));
    // The bin alone (the old code's save): refused.
    expect(ck.load()).toBeNull();
    ck.save({ conserved: state, steps: 1234, firstResidual: 2e-3, largestResidual: 5e-3 });
    const loaded = ck.load()!;
    expect([...loaded.conserved]).toEqual([1, 2, 3, 4]);
    expect(loaded.steps).toBe(1234);
    expect(loaded.firstResidual).toBe(2e-3);
    expect(loaded.largestResidual).toBe(5e-3);
    // No temporary file is left behind, and both files exist by their final names.
    expect(readdirSync(dir).sort()).toEqual(['g-mid.bin', 'g-mid.json']);
    ck.clear();
    expect(readdirSync(dir)).toEqual([]);
  });

  it('the largest residual is restored and carried into the next save', async () => {
    const holder = new Euler2D(problem.config);
    holder.setCellPrimitives(() => problem.freeStream.state);
    const saved = holder.conserved();
    const seen: MidState[] = [];
    const mid: MidCheckpoint = {
      everySeconds: 0,
      load: () => ({ conserved: saved, steps: 100, firstResidual: 1e-2, largestResidual: 7.5 }),
      save: (st) => seen.push(st),
    };
    await solveGrid(
      engineOf({ limit: 0.1 }, { count: 0 }),
      problem,
      null,
      't',
      quiet,
      false,
      MAX_STEPS,
      mid,
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]!.largestResidual).toBe(7.5);
    expect(seen[0]!.firstResidual).toBe(1e-2);
    expect(seen[0]!.steps).toBeGreaterThan(100);
  }, 120_000);

  it('allowance base grids are kept: a restart re-solves nothing finished and resumes a running path', async () => {
    // An in-memory GridStore standing for the file store.
    const kept = new Map<string, { result: GridResult; conserved: Float64Array }>();
    const mids = new Map<string, MidState>();
    const store: GridStore = {
      done: (key) => kept.get(key) ?? null,
      keep: (key, result, conserved) => kept.set(key, { result, conserved }),
      // (the fingerprint is not checked by this in-memory store; the file store's test does)
      midFor: (key, path) => ({
        everySeconds: 1e9,
        load: () => mids.get(`${key}-${path}`) ?? null,
        save: (st) => mids.set(`${key}-${path}`, st),
      }),
      clearMid: (key) => {
        for (const k of [...mids.keys()]) if (k.startsWith(key)) mids.delete(k);
      },
    };
    const ownProblem = problemOf(1.1, 1);
    const ownSolve = await solveGrid(
      engineOf({ limit: 0.1 }, { count: 0 }),
      ownProblem,
      null,
      'own',
      quiet,
    );
    const own = {
      result: ownSolve.result,
      records: gridRecords(ownProblem, ownSolve.conserved),
      problem: ownProblem,
    };
    // First run: both base grids solved and kept, with their paths.
    const implicit = { count: 0 };
    const first = await solveAllowance(
      engineOf({ limit: 0.1 }, implicit),
      1.1,
      'farField',
      own,
      't',
      quiet,
      null,
      store,
    );
    expect(implicit.count).toBe(2);
    expect([...kept.keys()].sort()).toEqual(['M1.100-farField-200', 'M1.100-farField-50']);
    expect(first.grids[0].path).toBe('implicit');
    // Second run (a restart): nothing is solved, the same values come back.
    const again = { count: 0 };
    const second = await solveAllowance(
      engineOf({ limit: 0.1 }, again),
      1.1,
      'farField',
      own,
      't',
      quiet,
      null,
      store,
    );
    expect(again.count).toBe(0);
    expect(second.values).toEqual(first.values);
    expect(second.result).toEqual(first.result);
    // A restart while the larger grid's explicit path was running: the
    // implicit path is not tried again, the explicit one resumes from its
    // saved step count, and the kept grid records the explicit path.
    kept.delete('M1.100-farField-200');
    const largerProblem = problemOf(1.1, 1, { farField: 200 });
    const holder = new Euler2D(largerProblem.config);
    holder.setCellPrimitives(() => largerProblem.freeStream.state);
    mids.set('M1.100-farField-200-explicit', {
      conserved: holder.conserved(),
      steps: 777,
      firstResidual: 1e-2,
      largestResidual: 1e-2,
    });
    const counts = [{ count: 0 }, { count: 0 }, { count: 0 }];
    const third = await solveAllowance(
      engineOf({ limit: 0.1, divergeAt: 400 }, counts[0]!),
      1.1,
      'farField',
      own,
      't',
      quiet,
      {
        explicit: engineOf({ limit: 0.1 }, counts[1]!),
        implicit10: engineOf({ limit: 0.1 }, counts[2]!),
      },
      store,
    );
    expect(counts.map((c) => c.count)).toEqual([0, 1, 0]);
    expect(third.grids[2].path).toBe('explicit');
    expect(third.grids[2].steps).toBeGreaterThan(777);
    expect(kept.get('M1.100-farField-200')!.result.path).toBe('explicit');
    expect([...mids.keys()].filter((k) => k.startsWith('M1.100-farField-200'))).toEqual([]);
  }, 120_000);

  it('the file grid store: kept grids and mid states round-trip; a half-kept grid is not kept; a changed fingerprint refuses', () => {
    const dir = mkdtempSync(join(tmpdir(), 'store-'));
    const store = fileGridStore(dir);
    const fp = gridFingerprint(problem, 'CPU test', 'abc1234');
    expect(store.done('k', fp)).toBeNull();
    const result = {
      refinement: 1,
      ni: 2,
      nj: 2,
      drag: 0.1,
      steps: 5,
      seconds: 1,
      noise: 1e-7,
      rate: 0.9,
      scale: 0.1,
      path: 'explicit' as const,
    };
    store.keep('k', result, new Float64Array([1, 2]), fp);
    const back = store.done('k', fp);
    expect(back).not.toBeNull();
    if (back === null || 'mismatch' in back) throw new Error('kept grid expected');
    expect(back.result).toEqual(result);
    expect([...back.conserved]).toEqual([1, 2]);
    // The same grid under other code, or other constants, is a mismatch, not a kept grid.
    const other = store.done('k', { ...fp, commit: 'def5678' });
    expect(other !== null && 'mismatch' in other && other.mismatch.commit === 'abc1234').toBe(true);
    expect(store.done('k', { ...fp, settleNoise: 2e-7 })).toMatchObject({
      mismatch: { commit: 'abc1234' },
    });
    expect(store.done('k', { ...fp, nj: fp.nj + 1 })).toMatchObject({ mismatch: { nj: fp.nj } });
    // A kept grid without a fingerprint (f4d0f74's store) is a mismatch too.
    writeFileSync(join(dir, 'k.json'), JSON.stringify(result));
    expect(store.done('k', fp)).toMatchObject({ mismatch: { commit: 'none recorded' } });
    const mid = store.midFor('k', 'implicit10')!;
    mid.save({ conserved: new Float64Array([3]), steps: 9, firstResidual: 1, largestResidual: 2 });
    expect(mid.load()!.steps).toBe(9);
    store.clearMid('k');
    expect(mid.load()).toBeNull();
    // The json alone (a crash between the two writes) is not a kept grid.
    writeFileSync(join(dir, 'h.json'), JSON.stringify({ ...result, fingerprint: fp }));
    expect(store.done('h', fp)).toBeNull();
    expect(readdirSync(dir).sort()).toEqual(['h.json', 'k.bin', 'k.json']);
  });

  it('a kept grid is written bin first and json last, each through a temporary name and a rename', () => {
    const calls: string[] = [];
    const fp = gridFingerprint(problem, 'CPU test', 'abc1234');
    const result = {
      refinement: 1,
      ni: 2,
      nj: 2,
      drag: 0.1,
      steps: 5,
      seconds: 1,
      noise: 1e-7,
      rate: 0.9,
      scale: 0.1,
      path: 'implicit' as const,
    };
    writeKept('/x/g', result, new Float64Array([1]), fp, {
      write: (path) => calls.push(`write ${path}`),
      rename: (from, to) => calls.push(`rename ${from} -> ${to}`),
    });
    expect(calls).toEqual([
      'write /x/g.bin.tmp',
      'rename /x/g.bin.tmp -> /x/g.bin',
      'write /x/g.json.tmp',
      'rename /x/g.json.tmp -> /x/g.json',
    ]);
  });

  it('solveGridKept refuses a kept grid whose fingerprint differs and solves it again', async () => {
    const kept = new Map<
      string,
      { result: GridResult; conserved: Float64Array; fp: GridFingerprint }
    >();
    const store: GridStore = {
      done: (key, fp) => {
        const k = kept.get(key);
        if (k === undefined) return null;
        return sameFingerprint(k.fp, fp)
          ? { result: k.result, conserved: k.conserved }
          : { mismatch: k.fp };
      },
      keep: (key, result, conserved, fp) => kept.set(key, { result, conserved, fp }),
      midFor: () => null,
      clearMid: () => undefined,
    };
    const fpA = gridFingerprint(problem, 'CPU test', 'aaaa');
    const fpB = gridFingerprint(problem, 'CPU test', 'bbbb');
    const first = { count: 0 };
    await solveGridKept(
      store,
      'k',
      engineOf({ limit: 0.1 }, first),
      problem,
      null,
      't',
      quiet,
      null,
      fpA,
    );
    const same = { count: 0 };
    await solveGridKept(
      store,
      'k',
      engineOf({ limit: 0.1 }, same),
      problem,
      null,
      't',
      quiet,
      null,
      fpA,
    );
    expect([first.count, same.count]).toEqual([1, 0]);
    const other = { count: 0 };
    const lines: string[] = [];
    await solveGridKept(
      store,
      'k',
      engineOf({ limit: 0.1 }, other),
      problem,
      null,
      't',
      (l) => void lines.push(l),
      null,
      fpB,
    );
    expect(other.count).toBe(1);
    expect(lines.some((l) => /kept grid refused: its fingerprint differs in commit/.test(l))).toBe(
      true,
    );
    expect(kept.get('k')!.fp.commit).toBe('bbbb');
  }, 120_000);

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
