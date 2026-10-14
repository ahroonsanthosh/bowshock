// One-dimensional finite-volume Euler solver on the GPU: the WGSL twin of
// src/engine-cpu/euler1d.ts. Requires gas.wgsl, flux.wgsl, limiters.wgsl
// and two functions generated from the solver configuration:
//   fn limiter(a: f32, b: f32) -> f32
//   fn numerical_flux(left: Primitive, right: Primitive) -> vec3f
//
// One time step is: reduce_max_speed, finalize_time_step, then for each
// Runge-Kutta stage compute_face_fluxes and update_cells, then
// advance_clock. Every stage computes
//   dst = a * u0 + b * (src + dt * L(src)),
// where u0 is the state at the start of the step and L the spatial
// residual; the coefficients (a, b) select forward Euler or SSP-RK2/RK3.
//
// Boundary conditions are applied when cells are read (see load_cell), so
// the state buffers hold interior cells only.

const TRANSMISSIVE: u32 = 0u;
const REFLECTIVE: u32 = 1u;
const PERIODIC: u32 = 2u;

const WORKGROUP_SIZE: u32 = 64u;

// Bit set in `status` when a cell becomes non-physical (non-positive or
// non-finite density or pressure, or a non-finite wave speed).
const STATUS_NON_PHYSICAL: u32 = 1u;

struct Params {
  n_cells: u32,
  left_bc: u32,
  right_bc: u32,
  n_partials: u32,
  dx: f32,
  gamma: f32,
  cfl: f32,
  t_end: f32,
}

struct StageCoefficients {
  a: f32,
  b: f32,
}

// Simulated time is t + t_error: an f32 value plus the rounding error of
// accumulating it, kept by compensated summation (see advance_clock). Plain
// f32 accumulation of t would drift from the sum of the time steps actually
// taken by about one unit in the last place of t per step, a phase error
// that dominates the solution error on fine grids.
struct Clock {
  t: f32,
  t_error: f32,
  dt: f32,
  steps: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> clock: Clock;
@group(0) @binding(2) var<storage, read_write> status: atomic<u32>;
@group(0) @binding(3) var<storage, read_write> face_flux: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> partials: array<f32>;

@group(1) @binding(0) var<uniform> stage: StageCoefficients;
@group(1) @binding(1) var<storage, read> u0: array<vec4f>;
@group(1) @binding(2) var<storage, read> src: array<vec4f>;
@group(1) @binding(3) var<storage, read_write> dst: array<vec4f>;

var<workgroup> scratch: array<f32, WORKGROUP_SIZE>;

// Conserved state (rho, rho u, E) of cell k of `src`, for any k in
// [-2, n_cells + 1]. Out-of-range cells are the ghost cells of the CPU
// engine: cell -1 - g mirrors cell g (reflective walls negate momentum),
// or aliases cell n - 1 - g in a periodic domain; likewise on the right.
fn load_cell(k: i32) -> vec3f {
  let n = i32(params.n_cells);
  var index = k;
  var bc = TRANSMISSIVE;
  if (k < 0) {
    bc = params.left_bc;
    index = select(-1 - k, k + n, bc == PERIODIC);
  } else if (k >= n) {
    bc = params.right_bc;
    index = select(2 * n - 1 - k, k - n, bc == PERIODIC);
  }
  var c = src[index].xyz;
  if (bc == REFLECTIVE) {
    c.y = -c.y;
  }
  return c;
}

fn reconstruct(prev: Primitive, centre: Primitive, next: Primitive, side: f32) -> Primitive {
  return Primitive(
    centre.rho + 0.5 * side * limiter(centre.rho - prev.rho, next.rho - centre.rho),
    centre.u + 0.5 * side * limiter(centre.u - prev.u, next.u - centre.u),
    centre.p + 0.5 * side * limiter(centre.p - prev.p, next.p - centre.p),
  );
}

fn is_physical(w: Primitive) -> bool {
  // Comparisons with NaN are false, so NaN fails this test.
  return w.rho > 0.0 && w.p > 0.0;
}

// Flux through face f, which lies between cells f - 1 and f.
@compute @workgroup_size(WORKGROUP_SIZE)
fn compute_face_fluxes(@builtin(global_invocation_id) id: vec3u) {
  let f = id.x;
  if (f > params.n_cells) {
    return;
  }
  let k = i32(f);
  let g = params.gamma;
  let w_ll = to_primitive(load_cell(k - 2), g);
  let w_l = to_primitive(load_cell(k - 1), g);
  let w_r = to_primitive(load_cell(k), g);
  let w_rr = to_primitive(load_cell(k + 1), g);

  var left = reconstruct(w_ll, w_l, w_r, 1.0);
  var right = reconstruct(w_l, w_r, w_rr, -1.0);
  // Fall back to first order where reconstruction would be non-physical.
  if (!(is_physical(left) && is_physical(right))) {
    left = w_l;
    right = w_r;
  }
  face_flux[f] = vec4f(numerical_flux(left, right), 0.0);
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn update_cells(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= params.n_cells) {
    return;
  }
  // A zero time step (run already at t_end) leaves the state unchanged.
  if (clock.dt <= 0.0) {
    dst[i] = u0[i];
    return;
  }
  let residual = -(face_flux[i + 1u].xyz - face_flux[i].xyz) / params.dx;
  let updated = stage.a * u0[i].xyz + stage.b * (src[i].xyz + clock.dt * residual);
  dst[i] = vec4f(updated, 0.0);
  if (!is_physical(to_primitive(updated, params.gamma))) {
    atomicOr(&status, STATUS_NON_PHYSICAL);
  }
}

// Fixed-order tree reduction of `scratch`; the result ends up in scratch[0].
// Fixed order makes the result reproducible from run to run.
fn reduce_scratch_max(local: u32) {
  for (var stride = WORKGROUP_SIZE / 2u; stride > 0u; stride /= 2u) {
    workgroupBarrier();
    if (local < stride) {
      scratch[local] = max(scratch[local], scratch[local + stride]);
    }
  }
  workgroupBarrier();
}

// Largest wave speed |u| + a per workgroup of cells of `src`.
@compute @workgroup_size(WORKGROUP_SIZE)
fn reduce_max_speed(
  @builtin(global_invocation_id) id: vec3u,
  @builtin(local_invocation_index) local: u32,
  @builtin(workgroup_id) group: vec3u,
) {
  var speed = 0.0;
  if (id.x < params.n_cells) {
    let w = to_primitive(src[id.x].xyz, params.gamma);
    speed = abs(w.u) + sound_speed(w, params.gamma);
  }
  scratch[local] = speed;
  reduce_scratch_max(local);
  if (local == 0u) {
    partials[group.x] = scratch[0];
  }
}

// Combine the partial maxima and set the time step, shortened so the run
// lands exactly on t_end. Dispatched as a single workgroup.
@compute @workgroup_size(WORKGROUP_SIZE)
fn finalize_time_step(@builtin(local_invocation_index) local: u32) {
  var speed = 0.0;
  for (var j = local; j < params.n_partials; j += WORKGROUP_SIZE) {
    speed = max(speed, partials[j]);
  }
  scratch[local] = speed;
  reduce_scratch_max(local);
  if (local == 0u) {
    let max_speed = scratch[0];
    // NaN fails every comparison, so test for the valid case.
    if (!(max_speed > 0.0 && max_speed < 3.0e38)) {
      atomicOr(&status, STATUS_NON_PHYSICAL);
      clock.dt = 0.0;
    } else {
      let remaining = (params.t_end - clock.t) - clock.t_error;
      // Stop once within a negligible fraction of t_end.
      if (remaining <= 1.0e-10 * params.t_end) {
        clock.dt = 0.0;
      } else {
        clock.dt = min(params.cfl * params.dx / max_speed, remaining);
      }
    }
  }
}

// Dispatched as a single invocation after the last stage of a step.
// Adds dt to the clock with the TwoSum error-free transformation (D. E.
// Knuth, The Art of Computer Programming, vol. 2): `sum + error` equals
// t + dt exactly, and the error is carried in t_error. Should a compiler
// ever simplify the error terms algebraically to zero, this degrades to
// plain f32 accumulation rather than to anything worse.
@compute @workgroup_size(1)
fn advance_clock() {
  if (clock.dt > 0.0) {
    let sum = clock.t + clock.dt;
    let t_part = sum - clock.dt;
    let dt_part = sum - t_part;
    let error = (clock.t - t_part) + (clock.dt - dt_part);
    let total_error = clock.t_error + error;
    // Renormalise so that t holds as much of the total as f32 allows.
    clock.t = sum + total_error;
    clock.t_error = total_error - (clock.t - sum);
    clock.steps += 1u;
  }
}
