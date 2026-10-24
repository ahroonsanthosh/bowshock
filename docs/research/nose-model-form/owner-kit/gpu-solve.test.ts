/**
 * The owner's GPU run of the third blind run's solves (design record 0022
 * section 8 item 9): the transonic family of 0013 on TN 4233's 7 deg
 * cone-cylinder at the 27 distinct indicated Mach numbers below 1.078, r = 1,
 * 2, 4 and 8, as ../blind-run-3-solve.test.ts does on the CPU, but on the
 * page's GPU engine (gpuTransonicEngine: two-float state and residual,
 * red-black implicit steps with GPU_TRANSONIC_SWEEPS sweeps, CFL up to 1000;
 * the drag and residual evaluated in double precision on the CPU from the
 * state read back at each check). The grid solve, the records of every grid
 * and the domain allowances are the shared ../solve-common.ts (the driver's
 * solveGrid with its tests and constants unchanged; below Mach 1 the
 * thresholds act on the scale S of 0014 10.7 (y)); the domain is the
 * driver's (transonicDomains).
 *
 * Writes ../out/blind-run-3/solves-gpu/M<mach>.json (the CPU files' format,
 * plus the engine and the WebGPU adapter), skips a Mach number already
 * written, and keeps each finished grid's state in ./checkpoints/ so that a
 * stopped run resumes at the next grid. Progress: ./progress.txt (rewritten at
 * every check). See ./README.txt.
 *
 * Two gates of 0014 10.7 (y):
 * - MATCH=1 runs the hardware match test first and only: Mach 0.8, r = 1
 *   and 2, this GPU against the CPU engine's values in ./match/cpu-M0.800.json
 *   (written by ./match-cpu.test.ts on the same checkout), each within 3e-7
 *   absolute, as 0013's G3 test at Mach 1.1. No subsonic or near-sonic row
 *   counts until it has passed (./match/gpu-M0.800.json records it).
 * - Y_REVIEWED=1 asserts that (y) is committed and independently reviewed;
 *   without it nothing below Mach 1.05 is solved.
 */

import { expect, inject, it } from 'vitest';
import { commands } from 'vitest/browser';
import { GPU_TRANSONIC_SWEEPS } from '../../../../src/analysis/gpu-nose-drag';
import { gpuTransonicEngine } from '../../../../src/analysis/gpu-transonic';
import { NEAR_SONIC_LIMIT, type TransonicEngine } from '../../../../src/analysis/transonic-drag';
import type { TransonicProblem } from '../../../../src/analysis/transonic-flow';
import { Euler2D } from '../../../../src/engine-cpu/euler2d';
import {
  body,
  CFL,
  FIRST_MACH,
  gridRecords,
  NotConverged,
  problemOf,
  solveAllowance,
  solveGrid,
  type AllowanceRecord,
  type GridRecords,
  type GridResult,
} from '../solve-common';

const KIT = 'docs/research/nose-model-form/owner-kit';
const OUT = 'docs/research/nose-model-form/out/blind-run-3/solves-gpu';
const FINEST = inject('kitFinest');
const SOFTWARE = inject('kitSoftware');
const MATCH = inject('kitMatch');
const REVIEWED = inject('kitReviewed');
/** The match test's Mach number and grids (0014 10.7 (y), item 5 (h)). */
export const MATCH_MACH = 0.8;
export const MATCH_GRIDS = [1, 2] as const;
export const MATCH_TOLERANCE = 3e-7;
// A check run (FINEST below 8, or SwiftShader) writes elsewhere and never into the results.
const outDir = FINEST === 8 && !SOFTWARE ? OUT : `${KIT}/check`;
const ckDir = `${KIT}/checkpoints`;

const progress: string[] = [];
async function log(s: string): Promise<void> {
  const line = `${new Date().toISOString()} ${s}`;
  console.log(line);
  progress.push(line);
  if (progress.length > 400) progress.splice(0, progress.length - 400);
  await commands.writeFile(`${KIT}/progress.txt`, progress.join('\n') + '\n');
}

async function exists(path: string): Promise<boolean> {
  try {
    await commands.readFile(path);
    return true;
  } catch {
    return false;
  }
}

/** Every indicated Mach number below 1.078 in either table, from both readers' files. */
async function machs(): Promise<number[]> {
  const all = new Set<string>();
  for (const reader of ['A', 'B'])
    for (const table of ['tn4233_table1a.csv', 'tn4233_table1b.csv']) {
      const text = await commands.readFile(
        `docs/research/nose-model-form/blind-readings/${reader}/${table}`,
      );
      for (const l of text.split('\n').slice(1))
        if (l.trim() !== '') all.add(Number(l.split(',')[2]).toFixed(3));
    }
  const only = inject('kitMachs')
    .split(',')
    .filter((s) => s !== '')
    .map(Number);
  return [...all]
    .map(Number)
    .filter((m) => m < FIRST_MACH && (only.length === 0 || only.includes(m)))
    .sort((a, b) => b - a);
}

function toBase64(q: Float64Array): string {
  const bytes = new Uint8Array(q.buffer, q.byteOffset, q.byteLength);
  let s = '';
  for (let k = 0; k < bytes.length; k += 0x8000)
    s += String.fromCharCode(...bytes.subarray(k, k + 0x8000));
  return btoa(s);
}

function fromBase64(s: string): Float64Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  return new Float64Array(bytes.buffer);
}

async function solveMach(
  engine: TransonicEngine,
  device: Record<string, string | boolean>,
  mach: number,
): Promise<void> {
  const tag = `M${mach.toFixed(3)}`;
  const file = `${outDir}/${tag}.json`;
  if (await exists(file)) {
    await log(`${tag} done before: skipped`);
    return;
  }
  if (mach < NEAR_SONIC_LIMIT && !REVIEWED) {
    await log(
      `${tag} REFUSED: below Mach ${NEAR_SONIC_LIMIT} nothing is solved until 0014 10.7 (y) is committed and independently reviewed (Y_REVIEWED=1 once it is; README.txt)`,
    );
    return;
  }
  const engineName = `GPU two-float (gpuTransonicEngine), red-black implicit, ${GPU_TRANSONIC_SWEEPS} sweeps, CFL to ${CFL}`;
  const levels: { result: GridResult; records: GridRecords }[] = [];
  let allowances: { farField: AllowanceRecord; cylinder: AllowanceRecord } | null = null;
  let previous: {
    problem: TransonicProblem;
    cells: (i: number, j: number) => ReturnType<Euler2D['primitive']>;
    rate: number;
  } | null = null;
  let last: { problem: TransonicProblem; conserved: Float64Array } | null = null;
  const plain = { mach, finest: FINEST, engine: engineName, device };
  try {
    for (let r = 1; r <= FINEST; r *= 2) {
      const problem = problemOf(mach, r);
      const ck = `${ckDir}/${SOFTWARE ? 'software-' : ''}${tag}-r${r}`;
      let solved: { result: GridResult; conserved: Float64Array };
      if ((await exists(`${ck}.json`)) && (await exists(`${ck}.b64`))) {
        solved = {
          result: JSON.parse(await commands.readFile(`${ck}.json`)) as GridResult,
          conserved: fromBase64(await commands.readFile(`${ck}.b64`)),
        };
        await log(`${tag} r=${r} resumed from its checkpoint`);
      } else {
        solved = await solveGrid(engine, problem, previous, tag, log, r === 1);
        await commands.writeFile(`${ck}.b64`, toBase64(solved.conserved));
        await commands.writeFile(`${ck}.json`, JSON.stringify(solved.result));
      }
      const records = gridRecords(problem, solved.conserved);
      levels.push({ result: solved.result, records });
      await log(
        `${tag} r=${r} settled: drag ${solved.result.drag} in ${solved.result.steps} steps (${Math.round(solved.result.seconds)} s); wall loss ahead ${records.loss.ahead.toExponential(2)}, max wall Mach ${records.loss.maxMach.toFixed(3)}, supersonic wall cells ${records.loss.supersonicCells}`,
      );
      if (r === 1) {
        const ckA = `${ck}-allowances.json`;
        if (await exists(ckA)) {
          allowances = JSON.parse(await commands.readFile(ckA)) as typeof allowances;
          await log(`${tag} allowances resumed from their checkpoint`);
        } else {
          const own = { result: solved.result, records, problem };
          const farField = await solveAllowance(engine, mach, 'farField', own, tag, log);
          const cylinder = await solveAllowance(engine, mach, 'cylinder', own, tag, log);
          allowances = { farField, cylinder };
          await commands.writeFile(ckA, JSON.stringify(allowances));
        }
        for (const a of [allowances!.farField, allowances!.cylinder])
          await log(
            `${tag} ${a.kind}: drags ${a.values.map((v) => v.toPrecision(7)).join(', ')} at ${a.distances.map((d) => d.toFixed(1)).join(', ')}: ${a.result.kind}${a.result.kind === 'refused' ? ` (${a.result.reason})` : ` ${a.result.allowance.toExponential(3)}`}`,
          );
      }
      const holder = new Euler2D(problem.config);
      holder.setConserved(solved.conserved);
      previous = { problem, cells: (i, j) => holder.primitive(i, j), rate: solved.result.rate };
      last = { problem, conserved: solved.conserved };
    }
    const finest = levels[levels.length - 1]!;
    await commands.writeFile(
      file,
      JSON.stringify({
        ...plain,
        converged: true,
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
    await log(`${tag} NOT CONVERGED: ${error.message}`);
    await commands.writeFile(
      file,
      JSON.stringify({
        ...plain,
        converged: false,
        reason: error.message,
        levels: levels.map((l) => ({ ...l.result, records: l.records })),
        allowances,
      }) + '\n',
    );
  }
}

/** The hardware match test (0014 10.7 (y), item 5 (h)): Mach 0.8, r = 1 and 2, against the CPU engine. */
async function matchTest(
  engine: TransonicEngine,
  device: Record<string, string | boolean>,
): Promise<void> {
  const cpuFile = `${KIT}/match/cpu-M${MATCH_MACH.toFixed(3)}.json`;
  if (!(await exists(cpuFile)))
    throw new Error(`${cpuFile} is missing: run the CPU side first (README.txt, step 1)`);
  const cpu = JSON.parse(await commands.readFile(cpuFile)) as {
    levels: { refinement: number; drag: number; steps: number }[];
  };
  const tag = `match M${MATCH_MACH.toFixed(3)}`;
  const out: Record<string, unknown>[] = [];
  let previous: {
    problem: TransonicProblem;
    cells: (i: number, j: number) => ReturnType<Euler2D['primitive']>;
    rate: number;
  } | null = null;
  let passed = true;
  for (const r of MATCH_GRIDS) {
    const problem = problemOf(MATCH_MACH, r);
    const solved = await solveGrid(engine, problem, previous, tag, log, r === 1);
    const reference = cpu.levels.find((l) => l.refinement === r);
    if (reference === undefined) throw new Error(`the CPU file has no r = ${r}`);
    const difference = solved.result.drag - reference.drag;
    const ok = Math.abs(difference) <= MATCH_TOLERANCE;
    passed = passed && ok;
    out.push({
      refinement: r,
      gpu: solved.result,
      cpu: reference,
      difference,
      tolerance: MATCH_TOLERANCE,
      pass: ok,
    });
    await log(
      `${tag} r=${r}: GPU ${solved.result.drag} (${solved.result.steps} steps) against CPU ${reference.drag} (${reference.steps}): ${difference.toExponential(2)}, ${ok ? 'within' : 'OUTSIDE'} ${MATCH_TOLERANCE}`,
    );
    const holder = new Euler2D(problem.config);
    holder.setConserved(solved.conserved);
    previous = { problem, cells: (i, j) => holder.primitive(i, j), rate: solved.result.rate };
  }
  await commands.writeFile(
    `${KIT}/match/${SOFTWARE ? 'software-' : ''}gpu-M${MATCH_MACH.toFixed(3)}.json`,
    JSON.stringify({ mach: MATCH_MACH, device, software: SOFTWARE, grids: out, passed }, null, 1) + '\n',
  );
  await log(
    passed
      ? 'MATCH PASSED: this GPU reproduces the CPU engine at Mach 0.8 on r = 1 and 2; the rows may be run'
      : 'MATCH FAILED: no subsonic or near-sonic row from this GPU counts (README.txt)',
  );
  expect(passed).toBe(true);
}

it('solves the transonic family on this GPU at each TN 4233 row below indicated Mach 1.078', async () => {
  if (!('gpu' in navigator)) throw new Error('navigator.gpu missing: WebGPU is not enabled');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (adapter === null) throw new Error('no WebGPU adapter: try HEADED=1 (see README.txt)');
  const info = adapter.info;
  const device = {
    vendor: info.vendor,
    architecture: info.architecture,
    device: info.device,
    description: info.description,
    userAgent: navigator.userAgent,
  };
  const isSoftware = /swiftshader/i.test(JSON.stringify(device)) || info.isFallbackAdapter;
  if (isSoftware && !SOFTWARE)
    throw new Error(
      `the adapter is software (${JSON.stringify(device)}): no hardware WebGPU here; try HEADED=1 (README.txt)`,
    );
  const gpu = await adapter.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxBufferSize: adapter.limits.maxBufferSize,
    },
  });
  const engine = gpuTransonicEngine(gpu, { sweeps: GPU_TRANSONIC_SWEEPS, cfl: CFL });
  await log(`adapter ${JSON.stringify(device)}`);
  if (MATCH) {
    await matchTest(engine, device);
    return;
  }
  const matched = await exists(`${KIT}/match/gpu-M${MATCH_MACH.toFixed(3)}.json`);
  const list = (await machs()).filter((m) => {
    if (m < 1.078 && (m < 1 || m < NEAR_SONIC_LIMIT) && !matched && !SOFTWARE) {
      void log(`M${m.toFixed(3)} REFUSED: the hardware match test has not passed on this checkout (MATCH=1 first; README.txt)`);
      return false;
    }
    return true;
  });
  await log(
    `Mach numbers (${list.length}): ${list.join(', ')}; finest r = ${FINEST}; out ${outDir}; Y_REVIEWED=${REVIEWED ? '1' : 'unset'}`,
  );
  expect(list.length).toBeGreaterThan(0);
  for (const m of list) await solveMach(engine, device, m);
  await log('all done');
  await log(
    outDir === OUT
      ? `Send the results back: commit ${OUT}/*.json and ${KIT}/match/*.json (not the checkpoints) to claude/wip/nose-model-form and push, or zip those folders and send them (README.txt).`
      : `Check run only: results in ${outDir}, not in ${OUT}.`,
  );
});
