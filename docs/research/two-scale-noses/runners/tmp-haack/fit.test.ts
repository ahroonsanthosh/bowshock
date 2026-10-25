// Throwaway: one fitted-shock solution per job on a blunt nose, with the
// measurements of the task. Env: SHAPE (haack | ellipsoid), C, L, M, CYL,
// REF, MAXIT (per refinement), OUT, LOG.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { bluntFitProblem, fittedFlow } from '../../src/analysis/fitted-flow';
import { forebodyPressureDrag } from '../../src/analysis/forces';
import { freeStreamAt } from '../../src/analysis/verified-drag';
import { bluntBodyGrid, gridOnLines } from '../../src/grid/blunt-grid';
import { FITTED_QUALITY_LIMITS, gridQuality, qualityFailures } from '../../src/grid/quality';
import { nodeIndex } from '../../src/grid/structured';
import { normalShock, stagnationPressureRatio } from '../../src/validation/gas-dynamics';
import { append, bodyFromEnv, gamma, idFromEnv, log } from './common';

const SHAPE = process.env.SHAPE ?? 'haack';
const C = Number(process.env.C ?? 0);
const L = Number(process.env.L ?? 3);
const M = Number(process.env.M ?? 2);
const CYL = Number(process.env.CYL ?? 2);
const REF = Number(process.env.REF ?? 1);
const MAXIT = Number(process.env.MAXIT ?? 40000);
const NJ = Number(process.env.NJ ?? 20);
const id = `${idFromEnv()} nj${NJ}x${REF}`;

it(`fit ${id}`, () => {
  const body = bodyFromEnv();
  const deg = (r: number) => (r * 180) / Math.PI;
  log(`${id}: start`);
  const t0 = performance.now();
  const options = { mach: M, gamma, nj: NJ, refinement: REF, gated: process.env.UNGATED !== '1' };
  const problem = bluntFitProblem(body, options);
  const tProblem = (performance.now() - t0) / 1000;
  const startQ = gridQuality(
    gridOnLines(problem.lines, problem.heights, problem.nj, problem.baseRadius, false),
  );
  log(
    `${id}: problem built in ${tProblem.toFixed(0)}s (${problem.lines.length - 1}x${problem.nj}); start grid quality: minAngle=${deg(startQ.minAngle).toFixed(1)} wall=${deg(startQ.minWallAngle).toFixed(1)} sizeRatio=${startQ.maxSizeRatio.toFixed(3)} aspect=${startQ.maxAspectRatio.toFixed(2)}`,
  );
  const t1 = performance.now();
  // The fit in chunks, each started from the state the one before left
  // (the same fit: each step depends only on the state before it), with
  // the state written to CHECKPOINT after each chunk and read back from
  // it on a restart, so a container restart loses one chunk at most.
  const CHECKPOINT = process.env.CHECKPOINT;
  const CHUNK = Number(process.env.CHUNK ?? 500) * REF;
  const ni = problem.lines.length - 1;
  let heights = problem.heights;
  let initial = problem.initial;
  let iterationsBefore = 0;
  if (CHECKPOINT && existsSync(`${CHECKPOINT}.json`)) {
    const head = JSON.parse(readFileSync(`${CHECKPOINT}.json`, 'utf8')) as {
      heights: number[];
      iterations: number;
      ni: number;
      nj: number;
    };
    const cells = new Float64Array(readFileSync(`${CHECKPOINT}.bin`).buffer.slice(0));
    if (head.ni !== ni || head.nj !== problem.nj) throw new Error('checkpoint of another grid');
    heights = head.heights;
    iterationsBefore = head.iterations;
    initial = (i, j) => {
      const k = 4 * (i + j * ni);
      return { rho: cells[k]!, u: cells[k + 1]!, v: cells[k + 2]!, p: cells[k + 3]! };
    };
    log(`${id}: resumed from checkpoint at ${iterationsBefore} iterations`);
  }
  let fit = fittedFlow({ ...problem, heights, initial }, CHUNK).fit;
  let drag = 0;
  let total = iterationsBefore + fit.iterations;
  // The early stop allowed on the CPU reference grids: the drag's remaining
  // iterative error, estimated geometrically from its recent changes (as
  // SettlingValue: the rate per chunk from a least-squares line through the
  // logarithms of the last eight changes above ten times a noise of 1e-10
  // relative; what remains over the halving window), below SETTLE of the
  // drag on two successive chunks, with the shock speeds below SETTLE.
  const SETTLE = Number(process.env.SETTLE ?? 1e-9);
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
    // While no rate is measurable (all changes below ten times the noise,
    // as after a resume close to the limit), the change alone is tested,
    // as SettlingValue does.
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
    const s = settle(problem.drag(fit.solver.boundaryFluxes('jMin')), fit.maxSpeed);
    if (s.settled) {
      settledEarly = true;
      break;
    }
    if (CHECKPOINT) {
      const cells = new Float64Array(4 * ni * problem.nj);
      for (let j = 0; j < problem.nj; j++) {
        for (let i = 0; i < ni; i++) {
          const w = fit.solver.primitive(i, j);
          const k = 4 * (i + j * ni);
          cells[k] = w.rho;
          cells[k + 1] = w.u;
          cells[k + 2] = w.v;
          cells[k + 3] = w.p;
        }
      }
      writeFileSync(`${CHECKPOINT}.bin.tmp`, Buffer.from(cells.buffer));
      writeFileSync(
        `${CHECKPOINT}.json.tmp`,
        JSON.stringify({ heights: fit.heights, iterations: total, ni, nj: problem.nj }),
      );
      renameSync(`${CHECKPOINT}.bin.tmp`, `${CHECKPOINT}.bin`);
      renameSync(`${CHECKPOINT}.json.tmp`, `${CHECKPOINT}.json`);
    }
    const previous = fit;
    log(
      `${id}: ${total} iterations, maxSpeed ${fit.maxSpeed.toExponential(2)}, residual ${fit.residual.toExponential(2)}, drag ${problem.drag(fit.solver.boundaryFluxes('jMin')).toPrecision(12)}, rate per chunk ${s.rate.toPrecision(3)}, remaining ${s.remaining.toExponential(2)}`,
    );
    fit = fittedFlow(
      { ...problem, heights: previous.heights, initial: (i, j) => previous.solver.primitive(i, j) },
      CHUNK,
    ).fit;
    total += fit.iterations;
  }
  drag = problem.drag(fit.solver.boundaryFluxes('jMin'));
  if (!settledEarly && fit.converged) iterativeError = 0;
  log(
    `${id}: ${settledEarly ? `settled early: remaining iterative error ${iterativeError.toExponential(2)} of the drag, shock speeds ${fit.maxSpeed.toExponential(2)}` : fit.converged ? 'converged to round-off' : 'NOT converged'}`,
  );
  fit = { ...fit, iterations: total, converged: fit.converged || settledEarly };
  const tFit = (performance.now() - t1) / 1000;
  const q = gridQuality(fit.grid);
  const failures = qualityFailures(q);
  const fittedFailures = qualityFailures(q, FITTED_QUALITY_LIMITS);
  const free = freeStreamAt(M, gamma);
  const shock = normalShock(free.state.u / Math.sqrt(gamma), gamma);
  const pitot = shock.pressureRatio * stagnationPressureRatio(shock.downstreamMach, gamma);
  const wall = fit.solver.boundaryFluxes('jMin');
  const f0 = wall[0]!;
  const p0 = f0.flux[1] * f0.nx + f0.flux[2] * f0.ny;
  // Wall entropy against the normal-shock value, cell centres of the wall row.
  const entropyExact = shock.pressureRatio / shock.densityRatio ** gamma;
  let worst = 0;
  let worstAt = 0;
  let worstI = 0;
  const { nj } = fit.grid;
  const entropyAt: { x: number; dev: number }[] = [];
  for (let i = 0; i < ni; i++) {
    const w = fit.solver.primitive(i, 0);
    const dev = (w.p / w.rho ** gamma) / entropyExact - 1;
    const xc = 0.5 * (fit.grid.x[nodeIndex(fit.grid, i, 0)]! + fit.grid.x[nodeIndex(fit.grid, i + 1, 0)]!);
    entropyAt.push({ x: xc, dev });
    if (Math.abs(dev) > Math.abs(worst)) {
      worst = dev;
      worstAt = xc;
      worstI = i;
    }
  }
  // Drag of the region ahead of the base-grid line nearest 5 tip scales
  // (the same body point on every refinement of the family).
  const base = bluntBodyGrid(body, { nj: NJ, refinement: 1, mach: M, gated: false });
  const l = base.tipScale;
  let k0 = 0;
  for (let k = 0; k < base.lines.length; k++) {
    if (Math.abs(base.lines[k]!.x - 5 * l) < Math.abs(base.lines[k0]!.x - 5 * l)) k0 = k;
  }
  const kTip = l > 0 ? k0 * REF : 0;
  const tipDrag = forebodyPressureDrag(wall.slice(0, kTip), free, problem.baseRadius);
  const tipX = base.lines[k0]!.x;
  // Shock standoff and heights at a few stations.
  const standoff = fit.heights[0]!;
  const seconds = (performance.now() - t0) / 1000;
  log(
    `${id}: ${fit.converged ? 'converged' : 'NOT converged'} after ${fit.iterations} iterations (${tFit.toFixed(0)}s fit, ${seconds.toFixed(0)}s total), maxSpeed ${fit.maxSpeed.toExponential(2)}, residual ${fit.residual.toExponential(2)}; drag ${drag.toPrecision(12)}; tip drag ahead of x=${tipX.toExponential(4)} (${(tipX / l).toFixed(2)} l, ${kTip} faces) ${tipDrag.toPrecision(10)} (${((100 * tipDrag) / drag).toFixed(3)}% of drag); stagnation p ${p0.toPrecision(12)} vs pitot ${pitot.toPrecision(12)}: ${((100 * (p0 / pitot - 1))).toExponential(3)}%; wall entropy worst ${worst.toExponential(3)} at x=${worstAt.toExponential(3)} (cell ${worstI}); standoff ${standoff.toExponential(5)} = ${(standoff / l).toFixed(4)} l; fitted grid: minAngle=${deg(q.minAngle).toFixed(1)} wall=${deg(q.minWallAngle).toFixed(1)} sizeRatio=${q.maxSizeRatio.toFixed(3)} aspect=${q.maxAspectRatio.toFixed(2)} failures=${failures.join('; ') || 'none'}; fitted gates: ${fittedFailures.join('; ') || 'pass'}`,
  );
  let ent = '';
  for (let i = 0; i < ni; i += Math.max(1, Math.floor(ni / 30))) {
    ent += `  x=${entropyAt[i]!.x.toExponential(3)} entropy dev ${entropyAt[i]!.dev.toExponential(2)}\n`;
  }
  log(`${id}: wall entropy along the body:\n${ent}`);
  // Wall pressure (from the wall flux) along the tip region and the body, and the cumulative drag.
  let pr = '';
  let cum = 0;
  for (let i = 0; i < wall.length; i++) {
    const f = wall[i]!;
    cum += (f.flux[1] - free.pressure * f.nx) * f.area;
    const show = i < 8 || i === kTip - 1 || (i < kTip && i % Math.max(1, Math.floor(kTip / 10)) === 0) || i % Math.max(1, Math.floor(ni / 25)) === 0 || i === ni - 1;
    if (!show) continue;
    const p = f.flux[1] * f.nx + f.flux[2] * f.ny;
    pr += `  face ${i} x=${f.x.toExponential(3)} (${(f.x / l).toFixed(3)} l) r=${f.y.toExponential(3)} p/pinf=${p.toFixed(5)} Cp=${((p - 1) / free.dynamicPressure).toFixed(5)} cumDrag=${((2 * cum) / (free.dynamicPressure * problem.baseRadius ** 2)).toExponential(5)}\n`;
  }
  log(`${id}: wall pressure along the body:\n${pr}`);
  // With SAVE set, the final state for the march of characteristics
  // (tests/tmp-haackmoc): cells (rho, u, v, p, i fastest) and heights.
  const SAVE = process.env.SAVE;
  if (SAVE) {
    const cells = new Float64Array(4 * ni * problem.nj);
    for (let j = 0; j < problem.nj; j++) {
      for (let i = 0; i < ni; i++) {
        const w = fit.solver.primitive(i, j);
        const k = 4 * (i + j * ni);
        cells[k] = w.rho;
        cells[k + 1] = w.u;
        cells[k + 2] = w.v;
        cells[k + 3] = w.p;
      }
    }
    writeFileSync(`${SAVE}.bin`, Buffer.from(cells.buffer));
    writeFileSync(
      `${SAVE}.json`,
      JSON.stringify({ id, heights: fit.heights, iterations: fit.iterations, ni, nj: problem.nj, drag }),
    );
  }
  append({
    kind: 'fit',
    id,
    SHAPE,
    C,
    L,
    M,
    CYL,
    REF,
    ni,
    nj,
    converged: fit.converged,
    settledEarly,
    iterativeError,
    iterations: fit.iterations,
    maxSpeed: fit.maxSpeed,
    residual: fit.residual,
    drag,
    dragText: drag.toPrecision(17),
    tipDrag,
    tipDragText: tipDrag.toPrecision(17),
    tipX,
    kTip,
    tipScale: l,
    stagnation: p0,
    pitot,
    stagnationError: p0 / pitot - 1,
    entropyWorst: worst,
    entropyWorstAt: worstAt,
    standoff,
    tFit,
    seconds,
    quality: { minAngle: deg(q.minAngle), wall: deg(q.minWallAngle), sizeRatio: q.maxSizeRatio, aspect: q.maxAspectRatio },
    failures,
    startQuality: { minAngle: deg(startQ.minAngle), wall: deg(startQ.minWallAngle), sizeRatio: startQ.maxSizeRatio, aspect: startQ.maxAspectRatio },
  });
});
