import { describe, expect, it } from 'vitest';
import {
  eyeOf,
  fitOrbit,
  lookAt,
  multiply,
  perspective,
  threeQuarterView,
  transform,
  viewProjection,
  type Vec3,
} from '../../src/render3d/camera';

describe('the 3D view’s camera', () => {
  it('puts the target at the centre of the view, in front of the eye', () => {
    const o = threeQuarterView(0, 10, 6, 1.6);
    const c = transform(viewProjection(o, 1.6, 10), o.target);
    // (32-bit matrices.)
    expect(c[0] / c[3]).toBeCloseTo(0, 6);
    expect(c[1] / c[3]).toBeCloseTo(0, 6);
    expect(c[2] / c[3]).toBeGreaterThan(0);
    expect(c[2] / c[3]).toBeLessThan(1);
  });

  it('frames the box from ahead, to the side and above (a 3/4 view)', () => {
    const o = threeQuarterView(0, 10, 6, 1.6);
    const eye = eyeOf(o);
    expect(eye[0]).toBeLessThan(o.target[0]);
    expect(eye[1]).toBeGreaterThan(o.target[1]);
    expect(eye[2]).toBeGreaterThan(o.target[2]);
  });

  it('fits every point inside the margin, as large as fits', () => {
    const points: Vec3[] = [];
    for (let i = 0; i < 8; i++) points.push([i & 1 ? 10 : 0, i & 2 ? 6 : -6, i & 4 ? 6 : -6]);
    for (const aspect of [0.6, 1, 1.6, 2.4]) {
      const o = fitOrbit({ yaw: -0.6, pitch: 0.4, fovY: 0.5 }, points, aspect, 0.9);
      const m = viewProjection(o, aspect, 12);
      let reach = 0;
      for (const p of points) {
        const c = transform(m, p);
        reach = Math.max(reach, Math.abs(c[0] / c[3]), Math.abs(c[1] / c[3]));
      }
      expect(reach).toBeLessThanOrEqual(0.9 + 1e-6);
      expect(reach).toBeGreaterThan(0.85);
    }
  });

  it('projects with depth 0 at the near plane and 1 at the far (WebGPU clip space)', () => {
    const view = lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);
    const m = multiply(perspective(1, 1, 1, 9), view);
    const near = transform(m, [0, 0, 4]);
    const far = transform(m, [0, 0, -4]);
    expect(near[2] / near[3]).toBeCloseTo(0, 6);
    expect(far[2] / far[3]).toBeCloseTo(1, 6);
  });
});
