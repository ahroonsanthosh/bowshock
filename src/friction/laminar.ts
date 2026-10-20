/**
 * Laminar skin friction on a flat plate at constant pressure in
 * compressible flow: the similarity solution of the compressible boundary
 * layer, solved numerically.
 *
 * With the Howarth-Dorodnitsyn and Illingworth variables
 *
 *   xi = rho_e mu_e U_e x,   eta = U_e / sqrt(2 xi) * integral of rho dy,
 *   f'(eta) = u / U_e,       g(eta) = T / T_e,
 *
 * and the Chapman-Rubesin parameter C = rho mu / (rho_e mu_e) = mu / (mu_e g)
 * (the pressure is constant across the layer), the boundary-layer
 * equations of a calorically perfect gas with constant Prandtl number Pr
 * become the ordinary differential equations
 *
 *   (C f'')' + f f'' = 0,
 *   (C g' / Pr)' + f g' + (gamma - 1) M_e^2 C f''^2 = 0,
 *
 * with f = f' = 0 and either g = T_w / T_e or g' = 0 (adiabatic wall) at
 * eta = 0, and f' = 1, g = 1 at the edge. (F. M. White, Viscous Fluid
 * Flow, ch. 7, gives this form; the book was not read for this module.
 * The tests check the equations by solutions that are exact: with
 * constant C, f is the Blasius function stretched by sqrt(C); with Pr = 1
 * the temperature is the Crocco-Busemann function of the velocity; and
 * the adiabatic recovery factor at constant C is Pohlhausen's quadrature
 * of the Blasius shear.)
 *
 * The wall shear gives cf = 2 tau_w / (rho_e U_e^2) = sqrt(2) C_w f''(0) /
 * sqrt(Re_x), and integrating the momentum equation across the layer gives
 * Re_theta = sqrt(2 Re_x) * integral of f'(1 - f') d(eta) = sqrt(2) C_w
 * f''(0) sqrt(Re_x). So cf sqrt(Re_x) = Re_theta / sqrt(Re_x), and the
 * average over a length is CF = 2 cf.
 *
 * Solved by shooting from the wall: with tau = C f'' and q = C g' / Pr as
 * unknowns the system is first order in (f, f', tau, g, q), integrated by
 * the classical fourth-order Runge-Kutta method on a uniform eta step to
 * eta_max, and the two unknown wall values (tau and g, or tau and q) are
 * found by Newton's method on the two edge conditions, by continuation in
 * Mach number from M = 0 when the direct start fails. The step and eta_max
 * defaults are converged to about 1e-10 in cf (tests). Measured range of
 * convergence: adiabatic walls to Mach 10, walls at 0.25 to 6 times the
 * edge temperature to Mach 5 (tests); in a probe, Tw/Te = 0.25 and 2 to
 * Mach 8 and Tw/Te = 1 to Mach 7.5. Beyond that it may throw. It never
 * returns an unconverged value.
 *
 * Checked against a published solution: E. R. van Driest, NACA TN 2597
 * (1952), fig. 3, computed by the Crocco method for Pr = 0.75 and
 * Sutherland's law with S / T_e = 0.505 ("within 0.5 percent", p. 21):
 * 32 points digitised at Mach 0.26 to 10.3 agree within -0.34% to +0.84%
 * (src/validation/laminar-tn2597.ts, tests/friction/laminar.test.ts).
 */

/** Viscosity law, which sets the Chapman-Rubesin parameter C(g). */
export type ViscosityLaw =
  /** Sutherland's law with the given constant in kelvin (uses the edge temperature). */
  | { readonly kind: 'sutherland'; readonly temperature: number }
  /** mu ~ T^exponent; exponent 1 gives C = 1, the Blasius case. */
  | { readonly kind: 'power'; readonly exponent: number }
  /** C fixed at a constant, the linear law of Chapman and Rubesin. */
  | { readonly kind: 'chapman-rubesin'; readonly constant: number };

export interface LaminarConditions {
  /** Edge (here free-stream) Mach number, >= 0. */
  readonly mach: number;
  /** Edge static temperature, kelvin. */
  readonly temperature: number;
  /** Wall temperature, kelvin; omitted for an adiabatic wall. */
  readonly wallTemperature?: number;
  /** Prandtl number; default 0.72. */
  readonly prandtl?: number;
  /** Ratio of specific heats; default 1.4. */
  readonly gamma?: number;
  /** Viscosity law; default Sutherland's with 110.4 K. */
  readonly viscosity?: ViscosityLaw;
  /** Integration step in eta; default 0.005. */
  readonly step?: number;
  /** Edge of the integration domain in eta; default 10. */
  readonly etaMax?: number;
}

export interface LaminarSimilarity {
  /** cf sqrt(Re_x), equal to Re_theta / sqrt(Re_x); 0.664115 for Blasius. */
  readonly cfSqrtRe: number;
  /** Wall temperature, kelvin (the adiabatic wall temperature if none was given). */
  readonly wallTemperature: number;
  /** (T_aw - T_e) / (T_0 - T_e) for an adiabatic wall; undefined otherwise. */
  readonly recoveryFactor: number | undefined;
  /** The solution on the integration nodes. */
  readonly profile: {
    readonly eta: Float64Array;
    /** f' = u / U_e. */
    readonly velocity: Float64Array;
    /** g = T / T_e. */
    readonly temperatureRatio: Float64Array;
  };
}

/** Blasius' f''(0) in the form f''' + f f'' = 0, used to start the iteration. */
const BLASIUS_SHEAR = 0.4696;

function chapmanRubesin(law: ViscosityLaw, edgeTemperature: number): (g: number) => number {
  switch (law.kind) {
    case 'sutherland': {
      const s = law.temperature / edgeTemperature;
      return (g) => (Math.sqrt(g) * (1 + s)) / (g + s);
    }
    case 'power': {
      const w = law.exponent - 1;
      return (g) => g ** w;
    }
    case 'chapman-rubesin': {
      const c = law.constant;
      return () => c;
    }
  }
}

export function laminarSimilarity(conditions: LaminarConditions): LaminarSimilarity {
  const {
    mach,
    temperature: te,
    prandtl: pr = 0.72,
    gamma = 1.4,
    viscosity = { kind: 'sutherland', temperature: 110.4 } as const,
    step = 0.005,
    etaMax = 10,
  } = conditions;
  if (!(mach >= 0 && Number.isFinite(mach))) throw new RangeError(`bad Mach number ${mach}`);
  if (!(te > 0 && Number.isFinite(te))) throw new RangeError(`bad temperature ${te}`);
  if (!(pr > 0)) throw new RangeError(`bad Prandtl number ${pr}`);
  if (!(step > 0 && etaMax > 1)) throw new RangeError('bad integration step or domain');
  const wallTemperature = conditions.wallTemperature;
  const adiabatic = wallTemperature === undefined;
  if (!adiabatic && !(wallTemperature > 0 && Number.isFinite(wallTemperature))) {
    throw new RangeError(`bad wall temperature ${wallTemperature}`);
  }
  const C = chapmanRubesin(viscosity, te);
  const targetDissipation = (gamma - 1) * mach * mach;
  // (gamma - 1) M^2 of the problem being solved: the target, or a stage
  // of the continuation below.
  let dissipation = targetDissipation;
  const n = Math.round(etaMax / step);
  const h = etaMax / n;

  // y = [f, f', tau = C f'', g, q = C g' / Pr]
  const rhs = (y: readonly number[], out: number[]) => {
    const [f, u, tau, g, q] = y as [number, number, number, number, number];
    const c = C(g);
    const gp = (pr * q) / c;
    out[0] = u;
    out[1] = tau / c;
    out[2] = (-f * tau) / c;
    out[3] = gp;
    out[4] = -f * gp - (dissipation * tau * tau) / c;
  };

  const k1 = [0, 0, 0, 0, 0];
  const k2 = [0, 0, 0, 0, 0];
  const k3 = [0, 0, 0, 0, 0];
  const k4 = [0, 0, 0, 0, 0];
  const tmp = [0, 0, 0, 0, 0];

  /** Integrate from the wall; returns the state at eta_max, or null if it left the physical range. */
  const integrate = (
    tau0: number,
    g0: number,
    q0: number,
    store?: { u: Float64Array; g: Float64Array },
  ): number[] | null => {
    const y = [0, 0, tau0, g0, q0];
    if (store) {
      store.u[0] = 0;
      store.g[0] = g0;
    }
    for (let i = 0; i < n; i++) {
      rhs(y, k1);
      for (let j = 0; j < 5; j++) tmp[j] = y[j]! + 0.5 * h * k1[j]!;
      rhs(tmp, k2);
      for (let j = 0; j < 5; j++) tmp[j] = y[j]! + 0.5 * h * k2[j]!;
      rhs(tmp, k3);
      for (let j = 0; j < 5; j++) tmp[j] = y[j]! + h * k3[j]!;
      rhs(tmp, k4);
      for (let j = 0; j < 5; j++) {
        y[j] = y[j]! + (h / 6) * (k1[j]! + 2 * k2[j]! + 2 * k3[j]! + k4[j]!);
      }
      if (!(y[3]! > 0) || !y.every(Number.isFinite)) return null;
      if (store) {
        store.u[i + 1] = y[1]!;
        store.g[i + 1] = y[3]!;
      }
    }
    return y;
  };

  // Unknowns p = [tau0, g0] (adiabatic, q0 = 0) or [tau0, q0] (g0 fixed).
  const fixedWall = adiabatic ? 1 : wallTemperature / te;
  const start = (q: readonly [number, number]): [number, number, number] =>
    adiabatic ? [q[0], q[1], 0] : [q[0], fixedWall, q[1]];
  const residual = (q: readonly [number, number]): [number, number] | null => {
    const end = integrate(...start(q));
    return end ? [end[1]! - 1, end[3]! - 1] : null;
  };
  /** Starting values from Chapman-Rubesin and Crocco-like estimates. */
  const guess = (): [number, number] => {
    const gaw = 1 + Math.sqrt(pr) * 0.5 * dissipation;
    const gw = adiabatic ? gaw : fixedWall;
    const tau = BLASIUS_SHEAR * Math.sqrt(C(gw));
    return adiabatic ? [tau, gw] : [tau, (gaw - gw) * tau * pr ** (-2 / 3)];
  };
  /** Newton's method on the edge conditions; null if it fails. */
  const newton = (p0: readonly [number, number]): [number, number] | null => {
    const p: [number, number] = [p0[0], p0[1]];
    let r = residual(p);
    if (!r) return null;
    for (let iteration = 0; iteration < 60; iteration++) {
      const norm = Math.hypot(r[0], r[1]);
      if (norm < 1e-13) return p;
      // Jacobian by forward differences: jac[j][i] = dR_i / dp_j.
      const jac: number[][] = [];
      for (let j = 0; j < 2; j++) {
        const d = 1e-7 * Math.max(Math.abs(p[j]!), 0.1);
        const pj: [number, number] = [p[0], p[1]];
        pj[j] = pj[j]! + d;
        const rj = residual(pj);
        if (!rj) return null;
        jac.push([(rj[0] - r[0]) / d, (rj[1] - r[1]) / d]);
      }
      const a11 = jac[0]![0]!;
      const a21 = jac[0]![1]!;
      const a12 = jac[1]![0]!;
      const a22 = jac[1]![1]!;
      const det = a11 * a22 - a12 * a21;
      const dp0 = (-r[0] * a22 + r[1] * a12) / det;
      const dp1 = (-r[1] * a11 + r[0] * a21) / det;
      let lambda = 1;
      let accepted = false;
      for (let halving = 0; halving < 40; halving++) {
        const trial: [number, number] = [p[0] + lambda * dp0, p[1] + lambda * dp1];
        const rt = residual(trial);
        if (rt && Math.hypot(rt[0], rt[1]) < norm) {
          p[0] = trial[0];
          p[1] = trial[1];
          r = rt;
          accepted = true;
          break;
        }
        lambda /= 2;
      }
      // No decrease at any step length: the residual is at its floor.
      if (!accepted) return norm < 1e-9 ? p : null;
    }
    return null;
  };

  let p = newton(guess());
  if (!p) {
    // Continuation in Mach number from M = 0, where the guess is close,
    // each stage starting from the solution of the one before.
    const stages = Math.max(2, Math.ceil(mach / 0.5));
    for (let k = 0; k <= stages; k++) {
      dissipation = targetDissipation * (k / stages) ** 2;
      p = newton(k === 0 || !p ? guess() : p);
      if (!p) throw new Error(`laminar similarity: no solution found at M = ${mach}`);
    }
  }
  if (!p) throw new Error(`laminar similarity: no solution found at M = ${mach}`);
  dissipation = targetDissipation;

  const eta = new Float64Array(n + 1);
  for (let i = 0; i <= n; i++) eta[i] = i * h;
  const store = { u: new Float64Array(n + 1), g: new Float64Array(n + 1) };
  const [tau0, g0, q0] = start(p);
  integrate(tau0, g0, q0, store);
  return {
    cfSqrtRe: Math.SQRT2 * tau0,
    wallTemperature: g0 * te,
    recoveryFactor: adiabatic && mach > 0 ? (g0 - 1) / (0.5 * targetDissipation) : undefined,
    profile: { eta, velocity: store.u, temperatureRatio: store.g },
  };
}
