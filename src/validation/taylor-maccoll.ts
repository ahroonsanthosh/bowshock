/**
 * Supersonic flow over a cone at zero angle of attack: the Taylor-Maccoll
 * solution (G. I. Taylor and J. W. Maccoll, "The air pressure on a cone
 * moving at high speeds", Proc. R. Soc. Lond. A 139, 1933), the exact
 * reference for axisymmetric solvers.
 *
 * Between an attached conical shock and the cone the flow is conical (it
 * depends only on the polar angle theta from the axis), isentropic and
 * irrotational. With velocity components V_r (radial) and V_theta = dV_r/dtheta,
 * both divided by the maximum (stagnation) speed, the Euler equations reduce
 * to the ordinary differential equation
 *
 *   (gamma-1)/2 (1 - V_r^2 - V_r'^2) (2 V_r + V_r' cot(theta) + V_r'')
 *     - V_r' (V_r V_r' + V_r' V_r'') = 0,
 *
 * integrated from the shock, where the oblique-shock relations give the
 * state, inwards to the cone surface, where V_theta = 0. The shock angle is
 * found so that the surface lies at the requested cone angle.
 */

import { deflectionAngle, machAngle, normalShock, stagnationPressureRatio } from './gas-dynamics';

export interface ConeFlow {
  /** Shock wave angle, radians. */
  readonly shockAngle: number;
  /** Mach number just behind the shock. */
  readonly postShockMach: number;
  /** Static pressure just behind the shock, over the free-stream pressure. */
  readonly postShockPressureRatio: number;
  /** Mach number on the cone surface. */
  readonly surfaceMach: number;
  /** Cone surface pressure over the free-stream pressure. */
  readonly surfacePressureRatio: number;
  /** Surface pressure coefficient (p_c - p_inf) / (gamma/2 p_inf M_inf^2). */
  readonly surfacePressureCoefficient: number;
}

/** Speed over the maximum speed, V / V_max, for Mach number M. */
function speedFromMach(mach: number, gamma: number): number {
  return 1 / Math.sqrt(1 + 2 / ((gamma - 1) * mach * mach));
}

/** Mach number for speed over the maximum speed. */
function machFromSpeed(speed: number, gamma: number): number {
  return Math.sqrt(2 / ((gamma - 1) * (1 / (speed * speed) - 1)));
}

/** One classical fourth-order Runge-Kutta step of the Taylor-Maccoll equation. */
function rk4Step(
  theta: number,
  vr: number,
  vt: number,
  h: number,
  gamma: number,
): [number, number] {
  const [k1r, k1t] = derivatives(theta, vr, vt, gamma);
  const [k2r, k2t] = derivatives(theta + h / 2, vr + (h / 2) * k1r, vt + (h / 2) * k1t, gamma);
  const [k3r, k3t] = derivatives(theta + h / 2, vr + (h / 2) * k2r, vt + (h / 2) * k2t, gamma);
  const [k4r, k4t] = derivatives(theta + h, vr + h * k3r, vt + h * k3t, gamma);
  return [
    vr + (h / 6) * (k1r + 2 * k2r + 2 * k3r + k4r),
    vt + (h / 6) * (k1t + 2 * k2t + 2 * k3t + k4t),
  ];
}

/** dV_r/dtheta and dV_theta/dtheta from the Taylor-Maccoll equation. */
function derivatives(theta: number, vr: number, vt: number, gamma: number): [number, number] {
  const a = 0.5 * (gamma - 1) * (1 - vr * vr - vt * vt);
  const vtt = (vr * vt * vt - a * (2 * vr + vt / Math.tan(theta))) / (a - vt * vt);
  return [vt, vtt];
}

/**
 * Integrate from the shock (angle beta) towards the axis until V_theta = 0.
 * Returns the cone angle and the surface speed, or null if the solution
 * never reaches V_theta = 0 (no cone corresponds to this shock).
 */
function integrateToCone(
  mach: number,
  beta: number,
  gamma: number,
  tolerance: number,
): { coneAngle: number; surfaceSpeed: number } | null {
  // State behind the shock from the oblique-shock relations: the normal
  // component is processed by a normal shock, the tangential one is kept.
  const mn1 = mach * Math.sin(beta);
  const shock = normalShock(mn1, gamma);
  const deflection = deflectionAngle(mach, beta, gamma);
  const mach2 = shock.downstreamMach / Math.sin(beta - deflection);
  const speed = speedFromMach(mach2, gamma);
  // The velocity behind the shock points along the deflected stream, at
  // angle (beta - deflection) to the shock ray.
  let vr = speed * Math.cos(beta - deflection);
  let vt = -speed * Math.sin(beta - deflection);

  // Adaptive fourth-order Runge-Kutta in theta, stepping towards the axis.
  // Fixed steps are not enough: next to the shock the equation is nearly
  // singular when the shock is weak (its denominator A - V_theta^2 vanishes
  // on a Mach cone, and behind a weak shock the flow starts beside one), and
  // cot(theta) grows without bound at the axis. Each step is therefore
  // checked against two half steps (step doubling) and resized to meet
  // `tolerance`.
  let theta = beta;
  let h = -1e-4 * beta;
  while (theta > 1e-12) {
    h = Math.max(h, -0.5 * theta);
    const full = rk4Step(theta, vr, vt, h, gamma);
    const halfway = rk4Step(theta, vr, vt, h / 2, gamma);
    const half = rk4Step(theta + h / 2, halfway[0], halfway[1], h / 2, gamma);
    const error = Math.max(Math.abs(half[0] - full[0]), Math.abs(half[1] - full[1])) / 15;
    if (!(error <= tolerance)) {
      h /= 2;
      // A step that cannot be made accurate means the start is on the
      // singular line itself (a vanishing shock): there is no cone.
      if (Math.abs(h) < 1e-14 * theta) return null;
      continue;
    }
    // Richardson extrapolation of the two estimates: fifth-order accurate.
    const nextR = half[0] + (half[0] - full[0]) / 15;
    const nextT = half[1] + (half[1] - full[1]) / 15;
    if (nextT >= 0) {
      // V_theta crosses zero within this step: shrink the step until the
      // crossing is pinned down, then interpolate across the tiny last step.
      if (Math.abs(h) > 1e-12) {
        h /= 2;
        continue;
      }
      const f = vt / (vt - nextT);
      return { coneAngle: theta + f * h, surfaceSpeed: vr + f * (nextR - vr) };
    }
    theta += h;
    vr = nextR;
    vt = nextT;
    // Grow the step when the error is comfortably small.
    h *= Math.min(2, 0.9 * (tolerance / Math.max(error, 1e-300)) ** 0.2);
  }
  return null;
}

/**
 * Taylor-Maccoll solution for a cone of half-angle `coneAngle` (radians) in
 * a stream of Mach number `mach`. Throws if the shock would detach.
 * `tolerance` is the local error allowed per integration step in the
 * velocity components (in units of the maximum speed); the default gives
 * about ten correct digits.
 */
export function taylorMaccoll(
  mach: number,
  coneAngle: number,
  gamma: number,
  tolerance = 1e-13,
): ConeFlow {
  if (!(coneAngle > 0)) throw new RangeError('the cone half-angle must be positive');
  // Cone angle for a given shock angle. At the Mach angle the shock
  // vanishes, the flow is undisturbed and the cone angle is zero by
  // definition (the integration would start on the equation's singular line).
  const mu = machAngle(mach);
  const coneAt = (beta: number) =>
    beta <= mu ? 0 : (integrateToCone(mach, beta, gamma, tolerance)?.coneAngle ?? NaN);

  // The cone angle grows from zero as the shock angle increases along the
  // weak branch. Bracket the requested angle, then bisect. The bracket must
  // start exactly at the Mach angle: for thin cones the shock angle exceeds
  // it by only about the fourth power of the cone angle (4e-11 rad for a
  // 0.05 deg cone at Mach 3).
  let lo = mu;
  let hi = mu;
  let previous = 0;
  const stepUp = 0.5 * (Math.PI / 180);
  for (;;) {
    hi += stepUp;
    const c = coneAt(hi);
    if (!(hi < Math.PI / 2) || Number.isNaN(c) || c < previous) {
      throw new RangeError('the shock detaches: no attached conical solution');
    }
    if (c >= coneAngle) break;
    lo = hi;
    previous = c;
  }
  for (let k = 0; k < 60 && hi - lo > 1e-15; k++) {
    const mid = 0.5 * (lo + hi);
    if (coneAt(mid) < coneAngle) lo = mid;
    else hi = mid;
  }
  const beta = 0.5 * (lo + hi);
  const result = integrateToCone(mach, beta, gamma, tolerance);
  if (result === null) throw new Error('integration failed to reach the cone');

  const shock = normalShock(mach * Math.sin(beta), gamma);
  const deflection = deflectionAngle(mach, beta, gamma);
  const postShockMach = shock.downstreamMach / Math.sin(beta - deflection);
  const surfaceMach = machFromSpeed(result.surfaceSpeed, gamma);
  // Isentropic from just behind the shock to the surface.
  const surfacePressureRatio =
    (shock.pressureRatio * stagnationPressureRatio(postShockMach, gamma)) /
    stagnationPressureRatio(surfaceMach, gamma);
  return {
    shockAngle: beta,
    postShockMach,
    postShockPressureRatio: shock.pressureRatio,
    surfaceMach,
    surfacePressureRatio,
    surfacePressureCoefficient: (surfacePressureRatio - 1) / (0.5 * gamma * mach * mach),
  };
}
