/**
 * Exact (shock-expansion) section drag against the gas-dynamics relations
 * it is built from, against Ackeret's and Busemann's theories in the thin
 * limit, and against the research's section2d.py. The measured values are
 * recorded in docs/design/0009-fin-wave-drag.md, section 2.
 */

import { describe, expect, it } from 'vitest';
import { FinRefusal } from '../../src/fins/refusal';
import {
  doubleWedge,
  hexagonal,
  symmetricPolygon,
  type Section,
  type SymmetricSection,
} from '../../src/fins/section';
import {
  ackeretSectionDrag,
  busemannCoefficients,
  busemannSectionDrag,
  exactSectionDrag,
} from '../../src/fins/section-drag';
import {
  deflectionAngle,
  machFromPrandtlMeyer,
  maxDeflectionWaveAngle,
  obliqueShock,
  prandtlMeyer,
  stagnationPressureRatio,
} from '../../src/validation/gas-dynamics';

const gamma = 1.4;

function refusal(f: () => unknown): FinRefusal {
  try {
    f();
  } catch (e) {
    if (e instanceof FinRefusal) return e;
    throw e;
  }
  throw new Error('expected a refusal');
}

describe('exact section drag: built from the oblique-shock and Prandtl-Meyer relations', () => {
  it('double wedge: shock at the leading edge, Prandtl-Meyer at the ridge, by hand', () => {
    for (const [tc, mach, ridge] of [
      [0.05, 2, 0.5],
      [0.08, 1.5, 0.5],
      [0.04, 3, 0.3],
    ] as const) {
      const r = exactSectionDrag(doubleWedge(tc, ridge), mach);
      const front = Math.atan(tc / 2 / ridge);
      const rear = Math.atan(tc / 2 / (1 - ridge));
      const shock = obliqueShock(mach, front, gamma);
      const m3 = machFromPrandtlMeyer(
        prandtlMeyer(shock.downstreamMach, gamma) + front + rear,
        gamma,
      );
      const p3 =
        (shock.pressureRatio * stagnationPressureRatio(shock.downstreamMach, gamma)) /
        stagnationPressureRatio(m3, gamma);
      const q = 0.5 * gamma * mach * mach;
      const cd = 2 * (((shock.pressureRatio - 1) / q) * (tc / 2) - ((p3 - 1) / q) * (tc / 2));
      expect(r.cd).toBeCloseTo(cd, 15);
      for (const s of [r.upper, r.lower]) {
        expect(s.faces[0]!.pressureRatio).toBe(shock.pressureRatio);
        expect(s.faces[1]!.mach).toBe(m3);
        expect(s.shockAngle).toBe(shock.beta);
      }
      expect(r.exact).toBe(true);
    }
  });

  it("Busemann's C2 is the second-order coefficient of both the shock and the expansion", () => {
    // (Cp(delta) - C1 delta) / delta^2 -> C2 for compression through the
    // oblique shock and for expansion through Prandtl-Meyer: the shock's
    // entropy rise is third order.
    for (const mach of [1.3, 2, 3.5]) {
      const { c1, c2 } = busemannCoefficients(mach, gamma);
      const q = 0.5 * gamma * mach * mach;
      for (const delta of [1e-3, 2e-3]) {
        const pShock = obliqueShock(mach, delta, gamma).pressureRatio;
        const m = machFromPrandtlMeyer(prandtlMeyer(mach, gamma) + delta, gamma);
        const pExp = stagnationPressureRatio(mach, gamma) / stagnationPressureRatio(m, gamma);
        const cShock = ((pShock - 1) / q - c1 * delta) / delta ** 2;
        const cExp = ((pExp - 1) / q + c1 * delta) / delta ** 2;
        // The third-order term leaves an error proportional to delta.
        expect(Math.abs(cShock / c2 - 1)).toBeLessThan(20 * delta);
        expect(Math.abs(cExp / c2 - 1)).toBeLessThan(20 * delta);
      }
    }
  });

  it('a collinear vertex, a mirror image and the surfaces taken one at a time change nothing', () => {
    const base = symmetricPolygon(hexagonal(0.06, 0.25, 0.2));
    const split: Section = {
      upper: [base.upper[0]!, { x: 0.5, y: 0.03 }, ...base.upper.slice(1)].sort(
        (p, q) => p.x - q.x,
      ),
      lower: base.lower,
    };
    const mirror: Section = {
      upper: base.lower.map((p) => ({ x: p.x, y: -p.y })),
      lower: base.upper.map((p) => ({ x: p.x, y: -p.y })),
    };
    for (const mach of [1.6, 2.4]) {
      const r = exactSectionDrag(base, mach);
      expect(exactSectionDrag(split, mach).cd).toBeCloseTo(r.cd, 16);
      expect(exactSectionDrag(mirror, mach).cd).toBeCloseTo(r.cd, 16);
      expect(r.upper.cd).toBeCloseTo(r.lower.cd, 16);
      // A flat lower surface carries no wave and no drag.
      const flatBottom: Section = {
        upper: base.upper,
        lower: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      };
      const f = exactSectionDrag(flatBottom, mach);
      expect(f.lower.cd).toBe(0);
      expect(f.lower.shockAngle).toBeUndefined();
      expect(f.cd).toBeCloseTo(r.upper.cd, 16);
    }
  });
});

/** Relative errors of the exact drag against Ackeret and Busemann at t/c halving from 0.04. */
function thinLimit(shape: (t: number) => SymmetricSection, mach: number) {
  const ts = [0.04, 0.02, 0.01, 0.005, 0.0025];
  return ts.map((t) => {
    const s = shape(t);
    const exact = exactSectionDrag(s, mach);
    expect(exact.exact).toBe(true);
    return {
      t,
      ackeret: exact.cd / ackeretSectionDrag(s, mach) - 1,
      busemann: exact.cd / busemannSectionDrag(s, mach) - 1,
    };
  });
}

const order = (a: number, b: number) => Math.log2(a / b);

describe('exact section drag in the thin limit', () => {
  it('symmetric double wedge and equal-bevel hexagon: Ackeret at second order (Busemann the same)', () => {
    for (const shape of [(t: number) => doubleWedge(t), (t: number) => hexagonal(t, 0.3)]) {
      for (const mach of [1.5, 2, 3]) {
        const e = thinLimit(shape, mach);
        for (const r of e) expect(r.busemann).toBeCloseTo(r.ackeret, 14);
        // Measured: observed order 1.991 to 2.002 between t/c 0.005 and 0.0025.
        const p = order(e[3]!.ackeret, e[4]!.ackeret);
        expect(Math.abs(p - 2)).toBeLessThan(0.01);
        expect(e[4]!.ackeret).toBeGreaterThan(0);
      }
    }
  });

  it("asymmetric sections: Ackeret at first order with Busemann's coefficient, Busemann at second", () => {
    for (const shape of [
      (t: number) => doubleWedge(t, 0.3),
      (t: number) => hexagonal(t, 0.3, 0.15),
    ]) {
      for (const mach of [1.5, 2, 3]) {
        const e = thinLimit(shape, mach);
        // Busemann's prediction of (exact / Ackeret - 1) / (t/c):
        // C2 sum(d^3 dx) / (C1 sum(d^2 dx)) with the slopes per unit t/c.
        const unit = shape(1);
        const { c1, c2 } = busemannCoefficients(mach);
        let num = 0;
        let den = 0;
        for (let k = 0; k + 1 < unit.x.length; k++) {
          const dx = unit.x[k + 1]! - unit.x[k]!;
          const d = (unit.halfThickness[k + 1]! - unit.halfThickness[k]!) / dx;
          num += c2 * d ** 3 * dx;
          den += c1 * d ** 2 * dx;
        }
        const coefficient = num / den;
        expect(Math.abs(coefficient)).toBeGreaterThan(1);
        // Measured: (exact/Ackeret - 1)/(t/c) at t/c 0.0025 is within 1.3% of
        // the coefficient, and the gap halves with t/c (first order).
        const last = e[4]!.ackeret / e[4]!.t;
        expect(Math.abs(last / coefficient - 1)).toBeLessThan(0.015);
        expect(Math.abs(order(e[3]!.ackeret, e[4]!.ackeret) - 1)).toBeLessThan(0.02);
        // Measured: against Busemann, order 1.978 to 2.014.
        expect(Math.abs(order(e[3]!.busemann, e[4]!.busemann) - 2)).toBeLessThan(0.03);
      }
    }
  });
});

describe("exact section drag against the research's section2d.py", () => {
  // cd_exact(M, t/c) of docs/research/total-drag/scripts/section2d.py,
  // re-run and printed to full precision by
  // docs/research/fin-wave-drag/section2d_full.py (section2d_full.json);
  // the audit's dw_exact_indep.py (weak root of the shock cubic, Newton
  // inversion of Prandtl-Meyer) gives the same values within 1.7e-14. The
  // script itself prints the ratios to Ackeret to 3 decimals, as the
  // archived output.
  const SECTION2D: [number, number, number | null][] = [
    [0.03, 1.2, 0.005522005167021417],
    [0.03, 1.3, 0.004356508515752016],
    [0.03, 1.5, 0.0032239827225615573],
    [0.03, 2.0, 0.002079322830658741],
    [0.03, 2.5, 0.0015721793746625704],
    [0.03, 3.0, 0.001274148074345674],
    [0.05, 1.2, 0.015993148943354542],
    [0.05, 1.3, 0.012224931079475976],
    [0.05, 1.5, 0.00897613405170991],
    [0.05, 2.0, 0.005780040354894676],
    [0.05, 2.5, 0.004371945343317407],
    [0.05, 3.0, 0.0035457057658223167],
    [0.08, 1.2, null],
    [0.08, 1.3, 0.03229712848221124],
    [0.08, 1.5, 0.023116991117749786],
    [0.08, 2.0, 0.014822190240632901],
    [0.08, 2.5, 0.011220644234912244],
    [0.08, 3.0, 0.009115054694260154],
  ];
  const PRINTED: Record<number, (string | null)[]> = {
    0.03: ['1.017', '1.005', '1.001', '1.000', '1.001', '1.001'],
    0.05: ['1.061', '1.015', '1.004', '1.001', '1.002', '1.003'],
    0.08: [null, '1.048', '1.010', '1.003', '1.004', '1.007'],
  };

  it('agrees to 1e-12 on 17 points and refuses the one it calls detached', () => {
    let worst = 0;
    for (const [tc, mach, cd] of SECTION2D) {
      if (cd === null) {
        const e = refusal(() => exactSectionDrag(doubleWedge(tc), mach));
        expect(e.reason).toBe('detached-shock');
        expect(e.message).toMatch(/detachment angle/);
        continue;
      }
      const r = exactSectionDrag(doubleWedge(tc), mach);
      expect(r.exact).toBe(true);
      worst = Math.max(worst, Math.abs(r.cd / cd - 1));
      const k = [1.2, 1.3, 1.5, 2.0, 2.5, 3.0].indexOf(mach);
      expect((r.cd / ackeretSectionDrag(doubleWedge(tc), mach)).toFixed(3)).toBe(PRINTED[tc]![k]);
    }
    // Measured: 4.9e-14 (and 5.0e-14 from the audit's dw_exact_indep.py).
    expect(worst).toBeLessThan(1e-12);
  });
});

describe('exact section drag: what it refuses', () => {
  it('a detached shock, and an attached one with subsonic flow behind it', () => {
    const mach = 2;
    const thetaMax = deflectionAngle(mach, maxDeflectionWaveAngle(mach, gamma), gamma);
    const wedge = (angle: number) => doubleWedge(Math.tan(angle), 0.5);
    expect(refusal(() => exactSectionDrag(wedge(thetaMax + 1e-4), mach)).reason).toBe(
      'detached-shock',
    );
    // Just below detachment the weak-branch flow is already subsonic.
    expect(obliqueShock(mach, thetaMax - 1e-5, gamma).downstreamMach).toBeLessThan(1);
    const e = refusal(() => exactSectionDrag(wedge(thetaMax - 1e-5), mach));
    expect(e.reason).toBe('subsonic-behind-shock');
    expect(e.message).toMatch(/subsonic/);
  });

  it('compression corners, subsonic free streams, the Prandtl-Meyer limit', () => {
    const concave: Section = {
      upper: [
        { x: 0, y: 0 },
        { x: 0.4, y: 0.01 },
        { x: 0.7, y: 0.03 },
        { x: 1, y: 0 },
      ],
      lower: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
    };
    expect(refusal(() => exactSectionDrag(concave, 2)).reason).toBe('compression-corner');
    expect(refusal(() => exactSectionDrag(doubleWedge(0.05), 1)).reason).toBe(
      'subsonic-free-stream',
    );
    expect(refusal(() => ackeretSectionDrag(doubleWedge(0.05), 0.9)).reason).toBe(
      'subsonic-free-stream',
    );
    // A 40 deg leading edge at Mach 20, then a turn of 89 deg at x/c = 0.99.
    const steep: Section = {
      upper: [
        { x: 0, y: 0 },
        { x: 0.99, y: 0.99 * Math.tan((40 * Math.PI) / 180) },
        { x: 1, y: 0 },
      ],
      lower: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
    };
    expect(refusal(() => exactSectionDrag(steep, 20)).reason).toBe('expansion-limit');
  });

  it('a reflected wave that can reach the surface: refused, or labelled when asked for', () => {
    // Hexagon with 5% bevels, t/c 0.02, Mach 2: the first fan overtakes the
    // leading-edge shock close to the edge.
    const hex = hexagonal(0.02, 0.05);
    const e = refusal(() => exactSectionDrag(hex, 2));
    expect(e.reason).toBe('reflected-wave');
    const r = exactSectionDrag(hex, 2, { neglectReflectedWaves: true });
    expect(r.exact).toBe(false);
    expect(r.upper.firstReflection).toBeLessThan(1);
    expect(r.upper.firstReflection).toBeGreaterThan(0.05);
    // The double wedges above are clear of it.
    expect(exactSectionDrag(doubleWedge(0.05), 1.2).upper.firstReflection).toBeGreaterThan(1);
  });

  it('the reflection bound, by hand on one case', () => {
    // Hexagon, 15% bevels, t/c 0.05, Mach 1.5. P: the head of the first
    // corner's fan (from (0.15, 0.025) at deflection + Mach angle of the
    // first face) meets the straight shock. The bound is where the line
    // from P at the steepest descent of the face states, mu - theta, meets
    // the flat.
    const r = exactSectionDrag(hexagonal(0.05, 0.15), 1.5, { neglectReflectedWaves: true });
    const f = r.upper.faces;
    const beta = r.upper.shockAngle!;
    const alpha = f[0]!.deflection + Math.asin(1 / f[0]!.mach);
    const t = (0.15 * Math.sin(alpha) - 0.025 * Math.cos(alpha)) / Math.sin(alpha - beta);
    const [px, py] = [t * Math.cos(beta), t * Math.sin(beta)];
    // P lies on the fan head.
    expect((py - 0.025) / (px - 0.15)).toBeCloseTo(Math.tan(alpha), 12);
    const steepest = Math.max(...f.map((g) => Math.asin(1 / g.mach) - g.deflection));
    const x = r.upper.firstReflection;
    expect(x).toBeGreaterThan(Math.max(px, 0.15));
    expect(x).toBeLessThan(0.85);
    expect(py - Math.tan(steepest) * (x - px)).toBeCloseTo(0.025, 12);
    expect(r.exact).toBe(false);
  });
});
