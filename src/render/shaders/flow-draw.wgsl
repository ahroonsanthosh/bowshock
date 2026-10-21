// Draws the flow view (src/render/flow-renderer.ts): the field on the dual
// mesh of the cell centres (src/render/flow-fields.ts says why), the body
// as a solid, the grid lines and polylines (the fitted shock, the body's
// outline) as smooth lines. Axisymmetric flows are drawn twice, the second
// instance mirrored about the axis; in the split view it shows another field.

const SCHLIEREN: u32 = 0u;
const COLORMAP_SIZE: u32 = 256u;

struct DrawParams {
  // World to clip space: clip = world * scale + offset.
  scale: vec2f,
  offset: vec2f,
  // The target's size in pixels.
  viewport: vec2f,
  ni: u32,
  nj: u32,
  // The field and the value slot of the upper (instance 0) and the
  // mirrored lower (instance 1) halves.
  field_upper: u32,
  field_lower: u32,
  slot_upper: u32,
  slot_lower: u32,
  n_partials: u32,
  // Grid lines: every stride-th line of each family.
  stride: u32,
  schlieren_k: f32,
  _pad: u32,
  schlieren_dark: vec4f,
  schlieren_light: vec4f,
  grid_colour: vec4f,
  // The free stream's value of the upper and the lower half's field (x, y);
  // the body's base, x, behind which the flow is not simulated (w).
  free_value: vec4f,
}

struct LineParams {
  // Points first .. first + count - 1 of `points`.
  first: u32,
  count: u32,
  // Width in pixels.
  width: f32,
  _pad: u32,
  colour: vec4f,
}

@group(0) @binding(0) var<uniform> params: DrawParams;
@group(0) @binding(1) var<storage, read> nodes: array<vec2f>;
@group(0) @binding(2) var<storage, read> cell_value: array<f32>;
@group(0) @binding(3) var<storage, read> value_range: array<vec2f>;
@group(0) @binding(4) var<storage, read> colormap: array<vec4f, COLORMAP_SIZE>;

@group(1) @binding(0) var<uniform> line: LineParams;
@group(1) @binding(1) var<storage, read> points: array<vec2f>;

fn node(i: u32, j: u32) -> vec2f {
  return nodes[i + j * (params.ni + 1u)];
}

// A world point to clip space, mirrored about the axis for instance 1.
fn to_clip(p: vec2f, instance: u32) -> vec4f {
  let mirrored = vec2f(p.x, select(p.y, -p.y, instance == 1u));
  return vec4f(mirrored * params.scale + params.offset, 0.0, 1.0);
}

// ------------------------------------------------------------- the field

// Vertex (a, b) of the dual mesh, a in 0..ni + 1, b in 0..nj + 1: the
// centre of cell (a - 1, b - 1) (the mean of its four corners) inside,
// the middle of a boundary face or a corner node on the boundary.
fn dual_position(a: u32, b: u32) -> vec2f {
  let i0 = min(max(a, 1u) - 1u, params.ni);
  let i1 = min(a, params.ni);
  let j0 = min(max(b, 1u) - 1u, params.nj);
  let j1 = min(b, params.nj);
  return 0.25 * (node(i0, j0) + node(i1, j0) + node(i0, j1) + node(i1, j1));
}

// The cell whose value vertex (a, b) takes: its own, or the one beside it.
fn dual_cell(a: u32, b: u32) -> u32 {
  let i = min(max(a, 1u) - 1u, params.ni - 1u);
  let j = min(max(b, 1u) - 1u, params.nj - 1u);
  return i + j * params.ni;
}

struct FieldOut {
  @builtin(position) position: vec4f,
  @location(0) value: f32,
  @location(1) @interpolate(flat) field: u32,
  @location(2) @interpolate(flat) slot: u32,
}

// Corners of the two triangles of a quad, as (da, db).
const CORNERS = array<vec2u, 6>(
  vec2u(0u, 0u), vec2u(1u, 0u), vec2u(1u, 1u),
  vec2u(0u, 0u), vec2u(1u, 1u), vec2u(0u, 1u),
);

@vertex
fn vs_field(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> FieldOut {
  let quad = vertex / 6u;
  let corner = CORNERS[vertex % 6u];
  let a = quad % (params.ni + 1u) + corner.x;
  let b = quad / (params.ni + 1u) + corner.y;
  let slot = select(params.slot_upper, params.slot_lower, instance == 1u);
  var out: FieldOut;
  out.position = to_clip(dual_position(a, b), instance);
  out.value = cell_value[slot * params.ni * params.nj + dual_cell(a, b)];
  out.field = select(params.field_upper, params.field_lower, instance == 1u);
  out.slot = slot;
  return out;
}

@fragment
fn fs_field(input: FieldOut) -> @location(0) vec4f {
  if (input.field == SCHLIEREN) {
    // Twin of schlierenBrightness: light on dark.
    let t = 1.0 - exp(-params.schlieren_k * max(input.value, 0.0));
    return mix(params.schlieren_dark, params.schlieren_light, t);
  }
  let range = value_range[input.slot * (1u + params.n_partials)];
  let t = clamp((input.value - range.x) / max(range.y - range.x, 1.0e-30), 0.0, 1.0);
  let position = t * f32(COLORMAP_SIZE - 1u);
  let k = min(u32(position), COLORMAP_SIZE - 2u);
  return mix(colormap[k], colormap[k + 1u], position - f32(k));
}

// --------------------------------------------- the free stream outside

// Beyond the fitted shock (the grid's last row of nodes, j = nj) the flow
// is the free stream, untouched: it is filled with the free stream's own
// value of the field, upstream of the shock's first node and above each
// segment of the shock, to a height far beyond any view. Not beyond the
// grid's last line, where the flow is not the free stream.
const FAR: f32 = 1.0e4;

@vertex
fn vs_free(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> FieldOut {
  let quad = vertex / 6u;
  let corner = CORNERS[vertex % 6u];
  var a: vec2f;
  var b: vec2f;
  if (quad == 0u) {
    // Upstream of the shock's first node, from the axis up.
    let first = node(0u, params.nj);
    a = vec2f(-FAR, 0.0);
    b = vec2f(first.x, 0.0);
  } else {
    a = node(quad - 1u, params.nj);
    b = node(quad, params.nj);
  }
  // Corner (0, 0) and (1, 0) on the shock (or the axis), (0, 1) and (1, 1) far above.
  let x = select(a.x, b.x, corner.x == 1u);
  let y = select(select(a.y, b.y, corner.x == 1u), FAR, corner.y == 1u);
  let slot = select(params.slot_upper, params.slot_lower, instance == 1u);
  var out: FieldOut;
  out.position = to_clip(vec2f(x, y), instance);
  out.value = select(params.free_value.x, params.free_value.y, instance == 1u);
  out.field = select(params.field_upper, params.field_lower, instance == 1u);
  out.slot = slot;
  return out;
}

// The value itself, for probing what is drawn at a point (an r32float target).
@fragment
fn fs_probe(input: FieldOut) -> @location(0) f32 {
  return input.value;
}

// ------------------------------------------------------------ grid lines

struct PlainOut {
  @builtin(position) position: vec4f,
}

// Every stride-th line of constant i (nj segments each), then of constant j
// (ni segments each), as a line list.
@vertex
fn vs_grid(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> PlainOut {
  let segment = vertex / 2u;
  let end = vertex % 2u;
  let n_i_lines = params.ni / params.stride + 1u;
  var p: vec2f;
  if (segment < n_i_lines * params.nj) {
    let i = min((segment / params.nj) * params.stride, params.ni);
    p = node(i, segment % params.nj + end);
  } else {
    let s = segment - n_i_lines * params.nj;
    let j = min((s / params.ni) * params.stride, params.nj);
    p = node(s % params.ni + end, j);
  }
  var out: PlainOut;
  out.position = to_clip(p, instance);
  return out;
}

@fragment
fn fs_grid() -> @location(0) vec4f {
  return params.grid_colour;
}

// ------------------------------------------------------------- the body

// The solid between the axis and the body's outline (x, r): a triangle
// strip through (x, r) and (x, -r) at each point of the outline.
@vertex
fn vs_body(@builtin(vertex_index) vertex: u32) -> PlainOut {
  let p = points[line.first + vertex / 2u];
  var out: PlainOut;
  out.position = to_clip(p, vertex % 2u);
  return out;
}

@fragment
fn fs_body() -> @location(0) vec4f {
  return line.colour;
}

// The body shaded as a solid of revolution seen from the side: the strip's
// vertices are (x, r) and (x, -r), so `across` runs from 1 to -1 as y / r,
// and the surface's normal there is (0, y / r, sqrt(1 - (y / r)^2)); lit
// from above and in front.
struct BodyOut {
  @builtin(position) position: vec4f,
  @location(0) across: f32,
}

@vertex
fn vs_body_shaded(@builtin(vertex_index) vertex: u32) -> BodyOut {
  let p = points[line.first + vertex / 2u];
  var out: BodyOut;
  out.position = to_clip(p, vertex % 2u);
  out.across = select(1.0, -1.0, vertex % 2u == 1u);
  return out;
}

@fragment
fn fs_body_shaded(input: BodyOut) -> @location(0) vec4f {
  let v = clamp(input.across, -1.0, 1.0);
  let normal = vec3f(0.0, v, sqrt(max(0.0, 1.0 - v * v)));
  let light = normalize(vec3f(-0.3, 0.65, 1.0));
  let diffuse = max(dot(normal, light), 0.0);
  let half_way = normalize(light + vec3f(0.0, 0.0, 1.0));
  let specular = pow(max(dot(normal, half_way), 0.0), 36.0);
  return vec4f(line.colour.rgb * (0.16 + 0.84 * diffuse) + vec3f(0.3 * specular), 1.0);
}

// Shapes drawn as they are, not mirrored: triangles of world points (the
// fins seen from the side, docs/design/0017-rocketeer-interface.md section 7).
@vertex
fn vs_shape(@builtin(vertex_index) vertex: u32) -> PlainOut {
  var out: PlainOut;
  out.position = to_clip(points[line.first + vertex], 0u);
  return out;
}

// --------------------------------------------- what is not simulated

// Behind the body's base (x beyond free_value.w) the solver computes
// nothing: the region is hatched, never painted with a flow.
@vertex
fn vs_unsimulated(@builtin(vertex_index) vertex: u32) -> PlainOut {
  let corner = CORNERS[vertex % 6u];
  let x = select(params.free_value.w, FAR, corner.x == 1u);
  let y = select(-FAR, FAR, corner.y == 1u);
  var out: PlainOut;
  out.position = to_clip(vec2f(x, y), 0u);
  return out;
}

@fragment
fn fs_unsimulated(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let spacing = 12.0 * max(params.viewport.y / 900.0, 1.0);
  let d = abs(fract((position.x + position.y) / spacing) - 0.5) * spacing;
  let stripe = clamp(1.0 - d + 0.5, 0.0, 1.0);
  return vec4f(mix(vec3f(0.027, 0.035, 0.047), vec3f(0.15, 0.16, 0.18), stripe), 1.0);
}

// --------------------------------------------------------- smooth lines

struct LineOut {
  @builtin(position) position: vec4f,
  // Distance from the line's centre across it, in pixels.
  @location(0) across: f32,
}

// Each segment of the polyline as a quad in pixels, one pixel wider than
// the line on each side for its soft edge; the ends overlap the
// neighbouring segments' by half the width, closing the joints.
const ALONG = array<f32, 6>(0.0, 1.0, 1.0, 0.0, 1.0, 0.0);
const SIDE = array<f32, 6>(-1.0, -1.0, 1.0, -1.0, 1.0, 1.0);

@vertex
fn vs_line(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> LineOut {
  let segment = vertex / 6u;
  let k = vertex % 6u;
  let half_viewport = 0.5 * params.viewport;
  let c0 = to_clip(points[line.first + segment], instance);
  let c1 = to_clip(points[line.first + segment + 1u], instance);
  let p0 = c0.xy * half_viewport;
  let p1 = c1.xy * half_viewport;
  var direction = p1 - p0;
  let size = length(direction);
  direction = select(vec2f(1.0, 0.0), direction / size, size > 0.0);
  let normal = vec2f(-direction.y, direction.x);
  let half_width = 0.5 * line.width + 1.0;
  let extend = (ALONG[k] * 2.0 - 1.0) * 0.5 * line.width;
  let p = mix(p0, p1, ALONG[k]) + direction * extend + normal * SIDE[k] * half_width;
  var out: LineOut;
  out.position = vec4f(p / half_viewport, 0.0, 1.0);
  out.across = SIDE[k] * half_width;
  return out;
}

@fragment
fn fs_line(input: LineOut) -> @location(0) vec4f {
  let coverage = clamp(0.5 * line.width + 0.5 - abs(input.across), 0.0, 1.0);
  return vec4f(line.colour.rgb, line.colour.a * coverage);
}
