/**
 * fitted.test.ts with checkpoints and the drag-settling stop, on the
 * snapshot of the sources (tests/tmp-transonic/snap, whose fitShock gains
 * initialResidual and onCheck for this only). Same environment (BODY,
 * MACH, REFS) and results file (results/fitted-<body>-m<mach>.jsonl).
 *
 * The fit stops as fitShock's own test does (shock speeds and residual to
 * 1e-12), or once the drag's remaining iterative error, estimated
 * geometrically from its last changes between checks (every 100
 * iterations), is below 1e-9 of the drag on two successive checks; the
 * estimate is recorded. Every CKPT_SECONDS (default 600) the state at a
 * check (heights, cells, iterations, the residual the tolerance is
 * relative to, and the last drags) is saved, and a restarted job resumes
 * from it.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { bluntFitProblem, fittedFlow, sharpFitProblem } from './snap/src/analysis/fitted-flow';
import type { Body } from './snap/src/geometry/body';
import { noseTipSlope } from './snap/src/geometry/nose';
import type { Primitive2D } from './snap/src/scheme/flux';

const deg = Math.PI / 180;
const bodies: Record<string, Body> = {
  cone7: {
    nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
    cylinderLength: 2,
  },
  hemi: { nose: { shape: { kind: 'ellipsoid' }, length: 1, baseRadius: 1 }, cylinderLength: 4 },
  ell2c8: { nose: { shape: { kind: 'ellipsoid' }, length: 2, baseRadius: 1 }, cylinderLength: 8 },
  ogive5: { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 10, baseRadius: 1 }, cylinderLength: 2 },
};

/** Remaining change of a geometrically converging sequence from its last three values. */
function remaining(d: readonly number[]): number {
  if (d.length < 3) return Infinity;
  const [a, b, c] = d.slice(-3) as [number, number, number];
  const d1 = b - a;
  const d2 = c - b;
  if (d2 === 0) return 0;
  if (d1 === 0) return Infinity;
  const ratio = Math.abs(d2 / d1);
  return ratio < 1 ? (Math.abs(d2) * ratio) / (1 - ratio) : Infinity;
}

it('fitted references with checkpoints', () => {
  const name = process.env.BODY ?? 'cone7';
  const mach = Number(process.env.MACH ?? 1.2);
  const refs = (process.env.REFS ?? '1,2,4').split(',').map(Number);
  const settle = Number(process.env.SETTLE ?? 1e-9);
  const ckSeconds = Number(process.env.CKPT_SECONDS ?? 600);
  mkdirSync('tests/tmp-transonic/results', { recursive: true });
  mkdirSync('tests/tmp-transonic/states', { recursive: true });
  const file = `tests/tmp-transonic/results/fitted-${name}-m${mach}.jsonl`;
  const done = new Set<number>();
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (line.trim() !== '') done.add((JSON.parse(line) as { refinement: number }).refinement);
    }
  }
  const body = bodies[name]!;
  const sharp = Number.isFinite(noseTipSlope(body.nose));
  for (const refinement of refs) {
    if (done.has(refinement)) continue;
    const maxIterations = 40_000 * refinement;
    const options = { mach, gamma: 1.4, nj: 20, refinement };
    const fresh = sharp ? sharpFitProblem(body, options) : bluntFitProblem(body, options);
    const ck = `tests/tmp-transonic/states/fitted-${name}-m${mach}-r${refinement}-ck`;
    let problem = fresh;
    let offset = 0;
    let secondsOffset = 0;
    let cpuOffset = 0;
    let initialResidual: number | undefined;
    let drags: number[] = [];
    let resumedFrom: number | null = null;
    if (existsSync(`${ck}.bin`) && existsSync(`${ck}.json`)) {
      const meta = JSON.parse(readFileSync(`${ck}.json`, 'utf8')) as {
        heights: number[];
        ni: number;
        iterations: number;
        initialResidual: number;
        drags: number[];
        seconds: number;
        cpuSeconds: number;
      };
      const b = readFileSync(`${ck}.bin`);
      const cells = new Float64Array(b.buffer, b.byteOffset, b.byteLength / 8).slice();
      const cell = (i: number, j: number): Primitive2D => {
        const o = 4 * (i + j * meta.ni);
        return { rho: cells[o]!, u: cells[o + 1]!, v: cells[o + 2]!, p: cells[o + 3]! };
      };
      if (meta.heights.length !== fresh.lines.length) throw new Error('checkpoint of another grid');
      problem = { ...fresh, heights: meta.heights, initial: cell };
      offset = meta.iterations;
      initialResidual = meta.initialResidual;
      drags = meta.drags;
      secondsOffset = meta.seconds;
      cpuOffset = meta.cpuSeconds;
      resumedFrom = offset;
    }
    const t0 = performance.now();
    const cpu0 = process.cpuUsage();
    let lastSave = Date.now();
    let estimate = Infinity;
    let below = 0;
    let settled = false;
    const { fit, drag } = fittedFlow(problem, maxIterations - offset, {
      ...(initialResidual === undefined ? {} : { initialResidual }),
      onCheck: (s) => {
        const d = fresh.drag(s.solver.boundaryFluxes('jMin'));
        drags.push(d);
        if (drags.length > 3) drags = drags.slice(-3);
        estimate = remaining(drags);
        below = estimate < settle * Math.abs(d) ? below + 1 : 0;
        if (Date.now() - lastSave >= ckSeconds * 1000) {
          lastSave = Date.now();
          const m = s.solver.metrics;
          const cells = new Float64Array(4 * m.ni * m.nj);
          for (let j = 0; j < m.nj; j++) {
            for (let i = 0; i < m.ni; i++) {
              const w = s.solver.primitive(i, j);
              const o = 4 * (i + j * m.ni);
              cells[o] = w.rho;
              cells[o + 1] = w.u;
              cells[o + 2] = w.v;
              cells[o + 3] = w.p;
            }
          }
          const now = process.cpuUsage(cpu0);
          writeFileSync(`${ck}.bin.tmp`, Buffer.from(cells.buffer));
          writeFileSync(
            `${ck}.json.tmp`,
            JSON.stringify({
              heights: s.heights,
              ni: m.ni,
              iterations: s.iterations + offset,
              initialResidual: s.initialResidual,
              drags,
              seconds: secondsOffset + (performance.now() - t0) / 1000,
              cpuSeconds: cpuOffset + (now.user + now.system) / 1e6,
            }),
          );
          renameSync(`${ck}.bin.tmp`, `${ck}.bin`);
          renameSync(`${ck}.json.tmp`, `${ck}.json`);
        }
        if (below >= 2) {
          settled = true;
          return true;
        }
        return false;
      },
    });
    const cpu = process.cpuUsage(cpu0);
    // Smallest axial Mach number across the last column (the outflow).
    const m = fit.solver.metrics;
    let outflowMach = Infinity;
    for (let j = 0; j < m.nj; j++) {
      const w = fit.solver.primitive(m.ni - 1, j);
      outflowMach = Math.min(outflowMach, w.u / Math.sqrt((1.4 * w.p) / w.rho));
    }
    appendFileSync(
      file,
      JSON.stringify({
        body: name,
        mach,
        refinement,
        nj: 20 * refinement,
        drag,
        converged: fit.converged || settled,
        stoppedBy: fit.converged ? 'tolerances' : settled ? 'drag settled' : 'iterations',
        remainingEstimate: estimate,
        residual: fit.residual,
        maxSpeed: fit.maxSpeed,
        iterations: fit.iterations + offset,
        resumedFrom,
        outflowMach,
        seconds: secondsOffset + (performance.now() - t0) / 1000,
        cpuSeconds: cpuOffset + (cpu.user + cpu.system) / 1e6,
      }) + '\n',
    );
    for (const f of [`${ck}.bin`, `${ck}.json`]) if (existsSync(f)) unlinkSync(f);
  }
});
