// The rocket: a neutral light grey, lit by a key light, a fill, a rim
// light from behind and a subtle specular highlight. Requires common.wgsl.

struct BodyIn {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) part: f32,
};

struct BodyOut {
  @builtin(position) clip: vec4f,
  @location(0) world: vec3f,
  @location(1) normal: vec3f,
  @location(2) part: f32,
};

@vertex
fn body_vs(v: BodyIn) -> BodyOut {
  var out: BodyOut;
  out.clip = frame.view_proj * vec4f(v.position, 1.0);
  out.world = v.position;
  out.normal = v.normal;
  out.part = v.part;
  return out;
}

@fragment
fn body_fs(v: BodyOut) -> @location(0) vec4f {
  return shade(v);
}

// The rocket seen through what stands in front of it: its near side only,
// by its stored outward normals (the mesh's winding is not the same
// everywhere: the body's near side winds clockwise on screen, the fins'
// counter-clockwise, so culling by winding would keep the wrong side).
@fragment
fn body_ghost_fs(v: BodyOut) -> @location(0) vec4f {
  if (dot(v.normal, frame.eye.xyz - v.world) < 0.0) {
    discard;
  }
  return shade(v);
}

fn shade(v: BodyOut) -> vec4f {
  let view = normalize(frame.eye.xyz - v.world);
  var n = normalize(v.normal);
  // Two-sided: the side facing the eye.
  if (dot(n, view) < 0.0) {
    n = -n;
  }
  // One material for the body and the fins; the flat base a shade darker.
  var albedo = vec3f(0.80, 0.81, 0.83);
  if (v.part > 1.5) {
    albedo = vec3f(0.55, 0.56, 0.58);
  } else if (v.part < 0.5 && frame.body.y > 0.5) {
    // The body (not the fins, not the base) by its computed surface
    // pressure, the colours along it (palette's second half), in linear light.
    let t = clamp(v.world.x * frame.body.x, 0.0, 1.0) * f32(PALETTE_N - 1u);
    let k = min(u32(t), PALETTE_N - 2u);
    let c = mix(palette[PALETTE_N + k].rgb, palette[PALETTE_N + k + 1u].rgb, t - f32(k));
    albedo = pow(c, vec3f(2.2)) * 0.9;
  }
  let key = max(dot(n, frame.key_light.xyz), 0.0);
  let fill = max(dot(n, frame.fill_light.xyz), 0.0);
  let sky = 0.5 + 0.5 * n.y;
  let h = normalize(frame.key_light.xyz + view);
  let spec = pow(max(dot(n, h), 0.0), 60.0) * 0.32;
  let rim_edge = pow(1.0 - max(dot(n, view), 0.0), 3.0);
  let rim = rim_edge * (0.25 + 0.75 * max(dot(n, frame.rim_light.xyz), 0.0)) * 0.55;
  let linear = albedo * (0.06 + 0.78 * key + 0.16 * fill + 0.08 * sky) + vec3f(spec + rim);
  // Linear light to the display's sRGB.
  // look.w: the opacity of the rocket seen through what stands in front of
  // it (the second, see-through drawing); 0 for the solid one.
  let alpha = select(1.0, draw.look.w, draw.look.w > 0.0);
  return vec4f(pow(clamp(linear, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2)) * alpha, alpha);
}
