/**
 * Gauss-Legendre quadrature for the fin integrals.
 *
 * Nodes are the roots of the Legendre polynomial P_n, found by Newton's
 * method from the asymptotic guess cos(pi (i - 1/4) / (n + 1/2)); weights
 * are 2 / ((1 - x^2) P_n'(x)^2). Tested in tests/fins/quadrature.test.ts:
 * exact for polynomials of degree 2n - 1, and against numpy's leggauss.
 */

export interface QuadratureRule {
  /** Nodes, ascending. */
  readonly nodes: Float64Array;
  readonly weights: Float64Array;
}

/** P_n(x) and P_{n-1}(x) by the three-term recurrence. */
function legendre(n: number, x: number): [number, number] {
  let p0 = 1;
  let p1 = x;
  for (let k = 2; k <= n; k++) {
    const p2 = ((2 * k - 1) * x * p1 - (k - 1) * p0) / k;
    p0 = p1;
    p1 = p2;
  }
  return [p1, p0];
}

const gaussCache = new Map<number, QuadratureRule>();
const sineSquaredCache = new Map<number, QuadratureRule>();

/** The n-point Gauss-Legendre rule on [-1, 1] (cached). */
export function gaussLegendre(n: number): QuadratureRule {
  if (!(Number.isInteger(n) && n >= 1)) {
    throw new RangeError(`a Gauss-Legendre rule needs a positive integer order, got ${n}`);
  }
  const hit = gaussCache.get(n);
  if (hit) return hit;
  const nodes = new Float64Array(n);
  const weights = new Float64Array(n);
  for (let i = 0; i < Math.ceil(n / 2); i++) {
    let x = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    for (let iter = 0; iter < 100; iter++) {
      const [pn, pm] = legendre(n, x);
      const dp = (n * (pm - x * pn)) / ((1 - x) * (1 + x));
      const dx = pn / dp;
      x -= dx;
      if (Math.abs(dx) < 1e-16) break;
    }
    const [pn, pm] = legendre(n, x);
    const dp = (n * (pm - x * pn)) / ((1 - x) * (1 + x));
    const w = 2 / ((1 - x) * (1 + x) * dp * dp);
    nodes[i] = -x;
    nodes[n - 1 - i] = x;
    weights[i] = w;
    weights[n - 1 - i] = w;
  }
  if (n % 2 === 1) nodes[(n - 1) / 2] = 0;
  const rule = { nodes, weights };
  gaussCache.set(n, rule);
  return rule;
}

/**
 * The n-point rule mapped to [0, 1] by u = sin^2(t), t = (pi / 4) (s + 1)
 * for the Gauss-Legendre node s: nodes cluster at both ends, and an
 * integrand with inverse-square-root singularities at the ends becomes
 * smooth, since du = 2 sin(t) cos(t) dt cancels them. The sum of
 * w_i g(u_i) approximates the integral of g over [0, 1]. This is the
 * substitution of the research's finwave.py.
 */
export function sineSquaredRule(n: number): QuadratureRule {
  const hit = sineSquaredCache.get(n);
  if (hit) return hit;
  const base = gaussLegendre(n);
  const nodes = new Float64Array(n);
  const weights = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = (Math.PI / 4) * (base.nodes[i]! + 1);
    const st = Math.sin(t);
    const ct = Math.cos(t);
    nodes[i] = st * st;
    weights[i] = 2 * st * ct * base.weights[i]! * (Math.PI / 4);
  }
  const rule = { nodes, weights };
  sineSquaredCache.set(n, rule);
  return rule;
}
