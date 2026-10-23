// Surfaces of revolution drawn as thin glowing shells: iso-surfaces of the
// quantity shown and the fitted bow shock. Each is a set of segments in
// the meridional plane (x, r), turned about the axis in sectors, one
// instance per segment and sector; brighter where seen edge-on, added to
// what is behind (additive blending). Requires common.wgsl.

struct Segment {
  // (x0, r0, x1, r1)
  ends: vec4f,
  // Unit normals in the meridional plane at each end: (nx0, nr0, nx1, nr1).
  normals: vec4f,
  // The value at each end.
  values: vec4f,
};

@group(1) @binding(1) var<storage, read> segments: array<Segment>;

struct ShellOut {
  @builtin(position) clip: vec4f,
  @location(0) world: vec3f,
  @location(1) normal: vec3f,
  @location(2) value: f32,
};

@vertex
fn shell_vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> ShellOut {
  let sectors = u32(draw.sweep.z);
  let seg = segments[ii / sectors];
  let sector = ii % sectors;
  var ends = array<u32, 6>(0u, 1u, 1u, 0u, 1u, 0u);
  var sides = array<u32, 6>(0u, 0u, 1u, 0u, 1u, 1u);
  let e = ends[vi];
  let k = sides[vi];
  let phi = draw.sweep.x + (f32(sector) + f32(k)) * draw.sweep.y;
  let c = cos(phi);
  let s = sin(phi);
  let xr = select(seg.ends.xy, seg.ends.zw, e == 1u);
  let n2 = select(seg.normals.xy, seg.normals.zw, e == 1u);
  var out: ShellOut;
  out.world = vec3f(xr.x, xr.y * c, xr.y * s);
  out.normal = vec3f(n2.x, n2.y * c, n2.y * s);
  out.value = select(seg.values.x, seg.values.y, e == 1u);
  out.clip = frame.view_proj * vec4f(out.world, 1.0);
  return out;
}

@fragment
fn shell_fs(v: ShellOut) -> @location(0) vec4f {
  if (beyond_base(v.world.x)) {
    discard;
  }
  let view = normalize(frame.eye.xyz - v.world);
  let n = normalize(v.normal);
  let facing = abs(dot(n, view));
  // look: x the face-on intensity, y the edge-on gain, z its sharpness,
  // w the mix towards white.
  let edge = pow(1.0 - facing, draw.look.z);
  let shade = 0.75 + 0.25 * abs(dot(n, frame.key_light.xyz));
  let intensity = (draw.look.x + draw.look.y * edge) * shade;
  let colour = mix(colour_of(v.value), vec3f(1.0), draw.look.w);
  return vec4f(colour * intensity, 1.0);
}

// The same shells drawn as lit, opaque surfaces (written to the depth
// buffer): the palette's colour shaded by the key and fill lights, with a
// rim of light at the silhouette.
@fragment
fn shell_lit_fs(v: ShellOut) -> @location(0) vec4f {
  if (beyond_base(v.world.x)) {
    discard;
  }
  let view = normalize(frame.eye.xyz - v.world);
  var n = normalize(v.normal);
  if (dot(n, view) < 0.0) {
    n = -n;
  }
  let key = max(dot(n, frame.key_light.xyz), 0.0);
  let fill = max(dot(n, frame.fill_light.xyz), 0.0);
  let h = normalize(frame.key_light.xyz + view);
  let spec = pow(max(dot(n, h), 0.0), 40.0) * 0.18;
  let rim = pow(1.0 - max(dot(n, view), 0.0), 3.0) * 0.35;
  let colour = colour_of(v.value);
  let lit = colour * (0.28 + 0.62 * key + 0.18 * fill) + vec3f(spec) + colour * rim;
  return vec4f(lit, 1.0);
}
