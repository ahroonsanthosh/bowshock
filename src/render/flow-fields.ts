/**
 * The fields the flow view draws (docs/design/0012-interface.md: keys 1 to
 * 4), cell by cell from the solver's conserved state: the reference for
 * src/render/shaders/flow-fields.wgsl, which computes the same on the GPU
 * (tested against this module), and for checking what is drawn.
 *
 * The view draws each cell's own value at the cell's centre (the mean of
 * its four corners) and interpolates linearly between centres, on the
 * "dual" mesh whose vertices are the cell centres, with the faces and
 * corners of the boundary added, each taking the value of the cell beside
 * it. So the value drawn at a cell's centre is the solver's value there,
 * and no value is drawn that lies outside the cells' range. Outside the
 * fitted shock the view draws the free stream (freeStreamValue), whose
 * value each field's colour range takes in as well.
 */

import type { StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';
import { pressureFromConserved2D } from '../scheme/gas';

export type FlowField = 'schlieren' | 'mach' | 'cp' | 'density';

/** Field codes as flow-fields.wgsl and flow-draw.wgsl use them. */
export const FLOW_FIELD_CODES: Readonly<Record<FlowField, number>> = {
  schlieren: 0,
  mach: 1,
  cp: 2,
  density: 3,
};

/** Conserved state of a cell: (rho, rho u, rho v, E). */
export type Conserved = readonly [number, number, number, number];

/**
 * A cell's value of a field other than schlieren: the Mach number, the
 * pressure coefficient (p - p_inf) / (rho_inf V_inf^2 / 2), or the density
 * over the free stream's. Twin of field_value in flow-fields.wgsl.
 */
export function cellFieldValue(
  field: Exclude<FlowField, 'schlieren'>,
  state: Conserved,
  gamma: number,
  free: Primitive2D,
): number {
  const [rho, mu, mv, energy] = state;
  const p = pressureFromConserved2D(rho, mu, mv, energy, gamma);
  switch (field) {
    case 'mach':
      return Math.hypot(mu, mv) / rho / Math.sqrt((gamma * p) / rho);
    case 'cp':
      return (p - free.p) / (0.5 * free.rho * (free.u * free.u + free.v * free.v));
    case 'density':
      return rho / free.rho;
  }
}

/**
 * The free stream's value of a field: what the view fills the flow
 * outside the fitted shock with (uniform, so its schlieren gradient is 0,
 * its pressure coefficient 0 and its density ratio 1).
 */
export function freeStreamValue(field: FlowField, gamma: number, free: Primitive2D): number {
  switch (field) {
    case 'schlieren':
    case 'cp':
      return 0;
    case 'density':
      return 1;
    case 'mach':
      return Math.hypot(free.u, free.v) / Math.sqrt((gamma * free.p) / free.rho);
  }
}

/**
 * Schlieren's quantity in cell (i, j): the magnitude of the density
 * gradient, by the Green-Gauss formula over the cell's four faces in the
 * plane of the grid, each face taking the mean density of the two cells
 * either side of it (the cell's own on the boundary), made dimensionless
 * with a length (the body's radius) and the free stream's density.
 * Twin of schlieren in flow-fields.wgsl.
 */
export function schlierenGradient(
  grid: StructuredGrid,
  density: (i: number, j: number) => number,
  i: number,
  j: number,
  length: number,
  freeDensity: number,
): number {
  const { ni, nj, x, y } = grid;
  const row = ni + 1;
  const corners = [i + j * row, i + 1 + j * row, i + 1 + (j + 1) * row, i + (j + 1) * row];
  // The neighbour across each face, in the order of the corners' edges.
  const across: [number, number][] = [
    [i, j - 1],
    [i + 1, j],
    [i, j + 1],
    [i - 1, j],
  ];
  const own = density(i, j);
  let gx = 0;
  let gy = 0;
  let area = 0;
  for (let k = 0; k < 4; k++) {
    const a = corners[k]!;
    const b = corners[(k + 1) % 4]!;
    const [ni2, nj2] = across[k]!;
    const inside = ni2 >= 0 && ni2 < ni && nj2 >= 0 && nj2 < nj;
    const q = inside ? 0.5 * (own + density(ni2, nj2)) : own;
    const dx = x[b]! - x[a]!;
    const dy = y[b]! - y[a]!;
    gx += q * dy;
    gy -= q * dx;
    area += 0.5 * (x[a]! * y[b]! - x[b]! * y[a]!);
  }
  return ((Math.hypot(gx, gy) / Math.abs(area)) * length) / freeDensity;
}

/**
 * Schlieren's brightness, 0 (uniform flow) to 1, from the dimensionless
 * gradient g: 1 - exp(-k g). A fixed scale, not the largest gradient's,
 * so the picture does not flicker as the flow converges and a singular
 * gradient (a sharp tip) does not darken the rest.
 */
export function schlierenBrightness(gradient: number, k: number): number {
  return 1 - Math.exp(-k * gradient);
}

/**
 * The point at which cell (i, j)'s value is drawn exactly: the mean of its
 * four corners (a vertex of the dual mesh). Twin of dual_position in
 * flow-draw.wgsl for an interior vertex.
 */
export function cellCentre(grid: StructuredGrid, i: number, j: number): [number, number] {
  const row = grid.ni + 1;
  const corners = [i + j * row, i + 1 + j * row, i + 1 + (j + 1) * row, i + (j + 1) * row];
  let sx = 0;
  let sy = 0;
  for (const n of corners) {
    sx += grid.x[n]!;
    sy += grid.y[n]!;
  }
  return [sx / 4, sy / 4];
}
