// Throwaway: the fit of tests/tmp-haack/fit.test.ts (same problem, same
// chunks, same early stop), its final state saved for the march of
// characteristics: SAVE.bin (rho, u, v, p per cell, i fastest) and
// SAVE.json (heights, iterations, drag, ni, nj).
// With CHECKPOINT set, the state is written after each chunk and read
// back on a restart (the same fit: each step depends only on the state
// before it), as tests/tmp-haack/fit.test.ts does.
// Env: SHAPE, C, L, M, CYL, REF, MAXIT, CHUNK, SAVE, CHECKPOINT, UNGATED
// (1: skip the branch's pre-fit gates; the fitted grid's are recorded).
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { bluntFitProblem, fittedFlow, wallDrag } from '../../src/analysis/fitted-flow';
import { bodyFromEnv, gamma, idFromEnv } from '../tmp-haack/common';
import { FITTED_QUALITY_LIMITS, gridQuality, qualityFailures } from '../../src/grid/quality';
import { freeStreamAt } from '../../src/analysis/verified-drag';
import { normalShock, stagnationPressureRatio } from '../../src/validation/gas-dynamics';
import { appendFileSync } from 'node:fs';

const log = (s: string) =>
  appendFileSync('tests/tmp-haackmoc/log.txt', `${new Date().toISOString()} ${s}\n`);
const M = Number(process.env.M ?? 2);
const REF = Number(process.env.REF ?? 1);
const MAXIT = Number(process.env.MAXIT ?? 40000);
const SAVE = process.env.SAVE!;
const id = `${idFromEnv()} nj20x${REF}`;

it(`fitsave ${id}`, () => {
  const body = bodyFromEnv();
  log(`${id}: start, save to ${SAVE}`);
  const problem = bluntFitProblem(body, {
    mach: M,
    gamma,
    nj: 20,
    refinement: REF,
    gated: process.env.UNGATED !== '1',
  } as Parameters<typeof bluntFitProblem>[1]);
  const ni = problem.lines.length - 1;
  const CHUNK = Number(process.env.CHUNK ?? 500) * REF;
  const CHECKPOINT = process.env.CHECKPOINT;
  let heights = problem.heights;
  let initial = problem.initial;
  let before = 0;
  if (CHECKPOINT && existsSync(`${CHECKPOINT}.json`)) {
    const head = JSON.parse(readFileSync(`${CHECKPOINT}.json`, 'utf8')) as {
      heights: number[];
      iterations: number;
      ni: number;
      nj: number;
    };
    const saved = new Float64Array(readFileSync(`${CHECKPOINT}.bin`).buffer.slice(0));
    if (head.ni !== ni || head.nj !== problem.nj) throw new Error('checkpoint of another grid');
    heights = head.heights;
    before = head.iterations;
    initial = (i, j) => {
      const k = 4 * (i + j * ni);
      return { rho: saved[k]!, u: saved[k + 1]!, v: saved[k + 2]!, p: saved[k + 3]! };
    };
    log(`${id}: resumed from checkpoint at ${before} iterations`);
  }
  let fit = fittedFlow({ ...problem, heights, initial }, CHUNK).fit;
  let total = before + fit.iterations;
  const state = (f: typeof fit) => {
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
  const SETTLE = 1e-9;
  const NOISE = 1e-10;
  const drags: number[] = [];
  const measurable: [number, number][] = [];
  let passes = 0;
  let iterativeError = Infinity;
  let settledEarly = false;
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
      change <= SETTLE * Math.abs(value) && remaining <= SETTLE * Math.abs(value) && maxSpeed < SETTLE;
    passes = passed ? passes + 1 : 0;
    return { rate, remaining: iterativeError, settled: passes >= 2 };
  };
  while (!fit.converged && total < MAXIT * REF) {
    const d = problem.drag(fit.solver.boundaryFluxes('jMin'));
    const s = settle(d, fit.maxSpeed);
    if (s.settled) {
      settledEarly = true;
      break;
    }
    if (CHECKPOINT) {
      writeFileSync(`${CHECKPOINT}.bin.tmp`, Buffer.from(state(fit).buffer));
      writeFileSync(
        `${CHECKPOINT}.json.tmp`,
        JSON.stringify({ heights: fit.heights, iterations: total, ni, nj: problem.nj }),
      );
      renameSync(`${CHECKPOINT}.bin.tmp`, `${CHECKPOINT}.bin`);
      renameSync(`${CHECKPOINT}.json.tmp`, `${CHECKPOINT}.json`);
    }
    log(`${id}: ${total} iterations, maxSpeed ${fit.maxSpeed.toExponential(2)}, drag ${d.toPrecision(12)}, remaining ${s.remaining.toExponential(2)}`);
    const previous = fit;
    fit = fittedFlow(
      { ...problem, heights: previous.heights, initial: (i, j) => previous.solver.primitive(i, j) },
      CHUNK,
    ).fit;
    total += fit.iterations;
  }
  const drag = problem.drag(fit.solver.boundaryFluxes('jMin'));
  const cells = state(fit);
  const strip = wallDrag(problem, fit.grid, (i, j) => fit.solver.primitive(i, j));
  const q = gridQuality(fit.grid);
  const free = freeStreamAt(M, gamma);
  const shock = normalShock(free.state.u / Math.sqrt(gamma), gamma);
  const pitot = shock.pressureRatio * stagnationPressureRatio(shock.downstreamMach, gamma);
  const f0 = fit.solver.boundaryFluxes('jMin')[0]!;
  const quality = {
    wall: (q.minWallAngle * 180) / Math.PI,
    minAngle: (q.minAngle * 180) / Math.PI,
    sizeRatio: q.maxSizeRatio,
    aspect: q.maxAspectRatio,
    gates: qualityFailures(q, FITTED_QUALITY_LIMITS),
    stagnationError: (f0.flux[1] * f0.nx + f0.flux[2] * f0.ny) / pitot - 1,
    standoff: fit.heights[0],
  };
  log(`${id}: quality ${JSON.stringify(quality)}`);
  writeFileSync(`${SAVE}.bin`, Buffer.from(cells.buffer));
  writeFileSync(
    `${SAVE}.json`,
    JSON.stringify({ id, heights: fit.heights, iterations: total, ni, nj: problem.nj, drag, strip, settledEarly, iterativeError, converged: fit.converged, maxSpeed: fit.maxSpeed, residual: fit.residual, quality }),
  );
  log(`${id}: ${settledEarly ? 'settled early' : fit.converged ? 'converged' : 'NOT converged'} at ${total} iterations, remaining ${iterativeError.toExponential(2)}, maxSpeed ${fit.maxSpeed.toExponential(2)}, drag ${drag.toPrecision(17)}, from the wall strip ${strip.toPrecision(17)}; saved`);
});
