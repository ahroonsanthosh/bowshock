// Display fields on grid nodes: the WGSL twin of src/render/fields.ts.
// Requires gas.wgsl.
//
// Sequence: cell_values, node_average, and for schlieren also
// cell_gradient and node_average again; then range_partials and
// finalize_range to find the minimum and maximum for shading.

const WORKGROUP_SIZE: u32 = 64u;

// Field codes, matching DISPLAY_FIELD_CODES in fields.ts.
const SCHLIEREN: u32 = 0u;
const MACH: u32 = 1u;
const PRESSURE: u32 = 2u;
const DENSITY: u32 = 3u;

struct FieldParams {
  ni: u32,
  nj: u32,
  field: u32,
  n_partials: u32,
  gamma: f32,
}

@group(0) @binding(0) var<uniform> params: FieldParams;
@group(0) @binding(1) var<storage, read> nodes: array<vec2f>;
@group(0) @binding(2) var<storage, read> state: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> cell_value: array<f32>;
@group(0) @binding(4) var<storage, read_write> node_value: array<f32>;
// Element 0: the final (min, max); elements 1.. : per-workgroup partials.
@group(0) @binding(5) var<storage, read_write> value_range: array<vec2f>;

var<workgroup> reduction: array<vec2f, WORKGROUP_SIZE>;

fn n_nodes() -> u32 {
  return (params.ni + 1u) * (params.nj + 1u);
}

// The displayed quantity of cell c (density for schlieren, whose gradient
// is taken later).
@compute @workgroup_size(WORKGROUP_SIZE)
fn cell_values(@builtin(global_invocation_id) id: vec3u) {
  let c = id.x;
  if (c >= params.ni * params.nj) {
    return;
  }
  let w = to_primitive_2d(state[c], params.gamma);
  var q = w.rho;
  if (params.field == MACH) {
    q = length(vec2f(w.u, w.v)) / sqrt(params.gamma * w.p / w.rho);
  } else if (params.field == PRESSURE) {
    q = w.p;
  }
  cell_value[c] = q;
}

// Twin of nodeAverage: the mean of the cells sharing each node.
@compute @workgroup_size(WORKGROUP_SIZE)
fn node_average(@builtin(global_invocation_id) id: vec3u) {
  let n = id.x;
  if (n >= n_nodes()) {
    return;
  }
  let i = i32(n % (params.ni + 1u));
  let j = i32(n / (params.ni + 1u));
  var sum = 0.0;
  var count = 0.0;
  for (var dj = -1; dj <= 0; dj++) {
    for (var di = -1; di <= 0; di++) {
      let ci = i + di;
      let cj = j + dj;
      if (ci >= 0 && ci < i32(params.ni) && cj >= 0 && cj < i32(params.nj)) {
        sum += cell_value[u32(ci + cj * i32(params.ni))];
        count += 1.0;
      }
    }
  }
  node_value[n] = sum / count;
}

// Twin of cellGradientMagnitude: Green-Gauss over the four edges, edge
// values the mean of their end nodes.
@compute @workgroup_size(WORKGROUP_SIZE)
fn cell_gradient(@builtin(global_invocation_id) id: vec3u) {
  let c = id.x;
  if (c >= params.ni * params.nj) {
    return;
  }
  let i = c % params.ni;
  let j = c / params.ni;
  let row = params.ni + 1u;
  let corners = array<u32, 4>(i + j * row, i + 1u + j * row, i + 1u + (j + 1u) * row, i + (j + 1u) * row);
  var gradient = vec2f(0.0, 0.0);
  var area = 0.0;
  for (var k = 0u; k < 4u; k++) {
    let a = corners[k];
    let b = corners[(k + 1u) % 4u];
    let q = 0.5 * (node_value[a] + node_value[b]);
    let edge = nodes[b] - nodes[a];
    gradient += q * vec2f(edge.y, -edge.x);
    area += 0.5 * (nodes[a].x * nodes[b].y - nodes[b].x * nodes[a].y);
  }
  cell_value[c] = length(gradient) / area;
}

fn reduce_range(local: u32) {
  for (var stride = WORKGROUP_SIZE / 2u; stride > 0u; stride /= 2u) {
    workgroupBarrier();
    if (local < stride) {
      let a = reduction[local];
      let b = reduction[local + stride];
      reduction[local] = vec2f(min(a.x, b.x), max(a.y, b.y));
    }
  }
  workgroupBarrier();
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn range_partials(
  @builtin(global_invocation_id) id: vec3u,
  @builtin(local_invocation_index) local: u32,
  @builtin(workgroup_id) group: vec3u,
) {
  var r = vec2f(3.0e38, -3.0e38);
  if (id.x < n_nodes()) {
    r = vec2f(node_value[id.x]);
  }
  reduction[local] = r;
  reduce_range(local);
  if (local == 0u) {
    value_range[1u + group.x] = reduction[0];
  }
}

// Dispatched as a single workgroup after range_partials.
@compute @workgroup_size(WORKGROUP_SIZE)
fn finalize_range(@builtin(local_invocation_index) local: u32) {
  var r = vec2f(3.0e38, -3.0e38);
  for (var k = local; k < params.n_partials; k += WORKGROUP_SIZE) {
    let p = value_range[1u + k];
    r = vec2f(min(r.x, p.x), max(r.y, p.y));
  }
  reduction[local] = r;
  reduce_range(local);
  if (local == 0u) {
    value_range[0] = reduction[0];
  }
}
