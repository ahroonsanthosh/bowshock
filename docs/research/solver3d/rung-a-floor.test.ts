/**
 * Evidence (not a criterion) for the deviation recorded in docs/design/0021-3d-euler-fins.md section 12
 * (rung (a)'s 2D references): is the floor where the 2D residual stopped falling round-off? For each case, the
 * 2D reference converged as in rung-a.test.ts, then its residual compared with the residual of the same state
 * with every cell's conserved variables perturbed at random by a few units in the last place (4e-16
 * relative). If the stopped residual is of the size of the perturbed state's, the floor is the arithmetic's.
 * Writes out/rung-a-floor.json.
 *   ONLY=./rung-a-floor.test.ts nice -n 10 npx vitest run --config docs/research/solver3d/vitest.config.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { bluntFitProblem, fittedFlow, sharpFitProblem } from '../../../src/analysis/fitted-flow';
import type { Body } from '../../../src/geometry/body';

const here = dirname(fileURLToPath(import.meta.url));
const GAMMA = 1.4;
const DEG = Math.PI / 180;

const CASES: { name: string; body: Body; mach: number; kind: 'sharp' | 'blunt' }[] = [
  {
    name: '3-caliber tangent ogive, Mach 2',
    body: { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 }, cylinderLength: 2 },
    mach: 2,
    kind: 'sharp',
  },
  {
    name: '3:1 ellipsoid, Mach 2',
    body: { nose: { shape: { kind: 'ellipsoid' }, length: 1.5, baseRadius: 0.5 }, cylinderLength: 2 },
    mach: 2,
    kind: 'blunt',
  },
  {
    name: '5 deg cone, Mach 1.3',
    body: { nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(5 * DEG), baseRadius: 0.5 }, cylinderLength: 2 },
    mach: 1.3,
    kind: 'sharp',
  },
];

test("rung (a)'s 2D references: their residual floors against perturbations of a few ulps", { timeout: 86_400_000 }, () => {
  const out: Record<string, unknown>[] = [];
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (const c of CASES) {
    const options = { mach: c.mach, gamma: GAMMA, nj: 20, refinement: 1 };
    const problem = c.kind === 'sharp' ? sharpFitProblem(c.body, options) : bluntFitProblem(c.body, options);
    const two = fittedFlow(problem, 60_000).fit.solver;
    const { ni, nj } = two.metrics;
    let best = two.densityResidualNorm();
    let stalls = 0;
    for (let n = 0; n < 2000 && stalls < 20; n++) {
      two.iterate(500);
      const r = two.densityResidualNorm();
      if (r < 0.9 * best) {
        best = r;
        stalls = 0;
      } else stalls++;
    }
    const stopped = two.densityResidualNorm();
    const saved = [] as { rho: number; u: number; v: number; p: number }[];
    for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) saved.push(two.primitive(i, j));
    const perturbed: number[] = [];
    for (let trial = 0; trial < 5; trial++) {
      const e = () => 1 + 4e-16 * (2 * rand() - 1);
      two.setCellPrimitives((i, j) => {
        const w = saved[i + ni * j]!;
        return { rho: w.rho * e(), u: w.u * e(), v: w.v * e(), p: w.p * e() };
      });
      perturbed.push(two.densityResidualNorm());
    }
    out.push({ case: c.name, stoppedResidual: stopped, perturbedResiduals: perturbed, ratio: stopped / Math.min(...perturbed) });
    mkdirSync(join(here, 'out'), { recursive: true });
    writeFileSync(join(here, 'out', 'rung-a-floor.json'), JSON.stringify({ date: new Date().toISOString(), cases: out }, null, 2) + '\n');
  }
});
