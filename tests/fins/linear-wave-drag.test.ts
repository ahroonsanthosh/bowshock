/**
 * The source-sheet method (port of the research's finwave.py) against the
 * four analytic results the research checked it on, against finwave.py
 * itself, against an independent supersonic area-rule computation
 * (./support/area-rule.ts), and for convergence of its quadrature. The
 * measured values are recorded in docs/design/0009-fin-wave-drag.md,
 * section 3.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RESOLUTION,
  linearSectionDrag,
  linearSurfacePressure,
  linearWaveDrag,
} from '../../src/fins/linear-wave-drag';
import {
  clippedDeltaPlanform,
  planformArea,
  tipChord,
  trapezoidalPlanform,
  type Planform,
} from '../../src/fins/planform';
import { FinRefusal } from '../../src/fins/refusal';
import { doubleWedge, hexagonal, type SymmetricSection } from '../../src/fins/section';
import {
  areaRuleWaveDrag,
  areaRuleWing,
  areaSlope,
  breakpoints,
  cutDrag,
  rectangleLogIntegral,
} from './support/area-rule';
import { FINS } from './support/cases';

const tc = 0.05;
const deg = Math.PI / 180;

/** Sum of lambda^2 dx over the chord: strip drag is (4 / beta) times it. */
function meanSquareSlope(section: SymmetricSection): number {
  let s = 0;
  for (let k = 0; k + 1 < section.x.length; k++) {
    const dx = section.x[k + 1]! - section.x[k]!;
    s += ((section.halfThickness[k + 1]! - section.halfThickness[k]!) / dx) ** 2 * dx;
  }
  return s;
}

const SECTIONS = {
  'double wedge': doubleWedge(tc),
  'ridge 0.3': doubleWedge(tc, 0.3),
  hexagon: hexagonal(tc, 0.15),
};
const rect = (span: number, tanSweep = 0): Planform => ({
  rootChord: 1,
  span,
  tanLeadingEdge: tanSweep,
  tanTrailingEdge: tanSweep,
});

describe('linear fin drag: the four analytic results', () => {
  it('the 2D limit: unswept, 50 chords of span, at mid span (Ackeret)', () => {
    let worst = 0;
    for (const section of Object.values(SECTIONS)) {
      for (const mach of [1.2, 1.5, 2, 3]) {
        const beta = Math.sqrt(mach * mach - 1);
        const cd = linearSectionDrag(rect(50), section, mach, 25);
        worst = Math.max(worst, Math.abs(cd / ((4 / beta) * meanSquareSlope(section)) - 1));
      }
    }
    // Measured: 4.1e-9 (n = 24).
    expect(worst).toBeLessThan(1e-8);
  });

  it('infinite swept wing, supersonic edges: 4 cos L <lambda^2> / sqrt(M^2 cos^2 L - 1)', () => {
    let worst = 0;
    for (const section of Object.values(SECTIONS)) {
      for (const [mach, sweep] of [
        [2, 30],
        [3, 45],
        [1.5, 20],
      ] as const) {
        const c = Math.cos(sweep * deg);
        const cd = linearSectionDrag(rect(40, Math.tan(sweep * deg)), section, mach, 6);
        const exact = (4 * c * meanSquareSlope(section)) / Math.sqrt((mach * c) ** 2 - 1);
        worst = Math.max(worst, Math.abs(cd / exact - 1));
      }
    }
    // Measured: 5.0e-10 (n = 24).
    expect(worst).toBeLessThan(1e-8);
  });

  it('infinite swept wing, subsonic edges: no wave drag far from the root', () => {
    const resolution = { span: 48, chord: 48, eta: 48 };
    for (const [mach, sweep] of [
      [1.5, 60],
      [2, 70],
    ] as const) {
      const beta = Math.sqrt(mach * mach - 1);
      const strip = (4 * tc * tc) / beta;
      const at = (y: number) =>
        linearSectionDrag(
          rect(1000, Math.tan(sweep * deg)),
          SECTIONS['double wedge'],
          mach,
          y,
          resolution,
        ) / strip;
      // Measured (n = 48): -8.3e-6 and -1.6e-6 at 20 chords from the root;
      // 1.0e-7 and 2.0e-7 at 80 chords; 2.3e-7 and 2.4e-7 at 320.
      expect(Math.abs(at(20))).toBeLessThan(2e-5);
      expect(Math.abs(at(80))).toBeLessThan(1e-6);
      expect(Math.abs(at(320))).toBeLessThan(1e-6);
    }
  }, 120_000);

  it('tip cone of a constant-slope sheet: Cp / Cp_2D = 1/2 + asin(beta (s - y) / x) / pi', () => {
    // Unswept, span 1, double wedge: ahead of the ridge (x < 0.5) the slope
    // is constant, and with the image the root has no effect.
    let worst = 0;
    let count = 0;
    for (const mach of [1.5, 2, 3]) {
      const beta = Math.sqrt(mach * mach - 1);
      for (const x of [0.1, 0.25, 0.45]) {
        for (const f of [0.2, 0.6, 0.95, 1.5]) {
          // f = beta (s - y) / x: inside the tip cone for f < 1, outside (2D) beyond.
          const y = 1 - (f * x) / beta;
          if (!(y > 0)) continue;
          const cp = linearSurfacePressure(rect(1), SECTIONS['double wedge'], mach, x, y);
          const expected = f < 1 ? 0.5 + Math.asin(f) / Math.PI : 1;
          worst = Math.max(worst, Math.abs(cp / ((2 * tc) / beta) / expected - 1));
          count++;
        }
      }
    }
    expect(count).toBe(36);
    // Measured: 1.9e-11 (n = 24).
    expect(worst).toBeLessThan(1e-9);
  });
});

describe("linear fin drag: the port against the research's finwave.py", () => {
  it("reproduces fin_cases.py's 40 ratios with finwave's own integration (n = 24)", () => {
    // docs/research/total-drag/data/fin_linear_theory_results.json, which
    // fin_cases.py re-ran byte for byte; Python writes the rectangle's
    // infinite beta cot(LE) as Infinity.
    const json = JSON.parse(
      readFileSync('docs/research/total-drag/data/fin_linear_theory_results.json', 'utf8').replace(
        /Infinity/g,
        'null',
      ),
    ) as Record<string, [number, number, number | null][]>;
    let worst = 0;
    let count = 0;
    for (const [key, rows] of Object.entries(json)) {
      const fin = FINS.find((f) => key.startsWith(f.research + ' '))!;
      for (const [mach, ratio] of rows) {
        const r = linearWaveDrag(fin.planform, fin.section, mach, {
          span: 24,
          chord: 24,
          eta: 24,
          splitAtMachCones: false,
        });
        worst = Math.max(worst, Math.abs(r.ratio / ratio - 1));
        count++;
      }
    }
    expect(count).toBe(40);
    // Measured: 9.1e-14.
    expect(worst).toBeLessThan(1e-12);
  }, 120_000);
});

describe('linear fin drag against the supersonic area rule', () => {
  it("the area-rule computation: S' is piecewise linear between vertex cuts, and converged", () => {
    for (const name of ['E', 'H', 'C-hex']) {
      const fin = FINS.find((f) => f.name === name)!;
      const w = areaRuleWing(fin.planform, fin.section);
      // Cut slopes parallel to no segment line (at those S' jumps).
      for (const bc of [-1.13, 0.21, 0.87, 1.61]) {
        const xs = breakpoints(w, bc);
        expect(areaSlope(w, bc, xs[0]! - 1e-9)).toBe(0);
        expect(Math.abs(areaSlope(w, bc, xs[xs.length - 1]!))).toBeLessThan(1e-12);
        for (let i = 0; i + 1 < xs.length; i++) {
          const [a, b] = [xs[i]!, xs[i + 1]!];
          for (const f of [0.25, 0.5, 0.75]) {
            const linear = (1 - f) * areaSlope(w, bc, a) + f * areaSlope(w, bc, b);
            expect(areaSlope(w, bc, a + f * (b - a))).toBeCloseTo(linear, 12);
          }
        }
        expect(cutDrag(w, bc)).toBeGreaterThan(0);
      }
    }
    // The log-kernel form of von Karman's drag against his Fourier form, on
    // the tent S' = h (1 - |x - 1|) over [0, 2], with x = 1 - cos(phi):
    // D / q = (pi / 4) sum n A_n^2, A_n = (2 / pi) Int_0^pi S' sin(n phi),
    // in closed form for odd n (even n vanish).
    const h = 1.3;
    const logForm =
      ((-h * h) / (2 * Math.PI)) *
      (rectangleLogIntegral(0, 1, 0, 1) +
        rectangleLogIntegral(1, 2, 1, 2) -
        2 * rectangleLogIntegral(0, 1, 1, 2));
    let fourier = 0;
    for (let n = 1; n < 2_000_000; n += 2) {
      const cosInt =
        n === 1
          ? 0.5
          : 0.5 * ((1 - (-1) ** ((n + 1) / 2)) / (n + 1) + (1 - (-1) ** ((n - 1) / 2)) / (n - 1));
      const a = (2 / Math.PI) * h * (2 / n - 2 * cosInt);
      fourier += n * a * a;
    }
    fourier *= Math.PI / 4;
    // Measured: 4.3e-12, the truncation of the series at n = 2e6.
    expect(Math.abs(logForm / fourier - 1)).toBeLessThan(1e-11);
    expect(logForm).toBeCloseTo((2 * Math.log(2) * h * h) / Math.PI, 14);
    // The rectangle integral's branches agree where more than one applies.
    for (const [a, b, c, d] of [
      [0, 1, 2, 3],
      [0, 1e-4, 1, 2],
      [0, 1, 1, 1 + 1e-5],
      [0, 0.7, 0.2, 1.3],
    ] as const) {
      const G = (u: number) =>
        u === 0 ? 0 : (u * u * Math.log(Math.abs(u))) / 2 - (3 * u * u) / 4;
      const closed = G(b - c) - G(a - c) - G(b - d) + G(a - d);
      expect(rectangleLogIntegral(a, b, c, d)).toBeCloseTo(closed, 9);
    }
    // Level 4 against level 5 of the tanh-sinh rule.
    const fin = FINS.find((f) => f.name === 'E')!;
    for (const mach of [1.2, 2]) {
      const a = areaRuleWaveDrag(fin.planform, fin.section, mach, 4).ratio;
      const b = areaRuleWaveDrag(fin.planform, fin.section, mach, 5).ratio;
      expect(Math.abs(a / b - 1)).toBeLessThan(1e-8);
    }
  }, 120_000);

  it('the area rule gives the 2D drag on a long unswept wing and on the unit rectangle', () => {
    for (const mach of [1.2, 2, 3]) {
      // Measured: 1 - 1e-8 (the rule drops the last 1e-9 of each piece).
      expect(
        Math.abs(areaRuleWaveDrag(rect(20), SECTIONS['double wedge'], mach, 4).ratio - 1),
      ).toBeLessThan(5e-8);
      expect(
        Math.abs(areaRuleWaveDrag(rect(1), SECTIONS['double wedge'], mach, 4).ratio - 1),
      ).toBeLessThan(5e-8);
    }
  }, 120_000);

  // The source sheet against this area rule on all ten planforms at five
  // Mach numbers is in fin-wave-drag.test.ts, with the strip-theory table.

  it("agrees with the audit's area-rule values (hayes_fin.py, extrapolated) within their 0.5%", () => {
    // audit.md section 3.3: the audit's ratios, to 3 decimals.
    const audit: [string, number, number][] = [
      ['A', 1.2, 1.024],
      ['A', 1.5, 1.058],
      ['A', 2, 1.027],
      ['A', 3, 1.017],
      ['F', 1.2, 0.421],
      ['F', 2, 0.893],
      ['E', 1.5, 1.196],
      ['G', 1.5, 1.104],
      ['G', 3, 1.017],
      ['C', 1.2, 1.1],
      ['R02', 1.2, 0.654],
    ];
    for (const [name, mach, ratio] of audit) {
      const fin = FINS.find((f) => f.name === name)!;
      const r = linearWaveDrag(fin.planform, fin.section, mach).ratio;
      // Measured: the largest difference is the ARCAS fin at Mach 3, 0.49%.
      expect(Math.abs(r / ratio - 1)).toBeLessThan(0.0055);
    }
  }, 120_000);
});

describe('linear fin drag: quadrature convergence', () => {
  it('converges with the points per piece on a subsonic leading edge', () => {
    // Subsonic leading edges converge slowest (about fourth order; the
    // others reach 1e-8 by n = 24). The 45 deg clipped delta at Mach 1.2
    // (beta cot = 0.66), error against the area rule at n 8, 12, 16, 24,
    // 32, 48: 1.0e-4, 2.1e-5, 6.9e-6, 1.4e-6, 4.6e-7, 9.7e-8.
    const fin = FINS.find((f) => f.name === 'B')!;
    const ar = areaRuleWaveDrag(fin.planform, fin.section, 1.2, 4).ratio;
    const err = [8, 16, 32].map((n) =>
      Math.abs(
        linearWaveDrag(fin.planform, fin.section, 1.2, { span: n, chord: n, eta: n }).ratio / ar -
          1,
      ),
    );
    expect(err[0]).toBeGreaterThan(err[1]!);
    expect(err[1]).toBeGreaterThan(err[2]!);
    expect(err[2]).toBeLessThan(1e-6);
    expect(DEFAULT_RESOLUTION).toEqual({ span: 24, chord: 24, eta: 24 });
  }, 120_000);

  it("finwave.py's own integration converges slowly and erratically, as the research found", () => {
    // Without splitting at the Mach cones, n = 24 (the research's) is 2e-3
    // off on the near-sonic and low-aspect-ratio cases: measured worst over
    // the set 2.2e-3 at n = 24, 3.4e-4 at n = 48, 5.5e-5 at n = 128.
    const fin = FINS.find((f) => f.name === 'R02')!;
    const ar = areaRuleWaveDrag(fin.planform, fin.section, 2.5, 4).ratio;
    const unsplit = linearWaveDrag(fin.planform, fin.section, 2.5, {
      span: 24,
      chord: 24,
      eta: 24,
      splitAtMachCones: false,
    }).ratio;
    expect(Math.abs(unsplit / ar - 1)).toBeGreaterThan(5e-4);
    expect(Math.abs(linearWaveDrag(fin.planform, fin.section, 2.5).ratio / ar - 1)).toBeLessThan(
      2e-6,
    );
  }, 120_000);
});

describe('planforms', () => {
  it('trapezoids and clipped deltas, and what is refused', () => {
    const p = trapezoidalPlanform({ rootChord: 2, span: 1, leadingEdgeSweep: 45 * deg });
    expect(tipChord(p)).toBeCloseTo(1, 14);
    expect(planformArea(p)).toBeCloseTo(1.5, 14);
    const d = clippedDeltaPlanform({ rootChord: 1, span: 1, taperRatio: 0.25 });
    expect(d.tanLeadingEdge).toBeCloseTo(0.75, 14);
    expect(tipChord(d)).toBeCloseTo(0.25, 14);
    expect(() => trapezoidalPlanform({ rootChord: 1, span: 1, leadingEdgeSweep: -0.1 })).toThrow(
      FinRefusal,
    );
    expect(() =>
      trapezoidalPlanform({
        rootChord: 1,
        span: 2,
        leadingEdgeSweep: 45 * deg,
        trailingEdgeSweep: 0,
      }),
    ).toThrow(/tip chord/);
    expect(() => linearWaveDrag(p, doubleWedge(0.05), 1)).toThrow(FinRefusal);
  });

  it('the ratio does not depend on the thickness ratio, and strip drag is Ackeret on the chord', () => {
    const fin = FINS.find((f) => f.name === 'G')!;
    const a = linearWaveDrag(fin.planform, doubleWedge(0.02), 1.7);
    const b = linearWaveDrag(fin.planform, doubleWedge(0.08), 1.7);
    expect(a.ratio).toBeCloseTo(b.ratio, 12);
    expect(a.cdStrip).toBeCloseTo((4 * 0.02 * 0.02) / Math.sqrt(1.7 ** 2 - 1), 14);
  });
});
