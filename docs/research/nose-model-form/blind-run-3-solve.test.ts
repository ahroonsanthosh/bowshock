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
 * 4, 8 each from the one before, each grid run to the driver's settling test.
 * The driver itself cannot be called: it serves Mach 1 to 1.2 only and does
 * not return the flow. Its grid solve (solveGrid, not exported) is copied
 * below unchanged in its tests and constants; the domain allowances and the
 * grid-convergence band are not computed (this run needs the wall pressures,
 * not a served value). Below Mach 1 this is outside 0013's verified range
 * (Mach 1 to 1.2): labelled so in the output.
 *
 * Long: run in the background, one Mach number at a time, from 1.064 down.
 * Each finished Mach number is written to ./out/blind-run-3/solves/M<mach>.json
 * and skipped on a restart; each finished grid's state is kept in
 * $CHECKPOINTS (default: none), so a restart resumes at the next grid.
 * Progress goes to $LOG (one line per check). Run:
 *   ONLY=./blind-run-3-solve.test.ts npx vitest run --config docs/research/nose-model-form/vitest.config.ts
 * MACHS=1.064,1.062 limits the Mach numbers; FINEST=2 stops early (probes only:
 * written to ./out/blind-run-3/probe/ instead).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import {
  cpuTransonicEngine,
  GEOMETRIC_NOISE,
  RESIDUAL_DIVERGENCE,
  RESIDUAL_FALL,
  SETTLE_NOISE,
  transonicDomains,
  WANDER_CHECKS,
  type TransonicCells,
} from '../../../src/analysis/transonic-drag';
import { transonicProblem, type TransonicProblem } from '../../../src/analysis/transonic-flow';
import { Euler2D } from '../../../src/engine-cpu/euler2d';
import type { Body } from '../../../src/geometry/body';
import { TN4233_CONE_HALF_ANGLE } from '../../../src/validation/cone-cylinder-tn4233';
import {
  dampedOscillationBound,
  SettlingValue,
} from '../../../src/verification/iterative-convergence';

const gamma = 1.4;
const here = dirname(fileURLToPath(import.meta.url));
const FIRST_MACH = 1.078;
const FINEST = Number(process.env.FINEST ?? 8);
const PROBE = FINEST !== 8;
const outDir = join(here, 'out', 'blind-run-3', PROBE ? 'probe' : 'solves');
const checkpoints = process.env.CHECKPOINTS ?? '';

// The driver's grid-solve settings (verifiedTransonicDrag's defaults).
const CHECK_EVERY = 50;
const MAX_STEPS = 400_000;
const CFL = 1000;

/** The cone-cylinder, base radius 1 (as tests/analysis/transonic-flow.test.ts). */
const body: Body = {
  nose: {
    shape: { kind: 'conical' },
    length: 1 / Math.tan(TN4233_CONE_HALF_ANGLE),
    baseRadius: 1,
  },
  cylinderLength: 0,
};

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

/** Progress, one line per check, appended to $LOG (vitest keeps a passing test's stdout). */
const log = (s: string) => {
  const line = `${new Date().toISOString()} ${s}\n`;
  if (process.env.LOG) appendFileSync(process.env.LOG, line);
  else process.stdout.write(line);
};

/** verifiedTransonicDrag's solveGrid on the CPU engine, its tests unchanged (transonic-drag.ts). */
async function solveGrid(
  problem: TransonicProblem,
  start: { problem: TransonicProblem; cells: TransonicCells; rate: number } | null,
  tag: string,
): Promise<{ result: GridResult; cells: TransonicCells; conserved: Float64Array }> {
  const refinement = problem.options.refinement;
  const every = CHECK_EVERY * refinement;
  const free = problem.freeStream.state;
  const solver = await cpuTransonicEngine(CFL)(problem);
  const t0 = performance.now();
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
    drag = await solver.drag();
    if (!Number.isFinite(drag)) throw new NotConverged('the drag is not finite');
    const residual = await solver.residual();
    if (Number.isNaN(firstResidual)) firstResidual = residual;
    if (residual > RESIDUAL_DIVERGENCE * firstResidual)
      throw new NotConverged(`the residual grew from ${firstResidual} to ${residual}`);
    largestResidual = Math.max(largestResidual, residual);
    const moving = residual !== lastResidual;
    lastResidual = residual;
    log(
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
  const cells = await solver.cells();
  const copy = new Euler2D(problem.config);
  copy.setCellPrimitives(cells);
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
    cells,
    conserved: copy.conserved(),
  };
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
      // On a wall the momentum flux along the outward normal is the pressure.
      const p = f.flux[1] * f.nx + f.flux[2] * f.ny;
      return { x: f.x, y: f.y, cp: (p - pressure) / dynamicPressure };
    });
}

async function solveMach(mach: number): Promise<void> {
  const tag = `M${mach.toFixed(3)}`;
  const file = join(outDir, `${tag}.json`);
  if (existsSync(file)) {
    log(`${tag} done before: skipped`);
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
  const levels: GridResult[] = [];
  let previous: { problem: TransonicProblem; cells: TransonicCells; rate: number } | null = null;
  let last: { problem: TransonicProblem; conserved: Float64Array } | null = null;
  try {
    for (let r = 1; r <= FINEST; r *= 2) {
      const problem = problemOf(r);
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
        const s = await solveGrid(problem, previous, tag);
        solved = s;
        if (ck !== '') {
          mkdirSync(checkpoints, { recursive: true });
          writeFileSync(`${ck}.bin`, Buffer.from(s.conserved.buffer));
          writeFileSync(`${ck}.json`, JSON.stringify(s.result));
        }
      }
      levels.push(solved.result);
      log(`${tag} r=${r} settled: drag ${solved.result.drag} in ${solved.result.steps} steps`);
      const holder = new Euler2D(problem.config);
      holder.setConserved(solved.conserved);
      previous = {
        problem,
        cells: (i, j) => holder.primitive(i, j),
        rate: solved.result.rate,
      };
      last = { problem, conserved: solved.conserved };
    }
    const wall = wallCp(last!.problem, last!.conserved);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      file,
      JSON.stringify({
        mach,
        converged: true,
        finest: FINEST,
        domain: {
          farRadius: last!.problem.grid.farRadius,
          cylinderCalibers: domains.family.cylinder,
        },
        noseLengthRadii: body.nose.length,
        levels,
        wall,
      }) + '\n',
    );
  } catch (error) {
    if (!(error instanceof NotConverged)) throw error;
    log(`${tag} NOT CONVERGED: ${error.message}`);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      file,
      JSON.stringify({ mach, converged: false, reason: error.message, finest: FINEST, levels }) +
        '\n',
    );
  }
}

it('solves the transonic family at each TN 4233 row below indicated Mach 1.078', async () => {
  const list = machs();
  log(`Mach numbers (${list.length}): ${list.join(', ')}; finest r = ${FINEST}`);
  expect(list.length).toBeGreaterThan(0);
  for (const m of list) await solveMach(m);
  log('all done');
});
