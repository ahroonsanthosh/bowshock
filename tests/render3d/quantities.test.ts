import { describe, expect, it } from 'vitest';
import { fieldFromCells } from '../../src/render3d/field';
import {
  AIR_GAS_CONSTANT,
  DENSITY_PALETTE,
  PRESSURE_PALETTE,
  QUANTITIES,
  TEMPERATURE_PALETTE,
  quantityRange,
  quantityScale,
} from '../../src/render3d/quantities';
import { spectrum, spectrumTable } from '../../src/render3d/spectrum';
import { gridFromFunction } from '../../src/grid/structured';

const gamma = 1.4;
const free = { rho: 1, u: 2 * Math.sqrt(gamma), v: 0, p: 1 };
const grid = gridFromFunction(2, 1, (i, j) => [i, 1 + j]);
/** Two cells: the free stream, and a compressed, slowed cell. */
const field = fieldFromCells(
  grid,
  (i) => (i === 0 ? free : { rho: 1.5, u: 2, v: 0.3, p: 1.8 }),
  gamma,
  free,
);

describe('the quantities coloured', () => {
  it('give the free stream its own values', () => {
    const T = 288.15;
    const a = Math.sqrt(gamma * AIR_GAS_CONSTANT * T);
    const want = { mach: 2, speed: 2 * a, density: 1, temperature: T, cp: 0 };
    for (const q of QUANTITIES) {
      const s = quantityScale(field, q, { freeStreamTemperature: T });
      expect(s.cellValue(0)).toBeCloseTo(want[q], 9);
      expect(s.freeValue).toBeCloseTo(want[q], 9);
    }
  });

  it('are ratios to the free stream without its temperature', () => {
    expect(quantityScale(field, 'speed').cellValue(1)).toBeCloseTo(Math.hypot(2, 0.3) / free.u, 12);
    expect(quantityScale(field, 'temperature').cellValue(1)).toBeCloseTo(1.8 / 1.5, 12);
    expect(quantityScale(field, 'speed').unit).toBe('V/V∞');
  });

  it('give the cell’s pressure coefficient and Mach number', () => {
    expect(quantityScale(field, 'cp').cellValue(1)).toBeCloseTo(
      (1.8 - 1) / (0.5 * free.u * free.u),
      12,
    );
    expect(quantityScale(field, 'mach').cellValue(1)).toBeCloseTo(
      Math.hypot(2, 0.3) / Math.sqrt((gamma * 1.8) / 1.5),
      12,
    );
  });

  it('range over the cells and the free stream; the pressure coefficient symmetric about 0', () => {
    const r = quantityRange(field, quantityScale(field, 'cp'));
    expect(r.min).toBeCloseTo(-r.max, 12);
    const m = quantityRange(field, quantityScale(field, 'mach'));
    expect(m.max).toBeCloseTo(2, 12);
  });

  it('range over the bulk of the flow by volume: a tiny cell of extreme value is beyond the range, and reported', () => {
    // 40 cells of equal size at Mach about 2, one cell a thousandth of the
    // volume at Mach 0.1 (a stagnation point).
    // Node 0 at x = -0.001, the others at 0.001, 1.001, 2.001, ...
    const g = gridFromFunction(41, 1, (i, j) => [i === 0 ? -0.001 : i - 0.999, 1 + j]);
    const f = fieldFromCells(
      g,
      (i) =>
        i === 0
          ? { rho: 1.5, u: 0.1 * Math.sqrt(gamma), v: 0, p: 1 }
          : { rho: 1, u: (1.9 + 0.005 * i) * Math.sqrt(gamma), v: 0, p: 1 },
      gamma,
      free,
    );
    const r = quantityRange(f, quantityScale(f, 'mach'));
    expect(r.cellMin).toBeLessThan(0.2);
    expect(r.min).toBeGreaterThan(1.85);
    expect(r.cellMax).toBeCloseTo(1.9 + 0.005 * 40, 9);
    expect(r.max).toBeCloseTo(r.cellMax, 9);
  });

  it('palettes: the spectrum runs blue to magenta, fully saturated; every palette in range', () => {
    expect(spectrum(0)[2]).toBeGreaterThan(0.9);
    expect(Math.max(spectrum(0)[0], spectrum(0)[1])).toBeLessThan(0.2);
    spectrum(1).forEach((c, k) => {
      expect(c).toBeCloseTo([1, 31 / 255, 210 / 255][k]!, 12);
    });
    const table = spectrumTable(64);
    for (let k = 0; k < 64; k++) {
      const rgb = [table[4 * k]!, table[4 * k + 1]!, table[4 * k + 2]!];
      // Saturated: the strongest channel near 1, the weakest well below.
      expect(Math.max(...rgb)).toBeGreaterThan(0.75);
      expect(Math.min(...rgb)).toBeLessThan(0.45);
    }
    for (const p of [DENSITY_PALETTE, TEMPERATURE_PALETTE, PRESSURE_PALETTE]) {
      for (let k = 0; k <= 20; k++) {
        for (const c of p(k / 20)) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
