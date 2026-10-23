/**
 * The builder's edits without the DOM (src/ui/builder-edits.ts): a field
 * that is not a valid value is never put into the rocket, so clearing a
 * length and typing it again leaves the fins where they were (the
 * interface review's item 2); an edited preset is renamed on its first
 * edit (item 3).
 */

import { describe, expect, it } from 'vitest';
import { designForm } from '../../src/rocket/adapter';
import { baseStation } from '../../src/rocket/design';
import { preset } from '../../src/rocket/presets';
import {
  edited,
  finsAhead,
  typedFinite,
  typedLength,
  typedNumber,
  withBodyLengths,
} from '../../src/ui/builder-edits';

describe('typed values', () => {
  it('a length: positive (or zero where allowed) and finite, else none', () => {
    expect(typedLength('80', 'mm', false)).toBe(0.08);
    expect(typedLength(' 2.5 ', 'in', false)).toBeCloseTo(0.0635, 15);
    for (const text of ['', '  ', 'abc', '-1', '0', 'Infinity', 'NaN']) {
      expect(typedLength(text, 'mm', false), JSON.stringify(text)).toBeNull();
    }
    expect(typedLength('0', 'mm', true)).toBe(0);
    expect(typedLength('-0.1', 'mm', true)).toBeNull();
  });

  it('a number of at least its minimum, and a finite altitude', () => {
    expect(typedNumber('4', 1)).toBe(4);
    expect(typedNumber('0', 1)).toBeNull();
    expect(typedNumber('', 0)).toBeNull();
    expect(typedFinite('-300')).toBe(-300);
    expect(typedFinite('')).toBeNull();
  });
});

describe('clearing a length and typing it again', () => {
  it('leaves the fins the same distance ahead of the base, every number finite', () => {
    for (const id of ['basic-finner', 'example-54', 'example-98']) {
      let design = preset(id).design;
      const ahead = finsAhead(design);
      // The user clears "Nose length": nothing reads, nothing is committed.
      expect(typedLength('', 'mm', false)).toBeNull();
      // Then types 80.
      const m = typedLength('80', 'mm', false)!;
      design = edited(design, withBodyLengths(design, { nose: m }));
      expect(design.nose.length).toBe(0.08);
      expect(finsAhead(design)).toBeCloseTo(ahead, 12);
      const f = design.finSets[0]!;
      expect(Number.isFinite(f.rootLeadingEdge)).toBe(true);
      // The tube too: cleared, then typed again.
      expect(typedLength('', 'mm', false)).toBeNull();
      design = edited(design, withBodyLengths(design, { tube: 0.3 }));
      expect(finsAhead(design)).toBeCloseTo(ahead, 12);
      expect(baseStation(design)).toBeCloseTo(0.38, 12);
      // The logic is given the fins where they were, in calibres.
      const form = designForm(design, 2, { without: true });
      if (form.kind !== 'form') throw new Error(form.kind);
      expect(form.form.trailingEdgeAheadOfBase).toBeCloseTo(ahead / design.nose.diameter, 9);
    }
  });
});

describe('the name of an edited rocket', () => {
  it('a preset is renamed on its first edit, and only once', () => {
    const d = preset('basic-finner').design;
    const once = edited(d, withBodyLengths(d, { nose: 0.08 }));
    expect(once.name).toBe('Basic Finner (edited)');
    expect(once.source).toEqual({ kind: 'typed' });
    const twice = edited(once, withBodyLengths(once, { nose: 0.09 }));
    expect(twice.name).toBe('Basic Finner (edited)');
  });
});
