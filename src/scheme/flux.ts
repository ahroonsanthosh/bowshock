/**
 * Numerical flux functions for the one-dimensional Euler equations.
 *
 * A numerical flux takes the left and right states at a cell face and
 * returns the flux of mass, momentum and energy through that face. The
 * multi-dimensional solvers reuse these by rotating velocities into the
 * face-normal frame, so the 1D functions are the building block of the
 * whole solver.
 *
 * Every flux writes its result into `out` = [mass, momentum, energy]
 * instead of allocating, because it is called once per face per stage.
 */

import { soundSpeed, totalEnergy, type Primitive1D } from './gas';
import { sampleRiemann, solveStarRegion } from './riemann-exact';

export type FluxFunction = (
  left: Primitive1D,
  right: Primitive1D,
  gamma: number,
  out: Float64Array,
) => void;

/** Exact (physical) Euler flux F(U) of a single state. */
export function physicalFlux(w: Primitive1D, gamma: number, out: Float64Array): void {
  const energy = totalEnergy(w.rho, w.u, w.p, gamma);
  out[0] = w.rho * w.u;
  out[1] = w.rho * w.u * w.u + w.p;
  out[2] = w.u * (energy + w.p);
}

/**
 * Rusanov (local Lax-Friedrichs) flux:
 * F = (F(U_L) + F(U_R)) / 2 - s_max (U_R - U_L) / 2, with s_max the largest
 * signal speed |u| + a of the two states.
 *
 * Very robust and very diffusive. Kept as a simple, trustworthy reference
 * for debugging, not for production results.
 */
export function rusanovFlux(
  left: Primitive1D,
  right: Primitive1D,
  gamma: number,
  out: Float64Array,
): void {
  const sMax = Math.max(
    Math.abs(left.u) + soundSpeed(left.rho, left.p, gamma),
    Math.abs(right.u) + soundSpeed(right.rho, right.p, gamma),
  );
  const fL = scratchL;
  const fR = scratchR;
  physicalFlux(left, gamma, fL);
  physicalFlux(right, gamma, fR);
  const dRho = right.rho - left.rho;
  const dMom = right.rho * right.u - left.rho * left.u;
  const dEnergy =
    totalEnergy(right.rho, right.u, right.p, gamma) - totalEnergy(left.rho, left.u, left.p, gamma);
  out[0] = 0.5 * (fL[0]! + fR[0]!) - 0.5 * sMax * dRho;
  out[1] = 0.5 * (fL[1]! + fR[1]!) - 0.5 * sMax * dMom;
  out[2] = 0.5 * (fL[2]! + fR[2]!) - 0.5 * sMax * dEnergy;
}

/**
 * Wave-speed estimates S_L, S_R bounding the Riemann fan, after Einfeldt
 * (B. Einfeldt, "On Godunov-type methods for gas dynamics", SIAM J. Numer.
 * Anal. 25(2), 1988): the extreme of each state's own characteristic speed
 * and the Roe-averaged characteristic speed.
 */
export function einfeldtWaveSpeeds(
  left: Primitive1D,
  right: Primitive1D,
  gamma: number,
): { readonly sL: number; readonly sR: number } {
  const aL = soundSpeed(left.rho, left.p, gamma);
  const aR = soundSpeed(right.rho, right.p, gamma);
  // Roe averages, weighted by the square root of density.
  const wL = Math.sqrt(left.rho);
  const wR = Math.sqrt(right.rho);
  const hL = (totalEnergy(left.rho, left.u, left.p, gamma) + left.p) / left.rho;
  const hR = (totalEnergy(right.rho, right.u, right.p, gamma) + right.p) / right.rho;
  const uRoe = (wL * left.u + wR * right.u) / (wL + wR);
  const hRoe = (wL * hL + wR * hR) / (wL + wR);
  const aRoe = Math.sqrt(Math.max((gamma - 1) * (hRoe - 0.5 * uRoe * uRoe), 0));
  return {
    sL: Math.min(left.u - aL, uRoe - aRoe),
    sR: Math.max(right.u + aR, uRoe + aRoe),
  };
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
 * exactly, which matters for boundary layers and wakes.
 */
export function hllcFlux(
  left: Primitive1D,
  right: Primitive1D,
  gamma: number,
  out: Float64Array,
): void {
  const { sL, sR } = einfeldtWaveSpeeds(left, right, gamma);

  if (sL >= 0) {
    physicalFlux(left, gamma, out);
    return;
  }
  if (sR <= 0) {
    physicalFlux(right, gamma, out);
    return;
  }

  // Contact wave speed from the jump conditions across S_L and S_R.
  const mL = left.rho * (sL - left.u);
  const mR = right.rho * (sR - right.u);
  const sStar = (right.p - left.p + left.u * mL - right.u * mR) / (mL - mR);

  // Flux on the side of the contact that contains the face (x/t = 0):
  // F*_K = F_K + S_K (U*_K - U_K).
  const side = sStar >= 0 ? left : right;
  const sK = sStar >= 0 ? sL : sR;
  const energyK = totalEnergy(side.rho, side.u, side.p, gamma);
  const factor = (side.rho * (sK - side.u)) / (sK - sStar);
  const starRho = factor;
  const starMom = factor * sStar;
  const starEnergy =
    factor *
    (energyK / side.rho + (sStar - side.u) * (sStar + side.p / (side.rho * (sK - side.u))));

  physicalFlux(side, gamma, out);
  out[0] = out[0]! + sK * (starRho - side.rho);
  out[1] = out[1]! + sK * (starMom - side.rho * side.u);
  out[2] = out[2]! + sK * (starEnergy - energyK);
}

/**
 * Exact Godunov flux: the physical flux of the exact Riemann solution
 * sampled at the face (x/t = 0). Too slow for production but the most
 * accurate first-order flux possible, so it serves as the reference that
 * the approximate fluxes are tested against.
 */
export function godunovFlux(
  left: Primitive1D,
  right: Primitive1D,
  gamma: number,
  out: Float64Array,
): void {
  const star = solveStarRegion(left, right, gamma);
  physicalFlux(sampleRiemann(left, right, star, 0, gamma), gamma, out);
}

const scratchL = new Float64Array(3);
const scratchR = new Float64Array(3);
