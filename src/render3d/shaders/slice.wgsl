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
