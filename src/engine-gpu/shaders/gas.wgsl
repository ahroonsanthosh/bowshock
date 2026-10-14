// Calorically perfect gas. WGSL twins of src/scheme/gas.ts.

struct Primitive {
  rho: f32,
  u: f32,
  p: f32,
}

// Twin of totalEnergy.
fn total_energy(w: Primitive, gamma: f32) -> f32 {
  return w.p / (gamma - 1.0) + 0.5 * w.rho * w.u * w.u;
}

// Twin of soundSpeed.
fn sound_speed(w: Primitive, gamma: f32) -> f32 {
  return sqrt(gamma * w.p / w.rho);
}

// Conserved (rho, rho u, E) to primitive; equivalent to pressureFromConserved.
fn to_primitive(c: vec3f, gamma: f32) -> Primitive {
  let u = c.y / c.x;
  return Primitive(c.x, u, (gamma - 1.0) * (c.z - 0.5 * c.y * u));
}

// Primitive to conserved (rho, rho u, E).
fn to_conserved(w: Primitive, gamma: f32) -> vec3f {
  return vec3f(w.rho, w.rho * w.u, total_energy(w, gamma));
}
