// Two-dimensional finite-volume Euler solver on a structured grid block:
// the WGSL twin of src/engine-cpu/euler2d.ts (method and conventions in
// docs/design/0003-2d-solver.md). Requires gas.wgsl, flux.wgsl,
// limiters.wgsl, reconstruction.wgsl and three functions generated from the
// configuration:
//   fn limiter(a: f32, b: f32) -> f32
//   fn reconstruct(prev: Primitive2D, centre: Primitive2D, next: Primitive2D, side: f32) -> Primitive2D
//   fn numerical_face_flux(left: FaceState, right: FaceState) -> vec4f
//
// One step: compute_time_steps, finalize_time_step, then for each
// Runge-Kutta stage compute_i_fluxes, compute_j_fluxes and update_cells,
// then advance_clock. Each stage computes
//   dst = a * u0 + b * (src + dt / V * R(src)),
// with R the residual (net inflow of each conserved quantity) and dt the
// global step or each cell's local step.
//
// Buffers are packed to stay within WebGPU's default limit of 8 storage
// buffers per shader stage: one geometry buffer (i-faces, j-faces, cells),
// one control buffer (clock, status, time-step log), one face-flux buffer
// (i then j faces) and one scratch buffer (cell time steps, then partial
// reductions).

const WORKGROUP_SIZE: u32 = 64u;
const DT_LOG_SIZE: u32 = 256u;

// Boundary condition kinds, matching BOUNDARY_KINDS in euler2d-gpu.ts.
const INFLOW: u32 = 0u;
const OUTFLOW: u32 = 1u;
const WALL: u32 = 2u;
const PERIODIC: u32 = 3u;

// Sides, in the order of Params.bc and Params.inflow.
const I_MIN: u32 = 0u;
const I_MAX: u32 = 1u;
const J_MIN: u32 = 2u;
const J_MAX: u32 = 3u;

const STATUS_NON_PHYSICAL: u32 = 1u;

struct Params {
  ni: u32,
  nj: u32,
  // 1 for axisymmetric geometry (y is the radius), 0 for planar.
  axisymmetric: u32,
  // 1 for local time stepping, 0 for global.
  local_stepping: u32,
  // Boundary condition kind of each side.
  bc: vec4u,
  // Fixed primitive state (rho, u, v, p) outside each inflow side.
  inflow: array<vec4f, 4>,
  gamma: f32,
  cfl: f32,
  t_end: f32,
  n_partials: u32,
}

struct StageCoefficients {
  a: f32,
  b: f32,
}

// Simulated time is t + t_error, kept by compensated summation as in the
// 1D engine; every step's dt is also logged so the CPU can check it.
struct Control {
  t: f32,
  t_error: f32,
  dt: f32,
  steps: u32,
  status: atomic<u32>,
  // Root-mean-square density residual, written by finalize_residual_norm.
  residual_norm: f32,
  dt_log: array<f32, DT_LOG_SIZE>,
}

@group(0) @binding(0) var<uniform> params: Params;
// i-faces, then j-faces, as (nx, ny, area, 0); then cells as
// (volume, planar area, centroid x, centroid y).
@group(0) @binding(1) var<storage, read> geometry: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> control: Control;
// Flux times area through each face: i-faces, then j-faces.
@group(0) @binding(3) var<storage, read_write> face_flux: array<vec4f>;
// Cell time steps (ni * nj), then partial reductions (n_partials).
@group(0) @binding(4) var<storage, read_write> scratch: array<f32>;

@group(1) @binding(0) var<uniform> stage: StageCoefficients;
@group(1) @binding(1) var<storage, read> u0: array<vec4f>;
@group(1) @binding(2) var<storage, read> src: array<vec4f>;
@group(1) @binding(3) var<storage, read_write> dst: array<vec4f>;

var<workgroup> reduction: array<f32, WORKGROUP_SIZE>;

fn n_i_faces() -> u32 {
  return (params.ni + 1u) * params.nj;
}

fn n_cells() -> u32 {
  return params.ni * params.nj;
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

// Conserved state of cell (i, j) of `src`, for i in [-2, ni + 1] with j in
// range, or j in [-2, nj + 1] with i in range. Out-of-range cells are the
// ghost cells of the CPU engine: ghost layer g mirrors interior layer g
// (outflow, wall), aliases the opposite side (periodic), or holds the
// inflow state; walls reflect the momentum about the boundary face.
fn load_cell(i: i32, j: i32) -> vec4f {
  let ni = i32(params.ni);
  let nj = i32(params.nj);
  var side = 4u;
  var mirror = vec2i(i, j);
  var wrap = vec2i(i, j);
  var normal = vec2f(0.0, 0.0);
  if (i < 0) {
    side = I_MIN;
    mirror = vec2i(-1 - i, j);
    wrap = vec2i(i + ni, j);
    normal = i_face(0u, u32(j)).xy;
  } else if (i >= ni) {
    side = I_MAX;
    mirror = vec2i(2 * ni - 1 - i, j);
    wrap = vec2i(i - ni, j);
    normal = i_face(params.ni, u32(j)).xy;
  } else if (j < 0) {
    side = J_MIN;
    mirror = vec2i(i, -1 - j);
    wrap = vec2i(i, j + nj);
    normal = j_face(u32(i), 0u).xy;
  } else if (j >= nj) {
    side = J_MAX;
    mirror = vec2i(i, 2 * nj - 1 - j);
    wrap = vec2i(i, j - nj);
    normal = j_face(u32(i), params.nj).xy;
  }
  if (side == 4u) {
    return src[u32(i + j * ni)];
  }
  let kind = params.bc[side];
  if (kind == INFLOW) {
    let w = params.inflow[side];
    return to_conserved_2d(Primitive2D(w.x, w.y, w.z, w.w), params.gamma);
  }
  if (kind == PERIODIC) {
    return src[u32(wrap.x + wrap.y * ni)];
  }
  var c = src[u32(mirror.x + mirror.y * ni)];
  if (kind == WALL) {
    // Reflect the momentum about the wall: m' = m - 2 (m . n) n.
    let m = c.yz;
    c = vec4f(c.x, m - 2.0 * dot(m, normal) * normal, c.w);
  }
  return c;
}

fn is_physical(w: Primitive2D) -> bool {
  // Comparisons with NaN are false; the upper bounds reject infinities.
  return w.rho > 0.0 && w.rho < 3.0e38 && w.p > 0.0 && w.p < 3.0e38 &&
    abs(w.u) < 3.0e38 && abs(w.v) < 3.0e38;
}

// Flux times area through the face between cells `left_cell` and
// `right_cell`, whose neighbours further out are `far_left` and `far_right`.
// `wall` is -1 for a wall face on a minimum side (the cell inside to the
// right), 1 on a maximum side, 0 elsewhere: there the outside state becomes
// the exact mirror of the inside one, as in the CPU engine, so the wall
// carries no mass whatever the reconstruction.
fn face_flux_between(far_left: vec4f, left_cell: vec4f, right_cell: vec4f, far_right: vec4f, face: vec4f, wall: i32) -> vec4f {
  let g = params.gamma;
  let w_ll = to_primitive_2d(far_left, g);
  let w_l = to_primitive_2d(left_cell, g);
  let w_r = to_primitive_2d(right_cell, g);
  let w_rr = to_primitive_2d(far_right, g);
  var left = reconstruct(w_ll, w_l, w_r, 1.0);
  var right = reconstruct(w_l, w_r, w_rr, -1.0);
  // Fall back to first order where reconstruction would be non-physical.
  if (!(left.rho > 0.0 && left.p > 0.0 && right.rho > 0.0 && right.p > 0.0)) {
    left = w_l;
    right = w_r;
  }
  // Rotate into the face frame (tangent (-ny, nx)), and the flux back.
  let n = face.xy;
  var l = FaceState(left.rho, left.u * n.x + left.v * n.y, -left.u * n.y + left.v * n.x, left.p);
  var r = FaceState(right.rho, right.u * n.x + right.v * n.y, -right.u * n.y + right.v * n.x, right.p);
  if (wall < 0) {
    l = FaceState(r.rho, -r.un, r.ut, r.p);
  } else if (wall > 0) {
    r = FaceState(l.rho, -l.un, l.ut, l.p);
  }
  let f = numerical_face_flux(l, r);
  let flux = vec4f(f.x, f.y * n.x - f.z * n.y, f.y * n.y + f.z * n.x, f.w);
  return flux * face.z;
}

// -1 or 1 if the face is a wall face on the minimum or maximum side, else 0.
fn wall_side(at_min: bool, at_max: bool, min_side: u32, max_side: u32) -> i32 {
  if (at_min && params.bc[min_side] == WALL) {
    return -1;
  }
  if (at_max && params.bc[max_side] == WALL) {
    return 1;
  }
  return 0;
}

// i-face (i, j) lies between cells (i - 1, j) and (i, j).
@compute @workgroup_size(WORKGROUP_SIZE)
fn compute_i_fluxes(@builtin(global_invocation_id) id: vec3u) {
  let f = id.x;
  if (f >= n_i_faces()) {
    return;
  }
  let i = i32(f % (params.ni + 1u));
  let j = i32(f / (params.ni + 1u));
  face_flux[f] = face_flux_between(
    load_cell(i - 2, j),
    load_cell(i - 1, j),
    load_cell(i, j),
    load_cell(i + 1, j),
    geometry[f],
    wall_side(i == 0, i == i32(params.ni), I_MIN, I_MAX),
  );
}

// j-face (i, j) lies between cells (i, j - 1) and (i, j).
@compute @workgroup_size(WORKGROUP_SIZE)
fn compute_j_fluxes(@builtin(global_invocation_id) id: vec3u) {
  let f = id.x;
  if (f >= params.ni * (params.nj + 1u)) {
    return;
  }
  let i = i32(f % params.ni);
  let j = i32(f / params.ni);
  face_flux[n_i_faces() + f] = face_flux_between(
    load_cell(i, j - 2),
    load_cell(i, j - 1),
    load_cell(i, j),
    load_cell(i, j + 1),
    geometry[n_i_faces() + f],
    wall_side(j == 0, j == i32(params.nj), J_MIN, J_MAX),
  );
}

// Net inflow of each conserved quantity into cell c, plus the axisymmetric
// pressure source on the radial momentum.
fn residual(c: u32) -> vec4f {
  let i = c % params.ni;
  let j = c / params.ni;
  let i_left = i + j * (params.ni + 1u);
  let j_bottom = n_i_faces() + i + j * params.ni;
  var r = face_flux[i_left] - face_flux[i_left + 1u] + face_flux[j_bottom] - face_flux[j_bottom + params.ni];
  if (params.axisymmetric == 1u) {
    let p = to_primitive_2d(src[c], params.gamma).p;
    r.z += p * cell_geometry(c).y;
  }
  return r;
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn update_cells(@builtin(global_invocation_id) id: vec3u) {
  let c = id.x;
  if (c >= n_cells()) {
    return;
  }
  var dt = control.dt;
  if (params.local_stepping == 1u) {
    dt = scratch[c];
  }
  // A zero time step (run already at t_end) leaves the state unchanged.
  if (control.dt <= 0.0) {
    dst[c] = u0[c];
    return;
  }
  let updated = stage.a * u0[c] + stage.b * (src[c] + dt / cell_geometry(c).x * residual(c));
  dst[c] = updated;
  if (!is_physical(to_primitive_2d(updated, params.gamma))) {
    atomicOr(&control.status, STATUS_NON_PHYSICAL);
  }
}

fn reduce(local: u32, op_min: bool) {
  for (var stride = WORKGROUP_SIZE / 2u; stride > 0u; stride /= 2u) {
    workgroupBarrier();
    if (local < stride) {
      if (op_min) {
        reduction[local] = min(reduction[local], reduction[local + stride]);
      } else {
        reduction[local] = reduction[local] + reduction[local + stride];
      }
    }
  }
  workgroupBarrier();
}

// Each cell's time step, CFL * V / (spectral radius in i + in j), into
// scratch; each workgroup's minimum into the partials after it.
@compute @workgroup_size(WORKGROUP_SIZE)
fn compute_time_steps(
  @builtin(global_invocation_id) id: vec3u,
  @builtin(local_invocation_index) local: u32,
  @builtin(workgroup_id) group: vec3u,
) {
  let c = id.x;
  var dt = 3.0e38;
  if (c < n_cells()) {
    let i = c % params.ni;
    let j = c / params.ni;
    let w = to_primitive_2d(src[c], params.gamma);
    let a = sqrt(params.gamma * w.p / w.rho);
    let velocity = vec2f(w.u, w.v);
    let fi0 = i_face(i, j);
    let fi1 = i_face(i + 1u, j);
    let fj0 = j_face(i, j);
    let fj1 = j_face(i, j + 1u);
    // Mean area vectors of the two faces in each direction.
    let si = 0.5 * (fi0.xy * fi0.z + fi1.xy * fi1.z);
    let sj = 0.5 * (fj0.xy * fj0.z + fj1.xy * fj1.z);
    let lambda = abs(dot(velocity, si)) + a * length(si) + abs(dot(velocity, sj)) + a * length(sj);
    dt = params.cfl * cell_geometry(c).x / lambda;
    scratch[c] = dt;
  }
  reduction[local] = dt;
  reduce(local, true);
  if (local == 0u) {
    scratch[n_cells() + group.x] = reduction[0];
  }
}

// Combine the partial minima into the global time step, shortened to land
// on t_end. In local stepping the step only needs to be non-zero (cells use
// their own steps). Dispatched as a single workgroup.
@compute @workgroup_size(WORKGROUP_SIZE)
fn finalize_time_step(@builtin(local_invocation_index) local: u32) {
  var dt = 3.0e38;
  for (var k = local; k < params.n_partials; k += WORKGROUP_SIZE) {
    dt = min(dt, scratch[n_cells() + k]);
  }
  reduction[local] = dt;
  reduce(local, true);
  if (local == 0u) {
    let smallest = reduction[0];
    // NaN fails every comparison, so test for the valid case.
    if (!(smallest > 0.0 && smallest < 3.0e38)) {
      atomicOr(&control.status, STATUS_NON_PHYSICAL);
      control.dt = 0.0;
    } else if (params.local_stepping == 1u) {
      control.dt = 1.0;
    } else {
      let remaining = (params.t_end - control.t) - control.t_error;
      if (remaining <= 1.0e-10 * params.t_end) {
        control.dt = 0.0;
      } else {
        control.dt = min(smallest, remaining);
      }
    }
  }
}

// Dispatched as a single invocation after the last stage of a step; see
// advance_clock in euler1d.wgsl for the compensated summation.
@compute @workgroup_size(1)
fn advance_clock() {
  if (control.dt > 0.0) {
    if (params.local_stepping == 0u) {
      control.dt_log[control.steps % DT_LOG_SIZE] = control.dt;
      let sum = control.t + control.dt;
      let t_part = sum - control.dt;
      let dt_part = sum - t_part;
      let error = (control.t - t_part) + (control.dt - dt_part);
      let total_error = control.t_error + error;
      control.t = sum + total_error;
      control.t_error = total_error - (control.t - sum);
    }
    control.steps += 1u;
  }
}

// Sum over each workgroup of cells of (density residual / V)^2, from the
// face fluxes of `src`, into the partials.
@compute @workgroup_size(WORKGROUP_SIZE)
fn residual_norm_partials(
  @builtin(global_invocation_id) id: vec3u,
  @builtin(local_invocation_index) local: u32,
  @builtin(workgroup_id) group: vec3u,
) {
  let c = id.x;
  var value = 0.0;
  if (c < n_cells()) {
    let r = residual(c).x / cell_geometry(c).x;
    value = r * r;
  }
  reduction[local] = value;
  reduce(local, false);
  if (local == 0u) {
    scratch[n_cells() + group.x] = reduction[0];
  }
}

// Dispatched as a single workgroup after residual_norm_partials.
@compute @workgroup_size(WORKGROUP_SIZE)
fn finalize_residual_norm(@builtin(local_invocation_index) local: u32) {
  var sum = 0.0;
  for (var k = local; k < params.n_partials; k += WORKGROUP_SIZE) {
    sum += scratch[n_cells() + k];
  }
  reduction[local] = sum;
  reduce(local, false);
  if (local == 0u) {
    control.residual_norm = sqrt(reduction[0] / f32(n_cells()));
  }
}
