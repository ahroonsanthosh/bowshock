/**
 * Continue a settled family grid from its saved state until the damped-oscillation fit has a
 * window (re-review of dd6c423, item 1): plain LU-SGS steps at CFL 1000 (the same fixed point),
 * a check every 50 r steps, a checkpoint every 10 minutes (resumed with its history), and a stop
 * when at least one window is fitted, decaying, with a bound within 1e-7 of the drag and at
 * least 30 checks. Environment: BODY (ogive3 | cone7), MACH, TAG (the family's tag), R (8).
 * Writes tests/tmp-transonic/results/cont-<TAG>-r<R>.jsonl (one line per check, and a final
 * line) and states/cont-<TAG>-r<R>-ck.bin(.json).
 */
import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { transonicProblem } from '../../src/analysis/transonic-flow';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import type { Body } from '../../src/geometry/body';
import { dampedOscillationBound } from '../../src/verification/iterative-convergence';

const deg = Math.PI / 180;
const bodies: Record<string, Body> = {
  cone7: {
    nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
    cylinderLength: 0,
  },
  ogive3: { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 6, baseRadius: 1 }, cylinderLength: 0 },
};

it('continue', () => {
  const body = bodies[process.env.BODY!]!;
  const mach = Number(process.env.MACH);
  const tag = process.env.TAG!;
  const r = Number(process.env.R ?? 8);
  const problem = transonicProblem(body, { mach, gamma: 1.4, refinement: r, farField: 100, cylinder: 10 });
  const out = `tests/tmp-transonic/results/cont-${tag}-r${r}.jsonl`;
  const ck = `tests/tmp-transonic/states/cont-${tag}-r${r}-ck.bin`;
  const solver = new Euler2D(problem.config);
  let history: number[] = [];
  let steps = 0;
  const load = (file: string) => {
    const bytes = readFileSync(file);
    solver.setConserved(Float64Array.from(new Float64Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 8)));
  };
  if (existsSync(ck) && existsSync(`${ck}.json`)) {
    load(ck);
    const meta = JSON.parse(readFileSync(`${ck}.json`, 'utf8')) as { steps: number; history: number[] };
    steps = meta.steps;
    history = meta.history;
  } else {
    load(`tests/tmp-transonic/states/${tag}-r${r}.bin`);
    const d0 = problem.drag(solver);
    history = [d0];
    appendFileSync(out, JSON.stringify({ start: true, drag: d0, date: new Date().toISOString() }) + '\n');
  }
  const every = 50 * r;
  let lastSave = Date.now();
  for (;;) {
    for (let n = 0; n < every; n++) solver.iterateImplicit(1, 1000);
    steps += every;
    const drag = problem.drag(solver);
    history.push(drag);
    const fit = dampedOscillationBound(history, 1e-8 * Math.abs(drag));
    const line = {
      steps,
      drag,
      residual: solver.densityResidualNorm(),
      fitted: fit.fitted,
      decaying: fit.decaying,
      bound: fit.bound / Math.abs(drag),
      date: new Date().toISOString(),
    };
    appendFileSync(out, JSON.stringify(line) + '\n');
    if (history.length >= 31 && fit.fitted > 0 && fit.decaying && fit.bound <= 1e-7 * Math.abs(drag)) {
      appendFileSync(
        out,
        JSON.stringify({ done: true, steps, drag, first: history[0], change: drag - history[0]!, spread: Math.max(...history) - Math.min(...history), bound: fit.bound }) + '\n',
      );
      return;
    }
    if (steps >= 40 * every) {
      appendFileSync(out, JSON.stringify({ done: false, steps, drag, reason: 'no fitted, decaying window within 40 checks' }) + '\n');
      return;
    }
    if (Date.now() - lastSave > 600_000) {
      writeFileSync(`${ck}.tmp`, Buffer.from(solver.conserved().buffer));
      writeFileSync(`${ck}.json.tmp`, JSON.stringify({ steps, history }));
      renameSync(`${ck}.tmp`, ck);
      renameSync(`${ck}.json.tmp`, `${ck}.json`);
      lastSave = Date.now();
    }
  }
});
