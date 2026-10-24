// Thin glowing lines (streamlines, iso-lines on the cut faces, the bounding
// box, the body's wireframe): each segment a quad facing the eye, a set
// width in pixels, brightest along its middle, added to what is behind.
// A segment is given in 3D and drawn turned about the x axis to each of
// `sweep.z` azimuths (one, unturned, for a segment already in place).
// Requires common.wgsl.

struct Line {
  // (x, y, z, value) at each end.
  a: vec4f,
  b: vec4f,
  // The brightness at each end (x, y).
  w: vec4f,
};

@group(1) @binding(1) var<storage, read> lines: array<Line>;

struct LineOut {
  @builtin(position) clip: vec4f,
  @location(0) across: f32,
  @location(1) value: f32,
  @location(2) x: f32,
  @location(3) brightness: f32,
};

@vertex
fn line_vs(@builtin(vertex_index) index: u32) -> LineOut {
  // One draw of 6 vertices per quad (see revolve.wgsl).
  let ii = index / 6u;
  let vi = index % 6u;
  let count = u32(draw.sweep.z);
  let line = lines[ii / count];
  let k = ii % count;
  let phi = draw.sweep.x + f32(k) * draw.sweep.y;
  var out: LineOut;
  out.across = 0.0;
  out.value = 0.0;
  out.x = 0.0;
  out.brightness = 0.0;
  if (draw.extra.z > 0.5 && in_cut(phi)) {
    out.clip = vec4f(0.0, 0.0, -1.0, 1.0);
    return out;
  }
  let c = cos(phi);
  let s = sin(phi);
  let p0 = turn(line.a.xyz, c, s);
  let p1 = turn(line.b.xyz, c, s);
  let c0 = frame.view_proj * vec4f(p0, 1.0);
  let c1 = frame.view_proj * vec4f(p1, 1.0);
  if (c0.w < 1e-4 || c1.w < 1e-4) {
    out.clip = vec4f(0.0, 0.0, -1.0, 1.0);
    return out;
  }
  var ends = array<u32, 6>(0u, 1u, 1u, 0u, 1u, 0u);
  var sides = array<f32, 6>(-1.0, -1.0, 1.0, -1.0, 1.0, 1.0);
  let e = ends[vi];
  let side = sides[vi];
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
  // Half the width plus a pixel for the soft edge.
  let half_width = 0.5 * draw.extra.x + 1.0;
  let offset = normal * side * half_width / half_size * cc.w;
  out.clip = vec4f(cc.xy + offset, cc.zw);
  out.across = side * half_width / max(0.5 * draw.extra.x, 0.5);
  out.value = select(line.a.w, line.b.w, e == 1u);
  out.x = select(p0.x, p1.x, e == 1u);
  out.brightness = select(line.w.x, line.w.y, e == 1u);
  return out;
}

@fragment
fn line_fs(v: LineOut) -> @location(0) vec4f {
  if (draw.extra.w > 0.5 && beyond_base(v.x)) {
    discard;
  }
  // A bright core and a soft falloff over the line's width.
  let a = abs(v.across);
  let core = clamp(1.25 - a, 0.0, 1.0);
  let glow = exp(-1.6 * a * a);
  let intensity = draw.look.x * v.brightness * (0.65 * core + 0.35 * glow);
  return vec4f(colour_of(v.value) * intensity, 1.0);
}

// A streamline drawn as a thin lit tube, opaque and written to the depth
// buffer: across the quad the tube's surface turns from the eye, so the
// shading follows a cylinder's (brightest a little off its middle, dark at
// its sides); its edge is smoothed by the multisampling (the alpha sets
// the samples covered).
@fragment
fn tube_fs(v: LineOut) -> @location(0) vec4f {
  if (draw.extra.w > 0.5 && beyond_base(v.x)) {
    discard;
  }
  let a = abs(v.across);
  let s = sqrt(max(1.0 - a * a, 0.0));
  let lit = 0.25 + 0.75 * s;
  let spec = pow(max(1.0 - abs(v.across + 0.35), 0.0), 10.0) * 0.4;
  let colour = colour_of(v.value) * lit * draw.look.x * v.brightness + vec3f(spec);
  return vec4f(colour, clamp((1.15 - a) * 4.0, 0.0, 1.0));
}
