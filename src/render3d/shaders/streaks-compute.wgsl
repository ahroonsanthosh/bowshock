// Dense streaks (src/render3d/streaks-gpu.ts): tens of thousands of short
// pieces of streamline of the computed flow, as FluidX3D's particle mode
// shows its flow. Each streak starts at a point the page spreads through
// the computed region (more near the body and the shock, the rest even
// in volume) at an azimuth of its own, and follows the field's velocity
// (the field's image, field-image.wgsl, sampled linearly) for a few steps,
// second order. The steady flow's pathlines are its streamlines, so a
// streak is where a particle passing its start would go next. The start
// points are the page's; every step after is the field's.

struct Params {
  // count, steps, step length (field units), time phase (0 to 1)
  run: vec4f,
  // image: xMin, 1 / (xMax - xMin), 1 / rMax, xMax
  image: vec4f,
  // seeding: share near the body, share near the shock; the cutaway's
  // first azimuth and width (0: none), where only CUT_KEEP of the streaks
  // are kept so the rocket shows through
  seeding: vec4f,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var field: texture_2d<f32>;
@group(0) @binding(2) var linear_sampler: sampler;
// The region's radii at EDGES_N even x across the image: (body, shock).
@group(0) @binding(3) var<storage, read> edges: array<vec2f>;
// Per streak, steps + 1 points: (x, r, value, phi); value < -1e30 where the streak has ended.
@group(0) @binding(4) var<storage, read_write> points: array<vec4f>;

const CUT_KEEP: f32 = 0.12;

fn hash(n: u32) -> f32 {
  var x = n * 747796405u + 2891336453u;
  x = ((x >> ((x >> 28u) + 4u)) ^ x) * 277803737u;
  x = (x >> 22u) ^ x;
  return f32(x) / 4294967296.0;
}

fn sample_field(x: f32, r: f32) -> vec4f {
  let uv = vec2f((x - params.image.x) * params.image.y, 1.0 - r * params.image.z);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4f(0.0, 0.0, 0.0, -1.0);
  }
  return textureSampleLevel(field, linear_sampler, uv, 0.0);
}

fn edges_at(x: f32) -> vec2f {
  let n = arrayLength(&edges);
  let t = clamp((x - params.image.x) * params.image.y, 0.0, 1.0) * f32(n - 1u);
  let k = min(u32(t), n - 2u);
  return mix(edges[k], edges[k + 1u], t - f32(k));
}

@compute @workgroup_size(64)
fn trace(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  let count = u32(params.run.x);
  if (i >= count) {
    return;
  }
  let steps = u32(params.run.y);
  let h = params.run.z;
  let base = i * (steps + 1u);
  // The start: x even along the region; r by the share near the body, near
  // the shock, or even in volume (r^2 even) between them.
  let phi = hash(4u * i) * 6.283185307179586;
  let xEnd = params.image.w;
  let x0 = params.image.x + hash(4u * i + 1u) * (xEnd - params.image.x);
  let e = edges_at(x0);
  let u = hash(4u * i + 2u);
  let v = hash(4u * i + 3u);
  var f: f32;
  if (u < params.seeding.x) {
    f = 0.25 * v * v;
  } else if (u < params.seeding.x + params.seeding.y) {
    f = 1.0 - 0.25 * v * v;
  } else {
    let r2 = e.x * e.x + v * (e.y * e.y - e.x * e.x);
    f = (sqrt(max(r2, 0.0)) - e.x) / max(e.y - e.x, 1e-9);
  }
  var x = x0;
  var r = e.x + clamp(f, 0.002, 0.998) * (e.y - e.x);
  // Moving (key 8): the start carried along the streamline by the time's phase.
  let lead = u32(params.run.w * f32(steps) * 3.0 + hash(4u * i + 5u) * f32(steps) * 3.0) % (3u * steps);
  for (var k = 0u; k < lead; k++) {
    let a = sample_field(x, r);
    if (a.w < -0.5) {
      break;
    }
    let s = length(a.xy);
    if (s < 1e-6) {
      break;
    }
    x += h * a.x / s;
    r = abs(r + h * a.y / s);
  }
  var alive = true;
  if (params.seeding.w > 0.0) {
    let d = fract((phi - params.seeding.z) / 6.283185307179586) * 6.283185307179586;
    if (d < params.seeding.w && hash(4u * i + 6u) > CUT_KEEP) {
      alive = false;
    }
  }
  for (var k = 0u; k <= steps; k++) {
    let a = sample_field(x, r);
    if (!alive || a.w < -0.5 || x > xEnd) {
      alive = false;
      points[base + k] = vec4f(x, r, -1e31, phi);
      continue;
    }
    points[base + k] = vec4f(x, r, a.z, phi);
    let s = length(a.xy);
    if (s < 1e-6) {
      alive = false;
      continue;
    }
    // Second order: the direction half a step on.
    let xm = x + 0.5 * h * a.x / s;
    let rm = abs(r + 0.5 * h * a.y / s);
    let b = sample_field(xm, rm);
    let sb = length(b.xy);
    if (b.w < -0.5 || sb < 1e-6) {
      alive = false;
      continue;
    }
    x += h * b.x / sb;
    r = abs(r + h * b.y / sb);
  }
}
