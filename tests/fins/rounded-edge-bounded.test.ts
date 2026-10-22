/**
 * F2 of design record 0019 (section 3.2, as rewritten after the independent
 * review of 2026-10-22): a flat plate's rounded leading edge below M_n 1.0,
 * bounded, not measured (src/fins/rounded-edge-bounded.ts, not wired). Each
 * case the review names is here, with the value the module would serve or
 * the refusal and its conditions.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { trapezoidalPlanform, type Planform } from '../../src/fins/planform';
import {
  BoundedEdgeRefusal,
  FREE_STREAM_FLOOR,
  LOWER_BOUND_MARGIN,
  NORMAL_MACH_CAP,
  TRANSONIC_XI_MIN,
  boundedRoundedEdge,
  stationaritySlope,
  trailingEdgeSinkShift,
  trailingEdgeXi,
} from '../../src/fins/rounded-edge-bounded';
import { FinRefusal } from '../../src/fins/refusal';
import {
  REYNOLDS_ALLOWANCE,
  pitotPressureCoefficient,
  roundedLeadingEdgeDrag,
  transonicFrontSide,
} from '../../src/fins/rounded-leading-edge';

const DEG = Math.PI / 180;
const T = 3; // mm, the plates' thickness throughout

const planform = (rootChord: number, span: number, le: number, te: number): Planform =>
  trapezoidalPlanform({
    rootChord,
    span,
    leadingEdgeSweep: le * DEG,
    trailingEdgeSweep: te * DEG,
  });

/** The conditions a case is refused for, or 'served'. */
function outcome(mach: number, p: Planform, reynoldsOnDiameter = 1e5): string[] | 'served' {
  try {
    boundedRoundedEdge({ mach, planform: p, thickness: T, reynoldsOnDiameter });
    return 'served';
  } catch (e) {
    if (!(e instanceof BoundedEdgeRefusal)) throw e;
    expect(e.reason).toBe('bounded-edge-range');
    return [...e.conditions];
  }
}

/** The record's (L4) before the review: -(t / c) / (pi beta_n), on the streamwise chord. */
const beforeReview = (tOverC: number, normalMach: number) =>
  -tOverC / (Math.PI * Math.sqrt(1 - normalMach * normalMach));

describe("the trailing edge's line sink (L4), against the review's numbers", () => {
  it('A: parallel edges swept 60 deg, c/t 23, M 1.2: -0.0346, twice the record (-0.0173)', () => {
    const s = trailingEdgeSinkShift({
      mach: 1.2,
      leadingEdgeSweep: 60 * DEG,
      trailingEdgeSweep: 60 * DEG,
      thicknessOverChord: 1 / 23,
    });
    expect(s).toBeCloseTo(-0.0346, 4);
    expect(beforeReview(1 / 23, 0.6)).toBeCloseTo(-0.0173, 4);
    // In the normal plane: -(t / c_n) / (pi beta_n), c_n = c cos(sweep).
    expect(s).toBeCloseTo(beforeReview(1 / 23, 0.6) / Math.cos(60 * DEG), 12);
  });

  it('B1: LE 42, TE 30 deg, M 1.10: -0.1026 at tip c/t 16, -0.0410 at root c/t 40 (record -0.035, -0.014)', () => {
    const at = (tOverC: number) =>
      trailingEdgeSinkShift({
        mach: 1.1,
        leadingEdgeSweep: 42 * DEG,
        trailingEdgeSweep: 30 * DEG,
        thicknessOverChord: tOverC,
      });
    expect(at(1 / 16)).toBeCloseTo(-0.1026, 4);
    expect(at(1 / 40)).toBeCloseTo(-0.041, 4);
    const mn = 1.1 * Math.cos(42 * DEG);
    expect(beforeReview(1 / 16, mn)).toBeCloseTo(-0.0345, 4);
    expect(beforeReview(1 / 40, mn)).toBeCloseTo(-0.0138, 4);
  });

  it('B2: LE 45, TE 25 deg, M 1.05, c/t 23: -0.0816 (record -0.0207)', () => {
    expect(
      trailingEdgeSinkShift({
        mach: 1.05,
        leadingEdgeSweep: 45 * DEG,
        trailingEdgeSweep: 25 * DEG,
        thicknessOverChord: 1 / 23,
      }),
    ).toBeCloseTo(-0.0816, 4);
    expect(beforeReview(1 / 23, 1.05 * Math.cos(45 * DEG))).toBeCloseTo(-0.0207, 4);
  });

  it('C: LE 42 deg, TE unswept, root c/t 40: -0.1021 at M 0.99, diverging at the TE normal Mach 1', () => {
    const at = (mach: number) =>
      trailingEdgeSinkShift({
        mach,
        leadingEdgeSweep: 42 * DEG,
        trailingEdgeSweep: 0,
        thicknessOverChord: 1 / 40,
      });
    expect(at(0.99)).toBeCloseTo(-0.1021, 4);
    expect(at(0.999)).toBeLessThan(-0.3);
    expect(() => at(1.0)).toThrow('not subsonic');
  });
});

describe('the transonic rule on the trailing edge (L5)', () => {
  it('is xi of magnitude (4 / pi)^(2/3) = 1.175, the nonlinear term at most half of 1 - M^2', () => {
    expect(TRANSONIC_XI_MIN).toBeCloseTo(1.1747, 4);
    // At the threshold, (gamma + 1) M^2 (2 tau / (pi beta)) is half of beta^2.
    const tau = 1 / 40;
    // Solve xi(M) = TRANSONIC_XI_MIN for an unswept trailing edge by bisection.
    let lo = 0.5;
    let hi = 0.999;
    for (let i = 0; i < 80; i++) {
      const m = (lo + hi) / 2;
      if (
        trailingEdgeXi({ mach: m, trailingEdgeSweep: 0, thicknessOverChord: tau }) >
        TRANSONIC_XI_MIN
      )
        lo = m;
      else hi = m;
    }
    const m = lo;
    const beta = Math.sqrt(1 - m * m);
    expect((2.4 * m * m * 2 * tau) / (Math.PI * beta)).toBeCloseTo((beta * beta) / 2, 9);
  });

  it('refuses inside +-1.175 and serves either side, subsonic or supersonic trailing edge', () => {
    // A plate of c/t 10, parallel edges swept 55 deg, so M_n = M_TE <= 0.8 throughout.
    const subsonic = planform(30, 60, 55, 55);
    expect(outcome(1.2, subsonic)).toBe('served'); // M_TE 0.688, xi 1.55
    expect(outcome(1.38, subsonic)).toEqual(['trailing-edge-transonic']); // M_TE 0.792, xi 0.92
    // An unswept trailing edge (M_TE = M), root c/t 67, tip (the shortest chord) c/t 55.
    const unswept = planform(200, 30, 50, 0);
    const tip = 200 - 30 * Math.tan(50 * DEG);
    const xi = (m: number) =>
      trailingEdgeXi({ mach: m, trailingEdgeSweep: 0, thicknessOverChord: T / tip });
    expect(xi(1.1)).toBeLessThan(-TRANSONIC_XI_MIN);
    expect(outcome(1.1, unswept)).toBe('served');
    expect(xi(1.07)).toBeGreaterThan(-TRANSONIC_XI_MIN);
    expect(outcome(1.07, unswept)).toEqual(['trailing-edge-transonic']);
  });
});

describe('the cases of the review', () => {
  it('A: parallel edges swept 60 deg, c/t 23, M 1.2: served, the low end twice the line sink', () => {
    const p = planform(69, 100, 60, 60);
    const r = boundedRoundedEdge({ mach: 1.2, planform: p, thickness: T, reynoldsOnDiameter: 1e5 });
    expect(r.normalMach).toBeCloseTo(0.6, 12);
    expect(r.trailingEdgeNormalMach).toBeCloseTo(0.6, 12);
    expect(r.low).toBeCloseTo(-0.0692, 4);
    expect(r.low).toBeCloseTo(
      LOWER_BOUND_MARGIN *
        trailingEdgeSinkShift({
          mach: 1.2,
          leadingEdgeSweep: 60 * DEG,
          trailingEdgeSweep: 60 * DEG,
          thicknessOverChord: 1 / 23,
        }),
      12,
    );
    expect(r.high).toBeCloseTo(0.829, 3);
    expect(r.nominal).toBeCloseTo((r.low + r.high) / 2, 12);
    expect(r.label).toContain('bounded, not measured');
    expect(r.label).toContain('a recorded candidate, not served');
    expect(r.label).toContain('refused until NASA TM X-653 is read');
  });

  it('B1: LE 42, TE 30 deg, M 1.10, tip c/t 16 (M_n 0.817, TE normal Mach 0.953): refused', () => {
    const span = (48 - 120) / (Math.tan(30 * DEG) - Math.tan(42 * DEG));
    expect(outcome(1.1, planform(120, span, 42, 30))).toEqual([
      'normal-mach',
      'trailing-edge-transonic',
    ]);
  });

  it('B2: LE 45, TE 25 deg, M 1.05, c/t 23: refused', () => {
    expect(outcome(1.05, planform(69, 50, 45, 25))).toEqual([
      'free-stream',
      'trailing-edge-transonic',
    ]);
  });

  it('C: an unswept trailing edge at M 1.00, LE 42 deg (M_n 0.74): refused, as at M 0.99', () => {
    for (const m of [0.99, 1.0]) {
      expect(outcome(m, planform(120, 80, 42, 0))).toEqual([
        'free-stream',
        'trailing-edge-transonic',
      ]);
    }
  });

  it('D: M_n 0.9 on a plate of c/t 8: refused', () => {
    const le = Math.acos(0.9 / 1.1) / DEG;
    expect(outcome(1.1, planform(24, 40, le, le))).toEqual([
      'normal-mach',
      'trailing-edge-transonic',
    ]);
  });

  it('the hobby fin of 0016 (42 deg, unswept TE, root c/t 40, tip 16) is refused at every Mach 1.0 to 1.2', () => {
    const hobby = planform(120, 80, Math.atan(72 / 80) / DEG, 0);
    const re = 5.7e4 / Math.cos(Math.atan(72 / 80));
    expect(outcome(1.0, hobby, re)).toEqual(['free-stream', 'trailing-edge-transonic']);
    expect(outcome(1.05, hobby, re)).toEqual(['free-stream', 'trailing-edge-transonic']);
    expect(outcome(1.1, hobby, re)).toEqual(['normal-mach', 'trailing-edge-transonic']);
    expect(outcome(1.15, hobby, re)).toEqual(['normal-mach', 'trailing-edge-transonic']);
    expect(outcome(1.2, hobby, re)).toEqual(['normal-mach']);
  });

  it('refuses below Mach 1.06, above M_n 0.8, beyond 60 deg and outside the Reynolds numbers', () => {
    expect(FREE_STREAM_FLOOR).toBe(1.06);
    expect(NORMAL_MACH_CAP).toBe(0.8);
    const thin = planform(120, 60, 55, 55);
    expect(outcome(1.059, thin)).toEqual(['free-stream']);
    expect(outcome(1.06, thin)).toBe('served');
    expect(outcome(1.2, planform(120, 60, 61, 61))).toEqual(['sweep']);
    expect(outcome(1.2, thin, 1e4)).toEqual(['reynolds']); // Re_n 5.7e3
  });

  it('a supersonic trailing edge outside the transonic range: low end zero', () => {
    const r = boundedRoundedEdge({
      mach: 1.25,
      planform: planform(120, 60, 55, 0),
      thickness: T,
      reynoldsOnDiameter: 1e5,
    });
    expect(r.trailingEdgeNormalMach).toBe(1.25);
    expect(r.trailingEdgeXi).toBeLessThan(-TRANSONIC_XI_MIN);
    expect(r.low).toBe(0);
  });
});

describe('the high end (U1) to (U4), with the Reynolds-number allowance (review G)', () => {
  const node = transonicFrontSide(1.0);
  const modified = (2 / 3) * pitotPressureCoefficient(1.0);

  it("is the measured term's high end at M_n 1.0: 0.659 unswept, 0.679 with the allowance", () => {
    expect(node.high * modified).toBeCloseTo(0.6594, 4);
    expect(node.high * modified + REYNOLDS_ALLOWANCE * node.nominal * modified).toBeCloseTo(
      0.6789,
      4,
    );
  });

  it('swept (the allowance 1.22 from 14.3 deg): 0.829 outside, 0.805 inside the Reynolds numbers of CR-149372', () => {
    const p = planform(120, 60, 55, 55);
    const outside = boundedRoundedEdge({
      mach: 1.2,
      planform: p,
      thickness: T,
      reynoldsOnDiameter: 1e5,
    });
    const inside = boundedRoundedEdge({
      mach: 1.2,
      planform: p,
      thickness: T,
      reynoldsOnDiameter: 4e5,
    });
    expect(outside.reynoldsAllowance).toBe(true);
    expect(inside.reynoldsAllowance).toBe(false);
    expect(outside.high).toBeCloseTo(0.829, 3);
    expect(inside.high).toBeCloseTo(0.805, 3);
  });

  it("Bryson's stationarity: dC/dM at M_n 1 = (4 - 2 C)/(gamma + 1), +1.125 at C 0.65", () => {
    expect(stationaritySlope(0.65)).toBeCloseTo(1.125, 12);
  });
});

describe("Barrowman's leading-edge curve (1967, eq. 4-17; OpenRocket's), set beside the bounds (review H)", () => {
  /** (1 - M^2)^(-0.417) - 1 at M < 0.9: a cylinder's total drag less a base-drag curve. */
  const barrowman = (m: number) => (1 - m * m) ** -0.417 - 1;
  const crossing = (level: number) => Math.sqrt(1 - (1 + level) ** (-1 / 0.417));

  it('gives 0.999 at M_n 0.9 and exceeds the unswept high end from M_n 0.84', () => {
    expect(barrowman(0.9)).toBeCloseTo(0.999, 3);
    const node = transonicFrontSide(1.0);
    const high = node.high * (2 / 3) * pitotPressureCoefficient(1.0);
    expect(crossing(high)).toBeCloseTo(0.839, 3);
    expect(crossing(0.6565)).toBeCloseTo(0.838, 3);
  });

  it('lies inside the band at the cap, M_n 0.8 (0.531), so the served range shows no conflict, only a different nominal', () => {
    expect(barrowman(0.8)).toBeCloseTo(0.531, 3);
    const r = boundedRoundedEdge({
      mach: 0.8 / Math.cos(55 * DEG),
      planform: planform(120, 60, 55, 55),
      thickness: T,
      reynoldsOnDiameter: 1e5,
    });
    expect(barrowman(r.normalMach)).toBeGreaterThan(r.low);
    expect(barrowman(r.normalMach)).toBeLessThan(r.high);
  });
});

describe("refused, the owner's decision of 2026-10-22 (0014 section 10.7 (o)): the term stays unwired until NASA TM X-653 is read", () => {
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? sources(p) : p.endsWith('.ts') ? [p] : [];
    });

  it('no module under src/ imports the bounded term', () => {
    const importers = sources('src').filter(
      (p) =>
        !p.endsWith('rounded-edge-bounded.ts') &&
        /from '[^']*rounded-edge-bounded'/.test(readFileSync(p, 'utf8')),
    );
    expect(importers).toEqual([]);
  });

  it("the review's case A, which the candidate would serve, is refused by the wired term, naming TM X-653", () => {
    // Both edges swept 60 deg at Mach 1.2: M_n 0.6.
    expect(
      boundedRoundedEdge({
        mach: 1.2,
        planform: planform(69, 100, 60, 60),
        thickness: T,
        reynoldsOnDiameter: 1e5,
      }).nominal,
    ).toBeCloseTo(0.38, 2);
    let refusal: unknown;
    try {
      roundedLeadingEdgeDrag({
        mach: 1.2,
        radius: T / 2000,
        faceAngle: 0,
        tanLeadingEdgeSweep: Math.tan(60 * DEG),
        reynoldsOnDiameter: 1e5,
      });
    } catch (e) {
      refusal = e;
    }
    expect(refusal).toBeInstanceOf(FinRefusal);
    const e = refusal as FinRefusal;
    expect(e.reason).toBe('leading-edge-range');
    expect(e.message).toMatch(/0\.6000 is below 1\.0/);
    expect(e.message).toMatch(
      /a bound for a flat plate's rounded edge there \(0019 section 3\.2\) is not served until NASA TM X-653, which tested fins with blunt leading edges at Mach 0\.6 to 3\.8, is read \(the owner's decision of 2026-10-22, 0014 section 10\.7 \(o\)\)$/,
    );
  });
});
