/**
 * Rung (b0) of design record 0021 (section 4.2): 0005's captured families rerun on the 2D CPU engine at a
 * refinement ratio of 1.5 (nj = 32, 48, 72, 108), against their exact values, to test whether 0005's order
 * rule (two triples, orders capped at 2, agreeing within 0.5) still separates them at that ratio. Pass: every
 * band the procedure gives at ratio 1.5, floor included, contains its true error.
 *
 * The families (0005): the cone surface pressure, mean over 0.5 to 0.95 of the cone's length, of four cones
 * (floor 2e-4); the forebody pressure drag of two cones and the TN 3716 ogive, and the audit's seven (floor
 * 1e-3, DRAG_FLOOR). Exact values: Taylor-Maccoll for cones; the method of characteristics from the tip,
 * extrapolated from 1280 and 2560 intervals, for the ogives and the parabolic nose.
 *
 * Each solved level is appended to docs/research/solver3d/out/rung-b0-levels.jsonl as it finishes (a
 * restarted run skips the levels already there); the verdicts go to out/rung-b0.json. Run (about a day, one
 * core):
 *   ONLY=./rung-b0.test.ts nice -n 10 npx vitest run --config docs/research/solver3d/vitest.config.ts
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { forebodyPressureDrag, pressureDragFromProfile } from '../../../src/analysis/forces';
import { freeStreamAt } from '../../../src/analysis/verified-drag';
import { Euler2D } from '../../../src/engine-cpu/euler2d';
import { bodyRadius, type Body } from '../../../src/geometry/body';
import { bodyGrid } from '../../../src/grid/body-grid';
import { characteristics } from '../../../src/validation/characteristics';
import { taylorMaccoll } from '../../../src/validation/taylor-maccoll';
import { gridConvergence } from '../../../src/verification/grid-convergence';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
const LEVELS = join(OUT, 'rung-b0-levels.jsonl');
const GAMMA = 1.4;
const DEG = Math.PI / 180;
const NJ = [32, 48, 72, 108];

interface Family {
  readonly id: string;
  readonly quantity: 'cone pressure' | 'drag';
  readonly mach: number;
  readonly body: Body;
  readonly floor: number;
}

const cone = (half: number, cylinder = 2): Body => ({
  nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(half * DEG), baseRadius: 0.5 },
  cylinderLength: cylinder,
});
const ogive3: Body = { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 }, cylinderLength: 2 };
const tn3716: Body = { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 }, cylinderLength: 7 };
const parabolic: Body = { nose: { shape: { kind: 'parabolic', parameter: 0.5 }, length: 3, baseRadius: 0.5 }, cylinderLength: 2 };

const FAMILIES: readonly Family[] = [
  { id: 'cone-p M3 20deg', quantity: 'cone pressure', mach: 3, body: cone(20), floor: 2e-4 },
  { id: 'cone-p M2 15deg', quantity: 'cone pressure', mach: 2, body: cone(15), floor: 2e-4 },
  { id: 'cone-p M1.3 10deg', quantity: 'cone pressure', mach: 1.3, body: cone(10), floor: 2e-4 },
  { id: 'cone-p M1.41 24deg', quantity: 'cone pressure', mach: 1.41, body: cone(24), floor: 2e-4 },
  { id: 'drag cone M2 15deg', quantity: 'drag', mach: 2, body: cone(15), floor: 1e-3 },
  { id: 'drag cone M3 20deg', quantity: 'drag', mach: 3, body: cone(20), floor: 1e-3 },
  { id: 'drag TN 3716 ogive M1.98', quantity: 'drag', mach: 1.98, body: tn3716, floor: 1e-3 },
  { id: 'drag cone M1.5 10deg', quantity: 'drag', mach: 1.5, body: cone(10), floor: 1e-3 },
  { id: 'drag cone M4 12deg', quantity: 'drag', mach: 4, body: cone(12), floor: 1e-3 },
  { id: 'drag cone M2.5 25deg', quantity: 'drag', mach: 2.5, body: cone(25), floor: 1e-3 },
  { id: 'drag cone M5 8deg', quantity: 'drag', mach: 5, body: cone(8), floor: 1e-3 },
  { id: 'drag tangent ogive 3 M2', quantity: 'drag', mach: 2, body: ogive3, floor: 1e-3 },
  { id: 'drag tangent ogive 3 M4', quantity: 'drag', mach: 4, body: ogive3, floor: 1e-3 },
  { id: 'drag parabolic 0.5, 3, M3', quantity: 'drag', mach: 3, body: parabolic, floor: 1e-3 },
];

/** The exact value of a family's quantity. */
function exactValue(f: Family): number {
  const free = freeStreamAt(f.mach, GAMMA);
  if (f.body.nose.shape.kind === 'conical') {
    const half = Math.atan(f.body.nose.baseRadius / f.body.nose.length);
    return taylorMaccoll(f.mach, half, GAMMA).surfacePressureCoefficient;
  }
  const value = (n: number) => {
    const sol = characteristics(f.body, { mach: f.mach, gamma: GAMMA, intervals: n, start: 1e-3 });
    const tip = taylorMaccoll(f.mach, Math.atan(slopeAtTip(f.body)), GAMMA);
    const pTip = free.pressure + tip.surfacePressureCoefficient * free.dynamicPressure;
    const pts = sol.wall.map((w) => ({ x: w.x, p: w.p * free.pressure }));
    return pressureDragFromProfile(pts, (x) => bodyRadius(f.body, x), free, f.body.nose.baseRadius, pTip);
  };
  const a = value(1280);
  const b = value(2560);
  return b + (b - a) / 3;
}

function slopeAtTip(b: Body): number {
  const dx = 1e-7 * b.nose.length;
  return bodyRadius(b, dx) / dx;
}

/** Solve one level: the converged quantity, its steps and its last relative change. */
function solveLevel(f: Family, nj: number): { value: number; steps: number; change: number; cells: number } {
  const free = freeStreamAt(f.mach, GAMMA);
  const { grid } = bodyGrid(f.body, { nj, refinement: 1, mach: f.mach, gamma: GAMMA });
  const engine = new Euler2D({
    grid,
    geometry: 'axisymmetric',
    gamma: GAMMA,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'inflow', state: free.state },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'inflow', state: free.state },
    },
  });
  engine.setInitialCondition(() => free.state);
  const quantity = () => {
    const wall = engine.boundaryFluxes('jMin');
    if (f.quantity === 'drag') return forebodyPressureDrag(wall, free, f.body.nose.baseRadius);
    // Mean pressure coefficient over 0.5 to 0.95 of the cone's length, by face area.
    const L = f.body.nose.length;
    let sum = 0;
    let area = 0;
    for (const face of wall) {
      if (face.x < 0.5 * L || face.x > 0.95 * L) continue;
      const p = face.flux[1] * face.nx + face.flux[2] * face.ny;
      sum += ((p - free.pressure) / free.dynamicPressure) * face.area;
      area += face.area;
    }
    return sum / area;
  };
  const batch = Math.round(25 * nj);
  let last = Number.NaN;
  let change = Infinity;
  let steps = 0;
  for (let k = 0; k < 400; k++) {
    engine.iterate(batch);
    steps += batch;
    const v = quantity();
    change = Math.abs(v - last) / Math.abs(v);
    last = v;
    if (change < 1e-12) break;
  }
  return { value: last, steps, change, cells: grid.ni * grid.nj };
}

test('rung (b0): 0005\'s captured families at ratio 1.5', { timeout: 86_400_000 * 3 }, () => {
  mkdirSync(OUT, { recursive: true });
  const done = new Map<string, { value: number }>();
  if (existsSync(LEVELS)) {
    for (const line of readFileSync(LEVELS, 'utf8').split('\n').filter(Boolean)) {
      const r = JSON.parse(line) as { family: string; nj: number; value: number };
      done.set(`${r.family}|${r.nj}`, r);
    }
  }
  const verdicts: Record<string, unknown>[] = [];
  let pass = true;
  for (const f of FAMILIES) {
    const exact = exactValue(f);
    const values: number[] = [];
    for (const nj of NJ) {
      const key = `${f.id}|${nj}`;
      let r = done.get(key);
      if (r === undefined) {
        const t0 = Date.now();
        const s = solveLevel(f, nj);
        const row = { family: f.id, nj, ...s, exact, seconds: (Date.now() - t0) / 1000, date: new Date().toISOString() };
        appendFileSync(LEVELS, JSON.stringify(row) + '\n');
        r = row;
      }
      values.push(r.value);
    }
    const e = gridConvergence(values, { orderTolerance: 0.5, noise: 1e-12, ratio: 1.5 });
    const trueError = Math.abs(values[3]! - exact);
    let band: number | null = null;
    if (e.kind === 'monotone' || e.kind === 'oscillatory') band = e.uncertainty + f.floor * Math.abs(values[3]!);
    const contains = band === null ? null : trueError <= band;
    if (contains === false) pass = false;
    verdicts.push({
      family: f.id,
      quantity: f.quantity,
      exact,
      values,
      errors: values.map((v) => v / exact - 1),
      estimate: e,
      band,
      trueError,
      bandContainsError: contains,
    });
    writeFileSync(join(OUT, 'rung-b0.json'), JSON.stringify({ date: new Date().toISOString(), ratio: 1.5, nj: NJ, families: verdicts }, null, 2) + '\n');
  }
  expect(pass).toBe(true);
});
