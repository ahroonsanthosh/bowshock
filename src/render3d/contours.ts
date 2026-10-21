/**
 * Iso-lines of the meridional field, by marching squares on the dual mesh
 * (src/render3d/field.ts), so that each line is exactly where the drawn
 * (bilinearly interpolated) field takes the level. Revolved about the axis
 * they are the 3D field's iso-surfaces, exactly: the 3D field is the
 * meridional field revolved.
 */

/**
 * A structured mesh of quads: `columns` by `rows` vertices, vertex (I, J)
 * at I + J columns, I along the body and J across (the dual mesh of
 * src/render3d/field.ts, or a finer resampling of it, ./resample.ts).
 */
export interface QuadGrid {
  readonly columns: number;
  readonly rows: number;
  readonly x: ArrayLike<number>;
  readonly r: ArrayLike<number>;
}

/** An iso-line: points in the meridional plane, with unit normals towards higher values. */
export interface IsoLine {
  readonly level: number;
  readonly x: number[];
  readonly r: number[];
  /** Unit normal per point, (nx, nr), pointing towards higher values. */
  readonly nx: number[];
  readonly nr: number[];
}

interface Crossing {
  readonly key: number;
  readonly x: number;
  readonly r: number;
}

/** The iso-lines of `values` (one per vertex) at `level`. */
export function isoLines(mesh: QuadGrid, values: ArrayLike<number>, level: number): IsoLine[] {
  const { columns, rows } = mesh;
  const count = columns * rows;
  const above = (k: number) => values[k]! >= level;
  const crossing = (a: number, b: number): Crossing => {
    const f = (level - values[a]!) / (values[b]! - values[a]!);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return {
      key: lo * count + hi,
      x: mesh.x[a]! + f * (mesh.x[b]! - mesh.x[a]!),
      r: mesh.r[a]! + f * (mesh.r[b]! - mesh.r[a]!),
    };
  };
  // Segments oriented with the higher values on their right (in the quad's
  // (s, t) frame), so that consecutive segments chain head to tail.
  const segments: [Crossing, Crossing][] = [];
  for (let J = 0; J + 1 < rows; J++) {
    for (let I = 0; I + 1 < columns; I++) {
      const a = I + J * columns;
      const q = [a, a + 1, a + 1 + columns, a + columns];
      const up = q.map(above);
      const ups = up.filter(Boolean).length;
      if (ups === 0 || ups === 4) continue;
      // Crossings on edges 0-1, 1-2, 2-3, 3-0: 'in' where the values rise
      // going round the quad, 'out' where they fall.
      const ins: { edge: number; c: Crossing }[] = [];
      const outs: { edge: number; c: Crossing }[] = [];
      for (let e = 0; e < 4; e++) {
        const a = q[e]!;
        const b = q[(e + 1) % 4]!;
        if (up[e] === up[(e + 1) % 4]) continue;
        (up[e] ? outs : ins).push({ edge: e, c: crossing(a, b) });
      }
      if (ins.length === 1) {
        segments.push([ins[0]!.c, outs[0]!.c]);
        continue;
      }
      // A saddle: the centre's value (the mean of the corners, the bilinear
      // field's value there) decides which corners connect.
      const centre = q.reduce((s, k) => s + values[k]!, 0) / 4;
      const centreUp = centre >= level;
      for (const i of ins) {
        // From an 'in' crossing, the low corner lies behind it; the segment
        // cutting off that low corner (centre high) goes to the 'out'
        // crossing on the previous edge, otherwise to the next.
        const target = centreUp ? (i.edge + 3) % 4 : (i.edge + 1) % 4;
        const o = outs.find((c) => c.edge === target)!;
        segments.push([i.c, o.c]);
      }
    }
  }
  return chain(segments, level);
}

function chain(segments: [Crossing, Crossing][], level: number): IsoLine[] {
  const byStart = new Map<number, number>();
  const byEnd = new Map<number, number>();
  segments.forEach(([a, b], k) => {
    byStart.set(a.key, k);
    byEnd.set(b.key, k);
  });
  const used = new Uint8Array(segments.length);
  const lines: IsoLine[] = [];
  for (let k0 = 0; k0 < segments.length; k0++) {
    if (used[k0]) continue;
    // Walk back to the start of this line (or round a closed loop).
    let first = k0;
    for (;;) {
      const prev = byEnd.get(segments[first]![0].key);
      if (prev === undefined || prev === k0 || used[prev]) break;
      first = prev;
    }
    const points: Crossing[] = [segments[first]![0]];
    let k: number | undefined = first;
    while (k !== undefined && !used[k]) {
      used[k] = 1;
      points.push(segments[k]![1]);
      k = byStart.get(segments[k]![1].key);
    }
    const line = withNormals(points, level);
    if (line.x.length >= 2) lines.push(line);
  }
  return lines;
}

function withNormals(all: Crossing[], level: number): IsoLine {
  // Without repeated points (a level met exactly at a vertex gives two
  // crossings there), so that each point has a direction.
  const points = all.filter(
    (p, k) =>
      k === 0 ||
      Math.hypot(p.x - all[k - 1]!.x, p.r - all[k - 1]!.r) >
        1e-14 * (1 + Math.abs(p.x) + Math.abs(p.r)),
  );
  const x = points.map((p) => p.x);
  const r = points.map((p) => p.r);
  const n = points.length;
  const nx: number[] = [];
  const nr: number[] = [];
  // Higher values lie to the right of the direction of travel in the
  // (s, t) frame, which the grids orient as (x, r): the right-hand normal
  // of a direction (dx, dr) is (dr, -dx).
  for (let k = 0; k < n; k++) {
    const a = Math.max(k - 1, 0);
    const b = Math.min(k + 1, n - 1);
    const dx = x[b]! - x[a]!;
    const dr = r[b]! - r[a]!;
    const len = Math.hypot(dx, dr) || 1;
    nx.push(dr / len);
    nr.push(-dx / len);
  }
  return { level, x, r, nx, nr };
}

/**
 * Round levels between lo and hi: `count` or so, at a step of 1, 2 or 5
 * times a power of ten, none at the ends.
 */
export function niceLevels(lo: number, hi: number, count: number): number[] {
  if (!(hi > lo)) return [];
  const raw = (hi - lo) / (count + 1);
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power;
  const levels: number[] = [];
  for (let v = Math.ceil(lo / step + 1e-9) * step; v < hi - 1e-9 * step; v += step) {
    levels.push(Number(v.toFixed(12)));
  }
  return levels;
}

/**
 * The line with fewer points: those within `tolerance` of the chord
 * between the points kept are dropped (Ramer-Douglas-Peucker), the ends
 * kept; normals as before at the points kept.
 */
export function simplifyLine(line: IsoLine, tolerance: number): IsoLine {
  const n = line.x.length;
  if (n <= 2) return line;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    const dx = line.x[b]! - line.x[a]!;
    const dr = line.r[b]! - line.r[a]!;
    const len = Math.hypot(dx, dr);
    let worst = -1;
    let far = 0;
    for (let k = a + 1; k < b; k++) {
      const ex = line.x[k]! - line.x[a]!;
      const er = line.r[k]! - line.r[a]!;
      const d = len > 0 ? Math.abs(ex * dr - er * dx) / len : Math.hypot(ex, er);
      if (d > far) {
        far = d;
        worst = k;
      }
    }
    if (worst >= 0 && far > tolerance) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  const idx: number[] = [];
  keep.forEach((k, i) => {
    if (k) idx.push(i);
  });
  return {
    level: line.level,
    x: idx.map((i) => line.x[i]!),
    r: idx.map((i) => line.r[i]!),
    nx: idx.map((i) => line.nx[i]!),
    nr: idx.map((i) => line.nr[i]!),
  };
}
