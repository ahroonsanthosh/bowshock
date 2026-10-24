/**
 * Rung (b3) of docs/design/0021-3d-euler-fins.md (section 4.2), on the CPU: short-bevel hexagons, a pass gate.
 * The 3D engine in planar mode (planar3d.ts, (b2)'s setup and layout: 32 cells a segment and 32 rows on L0,
 * ratio 1.5) to L5 on each case of b3-cases.ts, against the characteristics reference of
 * rung-b3-reference.test.ts (out/rung-b3-reference.json, which must exist and pass first).
 *
 * Pass: for every case, the band from L2 to L5 (0005's procedure at ratio 1.5, order tolerance 0.5, noise
 * 1e-12, placed on L5's value) plus the floor contains the reference. The floor is FIN_DRAG_FLOOR (4.7); until
 * all its terms are measured the verdict uses max(1e-3, the (b2) term from out/rung-b2.json when that has L5)
 * and is labelled provisional. A failure leaves the reflected-wave sections refused.
 *
 * Levels are appended to out/rung-b3-levels.jsonl as they finish (a restart skips those done); verdicts in
 * out/rung-b3.json. Run (days, one core):
 *   sh docs/research/solver3d/run-lane.sh rung-b3
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { hexagonal } from '../../../src/fins/section';
import { exactSectionDrag } from '../../../src/fins/section-drag';
import { gridConvergence } from '../../../src/verification/grid-convergence';
import { B3_CASES, type B3Case } from './b3-cases';
import { columns, converge, engine3D, grid3D } from './planar3d';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
const LEVELS = join(OUT, 'rung-b3-levels.jsonl');
const PROVISIONAL_FLOOR = 1e-3;

function floorNow(): { floor: number; provisional: true; from: string } {
  const b2 = join(OUT, 'rung-b2.json');
  if (existsSync(b2)) {
    const r = JSON.parse(readFileSync(b2, 'utf8')) as {
      levelsSolved: number;
      families: { L3toL5ExtrapolationError: number | null }[];
    };
    if (r.levelsSolved >= 6) {
      const term = 2 * Math.max(...r.families.map((f) => f.L3toL5ExtrapolationError ?? Infinity));
      return {
        floor: Math.max(PROVISIONAL_FLOOR, term),
        provisional: true,
        from: `max(1e-3, (b2) term ${term.toExponential(3)}); (c-x), (e0) and the floor families not yet measured`,
      };
    }
  }
  return { floor: PROVISIONAL_FLOOR, provisional: true, from: '1e-3; (b2) L5 not yet solved' };
}

test('rung (b3): five short-bevel hexagons at ratio 1.5, L0 to L5, against the characteristics reference', { timeout: 86_400_000 * 7 }, () => {
  mkdirSync(OUT, { recursive: true });
  const refPath = join(OUT, 'rung-b3-reference.json');
  if (!existsSync(refPath)) throw new Error('run rung-b3-reference first');
  const ref = JSON.parse(readFileSync(refPath, 'utf8')) as { pass?: boolean; hexagons: { case: string; reference: number; pass: boolean }[] };
  const done = new Map<string, number>();
  if (existsSync(LEVELS)) {
    for (const line of readFileSync(LEVELS, 'utf8').split('\n').filter(Boolean)) {
      const r = JSON.parse(line) as { case: string; level: number; cd: number };
      done.set(`${r.case}|${r.level}`, r.cd);
    }
  }
  const solve = (c: B3Case, level: number): number => {
    const key = `${c.id}|${level}`;
    const had = done.get(key);
    if (had !== undefined) return had;
    const section = hexagonal(c.tc, c.bevel);
    const factor = 1.5 ** level;
    const xNodes = columns(section, () => Math.round(32 * factor));
    const nj = Math.round(32 * factor);
    const t0 = Date.now();
    const e = engine3D(grid3D(section, xNodes, nj), c.mach);
    const s = converge(e, c.mach, Math.round(200 * factor), Math.round(60_000 * factor));
    const row = { case: c.id, level, ni: xNodes.length - 1, nj, ...s, seconds: (Date.now() - t0) / 1000, date: new Date().toISOString() };
    appendFileSync(LEVELS, JSON.stringify(row) + '\n');
    done.set(key, s.cd);
    return s.cd;
  };
  for (let level = 0; level <= 5; level++) for (const c of B3_CASES) solve(c, level);
  const { floor, provisional, from } = floorNow();
  let pass = ref.pass === true;
  const verdicts = B3_CASES.map((c) => {
    const values = [0, 1, 2, 3, 4, 5].map((level) => solve(c, level));
    const r = ref.hexagons.find((h) => h.case === c.id);
    if (!r || !r.pass) pass = false;
    const reference = r?.reference ?? Number.NaN;
    const estimate = gridConvergence(values.slice(2, 6), { orderTolerance: 0.5, noise: 1e-12, ratio: 1.5 });
    const band = estimate.kind === 'unresolved' ? null : estimate.uncertainty + floor * Math.abs(values[5]!);
    const contains = band !== null && Math.abs(values[5]! - reference) <= band;
    if (!contains) pass = false;
    const section = hexagonal(c.tc, c.bevel);
    return {
      case: c.id,
      reference,
      shockExpansion: exactSectionDrag(section, c.mach, { neglectReflectedWaves: true }).cd,
      values,
      errors: values.map((v) => v / reference - 1),
      estimateL2toL5: estimate,
      band,
      bandWithoutFloor: estimate.kind === 'unresolved' ? null : estimate.uncertainty,
      pass: contains,
    };
  });
  writeFileSync(
    join(OUT, 'rung-b3.json'),
    JSON.stringify({ date: new Date().toISOString(), floor, floorFrom: from, provisional, pass, cases: verdicts }, null, 2) + '\n',
  );
  expect(pass).toBe(true);
});
