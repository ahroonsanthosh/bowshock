// Face-state reconstruction. WGSL twins of src/scheme/reconstruction.ts,
// where the two choices and their trade-off are described. Requires
// gas.wgsl, limiters.wgsl and a generated
//   fn limiter(a: f32, b: f32) -> f32
// (used by the per-variable form).

fn reconstruct_per_variable(prev: Primitive2D, centre: Primitive2D, next: Primitive2D, side: f32) -> Primitive2D {
  return Primitive2D(
    centre.rho + 0.5 * side * limiter(centre.rho - prev.rho, next.rho - centre.rho),
    centre.u + 0.5 * side * limiter(centre.u - prev.u, next.u - centre.u),
    centre.v + 0.5 * side * limiter(centre.v - prev.v, next.v - centre.v),
    centre.p + 0.5 * side * limiter(centre.p - prev.p, next.p - centre.p),
  );
}

// The clipped van Albada factor of the backward and forward difference vectors.
fn shared_factor(prev: Primitive2D, centre: Primitive2D, next: Primitive2D) -> f32 {
  let a = vec4f(centre.rho - prev.rho, centre.u - prev.u, centre.v - prev.v, centre.p - prev.p);
  let b = vec4f(next.rho - centre.rho, next.u - centre.u, next.v - centre.v, next.p - centre.p);
  let eps = VAN_ALBADA_EPSILON;
  return max(0.0, 2.0 * (dot(a, b) + eps) / (dot(a, a) + dot(b, b) + 2.0 * eps));
}

fn reconstruct_shared(prev: Primitive2D, centre: Primitive2D, next: Primitive2D, side: f32) -> Primitive2D {
  let k = 0.25 * side * shared_factor(prev, centre, next);
  return Primitive2D(
    centre.rho + k * (next.rho - prev.rho),
    centre.u + k * (next.u - prev.u),
    centre.v + k * (next.v - prev.v),
    centre.p + k * (next.p - prev.p),
  );
}

// The shared factor of differences made dimensionless by the smallest
// density and pressure of the three cells, a from them and rho a^2.
fn shared_scaled_factor(prev: Primitive2D, centre: Primitive2D, next: Primitive2D, gamma: f32) -> f32 {
  let rho = min(prev.rho, min(centre.rho, next.rho));
  let rho_a2 = gamma * min(prev.p, min(centre.p, next.p));
  let s = vec4f(1.0 / rho, sqrt(rho / rho_a2), sqrt(rho / rho_a2), 1.0 / rho_a2);
  let a = s * vec4f(centre.rho - prev.rho, centre.u - prev.u, centre.v - prev.v, centre.p - prev.p);
  let b = s * vec4f(next.rho - centre.rho, next.u - centre.u, next.v - centre.v, next.p - centre.p);
  let eps = VAN_ALBADA_EPSILON;
  return max(0.0, 2.0 * (dot(a, b) + eps) / (dot(a, a) + dot(b, b) + 2.0 * eps));
}

fn reconstruct_shared_scaled(prev: Primitive2D, centre: Primitive2D, next: Primitive2D, side: f32, gamma: f32) -> Primitive2D {
  let k = 0.25 * side * shared_scaled_factor(prev, centre, next, gamma);
  return Primitive2D(
    centre.rho + k * (next.rho - prev.rho),
    centre.u + k * (next.u - prev.u),
    centre.v + k * (next.v - prev.v),
    centre.p + k * (next.p - prev.p),
  );
}
