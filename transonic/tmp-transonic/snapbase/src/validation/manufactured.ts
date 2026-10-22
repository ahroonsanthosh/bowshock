/**
 * A manufactured solution of the steady Euler equations, for verifying the
 * discretisation (P. J. Roache, "Code verification by the method of
 * manufactured solutions", J. Fluids Eng. 124, 2002): smooth fields chosen
 * in advance, made exact by adding the source terms the equations then
 * require. A solver that converges to them at its design order is free of
 * errors in every term the fields exercise.
 *
 * The domain is the channel 0 <= x <= 1, 1 <= y <= 2, with walls at y = 1
 * and y = 2; in axisymmetric geometry y is the radius and the channel an
 * annulus. The flow is supersonic (Mach number about 2.5) from a uniform
 * stream at x = 0 to the outflow at x = 1, so every transient leaves the
 * domain and the iteration settles to the discrete steady state. The
 * perturbations grow from the inflow plane as sin^4(pi x / 2), which keeps
 * them and three derivatives zero there, so the uniform inflow condition is
 * exact. They are even about both walls, except the normal velocity v,
 * which is odd and so vanishes there: the mirror image a wall boundary
 * condition imposes is then exact.
 */

import { nodeIndex, type Geometry, type StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';

const TWO_PI = 2 * Math.PI;

/** The manufactured flow at (x, y). */
export function manufacturedState(x: number, y: number, gamma: number): Primitive2D {
  const s = y - 1;
  const ramp = Math.sin((Math.PI * Math.max(0, x)) / 2) ** 4;
  return {
    rho: 1 + 0.15 * ramp * Math.cos(TWO_PI * x) * Math.cos(Math.PI * s),
    u: 2.5 + 0.2 * ramp * Math.sin(TWO_PI * x) * Math.cos(2 * Math.PI * s),
    v: 0.1 * ramp * Math.cos(TWO_PI * x + 0.5) * Math.sin(Math.PI * s),
    p: (1 + 0.15 * ramp * Math.sin(TWO_PI * x + 1) * Math.cos(Math.PI * s)) / gamma,
  };
}

/** The uniform stream entering at x = 0. */
export const MANUFACTURED_INFLOW = (gamma: number): Primitive2D => manufacturedState(0, 1, gamma);

/** Physical fluxes of the conserved quantities in x and in y at (x, y). */
function fluxes(x: number, y: number, gamma: number): { fx: number[]; fy: number[] } {
  const { rho, u, v, p } = manufacturedState(x, y, gamma);
  const energy = p / (gamma - 1) + 0.5 * rho * (u * u + v * v);
  return {
    fx: [rho * u, rho * u * u + p, rho * u * v, u * (energy + p)],
    fy: [rho * v, rho * u * v, rho * v * v + p, v * (energy + p)],
  };
}

/** Two-point Gauss-Legendre rule on [0, 1]: nodes and weights. */
const GAUSS = [
  [0.5 - 0.5 / Math.sqrt(3), 0.5],
  [0.5 + 0.5 / Math.sqrt(3), 0.5],
] as const;

/**
 * The source, integrated over each cell, that makes the manufactured flow
 * an exact steady solution of the finite-volume equations' continuum form:
 * the outward flux of the exact solution through the cell's faces (in
 * axisymmetric geometry weighted by the radius), minus, for the radial
 * momentum, the integral of the pressure over the cell's planar area.
 * Integrating the flux face by face makes the sources of neighbouring
 * cells cancel exactly on shared faces, so the mass, x momentum and energy
 * added to a closed domain sum to zero, as a steady state requires;
 * sampling a pointwise source instead leaves an O(h^2) imbalance that
 * never settles. Four values per cell, cell (i, j) at 4 (i + j ni).
 */
export function manufacturedCellSources(
  grid: StructuredGrid,
  geometry: Geometry,
  gamma: number,
): Float64Array {
  const { ni, nj, x, y } = grid;
  const out = new Float64Array(4 * ni * nj);
  const node = (i: number, j: number) => {
    const k = nodeIndex(grid, i, j);
    return [x[k]!, y[k]!] as const;
  };
  const weight = (r: number) => (geometry === 'axisymmetric' ? r : 1);
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      const corners = [node(i, j), node(i + 1, j), node(i + 1, j + 1), node(i, j + 1)];
      const total = [0, 0, 0, 0];
      // Counter-clockwise edges: the outward normal times length is (dy, -dx).
      for (let e = 0; e < 4; e++) {
        const [ax, ay] = corners[e]!;
        const [bx, by] = corners[(e + 1) % 4]!;
        for (const [t, w] of GAUSS) {
          const px = ax + t * (bx - ax);
          const py = ay + t * (by - ay);
          const { fx, fy } = fluxes(px, py, gamma);
          for (let n = 0; n < 4; n++) {
            total[n]! += w * weight(py) * (fx[n]! * (by - ay) - fy[n]! * (bx - ax));
          }
        }
      }
      if (geometry === 'axisymmetric') {
        // Pressure over the planar area of the bilinear cell, 2 x 2 Gauss.
        const [c0, c1, c2, c3] = corners as [
          readonly [number, number],
          readonly [number, number],
          readonly [number, number],
          readonly [number, number],
        ];
        for (const [s, ws] of GAUSS) {
          for (const [t, wt] of GAUSS) {
            const px =
              (1 - s) * (1 - t) * c0[0] + s * (1 - t) * c1[0] + s * t * c2[0] + (1 - s) * t * c3[0];
            const py =
              (1 - s) * (1 - t) * c0[1] + s * (1 - t) * c1[1] + s * t * c2[1] + (1 - s) * t * c3[1];
            // Jacobian of the bilinear map.
            const dxds = (1 - t) * (c1[0] - c0[0]) + t * (c2[0] - c3[0]);
            const dyds = (1 - t) * (c1[1] - c0[1]) + t * (c2[1] - c3[1]);
            const dxdt = (1 - s) * (c3[0] - c0[0]) + s * (c2[0] - c1[0]);
            const dydt = (1 - s) * (c3[1] - c0[1]) + s * (c2[1] - c1[1]);
            const jacobian = dxds * dydt - dxdt * dyds;
            total[2]! -= ws * wt * jacobian * manufacturedState(px, py, gamma).p;
          }
        }
      }
      out.set(total, 4 * (i + j * ni));
    }
  }
  return out;
}

/**
 * The source per unit volume at a point, by fourth-order central
 * differences of the exact fluxes (accurate to about 1e-10 here): div F,
 * in axisymmetric geometry with the radial divergence (1 / r) d(r G)/dr and
 * -p / r on the radial momentum. Used to check manufacturedCellSources.
 */
export function manufacturedSource(
  x: number,
  y: number,
  gamma: number,
  geometry: Geometry,
): [number, number, number, number] {
  const h = 1e-3;
  const d = (f: (t: number) => number) => (8 * (f(h) - f(-h)) - (f(2 * h) - f(-2 * h))) / (12 * h);
  const source: [number, number, number, number] = [0, 0, 0, 0];
  for (let n = 0; n < 4; n++) {
    const dFx = d((t) => fluxes(x + t, y, gamma).fx[n]!);
    const dFy =
      geometry === 'axisymmetric'
        ? d((t) => (y + t) * fluxes(x, y + t, gamma).fy[n]!) / y
        : d((t) => fluxes(x, y + t, gamma).fy[n]!);
    source[n] = dFx + dFy;
  }
  if (geometry === 'axisymmetric') source[2] -= manufacturedState(x, y, gamma).p / y;
  return source;
}
