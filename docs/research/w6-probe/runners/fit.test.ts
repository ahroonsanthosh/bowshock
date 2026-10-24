// W6 probe, stage B: one fitted-shock solution on a capped tangent ogive,
// as the Haack families were run (claude/wip/haack-merge,
// docs/research/two-scale-noses/runners/tmp-haack/fit.test.ts): chunks
// with a checkpoint after each, the same early stop, the page's checks on
// the converged grid, and the final state saved for seeding the next grid.
// Env: RATIO, M, CAL, CYL, REF, MAXIT (per refinement), CHUNK, CHECKPOINT,
// SAVE, OUT, LOG.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import {
  bluntFitProblem,
  fittedCaseFailure,
  fittedFlow,
  type FitProblem,
} from '../../src/analysis/fitted-flow';
import { forebodyPressureDrag } from '../../src/analysis/forces';
import { freeStreamAt, outflowMach } from '../../src/analysis/verified-drag';
import { baseMach } from '../../src/analysis/fitted-flow';
import { cappedNose } from '../../src/geometry/nose';
import { billigStandoff } from '../../src/grid/blunt-grid';
import { FITTED_QUALITY_LIMITS, gridQuality, qualityFailures } from '../../src/grid/quality';
import { nodeIndex } from '../../src/grid/structured';
import type { ShockFit } from '../../src/solver/shock-fitting';
import { normalShock, stagnationPressureRatio } from '../../src/validation/gas-dynamics';
import { append, cappedOgive, caseId, deg, gamma, log } from './common';

const RATIO = Number(process.env.RATIO ?? 0.05);
const M = Number(process.env.M ?? 1.3);
const CAL = Number(process.env.CAL ?? 5);
const CYL = Number(process.env.CYL ?? 2);
const REF = Number(process.env.REF ?? 1);
const MAXIT = Number(process.env.MAXIT ?? 40000);
const CHUNK = Number(process.env.CHUNK ?? 500) * REF;
const CHECKPOINT = process.env.CHECKPOINT;
const SAVE = process.env.SAVE;
const SETTLE = Number(process.env.SETTLE ?? 1e-9);
const NOISE = 1e-10;
const id = `${caseId(CAL, RATIO, M, CYL)} nj20x${REF}`;

function cells(fit: ShockFit, ni: number, nj: number): Float64Array {
  const out = new Float64Array(4 * ni * nj);
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      const w = fit.solver.primitive(i, j);
      const k = 4 * (i + j * ni);
      out[k] = w.rho;
      out[k + 1] = w.u;
      out[k + 2] = w.v;
      out[k + 3] = w.p;
    }
  }
  return out;
}

it(`fit ${id}`, () => {
  const body = cappedOgive(CAL, RATIO, CYL);
  const t0 = performance.now();
  log(`${id}: start`);
  const problem: FitProblem = bluntFitProblem(body, {
    mach: M,
    gamma,
    nj: 20,
    refinement: REF,
  });
  const ni = problem.lines.length - 1;
  log(`${id}: problem built in ${((performance.now() - t0) / 1000).toFixed(0)}s (${ni}x${problem.nj})`);
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
  // The early stop of the Haack families: the drag's remaining iterative
  // error, estimated geometrically from its recent changes, below SETTLE
  // of the drag on two successive chunks, with the shock speeds below it.
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
      change <= SETTLE * Math.abs(value) &&
      remaining <= SETTLE * Math.abs(value) &&
      maxSpeed < SETTLE;
    passes = passed ? passes + 1 : 0;
    return { rate, remaining: iterativeError, settled: passes >= 2 };
  };
  while (!fit.converged && total < MAXIT * REF) {
    const value = problem.drag(fit.solver.boundaryFluxes('jMin'));
    const s = settle(value, fit.maxSpeed);
    if (s.settled) {
      settledEarly = true;
      break;
    }
    if (CHECKPOINT) {
      writeFileSync(`${CHECKPOINT}.bin.tmp`, Buffer.from(cells(fit, ni, problem.nj).buffer));
      writeFileSync(
        `${CHECKPOINT}.json.tmp`,
        JSON.stringify({ heights: fit.heights, iterations: total, ni, nj: problem.nj }),
      );
      renameSync(`${CHECKPOINT}.bin.tmp`, `${CHECKPOINT}.bin`);
      renameSync(`${CHECKPOINT}.json.tmp`, `${CHECKPOINT}.json`);
    }
    log(
      `${id}: ${total} iterations, maxSpeed ${fit.maxSpeed.toExponential(2)}, residual ${fit.residual.toExponential(2)}, drag ${value.toPrecision(12)}, rate ${s.rate.toPrecision(3)}, remaining ${s.remaining.toExponential(2)}`,
    );
    const previous = fit;
    fit = fittedFlow(
      { ...problem, heights: previous.heights, initial: (i, j) => previous.solver.primitive(i, j) },
      CHUNK,
    ).fit;
    total += fit.iterations;
  }
  const drag = problem.drag(fit.solver.boundaryFluxes('jMin'));
  if (!settledEarly && fit.converged) iterativeError = 0;
  const converged = fit.converged || settledEarly;
  const cell = (i: number, j: number) => fit.solver.primitive(i, j);
  const q = gridQuality(fit.grid);
  const fittedGates = qualityFailures(q, FITTED_QUALITY_LIMITS);
  const caseFailure = fittedCaseFailure(problem, fit.grid, cell);
  const outflow = outflowMach(problem.configFor(fit.grid, []), cell);
  const base = baseMach(problem, fit.grid, cell);
  const free = freeStreamAt(M, gamma);
  const shock = normalShock(free.state.u / Math.sqrt(gamma), gamma);
  const pitot = shock.pressureRatio * stagnationPressureRatio(shock.downstreamMach, gamma);
  const wall = fit.solver.boundaryFluxes('jMin');
  const f0 = wall[0]!;
  const p0 = f0.flux[1] * f0.nx + f0.flux[2] * f0.ny;
  const entropyExact = shock.pressureRatio / shock.densityRatio ** gamma;
  let worst = 0;
  let worstAt = 0;
  for (let i = 0; i < ni; i++) {
    const w = fit.solver.primitive(i, 0);
    const dev = w.p / w.rho ** gamma / entropyExact - 1;
    if (Math.abs(dev) > Math.abs(worst)) {
      worst = dev;
      worstAt = 0.5 * (fit.grid.x[nodeIndex(fit.grid, i, 0)]! + fit.grid.x[nodeIndex(fit.grid, i + 1, 0)]!);
    }
  }
  // The cap's drag: wall faces ahead of the tangent point.
  const tangentX = cappedNose(body.nose).tangentX;
  const capFaces = wall.filter((f) => f.x < tangentX);
  const capDrag = forebodyPressureDrag(capFaces, free, problem.baseRadius);
  const rn = body.nose.tipRadius!;
  const standoff = fit.heights[0]!;
  const seconds = (performance.now() - t0) / 1000;
  log(
    `${id}: ${converged ? (settledEarly ? 'settled early' : 'converged') : 'NOT converged'} after ${total} iterations (${seconds.toFixed(0)}s), drag ${drag.toPrecision(12)}, cap drag ${capDrag.toPrecision(8)} (${capFaces.length} faces), stagnation ${(100 * (p0 / pitot - 1)).toExponential(3)}% of pitot, standoff ${(standoff / rn).toFixed(4)} r_n (Billig ${(billigStandoff(M, rn) / rn).toFixed(4)}), fitted grid wall ${deg(q.minWallAngle).toFixed(1)} angle ${deg(q.minAngle).toFixed(1)} size ${q.maxSizeRatio.toFixed(3)} aspect ${q.maxAspectRatio.toFixed(2)}; page checks: ${caseFailure ?? 'pass'}`,
  );
  if (SAVE) {
    writeFileSync(`${SAVE}.bin`, Buffer.from(cells(fit, ni, problem.nj).buffer));
    writeFileSync(
      `${SAVE}.json`,
      JSON.stringify({ id, heights: fit.heights, iterations: total, ni, nj: problem.nj, drag }),
    );
  }
  append({
    kind: 'fit',
    id,
    ratio: RATIO,
    M,
    CAL,
    CYL,
    REF,
    ni,
    nj: problem.nj,
    converged,
    roundOff: fit.converged,
    settledEarly,
    iterativeError,
    iterations: total,
    maxSpeed: fit.maxSpeed,
    residual: fit.residual,
    drag,
    dragText: drag.toPrecision(17),
    capDrag,
    capFaces: capFaces.length,
    stagnationError: p0 / pitot - 1,
    standoff,
    standoffOverRn: standoff / rn,
    billigOverRn: billigStandoff(M, rn) / rn,
    entropyWorst: worst,
    entropyWorstAt: worstAt,
    outflowMach: outflow,
    baseMach: base,
    quality: {
      minAngle: deg(q.minAngle),
      wall: deg(q.minWallAngle),
      sizeRatio: q.maxSizeRatio,
      aspect: q.maxAspectRatio,
    },
    fittedGates,
    caseFailure: caseFailure ?? null,
    seconds,
  });
});
