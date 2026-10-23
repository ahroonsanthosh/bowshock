import { beforeAll, describe, expect, it } from 'vitest';
import { sharpFittedFlow } from '../../src/analysis/fitted-flow';
import type { Body } from '../../src/geometry/body';
import { bodyRadius } from '../../src/geometry/body';
import {
  dualMesh,
  fieldFromCells,
  locate,
  sampleMeridional,
  type DualMesh,
  type MeridionalField,
} from '../../src/render3d/field';
import { quantityScale, dualValues } from '../../src/render3d/quantities';
import {
  seedRadii,
  shockEntry,
  traceStreamline,
  type Streamline,
} from '../../src/render3d/streamlines';
import { ORIGIN, rayField, shockR } from './synthetic';

/** Checks every streamline must pass: inside the region, along the velocity, out at the outflow plane. */
function checkStreamline(mesh: DualMesh, line: Streamline, maxAngle: number) {
  const n = line.x.length;
  const first = line.computed.indexOf(true);
  expect(first).toBeGreaterThan(0);
  // The free stream's part is straight at the seed's radius.
  for (let k = 0; k < first; k++) expect(line.r[k]).toBeCloseTo(line.seedRadius, 12);
  for (let k = first; k < n; k++) {
    expect(line.computed[k]).toBe(true);
    // Inside the computed region (its boundary included).
    expect(
      locate(mesh, line.x[k]!, line.r[k]!),
      `point ${k} at ${line.x[k]}, ${line.r[k]}`,
    ).not.toBeNull();
  }
  // Along the interpolated velocity: each step's direction against the
  // velocity at its midpoint; a step held on the wall or the shock (both
  // ends on it) follows that boundary instead.
  const onBoundary = (k: number) => {
    const at = locate(mesh, line.x[k]!, line.r[k]!)!;
    return (at.J === 0 && at.t < 1e-9) || (at.J === mesh.nj && at.t > 1 - 1e-9);
  };
  let worst = 0;
  for (let k = first; k + 1 < n; k++) {
    if (onBoundary(k) && onBoundary(k + 1)) continue;
    const dx = line.x[k + 1]! - line.x[k]!;
    const dr = line.r[k + 1]! - line.r[k]!;
    if (Math.hypot(dx, dr) < 1e-12) continue;
    // (A chord along a convex boundary may leave the region: not sampled.)
    const q = sampleMeridional(
      mesh,
      0.5 * (line.x[k]! + line.x[k + 1]!),
      0.5 * (line.r[k]! + line.r[k + 1]!),
    );
    if (q === null) continue;
    const angle = Math.abs(Math.atan2(dx * q.v - dr * q.u, dx * q.u + dr * q.v));
    worst = Math.max(worst, angle);
  }
  expect(worst).toBeLessThan(maxAngle);
  // Out through the outflow plane (the dual mesh's last column).
  const NI = mesh.ni + 2;
  const xOut = (r: number) => {
    for (let J = 0; J <= mesh.nj; J++) {
      const a = mesh.ni + 1 + J * NI;
      const b = a + NI;
      if (r >= mesh.r[a]! && r <= mesh.r[b]!) {
        return (
          mesh.x[a]! + ((r - mesh.r[a]!) / (mesh.r[b]! - mesh.r[a]!)) * (mesh.x[b]! - mesh.x[a]!)
        );
      }
    }
    return NaN;
  };
  expect(line.x[n - 1]).toBeCloseTo(xOut(line.r[n - 1]!), 9);
}

describe('streamlines', () => {
  const field = rayField(60, 16);
  const mesh = dualMesh(field);
  const mach = dualValues(mesh, quantityScale(field, 'mach'));

  it('follow a flow of straight rays: each traced line stays on its ray', () => {
    for (const r0 of seedRadii(0.6, 2.4, 7)) {
      const line = traceStreamline(mesh, r0, { xUpstream: -1, values: mach, freeValue: 2 });
      checkStreamline(mesh, line, 1e-3);
      const first = line.computed.indexOf(true);
      const slope = line.r[first]! / (line.x[first]! - ORIGIN);
      for (let k = first; k < line.x.length; k++) {
        // The ray's slope, to the interpolation's accuracy on this grid.
        expect(Math.abs(line.r[k]! / (line.x[k]! - ORIGIN) / slope - 1)).toBeLessThan(5e-3);
      }
    }
  });

  it('meet the shock where the free stream at their radius reaches it', () => {
    const line = traceStreamline(mesh, 1.5, { xUpstream: -1, values: mach, freeValue: 2 });
    const first = line.computed.indexOf(true);
    expect(line.x[0]).toBe(-1);
    expect(line.r[first]).toBeCloseTo(1.5, 12);
    // On the shock line (the grid's outer boundary), here r = 0.5 + 0.6 x.
    expect(line.r[first]! - shockR(line.x[first]!)).toBeCloseTo(0, 12);
    expect(shockEntry(mesh, 99)).toBeNull();
  });

  it('start a set distance ahead of the shock when asked', () => {
    const line = traceStreamline(mesh, 1.5, {
      xUpstream: -1,
      upstreamLength: 0.5,
      values: mach,
      freeValue: 2,
    });
    const first = line.computed.indexOf(true);
    expect(line.x[first]! - line.x[0]!).toBeCloseTo(0.5, 12);
  });

  it('run in the free stream all the way where they never meet the shock', () => {
    const line = traceStreamline(mesh, 50, { xUpstream: -1, values: mach, freeValue: 2 });
    expect(line.computed.every((c) => !c)).toBe(true);
    expect(line.r.every((r) => r === 50)).toBe(true);
  });

  describe('through a solved flow (a 20 degree cone on a cylinder at Mach 2, coarse)', () => {
    let solved: MeridionalField;
    let body: Body;
    beforeAll(() => {
      body = {
        nose: {
          shape: { kind: 'conical' },
          length: 0.5 / Math.tan((10 * Math.PI) / 180),
          baseRadius: 0.5,
        },
        cylinderLength: 1,
      };
      // A coarse grid, partly converged: a smooth solved flow is all the
      // tracer needs.
      const flow = sharpFittedFlow(body, {
        mach: 2,
        gamma: 1.4,
        nj: 10,
        refinement: 1,
        maxIterations: 1500,
      });
      solved = fieldFromCells(
        flow.fit.grid,
        (i, j) => flow.fit.solver.primitive(i, j),
        1.4,
        freeOf(2),
      );
    }, 600_000);

    it('stay inside the computed region, follow the velocity and leave at the base', () => {
      const m = dualMesh(solved);
      const values = dualValues(m, quantityScale(solved, 'mach'));
      const rEnd = m.r[m.ni + 1 + (m.nj + 1) * (m.ni + 2)]!;
      // How far inside the body the dual mesh's wall reaches: its chords' depth.
      let wallCut = 0;
      for (let I = 0; I <= m.ni; I++) {
        for (let q = 0; q <= 20; q++) {
          const f = q / 20;
          const x = m.x[I]! + f * (m.x[I + 1]! - m.x[I]!);
          const r = m.r[I]! + f * (m.r[I + 1]! - m.r[I]!);
          wallCut = Math.max(wallCut, bodyRadius(body, x) - r);
        }
      }
      expect(wallCut).toBeLessThan(0.02);
      for (const r0 of seedRadii(0.02 * rEnd, 0.97 * rEnd, 12)) {
        const line = traceStreamline(m, r0, { xUpstream: 0, values, freeValue: 2 });
        checkStreamline(m, line, 2e-3);
        // Never inside the body, but where the dual mesh's wall (the wall
        // faces' midpoints joined) cuts the shoulder's corner.
        line.x.forEach((x, k) => {
          expect(line.r[k]!).toBeGreaterThanOrEqual(bodyRadius(body, x) - wallCut - 1e-12);
        });
      }
    });
  });
});

/** The free stream of the solver's units at Mach M (rho = 1, p = 1). */
function freeOf(mach: number) {
  return { rho: 1, u: mach * Math.sqrt(1.4), v: 0, p: 1 };
}
