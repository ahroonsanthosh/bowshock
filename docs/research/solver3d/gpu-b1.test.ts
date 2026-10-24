/**
 * The GPU side of rung (b1) of docs/design/0021-3d-euler-fins.md (section 4.2), run here on SwiftShader: the
 * double wedge of t/c 0.08 at Mach 1.5 on 0009's 60 x 28 grid (as rung-b.test.ts's (b1)).
 *
 * - eps_2D for this case: the 2D GPU engine, started from the 2D CPU engine's converged state and converged to
 *   its own floor, against it: the largest cell difference relative to the free stream's density, pressure
 *   and sound speed (as (a0)).
 * - (b1), GPU: the planar 3D GPU engine (two layers between mirror faces), started from the same state and
 *   converged to its 32-bit floor: every cell within 2 eps_2D of the 2D CPU engine, |w| included.
 *
 * Writes docs/research/solver3d/out/gpu-b1.json.
 *   ONLY=./gpu-b1.test.ts CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *     nice -n 10 npx vitest run --config docs/research/solver3d/vitest.gpu.config.ts
 */

import { commands } from 'vitest/browser';
import { expect, test } from 'vitest';
import { Euler2D } from '../../../src/engine-cpu/euler2d';
import { GpuEuler2D, gpuPrimitive2D } from '../../../src/engine-gpu/euler2d-gpu';
import { doubleWedge } from '../../../src/fins/section';
import { gridFromFunction } from '../../../src/grid/structured';
import type { Euler3DConfig } from '../../../src/solver3d/euler3d';
import { GpuEuler3D } from '../../../src/solver3d/euler3d-gpu';
import type { Primitive3D } from '../../../src/solver3d/flux3d';
import { GAMMA, grid3D, surface } from './planar3d';

const OUT = 'docs/research/solver3d/out/gpu-b1.json';
const X_MIN = -0.3;
const X_MAX = 1.2;
const HEIGHT = 1.4;

test('GPU side of (b1)', async () => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter!.requestDevice({ requiredLimits: { maxStorageBuffersPerShaderStage: 8 } });
  const info = adapter!.info;
  const section = doubleWedge(0.08);
  const mach = 1.5;
  const xs = [X_MIN, ...section.x, X_MAX];
  const xNodes = [X_MIN];
  for (let k = 0; k + 1 < xs.length; k++) {
    const n = Math.round((xs[k + 1]! - xs[k]!) / 0.025);
    for (let i = 1; i <= n; i++) xNodes.push(xs[k]! + ((xs[k + 1]! - xs[k]!) * i) / n);
  }
  const ni = xNodes.length - 1;
  const nj = 28;
  const free = { rho: 1, u: mach * Math.sqrt(GAMMA), v: 0, p: 1 };
  const two = new Euler2D({
    grid: gridFromFunction(ni, nj, (i, j) => {
      const y0 = surface(section, xNodes[i]!);
      return [xNodes[i]!, y0 + ((HEIGHT - y0) * j) / nj];
    }),
    geometry: 'planar',
    gamma: GAMMA,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: { iMin: { kind: 'inflow', state: free }, iMax: { kind: 'outflow' }, jMin: { kind: 'wall' }, jMax: { kind: 'outflow' } },
  });
  two.setInitialCondition(() => free);
  let best = Infinity;
  let stalls = 0;
  let steps2 = 0;
  while (stalls < 20 && steps2 < 400_000) {
    two.iterate(500);
    steps2 += 500;
    const r = two.densityResidualNorm();
    if (r < 0.9 * best) {
      best = r;
      stalls = 0;
    } else stalls++;
  }
  const aFree = Math.sqrt(GAMMA);
  const diff = (a: { rho: number; u: number; v: number; p: number; w?: number }, b: { rho: number; u: number; v: number; p: number }) =>
    Math.max(Math.abs(a.rho - b.rho), Math.abs(a.u - b.u) / aFree, Math.abs(a.v - b.v) / aFree, Math.abs(a.w ?? 0) / aFree, Math.abs(a.p - b.p));

  // eps_2D: the 2D GPU engine from the CPU state, converged to its own floor.
  const g2d = await GpuEuler2D.create(device, two.config);
  g2d.setCellPrimitives((i, j) => two.primitive(i, j));
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

  // (b1), GPU: the planar 3D GPU engine from the same state, to its 32-bit floor.
  const free3: Primitive3D = { ...free, w: 0 };
  const cfg: Euler3DConfig = {
    grid: grid3D(section, xNodes, nj),
    geometry: 'planar',
    gamma: GAMMA,
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'inflow', state: free3 },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'outflow' },
      kMin: { kind: 'wall' },
      kMax: { kind: 'wall' },
    },
  };
  const g3 = await GpuEuler3D.create(device, cfg);
  g3.setCellPrimitives((i, j) => {
    const w = two.primitive(i, j);
    return { rho: w.rho, u: w.u, v: w.v, w: 0, p: w.p };
  });
  let previous = await g3.primitives();
  let bestChange = Infinity;
  let flat = 0;
  let steps3 = 0;
  while (flat < 5 && steps3 < 20_000) {
    await g3.iterate(200);
    steps3 += 200;
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
  device.destroy();
  let eps3D = 0;
  for (let k = 0; k < 2; k++)
    for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) eps3D = Math.max(eps3D, diff(previous[i + ni * (j + nj * k)]!, two.primitive(i, j)));
  const pass = eps3D <= 2 * eps2D;
  await commands.writeFile(
    OUT,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        adapter: { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description },
        grid: `${ni} x ${nj}`,
        steps2DCpu: steps2,
        residual2DCpu: best,
        eps2D,
        steps3DGpu: steps3,
        eps3D,
        limit: 2 * eps2D,
        pass,
      },
      null,
      2,
    ) + '\n',
  );
  expect(pass).toBe(true);
});
