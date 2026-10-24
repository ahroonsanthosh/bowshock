/**
 * The inviscid side of the third blind run (design record 0022 section 8
 * item 9, decided 2026-10-24 and committed at 3b906c1 before this ran): the
 * transonic solver of 0013 on TN 4233's 7 deg cone-cylinder at each indicated
 * Mach number of the rows below 1.078 in tables I(a) and I(b), on its finest
 * grid (r = 8, the page's finest: 160 cells across), as 0022 4.3 item 2
 * allows ("otherwise the finest fitted grid").
 *
 * The family is solved as the page's driver solves it
 * (src/analysis/transonic-drag.ts, verifiedTransonicDrag): the CPU engine
 * (cpuTransonicEngine, LU-SGS, CFL up to 1000), the family's domain
 * (transonicDomains: 100 radii, continued node for node to 224.2 radii below
 * Mach 1.05; 10 calibers of cylinder), r = 1 from the free stream and r = 2,
 * 4, 8 each from the one before, each grid run to the driver's settling test
 * (./solve-common.ts, shared with the owner's GPU kit). The driver itself
 * cannot be called: it serves Mach 1 to 1.2 only and does not return the
 * flow.
 *
 * Since 0014 10.7 (y) (2026-10-24) each Mach number also records what the
 * verification of the solver below and near Mach 1 asks: every grid's wall
 * Cp, station Cp, wall Mach numbers and total pressures (the loss ahead of
 * the shoulder, the pocket diagnostic), and the domain allowances from the
 * nested base grids (far boundaries and cylinder) with their station Cp.
 * Below Mach 1 the relative thresholds act on the scale S (solve-common).
 * Nothing below Mach 1.05 is solved until (y) is committed and independently
 * reviewed: Y_REVIEWED=1 asserts that, and the run refuses those Mach
 * numbers without it.
 *
 * Long: run in the background, one Mach number at a time, from 1.064 down.
 * Each finished Mach number is written to ./out/blind-run-3/solves/M<mach>.json
 * and skipped on a restart; each finished grid's state is kept in
 * $CHECKPOINTS (default: none), so a restart resumes at the next grid.
 * Progress goes to $LOG (one line per check). Run:
 *   ONLY=./blind-run-3-solve.test.ts npx vitest run --config docs/research/nose-model-form/vitest.config.ts
 * MACHS=1.064,1.062 limits the Mach numbers; FINEST=2 stops early (probes only:
 * written to ./out/blind-run-3/probe/ instead); FINEST=16 adds r = 16 to a
 * finished family from its checkpoints, where (y) item 6 (a) asks for it
 * (the unresolved case with the finer triple monotone), rewriting its file.
 */

import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { cpuTransonicEngine, NEAR_SONIC_LIMIT } from '../../../src/analysis/transonic-drag';
import type { TransonicProblem } from '../../../src/analysis/transonic-flow';
import { Euler2D } from '../../../src/engine-cpu/euler2d';
import {
  body,
  CFL,
  cpuFallback,
  FIRST_MACH,
  gridRecords,
  NotConverged,
  problemOf,
  solveAllowance,
  solveGridStably,
  type AllowanceRecord,
  type GridRecords,
  type GridResult,
} from './solve-common';
import { fileGridStore, fileMidCheckpoint, numericsHash } from './mid-checkpoint';

const here = dirname(fileURLToPath(import.meta.url));
const FINEST = Number(process.env.FINEST ?? 8);
const PROBE = FINEST < 8;
const outDir = join(here, 'out', 'blind-run-3', PROBE ? 'probe' : 'solves');
const checkpoints = process.env.CHECKPOINTS ?? '';
const reviewed = process.env.Y_REVIEWED === '1';

/** Every indicated Mach number below 1.078 in either table, from both readers' files. */
function machs(): number[] {
  const all = new Set<string>();
  for (const reader of ['A', 'B'])
    for (const table of ['tn4233_table1a.csv', 'tn4233_table1b.csv']) {
      const lines = readFileSync(join(here, 'blind-readings', reader, table), 'utf8')
        .split('\n')
        .slice(1)
        .filter((l) => l.trim() !== '');
      for (const l of lines) all.add(Number(l.split(',')[2]).toFixed(3));
    }
  const list = [...all].map(Number).filter((m) => m < FIRST_MACH);
  const only = process.env.MACHS?.split(',').map(Number);
  return list.filter((m) => only === undefined || only.includes(m)).sort((a, b) => b - a);
}

/** Progress, one line per check, appended to $LOG (vitest keeps a passing test's stdout). */
const log = (s: string) => {
  const line = `${new Date().toISOString()} ${s}\n`;
  if (process.env.LOG) appendFileSync(process.env.LOG, line);
  else process.stdout.write(line);
};

const engine = cpuTransonicEngine(CFL);
const fallback = cpuFallback();
const ENGINE = `CPU, LU-SGS, CFL to ${CFL} (cpuTransonicEngine)`;

/** The solve code's commit, "-dirty" if the research scripts or src differ from it (the kept grids' fingerprint). */
function solveCodeCommit(): string {
  try {
    const head = execSync('git rev-parse --short HEAD', { cwd: here, encoding: 'utf8' }).trim();
    const dirty =
      execSync('git status --porcelain -- docs/research/nose-model-form src', {
        cwd: here,
        encoding: 'utf8',
      })
        .split('\n')
        .filter((l) => l.trim() !== '' && !l.includes('/out/')).length > 0;
    return dirty ? `${head}-dirty` : head;
  } catch {
    return 'unknown';
  }
}

async function solveMach(mach: number): Promise<void> {
  const tag = `M${mach.toFixed(3)}`;
  const file = join(outDir, `${tag}.json`);
  if (existsSync(file)) {
    const done = JSON.parse(readFileSync(file, 'utf8')) as { finest?: number; converged?: boolean };
    if ((done.finest ?? 0) >= FINEST || done.converged === false) {
      log(`${tag} done before: skipped`);
      return;
    }
    // (y) item 6 (a): r = 16 added once, from the family's checkpoints (FINEST=16).
    log(`${tag} extended to r = ${FINEST} from its checkpoints`);
  }
  if (mach < NEAR_SONIC_LIMIT && !reviewed) {
    log(
      `${tag} REFUSED: below Mach ${NEAR_SONIC_LIMIT} nothing is solved until 0014 10.7 (y) is committed and independently reviewed (set Y_REVIEWED=1 once it is)`,
    );
    return;
  }
  const levels: { result: GridResult; records: GridRecords }[] = [];
  let allowances: { farField: AllowanceRecord; cylinder: AllowanceRecord } | null = null;
  let previous: { problem: TransonicProblem; cells: (i: number, j: number) => ReturnType<Euler2D['primitive']>; rate: number } | null = null;
  let last: { problem: TransonicProblem; conserved: Float64Array } | null = null;
  try {
    for (let r = 1; r <= FINEST; r *= 2) {
      const problem = problemOf(mach, r);
      const ck = checkpoints === '' ? '' : join(checkpoints, `${tag}-r${r}`);
      let solved: { result: GridResult; conserved: Float64Array };
      if (ck !== '' && existsSync(`${ck}.json`) && existsSync(`${ck}.bin`)) {
        const buf = readFileSync(`${ck}.bin`);
        const conserved = new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8).slice();
        solved = {
          result: JSON.parse(readFileSync(`${ck}.json`, 'utf8')) as GridResult,
          conserved,
        };
        log(`${tag} r=${r} resumed from its checkpoint`);
      } else {
        // (y) item 18: a divergence of the implicit steps falls back to the explicit
        // steps, then the implicit steps at CFL 10, each path with its own mid state.
        const mids = new Map<string, ReturnType<typeof fileMidCheckpoint>>();
        const midFor = (path: string) => {
          if (ck === '') return null;
          if (!mids.has(path)) mids.set(path, fileMidCheckpoint(`${ck}-${path}`));
          return mids.get(path)!;
        };
        const s = await solveGridStably(engine, problem, previous, tag, log, false, fallback, midFor);
        solved = s;
        if (ck !== '') {
          mkdirSync(checkpoints, { recursive: true });
          writeFileSync(`${ck}.bin`, Buffer.from(s.conserved.buffer));
          writeFileSync(`${ck}.json`, JSON.stringify(s.result));
          for (const m of mids.values()) m.clear();
        }
      }
      const records = gridRecords(problem, solved.conserved);
      levels.push({ result: solved.result, records });
      log(
        `${tag} r=${r} settled by the ${solved.result.path} steps: drag ${solved.result.drag} in ${solved.result.steps} steps; wall loss ahead ${records.loss.ahead.toExponential(2)}, max wall Mach ${records.loss.maxMach.toFixed(3)}, supersonic wall cells ${records.loss.supersonicCells}`,
      );
      if (r === 1) {
        // The allowances on base grids, right after the base grid, as the driver does.
        const own = { result: solved.result, records, problem };
        // Every allowance base grid is kept in $CHECKPOINTS (finished: never
        // re-solved; running: its mid state per path), so a restart resumes.
        const store = checkpoints === '' ? null : fileGridStore(checkpoints);
        const code = { engine: ENGINE, numerics: numericsHash(), commit: solveCodeCommit() };
        const farField = await solveAllowance(engine, mach, 'farField', own, tag, log, fallback, store, code);
        const cylinder = await solveAllowance(engine, mach, 'cylinder', own, tag, log, fallback, store, code);
        allowances = { farField, cylinder };
        for (const a of [farField, cylinder])
          log(
            `${tag} ${a.kind}: drags ${a.values.map((v) => v.toPrecision(7)).join(', ')} at ${a.distances.map((d) => d.toFixed(1)).join(', ')}: ${a.result.kind}${a.result.kind === 'refused' ? ` (${a.result.reason})` : ` ${a.result.allowance.toExponential(3)}`}`,
          );
      }
      const holder = new Euler2D(problem.config);
      holder.setConserved(solved.conserved);
      previous = {
        problem,
        cells: (i, j) => holder.primitive(i, j),
        rate: solved.result.rate,
      };
      last = { problem, conserved: solved.conserved };
    }
    const finest = levels[levels.length - 1]!;
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      file,
      JSON.stringify({
        mach,
        converged: true,
        finest: FINEST,
        engine: ENGINE,
        domain: {
          farRadius: last!.problem.grid.farRadius,
          cylinderCalibers: problemOf(mach, 1).options.cylinder,
        },
        noseLengthRadii: body.nose.length,
        levels: levels.map((l) => ({ ...l.result, records: l.records })),
        allowances,
        wall: finest.records.wall,
      }) + '\n',
    );
  } catch (error) {
    if (!(error instanceof NotConverged)) throw error;
    log(`${tag} NOT CONVERGED: ${error.message}`);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      file,
      JSON.stringify({
        mach,
        converged: false,
        reason: error.message,
        finest: FINEST,
        levels: levels.map((l) => ({ ...l.result, records: l.records })),
        allowances,
      }) + '\n',
    );
  }
}

it('solves the transonic family at each TN 4233 row below indicated Mach 1.078', async () => {
  const list = machs();
  log(`Mach numbers (${list.length}): ${list.join(', ')}; finest r = ${FINEST}; Y_REVIEWED=${reviewed ? '1' : 'unset'}`);
  expect(list.length).toBeGreaterThan(0);
  for (const m of list) await solveMach(m);
  log('all done');
});
