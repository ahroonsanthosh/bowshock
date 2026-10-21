/**
 * The adapter (src/rocket/adapter.ts; docs/design/0017-rocketeer-interface.md
 * section 4.2): a rocket in metres to the drag logic's inputs in calibres,
 * the same shape or named; and the presets (src/rocket/presets.ts) as the
 * logic takes them.
 */

import { describe, expect, it } from 'vitest';
import { formOf, type TotalDragFields } from '../../src/app/total-drag-display';
import { basicFinnerClass, totalDragView, type TotalDragForm } from '../../src/app/total-drag';
import {
  aheadOfBase,
  designForm,
  excludableParts,
  withoutText,
  type DesignForm,
} from '../../src/rocket/adapter';
import type { FinSetDesign, RocketDesign } from '../../src/rocket/design';
import { PRESETS, preset } from '../../src/rocket/presets';
import { basicFinnerBodyAsTyped } from '../../src/validation/basic-finner';

/** The drag page's fields for the Basic Finner at sea level, asked by altitude and diameter. */
const BASIC_FINNER_FIELDS: TotalDragFields = {
  finCount: '4',
  planform: 'rectangular',
  leadingEdgeSweep: '0',
  trailingEdgeSweep: '0',
  taperRatio: '0.5',
  rootChord: '1',
  span: '1',
  section: 'single-wedge',
  thickness: '0.08',
  ridge: '0.5',
  frontBevel: '0.25',
  rearBevel: '0.25',
  leadingEdgeRadius: '0.004',
  trailingEdgeAheadOfBase: '0',
  conditionMode: 'altitude-m',
  altitude: '0',
  diameter: '30',
  reynoldsOnLength: '',
  temperature: '',
  transitionReynolds: '',
  wallTemperature: '',
  roughnessLow: '',
  roughnessHigh: '',
  roughnessSource: '',
};

const basic = () => preset('basic-finner').design;
const NO = { without: false } as const;

function formFor(result: DesignForm): TotalDragForm {
  if (result.kind !== 'form') throw new Error(`no form: ${JSON.stringify(result)}`);
  return result.form;
}

/** The Basic Finner with its fin set changed. */
function withFins(change: Partial<FinSetDesign>, design = basic()): RocketDesign {
  return { ...design, finSets: [{ ...design.finSets[0]!, ...change }] };
}

describe('the Basic Finner', { timeout: 60_000 }, () => {
  it("gives the drag page's own form, field for field, at every Mach number of the curve", () => {
    for (const mach of [1, 1.4, 1.8, 2, 2.2, 3]) {
      const form = formFor(designForm(basic(), mach, NO));
      expect(form).toEqual(formOf(basicFinnerBodyAsTyped(), mach, BASIC_FINNER_FIELDS));
      // To the last bit: the body the drag page and the live flow page solve.
      expect(form.body).toEqual(basicFinnerBodyAsTyped());
      expect(form.trailingEdgeAheadOfBase).toBe(0);
    }
  });

  it('lies inside the tested class at Mach 1.8 and 2.0, and the logic says so', () => {
    for (const mach of [1.8, 2]) {
      expect(basicFinnerClass(formFor(designForm(basic(), mach, NO))).inside).toBe(true);
    }
    const above = basicFinnerClass(formFor(designForm(basic(), 2.2, NO)));
    expect(above.inside).toBe(false);
  });

  it('is refused by the logic at Mach 1.0 to 1.6 for reasons other than the nose', () => {
    for (const mach of [1, 1.2, 1.4, 1.6]) {
      const view = totalDragView(formFor(designForm(basic(), mach, NO)), { kind: 'pending' });
      expect(view.kind).toBe('refused');
    }
    for (const mach of [1.8, 2, 2.4, 3]) {
      const view = totalDragView(formFor(designForm(basic(), mach, NO)), { kind: 'pending' });
      expect(view.kind).toBe('pending');
    }
  });
});

describe('what maps', { timeout: 60_000 }, () => {
  it('a trapezoid: its sweeps from the sweep length, the tip chord and the span', () => {
    const design = withFins({
      planform: {
        kind: 'trapezoidal',
        rootChord: 0.03,
        tipChord: 0.015,
        span: 0.03,
        sweepLength: 0.03,
      },
      section: {
        kind: 'flat',
        leadingEdge: { kind: 'bevelled', length: 0.006 },
        trailingEdge: { kind: 'bevelled', length: 0.006 },
      },
    });
    const result = designForm(design, 2, NO);
    // Tapered bevelled fins are not the same shape in chord units: named.
    expect(result.kind).toBe('not-modelled');
    // The planform alone maps: 45 deg leading edge; trailing edge from (0.03, 0) to (0.045, 0.03).
    const constant = withFins({
      planform: {
        kind: 'trapezoidal',
        rootChord: 0.03,
        tipChord: 0.03,
        span: 0.03,
        sweepLength: 0.03,
      },
      section: design.finSets[0]!.section,
    });
    const form = formFor(designForm(constant, 2, NO));
    expect(form.planform.kind).toBe('trapezoidal');
    if (form.planform.kind === 'trapezoidal') {
      expect(form.planform.leadingEdgeSweepDegrees).toBeCloseTo(45, 12);
      expect(form.planform.trailingEdgeSweepDegrees).toBeCloseTo(45, 12);
    }
    expect(form.section).toEqual({
      kind: 'hexagonal',
      thickness: 0.08,
      frontBevel: 0.2,
      rearBevel: 0.2,
    });
  });

  it('a diamond to a double wedge, a wedge to a single wedge with its radius', () => {
    const diamond = formFor(
      designForm(withFins({ section: { kind: 'diamond', ridge: 0.4 } }), 2, NO),
    );
    expect(diamond.section).toEqual({ kind: 'double-wedge', thickness: 0.08, ridge: 0.4 });
    expect(diamond.leadingEdgeRadius).toBe(0);
    const wedge = formFor(designForm(basic(), 2, NO));
    expect(wedge.section).toEqual({ kind: 'single-wedge', trailingEdgeThickness: 0.08 });
    expect(wedge.leadingEdgeRadius).toBe(0.004);
  });

  it('tubes of the nose diameter: one cylinder of their summed length', () => {
    const b = basic();
    const split: RocketDesign = {
      ...b,
      body: [
        { kind: 'tube', length: 0.1, diameter: 0.03 },
        { kind: 'tube', length: b.body[0]!.length - 0.1, diameter: 0.03 },
      ],
    };
    const form = formFor(designForm(split, 2, NO));
    expect(form.body.cylinderLength).toBeCloseTo(7.164359, 12);
  });

  it('fins ahead of the base: their distance in calibres', () => {
    const b = basic();
    const form = formFor(
      designForm(withFins({ rootLeadingEdge: b.finSets[0]!.rootLeadingEdge - 0.06 }), 2, NO),
    );
    expect(form.trailingEdgeAheadOfBase).toBeCloseTo(2, 12);
    expect(aheadOfBase(b, 0.3 - 1e-12)).toBe(0);
  });

  it('an altitude out of the standard atmosphere: the condition refused by its reason', () => {
    const form = formFor(
      designForm({ ...basic(), flight: { maxMach: 3, altitude: 90_000 } }, 2, NO),
    );
    expect(form.conditionRefusals?.length).toBe(1);
    expect(totalDragView(form, { kind: 'pending' }).kind).toBe('refused');
  });
});

describe('what is named, not mapped', { timeout: 60_000 }, () => {
  const named = (design: RocketDesign, options = NO) => {
    const result = designForm(design, 2, options);
    expect(result.kind).toBe('not-modelled');
    return result.kind === 'not-modelled' ? result.features.map((f) => f.feature) : [];
  };

  it('a boat-tail, a transition, and tubes of another diameter', () => {
    const b = basic();
    expect(
      named({
        ...b,
        body: [
          ...b.body,
          {
            kind: 'transition',
            length: 0.02,
            foreDiameter: 0.03,
            aftDiameter: 0.024,
            shape: { kind: 'conical' },
          },
        ],
      }),
    ).toEqual(['a boat-tail']);
    expect(
      named({
        ...b,
        body: [
          ...b.body,
          {
            kind: 'transition',
            length: 0.02,
            foreDiameter: 0.03,
            aftDiameter: 0.036,
            shape: { kind: 'conical' },
          },
        ],
      }),
    ).toEqual(['a transition']);
    expect(named({ ...b, body: [{ kind: 'tube', length: 0.2, diameter: 0.04 }] })).toEqual([
      'body tubes of more than one diameter',
    ]);
  });

  it('no fins, two fin sets, elliptical and freeform fins, an airfoil', () => {
    const b = basic();
    expect(named({ ...b, finSets: [] })).toEqual(['a rocket without fins']);
    expect(named({ ...b, finSets: [b.finSets[0]!, b.finSets[0]!] })).toEqual([
      'more than one set of fins',
    ]);
    expect(
      named(withFins({ planform: { kind: 'elliptical', rootChord: 0.03, span: 0.03 } })),
    ).toEqual(['elliptical fins']);
    expect(
      named(
        withFins({
          planform: {
            kind: 'freeform',
            points: [
              [0, 0],
              [0.01, 0.03],
              [0.03, 0],
            ],
          },
        }),
      ),
    ).toEqual(['freeform fins']);
    expect(named(withFins({ section: { kind: 'airfoil' } }))).toEqual(['airfoil-shaped fins']);
  });

  it('tapered wedges, diamonds and bevelled plates: not the same shape in chord units', () => {
    const tapered = {
      kind: 'trapezoidal',
      rootChord: 0.03,
      tipChord: 0.02,
      span: 0.03,
      sweepLength: 0.01,
    } as const;
    expect(named(withFins({ planform: tapered }))).toEqual(['tapered wedge fins']);
    expect(
      named(withFins({ planform: tapered, section: { kind: 'diamond', ridge: 0.5 } })),
    ).toEqual(['tapered diamond fins']);
  });

  it('pairs of edges with no section; flat plates until the logic takes them', () => {
    const flat = (le: 'square' | 'rounded' | 'bevelled', te: 'square' | 'rounded' | 'bevelled') =>
      withFins({
        section: {
          kind: 'flat',
          leadingEdge: le === 'bevelled' ? { kind: le, length: 0.005 } : { kind: le },
          trailingEdge: te === 'bevelled' ? { kind: te, length: 0.005 } : { kind: te },
        },
      });
    expect(named(flat('bevelled', 'square'))).toEqual([
      'a bevelled leading edge with a square trailing edge',
    ]);
    expect(named(flat('bevelled', 'rounded'))).toEqual([
      'a bevelled leading edge with a rounded trailing edge',
    ]);
    expect(named(flat('rounded', 'bevelled'))).toEqual([
      'a rounded leading edge with a bevelled trailing edge',
    ]);
    expect(named(flat('rounded', 'square'))).toEqual([
      'flat fins with rounded leading and square trailing edges',
    ]);
    // With the logic's flat plates: the plate, its thickness absolute, in calibres, on any taper.
    const plate = designForm(
      withFins({
        ...flat('rounded', 'square').finSets[0]!,
        planform: {
          kind: 'trapezoidal',
          rootChord: 0.03,
          tipChord: 0.015,
          span: 0.03,
          sweepLength: 0.015,
        },
      }),
      2,
      { without: false, flatPlates: true },
    );
    expect(formFor(plate).section).toEqual({
      kind: 'flat-plate',
      thickness: 0.08,
      leadingEdge: 'rounded',
      trailingEdge: 'square',
    });
  });
});

describe(
  'parts bowshock does not model: computed without them only when chosen',
  { timeout: 60_000 },
  () => {
    const b = basic();
    const lugged: RocketDesign = {
      ...withFins({ filletRadius: 0.002, cant: 1 }),
      otherParts: [
        { kind: 'launch-lug', name: 'Launch lug', count: 1 },
        { kind: 'rail-button', name: 'Rail button', count: 2 },
      ],
    };

    it('asks first, naming each part', () => {
      expect(excludableParts(b)).toEqual([]);
      const asked = designForm(lugged, 2, NO);
      expect(asked).toEqual({
        kind: 'choose',
        excludable: [
          { part: 'the launch lug' },
          { part: 'the 2 rail buttons' },
          { part: 'the fin fillets' },
          { part: "the fins' cant" },
        ],
      });
    });

    it('once chosen: the form, and the parts left out for every label', () => {
      const result = designForm(lugged, 2, { without: true });
      expect(result.kind).toBe('form');
      if (result.kind !== 'form') return;
      expect(result.form).toEqual(formFor(designForm(b, 2, NO)));
      expect(withoutText(result.without)).toBe(
        "without the launch lug, the 2 rail buttons, the fin fillets and the fins' cant",
      );
      expect(withoutText([])).toBe('');
      expect(withoutText(['the launch lug'])).toBe('without the launch lug');
    });

    it('a feature not modelled wins over the choice, and the parts are still listed', () => {
      const result = designForm({ ...lugged, finSets: [] }, 2, { without: true });
      expect(result.kind).toBe('not-modelled');
      if (result.kind === 'not-modelled') expect(result.excludable.length).toBe(2);
    });
  },
);

describe('the presets', { timeout: 60_000 }, () => {
  it('the 54 mm example is served by the logic from Mach 1.8, refused below with reasons', () => {
    const design = preset('example-54').design;
    for (const mach of [1.8, 2, 2.4]) {
      expect(totalDragView(formFor(designForm(design, mach, NO)), { kind: 'pending' }).kind).toBe(
        'pending',
      );
    }
    for (const mach of [1, 1.2, 1.4, 1.6]) {
      expect(totalDragView(formFor(designForm(design, mach, NO)), { kind: 'pending' }).kind).toBe(
        'refused',
      );
    }
  });

  it('the 98 mm example asks about its rail buttons, and has no number today', () => {
    const design = preset('example-98').design;
    const result = designForm(design, 1.6, NO);
    expect(result.kind).toBe('not-modelled');
    if (result.kind === 'not-modelled')
      expect(result.excludable).toEqual([{ part: 'the 2 rail buttons' }]);
  });

  it('every preset is labelled, and the examples say they are examples', () => {
    for (const p of PRESETS) {
      expect(p.design.source).toEqual({ kind: 'preset', id: p.id });
      if (p.example) expect(p.detail).toMatch(/not a real rocket/);
    }
  });
});
