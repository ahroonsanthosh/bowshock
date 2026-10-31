/**
 * W9(a)'s corrected independent check, the solves (0009 section 9.13 as
 * revised after Fable's review): for each case, the method at N = 128 and
 * 256 (its wall pressures, paired-walls/<case>-method.json), then at each level the
 * hexagon (section 2.4's set-up as 9.7 ran it) and, after it, the reference
 * flow with the hexagon's level-k wall entropy. One line per solve in
 * paired.jsonl as it finishes; the wall faces, with each wall cell's
 * p / rho^gamma, in paired-walls/<case>-<hexagon or reference>-L<level>.json.
 * A restart skips the solves recorded, and a solve in progress resumes from
 * its checkpoint in tests/tmp-w9/checkpoints/ (saved every 5 minutes; the
 * same iterates to the bit as a solve never stopped), so a restart of the
 * machine loses at most 5 minutes of it. Each process runs one solve at a
 * time; to run one solve per core, start one process per case (CASES), as
 * paired-launch.sh does.
 *
 *   CASES=K1 LEVELS=0,1,2,3,4 ONLY=./paired.test.ts npx vitest run --config docs/research/fin-wave-drag/w9/vitest.config.ts
 *
 * CASES defaults to all five, LEVELS to 0 to 4.
 */

import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { hexagonCharacteristics } from '../../../../src/validation/planar-characteristics';
import { DEG, readJsonl, type NodeRecord } from './family';
import {
  P_CASES,
  P_NAMES,
  entropyStretch,
  freeStream,
  gridFrom,
  referenceInflow,
  referenceStart,
  sectionOf,
  shockExpansionState,
  solveEuler,
  wallFaces,
  type WallFace,
} from './paired';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const OUT = join(here, 'paired.jsonl');
const WALLS = join(here, 'paired-walls');
const CHECKPOINTS = join(root, 'tests/tmp-w9/checkpoints');
const checkpoint = (name: string, kind: string, level: number) => ({
  path: join(CHECKPOINTS, `${name}-${kind}-L${level}.bin`),
  everySeconds: 300,
});

interface SolveLine {
  readonly case: string;
  readonly kind: 'hexagon' | 'reference';
  readonly level: number;
}

test("W9(a): 9.13's solves", () => {
  const commit = execSync('git rev-parse --short HEAD', { cwd: here }).toString().trim();
  const dirty = execSync('git status --porcelain -- src', { cwd: root }).toString().trim();
  if (dirty !== '') throw new Error('src has uncommitted changes: the runs record the commit they ran on');
  const names = (process.env.CASES ?? P_NAMES.join(',')).split(',').map((s) => s.trim());
  const levels = (process.env.LEVELS ?? '0,1,2,3,4').split(',').map(Number);
  for (const n of names) if (!(n in P_CASES)) throw new Error(`no case ${n}`);
  for (const l of levels) if (!(Number.isInteger(l) && l >= 0 && l <= 4)) throw new Error(`level ${l} is not registered (0 to 4)`);
  mkdirSync(WALLS, { recursive: true });
  mkdirSync(CHECKPOINTS, { recursive: true });

  // The method's own values, as 9.13 uses them (no Euler).
  const nodes = new Map(readJsonl<NodeRecord>(join(here, 'nodes.jsonl')).map((n) => [n.key, n]));
  for (const name of names) {
    const methodFile = join(WALLS, `${name}-method.json`);
    if (existsSync(methodFile)) continue;
    const c = P_CASES[name]!;
    const se = shockExpansionState(c.theta, c.bevel, c.mach);
    const [m128, m256] = [128, 256].map((N) => hexagonCharacteristics(c.mach, c.theta * DEG, c.bevel, N));
    const node = c.node === null ? undefined : nodes.get(c.node);
    writeFileSync(
      methodFile,
      JSON.stringify({
        case: name,
        ...c,
        ...se,
        eps128: m128!.cd / se.cdSE - 1,
        eps256: m256!.cd / se.cdSE - 1,
        epsNode: node?.judgement.value ?? null,
        landing: m256!.firstLanding,
        landing128: m128!.firstLanding,
        flat128: m128!.flat,
        bevel128: m128!.bevel,
        flat256: m256!.flat,
        bevel256: m256!.bevel,
        commit,
      }),
    );
  }

  // E2's hexagon at levels 0 to 3 against 9.7's records (9.13: expected equal).
  const euler97 = readJsonl<{ case: string; level: number; cd: number }>(join(here, 'euler.jsonl'));

  const done = new Set(readJsonl<SolveLine>(OUT).map((r) => `${r.case}|${r.kind}|${r.level}`));
  for (const name of names) {
    const c = P_CASES[name]!;
    const section = sectionOf(c.theta, c.bevel);
    const se = shockExpansionState(c.theta, c.bevel, c.mach);
    for (const level of levels) {
      const hexFile = join(WALLS, `${name}-hexagon-L${level}.json`);
      if (!done.has(`${name}|hexagon|${level}`)) {
        const grid = gridFrom(section, level, 0);
        const ck = checkpoint(name, 'hexagon', level);
        const r = solveEuler(grid, freeStream(c.mach), c.mach, level, ck);
        writeFileSync(hexFile, JSON.stringify(wallFaces(r.solver)));
        const old = name === 'E2' ? euler97.find((e) => e.case === 'E2' && e.level === level) : undefined;
        appendFileSync(
          OUT,
          JSON.stringify({
            case: name,
            kind: 'hexagon',
            level,
            ni: grid.ni,
            nj: grid.nj,
            iterations: r.iterations,
            residual: r.residual,
            change: r.change,
            converged: r.converged,
            cd: r.cd,
            overSE: r.cd / se.cdSE - 1,
            cd97: old?.cd ?? null,
            same97: old === undefined ? null : old.cd === r.cd,
            seconds: r.seconds,
            resumed: r.resumed,
            commit,
          }) + '\n',
        );
        rmSync(ck.path, { force: true });
        console.log(`${name} hexagon level ${level}: ${r.iterations} iterations, ${r.seconds} s`);
      }
      if (!done.has(`${name}|reference|${level}`)) {
        const faces = JSON.parse(readFileSync(hexFile, 'utf8')) as WallFace[];
        const start = referenceStart(section, c.bevel, level);
        const [s0, s1] = entropyStretch(start.xs, c.bevel);
        const sample = faces.filter((f) => f.y > 0 && f.x >= s0 && f.x <= s1);
        const len = sample.reduce((a, f) => a + f.length, 0);
        const K = sample.reduce((a, f) => a + f.K * f.length, 0) / len;
        const inflow = referenceInflow(c.theta, c.mach, se.p2, K);
        const grid = gridFrom(section, level, start.column);
        const ck = checkpoint(name, 'reference', level);
        const r = solveEuler(grid, inflow.state, c.mach, level, ck);
        writeFileSync(join(WALLS, `${name}-reference-L${level}.json`), JSON.stringify(wallFaces(r.solver)));
        appendFileSync(
          OUT,
          JSON.stringify({
            case: name,
            kind: 'reference',
            level,
            ni: grid.ni,
            nj: grid.nj,
            column: start.column,
            xs: start.xs,
            cells: sample.length,
            K,
            Kmin: Math.min(...sample.map((f) => f.K)),
            Kmax: Math.max(...sample.map((f) => f.K)),
            Kshock: se.Kshock,
            inflowMach: inflow.mach,
            p3: inflow.p3,
            p3SE: se.p3,
            iterations: r.iterations,
            residual: r.residual,
            change: r.change,
            converged: r.converged,
            cd: r.cd,
            seconds: r.seconds,
            resumed: r.resumed,
            commit,
          }) + '\n',
        );
        rmSync(ck.path, { force: true });
        console.log(`${name} reference level ${level}: ${r.iterations} iterations, ${r.seconds} s`);
      }
    }
  }
});
