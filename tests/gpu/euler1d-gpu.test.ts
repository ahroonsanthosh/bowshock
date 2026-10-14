import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, Euler1D } from '../../src/engine-cpu/euler1d';
import {
  GpuEuler1D,
  type GpuEuler1DConfig,
  type GpuState1D,
} from '../../src/engine-gpu/euler1d-gpu';
import { pressureFromConserved, type Primitive1D } from '../../src/scheme/gas';
import { exactRiemannProfile } from '../../src/scheme/riemann-exact';
import { NonPhysicalStateError } from '../../src/solver/errors';
import { TORO_TESTS } from '../../src/validation/toro-tests';
import { TORO_L1_BASELINE_200 } from '../support/toro-baselines';
import { requireDevice } from './device';

/**
 * The GPU engine runs the CPU engine's scheme in 32-bit floats. Following
 * the testing policy in CONTRIBUTING.md, problems with shocks are checked
 * against their exact solutions (each engine independently), and only
 * smooth problems are compared engine to engine.
 */

const gamma = 1.4;
let device: GPUDevice;

beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

async function runGpu(
  overrides: Partial<GpuEuler1DConfig> & { nCells: number },
  field: (x: number) => Primitive1D,
  tEnd: number,
): Promise<GpuState1D> {
  const solver = await GpuEuler1D.create(device, {
    ...DEFAULT_CONFIG,
    flux: 'hllc',
    xMin: 0,
    xMax: 1,
    ...overrides,
  });
  try {
    solver.setInitialCondition(field);
    await solver.advanceTo(tEnd);
    return await solver.readState();
  } finally {
    solver.destroy();
  }
}

function primitiveAt(state: GpuState1D, i: number): Primitive1D {
  const rho = state.rho[i]!;
  const mom = state.mom[i]!;
  return { rho, u: mom / rho, p: pressureFromConserved(rho, mom, state.energy[i]!, gamma) };
}

describe('GpuEuler1D: Toro test problems against the exact solution', () => {
  for (const test of TORO_TESTS) {
    it(`${test.name}: L1 density error matches the CPU engine's baseline`, async () => {
      const n = 200;
      const state = await runGpu(
        { nCells: n },
        (x) => (x < test.x0 ? test.left : test.right),
        test.tEnd,
      );
      // The clock is accurate to far better than f32 resolution (see Clock
      // in euler1d.wgsl); t_end itself is stored as an f32.
      expect(Math.abs(state.time - Math.fround(test.tEnd)) / test.tEnd).toBeLessThan(1e-9);
      const xs = Array.from({ length: n }, (_, i) => (i + 0.5) / n);
      const exact = exactRiemannProfile(test.left, test.right, xs, test.x0, test.tEnd, gamma);
      let error = 0;
      for (let i = 0; i < n; i++) error += Math.abs(primitiveAt(state, i).rho - exact[i]!.rho) / n;
      // Discretisation error dominates f32 round-off by orders of magnitude,
      // so the GPU must meet the same 10% band around the CPU baseline.
      const baseline = TORO_L1_BASELINE_200[test.name]!;
      expect(error).toBeLessThanOrEqual(1.1 * baseline);
      expect(error).toBeGreaterThanOrEqual(0.9 * baseline);
    });
  }
});

describe('GpuEuler1D: smooth flow', () => {
  const wave = (x: number) => ({ rho: 1 + 0.2 * Math.sin(2 * Math.PI * x), u: 1, p: 1 });

  function waveL1Error(state: GpuState1D, n: number): number {
    let error = 0;
    for (let i = 0; i < n; i++) {
      const a = i / n;
      const b = (i + 1) / n;
      const average =
        1 + (0.2 * (Math.cos(2 * Math.PI * a) - Math.cos(2 * Math.PI * b))) / ((2 * Math.PI) / n);
      error += Math.abs(state.rho[i]! - average) / n;
    }
    return error;
  }

  const smoothConfig = {
    limiter: 'unlimitedCentral',
    timeIntegrator: 'ssprk3',
    left: 'periodic',
    right: 'periodic',
    cfl: 0.4,
  } as const;

  it('converges at second order while discretisation error dominates', async () => {
    // On 64 and 128 cells the discretisation error (about 6e-4 and 2e-4) is
    // far above the f32 round-off floor tested below.
    const coarse = waveL1Error(await runGpu({ ...smoothConfig, nCells: 64 }, wave, 1), 64);
    const fine = waveL1Error(await runGpu({ ...smoothConfig, nCells: 128 }, wave, 1), 128);
    const order = Math.log2(coarse / fine);
    expect(order).toBeGreaterThan(1.9);
    expect(order).toBeLessThan(2.1);
  });

  it('keeps f32 round-off below 5e-8 per time step', async () => {
    // Re-storing the state in f32 every stage adds round-off of about 3e-8
    // per step (measured), accumulating linearly with the number of steps.
    // This sets the accuracy floor of long time-accurate GPU runs; steady
    // runs do not accumulate it. The floor is measured as the part of the
    // error that is not the single Fourier mode of the exact solution.
    const n = 256;
    const state = await runGpu({ ...smoothConfig, nCells: n }, wave, 1);
    let c = 0;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n;
      c += (state.rho[i]! - 1) * Math.cos(2 * Math.PI * x);
      s += (state.rho[i]! - 1) * Math.sin(2 * Math.PI * x);
    }
    let noise = 0;
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n;
      const mode = 1 + (2 / n) * (s * Math.sin(2 * Math.PI * x) + c * Math.cos(2 * Math.PI * x));
      noise += Math.abs(state.rho[i]! - mode) / n;
    }
    expect(noise).toBeLessThan(5e-8 * state.steps);
  });

  it('agrees with the 64-bit CPU engine to f32 accuracy', async () => {
    const n = 128;
    const cfg = { left: 'periodic', right: 'periodic', nCells: n } as const;
    const gpu = await runGpu(cfg, wave, 0.5);
    const cpu = new Euler1D({ ...DEFAULT_CONFIG, ...cfg, xMin: 0, xMax: 1 });
    cpu.setInitialCondition(wave);
    cpu.advanceTo(0.5);
    // The engines take slightly different time steps (f32 vs f64 wave
    // speeds), which changes the solution at the level of the time
    // discretisation error, far below this tolerance but well above f32
    // round-off.
    for (let i = 0; i < n; i++) {
      expect(Math.abs(gpu.rho[i]! - cpu.primitive(i).rho)).toBeLessThan(1e-5);
    }
  });
});

describe('GpuEuler1D: exact discrete properties', () => {
  it('preserves a uniform flow exactly', async () => {
    for (const bc of ['transmissive', 'periodic', 'reflective'] as const) {
      // A reflective wall disturbs a moving flow, so test walls at rest.
      const w = { rho: 1.3, u: bc === 'reflective' ? 0 : 0.7, p: 2.2 };
      const state = await runGpu({ nCells: 64, left: bc, right: bc }, () => w, 0.5);
      const rho0 = Math.fround(w.rho);
      for (let i = 0; i < 64; i++) expect(state.rho[i]).toBe(rho0);
    }
  });

  it('conserves mass and energy to f32 round-off on a periodic domain', async () => {
    const test = TORO_TESTS[0]!;
    const field = (x: number) => (x > 0.25 && x < 0.75 ? test.left : test.right);
    const n = 200;
    const sum = (a: Float32Array) => a.reduce((s, v) => s + v, 0) / n;
    const initial = await runGpu({ nCells: n, left: 'periodic', right: 'periodic' }, field, 1e-9);
    const later = await runGpu({ nCells: n, left: 'periodic', right: 'periodic' }, field, 0.3);
    // Each step adds and subtracts the same face fluxes, so totals change
    // only by f32 rounding: about 1e-7 relative per step, a few hundred steps.
    expect(Math.abs(sum(later.rho) - sum(initial.rho)) / sum(initial.rho)).toBeLessThan(1e-5);
    expect(Math.abs(sum(later.energy) - sum(initial.energy)) / sum(initial.energy)).toBeLessThan(
      1e-5,
    );
  });

  it.each([
    { wall: 'right', xMin: 0, xMax: 0.5, offset: 0 },
    { wall: 'left', xMin: 0.5, xMax: 1, offset: 100 },
  ] as const)('reflective $wall wall: half domain matches the full domain', async (c) => {
    const collide = (x: number) => ({ rho: 1, u: x < 0.5 ? 1 : -1, p: 1 });
    const full = await runGpu({ nCells: 200 }, collide, 0.2);
    const half = await runGpu(
      { nCells: 100, xMin: c.xMin, xMax: c.xMax, [c.wall]: 'reflective' },
      collide,
      0.2,
    );
    for (let i = 0; i < 100; i++) {
      expect(Math.abs(full.rho[i + c.offset]! - half.rho[i]!)).toBeLessThan(1e-5);
      expect(Math.abs(full.mom[i + c.offset]! - half.mom[i]!)).toBeLessThan(1e-5);
    }
  });
});

describe('GpuEuler1D: failure is loud, never silent', () => {
  it('throws NonPhysicalStateError when a run goes unstable', async () => {
    const test = TORO_TESTS[2]!;
    await expect(
      runGpu(
        { nCells: 200, limiter: 'unlimitedCentral', timeIntegrator: 'forwardEuler', cfl: 1 },
        (x) => (x < test.x0 ? test.left : test.right),
        test.tEnd,
      ),
    ).rejects.toThrow(NonPhysicalStateError);
  });

  it('rejects a flux that has no GPU implementation', async () => {
    await expect(
      GpuEuler1D.create(device, {
        ...DEFAULT_CONFIG,
        nCells: 16,
        xMin: 0,
        xMax: 1,
        flux: 'godunov' as never,
      }),
    ).rejects.toThrow(RangeError);
  });
});
