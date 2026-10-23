/**
 * A finer, smooth resampling of the meridional field for its iso-surfaces.
 * Marching squares on the solver's own (dual) mesh gives iso-lines that are
 * straight across each cell and kink at every cell edge, which shows on a
 * coarse grid. Here each dual quad is divided `k` by `k`; the positions of
 * the new vertices are the quad's own bilinear map (so the region is
 * exactly the computed one), and the values a tensor-product Catmull-Rom
 * cubic through the 4 x 4 neighbouring vertices in the mesh's index space
 * (the cubic convolution of R. G. Keys, "Cubic convolution interpolation
 * for digital image processing", IEEE Trans. ASSP 29 (1981) 1153-1160,
 * with a = -0.5), held within the values of the quad's four corners so
 * that no value appears that the cells do not have between them. At the
 * mesh's vertices the values are the solver's.
 */

import type { QuadGrid } from './contours';
import { quadVertices, type DualMesh } from './field';

/** Catmull-Rom weights at fraction f between the second and third of four samples. */
function weights(f: number): [number, number, number, number] {
  const f2 = f * f;
  const f3 = f2 * f;
  return [
    -0.5 * f3 + f2 - 0.5 * f,
    1.5 * f3 - 2.5 * f2 + 1,
    -1.5 * f3 + 2 * f2 + 0.5 * f,
    0.5 * f3 - 0.5 * f2,
  ];
}

export function refineMesh(
  mesh: DualMesh,
  values: ArrayLike<number>,
  k: number,
): { grid: QuadGrid; values: Float64Array } {
  const NI = mesh.ni + 2;
  const NJ = mesh.nj + 2;
  const columns = (NI - 1) * k + 1;
  const rows = (NJ - 1) * k + 1;
  const x = new Float64Array(columns * rows);
  const r = new Float64Array(columns * rows);
  const out = new Float64Array(columns * rows);
  const at = (I: number, J: number) =>
    values[Math.min(Math.max(I, 0), NI - 1) + Math.min(Math.max(J, 0), NJ - 1) * NI]!;
  for (let q = 0; q < rows; q++) {
    const J = Math.min(Math.floor(q / k), NJ - 2);
    const t = q / k - J;
    const wt = weights(t);
    for (let p = 0; p < columns; p++) {
      const I = Math.min(Math.floor(p / k), NI - 2);
      const s = p / k - I;
      const [a, b, c, d] = quadVertices(mesh, I, J);
      const w = [(1 - s) * (1 - t), s * (1 - t), s * t, (1 - s) * t];
      const n = p + q * columns;
      x[n] = w[0]! * mesh.x[a]! + w[1]! * mesh.x[b]! + w[2]! * mesh.x[c]! + w[3]! * mesh.x[d]!;
      r[n] = w[0]! * mesh.r[a]! + w[1]! * mesh.r[b]! + w[2]! * mesh.r[c]! + w[3]! * mesh.r[d]!;
      const ws = weights(s);
      let v = 0;
      for (let m = 0; m < 4; m++) {
        let row = 0;
        for (let l = 0; l < 4; l++) row += ws[l]! * at(I - 1 + l, J - 1 + m);
        v += wt[m]! * row;
      }
      const corners = [values[a]!, values[b]!, values[c]!, values[d]!];
      out[n] = Math.min(Math.max(v, Math.min(...corners)), Math.max(...corners));
    }
  }
  return { grid: { columns, rows, x, r }, values: out };
}

/** The dual mesh as a quad grid. */
export function dualGrid(mesh: DualMesh): QuadGrid {
  return { columns: mesh.ni + 2, rows: mesh.nj + 2, x: mesh.x, r: mesh.r };
}
