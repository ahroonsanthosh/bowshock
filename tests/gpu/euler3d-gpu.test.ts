/**
 * The 3D GPU engine against the CPU engine (docs/design/0021-3d-euler-fins.md 4.0, GPU side), on small grids
 * (SwiftShader here, any adapter elsewhere): free-stream preservation to 1e-6, the residual of the same state
 * within a few units in the last place of 32 bits relative to the flux scale, and steps that follow the CPU's.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Euler3D,
  type BoundaryCondition3D,
  type Euler3DConfig,
  type Side3D,
} from '../../src/solver3d/euler3d';
import { GpuEuler3D } from '../../src/solver3d/euler3d-gpu';
import type { Primitive3D } from '../../src/solver3d/flux3d';
import { jitteredSector, random } from '../solver3d/helpers';
import { requireDevice } from './device';

let device: GPUDevice;
beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

const box = { x0: 0, x1: 1, r0: 0.5, r1: 1.5, t0: 0, t1: Math.PI / 4 };
const fin = (x: number, r: number) => {
  const z = r < 1.2 && x > 0.2 && x < 0.8 ? 0.04 * (1 - Math.abs(x - 0.5) / 0.3) : 0;
  return Math.asin(z / r);
};
const free: Primitive3D = { rho: 1, u: 2 * Math.sqrt(1.4), v: 0, w: 0, p: 1 };

function config(bc: Partial<Record<Side3D, BoundaryCondition3D>>, seed = 5): Euler3DConfig {
  const sides: Side3D[] = ['iMin', 'iMax', 'jMin', 'jMax', 'kMin', 'kMax'];
  return {
    grid: jitteredSector(10, 6, 5, box, 0.3, seed, fin),
    geometry: 'cylindrical',
    gamma: 1.4,
    timeIntegrator: 'ssprk2',
    cfl: 0.6,
    timeStepping: 'local',
    boundaries: Object.fromEntries(sides.map((s) => [s, bc[s] ?? { kind: 'wall' }])) as Record<
      Side3D,
      BoundaryCondition3D
    >,
  };
}

const f32 = (x: number) => Math.fround(x);
const rounded = (w: Primitive3D): Primitive3D => ({
  rho: f32(w.rho),
  u: f32(w.u),
  v: f32(w.v),
  w: f32(w.w),
  p: f32(w.p),
});

describe('the 3D GPU engine', () => {
  it('keeps a uniform stream along x to 1e-6 on a perturbed sector with a displaced face', async () => {
    const cfg = config({
      iMin: { kind: 'inflow', state: free },
      iMax: { kind: 'inflow', state: free },
      jMin: { kind: 'inflow', state: free },
      jMax: { kind: 'inflow', state: free },
      kMin: { kind: 'inflow', state: free },
      kMax: { kind: 'inflow', state: free },
    });
    const gpu = await GpuEuler3D.create(device, cfg);
    gpu.setCellPrimitives(() => free);
    const r = await gpu.residualVector();
    const scale =
      (free.rho * free.u * free.u + free.p) *
      Math.max(...Array.from(gpu.metrics.iFaces.s0, Math.abs));
    let worst = 0;
    for (const x of r) worst = Math.max(worst, Math.abs(x));
    gpu.destroy();
    expect(worst / scale).toBeLessThan(1e-6);
  });

  it("gives the CPU engine's residual on the same state, within 1e-5 of the flux scale", async () => {
    const cfg = config({
      iMin: { kind: 'inflow', state: free },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'outflow' },
      kMin: { kind: 'wall' },
      kMax: { kind: 'wall' },
    });
    const rand = random(8);
    const states: Primitive3D[] = [];
    const { ni, nj, nk } = cfg.grid;
    for (let c = 0; c < ni * nj * nk; c++)
      states.push(
        rounded({
          rho: 1 + 0.2 * rand(),
          u: 2.3 + 0.3 * rand(),
          v: 0.2 * (rand() - 0.5),
          w: 0.2 * (rand() - 0.5),
          p: 1 + 0.3 * rand(),
        }),
      );
    const cell = (i: number, j: number, k: number) => states[i + ni * (j + nj * k)]!;
    const cpu = new Euler3D(cfg);
    cpu.setCellPrimitives(cell);
    const gpu = await GpuEuler3D.create(device, cfg);
    gpu.setCellPrimitives(cell);
    const a = cpu.residualVector();
    const b = await gpu.residualVector();
    gpu.destroy();
    let scale = 0;
    let worst = 0;
    for (let n = 0; n < a.length; n++) {
      scale = Math.max(scale, Math.abs(a[n]!));
      worst = Math.max(worst, Math.abs(a[n]! - b[n]!));
    }
    expect(worst / scale).toBeLessThan(1e-5);
  });

  it('follows the CPU engine over 40 steps of a smooth flow', async () => {
    const cfg = config({
      iMin: { kind: 'inflow', state: free },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'outflow' },
      kMin: { kind: 'wall' },
      kMax: { kind: 'wall' },
    });
    const { ni, nj } = cfg.grid;
    const cell = (i: number, j: number, k: number) =>
      rounded({
        rho: 1 + 0.05 * Math.sin(i / 3 + k),
        u: free.u,
        v: 0.02 * Math.cos(j / 2),
        w: 0.01 * Math.sin(i / 2),
        p: 1 + 0.05 * Math.cos(i / 4 + j / 3),
      });
    const cpu = new Euler3D(cfg);
    cpu.setCellPrimitives(cell);
    cpu.iterate(40);
    const gpu = await GpuEuler3D.create(device, cfg);
    gpu.setCellPrimitives(cell);
    await gpu.iterate(40);
    const g = await gpu.primitives();
    gpu.destroy();
    let worst = 0;
    for (let k = 0; k < cfg.grid.nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++) {
          const a = cpu.primitive(i, j, k);
          const b = g[i + ni * (j + nj * k)]!;
          worst = Math.max(
            worst,
            Math.abs(a.rho - b.rho),
            Math.abs(a.u - b.u) / free.u,
            Math.abs(a.v - b.v) / free.u,
            Math.abs(a.w - b.w) / free.u,
            Math.abs(a.p - b.p),
          );
        }
    expect(worst).toBeLessThan(2e-5);
  });
});
