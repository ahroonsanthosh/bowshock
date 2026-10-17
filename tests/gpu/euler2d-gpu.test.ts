import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Euler2D,
  type BoundaryCondition2D,
  type Euler2DConfig,
  type Side,
} from '../../src/engine-cpu/euler2d';
import {
  GpuEuler2D,
  gpuPrimitive2D,
  type GpuEuler2DConfig,
  type GpuState2D,
} from '../../src/engine-gpu/euler2d-gpu';
import type { Body } from '../../src/geometry/body';
import { bodyGrid } from '../../src/grid/body-grid';
import { rampGrid } from '../../src/grid/shapes';
import { gridFromFunction, rectangularGrid, type StructuredGrid } from '../../src/grid/structured';
import { NonPhysicalStateError } from '../../src/solver/errors';
import {
  machFromPrandtlMeyer,
  obliqueShock,
  prandtlMeyer,
  stagnationPressureRatio,
} from '../../src/validation/gas-dynamics';
import { isentropicVortex } from '../../src/validation/isentropic-vortex';
import { requireDevice } from './device';

/**
 * The 2D GPU engine runs the CPU engine's scheme in 32-bit floats. As for
 * the 1D engine, problems with shocks are checked against exact solutions
 * (each engine independently), and engines are compared directly only on
 * smooth or converged flows.
 */

const gamma = 1.4;
const deg = Math.PI / 180;
let device: GPUDevice;

beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

function boundaries(bc: BoundaryCondition2D): Record<Side, BoundaryCondition2D> {
  return { iMin: bc, iMax: bc, jMin: bc, jMax: bc };
}

function config(grid: StructuredGrid, overrides: Partial<GpuEuler2DConfig>): GpuEuler2DConfig {
  return {
    grid,
    geometry: 'planar',
    gamma,
    flux: 'hllc',
    limiter: 'vanLeer',
    reconstruction: 'perVariable',
    timeIntegrator: 'ssprk2',
    cfl: 0.5,
    timeStepping: 'global',
    boundaries: boundaries({ kind: 'outflow' }),
    ...overrides,
  };
}

async function withSolver<T>(
  cfg: GpuEuler2DConfig,
  body: (s: GpuEuler2D) => Promise<T>,
): Promise<T> {
  const s = await GpuEuler2D.create(device, cfg);
  try {
    return await body(s);
  } finally {
    s.destroy();
  }
}

/** Random interior node displacements of up to 30% of the spacing (deterministic). */
function distortedGrid(ni: number, nj: number, x0: number, x1: number, y0: number, y1: number) {
  let state = 2024;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32 - 0.5;
  };
  return gridFromFunction(ni, nj, (i, j) => {
    const interior = i > 0 && i < ni && j > 0 && j < nj;
    const di = interior ? 0.6 * random() : 0;
    const dj = interior ? 0.6 * random() : 0;
    return [x0 + ((x1 - x0) * (i + di)) / ni, y0 + ((y1 - y0) * (j + dj)) / nj];
  });
}

describe('GpuEuler2D: uniform flow is preserved on distorted grids', () => {
  it.each([
    { geometry: 'planar', w: { rho: 1.2, u: 0.7, v: -0.4, p: 0.9 } },
    { geometry: 'axisymmetric', w: { rho: 1.2, u: 0.7, v: 0, p: 0.9 } },
  ] as const)('$geometry geometry, to f32 round-off', async ({ geometry, w }) => {
    const grid = distortedGrid(12, 10, 0, 2, 0.5, 1.5);
    const state = await withSolver(
      config(grid, { geometry, boundaries: boundaries({ kind: 'inflow', state: w }) }),
      async (s) => {
        s.setInitialCondition(() => w);
        await s.advanceTo(0.5);
        return s.readState();
      },
    );
    for (let c = 0; c < 120; c++) {
      const p = gpuPrimitive2D(state, c, gamma);
      expect(Math.abs(p.rho - w.rho)).toBeLessThan(1e-5);
      expect(Math.abs(p.u - w.u)).toBeLessThan(1e-5);
      expect(Math.abs(p.v - w.v)).toBeLessThan(1e-5);
      expect(Math.abs(p.p - w.p)).toBeLessThan(1e-5);
    }
  });
});

describe('GpuEuler2D: free-stream preservation on generated body grids', () => {
  // Every boundary, the body included, imposes the free stream, so the exact
  // solution is the uniform stream on every cell, the skewed cells near the
  // steep outer boundary at low Mach numbers included.
  it.each([
    {
      mach: 1.1,
      body: {
        nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(3 * deg), baseRadius: 0.5 },
        cylinderLength: 4,
      } satisfies Body,
    },
    {
      mach: 3,
      body: {
        nose: { shape: { kind: 'ogive', parameter: 1 }, length: 4, baseRadius: 0.5 },
        cylinderLength: 6,
      } satisfies Body,
    },
  ])('at M = $mach, to f32 round-off', async ({ mach, body }) => {
    const { grid } = bodyGrid(body, { nj: 20, mach, gamma });
    const free = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
    const state = await withSolver(
      config(grid, {
        geometry: 'axisymmetric',
        limiter: 'vanAlbada',
        reconstruction: 'sharedScaled',
        cfl: 0.8,
        timeStepping: 'local',
        boundaries: {
          iMin: { kind: 'inflow', state: free },
          iMax: { kind: 'outflow' },
          jMin: { kind: 'inflow', state: free },
          jMax: { kind: 'inflow', state: free },
        },
      }),
      async (s) => {
        s.setInitialCondition(() => free);
        await s.iterate(50);
        return s.readState();
      },
    );
    for (let c = 0; c < grid.ni * grid.nj; c++) {
      const w = gpuPrimitive2D(state, c, gamma);
      expect(Math.abs(w.rho - 1)).toBeLessThan(1e-5);
      expect(Math.abs(w.p - 1)).toBeLessThan(1e-5);
      expect(Math.abs(w.v)).toBeLessThan(1e-5 * free.u);
    }
  });
});

describe('GpuEuler2D: smooth flow', () => {
  const L = 10;
  const vortex = { strength: 5, x0: 5, y0: 5, u0: 1, v0: 1, period: L };
  const wavyGrid = (n: number) =>
    gridFromFunction(n, n, (i, j) => {
      const xi = (L * i) / n;
      const eta = (L * j) / n;
      const bump = 0.4 * Math.sin((2 * Math.PI * xi) / L) * Math.sin((2 * Math.PI * eta) / L);
      return [xi + bump, eta + bump];
    });
  const smooth: Partial<Euler2DConfig> = {
    limiter: 'unlimitedCentral',
    timeIntegrator: 'ssprk3',
    cfl: 0.4,
    boundaries: boundaries({ kind: 'periodic' }),
  };

  async function vortexError(n: number): Promise<number> {
    return withSolver(config(wavyGrid(n), smooth as Partial<GpuEuler2DConfig>), async (s) => {
      s.setInitialCondition((x, y) => isentropicVortex(vortex, x, y, 0, gamma));
      await s.advanceTo(1);
      const state = await s.readState();
      expect(Math.abs(state.time - 1)).toBeLessThan(1e-9);
      let error = 0;
      let volume = 0;
      for (let c = 0; c < n * n; c++) {
        const x = s.metrics.centroidX[c]!;
        const y = s.metrics.centroidY[c]!;
        const v = s.metrics.volume[c]!;
        error += Math.abs(state.rho[c]! - isentropicVortex(vortex, x, y, 1, gamma).rho) * v;
        volume += v;
      }
      return error / volume;
    });
  }

  it('converges at second order on a curvilinear grid', async () => {
    const order = Math.log2((await vortexError(32)) / (await vortexError(64)));
    expect(order).toBeGreaterThan(1.9);
    expect(order).toBeLessThan(2.2);
  });

  it('agrees with the 64-bit CPU engine on the vortex', async () => {
    const n = 32;
    const grid = wavyGrid(n);
    const field = (x: number, y: number) => isentropicVortex(vortex, x, y, 0, gamma);
    const cpu = new Euler2D(config(grid, smooth as Partial<GpuEuler2DConfig>));
    cpu.setInitialCondition(field);
    cpu.advanceTo(0.5);
    const gpu = await withSolver(config(grid, smooth as Partial<GpuEuler2DConfig>), async (s) => {
      s.setInitialCondition(field);
      await s.advanceTo(0.5);
      return s.readState();
    });
    // f32 round-off grows with the number of steps (see the 1D tests).
    const tolerance = 1e-6 + 1e-7 * gpu.steps;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        expect(Math.abs(gpu.rho[i + j * n]! - cpu.primitive(i, j).rho)).toBeLessThan(tolerance);
      }
    }
  });

  it('periodic boundaries give a translation-invariant solution', async () => {
    const n = 40;
    const run = (x0: number, y0: number) =>
      withSolver(
        config(rectangularGrid(n, n, 0, L, 0, L), { boundaries: boundaries({ kind: 'periodic' }) }),
        async (s) => {
          const v = { strength: 5, x0, y0, u0: 1, v0: 0.5, period: L };
          s.setInitialCondition((x, y) => isentropicVortex(v, x, y, 0, gamma));
          await s.advanceTo(1);
          return s.readState();
        },
      );
    const centred = await run(5, 5);
    const corner = await run(0, 0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const shifted = ((i + n / 2) % n) + ((j + n / 2) % n) * n;
        expect(Math.abs(centred.rho[i + j * n]! - corner.rho[shifted]!)).toBeLessThan(1e-5);
      }
    }
  });
});

/** Largest relative difference in pressure between the CPU and GPU solutions. */
function worstPressureDifference(cpu: Euler2D, state: GpuState2D): number {
  const { ni, nj } = cpu.metrics;
  let worst = 0;
  for (let c = 0; c < ni * nj; c++) {
    const p = cpu.primitive(c % ni, Math.floor(c / ni)).p;
    worst = Math.max(worst, Math.abs(gpuPrimitive2D(state, c, gamma).p - p) / p);
  }
  return worst;
}

/** Mean pressure of the wall-adjacent cells with centroid x in (x0, x1). */
function wallCellPressure(s: GpuEuler2D, state: GpuState2D, x0: number, x1: number): number {
  const values: number[] = [];
  for (let i = 0; i < s.metrics.ni; i++) {
    const x = s.metrics.centroidX[i]!;
    if (x > x0 && x < x1) values.push(gpuPrimitive2D(state, i, gamma).p);
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}

describe('GpuEuler2D: steady supersonic validation', () => {
  function rampConfig(mach: number, angle: number): GpuEuler2DConfig {
    const free = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
    return config(
      rampGrid({ ni: 60, nj: 30, xMin: -0.5, xCorner: 0, xMax: 1.5, height: 1.2, angle }),
      {
        limiter: 'vanAlbada',
        reconstruction: 'sharedScaled',
        cfl: 0.8,
        timeStepping: 'local',
        boundaries: {
          iMin: { kind: 'inflow', state: free },
          iMax: { kind: 'outflow' },
          jMin: { kind: 'wall' },
          jMax: { kind: 'outflow' },
        },
      },
    );
  }

  it('wedge: converges, and matches the CPU engine and the oblique-shock relation', async () => {
    // With the shared reconstruction the captured shock reaches a steady
    // state, so the engines can be compared directly.
    const exact = obliqueShock(2.5, 10 * deg, gamma);
    const cfg = rampConfig(2.5, 10 * deg);
    const free = { rho: 1, u: 2.5 * Math.sqrt(gamma), v: 0, p: 1 };
    const cpu = new Euler2D(cfg);
    cpu.setInitialCondition(() => free);
    cpu.iterate(1600);
    await withSolver(cfg, async (s) => {
      s.setInitialCondition(() => free);
      const initial = await s.densityResidualNorm();
      await s.iterate(1600);
      // f32 round-off holds the residual near 1e-5 of its initial value
      // (measured 8e-6 to 1e-5 on SwiftShader), far below the per-variable
      // stall at 7e-3.
      expect(await s.densityResidualNorm()).toBeLessThan(3e-5 * initial);
      const state = await s.readState();
      const p = wallCellPressure(s, state, 0.5, 1.2);
      expect(Math.abs(p / exact.pressureRatio - 1)).toBeLessThan(3e-3);
      expect(worstPressureDifference(cpu, state)).toBeLessThan(1e-4);
    });
  });

  it('expansion: converges, and matches the CPU engine and isentropic theory', async () => {
    const mach2 = machFromPrandtlMeyer(prandtlMeyer(2, gamma) + 10 * deg, gamma);
    const exact = stagnationPressureRatio(2, gamma) / stagnationPressureRatio(mach2, gamma);
    const cfg = rampConfig(2, -10 * deg);
    const free = { rho: 1, u: 2 * Math.sqrt(gamma), v: 0, p: 1 };
    const cpu = new Euler2D(cfg);
    cpu.setInitialCondition(() => free);
    const cpuInitialResidual = cpu.densityResidualNorm();
    cpu.iterate(600);
    await withSolver(cfg, async (s) => {
      s.setInitialCondition(() => free);
      const initial = await s.densityResidualNorm();
      // The residual reduction itself is a GPU kernel: check it against the CPU.
      expect(Math.abs(initial / cpuInitialResidual - 1)).toBeLessThan(1e-4);
      await s.iterate(600);
      // f32 round-off limits the residual well above the CPU's 1e-14.
      expect(await s.densityResidualNorm()).toBeLessThan(3e-5 * initial);
      const state = await s.readState();
      const p = wallCellPressure(s, state, 0.6, 1.3);
      expect(Math.abs(p / exact - 1)).toBeLessThan(3e-3);
      for (let c = 0; c < 60 * 30; c++) {
        const i = c % 60;
        const j = Math.floor(c / 60);
        expect(Math.abs(state.rho[c]! - cpu.primitive(i, j).rho)).toBeLessThan(1e-4);
      }
    });
  });
});

describe('GpuEuler2D: axisymmetric validation', () => {
  it('cone (M = 2.35, 10 deg): converges, and matches the CPU engine', async () => {
    // The CPU engine is validated on this cone against Taylor-Maccoll
    // (tests/engine-cpu/euler2d-cone.test.ts); the GPU must agree with it.
    const free = { rho: 1, u: 2.35 * Math.sqrt(gamma), v: 0, p: 1 };
    const cfg = config(
      rampGrid({ ni: 60, nj: 30, xMin: -0.5, xCorner: 0, xMax: 1.5, height: 1.2, angle: 10 * deg }),
      {
        geometry: 'axisymmetric',
        limiter: 'vanAlbada',
        reconstruction: 'sharedScaled',
        cfl: 0.8,
        timeStepping: 'local',
        boundaries: {
          iMin: { kind: 'inflow', state: free },
          iMax: { kind: 'outflow' },
          jMin: { kind: 'wall' },
          jMax: { kind: 'outflow' },
        },
      },
    );
    const cpu = new Euler2D(cfg);
    cpu.setInitialCondition(() => free);
    cpu.iterate(2000);
    await withSolver(cfg, async (s) => {
      s.setInitialCondition(() => free);
      const initial = await s.densityResidualNorm();
      await s.iterate(2000);
      expect(await s.densityResidualNorm()).toBeLessThan(1e-4 * initial);
      const state = await s.readState();
      expect(worstPressureDifference(cpu, state)).toBeLessThan(1e-4);
    });
    // A CPU solve and a GPU solve of 2000 steps each: over the default
    // minute when the machine is loaded.
  }, 600_000);
});

describe('GpuEuler2D: generated body grid', () => {
  it('ogive-cylinder (M = 1.98): converges, and matches the CPU engine', async () => {
    // The CPU engine is validated on this body against NACA TN 3716
    // (tests/engine-cpu/body-validation.test.ts); the GPU must agree with it.
    const body: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 7,
    };
    const free = { rho: 1, u: 1.98 * Math.sqrt(gamma), v: 0, p: 1 };
    const cfg = config(bodyGrid(body, { nj: 20, mach: 1.98, gamma }).grid, {
      geometry: 'axisymmetric',
      limiter: 'vanAlbada',
      reconstruction: 'sharedScaled',
      cfl: 0.8,
      timeStepping: 'local',
      boundaries: {
        iMin: { kind: 'inflow', state: free },
        iMax: { kind: 'outflow' },
        jMin: { kind: 'wall' },
        jMax: { kind: 'inflow', state: free },
      },
    });
    const cpu = new Euler2D(cfg);
    cpu.setInitialCondition(() => free);
    cpu.iterate(1200);
    await withSolver(cfg, async (s) => {
      s.setInitialCondition(() => free);
      const initial = await s.densityResidualNorm();
      await s.iterate(1200);
      expect(await s.densityResidualNorm()).toBeLessThan(1e-4 * initial);
      expect(worstPressureDifference(cpu, await s.readState())).toBeLessThan(1e-4);
    });
  }, 600_000);
});

describe('GpuEuler2D: local time stepping', () => {
  it('matches the CPU iteration by iteration on a grid of uneven cells', async () => {
    // A smooth pressure pulse on a randomly distorted grid, where cell sizes
    // (and so local time steps) vary strongly. A steady solution would not
    // reveal how each cell's step is chosen; the transient does.
    const grid = distortedGrid(16, 12, 0, 2, 0, 1.5);
    const pulse = (x: number, y: number) => ({
      rho: 1,
      u: 0.3,
      v: 0.1,
      p: 1 + 0.3 * Math.exp(-8 * ((x - 1) ** 2 + (y - 0.75) ** 2)),
    });
    const cfg = config(grid, { timeStepping: 'local', cfl: 0.6 });
    const cpu = new Euler2D(cfg);
    cpu.setInitialCondition(pulse);
    cpu.iterate(20);
    const gpu = await withSolver(cfg, async (s) => {
      s.setInitialCondition(pulse);
      await s.iterate(20);
      return s.readState();
    });
    for (let j = 0; j < 12; j++) {
      for (let i = 0; i < 16; i++) {
        const w = gpuPrimitive2D(gpu, i + 16 * j, gamma);
        expect(Math.abs(w.p - cpu.primitive(i, j).p)).toBeLessThan(1e-5);
      }
    }
  });
});

describe('GpuEuler2D: time step and failure', () => {
  it('stays stable on thin cells when the flow runs along the short direction', async () => {
    const pulse = (_x: number, y: number) => ({
      rho: 1 + 0.2 * Math.exp(-100 * (y - 0.5) ** 2),
      u: 0,
      v: 1,
      p: 1,
    });
    const state = await withSolver(
      config(rectangularGrid(10, 100, 0, 1, 0, 1), {
        cfl: 0.9,
        boundaries: boundaries({ kind: 'periodic' }),
      }),
      async (s) => {
        s.setInitialCondition(pulse);
        await s.advanceTo(0.25);
        return s.readState();
      },
    );
    for (let j = 0; j < 100; j++) {
      const exact = pulse(0, ((j + 0.5) / 100 - 0.25 + 1) % 1);
      expect(Math.abs(state.rho[5 + 10 * j]! - exact.rho)).toBeLessThan(1e-2);
    }
  });

  it('rejects a non-physical initial state before running', async () => {
    await withSolver(config(rectangularGrid(4, 4, 0, 1, 0, 1), {}), async (s) => {
      expect(() => {
        s.setInitialCondition(() => ({ rho: 1, u: 0, v: 0, p: -1 }));
      }).toThrow(NonPhysicalStateError);
      return Promise.resolve();
    });
  });
});
