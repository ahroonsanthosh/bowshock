/**
 * Structured two-dimensional grids and their finite-volume metrics.
 *
 * A block has ni x nj cells between (ni + 1) x (nj + 1) nodes. Node (i, j)
 * is stored at index i + j * (ni + 1); cell (i, j) at i + j * ni. See
 * docs/design/0003-2d-solver.md for the conventions and the axisymmetric
 * formulation.
 */

export type Geometry = 'planar' | 'axisymmetric';

export interface StructuredGrid {
  readonly ni: number;
  readonly nj: number;
  /** Node coordinates; in axisymmetric geometry x is axial and y radial (y >= 0). */
  readonly x: Float64Array;
  readonly y: Float64Array;
}

/** Faces of one grid direction: unit normals and areas. */
export interface FaceSet {
  readonly nx: Float64Array;
  readonly ny: Float64Array;
  /** Length (planar) or length times midpoint radius (axisymmetric). */
  readonly area: Float64Array;
}

export interface GridMetrics {
  readonly geometry: Geometry;
  readonly ni: number;
  readonly nj: number;
  /**
   * Faces normal to the i direction, (ni + 1) x nj of them; face (i, j)
   * joins nodes (i, j) and (i, j + 1) and its normal points towards
   * increasing i.
   */
  readonly iFaces: FaceSet;
  /**
   * Faces normal to the j direction, ni x (nj + 1) of them; face (i, j)
   * joins nodes (i, j) and (i + 1, j) and its normal points towards
   * increasing j.
   */
  readonly jFaces: FaceSet;
  /** Cell volume: planar area, or planar area times centroid radius. */
  readonly volume: Float64Array;
  /** Planar (x-y) area of each cell, used by the axisymmetric source term. */
  readonly planarArea: Float64Array;
  readonly centroidX: Float64Array;
  readonly centroidY: Float64Array;
}

export function nodeIndex(grid: { readonly ni: number }, i: number, j: number): number {
  return i + j * (grid.ni + 1);
}

/** Build a grid from a function giving the node position for each (i, j). */
export function gridFromFunction(
  ni: number,
  nj: number,
  node: (i: number, j: number) => readonly [number, number],
): StructuredGrid {
  if (!(Number.isInteger(ni) && Number.isInteger(nj) && ni >= 1 && nj >= 1)) {
    throw new RangeError('a grid needs at least one cell in each direction');
  }
  const x = new Float64Array((ni + 1) * (nj + 1));
  const y = new Float64Array((ni + 1) * (nj + 1));
  for (let j = 0; j <= nj; j++) {
    for (let i = 0; i <= ni; i++) {
      const [px, py] = node(i, j);
      x[i + j * (ni + 1)] = px;
      y[i + j * (ni + 1)] = py;
    }
  }
  return { ni, nj, x, y };
}

/** A uniform Cartesian grid of the rectangle [x0, x1] x [y0, y1]. */
export function rectangularGrid(
  ni: number,
  nj: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): StructuredGrid {
  return gridFromFunction(ni, nj, (i, j) => [x0 + ((x1 - x0) * i) / ni, y0 + ((y1 - y0) * j) / nj]);
}

/**
 * Compute the finite-volume metrics of a grid. Throws if any cell has
 * non-positive area (a folded or inverted grid) or, in axisymmetric
 * geometry, if any node lies below the axis.
 */
export function computeMetrics(grid: StructuredGrid, geometry: Geometry): GridMetrics {
  const { ni, nj, x, y } = grid;
  const axisymmetric = geometry === 'axisymmetric';
  if (axisymmetric && y.some((r) => r < 0)) {
    throw new RangeError('axisymmetric grids must have y >= 0 (y is the radius)');
  }
  const node = (i: number, j: number) => i + j * (ni + 1);

  // A face from node a to node b, with its normal on the right of a -> b:
  // n = (dy, -dx) / length.
  const face = (set: FaceSetBuilder, k: number, a: number, b: number) => {
    const dx = x[b]! - x[a]!;
    const dy = y[b]! - y[a]!;
    const length = Math.hypot(dx, dy);
    set.nx[k] = length > 0 ? dy / length : 0;
    set.ny[k] = length > 0 ? -dx / length : 0;
    set.area[k] = axisymmetric ? length * 0.5 * (y[a]! + y[b]!) : length;
  };

  // Grids are right-handed: i runs along +x and j along +y when the grid is
  // undistorted. Walking along an i-face from node (i, j) to node (i, j + 1)
  // then has increasing i on the right, and walking along a j-face from node
  // (i + 1, j) to node (i, j) has increasing j on the right.
  const iFaces = faceSetBuilder((ni + 1) * nj);
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i <= ni; i++) face(iFaces, i + j * (ni + 1), node(i, j), node(i, j + 1));
  }
  const jFaces = faceSetBuilder(ni * (nj + 1));
  for (let j = 0; j <= nj; j++) {
    for (let i = 0; i < ni; i++) face(jFaces, i + j * ni, node(i + 1, j), node(i, j));
  }

  const volume = new Float64Array(ni * nj);
  const planarArea = new Float64Array(ni * nj);
  const centroidX = new Float64Array(ni * nj);
  const centroidY = new Float64Array(ni * nj);
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      // Corners in counter-clockwise order for a right-handed grid.
      const corners = [node(i, j), node(i + 1, j), node(i + 1, j + 1), node(i, j + 1)];
      let area = 0;
      let cx = 0;
      let cy = 0;
      for (let c = 0; c < 4; c++) {
        const p = corners[c]!;
        const q = corners[(c + 1) % 4]!;
        const cross = x[p]! * y[q]! - x[q]! * y[p]!;
        area += cross;
        cx += (x[p]! + x[q]!) * cross;
        cy += (y[p]! + y[q]!) * cross;
      }
      area *= 0.5;
      if (!(area > 0)) {
        throw new RangeError(`cell (${i}, ${j}) has non-positive area ${area}`);
      }
      const k = i + j * ni;
      planarArea[k] = area;
      centroidX[k] = cx / (6 * area);
      centroidY[k] = cy / (6 * area);
      volume[k] = axisymmetric ? area * centroidY[k] : area;
    }
  }

  return {
    geometry,
    ni,
    nj,
    iFaces,
    jFaces,
    volume,
    planarArea,
    centroidX,
    centroidY,
  };
}

interface FaceSetBuilder {
  nx: Float64Array;
  ny: Float64Array;
  area: Float64Array;
}

function faceSetBuilder(n: number): FaceSetBuilder {
  return { nx: new Float64Array(n), ny: new Float64Array(n), area: new Float64Array(n) };
}
