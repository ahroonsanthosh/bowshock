// The computed field as images of the meridional plane (src/render3d/
// field-image.ts): first the dual mesh's quads rasterised, the GPU
// interpolating the solver's values across each (velocity, the value
// shown, the schlieren's brightness); then the fibres along the flow, a
// line integral convolution: each texel the mean of a noise image along
// the streamline through it, traced both ways in the image's velocity.
// The noise only carries the direction; the streamlines are the field's.

struct ImageIn {
  @location(0) position: vec2f,
  @location(1) velocity: vec2f,
  @location(2) value: f32,
  @location(3) schlieren: f32,
};

struct ImageOut {
  @builtin(position) clip: vec4f,
  @location(0) velocity: vec2f,
  @location(1) value: f32,
  @location(2) schlieren: f32,
};

@vertex
fn image_vs(v: ImageIn) -> ImageOut {
  var out: ImageOut;
  out.clip = vec4f(v.position, 0.0, 1.0);
  out.velocity = v.velocity;
  out.value = v.value;
  out.schlieren = v.schlieren;
  return out;
}

@fragment
fn image_fs(v: ImageOut) -> @location(0) vec4f {
  return vec4f(v.velocity, v.value, v.schlieren);
}

@group(0) @binding(0) var image: texture_2d<f32>;
@group(0) @binding(1) var noise: texture_2d<f32>;
@group(0) @binding(2) var linear_sampler: sampler;

struct LicParams {
  // x: steps each way; y: step length in texels; z: contrast gain.
  settings: vec4f,
};
@group(0) @binding(3) var<uniform> lic: LicParams;

@vertex
fn lic_vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var corners = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(corners[i], 0.0, 1.0);
}

fn noise_at(p: vec2f, size: vec2f) -> f32 {
  let q = clamp(vec2i(floor(p)), vec2i(0), vec2i(size) - vec2i(1));
  return textureLoad(noise, q, 0).r;
}

// The image's flow direction at p (texels; r up is the texture's y down), or 0 outside.
fn direction(p: vec2f, size: vec2f) -> vec2f {
  let f = textureSampleLevel(image, linear_sampler, p / size, 0.0);
  if (f.w < -0.5) {
    return vec2f(0.0);
  }
  let d = vec2f(f.x, -f.y);
  let len = length(d);
  if (len < 1e-6) {
    return vec2f(0.0);
  }
  return d / len;
}

@fragment
fn lic_fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let size = vec2f(textureDimensions(image));
  let p0 = pos.xy;
  let f0 = textureSampleLevel(image, linear_sampler, p0 / size, 0.0);
  if (f0.w < -0.5) {
    return vec4f(0.5, 0.0, 0.0, 1.0);
  }
  let steps = i32(lic.settings.x);
  let h = lic.settings.y;
  var sum = noise_at(p0, size);
  var count = 1.0;
  for (var side = 0; side < 2; side++) {
    let sign = select(-1.0, 1.0, side == 1);
    var p = p0;
    for (var k = 0; k < steps; k++) {
      let d = direction(p, size);
      if (d.x == 0.0 && d.y == 0.0) {
        break;
      }
      // Second order: the direction half a step on.
      let dm = direction(p + 0.5 * sign * h * d, size);
      if (dm.x == 0.0 && dm.y == 0.0) {
        break;
      }
      p = p + sign * h * dm;
      sum += noise_at(p, size);
      count += 1.0;
    }
  }
  // A mean of n noise samples has 1 / sqrt(n) of its contrast: given back.
  let mean = sum / count;
  let v = 0.5 + (mean - 0.5) * sqrt(count) * lic.settings.z;
  return vec4f(clamp(v, 0.0, 1.0), 0.0, 0.0, 1.0);
}
