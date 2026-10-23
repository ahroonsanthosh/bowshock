// Text and legends over the view: a texture drawn at a rectangle given in
// pixels from the target's top left (draw.sweep: x, y, width, height).
// Requires common.wgsl.

@group(1) @binding(1) var sprite_texture: texture_2d<f32>;
@group(1) @binding(2) var sprite_sampler: sampler;

struct SpriteOut {
  @builtin(position) clip: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn sprite_vs(@builtin(vertex_index) vi: u32) -> SpriteOut {
  var corners = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
    vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0),
  );
  let uv = corners[vi];
  let px = draw.sweep.xy + uv * draw.sweep.zw;
  var out: SpriteOut;
  out.clip = vec4f(px.x * 2.0 * frame.viewport.z - 1.0, 1.0 - px.y * 2.0 * frame.viewport.w, 0.0, 1.0);
  out.uv = uv;
  return out;
}

@fragment
fn sprite_fs(v: SpriteOut) -> @location(0) vec4f {
  // Premultiplied alpha.
  return textureSample(sprite_texture, sprite_sampler, v.uv);
}
