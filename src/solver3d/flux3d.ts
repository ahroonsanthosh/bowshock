/**
 * The 3D engine's face flux and reconstruction (docs/design/0021-3d-euler-fins.md
 * section 3.2): the 2D kernels' HLLC with Einfeldt's speeds (src/scheme/flux.ts)
 * with a second tangential velocity carried with the contact as the first is,
 * and the scaled shared van Albada factor (src/scheme/reconstruction.ts) with
 * a fifth difference, dw / a. With w = 0 both reduce to the 2D ones (to
 * round-off for the flux, exactly for the factor, whose fifth term is then 0
 * and is added last).
 *
 * Velocities are components in an orthonormal basis (for the cylindrical
 * engine, (e_x, e_r, e_theta) at the face); the normal is a unit vector in the
 * same basis.
 */

import { VAN_ALBADA_EPSILON } from '../scheme/limiters';

export interface Primitive3D {
  readonly rho: number;
  readonly u: number;
  readonly v: number;
  readonly w: number;
  readonly p: number;
}

/** Total energy per unit volume. */
export function totalEnergy3D(q: Primitive3D, gamma: number): number {
  return q.p / (gamma - 1) + 0.5 * q.rho * (q.u * q.u + q.v * q.v + q.w * q.w);
}

/** Physical flux of one state through a unit normal: [mass, momentum (3), energy]. */
export function physicalFlux3D(
  q: Primitive3D,
  nx: number,
  ny: number,
  nz: number,
  gamma: number,
  out: Float64Array,
): void {
  const un = q.u * nx + q.v * ny + q.w * nz;
  const mass = q.rho * un;
  out[0] = mass;
  out[1] = mass * q.u + q.p * nx;
  out[2] = mass * q.v + q.p * ny;
  out[3] = mass * q.w + q.p * nz;
  out[4] = un * (totalEnergy3D(q, gamma) + q.p);
}

/**
 * HLLC (Toro, Spruce and Speares; Batten et al.'s contact speed) with Einfeldt's speeds, the tangential
 * kinetic energy in the Roe sound speed, as hllcFaceFlux in src/scheme/flux.ts. Flux per unit area along the
 * unit normal (nx, ny, nz), written as [mass, momentum (3), energy].
 */
export function hllc3D(
  left: Primitive3D,
  right: Primitive3D,
  nx: number,
  ny: number,
  nz: number,
  gamma: number,
  out: Float64Array,
): void {
  const unL = left.u * nx + left.v * ny + left.w * nz;
  const unR = right.u * nx + right.v * ny + right.w * nz;
  const qL = left.u * left.u + left.v * left.v + left.w * left.w;
  const qR = right.u * right.u + right.v * right.v + right.w * right.w;
  const energyL = left.p / (gamma - 1) + 0.5 * left.rho * qL;
  const energyR = right.p / (gamma - 1) + 0.5 * right.rho * qR;
  const aL = Math.sqrt((gamma * left.p) / left.rho);
  const aR = Math.sqrt((gamma * right.p) / right.rho);
  const wL = Math.sqrt(left.rho);
  const wR = Math.sqrt(right.rho);
  const uRoe = (wL * left.u + wR * right.u) / (wL + wR);
  const vRoe = (wL * left.v + wR * right.v) / (wL + wR);
  const zRoe = (wL * left.w + wR * right.w) / (wL + wR);
  const unRoe = (wL * unL + wR * unR) / (wL + wR);
  const hL = (energyL + left.p) / left.rho;
  const hR = (energyR + right.p) / right.rho;
  const hRoe = (wL * hL + wR * hR) / (wL + wR);
  const aRoe = Math.sqrt(
    Math.max((gamma - 1) * (hRoe - 0.5 * (uRoe * uRoe + vRoe * vRoe + zRoe * zRoe)), 0),
  );
  const sL = Math.min(unL - aL, unRoe - aRoe);
  const sR = Math.max(unR + aR, unRoe + aRoe);
  if (sL >= 0) {
    physicalFlux3D(left, nx, ny, nz, gamma, out);
    return;
  }
  if (sR <= 0) {
    physicalFlux3D(right, nx, ny, nz, gamma, out);
    return;
  }
  const mL = left.rho * (sL - unL);
  const mR = right.rho * (sR - unR);
  const sStar = (right.p - left.p + unL * mL - unR * mR) / (mL - mR);
  const useLeft = sStar >= 0;
  const side = useLeft ? left : right;
  const sK = useLeft ? sL : sR;
  const unK = useLeft ? unL : unR;
  const energyK = useLeft ? energyL : energyR;
  const starRho = (side.rho * (sK - unK)) / (sK - sStar);
  const starEnergy =
    starRho * (energyK / side.rho + (sStar - unK) * (sStar + side.p / (side.rho * (sK - unK))));
  const mass = side.rho * unK;
  // U* momentum: starRho (S* n + V_t), V_t = V - un n; F_K momentum: mass V + p n.
  const dRho = starRho - side.rho;
  const normalMomentum = mass * unK + side.p + sK * (starRho * sStar - mass);
  // Tangential parts carried with the contact: mass V_t + sK (starRho - rho) V_t.
  const tx = side.u - unK * nx;
  const ty = side.v - unK * ny;
  const tz = side.w - unK * nz;
  const tangential = mass + sK * dRho;
  out[0] = mass + sK * dRho;
  out[1] = normalMomentum * nx + tangential * tx;
  out[2] = normalMomentum * ny + tangential * ty;
  out[3] = normalMomentum * nz + tangential * tz;
  out[4] = unK * (energyK + side.p) + sK * (starEnergy - energyK);
}

/**
 * The scaled shared factor (src/scheme/reconstruction.ts, sharedScaledFactor), the differences of (rho, u, v,
 * p, w) made dimensionless by the smallest density and pressure of the three cells; the w term added last.
 */
export function sharedScaledFactor3D(
  prev: Primitive3D,
  centre: Primitive3D,
  next: Primitive3D,
  gamma: number,
): number {
  const rho = Math.min(prev.rho, centre.rho, next.rho);
  const sRho = 1 / rho;
  const rhoA2 = gamma * Math.min(prev.p, centre.p, next.p);
  const sU = Math.sqrt(rho / rhoA2);
  const sP = 1 / rhoA2;
  const aRho = (centre.rho - prev.rho) * sRho;
  const aU = (centre.u - prev.u) * sU;
  const aV = (centre.v - prev.v) * sU;
  const aP = (centre.p - prev.p) * sP;
  const aW = (centre.w - prev.w) * sU;
  const bRho = (next.rho - centre.rho) * sRho;
  const bU = (next.u - centre.u) * sU;
  const bV = (next.v - centre.v) * sU;
  const bP = (next.p - centre.p) * sP;
  const bW = (next.w - centre.w) * sU;
  const ab = aRho * bRho + aU * bU + aV * bV + aP * bP + aW * bW;
  const aa = aRho * aRho + aU * aU + aV * aV + aP * aP + aW * aW;
  const bb = bRho * bRho + bU * bU + bV * bV + bP * bP + bW * bW;
  const eps = VAN_ALBADA_EPSILON;
  return Math.max(0, (2 * (ab + eps)) / (aa + bb + 2 * eps));
}

/** The centre cell's state at its +1 or -1 face: q_c +/- factor (q_next - q_prev) / 4. */
export function reconstruct3D(
  prev: Primitive3D,
  centre: Primitive3D,
  next: Primitive3D,
  side: 1 | -1,
  gamma: number,
): Primitive3D {
  const k = 0.25 * side * sharedScaledFactor3D(prev, centre, next, gamma);
  return {
    rho: centre.rho + k * (next.rho - prev.rho),
    u: centre.u + k * (next.u - prev.u),
    v: centre.v + k * (next.v - prev.v),
    w: centre.w + k * (next.w - prev.w),
    p: centre.p + k * (next.p - prev.p),
  };
}

/**
 * reconstruct3D on packed primitives (rho, u, v, w, p at q, q + 1, ...): the same arithmetic, written into
 * out[0..4]; for the engine's inner loop, which allocates nothing.
 */
export function reconstructPacked(
  P: Float64Array,
  qPrev: number,
  qC: number,
  qNext: number,
  side: 1 | -1,
  gamma: number,
  out: Float64Array,
): void {
  const rho = Math.min(P[qPrev]!, P[qC]!, P[qNext]!);
  const sRho = 1 / rho;
  const rhoA2 = gamma * Math.min(P[qPrev + 4]!, P[qC + 4]!, P[qNext + 4]!);
  const sU = Math.sqrt(rho / rhoA2);
  const sP = 1 / rhoA2;
  const aRho = (P[qC]! - P[qPrev]!) * sRho;
  const aU = (P[qC + 1]! - P[qPrev + 1]!) * sU;
  const aV = (P[qC + 2]! - P[qPrev + 2]!) * sU;
  const aP = (P[qC + 4]! - P[qPrev + 4]!) * sP;
  const aW = (P[qC + 3]! - P[qPrev + 3]!) * sU;
  const bRho = (P[qNext]! - P[qC]!) * sRho;
  const bU = (P[qNext + 1]! - P[qC + 1]!) * sU;
  const bV = (P[qNext + 2]! - P[qC + 2]!) * sU;
  const bP = (P[qNext + 4]! - P[qC + 4]!) * sP;
  const bW = (P[qNext + 3]! - P[qC + 3]!) * sU;
  const ab = aRho * bRho + aU * bU + aV * bV + aP * bP + aW * bW;
  const aa = aRho * aRho + aU * aU + aV * aV + aP * aP + aW * aW;
  const bb = bRho * bRho + bU * bU + bV * bV + bP * bP + bW * bW;
  const eps = VAN_ALBADA_EPSILON;
  const k = 0.25 * side * Math.max(0, (2 * (ab + eps)) / (aa + bb + 2 * eps));
  for (let n = 0; n < 5; n++) out[n] = P[qC + n]! + k * (P[qNext + n]! - P[qPrev + n]!);
}

/** hllc3D on packed states l[0..4], r[0..4] (rho, u, v, w, p): the same arithmetic. */
export function hllc3DPacked(
  l: Float64Array,
  r: Float64Array,
  nx: number,
  ny: number,
  nz: number,
  gamma: number,
  out: Float64Array,
): void {
  hllc3D(
    { rho: l[0]!, u: l[1]!, v: l[2]!, w: l[3]!, p: l[4]! },
    { rho: r[0]!, u: r[1]!, v: r[2]!, w: r[3]!, p: r[4]! },
    nx,
    ny,
    nz,
    gamma,
    out,
  );
}
