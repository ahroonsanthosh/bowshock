/**
 * The 3D view's camera: an orbit about a target point, with the few 4 x 4
 * matrix operations it needs (column-major, as WGSL reads a mat4x4f;
 * clip-space depth from 0 to 1, as WebGPU's). Pure functions of plain
 * numbers.
 *
 * The camera's orientation is a unit quaternion, not yaw and pitch, so a
 * drag turns the view freely, as a trackball: over the top, underneath,
 * nose-on, tail-on and any roll, with no limit, no flip at the poles and
 * no NaN. Each turn is about the screen-space axis perpendicular to the
 * drag, and the quaternion is normalised after every step.
 *
 * The world: x along the rocket's axis (downstream), y up on the screen
 * in the default view, z towards the viewer's side.
 */

export type Vec3 = readonly [number, number, number];
export type Mat4 = Float32Array<ArrayBuffer>;
/** A unit quaternion (w, x, y, z): the camera's turn from the world's axes. */
export type Quat = readonly [number, number, number, number];

export interface Orbit {
  readonly target: Vec3;
  /**
   * The camera's orientation: it takes the camera's own right (+x), up
   * (+y) and backward (+z, from the target to the eye) to the world's.
   */
  readonly rotation: Quat;
  readonly distance: number;
  /** Vertical field of view, radians. */
  readonly fovY: number;
}

/** Rotate a vector by a unit quaternion. */
export function rotate(q: Quat, v: Vec3): Vec3 {
  const [w, x, y, z] = q;
  // t = 2 (q.xyz x v); v' = v + w t + q.xyz x t
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

/** The product a b: b's turn, then a's. */
export function quatMultiply(a: Quat, b: Quat): Quat {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
}

/** A quaternion scaled to unit length (the identity if it has none). */
export function quatNormalize(q: Quat): Quat {
  const l = Math.hypot(q[0], q[1], q[2], q[3]);
  return l > 0 && Number.isFinite(l) ? [q[0] / l, q[1] / l, q[2] / l, q[3] / l] : [1, 0, 0, 0];
}

/** The turn by `angle` radians about the unit `axis` (right-handed). */
export function axisAngle(axis: Vec3, angle: number): Quat {
  const s = Math.sin(angle / 2);
  return [Math.cos(angle / 2), axis[0] * s, axis[1] * s, axis[2] * s];
}

/** The quaternion of the rotation whose matrix has these columns (an orthonormal, right-handed frame). */
export function quatFromFrame(right: Vec3, up: Vec3, back: Vec3): Quat {
  const [m00, m10, m20] = right;
  const [m01, m11, m21] = up;
  const [m02, m12, m22] = back;
  const trace = m00 + m11 + m22;
  let q: Quat;
  if (trace > 0) {
    const s = 2 * Math.sqrt(trace + 1);
    q = [0.25 * s, (m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s];
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    q = [(m21 - m12) / s, 0.25 * s, (m01 + m10) / s, (m02 + m20) / s];
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    q = [(m02 - m20) / s, (m01 + m10) / s, 0.25 * s, (m12 + m21) / s];
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    q = [(m10 - m01) / s, (m02 + m20) / s, (m12 + m21) / s, 0.25 * s];
  }
  return quatNormalize(q);
}

/**
 * The orientation of an eye at this azimuth (about the y axis from +z)
 * and elevation (above the x-z plane), radians, the screen's up in the
 * plane of y: how the default view is set. The elevation must lie
 * strictly between -pi/2 and pi/2.
 */
export function rotationOf(yaw: number, pitch: number): Quat {
  const cp = Math.cos(pitch);
  const back: Vec3 = [cp * Math.sin(yaw), Math.sin(pitch), cp * Math.cos(yaw)];
  const right = normalize(cross([0, 1, 0], back));
  const up = cross(back, right);
  return quatFromFrame(right, up, back);
}

export function eyeOf(o: Orbit): Vec3 {
  const back = rotate(o.rotation, [0, 0, 1]);
  return [
    o.target[0] + o.distance * back[0],
    o.target[1] + o.distance * back[1],
    o.target[2] + o.distance * back[2],
  ];
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** The camera's right, up and backward unit vectors (its frame), orthonormal. */
export function cameraFrame(o: Orbit): { right: Vec3; up: Vec3; back: Vec3 } {
  const back = normalize(rotate(o.rotation, [0, 0, 1]));
  const up0 = rotate(o.rotation, [0, 1, 0]);
  const right = normalize(cross(up0, back));
  const up = cross(back, right);
  return { right, up, back };
}

/** The view matrix of a camera at `eye` with this frame (no up hint, so no pole). */
export function viewMatrix(eye: Vec3, right: Vec3, up: Vec3, back: Vec3): Mat4 {
  return new Float32Array([
    right[0],
    up[0],
    back[0],
    0,
    right[1],
    up[1],
    back[1],
    0,
    right[2],
    up[2],
    back[2],
    0,
    -dot(right, eye),
    -dot(up, eye),
    -dot(back, eye),
    1,
  ]);
}

export function lookAt(eye: Vec3, target: Vec3, upHint: Vec3): Mat4 {
  const f = normalize(sub(eye, target));
  const s = normalize(cross(upHint, f));
  const u = cross(f, s);
  return new Float32Array([
    s[0],
    u[0],
    f[0],
    0,
    s[1],
    u[1],
    f[1],
    0,
    s[2],
    u[2],
    f[2],
    0,
    -dot(s, eye),
    -dot(u, eye),
    -dot(f, eye),
    1,
  ]);
}

/** Perspective projection to WebGPU's clip space (depth 0 at near, 1 at far). */
export function perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    far * nf,
    -1,
    0,
    0,
    near * far * nf,
    0,
  ]);
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r]! * b[c * 4 + k]!;
      out[c * 4 + r] = s;
    }
  }
  return out;
}

/** Apply a matrix to a point: clip coordinates (x, y, z, w). */
export function transform(m: Mat4, p: Vec3): [number, number, number, number] {
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) {
    out[r] = m[r]! * p[0] + m[4 + r]! * p[1] + m[8 + r]! * p[2] + m[12 + r]!;
  }
  return out;
}

/** View-projection matrix of an orbit, for a viewport of this aspect, with near and far planes about the scene. */
export function viewProjection(o: Orbit, aspect: number, sceneRadius: number): Mat4 {
  const eye = eyeOf(o);
  const near = Math.max(o.distance - 2 * sceneRadius, o.distance * 0.01, 1e-3);
  const far = o.distance + 2 * sceneRadius;
  const { right, up, back } = cameraFrame(o);
  return multiply(perspective(o.fovY, aspect, near, far), viewMatrix(eye, right, up, back));
}

/**
 * Turn the view as a trackball, by `dx` radians about the screen's up
 * axis (the eye moves to the right for positive dx) and `dy` about its
 * right axis (the eye moves up for positive dy): one turn, about the
 * screen-space axis perpendicular to the drag. No limit: the eye goes
 * over the top and underneath; the result is normalised.
 */
export function orbitBy(o: Orbit, dx: number, dy: number): Orbit {
  const angle = Math.hypot(dx, dy);
  if (!(angle > 0) || !Number.isFinite(angle)) return o;
  const { right, up } = cameraFrame(o);
  // The eye turns about up by dx (towards right) and about right by -dy (towards up).
  const axis = normalize([
    (dx * up[0] - dy * right[0]) / angle,
    (dx * up[1] - dy * right[1]) / angle,
    (dx * up[2] - dy * right[2]) / angle,
  ]);
  return { ...o, rotation: quatNormalize(quatMultiply(axisAngle(axis, angle), o.rotation)) };
}

/** Move the target in the screen's plane by (dx, dy) in units of the distance. */
export function panBy(o: Orbit, dx: number, dy: number): Orbit {
  const { right, up } = cameraFrame(o);
  const k = o.distance;
  return {
    ...o,
    target: [
      o.target[0] - (right[0] * dx - up[0] * dy) * k,
      o.target[1] - (right[1] * dx - up[1] * dy) * k,
      o.target[2] - (right[2] * dx - up[2] * dy) * k,
    ],
  };
}

/** Zoom by `factor` (above 1 closer), within [minDistance, maxDistance]. */
export function zoomBy(o: Orbit, factor: number, minDistance: number, maxDistance: number): Orbit {
  return { ...o, distance: Math.min(Math.max(o.distance / factor, minDistance), maxDistance) };
}

/**
 * The orbit at these angles that shows every point as large as fits,
 * within `margin` of the edges (in clip units, 1 the whole half-width):
 * the distance by bisection. Without a `pivot`, the target is moved so
 * that the points' projection is centred; with one, the target is the
 * pivot (the view turns about it and it stays at the centre of the view)
 * and every point fits within the margin about it.
 */
export function fitOrbit(
  angles: { rotation: Quat; fovY: number },
  points: readonly Vec3[],
  aspect: number,
  margin = 0.9,
  pivot?: Vec3,
): Orbit {
  const centre: Vec3 =
    pivot ??
    ([0, 1, 2].map(
      (k) => points.reduce((s, p) => s + p[k]!, 0) / points.length,
    ) as unknown as Vec3);
  const radius = Math.max(
    ...points.map((p) => Math.hypot(p[0] - centre[0], p[1] - centre[1], p[2] - centre[2])),
    1e-9,
  );
  let orbit: Orbit = { ...angles, target: centre, distance: 3 * radius };
  const extent = (o: Orbit) => {
    const m = viewProjection(o, aspect, radius);
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of points) {
      const c = transform(m, p);
      if (c[3] <= 0) return { x0: -Infinity, x1: Infinity, y0: -Infinity, y1: Infinity };
      x0 = Math.min(x0, c[0] / c[3]);
      x1 = Math.max(x1, c[0] / c[3]);
      y0 = Math.min(y0, c[1] / c[3]);
      y1 = Math.max(y1, c[1] / c[3]);
    }
    return { x0, x1, y0, y1 };
  };
  if (pivot !== undefined) {
    let lo = 0.1 * radius;
    let hi = 50 * radius;
    for (let k = 0; k < 60; k++) {
      const d = 0.5 * (lo + hi);
      const e = extent({ ...orbit, distance: d });
      const fits = Math.max(-e.x0, e.x1) <= margin && Math.max(-e.y0, e.y1) <= margin;
      if (fits) hi = d;
      else lo = d;
    }
    return { ...orbit, distance: hi };
  }
  for (let pass = 0; pass < 4; pass++) {
    let lo = 0.5 * radius;
    let hi = 50 * radius;
    for (let k = 0; k < 50; k++) {
      const d = 0.5 * (lo + hi);
      const e = extent({ ...orbit, distance: d });
      const fits = e.x1 - e.x0 <= 2 * margin && e.y1 - e.y0 <= 2 * margin;
      if (fits) hi = d;
      else lo = d;
    }
    orbit = { ...orbit, distance: hi };
    // Centre the projection: pan by its offset (in units of the distance).
    const e = extent(orbit);
    const t = Math.tan(orbit.fovY / 2);
    orbit = panBy(orbit, -0.5 * (e.x0 + e.x1) * t * aspect, 0.5 * (e.y0 + e.y1) * t);
  }
  return orbit;
}

/** The default view's orientation: from ahead (34 degrees), to the side and above (24 degrees). */
export const DEFAULT_ROTATION: Quat = rotationOf((-34 * Math.PI) / 180, (24 * Math.PI) / 180);

/** The rocket's centre on its axis, the pivot the view turns about: midway from the nose's tip (x = 0) to the base. */
export function rocketCentre(length: number): Vec3 {
  return [0.5 * length, 0, 0];
}

/**
 * The 3/4 view of a box from xMin to xMax along the axis and of radius
 * rMax about it: from ahead, to the side and above, the whole box in view,
 * turning about `pivot` (the rocket's centre; by default the box's centre
 * on the axis), which stays at the centre of the view.
 */
export function threeQuarterView(
  xMin: number,
  xMax: number,
  rMax: number,
  aspect: number,
  outline?: { x: readonly number[]; r: readonly number[] },
  pivot: Vec3 = [0.5 * (xMin + xMax), 0, 0],
): Orbit {
  // Fitted to the computed region itself (its outline revolved) where
  // known, so that the flow fills the view and the box may run past its
  // edges; otherwise to the box's corners.
  const points: Vec3[] = [];
  if (outline !== undefined && outline.x.length > 1) {
    const step = Math.max(1, Math.floor(outline.x.length / 48));
    for (let k = 0; k < outline.x.length; k += step) {
      for (let a = 0; a < 24; a++) {
        const phi = (2 * Math.PI * a) / 24;
        points.push([outline.x[k]!, outline.r[k]! * Math.cos(phi), outline.r[k]! * Math.sin(phi)]);
      }
    }
  } else {
    for (let i = 0; i < 8; i++) {
      points.push([i & 1 ? xMax : xMin, i & 2 ? rMax : -rMax, i & 4 ? rMax : -rMax]);
    }
  }
  const fitted = fitOrbit(
    { rotation: DEFAULT_ROTATION, fovY: (30 * Math.PI) / 180 },
    points,
    aspect,
    0.96,
    pivot,
  );
  // A little closer than the whole region, towards the rocket: the far
  // reaches of the shock may leave the view.
  return outline === undefined ? fitted : { ...fitted, distance: 0.84 * fitted.distance };
}
