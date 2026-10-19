/**
 * The 3D to strip-theory ratio on ten planforms at five Mach numbers: the
 * source sheet at its default resolution against the area rule
 * (./support/area-rule.ts), and the statements of `stripTheoryRatio`'s
 * docstring, each re-measured here. The table is in
 * docs/design/0009-fin-wave-drag.md, section 4.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { finWaveDrag, stripTheoryRatio } from '../../src/fins/fin-wave-drag';
import { linearWaveDrag } from '../../src/fins/linear-wave-drag';
import { leadingEdgeMachParameter } from '../../src/fins/planform';
import { FinRefusal } from '../../src/fins/refusal';
import { doubleWedge, hexagonal } from '../../src/fins/section';
import { exactSectionDrag } from '../../src/fins/section-drag';
import { areaRuleWaveDrag } from './support/area-rule';
import { FINS, MACHS } from './support/cases';

interface Row {
  readonly name: string;
  readonly mach: number;
  /** beta cot(LE sweep). */
  readonly b: number;
  readonly spanOverRoot: number;
  readonly ratio: number;
  readonly quadratureError: number;
  readonly areaRule: number;
}

let table: Row[] = [];

beforeAll(() => {
  table = FINS.flatMap((fin) =>
    MACHS.map((mach) => {
      const r = linearWaveDrag(fin.planform, fin.section, mach);
      return {
        name: fin.name,
        mach,
        b: leadingEdgeMachParameter(fin.planform, mach),
        spanOverRoot: fin.planform.span / fin.planform.rootChord,
        ratio: r.ratio,
        quadratureError: r.quadratureError,
        areaRule: areaRuleWaveDrag(fin.planform, fin.section, mach, 4).ratio,
      };
    }),
  );
}, 600_000);

const range = (rows: readonly Row[]): [number, number] => [
  Math.min(...rows.map((r) => r.ratio)),
  Math.max(...rows.map((r) => r.ratio)),
];

describe('the strip-theory table', () => {
  it('the source sheet agrees with the area rule within 5e-6, inside its own error estimate', () => {
    expect(table).toHaveLength(50);
    let worst = 0;
    for (const r of table) {
      worst = Math.max(worst, Math.abs(r.ratio / r.areaRule - 1));
      expect(Math.abs(r.ratio - r.areaRule)).toBeLessThanOrEqual(r.quadratureError);
    }
    // Measured: 3.4e-6 (the RM A53D02 planform at Mach 1.5).
    expect(worst).toBeLessThan(5e-6);
  });

  it('beta cot(LE) above 2, span at least half the root chord: within 6%', () => {
    const rows = table.filter((r) => r.b > 2 && r.spanOverRoot >= 0.5);
    expect(rows).toHaveLength(25);
    const [lo, hi] = range(rows);
    // Measured: 1.0000 (the unit rectangle) to 1.0589 (hexagonal section, Mach 1.5).
    expect(lo).toBeGreaterThan(0.9999);
    expect(hi).toBeLessThan(1.06);
    expect(hi).toBeGreaterThan(1.058);
  });

  it('beta cot(LE) between 1 and 2: up to 20%, always above strip theory', () => {
    const rows = table.filter((r) => r.b > 1 && r.b <= 2);
    expect(rows).toHaveLength(11);
    const [lo, hi] = range(rows);
    // Measured: 1.0245 (ARCAS, Mach 1.2) to 1.1962 (swept trailing edge, Mach 1.5).
    expect(lo).toBeGreaterThan(1.02);
    expect(hi).toBeLessThan(1.2);
    expect(hi).toBeGreaterThan(1.19);
  });

  it('subsonic leading edges: the 3D drag from 58% below strip theory to 10% above', () => {
    const rows = table.filter((r) => r.b <= 1);
    expect(rows).toHaveLength(9);
    const [lo, hi] = range(rows);
    // Measured: 0.4205 (RM A53D02 planform, Mach 1.2: strip theory gives
    // 2.38 times the 3D drag) to 1.1014 (36.9 deg clipped delta, Mach 1.2).
    expect(lo).toBeCloseTo(0.4205, 4);
    expect(1 / lo).toBeCloseTo(2.378, 3);
    expect(hi).toBeCloseTo(1.1014, 4);
  });

  it('short spans: the rectangle of span 0.2 chords; the unit rectangle is exactly 2D', () => {
    const short = table.filter((r) => r.name === 'R02').map((r) => r.ratio);
    // Measured: 0.6538, 0.8647, 0.9808, 0.9995, 1.0000.
    expect(short[0]).toBeCloseTo(0.6538, 4);
    expect(short[1]).toBeCloseTo(0.8647, 4);
    expect(short[2]).toBeCloseTo(0.9808, 4);
    for (const r of table.filter((row) => row.name === 'D')) {
      expect(Math.abs(r.ratio - 1)).toBeLessThan(1e-7);
    }
  });
});

describe('fin wave drag: section drag times the ratio', () => {
  it('composes the exact section drag and the ratio, with the ratio quadrature error', () => {
    const arcas = FINS.find((f) => f.name === 'A')!;
    const section = doubleWedge(0.15 / 3.38, 0.536);
    for (const mach of [1.5, 2.96]) {
      const f = finWaveDrag(arcas.planform, section, mach);
      const exact = exactSectionDrag(section, mach);
      const ratio = stripTheoryRatio(arcas.planform, section, mach);
      expect(f.sectionCd).toBe(exact.cd);
      expect(f.ratio).toBe(ratio.ratio);
      expect(f.cd).toBe(exact.cd * ratio.ratio);
      expect(f.quadratureError).toBe(exact.cd * ratio.quadratureError);
      expect(f.exactSection).toBe(true);
    }
  });

  it('refuses what the section method refuses, and labels reflections when asked', () => {
    const fin = FINS.find((f) => f.name === 'C')!;
    expect(() => finWaveDrag(fin.planform, hexagonal(0.02, 0.05), 2)).toThrow(FinRefusal);
    const f = finWaveDrag(fin.planform, hexagonal(0.02, 0.05), 2, { neglectReflectedWaves: true });
    expect(f.exactSection).toBe(false);
    expect(() => finWaveDrag(fin.planform, doubleWedge(0.08), 1.2)).toThrow(/detachment/);
  });
});
