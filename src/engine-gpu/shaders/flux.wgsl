// Numerical fluxes for the 1D Euler equations. WGSL twins of
// src/scheme/flux.ts; see that file for the method and references.
// Requires gas.wgsl.

// Twin of physicalFlux.
fn physical_flux(w: Primitive, gamma: f32) -> vec3f {
  let energy = total_energy(w, gamma);
  return vec3f(w.rho * w.u, w.rho * w.u * w.u + w.p, w.u * (energy + w.p));
}

// Twin of rusanovFlux.
fn rusanov_flux(left: Primitive, right: Primitive, gamma: f32) -> vec3f {
  let s_max = max(abs(left.u) + sound_speed(left, gamma), abs(right.u) + sound_speed(right, gamma));
  let jump = to_conserved(right, gamma) - to_conserved(left, gamma);
  return 0.5 * (physical_flux(left, gamma) + physical_flux(right, gamma)) - 0.5 * s_max * jump;
}

// Twin of einfeldtWaveSpeeds: returns (S_L, S_R).
fn einfeldt_wave_speeds(left: Primitive, right: Primitive, gamma: f32) -> vec2f {
  let w_l = sqrt(left.rho);
  let w_r = sqrt(right.rho);
  let h_l = (total_energy(left, gamma) + left.p) / left.rho;
  let h_r = (total_energy(right, gamma) + right.p) / right.rho;
  let u_roe = (w_l * left.u + w_r * right.u) / (w_l + w_r);
  let h_roe = (w_l * h_l + w_r * h_r) / (w_l + w_r);
  let a_roe = sqrt(max((gamma - 1.0) * (h_roe - 0.5 * u_roe * u_roe), 0.0));
  return vec2f(
    min(left.u - sound_speed(left, gamma), u_roe - a_roe),
    max(right.u + sound_speed(right, gamma), u_roe + a_roe),
  );
}

// Twin of hllcFlux.
fn hllc_flux(left: Primitive, right: Primitive, gamma: f32) -> vec3f {
  let speeds = einfeldt_wave_speeds(left, right, gamma);
  let s_l = speeds.x;
  let s_r = speeds.y;
  if (s_l >= 0.0) {
    return physical_flux(left, gamma);
  }
  if (s_r <= 0.0) {
    return physical_flux(right, gamma);
  }

  let m_l = left.rho * (s_l - left.u);
  let m_r = right.rho * (s_r - right.u);
  let s_star = (right.p - left.p + left.u * m_l - right.u * m_r) / (m_l - m_r);

  // Flux on the side of the contact containing the face: F*_K = F_K + S_K (U*_K - U_K).
  var side = right;
  var s_k = s_r;
  if (s_star >= 0.0) {
    side = left;
    s_k = s_l;
  }
  let energy_k = total_energy(side, gamma);
  let factor = side.rho * (s_k - side.u) / (s_k - s_star);
  let star = factor * vec3f(
    1.0,
    s_star,
    energy_k / side.rho + (s_star - side.u) * (s_star + side.p / (side.rho * (s_k - side.u))),
  );
  return physical_flux(side, gamma) + s_k * (star - to_conserved(side, gamma));
}
