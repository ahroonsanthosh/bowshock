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

/**
 * Pressure drag coefficient of a body from its surface pressure along it
 * (points in downstream order: distance x from the tip and pressure), as
 * an exact reference such as the method of characteristics provides:
 * C = 2 / (q_inf R^2) * integral of (p - p_inf) r dr, by the trapezoidal rule
 * in r^2. The pressure is taken as `tipPressure` from the tip to the first
 * point (the conical value there) and as the last point's beyond it. Only
 * parts of the profile where the radius changes contribute.
 */
export function pressureDragFromProfile(
  points: readonly { readonly x: number; readonly p: number }[],
  radius: (x: number) => number,
  freeStream: { readonly pressure: number; readonly dynamicPressure: number },
  baseRadius: number,
  tipPressure: number,
): number {
  const pInf = freeStream.pressure;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  let integral = ((tipPressure - pInf) * radius(first.x) ** 2) / 2;
  for (let k = 0; k + 1 < points.length; k++) {
    const a = points[k]!;
    const b = points[k + 1]!;
    integral += (0.5 * (a.p + b.p) - pInf) * ((radius(b.x) ** 2 - radius(a.x) ** 2) / 2);
  }
  integral += ((last.p - pInf) * (baseRadius ** 2 - radius(last.x) ** 2)) / 2;
  return (2 * integral) / (freeStream.dynamicPressure * baseRadius * baseRadius);
}
