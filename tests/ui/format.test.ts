import { describe, expect, it } from 'vitest';
import {
  formatCount,
  formatDegrees,
  formatDuration,
  formatExponent,
  formatFixed,
  formatGrid,
  formatRate,
  formatScaleValue,
  formatSignedPercent,
} from '../../src/ui/format';

const THIN = ' ';
const MINUS = '−';

describe('numbers as the interface shows them', () => {
  it('groups the digits of counts in threes, from five digits', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(950)).toBe('950');
    expect(formatCount(4120)).toBe('4120');
    expect(formatCount(41200)).toBe(`41${THIN}200`);
    expect(formatCount(1234567)).toBe(`1${THIN}234${THIN}567`);
    expect(formatCount(-41200)).toBe(`${MINUS}41${THIN}200`);
  });

  it('writes fixed decimals and exponents with the minus sign', () => {
    expect(formatFixed(1.86391, 4)).toBe('1.8639');
    expect(formatFixed(-0.25, 2)).toBe(`${MINUS}0.25`);
    expect(formatExponent(3.14e-10, 1)).toBe('3.1e-10');
    expect(formatExponent(6.2e5, 1)).toBe('6.2e5');
    expect(formatExponent(-2.5e-3, 2)).toBe(`${MINUS}2.50e-3`);
    expect(formatExponent(0)).toBe('0');
  });

  it('keeps the digits of toFixed and toExponential, so a value reads the same', () => {
    for (const x of [1.23456789, 0.000123456, 98765.4321, 1.5, 2.5e-7]) {
      expect(formatFixed(x, 4)).toBe(x.toFixed(4));
      expect(formatExponent(x, 2)).toBe(x.toExponential(2).replace('e+', 'e'));
    }
  });

  it('signs percentages, with no sign on zero', () => {
    expect(formatSignedPercent(0.0012)).toBe('+0.12%');
    expect(formatSignedPercent(-0.0909, 2)).toBe(`${MINUS}9.09%`);
    expect(formatSignedPercent(-0.00001)).toBe('0.00%');
    expect(formatSignedPercent(0)).toBe('0.00%');
  });

  it('gives rates an SI prefix and three significant digits', () => {
    expect(formatRate(2.12e8, 'cell')).toBe('212 Mcell/s');
    expect(formatRate(4.567e7, 'cell')).toBe('45.7 Mcell/s');
    expect(formatRate(3.21e9, 'cell')).toBe('3.21 Gcell/s');
    expect(formatRate(512, 'step')).toBe('512 step/s');
    expect(formatRate(0, 'cell')).toBe('0 cell/s');
  });

  it('writes a scale end to three significant digits, in exponent form when very small or large', () => {
    expect(formatScaleValue(1.23456)).toBe('1.23');
    expect(formatScaleValue(-0.31)).toBe(`${MINUS}0.310`);
    expect(formatScaleValue(0)).toBe('0');
    expect(formatScaleValue(2.5e-5)).toBe('2.50e-5');
    expect(formatScaleValue(123456)).toBe('1.23e5');
  });

  it('writes grids, angles and durations', () => {
    expect(formatGrid(640, 80)).toBe('640×80');
    expect(formatDegrees(10, true)).toBe('+10°');
    expect(formatDegrees(0, true)).toBe('0°');
    expect(formatDegrees(-12, true)).toBe(`${MINUS}12°`);
    expect(formatDuration(0.84)).toBe('0.8 s');
    expect(formatDuration(42.4)).toBe('42 s');
    expect(formatDuration(59.7)).toBe('1 min 00 s');
    expect(formatDuration(185)).toBe('3 min 05 s');
  });
});
