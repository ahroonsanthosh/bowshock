/**
 * The compressible laminar similarity solver (src/friction/laminar.ts)
 * against solutions that are exact for its equations, its own
 * discretisation, and a published solution (van Driest, NACA TN 2597).
 */

import { describe, expect, it } from 'vitest';
import { laminarSimilarity } from '../../src/friction/laminar';
import {
  TN2597_FIGURE_3,
  TN2597_PRANDTL,
  TN2597_SUTHERLAND_RATIO,
} from '../../src/validation/laminar-tn2597';

/** Blasius: f''(0) = 0.332057336215196 for f''' + f f''/2 = 0, so cf sqrt(Re_x) = 0.664114672430392. */
const BLASIUS_CF_SQRT_RE = 0.664114672430392;

/** f'' of the Blasius solution of f''' + f f'' = 0, by RK4 with step h from the known f''(0). */
function blasiusShear(h: number, etaMax: number): Float64Array {
  const n = Math.round(etaMax / h);
  const out = new Float64Array(n + 1);
  let y = [0, 0, BLASIUS_CF_SQRT_RE / Math.SQRT2];
  const d = (s: number[]) => [s[1]!, s[2]!, -s[0]! * s[2]!];
  out[0] = y[2]!;
  for (let i = 0; i < n; i++) {
    const k1 = d(y);
    const k2 = d(y.map((v, j) => v + 0.5 * h * k1[j]!));
    const k3 = d(y.map((v, j) => v + 0.5 * h * k2[j]!));
    const k4 = d(y.map((v, j) => v + h * k3[j]!));
    y = y.map((v, j) => v + (h / 6) * (k1[j]! + 2 * k2[j]! + 2 * k3[j]! + k4[j]!));
    out[i + 1] = y[2]!;
  }
  return out;
}

/** Simpson's rule on a uniform grid with an even number of intervals. */
function simpson(values: ArrayLike<number>, h: number): number {
  const n = values.length - 1;
  if (n % 2 !== 0) throw new Error('Simpson needs an even number of intervals');
  let sum = values[0]! + values[n]!;
  for (let i = 1; i < n; i++) sum += (i % 2 === 1 ? 4 : 2) * values[i]!;
  return (sum * h) / 3;
}

describe('laminar similarity solution: exact cases', () => {
  it('C = 1 (mu ~ T) gives Blasius at any Mach number and wall temperature', () => {
    for (const [mach, wall] of [
      [0, undefined],
      [2, undefined],
      [3, 2.5],
    ] as const) {
      const s = laminarSimilarity({
        mach,
        temperature: 250,
        viscosity: { kind: 'power', exponent: 1 },
        ...(wall === undefined ? {} : { wallTemperature: wall * 250 }),
      });
      expect(Math.abs(s.cfSqrtRe / BLASIUS_CF_SQRT_RE - 1)).toBeLessThan(1e-9);
    }
    // Sutherland's law at M = 0 with Tw = Te: g = 1 everywhere, so C = 1.
    const s = laminarSimilarity({ mach: 0, temperature: 250, wallTemperature: 250 });
    expect(Math.abs(s.cfSqrtRe / BLASIUS_CF_SQRT_RE - 1)).toBeLessThan(1e-9);
  });

  it('constant C stretches Blasius: cf sqrt(Re_x) = 0.664115 sqrt(C)', () => {
    for (const c of [0.6, 0.8, 1.3]) {
      const s = laminarSimilarity({
        mach: 2,
        temperature: 250,
        viscosity: { kind: 'chapman-rubesin', constant: c },
      });
      expect(Math.abs(s.cfSqrtRe / (BLASIUS_CF_SQRT_RE * Math.sqrt(c)) - 1)).toBeLessThan(1e-9);
    }
  });

  it('Pr = 1, C = 1: recovery factor 1 and the Crocco-Busemann temperature', () => {
    const law = { kind: 'power', exponent: 1 } as const;
    const adiabatic = laminarSimilarity({ mach: 3, temperature: 250, prandtl: 1, viscosity: law });
    expect(adiabatic.recoveryFactor).toBeCloseTo(1, 9);
    const mach = 2.5;
    const gw = 2;
    const s = laminarSimilarity({
      mach,
      temperature: 250,
      prandtl: 1,
      viscosity: law,
      wallTemperature: gw * 250,
    });
    const k = 0.2 * mach * mach;
    const gaw = 1 + k;
    const { velocity: u, temperatureRatio: g } = s.profile;
    let worst = 0;
    for (let i = 0; i < u.length; i++) {
      const crocco = gw + (gaw - gw) * u[i]! - k * u[i]! * u[i]!;
      worst = Math.max(worst, Math.abs(g[i]! - crocco));
    }
    expect(worst).toBeLessThan(1e-8);
  });

  it("C = 1, Pr = 0.72: the recovery factor is Pohlhausen's quadrature of the Blasius shear", () => {
    // r = 2 Pr * integral of phi^Pr(eta) * (integral from 0 to eta of
    // phi^(2 - Pr)) d(eta), phi = f'' of f''' + f f'' = 0 (derived from the
    // energy equation with C = 1 and g'(0) = 0; r = 1 for Pr = 1).
    const pr = 0.72;
    const h = 0.0005;
    const phi = blasiusShear(h, 10);
    const inner = new Float64Array(phi.length);
    for (let i = 1; i < phi.length; i++) {
      inner[i] = inner[i - 1]! + 0.5 * h * (phi[i - 1]! ** (2 - pr) + phi[i]! ** (2 - pr));
    }
    const outer = phi.map((p, i) => p ** pr * inner[i]!);
    const r = 2 * pr * simpson(outer, h);
    const s = laminarSimilarity({
      mach: 2,
      temperature: 250,
      prandtl: pr,
      viscosity: { kind: 'power', exponent: 1 },
    });
    expect(Math.abs(s.recoveryFactor! / r - 1)).toBeLessThan(1e-6);
  });

  it('with Sutherland: the momentum thickness integral equals the wall shear (Re_theta = cf Re_x)', () => {
    for (const wall of [undefined, 1.5 * 220, 0.5 * 220]) {
      const s = laminarSimilarity({
        mach: 2.5,
        temperature: 220,
        ...(wall === undefined ? {} : { wallTemperature: wall }),
      });
      const { eta, velocity: u } = s.profile;
      const integrand = u.map((v) => v * (1 - v));
      const reThetaOverSqrtRe = Math.SQRT2 * simpson(integrand, eta[1]!);
      expect(Math.abs(reThetaOverSqrtRe / s.cfSqrtRe - 1)).toBeLessThan(1e-8);
    }
  });
});

describe('laminar similarity solution: discretisation', () => {
  it('the default step and domain are converged to 1e-9 in cf', () => {
    for (const wall of [undefined, 400]) {
      const base = { mach: 3, temperature: 220, ...(wall ? { wallTemperature: wall } : {}) };
      const ref = laminarSimilarity(base).cfSqrtRe;
      const fine = laminarSimilarity({ ...base, step: 0.0025 }).cfSqrtRe;
      const wide = laminarSimilarity({ ...base, etaMax: 14 }).cfSqrtRe;
      expect(Math.abs(fine / ref - 1)).toBeLessThan(1e-9);
      expect(Math.abs(wide / ref - 1)).toBeLessThan(1e-9);
      // Fourth order: halving a coarse step divides the change by about 16.
      const c1 = laminarSimilarity({ ...base, step: 0.1 }).cfSqrtRe;
      const c2 = laminarSimilarity({ ...base, step: 0.05 }).cfSqrtRe;
      const ratio = (c1 - ref) / (c2 - ref);
      expect(ratio).toBeGreaterThan(12);
      expect(ratio).toBeLessThan(20);
    }
  });

  it('converges from Mach 0 to 5 for walls at 0.25 to 6 times the edge temperature', () => {
    for (let mach = 0; mach <= 5; mach += 0.5) {
      for (const wall of [undefined, 0.25, 1, 2, 4, 6]) {
        const s = laminarSimilarity({
          mach,
          temperature: 220,
          ...(wall === undefined ? {} : { wallTemperature: wall * 220 }),
        });
        expect(s.cfSqrtRe).toBeGreaterThan(0.3);
        expect(s.cfSqrtRe).toBeLessThan(0.75);
      }
    }
  });
});

describe('laminar similarity solution against van Driest, NACA TN 2597 fig. 3', () => {
  const mine = (p: (typeof TN2597_FIGURE_3)[number]) =>
    2 *
    laminarSimilarity({
      mach: p.mach,
      temperature: 1,
      prandtl: TN2597_PRANDTL,
      viscosity: { kind: 'sutherland', temperature: TN2597_SUTHERLAND_RATIO },
      ...(p.wall === 'adiabatic' ? {} : { wallTemperature: p.wall }),
    }).cfSqrtRe;

  it('agrees within 1% at all 32 points, Mach 0.26 to 10.3 (the report claims 0.5%)', () => {
    const differences = TN2597_FIGURE_3.map((p) => mine(p) / p.cfMeanSqrtRe - 1);
    // Measured: -0.34% to +0.84%, mean +0.38% (the readings may sit 0.4% low).
    expect(differences.length).toBe(32);
    for (const d of differences) expect(Math.abs(d)).toBeLessThan(0.01);
    const mean = differences.reduce((a, b) => a + b, 0) / differences.length;
    expect(mean).toBeGreaterThan(0.003);
    expect(mean).toBeLessThan(0.0045);
  });
});
