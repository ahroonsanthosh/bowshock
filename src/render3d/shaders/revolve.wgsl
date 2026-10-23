// Surfaces of revolution drawn as thin glowing shells: iso-surfaces of the
// quantity shown and the fitted bow shock. Each is a set of segments in
// the meridional plane (x, r), turned about the axis in sectors, a quad
// per segment and sector; brighter where seen edge-on, added to what is
// behind (additive blending). Requires common.wgsl.

struct Point {
  // (x, r, nx, nr): the point in the meridional plane and its unit normal there.
  at: vec4f,
  // (value, length along the line from its start, 0, 0).
  value: vec4f,
};

@group(1) @binding(1) var<storage, read> points: array<Point>;

struct ShellOut {
  @builtin(position) clip: vec4f,
  @location(0) world: vec3f,
  @location(1) normal: vec3f,
  @location(2) value: f32,
  // The azimuth, the length along the sheet's meridian, and its normal in the meridional plane.
  @location(3) phi: f32,
  @location(4) along: f32,
  @location(5) meridional_normal: vec2f,
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
  out.phi = phi;
  out.along = p.value.y;
  out.meridional_normal = p.at.zw;
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
  // The light from over the viewer's shoulder (the key light drawn towards
  // the eye): sheets facing the viewer bright, those turning away dark, so
  // the nested sheets' ridges stand out as FluidX3D's do.
  let light = normalize(frame.key_light.xyz + 1.2 * view);
  let key = max(dot(n, light), 0.0);
  let fill = max(dot(n, frame.fill_light.xyz), 0.0);
  let h = normalize(light + view);
  let spec = pow(max(dot(n, h), 0.0), 36.0) * draw.look.y;
  let colour = colour_of(v.value);
  // look.x: the ambient share; look.z: how much an edge-on sheet darkens.
  let diffuse = draw.look.x + (1.0 - draw.look.x) * (0.85 * key + 0.15 * fill);
  let edge = mix(1.0, facing, draw.look.z);
  // Fibres along the flow on the sheet (extra.x their strength): the flow
  // has no swirl, so on a sheet of revolution it runs along the meridians;
  // streaks laid along them, as strong as the computed velocity lies along
  // the sheet (none where it crosses it). The streaks' noise only carries
  // the direction.
  var fibre = 1.0;
  if (draw.extra.x > 0.0) {
    let f = field_at(v.world.x, length(v.world.yz));
    let speed = length(f.xy);
    if (f.w > -0.5 && speed > 1e-6) {
      let tangent = vec2f(v.meridional_normal.y, -v.meridional_normal.x);
      let along = abs(dot(f.xy / speed, tangent));
      let uv = vec2f(v.phi / TAU * draw.extra.y, v.along * draw.extra.z);
      let streak = textureSampleLevel(streak_tex, repeat_sampler, uv, 0.0).r;
      fibre = 1.0 + draw.extra.x * along * (streak - 0.5);
    }
  }
  return vec4f(colour * diffuse * edge * fibre + vec3f(spec), 1.0);
}
