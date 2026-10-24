// The field on a slice (the cut faces, a plane through the axis or across
// it): triangles with the value at each corner, coloured by the palette,
// translucent. Requires common.wgsl.

struct SliceIn {
  @location(0) position: vec3f,
  @location(1) value: f32,
};

struct SliceOut {
  @builtin(position) clip: vec4f,
  @location(0) value: f32,
  @location(1) x: f32,
};

@vertex
fn slice_vs(v: SliceIn) -> SliceOut {
  var out: SliceOut;
  out.clip = frame.view_proj * vec4f(v.position, 1.0);
  out.value = v.value;
  out.x = v.position.x;
  return out;
}

@fragment
fn slice_fs(v: SliceOut) -> @location(0) vec4f {
  if (draw.extra.w > 0.5 && beyond_base(v.x)) {
    discard;
  }
  // look.x: brightness; extra.y: opacity.
  return vec4f(colour_of(v.value) * draw.look.x, draw.extra.y);
}

// A face through the axis (the cutaway's, or the slice's plane) textured
// from the field's image: the fibres along the computed flow coloured by
// the value (look.y = 0), or the numerical schlieren, the density
// gradient's magnitude on a log scale, light on dark (look.y = 1).
// Opaque; nothing outside the computed region.
struct FaceOut {
  @builtin(position) clip: vec4f,
  @location(0) world: vec3f,
};

@vertex
fn face_vs(v: SliceIn) -> FaceOut {
  var out: FaceOut;
  out.clip = frame.view_proj * vec4f(v.position, 1.0);
  out.world = v.position;
  return out;
}

@fragment
fn face_fs(v: FaceOut) -> @location(0) vec4f {
  let x = v.world.x;
  let r = length(v.world.yz);
  let f = field_at(x, r);
  if (f.w < -0.5 || beyond_base(x)) {
    discard;
  }
  if (draw.look.y > 0.5) {
    let s = pow(clamp(f.w, 0.0, 1.0), 0.9);
    return vec4f(mix(vec3f(0.0), vec3f(0.93, 0.95, 1.0), s), 1.0);
  }
  let fibre = textureSampleLevel(lic_tex, clamp_sampler, image_uv(x, r), 0.0).r;
  return vec4f(palette_colour(f.z) * (0.12 + 1.05 * fibre), 1.0);
}
