/**
 * Blocks cut from one grid and advanced together (src/solver3d/multiblock.ts, Euler3D.iterateCoupled) equal
 * the single block, cell by cell, to round-off: the ghost exchange at every stage and the shared fluxes leave
 * the scheme unchanged (docs/design/0021-3d-euler-fins.md 3.8: block interfaces use the same stored flux).
 */

import { describe, expect, it } from 'vitest';
import {
  Euler3D,
  type BoundaryCondition3D,
  type Euler3DConfig,
  type Side3D,
} from '../../src/solver3d/euler3d';
import type { Primitive3D } from '../../src/solver3d/flux3d';
import { gridFromFunction3D } from '../../src/solver3d/grid3d';
import { blockBoundaries, decompose, type Box3D } from '../../src/solver3d/multiblock';

const GAMMA = 1.4;
const NI = 10;
const NJ = 8;
const NK = 8;

function globalGrid() {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  return gridFromFunction3D(NI, NJ, NK, (i, j, k) => {
    const inside = i > 0 && i < NI && j > 0 && j < NJ && k > 0 && k < NK;
    const e = () => (inside ? 0.4 * (rand() - 0.5) : 0);
    return [(i + e()) / NI, 0.5 + (j + e()) / NJ, ((Math.PI / 6) * (k + e())) / NK];
  });
}

const free: Primitive3D = { rho: 1, u: 2.2 * Math.sqrt(GAMMA), v: 0, w: 0, p: 1 };
const boundaries: Record<Side3D, BoundaryCondition3D> = {
  iMin: { kind: 'inflow', state: free },
  iMax: { kind: 'outflow' },
  jMin: { kind: 'wall' },
  jMax: { kind: 'outflow' },
  kMin: { kind: 'wall' },
  kMax: { kind: 'wall' },
};
const start = (i: number, j: number, k: number): Primitive3D => ({
  rho: 1 + 0.1 * Math.sin(i + 2 * j + 3 * k),
  u: free.u * (1 + 0.05 * Math.cos(2 * i - j)),
  v: 0.1 * Math.sin(j + k),
  w: 0.1 * Math.cos(i + k),
  p: 1 + 0.2 * Math.sin(3 * i + k),
});
const config = (grid: Euler3DConfig['grid'], b: Euler3DConfig['boundaries']): Euler3DConfig => ({
  grid,
  geometry: 'cylindrical',
  gamma: GAMMA,
  timeIntegrator: 'ssprk2',
  cfl: 0.5,
  timeStepping: 'local',
  boundaries: b,
});

function compare(boxes: Box3D[], steps: number, plant = false): number {
  const g = globalGrid();
  const one = new Euler3D(config(g, boundaries));
  one.setCellPrimitives(start);
  one.iterate(steps);
  const dec = decompose(g, boxes);
  const blocks = dec.grids.map((grid, b) => {
    const e = new Euler3D(config(grid, blockBoundaries(dec, b, boundaries, g)));
    const x = dec.boxes[b]!;
    e.setCellPrimitives((i, j, k) => start(i + x.i0, j + x.j0, k + x.k0));
    return e;
  });
  Euler3D.checkShares(blocks, dec.shares);
  let links = dec.links;
  if (plant) {
    // A wrong ghost source: the first link's first face takes its neighbour's next cell along the face.
    const l = links[0]!;
    const sources = Int32Array.from(l.sources);
    sources[1] = Math.min(
      sources[1]! + 1,
      dec.boxes[sources[0]!]!.i1 - dec.boxes[sources[0]!]!.i0 - 1,
    );
    sources[3] = sources[3]! === 0 ? 1 : 0;
    links = [{ ...l, sources }, ...links.slice(1)];
  }
  Euler3D.iterateCoupled(blocks, links, dec.shares, steps);
  let worst = 0;
  blocks.forEach((e, b) => {
    const x = dec.boxes[b]!;
    for (let k = 0; k < x.k1 - x.k0; k++)
      for (let j = 0; j < x.j1 - x.j0; j++)
        for (let i = 0; i < x.i1 - x.i0; i++) {
          const p = e.primitive(i, j, k);
          const q = one.primitive(i + x.i0, j + x.j0, k + x.k0);
          worst = Math.max(
            worst,
            Math.abs(p.rho - q.rho),
            Math.abs(p.u - q.u),
            Math.abs(p.v - q.v),
            Math.abs(p.w - q.w),
            Math.abs(p.p - q.p),
          );
        }
  });
  return worst;
}

describe('coupled blocks', () => {
  const j1: Box3D[] = [
    { i0: 0, i1: NI, j0: 0, j1: 4, k0: 0, k1: 3 },
    { i0: 0, i1: NI, j0: 0, j1: 4, k0: 3, k1: NK },
    { i0: 0, i1: NI, j0: 4, j1: NJ, k0: 0, k1: NK },
  ];
  const j2: Box3D[] = [
    { i0: 0, i1: 5, j0: 0, j1: NJ, k0: 0, k1: 3 },
    { i0: 0, i1: 5, j0: 0, j1: NJ, k0: 3, k1: NK },
    { i0: 5, i1: NI, j0: 0, j1: NJ, k0: 0, k1: NK },
  ];

  it('equal the single block to round-off, J1 layout (three blocks, a row interface)', () => {
    expect(compare(j1, 30)).toBeLessThan(1e-13);
  });

  it('equal the single block to round-off, J2 layout (three blocks, a column interface)', () => {
    expect(compare(j2, 30)).toBeLessThan(1e-13);
  });

  it('a wrong ghost source is seen', () => {
    expect(compare(j1, 30, true)).toBeGreaterThan(1e-6);
  });

  it('refuses a side that is cut across part of its extent, and an owner after its follower', () => {
    const g = globalGrid();
    const parts: Box3D[] = [
      { i0: 0, i1: NI, j0: 0, j1: 4, k0: 0, k1: NK },
      { i0: 0, i1: 5, j0: 4, j1: NJ, k0: 0, k1: NK },
      { i0: 5, i1: NI, j0: 4, j1: NJ, k0: 0, k1: NK },
    ];
    expect(() => decompose(g, parts)).not.toThrow();
    expect(() => decompose(g, parts, [[0, 1]])).toThrow(/part of its extent/);
    expect(() => decompose(g, [j1[0]!, j1[2]!, j1[1]!])).toThrow(/before and after/);
  });
});
