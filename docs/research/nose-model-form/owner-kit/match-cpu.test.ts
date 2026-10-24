/**
 * The CPU side of the hardware match test of 0014 10.7 (y), item 5 (h): the
 * transonic family's r = 1 and 2 at Mach 0.8 on the CPU engine (LU-SGS, the
 * driver's grid solve from ../solve-common.ts), written to
 * ./match/cpu-M0.800.json for ./gpu-solve.test.ts (MATCH=1) to compare its
 * GPU values against, each within 3e-7 absolute (as 0013's G3 test at Mach
 * 1.1). Run on the same checkout as the GPU side, after (y) is committed and
 * reviewed (Y_REVIEWED=1):
 *   Y_REVIEWED=1 ONLY=./owner-kit/match-cpu.test.ts npx vitest run --config docs/research/nose-model-form/vitest.config.ts
 * About 10 to 40 minutes on one core (r = 1 took 25,800 steps at Mach 0.8
 * here; r = 2 about 40,000).
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { cpuTransonicEngine } from '../../../../src/analysis/transonic-drag';
import type { TransonicProblem } from '../../../../src/analysis/transonic-flow';
import { Euler2D } from '../../../../src/engine-cpu/euler2d';
import { CFL, gridRecords, problemOf, solveGrid } from '../solve-common';

const here = dirname(fileURLToPath(import.meta.url));
export const MATCH_MACH = 0.8;
export const MATCH_GRIDS = [1, 2] as const;

it('solves Mach 0.8 at r = 1 and 2 on the CPU engine for the GPU match test', async () => {
  const file = join(here, 'match', `cpu-M${MATCH_MACH.toFixed(3)}.json`);
  if (existsSync(file)) {
    console.log(`${file} exists: nothing to do`);
    return;
  }
  expect(process.env.Y_REVIEWED, 'Y_REVIEWED=1: (y) committed and reviewed').toBe('1');
  const engine = cpuTransonicEngine(CFL);
  const log = (s: string) => {
    console.log(`${new Date().toISOString()} ${s}`);
  };
  const levels: unknown[] = [];
  let previous: {
    problem: TransonicProblem;
    cells: (i: number, j: number) => ReturnType<Euler2D['primitive']>;
    rate: number;
  } | null = null;
  for (const r of MATCH_GRIDS) {
    const problem = problemOf(MATCH_MACH, r);
    const solved = await solveGrid(engine, problem, previous, `match M${MATCH_MACH}`, log);
    const records = gridRecords(problem, solved.conserved);
    levels.push({ ...solved.result, stationCp: records.stationCp, loss: records.loss });
    const holder = new Euler2D(problem.config);
    holder.setConserved(solved.conserved);
    previous = { problem, cells: (i, j) => holder.primitive(i, j), rate: solved.result.rate };
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    JSON.stringify(
      { mach: MATCH_MACH, engine: `CPU, LU-SGS, CFL to ${CFL} (cpuTransonicEngine)`, levels },
      null,
      1,
    ) + '\n',
  );
  console.log(`written ${file}`);
});
