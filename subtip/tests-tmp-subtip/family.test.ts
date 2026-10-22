// Throwaway: the page's family of fitted grids (nj = 20 to 160) on the snapshot snap3 (branch
// head with the tip refusal limited to corner junctions), each grid started from the converged
// one before (startedFrom) and stopped once the drag's remaining iterative error, estimated
// geometrically as SettlingValue does (noise 1e-10), is below 1e-9 of the drag on two successive
// checks with shock speeds below 1e-9. Final states and checkpoints are written to STATE so that
// a lost run resumes. Env: CASE, FAMILY (name), SCALE (column density factor), MAXREF, OUT, STATE.
import { test } from 'vitest';
import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { bodyOf, caseOf, gamma } from './common';
import { fittedCaseFailure, fittedFlow, sharpFitProblem, type FitProblem } from './snap3/src/analysis/fitted-flow';
import { startedFrom } from './snap3/src/analysis/gpu-fitted-flow';
import type { GpuShockFit } from './snap3/src/engine-gpu/shock-fitting-gpu';
import { CPU_NOISE, FITTED_DRAG_FLOOR, ORDER_TOLERANCE } from './snap3/src/analysis/verified-drag';
import { refineUntilVerified } from './snap3/src/verification/grid-convergence';
import type { Primitive2D } from './snap3/src/scheme/flux';

const OUT = process.env.OUT!;
const STATE = process.env.STATE!;
const c = caseOf(process.env.CASE!);
const family = process.env.FAMILY ?? 'default';
const scale = Number(process.env.SCALE ?? 1);
const maxRef = Number(process.env.MAXREF ?? 8);
const COMMIT = readFileSync('tests/tmp-subtip/snap3/COMMIT', 'utf8').trim();
const log = (o: object) =>
  appendFileSync(OUT, JSON.stringify({ t: new Date().toISOString(), commit: COMMIT, id: c.id, family, scale, ...o }) + '\n');

/** The SettlingValue estimate of what remains, with its rate test, returning the estimate. */
class Remaining {
  private readonly values: number[] = [];
  private readonly measurable: [number, number][] = [];
  passes = 0;
  constructor(private readonly noise: number, private readonly knownRate: number, private readonly tol: number) {}
  get measuredRate(): number {
    const pts = this.measurable.slice(-8);
    if (pts.length < 2) return Number.NaN;
    const mx = pts.reduce((s, [x]) => s + x, 0) / pts.length;
    const my = pts.reduce((s, [, y]) => s + y, 0) / pts.length;
    let sxy = 0, sxx = 0;
    for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
    return Math.exp(sxy / sxx);
  }
  get rate(): number {
    const usable = [this.measuredRate, this.knownRate].filter((r) => r < 1);
    return usable.length > 0 ? Math.max(...usable) : Number.NaN;
  }
  get rateToPassOn(): number { const m = this.measuredRate; return m < 1 ? m : this.knownRate; }
  /** Adds a value; returns the estimated remaining error (absolute), Infinity if unknown. */
  add(value: number): number {
    const n = this.values.length;
    const change = Math.abs(value - (this.values[n - 1] ?? Number.NaN));
    this.values.push(value);
    if (change > 10 * this.noise * Math.abs(value)) this.measurable.push([n, Math.log(change)]);
    const rate = this.rate;
    if (!(rate < 1)) return Infinity;
    const k = Math.max(1, Math.ceil(Math.log(0.5) / Math.log(rate)));
    if (n < k) return Infinity;
    const f = rate ** k;
    return (Math.abs(value - this.values[n - k]!) * f) / (1 - f);
  }
}

interface Saved { heights: number[]; ni: number; nj: number; cells: Float64Array; iterations: number; rate: number }
const save = (path: string, heights: readonly number[], ni: number, nj: number, cell: (i: number, j: number) => Primitive2D, iterations: number, rate: number) => {
  const a = new Float64Array(6 + heights.length + 4 * ni * nj);
  a[0] = heights.length; a[1] = ni; a[2] = nj; a[3] = iterations; a[4] = rate; a[5] = 0;
  heights.forEach((h, k) => (a[6 + k] = h));
  let o = 6 + heights.length;
  for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) { const w = cell(i, j); a[o++] = w.rho; a[o++] = w.u; a[o++] = w.v; a[o++] = w.p; }
  writeFileSync(path + '.tmp', Buffer.from(a.buffer));
  renameSync(path + '.tmp', path);
};
const load = (path: string): Saved => {
  const b = readFileSync(path);
  const a = new Float64Array(b.buffer, b.byteOffset, b.byteLength / 8);
  const nh = a[0]!, ni = a[1]!, nj = a[2]!;
  return { heights: Array.from(a.subarray(6, 6 + nh)), ni, nj, cells: a.slice(6 + nh), iterations: a[3]!, rate: a[4]! };
};
const cellOf = (s: Saved) => (i: number, j: number): Primitive2D => {
  const o = 4 * (i + j * s.ni);
  return { rho: s.cells[o]!, u: s.cells[o + 1]!, v: s.cells[o + 2]!, p: s.cells[o + 3]! };
};

test(`family ${c.id} ${family}`, async () => {
  const body = bodyOf(c);
  const problemAt = (refinement: number): FitProblem =>
    sharpFitProblem(body, { mach: c.mach, gamma, nj: 20, refinement, columnDensityScale: scale });
  const done = new Map<number, { drag: number }>();
  if (existsSync(OUT)) {
    for (const l of readFileSync(OUT, 'utf8').split('\n')) {
      if (!l) continue;
      const d = JSON.parse(l);
      if (d.kind === 'level' && d.id === c.id && d.family === family) done.set(d.refinement, d);
    }
  }
  const finalPath = (r: number) => `${STATE}/${c.id}-${family}-r${r}.bin`;
  const ckptPath = (r: number) => `${STATE}/${c.id}-${family}-r${r}.ckpt.bin`;
  for (let r = 1; r <= maxRef; r *= 2) {
    if (done.has(r) && existsSync(finalPath(r))) continue;
    const t0 = Date.now();
    const fresh = problemAt(r);
    let problem = fresh;
    let start = 'cold';
    let offset = 0;
    let knownRate = Number.NaN;
    if (r > 1) {
      const prev = load(finalPath(r / 2));
      knownRate = prev.rate;
      const warm = startedFrom(fresh, problemAt(r / 2), { heights: prev.heights, cell: cellOf(prev) } as unknown as GpuShockFit);
      if (warm === null) throw new Error('the grids do not nest');
      problem = warm;
      start = 'warm';
    }
    if (existsSync(ckptPath(r))) {
      const ck = load(ckptPath(r));
      problem = { ...fresh, heights: ck.heights, initial: cellOf(ck) };
      offset = ck.iterations;
      if (ck.rate < 1) knownRate = ck.rate;
      start = `checkpoint at ${offset}`;
    }
    const settle = new Remaining(1e-10, knownRate, 1e-9);
    // The drags at the checks before the checkpoint, so that the remaining
    // error can be estimated at once after a resume (two fresh passes are
    // still required).
    const drags: number[] = [];
    let seeded = 0;
    if (offset > 0 && existsSync(ckptPath(r) + '.json')) {
      const side = JSON.parse(readFileSync(ckptPath(r) + '.json', 'utf8')) as { iterations: number; drags: number[] };
      if (side.iterations === offset) {
        for (const d of side.drags) { settle.add(d); drags.push(d); }
        seeded = side.drags.length;
        start += `, ${seeded} checks seeded`;
      }
    }
    const history: number[][] = [];
    let passes = 0;
    let lastRemaining = Infinity;
    const checkEvery = 100 * r;
    let lastCheckpoint = Date.now();
    const result = fittedFlow(problem, 20000 * r - offset, (s) => {
      if (s.iterations % checkEvery !== 0) return false;
      const drag = problem.drag(s.solver.boundaryFluxes('jMin'));
      const remaining = settle.add(drag);
      drags.push(drag);
      lastRemaining = remaining;
      history.push([s.iterations + offset, s.maxSpeed, s.residual, drag, remaining]);
      const ok = remaining < 1e-9 * Math.abs(drag) && s.maxSpeed < 1e-9;
      passes = ok ? passes + 1 : 0;
      if (r >= 4 && Date.now() - lastCheckpoint > 15 * 60 * 1000) {
        lastCheckpoint = Date.now();
        save(ckptPath(r), s.heights, s.solver.metrics.ni, s.solver.metrics.nj, (i, j) => s.solver.primitive(i, j), s.iterations + offset, settle.rateToPassOn);
        writeFileSync(ckptPath(r) + '.json.tmp', JSON.stringify({ iterations: s.iterations + offset, drags: drags.slice(-32) }));
        renameSync(ckptPath(r) + '.json.tmp', ckptPath(r) + '.json');
        log({ kind: 'checkpoint', refinement: r, iterations: s.iterations + offset, drag, remaining, speed: s.maxSpeed });
      }
      return passes >= 2;
    });
    const { fit, drag } = result;
    const cell = (i: number, j: number) => fit.solver.primitive(i, j);
    const failure = fittedCaseFailure(problem, fit.grid, cell);
    save(finalPath(r), fit.heights, fit.grid.ni, fit.grid.nj, cell, fit.iterations + offset, settle.rateToPassOn);
    log({
      kind: 'level', refinement: r, nj: fit.grid.nj, ni: fit.grid.ni, start, drag,
      remaining: lastRemaining, remainingRelative: lastRemaining / Math.abs(drag),
      stoppedEarly: fit.stoppedEarly === true, converged: fit.converged, iterations: fit.iterations + offset,
      maxSpeed: fit.maxSpeed, residual: fit.residual, rateMeasured: settle.measuredRate, knownRate,
      failure: failure ?? null, elapsed: (Date.now() - t0) / 1000, history,
    });
    done.set(r, { drag });
  }
  const values = new Map([...done].map(([r, d]) => [r, d.drag]));
  const verified = await refineUntilVerified((r) => values.get(r)!, {
    orderTolerance: ORDER_TOLERANCE, noise: CPU_NOISE, floor: FITTED_DRAG_FLOOR, tolerance: 0, maxRefinement: maxRef,
  });
  log({ kind: 'verified', result: verified });
});
