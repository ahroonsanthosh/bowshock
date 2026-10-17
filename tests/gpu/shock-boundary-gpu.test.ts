import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bluntFittedFlow } from '../../src/analysis/fitted-flow';
import type { Euler2D } from '../../src/engine-cpu/euler2d';
import {
  GpuEuler2D,
  gpuPrimitive2D,
  type GpuEuler2DConfig,
} from '../../src/engine-gpu/euler2d-gpu';
import type { Body } from '../../src/geometry/body';
import type { StructuredGrid } from '../../src/grid/structured';
import type { Primitive2D } from '../../src/scheme/flux';
import { compatibleShock } from '../../src/solver/shock-fitting';
import { requireDevice } from './device';

/**
 * The fitted shock's boundary on the GPU (compute_shock_boundary in
 * euler2d.wgsl) against the CPU's (src/solver/shock-fitting.ts), on the
 * converged CPU fit of a hemisphere-cylinder at Mach 2 (design record 0006).
 */

const gamma = 1.4;
const mach = 2;
const free: Primitive2D = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
const aFree = Math.sqrt(gamma);
const body: Body = {
  nose: { shape: { kind: 'ellipsoid' }, length: 0.5, baseRadius: 0.5 },
  cylinderLength: 4,
};
let device: GPUDevice;
let cpu: Euler2D;
let grid: StructuredGrid;

beforeAll(async () => {
  device = await requireDevice();
  const { fit } = bluntFittedFlow(body, {
    mach,
    gamma,
    nj: 20,
    refinement: 1,
    maxIterations: 20_000,
  });
  expect(fit.converged).toBe(true);
  cpu = fit.solver;
  grid = fit.grid;
}, 600_000);
afterAll(() => {
  device.destroy();
});

function gpuConfig(): GpuEuler2DConfig {
  return {
    grid,
    geometry: 'axisymmetric',
    gamma,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'wall' },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'faceStates', states: Array.from({ length: grid.ni }, () => free) },
    },
    fittedShock: { freeStream: free },
  };
}

describe('fitted shock boundary on the GPU', () => {
  it("matches the CPU's compatibility solution face by face on a perturbed flow", async () => {
    const gpu = await GpuEuler2D.create(device, gpuConfig());
    // A flow that is not steady: the converged one with its pressure
    // disturbed by up to 2%.
    const flow = (i: number, j: number) => {
      const w = cpu.primitive(i, j);
      return { ...w, p: w.p * (1 + 0.02 * Math.sin(0.7 * i + 0.3 * j)) };
    };
    gpu.setCellPrimitives(flow);
    // The residual evaluation sets the shock faces from the current flow.
    await gpu.densityResidualNorm();
    const { speed } = await gpu.readShock();
    const { ni, nj, jFaces } = cpu.metrics;
    let worst = 0;
    for (let i = 0; i < ni; i++) {
      const f = i + nj * ni;
      const nx = jFaces.nx[f]!;
      const ny = jFaces.ny[f]!;
      const c1 = flow(i, nj - 1);
      const c2 = flow(i, nj - 2);
      const expected = compatibleShock(free, gamma, nx, ny, {
        rho: c1.rho,
        a: Math.sqrt((gamma * c1.p) / c1.rho),
        p: 1.5 * c1.p - 0.5 * c2.p,
        un: 1.5 * (c1.u * nx + c1.v * ny) - 0.5 * (c2.u * nx + c2.v * ny),
      }).speed;
      worst = Math.max(worst, Math.abs(speed[i]! - expected) / aFree);
    }
    // Measured when written: 3.6e-7 of the sound speed at most.
    expect(worst, `largest difference ${worst.toExponential(2)} of the sound speed`).toBeLessThan(
      1e-5,
    );
    gpu.destroy();
  }, 600_000);

  it('keeps the converged CPU fit converged: shock speeds at 32-bit noise after 2000 steps', async () => {
    const gpu = await GpuEuler2D.create(device, gpuConfig());
    gpu.setCellPrimitives((i, j) => cpu.primitive(i, j));
    await gpu.iterate(2000);
    const { speed } = await gpu.readShock();
    const fastest = Math.max(...Array.from(speed, (w) => Math.abs(w) / aFree));
    expect(fastest, `fastest face ${fastest.toExponential(2)} of the sound speed`).toBeLessThan(
      1e-4,
    );
    // The stagnation-point cell's pressure, against the CPU's: 5.5e-7 when
    // written.
    const state = await gpu.readState();
    const w = gpuPrimitive2D(state, 0, gamma);
    const reference = cpu.primitive(0, 0).p;
    expect(Math.abs(w.p / reference - 1)).toBeLessThan(1e-5);
    gpu.destroy();
  }, 600_000);
});
