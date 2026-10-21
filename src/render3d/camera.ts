/**
 * The 3D view's camera: an orbit about a target point, with the few 4 x 4
 * matrix operations it needs (column-major, as WGSL reads a mat4x4f;
 * clip-space depth from 0 to 1, as WebGPU's). Pure functions of plain
 * numbers.
 *
 * The world: x along the rocket's axis (downstream), y up on the screen
 * in the default view, z towards the viewer's side.
 */

export type Vec3 = readonly [number, number, number];
export type Mat4 = Float32Array<ArrayBuffer>;

export interface Orbit {
  readonly target: Vec3;
  /** Azimuth of the eye about the y axis from +z, radians. */
  readonly yaw: number;
  /** Elevation of the eye above the x-z plane, radians. */
  readonly pitch: number;
  readonly distance: number;
  /** Vertical field of view, radians. */
  readonly fovY: number;
}

export const PITCH_LIMIT = Math.PI / 2 - 0.01;

export function eyeOf(o: Orbit): Vec3 {
  const cp = Math.cos(o.pitch);
  return [
    o.target[0] + o.distance * cp * Math.sin(o.yaw),
    o.target[1] + o.distance * Math.sin(o.pitch),
    o.target[2] + o.distance * cp * Math.cos(o.yaw),
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

/** The camera's right, up and backward unit vectors (its frame). */
export function cameraFrame(o: Orbit): { right: Vec3; up: Vec3; back: Vec3 } {
  const back = normalize(sub(eyeOf(o), o.target));
  const right = normalize(cross([0, 1, 0], back));
  const up = cross(back, right);
  return { right, up, back };
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
  return multiply(perspective(o.fovY, aspect, near, far), lookAt(eye, o.target, [0, 1, 0]));
}

/** Turn the orbit by these angles (radians), keeping the pitch inside its limits. */
export function orbitBy(o: Orbit, dYaw: number, dPitch: number): Orbit {
  return {
    ...o,
    yaw: o.yaw + dYaw,
    pitch: Math.min(Math.max(o.pitch + dPitch, -PITCH_LIMIT), PITCH_LIMIT),
  };
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
 * the distance by bisection, the target moved so that the points'
 * projection is centred.
 */
export function fitOrbit(
  angles: { yaw: number; pitch: number; fovY: number },
  points: readonly Vec3[],
  aspect: number,
  margin = 0.9,
): Orbit {
  const centre: Vec3 = [0, 1, 2].map(
    (k) => points.reduce((s, p) => s + p[k]!, 0) / points.length,
  ) as unknown as Vec3;
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

/**
 * The 3/4 view of a box from xMin to xMax along the axis and of radius
 * rMax about it: from ahead, to the side and above, the whole box in view.
 */
export function threeQuarterView(
  xMin: number,
  xMax: number,
  rMax: number,
  aspect: number,
  outline?: { x: readonly number[]; r: readonly number[] },
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
    { yaw: (-34 * Math.PI) / 180, pitch: (24 * Math.PI) / 180, fovY: (30 * Math.PI) / 180 },
    points,
    aspect,
    0.96,
  );
  // A little closer than the whole region, towards the rocket: the far
  // reaches of the shock may leave the view.
  return outline === undefined ? fitted : { ...fitted, distance: 0.84 * fitted.distance };
}
