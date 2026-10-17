// Grid metrics on straight lines from the body with fixed node fractions,
// for a given height of each line (src/engine-gpu/line-grid.ts; design:
// docs/design/0006-shock-fitting.md). Node (i, j) lies at
//   P_i + h_i eta_ij d_i,
// P_i the line's body point, d_i its direction, h_i its height and eta_ij
// fixed fractions. Every difference the metrics need is assembled from
// differences computed once in double precision (between neighbouring
// lines: of P, d and eta; along a line: of eta) and from the heights and
// their neighbour differences, computed in double precision for each
// move, so 32-bit arithmetic never subtracts nearly equal absolute
// coordinates. Output: the geometry buffer of euler2d.wgsl.

const WORKGROUP_SIZE: u32 = 64u;

struct LineGridParams {
  ni: u32,
  nj: u32,
  // 1 for axisymmetric geometry (y is the radius), 0 for planar.
  axisymmetric: u32,
  gamma: f32,
}

struct Primitive {
  rho: f32,
  u: f32,
  v: f32,
  p: f32,
}

@group(0) @binding(0) var<uniform> params: LineGridParams;
// Per line i (ni + 1): (P_i.x, P_i.y, d_i.x, d_i.y).
@group(0) @binding(1) var<storage, read> lines: array<vec4f>;
// Per pair of lines i, i + 1 (ni): (P_{i+1} - P_i, d_{i+1} - d_i).
@group(0) @binding(2) var<storage, read> pairs: array<vec4f>;
// Per node: eta_ij at (i + j (ni + 1)); then per node pair along a line,
// eta_{i,j+1} - eta_ij at (ni + 1)(nj + 1) + i + j (ni + 1); then across
// lines, eta_{i+1,j} - eta_ij at (ni + 1)(2 nj + 1) + i + j ni.
@group(0) @binding(3) var<storage, read> fractions: array<f32>;
// h_i (ni + 1), then h_{i+1} - h_i (ni), then the last move of each line,
// h_i - h_i before it (ni + 1).
@group(0) @binding(4) var<storage, read> heights: array<f32>;
@group(0) @binding(5) var<storage, read_write> geometry: array<vec4f>;
// The flow before and after a move (conserved, as in euler2d.wgsl).
@group(0) @binding(6) var<storage, read> before: array<vec4f>;
@group(0) @binding(7) var<storage, read_write> after: array<vec4f>;

fn eta(i: u32, j: u32) -> f32 {
  return fractions[i + j * (params.ni + 1u)];
}

fn eta_along(i: u32, j: u32) -> f32 {
  return fractions[(params.ni + 1u) * (params.nj + 1u) + i + j * (params.ni + 1u)];
}

fn eta_across(i: u32, j: u32) -> f32 {
  return fractions[(params.ni + 1u) * (2u * params.nj + 1u) + i + j * params.ni];
}

fn height(i: u32) -> f32 {
  return heights[i];
}

fn height_step(i: u32) -> f32 {
  return heights[params.ni + 1u + i];
}

fn height_move(i: u32) -> f32 {
  return heights[2u * params.ni + 1u + i];
}

// Node (i, j) relative to its line's body point.
fn offset(i: u32, j: u32) -> vec2f {
  return height(i) * eta(i, j) * lines[i].zw;
}

// Node (i, j + 1) minus node (i, j).
fn along(i: u32, j: u32) -> vec2f {
  return height(i) * eta_along(i, j) * lines[i].zw;
}

// Node (i + 1, j) minus node (i, j).
fn across(i: u32, j: u32) -> vec2f {
  let pair = pairs[i];
  let scale = height_step(i) * eta(i + 1u, j) + height(i) * eta_across(i, j);
  return pair.xy + scale * lines[i].zw + height(i + 1u) * eta(i + 1u, j) * pair.zw;
}

fn radius(i: u32, j: u32) -> f32 {
  return lines[i].y + offset(i, j).y;
}

// A face along v (from node a to node b, with radii ra and rb): its normal
// on the right of a -> b, and its area (per radian if axisymmetric).
fn face(v: vec2f, ra: f32, rb: f32) -> vec4f {
  let size = sqrt(dot(v, v));
  var n = vec2f(0.0, 0.0);
  if (size > 0.0) {
    n = vec2f(v.y, -v.x) / size;
  }
  var area = size;
  if (params.axisymmetric == 1u) {
    area = size * 0.5 * (ra + rb);
  }
  return vec4f(n, area, 0.0);
}

// i-face (i, j): from node (i, j) to node (i, j + 1).
@compute @workgroup_size(WORKGROUP_SIZE)
fn line_grid_i_faces(@builtin(global_invocation_id) id: vec3u) {
  let f = id.x;
  if (f >= (params.ni + 1u) * params.nj) {
    return;
  }
  let i = f % (params.ni + 1u);
  let j = f / (params.ni + 1u);
  geometry[f] = face(along(i, j), radius(i, j), radius(i, j + 1u));
}

// j-face (i, j): from node (i + 1, j) to node (i, j).
@compute @workgroup_size(WORKGROUP_SIZE)
fn line_grid_j_faces(@builtin(global_invocation_id) id: vec3u) {
  let f = id.x;
  if (f >= params.ni * (params.nj + 1u)) {
    return;
  }
  let i = f % params.ni;
  let j = f / params.ni;
  let base = (params.ni + 1u) * params.nj;
  geometry[base + f] = face(-across(i, j), radius(i + 1u, j), radius(i, j));
}

// Cell (i, j): area, centroid and volume, from its corners relative to
// node (i, j), counter-clockwise.
@compute @workgroup_size(WORKGROUP_SIZE)
fn line_grid_cells(@builtin(global_invocation_id) id: vec3u) {
  let c = id.x;
  if (c >= params.ni * params.nj) {
    return;
  }
  let i = c % params.ni;
  let j = c / params.ni;
  let up = along(i, j);
  let corners = array<vec2f, 4>(
    vec2f(0.0, 0.0),
    across(i, j),
    up + across(i, j + 1u),
    up,
  );
  var area = 0.0;
  var centre = vec2f(0.0, 0.0);
  for (var k = 0u; k < 4u; k++) {
    let p = corners[k];
    let q = corners[(k + 1u) % 4u];
    let twice = p.x * q.y - q.x * p.y;
    area += twice;
    centre += (p + q) * twice;
  }
  area *= 0.5;
  let node = lines[i].xy + offset(i, j);
  let centroid = node + centre / (6.0 * area);
  var volume = area;
  if (params.axisymmetric == 1u) {
    volume = area * centroid.y;
  }
  let base = (params.ni + 1u) * params.nj + params.ni * (params.nj + 1u);
  geometry[base + c] = vec4f(volume, area, centroid);
}

fn to_primitive(c: vec4f) -> Primitive {
  let u = c.y / c.x;
  let v = c.z / c.x;
  return Primitive(c.x, u, v, (params.gamma - 1.0) * (c.w - 0.5 * c.x * (u * u + v * v)));
}

fn to_conserved(w: Primitive) -> vec4f {
  return vec4f(
    w.rho,
    w.rho * w.u,
    w.rho * w.v,
    w.p / (params.gamma - 1.0) + 0.5 * w.rho * (w.u * w.u + w.v * w.v),
  );
}

fn mix_primitive(a: Primitive, b: Primitive, t: f32) -> Primitive {
  return Primitive(
    a.rho + t * (b.rho - a.rho),
    a.u + t * (b.u - a.u),
    a.v + t * (b.v - a.v),
    a.p + t * (b.p - a.p),
  );
}

// Distance from the centre of cell (i, j) to the centre of cell (i, j + 1)
// along its column, before the move.
fn centre_spacing(i: u32, j: u32) -> f32 {
  var sum = 0.0;
  for (var k = i; k <= i + 1u; k++) {
    let h = height(k) - height_move(k);
    sum += h * 0.5 * (eta_along(k, j) + eta_along(k, j + 1u));
  }
  return 0.5 * sum;
}

// The flow after a move of the lines, interpolated along each column as
// src/solver/shock-fitting.ts does (linear in the primitive variables,
// held at the end cells). The column's distance is the mean of its two
// lines'; a move shifts the centre of cell (i, j) by the mean of the lines'
// moves times its fraction, computed from the moves themselves. A move is
// below half a cell, so the new centre lies between the old centres of
// (i, j) and one neighbour.
@compute @workgroup_size(WORKGROUP_SIZE)
fn line_grid_remap(@builtin(global_invocation_id) id: vec3u) {
  let c = id.x;
  if (c >= params.ni * params.nj) {
    return;
  }
  let i = c % params.ni;
  let j = c / params.ni;
  var shift = 0.0;
  for (var k = i; k <= i + 1u; k++) {
    shift += height_move(k) * 0.5 * (eta(k, j) + eta(k, j + 1u));
  }
  shift *= 0.5;
  let here = to_primitive(before[c]);
  var w = here;
  if (shift > 0.0 && j + 1u < params.nj) {
    let t = min(shift / centre_spacing(i, j), 1.0);
    w = mix_primitive(here, to_primitive(before[c + params.ni]), t);
  } else if (shift < 0.0 && j > 0u) {
    let t = min(-shift / centre_spacing(i, j - 1u), 1.0);
    w = mix_primitive(here, to_primitive(before[c - params.ni]), t);
  }
  after[c] = to_conserved(w);
}
