/**
 * Flat-plate fins in the total (src/total/finned-body.ts;
 * docs/design/0016-fin-edges-of-flat-plates.md): a clipped delta in sheet
 * stock, its rounded leading edge swept, its square trailing edge thick-
 * layered and of varying chord, each component against src/fins and
 * src/base called directly; the refusals of square-cut leading edges,
 * rounded trailing edges and subsonic normal Mach numbers; the transition
 * states on the part of the span they reach.
 */

import { describe, expect, it } from 'vitest';
import { finTrailingEdgeBaseDrag } from '../../src/base/fin-trailing-edge';
import { clippedDeltaPlanform } from '../../src/fins/planform';
import { standardAtmosphere } from '../../src/atmosphere/us-standard-1976';
import { roundedLeadingEdgeDrag } from '../../src/fins/rounded-leading-edge';
import { doubleWedge, flatPlate } from '../../src/fins/section';
import { finnedBodyComponents, type FinnedBody } from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import { combineComponents } from '../../src/total/total-drag';

const half = Math.atan(0.5 / 3);
const planform = clippedDeltaPlanform({ rootChord: 1.5, span: 1, taperRatio: 0.4 });
const config = (p = flatPlate(0.05, 'rounded', 'square'), plan = planform): FinnedBody => ({
  body: {
    nose: { shape: { kind: 'conical' }, length: 3, baseRadius: 0.5 },
    cylinderLength: 9,
  },
  afterbody: 'cylinder',
  // Ahead of the base by more than a root chord, so the body base is the plain curve.
  fins: {
    count: 3,
    planform: plan,
    section: p,
    sectionFamily: 'other',
    leadingEdgeRadius: 0,
    trailingEdgeAheadOfBase: 2,
  },
});
const conditions = (mach: number) => ({ mach, temperature: 250, reynoldsPerLength: 2e6 });
const area = Math.PI / 4;
const nose = (mach: number) => exactConeNoseWaveDrag(mach, half);
const parts = (c: FinnedBody, mach: number, transitionReynolds?: number[]) =>
  finnedBodyComponents(
    c,
    conditions(mach),
    nose(mach),
    transitionReynolds ? { transitionReynolds } : {},
  );
const named = (r: ReturnType<typeof parts>, name: string) =>
  r.components.find((c) => c.name === name)!;

describe('a clipped delta in sheet stock, rounded leading edge, square trailing edge', () => {
  const r = parts(config(), 2.8);

  it('computes every component, and the total', () => {
    expect(r.refusals).toEqual([]);
    expect(() => combineComponents(r.components, r.inputs)).not.toThrow();
  });

  it('the leading edges: the swept nose of radius t/2 per unit span, times the span and count', () => {
    const n = roundedLeadingEdgeDrag({
      mach: 2.8,
      radius: 0.025,
      faceAngle: 0,
      tanLeadingEdgeSweep: planform.tanLeadingEdge,
      reynoldsOnDiameter: 2e6 * 0.05,
    });
    const c = named(r, 'fin leading edges');
    expect(c.cd).toBeCloseTo((3 * n.dragPerSpan * 1) / area, 15);
    expect(c.low).toBeCloseTo(n.band.low * c.cd, 15);
    expect(c.high).toBeCloseTo(n.band.high * c.cd, 15);
    // 42 deg of sweep, M_n 2.08, Re_n 7.4e4: swept and extrapolated in Reynolds number.
    expect(n.sweepDegrees).toBeCloseTo(Math.atan(0.9) / (Math.PI / 180), 12);
    expect(n.regime).toBe('extrapolated in Reynolds number');
    // The sweep allowance at 42 deg, 0.95 to 1.22 (0016 section 19), on the band widened by +-3%.
    expect(n.band).toEqual({ low: 0.912, high: 1.33 });
    expect(c.label).toMatch(/on a flat plate, a semicircular nose/);
  });

  it('the faces: no wave drag', () => {
    const c = named(r, 'fin wave drag');
    expect([c.cd, c.low, c.high]).toEqual([0, 0, 0]);
  });

  it('the trailing edges: integrated along the span, thick at the root, the plate thickness at every station', () => {
    const t = finTrailingEdgeBaseDrag({
      mach: 2.8,
      count: 3,
      thickness: 0.05,
      span: 1,
      chord: 1.5,
      tipChord: 0.6,
      tipThickness: 0.05,
      tanSweep: 0,
      inBasePlane: false,
      layer: 'turbulent',
      reynoldsPerLength: 2e6,
      referenceArea: area,
    });
    const c = named(r, 'fin trailing-edge base');
    expect(c.cd).toBe(t.cd);
    expect(c.low).toBe(t.low);
    expect(c.high).toBe(t.high);
    expect(t.thinLayerParameter).toBeGreaterThan(1.5);
    expect(c.label).toMatch(/^correlation/);
    expect(c.label).toMatch(/largest c\/\[h Re_c\^\(1\/5\)\]/);
  });

  it('the body base takes the plate t/c at the root (here the plain curve, the fins a chord or more ahead)', () => {
    expect(r.base).toBeDefined();
    expect(named(r, 'body base').label).toMatch(/not validated with fins|ahead/);
  });
});

describe('refusals of flat plates', () => {
  const reasons = (c: FinnedBody, mach: number) =>
    parts(c, mach).refusals.map((x) => `${x.component}: ${x.reason}`);

  it('a square-cut leading edge and a rounded trailing edge: bounded, the ordering not shown', () => {
    expect(reasons(config(flatPlate(0.05, 'square', 'square')), 2.8)).toEqual([
      'fin leading edges: square-leading-edge',
    ]);
    expect(reasons(config(flatPlate(0.05, 'rounded', 'rounded')), 2.8)).toEqual([
      'fin trailing-edge base: rounded-trailing-edge',
    ]);
    const m = parts(config(flatPlate(0.05, 'rounded', 'rounded')), 2.8).refusals[0]!.message;
    expect(m).toMatch(/1\.35 and 1\.16 times a square base/);
  });

  it('a normal Mach number below 1.0 (M 1.6 at 59.7 deg: 0.81)', () => {
    const steep = clippedDeltaPlanform({ rootChord: 1.5, span: 0.7, taperRatio: 0.2 });
    expect(reasons(config(undefined, steep), 1.6)).toEqual([
      'fin leading edges: leading-edge-range',
    ]);
    const m = parts(config(undefined, steep), 1.6).refusals[0]!.message;
    expect(m).toMatch(/is below 1\.0/);
    expect(m).toMatch(/RM L53L24a, NASA TP 2204, NASA TN D-3634/);
  });
});

describe('a normal Mach number of 1.0 to 1.49 (0016 section 11): M 2.0 at 42 deg, 1.486', () => {
  const r = parts(config(), 2.0);

  it('is served, the plate flag passed: kappa, CR-149372 in the band, the sweep allowance widened', () => {
    expect(r.refusals).toEqual([]);
    const n = roundedLeadingEdgeDrag({
      mach: 2.0,
      radius: 0.025,
      faceAngle: 0,
      tanLeadingEdgeSweep: planform.tanLeadingEdge,
      reynoldsOnDiameter: 2e6 * 0.05,
    });
    expect(n.transonic).toBeDefined();
    const c = named(r, 'fin leading edges');
    expect(c.cd).toBeCloseTo((3 * n.dragPerSpan * 1) / area, 15);
    expect([c.low, c.high]).toEqual([n.band.low * c.cd, n.band.high * c.cd]);
    expect(c.band).toMatch(/^NASA CR-149372 and TN 2960, front side over modified Newtonian/);
    expect(c.label).toMatch(/interpolated across an unmeasured Mach range/);
    expect(c.label).toMatch(/sweep allowance extrapolated in normal Mach number/);
  });
});

describe('transition on the part of the span it reaches', () => {
  // Re_c 1.2e6 at the tip, 3e6 at the root: 2e6 reaches the outer part.
  const r = parts(config(), 2.8, [1e6, 2e6, 4e6]);
  const t = finTrailingEdgeBaseDrag({
    mach: 2.8,
    count: 3,
    thickness: 0.05,
    span: 1,
    chord: 1.5,
    tipChord: 0.6,
    tipThickness: 0.05,
    tanSweep: 0,
    inBasePlane: false,
    layer: 'turbulent',
    reynoldsPerLength: 2e6,
    referenceArea: area,
    transitionReynolds: [1e6, 2e6, 4e6],
  });

  it("each state's trailing-edge change is the laminar part of the span's, with the body laminar or turbulent", () => {
    const states = r.transitionStates;
    expect(states.length).toBe(6);
    states.forEach((s, i) => {
      const l = t.laminarStates![Math.floor(i / 2)]!;
      expect(s.trailingEdge.low).toBeCloseTo(l.low, 15);
      expect(s.trailingEdge.high).toBeCloseTo(l.high, 15);
      expect(s.laminarTrailingEdge).toBe(l.laminarSpanFraction > 0);
    });
    expect(t.laminarStates!.map((l) => Math.round(1000 * l.laminarSpanFraction) / 1000)).toEqual([
      0, 0.444, 1,
    ]);
  });
});

describe('the review of 2026-10-21 (0016 section 16)', () => {
  const air = standardAtmosphere(0);
  const rePer = (mach: number) => (mach * air.speedOfSound) / air.kinematicViscosity;
  const hobby = clippedDeltaPlanform({ rootChord: 0.12, span: 0.08, taperRatio: 0.4 });
  const body = (fins: FinnedBody['fins']): FinnedBody => ({
    body: {
      nose: { shape: { kind: 'conical' }, length: 0.2, baseRadius: 0.027 },
      cylinderLength: 0.6,
    },
    afterbody: 'cylinder',
    fins,
  });
  const cond = (mach: number) => ({
    mach,
    temperature: air.temperature,
    reynoldsPerLength: rePer(mach),
  });

  it('the hobby fins (three 3 mm plates, root 120, tip 48, span 80 mm, 42 deg, 54 mm body, sea level): the leading edges', () => {
    const area = (Math.PI * 0.054 ** 2) / 4;
    const at = (mach: number) => {
      const n = roundedLeadingEdgeDrag({
        mach,
        radius: 0.0015,
        faceAngle: 0,
        tanLeadingEdgeSweep: hobby.tanLeadingEdge,
        reynoldsOnDiameter: rePer(mach) * 0.003,
      });
      const cd = (3 * n.dragPerSpan * 0.08) / area;
      return [cd, n.band.low * cd, n.band.high * cd].map((v) => Math.round(1e4 * v) / 1e4);
    };
    // Before the review: 0.1311 (0.1180 to 0.1664), 0.1606 (0.1381 to 0.2120), 0.1825 (0.1770 to
    // 0.2080); at f8df436 (flat 0.95 to 1.21): 0.1311 (0.1167 to 0.1770), 0.1607 (0.1366 to
    // 0.2249), 0.1825 (0.1715 to 0.2354); now 0.95 to 1.22 at 42 deg (0016 section 19).
    expect(at(1.5)).toEqual([0.1311, 0.1169, 0.1776]);
    expect(at(1.8)).toEqual([0.1607, 0.1372, 0.2256]);
    expect(at(2.2)).toEqual([0.1825, 0.1715, 0.2361]);
  });

  it('fins at the base take the plate t/c at the tip, the largest: four 7.2 mm plates, root 120, tip 48 mm (t/c 0.06 to 0.15), refused at M 2.0', () => {
    const fins = {
      count: 4,
      planform: hobby,
      section: flatPlate(0.0072, 'rounded', 'square'),
      sectionFamily: 'other' as const,
      leadingEdgeRadius: 0,
      trailingEdgeAheadOfBase: 0,
    };
    const r = finnedBodyComponents(
      body(fins),
      cond(2.0),
      exactConeNoseWaveDrag(2.0, Math.atan(0.027 / 0.2)),
    );
    const base = r.refusals.find((x) => x.component === 'body base');
    expect(base?.reason).toBe('fin-thickness');
    // Plates go to the rebuilt factor's flat-plate value (0014 section 10.7), whose arcs reach t/c 0.10.
    expect(base?.message).toMatch(/flat-faced fins t\/c 0\.150/);
    // The same plates of constant chord 120 mm (t/c 0.06 everywhere) are inside the factor's range.
    const square = {
      ...fins,
      planform: clippedDeltaPlanform({ rootChord: 0.12, span: 0.08, taperRatio: 1 }),
    };
    const q = finnedBodyComponents(
      body(square),
      cond(2.0),
      exactConeNoseWaveDrag(2.0, Math.atan(0.027 / 0.2)),
    );
    expect(q.refusals.find((x) => x.component === 'body base')).toBeUndefined();
    expect(q.base?.finsOnBaseSource).toBe('rebuilt');
  });

  it("flat plates at the base: the rebuilt factor's flat-plate value, RM L52E06's relief its low end (0014 section 10.7, superseding amendment e); sections thinner than the 5% data, unswept, served with the low end F = 1 and labelled; thicker than 10%, refused", () => {
    const fins = (section: FinnedBody['fins']['section'], taperRatio = 1) => ({
      count: 4,
      planform: clippedDeltaPlanform({ rootChord: 0.12, span: 0.08, taperRatio }),
      section,
      sectionFamily: 'other' as const,
      leadingEdgeRadius: 0,
      trailingEdgeAheadOfBase: 0,
    });
    const run = (f: ReturnType<typeof fins>) =>
      finnedBodyComponents(body(f), cond(2.0), exactConeNoseWaveDrag(2.0, Math.atan(0.027 / 0.2)));
    const baseRefusal = (f: ReturnType<typeof fins>) =>
      run(f).refusals.find((x) => x.component === 'body base');
    // Four plates of constant chord, thin (t/c 0.025) or inside the data (0.06), with square trailing edges:
    // the present factor is not measured on plates; the rebuilt factor bounds them from RM L52E06's relief.
    for (const [t, le] of [
      [0.003, 'rounded'],
      [0.0072, 'rounded'],
      [0.0072, 'square'],
    ] as const) {
      const r = run(fins(flatPlate(t, le, 'square')));
      expect(r.refusals.find((x) => x.component === 'body base')).toBeUndefined();
      expect(r.base?.finsOnBaseSource).toBe('rebuilt');
      expect(r.base?.presentRefusal?.reason).toBe('flat-plate-fins');
      expect(r.base?.finsOnBase?.bounded).toBe(true);
      expect(r.base?.finsOnBase?.low).toBeCloseTo(0.8379, 4);
    }
    // A rounded trailing edge: neither factor covers it (0015 section 4).
    expect(baseRefusal(fins(flatPlate(0.003, 'rounded', 'rounded')))?.reason).toBe(
      'fin-trailing-edge',
    );
    // Tapered (root 120 mm, tip 48 mm, t/c 0.025 to 0.0625): the leading edge swept 42 deg with the
    // trailing edge unswept at M 2.0 (the rebuilt factor's moderate sweeps, 0015 section 3.4), bounded as a
    // flat plate, the tip's t/c setting its upper member (3.6): the 10% arc.
    const tapered = run(fins(flatPlate(0.003, 'rounded', 'square'), 0.4));
    expect(tapered.refusals.find((x) => x.component === 'body base')).toBeUndefined();
    expect(tapered.base?.finsOnBase?.bounded).toBe(true);
    // A sharp double wedge 3% thick (the present factor's families): thinner than the data, served,
    // extended; 6% thick, the factor as it was.
    const thin = run(fins(doubleWedge(0.03)));
    const base = thin.components.find((c) => c.name === 'body base')!;
    expect(thin.refusals.filter((x) => x.component === 'body base')).toEqual([]);
    expect(base.label).toMatch(
      /extended below the data's 5% thickness: t\/c down to 0\.030 over 100% of the span, the low end taken as no fin effect \(F = 1/,
    );
    const inside = run(fins(doubleWedge(0.06))).components.find((c) => c.name === 'body base')!;
    expect(inside.label).not.toMatch(/extended below/);
    expect(base.cd).toBeLessThan(inside.cd);
    expect(base.low).toBeLessThan(inside.low);
    expect(base.high).toBeLessThanOrEqual(inside.high);
    // Thicker than 10% stays refused, sections and plates alike.
    expect(baseRefusal(fins(doubleWedge(0.12)))?.reason).toBe('fin-thickness');
    expect(baseRefusal(fins(flatPlate(0.013, 'rounded', 'square')))?.reason).toBe('fin-thickness');
  });

  it('a plate of taper 0.1 with a transition input keeps its trailing edge: the tip sliver is bounded and labelled', () => {
    const fins = {
      count: 3,
      planform: clippedDeltaPlanform({ rootChord: 0.12, span: 0.08, taperRatio: 0.1 }),
      section: flatPlate(0.003, 'rounded', 'square'),
      sectionFamily: 'other' as const,
      leadingEdgeRadius: 0,
      trailingEdgeAheadOfBase: 0.2,
    };
    const r = finnedBodyComponents(
      body(fins),
      cond(2.2),
      exactConeNoseWaveDrag(2.2, Math.atan(0.027 / 0.2)),
      {
        transitionReynolds: [5e5, 1.6e6, 3e6],
      },
    );
    expect(r.refusals.filter((x) => x.component === 'fin trailing-edge base')).toEqual([]);
    const te = r.components.find((c) => c.name === 'fin trailing-edge base')!;
    expect(te.label).toMatch(
      /the stations beyond fig\. 29's read range \(up to \d+% of the span, near the tip\)/,
    );
    expect(te.label).toMatch(/is below 0\.45, fig\. 29\(a\)'s lowest read abscissa/);
    // There fig. 29(b)'s laminar base pressure keeps falling: the high end is the vacuum bound.
    expect(te.label).toMatch(/and above by the vacuum bound \(0016\)/);
    expect(te.label).toMatch(/up to 4\.2% of its value at 1\.0, at M 3\.1/);
  });
});
