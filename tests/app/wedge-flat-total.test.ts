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
});
