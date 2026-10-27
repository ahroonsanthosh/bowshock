/**
 * The bounded leading edge past 60 deg as the total and the page will serve
 * it once 0016 section 21.2's term is served again (0014 section 10.7 (ab),
 * second addendum: after TN 3861 fig. 17 is read twice afresh and the rule
 * holds on the paired values). Until then `roundedLeadingEdgeDrag` refuses
 * sweeps beyond 60 deg, and the branches of src/total/finned-body.ts and
 * src/app that carry a bounded edge are reached only here, where the served
 * term is replaced by the unwired bounded one, `roundedLeadingEdgeBeyond60`
 * (the same term at 60 deg or less).
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/fins/rounded-leading-edge', async (importOriginal) => {
  const m = await importOriginal<typeof import('../../src/fins/rounded-leading-edge')>();
  return { ...m, roundedLeadingEdgeDrag: m.roundedLeadingEdgeBeyond60 };
});

import { claimWords, SWEPT_EDGE_BOUNDED_WORDS } from '../../src/app/status-words';
import {
  basicFinnerForm,
  totalDragView,
  type NoseState,
  type TotalDragForm,
} from '../../src/app/total-drag';
import { clippedDeltaPlanform, trapezoidalPlanform } from '../../src/fins/planform';
import { roundedLeadingEdgeDrag } from '../../src/fins/rounded-leading-edge';
import { flatPlate, singleWedge } from '../../src/fins/section';
import {
  finnedBodyComponents,
  SWEPT_EDGE_BOUNDED_REASON,
  type FinnedBody,
} from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';

const half = Math.atan(0.5 / 3);
const planform = clippedDeltaPlanform({ rootChord: 1.5, span: 1, taperRatio: 0.4 });
const config = (p = flatPlate(0.05, 'rounded', 'square'), plan = planform): FinnedBody => ({
  body: {
    nose: { shape: { kind: 'conical' }, length: 3, baseRadius: 0.5 },
    cylinderLength: 9,
  },
  afterbody: 'cylinder',
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
const parts = (c: FinnedBody, mach: number) =>
  finnedBodyComponents(c, conditions(mach), exactConeNoseWaveDrag(mach, half), {});
const named = (r: ReturnType<typeof parts>, name: string) =>
  r.components.find((c) => c.name === name)!;

describe('the mock: the served term replaced by the bounded one', () => {
  it('past 60 deg the term is bounded; the module itself refuses it (tests/fins)', () => {
    const e = roundedLeadingEdgeDrag({
      mach: 2.8,
      radius: 0.025,
      faceAngle: 0,
      tanLeadingEdgeSweep: Math.tan((66.4 * Math.PI) / 180),
      reynoldsOnDiameter: 1e5,
    });
    expect(e.bounded).toBeDefined();
  });
});

describe('bounded, not measured (0016 section 21.2), in the total', () => {
  it('a rounded leading edge swept 66.4 deg at M 2.8 (M_n 1.12): bounded between its sweep and 60 deg', () => {
    const steep = clippedDeltaPlanform({ rootChord: 2, span: 0.7, taperRatio: 0.2 });
    const r = parts(config(undefined, steep), 2.8);
    expect(r.refusals).toEqual([]);
    const c = named(r, 'fin leading edges');
    const n = roundedLeadingEdgeDrag({
      mach: 2.8,
      radius: 0.025,
      faceAngle: 0,
      tanLeadingEdgeSweep: steep.tanLeadingEdge,
      reynoldsOnDiameter: 2e6 * 0.05,
    });
    expect(n.bounded).toBeDefined();
    const cd = (3 * n.dragPerSpan * steep.span) / area;
    expect(c.cd).toBeCloseTo(cd, 15);
    expect(c.low).toBeCloseTo(n.band.low * cd, 15);
    expect(c.high).toBeCloseTo(n.band.high * cd, 15);
    expect(c.bounded).toBe(SWEPT_EDGE_BOUNDED_REASON);
    expect(c.label.startsWith('bounded, not measured: swept 66.4 deg')).toBe(true);
    expect(c.label).toMatch(/; on a flat plate, a semicircular nose \(0016\)$/);
    // Each bound's own source in the band text (0014 section 10.2), built
    // here from the two terms the library returns: their data, their bands
    // rounded outward and their regimes.
    const { lower, upper } = n.bounded!;
    expect(lower.transonic).toBeDefined();
    expect(upper.transonic).toBeDefined();
    const two = (lo: number, hi: number): string =>
      `${(Math.floor(lo * 100 + 1e-9) / 100).toFixed(2)} to ${(Math.ceil(hi * 100 - 1e-9) / 100).toFixed(2)}`;
    const source = (t: typeof lower): string =>
      'NASA CR-149372 and TN 2960, front side over modified Newtonian, ' +
      `${two(t.band.low, t.band.high)} (${t.regime}, swept, with RM A55H31's sweep allowance)`;
    expect(source(lower)).not.toBe(source(upper));
    expect(c.band).toBe(
      "bounded, not measured: the whole gap between the term at 66.4 deg at its band's low end (" +
        `${source(lower)}) and the term at 60 deg at its band's high end (${source(upper)}), ` +
        `C_D ${c.low.toFixed(4)} to ${c.high.toFixed(4)}, a gap of ${(c.high - c.low).toFixed(4)}`,
    );
  });
});

describe("a rounded wedge's edge swept beyond 60 deg (finned-body's single-wedge path)", () => {
  it('is bounded, named for the claim, its band text naming both sources', () => {
    // A single wedge of constant chord swept 62 deg front and back, M 2.8 (M_n 1.31 at 62 deg).
    const sweep = 62 * (Math.PI / 180);
    const swept = trapezoidalPlanform({
      rootChord: 1.5,
      span: 0.5,
      leadingEdgeSweep: sweep,
      trailingEdgeSweep: sweep,
    });
    const c: FinnedBody = {
      ...config(undefined, swept),
      fins: {
        ...config(undefined, swept).fins,
        section: singleWedge(0.08),
        leadingEdgeRadius: 0.004,
      },
    };
    const r = parts(c, 2.8);
    const le = named(r, 'fin leading edges');
    expect(le.bounded).toBe(SWEPT_EDGE_BOUNDED_REASON);
    expect(le.label.startsWith('bounded, not measured: swept 62.0 deg')).toBe(true);
    expect(le.band).toMatch(/^bounded, not measured: the whole gap between the term at 62\.0 deg/);
    expect(le.band).toContain("with RM A55H31's sweep allowance");
  });
});

describe('on the page', { timeout: 60_000 }, () => {
  const f = basicFinnerForm(2.8, 1.6e7);
  const plate = (leadingEdge: 'rounded' | 'square', trailingEdge: 'square' | 'rounded') => ({
    ...f,
    section: { kind: 'flat-plate' as const, thickness: 0.05, leadingEdge, trailingEdge },
    planform: { kind: 'clipped-delta' as const, taperRatio: 0.4 },
    rootChord: 1.5,
    trailingEdgeAheadOfBase: 2,
  });
  const exactNose = (form: TotalDragForm): NoseState => {
    const n = form.body.nose;
    return {
      kind: 'solved',
      verified: true,
      component: exactConeNoseWaveDrag(form.mach, Math.atan(n.baseRadius / n.length)),
    };
  };

  it('rounded leading edges swept 66.4 deg at Mach 2.8: a total whose claim names the bounded edge', () => {
    const form = {
      ...plate('rounded', 'square'),
      planform: { kind: 'clipped-delta' as const, taperRatio: 0.2 },
      rootChord: 2,
      span: 0.7,
    };
    const v = totalDragView(form, exactNose(form));
    if (v.kind !== 'total') throw new Error(JSON.stringify(v));
    const le = v.total.components.find((c) => c.name === 'fin leading edges')!;
    expect(le.bounded).toBe(SWEPT_EDGE_BOUNDED_REASON);
    expect(v.claim.kind).toBe('estimate');
    if (v.claim.kind !== 'estimate') return;
    expect(v.claim.reasons).toContain(SWEPT_EDGE_BOUNDED_REASON);
    expect(claimWords(v.claim)).toBe(SWEPT_EDGE_BOUNDED_WORDS);
  });
});
