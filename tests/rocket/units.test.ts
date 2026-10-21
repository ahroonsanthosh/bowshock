/** Lengths in millimetres or inches, with calibres beside them (src/rocket/units.ts). */

import { describe, expect, it } from 'vitest';
import {
  calibresText,
  fromMetres,
  lengthText,
  scaleBarLength,
  toMetres,
} from '../../src/rocket/units';
import { preset } from '../../src/rocket/presets';

describe('lengths', () => {
  it('the inch is 25.4 mm exactly', () => {
    expect(toMetres(1, 'in')).toBe(0.0254);
    expect(fromMetres(0.0254, 'mm')).toBeCloseTo(25.4, 12);
    expect(toMetres(30, 'mm')).toBe(0.03);
  });

  it("a preset's lengths are shown as used, and read back to the same metres", () => {
    const d = preset('basic-finner').design;
    expect(lengthText(d.nose.length, 'mm')).toBe('85.06923');
    expect(toMetres(Number(lengthText(d.nose.length, 'mm')), 'mm')).toBeCloseTo(d.nose.length, 15);
    expect(lengthText(d.nose.diameter, 'mm')).toBe('30');
    expect(lengthText(d.nose.diameter, 'in')).toBe('1.181102');
    expect(lengthText(Number.NaN, 'mm')).toBe('');
  });

  it('calibres beside each length: over the diameter, three decimals', () => {
    const d = preset('basic-finner').design;
    expect(calibresText(d.nose.length, d.nose.diameter)).toBe('2.836 cal');
    expect(calibresText(d.body[0]!.length, d.nose.diameter)).toBe('7.164 cal');
    expect(calibresText(0.03, 0)).toBe('');
  });

  it('a scale bar of 1, 2 or 5 times a power of ten', () => {
    expect(scaleBarLength(73)).toBe(50);
    expect(scaleBarLength(19.9)).toBe(10);
    expect(scaleBarLength(2)).toBe(2);
    expect(scaleBarLength(0.4)).toBeCloseTo(0.2, 15);
    expect(scaleBarLength(0)).toBe(0);
  });
});
