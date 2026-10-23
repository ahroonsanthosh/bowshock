// Three-dimensional finite-volume Euler solver on one structured block, in
// cylindrical (x, r, theta) or planar coordinates: the WGSL twin of
// src/solver3d/euler3d.ts (docs/design/0021-3d-euler-fins.md section 3), in
// 32-bit floats. The same scheme: HLLC with Einfeldt's speeds and a second
// tangential velocity, the scaled shared van Albada reconstruction with a
// fifth difference, the wall mirrored after reconstruction, the geometric
// sources over each cell's source volume, SSPRK2 with local time steps.
//
// Ghost cells are not stored: load_cell gives every cell, interior or ghost,
// from the boundary conditions, as the 2D kernel's load_cell does. One step:
// time_steps (from u0), then per stage face_fluxes (from src) and update_cells
// (dst = a u0 + b (src + dt / V R(src))). Every kernel numbers its items over
// a two-dimensional dispatch: item = id.x + id.y * num_workgroups.x * 64.

const WORKGROUP_SIZE: u32 = 64u;
const NV: u32 = 5u;
const GHOSTS: i32 = 2;

// Boundary kinds, matching BOUNDARY_KINDS_3D in euler3d-gpu.ts.
const INFLOW: u32 = 0u;
const OUTFLOW: u32 = 1u;
const WALL: u32 = 2u;
const PERIODIC: u32 = 3u;
const FACE_STATES: u32 = 4u;

struct Params {
  ni: u32,
  nj: u32,
  nk: u32,
  cylindrical: u32,
  local_stepping: u32,
  n_cells: u32,
  n_faces: u32,
  pad0: u32,
  gamma: f32,
  cfl: f32,
  pad1: f32,
  pad2: f32,
  // Boundary kind of each side: iMin, iMax, jMin, jMax, kMin, kMax.
  bc: array<vec4u, 2>,
  // 1 where a side's face fluxes are imposed.
  imposed: array<vec4u, 2>,
  // Offsets (in f32) of each side's ghost states (two layers, conserved, 5 a face) in `boundary`.
  ghost_offset: array<vec4u, 2>,
  // Offsets (in f32) of each side's imposed fluxes (5 a face, per unit area) in `boundary`.
  flux_offset: array<vec4u, 2>,
}

struct Stage {
  a: f32,
  b: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
// Every face's area vector and magnitude (s0, s1, s2, |s|): i-faces, then j-faces, then k-faces.
@group(0) @binding(1) var<storage, read> face_geom: array<vec4f>;
// Every cell's (volume, source volume, 0, 0).
@group(0) @binding(2) var<storage, read> cell_geom: array<vec4f>;
@group(0) @binding(3) var<storage, read> boundary: array<f32>;
// Flux times area through every face, 5 a face.
@group(0) @binding(4) var<storage, read_write> face_flux: array<f32>;
// Each cell's time step; then, from n_cells, a non-physical flag.
@group(0) @binding(5) var<storage, read_write> dt: array<f32>;

@group(1) @binding(0) var<uniform> stage: Stage;
@group(1) @binding(1) var<storage, read> u0: array<f32>;
@group(1) @binding(2) var<storage, read> src: array<f32>;
@group(1) @binding(3) var<storage, read_write> dst: array<f32>;

struct P5 {
  rho: f32,
  u: f32,
  v: f32,
  w: f32,
  p: f32,
}

fn item(id: vec3u, groups: vec3u) -> u32 {
  return id.x + id.y * groups.x * WORKGROUP_SIZE;
}

fn side_kind(s: u32) -> u32 {
  return params.bc[s / 4u][s % 4u];
}

fn side_imposed(s: u32) -> u32 {
  return params.imposed[s / 4u][s % 4u];
}

// Compact cell index.
fn cell(i: u32, j: u32, k: u32) -> u32 {
  return i + params.ni * (j + params.nj * k);
}

fn i_face(i: u32, j: u32, k: u32) -> u32 {
  return i + (params.ni + 1u) * (j + params.nj * k);
}
fn j_face(i: u32, j: u32, k: u32) -> u32 {
  return (params.ni + 1u) * params.nj * params.nk + i + params.ni * (j + (params.nj + 1u) * k);
}
fn k_face(i: u32, j: u32, k: u32) -> u32 {
  return (params.ni + 1u) * params.nj * params.nk + params.ni * (params.nj + 1u) * params.nk + i + params.ni * (j + params.nj * k);
}

fn primitive_of(q0: f32, q1: f32, q2: f32, q3: f32, q4: f32) -> P5 {
  let u = q1 / q0;
  let v = q2 / q0;
  let w = q3 / q0;
  return P5(q0, u, v, w, (params.gamma - 1.0) * (q4 - 0.5 * q0 * (u * u + v * v + w * w)));
}

fn load_src(i: u32, j: u32, k: u32) -> P5 {
  let q = NV * cell(i, j, k);
  return primitive_of(src[q], src[q + 1u], src[q + 2u], src[q + 3u], src[q + 4u]);
}

fn boundary_state(offset: u32) -> P5 {
  return primitive_of(boundary[offset], boundary[offset + 1u], boundary[offset + 2u], boundary[offset + 3u], boundary[offset + 4u]);
}

// The unit normal of a boundary face of side s at position t.
fn boundary_normal(s: u32, t: u32) -> vec3f {
  var f: u32;
  if (s < 2u) {
    let j = t % params.nj;
    let k = t / params.nj;
    f = i_face(select(params.ni, 0u, s == 0u), j, k);
  } else if (s < 4u) {
    let i = t % params.ni;
    let k = t / params.ni;
    f = j_face(i, select(params.nj, 0u, s == 2u), k);
  } else {
    let i = t % params.ni;
    let j = t / params.ni;
    f = k_face(i, j, select(params.nk, 0u, s == 4u));
  }
  let g = face_geom[f];
  if (g.w == 0.0) {
    return vec3f(0.0);
  }
  return g.xyz / g.w;
}

// Any cell, interior or ghost (one index out of range at most), from src and the boundaries.
fn load_cell(i: i32, j: i32, k: i32) -> P5 {
  let ni = i32(params.ni);
  let nj = i32(params.nj);
  let nk = i32(params.nk);
  var s = 6u;
  var g = 0;
  var t = 0u;
  var mi = i;
  var mj = j;
  var mk = k;
  var wi = i;
  var wj = j;
  var wk = k;
  if (i < 0) {
    s = 0u; g = -1 - i; t = u32(j + nj * k); mi = -1 - i; wi = i + ni;
  } else if (i >= ni) {
    s = 1u; g = i - ni; t = u32(j + nj * k); mi = 2 * ni - 1 - i; wi = i - ni;
  } else if (j < 0) {
    s = 2u; g = -1 - j; t = u32(i + ni * k); mj = -1 - j; wj = j + nj;
  } else if (j >= nj) {
    s = 3u; g = j - nj; t = u32(i + ni * k); mj = 2 * nj - 1 - j; wj = j - nj;
  } else if (k < 0) {
    s = 4u; g = -1 - k; t = u32(i + ni * j); mk = -1 - k; wk = k + nk;
  } else if (k >= nk) {
    s = 5u; g = k - nk; t = u32(i + ni * j); mk = 2 * nk - 1 - k; wk = k - nk;
  }
  if (s == 6u) {
    return load_src(u32(i), u32(j), u32(k));
  }
  let kind = side_kind(s);
  let side_index = s / 4u;
  let comp = s % 4u;
  if (kind == INFLOW || kind == FACE_STATES) {
    let faces = select(select(params.ni * params.nj, params.ni * params.nk, s < 4u), params.nj * params.nk, s < 2u);
    let offset = params.ghost_offset[side_index][comp] + NV * (u32(g) * faces + t);
    return boundary_state(offset);
  }
  if (kind == PERIODIC) {
    return load_src(u32(wi), u32(wj), u32(wk));
  }
  let inside = load_src(u32(mi), u32(mj), u32(mk));
  if (kind == WALL) {
    let n = boundary_normal(s, t);
    let un = inside.u * n.x + inside.v * n.y + inside.w * n.z;
    return P5(inside.rho, inside.u - 2.0 * un * n.x, inside.v - 2.0 * un * n.y, inside.w - 2.0 * un * n.z, inside.p);
  }
  return inside;
}

fn reconstruct(prev: P5, centre: P5, next: P5, side: f32) -> P5 {
  let rho = min(min(prev.rho, centre.rho), next.rho);
  let s_rho = 1.0 / rho;
  let rho_a2 = params.gamma * min(min(prev.p, centre.p), next.p);
  let s_u = sqrt(rho / rho_a2);
  let s_p = 1.0 / rho_a2;
  let a_rho = (centre.rho - prev.rho) * s_rho;
  let a_u = (centre.u - prev.u) * s_u;
  let a_v = (centre.v - prev.v) * s_u;
  let a_p = (centre.p - prev.p) * s_p;
  let a_w = (centre.w - prev.w) * s_u;
  let b_rho = (next.rho - centre.rho) * s_rho;
  let b_u = (next.u - centre.u) * s_u;
  let b_v = (next.v - centre.v) * s_u;
  let b_p = (next.p - centre.p) * s_p;
  let b_w = (next.w - centre.w) * s_u;
  let ab = a_rho * b_rho + a_u * b_u + a_v * b_v + a_p * b_p + a_w * b_w;
  let aa = a_rho * a_rho + a_u * a_u + a_v * a_v + a_p * a_p + a_w * a_w;
  let bb = b_rho * b_rho + b_u * b_u + b_v * b_v + b_p * b_p + b_w * b_w;
  let eps = 1e-6;
  let f = 0.25 * side * max(0.0, (2.0 * (ab + eps)) / (aa + bb + 2.0 * eps));
  return P5(
    centre.rho + f * (next.rho - prev.rho),
    centre.u + f * (next.u - prev.u),
    centre.v + f * (next.v - prev.v),
    centre.w + f * (next.w - prev.w),
    centre.p + f * (next.p - prev.p),
  );
}

struct F5 {
  a: vec4f,
  e: f32,
}

fn physical_flux(q: P5, n: vec3f) -> F5 {
  let un = q.u * n.x + q.v * n.y + q.w * n.z;
  let mass = q.rho * un;
  let energy = q.p / (params.gamma - 1.0) + 0.5 * q.rho * (q.u * q.u + q.v * q.v + q.w * q.w);
  return F5(vec4f(mass, mass * q.u + q.p * n.x, mass * q.v + q.p * n.y, mass * q.w + q.p * n.z), un * (energy + q.p));
}

fn hllc(l: P5, r: P5, n: vec3f) -> F5 {
  let g = params.gamma;
  let un_l = l.u * n.x + l.v * n.y + l.w * n.z;
  let un_r = r.u * n.x + r.v * n.y + r.w * n.z;
  let e_l = l.p / (g - 1.0) + 0.5 * l.rho * (l.u * l.u + l.v * l.v + l.w * l.w);
  let e_r = r.p / (g - 1.0) + 0.5 * r.rho * (r.u * r.u + r.v * r.v + r.w * r.w);
  let a_l = sqrt(g * l.p / l.rho);
  let a_r = sqrt(g * r.p / r.rho);
  let w_l = sqrt(l.rho);
  let w_r = sqrt(r.rho);
  let u_roe = (w_l * l.u + w_r * r.u) / (w_l + w_r);
  let v_roe = (w_l * l.v + w_r * r.v) / (w_l + w_r);
  let z_roe = (w_l * l.w + w_r * r.w) / (w_l + w_r);
  let un_roe = (w_l * un_l + w_r * un_r) / (w_l + w_r);
  let h_roe = (w_l * (e_l + l.p) / l.rho + w_r * (e_r + r.p) / r.rho) / (w_l + w_r);
  let a_roe = sqrt(max((g - 1.0) * (h_roe - 0.5 * (u_roe * u_roe + v_roe * v_roe + z_roe * z_roe)), 0.0));
  let s_l = min(un_l - a_l, un_roe - a_roe);
  let s_r = max(un_r + a_r, un_roe + a_roe);
  if (s_l >= 0.0) {
    return physical_flux(l, n);
  }
  if (s_r <= 0.0) {
    return physical_flux(r, n);
  }
  let m_l = l.rho * (s_l - un_l);
  let m_r = r.rho * (s_r - un_r);
  let s_star = (r.p - l.p + un_l * m_l - un_r * m_r) / (m_l - m_r);
  let use_left = s_star >= 0.0;
  var k = r;
  if (use_left) {
    k = l;
  }
  let s_k = select(s_r, s_l, use_left);
  let un_k = select(un_r, un_l, use_left);
  let e_k = select(e_r, e_l, use_left);
  let star_rho = k.rho * (s_k - un_k) / (s_k - s_star);
  let star_e = star_rho * (e_k / k.rho + (s_star - un_k) * (s_star + k.p / (k.rho * (s_k - un_k))));
  let mass = k.rho * un_k;
  let d_rho = star_rho - k.rho;
  let normal = mass * un_k + k.p + s_k * (star_rho * s_star - mass);
  let tangential = mass + s_k * d_rho;
  let t = vec3f(k.u, k.v, k.w) - un_k * n;
  let m = normal * n + tangential * t;
  return F5(vec4f(mass + s_k * d_rho, m.x, m.y, m.z), un_k * (e_k + k.p) + s_k * (star_e - e_k));
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn face_fluxes(@builtin(global_invocation_id) id: vec3u, @builtin(num_workgroups) groups: vec3u) {
  let f = item(id, groups);
  if (f >= params.n_faces) {
    return;
  }
  let ni = params.ni;
  let nj = params.nj;
  let nk = params.nk;
  let n_i = (ni + 1u) * nj * nk;
  let n_j = ni * (nj + 1u) * nk;
  var i: i32;
  var j: i32;
  var k: i32;
  var d = vec3i(0);
  var side = 6u;
  var t = 0u;
  if (f < n_i) {
    i = i32(f % (ni + 1u));
    j = i32((f / (ni + 1u)) % nj);
    k = i32(f / ((ni + 1u) * nj));
    d = vec3i(1, 0, 0);
    if (i == 0) { side = 0u; } else if (i == i32(ni)) { side = 1u; }
    t = u32(j) + nj * u32(k);
  } else if (f < n_i + n_j) {
    let g = f - n_i;
    i = i32(g % ni);
    j = i32((g / ni) % (nj + 1u));
    k = i32(g / (ni * (nj + 1u)));
    d = vec3i(0, 1, 0);
    if (j == 0) { side = 2u; } else if (j == i32(nj)) { side = 3u; }
    t = u32(i) + ni * u32(k);
  } else {
    let g = f - n_i - n_j;
    i = i32(g % ni);
    j = i32((g / ni) % nj);
    k = i32(g / (ni * nj));
    d = vec3i(0, 0, 1);
    if (k == 0) { side = 4u; } else if (k == i32(nk)) { side = 5u; }
    t = u32(i) + ni * u32(j);
  }
  let geom = face_geom[f];
  let area = geom.w;
  var out = F5(vec4f(0.0), 0.0);
  if (area > 0.0) {
    if (side < 6u && side_imposed(side) == 1u) {
      let o = params.flux_offset[side / 4u][side % 4u] + NV * t;
      out = F5(vec4f(boundary[o], boundary[o + 1u], boundary[o + 2u], boundary[o + 3u]), boundary[o + 4u]);
    } else {
      let n = geom.xyz / area;
      let r0 = vec3i(i, j, k);
      let wll = load_cell(r0.x - 2 * d.x, r0.y - 2 * d.y, r0.z - 2 * d.z);
      let wl = load_cell(r0.x - d.x, r0.y - d.y, r0.z - d.z);
      let wr = load_cell(r0.x, r0.y, r0.z);
      let wrr = load_cell(r0.x + d.x, r0.y + d.y, r0.z + d.z);
      var left = reconstruct(wll, wl, wr, 1.0);
      var right = reconstruct(wl, wr, wrr, -1.0);
      if (!(left.rho > 0.0 && left.p > 0.0 && right.rho > 0.0 && right.p > 0.0)) {
        left = wl;
        right = wr;
      }
      if (side < 6u && side_kind(side) == WALL) {
        let min_side = side % 2u == 0u;
        var inside = left;
        if (min_side) {
          inside = right;
        }
        let un = inside.u * n.x + inside.v * n.y + inside.w * n.z;
        let mirror = P5(inside.rho, inside.u - 2.0 * un * n.x, inside.v - 2.0 * un * n.y, inside.w - 2.0 * un * n.z, inside.p);
        if (min_side) { left = mirror; } else { right = mirror; }
      }
      out = hllc(left, right, n);
    }
  }
  let o = NV * f;
  face_flux[o] = out.a.x * area;
  face_flux[o + 1u] = out.a.y * area;
  face_flux[o + 2u] = out.a.z * area;
  face_flux[o + 3u] = out.a.w * area;
  face_flux[o + 4u] = out.e * area;
}

// The residual of cell c (net inflow plus sources), from the face fluxes and src.
fn residual(c: u32) -> array<f32, 5> {
  let ni = params.ni;
  let nj = params.nj;
  let i = c % ni;
  let j = (c / ni) % nj;
  let k = c / (ni * nj);
  let faces = array<u32, 6>(i_face(i, j, k), i_face(i + 1u, j, k), j_face(i, j, k), j_face(i, j + 1u, k), k_face(i, j, k), k_face(i, j, k + 1u));
  var r = array<f32, 5>(0.0, 0.0, 0.0, 0.0, 0.0);
  for (var n = 0u; n < NV; n++) {
    r[n] = face_flux[NV * faces[0] + n] - face_flux[NV * faces[1] + n] + face_flux[NV * faces[2] + n] - face_flux[NV * faces[3] + n] + face_flux[NV * faces[4] + n] - face_flux[NV * faces[5] + n];
  }
  if (params.cylindrical == 1u) {
    let w = load_src(i, j, k);
    let vol = cell_geom[c].y;
    r[2] += (w.rho * w.w * w.w + w.p) * vol;
    r[3] -= w.rho * w.v * w.w * vol;
  }
  return r;
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn update_cells(@builtin(global_invocation_id) id: vec3u, @builtin(num_workgroups) groups: vec3u) {
  let c = item(id, groups);
  if (c >= params.n_cells) {
    return;
  }
  let r = residual(c);
  let factor = dt[c] / cell_geom[c].x;
  let q = NV * c;
  for (var n = 0u; n < NV; n++) {
    dst[q + n] = stage.a * u0[q + n] + stage.b * (src[q + n] + factor * r[n]);
  }
  let w = primitive_of(dst[q], dst[q + 1u], dst[q + 2u], dst[q + 3u], dst[q + 4u]);
  if (!(w.rho > 0.0 && w.p > 0.0)) {
    dt[params.n_cells] = 1.0;
  }
}

// For checks against the CPU engine: dst[5 c ..] = the residual of src.
@compute @workgroup_size(WORKGROUP_SIZE)
fn residual_out(@builtin(global_invocation_id) id: vec3u, @builtin(num_workgroups) groups: vec3u) {
  let c = item(id, groups);
  if (c >= params.n_cells) {
    return;
  }
  let r = residual(c);
  for (var n = 0u; n < NV; n++) {
    dst[NV * c + n] = r[n];
  }
}

// Each cell's time step from src: CFL V / (sum over directions of |V . S| + a |S|, S the mean of the cell's two faces).
@compute @workgroup_size(WORKGROUP_SIZE)
fn time_steps(@builtin(global_invocation_id) id: vec3u, @builtin(num_workgroups) groups: vec3u) {
  let c = item(id, groups);
  if (c >= params.n_cells) {
    return;
  }
  let ni = params.ni;
  let nj = params.nj;
  let i = c % ni;
  let j = (c / ni) % nj;
  let k = c / (ni * nj);
  let w = load_src(i, j, k);
  let a = sqrt(params.gamma * w.p / w.rho);
  let vel = vec3f(w.u, w.v, w.w);
  let si = 0.5 * (face_geom[i_face(i, j, k)].xyz + face_geom[i_face(i + 1u, j, k)].xyz);
  let sj = 0.5 * (face_geom[j_face(i, j, k)].xyz + face_geom[j_face(i, j + 1u, k)].xyz);
  let sk = 0.5 * (face_geom[k_face(i, j, k)].xyz + face_geom[k_face(i, j, k + 1u)].xyz);
  let lam = abs(dot(vel, si)) + a * length(si) + abs(dot(vel, sj)) + a * length(sj) + abs(dot(vel, sk)) + a * length(sk);
  dt[c] = params.cfl * cell_geom[c].x / lam;
}
