/**
 * Anderson acceleration of a fixed-point iteration x <- x + f(x), here the
 * LU-SGS steps of the CPU engine (Euler2D.implicitCorrection): D. G.
 * Anderson, "Iterative procedures for nonlinear integral equations",
 * J. ACM 12 (1965) 547-560, in the form of H. F. Walker and P. Ni,
 * "Anderson acceleration for fixed-point iterations", SIAM J. Numer.
 * Anal. 49 (2011) 1715-1735 (their type II, without damping): with the
 * differences of the last m iterates, dX, and of their corrections, dF,
 *
 *   gamma = argmin |f_k - dF gamma|,  x_(k+1) = x_k + f_k - (dX + dF) gamma.
 *
 * On a linear iteration this is equivalent to GMRES on its residuals,
 * which is what makes it faster where the plain steps converge slowly
 * (here the global, elliptic adjustment of a subsonic region). It changes
 * only the path: a fixed point of the accelerated iteration has f = 0,
 * the steady state of the scheme. The least-squares problem is solved by
 * modified Gram-Schmidt, dropping the oldest differences while the
 * columns are close to dependent.
 */
export class AndersonMixing {
  private readonly dx: Float64Array[] = [];
  private readonly df: Float64Array[] = [];
  private lastX: Float64Array | null = null;
  private lastF: Float64Array | null = null;

  constructor(
    readonly size: number,
    /** Differences kept (m). */
    readonly depth: number,
  ) {
    if (!(Number.isInteger(depth) && depth >= 1)) throw new RangeError('depth must be at least 1');
  }

  /** Forget the history (after a step that had to be rejected). */
  reset(): void {
    this.dx.length = 0;
    this.df.length = 0;
    this.lastX = null;
    this.lastF = null;
  }

  /** The next iterate from the current one, x, and its correction f (both left unchanged). */
  next(x: Float64Array, f: Float64Array): Float64Array {
    const n = this.size;
    if (x.length !== n || f.length !== n) throw new RangeError('wrong vector size');
    if (this.lastX !== null && this.lastF !== null) {
      const dx = new Float64Array(n);
      const df = new Float64Array(n);
      for (let k = 0; k < n; k++) {
        dx[k] = x[k]! - this.lastX[k]!;
        df[k] = f[k]! - this.lastF[k]!;
      }
      this.dx.push(dx);
      this.df.push(df);
      if (this.dx.length > this.depth) {
        this.dx.shift();
        this.df.shift();
      }
    }
    this.lastX = Float64Array.from(x);
    this.lastF = Float64Array.from(f);
    const out = new Float64Array(n);
    for (let k = 0; k < n; k++) out[k] = x[k]! + f[k]!;
    const gamma = this.leastSquares(f);
    for (let c = 0; c < gamma.length; c++) {
      const g = gamma[c]!;
      if (g === 0) continue;
      const dx = this.dx[c]!;
      const df = this.df[c]!;
      for (let k = 0; k < n; k++) out[k] = out[k]! - g * (dx[k]! + df[k]!);
    }
    return out;
  }

  /** gamma minimising |f - dF gamma|, by modified Gram-Schmidt (zeros for dropped columns). */
  private leastSquares(f: Float64Array): Float64Array {
    const m = this.df.length;
    const gamma = new Float64Array(m);
    if (m === 0) return gamma;
    const n = this.size;
    // Drop the oldest columns until the newest ones are well conditioned.
    for (let first = 0; first < m; first++) {
      const cols = m - first;
      const q: Float64Array[] = [];
      const r = new Float64Array(cols * cols);
      let ok = true;
      for (let c = 0; c < cols; c++) {
        const v = Float64Array.from(this.df[first + c]!);
        const norm0 = Math.sqrt(dot(v, v, n));
        for (let p = 0; p < c; p++) {
          const proj = dot(q[p]!, v, n);
          r[p * cols + c] = proj;
          const qp = q[p]!;
          for (let k = 0; k < n; k++) v[k] = v[k]! - proj * qp[k]!;
        }
        const norm = Math.sqrt(dot(v, v, n));
        if (!(norm > 1e-10 * norm0) || norm0 === 0) {
          ok = false;
          break;
        }
        r[c * cols + c] = norm;
        for (let k = 0; k < n; k++) v[k] = v[k]! / norm;
        q.push(v);
      }
      if (!ok) continue;
      // Solve R g = Q^T f.
      const rhs = q.map((qc) => dot(qc, f, n));
      for (let c = cols - 1; c >= 0; c--) {
        let s = rhs[c]!;
        for (let p = c + 1; p < cols; p++) s -= r[c * cols + p]! * gamma[first + p]!;
        gamma[first + c] = s / r[c * cols + c]!;
      }
      return gamma;
    }
    return gamma;
  }
}

function dot(a: Float64Array, b: Float64Array, n: number): number {
  let s = 0;
  for (let k = 0; k < n; k++) s += a[k]! * b[k]!;
  return s;
}
