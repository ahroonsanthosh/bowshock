// Draws a structured grid as smoothly shaded triangles, two per cell,
// coloured by the node values computed by fields.wgsl.

const SCHLIEREN: u32 = 0u;
const COLORMAP_SIZE: u32 = 256u;

struct RenderParams {
  ni: u32,
  nj: u32,
  field: u32,
  _padding: u32,
  // Node position to clip space: clip = position * scale + offset.
  scale: vec2f,
  offset: vec2f,
  // Schlieren contrast k in exp(-k g / g_max).
  schlieren_k: f32,
}

@group(0) @binding(0) var<uniform> params: RenderParams;
@group(0) @binding(1) var<storage, read> nodes: array<vec2f>;
@group(0) @binding(2) var<storage, read> node_value: array<f32>;
@group(0) @binding(3) var<storage, read> value_range: array<vec2f>;
@group(0) @binding(4) var<storage, read> colormap: array<vec4f, COLORMAP_SIZE>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) value: f32,
}

// Corners of the two triangles of a cell, as (di, dj) node offsets.
const CORNERS = array<vec2u, 6>(
  vec2u(0u, 0u), vec2u(1u, 0u), vec2u(1u, 1u),
  vec2u(0u, 0u), vec2u(1u, 1u), vec2u(0u, 1u),
);

@vertex
fn vs_main(@builtin(vertex_index) vertex: u32) -> VertexOutput {
  let cell = vertex / 6u;
  let corner = CORNERS[vertex % 6u];
  let i = cell % params.ni + corner.x;
  let j = cell / params.ni + corner.y;
  let n = i + j * (params.ni + 1u);
  var out: VertexOutput;
  out.position = vec4f(nodes[n] * params.scale + params.offset, 0.0, 1.0);
  out.value = node_value[n];
  return out;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  let range = value_range[0];
  if (params.field == SCHLIEREN) {
    // Numerical schlieren: white where the density is uniform, dark at
    // shocks and expansions.
    let shade = exp(-params.schlieren_k * input.value / max(range.y, 1.0e-30));
    return vec4f(vec3f(shade), 1.0);
  }
  let t = clamp((input.value - range.x) / max(range.y - range.x, 1.0e-30), 0.0, 1.0);
  let position = t * f32(COLORMAP_SIZE - 1u);
  let k = min(u32(position), COLORMAP_SIZE - 2u);
  return mix(colormap[k], colormap[k + 1u], position - f32(k));
}
