/**
 * The cost of two-float (double-single) arithmetic on this WebGPU adapter:
 * the same chain of operations, of the kinds a flux evaluation uses (add,
 * multiply, divide, square root), per element in f32 and in two-float,
 * timed over a large array. Reports through the failure message.
 */
import { it } from 'vitest';
import { requireDevice } from '../gpu/device';

const COMMON = /* wgsl */ `
@group(0) @binding(0) var<storage, read> a: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> b: array<vec4f>;
`;

// f32 chain: per element, 32 rounds of a flux-like mix.
const F32 = COMMON + /* wgsl */ `
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let k = id.x;
  if (k >= arrayLength(&a)) { return; }
  var x = a[k].x; var y = a[k].y; var z = a[k].z;
  for (var n = 0; n < 32; n++) {
    let p = 0.4 * (z - 0.5 * x * y * y);
    let c = sqrt(1.4 * abs(p) / x + 1.0);
    let f = x * y * y + p;
    x = x + 1e-3 * (f / (c + 2.0) - x);
    y = y + 1e-3 * (p / x - y);
    z = z + 1e-3 * (c - z);
  }
  b[k] = vec4f(x, y, z, 0.0);
}
`;

// Two-float: (hi, lo) pairs, error-free transformations with fma.
const DF = COMMON + /* wgsl */ `
fn two_sum(a: f32, b: f32) -> vec2f {
  let s = a + b; let bb = s - a; let e = (a - (s - bb)) + (b - bb); return vec2f(s, e);
}
fn quick_two_sum(a: f32, b: f32) -> vec2f { let s = a + b; return vec2f(s, b - (s - a)); }
fn df_add(a: vec2f, b: vec2f) -> vec2f {
  let s = two_sum(a.x, b.x); let t = two_sum(a.y, b.y);
  var r = quick_two_sum(s.x, s.y + t.x); return quick_two_sum(r.x, r.y + t.y);
}
fn df_mul(a: vec2f, b: vec2f) -> vec2f {
  let p = a.x * b.x; let e = fma(a.x, b.x, -p);
  return quick_two_sum(p, e + (a.x * b.y + a.y * b.x));
}
fn df_div(a: vec2f, b: vec2f) -> vec2f {
  let q1 = a.x / b.x; let r = df_add(a, -df_mul(vec2f(q1, 0.0), b));
  let q2 = r.x / b.x; return quick_two_sum(q1, q2);
}
fn df_sqrt(a: vec2f) -> vec2f {
  let s = sqrt(a.x); let r = df_add(a, -df_mul(vec2f(s, 0.0), vec2f(s, 0.0)));
  return quick_two_sum(s, r.x / (2.0 * s));
}
fn df(v: f32) -> vec2f { return vec2f(v, 0.0); }
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let k = id.x;
  if (k >= arrayLength(&a)) { return; }
  var x = df(a[k].x); var y = df(a[k].y); var z = df(a[k].z);
  for (var n = 0; n < 32; n++) {
    let p = df_mul(df(0.4), df_add(z, -df_mul(df(0.5), df_mul(x, df_mul(y, y)))));
    let c = df_sqrt(df_add(df_div(df_mul(df(1.4), vec2f(abs(p.x), sign(p.x) * p.y)), x), df(1.0)));
    let f = df_add(df_mul(x, df_mul(y, y)), p);
    x = df_add(x, df_mul(df(1e-3), df_add(df_div(f, df_add(c, df(2.0))), -x)));
    y = df_add(y, df_mul(df(1e-3), df_add(df_div(p, x), -y)));
    z = df_add(z, df_mul(df(1e-3), df_add(c, -z)));
  }
  b[k] = vec4f(x.x, x.y, y.x, z.x);
}
`;

it('two-float cost', { timeout: 3_600_000 }, async () => {
  const device = await requireDevice();
  const n = 1 << 18;
  const data = new Float32Array(4 * n);
  for (let k = 0; k < n; k++) data.set([1 + (k % 7) * 0.01, 1.1, 2.5 + (k % 5) * 0.01, 0], 4 * k);
  const input = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(input, 0, data);
  const output = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const read = device.createBuffer({ size: 16, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  const out: string[] = [];
  const times: Record<string, number> = {};
  for (const [name, code] of [['f32', F32], ['two-float', DF], ['f32 again', F32]] as const) {
    const module = device.createShaderModule({ code });
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter((m) => m.type === 'error').map((m) => m.message);
    if (errors.length > 0) throw new Error(`${name}: ${errors.join('; ')}`);
    const pipeline = await device.createComputePipelineAsync({ layout: 'auto', compute: { module, entryPoint: 'main' } });
    const group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: input } },
        { binding: 1, resource: { buffer: output } },
      ],
    });
    let best = Infinity;
    for (let round = 0; round < 3; round++) {
      const t0 = performance.now();
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      for (let rep = 0; rep < 4; rep++) pass.dispatchWorkgroups(n / 64);
      pass.end();
      encoder.copyBufferToBuffer(output, 0, read, 0, 16);
      device.queue.submit([encoder.finish()]);
      await read.mapAsync(GPUMapMode.READ);
      read.unmap();
      best = Math.min(best, (performance.now() - t0) / 4);
    }
    times[name] = best;
    out.push(`${name}: ${best.toFixed(1)} ms per pass of ${n} elements`);
  }
  out.push(`ratio two-float / f32: ${(times['two-float']! / Math.min(times['f32']!, times['f32 again']!)).toFixed(1)}`);
  throw new Error('MEASURED\n' + out.join('\n'));
});
