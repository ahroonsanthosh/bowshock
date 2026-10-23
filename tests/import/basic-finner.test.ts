/**
 * The Basic Finner built in OpenRocket's terms (fixtures/basic-finner.ork)
 * reads back as the drag model's Basic Finner (src/validation/basic-finner.ts,
 * the drag page's basicFinnerForm) within 1e-9 of a calibre, in every
 * dimension OpenRocket can express. Its fins' section is the one thing
 * OpenRocket cannot express (a single wedge with a rounded leading edge;
 * OpenRocket's sections are square, rounded and airfoil plates of uniform
 * thickness), and the test says so rather than compare it.
 */

import { describe, expect, it } from 'vitest';
import { basicFinnerForm } from '../../src/app/total-drag';
import { importOrk } from '../../src/import/index';
import { baseStation } from '../../src/rocket/design';
import { BASIC_FINNER_GEOMETRY, basicFinnerBody } from '../../src/validation/basic-finner';
import { fixture } from './build';

const CALIBRE = BASIC_FINNER_GEOMETRY.caliberMetres;
const TOLERANCE = 1e-9;

describe('the Basic Finner in OpenRocket terms', async () => {
  const { mapping } = await importOrk(fixture('basic-finner.ork'), {
    fileName: 'basic-finner.ork',
  });
  const design = mapping.design!;
  const body = basicFinnerBody();
  const form = basicFinnerForm();

  it('gives a design', () => {
    expect(design).not.toBeNull();
    expect(design.name).toBe('Basic Finner');
  });

  it('the body: the 20 deg cone and the cylinder to a flat base, in calibres', () => {
    expect(design.nose.shape).toEqual(body.nose.shape);
    expect(Math.abs(design.nose.length / CALIBRE - body.nose.length)).toBeLessThan(TOLERANCE);
    expect(Math.abs(design.nose.diameter / 2 / CALIBRE - body.nose.baseRadius)).toBeLessThan(
      TOLERANCE,
    );
    expect(design.body).toHaveLength(1);
    const cylinder = design.body[0]!;
    if (cylinder.kind !== 'tube') throw new Error('not a tube');
    expect(Math.abs(cylinder.length / CALIBRE - body.cylinderLength)).toBeLessThan(TOLERANCE);
    expect(Math.abs(cylinder.diameter / CALIBRE - 1)).toBeLessThan(TOLERANCE);
    expect(Math.abs(baseStation(design) / CALIBRE - BASIC_FINNER_GEOMETRY.length)).toBeLessThan(
      TOLERANCE,
    );
  });

  it('the fins: four rectangular fins of one calibre chord and span, their trailing edges at the base', () => {
    expect(design.finSets).toHaveLength(1);
    const fins = design.finSets[0]!;
    expect(fins.count).toBe(form.finCount);
    expect(form.planform).toEqual({ kind: 'rectangular' });
    const p = fins.planform;
    if (p.kind !== 'trapezoidal') throw new Error('not trapezoidal');
    expect(Math.abs(p.rootChord / CALIBRE - form.rootChord)).toBeLessThan(TOLERANCE);
    expect(Math.abs(p.tipChord / CALIBRE - form.rootChord)).toBeLessThan(TOLERANCE);
    expect(Math.abs(p.span / CALIBRE - form.span)).toBeLessThan(TOLERANCE);
    expect(p.sweepLength).toBe(0);
    const trailingEdgeAheadOfBase =
      (baseStation(design) - fins.rootLeadingEdge - p.rootChord) / CALIBRE;
    expect(Math.abs(trailingEdgeAheadOfBase - form.trailingEdgeAheadOfBase)).toBeLessThan(
      TOLERANCE,
    );
    expect(fins.cant).toBe(0);
    expect(fins.filletRadius).toBe(0);
  });

  it("the fins' section cannot be written in OpenRocket's terms: the file's square plate is not the Basic Finner's wedge", () => {
    const fins = design.finSets[0]!;
    // What the fixture holds: a square-edged plate of the wedge's trailing-edge thickness.
    expect(fins.section).toEqual({
      kind: 'flat',
      leadingEdge: { kind: 'square' },
      trailingEdge: { kind: 'square' },
    });
    expect(
      Math.abs(fins.thickness / CALIBRE - BASIC_FINNER_GEOMETRY.finTrailingEdgeThickness),
    ).toBeLessThan(TOLERANCE);
    // What the drag model's Basic Finner has: a single wedge from a 0.004 calibre leading-edge radius.
    expect(form.section).toEqual({ kind: 'single-wedge', trailingEdgeThickness: 0.08 });
    expect(form.leadingEdgeRadius).toBe(0.004);
  });
});
