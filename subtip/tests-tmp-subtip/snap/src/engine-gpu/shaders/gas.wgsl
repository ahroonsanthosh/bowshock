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

// Two-dimensional primitive state.
struct Primitive2D {
  rho: f32,
  u: f32,
  v: f32,
  p: f32,
}

// Conserved (rho, rho u, rho v, E) to primitive; equivalent to pressureFromConserved2D.
fn to_primitive_2d(c: vec4f, gamma: f32) -> Primitive2D {
  let u = c.y / c.x;
  let v = c.z / c.x;
  return Primitive2D(c.x, u, v, (gamma - 1.0) * (c.w - 0.5 * (c.y * u + c.z * v)));
}

fn to_conserved_2d(w: Primitive2D, gamma: f32) -> vec4f {
  return vec4f(w.rho, w.rho * w.u, w.rho * w.v, w.p / (gamma - 1.0) + 0.5 * w.rho * (w.u * w.u + w.v * w.v));
}
