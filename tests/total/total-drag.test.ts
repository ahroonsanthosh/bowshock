/**
 * The total drag library (src/total): the linear combination of bands, the
 * components of a finned body against independent computations, the input
 * bands (the transition input as states of the boundary layer, round 5),
 * and the refusals. Recorded in docs/design/0010-base-drag-and-total.md,
 * sections 3 and 10.
 */

import { describe, expect, it } from 'vitest';
import { bodyBaseDrag } from '../../src/base/base-drag';
import { finTrailingEdgeBaseDrag } from '../../src/base/fin-trailing-edge';
import { FITTED_DRAG_FLOOR } from '../../src/analysis/verified-drag';
import { finWaveDrag } from '../../src/fins/fin-wave-drag';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { roundedLeadingEdgeDrag, roundedWedge } from '../../src/fins/rounded-leading-edge';
import { doubleWedge, singleWedge, type SymmetricSection } from '../../src/fins/section';
import { bodyFriction } from '../../src/friction/body-friction';
import { flatPlateFriction } from '../../src/friction/flat-plate';
import {
  BODY_FRICTION_BAND,
  FINS_OWN_DRAG_BAND,
  finnedBodyComponents,
  finnedBodyTotalDrag,
  type FinnedBody,
} from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import {
  bandWithInputs,
  combineComponents,
  TotalDragRefusal,
  type DragComponent,
} from '../../src/total/total-drag';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const deg = Math.PI / 180;
const noseLength = 0.5 / Math.tan(10 * deg);
const sharp: FinnedBody = {
  body: {
    nose: { shape: { kind: 'conical' }, length: noseLength, baseRadius: 0.5 },
    cylinderLength: 10 - noseLength,
  },
  afterbody: 'cylinder',
  fins: {
    count: 4,
    planform: trapezoidalPlanform({ rootChord: 1, span: 1, leadingEdgeSweep: 0 }),
    section: doubleWedge(0.06),
    sectionFamily: 'other',
    leadingEdgeRadius: 0,
    trailingEdgeAheadOfBase: 0,
  },
};
const conditions = { mach: 2.4, temperature: 290, reynoldsPerLength: 1.5e6 };
const nose = () => exactConeNoseWaveDrag(conditions.mach, 10 * deg);

describe('combining components', () => {
  const a: DragComponent = { name: 'a', cd: 0.1, low: 0.09, high: 0.12, label: '', band: '' };
  const b: DragComponent = { name: 'b', cd: 0.2, low: 0.202, high: 0.3, label: '', band: '' };

  it('sums values and bands linearly, keeping input bands apart', () => {
    const t = combineComponents(
      [a, b],
      [
        { name: 'transition', low: -0.01, high: 0, label: '' },
        { name: 'roughness', low: 0, high: 0.02, label: '' },
      ],
    );
    expect(t.cd).toBeCloseTo(0.3, 15);
    expect(t.low).toBeCloseTo(0.292, 15);
    expect(t.high).toBeCloseTo(0.42, 15);
    expect(bandWithInputs(t)[0]).toBeCloseTo(0.282, 15);
    expect(bandWithInputs(t)[1]).toBeCloseTo(0.44, 15);
  });

  it('refuses a band inverted, a value not finite, an input band without its nominal', () => {
    expect(() => combineComponents([{ ...a, low: 0.2 }])).toThrow(/low end/);
    expect(() => combineComponents([{ ...a, cd: NaN }])).toThrow(/finite/);
    expect(() => combineComponents([a], [{ name: 'x', low: 0.01, high: 0.02, label: '' }])).toThrow(
      /contain the nominal/,
    );
  });
});

describe('the nose of a sharp cone', () => {
  it("is Taylor-Maccoll's surface pressure coefficient with the fitted floor as its band", () => {
    const n = nose();
    const cp = taylorMaccoll(2.4, 10 * deg, 1.4).surfacePressureCoefficient;
    expect(n.cd).toBe(cp);
    expect(n.low).toBeCloseTo(cp * (1 - FITTED_DRAG_FLOOR), 15);
    expect(n.high).toBeCloseTo(cp * (1 + FITTED_DRAG_FLOOR), 15);
  });
});

describe(
  'a finned body with sharp fins: the total and its components',
  { timeout: 120_000 },
  () => {
    const total = finnedBodyTotalDrag(sharp, conditions, nose(), {
      transitionReynolds: [5e5, 3e6],
      wallTemperature: 290,
    });
    const byName = (n: string) => total.components.find((c) => c.name === n)!;

    it('has five components, summed', () => {
      expect(total.components.map((c) => c.name)).toEqual([
        'nose wave drag',
        'body friction',
        'fin friction',
        'fin wave drag',
        'body base',
      ]);
      const sum = total.components.reduce((s, c) => s + c.cd, 0);
      expect(total.cd).toBeCloseTo(sum, 15);
    });

    it('body friction: the momentum integral with the band of 0007', () => {
      const f = bodyFriction(sharp.body, { method: 'momentum-integral', ...conditions });
      const c = byName('body friction');
      expect(c.cd).toBe(f.cd);
      expect(c.low).toBeCloseTo(BODY_FRICTION_BAND[0] * f.cd, 15);
      expect(c.high).toBeCloseTo(BODY_FRICTION_BAND[1] * f.cd, 15);
    });

    it('fin friction: four rectangles, both faces, at the chord Reynolds number', () => {
      const cf = flatPlateFriction({ mach: 2.4, temperature: 290 }).averageCf(1.5e6);
      const c = byName('fin friction');
      expect(c.cd).toBeCloseTo((4 * 2 * cf) / (Math.PI * 0.25), 14);
      expect(c.low).toBeCloseTo(FINS_OWN_DRAG_BAND[0] * c.cd, 15);
      expect(c.high).toBeCloseTo(FINS_OWN_DRAG_BAND[1] * c.cd, 15);
    });

    it('fin wave drag: src/fins on four panels over the cross-section', () => {
      const w = finWaveDrag(sharp.fins.planform, sharp.fins.section as SymmetricSection, 2.4);
      const c = byName('fin wave drag');
      expect(c.cd).toBeCloseTo((4 * w.cd) / (Math.PI * 0.25), 15);
      expect(c.high).toBeGreaterThan(FINS_OWN_DRAG_BAND[1] * c.cd);
    });

    it('body base: the compiled curve with the factor for fins at the base', () => {
      const b = bodyBaseDrag({
        mach: 2.4,
        afterbody: 'cylinder',
        boundaryLayerAtBase: 'turbulent',
        baseAreaRatio: 1,
        fins: {
          count: 4,
          thicknessRatio: 0.06,
          section: 'other',
          tanLeadingEdge: 0,
          tanTrailingEdge: 0,
          trailingEdgeAheadOfBase: 0,
        },
      });
      const c = byName('body base');
      expect([c.cd, c.low, c.high]).toEqual([b.cd, b.low, b.high]);
    });

    it('input bands: transition lowers, a cold wall raises, smooth roughness is zero', () => {
      const [transition, wall, roughness] = total.inputs;
      expect(transition!.name).toBe('transition');
      expect(transition!.low).toBeLessThan(0);
      expect(transition!.high).toBe(0);
      const f = (reT: number) =>
        bodyFriction(sharp.body, {
          method: 'momentum-integral',
          ...conditions,
          transitionReynolds: reT,
        }).cd +
        (4 *
          2 *
          flatPlateFriction({ mach: 2.4, temperature: 290, transitionReynolds: reT }).averageCf(
            1.5e6,
          )) /
          (Math.PI * 0.25);
      const turbulent = byName('body friction').cd + byName('fin friction').cd;
      expect(transition!.low).toBeCloseTo(f(3e6) - turbulent, 14);
      expect(wall!.name).toBe('wall temperature');
      expect(wall!.low).toBe(0);
      expect(wall!.high).toBeGreaterThan(0);
      expect(roughness).toEqual({
        name: 'roughness',
        low: 0,
        high: 0,
        label: 'smooth wall assumed; roughness not modelled (0008 section 2.3)',
      });
      // The model-form band leaves the inputs out.
      const sumLow = total.components.reduce((s, c) => s + c.low, 0);
      expect(total.low).toBeCloseTo(sumLow, 15);
    });

    it('a roughness band supplied by the caller is carried with its source', () => {
      const t = finnedBodyTotalDrag(sharp, conditions, nose(), {
        roughness: { low: 0, high: 0.01, source: 'a test value' },
      });
      expect(t.inputs[0]).toEqual({
        name: 'roughness',
        low: 0,
        high: 0.01,
        label: 'input: roughness, a test value',
      });
    });
  },
);

const blunt: FinnedBody = {
  ...sharp,
  fins: { ...sharp.fins, section: singleWedge(0.06), leadingEdgeRadius: 0.003 },
};

describe(
  'a finned body with blunt-edged single-wedge fins: the edge terms',
  { timeout: 120_000 },
  () => {
    const total = finnedBodyTotalDrag(blunt, conditions, nose(), {
      transitionReynolds: [5e5, 3e6],
    });
    const byName = (n: string) => total.components.find((c) => c.name === n)!;
    const area = Math.PI * 0.25;

    it('has seven components, summed', () => {
      expect(total.components.map((c) => c.name)).toEqual([
        'nose wave drag',
        'body friction',
        'fin friction',
        'fin leading edges',
        'fin wave drag',
        'body base',
        'fin trailing-edge base',
      ]);
      expect(total.cd).toBeCloseTo(
        total.components.reduce((a, c) => a + c.cd, 0),
        15,
      );
    });

    it('the leading edges: the nose term of the tangent geometry on four spans', () => {
      const g = roundedWedge(0.03, 0.003, 1);
      const t = roundedLeadingEdgeDrag({
        mach: 2.4,
        radius: 0.003,
        faceAngle: g.faceAngle,
        tanLeadingEdgeSweep: 0,
        reynoldsOnDiameter: 1.5e6 * 0.006,
      });
      expect(t.regime).toBe('extrapolated in Reynolds number');
      const c = byName('fin leading edges');
      expect(c.cd).toBeCloseTo((4 * t.dragPerSpan) / area, 15);
      expect(c.low).toBeCloseTo(t.band.low * c.cd, 15);
      expect(c.high).toBeCloseTo(t.band.high * c.cd, 15);
    });

    it('the faces: the wedge at the tangent angle, on their own rise', () => {
      const g = roundedWedge(0.03, 0.003, 1);
      const w = finWaveDrag(blunt.fins.planform, singleWedge(2 * Math.tan(g.faceAngle)), 2.4);
      const c = byName('fin wave drag');
      expect(c.cd).toBeCloseTo((4 * w.cd * g.faceRise) / Math.tan(g.faceAngle) / area, 15);
    });

    const te = finTrailingEdgeBaseDrag({
      mach: 2.4,
      count: 4,
      thickness: 0.06,
      span: 1,
      chord: 1,
      tanSweep: 0,
      inBasePlane: true,
      layer: 'turbulent',
      reynoldsPerLength: 1.5e6,
      transitionReynolds: [5e5, 3e6],
      referenceArea: area,
    });

    it('the trailing edges: src/base with the edges in the base plane', () => {
      const c = byName('fin trailing-edge base');
      expect([c.cd, c.low, c.high]).toEqual([te.cd, te.low, te.high]);
      expect(c.label.startsWith('an analogy, not a measurement')).toBe(true);
    });

    it('the transition input: each Re_T one state, friction and the trailing edges together, the body also turbulent', () => {
      // Independently: the friction change of each run, on the body and on the fins.
      const body = (reT?: number) =>
        bodyFriction(blunt.body, {
          method: 'momentum-integral',
          ...conditions,
          ...(reT === undefined ? {} : { transitionReynolds: reT }),
        }).cd;
      const fins = (reT?: number) =>
        (4 *
          2 *
          flatPlateFriction({
            mach: 2.4,
            temperature: 290,
            ...(reT === undefined ? {} : { transitionReynolds: reT }),
          }).averageCf(1.5e6)) /
        area;
      // Re_c = 1.5e6: the run to 5e5 leaves the trailing edges turbulent, the run to 3e6
      // leaves the fins laminar along their whole chord, and their base laminar with them.
      const lam = te.laminarTerm!;
      const expected = [
        [body(5e5) - body() + fins(5e5) - fins(), 0, 0],
        [fins(5e5) - fins(), 0, 0],
        [body(3e6) - body() + fins(3e6) - fins(), lam.low - te.cd, lam.high - te.cd],
        [fins(3e6) - fins(), lam.low - te.cd, lam.high - te.cd],
      ];
      const parts = finnedBodyComponents(blunt, conditions, nose(), {
        transitionReynolds: [5e5, 3e6],
      });
      const states = parts.transitionStates;
      expect(states.map((x) => [x.reynolds, x.bodyTurbulent, x.laminarTrailingEdge])).toEqual([
        [5e5, false, false],
        [5e5, true, false],
        [3e6, false, true],
        [3e6, true, true],
      ]);
      states.forEach((x, k) => {
        const [friction, lo, hi] = expected[k]!;
        expect(x.friction).toBeCloseTo(friction!, 14);
        expect(x.low).toBeCloseTo(friction! + lo!, 14);
        expect(x.high).toBeCloseTo(friction! + hi!, 14);
      });
      const input = total.inputs.find((i) => i.name === 'transition')!;
      expect(input.low).toBe(Math.min(0, ...states.map((x) => x.low)));
      expect(input.high).toBe(Math.max(0, ...states.map((x) => x.high)));
      expect(total.inputs.map((i) => i.name)).toEqual(['transition', 'roughness']);
      // The laminar fins' friction falls by more than the laminar base can rise, so no
      // state lies above the turbulent nominal; the second run's arithmetic added the
      // trailing edges' high end on its own, a state no boundary layer reaches.
      expect(fins(3e6) - fins() + (lam.high - te.cd)).toBeLessThan(0);
      expect(input.high).toBe(0);
      expect(te.laminarInput.high).toBeGreaterThan(0);
      expect(input.label).toMatch(/one state of the boundary layer/);
      expect(input.label).toMatch(/TR 1109 fig\. 29/);
    });
  },
);

// Each refusal still computes the other components: seconds under load.
describe('refusals', { timeout: 60_000 }, () => {
  const refusals = (config: FinnedBody, mach = 2.4, transitionReynolds?: number[]) => {
    try {
      finnedBodyTotalDrag(
        config,
        { ...conditions, mach },
        exactConeNoseWaveDrag(mach, 10 * deg),
        transitionReynolds === undefined ? {} : { transitionReynolds },
      );
    } catch (e) {
      expect(e).toBeInstanceOf(TotalDragRefusal);
      return (e as TotalDragRefusal).refusals.map((r) => `${r.component}: ${r.reason}`);
    }
    return [];
  };

  it('swept blunt trailing edges and, at the base, the body base (a swept rounded leading edge is served since 0016)', () => {
    const swept = trapezoidalPlanform({
      rootChord: 1,
      span: 1,
      leadingEdgeSweep: 10 * deg,
      trailingEdgeSweep: 10 * deg,
    });
    expect(
      refusals({
        ...sharp,
        fins: { ...blunt.fins, planform: swept },
      }),
    ).toEqual([
      // The present factor refuses swept fins (0014 section 10.7); the rebuilt factor (0015) is asked and
      // refuses the blunt trailing edge, its refusal carrying the present one's.
      'body base: fin-trailing-edge',
      'fin trailing-edge base: swept-trailing-edge',
    ]);
  });

  it('swept fins at the base: the leading edge swept, the rebuilt factor (0015) serves its bracket; the trailing edge swept, refused; a chord ahead, refused', () => {
    // The review's probe: four 8% double wedges swept 45 deg at both edges, at the base. No sharp fins with
    // a swept trailing edge are measured at the base (0015 section 3.4): refused.
    const probe: FinnedBody = {
      ...sharp,
      fins: {
        ...sharp.fins,
        section: doubleWedge(0.08),
        planform: trapezoidalPlanform({
          rootChord: 1,
          span: 1,
          leadingEdgeSweep: 45 * deg,
          trailingEdgeSweep: 45 * deg,
        }),
      },
    };
    expect(refusals(probe, 2.0)).toEqual(['body base: fin-sweep']);
    expect(refusals(probe, 2.8)).toEqual(['body base: fin-sweep']);
    // The same fins with the trailing edge unswept: the rebuilt factor's bracket.
    const leOnly: FinnedBody = {
      ...probe,
      fins: {
        ...probe.fins,
        planform: trapezoidalPlanform({ rootChord: 1, span: 0.5, leadingEdgeSweep: 45 * deg }),
      },
    };
    for (const mach of [2.0, 2.8]) {
      expect(refusals(leOnly, mach)).toEqual([]);
      const b = finnedBodyComponents(
        leOnly,
        { ...conditions, mach },
        exactConeNoseWaveDrag(mach, 10 * deg),
      ).base!;
      expect(b.finsOnBaseSource).toBe('rebuilt');
      expect(b.presentRefusal?.reason).toBe('fin-sweep');
      // Above M 2.56, where fig. 35's free-flight curve ends, bounded, not measured.
      expect(b.finsOnBase?.bounded).toBe(mach > 2.56);
    }
    // A chord ahead: served on the plain curve until 2026-10-27, refused now (0014 section 10.7 (ad)):
    // a root chord of one body diameter, not TN 2360's 1.5, and above Mach 2.0 nothing measured ahead.
    const ahead = { ...probe, fins: { ...probe.fins, trailingEdgeAheadOfBase: 1 } };
    expect(refusals(ahead, 2.0)).toEqual(['body base: fins-near-base']);
    expect(refusals(ahead, 2.8)).toEqual(['body base: fins-near-base']);
  });

  it('a rounded leading edge on a section other than a single wedge', () => {
    expect(refusals({ ...sharp, fins: { ...sharp.fins, leadingEdgeRadius: 0.004 } })).toEqual([
      'fin leading edges: leading-edge-geometry',
    ]);
  });

  it('boat-tails; the fins-on-base factor below M 1.8; a laminar base', () => {
    expect(refusals({ ...sharp, afterbody: 'boat-tail' })).toEqual(['body base: afterbody']);
    // Below M 1.8 the present factor refuses and the rebuilt one (0015) serves these sharp fins, down
    // to M 1.0 (W2's part, 0015 section 11); below M 1.0 the body base is refused. Below M 1.5 the total
    // is refused by the fins' own-drag guard alone (0014 section 10.7 (f)), the base served.
    expect(refusals(sharp, 1.6)).toEqual([]);
    const at16 = finnedBodyComponents(
      sharp,
      { ...conditions, mach: 1.6 },
      exactConeNoseWaveDrag(1.6, 10 * deg),
    );
    expect(at16.base?.finsOnBaseSource).toBe('rebuilt');
    expect(at16.base?.presentRefusal?.reason).toBe('mach-range');
    expect(refusals(sharp, 1.45)).toEqual([
      'fin friction: fins-own-drag-mach',
      'fin wave drag: fins-own-drag-mach',
    ]);
    const at12 = finnedBodyComponents(
      sharp,
      { ...conditions, mach: 1.2 },
      exactConeNoseWaveDrag(1.2, 10 * deg),
    );
    expect(at12.base?.finsOnBaseSource).toBe('rebuilt');
    expect(at12.base?.curveBand.source).toBe('w2');
    expect(
      refusals({ ...sharp, fins: { ...sharp.fins, section: singleWedge(0.08) } }, 1.6),
    ).toEqual(['body base: fin-trailing-edge']);
    expect(refusals(sharp, 2.4, [2e7])).toEqual(['body base: laminar-base']);
  });

  it("below Mach 1.5: the fins' own-drag band (ARCAS, Mach 1.5 to 2.96) refused, the base served (W2)", () => {
    // The guard comes first: at M 1.08 and 1.1 the double wedge's shock is also detached (0014 section
    // 10.7 (f)). The body base is served from M 1.0 (0015 section 11.2), so the guard alone refuses the total.
    for (const m of [1.08, 1.1, 1.4999999]) {
      expect(refusals(sharp, m)).toEqual([
        'fin friction: fins-own-drag-mach',
        'fin wave drag: fins-own-drag-mach',
      ]);
    }
    const b = finnedBodyComponents(
      sharp,
      { ...conditions, mach: 1.08 },
      exactConeNoseWaveDrag(1.08, 10 * deg),
    ).base;
    expect(b?.finsOnBaseSource).toBe('rebuilt');
    expect(b?.curveBand.source).toBe('w2');
  });

  it('a detached fin shock above the guard, at M 1.55 (a 25% double wedge, 14.0 deg)', () => {
    const thick = { ...sharp, fins: { ...sharp.fins, section: doubleWedge(0.25) } };
    const r = refusals(thick, 1.55);
    expect(r).toContain('fin wave drag: detached-shock');
    expect(r).not.toContain('fin friction: fins-own-drag-mach');
  });
});
