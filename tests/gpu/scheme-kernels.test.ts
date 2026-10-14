import fc from 'fast-check';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fluxWgsl from '../../src/engine-gpu/shaders/flux.wgsl?raw';
import gasWgsl from '../../src/engine-gpu/shaders/gas.wgsl?raw';
import limitersWgsl from '../../src/engine-gpu/shaders/limiters.wgsl?raw';
import { hllcFlux, rusanovFlux, type FluxFunction } from '../../src/scheme/flux';
import { GAMMA_AIR } from '../../src/scheme/gas';
import { LIMITERS, type LimiterName } from '../../src/scheme/limiters';
import { fluxScales, scaledError } from '../support/flux-scales';
import { requireDevice } from './device';
import { evaluateWgsl } from './wgsl-harness';

/**
 * Each WGSL scheme function is compared with its TypeScript twin on the same
 * inputs. Inputs are first rounded to f32, so the comparison measures only
 * the GPU's 32-bit arithmetic against the 64-bit reference.
 */

const gamma = GAMMA_AIR;
const library = [gasWgsl, fluxWgsl, limitersWgsl].join('\n');
let device: GPUDevice;

beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

const f32 = Math.fround;
const state = fc.record({
  rho: fc.double({ min: 1e-2, max: 1e2, noNaN: true }).map(f32),
  u: fc.double({ min: -5, max: 5, noNaN: true }).map(f32),
  p: fc.double({ min: 1e-2, max: 1e2, noNaN: true }).map(f32),
});
const pairs = fc.sample(fc.tuple(state, state), { numRuns: 4000, seed: 31 });

const GPU_FLUXES: [string, string, FluxFunction][] = [
  ['hllc', 'hllc_flux', hllcFlux],
  ['rusanov', 'rusanov_flux', rusanovFlux],
];

describe.each(GPU_FLUXES)('%s flux kernel', (_, wgslName, cpuFlux) => {
  it('matches the TypeScript twin to f32 precision', async () => {
    const inputs = pairs.map(([l, r]) => [l.rho, l.u, l.p, r.rho, r.u, r.p]);
    const gpu = await evaluateWgsl(
      device,
      library,
      `vec4f(${wgslName}(Primitive(x[0], x[1], x[2]), Primitive(x[3], x[4], x[5]), ${gamma}), 0.0)`,
      inputs,
    );
    const cpu = new Float64Array(3);
    pairs.forEach(([l, r], i) => {
      cpuFlux(l, r, gamma, cpu);
      // Measured worst case when written: about 2e-7, i.e. under 2 units in
      // the last place of f32. 1e-6 catches any real transcription error.
      expect(scaledError(gpu[i]!, cpu, fluxScales(gamma, l, r))).toBeLessThan(1e-6);
    });
  });
});

const WGSL_LIMITERS: Record<LimiterName, string> = {
  firstOrder: 'first_order',
  minmod: 'minmod',
  vanLeer: 'van_leer',
  vanAlbada: 'van_albada',
  monotonizedCentral: 'monotonized_central',
  unlimitedCentral: 'unlimited_central',
};

describe('limiter kernels', () => {
  // Slopes of physically meaningful size: zero, or 1e-6 to 1e3 in magnitude.
  // Variables are nondimensional and of order one, so smaller slopes only
  // arise from round-off.
  const magnitude = fc.double({ min: 1e-6, max: 1e3, noNaN: true });
  const slope = fc
    .oneof(
      fc.constant(0),
      magnitude,
      magnitude.map((m) => -m),
    )
    .map(f32);
  const slopes = fc.sample(fc.tuple(slope, slope), { numRuns: 2000, seed: 37 });

  // Tiny slopes underflow in f32: the GPU flushes subnormal numbers to zero
  // (WGSL allows this) and products like a * b underflow to zero. The result
  // may then differ from the 64-bit reference, but it must stay finite and
  // inside the TVD bounds, so the scheme falls back safely to first order.
  const tiny = fc.double({ min: -1e-30, max: 1e-30, noNaN: true }).map(f32);
  const tinySlopes = fc.sample(fc.tuple(tiny, tiny), { numRuns: 500, seed: 41 });

  describe.each(Object.entries(WGSL_LIMITERS) as [LimiterName, string][])(
    '%s',
    (name, wgslName) => {
      const run = (inputs: [number, number][]) =>
        evaluateWgsl(device, library, `vec4f(${wgslName}(x[0], x[1]), 0.0, 0.0, 0.0)`, inputs);

      it('matches the TypeScript twin to f32 precision', async () => {
        const gpu = await run(slopes);
        slopes.forEach(([a, b], i) => {
          const scale = Math.max(Math.abs(a), Math.abs(b), Number.MIN_VALUE);
          expect(Math.abs(gpu[i]![0]! - LIMITERS[name](a, b)) / scale).toBeLessThan(1e-6);
        });
      });

      it('stays finite and bounded when slopes underflow', async () => {
        const gpu = await run(tinySlopes);
        tinySlopes.forEach(([a, b], i) => {
          const s = gpu[i]![0]!;
          expect(Number.isFinite(s)).toBe(true);
          expect(Math.abs(s)).toBeLessThanOrEqual(Math.max(Math.abs(a), Math.abs(b)));
        });
      });
    },
  );
});
