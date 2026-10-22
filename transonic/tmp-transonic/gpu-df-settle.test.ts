/**
 * The two-float GPU engine (gpuTransonicEngine) on the cone's base grid
 * from the free stream, settled by the page driver's own test
 * (SettlingValue at 1e-7, or the geometric remaining change below 1e-9 on
 * two checks; checks every 50 steps), then r = 2 started from r = 1's
 * solution: steps, seconds per step, and the drag against the CPU's.
 * Writes each line as it comes to tests/tmp-transonic/df-settle.txt.
 */
import { it } from 'vitest';
import { commands } from 'vitest/browser';
import { gpuTransonicEngine } from '../../src/analysis/gpu-transonic';
import { solveTransonic, transonicProblem } from '../../src/analysis/transonic-flow';
import type { TransonicCells } from '../../src/analysis/transonic-drag';
import type { Body } from '../../src/geometry/body';
import { SettlingValue } from '../../src/verification/iterative-convergence';
import { requireDevice } from '../gpu/device';

const gamma = 1.4;
const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};
const OUT = 'df-settle2.txt';
let text = '';
async function say(line: string): Promise<void> {
  text += line + '\n';
  await commands.writeFile(OUT, text);
}

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

it('gpu two-float settle', { timeout: 7_000_000 }, async () => {
  const device = await requireDevice();
  await say(`start ${new Date().toISOString()}`);
  const cases = [
    [1.1, 2, true],
    [1.2, 2, false],
    [1.05, 2, false],
    [1.1, 3, false],
  ] as const;
  for (const [mach, sweeps, refine] of cases) {
    const engine = gpuTransonicEngine(device, { sweeps });
    let start: { cells: TransonicCells; r: number } | null = null;
    for (const refinement of refine ? [1, 2] : [1]) {
      const problem = transonicProblem(cone, { mach, gamma, refinement, farField: 100, cylinder: 10 });
      const cells = problem.config.grid.ni * problem.config.grid.nj;
      const solver = await engine(problem);
      if (start === null) {
        await solver.start(() => problem.freeStream.state, 1);
      } else {
        const from = start;
        const ratio = refinement / from.r;
        await solver.start((i, j) => from.cells(Math.floor(i / ratio), Math.floor(j / ratio)), 1000);
      }
      const every = 50 * refinement;
      const settling = new SettlingValue(1e-7);
      const recent: number[] = [];
      let steps = 0;
      let passes = 0;
      let drag = Number.NaN;
      let stepSeconds = 0;
      let dragSeconds = 0;
      let settled = false;
      while (steps < 8000 * refinement) {
        const t0 = performance.now();
        await solver.iterate(every);
        const t1 = performance.now();
        drag = await solver.drag();
        const t2 = performance.now();
        stepSeconds += (t1 - t0) / 1000;
        dragSeconds += (t2 - t1) / 1000;
        steps += every;
        recent.push(drag);
        if (recent.length > 3) recent.shift();
        const remaining = geometricRemaining(recent);
        passes = remaining <= 1e-9 * Math.abs(drag) ? passes + 1 : 0;
        if (steps % (every * 10) === 0) {
          await say(
            `  M ${mach} RB${sweeps} r${refinement}: ${steps} steps, drag ${drag}, remaining ${remaining.toExponential(2)}, ${((1000 * stepSeconds) / steps).toFixed(1)} ms/step`,
          );
        }
        if (settling.add(drag) || passes >= 2) {
          settled = true;
          break;
        }
      }
      const cpu =
        refinement === 1
          ? solveTransonic(problem, {
              noise: 1e-12,
              maxSteps: 40000,
              checkEvery: 50,
              cfl: 1000,
              depth: 8,
              plainSteps: 200,
            }).drag
          : Number.NaN;
      await say(
        `M ${mach} RB${sweeps} r${refinement} (${cells} cells): settled ${settled} after ${steps} steps; ${((1000 * stepSeconds) / steps).toFixed(1)} ms/step (${((1e9 * stepSeconds) / (steps * cells)).toFixed(0)} ns per cell-step), drag checks ${dragSeconds.toFixed(0)} s; drag ${drag}, CPU converged ${cpu}, ${(drag / cpu - 1).toExponential(2)}`,
      );
      start = { cells: await solver.cells(), r: refinement };
      solver.destroy();
    }
  }
  await say(`end ${new Date().toISOString()}`);
});
