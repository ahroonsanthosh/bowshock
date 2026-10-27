// The fit of W5's docs/research/two-scale-noses/runners/tmp-haackmoc/
// fitsave.test.ts (same problem, same chunks, same early stop), its final
// state saved for the march of characteristics: SAVE.bin (rho, u, v, p per
// cell, i fastest) and SAVE.json (heights, iterations, drag, ni, nj, the
// fitted grid's gates, the fingerprint). Two changes, neither to the fit
// nor to the stop (0006, "Widening the outline: registration"):
// - a fingerprint (the case, the runner's settings, codeHashes) in every
//   checkpoint and save; a checkpoint with another one is not resumed;
// - checkpoints every SUB iterations inside a chunk, with the early stop's
//   history, so a restart loses at most SUB iterations. Each chunk of
//   fittedFlow already starts from the heights and cell states alone (as
//   W5's restarts from its checkpoints did); the stop is still judged once
//   per CHUNK iterations, as W5's.
// Env: SHAPE, C, L, M, CYL (common.ts), REF, MAXIT, CHUNK, SUB, SAVE,
// CHECKPOINT, UNGATED (1: skip the pre-fit gates; the fitted grid's are
// recorded), LOG.
import {
  appendFileSync,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { it } from 'vitest';
import { bluntFitProblem, fittedFlow, wallDrag } from '../../src/analysis/fitted-flow';
import { bodyFromEnv, gamma, idFromEnv } from './common';
import { FITTED_QUALITY_LIMITS, gridQuality, qualityFailures } from '../../src/grid/quality';
import { freeStreamAt } from '../../src/analysis/verified-drag';
import { normalShock, stagnationPressureRatio } from '../../src/validation/gas-dynamics';
import { codeHashes, treeCommit } from './fingerprint';

const LOG = process.env.LOG ?? 'tests/vk/log.txt';
const log = (s: string) => appendFileSync(LOG, `${new Date().toISOString()} ${s}\n`);
const M = Number(process.env.M ?? 2);
const REF = Number(process.env.REF ?? 1);
const MAXIT = Number(process.env.MAXIT ?? 40000);
const SAVE = process.env.SAVE!;
const UNGATED = process.env.UNGATED === '1';
const id = `${idFromEnv()} nj20x${REF}`;
const SETTLE = 1e-9;
const NOISE = 1e-10;

/** The compared fields of a fingerprint. */
interface Fingerprint {
  readonly case: string;
  readonly refinement: number;
  readonly chunk: number;
  readonly maxIterations: number;
  readonly settle: number;
  readonly noise: number;
  readonly ungated: boolean;
  readonly numerics: string;
  readonly runner: string;
}

const differences = (a: Record<string, unknown>, b: Record<string, unknown>, keys: string[]) =>
  keys.filter((k) => a[k] !== b[k]);

it(`fitsave ${id}`, () => {
  if (!SAVE) throw new Error('SAVE is required');
  const body = bodyFromEnv();
  const CHUNK = Number(process.env.CHUNK ?? 500) * REF;
  const SUB = Math.min(CHUNK, Number(process.env.SUB ?? 250));
  const CHECKPOINT = process.env.CHECKPOINT;
  const code = codeHashes(['fitsave.test.ts']);
  const fingerprint: Fingerprint = {
    case: idFromEnv(),
    refinement: REF,
    chunk: CHUNK,
    maxIterations: MAXIT * REF,
    settle: SETTLE,
    noise: NOISE,
    ungated: UNGATED,
    numerics: code.numerics,
    runner: code.runner,
  };
  const informational = { commit: treeCommit(), srcFiles: code.srcFiles };
  log(`${id}: start, save to ${SAVE}, fingerprint ${JSON.stringify(fingerprint)}`);
  // The checkpoint's fingerprint is checked before the problem is built.
  type Head = {
    heights: number[];
    iterations: number;
    ni: number;
    nj: number;
    chunkDone?: number;
    history?: { drags: number[]; measurable: [number, number][]; passes: number };
    fingerprint?: Fingerprint;
    seedFingerprint?: Fingerprint;
  };
  let head: Head | undefined;
  if (CHECKPOINT && existsSync(`${CHECKPOINT}.json`)) {
    head = JSON.parse(readFileSync(`${CHECKPOINT}.json`, 'utf8')) as Head;
    if (head.fingerprint) {
      const d = differences(
        head.fingerprint as unknown as Record<string, unknown>,
        fingerprint as unknown as Record<string, unknown>,
        Object.keys(fingerprint),
      );
      if (d.length > 0) {
        log(`${id}: REFUSED checkpoint ${CHECKPOINT}: fingerprint differs in ${d.join(', ')}`);
        throw new Error(`checkpoint fingerprint differs in ${d.join(', ')}`);
      }
    } else if (head.seedFingerprint) {
      // A seed (seed.mjs) from the coarser grid's save: the same case and code.
      const d = differences(
        head.seedFingerprint as unknown as Record<string, unknown>,
        fingerprint as unknown as Record<string, unknown>,
        ['case', 'settle', 'noise', 'ungated', 'numerics', 'runner'],
      );
      if (d.length > 0) {
        log(`${id}: REFUSED seed ${CHECKPOINT}: its save's fingerprint differs in ${d.join(', ')}`);
        throw new Error(`seed fingerprint differs in ${d.join(', ')}`);
      }
    } else {
      log(`${id}: REFUSED checkpoint ${CHECKPOINT}: no fingerprint`);
      throw new Error('checkpoint without a fingerprint');
    }
  }
  const problem = bluntFitProblem(body, {
    mach: M,
    gamma,
    nj: 20,
    refinement: REF,
    gated: !UNGATED,
  } as Parameters<typeof bluntFitProblem>[1]);
  const ni = problem.lines.length - 1;
  let heights = problem.heights;
  let initial = problem.initial;
  let total = 0;
  let chunkDone = 0;
  // The early stop's history (W5's settle), carried across restarts.
  let drags: number[] = [];
  let measurable: [number, number][] = [];
  let passes = 0;
  if (head && CHECKPOINT) {
    if (head.ni !== ni || head.nj !== problem.nj) throw new Error('checkpoint of another grid');
    const saved = new Float64Array(readFileSync(`${CHECKPOINT}.bin`).buffer.slice(0));
    heights = head.heights;
    total = head.iterations;
    chunkDone = head.chunkDone ?? 0;
    if (head.history) {
      drags = head.history.drags;
      measurable = head.history.measurable;
      passes = head.history.passes;
    }
    initial = (i, j) => {
      const k = 4 * (i + j * ni);
      return { rho: saved[k]!, u: saved[k + 1]!, v: saved[k + 2]!, p: saved[k + 3]! };
    };
    log(
      `${id}: resumed from checkpoint at ${total} iterations (${chunkDone} into the chunk, ${drags.length} chunks of history)${head.seedFingerprint ? ', a seed' : ''}`,
    );
  }
  const state = (f: ReturnType<typeof fittedFlow>['fit']) => {
    const cells = new Float64Array(4 * ni * problem.nj);
    for (let j = 0; j < problem.nj; j++) {
      for (let i = 0; i < ni; i++) {
        const w = f.solver.primitive(i, j);
        const k = 4 * (i + j * ni);
        cells[k] = w.rho;
        cells[k + 1] = w.u;
        cells[k + 2] = w.v;
        cells[k + 3] = w.p;
      }
    }
    return cells;
  };
  const checkpoint = (f: ReturnType<typeof fittedFlow>['fit']) => {
    if (!CHECKPOINT) return;
    writeFileSync(`${CHECKPOINT}.bin.tmp`, Buffer.from(state(f).buffer));
    writeFileSync(
      `${CHECKPOINT}.json.tmp`,
      JSON.stringify({
        heights: f.heights,
        iterations: total,
        ni,
        nj: problem.nj,
        chunkDone,
        history: { drags, measurable, passes },
        fingerprint,
        ...informational,
        saved: new Date().toISOString(),
      }),
    );
    // The state first, then its head: a head always describes the state beside it
    // or an older one, never a newer one.
    renameSync(`${CHECKPOINT}.bin.tmp`, `${CHECKPOINT}.bin`);
    renameSync(`${CHECKPOINT}.json.tmp`, `${CHECKPOINT}.json`);
  };
  let iterativeError = Infinity;
  let settledEarly = false;
  // W5's early stop, unchanged.
  const settle = (value: number, maxSpeed: number) => {
    const n = drags.length;
    const change = Math.abs(value - (drags[n - 1] ?? Number.NaN));
    drags.push(value);
    if (change > 10 * NOISE * Math.abs(value)) measurable.push([n, Math.log(change)]);
    const points = measurable.slice(-8);
    let rate = Number.NaN;
    if (points.length >= 2) {
      const mx = points.reduce((s, [x]) => s + x, 0) / points.length;
      const my = points.reduce((s, [, y]) => s + y, 0) / points.length;
      let sxy = 0;
      let sxx = 0;
      for (const [x, y] of points) {
        sxy += (x - mx) * (y - my);
        sxx += (x - mx) ** 2;
      }
      rate = Math.exp(sxy / sxx);
    }
    let remaining = Number.isNaN(rate) ? 0 : Infinity;
    if (rate < 1) {
      const k = Math.max(1, Math.ceil(Math.log(0.5) / Math.log(rate)));
      if (n >= k) {
        const f = rate ** k;
        remaining = (Math.abs(value - drags[n - k]!) * f) / (1 - f);
      }
    }
    iterativeError = remaining / Math.abs(value);
    const passed =
      change <= SETTLE * Math.abs(value) &&
      remaining <= SETTLE * Math.abs(value) &&
      maxSpeed < SETTLE;
    passes = passed ? passes + 1 : 0;
    return { rate, remaining: iterativeError, settled: passes >= 2 };
  };
  // One chunk of CHUNK iterations, in pieces of SUB with a checkpoint after
  // each piece but the last.
  let fit: ReturnType<typeof fittedFlow>['fit'] | undefined;
  const runChunk = () => {
    while (chunkDone < CHUNK) {
      const n = Math.min(SUB, CHUNK - chunkDone);
      const from = fit;
      fit = fittedFlow(
        from
          ? { ...problem, heights: from.heights, initial: (i, j) => from.solver.primitive(i, j) }
          : { ...problem, heights, initial },
        n,
      ).fit;
      total += fit.iterations;
      chunkDone += fit.iterations;
      if (fit.converged) return;
      if (chunkDone < CHUNK) checkpoint(fit);
    }
  };
  runChunk();
  while (!fit!.converged && total < MAXIT * REF) {
    const d = problem.drag(fit!.solver.boundaryFluxes('jMin'));
    const s = settle(d, fit!.maxSpeed);
    chunkDone = 0;
    if (s.settled) {
      settledEarly = true;
      break;
    }
    checkpoint(fit!);
    log(
      `${id}: ${total} iterations, maxSpeed ${fit!.maxSpeed.toExponential(2)}, drag ${d.toPrecision(12)}, remaining ${s.remaining.toExponential(2)}`,
    );
    runChunk();
  }
  const f = fit!;
  const drag = problem.drag(f.solver.boundaryFluxes('jMin'));
  const cells = state(f);
  const strip = wallDrag(problem, f.grid, (i, j) => f.solver.primitive(i, j));
  const q = gridQuality(f.grid);
  const free = freeStreamAt(M, gamma);
  const shock = normalShock(free.state.u / Math.sqrt(gamma), gamma);
  const pitot = shock.pressureRatio * stagnationPressureRatio(shock.downstreamMach, gamma);
  const f0 = f.solver.boundaryFluxes('jMin')[0]!;
  const quality = {
    wall: (q.minWallAngle * 180) / Math.PI,
    minAngle: (q.minAngle * 180) / Math.PI,
    sizeRatio: q.maxSizeRatio,
    aspect: q.maxAspectRatio,
    gates: qualityFailures(q, FITTED_QUALITY_LIMITS),
    stagnationError: (f0.flux[1] * f0.nx + f0.flux[2] * f0.ny) / pitot - 1,
    standoff: f.heights[0],
  };
  log(`${id}: quality ${JSON.stringify(quality)}`);
  writeFileSync(`${SAVE}.bin.tmp`, Buffer.from(cells.buffer));
  writeFileSync(
    `${SAVE}.json.tmp`,
    JSON.stringify({
      id,
      heights: f.heights,
      iterations: total,
      ni,
      nj: problem.nj,
      drag,
      strip,
      settledEarly,
      iterativeError,
      converged: f.converged,
      maxSpeed: f.maxSpeed,
      residual: f.residual,
      quality,
      fingerprint,
      ...informational,
      saved: new Date().toISOString(),
    }),
  );
  renameSync(`${SAVE}.bin.tmp`, `${SAVE}.bin`);
  renameSync(`${SAVE}.json.tmp`, `${SAVE}.json`);
  log(
    `${id}: ${settledEarly ? 'settled early' : f.converged ? 'converged' : 'NOT converged'} at ${total} iterations, remaining ${iterativeError.toExponential(2)}, maxSpeed ${f.maxSpeed.toExponential(2)}, drag ${drag.toPrecision(17)}, from the wall strip ${strip.toPrecision(17)}; saved`,
  );
});
