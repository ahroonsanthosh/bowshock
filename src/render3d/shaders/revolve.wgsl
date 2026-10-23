// Surfaces of revolution drawn as thin glowing shells: iso-surfaces of the
// quantity shown and the fitted bow shock. Each is a set of segments in
// the meridional plane (x, r), turned about the axis in sectors, a quad
// per segment and sector; brighter where seen edge-on, added to what is
// behind (additive blending). Requires common.wgsl.

struct Point {
  // (x, r, nx, nr): the point in the meridional plane and its unit normal there.
  at: vec4f,
  // (value, 0, 0, 0).
  value: vec4f,
};

@group(1) @binding(1) var<storage, read> points: array<Point>;

struct ShellOut {
  @builtin(position) clip: vec4f,
  @location(0) world: vec3f,
  @location(1) normal: vec3f,
  @location(2) value: f32,
};

// Vertex p * (sectors + 1) + s is point p turned to azimuth s (an indexed
// draw, so each is turned once and shared by the quads around it).
@vertex
fn shell_vs(@builtin(vertex_index) index: u32) -> ShellOut {
  let s1 = u32(draw.sweep.z) + 1u;
  let p = points[index / s1];
  let phi = draw.sweep.x + f32(index % s1) * draw.sweep.y;
  let c = cos(phi);
  let s = sin(phi);
  var out: ShellOut;
  out.world = vec3f(p.at.x, p.at.y * c, p.at.y * s);
  out.normal = vec3f(p.at.z, p.at.w * c, p.at.w * s);
  out.value = p.value.x;
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
// buffer), in the manner of FluidX3D's: the palette's colour shaded per
// pixel by one directional light (diffuse and a little specular), darker
// where a sheet turns away from the eye, so that each sheet's ridges and
// edges read against the one behind it. The segments are cut at the base
// on the CPU, so there is no discard here and the depth test can run
// before shading.
@fragment
fn shell_lit_fs(v: ShellOut) -> @location(0) vec4f {
  let view = normalize(frame.eye.xyz - v.world);
  var n = normalize(v.normal);
  if (dot(n, view) < 0.0) {
    n = -n;
  }
  let facing = max(dot(n, view), 0.0);
  let key = max(dot(n, frame.key_light.xyz), 0.0);
  let fill = max(dot(n, frame.fill_light.xyz), 0.0);
  let h = normalize(frame.key_light.xyz + view);
  let spec = pow(max(dot(n, h), 0.0), 36.0) * draw.look.y;
  let colour = colour_of(v.value);
  // look.x: the ambient share; look.z: how much an edge-on sheet darkens.
  let diffuse = draw.look.x + (1.0 - draw.look.x) * (0.85 * key + 0.15 * fill);
  let edge = mix(1.0, facing, draw.look.z);
  return vec4f(colour * diffuse * edge + vec3f(spec), 1.0);
}
