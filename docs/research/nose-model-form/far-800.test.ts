/**
 * The 800-radius test of the moved family's far-field allowance (0014 10.7
 * (y), addendum item 4; 0013's registered test (b) for the family moved to
 * 224.2 radii, which could not be run while the implicit steps diverged at
 * 800 radii). At each near-sonic rung (NEAR_SONIC_RUNGS: Mach 1.001, 1.020
 * and 1.041) the base grid of TN 4233's cone-cylinder is solved on the
 * nested far boundaries at 100.6, 224.2 and 408.7 radii with the driver's
 * implicit steps (as the family's allowances), and on the grid asked for
 * 800 radii (its own first row at 910.0 radii, 129 x 41 cells) by a path
 * that does not diverge, in the registered order:
 *   (i)  first the explicit SSPRK2 steps of the engine at CFL 0.8, stable
 *        where the implicit steps were not (slow: hours on one core), under
 *        their own cap of MAX_STEPS_EXPLICIT;
 *   (ii) only if (i) does not settle, the implicit steps with the CFL
 *        number capped at 10, under the ordinary cap.
 * Which path settled is recorded. A Mach number that settled by neither
 * writes M<mach>.failed.json and is tried again on the next run (a failure
 * never blocks the retry); only a settled result is skipped.
 * The allowance from 100.6, 224.2 and 408.7 (domainAllowance, the corrected
 * rule with the decaying branch's distance condition) must contain
 * C(800) - C(224.2) at every rung; a miss at any rung withdraws the moved
 * family's allowance for the 10 rows at Mach 1.001 to 1.041 (they stay
 * out); a value that does not settle by either path keeps them out too.
 *
 * Writes ./out/far-800/M<mach>.json and skips a finished Mach number. Run,
 * once (y) is committed and reviewed:
 *   Y_REVIEWED=1 ONLY=./far-800.test.ts npx vitest run --config docs/research/nose-model-form/vitest.config.ts
 * MACHS=1.02 limits the rungs; LOG as blind-run-3-solve.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { cpuTransonicEngine, transonicDomains } from '../../../src/analysis/transonic-drag';
import { far800Contained, FAR_800, NEAR_SONIC_RUNGS } from '../../../src/validation/subsonic-verification';
import { domainAllowance } from '../../../src/verification/domain-allowance';
import {
  body,
  CFL,
  cpuFallback,
  distanceOf,
  explicitEngine,
  FALLBACK_CFL,
  gridRecords,
  MAX_STEPS,
  MAX_STEPS_EXPLICIT,
  NotConverged,
  problemOf,
  solveGrid,
  solveGridStably,
  thresholdScale,
  type GridResult,
} from './solve-common';
import { fileMidCheckpoint } from './mid-checkpoint';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'out', 'far-800');
// The explicit path's cap, MAX_STEPS_EXPLICIT, and the explicit engine are solve-common's ((y) items 8 and 18).

const log = (s: string) => {
  const line = `${new Date().toISOString()} ${s}\n`;
  if (process.env.LOG) appendFileSync(process.env.LOG, line);
  else process.stdout.write(line);
};

async function runRung(mach: number): Promise<void> {
  const tag = `far800 M${mach.toFixed(3)}`;
  const file = join(outDir, `M${mach.toFixed(3)}.json`);
  if (existsSync(file)) {
    log(`${tag} done before: skipped`);
    return;
  }
  const domains = transonicDomains(body, mach);
  expect(domains.farField).toEqual([100, 200, 400]);
  const implicit = cpuTransonicEngine(CFL);
  const grids: Record<string, unknown> = {};
  const drags: number[] = [];
  const distances: number[] = [];
  let noise = 0;
  let path = '';
  const failed = (size: number, how: string, reason: string) => {
    log(`${tag} ${size} radii NOT CONVERGED by ${how}: ${reason}`);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, `M${mach.toFixed(3)}.failed.json`),
      JSON.stringify({ mach, converged: false, failedAt: size, how, reason, grids }) + '\n',
    );
  };
  // Each finished grid is kept (out/far-800/ckpt/M<mach>-<size>.json and .bin), and
  // each running one saves a mid-grid state, so a restart resumes where it was.
  const ckDir = join(outDir, 'ckpt');
  for (const size of [...domains.farField, FAR_800]) {
    const problem = problemOf(mach, 1, { farField: size });
    const distance = distanceOf('farField', problem);
    const ck = join(ckDir, `M${mach.toFixed(3)}-${size}`);
    let solved: Awaited<ReturnType<typeof solveGrid>> | null = null;
    if (existsSync(`${ck}.json`) && existsSync(`${ck}.bin`)) {
      const buf = readFileSync(`${ck}.bin`);
      const done = JSON.parse(readFileSync(`${ck}.json`, 'utf8')) as { result: GridResult; path: string };
      solved = {
        result: done.result,
        conserved: new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8).slice(),
      };
      if (size === FAR_800) path = done.path;
      log(`${tag} ${size} radii resumed from its checkpoint`);
    } else if (size !== FAR_800) {
      try {
        // (y) item 18: a divergence of the implicit steps falls back to the far-800 path.
        const mids = new Map<string, ReturnType<typeof fileMidCheckpoint>>();
        const midFor = (p: string) => {
          if (!mids.has(p)) mids.set(p, fileMidCheckpoint(`${ck}-${p}`));
          return mids.get(p)!;
        };
        solved = await solveGridStably(implicit, problem, null, `${tag} ${size}`, log, false, cpuFallback(), midFor);
        for (const m of mids.values()) m.clear();
      } catch (error) {
        failed(size, 'the implicit steps', (error as Error).message);
        return;
      }
    } else {
      // The registered order: explicit first, the implicit steps at CFL 10 only after it fails.
      const midExplicit = fileMidCheckpoint(`${ck}-explicit`);
      const midImplicit = fileMidCheckpoint(`${ck}-implicit10`);
      const explicitFailed = existsSync(`${ck}-explicit.failed`);
      try {
        if (explicitFailed) throw new NotConverged('the explicit steps failed before (recorded)');
        solved = await solveGrid(
          explicitEngine(),
          problem,
          null,
          `${tag} ${size} explicit`,
          log,
          false,
          MAX_STEPS_EXPLICIT,
          midExplicit,
          'explicit',
        );
        path = 'explicit';
        midExplicit.clear();
      } catch (error) {
        log(`${tag} ${size} radii: the explicit steps did not settle (${(error as Error).message}); trying the implicit steps at CFL 10`);
        mkdirSync(ckDir, { recursive: true });
        writeFileSync(`${ck}-explicit.failed`, `${(error as Error).message}\n`);
        midExplicit.clear();
        try {
          solved = await solveGrid(cpuTransonicEngine(FALLBACK_CFL), problem, null, `${tag} ${size} implicit10`, log, false, MAX_STEPS, midImplicit, 'implicit10');
          path = 'implicit10';
          midImplicit.clear();
        } catch (error2) {
          failed(size, 'explicit steps, then the implicit steps at CFL 10', (error2 as Error).message);
          return;
        }
      }
    }
    mkdirSync(ckDir, { recursive: true });
    writeFileSync(`${ck}.bin`, Buffer.from(solved.conserved.buffer));
    writeFileSync(`${ck}.json`, JSON.stringify({ result: solved.result, path }));
    const records = gridRecords(problem, solved.conserved);
    grids[size] = { ...solved.result, distance, stationCp: records.stationCp, loss: records.loss };
    drags.push(solved.result.drag);
    distances.push(distance);
    noise = Math.max(noise, solved.result.noise);
    log(`${tag} ${size} radii (own ${distance.toFixed(1)}): drag ${solved.result.drag} in ${solved.result.steps} steps`);
  }
  const allowance = domainAllowance(
    [drags[0]!, drags[1]!, drags[2]!],
    [distances[0]!, distances[1]!, distances[2]!],
    noise,
    Math.max(...drags.slice(0, 3).map((v) => thresholdScale(mach, v))),
  );
  const verdict = far800Contained(allowance, drags[1]!, drags[3]!);
  log(`${tag}: ${verdict.detail}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    file,
    JSON.stringify({ mach, path, converged: true, grids, distances, drags, noise, allowance, verdict }) + '\n',
  );
}

it('the moved family’s allowance against an 800-radius domain at the near-sonic rungs', async () => {
  expect(process.env.Y_REVIEWED, 'Y_REVIEWED=1: (y) committed and reviewed').toBe('1');
  const only = process.env.MACHS?.split(',').map(Number);
  const list = NEAR_SONIC_RUNGS.filter((m) => only === undefined || only.includes(m));
  log(`rungs: ${list.join(', ')}; the 800-radius grid by explicit steps first, then the implicit steps at CFL 10`);
  for (const m of list) await runRung(m);
  log('all done');
});
