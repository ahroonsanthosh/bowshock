/**
 * The page's wedge-flat section (a plate bevelled at the leading edge only,
 * to a square trailing edge; docs/design/0014-refusals.md W12): the drag
 * logic gives the library exactly that section, so the page's total is the
 * library's, which the refusal audit counts.
 */

import { describe, expect, it } from 'vitest';
import {
  basicFinnerForm,
  configurationOf,
  totalDragView,
  type NoseState,
  type TotalDragForm,
} from '../../src/app/total-drag';
import { wedgeFlat } from '../../src/fins/section';
import { designForm } from '../../src/rocket/adapter';
import { preset } from '../../src/rocket/presets';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import { finnedBodyComponents } from '../../src/total/finned-body';

const exactNose = (form: TotalDragForm): NoseState => {
  const n = form.body.nose;
  return {
    kind: 'solved',
    verified: true,
    component: exactConeNoseWaveDrag(form.mach, Math.atan(n.baseRadius / n.length)),
  };
};

/** The Basic Finner's body and planform (chord 1 cal) with 0.08 cal plates bevelled over a fifth of the chord. */
const form = (mach: number): TotalDragForm => ({
  ...basicFinnerForm(mach),
  section: { kind: 'wedge-flat', thickness: 0.08, frontBevel: 0.2 },
  leadingEdgeRadius: 0,
});

describe('the wedge-flat section on the page (0014 W12)', { timeout: 60_000 }, () => {
  it('is given to the library as the wedge-flat section', () => {
    const c = configurationOf(form(2));
    if (c.kind !== 'ok') throw new Error('expected a configuration');
    expect(c.value.config.fins.section).toEqual(wedgeFlat(0.08, 0.2));
    expect(c.value.config.fins.leadingEdgeRadius).toBe(0);
  });

  it("gives the library's own components, the section as the refusal audit builds it, to the bit", () => {
    for (const mach of [1.7, 2, 2.5]) {
      const f = form(mach);
      const c = configurationOf(f);
      if (c.kind !== 'ok') throw new Error('expected a configuration');
      const literal = {
        ...c.value.config,
        fins: {
          ...c.value.config.fins,
          section: { x: [0, 0.2, 1], halfThickness: [0, 0.04, 0.04], bluntTrailingEdge: true },
        },
      };
      const nose = exactNose(f);
      if (nose.kind !== 'solved') throw new Error('expected a nose');
      const page = finnedBodyComponents(
        c.value.config,
        c.value.conditions,
        nose.component,
        c.value.inputs,
      );
      const audit = finnedBodyComponents(
        literal,
        c.value.conditions,
        nose.component,
        c.value.inputs,
      );
      expect(page).toEqual(audit);
    }
  });

  it('is served at Mach 2 with every fin term: the faces, the trailing-edge base and the body base', () => {
    const view = totalDragView(form(2), exactNose(form(2)));
    if (view.kind !== 'total') throw new Error(`expected a total, got ${view.kind}`);
    const names = view.total.components.map((p) => p.name);
    for (const name of ['fin wave drag', 'fin trailing-edge base', 'body base', 'fin friction']) {
      expect(names).toContain(name);
    }
    // A sharp bevel: no rounded leading-edge term.
    expect(names).not.toContain('fin leading edges');
  });

  it("through the page's own path, a root chord unlike the diameter: the section the fin has", () => {
    // The Basic Finner's body (diameter 0.03 m) and fin thickness, on a 0.045 m rectangle bevelled over
    // 6 mm at the leading edge: t/c and the bevel are the fin's thickness and bevel over its chord.
    const b = preset('basic-finner').design;
    const basicFins = b.finSets[0]!;
    const fins = {
      ...basicFins,
      // The root's leading edge moved forward by the longer chord, so the trailing edge stays at the base.
      rootLeadingEdge: basicFins.rootLeadingEdge - 0.015,
      planform: {
        kind: 'trapezoidal',
        rootChord: 0.045,
        tipChord: 0.045,
        span: 0.03,
        sweepLength: 0,
      } as const,
      section: {
        kind: 'flat',
        leadingEdge: { kind: 'bevelled', length: 0.006 },
        trailingEdge: { kind: 'square' },
      } as const,
    };
    const asked = designForm({ ...b, finSets: [fins] }, 2, { without: false });
    if (asked.kind !== 'form') throw new Error(asked.kind);
    expect(asked.form.trailingEdgeAheadOfBase).toBe(0);
    const c = configurationOf(asked.form);
    if (c.kind !== 'ok') throw new Error('expected a configuration');
    const s = c.value.config.fins.section;
    if ('kind' in s) throw new Error('expected a section in chord units');
    const tc = fins.thickness / 0.045;
    expect(s.bluntTrailingEdge).toBe(true);
    expect(s.x.length).toBe(3);
    expect(s.x[1]).toBeCloseTo(0.006 / 0.045, 14);
    expect(s.halfThickness[1]).toBeCloseTo(tc / 2, 14);
    expect(s.halfThickness[2]).toBeCloseTo(tc / 2, 14);
    // The library asked with the section from the fin's own lengths gives the same terms.
    const nose = exactNose(asked.form);
    if (nose.kind !== 'solved') throw new Error('expected a nose');
    const own = {
      ...c.value.config,
      fins: { ...c.value.config.fins, section: wedgeFlat(tc, 0.006 / 0.045) },
    };
    const page = finnedBodyComponents(
      c.value.config,
      c.value.conditions,
      nose.component,
      c.value.inputs,
    );
    const lib = finnedBodyComponents(own, c.value.conditions, nose.component, c.value.inputs);
    expect(page.refusals).toEqual([]);
    expect(page.components.map((p) => p.name)).toEqual(lib.components.map((p) => p.name));
    page.components.forEach((p, k) => {
      const q = lib.components[k]!;
      expect(p.cd).toBeCloseTo(q.cd, 12);
      expect(p.low).toBeCloseTo(q.low, 12);
      expect(p.high).toBeCloseTo(q.high, 12);
    });
  });
});
