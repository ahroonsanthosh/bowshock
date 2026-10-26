/**
 * The boat-tail term's reference lane (docs/design/0023-boat-tails.md
 * section 2.3; ./README.md): for each case of ./cases.ts, the method of
 * characteristics on 640, 1280 and 2560 intervals, linearised theory, and
 * the fitted family on nj = 20, 40, 80 and 160 (CPU), each finer grid
 * started from the converged one before. Resumable: every result is a
 * line of JSON appended to out/<case>.jsonl and skipped when present; a
 * fit is run in chunks, its state saved after each in CKPT (default
 * ./ckpt, not committed), so a restart loses at most one chunk.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { it } from 'vitest';
import {
  baseMach,
  fittedCaseFailure,
  fittedFlow,
  sharpFitProblem,
  type FitProblem,
} from '../../../src/analysis/fitted-flow';
import { BOAT_TAIL_MACH_RANGE } from '../../../src/analysis/boat-tail';
import { freeStreamAt } from '../../../src/analysis/verified-drag';
import { bodyLength, bodyRadius, shoulderPosition, type Body } from '../../../src/geometry/body';
import { gridQuality } from '../../../src/grid/quality';
import type { Primitive2D } from '../../../src/scheme/flux';
import { characteristics } from '../../../src/validation/characteristics';
import { linearBoatTailDrag } from '../../../src/validation/linear-body';
import { CASES, FOUR_GRIDS, GAMMA, RM_E51F26, caseBody, type BoatTailCase } from './cases';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const OUT = process.env.OUT_DIR ?? here('./out');
const CKPT = process.env.CKPT ?? here('./ckpt');
const REFINEMENTS = (process.env.REFINEMENTS ?? '1,2,4,8').split(',').map(Number);
const MOC_INTERVALS = (process.env.MOC ?? '640,1280,2560').split(',').map(Number);
/** Fit steps per chunk on the base grid, times the refinement. */
const CHUNK = Number(process.env.CHUNK ?? 100);
/** Steps allowed per grid on the base grid, times the refinement. */
const MAX_STEPS = Number(process.env.MAX_STEPS ?? 60000);

interface Saved {
  readonly ni: number;
  readonly nj: number;
  readonly heights: number[];
  readonly steps: number;
}

function results(c: BoatTailCase): Record<string, unknown>[] {
  const file = `${OUT}/${c.name}.jsonl`;
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

function record(c: BoatTailCase, entry: Record<string, unknown>): void {
  appendFileSync(`${OUT}/${c.name}.jsonl`, JSON.stringify({ case: c.name, ...entry }) + '\n');
}

function saveState(path: string, saved: Saved, cell: (i: number, j: number) => Primitive2D): void {
  const data = new Float64Array(4 * saved.ni * saved.nj);
  for (let j = 0; j < saved.nj; j++) {
    for (let i = 0; i < saved.ni; i++) {
      const w = cell(i, j);
      data.set([w.rho, w.u, w.v, w.p], 4 * (i + j * saved.ni));
    }
  }
  writeFileSync(`${path}.tmp.bin`, data);
  writeFileSync(`${path}.tmp.json`, JSON.stringify(saved));
  renameSync(`${path}.tmp.bin`, `${path}.bin`);
  renameSync(`${path}.tmp.json`, `${path}.json`);
}

function loadState(
  path: string,
): { saved: Saved; cell: (i: number, j: number) => Primitive2D } | null {
  if (!existsSync(`${path}.json`) || !existsSync(`${path}.bin`)) return null;
  const saved = JSON.parse(readFileSync(`${path}.json`, 'utf8')) as Saved;
  const buffer = readFileSync(`${path}.bin`);
  const data = new Float64Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 8);
  if (data.length !== 4 * saved.ni * saved.nj) return null;
  return {
    saved,
    cell: (i, j) => {
      const k = 4 * (i + j * saved.ni);
      return { rho: data[k]!, u: data[k + 1]!, v: data[k + 2]!, p: data[k + 3]! };
    },
  };
}

/** The problem started from the converged state of the grid before (as startedFrom, gpu-fitted-flow.ts). */
function nestedStart(
  fine: FitProblem,
  coarse: FitProblem,
  state: { saved: Saved; cell: (i: number, j: number) => Primitive2D },
): FitProblem | null {
  const n = coarse.lines.length - 1;
  if (fine.lines.length - 1 !== 2 * n || fine.nj !== 2 * coarse.nj) return null;
  for (let k = 0; k <= n; k++) {
    if (Math.abs(coarse.lines[k]!.x - fine.lines[2 * k]!.x) > 1e-12 * (1 + Math.abs(fine.lines[2 * k]!.x))) {
      return null;
    }
  }
  const h = state.saved.heights;
  const heights = fine.lines.map((l, i) => {
    if (i % 2 === 0) return h[i / 2]!;
    const a = coarse.lines[(i - 1) / 2]!;
    const b = coarse.lines[(i + 1) / 2]!;
    const t = (l.x - a.x) / (b.x - a.x);
    return h[(i - 1) / 2]! * (1 - t) + h[(i + 1) / 2]! * t;
  });
  return { ...fine, heights, initial: (i, j) => state.cell(Math.floor(i / 2), Math.floor(j / 2)) };
}

/** The boat-tail's drag from a wall-pressure profile (the march's), shoulder to base. */
function profileTailDrag(
  wall: readonly { x: number; p: number }[],
  body: Body,
  xs: number,
  xb: number,
  mach: number,
): number {
  const q = 0.5 * GAMMA * mach * mach;
  const R = body.nose.baseRadius;
  // From the fan's last state at the shoulder.
  let start = wall.findIndex((w) => w.x >= xs);
  while (start + 1 < wall.length && wall[start + 1]!.x <= xs) start++;
  let integral = 0;
  for (let k = Math.max(start, 0); k + 1 < wall.length; k++) {
    const a = wall[k]!;
    let b = wall[k + 1]!;
    if (a.x >= xb) break;
    if (b.x > xb) b = { x: xb, p: a.p + ((xb - a.x) / (b.x - a.x)) * (b.p - a.p) };
    const ra = bodyRadius(body, a.x);
    const rb = bodyRadius(body, b.x);
    integral += (0.5 * (a.p + b.p) - 1) * ((rb * rb - ra * ra) / 2);
  }
  return (2 * integral) / (q * R * R);
}

function solvedBodyOf(c: BoatTailCase): Body {
  const asked = caseBody(c);
  const tail = asked.boatTail!;
  // The fitted problem's continuation (on the base grid): the march does not depend on it.
  const lines = sharpFitProblem(asked, { mach: c.mach, gamma: GAMMA, nj: 20, refinement: 1 }).lines;
  const extra = lines[lines.length - 1]!.x - bodyLength(asked);
  const slope = (asked.nose.baseRadius - tail.baseRadius) / tail.length;
  return { ...asked, boatTail: { length: tail.length + extra, baseRadius: tail.baseRadius - extra * slope } };
}

function runMoc(c: BoatTailCase, done: Record<string, unknown>[]): void {
  const asked = caseBody(c);
  const solved = solvedBodyOf(c);
  const xs = shoulderPosition(asked);
  const xb = bodyLength(asked);
  for (const n of MOC_INTERVALS) {
    if (done.some((d) => d.kind === 'moc' && d.intervals === n)) continue;
    const t0 = Date.now();
    try {
      const sol = characteristics(solved, { mach: c.mach, gamma: GAMMA, intervals: n, start: 1e-3 });
      const corner = sol.wall.filter((w) => w.x === xs).map((w) => w.p);
      const last = sol.wall[sol.wall.length - 1]!;
      record(c, {
        kind: 'moc',
        intervals: n,
        tail: profileTailDrag(sol.wall, solved, xs, xb, c.mach),
        corner,
        lastWallX: last.x,
        massBalance: sol.massBalance,
        penetration: sol.penetration,
        seconds: (Date.now() - t0) / 1000,
      });
    } catch (error) {
      record(c, { kind: 'moc', intervals: n, error: (error as Error).message });
    }
  }
}

function runFamily(c: BoatTailCase, done: Record<string, unknown>[], upTo: number): void {
  const body = caseBody(c);
  const xs = shoulderPosition(body);
  const xb = bodyLength(body);
  const free = freeStreamAt(c.mach, GAMMA);
  let coarse: FitProblem | null = null;
  for (const r of REFINEMENTS.filter((k) => k <= upTo)) {
    const problem = sharpFitProblem(body, { mach: c.mach, gamma: GAMMA, nj: 20, refinement: r });
    const converged = `${CKPT}/${c.name}-r${r}-converged`;
    const chunk = `${CKPT}/${c.name}-r${r}-chunk`;
    const previous: FitProblem | null = coarse;
    coarse = problem;
    if (done.some((d) => d.kind === 'fit' && d.refinement === r)) continue;
    const resumed = loadState(chunk);
    let start: FitProblem = problem;
    let steps = 0;
    if (resumed && resumed.saved.ni === problem.lines.length - 1 && resumed.saved.nj === problem.nj) {
      start = { ...problem, heights: resumed.saved.heights, initial: resumed.cell };
      steps = resumed.saved.steps;
    } else if (previous) {
      const before = loadState(`${CKPT}/${c.name}-r${r / 2}-converged`);
      if (before) start = nestedStart(problem, previous, before) ?? problem;
    }
    const t0 = Date.now();
    for (;;) {
      const { fit } = fittedFlow(start, CHUNK * r);
      steps += fit.iterations;
      const cell = (i: number, j: number) => fit.solver.primitive(i, j);
      const saved: Saved = { ni: fit.grid.ni, nj: fit.grid.nj, heights: [...fit.heights], steps };
      if (fit.converged || steps >= MAX_STEPS * r) {
        const wall = fit.solver.boundaryFluxes('jMin');
        const q = gridQuality(fit.grid);
        // The wall pressure over the boat-tail and a caliber ahead of it, for the shoulder's check.
        const profile = wall
          .filter((f) => f.x > xs - 1 && f.x < xb)
          .map((f) => [
            f.x,
            (f.flux[1] * f.nx + f.flux[2] * f.ny - free.pressure) / free.dynamicPressure,
          ]);
        record(c, {
          kind: 'fit',
          refinement: r,
          converged: fit.converged,
          steps,
          maxSpeed: fit.maxSpeed,
          residual: fit.residual,
          ni: fit.grid.ni,
          nose: problem.drag(wall),
          tail: problem.boatTailDrag!(wall),
          maxAspect: q.maxAspectRatio,
          maxSizeRatio: q.maxSizeRatio,
          minWallAngleDeg: (q.minWallAngle * 180) / Math.PI,
          baseMach: baseMach(problem, fit.grid, cell),
          failure: fittedCaseFailure(problem, fit.grid, cell) ?? null,
          seconds: (Date.now() - t0) / 1000,
          cpWall: profile,
        });
        saveState(converged, saved, cell);
        rmSync(`${chunk}.json`, { force: true });
        rmSync(`${chunk}.bin`, { force: true });
        break;
      }
      saveState(chunk, saved, cell);
      start = { ...problem, heights: saved.heights, initial: cell };
    }
  }
}

it('the boat-tail reference lane', () => {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(CKPT, { recursive: true });
  const only = process.env.CASES?.split(',');
  const set = process.env.SET === 'e51f26' ? RM_E51F26 : CASES;
  const cases = set.filter((k) => !only || only.includes(k.name));

  // The references first (minutes a case), then each grid of every case
  // before the next finer grid of any (nj = 160 takes hours a case).
  for (const c of cases) {
    if (!results(c).some((d) => d.kind === 'linear')) {
      record(c, {
        kind: 'linear',
        tail: linearBoatTailDrag(caseBody(c), { mach: c.mach, intervals: 3200 }),
      });
    }
    if (process.env.SKIP_MOC !== '1') runMoc(c, results(c));
  }
  if (process.env.SKIP_FIT === '1') return;
  // Every case on nj = 20 and 40; the four-grid cases on nj = 80; then,
  // the cases at the Mach numbers served (BOAT_TAIL_MACH_RANGE) before the
  // others, the rest on nj = 80 and the four-grid cases on nj = 160; then
  // the others likewise. A case under way resumes whatever the order.
  const [low, high] = BOAT_TAIL_MACH_RANGE;
  const served = (c: BoatTailCase) => c.mach >= low && c.mach <= high;
  const first = cases.filter((c) => FOUR_GRIDS.includes(c.name));
  const rest = cases.filter((c) => !FOUR_GRIDS.includes(c.name));
  const schedule: [readonly BoatTailCase[], number][] = [
    [cases, 1],
    [cases, 2],
    [first, 4],
    [rest.filter(served), 4],
    [first.filter(served), 8],
    [first.filter((c) => !served(c)), 8],
    [rest.filter((c) => !served(c)), 4],
    [rest, 8],
  ];
  for (const [list, upTo] of schedule) {
    if (!REFINEMENTS.includes(upTo)) continue;
    for (const c of list) runFamily(c, results(c), upTo);
  }
});
