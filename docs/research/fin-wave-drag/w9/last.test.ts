/**
 * W9(a)'s last Euler check, the solves (0009 section 9.15): for each case,
 * the method at N = 128 and 256 (last-walls/<case>-method.json), then at
 * each level the hexagon (section 2.4's set-up as 9.7 and 9.13 ran it),
 * recording its wall faces and its column of cell states at x_s, and,
 * after it, the reference from x_s on with a faceStates inflow, one state
 * per row: the flat's pressure p2, flow along x, the free stream's total
 * enthalpy, and the entropy max(K_hex(j), K_shock). One line per solve in
 * last.jsonl as it finishes; the wall faces and wall-cell entropies in
 * last-walls/<case>-<hexagon or reference>-L<level>.json, the hexagon's
 * column in last-walls/<case>-column-L<level>.json. A restart skips the
 * solves recorded, and a solve in progress resumes from its checkpoint in
 * tests/tmp-w9/checkpoints-last/ (every 5 minutes, the same iterates to
 * the bit). One solve at a time per process; last-launch.sh runs one
 * process per case.
 *
 *   CASES=K1 LEVELS=2,3,4 ONLY=./last.test.ts npx vitest run --config docs/research/fin-wave-drag/w9/vitest.config.ts
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
  columnStates,
  freeStream,
  gridFrom,
  referenceInflow,
  referenceStart,
  sectionOf,
  shockExpansionState,
  solveEuler,
  wallFaces,
  type Primitive,
  type WallFace,
} from './paired';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const OUT = join(here, 'last.jsonl');
const WALLS = join(here, 'last-walls');
const WALLS913 = join(here, 'paired-walls');
const CHECKPOINTS = join(root, 'tests/tmp-w9/checkpoints-last');
const checkpoint = (name: string, kind: string, level: number) => ({
  path: join(CHECKPOINTS, `${name}-${kind}-L${level}.bin`),
  everySeconds: 300,
});

interface SolveLine {
  readonly case: string;
  readonly kind: 'hexagon' | 'reference';
  readonly level: number;
}
type Column = { j: number; rho: number; u: number; v: number; p: number; K: number }[];

test("W9(a): 9.15's solves", () => {
  const commit = execSync('git rev-parse --short HEAD', { cwd: here }).toString().trim();
  const dirty = execSync('git status --porcelain -- src', { cwd: root }).toString().trim();
  if (dirty !== '') throw new Error('src has uncommitted changes: the runs record the commit they ran on');
  const names = (process.env.CASES ?? P_NAMES.join(',')).split(',').map((s) => s.trim());
  const levels = (process.env.LEVELS ?? '0,1,2,3,4').split(',').map(Number);
  for (const n of names) if (!(n in P_CASES)) throw new Error(`no case ${n}`);
  for (const l of levels) if (!(Number.isInteger(l) && l >= 0 && l <= 4)) throw new Error(`level ${l} is not registered (0 to 4)`);
  mkdirSync(WALLS, { recursive: true });
  mkdirSync(CHECKPOINTS, { recursive: true });

  // The method's own values, as 9.13 used them (no Euler).
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

  const done = new Set(readJsonl<SolveLine>(OUT).map((r) => `${r.case}|${r.kind}|${r.level}`));
  for (const name of names) {
    const c = P_CASES[name]!;
    const section = sectionOf(c.theta, c.bevel);
    const se = shockExpansionState(c.theta, c.bevel, c.mach);
    for (const level of levels) {
      const start = referenceStart(section, c.bevel, level);
      const hexFile = join(WALLS, `${name}-hexagon-L${level}.json`);
      const columnFile = join(WALLS, `${name}-column-L${level}.json`);
      if (!done.has(`${name}|hexagon|${level}`)) {
        const grid = gridFrom(section, level, 0);
        const ck = checkpoint(name, 'hexagon', level);
        const r = solveEuler(grid, freeStream(c.mach), c.mach, level, ck);
        const faces = wallFaces(r.solver);
        writeFileSync(hexFile, JSON.stringify(faces));
        // The cells whose right faces lie on x_s, one per row.
        const column = columnStates(r.solver, start.column - 1);
        writeFileSync(columnFile, JSON.stringify(column));
        // 9.13's hexagon at this level, if recorded: the same wall pressures to the bit?
        const old913 = join(WALLS913, `${name}-hexagon-L${level}.json`);
        let same913: boolean | null = null;
        if (existsSync(old913)) {
          const o = JSON.parse(readFileSync(old913, 'utf8')) as WallFace[];
          same913 = o.length === faces.length && o.every((f, i) => f.p === faces[i]!.p && f.x === faces[i]!.x);
        }
        const layer = column.filter((q) => q.K > se.Kshock);
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
            same913,
            column: start.column - 1,
            xs: start.xs,
            rowsAboveKshock: layer.map((q) => q.j),
            Kmax: Math.max(...column.map((q) => q.K)),
            Kshock: se.Kshock,
            seconds: r.seconds,
            resumed: r.resumed,
            commit,
          }) + '\n',
        );
        rmSync(ck.path, { force: true });
        console.log(`${name} hexagon level ${level}: ${r.iterations} iterations, ${r.seconds} s`);
      }
      if (!done.has(`${name}|reference|${level}`)) {
        const column = JSON.parse(readFileSync(columnFile, 'utf8')) as Column;
        const rows: Primitive[] = column.map((q) => referenceInflow(c.theta, c.mach, se.p2, Math.max(q.K, se.Kshock)).state);
        const grid = gridFrom(section, level, start.column);
        if (rows.length !== grid.nj) throw new Error(`${name} level ${level}: ${rows.length} rows for ${grid.nj}`);
        const ck = checkpoint(name, 'reference', level);
        const r = solveEuler(grid, rows, c.mach, level, ck);
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
            rowsCarried: column.filter((q) => q.K > se.Kshock).map((q) => q.j),
            Kshock: se.Kshock,
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
