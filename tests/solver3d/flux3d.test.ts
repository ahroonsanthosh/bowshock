/**
 * The 3D flux against the 2D one (docs/design/0021-3d-euler-fins.md 4.0): equal to round-off when w = 0, and
 * invariant under rotation of the face frame.
 */

import { describe, expect, it } from 'vitest';
import { faceFlux2D, hllcFaceFlux } from '../../src/scheme/flux';
import { sharedScaledFactor } from '../../src/scheme/reconstruction';
import { hllc3D, sharedScaledFactor3D, type Primitive3D } from '../../src/solver3d/flux3d';
import { random } from './helpers';

const GAMMA = 1.4;

function state(rand: () => number, w = true): Primitive3D {
  return {
    rho: 0.5 + rand(),
    u: 3 * (rand() - 0.5),
    v: 3 * (rand() - 0.5),
    w: w ? 3 * (rand() - 0.5) : 0,
    p: 0.5 + 2 * rand(),
  };
}

describe('hllc3D', () => {
  it('equals the 2D HLLC flux when w = 0 and the normal has no z component', () => {
    const rand = random(1);
    const out2 = new Float64Array(4);
    const out3 = new Float64Array(5);
    let worst = 0;
    for (let n = 0; n < 2000; n++) {
      const l = state(rand, false);
      const r = state(rand, false);
      const a = 2 * Math.PI * rand();
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      faceFlux2D(hllcFaceFlux, l, r, nx, ny, GAMMA, out2);
      hllc3D(l, r, nx, ny, 0, GAMMA, out3);
      const scale = Math.max(1, ...Array.from(out2, Math.abs));
      worst = Math.max(
        worst,
        Math.abs(out3[0]! - out2[0]!) / scale,
        Math.abs(out3[1]! - out2[1]!) / scale,
        Math.abs(out3[2]! - out2[2]!) / scale,
        Math.abs(out3[3]!) / scale,
        Math.abs(out3[4]! - out2[3]!) / scale,
      );
    }
    expect(worst).toBeLessThan(1e-14);
  });

  it('is invariant under rotation of the frame', () => {
    const rand = random(2);
    const f = new Float64Array(5);
    const g = new Float64Array(5);
    let worst = 0;
    for (let n = 0; n < 2000; n++) {
      const l = state(rand);
      const r = state(rand);
      // A random unit normal and a random rotation (Euler angles).
      let nx = rand() - 0.5;
      let ny = rand() - 0.5;
      let nz = rand() - 0.5;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const [a, b, c] = [rand() * 6.3, rand() * 6.3, rand() * 6.3];
      const R = rotation(a, b, c);
      const rot = (x: number, y: number, z: number) =>
        [
          R[0]! * x + R[1]! * y + R[2]! * z,
          R[3]! * x + R[4]! * y + R[5]! * z,
          R[6]! * x + R[7]! * y + R[8]! * z,
        ] as const;
      const rs = (q: Primitive3D): Primitive3D => {
        const [u, v, w] = rot(q.u, q.v, q.w);
        return { rho: q.rho, u, v, w, p: q.p };
      };
      hllc3D(l, r, nx, ny, nz, GAMMA, f);
      const [mx, my, mz] = rot(nx, ny, nz);
      hllc3D(rs(l), rs(r), mx, my, mz, GAMMA, g);
      const [fx, fy, fz] = rot(f[1]!, f[2]!, f[3]!);
      const scale = Math.max(1, ...Array.from(f, Math.abs));
      worst = Math.max(
        worst,
        Math.abs(g[0]! - f[0]!) / scale,
        Math.abs(g[1]! - fx) / scale,
        Math.abs(g[2]! - fy) / scale,
        Math.abs(g[3]! - fz) / scale,
        Math.abs(g[4]! - f[4]!) / scale,
      );
    }
    expect(worst).toBeLessThan(1e-13);
  });

  it('carries the physical flux of a uniform state', () => {
    const q = { rho: 1.3, u: 0.4, v: -0.2, w: 0.7, p: 0.9 };
    const f = new Float64Array(5);
    hllc3D(q, q, 0.6, 0.0, 0.8, GAMMA, f);
    const un = 0.4 * 0.6 + 0.7 * 0.8;
    expect(f[0]).toBeCloseTo(1.3 * un, 14);
    expect(f[1]).toBeCloseTo(1.3 * un * 0.4 + 0.9 * 0.6, 14);
    expect(f[3]).toBeCloseTo(1.3 * un * 0.7 + 0.9 * 0.8, 14);
  });
});

describe('sharedScaledFactor3D', () => {
  it('equals the 2D factor exactly when w = 0', () => {
    const rand = random(3);
    for (let n = 0; n < 1000; n++) {
      const [a, b, c] = [state(rand, false), state(rand, false), state(rand, false)];
      expect(sharedScaledFactor3D(a, b, c, GAMMA)).toBe(sharedScaledFactor(a, b, c, GAMMA));
    }
  });
});

function rotation(a: number, b: number, c: number): number[] {
  const [ca, sa, cb, sb, cc, sc] = [
    Math.cos(a),
    Math.sin(a),
    Math.cos(b),
    Math.sin(b),
    Math.cos(c),
    Math.sin(c),
  ];
  const Rz = [ca, -sa, 0, sa, ca, 0, 0, 0, 1];
  const Ry = [cb, 0, sb, 0, 1, 0, -sb, 0, cb];
  const Rx = [1, 0, 0, 0, cc, -sc, 0, sc, cc];
  const mul = (A: number[], B: number[]) => {
    const C = new Array<number>(9).fill(0);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        for (let k = 0; k < 3; k++) C[3 * i + j]! += A[3 * i + k]! * B[3 * k + j]!;
    return C;
  };
  return mul(Rz, mul(Ry, Rx));
}
