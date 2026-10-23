// The flow view's fields, cell by cell, from the solver's state buffer:
// the WGSL twin of src/render/flow-fields.ts. Requires gas.wgsl.
//
// Per frame: flow_nodes (when the grid is the moving grid of a fitted
// shock, its nodes from the lines, fractions and heights of
// src/engine-gpu/line-grid.ts), then flow_cell_values for each field shown
// (a slot each: one, or two in the split view), then flow_range_partials
// and flow_finalize_range for each slot's minimum and maximum.

const WORKGROUP_SIZE: u32 = 64u;

// Field codes, matching FLOW_FIELD_CODES in flow-fields.ts.
const SCHLIEREN: u32 = 0u;
const MACH: u32 = 1u;
const CP: u32 = 2u;
const DENSITY: u32 = 3u;

struct FlowParams {
  ni: u32,
  nj: u32,
  n_partials: u32,
  // The field of slot 0 and of slot 1.
  field_0: u32,
  field_1: u32,
  _pad0: u32,
  // The free stream's value of the field of slot 0 and of slot 1: the
  // view fills the flow outside the fitted shock with it, so each slot's
  // range takes it in.
  free_value_0: f32,
  free_value_1: f32,
  // Free stream (rho, u, v, p).
  free: vec4f,
  gamma: f32,
  // The length that makes schlieren's gradient dimensionless.
  length_scale: f32,
}

@group(0) @binding(0) var<uniform> params: FlowParams;
// The solver's conserved state per cell (rho, rho u, rho v, E), cell (i, j) at i + j ni.
@group(0) @binding(1) var<storage, read> state: array<vec4f>;
// Node (i, j) at i + j (ni + 1).
@group(0) @binding(2) var<storage, read_write> nodes: array<vec2f>;
// Slot s's value of cell c at s n_cells + c.
@group(0) @binding(3) var<storage, read_write> cell_value: array<f32>;
// Slot s: its (min, max) at s (1 + n_partials), then its per-workgroup partials.
@group(0) @binding(4) var<storage, read_write> value_range: array<vec2f>;
// The moving grid of line-grid.wgsl: per line (P.x, P.y, d.x, d.y); the
// node fractions; the heights (base heights, their differences, the last
// moves, then the displacements from the base).
@group(0) @binding(5) var<storage, read> lines: array<vec4f>;
@group(0) @binding(6) var<storage, read> fractions: array<f32>;
@group(0) @binding(7) var<storage, read> heights: array<f32>;

var<workgroup> reduction: array<vec2f, WORKGROUP_SIZE>;

fn n_cells() -> u32 {
  return params.ni * params.nj;
}

fn node(i: u32, j: u32) -> vec2f {
  return nodes[i + j * (params.ni + 1u)];
}

// Node (i, j) of the moving grid at the current heights: P_i + h_i eta_ij d_i,
// as line-grid.wgsl places it.
@compute @workgroup_size(WORKGROUP_SIZE)
fn flow_nodes(@builtin(global_invocation_id) id: vec3u) {
  let n = id.x;
  if (n >= (params.ni + 1u) * (params.nj + 1u)) {
    return;
  }
  let i = n % (params.ni + 1u);
  let line = lines[i];
  let height = heights[i] + heights[3u * params.ni + 2u + i];
  nodes[n] = line.xy + height * fractions[n] * line.zw;
}

fn density(i: i32, j: i32) -> f32 {
  return state[u32(i) + u32(j) * params.ni].x;
}

// Twin of schlierenGradient: Green-Gauss over the four faces, each face
// the mean density of the cells either side (the cell's own on the boundary).
fn schlieren(c: u32) -> f32 {
  let i = i32(c % params.ni);
  let j = i32(c / params.ni);
  let ni = i32(params.ni);
  let nj = i32(params.nj);
  let corners = array<vec2f, 4>(
    node(u32(i), u32(j)),
    node(u32(i + 1), u32(j)),
    node(u32(i + 1), u32(j + 1)),
    node(u32(i), u32(j + 1)),
  );
  let across = array<vec2i, 4>(vec2i(i, j - 1), vec2i(i + 1, j), vec2i(i, j + 1), vec2i(i - 1, j));
  let own = density(i, j);
  var gradient = vec2f(0.0, 0.0);
  var area = 0.0;
  for (var k = 0u; k < 4u; k++) {
    let a = corners[k];
    let b = corners[(k + 1u) % 4u];
    let other = across[k];
    var q = own;
    if (other.x >= 0 && other.x < ni && other.y >= 0 && other.y < nj) {
      q = 0.5 * (own + density(other.x, other.y));
    }
    let edge = b - a;
    gradient += q * vec2f(edge.y, -edge.x);
    area += 0.5 * (a.x * b.y - b.x * a.y);
  }
  return length(gradient) / abs(area) * params.length_scale / params.free.x;
}

// Twin of cellFieldValue (and of schlierenGradient for SCHLIEREN).
fn field_value(field: u32, c: u32) -> f32 {
  if (field == SCHLIEREN) {
    return schlieren(c);
  }
  let w = to_primitive_2d(state[c], params.gamma);
  if (field == MACH) {
    return length(vec2f(w.u, w.v)) / sqrt(params.gamma * w.p / w.rho);
  }
  if (field == CP) {
    let free = params.free;
    return (w.p - free.w) / (0.5 * free.x * dot(free.yz, free.yz));
  }
  return w.rho / params.free.x;
}

// One slot (id.y) of every cell (id.x).
@compute @workgroup_size(WORKGROUP_SIZE)
fn flow_cell_values(@builtin(global_invocation_id) id: vec3u) {
  let c = id.x;
  if (c >= n_cells()) {
    return;
  }
  let field = select(params.field_0, params.field_1, id.y == 1u);
  cell_value[id.y * n_cells() + c] = field_value(field, c);
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

fn range_base(slot: u32) -> u32 {
  return slot * (1u + params.n_partials);
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn flow_range_partials(
  @builtin(global_invocation_id) id: vec3u,
  @builtin(local_invocation_index) local: u32,
  @builtin(workgroup_id) group: vec3u,
) {
  var r = vec2f(3.0e38, -3.0e38);
  if (id.x < n_cells()) {
    r = vec2f(cell_value[group.y * n_cells() + id.x]);
  }
  reduction[local] = r;
  reduce_range(local);
  if (local == 0u) {
    value_range[range_base(group.y) + 1u + group.x] = reduction[0];
  }
}

// One workgroup per slot, after flow_range_partials.
@compute @workgroup_size(WORKGROUP_SIZE)
fn flow_finalize_range(
  @builtin(local_invocation_index) local: u32,
  @builtin(workgroup_id) group: vec3u,
) {
  var r = vec2f(3.0e38, -3.0e38);
  for (var k = local; k < params.n_partials; k += WORKGROUP_SIZE) {
    let p = value_range[range_base(group.y) + 1u + k];
    r = vec2f(min(r.x, p.x), max(r.y, p.y));
  }
  reduction[local] = r;
  reduce_range(local);
  if (local == 0u) {
    let free = select(params.free_value_0, params.free_value_1, group.y == 1u);
    let cells = reduction[0];
    value_range[range_base(group.y)] = vec2f(min(cells.x, free), max(cells.y, free));
  }
}
