/**
 * Runs a WGSL expression on the GPU for each element of an input array, so
 * a shader function can be compared with its TypeScript twin.
 *
 * Inputs are rows of f32 values; the expression sees them as `x[0..n)`
 * (array<f32, N>) and must evaluate to a vec4f, which is returned per row.
 */
export async function evaluateWgsl(
  device: GPUDevice,
  library: string,
  expression: string,
  inputs: readonly (readonly number[])[],
): Promise<Float32Array[]> {
  const width = inputs[0]?.length ?? 0;
  if (width === 0 || inputs.some((row) => row.length !== width)) {
    throw new Error('inputs must be non-empty rows of equal length');
  }
  const code = /* wgsl */ `
${library}
@group(0) @binding(0) var<storage, read> input_data: array<f32>;
@group(0) @binding(1) var<storage, read_write> output_data: array<vec4f>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let row = id.x;
  if (row >= arrayLength(&output_data)) { return; }
  var x: array<f32, ${width}>;
  for (var j = 0u; j < ${width}u; j++) { x[j] = input_data[row * ${width}u + j]; }
  output_data[row] = ${expression};
}`;
  const module = device.createShaderModule({ code });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((m) => m.type === 'error');
  if (errors.length > 0) {
    throw new Error(errors.map((m) => `${m.lineNum}:${m.linePos} ${m.message}`).join('\n'));
  }
  const pipeline = await device.createComputePipelineAsync({
    layout: 'auto',
    compute: { module, entryPoint: 'main' },
  });

  const flat = new Float32Array(inputs.flat());
  const inputBuffer = device.createBuffer({
    size: flat.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(inputBuffer, 0, flat);
  const outputBytes = 16 * inputs.length;
  const outputBuffer = device.createBuffer({
    size: outputBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const readback = device.createBuffer({
    size: outputBytes,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(
    0,
    device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
      ],
    }),
  );
  pass.dispatchWorkgroups(Math.ceil(inputs.length / 64));
  pass.end();
  encoder.copyBufferToBuffer(outputBuffer, 0, readback, 0, outputBytes);
  device.queue.submit([encoder.finish()]);

  await readback.mapAsync(GPUMapMode.READ);
  const out = new Float32Array(readback.getMappedRange().slice(0));
  readback.unmap();
  for (const b of [inputBuffer, outputBuffer, readback]) b.destroy();
  return inputs.map((_, i) => out.subarray(4 * i, 4 * i + 4));
}
