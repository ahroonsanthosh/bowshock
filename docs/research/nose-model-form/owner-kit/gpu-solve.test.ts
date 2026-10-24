/**
 * The owner's GPU run of the third blind run's solves (design record 0022
 * section 8 item 9): the transonic family of 0013 on TN 4233's 7 deg
 * cone-cylinder at the 27 distinct indicated Mach numbers below 1.078, r = 1,
 * 2, 4 and 8, as ../blind-run-3-solve.test.ts does on the CPU, but on the
 * page's GPU engine (gpuTransonicEngine: two-float state and residual,
 * red-black implicit steps with GPU_TRANSONIC_SWEEPS sweeps, CFL up to 1000;
 * the drag and residual evaluated in double precision on the CPU from the
 * state read back at each check). The grid solve is the driver's
 * (src/analysis/transonic-drag.ts, solveGrid), copied with its tests and
 * constants unchanged, including the two-float precision check on the first
 * grid; the domain is the driver's (transonicDomains).
 *
 * Writes ../out/blind-run-3/solves-gpu/M<mach>.json (the CPU files' format,
 * plus the engine and the WebGPU adapter), skips a Mach number already
 * written, and keeps each finished grid's state in ./checkpoints/ so that a
 * stopped run resumes at the next grid. Progress: ./progress.txt (rewritten at
 * every check). See ./README.txt.
 */

import { expect, inject, it } from 'vitest';
import { commands } from 'vitest/browser';
import { GPU_TRANSONIC_SWEEPS } from '../../../../src/analysis/gpu-nose-drag';
import { gpuTransonicEngine } from '../../../../src/analysis/gpu-transonic';
import {
  GEOMETRIC_NOISE,
  RESIDUAL_DIVERGENCE,
  RESIDUAL_FALL,
  SETTLE_NOISE,
  transonicDomains,
  WANDER_CHECKS,
  type TransonicCells,
  type TransonicEngine,
} from '../../../../src/analysis/transonic-drag';
import { transonicProblem, type TransonicProblem } from '../../../../src/analysis/transonic-flow';
import { Euler2D } from '../../../../src/engine-cpu/euler2d';
import type { Body } from '../../../../src/geometry/body';
import { TN4233_CONE_HALF_ANGLE } from '../../../../src/validation/cone-cylinder-tn4233';
import {
  dampedOscillationBound,
  SettlingValue,
} from '../../../../src/verification/iterative-convergence';

const gamma = 1.4;
const KIT = 'docs/research/nose-model-form/owner-kit';
const OUT = 'docs/research/nose-model-form/out/blind-run-3/solves-gpu';
const FIRST_MACH = 1.078;
const FINEST = inject('kitFinest');
const SOFTWARE = inject('kitSoftware');
// A check run (FINEST below 8, or SwiftShader) writes elsewhere and never into the results.
const outDir = FINEST === 8 && !SOFTWARE ? OUT : `${KIT}/check`;
const ckDir = `${KIT}/checkpoints`;

// The driver's grid-solve settings, as blind-run-3-solve.test.ts.
const CHECK_EVERY = 50;
const MAX_STEPS = 400_000;
const CFL = 1000;

const body: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan(TN4233_CONE_HALF_ANGLE), baseRadius: 1 },
  cylinderLength: 0,
};

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

class NotConverged extends Error {}

interface GridResult {
  readonly refinement: number;
  readonly ni: number;
  readonly nj: number;
  readonly drag: number;
  readonly steps: number;
  readonly seconds: number;
  readonly noise: number;
  readonly rate: number;
}

/** As transonic-drag.ts. */
function geometricRemaining(values: readonly number[]): number {
  if (values.length < 3) return Infinity;
  const [a, b, c] = values.slice(-3) as [number, number, number];
  const d1 = b - a;
  const d2 = c - b;
  if (Math.abs(d2) <= 1e-12 * Math.abs(c)) return Math.abs(d2);
  if (d1 === 0) return Infinity;
  const r = Math.abs(d2 / d1);
  return r < 1 ? (Math.abs(d2) * r) / (1 - r) : Infinity;
}

/** verifiedTransonicDrag's solveGrid, its tests unchanged (transonic-drag.ts). */
async function solveGrid(
  engine: TransonicEngine,
  problem: TransonicProblem,
  start: { problem: TransonicProblem; cells: TransonicCells; rate: number } | null,
  tag: string,
  checkPrecision: boolean,
): Promise<{ result: GridResult; conserved: Float64Array }> {
  const refinement = problem.options.refinement;
  const every = CHECK_EVERY * refinement;
  const free = problem.freeStream.state;
  const solver = await engine(problem);
  const t0 = performance.now();
  try {
    if (start === null) await solver.start(() => free, 1);
    else {
      const ratio = refinement / start.problem.options.refinement;
      const coarse = start.cells;
      await solver.start((i, j) => coarse(Math.floor(i / ratio), Math.floor(j / ratio)), CFL);
    }
    const settling = new SettlingValue(SETTLE_NOISE, start?.rate ?? Number.NaN);
    const history: number[] = [];
    let steps = 0;
    let drag = Number.NaN;
    let passes = 0;
    let remaining = Infinity;
    let oscillation = 0;
    let firstResidual = Number.NaN;
    let largestResidual = 0;
    let lastResidual = Number.NaN;
    let settled = false;
    while (steps < MAX_STEPS) {
      await solver.iterate(every);
      steps += every;
      if (checkPrecision && steps === every) await solver.checkPrecision();
      drag = await solver.drag();
      if (!Number.isFinite(drag)) throw new NotConverged('the drag is not finite');
      const residual = await solver.residual();
      if (Number.isNaN(firstResidual)) firstResidual = residual;
      if (residual > RESIDUAL_DIVERGENCE * firstResidual)
        throw new NotConverged(`the residual grew from ${firstResidual} to ${residual}`);
      largestResidual = Math.max(largestResidual, residual);
      const moving = residual !== lastResidual;
      lastResidual = residual;
      await log(
        `${tag} r=${refinement} steps=${steps} drag=${drag.toPrecision(9)} residual=${residual.toExponential(3)} s=${((performance.now() - t0) / 1000).toFixed(0)}`,
      );
      history.push(drag);
      remaining = geometricRemaining(history);
      passes = remaining <= GEOMETRIC_NOISE * Math.abs(drag) ? passes + 1 : 0;
      const settlingPassed = settling.add(drag);
      if (!(settlingPassed || passes >= 2)) continue;
      if (!Number.isFinite(remaining)) continue;
      if (!(moving && residual <= RESIDUAL_FALL * largestResidual)) continue;
      const fit = dampedOscillationBound(history, 10 * GEOMETRIC_NOISE * Math.abs(drag));
      oscillation = fit.bound;
      if (fit.fitted > 0 && fit.decaying && oscillation <= SETTLE_NOISE * Math.abs(drag)) {
        settled = true;
        break;
      }
    }
    if (!settled) throw new NotConverged(`the drag did not settle within ${MAX_STEPS} steps`);
    let low = drag;
    let high = drag;
    for (let k = 0; k < WANDER_CHECKS; k++) {
      await solver.iterate(every);
      steps += every;
      drag = await solver.drag();
      low = Math.min(low, drag);
      high = Math.max(high, drag);
    }
    const scale = Math.abs(drag);
    const noise = Math.max(
      SETTLE_NOISE,
      (high - low) / scale,
      remaining / scale,
      oscillation / scale,
    );
    const copy = new Euler2D(problem.config);
    copy.setCellPrimitives(await solver.cells());
    return {
      result: {
        refinement,
        ni: problem.config.grid.ni,
        nj: problem.config.grid.nj,
        drag,
        steps,
        seconds: (performance.now() - t0) / 1000,
        noise,
        rate: settling.rateToPassOn,
      },
      conserved: copy.conserved(),
    };
  } finally {
    solver.destroy();
  }
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

/** The wall pressure coefficient on the cone and the first calibers of cylinder, finest grid. */
function wallCp(problem: TransonicProblem, conserved: Float64Array) {
  const solver = new Euler2D(problem.config);
  solver.setConserved(conserved);
  const { pressure, dynamicPressure } = problem.freeStream;
  const L = body.nose.length;
  return solver
    .boundaryFluxes('jMin')
    .filter((f) => f.x >= 0 && f.x <= L + 4 && f.y > 1e-12)
    .map((f) => {
      const p = f.flux[1] * f.nx + f.flux[2] * f.ny;
      return { x: f.x, y: f.y, cp: (p - pressure) / dynamicPressure };
    });
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
  const domains = transonicDomains(body, mach);
  const problemOf = (refinement: number) =>
    transonicProblem(body, {
      mach,
      gamma,
      refinement,
      farField: domains.family.farField,
      cylinder: domains.family.cylinder,
      ...(domains.family.nested === undefined ? {} : { nested: domains.family.nested }),
    });
  const engineName = `GPU two-float (gpuTransonicEngine), red-black implicit, ${GPU_TRANSONIC_SWEEPS} sweeps, CFL to ${CFL}`;
  const levels: GridResult[] = [];
  let previous: { problem: TransonicProblem; cells: TransonicCells; rate: number } | null = null;
  let last: { problem: TransonicProblem; conserved: Float64Array } | null = null;
  try {
    for (let r = 1; r <= FINEST; r *= 2) {
      const problem = problemOf(r);
      const ck = `${ckDir}/${SOFTWARE ? 'software-' : ''}${tag}-r${r}`;
      let solved: { result: GridResult; conserved: Float64Array };
      if ((await exists(`${ck}.json`)) && (await exists(`${ck}.b64`))) {
        solved = {
          result: JSON.parse(await commands.readFile(`${ck}.json`)) as GridResult,
          conserved: fromBase64(await commands.readFile(`${ck}.b64`)),
        };
        await log(`${tag} r=${r} resumed from its checkpoint`);
      } else {
        solved = await solveGrid(engine, problem, previous, tag, r === 1);
        await commands.writeFile(`${ck}.b64`, toBase64(solved.conserved));
        await commands.writeFile(`${ck}.json`, JSON.stringify(solved.result));
      }
      levels.push(solved.result);
      await log(
        `${tag} r=${r} settled: drag ${solved.result.drag} in ${solved.result.steps} steps (${Math.round(solved.result.seconds)} s)`,
      );
      const holder = new Euler2D(problem.config);
      holder.setConserved(solved.conserved);
      previous = { problem, cells: (i, j) => holder.primitive(i, j), rate: solved.result.rate };
      last = { problem, conserved: solved.conserved };
    }
    await commands.writeFile(
      file,
      JSON.stringify({
        mach,
        converged: true,
        finest: FINEST,
        engine: engineName,
        device,
        domain: {
          farRadius: last!.problem.grid.farRadius,
          cylinderCalibers: domains.family.cylinder,
        },
        noseLengthRadii: body.nose.length,
        levels,
        wall: wallCp(last!.problem, last!.conserved),
      }) + '\n',
    );
  } catch (error) {
    if (!(error instanceof NotConverged)) throw error;
    await log(`${tag} NOT CONVERGED: ${error.message}`);
    await commands.writeFile(
      file,
      JSON.stringify({
        mach,
        converged: false,
        reason: error.message,
        finest: FINEST,
        engine: engineName,
        device,
        levels,
      }) + '\n',
    );
  }
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
  const list = await machs();
  await log(`adapter ${JSON.stringify(device)}`);
  await log(
    `Mach numbers (${list.length}): ${list.join(', ')}; finest r = ${FINEST}; out ${outDir}`,
  );
  expect(list.length).toBeGreaterThan(0);
  for (const m of list) await solveMach(engine, device, m);
  await log('all done');
  await log(
    outDir === OUT
      ? `Send the results back: commit ${OUT}/*.json (not the checkpoints) to claude/wip/nose-model-form and push, or zip that folder and send it (README.txt).`
      : `Check run only: results in ${outDir}, not in ${OUT}.`,
  );
});
