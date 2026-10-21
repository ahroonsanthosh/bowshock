/**
 * The 3D view's rocket from the page's one geometry
 * (src/rocket/scene-rocket.ts): for every preset it is the rocket the
 * drag logic is given (the body solved, and the fins as configurationOf
 * reads them), with the design's roll; for what the 3D view cannot draw,
 * it says so.
 */

import { describe, expect, it } from 'vitest';
import { designForm } from '../../src/rocket/adapter';
import type { RocketDesign } from '../../src/rocket/design';
import { PRESETS, preset } from '../../src/rocket/presets';
import { sceneRocketOf } from '../../src/rocket/scene-rocket';
import { rocketFromForm } from '../../src/render3d/presets';

const formOf = (design: RocketDesign) => {
  const asked = designForm(design, 2, { without: true });
  if (asked.kind !== 'form') throw new Error(`no form: ${asked.kind}`);
  return asked.form;
};

describe("the 3D view's rocket", () => {
  for (const p of PRESETS) {
    it(`is the logic's own rocket for ${p.label}: its body, planform, section and place`, () => {
      const form = formOf(p.design);
      const { rocket, missing } = sceneRocketOf(p.design);
      expect(missing).toEqual([]);
      const logic = rocketFromForm(form);
      expect(rocket?.body).toEqual(form.body);
      const fins = rocket?.fins;
      const expected = logic.fins!;
      expect(fins?.count).toBe(expected.count);
      expect(fins?.section).toEqual(expected.section);
      for (const key of ['rootChord', 'span', 'tanLeadingEdge', 'tanTrailingEdge'] as const) {
        expect(fins?.planform[key]).toBeCloseTo(expected.planform[key], 12);
      }
      expect(fins?.trailingEdgeAheadOfBase).toBeCloseTo(expected.trailingEdgeAheadOfBase, 12);
      expect(fins?.roll).toBe(0);
    });
  }

  it("rolls the first fin as the design's rotation", () => {
    const b = preset('basic-finner').design;
    const design = { ...b, finSets: [{ ...b.finSets[0]!, rotation: 45 }] };
    expect(sceneRocketOf(design).rocket?.fins?.roll).toBeCloseTo(Math.PI / 4, 15);
  });

  it('draws bevelled plates at their own size, which the logic takes only untapered', () => {
    const b = preset('example-98').design;
    const set = b.finSets[0]!;
    const design: RocketDesign = {
      ...b,
      finSets: [
        {
          ...set,
          section: {
            kind: 'flat',
            leadingEdge: { kind: 'bevelled', length: 0.02 },
            trailingEdge: { kind: 'square' },
          },
        },
      ],
    };
    const d = b.nose.diameter;
    expect(sceneRocketOf(design).rocket?.fins?.section).toEqual({
      kind: 'flat-plate',
      thickness: set.thickness / d,
      leadingEdge: { bevel: 0.02 / d },
      trailingEdge: 'square',
    });
  });

  it('names what it does not draw: elliptical fins, airfoils, a second set, a boat-tail', () => {
    const b = preset('example-54').design;
    const set = b.finSets[0]!;
    const elliptical: RocketDesign = {
      ...b,
      finSets: [{ ...set, planform: { kind: 'elliptical', rootChord: 0.1, span: 0.05 } }],
    };
    expect(sceneRocketOf(elliptical).missing).toEqual(['the elliptical fins']);
    expect(sceneRocketOf(elliptical).rocket?.fins).toBeUndefined();
    const airfoil: RocketDesign = { ...b, finSets: [{ ...set, section: { kind: 'airfoil' } }] };
    expect(sceneRocketOf(airfoil).missing).toEqual(['the airfoil fins']);
    const two: RocketDesign = { ...b, finSets: [set, set] };
    expect(sceneRocketOf(two).missing).toEqual(['the fin sets after the first']);
    expect(sceneRocketOf(two).rocket?.fins).toBeDefined();
    const boatTail: RocketDesign = {
      ...b,
      body: [
        ...b.body,
        {
          kind: 'transition',
          length: 0.04,
          foreDiameter: 0.054,
          aftDiameter: 0.04,
          shape: { kind: 'conical' },
        },
      ],
    };
    expect(sceneRocketOf(boatTail).rocket).toBeNull();
    expect(sceneRocketOf(boatTail).missing).toHaveLength(1);
  });
});
