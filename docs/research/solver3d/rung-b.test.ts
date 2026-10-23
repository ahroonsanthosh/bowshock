/**
 * Rungs (b1) and (b2) of docs/design/0021-3d-euler-fins.md (section 4.2), on the CPU: the 3D engine in planar
 * mode, the section extruded across two layers between mirror faces, in 0009 section 2.4's domain (x / c from
 * -0.3 to 1.2, 1.4 chords high; the single wedge's domain ends at its trailing edge).
 *
 * - (b1) identity: the double wedge of t/c 0.08 at Mach 1.5 on 0009's 60 x 28 grid equals the 2D planar engine
 *   on that grid, every cell within 1e-12 (both converged to round-off).
 * - (b2) convergence: seven families at ratio 1.5 from L0 (each segment's count on L0 a multiple of 32: 32 cells
 *   ahead, 32 a segment along the chord, 32 behind; 32 rows) to L5, against exactSectionDrag. Pass: the band
 *   from L0 to L3 (0005's procedure at ratio 1.5, the provisional floor 1e-3 added) exists and contains the
 *   exact value; no band is a failure. Recorded whatever they are: the band without the floor, the orders, the
 *   L0 to L5 values, and the L3 to L5 extrapolation's error (an input of the floor, 4.7).
 *
 * Each level is appended to out/rung-b-levels.jsonl when it finishes (a restart skips those done); verdicts in
 * out/rung-b.json. Run (days, one core):
 *   ONLY=./rung-b.test.ts nice -n 10 npx vitest run --config docs/research/solver3d/vitest.config.ts
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { Euler2D } from '../../../src/engine-cpu/euler2d';
import { doubleWedge, hexagonal, singleWedge, type SymmetricSection } from '../../../src/fins/section';
import { exactSectionDrag } from '../../../src/fins/section-drag';
import { gridFromFunction } from '../../../src/grid/structured';
import { Euler3D } from '../../../src/solver3d/euler3d';
import type { Primitive3D } from '../../../src/solver3d/flux3d';
import { gridFromFunction3D, type StructuredGrid3D } from '../../../src/solver3d/grid3d';
import { gridConvergence } from '../../../src/verification/grid-convergence';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
const LEVELS = join(OUT, 'rung-b-levels.jsonl');
const GAMMA = 1.4;
const X_MIN = -0.3;
const X_MAX = 1.2;
const HEIGHT = 1.4;
const DZ = 0.05;
const FLOOR = 1e-3;

interface Family {
  readonly id: string;
  readonly section: SymmetricSection;
  readonly mach: number;
}

const FAMILIES: readonly Family[] = [
  { id: 'b2.1 double wedge t/c 0.05, M 1.5', section: doubleWedge(0.05), mach: 1.5 },
  { id: 'b2.2 double wedge t/c 0.05, M 2.0', section: doubleWedge(0.05), mach: 2.0 },
  { id: 'b2.3 double wedge t/c 0.05, M 3.0', section: doubleWedge(0.05), mach: 3.0 },
  { id: 'b2.4 double wedge t/c 0.08, M 1.5', section: doubleWedge(0.08), mach: 1.5 },
  { id: 'b2.5 hexagon 30% bevels t/c 0.05, M 2.0', section: hexagonal(0.05, 0.3), mach: 2.0 },
  { id: 'b2.6 single wedge, trailing edge 0.08, M 2.0', section: singleWedge(0.08), mach: 2.0 },
  { id: 'b2.7 double wedge t/c 0.03, M 1.25', section: doubleWedge(0.03), mach: 1.25 },
];

/** The section's upper surface at x (0 outside the chord). */
function surface(section: SymmetricSection, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return section.bluntTrailingEdge === true && x === 1 ? section.halfThickness[section.halfThickness.length - 1]! : 0;
  for (let k = 1; k < section.x.length; k++) {
    if (x <= section.x[k]!) {
      const [x0, x1] = [section.x[k - 1]!, section.x[k]!];
      const [g0, g1] = [section.halfThickness[k - 1]!, section.halfThickness[k]!];
      return g0 + ((g1 - g0) * (x - x0)) / (x1 - x0);
    }
  }
  return 0;
}

/** Column positions: per segment, `base` cells times the level's factor, uniform. */
function columns(section: SymmetricSection, perSegment: (k: number) => number): number[] {
  const blunt = section.bluntTrailingEdge === true;
  const xs = blunt ? [X_MIN, ...section.x] : [X_MIN, ...section.x, X_MAX];
  const nodes = [X_MIN];
  for (let k = 0; k + 1 < xs.length; k++) {
    const n = perSegment(k);
    for (let i = 1; i <= n; i++) nodes.push(i === n ? xs[k + 1]! : xs[k]! + ((xs[k + 1]! - xs[k]!) * i) / n);
  }
  return nodes;
}

function grid3D(section: SymmetricSection, xNodes: readonly number[], nj: number): StructuredGrid3D {
  return gridFromFunction3D(xNodes.length - 1, nj, 2, (i, j, k) => {
    const x = xNodes[i]!;
    const y0 = surface(section, x);
    return [x, y0 + ((HEIGHT - y0) * j) / nj, k * DZ];
  });
}

function engine3D(grid: StructuredGrid3D, mach: number): Euler3D {
  const free: Primitive3D = { rho: 1, u: mach * Math.sqrt(GAMMA), v: 0, w: 0, p: 1 };
  const e = new Euler3D({
    grid,
    geometry: 'planar',
    gamma: GAMMA,
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'inflow', state: free },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'outflow' },
      kMin: { kind: 'wall' },
      kMax: { kind: 'wall' },
    },
  });
  e.setCellPrimitives(() => free);
  return e;
}

/** Section drag coefficient per unit span: both surfaces, on the chord. */
function sectionDrag(e: Euler3D, mach: number): number {
  const f = e.sideFluxes('jMin');
  const { jFaces, ni, nk } = e.metrics;
  let d = 0;
  for (let k = 0; k < nk; k++)
    for (let i = 0; i < ni; i++) {
      const t = i + ni * k;
      // The face's x-momentum flux is the wall's pressure p S_x on the fluid, S pointing into the fluid (out of
      // the body); the body's drag is -(p - p_inf) S_x.
      d -= f[5 * t + 1]! - 1 * jFaces.s0[i + ni * (0 + (e.metrics.nj + 1) * k)]!;
    }
  const q = 0.5 * GAMMA * mach * mach;
  return (2 * d) / (q * nk * DZ);
}

function converge(e: Euler3D, mach: number, chunk: number, maxSteps: number): { cd: number; steps: number; change: number; residual: number } {
  const r0 = e.densityResidualNorm();
  let previous = Number.NaN;
  let steps = 0;
  let change = Infinity;
  let cd = Number.NaN;
  let residual = 1;
  while (steps < maxSteps) {
    e.iterate(chunk);
    steps += chunk;
    cd = sectionDrag(e, mach);
    change = Math.abs(cd / previous - 1);
    previous = cd;
    residual = e.densityResidualNorm() / r0;
    if (residual < 1e-11 && change < 1e-11) break;
  }
  return { cd, steps, change, residual };
}

test('rung (b1): the planar 3D engine equals the 2D planar engine on 0009\'s 60 x 28 grid', { timeout: 86_400_000 }, () => {
  mkdirSync(OUT, { recursive: true });
  const section = doubleWedge(0.08);
  const mach = 1.5;
  // 0009 section 2.4's grid: 0.025 of the chord a column, uniform per segment, 28 rows.
  const xs = [X_MIN, ...section.x, X_MAX];
  const xNodes = [X_MIN];
  for (let k = 0; k + 1 < xs.length; k++) {
    const n = Math.round((xs[k + 1]! - xs[k]!) / 0.025);
    for (let i = 1; i <= n; i++) xNodes.push(xs[k]! + ((xs[k + 1]! - xs[k]!) * i) / n);
  }
  const nj = 28;
  const free = { rho: 1, u: mach * Math.sqrt(GAMMA), v: 0, p: 1 };
  const two = new Euler2D({
    grid: gridFromFunction(xNodes.length - 1, nj, (i, j) => {
      const y0 = surface(section, xNodes[i]!);
      return [xNodes[i]!, y0 + ((HEIGHT - y0) * j) / nj];
    }),
    geometry: 'planar',
    gamma: GAMMA,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: { iMin: { kind: 'inflow', state: free }, iMax: { kind: 'outflow' }, jMin: { kind: 'wall' }, jMax: { kind: 'outflow' } },
  });
  two.setInitialCondition(() => free);
  let best = Infinity;
  let stalls = 0;
  let steps2 = 0;
  while (stalls < 20 && steps2 < 400_000) {
    two.iterate(500);
    steps2 += 500;
    const r = two.densityResidualNorm();
    if (r < 0.9 * best) {
      best = r;
      stalls = 0;
    } else stalls++;
  }
  const three = engine3D(grid3D(section, xNodes, nj), mach);
  three.setCellPrimitives((i, j) => {
    const w = two.primitive(i, j);
    return { rho: w.rho, u: w.u, v: w.v, w: 0, p: w.p };
  });
  let best3 = Infinity;
  stalls = 0;
  let steps3 = 0;
  while (stalls < 20 && steps3 < 100_000) {
    three.iterate(500);
    steps3 += 500;
    const r = three.densityResidualNorm();
    if (r < 0.9 * best3) {
      best3 = r;
      stalls = 0;
    } else stalls++;
  }
  const a = Math.sqrt(GAMMA);
  let worst = 0;
  for (let k = 0; k < 2; k++)
    for (let j = 0; j < nj; j++)
      for (let i = 0; i < xNodes.length - 1; i++) {
        const p = three.primitive(i, j, k);
        const q = two.primitive(i, j);
        worst = Math.max(worst, Math.abs(p.rho - q.rho), Math.abs(p.u - q.u) / a, Math.abs(p.v - q.v) / a, Math.abs(p.w) / a, Math.abs(p.p - q.p));
      }
  const pass = worst < 1e-12;
  writeFileSync(
    join(OUT, 'rung-b1.json'),
    JSON.stringify({ date: new Date().toISOString(), grid: `${xNodes.length - 1} x ${nj}`, steps2D: steps2, residual2D: best, steps3D: steps3, residual3D: best3, largestCellDifference: worst, pass }, null, 2) + '\n',
  );
  expect(pass).toBe(true);
});

test('rung (b2): seven planar families at ratio 1.5, L0 to L5', { timeout: 86_400_000 * 7 }, () => {
  mkdirSync(OUT, { recursive: true });
  const done = new Map<string, { cd: number }>();
  if (existsSync(LEVELS)) {
    for (const line of readFileSync(LEVELS, 'utf8').split('\n').filter(Boolean)) {
      const r = JSON.parse(line) as { family: string; level: number; cd: number };
      done.set(`${r.family}|${r.level}`, r);
    }
  }
  const solve = (f: Family, level: number): number => {
    const key = `${f.id}|${level}`;
    let r = done.get(key);
    if (r === undefined) {
      const exact = exactSectionDrag(f.section, f.mach).cd;
      {
        const factor = 1.5 ** level;
        const xNodes = columns(f.section, () => Math.round(32 * factor));
        const nj = Math.round(32 * factor);
        const t0 = Date.now();
        const e = engine3D(grid3D(f.section, xNodes, nj), f.mach);
        const s = converge(e, f.mach, Math.round(200 * factor), Math.round(60_000 * factor));
        const row = { family: f.id, level, ni: xNodes.length - 1, nj, ...s, exact, seconds: (Date.now() - t0) / 1000, date: new Date().toISOString() };
        appendFileSync(LEVELS, JSON.stringify(row) + '\n');
        r = row;
        done.set(key, row);
      }
    }
    return r.cd;
  };
  // L0 to L3 of every family first (the pass needs only those), then L4 and L5 (the floor's input).
  const verdictsUpTo = (top: number): boolean => {
    const verdicts: Record<string, unknown>[] = [];
    let pass = true;
    for (const f of FAMILIES) {
      const exact = exactSectionDrag(f.section, f.mach).cd;
      const values = Array.from({ length: top + 1 }, (_, level) => solve(f, level));
      const page = gridConvergence(values.slice(0, 4), { orderTolerance: 0.5, noise: 1e-12, ratio: 1.5 });
      const fine = top >= 5 ? gridConvergence(values.slice(2, 6), { orderTolerance: 0.5, noise: 1e-12, ratio: 1.5 }) : null;
      let band: number | null = null;
      if (page.kind === 'monotone' || page.kind === 'oscillatory') band = page.uncertainty + FLOOR * Math.abs(values[3]!);
      const contains = band !== null && Math.abs(values[3]! - exact) <= band;
      if (!contains) pass = false;
      verdicts.push({
        family: f.id,
        exact,
        values,
        errors: values.map((v) => v / exact - 1),
        bandL0toL3: page,
        bandWithFloor: band,
        pass: contains,
        L3toL5: fine,
        L3toL5ExtrapolationError: fine !== null && fine.kind === 'monotone' ? Math.abs(fine.extrapolated - exact) / exact : null,
      });
    }
    writeFileSync(join(OUT, 'rung-b2.json'), JSON.stringify({ date: new Date().toISOString(), levelsSolved: top + 1, pass, families: verdicts }, null, 2) + '\n');
    return pass;
  };
  // L0 to L3 of every family first (the pass needs only those; verdicts written), then L4 and L5 (the floor's input).
  for (const level of [0, 1, 2, 3]) for (const f of FAMILIES) solve(f, level);
  verdictsUpTo(3);
  for (const level of [4, 5]) for (const f of FAMILIES) solve(f, level);
  expect(verdictsUpTo(5)).toBe(true);
});
