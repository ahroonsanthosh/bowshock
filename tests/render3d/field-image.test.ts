import { describe, expect, it } from 'vitest';
import { dualMesh, locate } from '../../src/render3d/field';
import {
  densityGradient,
  fieldImageMesh,
  IMAGE_VERTEX_FLOATS,
  streakNoise,
  wallPressure,
} from '../../src/render3d/field-image';
import { Particles } from '../../src/render3d/particles';
import { FREE, rayField, rayFlow } from './synthetic';

/**
 * The field's images (src/render3d/field-image.ts): the density gradient
 * from the grid's metric, the image's vertices, the body's surface
 * pressure, the streaks' noise, and particles moved by the field.
 */
describe('the field image', () => {
  const field = rayField(48, 14);
  const mesh = dualMesh(field);

  it('takes the density gradient from the grid (rho = 1.1 + 0.05 cos r: |d rho / d r| = 0.05 |sin r|)', () => {
    const grad = densityGradient(mesh, field, 1);
    const NI = mesh.ni + 2;
    let worst = 0;
    for (let J = 2; J < mesh.nj; J++) {
      for (let I = 2; I < mesh.ni; I++) {
        const k = I + J * NI;
        const exact = 0.05 * Math.abs(Math.sin(mesh.r[k]!));
        worst = Math.max(worst, Math.abs(grad[k]! - exact));
      }
    }
    // The cells hold the flow at their centres; differences across a few cells.
    expect(worst).toBeLessThan(4e-3);
  });

  it('puts every vertex in the image box, with its velocity over the free stream speed and a brightness in [0, 1]', () => {
    const values = mesh.mach;
    const box = { xMin: 0, xMax: 4.2, rMax: 3 };
    const m = fieldImageMesh(mesh, field, values, box, 1);
    const speed = Math.hypot(FREE.u, FREE.v);
    expect(m.vertices.length).toBe((mesh.ni + 2) * (mesh.nj + 2) * IMAGE_VERTEX_FLOATS);
    for (let k = 0; k < m.vertices.length / IMAGE_VERTEX_FLOATS; k++) {
      const o = k * IMAGE_VERTEX_FLOATS;
      expect(Math.abs(m.vertices[o]!)).toBeLessThanOrEqual(1 + 1e-6);
      expect(Math.abs(m.vertices[o + 1]!)).toBeLessThanOrEqual(1 + 1e-6);
      expect(m.vertices[o + 2]).toBeCloseTo(mesh.u[k]! / speed, 5);
      expect(m.vertices[o + 5]!).toBeGreaterThanOrEqual(0);
      expect(m.vertices[o + 5]!).toBeLessThanOrEqual(1);
    }
    expect(m.schlieren.hi).toBeGreaterThan(m.schlieren.lo);
  });

  it('takes the body colour from the wall cells’ pressure', () => {
    const wall = wallPressure(field, 4.2, 64);
    const q = 0.5 * FREE.rho * (FREE.u ** 2 + FREE.v ** 2);
    // At the middle of the run, the pressure of the flow next to the wall.
    const x = (4.2 * 32) / 63;
    const p = rayFlow(x, 0.2 + 0.05 * x).p;
    expect(wall.cp[32]).toBeCloseTo((p - FREE.p) / q, 2);
    expect(wall.min).toBeLessThanOrEqual(wall.max);
  });

  it('makes streaks: neighbours along them alike, across them not', () => {
    const size = 64;
    const n = streakNoise(size, 16, 5);
    let along = 0;
    let across = 0;
    for (let j = 0; j < size - 1; j++) {
      for (let i = 0; i < size - 1; i++) {
        along += Math.abs(n[i + j * size]! - n[i + (j + 1) * size]!);
        across += Math.abs(n[i + j * size]! - n[i + 1 + j * size]!);
      }
    }
    expect(along * 3).toBeLessThan(across);
  });

  it('moves particles along the flow (rays from (-3, 0)) and keeps them in the region', () => {
    const p = new Particles(mesh, 200, 0, Math.PI, 4);
    for (let step = 0; step < 20; step++) p.advance(0.02);
    const lines = p.streaks(0.05, mesh.mach);
    for (let k = 0; k < 200; k++) {
      const o = 12 * k;
      const x = lines[o + 4]!;
      const r = Math.hypot(lines[o + 5]!, lines[o + 6]!);
      expect(locate(mesh, x, r)).not.toBeNull();
      // The streak lies along the ray through its head.
      const xt = lines[o]!;
      const rt = Math.hypot(lines[o + 1]!, lines[o + 2]!);
      const cross = (x + 3) * rt - r * (xt + 3);
      // Sine of the angle between the rays through the head and the tail.
      expect(Math.abs(cross) / (Math.hypot(x + 3, r) * Math.hypot(xt + 3, rt))).toBeLessThan(2e-3);
    }
  });
});
