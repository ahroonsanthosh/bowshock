import { describe, expect, it } from 'vitest';
import { sharpFitProblem } from '../../src/analysis/fitted-flow';
import { gridOnLines } from '../../src/grid/blunt-grid';
import type { Body } from '../../src/geometry/body';
import {
  cellMach,
  dualMesh,
  fieldFromConserved,
  locate,
  nodesOnLines,
  sampleAt,
  sampleMeridional,
  sampleRevolved,
} from '../../src/render3d/field';
import { GAMMA, FREE, bodyR, rayField, shockR } from './synthetic';

/** A seeded random number generator (for repeatable samples). */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('the meridional field', () => {
  const field = rayField();
  const mesh = dualMesh(field);

  it('takes each cell’s own value at the cell’s centre (the dual mesh’s vertex)', () => {
    for (const [i, j] of [
      [0, 0],
      [7, 3],
      [39, 11],
      [20, 6],
    ] as const) {
      const k = i + 1 + (j + 1) * (field.ni + 2);
      const q = sampleMeridional(mesh, mesh.x[k]!, mesh.r[k]!)!;
      const c = i + j * field.ni;
      expect(q.mach).toBeCloseTo(cellMach(field, c), 10);
      expect(q.u).toBeCloseTo(field.u[c]!, 10);
      expect(q.v).toBeCloseTo(field.v[c]!, 10);
    }
  });

  it('holds no value outside the cells’ range (bilinear on the dual mesh)', () => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let c = 0; c < field.ni * field.nj; c++) {
      lo = Math.min(lo, cellMach(field, c));
      hi = Math.max(hi, cellMach(field, c));
    }
    const rand = random(3);
    for (let n = 0; n < 2000; n++) {
      const x = 0.25 + 3.7 * rand();
      const r = bodyR(x) + (shockR(x) - bodyR(x)) * rand();
      const q = sampleMeridional(mesh, x, r);
      if (q === null) continue;
      expect(q.mach).toBeGreaterThanOrEqual(lo - 1e-12);
      expect(q.mach).toBeLessThanOrEqual(hi + 1e-12);
    }
  });

  it('is nothing outside the computed region: inside the body, beyond the shock, upstream, downstream', () => {
    expect(sampleMeridional(mesh, 2, 0.5 * bodyR(2))).toBeNull();
    expect(sampleMeridional(mesh, 2, 1.05 * shockR(2))).toBeNull();
    expect(sampleMeridional(mesh, 0.1, 0.4)).toBeNull();
    expect(sampleMeridional(mesh, 4.2, 1)).toBeNull();
  });

  it('revolved, has at every azimuth the meridional value, its velocity turned with the plane', () => {
    const rand = random(7);
    let checked = 0;
    for (let n = 0; n < 500; n++) {
      const x = 0.3 + 3.6 * rand();
      const r = bodyR(x) + (shockR(x) - bodyR(x)) * (0.02 + 0.96 * rand());
      const phi = 2 * Math.PI * rand();
      const m = sampleMeridional(mesh, x, r);
      const q = sampleRevolved(mesh, x, r * Math.cos(phi), r * Math.sin(phi));
      if (m === null) {
        expect(q).toBeNull();
        continue;
      }
      checked++;
      expect(q!.mach).toBeCloseTo(m.mach, 12);
      expect(q!.velocity[0]).toBeCloseTo(m.u, 12);
      expect(q!.velocity[1]).toBeCloseTo(m.v * Math.cos(phi), 12);
      expect(q!.velocity[2]).toBeCloseTo(m.v * Math.sin(phi), 12);
    }
    expect(checked).toBeGreaterThan(400);
  });

  it('finds a point by walking from a far hint as by searching every quad', () => {
    const rand = random(11);
    for (let n = 0; n < 200; n++) {
      const x = 0.3 + 3.6 * rand();
      const r = bodyR(x) + (shockR(x) - bodyR(x)) * (0.05 + 0.9 * rand());
      const walked = locate(mesh, x, r, { I: 0, J: 0 });
      const searched = locate(mesh, x, r);
      expect(walked).not.toBeNull();
      expect(sampleAt(mesh, walked!).mach).toBeCloseTo(sampleAt(mesh, searched!).mach, 9);
    }
  });

  it('reads a GPU state (rho, rho u, rho v, E) back into the primitive flow', () => {
    const q = { rho: 1.3, u: 2.1, v: -0.4, p: 0.9 };
    const E = q.p / (GAMMA - 1) + 0.5 * q.rho * (q.u * q.u + q.v * q.v);
    const x = Float64Array.from([0, 1, 0, 1]);
    const r = Float64Array.from([1, 1, 2, 2]);
    const f = fieldFromConserved(1, 1, x, r, [q.rho, q.rho * q.u, q.rho * q.v, E], GAMMA, FREE);
    expect(f.rho[0]).toBeCloseTo(q.rho, 14);
    expect(f.u[0]).toBeCloseTo(q.u, 14);
    expect(f.v[0]).toBeCloseTo(q.v, 14);
    expect(f.p[0]).toBeCloseTo(q.p, 13);
  });

  it('places a fitted shock’s nodes from its lines and heights as the solver’s grid does', () => {
    const noseLength = 0.5 / Math.tan((10 * Math.PI) / 180);
    const body: Body = {
      nose: { shape: { kind: 'conical' }, length: noseLength, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    const problem = sharpFitProblem(body, { mach: 2, gamma: 1.4, nj: 20, refinement: 1 });
    const heights = problem.heights.map((h, i) => h * (1.1 + 0.01 * Math.sin(i)));
    const grid = gridOnLines(problem.lines, heights, problem.nj, problem.baseRadius, false);
    const nodes = nodesOnLines(problem.lines, heights, problem.nj);
    for (let k = 0; k < grid.x.length; k++) {
      expect(nodes.x[k]).toBeCloseTo(grid.x[k]!, 12);
      expect(nodes.r[k]).toBeCloseTo(grid.y[k]!, 12);
    }
  });
});
