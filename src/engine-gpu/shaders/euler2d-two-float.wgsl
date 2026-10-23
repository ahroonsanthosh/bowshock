// The transonic domain's steady solver on the GPU with the state, the grid
// metrics and the residual in two-float arithmetic (two-float.wgsl): the
// twin of Euler2D's residual (HLLC, the shared scaled van Albada
// reconstruction, wall, far-field, inflow and outflow boundaries, the
// axisymmetric pressure source) and of its implicit steps with the
// red-black relaxation (src/engine-cpu/euler2d.ts). The implicit system
// itself is solved in 32 bits: it changes only the path, while the fixed
// point is that of the two-float residual (design record 0013, step 4b).
//
// One step: fluxes_i and fluxes_j (two-float face fluxes of `src`),
// prepare (the residual, rounded to 32 bits, the diagonal, dQ = 0), then
// for each sweep relax on the even cells (i + j) and on the odd ones, then
// update (dst = src + dQ in two-float, each cell's change halved until its
// density and pressure stay within a factor of two), then advance.
//
// Layouts: the state holds two vec4f per cell, the high parts of
// (rho, rho u, rho v, E) then the low parts; the geometry two per i-face,
// j-face and cell, (nx, ny, area, 0) or (volume, planar area, x, y), high
// then low; the face fluxes (flux times area) two per face.

const WORKGROUP_SIZE: u32 = 64u;
const STATUS_NON_PHYSICAL: u32 = 1u;
const DT_LOG_SIZE: u32 = 256u;

const INFLOW: u32 = 0u;
const OUTFLOW: u32 = 1u;
const WALL: u32 = 2u;
const FAR_FIELD: u32 = 5u;

const I_MIN: u32 = 0u;
const I_MAX: u32 = 1u;
const J_MIN: u32 = 2u;
const J_MAX: u32 = 3u;

struct Params {
  ni: u32,
  nj: u32,
  axisymmetric: u32,
  // The cells relaxed by relax: those with (i + j) % 2 == colour.
  colour: u32,
  bc: vec4u,
  gamma: vec2f,
  // VAN_ALBADA_EPSILON in two-float.
  epsilon: vec2f,
  omega: f32,
  cfl_max: f32,
  cfl_growth: f32,
  // 2 / (gamma - 1), a whole number (5 for air): the power in the far
  // field's density from its sound speed.
  density_power: u32,
  // The free stream (inflow and far field), (rho, u, v, p), high and low.
  free_hi: vec4f,
  free_lo: vec4f,
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

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> geometry: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> face_flux: array<vec4f>;
@group(0) @binding(3) var<storage, read> src: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> dst: array<vec4f>;
// The residual of each cell (32 bits), then its diagonal (x), then one
// entry holding the current CFL number (x).
@group(0) @binding(5) var<storage, read_write> work: array<vec4f>;
@group(0) @binding(6) var<storage, read_write> dq: array<vec4f>;
@group(0) @binding(7) var<storage, read_write> control: Control;

// A conserved state, high and low parts.
struct Q {
  h: vec4f,
  l: vec4f,
}

struct P {
  rho: vec2f,
  u: vec2f,
  v: vec2f,
  p: vec2f,
}

struct FaceGeometry {
  nx: vec2f,
  ny: vec2f,
  area: vec2f,
}

struct FacePrimitive {
  rho: vec2f,
  un: vec2f,
  ut: vec2f,
  p: vec2f,
}

fn n_cells() -> u32 {
  return params.ni * params.nj;
}

fn n_i_faces() -> u32 {
  return (params.ni + 1u) * params.nj;
}

fn n_j_faces() -> u32 {
  return params.ni * (params.nj + 1u);
}

fn part(q: Q, k: u32) -> vec2f {
  return vec2f(q.h[k], q.l[k]);
}

fn make_q(a: vec2f, b: vec2f, c: vec2f, d: vec2f) -> Q {
  return Q(vec4f(a.x, b.x, c.x, d.x), vec4f(a.y, b.y, c.y, d.y));
}

fn face_geometry(index: u32) -> FaceGeometry {
  let h = geometry[2u * index];
  let l = geometry[2u * index + 1u];
  return FaceGeometry(vec2f(h.x, l.x), vec2f(h.y, l.y), vec2f(h.z, l.z));
}

fn i_face(i: u32, j: u32) -> FaceGeometry {
  return face_geometry(i + j * (params.ni + 1u));
}

fn j_face(i: u32, j: u32) -> FaceGeometry {
  return face_geometry(n_i_faces() + i + j * params.ni);
}

// (volume, planar area) of cell c, two-float.
fn cell_volume_area(c: u32) -> array<vec2f, 2> {
  let k = n_i_faces() + n_j_faces() + c;
  let h = geometry[2u * k];
  let l = geometry[2u * k + 1u];
  return array<vec2f, 2>(vec2f(h.x, l.x), vec2f(h.y, l.y));
}

fn gamma_minus_one() -> vec2f {
  return df_sub(params.gamma, df(1.0));
}

fn to_primitive(q: Q) -> P {
  let rho = part(q, 0u);
  let mx = part(q, 1u);
  let my = part(q, 2u);
  let u = df_div(mx, rho);
  let v = df_div(my, rho);
  let kinetic = df_mul_f(df_add(df_mul(mx, u), df_mul(my, v)), 0.5);
  return P(rho, u, v, df_mul(gamma_minus_one(), df_sub(part(q, 3u), kinetic)));
}

fn to_conserved(w: P) -> Q {
  let kinetic = df_mul_f(df_mul(w.rho, df_add(df_mul(w.u, w.u), df_mul(w.v, w.v))), 0.5);
  return make_q(
    w.rho,
    df_mul(w.rho, w.u),
    df_mul(w.rho, w.v),
    df_add(df_div(w.p, gamma_minus_one()), kinetic),
  );
}

fn free_stream() -> P {
  let h = params.free_hi;
  let l = params.free_lo;
  return P(vec2f(h.x, l.x), vec2f(h.y, l.y), vec2f(h.z, l.z), vec2f(h.w, l.w));
}

fn sound_speed(rho: vec2f, p: vec2f) -> vec2f {
  return df_sqrt(df_div(df_mul(params.gamma, p), rho));
}

// The state outside a far-field face of outward unit normal (nx, ny), as
// farFieldState in euler2d.ts, its density from the upwind side's along
// the isentrope: rho_up (a / a_up)^(2 / (gamma - 1)).
fn far_field_state(inside: P, free: P, nx: vec2f, ny: vec2f) -> P {
  let k = df_div(df(2.0), gamma_minus_one());
  let a_in = sound_speed(inside.rho, inside.p);
  let a_free = sound_speed(free.rho, free.p);
  let un_in = df_add(df_mul(inside.u, nx), df_mul(inside.v, ny));
  let un_free = df_add(df_mul(free.u, nx), df_mul(free.v, ny));
  var plus = df_add(un_free, df_mul(k, a_free));
  if (df_lt(df(0.0), df_add(un_in, a_in))) {
    plus = df_add(un_in, df_mul(k, a_in));
  }
  var minus = df_sub(un_free, df_mul(k, a_free));
  if (df_lt(df(0.0), df_sub(un_in, a_in))) {
    minus = df_sub(un_in, df_mul(k, a_in));
  }
  let un = df_mul_f(df_add(plus, minus), 0.5);
  let a = df_div(df_sub(plus, minus), df_mul_f(k, 2.0));
  var up = free;
  if (df_lt(df(0.0), un_in)) {
    up = inside;
  }
  let ratio = df_div(a, sound_speed(up.rho, up.p));
  var rho = up.rho;
  for (var n = 0u; n < params.density_power; n++) {
    rho = df_mul(rho, ratio);
  }
  let un_up = df_add(df_mul(up.u, nx), df_mul(up.v, ny));
  let dun = df_sub(un, un_up);
  return P(
    rho,
    df_add(up.u, df_mul(dun, nx)),
    df_add(up.v, df_mul(dun, ny)),
    df_div(df_mul(rho, df_mul(a, a)), params.gamma),
  );
}

fn load(c: u32) -> Q {
  return Q(src[2u * c], src[2u * c + 1u]);
}

// Conserved state of cell (i, j), ghost cells as in Euler2D.fillGhosts:
// layer g mirrors interior layer g (outflow, wall, the wall reflecting
// the momentum about its face), holds the free stream (inflow), or, at a
// far field, the face's state from the cell next to it.
fn load_cell(i: i32, j: i32) -> Q {
  let ni = i32(params.ni);
  let nj = i32(params.nj);
  var side = 4u;
  var mirror = vec2i(i, j);
  var inside = vec2i(i, j);
  var face = FaceGeometry(df(0.0), df(0.0), df(0.0));
  var outward = 1.0;
  if (i < 0) {
    side = I_MIN;
    mirror = vec2i(-1 - i, j);
    inside = vec2i(0, j);
    face = i_face(0u, u32(j));
    outward = -1.0;
  } else if (i >= ni) {
    side = I_MAX;
    mirror = vec2i(2 * ni - 1 - i, j);
    inside = vec2i(ni - 1, j);
    face = i_face(params.ni, u32(j));
  } else if (j < 0) {
    side = J_MIN;
    mirror = vec2i(i, -1 - j);
    inside = vec2i(i, 0);
    face = j_face(u32(i), 0u);
    outward = -1.0;
  } else if (j >= nj) {
    side = J_MAX;
    mirror = vec2i(i, 2 * nj - 1 - j);
    inside = vec2i(i, nj - 1);
    face = j_face(u32(i), params.nj);
  }
  if (side == 4u) {
    return load(u32(i + j * ni));
  }
  let kind = params.bc[side];
  if (kind == INFLOW) {
    return to_conserved(free_stream());
  }
  if (kind == FAR_FIELD) {
    let w = to_primitive(load(u32(inside.x + inside.y * ni)));
    return to_conserved(far_field_state(w, free_stream(), face.nx * outward, face.ny * outward));
  }
  let c = load(u32(mirror.x + mirror.y * ni));
  if (kind == WALL) {
    let mx = part(c, 1u);
    let my = part(c, 2u);
    let mn = df_mul_f(df_add(df_mul(mx, face.nx), df_mul(my, face.ny)), 2.0);
    return make_q(part(c, 0u), df_sub(mx, df_mul(mn, face.nx)), df_sub(my, df_mul(mn, face.ny)), part(c, 3u));
  }
  return c;
}

// The shared factor of differences made dimensionless by the smallest
// density and pressure of the three cells (sharedScaledFactor).
fn shared_scaled_factor(prev: P, centre: P, next: P) -> vec2f {
  let rho = df_min(prev.rho, df_min(centre.rho, next.rho));
  let rho_a2 = df_mul(params.gamma, df_min(prev.p, df_min(centre.p, next.p)));
  let s_rho = df_div(df(1.0), rho);
  let s_u = df_sqrt(df_div(rho, rho_a2));
  let s_p = df_div(df(1.0), rho_a2);
  let a_rho = df_mul(df_sub(centre.rho, prev.rho), s_rho);
  let a_u = df_mul(df_sub(centre.u, prev.u), s_u);
  let a_v = df_mul(df_sub(centre.v, prev.v), s_u);
  let a_p = df_mul(df_sub(centre.p, prev.p), s_p);
  let b_rho = df_mul(df_sub(next.rho, centre.rho), s_rho);
  let b_u = df_mul(df_sub(next.u, centre.u), s_u);
  let b_v = df_mul(df_sub(next.v, centre.v), s_u);
  let b_p = df_mul(df_sub(next.p, centre.p), s_p);
  let ab = df_add(df_add(df_mul(a_rho, b_rho), df_mul(a_u, b_u)), df_add(df_mul(a_v, b_v), df_mul(a_p, b_p)));
  let aa = df_add(df_add(df_mul(a_rho, a_rho), df_mul(a_u, a_u)), df_add(df_mul(a_v, a_v), df_mul(a_p, a_p)));
  let bb = df_add(df_add(df_mul(b_rho, b_rho), df_mul(b_u, b_u)), df_add(df_mul(b_v, b_v), df_mul(b_p, b_p)));
  let eps = params.epsilon;
  let f = df_div(df_mul_f(df_add(ab, eps), 2.0), df_add(df_add(aa, bb), df_mul_f(eps, 2.0)));
  return df_max(df(0.0), f);
}

fn reconstruct(prev: P, centre: P, next: P, side: f32) -> P {
  let k = df_mul_f(shared_scaled_factor(prev, centre, next), 0.25 * side);
  return P(
    df_add(centre.rho, df_mul(k, df_sub(next.rho, prev.rho))),
    df_add(centre.u, df_mul(k, df_sub(next.u, prev.u))),
    df_add(centre.v, df_mul(k, df_sub(next.v, prev.v))),
    df_add(centre.p, df_mul(k, df_sub(next.p, prev.p))),
  );
}

fn face_energy(w: FacePrimitive) -> vec2f {
  let kinetic = df_mul_f(df_mul(w.rho, df_add(df_mul(w.un, w.un), df_mul(w.ut, w.ut))), 0.5);
  return df_add(df_div(w.p, gamma_minus_one()), kinetic);
}

// [mass, normal momentum, tangential momentum, energy] per unit area.
fn physical_flux(w: FacePrimitive) -> array<vec2f, 4> {
  let mass = df_mul(w.rho, w.un);
  return array<vec2f, 4>(
    mass,
    df_add(df_mul(mass, w.un), w.p),
    df_mul(mass, w.ut),
    df_mul(w.un, df_add(face_energy(w), w.p)),
  );
}

// hllcFaceFlux with Einfeldt's speeds.
fn hllc(left: FacePrimitive, right: FacePrimitive) -> array<vec2f, 4> {
  let energy_l = face_energy(left);
  let energy_r = face_energy(right);
  let a_l = sound_speed(left.rho, left.p);
  let a_r = sound_speed(right.rho, right.p);
  let w_l = df_sqrt(left.rho);
  let w_r = df_sqrt(right.rho);
  let w = df_add(w_l, w_r);
  let un_roe = df_div(df_add(df_mul(w_l, left.un), df_mul(w_r, right.un)), w);
  let ut_roe = df_div(df_add(df_mul(w_l, left.ut), df_mul(w_r, right.ut)), w);
  let h_l = df_div(df_add(energy_l, left.p), left.rho);
  let h_r = df_div(df_add(energy_r, right.p), right.rho);
  let h_roe = df_div(df_add(df_mul(w_l, h_l), df_mul(w_r, h_r)), w);
  let q2 = df_mul_f(df_add(df_mul(un_roe, un_roe), df_mul(ut_roe, ut_roe)), 0.5);
  let a_roe = df_sqrt(df_max(df_mul(gamma_minus_one(), df_sub(h_roe, q2)), df(0.0)));
  let s_l = df_min(df_sub(left.un, a_l), df_sub(un_roe, a_roe));
  let s_r = df_max(df_add(right.un, a_r), df_add(un_roe, a_roe));
  if (df_le(df(0.0), s_l)) {
    return physical_flux(left);
  }
  if (df_le(s_r, df(0.0))) {
    return physical_flux(right);
  }
  let m_l = df_mul(left.rho, df_sub(s_l, left.un));
  let m_r = df_mul(right.rho, df_sub(s_r, right.un));
  let s_star = df_div(
    df_add(df_sub(right.p, left.p), df_sub(df_mul(left.un, m_l), df_mul(right.un, m_r))),
    df_sub(m_l, m_r),
  );
  var side = right;
  var s_k = s_r;
  var energy_k = energy_r;
  if (df_le(df(0.0), s_star)) {
    side = left;
    s_k = s_l;
    energy_k = energy_l;
  }
  let gap = df_sub(s_k, side.un);
  let star_rho = df_div(df_mul(side.rho, gap), df_sub(s_k, s_star));
  let star_energy = df_mul(
    star_rho,
    df_add(
      df_div(energy_k, side.rho),
      df_mul(df_sub(s_star, side.un), df_add(s_star, df_div(side.p, df_mul(side.rho, gap)))),
    ),
  );
  let mass = df_mul(side.rho, side.un);
  let jump = df_sub(star_rho, side.rho);
  return array<vec2f, 4>(
    df_add(mass, df_mul(s_k, jump)),
    df_add(df_add(df_mul(mass, side.un), side.p), df_mul(s_k, df_sub(df_mul(star_rho, s_star), mass))),
    df_add(df_mul(mass, side.ut), df_mul(df_mul(s_k, jump), side.ut)),
    df_add(df_mul(side.un, df_add(energy_k, side.p)), df_mul(s_k, df_sub(star_energy, energy_k))),
  );
}

fn physical(w: P) -> bool {
  return w.rho.x > 0.0 && w.p.x > 0.0;
}

// Flux times area through the face between `left_cell` and `right_cell`
// (faceStates, wallMirrored and faceFlux2D in euler2d.ts): `wall` is -1
// for a wall face on a minimum side, 1 on a maximum side, 0 elsewhere.
fn face_flux_between(far_left: Q, left_cell: Q, right_cell: Q, far_right: Q, face: FaceGeometry, wall: i32) -> Q {
  let w_ll = to_primitive(far_left);
  let w_l = to_primitive(left_cell);
  let w_r = to_primitive(right_cell);
  let w_rr = to_primitive(far_right);
  var left = reconstruct(w_ll, w_l, w_r, 1.0);
  var right = reconstruct(w_l, w_r, w_rr, -1.0);
  if (!(physical(left) && physical(right))) {
    left = w_l;
    right = w_r;
  }
  let nx = face.nx;
  let ny = face.ny;
  var l = FacePrimitive(
    left.rho,
    df_add(df_mul(left.u, nx), df_mul(left.v, ny)),
    df_add(-df_mul(left.u, ny), df_mul(left.v, nx)),
    left.p,
  );
  var r = FacePrimitive(
    right.rho,
    df_add(df_mul(right.u, nx), df_mul(right.v, ny)),
    df_add(-df_mul(right.u, ny), df_mul(right.v, nx)),
    right.p,
  );
  if (wall < 0) {
    l = FacePrimitive(r.rho, -r.un, r.ut, r.p);
  } else if (wall > 0) {
    r = FacePrimitive(l.rho, -l.un, l.ut, l.p);
  }
  let f = hllc(l, r);
  let area = face.area;
  return make_q(
    df_mul(f[0], area),
    df_mul(df_sub(df_mul(f[1], nx), df_mul(f[2], ny)), area),
    df_mul(df_add(df_mul(f[1], ny), df_mul(f[2], nx)), area),
    df_mul(f[3], area),
  );
}

fn wall_side(at_min: bool, at_max: bool, min_side: u32, max_side: u32) -> i32 {
  if (at_min && params.bc[min_side] == WALL) {
    return -1;
  }
  if (at_max && params.bc[max_side] == WALL) {
    return 1;
  }
  return 0;
}

fn store_flux(f: u32, q: Q) {
  face_flux[2u * f] = q.h;
  face_flux[2u * f + 1u] = q.l;
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn fluxes_i(@builtin(global_invocation_id) id: vec3u) {
  let f = id.x;
  if (f >= n_i_faces()) {
    return;
  }
  let i = i32(f % (params.ni + 1u));
  let j = i32(f / (params.ni + 1u));
  store_flux(f, face_flux_between(
    load_cell(i - 2, j),
    load_cell(i - 1, j),
    load_cell(i, j),
    load_cell(i + 1, j),
    face_geometry(f),
    wall_side(i == 0, i == i32(params.ni), I_MIN, I_MAX),
  ));
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn fluxes_j(@builtin(global_invocation_id) id: vec3u) {
  let f = id.x;
  if (f >= n_j_faces()) {
    return;
  }
  let i = i32(f % params.ni);
  let j = i32(f / params.ni);
  store_flux(n_i_faces() + f, face_flux_between(
    load_cell(i, j - 2),
    load_cell(i, j - 1),
    load_cell(i, j),
    load_cell(i, j + 1),
    face_geometry(n_i_faces() + f),
    wall_side(j == 0, j == i32(params.nj), J_MIN, J_MAX),
  ));
}

fn flux_at(f: u32) -> Q {
  return Q(face_flux[2u * f], face_flux[2u * f + 1u]);
}

// The two-float residual of cell c: net inflow through its faces plus the
// axisymmetric pressure source on the radial momentum.
fn residual(c: u32) -> array<vec2f, 4> {
  let i = c % params.ni;
  let j = c / params.ni;
  let left = flux_at(i + j * (params.ni + 1u));
  let right = flux_at(i + 1u + j * (params.ni + 1u));
  let below = flux_at(n_i_faces() + i + j * params.ni);
  let above = flux_at(n_i_faces() + i + (j + 1u) * params.ni);
  var r: array<vec2f, 4>;
  for (var k = 0u; k < 4u; k++) {
    r[k] = df_add(df_sub(part(left, k), part(right, k)), df_sub(part(below, k), part(above, k)));
  }
  if (params.axisymmetric == 1u) {
    r[2] = df_add(r[2], df_mul(to_primitive(load(c)).p, cell_volume_area(c)[1]));
  }
  return r;
}

// The 32-bit implicit operator, from the high parts of the state and the
// grid (as euler2d-implicit.wgsl).

fn state_hi(c: u32) -> vec4f {
  return src[2u * c];
}

fn pressure32(q: vec4f) -> f32 {
  let g = params.gamma.x + params.gamma.y;
  return (g - 1.0) * (q.w - 0.5 * (q.y * q.y + q.z * q.z) / q.x);
}

fn radius(c: u32, n: vec2f) -> f32 {
  let q = state_hi(c);
  let g = params.gamma.x + params.gamma.y;
  return abs((q.y * n.x + q.z * n.y) / q.x) + sqrt(g * pressure32(q) / q.x);
}

fn face32(index: u32) -> vec4f {
  return geometry[2u * index];
}

fn lambda_i(i: u32, j: u32) -> f32 {
  let face = face32(i + j * (params.ni + 1u));
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
  let face = face32(n_i_faces() + i + j * params.ni);
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
fn prepare(@builtin(global_invocation_id) id: vec3u) {
  let c = id.x;
  if (c >= n_cells()) {
    return;
  }
  let i = c % params.ni;
  let j = c / params.ni;
  let r = residual(c);
  var axis = 0.0;
  if (params.axisymmetric == 1u) {
    let planar = geometry[2u * (n_i_faces() + n_j_faces() + c)].y;
    axis = planar * radius(c, vec2f(0.0, 1.0));
  }
  let cfl = work[2u * n_cells()].x;
  let scale = 0.5 * (params.omega + 1.0 / cfl);
  let sum = lambda_i(i, j) + lambda_i(i + 1u, j) + lambda_j(i, j) + lambda_j(i, j + 1u);
  work[c] = vec4f(df_round(r[0]), df_round(r[1]), df_round(r[2]), df_round(r[3]));
  work[n_cells() + c] = vec4f(scale * sum + axis, 0.0, 0.0, 0.0);
  dq[c] = vec4f(0.0);
}

// The neighbour nb's term, A (1/2 dF_n - 1/2 omega lambda dQ), with dF_n
// its flux Jacobian along n applied to its change dQ. Linear in dQ, so its
// 32-bit rounding is relative to the term itself: the CPU's difference of
// fluxes, F(Q + dQ) - F(Q), carries a 32-bit noise of the size of F that
// does not shrink with dQ, and near convergence it would set the state
// wandering again. The two agree to first order in dQ.
fn neighbour(nb: u32, n: vec2f, area: f32, lambda_area: f32) -> vec4f {
  let g = params.gamma.x + params.gamma.y;
  let q = state_hi(nb);
  let d = dq[nb];
  let u = q.y / q.x;
  let v = q.z / q.x;
  let un = u * n.x + v * n.y;
  let p = pressure32(q);
  let dp = (g - 1.0) * (d.w - (u * d.y + v * d.z) + 0.5 * (u * u + v * v) * d.x);
  let dun = (d.y * n.x + d.z * n.y - un * d.x) / q.x;
  let df_n = vec4f(
    d.y * n.x + d.z * n.y,
    d.y * un + q.y * dun + dp * n.x,
    d.z * un + q.z * dun + dp * n.y,
    (d.w + dp) * un + (q.w + p) * dun,
  );
  return 0.5 * area * df_n - 0.5 * params.omega * lambda_area * d;
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn relax(@builtin(global_invocation_id) id: vec3u) {
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
  let c = id.x;
  var sum = vec4f(0.0);
  if (i > 0u) {
    let f = face32(i + j * (ni + 1u));
    sum += neighbour(c - 1u, -f.xy, f.z, lambda_i(i, j));
  }
  if (i < ni - 1u) {
    let f = face32(i + 1u + j * (ni + 1u));
    sum += neighbour(c + 1u, f.xy, f.z, lambda_i(i + 1u, j));
  }
  if (j > 0u) {
    let f = face32(n_i_faces() + i + j * ni);
    sum += neighbour(c - ni, -f.xy, f.z, lambda_j(i, j));
  }
  if (j < nj - 1u) {
    let f = face32(n_i_faces() + i + (j + 1u) * ni);
    sum += neighbour(c + ni, f.xy, f.z, lambda_j(i, j + 1u));
  }
  dq[c] = (work[c] - sum) / work[n_cells() + c].x;
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn update(@builtin(global_invocation_id) id: vec3u) {
  let c = id.x;
  if (c >= n_cells()) {
    return;
  }
  let q = state_hi(c);
  let d = dq[c];
  let p = pressure32(q);
  var alpha = 1.0;
  for (var tries = 0; tries < 30; tries++) {
    let q1 = q + alpha * d;
    let p1 = pressure32(q1);
    if (q1.x > 0.5 * q.x && q1.x < 2.0 * q.x && p1 > 0.5 * p && p1 < 2.0 * p) {
      break;
    }
    alpha *= 0.5;
  }
  let old = load(c);
  var hi = vec4f(0.0);
  var lo = vec4f(0.0);
  for (var k = 0u; k < 4u; k++) {
    let s = df_add(part(old, k), df(alpha * d[k]));
    hi[k] = s.x;
    lo[k] = s.y;
  }
  dst[2u * c] = hi;
  dst[2u * c + 1u] = lo;
  let p1 = pressure32(hi);
  if (!(hi.x > 0.0 && hi.x < 3.0e38 && p1 > 0.0 && p1 < 3.0e38 && abs(hi.y) < 3.0e38 && abs(hi.z) < 3.0e38)) {
    atomicOr(&control.status, STATUS_NON_PHYSICAL);
  }
}

@compute @workgroup_size(1)
fn advance() {
  let k = 2u * n_cells();
  work[k].x = min(params.cfl_max, work[k].x * params.cfl_growth);
  control.steps += 1u;
}

// For checking the residual against the CPU's: the two-float residual of
// every cell into dst, high parts then low parts, as a state is laid out.
@compute @workgroup_size(WORKGROUP_SIZE)
fn residual_to_dst(@builtin(global_invocation_id) id: vec3u) {
  let c = id.x;
  if (c >= n_cells()) {
    return;
  }
  let r = residual(c);
  dst[2u * c] = vec4f(r[0].x, r[1].x, r[2].x, r[3].x);
  dst[2u * c + 1u] = vec4f(r[0].y, r[1].y, r[2].y, r[3].y);
}
