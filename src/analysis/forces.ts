/**
 * Integrated forces on an axisymmetric body from the fluxes through its
 * wall faces.
 */

import type { BoundaryFaceFlux } from '../engine-cpu/euler2d';

/**
 * Pressure drag coefficient of the body surface ahead of the base:
 * C = 2 pi sum (p - p_inf) n_x A / (q_inf pi R^2) over the wall faces, A
 * being the area per radian and n the outward normal of the flow domain
 * (into the body), so that a pressure pushing the body downstream counts
 * positive. At a wall the x-momentum flux is p n_x.
 *
 * On a cone, where the pressure is the conical value p_c all along the
 * surface, sum n_x A = R^2 / 2 and C is the pressure coefficient
 * (p_c - p_inf) / q_inf.
 */
export function forebodyPressureDrag(
  wall: readonly BoundaryFaceFlux[],
  freeStream: { readonly pressure: number; readonly dynamicPressure: number },
  baseRadius: number,
): number {
  let force = 0;
  for (const face of wall) {
    force += (face.flux[1] - freeStream.pressure * face.nx) * face.area;
  }
  return (2 * force) / (freeStream.dynamicPressure * baseRadius * baseRadius);
}
