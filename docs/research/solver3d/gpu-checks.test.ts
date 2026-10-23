/**
 * The GPU sides of the code checks (4.0) and of rungs (a0) and (a) of docs/design/0021-3d-euler-fins.md, run
 * here on SwiftShader at small sizes. Writes docs/research/solver3d/out/gpu-checks.json.
 *
 * - 4.0: free stream on a perturbed sector with a displaced face (GPU 1e-6 relative); the GPU residual against
 *   the CPU's on the same 32-bit state, measured (registered: "a few units in the last place").
 * - (a0): the 2D GPU engine against the 2D CPU reference on the three cases of rung (a): eps_2D, the largest
 *   cell difference relative to the free stream's density, pressure and sound speed, after the GPU has
 *   converged from the CPU reference to its own floor. Registered: if eps_2D exceeds 1e-5 the ladder stops.
 * - (a), GPU: the 3D GPU engine on the revolved grid (K = 1 and K = 4), converged to the 32-bit floor, against
 *   the 2D CPU reference: every cell within eps_3D = 2 eps_2D (at most 2e-5), and the radial pressure force on
 *   the body faces within 2e-6 of the 2D CPU's (from cell pressures in both, the same formula).
 *
 *   ONLY=./gpu-checks.test.ts CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *     nice -n 10 npx vitest run --config docs/research/solver3d/vitest.gpu.config.ts
 */

import { commands } from 'vitest/browser';
import { expect, test } from 'vitest';
import { bluntFitProblem, fittedFlow, sharpFitProblem } from '../../../src/analysis/fitted-flow';
import { GpuEuler2D, gpuPrimitive2D } from '../../../src/engine-gpu/euler2d-gpu';
import type { Body } from '../../../src/geometry/body';
import { Euler3D, type BoundaryCondition3D, type Euler3DConfig, type Side3D } from '../../../src/solver3d/euler3d';
import { GpuEuler3D } from '../../../src/solver3d/euler3d-gpu';
import type { Primitive3D } from '../../../src/solver3d/flux3d';
import { gridFromFunction3D } from '../../../src/solver3d/grid3d';

const GAMMA = 1.4;
const DEG = Math.PI / 180;
// Relative to the repository root (the browser commands' base).
const OUT = 'docs/research/solver3d/out/gpu-checks.json';

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

const prim3 = (w: { rho: number; u: number; v: number; p: number }): Primitive3D => ({ rho: w.rho, u: w.u, v: w.v, w: 0, p: w.p });

test('GPU sides of 4.0, (a0) and (a)', async () => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter!.requestDevice({ requiredLimits: { maxStorageBuffersPerShaderStage: 8 } });
  const info = adapter!.info;
  const report: Record<string, unknown> = {
    date: new Date().toISOString(),
    adapter: { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description },
  };
  let pass = true;

  // 4.0: free stream and the residual against the CPU's.
  {
    const free: Primitive3D = { rho: 1, u: 2 * Math.sqrt(GAMMA), v: 0, w: 0, p: 1 };
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const ni = 10;
    const nj = 6;
    const nk = 5;
    const grid = gridFromFunction3D(ni, nj, nk, (i, j, k) => {
      const inside = i > 0 && i < ni && j > 0 && j < nj && k > 0 && k < nk;
      const e = () => (inside ? 0.6 * (rand() - 0.5) : 0);
      const x = (i + e()) / ni;
      const r = 0.5 + (j + e()) / nj;
      const z = r < 1.2 && x > 0.2 && x < 0.8 ? 0.04 * (1 - Math.abs(x - 0.5) / 0.3) : 0;
      const t0 = Math.asin(z / r);
      return [x, r, t0 + ((Math.PI / 4 - t0) * (k + e())) / nk];
    });
    const sides: Side3D[] = ['iMin', 'iMax', 'jMin', 'jMax', 'kMin', 'kMax'];
    const all = (bc: BoundaryCondition3D) => Object.fromEntries(sides.map((s) => [s, bc])) as Record<Side3D, BoundaryCondition3D>;
    const cfg: Euler3DConfig = { grid, geometry: 'cylindrical', gamma: GAMMA, timeIntegrator: 'ssprk2', cfl: 0.6, timeStepping: 'local', boundaries: all({ kind: 'inflow', state: free }) };
    const gpu = await GpuEuler3D.create(device, cfg);
    gpu.setCellPrimitives(() => free);
    const r = await gpu.residualVector();
    const scale = (free.rho * free.u * free.u + free.p) * Math.max(...Array.from(gpu.metrics.iFaces.s0, Math.abs));
    const freeStream = Math.max(...Array.from(r, Math.abs)) / scale;
    gpu.destroy();
    const cfg2: Euler3DConfig = { ...cfg, boundaries: { ...all({ kind: 'wall' }), iMin: { kind: 'inflow', state: free }, iMax: { kind: 'outflow' }, jMax: { kind: 'outflow' } } };
    const states = Array.from({ length: ni * nj * nk }, () => {
      const w = { rho: 1 + 0.2 * rand(), u: 2.3 + 0.3 * rand(), v: 0.2 * (rand() - 0.5), w: 0.2 * (rand() - 0.5), p: 1 + 0.3 * rand() };
      return { rho: Math.fround(w.rho), u: Math.fround(w.u), v: Math.fround(w.v), w: Math.fround(w.w), p: Math.fround(w.p) };
    });
    const cell = (i: number, j: number, k: number) => states[i + ni * (j + nj * k)]!;
    const cpu = new Euler3D(cfg2);
    cpu.setCellPrimitives(cell);
    const g2 = await GpuEuler3D.create(device, cfg2);
    g2.setCellPrimitives(cell);
    const a = cpu.residualVector();
    const b = await g2.residualVector();
    g2.destroy();
    let worst = 0;
    let s = 0;
    for (let n = 0; n < a.length; n++) {
      worst = Math.max(worst, Math.abs(a[n]! - b[n]!));
      s = Math.max(s, Math.abs(a[n]!));
    }
    report.codeChecks = { freeStreamRelative: freeStream, freeStreamPass: freeStream < 1e-6, residualAgainstCpuRelative: worst / s, float32Epsilon: 2 ** -23 };
    pass &&= freeStream < 1e-6;
  }

  const cases: unknown[] = [];
  for (const c of CASES) {
    const options = { mach: c.mach, gamma: GAMMA, nj: 20, refinement: 1 };
    const problem = c.kind === 'sharp' ? sharpFitProblem(c.body, options) : bluntFitProblem(c.body, options);
    const two = fittedFlow(problem, 60_000).fit.solver;
    let best = two.densityResidualNorm();
    let stalls = 0;
    for (let n = 0; n < 2000 && stalls < 20; n++) {
      two.iterate(500);
      const rr = two.densityResidualNorm();
      if (rr < 0.9 * best) {
        best = rr;
        stalls = 0;
      } else stalls++;
    }
    const { ni, nj } = two.metrics;
    const fs = problem.freeStream;
    const aFree = Math.sqrt((GAMMA * fs.p) / fs.rho);
    const diff = (a: { rho: number; u: number; v: number; p: number; w?: number }, b: { rho: number; u: number; v: number; p: number }) =>
      Math.max(Math.abs(a.rho - b.rho) / fs.rho, Math.abs(a.u - b.u) / aFree, Math.abs(a.v - b.v) / aFree, Math.abs(a.w ?? 0) / aFree, Math.abs(a.p - b.p) / fs.p);

    // (a0): the 2D GPU engine from the CPU reference, converged to its own floor.
    const g2d = await GpuEuler2D.create(device, { ...two.config, flux: 'hllc' });
    g2d.setCellPrimitives((i, j) => two.primitive(i, j));
    g2d.setFaceStates('jMax', two.faceStatesOf('jMax')!);
    const jf = two.faceFluxesOf('jMax');
    if (jf !== undefined) g2d.setFaceFluxes('jMax', jf);
    if (two.config.boundaries.iMin.kind === 'faceStates') g2d.setFaceStates('iMin', two.faceStatesOf('iMin')!);
    let r0 = await g2d.densityResidualNorm();
    for (let n = 0; n < 40; n++) {
      await g2d.iterate(250);
      const rr = await g2d.densityResidualNorm();
      if (rr > 0.8 * r0 && n > 4) break;
      r0 = Math.min(r0, rr);
    }
    const s2 = await g2d.readState();
    g2d.destroy();
    let eps2D = 0;
    for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) eps2D = Math.max(eps2D, diff(gpuPrimitive2D(s2, i + ni * j, GAMMA), two.primitive(i, j)));
    const a0Pass = eps2D <= 1e-5;
    pass &&= a0Pass;

    // (a), GPU: the 3D GPU engine on the revolved grid.
    const g2 = two.config.grid;
    const R = c.body.nose.baseRadius;
    let i0 = -1;
    for (let i = 2; i < ni; i++) {
      if (g2.x[i]! >= c.body.nose.length + 0.1 * R - 1e-12 && Math.abs(g2.y[i]! - R) < 1e-12) {
        i0 = i;
        break;
      }
    }
    const n3 = ni - i0;
    const layouts: unknown[] = [];
    for (const theta of [[0, 0.3], [0, 1, 2, 3, 4].map((k) => (k * Math.PI) / 16)]) {
      const nk = theta.length - 1;
      const grid = gridFromFunction3D(n3, nj, nk, (i, j, k) => [g2.x[i + i0 + (ni + 1) * j]!, g2.y[i + i0 + (ni + 1) * j]!, theta[k]!]);
      const iLayer = (g: number) => {
        const out: Primitive3D[] = [];
        for (let k = 0; k < nk; k++) for (let j = 0; j < nj; j++) out.push(prim3(two.primitive(i0 - 1 - g, j)));
        return out;
      };
      const jStates = two.faceStatesOf('jMax')!;
      const jLayer: Primitive3D[] = [];
      const jFlux = new Float64Array(5 * n3 * nk);
      for (let k = 0; k < nk; k++)
        for (let i = 0; i < n3; i++) {
          jLayer.push(prim3(jStates[i + i0]!));
          if (jf !== undefined) {
            const f = 4 * (i + i0);
            jFlux.set([jf[f]!, jf[f + 1]!, jf[f + 2]!, 0, jf[f + 3]!], 5 * (i + n3 * k));
          }
        }
      const cfg: Euler3DConfig = {
        grid,
        geometry: 'cylindrical',
        gamma: GAMMA,
        timeIntegrator: 'ssprk2',
        cfl: 0.8,
        timeStepping: 'local',
        boundaries: {
          iMin: { kind: 'faceStates', layer0: iLayer(0), layer1: iLayer(1) },
          iMax: { kind: 'outflow' },
          jMin: { kind: 'wall' },
          jMax: { kind: 'faceStates', layer0: jLayer, layer1: jLayer },
          kMin: { kind: 'wall' },
          kMax: { kind: 'wall' },
        },
      };
      const g3 = await GpuEuler3D.create(device, cfg);
      if (jf !== undefined) g3.setFaceFluxes('jMax', jFlux);
      g3.setCellPrimitives((i, j) => prim3(two.primitive(i + i0, j)));
      // To the 32-bit floor: until the cell states stop changing (no fall in the largest change over 5 checks).
      let previous = await g3.primitives();
      let bestChange = Infinity;
      let flat = 0;
      let steps = 0;
      while (flat < 5 && steps < 20_000) {
        await g3.iterate(200);
        steps += 200;
        const now = await g3.primitives();
        let change = 0;
        for (let q = 0; q < now.length; q++) change = Math.max(change, diff(now[q]!, previous[q]!));
        previous = now;
        if (change < 0.9 * bestChange) {
          bestChange = change;
          flat = 0;
        } else flat++;
      }
      g3.destroy();
      let eps3D = 0;
      let force3 = 0;
      let force2 = 0;
      const cpuMetrics = new Euler3D(cfg).metrics;
      for (let k = 0; k < nk; k++)
        for (let j = 0; j < nj; j++)
          for (let i = 0; i < n3; i++) eps3D = Math.max(eps3D, diff(previous[i + n3 * (j + nj * k)]!, two.primitive(i + i0, j)));
      for (let k = 0; k < nk; k++)
        for (let i = 0; i < n3; i++) {
          const sr = cpuMetrics.jFaces.s1[i + n3 * (0 + (nj + 1) * k)]!;
          force3 += previous[i + n3 * nj * k]!.p * sr;
          force2 += two.primitive(i + i0, 0).p * sr;
        }
      const limit = Math.min(2 * eps2D, 2e-5);
      const forceRel = Math.abs(force3 - force2) / Math.abs(force2);
      const ok = eps3D <= limit && forceRel <= 2e-6;
      pass &&= ok;
      layouts.push({ layers: nk, steps, eps3D, limit, bodyForceRelative: forceRel, pass: ok });
    }
    cases.push({ case: c.name, a0: { eps2D, pass: a0Pass }, a: layouts });
    report.cases = cases;
    await commands.writeFile(OUT, JSON.stringify(report, null, 2) + '\n');
  }
  device.destroy();
  expect(pass).toBe(true);
});
