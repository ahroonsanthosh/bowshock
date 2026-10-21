/**
 * The builder in a real page (src/ui/builder.ts; runs with the GPU tests,
 * in Chromium, for its DOM; no GPU is used): a preset's lengths are shown
 * to 0.01 mm with their exact calibres beside them, and solved exactly as
 * the preset holds them until a field is edited; an edited field is solved
 * as typed.
 */

import { describe, expect, it } from 'vitest';
import { designForm } from '../../src/rocket/adapter';
import { preset } from '../../src/rocket/presets';
import { toMetres } from '../../src/rocket/units';
import { Builder } from '../../src/ui/builder';
import { basicFinnerBodyAsTyped } from '../../src/validation/basic-finner';

function mount() {
  const changes: unknown[] = [];
  const builder = new Builder(preset('basic-finner').design, 'mm', {
    onChange: (d) => changes.push(d),
    onUnit: () => {},
  });
  document.body.replaceChildren(builder.element);
  const input = (id: string) => document.querySelector<HTMLInputElement>(`#b-${id}`)!;
  const cal = (id: string) =>
    document.querySelector<HTMLOutputElement>(`#b-${id}-cal`)!.textContent;
  return { builder, input, cal, changes };
}

const formOf = (b: Builder) => {
  const f = designForm(b.design, 2, { without: false });
  if (f.kind !== 'form') throw new Error('no form');
  return f.form;
};

describe('the builder', () => {
  it("shows a preset's lengths to 0.01 mm, its calibres exact, and solves the exact body", () => {
    const { builder, input, cal } = mount();
    expect(input('nose-length').value).toBe('85.07');
    expect(input('tube-length').value).toBe('214.93');
    expect(cal('nose-length')).toBe('= 2.835641 cal');
    expect(cal('tube-length')).toBe('= 7.164359 cal');
    // Untouched, the preset is solved as it holds it, to the last bit.
    expect(formOf(builder).body).toEqual(basicFinnerBodyAsTyped());
  });

  it('an edited field is solved as typed; the others keep their exact values', () => {
    const { builder, input, cal, changes } = mount();
    const nose = input('nose-length');
    nose.value = '85.07';
    nose.dispatchEvent(new Event('input'));
    expect(changes.length).toBe(1);
    expect(builder.design.nose.length).toBe(toMetres(85.07, 'mm'));
    // 85.07 mm in metres, to the last bit of the binary arithmetic.
    expect(builder.design.nose.length).toBeCloseTo(0.08507, 16);
    expect(formOf(builder).body.nose.length).toBe(toMetres(85.07, 'mm') / 0.03);
    expect(cal('nose-length')).toBe(`= ${String(Number((85.07 / 30).toFixed(6)))} cal`);
    // The tube, not edited, is still the preset's.
    expect(formOf(builder).body.cylinderLength).toBe(basicFinnerBodyAsTyped().cylinderLength);
  });

  it('a field that is not a positive length is marked, and the logic refuses it', () => {
    const { builder, input } = mount();
    const span = input('span');
    span.value = '';
    span.dispatchEvent(new Event('input'));
    expect(span.getAttribute('aria-invalid')).toBe('true');
    expect(Number.isNaN(formOf(builder).span)).toBe(true);
  });
});
