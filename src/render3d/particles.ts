/**
 * Particles carried by the computed flow (key 8): points in the meridional
 * plane, each at an azimuth of its own, moved by the field's velocity
 * (sampled from the dual mesh, ./field.ts) as time passes, and drawn as
 * short streaks along their motion. Where a particle leaves the computed
 * region (at the base, or out through the shock, which no streamline does
 * from inside) it starts again at a random point inside it. The random
 * starting points are not part of the solution; the motion is.
 */

import { locate, quadPoint, quadVertices, sampleAt, type DualMesh, type Location } from './field';
import { LINE_FLOATS } from './geometry';

export class Particles {
  private readonly x: Float64Array;
  private readonly r: Float64Array;
  private readonly phi: Float64Array;
  private readonly at: (Location | null)[];
  private seed = 12345;

  constructor(
    private readonly mesh: DualMesh,
    readonly count: number,
    /** Azimuths they are spread over: from `phi0`, `span` radians. */
    private readonly phi0: number,
    private readonly span: number,
    /** Nothing beyond this x (the base). */
    private readonly xEnd: number,
  ) {
    this.x = new Float64Array(count);
    this.r = new Float64Array(count);
    this.phi = new Float64Array(count);
    this.at = new Array<Location | null>(count).fill(null);
    // Each dual quad's share of the region's volume (area times radius), cumulative.
    const quads = (mesh.ni + 1) * (mesh.nj + 1);
    this.cumulative = new Float64Array(quads);
    let sum = 0;
    for (let q = 0; q < quads; q++) {
      const I = q % (mesh.ni + 1);
      const J = Math.floor(q / (mesh.ni + 1));
      const [a, b, c, d] = quadVertices(mesh, I, J);
      const X = mesh.x;
      const R = mesh.r;
      const area =
        0.5 * Math.abs((X[c]! - X[a]!) * (R[d]! - R[b]!) - (X[d]! - X[b]!) * (R[c]! - R[a]!));
      sum += area * 0.25 * (R[a]! + R[b]! + R[c]! + R[d]!);
      this.cumulative[q] = sum;
    }
    for (let k = 0; k < count; k++) this.respawn(k);
  }

  private random(): number {
    // xorshift32: the same particles every time.
    let s = this.seed;
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    this.seed = s;
    return s / 4294967296;
  }

  private readonly cumulative: Float64Array;

  /**
   * A new start inside the computed region: a random point of a dual quad
   * picked by its share of the volume, so that the particles fill the
   * region evenly in 3D.
   */
  private respawn(k: number): void {
    const m = this.mesh;
    const total = this.cumulative[this.cumulative.length - 1]!;
    for (let tries = 0; tries < 20; tries++) {
      const target = this.random() * total;
      let lo = 0;
      let hi = this.cumulative.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (this.cumulative[mid]! < target) lo = mid + 1;
        else hi = mid;
      }
      const I = lo % (m.ni + 1);
      const J = Math.floor(lo / (m.ni + 1));
      const s = this.random();
      const t = this.random();
      const [x, r] = quadPoint(m, I, J, s, t);
      if (x > this.xEnd) continue;
      this.x[k] = x;
      this.r[k] = r;
      this.phi[k] = this.phi0 + this.random() * this.span;
      this.at[k] = { I, J, s, t };
      return;
    }
  }

  /** Move every particle by the flow over `dt` (in the field's length per its velocity unit). */
  advance(dt: number): void {
    const m = this.mesh;
    for (let k = 0; k < this.count; k++) {
      const here = this.at[k] ?? null;
      if (here === null) {
        this.respawn(k);
        continue;
      }
      const v0 = sampleAt(m, here);
      // Second order: the velocity half a step on.
      const xm = this.x[k]! + 0.5 * dt * v0.u;
      const rm = this.r[k]! + 0.5 * dt * v0.v;
      const mid = locate(m, xm, rm, here);
      if (mid === null) {
        this.respawn(k);
        continue;
      }
      const vm = sampleAt(m, mid);
      const x = this.x[k]! + dt * vm.u;
      const r = Math.abs(this.r[k]! + dt * vm.v);
      const next = x > this.xEnd ? null : locate(m, x, r, mid);
      if (next === null) {
        this.respawn(k);
        continue;
      }
      this.x[k] = x;
      this.r[k] = r;
      this.at[k] = next;
    }
  }

  /**
   * Streaks for ribbon.wgsl: from each particle back along its velocity
   * over `trail`, coloured by the quantity shown (`values` at the dual
   * mesh's vertices, interpolated as the velocity is), fading to its tail.
   */
  streaks(trail: number, values: ArrayLike<number>): Float32Array<ArrayBuffer> {
    const out = new Float32Array(this.count * LINE_FLOATS);
    for (let k = 0; k < this.count; k++) {
      const here = this.at[k] ?? null;
      if (here === null) continue;
      const q = sampleAt(this.mesh, here);
      const c = Math.cos(this.phi[k]!);
      const s = Math.sin(this.phi[k]!);
      const x = this.x[k]!;
      const r = this.r[k]!;
      const xt = x - trail * q.u;
      const rt = Math.max(r - trail * q.v, 0);
      const corners = quadVertices(this.mesh, here.I, here.J);
      const { s: a, t: b } = here;
      const value =
        (1 - a) * (1 - b) * values[corners[0]]! +
        a * (1 - b) * values[corners[1]]! +
        a * b * values[corners[2]]! +
        (1 - a) * b * values[corners[3]]!;
      out.set([xt, rt * c, rt * s, value, x, r * c, r * s, value, 0, 1, 0, 0], k * LINE_FLOATS);
    }
    return out;
  }
}
