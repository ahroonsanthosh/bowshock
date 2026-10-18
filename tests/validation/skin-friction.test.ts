/**
 * Model-form error of the skin-friction library against measured data,
 * recomputed from each report's own conditions and held to the values
 * recorded in docs/design/0007-skin-friction.md. Ratios are model over
 * data, minus one.
 *
 * - NACA TN 3097, table III: cylinders, Mach 1.99 to 3.60, tunnel, the
 *   compressible over incompressible ratio. Model: van Driest II flat
 *   plate, adiabatic (r = 0.89), over Karman-Schoenherr at the same Re.
 *   The report gives Re from 6e6 to 16e6, not the stagnation temperature
 *   (bracketed at 250 to 310 K, src/validation/skin-friction-tn3097.ts).
 * - NACA RM L54G14, fig. 10: the RM-10 body in flight at zero heating,
 *   Mach 1.04 to 2.90, Re about 60e6. Model: the body methods of
 *   src/friction/body-friction.ts on the body ahead of the rake, and the
 *   flat plate at the rake's Re, over Karman-Schoenherr. The free-stream
 *   temperature is bracketed at 216.65 to 288.15 K and Re at 40e6 to
 *   100e6 around the nominal 250 K and 60e6.
 */

import { describe, expect, it } from 'vitest';
import {
  profileFriction,
  type AxisymmetricProfile,
  type BodyFrictionMethod,
} from '../../src/friction/body-friction';
import { karmanSchoenherrAverageCf } from '../../src/friction/karman-schoenherr';
import { vanDriestAverageCf, vanDriestFactors } from '../../src/friction/van-driest';
import {
  RM_L54G14_FIGURE_10,
  RM_L54G14_REYNOLDS,
  RM_L54G14_STATION,
  RM_L54G14_TEMPERATURE_BRACKET,
  rmL54g14Radius,
} from '../../src/validation/skin-friction-rm-l54g14';
import {
  TN3097_REYNOLDS_RANGE,
  TN3097_STAGNATION_TEMPERATURE_BRACKET,
  TN3097_TABLE_III,
} from '../../src/validation/skin-friction-tn3097';

const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/** van Driest II flat plate, adiabatic, over Karman-Schoenherr at the same Re. */
function flatRatio(re: number, mach: number, temperature: number): number {
  const f = vanDriestFactors({ mach, temperature });
  return vanDriestAverageCf(re, f) / karmanSchoenherrAverageCf(re);
}

describe('NACA TN 3097 table III (cylinders, tunnel)', () => {
  const t0s = [
    TN3097_STAGNATION_TEMPERATURE_BRACKET[0],
    280,
    TN3097_STAGNATION_TEMPERATURE_BRACKET[1],
  ];
  const res = [TN3097_REYNOLDS_RANGE[0], 1e7, TN3097_REYNOLDS_RANGE[1]];
  const model = (re: number, mach: number, t0: number) =>
    flatRatio(re, mach, t0 / (1 + 0.2 * mach * mach));

  it('van Driest II lies above every value, by 4.9% to 9.1% at Re 1e7 and T0 280 K', () => {
    const nominal = TN3097_TABLE_III.flatMap((p) => {
      const m = model(1e7, p.mach, 280);
      return [m / p.ratioA - 1, m / p.ratioB - 1];
    });
    expect(Math.min(...nominal)).toBeCloseTo(0.0492, 4);
    expect(Math.max(...nominal)).toBeCloseTo(0.0913, 4);
  });

  it('and by 4.25% to 11.08% over the brackets of Re and stagnation temperature', () => {
    const all = TN3097_TABLE_III.flatMap((p) =>
      res.flatMap((re) =>
        t0s.flatMap((t0) => {
          const m = model(re, p.mach, t0);
          return [m / p.ratioA - 1, m / p.ratioB - 1];
        }),
      ),
    );
    expect(Math.min(...all)).toBeCloseTo(0.0425, 4);
    expect(Math.max(...all)).toBeCloseTo(0.1108, 4);
  });

  it('the unstated stagnation temperature moves the model by less than 0.7%', () => {
    for (const p of TN3097_TABLE_III) {
      const ref = model(1e7, p.mach, 280);
      for (const t0 of t0s) expect(Math.abs(model(1e7, p.mach, t0) / ref - 1)).toBeLessThan(0.007);
    }
  });
});

describe('NACA RM L54G14 fig. 10 (RM-10 body, flight)', () => {
  const profile: AxisymmetricProfile = {
    length: RM_L54G14_STATION,
    radius: rmL54g14Radius,
    breakpoints: [0, RM_L54G14_STATION],
    referenceRadius: 6,
  };
  const body = (method: BodyFrictionMethod, mach: number, temperature: number, re: number) =>
    profileFriction(profile, {
      mach,
      temperature,
      reynoldsPerLength: re / RM_L54G14_STATION,
      method,
    }).averageCf / karmanSchoenherrAverageCf(re);
  const model = (method: BodyFrictionMethod | 'flat', mach: number, t: number, re: number) =>
    method === 'flat' ? flatRatio(re, mach, t) : body(method, mach, t, re);
  const differences = (method: BodyFrictionMethod | 'flat', t = 250, re = RM_L54G14_REYNOLDS) =>
    RM_L54G14_FIGURE_10.map((p) => model(method, p.mach, t, re) / p.ratio - 1);
  const bracketed = (method: BodyFrictionMethod | 'flat') => [
    ...differences(method),
    ...RM_L54G14_TEMPERATURE_BRACKET.flatMap((t) => differences(method, t)),
    ...[40e6, 100e6].flatMap((re) => differences(method, 250, re)),
  ];

  it('the momentum integral lies below the data by 6.3% on average (-15.2% to +4.5%)', () => {
    const d = differences('momentum-integral');
    expect(mean(d)).toBeCloseTo(-0.0626, 4);
    expect(Math.min(...d)).toBeCloseTo(-0.1519, 4);
    expect(Math.max(...d)).toBeCloseTo(0.0448, 4);
    const b = bracketed('momentum-integral');
    expect(Math.min(...b)).toBeCloseTo(-0.1571, 4);
    expect(Math.max(...b)).toBeCloseTo(0.0497, 4);
  });

  it('the flat plate at the rake Reynolds number lies 7.3% below on average', () => {
    const d = differences('flat');
    expect(mean(d)).toBeCloseTo(-0.0728, 4);
    expect(Math.min(...d)).toBeCloseTo(-0.1615, 4);
    expect(Math.max(...d)).toBeCloseTo(0.0331, 4);
  });

  it('the local Reynolds number method lies 13.4% below on average', () => {
    const d = differences('local-reynolds');
    expect(mean(d)).toBeCloseTo(-0.1344, 4);
    expect(Math.min(...d)).toBeCloseTo(-0.2195, 4);
    expect(Math.max(...d)).toBeCloseTo(-0.0378, 4);
  });

  it('a laminar run to station 20 lowers the momentum integral by 2.4 to 2.6%, but raises the local method', () => {
    const toStation20 = profileFriction(
      { ...profile, length: 20, breakpoints: [0, 20] },
      { mach: 2, temperature: 250, reynoldsPerLength: 1, method: 'local-reynolds' },
    ).surfaceLength;
    const rePerInch = RM_L54G14_REYNOLDS / RM_L54G14_STATION;
    for (const mach of [1.2, 2, 2.9]) {
      const change = (method: BodyFrictionMethod) => {
        const base = { mach, temperature: 250, reynoldsPerLength: rePerInch, method };
        const turbulent = profileFriction(profile, base).averageCf;
        const transitional = profileFriction(profile, {
          ...base,
          transitionReynolds: rePerInch * toStation20,
        }).averageCf;
        return transitional / turbulent - 1;
      };
      expect(change('momentum-integral')).toBeGreaterThan(-0.027);
      expect(change('momentum-integral')).toBeLessThan(-0.023);
      // The strip method shifts every downstream strip by the virtual
      // origin, weighted by the large aft radius: the wrong sign.
      expect(change('local-reynolds')).toBeGreaterThan(0.004);
    }
  });
});

describe('the band this evidence supports', () => {
  it('measured friction lies between 0.88 and 1.19 times the model on both sets', () => {
    // Data over model: TN 3097 (flat plate) with the cylinders' own
    // incompressible level, which lies 2.5% below to 1.4% above
    // Karman-Schoenherr (p. 18); RM-10 (momentum integral) with its brackets.
    const tn = TN3097_TABLE_III.flatMap((p) =>
      [6e6, 1e7, 1.6e7].flatMap((re) =>
        [250, 280, 310].flatMap((t0) => {
          const m = flatRatio(re, p.mach, t0 / (1 + 0.2 * p.mach * p.mach));
          return [p.ratioA / m, p.ratioB / m];
        }),
      ),
    );
    const tnLow = Math.min(...tn) * (1 - 0.025);
    const tnHigh = Math.max(...tn) * (1 + 0.014);
    expect(tnLow).toBeCloseTo(0.8778, 3);
    expect(tnHigh).toBeCloseTo(0.9726, 3);
    const profile: AxisymmetricProfile = {
      length: RM_L54G14_STATION,
      radius: rmL54g14Radius,
      breakpoints: [0, RM_L54G14_STATION],
      referenceRadius: 6,
    };
    const rm: number[] = [];
    for (const p of RM_L54G14_FIGURE_10) {
      for (const [t, re] of [
        [250, 60e6],
        [216.65, 60e6],
        [288.15, 60e6],
        [250, 40e6],
        [250, 100e6],
      ] as const) {
        const m =
          profileFriction(profile, {
            mach: p.mach,
            temperature: t,
            reynoldsPerLength: re / RM_L54G14_STATION,
            method: 'momentum-integral',
          }).averageCf / karmanSchoenherrAverageCf(re);
        rm.push(p.ratio / m);
      }
    }
    expect(Math.min(...rm)).toBeCloseTo(0.9527, 3);
    expect(Math.max(...rm)).toBeCloseTo(1.1864, 3);
  });
});
