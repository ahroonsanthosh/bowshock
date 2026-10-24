/**
 * Node spacing for the 3D sector grids (docs/design/0021-3d-euler-fins.md 2.10): each segment between
 * breakpoints gets a count on L0 (a multiple of 8) and a distribution clustered at the ends asked for (a first
 * cell, growth at most 1.2 a cell, cells at most a cap); each level l multiplies every count by 1.5^l and
 * evaluates the same mapping, node position against the parameter i / n, at the finer parameters (a
 * monotone cubic through L0's nodes), so the families are systematic and do not nest.
 */

/** Largest growth from one cell to the next (2.10). */
export const GROWTH = 1.2;

/** Sizes of n cells covering `length`, growing from `first` at the clustered ends by at most GROWTH, capped at `cap`. */
function sizes(n: number, first: number, atStart: boolean, atEnd: boolean, top: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < n; c++) {
    const fromStart = atStart ? c : Infinity;
    const fromEnd = atEnd ? n - 1 - c : Infinity;
    const d = Math.min(fromStart, fromEnd);
    out.push(d === Infinity ? top : Math.min(top, first * GROWTH ** d));
  }
  return out;
}

/**
 * A segment's nodes (n + 1, from 0 to length): clustered at the ends asked for with the first cell `first`;
 * the plateau found so that the cells fill the length (growth at most GROWTH). If even uniform cells of the
 * first size are too long, the cells are uniform.
 */
export function clusteredNodes(
  length: number,
  n: number,
  first: number,
  atStart: boolean,
  atEnd: boolean,
): number[] {
  const total = (top: number) => sizes(n, first, atStart, atEnd, top).reduce((s, h) => s + h, 0);
  let cells: number[];
  if ((!atStart && !atEnd) || n * first >= length) {
    cells = Array.from({ length: n }, () => length / n);
  } else {
    let lo = first;
    let hi = length;
    if (total(hi) < length) {
      // Cannot fill at this growth: the caller's count is too small; stretch every cell in proportion.
      const s = sizes(n, first, atStart, atEnd, hi);
      const sum = s.reduce((a, b) => a + b, 0);
      cells = s.map((h) => (h * length) / sum);
    } else {
      for (let it = 0; it < 200; it++) {
        const mid = 0.5 * (lo + hi);
        if (total(mid) < length) lo = mid;
        else hi = mid;
      }
      const s = sizes(n, first, atStart, atEnd, hi);
      const sum = s.reduce((a, b) => a + b, 0);
      cells = s.map((h) => (h * length) / sum);
    }
  }
  const nodes = [0];
  for (const h of cells) nodes.push(nodes[nodes.length - 1]! + h);
  nodes[n] = length;
  return nodes;
}

/** The largest cell of a segment's clustered nodes. */
export function largestCell(nodes: readonly number[]): number {
  let m = 0;
  for (let i = 1; i < nodes.length; i++) m = Math.max(m, nodes[i]! - nodes[i - 1]!);
  return m;
}

/**
 * The smallest count, a multiple of 8, whose clustered cells are all at most `cap` (and grow by at most
 * GROWTH from `first`).
 */
export function countFor(
  length: number,
  first: number,
  atStart: boolean,
  atEnd: boolean,
  cap: number,
): number {
  for (let n = 8; n < 100_000; n += 8) {
    const nodes = clusteredNodes(length, n, first, atStart, atEnd);
    const growthOk = (() => {
      for (let i = 2; i < nodes.length; i++) {
        const a = nodes[i - 1]! - nodes[i - 2]!;
        const b = nodes[i]! - nodes[i - 1]!;
        if (Math.max(a / b, b / a) > GROWTH * (1 + 1e-9)) return false;
      }
      return true;
    })();
    const firstOk =
      (!atStart || nodes[1]! - nodes[0]! <= first * (1 + 1e-9)) &&
      (!atEnd || nodes[n]! - nodes[n - 1]! <= first * (1 + 1e-9));
    if (largestCell(nodes) <= cap * (1 + 1e-12) && growthOk && firstOk) return n;
  }
  throw new RangeError('no count fits the segment');
}

/**
 * The positions of L0's nodes as a monotone cubic (Fritsch and Carlson) in the parameter s = i / n0, evaluated at
 * n0 1.5^level cells: the same mapping at a finer spacing of its parameter.
 */
export function atLevel(nodes0: readonly number[], level: number): number[] {
  const n0 = nodes0.length - 1;
  const n = Math.round(n0 * 1.5 ** level);
  if (Math.abs(n - n0 * 1.5 ** level) > 1e-9)
    throw new RangeError('the count on L0 must make every level whole');
  if (level === 0) return [...nodes0];
  const h = 1 / n0;
  const delta = Array.from({ length: n0 }, (_, i) => (nodes0[i + 1]! - nodes0[i]!) / h);
  const m = new Array<number>(n0 + 1);
  m[0] = delta[0]!;
  m[n0] = delta[n0 - 1]!;
  for (let i = 1; i < n0; i++) {
    const a = delta[i - 1]!;
    const b = delta[i]!;
    m[i] = a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  }
  const out: number[] = [];
  for (let q = 0; q <= n; q++) {
    const s = q / n;
    const i = Math.min(n0 - 1, Math.floor(s * n0));
    const t = (s - i * h) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    out.push(
      (2 * t3 - 3 * t2 + 1) * nodes0[i]! +
        (t3 - 2 * t2 + t) * h * m[i]! +
        (-2 * t3 + 3 * t2) * nodes0[i + 1]! +
        (t3 - t2) * h * m[i + 1]!,
    );
  }
  out[0] = nodes0[0]!;
  out[n] = nodes0[n0]!;
  return out;
}

/** x in (0, inf) with sinh(x) / x = b (b > 1), by Newton from a safe start. */
function sinhInverse(b: number): number {
  let x = b < 2.7829681 ? Math.sqrt(6 * (b - 1)) : Math.log(2 * b * Math.log(2 * b)) + 0.5;
  for (let it = 0; it < 100; it++) {
    const f = Math.sinh(x) / x - b;
    const d = Math.cosh(x) / x - Math.sinh(x) / (x * x);
    const nx = x - f / d;
    if (!(nx > 0)) x *= 0.5;
    else {
      if (Math.abs(nx - x) <= 1e-15 * x) return nx;
      x = nx;
    }
  }
  return x;
}

/** x in (0, pi) with sin(x) / x = b (0 < b < 1), by bisection. */
function sinInverse(b: number): number {
  let lo = 1e-12;
  let hi = Math.PI - 1e-12;
  for (let it = 0; it < 200; it++) {
    const mid = 0.5 * (lo + hi);
    if (Math.sin(mid) / mid > b) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/**
 * A segment's nodes (n + 1, from 0 to length) by Vinokur's stretching (M. Vinokur, "On one-dimensional
 * stretching functions for finite-difference calculations", J. Comput. Phys. 50 (1983) 215): the first and
 * last cells close to the spacings asked for (null: free), so that neighbouring segments meet with matching
 * cells at their common breakpoint.
 */
export function stretchedNodes(
  length: number,
  n: number,
  hStartAsked: number | null,
  hEndAsked: number | null,
): number[] {
  // An end spacing above the mean cell would squeeze the middle: the segment is then over-resolved, and the
  // ends take the mean cell (no clustering).
  const mean = length / n;
  const hStart = hStartAsked === null ? null : Math.min(hStartAsked, mean);
  const hEnd = hEndAsked === null ? null : Math.min(hEndAsked, mean);
  const out: number[] = [];
  if (hStart === null && hEnd === null) {
    for (let i = 0; i <= n; i++) out.push((length * i) / n);
    return out;
  }
  if (hStart !== null && hEnd !== null) {
    const s0 = length / (n * hStart);
    const s1 = length / (n * hEnd);
    const b = Math.sqrt(s0 * s1);
    const a = Math.sqrt(s0 / s1);
    for (let i = 0; i <= n; i++) {
      const xi = i / n;
      let u: number;
      if (b > 1.001) {
        const dy = sinhInverse(b);
        u = 0.5 * (1 + Math.tanh(dy * (xi - 0.5)) / Math.tanh(dy / 2));
      } else if (b < 0.999) {
        const dy = sinInverse(b);
        u = 0.5 * (1 + Math.tan(dy * (xi - 0.5)) / Math.tan(dy / 2));
      } else u = xi * (1 + 2 * (b - 1) * (xi - 0.5) * (1 - xi));
      out.push((length * u) / (a + (1 - a) * u));
    }
  } else {
    // One-sided, clustered at the start (or, mirrored, at the end).
    const h = (hStart ?? hEnd)!;
    const b = length / (n * h);
    for (let i = 0; i <= n; i++) {
      const xi = hStart !== null ? i / n : 1 - i / n;
      let u: number;
      // The end slope of 1 + tanh(dy (xi - 1)) / tanh(dy) is 2 dy / sinh(2 dy) (sin for tan).
      if (b > 1.001) {
        const dy = sinhInverse(b) / 2;
        u = 1 + Math.tanh(dy * (xi - 1)) / Math.tanh(dy);
      } else if (b < 0.999) {
        const dy = sinInverse(b) / 2;
        u = 1 + Math.tan(dy * (xi - 1)) / Math.tan(dy);
      } else u = xi * (1 + (b - 1) * (1 - xi));
      out.push(hStart !== null ? length * u : length * (1 - u));
    }
  }
  out[0] = 0;
  out[n] = length;
  return out;
}

/** The smallest count, a multiple of 8, whose stretched cells grow by at most GROWTH and are at most `cap`. */
export function stretchedCount(
  length: number,
  hStart: number | null,
  hEnd: number | null,
  cap: number,
): number {
  for (let n = 8; n < 100_000; n += 8) {
    const nodes = stretchedNodes(length, n, hStart, hEnd);
    let ok = largestCell(nodes) <= cap * (1 + 1e-12);
    for (let i = 2; ok && i < nodes.length; i++) {
      const a = nodes[i - 1]! - nodes[i - 2]!;
      const b = nodes[i]! - nodes[i - 1]!;
      if (!(a > 0 && b > 0) || Math.max(a / b, b / a) > GROWTH * (1 + 1e-9)) ok = false;
    }
    if (ok) return n;
  }
  throw new RangeError('no count fits the segment');
}

/**
 * A segment's nodes with end spacings (null: free), by Vinokur's stretching (stretchedNodes), its asked end
 * spacings corrected (a few fixed-point passes) so that the first and last cells are those asked for: smooth in
 * the segment's length (rows of different lengths keep smooth column lines) and exact at the ends (neighbouring
 * segments meet with matching cells).
 */
export function segmentNodes(
  length: number,
  n: number,
  hStart: number | null,
  hEnd: number | null,
): number[] {
  const mean = length / n;
  const want0 = hStart === null ? null : Math.min(hStart, mean);
  const want1 = hEnd === null ? null : Math.min(hEnd, mean);
  let a0 = want0;
  let a1 = want1;
  let nodes = stretchedNodes(length, n, a0, a1);
  for (let it = 0; it < 30; it++) {
    const got0 = nodes[1]! - nodes[0]!;
    const got1 = nodes[n]! - nodes[n - 1]!;
    const off0 = want0 === null ? 0 : Math.abs(got0 / want0 - 1);
    const off1 = want1 === null ? 0 : Math.abs(got1 / want1 - 1);
    if (off0 < 1e-6 && off1 < 1e-6) break;
    if (want0 !== null && a0 !== null) a0 = Math.min(mean, a0 * (want0 / got0));
    if (want1 !== null && a1 !== null) a1 = Math.min(mean, a1 * (want1 / got1));
    nodes = stretchedNodes(length, n, a0, a1);
  }
  return nodes;
}

/** The smallest count, a multiple of 8, for segmentNodes: growth at most GROWTH, cells at most `cap`. */
export function segmentCount(
  length: number,
  hStart: number | null,
  hEnd: number | null,
  cap: number,
): number {
  for (let n = 8; n < 100_000; n += 8) {
    const nodes = segmentNodes(length, n, hStart, hEnd);
    let ok = largestCell(nodes) <= cap * (1 + 1e-12);
    for (let i = 2; ok && i < nodes.length; i++) {
      const a = nodes[i - 1]! - nodes[i - 2]!;
      const b = nodes[i]! - nodes[i - 1]!;
      if (!(a > 0 && b > 0) || Math.max(a / b, b / a) > GROWTH * (1 + 1e-9)) ok = false;
    }
    if (ok) return n;
  }
  throw new RangeError('no count fits the segment');
}
