// Shared by every pipeline of the 3D view (src/render3d/scene.ts): the
// frame's camera, lights and colour range, the palette of the quantity
// shown, and the draw's own settings.

struct Frame {
  view_proj: mat4x4f,
  // The eye's position (xyz).
  eye: vec4f,
  // Width, height, 1 / width, 1 / height of the target, in pixels.
  viewport: vec4f,
  // Unit vectors towards the key, rim and fill lights (xyz).
  key_light: vec4f,
  rim_light: vec4f,
  fill_light: vec4f,
  // The colour range: minimum, maximum, 1 / (maximum - minimum).
  range: vec4f,
  // The cutaway: azimuth where it starts, its width (radians), 1 if on.
  cut: vec4f,
  // x: nothing is drawn of the flow beyond this x (the base); y: 1 to clip.
  clip: vec4f,
};

struct Draw {
  // rgb: a constant colour; w: 1 to use it, 0 to colour by value.
  colour: vec4f,
  // Per pipeline: intensities and shading.
  look: vec4f,
  // Revolved draws: first azimuth, azimuth step, azimuths per item, items.
  sweep: vec4f,
  // x: line width in pixels; y: opacity; z: 1 to skip azimuths in the cut.
  extra: vec4f,
};

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> palette: array<vec4f>;
@group(1) @binding(0) var<uniform> draw: Draw;

const TAU: f32 = 6.283185307179586;

// The palette's colour of a value (linear between its entries): the twin
// of the palette functions of src/render3d/quantities.ts, as tabulated.
fn palette_colour(value: f32) -> vec3f {
  let t = clamp((value - frame.range.x) * frame.range.z, 0.0, 1.0);
  let n = arrayLength(&palette);
  let f = t * f32(n - 1u);
  let k = min(u32(f), n - 2u);
  return mix(palette[k].rgb, palette[k + 1u].rgb, f - f32(k));
}

fn colour_of(value: f32) -> vec3f {
  if (draw.colour.w > 0.5) {
    return draw.colour.rgb;
  }
  return palette_colour(value);
}

// Whether azimuth phi lies in the cutaway.
fn in_cut(phi: f32) -> bool {
  if (frame.cut.z < 0.5) {
    return false;
  }
  let d = fract((phi - frame.cut.x) / TAU) * TAU;
  return d < frame.cut.y;
}

// Whether a point of the flow lies beyond the base (not simulated).
fn beyond_base(x: f32) -> bool {
  return frame.clip.y > 0.5 && x > frame.clip.x;
}

// A point turned about the x axis by phi (y towards z).
fn turn(p: vec3f, c: f32, s: f32) -> vec3f {
  return vec3f(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
}
