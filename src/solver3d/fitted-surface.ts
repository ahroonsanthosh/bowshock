/**
 * A fitted shock as one side of a 3D block (docs/design/0021-3d-euler-fins.md 3.4): 0006's boundary shock
 * fitting (src/solver/shock-fitting.ts, after G. Moretti and M. J. Abbett, and M. D. Salas) generalised from a
 * curve to a surface. On each face of the side, of outward unit normal n, the shock's speed W along n follows
 * from the one characteristic that reaches it from behind, the u_n + a wave,
 *
 *   p_s(W) + rho a u_n,s(W) = p_c + rho a u_n,c,
 *
 * with the cell's pressure and normal velocity extrapolated to the face from the two cells below it; the face
 * carries the physical flux of the post-shock state, which also fills the block's ghost cells there. The
 * upstream state is given per face (0021 2.5: the 2D field at the face's centroid, never the cell across the
 * face). Moving the nodes is the caller's (each geometry has its own lines).
 */

import type { Euler3D, Side3D } from './euler3d';
import { totalEnergy3D, type Primitive3D } from './flux3d';

export interface ShockState3D {
  readonly state: Primitive3D;
  /** Speed of the shock along n (outward, away from the block). */
  readonly speed: number;
  /** Normal velocity of the post-shock flow along n, in the lab frame. */
  readonly normalVelocity: number;
  /** The relative normal Mach number of the upstream flow (1: a Mach wave). */
  readonly mach: number;
}

/**
 * Rankine-Hugoniot state behind a shock of outward unit normal n that the upstream flow meets at relative
 * normal Mach number M >= 1; the tangential velocity is kept, and the shock moves at W = M a + q . n.
 */
export function shockState3D(
  free: Primitive3D,
  gamma: number,
  mach: number,
  n: readonly [number, number, number],
): ShockState3D {
  const a = Math.sqrt((gamma * free.p) / free.rho);
  const vn = free.u * n[0] + free.v * n[1] + free.w * n[2];
  const speed = mach * a + vn;
  const m2 = mach * mach;
  const densityRatio = ((gamma + 1) * m2) / ((gamma - 1) * m2 + 2);
  const pressureRatio = 1 + ((2 * gamma) / (gamma + 1)) * (m2 - 1);
  const normalVelocity = speed - (mach * a) / densityRatio;
  const dv = normalVelocity - vn;
  return {
    state: {
      rho: free.rho * densityRatio,
      u: free.u + dv * n[0],
      v: free.v + dv * n[1],
      w: free.w + dv * n[2],
      p: free.p * pressureRatio,
    },
    speed,
    normalVelocity,
    mach,
  };
}

/**
 * The shock consistent with the flow behind it: the root of the u_n + a compatibility relation, linearised
 * about the cell next to the face. Where no shock of normal Mach number above 1 satisfies it, a Mach wave.
 */
export function compatibleShock3D(
  free: Primitive3D,
  gamma: number,
  n: readonly [number, number, number],
  behind: { readonly rho: number; readonly a: number; readonly p: number; readonly un: number },
): ShockState3D {
  const impedance = behind.rho * behind.a;
  const target = behind.p + impedance * behind.un;
  const mismatch = (mach: number) => {
    const s = shockState3D(free, gamma, mach, n);
    return s.state.p + impedance * s.normalVelocity - target;
  };
  let mach = 1;
  if (mismatch(1) < 0) {
    let low = 1;
    let high = 2;
    while (mismatch(high) < 0) high *= 2;
    for (let k = 0; k < 100 && high - low > 1e-15 * high; k++) {
      const mid = 0.5 * (low + high);
      if (mismatch(mid) < 0) low = mid;
      else high = mid;
    }
    mach = 0.5 * (low + high);
  }
  return shockState3D(free, gamma, mach, n);
}

export interface FittedSide {
  /** Per face: the post-shock state, the shock's speed along n, n (outward unit normal), the face's area. */
  readonly states: Primitive3D[];
  readonly speeds: Float64Array;
  readonly normals: Float64Array;
  readonly areas: Float64Array;
  /** The relative normal Mach number of each face's shock. */
  readonly machs: Float64Array;
  /** The post-shock flux through each face, per unit area along the face's area vector (Euler3D.setFaceFluxes). */
  readonly fluxes: Float64Array;
}

/** The two cells behind face t of a side: (i, j, k) of the first and the second. */
function cellsBehind(
  e: Euler3D,
  side: Side3D,
  t: number,
): [[number, number, number], [number, number, number]] {
  const { ni, nj, nk } = e.metrics;
  if (side[0] === 'i') {
    const j = t % nj;
    const k = Math.floor(t / nj);
    return side === 'iMin'
      ? [
          [0, j, k],
          [1, j, k],
        ]
      : [
          [ni - 1, j, k],
          [ni - 2, j, k],
        ];
  }
  if (side[0] === 'j') {
    const i = t % ni;
    const k = Math.floor(t / ni);
    return side === 'jMin'
      ? [
          [i, 0, k],
          [i, 1, k],
        ]
      : [
          [i, nj - 1, k],
          [i, nj - 2, k],
        ];
  }
  const i = t % ni;
  const j = Math.floor(t / ni);
  return side === 'kMin'
    ? [
        [i, j, 0],
        [i, j, 1],
      ]
    : [
        [i, j, nk - 1],
        [i, j, nk - 2],
      ];
}

/**
 * The fitted shock on every face of a block's side for the block's current flow, the upstream state of face
 * t given by `upstream(t)`. Apply it with setFaceStates (both layers the post-shock state) and setFaceFluxes.
 */
export function fittedSide(
  e: Euler3D,
  side: Side3D,
  upstream: (t: number) => Primitive3D,
): FittedSide {
  const gamma = e.config.gamma;
  const n = e.boundaryFaceCount(side);
  const states: Primitive3D[] = [];
  const speeds = new Float64Array(n);
  const normals = new Float64Array(3 * n);
  const areas = new Float64Array(n);
  const machs = new Float64Array(n);
  const fluxes = new Float64Array(5 * n);
  const outward = side.endsWith('Max') ? 1 : -1;
  for (let t = 0; t < n; t++) {
    const s = e.sideFaceVector(side, t);
    const area = Math.hypot(s[0], s[1], s[2]);
    const nv: [number, number, number] = [
      (outward * s[0]) / area,
      (outward * s[1]) / area,
      (outward * s[2]) / area,
    ];
    const [a1, a2] = cellsBehind(e, side, t);
    const c1 = e.primitive(...a1);
    const c2 = e.primitive(...a2);
    const un1 = c1.u * nv[0] + c1.v * nv[1] + c1.w * nv[2];
    const un2 = c2.u * nv[0] + c2.v * nv[1] + c2.w * nv[2];
    const shock = compatibleShock3D(upstream(t), gamma, nv, {
      rho: c1.rho,
      a: Math.sqrt((gamma * c1.p) / c1.rho),
      p: 1.5 * c1.p - 0.5 * c2.p,
      un: 1.5 * un1 - 0.5 * un2,
    });
    const w = shock.state;
    states.push(w);
    speeds[t] = shock.speed;
    machs[t] = shock.mach;
    areas[t] = area;
    normals.set(nv, 3 * t);
    // The physical flux through the face, along the area vector's direction (outward for Max sides).
    const sx = s[0] / area;
    const sy = s[1] / area;
    const sz = s[2] / area;
    const un = w.u * sx + w.v * sy + w.w * sz;
    const energy = totalEnergy3D(w, gamma);
    fluxes[5 * t] = w.rho * un;
    fluxes[5 * t + 1] = w.rho * w.u * un + w.p * sx;
    fluxes[5 * t + 2] = w.rho * w.v * un + w.p * sy;
    fluxes[5 * t + 3] = w.rho * w.w * un + w.p * sz;
    fluxes[5 * t + 4] = un * (energy + w.p);
  }
  return { states, speeds, normals, areas, machs, fluxes };
}
