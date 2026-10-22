/**
 * Resumable measurement job: one body, Mach number and domain, on grids
 * refined by 2 from the base grid. Each converged grid appends a line to
 * tests/tmp-transonic/results/<tag>.jsonl and saves its state under
 * tests/tmp-transonic/states/, so that a restarted job skips the grids
 * done and starts the next from the saved coarser one. Progress lines go
 * to tests/tmp-transonic/progress/<tag>.jsonl.
 *
 * Environment: BODY (cone7 | ogive5 | ogive3 | cone10 | cone15), MACH, FAR
 * (radii), CYL (calibers), REFS (comma list, e.g. 1,2,4), TAG (default
 * from the others), NOISE, DEPTH, MAXSTEPS (per refinement), NESTED (JSON, the
 * grid of FAR and CYL cut back or continued node for node: transonicGrid),
 * RELAX (jacobi:N or redBlack:N, the implicit steps' relaxation).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { solveTransonic, transonicProblem } from '../../src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';
import { gridQuality } from '../../src/grid/quality';

const deg = Math.PI / 180;
const bodies: Record<string, Body> = {
  cone7: {
    nose: {
      shape: { kind: 'conical' },
      length: 1 / Math.tan((6 + 59 / 60) * deg),
      baseRadius: 1,
    },
    cylinderLength: 0,
  },
  cone10: {
    nose: { shape: { kind: 'conical' }, length: 1 / Math.tan(10 * deg), baseRadius: 1 },
    cylinderLength: 0,
  },
  cone15: {
    nose: { shape: { kind: 'conical' }, length: 1 / Math.tan(15 * deg), baseRadius: 1 },
    cylinderLength: 0,
  },
  hemi: { nose: { shape: { kind: 'ellipsoid' }, length: 1, baseRadius: 1 }, cylinderLength: 0 },
  ell2: { nose: { shape: { kind: 'ellipsoid' }, length: 2, baseRadius: 1 }, cylinderLength: 0 },
  ogive10: { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 20, baseRadius: 1 }, cylinderLength: 0 },
  ogive5: { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 10, baseRadius: 1 }, cylinderLength: 0 },
  ogive3: { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 6, baseRadius: 1 }, cylinderLength: 0 },
};

it('family', () => {
  const bodyName = process.env.BODY ?? 'cone7';
  const body = bodies[bodyName]!;
  const mach = Number(process.env.MACH ?? 1.05);
  const farField = Number(process.env.FAR ?? 100);
  const cylinder = Number(process.env.CYL ?? 10);
  const refs = (process.env.REFS ?? '1,2,4').split(',').map(Number);
  const tag = process.env.TAG ?? `${bodyName}-m${mach}-f${farField}-c${cylinder}`;
  const noise = Number(process.env.NOISE ?? 1e-7);
  const depth = Number(process.env.DEPTH ?? 8);
  const maxSteps = Number(process.env.MAXSTEPS ?? 20000);
  for (const dir of ['results', 'states', 'progress']) mkdirSync(`tests/tmp-transonic/${dir}`, { recursive: true });
  const resultsFile = `tests/tmp-transonic/results/${tag}.jsonl`;
  const done = new Set<number>();
  if (existsSync(resultsFile)) {
    for (const line of readFileSync(resultsFile, 'utf8').split('\n')) {
      if (line.trim() === '') continue;
      const r = JSON.parse(line) as { refinement: number; converged: boolean };
      if (r.converged) done.add(r.refinement);
    }
  }
  let previous: { problem: ReturnType<typeof transonicProblem>; solver: Euler2D } | undefined;
  let knownRate = Number.NaN;
  for (const refinement of refs) {
    const options = {
      mach,
      gamma: 1.4,
      refinement,
      farField,
      cylinder,
      ...(process.env.SPACING !== undefined ? { spacing: JSON.parse(process.env.SPACING) as object } : {}),
      ...(process.env.NESTED !== undefined
        ? { nested: JSON.parse(process.env.NESTED) as { farField?: number; cylinder?: number } }
        : {}),
    };
    const problem = transonicProblem(body, options);
    const stateFile = `tests/tmp-transonic/states/${tag}-r${refinement}.bin`;
    if (done.has(refinement) && existsSync(stateFile)) {
      const solver = new Euler2D(problem.config);
      const bytes = readFileSync(stateFile);
      const q = new Float64Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 8);
      solver.setConserved(Float64Array.from(q));
      previous = { problem, solver };
      continue;
    }
    const progress = `tests/tmp-transonic/progress/${tag}.jsonl`;
    const steps = Number(process.env.CHECK ?? refinement * 50);
    // Checkpoints: every CKPT_SECONDS (default 600) the state at a check is
    // saved; a restarted job resumes this grid from it (as a start on the
    // same grid: full CFL, the settling test starting afresh).
    const ckFile = `tests/tmp-transonic/states/${tag}-r${refinement}-ck.bin`;
    const ckMeta = `${ckFile}.json`;
    let start = previous;
    let offset = 0;
    let secondsOffset = 0;
    let cpuOffset = 0;
    let resumedFrom: number | null = null;
    if (existsSync(ckFile) && existsSync(ckMeta)) {
      const solver = new Euler2D(problem.config);
      const bytes = readFileSync(ckFile);
      solver.setConserved(Float64Array.from(new Float64Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 8)));
      const meta = JSON.parse(readFileSync(ckMeta, 'utf8')) as {
        steps: number;
        seconds: number;
        cpuSeconds: number;
        knownRate: number | null;
      };
      start = { problem, solver };
      offset = meta.steps;
      secondsOffset = meta.seconds;
      cpuOffset = meta.cpuSeconds;
      resumedFrom = offset;
      if (meta.knownRate !== null && Number.isFinite(meta.knownRate)) knownRate = meta.knownRate;
    }
    const ckSeconds = Number(process.env.CKPT_SECONDS ?? 600);
    let lastSave = Date.now();
    const cpu0 = process.cpuUsage();
    const solution = solveTransonic(
      problem,
      {
        noise,
        maxSteps: maxSteps * refinement - offset,
        checkEvery: steps,
        cfl: Number(process.env.CFL ?? 1000),
        depth,
        plainSteps: start === undefined ? 200 : 0,
        knownRate,
        geometricNoise: Number(process.env.GEO ?? 1e-9),
        ...(process.env.RELAX !== undefined
          ? {
              relaxation: {
                kind: process.env.RELAX.split(':')[0] as 'jacobi' | 'redBlack',
                sweeps: Number(process.env.RELAX.split(':')[1]),
              },
            }
          : {}),
        onCheck: (c) => {
          appendFileSync(
            progress,
            JSON.stringify({
              refinement,
              steps: c.steps + offset,
              drag: c.drag,
              residual: c.residual,
              seconds: c.seconds + secondsOffset,
              rssMB: Math.round(process.memoryUsage().rss / 1e6),
            }) + '\n',
          );
          if (Date.now() - lastSave < ckSeconds * 1000) return;
          lastSave = Date.now();
          const now = process.cpuUsage(cpu0);
          writeFileSync(`${ckFile}.tmp`, Buffer.from(c.solver.conserved().buffer));
          writeFileSync(
            `${ckMeta}.tmp`,
            JSON.stringify({
              steps: c.steps + offset,
              seconds: c.seconds + secondsOffset,
              cpuSeconds: cpuOffset + (now.user + now.system) / 1e6,
              knownRate: Number.isFinite(knownRate) ? knownRate : null,
            }),
          );
          renameSync(`${ckFile}.tmp`, ckFile);
          renameSync(`${ckMeta}.tmp`, ckMeta);
          appendFileSync(progress, JSON.stringify({ refinement, checkpoint: c.steps + offset }) + '\n');
        },
      },
      start,
    );
    const cpu = process.cpuUsage(cpu0);
    knownRate = solution.rate;
    const q = gridQuality(problem.grid.grid);
    writeFileSync(stateFile, Buffer.from(solution.solver.conserved().buffer));
    appendFileSync(
      resultsFile,
      JSON.stringify({
        body: bodyName,
        mach,
        farField,
        farRadius: problem.grid.farRadius,
        cylinder,
        nested: process.env.NESTED ?? null,
        relaxation: process.env.RELAX ?? null,
        xUpstream: problem.grid.xUpstream,
        xEnd: problem.grid.xEnd,
        refinement,
        ni: problem.grid.grid.ni,
        nj: problem.grid.grid.nj,
        drag: solution.drag,
        converged: solution.converged,
        steps: solution.steps + offset,
        seconds: solution.seconds + secondsOffset,
        cpuSeconds: cpuOffset + (cpu.user + cpu.system) / 1e6,
        resumedFrom,
        stoppedBy: solution.stoppedBy,
        checkEvery: steps,
        remainingEstimate: solution.remainingEstimate,
        restarts: solution.restarts,
        rate: solution.rate,
        residual: solution.solver.densityResidualNorm(),
        // Pressure on the first wall face (next to a blunt nose's stagnation point).
        firstWallPressure: (() => {
          const f = solution.solver.boundaryFluxes('jMin')[0]!;
          return f.flux[1] * f.nx + f.flux[2] * f.ny;
        })(),
        minAngle: q.minAngle / deg,
        minWallAngle: q.minWallAngle / deg,
        maxSizeRatio: q.maxSizeRatio,
        maxAspectRatio: q.maxAspectRatio,
        noise,
        depth,
        multigrid: false,
        spacing: process.env.SPACING ?? null,
        date: new Date().toISOString(),
      }) + '\n',
    );
    for (const f of [ckFile, ckMeta]) if (existsSync(f)) unlinkSync(f);
    if (!solution.converged) break;
    previous = { problem, solver: solution.solver };
  }
});
