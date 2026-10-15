import fc from 'fast-check';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WGSL_LIMITER_FUNCTIONS } from '../../src/engine-gpu/euler1d-gpu';
import fluxWgsl from '../../src/engine-gpu/shaders/flux.wgsl?raw';
import gasWgsl from '../../src/engine-gpu/shaders/gas.wgsl?raw';
import limitersWgsl from '../../src/engine-gpu/shaders/limiters.wgsl?raw';
import reconstructionWgsl from '../../src/engine-gpu/shaders/reconstruction.wgsl?raw';
import {
  hllcFaceFlux,
  hllcFlux,
  rusanovFaceFlux,
  rusanovFlux,
  type FluxFunction,
  type Primitive2D,
} from '../../src/scheme/flux';
import { GAMMA_AIR } from '../../src/scheme/gas';
import { LIMITERS, type LimiterName } from '../../src/scheme/limiters';
import { reconstructPerVariable, reconstructShared } from '../../src/scheme/reconstruction';
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

describe.each([
  ['hllc', 'hllc_face_flux', hllcFaceFlux],
  ['rusanov', 'rusanov_face_flux', rusanovFaceFlux],
] as const)('%s face-frame flux kernel (with tangential velocity)', (_, wgslName, cpuFlux) => {
  const faceState = fc.record({
    rho: fc.double({ min: 1e-2, max: 1e2, noNaN: true }).map(f32),
    un: fc.double({ min: -5, max: 5, noNaN: true }).map(f32),
    ut: fc.double({ min: -5, max: 5, noNaN: true }).map(f32),
    p: fc.double({ min: 1e-2, max: 1e2, noNaN: true }).map(f32),
  });
  const facePairs = fc.sample(fc.tuple(faceState, faceState), { numRuns: 4000, seed: 33 });

  it('matches the TypeScript twin to f32 precision', async () => {
    const gpu = await evaluateWgsl(
      device,
      library,
      `${wgslName}(FaceState(x[0], x[1], x[2], x[3]), FaceState(x[4], x[5], x[6], x[7]), ${gamma})`,
      facePairs.map(([l, r]) => [l.rho, l.un, l.ut, l.p, r.rho, r.un, r.ut, r.p]),
    );
    const cpu = new Float64Array(4);
    facePairs.forEach(([l, r], i) => {
      cpuFlux(l, r, gamma, cpu);
      // Scale: the size of the terms combined, as for the 1D kernels, with
      // the tangential momentum flux scaled like the normal one.
      const toPrimitive = (w: typeof l) => ({ rho: w.rho, u: Math.hypot(w.un, w.ut), p: w.p });
      const [mass, momentum, energy] = fluxScales(gamma, toPrimitive(l), toPrimitive(r));
      const scales = [mass!, momentum!, momentum!, energy!];
      expect(scaledError(gpu[i]!, cpu, scales)).toBeLessThan(1e-6);
    });
  });
});

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

  describe.each(Object.entries(WGSL_LIMITER_FUNCTIONS) as [LimiterName, string][])(
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

describe('reconstruction kernels', () => {
  const reconstructionLibrary = [
    library,
    reconstructionWgsl,
    'fn limiter(a: f32, b: f32) -> f32 { return van_albada(a, b); }',
    'fn as_vec4(w: Primitive2D) -> vec4f { return vec4f(w.rho, w.u, w.v, w.p); }',
  ].join('\n');
  const primitive = fc.record({
    rho: fc.double({ min: 1e-2, max: 1e2, noNaN: true }).map(f32),
    u: fc.double({ min: -5, max: 5, noNaN: true }).map(f32),
    v: fc.double({ min: -5, max: 5, noNaN: true }).map(f32),
    p: fc.double({ min: 1e-2, max: 1e2, noNaN: true }).map(f32),
  });
  const triples = fc.sample(fc.tuple(primitive, primitive, primitive, fc.constantFrom(1, -1)), {
    numRuns: 2000,
    seed: 43,
  });
  const keys = ['rho', 'u', 'v', 'p'] as const;

  it.each([
    [
      'reconstruct_per_variable',
      (prev: Primitive2D, centre: Primitive2D, next: Primitive2D, side: 1 | -1) =>
        reconstructPerVariable(prev, centre, next, side, LIMITERS.vanAlbada),
    ],
    ['reconstruct_shared', reconstructShared],
  ] as const)('%s matches the TypeScript twin to f32 precision', async (wgslName, cpu) => {
    const w = (k: number) => `Primitive2D(x[${k}], x[${k + 1}], x[${k + 2}], x[${k + 3}])`;
    const gpu = await evaluateWgsl(
      device,
      reconstructionLibrary,
      `as_vec4(${wgslName}(${w(0)}, ${w(4)}, ${w(8)}, x[12]))`,
      triples.map(([a, b, c, side]) => [
        ...keys.map((k) => a[k]),
        ...keys.map((k) => b[k]),
        ...keys.map((k) => c[k]),
        side,
      ]),
    );
    triples.forEach(([prev, centre, next, side], i) => {
      const expected = cpu(prev, centre, next, side);
      keys.forEach((k, m) => {
        // Scale: the values combined in the reconstruction, with a floor of
        // 1e-6 for these order-one variables, below which f32 values are
        // round-off (and subnormals may be flushed to zero).
        const scale = Math.abs(prev[k]) + Math.abs(centre[k]) + Math.abs(next[k]) + 1e-6;
        expect(Math.abs(gpu[i]![m]! - expected[k]) / scale).toBeLessThan(1e-6);
      });
    });
  });
});
