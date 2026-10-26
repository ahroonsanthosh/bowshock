/**
 * The boat-tail term behind blunt noses against the method of
 * characteristics (docs/design/0023-boat-tails.md section 2.6, registered
 * 2026-10-26 before any of it is run): for each case of BLUNT_CASES
 * (./cases.ts), the fitted family on nj = 20, 40, 80 (and 160 if asked),
 * each grid's converged state kept; a scan of the base grid's lines for
 * those a march can start from (supersonic everywhere on the line, the
 * shoulder outside the line's own domain of dependence); and the march
 * from the registered lines of each grid's flow, on 640, 1280 and 2560
 * intervals, over the shoulder's fan and the boat-tail to the base. Every
 * result is a JSON line appended to out-blunt/<case>.jsonl and skipped
 * when present; fits run in chunks with their state saved in CKPT, so a
 * restart loses at most one chunk (as ./lane.test.ts). Run:
 * ONLY=./blunt-lane.test.ts nice -n 10 npx vitest run --config docs/research/boat-tails/vitest.config.ts
 *
 * Env: CASES (names), REFINEMENTS (default 1,2,4), MOC (default
 * 640,1280,2560), LINES (base-grid line indices to march from, comma-
 * separated, for trials; default: the registered rule's, registeredLines;
 * none: scan only), SKIP_FIT=1, OUT_DIR, CKPT, CHUNK, MAX_STEPS.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { it } from 'vitest';
import {
  baseMach,
  bluntFitFamily,
  bluntStart,
  fittedCaseFailure,
  fittedFlow,
  type FitProblem,
} from '../../../src/analysis/fitted-flow';
import { Euler2D } from '../../../src/engine-cpu/euler2d';
import { bodyLength, bodyRadius, shoulderPosition, type Body } from '../../../src/geometry/body';
import { gridOnLines } from '../../../src/grid/blunt-grid';
import { gridQuality } from '../../../src/grid/quality';
import type { Primitive2D } from '../../../src/scheme/flux';
import {
  characteristicsFrom,
  type StartingLine,
  type StartingState,
} from '../../../src/validation/characteristics';
import { BLUNT_CASES, GAMMA, caseBody, type BoatTailCase } from './cases';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const OUT = process.env.OUT_DIR ?? here('./out-blunt');
const CKPT = process.env.CKPT ?? here('./ckpt');
const REFINEMENTS = (process.env.REFINEMENTS ?? '1,2,4').split(',').map(Number);
const MOC_INTERVALS = (process.env.MOC ?? '640,1280,2560').split(',').map(Number);
const CHUNK = Number(process.env.CHUNK ?? 100);
const MAX_STEPS = Number(process.env.MAX_STEPS ?? 60000);

/**
 * The base-grid lines a case is marched from, by the rule registered in
 * 0023 section 2.6: of the lines the scan on nj = 20 finds usable, the
 * first (nearest the tip), the one nearest half the nose's length, and the
 * last (nearest the shoulder), each once.
 */
export function registeredLines(
  scanned: readonly { line: number; x: number; usable: boolean }[],
  noseLength: number,
): number[] {
  const usable = scanned.filter((d) => d.usable).sort((a, b) => a.line - b.line);
  if (usable.length === 0) return [];
  const half = usable.reduce((best, d) =>
    Math.abs(d.x - noseLength / 2) < Math.abs(best.x - noseLength / 2) ? d : best,
  );
  return [...new Set([usable[0]!.line, half.line, usable[usable.length - 1]!.line])].sort((a, b) => a - b);
}

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

function loadState(path: string): { saved: Saved; data: Float64Array } | null {
  if (!existsSync(`${path}.json`) || !existsSync(`${path}.bin`)) return null;
  const saved = JSON.parse(readFileSync(`${path}.json`, 'utf8')) as Saved;
  const buffer = readFileSync(`${path}.bin`);
  const data = new Float64Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 8);
  return data.length === 4 * saved.ni * saved.nj ? { saved, data } : null;
}

const cellOf =
  (data: Float64Array, ni: number) =>
  (i: number, j: number): Primitive2D => {
    const k = 4 * (i + j * ni);
    return { rho: data[k]!, u: data[k + 1]!, v: data[k + 2]!, p: data[k + 3]! };
  };

/** Each grid's fit, resumable; its converged state kept for the marches. */
function runFamily(c: BoatTailCase, family: (r: number) => FitProblem): void {
  const body = caseBody(c);
  const xs = shoulderPosition(body);
  for (const r of REFINEMENTS) {
    const converged = `${CKPT}/blunt-${c.name}-r${r}-converged`;
    if (results(c).some((d) => d.kind === 'fit' && d.refinement === r)) continue;
    const problem = family(r);
    const chunk = `${CKPT}/blunt-${c.name}-r${r}-chunk`;
    const resumed = loadState(chunk);
    let start = problem;
    let steps = 0;
    if (resumed && resumed.saved.ni === problem.lines.length - 1 && resumed.saved.nj === problem.nj) {
      start = { ...problem, heights: resumed.saved.heights, initial: cellOf(resumed.data, resumed.saved.ni) };
      steps = resumed.saved.steps;
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
        saveState(converged, saved, cell);
        record(c, {
          kind: 'fit',
          refinement: r,
          converged: fit.converged,
          steps,
          maxSpeed: fit.maxSpeed,
          residual: fit.residual,
          ni: fit.grid.ni,
          shoulderLine: problem.lines.findIndex((l) => Math.abs(l.x - xs) < 1e-12),
          nose: problem.drag(wall),
          tail: problem.boatTailDrag!(wall),
          maxAspect: q.maxAspectRatio,
          maxSizeRatio: q.maxSizeRatio,
          minWallAngleDeg: (q.minWallAngle * 180) / Math.PI,
          baseMach: baseMach(problem, fit.grid, cell),
          failure: fittedCaseFailure(problem, fit.grid, cell) ?? null,
          seconds: (Date.now() - t0) / 1000,
        });
        rmSync(`${chunk}.json`, { force: true });
        rmSync(`${chunk}.bin`, { force: true });
        break;
      }
      saveState(chunk, saved, cell);
      start = { ...problem, heights: saved.heights, initial: cell };
    }
  }
}

/** A converged grid's flow, rebuilt from its saved state: what a line's data needs. */
interface Flow {
  readonly body: Body;
  readonly mach: number;
  readonly ni: number;
  readonly nj: number;
  readonly lines: FitProblem['lines'];
  readonly heights: readonly number[];
  readonly centroidX: ArrayLike<number>;
  readonly centroidY: ArrayLike<number>;
  readonly data: Float64Array;
  readonly wall: readonly { x: number; nx: number; ny: number; flux: readonly number[] }[];
}

function flowOf(problem: FitProblem, body: Body, state: { saved: Saved; data: Float64Array }): Flow {
  const { saved, data } = state;
  const grid = gridOnLines(problem.lines, saved.heights, problem.nj, problem.baseRadius, false);
  const solver = new Euler2D(problem.configFor(grid, []));
  solver.setCellPrimitives(cellOf(data, saved.ni));
  return {
    body,
    // The fitted solver's own Mach number: its speed is rounded to 32 bits (freeStreamAt).
    mach: problem.freeStream.u / Math.sqrt(GAMMA),
    ni: saved.ni,
    nj: saved.nj,
    lines: problem.lines,
    heights: saved.heights,
    centroidX: solver.metrics.centroidX,
    centroidY: solver.metrics.centroidY,
    data,
    wall: solver.boundaryFluxes('jMin').map((f) => ({ x: f.x, nx: f.nx, ny: f.ny, flux: [...f.flux] })),
  };
}

const lagrange = (ss: readonly number[], fs: readonly number[], s: number) => {
  let sum = 0;
  for (let a = 0; a < ss.length; a++) {
    let w = 1;
    for (let b = 0; b < ss.length; b++) if (b !== a) w *= (s - ss[b]!) / (ss[a]! - ss[b]!);
    sum += w * fs[a]!;
  }
  return sum;
};

/**
 * The flow on grid line i as a march's starting line, as 0006's two-scale
 * noses took it (docs/research/two-scale-noses/runners/tmp-haackmoc/fitdata.ts):
 * each row of cells interpolated across the line (cubic through the four
 * nearest centroids, in their signed distance from it), the row next to
 * the wall left out, the wall pressure that of the wall faces (cubic in
 * x), the wall entropy extrapolated (cubic) from the next four rows, the
 * wall speed from the total enthalpy, the shock node and its angle from
 * the three nodes about it.
 */
function lineData(f: Flow, i: number): { start: StartingLine; minMach: number; x: number } {
  const { ni, nj, data } = f;
  if (!(i >= 2 && i <= ni - 2)) throw new RangeError('the line needs two columns of cells on either side');
  const l = f.lines[i]!;
  const rows: { t: number; rho: number; u: number; v: number; p: number }[] = [];
  for (let j = 0; j < nj; j++) {
    const cols = [i - 2, i - 1, i, i + 1];
    const ds: number[] = [];
    const ts: number[] = [];
    for (const col of cols) {
      const k = col + j * ni;
      const ex = f.centroidX[k]! - l.x;
      const ey = f.centroidY[k]! - l.y;
      ds.push(ex * l.dy - ey * l.dx);
      ts.push(ex * l.dx + ey * l.dy);
    }
    const at = (q: number) =>
      lagrange(
        ds,
        cols.map((col) => data[4 * (col + j * ni) + q]!),
        0,
      );
    rows.push({ t: lagrange(ds, ts, 0), rho: at(0), u: at(1), v: at(2), p: at(3) });
  }
  const wallRow = rows.shift()!;
  const first4 = rows.slice(0, 4);
  const k = (r: { rho: number; p: number }) => r.p / r.rho ** GAMMA;
  const faces = [i - 2, i - 1, i, i + 1].map((t) => f.wall[t]!);
  const pWall = lagrange(
    faces.map((w) => w.x),
    faces.map((w) => w.flux[1]! * w.nx + w.flux[2]! * w.ny),
    l.x,
  );
  const kWall = lagrange(
    first4.map((r) => r.t),
    first4.map(k),
    0,
  );
  const rhoWall = (pWall / kWall) ** (1 / GAMMA);
  const cp = GAMMA / (GAMMA - 1);
  const uInf = f.mach * Math.sqrt(GAMMA);
  const vWall = Math.sqrt(2 * (cp + 0.5 * uInf * uInf - (cp * pWall) / rhoWall));
  const wallState: StartingState = { x: l.x, y: bodyRadius(f.body, l.x), rho: rhoWall, u: vWall, v: 0, p: pWall };
  const node = (col: number) => {
    const ll = f.lines[col]!;
    const h = f.heights[col]!;
    return { x: ll.x + h * ll.dx, y: ll.y + h * ll.dy };
  };
  const a = node(i - 1);
  const b = node(i);
  const c = node(i + 1);
  const s1 = Math.hypot(b.x - a.x, b.y - a.y);
  const s2 = Math.hypot(c.x - b.x, c.y - b.y);
  const deriv = (fa: number, fb: number, fc: number) =>
    (-s2 / (s1 * (s1 + s2))) * fa + ((s2 - s1) / (s1 * s2)) * fb + (s1 / (s2 * (s1 + s2))) * fc;
  const shockAngle = Math.atan2(deriv(a.y, b.y, c.y), deriv(a.x, b.x, c.x));
  const points: StartingState[] = [
    wallState,
    ...rows.map((r) => ({ x: l.x + r.t * l.dx, y: l.y + r.t * l.dy, rho: r.rho, u: r.u, v: r.v, p: r.p })),
    { x: b.x, y: b.y, rho: 1, u: 1, v: 0, p: 1 },
  ];
  const machOf = (r: { rho: number; u: number; v: number; p: number }) =>
    Math.hypot(r.u, r.v) / Math.sqrt((GAMMA * r.p) / r.rho);
  return {
    start: { points, shockAngle },
    minMach: Math.min(...rows.map(machOf), machOf(wallRow), vWall / Math.sqrt((GAMMA * pWall) / rhoWall)),
    x: l.x,
  };
}

/** The boat-tail's drag from a wall-pressure profile (the march's), shoulder to base (./lane.test.ts). */
function profileTailDrag(
  wall: readonly { x: number; p: number }[],
  body: Body,
  xs: number,
  xb: number,
  mach: number,
): number {
  const q = 0.5 * GAMMA * mach * mach;
  const R = body.nose.baseRadius;
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

/** Whether a march can start from base-grid line i of the coarsest grid, and why not. */
function scan(c: BoatTailCase, flow: Flow, shoulderLine: number): void {
  if (results(c).some((d) => d.kind === 'scan')) return;
  for (let i = 2; i < shoulderLine; i++) {
    const d = lineData(flow, i);
    let reason: string | null = null;
    if (d.minMach < 1.05) {
      reason = 'not supersonic by 5% everywhere on the line';
    } else {
      try {
        characteristicsFrom(flow.body, d.start, { mach: flow.mach, gamma: GAMMA, intervals: 8 });
      } catch (e) {
        reason = (e as Error).message;
      }
    }
    record(c, { kind: 'scan', line: i, x: d.x, minMach: d.minMach, usable: reason === null, reason });
  }
}

function runMarches(c: BoatTailCase, lines: readonly number[], flows: ReadonlyMap<number, Flow>): void {
  const asked = caseBody(c);
  const xs = shoulderPosition(asked);
  const xb = bodyLength(asked);
  for (const [r, flow] of flows) {
    for (const base of lines) {
      const d = lineData(flow, base * r);
      for (const n of MOC_INTERVALS) {
        const done = results(c).some(
          (e) => e.kind === 'moc' && e.refinement === r && e.line === base && e.intervals === n,
        );
        if (done) continue;
        const t0 = Date.now();
        try {
          const sol = characteristicsFrom(flow.body, d.start, { mach: flow.mach, gamma: GAMMA, intervals: n });
          record(c, {
            kind: 'moc',
            refinement: r,
            line: base,
            x: d.x,
            minMach: d.minMach,
            intervals: n,
            tail: profileTailDrag(sol.wall, flow.body, xs, xb, flow.mach),
            corner: sol.wall.filter((w) => w.x === xs).map((w) => w.p),
            massBalance: sol.massBalance,
            startMassDefect: sol.startMassDefect,
            penetration: sol.penetration,
            seconds: (Date.now() - t0) / 1000,
          });
        } catch (e) {
          record(c, { kind: 'moc', refinement: r, line: base, intervals: n, error: (e as Error).message });
        }
      }
    }
  }
}

it('the boat-tail term behind blunt noses, against the method of characteristics', () => {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(CKPT, { recursive: true });
  const only = process.env.CASES?.split(',');
  for (const c of BLUNT_CASES.filter((k) => !only || only.includes(k.name))) {
    const asked = caseBody(c);
    const options = { mach: c.mach, gamma: GAMMA, nj: 20 };
    const start = bluntStart(asked, options);
    const family = bluntFitFamily(asked, options, start);
    if (process.env.SKIP_FIT !== '1') runFamily(c, family);
    const flows = new Map<number, Flow>();
    for (const r of REFINEMENTS) {
      const state = loadState(`${CKPT}/blunt-${c.name}-r${r}-converged`);
      if (state) flows.set(r, flowOf(family(r), start.body, state));
    }
    const coarse = flows.get(1);
    if (!coarse) continue;
    const shoulderLine = family(1).lines.findIndex((l) => Math.abs(l.x - shoulderPosition(asked)) < 1e-12);
    scan(c, coarse, shoulderLine);
    const scanned = results(c).filter((d) => d.kind === 'scan') as unknown as {
      line: number;
      x: number;
      usable: boolean;
    }[];
    const lines =
      process.env.LINES === 'none'
        ? []
        : process.env.LINES !== undefined && process.env.LINES !== ''
          ? process.env.LINES.split(',').map(Number)
          : registeredLines(scanned, asked.nose.length);
    runMarches(c, lines, flows);
  }
});
