/**
 * Initial cell averages, shared by the CPU and GPU engines so both start
 * from identical data.
 */

import { totalEnergy, type Primitive1D } from '../scheme/gas';

/**
 * Five-point Gauss-Legendre rule on [-1/2, 1/2], exact for polynomials up to
 * degree 9.
 */
const GAUSS_LEGENDRE_5 = [
  { x: 0, w: 128 / 225 },
  { x: Math.sqrt(5 - 2 * Math.sqrt(10 / 7)) / 3, w: (322 + 13 * Math.sqrt(70)) / 900 },
  { x: -Math.sqrt(5 - 2 * Math.sqrt(10 / 7)) / 3, w: (322 + 13 * Math.sqrt(70)) / 900 },
  { x: Math.sqrt(5 + 2 * Math.sqrt(10 / 7)) / 3, w: (322 - 13 * Math.sqrt(70)) / 900 },
  { x: -Math.sqrt(5 + 2 * Math.sqrt(10 / 7)) / 3, w: (322 - 13 * Math.sqrt(70)) / 900 },
].map(({ x, w }) => ({ x: x / 2, w: w / 2 }));

export interface ConservedArrays1D {
  readonly rho: Float64Array;
  readonly mom: Float64Array;
  readonly energy: Float64Array;
}

/**
 * Cell averages of the conserved variables of a primitive field on a
 * uniform grid of `nCells` cells starting at `xMin`. Exact averages matter
 * for accuracy-order tests; for discontinuous data the quadrature gives a
 * sensible average of the cell that contains the jump.
 */
export function cellAverages1D(
  field: (x: number) => Primitive1D,
  xMin: number,
  dx: number,
  nCells: number,
  gamma: number,
): ConservedArrays1D {
  const rho = new Float64Array(nCells);
  const mom = new Float64Array(nCells);
  const energy = new Float64Array(nCells);
  for (let i = 0; i < nCells; i++) {
    const centre = xMin + (i + 0.5) * dx;
    for (const { x, w } of GAUSS_LEGENDRE_5) {
      const s = field(centre + x * dx);
      rho[i] = rho[i]! + w * s.rho;
      mom[i] = mom[i]! + w * s.rho * s.u;
      energy[i] = energy[i]! + w * totalEnergy(s.rho, s.u, s.p, gamma);
    }
  }
  return { rho, mom, energy };
}
