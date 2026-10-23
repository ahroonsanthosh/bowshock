import { describe, expect, it } from 'vitest';
import {
  cameraFrame,
  DEFAULT_ROTATION,
  eyeOf,
  fitOrbit,
  lookAt,
  multiply,
  orbitBy,
  panBy,
  perspective,
  rocketCentre,
  rotationOf,
  threeQuarterView,
  transform,
  viewProjection,
  type Orbit,
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
      const o = fitOrbit({ rotation: rotationOf(-0.6, 0.4), fovY: 0.5 }, points, aspect, 0.9);
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

  it('the default view is the same picture as before: yaw -34 deg, pitch 24 deg, y up', () => {
    const o = threeQuarterView(0, 10, 6, 1.6);
    const yaw = (-34 * Math.PI) / 180;
    const pitch = (24 * Math.PI) / 180;
    const back = [
      Math.cos(pitch) * Math.sin(yaw),
      Math.sin(pitch),
      Math.cos(pitch) * Math.cos(yaw),
    ];
    const f = cameraFrame(o);
    for (let k = 0; k < 3; k++) expect(f.back[k]).toBeCloseTo(back[k]!, 12);
    // The old view matrix (lookAt with y up) and the new one (from the frame) agree on screen.
    const old = multiply(perspective(o.fovY, 1.6, 1, 100), lookAt(eyeOf(o), o.target, [0, 1, 0]));
    const now = viewProjection(o, 1.6, 10);
    const p: Vec3 = [3, 2, -1];
    const a = transform(old, p);
    const b = transform(now, p);
    expect(a[0] / a[3]).toBeCloseTo(b[0] / b[3], 4);
    expect(a[1] / a[3]).toBeCloseTo(b[1] / b[3], 4);
  });
});

/** The frame's largest departure from orthonormal. */
function orthonormalError(o: Orbit): number {
  const { right, up, back } = cameraFrame(o);
  const d = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.max(
    Math.abs(d(right, right) - 1),
    Math.abs(d(up, up) - 1),
    Math.abs(d(back, back) - 1),
    Math.abs(d(right, up)),
    Math.abs(d(up, back)),
    Math.abs(d(back, right)),
    Math.abs(Math.hypot(...o.rotation) - 1),
  );
}

/** The eye's direction from the target, unit. */
const view = (o: Orbit): Vec3 => cameraFrame(o).back;

describe('turning the view freely (a trackball)', () => {
  const start = (): Orbit => ({
    target: [0, 0, 0],
    rotation: DEFAULT_ROTATION,
    distance: 10,
    fovY: 0.5,
  });
  /** Drag by many small steps, as the pointer does (radians in all). */
  const drag = (o: Orbit, dx: number, dy: number, steps = 200): Orbit[] => {
    const path: Orbit[] = [];
    for (let k = 0; k < steps; k++) {
      o = orbitBy(o, dx / steps, dy / steps);
      path.push(o);
    }
    return path;
  };

  it('a drag straight up the screen goes over the top and on, continuously, with no flip', () => {
    // From the default view, a full turn about the screen's right axis.
    const path = drag(start(), 0, 2 * Math.PI, 2000);
    let top = -1;
    let bottom = 1;
    let prev = view(start());
    for (const o of path) {
      const v = view(o);
      // Each small step moves the eye a little: never a jump (no gimbal flip).
      expect(Math.hypot(v[0] - prev[0], v[1] - prev[1], v[2] - prev[2])).toBeLessThan(0.01);
      expect(v.every(Number.isFinite)).toBe(true);
      top = Math.max(top, v[1]);
      bottom = Math.min(bottom, v[1]);
      prev = v;
    }
    // Straight down from above, and straight up from below, both passed through.
    expect(top).toBeGreaterThan(0.9999);
    expect(bottom).toBeLessThan(-0.9999);
    // A full turn comes back to the start.
    const end = view(path.at(-1)!);
    const v0 = view(start());
    for (let k = 0; k < 3; k++) expect(end[k]).toBeCloseTo(v0[k]!, 9);
  });

  it('reaches the view from straight above, straight below, nose-on and tail-on', () => {
    // Level the view first (down by its 24 degrees), then turn.
    const level = drag(start(), 0, (-24 * Math.PI) / 180).at(-1)!;
    expect(view(level)[1]).toBeCloseTo(0, 9);
    const above = drag(level, 0, Math.PI / 2).at(-1)!;
    expect(view(above)[1]).toBeCloseTo(1, 9);
    const below = drag(level, 0, -Math.PI / 2).at(-1)!;
    expect(view(below)[1]).toBeCloseTo(-1, 9);
    // Nose-on: the eye ahead of the nose on the axis (-x); the default looks from 34 degrees ahead.
    const nose = drag(level, (-56 * Math.PI) / 180, 0).at(-1)!;
    expect(view(nose)[0]).toBeCloseTo(-1, 9);
    const tail = drag(level, (124 * Math.PI) / 180, 0).at(-1)!;
    expect(view(tail)[0]).toBeCloseTo(1, 9);
    // And past the top onto the far side: up the screen by 120 degrees from level.
    const over = drag(level, 0, (2 * Math.PI) / 3).at(-1)!;
    expect(view(over)[1]).toBeCloseTo(Math.sin(Math.PI / 3), 9);
    const lv = view(level);
    expect(lv[0] * view(over)[0] + lv[2] * view(over)[2]).toBeLessThan(0);
  });

  it('stays orthonormal after 10,000 small random drags', () => {
    let o = start();
    let seed = 12345;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648 - 0.5;
    };
    for (let k = 0; k < 10_000; k++) o = orbitBy(o, 0.1 * random(), 0.1 * random());
    expect(orthonormalError(o)).toBeLessThan(1e-12);
    const m = viewProjection(o, 1.6, 10);
    expect(Array.from(m).every(Number.isFinite)).toBe(true);
    // The target still at the centre of the view.
    const c = transform(m, o.target);
    expect(c[0] / c[3]).toBeCloseTo(0, 5);
    expect(c[1] / c[3]).toBeCloseTo(0, 5);
  });

  it('a zero or non-finite drag leaves the view as it was', () => {
    const o = start();
    expect(orbitBy(o, 0, 0)).toBe(o);
    expect(orbitBy(o, Number.NaN, 0)).toBe(o);
  });

  it('reset (the 3/4 view again) restores the default after any turning', () => {
    const first = threeQuarterView(0, 10, 6, 1.6);
    let o = first;
    for (let k = 0; k < 500; k++) o = orbitBy(o, 0.03, 0.05);
    expect(Math.hypot(...view(o).map((x, k) => x - view(first)[k]!))).toBeGreaterThan(0.1);
    // The scene's reset computes the 3/4 view afresh: the same as the first.
    const reset = threeQuarterView(0, 10, 6, 1.6);
    expect(reset).toEqual(first);
    expect(reset.rotation).toEqual(DEFAULT_ROTATION);
  });
});

describe('the view turns about the rocket', () => {
  /** A rocket 10 long with a flow region (its shock, revolved) from the tip to the base. */
  const L = 10;
  const outline = {
    x: Array.from({ length: 41 }, (_, k) => (k * L) / 40),
    r: Array.from({ length: 41 }, (_, k) => 0.5 + (k * 0.55 * L) / 40),
  };
  const fitted = () => threeQuarterView(0, L, 0.55 * L + 0.5, 1.6, outline, rocketCentre(L));
  const drag = (o: Orbit, dx: number, dy: number, steps = 200): Orbit => {
    for (let k = 0; k < steps; k++) o = orbitBy(o, dx / steps, dy / steps);
    return o;
  };
  /** Where the rocket's centre lands on the screen (clip units, 0 the centre). */
  const onScreen = (o: Orbit) => {
    const c = transform(viewProjection(o, 1.6, 2 * L), rocketCentre(L));
    return [c[0] / c[3], c[1] / c[3], c[3]] as const;
  };

  it('the default view: the pivot is the rocket centre, at the centre of the view, the region in view', () => {
    const o = fitted();
    expect(o.target).toEqual([5, 0, 0]);
    expect(o.rotation).toEqual(DEFAULT_ROTATION);
    const [x, y, w] = onScreen(o);
    expect(Math.abs(x)).toBeLessThan(1e-6);
    expect(Math.abs(y)).toBeLessThan(1e-6);
    expect(w).toBeGreaterThan(0);
    // The nose tip and the base on screen.
    const m = viewProjection(o, 1.6, 2 * L);
    for (const p of [
      [0, 0, 0],
      [L, 0, 0],
    ] as Vec3[]) {
      const c = transform(m, p);
      expect(Math.abs(c[0] / c[3])).toBeLessThan(1);
      expect(Math.abs(c[1] / c[3])).toBeLessThan(1);
    }
  });

  it('nose-on, from above and from below: the rocket centre stays at the centre of the view', () => {
    const level = drag(fitted(), 0, (-24 * Math.PI) / 180);
    const views = {
      noseOn: drag(level, (-56 * Math.PI) / 180, 0),
      above: drag(level, 0, Math.PI / 2),
      below: drag(level, 0, -Math.PI / 2),
    };
    expect(cameraFrame(views.noseOn).back[0]).toBeCloseTo(-1, 9);
    expect(cameraFrame(views.above).back[1]).toBeCloseTo(1, 9);
    expect(cameraFrame(views.below).back[1]).toBeCloseTo(-1, 9);
    for (const [name, o] of Object.entries(views)) {
      const [x, y, w] = onScreen(o);
      expect(Math.abs(x), name).toBeLessThan(1e-6);
      expect(Math.abs(y), name).toBeLessThan(1e-6);
      expect(w, name).toBeGreaterThan(0);
    }
  });

  it('pan moves the pivot; reset brings it back to the rocket', () => {
    const o = panBy(fitted(), 0.2, -0.1);
    expect(o.target).not.toEqual([5, 0, 0]);
    expect(fitted().target).toEqual([5, 0, 0]);
  });
});
