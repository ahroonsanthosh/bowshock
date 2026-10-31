/**
 * W9(a)'s check points (0009 section 9.6; 9.11, step 4), computed only
 * after every node has run and the candidate cells are fixed: (i) the
 * population's hexagons the reflected-wave rule refuses at Mach 1.5 and
 * above that lie in a candidate cell, (ii) 200 points drawn at random over
 * the candidate cells, (iii) the centre of every candidate cell; each at
 * the five levels with the registered interpolation, judged by 9.5 and
 * against its cell's band. Also the method's values at the Euler cases E1
 * to E3 (9.7), with their wall pressures at N = 256. One line per check
 * point in checks.jsonl (ecases.jsonl for E1 to E3) as it finishes, each
 * solve logged in tests/tmp-w9/solves-checks.jsonl; a restart skips what is
 * recorded.
 *
 *   ONLY=./checks.test.ts npx vitest run --config docs/research/fin-wave-drag/w9/vitest.config.ts
 */

import { execSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import type { SymmetricSection } from '../../../../src/fins/section';
import { hexagonCharacteristics } from '../../../../src/validation/planar-characteristics';
import { librarySection, totalReasons } from '../../refusals/evaluate';
import { MACH_BANDS, drawAltitude, mulberry32 as populationRandom, population } from '../../refusals/population';
import {
  BEVEL,
  DEG,
  E_CASES,
  MACH,
  THETA,
  SolveLog,
  candidateCells,
  cellIndex,
  drawnCheckPoints,
  judge95,
  levelsOf,
  readJsonl,
  shockExpansion,
  type CheckPoint,
  type NodeRecord,
} from './family';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');

/** (i): the population's refused hexagons at Mach 1.5 and above in candidate cells. */
function populationCheckPoints(cellKeys: ReadonlySet<string>): CheckPoint[] {
  const out: CheckPoint[] = [];
  const rand = populationRandom(7);
  for (const rocket of population(2000)) {
    MACH_BANDS.forEach(([lo, hi]) => {
      const mach = lo + (hi - lo) * (0.0005 + 0.999 * rand());
      const altitudeKm = drawAltitude(rand(), rand());
      if (rocket.section !== 'bevel-both' || !(mach >= 1.5)) return;
      if (!totalReasons(rocket, { mach, altitudeKm }).includes('sectionReflected')) return;
      const section = librarySection(rocket) as SymmetricSection;
      const bevel = section.x[1]!;
      const theta = Math.atan(section.halfThickness[1]! / bevel) / DEG;
      const cell = [cellIndex(THETA, theta), cellIndex(BEVEL, bevel), cellIndex(MACH, mach)] as const;
      if (!cellKeys.has(cell.join('|'))) return;
      out.push({ id: `population-${rocket.id}-${mach.toFixed(6)}`, kind: 'population', theta, bevel, mach, cell });
    });
  }
  return out;
}

test('W9(a): the check points and the method at E1 to E3', () => {
  const commit = execSync('git rev-parse --short HEAD', { cwd: here }).toString().trim();
  const dirty = execSync('git status --porcelain -- src', { cwd: root }).toString().trim();
  if (dirty !== '') throw new Error('src has uncommitted changes: the runs record the commit they ran on');
  mkdirSync(join(root, 'tests/tmp-w9'), { recursive: true });
  const log = new SolveLog(join(root, 'tests/tmp-w9/solves-checks.jsonl'));

  // The method at E1 to E3 (9.7), with the wall pressures at N = 256.
  const EOUT = join(here, 'ecases.jsonl');
  const eDone = new Set(readJsonl<{ case: string }>(EOUT).map((r) => r.case));
  for (const name of ['E1', 'E2', 'E3']) {
    if (eDone.has(name)) continue;
    const c = E_CASES[name]!;
    const se = shockExpansion(c.theta, c.bevel, c.mach);
    const levels = levelsOf(`E|${name}`, c.theta, c.bevel, c.mach, 'pressure', se.cd, log);
    const s = hexagonCharacteristics(c.mach, c.theta * DEG, c.bevel, 256);
    appendFileSync(
      EOUT,
      JSON.stringify({
        case: name,
        theta: c.theta,
        bevel: c.bevel,
        mach: c.mach,
        cdSE: se.cd,
        firstReflection: se.firstReflection,
        levels,
        judgement: judge95(levels),
        flat: s.flat,
        bevel256: s.bevel,
        commit,
      }) + '\n',
    );
  }

  const nodes = new Map(readJsonl<NodeRecord>(join(here, 'nodes.jsonl')).map((n) => [n.key, n]));
  if (nodes.size !== 1392) throw new Error(`the check points need every node first: ${nodes.size} of 1392 recorded`);
  const cells = candidateCells(nodes);
  const byKey = new Map(cells.map((c) => [`${c.i}|${c.j}|${c.k}`, c]));
  const points = [...populationCheckPoints(new Set(byKey.keys())), ...drawnCheckPoints(cells)];
  const OUT = join(here, 'checks.jsonl');
  const done = new Set(readJsonl<{ id: string }>(OUT).map((r) => r.id));
  let n = done.size;
  const t0 = Date.now();
  for (const p of points) {
    if (done.has(p.id)) continue;
    const se = shockExpansion(p.theta, p.bevel, p.mach);
    const levels = levelsOf(`C|${p.id}`, p.theta, p.bevel, p.mach, 'pressure', se.cd, log);
    const judgement = judge95(levels);
    const cell = byKey.get(p.cell.join('|'))!;
    const inside = judgement.pass
      ? judgement.value! - judgement.U! >= cell.epsLo && judgement.value! + judgement.U! <= cell.epsHi
      : null;
    appendFileSync(
      OUT,
      JSON.stringify({
        ...p,
        libraryExact: se.exact,
        cdSE: se.cd,
        levels,
        judgement,
        epsLo: cell.epsLo,
        epsHi: cell.epsHi,
        inside,
        commit,
      }) + '\n',
    );
    n++;
    if (n % 50 === 0) console.log(`${n} of ${points.length} check points, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  console.log(`done: ${points.length} check points`);
});
