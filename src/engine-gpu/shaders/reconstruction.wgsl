// Face-state reconstruction. WGSL twins of src/scheme/reconstruction.ts,
// where the two choices and their trade-off are described. Requires
// gas.wgsl and limiters.wgsl, and for the per-variable form a generated
//   fn limiter(a: f32, b: f32) -> f32

fn reconstruct_per_variable(prev: Primitive2D, centre: Primitive2D, next: Primitive2D, side: f32) -> Primitive2D {
  return Primitive2D(
    centre.rho + 0.5 * side * limiter(centre.rho - prev.rho, next.rho - centre.rho),
    centre.u + 0.5 * side * limiter(centre.u - prev.u, next.u - centre.u),
    centre.v + 0.5 * side * limiter(centre.v - prev.v, next.v - centre.v),
    centre.p + 0.5 * side * limiter(centre.p - prev.p, next.p - centre.p),
  );
}

// The van Albada limiter as a factor on the central slope.
fn van_albada_factor(a: f32, b: f32) -> f32 {
  let eps = VAN_ALBADA_EPSILON;
  return max(0.0, 2.0 * (a * b + eps) / (a * a + b * b + 2.0 * eps));
}

fn shared_factor(prev: Primitive2D, centre: Primitive2D, next: Primitive2D) -> f32 {
  return min(
    min(van_albada_factor(centre.rho - prev.rho, next.rho - centre.rho),
        van_albada_factor(centre.u - prev.u, next.u - centre.u)),
    min(van_albada_factor(centre.v - prev.v, next.v - centre.v),
        van_albada_factor(centre.p - prev.p, next.p - centre.p)),
  );
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
