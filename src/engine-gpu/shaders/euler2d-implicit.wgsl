// Implicit steps of the two-dimensional GPU engine: the WGSL twin of
// Euler2D.implicitCorrection with the red-black relaxation
// (src/engine-cpu/euler2d.ts, design record 0013, "The GPU solve"). Requires
// gas.wgsl. The face fluxes of the current state come from euler2d.wgsl's
// compute_i_fluxes and compute_j_fluxes, run just before.
//
// One step: implicit_prepare (residual, diagonal, dQ = 0), then for each
// sweep implicit_relax on the even cells (i + j) and then on the odd ones,
// then implicit_update (dst = src + dQ, each cell's change halved until
// its density and pressure stay within a factor of two), then
// implicit_advance (the CFL number's ramp and the step count).
//
// The system is (D + L + U) dQ = R, R the residual (net inflow) of the
// configured scheme, the neighbours entering through the change of their
// physical flux (A (1/2 dF_n - 1/2 omega lambda dQ)), D the scalar
// 1/2 sum(lambda A) (omega + 1 / cfl) plus, in axisymmetric geometry,
// A_p (|v| + a): as on the CPU.

const WORKGROUP_SIZE: u32 = 64u;
const STATUS_NON_PHYSICAL: u32 = 1u;
const DT_LOG_SIZE: u32 = 256u;

struct ImplicitParams {
  ni: u32,
  nj: u32,
  axisymmetric: u32,
  // The cells relaxed by implicit_relax: those with (i + j) % 2 == colour.
  colour: u32,
  gamma: f32,
  omega: f32,
  cfl_max: f32,
  // The CFL number's growth per step, up to cfl_max.
  cfl_growth: f32,
}

// As in euler2d.wgsl (only steps and status are used here).
struct Control {
  t: f32,
  t_error: f32,
  dt: f32,
  steps: u32,
  status: atomic<u32>,
  residual_norm: f32,
  dt_log: array<f32, DT_LOG_SIZE>,
}

@group(0) @binding(0) var<uniform> params: ImplicitParams;
// As in euler2d.wgsl: i-faces, then j-faces, as (nx, ny, area, 0); then
// cells as (volume, planar area, centroid x, centroid y).
@group(0) @binding(1) var<storage, read> geometry: array<vec4f>;
// Flux times area through each face of `src`: i-faces, then j-faces.
@group(0) @binding(2) var<storage, read> face_flux: array<vec4f>;
@group(0) @binding(3) var<storage, read> src: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> dst: array<vec4f>;
// The residual of each cell, then its diagonal (x), then one entry
// holding the current CFL number (x).
@group(0) @binding(5) var<storage, read_write> work: array<vec4f>;
@group(0) @binding(6) var<storage, read_write> dq: array<vec4f>;
@group(0) @binding(7) var<storage, read_write> control: Control;

fn n_cells() -> u32 {
  return params.ni * params.nj;
}

fn n_i_faces() -> u32 {
  return (params.ni + 1u) * params.nj;
}

fn i_face(i: u32, j: u32) -> vec4f {
  return geometry[i + j * (params.ni + 1u)];
}

fn j_face(i: u32, j: u32) -> vec4f {
  return geometry[n_i_faces() + i + j * params.ni];
}

fn cell_geometry(c: u32) -> vec4f {
  return geometry[n_i_faces() + params.ni * (params.nj + 1u) + c];
}

fn pressure(q: vec4f) -> f32 {
  return (params.gamma - 1.0) * (q.w - 0.5 * (q.y * q.y + q.z * q.z) / q.x);
}

// |u . n| + a of cell c's state.
fn radius(c: u32, n: vec2f) -> f32 {
  let q = src[c];
  let p = pressure(q);
  return abs((q.y * n.x + q.z * n.y) / q.x) + sqrt(params.gamma * p / q.x);
}

// lambda times area of i-face (i, j) and j-face (i, j): the larger
// spectral radius of the interior cells beside it.
fn lambda_i(i: u32, j: u32) -> f32 {
  let face = i_face(i, j);
  var r = 0.0;
  if (i > 0u) {
    r = radius(i - 1u + j * params.ni, face.xy);
  }
  if (i < params.ni) {
    r = max(r, radius(i + j * params.ni, face.xy));
  }
  return r * face.z;
}

fn lambda_j(i: u32, j: u32) -> f32 {
  let face = j_face(i, j);
  var r = 0.0;
  if (j > 0u) {
    r = radius(i + (j - 1u) * params.ni, face.xy);
  }
  if (j < params.nj) {
    r = max(r, radius(i + j * params.ni, face.xy));
  }
  return r * face.z;
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn implicit_prepare(@builtin(global_invocation_id) id: vec3u) {
  let c = id.x;
  if (c >= n_cells()) {
    return;
  }
  let i = c % params.ni;
  let j = c / params.ni;
  let i_left = i + j * (params.ni + 1u);
  let j_bottom = n_i_faces() + i + j * params.ni;
  var r = face_flux[i_left] - face_flux[i_left + 1u] + face_flux[j_bottom] - face_flux[j_bottom + params.ni];
  let cell = cell_geometry(c);
  var axis = 0.0;
  if (params.axisymmetric == 1u) {
    r.z += pressure(src[c]) * cell.y;
    axis = cell.y * radius(c, vec2f(0.0, 1.0));
  }
  let cfl = work[2u * n_cells()].x;
  let scale = 0.5 * (params.omega + 1.0 / cfl);
  let sum = lambda_i(i, j) + lambda_i(i + 1u, j) + lambda_j(i, j) + lambda_j(i, j + 1u);
  work[c] = r;
  work[n_cells() + c] = vec4f(scale * sum + axis, 0.0, 0.0, 0.0);
  dq[c] = vec4f(0.0);
}

// The neighbour nb's term, A (1/2 dF_n - 1/2 omega lambda dQ), for its
// change dQ, n the normal out of the cell being solved, `area` the face's
// area and `lambda_area` its lambda times area.
fn neighbour(nb: u32, n: vec2f, area: f32, lambda_area: f32) -> vec4f {
  let g = params.gamma;
  let q = src[nb];
  let d = dq[nb];
  let p0 = pressure(q);
  let un0 = (q.y * n.x + q.z * n.y) / q.x;
  let q1 = q + d;
  let p1 = pressure(q1);
  let un1 = (q1.y * n.x + q1.z * n.y) / q1.x;
  let half = 0.5 * area;
  let damp = 0.5 * params.omega * lambda_area;
  return vec4f(
    half * (q1.x * un1 - q.x * un0) - damp * d.x,
    half * (q1.y * un1 + p1 * n.x - (q.y * un0 + p0 * n.x)) - damp * d.y,
    half * (q1.z * un1 + p1 * n.y - (q.z * un0 + p0 * n.y)) - damp * d.z,
    half * ((q1.w + p1) * un1 - (q.w + p0) * un0) - damp * d.w,
  );
}

// One half-sweep: every cell of the colour from its neighbours' latest dQ
// (all of the other colour). Dispatched over every cell; the others return.
@compute @workgroup_size(WORKGROUP_SIZE)
fn implicit_relax(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= n_cells()) {
    return;
  }
  let ni = params.ni;
  let nj = params.nj;
  let i = id.x % ni;
  let j = id.x / ni;
  if ((i + j) % 2u != params.colour) {
    return;
  }
  let c = i + j * ni;
  var sum = vec4f(0.0);
  if (i > 0u) {
    let f = i_face(i, j);
    sum += neighbour(c - 1u, -f.xy, f.z, lambda_i(i, j));
  }
  if (i < ni - 1u) {
    let f = i_face(i + 1u, j);
    sum += neighbour(c + 1u, f.xy, f.z, lambda_i(i + 1u, j));
  }
  if (j > 0u) {
    let f = j_face(i, j);
    sum += neighbour(c - ni, -f.xy, f.z, lambda_j(i, j));
  }
  if (j < nj - 1u) {
    let f = j_face(i, j + 1u);
    sum += neighbour(c + ni, f.xy, f.z, lambda_j(i, j + 1u));
  }
  dq[c] = (work[c] - sum) / work[n_cells() + c].x;
}

fn physical(q: vec4f) -> bool {
  let p = pressure(q);
  return q.x > 0.0 && q.x < 3.0e38 && p > 0.0 && p < 3.0e38 &&
    abs(q.y) < 3.0e38 && abs(q.z) < 3.0e38;
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn implicit_update(@builtin(global_invocation_id) id: vec3u) {
  let c = id.x;
  if (c >= n_cells()) {
    return;
  }
  let q = src[c];
  let d = dq[c];
  let p = pressure(q);
  var alpha = 1.0;
  for (var tries = 0; tries < 30; tries++) {
    let q1 = q + alpha * d;
    let p1 = pressure(q1);
    if (q1.x > 0.5 * q.x && q1.x < 2.0 * q.x && p1 > 0.5 * p && p1 < 2.0 * p) {
      break;
    }
    alpha *= 0.5;
  }
  let updated = q + alpha * d;
  dst[c] = updated;
  if (!physical(updated)) {
    atomicOr(&control.status, STATUS_NON_PHYSICAL);
  }
}

// Dispatched as a single invocation after implicit_update.
@compute @workgroup_size(1)
fn implicit_advance() {
  let k = 2u * n_cells();
  work[k].x = min(params.cfl_max, work[k].x * params.cfl_growth);
  control.steps += 1u;
}
