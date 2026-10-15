// Slope limiters. WGSL twins of src/scheme/limiters.ts; a and b are the
// backward and forward differences of a variable around a cell.

fn first_order(a: f32, b: f32) -> f32 {
  return 0.0;
}

fn minmod(a: f32, b: f32) -> f32 {
  if (a * b <= 0.0) {
    return 0.0;
  }
  return select(b, a, abs(a) < abs(b));
}

fn van_leer(a: f32, b: f32) -> f32 {
  if (a * b <= 0.0) {
    return 0.0;
  }
  return 2.0 * a * b / (a + b);
}

// The smooth form; see vanAlbada and VAN_ALBADA_EPSILON in limiters.ts.
const VAN_ALBADA_EPSILON: f32 = 1e-6;

fn van_albada(a: f32, b: f32) -> f32 {
  let eps = VAN_ALBADA_EPSILON;
  return (a * (b * b + eps) + b * (a * a + eps)) / (a * a + b * b + 2.0 * eps);
}

fn monotonized_central(a: f32, b: f32) -> f32 {
  if (a * b <= 0.0) {
    return 0.0;
  }
  return sign(a) * min(min(2.0 * abs(a), 2.0 * abs(b)), 0.5 * abs(a + b));
}

fn unlimited_central(a: f32, b: f32) -> f32 {
  return 0.5 * (a + b);
}
