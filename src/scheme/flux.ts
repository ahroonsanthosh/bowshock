/**
 * Numerical fluxes for the Euler equations.
 *
 * Every flux is written once, in the frame of a cell face: the velocity is
 * split into the component normal to the face (un) and the tangential
 * component (ut), and the flux returned is [mass, normal momentum,
 * tangential momentum, energy] per unit face area. Two-dimensional solvers
 * rotate states into this frame and the result back (faceFlux2D); the
 * one-dimensional fluxes are the special case ut = 0.
 *
 * Fluxes write into `out` instead of allocating, because they are called
 * once per face per stage.
 */

import { soundSpeed, totalEnergy, type Primitive1D } from './gas';
import { sampleRiemann, solveStarRegion } from './riemann-exact';

/** A state in the frame of a face: normal and tangential velocity. */
export interface FaceState {
  readonly rho: number;
  readonly un: number;
  readonly ut: number;
  readonly p: number;
}

/** A flux in the face frame, written as [mass, normal mom., tangential mom., energy]. */
export type FaceFrameFlux = (
  left: FaceState,
  right: FaceState,
  gamma: number,
  out: Float64Array,
) => void;

function energyOf(w: FaceState, gamma: number): number {
  return w.p / (gamma - 1) + 0.5 * w.rho * (w.un * w.un + w.ut * w.ut);
}

/** Exact (physical) flux of a single state through the face. */
export function physicalFaceFlux(w: FaceState, gamma: number, out: Float64Array): void {
  const mass = w.rho * w.un;
  out[0] = mass;
  out[1] = mass * w.un + w.p;
  out[2] = mass * w.ut;
  out[3] = w.un * (energyOf(w, gamma) + w.p);
}

/**
 * Rusanov (local Lax-Friedrichs) flux:
 * F = (F(U_L) + F(U_R)) / 2 - s_max (U_R - U_L) / 2, with s_max the largest
 * signal speed |un| + a of the two states.
 *
 * Very robust and very diffusive. Kept as a simple, trustworthy reference
 * for debugging, not for production results.
 */
export function rusanovFaceFlux(
  left: FaceState,
  right: FaceState,
  gamma: number,
  out: Float64Array,
): void {
  const sMax = Math.max(
    Math.abs(left.un) + soundSpeed(left.rho, left.p, gamma),
    Math.abs(right.un) + soundSpeed(right.rho, right.p, gamma),
  );
  const energyL = energyOf(left, gamma);
  const energyR = energyOf(right, gamma);
  const massL = left.rho * left.un;
  const massR = right.rho * right.un;
  out[0] = 0.5 * (massL + massR) - 0.5 * sMax * (right.rho - left.rho);
  out[1] =
    0.5 * (massL * left.un + left.p + massR * right.un + right.p) - 0.5 * sMax * (massR - massL);
  out[2] =
    0.5 * (massL * left.ut + massR * right.ut) -
    0.5 * sMax * (right.rho * right.ut - left.rho * left.ut);
  out[3] =
    0.5 * (left.un * (energyL + left.p) + right.un * (energyR + right.p)) -
    0.5 * sMax * (energyR - energyL);
}

/**
 * HLLC approximate Riemann solver (E. F. Toro, M. Spruce and W. Speares,
 * "Restoration of the contact surface in the HLL-Riemann solver", Shock
 * Waves 4, 1994; also Toro's book, 3rd ed., chapter 10). The contact speed
 * and the use of Einfeldt's wave speeds follow P. Batten, N. Clarke,
 * C. Lambert and D. M. Causon, "On the choice of wavespeeds for the HLLC
 * Riemann solver", SIAM J. Sci. Comput. 18(6), 1997.
 *
 * The Riemann fan is approximated by three waves: S_L, the contact speed S*
 * and S_R. Unlike HLL, HLLC resolves an isolated contact or shear wave
 * exactly (the tangential velocity jumps only across the contact), which
 * matters for boundary layers and wakes.
 *
 * S_L and S_R follow B. Einfeldt, "On Godunov-type methods for gas
 * dynamics", SIAM J. Numer. Anal. 25(2), 1988: the extreme of each state's
 * own characteristic speed and the Roe-averaged one. The Roe-averaged sound
 * speed uses the full kinetic energy, tangential part included.
 */
export function hllcFaceFlux(
  left: FaceState,
  right: FaceState,
  gamma: number,
  out: Float64Array,
): void {
  const aL = soundSpeed(left.rho, left.p, gamma);
  const aR = soundSpeed(right.rho, right.p, gamma);
  const energyL = energyOf(left, gamma);
  const energyR = energyOf(right, gamma);

  // Roe averages, weighted by the square root of density.
  const wL = Math.sqrt(left.rho);
  const wR = Math.sqrt(right.rho);
  const unRoe = (wL * left.un + wR * right.un) / (wL + wR);
  const utRoe = (wL * left.ut + wR * right.ut) / (wL + wR);
  const hL = (energyL + left.p) / left.rho;
  const hR = (energyR + right.p) / right.rho;
  const hRoe = (wL * hL + wR * hR) / (wL + wR);
  const aRoe = Math.sqrt(Math.max((gamma - 1) * (hRoe - 0.5 * (unRoe * unRoe + utRoe * utRoe)), 0));
  const sL = Math.min(left.un - aL, unRoe - aRoe);
  const sR = Math.max(right.un + aR, unRoe + aRoe);

  if (sL >= 0) {
    physicalFaceFlux(left, gamma, out);
    return;
  }
  if (sR <= 0) {
    physicalFaceFlux(right, gamma, out);
    return;
  }

  // Contact wave speed from the jump conditions across S_L and S_R.
  const mL = left.rho * (sL - left.un);
  const mR = right.rho * (sR - right.un);
  const sStar = (right.p - left.p + left.un * mL - right.un * mR) / (mL - mR);

  // Flux on the side of the contact that contains the face (x/t = 0):
  // F*_K = F_K + S_K (U*_K - U_K), where U*_K has density `starRho`,
  // normal velocity S*, the tangential velocity of side K, and energy
  // `starEnergy`.
  const side = sStar >= 0 ? left : right;
  const sK = sStar >= 0 ? sL : sR;
  const energyK = sStar >= 0 ? energyL : energyR;
  const starRho = (side.rho * (sK - side.un)) / (sK - sStar);
  const starEnergy =
    starRho *
    (energyK / side.rho + (sStar - side.un) * (sStar + side.p / (side.rho * (sK - side.un))));

  const mass = side.rho * side.un;
  out[0] = mass + sK * (starRho - side.rho);
  out[1] = mass * side.un + side.p + sK * (starRho * sStar - mass);
  out[2] = mass * side.ut + sK * (starRho - side.rho) * side.ut;
  out[3] = side.un * (energyK + side.p) + sK * (starEnergy - energyK);
}

/**
 * Exact Godunov flux: the physical flux of the exact Riemann solution
 * sampled at the face (x/t = 0). The tangential velocity is that of the
 * side of the contact containing the face. Too slow for production but the
 * most accurate first-order flux possible, so it serves as the reference
 * that the approximate fluxes are tested against.
 */
export function godunovFaceFlux(
  left: FaceState,
  right: FaceState,
  gamma: number,
  out: Float64Array,
): void {
  const l = { rho: left.rho, u: left.un, p: left.p };
  const r = { rho: right.rho, u: right.un, p: right.p };
  const star = solveStarRegion(l, r, gamma);
  const w = sampleRiemann(l, r, star, 0, gamma);
  const ut = star.uStar >= 0 ? left.ut : right.ut;
  physicalFaceFlux({ rho: w.rho, un: w.u, ut, p: w.p }, gamma, out);
}

export const FACE_FLUXES = {
  hllc: hllcFaceFlux,
  rusanov: rusanovFaceFlux,
  godunov: godunovFaceFlux,
} as const satisfies Record<string, FaceFrameFlux>;
export type FluxName = keyof typeof FACE_FLUXES;

/** Two-dimensional primitive state. */
export interface Primitive2D {
  readonly rho: number;
  readonly u: number;
  readonly v: number;
  readonly p: number;
}

/**
 * Flux per unit area through a face with unit normal (nx, ny), written as
 * [mass, x momentum, y momentum, energy]. The tangent is (-ny, nx).
 */
export function faceFlux2D(
  flux: FaceFrameFlux,
  left: Primitive2D,
  right: Primitive2D,
  nx: number,
  ny: number,
  gamma: number,
  out: Float64Array,
): void {
  flux(
    { rho: left.rho, un: left.u * nx + left.v * ny, ut: -left.u * ny + left.v * nx, p: left.p },
    {
      rho: right.rho,
      un: right.u * nx + right.v * ny,
      ut: -right.u * ny + right.v * nx,
      p: right.p,
    },
    gamma,
    out,
  );
  const normal = out[1]!;
  const tangential = out[2]!;
  out[1] = normal * nx - tangential * ny;
  out[2] = normal * ny + tangential * nx;
}

// One-dimensional fluxes: the face-frame fluxes with no tangential velocity,
// returning [mass, momentum, energy].

export type FluxFunction = (
  left: Primitive1D,
  right: Primitive1D,
  gamma: number,
  out: Float64Array,
) => void;

/** Scratch for the 1D wrappers, which drop the (zero) tangential component. */
const faceFrameScratch = new Float64Array(4);

function oneDimensional(flux: FaceFrameFlux): FluxFunction {
  return (left, right, gamma, out) => {
    flux(
      { rho: left.rho, un: left.u, ut: 0, p: left.p },
      { rho: right.rho, un: right.u, ut: 0, p: right.p },
      gamma,
      faceFrameScratch,
    );
    out[0] = faceFrameScratch[0]!;
    out[1] = faceFrameScratch[1]!;
    out[2] = faceFrameScratch[3]!;
  };
}

/** Exact (physical) 1D Euler flux F(U) of a single state. */
export function physicalFlux(w: Primitive1D, gamma: number, out: Float64Array): void {
  const energy = totalEnergy(w.rho, w.u, w.p, gamma);
  out[0] = w.rho * w.u;
  out[1] = w.rho * w.u * w.u + w.p;
  out[2] = w.u * (energy + w.p);
}

export const hllcFlux = oneDimensional(hllcFaceFlux);
export const rusanovFlux = oneDimensional(rusanovFaceFlux);
export const godunovFlux = oneDimensional(godunovFaceFlux);

export const FLUXES = {
  hllc: hllcFlux,
  rusanov: rusanovFlux,
  godunov: godunovFlux,
} as const satisfies Record<FluxName, FluxFunction>;
