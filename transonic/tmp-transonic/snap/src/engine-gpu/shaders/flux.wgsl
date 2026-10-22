// Numerical fluxes in the frame of a cell face: WGSL twins of
// src/scheme/flux.ts; see that file for the method and references.
// Requires gas.wgsl.
//
// A face state has the velocity split into the component normal to the
// face (un) and the tangential component (ut). Fluxes return
// [mass, normal momentum, tangential momentum, energy] per unit area.

struct FaceState {
  rho: f32,
  un: f32,
  ut: f32,
  p: f32,
}

fn face_energy(w: FaceState, gamma: f32) -> f32 {
  return w.p / (gamma - 1.0) + 0.5 * w.rho * (w.un * w.un + w.ut * w.ut);
}

fn face_sound_speed(w: FaceState, gamma: f32) -> f32 {
  return sqrt(gamma * w.p / w.rho);
}

// Twin of physicalFaceFlux.
fn physical_face_flux(w: FaceState, gamma: f32) -> vec4f {
  let mass = w.rho * w.un;
  return vec4f(mass, mass * w.un + w.p, mass * w.ut, w.un * (face_energy(w, gamma) + w.p));
}

// Twin of rusanovFaceFlux.
fn rusanov_face_flux(left: FaceState, right: FaceState, gamma: f32) -> vec4f {
  let s_max = max(
    abs(left.un) + face_sound_speed(left, gamma),
    abs(right.un) + face_sound_speed(right, gamma),
  );
  let jump = vec4f(
    right.rho - left.rho,
    right.rho * right.un - left.rho * left.un,
    right.rho * right.ut - left.rho * left.ut,
    face_energy(right, gamma) - face_energy(left, gamma),
  );
  return 0.5 * (physical_face_flux(left, gamma) + physical_face_flux(right, gamma)) - 0.5 * s_max * jump;
}

// Twin of hllcFaceFlux.
fn hllc_face_flux(left: FaceState, right: FaceState, gamma: f32) -> vec4f {
  let a_l = face_sound_speed(left, gamma);
  let a_r = face_sound_speed(right, gamma);
  let energy_l = face_energy(left, gamma);
  let energy_r = face_energy(right, gamma);

  // Roe averages, weighted by the square root of density.
  let w_l = sqrt(left.rho);
  let w_r = sqrt(right.rho);
  let un_roe = (w_l * left.un + w_r * right.un) / (w_l + w_r);
  let ut_roe = (w_l * left.ut + w_r * right.ut) / (w_l + w_r);
  let h_l = (energy_l + left.p) / left.rho;
  let h_r = (energy_r + right.p) / right.rho;
  let h_roe = (w_l * h_l + w_r * h_r) / (w_l + w_r);
  let a_roe = sqrt(max((gamma - 1.0) * (h_roe - 0.5 * (un_roe * un_roe + ut_roe * ut_roe)), 0.0));
  let s_l = min(left.un - a_l, un_roe - a_roe);
  let s_r = max(right.un + a_r, un_roe + a_roe);

  if (s_l >= 0.0) {
    return physical_face_flux(left, gamma);
  }
  if (s_r <= 0.0) {
    return physical_face_flux(right, gamma);
  }

  let m_l = left.rho * (s_l - left.un);
  let m_r = right.rho * (s_r - right.un);
  let s_star = (right.p - left.p + left.un * m_l - right.un * m_r) / (m_l - m_r);

  // Flux on the side of the contact containing the face: F*_K = F_K + S_K (U*_K - U_K).
  var side = right;
  var s_k = s_r;
  var energy_k = energy_r;
  if (s_star >= 0.0) {
    side = left;
    s_k = s_l;
    energy_k = energy_l;
  }
  let star_rho = side.rho * (s_k - side.un) / (s_k - s_star);
  let star_energy = star_rho *
    (energy_k / side.rho + (s_star - side.un) * (s_star + side.p / (side.rho * (s_k - side.un))));
  let mass = side.rho * side.un;
  return vec4f(
    mass + s_k * (star_rho - side.rho),
    mass * side.un + side.p + s_k * (star_rho * s_star - mass),
    mass * side.ut + s_k * (star_rho - side.rho) * side.ut,
    side.un * (energy_k + side.p) + s_k * (star_energy - energy_k),
  );
}

// One-dimensional wrappers: the face-frame fluxes with no tangential
// velocity, returning [mass, momentum, energy]. Twins of hllcFlux and
// rusanovFlux.

fn hllc_flux(left: Primitive, right: Primitive, gamma: f32) -> vec3f {
  let f = hllc_face_flux(FaceState(left.rho, left.u, 0.0, left.p), FaceState(right.rho, right.u, 0.0, right.p), gamma);
  return f.xyw;
}

fn rusanov_flux(left: Primitive, right: Primitive, gamma: f32) -> vec3f {
  let f = rusanov_face_flux(FaceState(left.rho, left.u, 0.0, left.p), FaceState(right.rho, right.u, 0.0, right.p), gamma);
  return f.xyw;
}
