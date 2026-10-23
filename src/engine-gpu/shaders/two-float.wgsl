// Two-float (double-single) arithmetic: a number is vec2f(hi, lo), its
// value hi + lo with |lo| at most half an ulp of hi, about 48 bits of
// mantissa. The error-free transformations of T. J. Dekker (Numer. Math.
// 18, 1971) and D. E. Knuth (TAOCP vol. 2), the exact product by Dekker's
// splitting rather than fma, which SwiftShader does not fuse (measured: a
// product then off by 3.4e-9); see src/engine-gpu/euler2d-two-float.ts for
// the self-test that refuses a GPU whose compiler does not keep them
// exact.

fn df(a: f32) -> vec2f {
  return vec2f(a, 0.0);
}

// s + e = a + b exactly.
fn two_sum(a: f32, b: f32) -> vec2f {
  let s = a + b;
  let v = s - a;
  let e = (a - (s - v)) + (b - v);
  return vec2f(s, e);
}

// As two_sum, for |a| >= |b|.
fn quick_two_sum(a: f32, b: f32) -> vec2f {
  let s = a + b;
  return vec2f(s, b - (s - a));
}

fn df_add(a: vec2f, b: vec2f) -> vec2f {
  let s = two_sum(a.x, b.x);
  let t = two_sum(a.y, b.y);
  let u = quick_two_sum(s.x, s.y + t.x);
  return quick_two_sum(u.x, u.y + t.y);
}

fn df_sub(a: vec2f, b: vec2f) -> vec2f {
  return df_add(a, -b);
}

// a as the sum of two halves of 12 bits each (Veltkamp's splitting).
fn split_f(a: f32) -> vec2f {
  let t = 4097.0 * a;
  let hi = t - (t - a);
  return vec2f(hi, a - hi);
}

// p + e = a b exactly.
fn two_prod(a: f32, b: f32) -> vec2f {
  let p = a * b;
  let sa = split_f(a);
  let sb = split_f(b);
  let e = ((sa.x * sb.x - p) + sa.x * sb.y + sa.y * sb.x) + sa.y * sb.y;
  return vec2f(p, e);
}

fn df_mul(a: vec2f, b: vec2f) -> vec2f {
  let p = two_prod(a.x, b.x);
  return quick_two_sum(p.x, p.y + (a.x * b.y + a.y * b.x));
}

fn df_mul_f(a: vec2f, b: f32) -> vec2f {
  let p = two_prod(a.x, b);
  return quick_two_sum(p.x, p.y + a.y * b);
}

fn df_div(a: vec2f, b: vec2f) -> vec2f {
  let q1 = a.x / b.x;
  let r1 = df_sub(a, df_mul_f(b, q1));
  let q2 = r1.x / b.x;
  let r2 = df_sub(r1, df_mul_f(b, q2));
  let q3 = r2.x / b.x;
  return df_add(quick_two_sum(q1, q2), df(q3));
}

fn df_sqrt(a: vec2f) -> vec2f {
  if (a.x <= 0.0) {
    return vec2f(0.0, 0.0);
  }
  let s = sqrt(a.x);
  let p = two_prod(s, s);
  // a - s^2, then one Newton correction.
  let r = ((a.x - p.x) - p.y) + a.y;
  return quick_two_sum(s, r / (2.0 * s));
}

fn df_lt(a: vec2f, b: vec2f) -> bool {
  return a.x < b.x || (a.x == b.x && a.y < b.y);
}

fn df_le(a: vec2f, b: vec2f) -> bool {
  return a.x < b.x || (a.x == b.x && a.y <= b.y);
}

fn df_min(a: vec2f, b: vec2f) -> vec2f {
  return select(b, a, df_lt(a, b));
}

fn df_max(a: vec2f, b: vec2f) -> vec2f {
  return select(a, b, df_lt(a, b));
}

fn df_abs(a: vec2f) -> vec2f {
  return select(a, -a, a.x < 0.0 || (a.x == 0.0 && a.y < 0.0));
}

// The nearest f32 to a.
fn df_round(a: vec2f) -> f32 {
  return a.x + a.y;
}
