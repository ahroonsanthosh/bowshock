// The dense streaks (streaks-compute.wgsl) drawn: each step of each streak
// a quad facing the eye, a set width in pixels, shaded as a thin lit tube,
// coloured by the value the field has there, brighter towards its head
// (where a particle passing its start has got to) and dimmer with
// distance from the eye. Opaque and written to the depth buffer; its
// edges smoothed over the samples. Requires common.wgsl.
//
// draw.sweep.x: steps per streak; draw.extra.x: width in pixels;
// draw.look.x: brightness; draw.look.y: how much distance dims.

@group(1) @binding(1) var<storage, read> points: array<vec4f>;

struct StreakOut {
  @builtin(position) clip: vec4f,
  @location(0) across: f32,
  @location(1) value: f32,
  @location(2) age: f32,
  @location(3) depth: f32,
};

@vertex
fn streak_vs(@builtin(vertex_index) index: u32) -> StreakOut {
  let steps = u32(draw.sweep.x);
  let q = index / 6u;
  let corner = index % 6u;
  let streak = q / steps;
  let seg = q % steps;
  let a = points[streak * (steps + 1u) + seg];
  let b = points[streak * (steps + 1u) + seg + 1u];
  var out: StreakOut;
  out.across = 0.0;
  out.value = 0.0;
  out.age = 0.0;
  out.depth = 0.0;
  if (a.z < -1e30 || b.z < -1e30) {
    out.clip = vec4f(0.0, 0.0, -1.0, 1.0);
    return out;
  }
  let c = cos(a.w);
  let s = sin(a.w);
  let p0 = vec3f(a.x, a.y * c, a.y * s);
  let p1 = vec3f(b.x, b.y * c, b.y * s);
  let c0 = frame.view_proj * vec4f(p0, 1.0);
  let c1 = frame.view_proj * vec4f(p1, 1.0);
  if (c0.w < 1e-4 || c1.w < 1e-4) {
    out.clip = vec4f(0.0, 0.0, -1.0, 1.0);
    return out;
  }
  var ends = array<u32, 6>(0u, 1u, 1u, 0u, 1u, 0u);
  var sides = array<f32, 6>(-1.0, -1.0, 1.0, -1.0, 1.0, 1.0);
  let e = ends[corner];
  let side = sides[corner];
  let half_size = 0.5 * frame.viewport.xy;
  let s0 = c0.xy / c0.w * half_size;
  let s1 = c1.xy / c1.w * half_size;
  let d = s1 - s0;
  let len = length(d);
  var dir = vec2f(1.0, 0.0);
  if (len > 1e-6) {
    dir = d / len;
  }
  let normal = vec2f(-dir.y, dir.x);
  let cc = select(c0, c1, e == 1u);
  let half_width = 0.5 * draw.extra.x + 0.75;
  // Along the streak: an end's quad reaches a little past it, so the steps join.
  let along = dir * select(-0.5, 0.5, e == 1u) * draw.extra.x * 0.5;
  let offset = (normal * side * half_width + along) / half_size * cc.w;
  out.clip = vec4f(cc.xy + offset, cc.zw);
  out.across = side * half_width / max(0.5 * draw.extra.x, 0.5);
  out.value = select(a.z, b.z, e == 1u);
  out.age = (f32(seg) + f32(e)) / f32(steps);
  out.depth = cc.w;
  return out;
}

@fragment
fn streak_fs(v: StreakOut) -> @location(0) vec4f {
  let a = abs(v.across);
  // A tube's shading across it, lit from the upper side, and a highlight.
  let s = sqrt(max(1.0 - a * a, 0.0));
  let lit = 0.18 + 0.82 * s * (0.75 + 0.25 * v.across);
  let spec = pow(max(1.0 - abs(v.across + 0.4), 0.0), 12.0) * 0.35;
  // Brighter towards the head; dimmer far from the eye (depth cue).
  let head = 0.35 + 0.65 * v.age;
  let near = 1.0 / (1.0 + draw.look.y * max(v.depth - frame.range.w, 0.0));
  let colour = (palette_colour(v.value) * lit * head + vec3f(spec * head)) * draw.look.x * near;
  return vec4f(colour, clamp((1.15 - a) * 4.0, 0.0, 1.0));
}
