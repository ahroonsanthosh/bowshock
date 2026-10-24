import { describe, expect, it } from 'vitest';
import {
  eyeOf,
  orbitBy,
  threeQuarterView,
  transform,
  viewProjection,
} from '../../src/render3d/camera';
import { basicFinnerRocket } from '../../src/render3d/presets';
import { rocketMesh } from '../../src/render3d/rocket-mesh';
import { bodyLength } from '../../src/geometry/body';

/**
 * The rocket mesh's winding on screen (src/render3d/rocket-mesh.ts), as the
 * see-through redraw of the rocket (scene.ts, body.wgsl body_ghost_fs)
 * depends on it: its near side, by the stored outward normals, from the
 * first view and two turned ones. The body's and the base's near sides wind
 * clockwise on screen, the fins' counter-clockwise, so no one culling by
 * winding keeps the near side of all three: the redraw chooses the near
 * side by normal instead. Should the mesh's winding be made consistent, this
 * test says so first (and any pipeline that culls must then be checked).
 */
describe('the rocket mesh on screen', () => {
  const rocket = basicFinnerRocket();
  const mesh = rocketMesh(rocket);
  const L = bodyLength(rocket.body);
  const first = threeQuarterView(0, L, 0.35 * L, 1.6);
  const views = [first, orbitBy(first, 0.9, 0), orbitBy(first, -0.6, 0.5)];

  /** Near-side triangles of a part (0 body, 1 fins, 2 base) by on-screen winding. */
  function windings(view: (typeof views)[number], part: number): { cw: number; ccw: number } {
    const m = viewProjection(view, 1.6, L);
    const eye = eyeOf(view);
    const P = mesh.positions;
    const N = mesh.normals;
    let cw = 0;
    let ccw = 0;
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const k = [mesh.indices[t]!, mesh.indices[t + 1]!, mesh.indices[t + 2]!];
      if (Math.round(mesh.parts[k[0]!]!) !== part) continue;
      // Near side: the stored outward normals (averaged) face the eye.
      let facing = 0;
      for (const v of k) {
        const toEye = [0, 1, 2].map((c) => eye[c]! - P[3 * v + c]!);
        facing += toEye[0]! * N[3 * v]! + toEye[1]! * N[3 * v + 1]! + toEye[2]! * N[3 * v + 2]!;
      }
      if (!(facing > 0)) continue;
      const s = k.map((v) => {
        const c = transform(m, [P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!]);
        return [c[0] / c[3], c[1] / c[3]];
      });
      const area =
        (s[1]![0]! - s[0]![0]!) * (s[2]![1]! - s[0]![1]!) -
        (s[2]![0]! - s[0]![0]!) * (s[1]![1]! - s[0]![1]!);
      if (Math.abs(area) < 1e-12) continue;
      if (area > 0) ccw++;
      else cw++;
    }
    return { cw, ccw };
  }

  it('winds the body and the base clockwise on its near side, the fins counter-clockwise', () => {
    for (const view of views) {
      const body = windings(view, 0);
      const fins = windings(view, 1);
      const base = windings(view, 2);
      expect(body.cw + body.ccw).toBeGreaterThan(100);
      expect(body.cw / (body.cw + body.ccw)).toBeGreaterThan(0.9);
      expect(fins.ccw / (fins.cw + fins.ccw)).toBeGreaterThan(0.9);
      if (base.cw + base.ccw > 0) expect(base.cw / (base.cw + base.ccw)).toBeGreaterThan(0.9);
    }
  });
});
