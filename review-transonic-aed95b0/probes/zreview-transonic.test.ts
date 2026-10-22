/** Reviewer probes (not part of the branch): the self-test's sensitivity, and the page engine on the base grid. */
import { beforeAll, describe, expect, it } from 'vitest';
import { gpuTransonicEngine } from '../../src/analysis/gpu-transonic';
import { transonicProblem } from '../../src/analysis/transonic-flow';
import { split } from '../../src/engine-gpu/euler2d-two-float';
import { BufferSet, compileShader, readBuffer } from '../../src/engine-gpu/gpu-common';
import twoFloatWgsl from '../../src/engine-gpu/shaders/two-float.wgsl?raw';
import type { Body } from '../../src/geometry/body';
import { SettlingValue } from '../../src/verification/iterative-convergence';
import { requireDevice } from './device';

let device: GPUDevice;
beforeAll(async () => {
  device = await requireDevice();
});

/** The self-test of euler2d-two-float.ts, on a given library and inputs: the worst relative error. */
async function selfTestError(lib: string, a: number, b: number): Promise<number[]> {
  const code = `${lib}
@group(0) @binding(0) var<storage, read> input: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> output: array<vec4f>;
@compute @workgroup_size(1)
fn main() {
  let a = input[0].xy;
  let b = input[0].zw;
  output[0] = vec4f(df_add(a, b), df_mul(a, b));
  output[1] = vec4f(df_div(a, b), df_sqrt(b));
  output[2] = vec4f(df_sub(a, b), 0.0, 0.0);
}
`;
  const module = await compileShader(device, 'probe', code);
  const pipeline = await device.createComputePipelineAsync({ layout: 'auto', compute: { module, entryPoint: 'main' } });
  const buffers = new BufferSet(device);
  try {
    const input = buffers.createWith('in', new Float32Array([...split(a), ...split(b)]), GPUBufferUsage.STORAGE);
    const output = buffers.create('out', 48, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const readback = buffers.create('rb', 48, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
    const group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: input } },
        { binding: 1, resource: { buffer: output } },
      ],
    });
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(1);
    pass.end();
    device.queue.submit([enc.finish()]);
    const r = new Float32Array(await readBuffer(device, output, readback, 48));
    const v = (k: number) => r[2 * k]! + r[2 * k + 1]!;
    const sa = split(a);
    const sb = split(b);
    const A = sa[0] + sa[1];
    const B = sb[0] + sb[1];
    const expected = [A + B, A * B, A / B, Math.sqrt(B), A - B];
    return expected.map((e, k) => Math.abs(v(k) / e - 1));
  } finally {
    buffers.destroyAll();
  }
}

describe('reviewer: two-float self-test', () => {
  it('which breakages the self-test inputs (1/3, pi/7) catch at 1e-12', async () => {
    const variants: Record<string, string> = {
      intact: twoFloatWgsl,
      'two_sum error folded to 0': twoFloatWgsl.replace(
        'let e = (a - (s - v)) + (b - v);\n  return vec2f(s, e);',
        'return vec2f(s, 0.0);',
      ),
      'split folded (hi = a)': twoFloatWgsl.replace('return vec2f(hi, a - hi);', 'return vec2f(a, 0.0);'),
      'quick_two_sum error folded to 0': twoFloatWgsl.replace(
        'return vec2f(s, b - (s - a));',
        'return vec2f(s, 0.0);',
      ),
      'df_add without the low-part two_sum': twoFloatWgsl.replace(
        'let t = two_sum(a.y, b.y);',
        'let t = vec2f(a.y + b.y, 0.0);',
      ),
    };
    for (const [name, lib] of Object.entries(variants)) {
      expect(lib === twoFloatWgsl).toBe(name === 'intact');
      for (const [a, b] of [
        [1 / 3, Math.PI / 7],
        [1 + 2 ** -30, 1 - 2 ** -30],
      ] as const) {
        const errors = await selfTestError(lib, a, b);
        console.log(`SELFTEST ${name} a=${a} b=${b}: ${errors.map((e) => e.toExponential(1)).join(' ')}; caught by the branch's four checks: ${errors.slice(0, 4).some((e) => !(e < 1e-12))}`);
      }
    }
  }, 600_000);
});

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};

describe('reviewer: the page engine on the base grid, from the free stream', () => {
  it('Mach 1.1, the driver stopping rule, against the CPU (offline 0.09446829629185434)', async () => {
    const problem = transonicProblem(cone, { mach: 1.1, gamma: 1.4, refinement: 1, farField: 100, cylinder: 10 });
    const solver = await gpuTransonicEngine(device, { sweeps: 2 })(problem);
    const t0 = performance.now();
    try {
      await solver.start(() => problem.freeStream.state, 1);
      const settling = new SettlingValue(1e-7);
      let steps = 0;
      let drag = Number.NaN;
      while (steps < 6000) {
        await solver.iterate(50);
        steps += 50;
        drag = await solver.drag();
        if (steps % 500 === 0) console.log(`G3 step ${steps} drag ${drag}`);
        if (settling.add(drag)) break;
      }
      const after: number[] = [];
      for (let k = 0; k < 4; k++) {
        await solver.iterate(50);
        after.push(await solver.drag());
      }
      const cpu = 0.09446829629185434;
      console.log(`G3 settled after ${steps} steps, ${((performance.now() - t0) / 1000).toFixed(0)} s: drag ${drag}, vs CPU ${(drag / cpu - 1).toExponential(2)}; spread after ${((Math.max(...after) - Math.min(...after)) / drag).toExponential(2)}; last ${after[3]! / cpu - 1}`);
    } finally {
      solver.destroy();
    }
  }, 3_600_000);
});
