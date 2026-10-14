import { describe, expect, it } from 'vitest';
import { requireDevice } from './device';

describe('WebGPU compute smoke test', () => {
  it('runs a compute shader and reads the result back', async () => {
    const device = await requireDevice();
    const n = 1024;
    const input = new Float32Array(n);
    for (let i = 0; i < n; i++) input[i] = i * 0.5;

    const buffer = device.createBuffer({
      size: input.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffer, 0, input);

    const module = device.createShaderModule({
      code: /* wgsl */ `
        @group(0) @binding(0) var<storage, read_write> x: array<f32>;
        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) id: vec3u) {
          if (id.x < arrayLength(&x)) { x[id.x] = 2.0 * x[id.x] + 1.0; }
        }`,
    });
    const pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    });
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer } }],
    });
    const readback = device.createBuffer({
      size: input.byteLength,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(n / 64);
    pass.end();
    encoder.copyBufferToBuffer(buffer, 0, readback, 0, input.byteLength);
    device.queue.submit([encoder.finish()]);

    await readback.mapAsync(GPUMapMode.READ);
    const output = new Float32Array(readback.getMappedRange().slice(0));
    readback.unmap();

    // 2x + 1 is exact in f32 for these inputs, so equality is the right check.
    for (let i = 0; i < n; i++) expect(output[i]).toBe(2 * (i * 0.5) + 1);
    device.destroy();
  });
});
