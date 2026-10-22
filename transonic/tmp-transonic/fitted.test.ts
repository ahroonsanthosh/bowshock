/**
 * Reference drags from the supersonic solver with the bow shock fitted
 * (CPU, design record 0006) on nj = 20, 40, 80 (REFS), for the bodies of
 * the transonic study at the Mach numbers where it serves them. Appends
 * one line per grid to tests/tmp-transonic/results/fitted-<body>-m<mach>.jsonl.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { it } from 'vitest';
import { bluntFittedFlow, sharpFittedFlow } from '../../src/analysis/fitted-flow';
import { noseTipSlope } from '../../src/geometry/nose';
import type { Body } from '../../src/geometry/body';

const deg = Math.PI / 180;
const bodies: Record<string, Body> = {
  cone7: {
    nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
    cylinderLength: 2,
  },
  hemi: { nose: { shape: { kind: 'ellipsoid' }, length: 1, baseRadius: 1 }, cylinderLength: 4 },
  ell2: { nose: { shape: { kind: 'ellipsoid' }, length: 2, baseRadius: 1 }, cylinderLength: 4 },
  ell2c8: { nose: { shape: { kind: 'ellipsoid' }, length: 2, baseRadius: 1 }, cylinderLength: 8 },
  ogive5: { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 10, baseRadius: 1 }, cylinderLength: 2 },
};

it('fitted references', () => {
  const name = process.env.BODY ?? 'cone7';
  const mach = Number(process.env.MACH ?? 1.2);
  const refs = (process.env.REFS ?? '1,2,4').split(',').map(Number);
  mkdirSync('tests/tmp-transonic/results', { recursive: true });
  const file = `tests/tmp-transonic/results/fitted-${name}-m${mach}.jsonl`;
  const done = new Set<number>();
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (line.trim() !== '') done.add((JSON.parse(line) as { refinement: number }).refinement);
    }
  }
  for (const refinement of refs) {
    if (done.has(refinement)) continue;
    const t0 = performance.now();
    const cpu0 = process.cpuUsage();
    const body = bodies[name]!;
    const solve = Number.isFinite(noseTipSlope(body.nose)) ? sharpFittedFlow : bluntFittedFlow;
    const { fit, drag } = solve(body, {
      mach,
      gamma: 1.4,
      nj: 20,
      refinement,
      maxIterations: 40_000 * refinement,
    });
    appendFileSync(
      file,
      JSON.stringify({
        body: name,
        mach,
        refinement,
        nj: 20 * refinement,
        drag,
        converged: fit.converged,
        iterations: fit.iterations,
        seconds: (performance.now() - t0) / 1000,
        cpuSeconds: (process.cpuUsage(cpu0).user + process.cpuUsage(cpu0).system) / 1e6,
      }) + '\n',
    );
  }
});
