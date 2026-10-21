import { describe, expect, it } from 'vitest';
import { isoLines, niceLevels, simplifyLine, type QuadGrid } from '../../src/render3d/contours';
import { dualMesh } from '../../src/render3d/field';
import { dualValues, quantityScale } from '../../src/render3d/quantities';
import { dualGrid, refineMesh } from '../../src/render3d/resample';
import { rayField } from './synthetic';

/** A parallelogram grid, on which bilinear interpolation of a linear function is exact. */
function parallelogram(columns: number, rows: number): QuadGrid {
  const x: number[] = [];
  const r: number[] = [];
  for (let J = 0; J < rows; J++) {
    for (let I = 0; I < columns; I++) {
      x.push(0.1 * I + 0.03 * J);
      r.push(0.02 * I + 0.08 * J);
    }
  }
  return { columns, rows, x, r };
}

describe('iso-lines', () => {
  it('lie where a linear field takes the level, with normals towards higher values', () => {
    const grid = parallelogram(30, 20);
    const f = (x: number, r: number) => 1 + 2 * x - 3 * r;
    const values = Array.from(grid.x, (x, k) => f(x, grid.r[k]!));
    for (const level of [0.2, 1, 1.7]) {
      const lines = isoLines(grid, values, level);
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) {
        l.x.forEach((x, k) => {
          expect(f(x, l.r[k]!)).toBeCloseTo(level, 12);
          // The gradient is (2, -3).
          expect(2 * l.nx[k]! - 3 * l.nr[k]!).toBeGreaterThan(0);
        });
      }
    }
  });

  it('close round a peak and chain into one line', () => {
    const grid = parallelogram(40, 40);
    const values = Array.from(grid.x, (x, k) => -((x - 2.2) ** 2) - (grid.r[k]! - 1.95) ** 2);
    const lines = isoLines(grid, values, -0.25);
    expect(lines).toHaveLength(1);
    const l = lines[0]!;
    expect(l.x[0]).toBeCloseTo(l.x[l.x.length - 1]!, 12);
    expect(l.r[0]).toBeCloseTo(l.r[l.r.length - 1]!, 12);
  });

  it('keep their shape when simplified, within the tolerance', () => {
    const grid = parallelogram(80, 80);
    const values = Array.from(grid.x, (x, k) => -((x - 4.4) ** 2) - (grid.r[k]! - 3.9) ** 2);
    const [line] = isoLines(grid, values, -1);
    const fewer = simplifyLine(line!, 1e-3);
    expect(fewer.x.length).toBeLessThan(line!.x.length);
    // Every point dropped lies within the tolerance of the simplified line.
    for (let k = 0; k < line!.x.length; k++) {
      let d = Infinity;
      for (let q = 0; q + 1 < fewer.x.length; q++) {
        const [ax, ar, bx, br] = [fewer.x[q]!, fewer.r[q]!, fewer.x[q + 1]!, fewer.r[q + 1]!];
        const L2 = (bx - ax) ** 2 + (br - ar) ** 2;
        const t = Math.min(
          Math.max(((line!.x[k]! - ax) * (bx - ax) + (line!.r[k]! - ar) * (br - ar)) / L2, 0),
          1,
        );
        d = Math.min(
          d,
          Math.hypot(line!.x[k]! - ax - t * (bx - ax), line!.r[k]! - ar - t * (br - ar)),
        );
      }
      expect(d).toBeLessThan(1e-3 + 1e-12);
    }
  });

  it('niceLevels: round values strictly inside the range', () => {
    expect(niceLevels(1.834, 2.118, 6)).toEqual([1.85, 1.9, 1.95, 2, 2.05, 2.1]);
    expect(niceLevels(-0.3, 0.7, 4)).toEqual([-0.2, 0, 0.2, 0.4, 0.6]);
    expect(niceLevels(1, 1, 4)).toEqual([]);
  });
});

describe('the smooth resampling for the iso-surfaces', () => {
  const field = rayField(30, 10);
  const mesh = dualMesh(field);
  const values = dualValues(mesh, quantityScale(field, 'mach'));

  it('keeps the solver’s values at the mesh’s vertices and its region exactly', () => {
    const k = 4;
    const { grid, values: fine } = refineMesh(mesh, values, k);
    const coarse = dualGrid(mesh);
    for (let J = 0; J < coarse.rows; J++) {
      for (let I = 0; I < coarse.columns; I++) {
        const n = I * k + J * k * grid.columns;
        expect(fine[n]).toBeCloseTo(values[I + J * coarse.columns]!, 12);
        expect(grid.x[n]).toBeCloseTo(coarse.x[I + J * coarse.columns]!, 12);
        expect(grid.r[n]).toBeCloseTo(coarse.r[I + J * coarse.columns]!, 12);
      }
    }
  });

  it('adds no value outside its quad’s corners', () => {
    const k = 3;
    const { grid, values: fine } = refineMesh(mesh, values, k);
    for (let q = 0; q < grid.rows; q++) {
      for (let p = 0; p < grid.columns; p++) {
        const I = Math.min(Math.floor(p / k), mesh.ni);
        const J = Math.min(Math.floor(q / k), mesh.nj);
        const NI = mesh.ni + 2;
        const corners = [I + J * NI, I + 1 + J * NI, I + 1 + (J + 1) * NI, I + (J + 1) * NI].map(
          (c) => values[c]!,
        );
        const v = fine[p + q * grid.columns]!;
        expect(v).toBeGreaterThanOrEqual(Math.min(...corners) - 1e-12);
        expect(v).toBeLessThanOrEqual(Math.max(...corners) + 1e-12);
      }
    }
  });

  it('reproduces values linear in the mesh’s indices (away from its edges)', () => {
    const linear = Array.from(
      values,
      (_, n) => 0.3 * (n % (mesh.ni + 2)) - 0.7 * Math.floor(n / (mesh.ni + 2)),
    );
    const k = 4;
    const { grid, values: fine } = refineMesh(mesh, linear, k);
    for (let q = 2 * k; q < grid.rows - 2 * k; q++) {
      for (let p = 2 * k; p < grid.columns - 2 * k; p++) {
        expect(fine[p + q * grid.columns]).toBeCloseTo(0.3 * (p / k) - 0.7 * (q / k), 10);
      }
    }
  });
});
