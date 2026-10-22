/**
 * The guard on the fins' own-drag band below Mach 1.5
 * (0014 section 10.7, amendment f; src/total/finned-body.ts,
 * `FINS_OWN_DRAG_MACH_RANGE`): the band's Mach range and the shortfall it quotes
 * held to the ARCAS check's recorded output, and the refusals it adds (fin
 * friction, the wave drag of sharp sections) against what stays served (a flat
 * plate's faces, of no wave drag by the geometry; everything at Mach 1.5 and above).
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clippedDeltaPlanform, trapezoidalPlanform } from '../../src/fins/planform';
import {
  doubleWedge,
  flatPlate,
  singleWedge,
  type FlatPlate,
  type SymmetricSection,
} from '../../src/fins/section';
import {
  FINS_OWN_DRAG_BAND,
  FINS_OWN_DRAG_MACH_RANGE,
  finnedBodyComponents,
  type FinnedBody,
} from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';

/** The ARCAS increments (0008 section 4.3) as `arcas_fin_check_v2.py` printed them. */
function arcasRows(): {
  config: number;
  mach: number;
  own: number;
  measured: number;
  ownOverMeasured: number;
}[] {
  const text = readFileSync(
    new URL('../../docs/research/total-drag/data/arcas_fin_check_v2_output.txt', import.meta.url),
    'utf8',
  );
  return text
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter((f) => /^[12]$/.test(f[0] ?? '') && f.length > 6)
    .map((f) => ({
      config: Number(f[0]),
      mach: Number(f[1]),
      own: Number(f[2]),
      measured: Number(f[3]),
      ownOverMeasured: Number(f[5]),
    }));
}

const half = Math.atan(0.5 / 3);
const planform = clippedDeltaPlanform({ rootChord: 1.5, span: 1, taperRatio: 0.4 });
const config = (section: SymmetricSection | FlatPlate): FinnedBody => ({
  body: { nose: { shape: { kind: 'conical' }, length: 3, baseRadius: 0.5 }, cylinderLength: 9 },
  afterbody: 'cylinder',
  fins: {
    count: 3,
    planform,
    section,
    sectionFamily: 'other',
    leadingEdgeRadius: 0,
    trailingEdgeAheadOfBase: 2,
  },
});
const parts = (c: FinnedBody, mach: number) =>
  finnedBodyComponents(
    c,
    { mach, temperature: 250, reynoldsPerLength: 2e6 },
    exactConeNoseWaveDrag(mach, half),
  );
const refusalOf = (r: ReturnType<typeof parts>, component: string) =>
  r.refusals.find((x) => x.component === component);

describe("the fins' own-drag band's Mach range, against the ARCAS check", () => {
  const rows = arcasRows();

  it('reads all seven increments', () => {
    expect(rows.length).toBe(7);
  });

  it('spans Mach 1.5 to 2.96, the guard constant', () => {
    expect(Math.min(...rows.map((r) => r.mach))).toBe(FINS_OWN_DRAG_MACH_RANGE[0]);
    expect(Math.max(...rows.map((r) => r.mach))).toBe(FINS_OWN_DRAG_MACH_RANGE[1]);
  });

  it("the shortfall grows as the Mach number falls (configuration 1), and the message's 0.49 and 0.85", () => {
    const one = rows.filter((r) => r.config === 1).sort((a, b) => a.mach - b.mach);
    const shortfall = one.map((r) => r.measured - r.own);
    for (let i = 1; i < shortfall.length; i++)
      expect(shortfall[i]!).toBeLessThan(shortfall[i - 1]!);
    expect(one[0]!.ownOverMeasured.toFixed(2)).toBe('0.49');
    const top = rows.filter((r) => r.mach === 2.96).map((r) => r.ownOverMeasured);
    expect(Math.max(...top).toFixed(2)).toBe('0.85');
  });
});

describe('below Mach 1.5', () => {
  it('fin friction is refused, with the reason and the Mach number on the right side of 1.5', () => {
    for (const mach of [1.05, 1.2, 1.4999999]) {
      const r = parts(config(flatPlate(0.05, 'rounded', 'square')), mach);
      const f = refusalOf(r, 'fin friction');
      expect(f?.reason).toBe('fins-own-drag-mach');
      expect(f?.message).toContain(
        `the Mach number ${mach === 1.4999999 ? '1.4999999' : mach.toPrecision(3)} is below 1.5`,
      );
      expect(f?.message).toContain('ARCAS increments at Mach 1.5 to 2.96');
      expect(r.components.find((c) => c.name === 'fin friction')).toBeUndefined();
    }
  });

  it("a flat plate's faces stay served: no wave drag by the geometry, no band", () => {
    const r = parts(config(flatPlate(0.05, 'rounded', 'square')), 1.2);
    const w = r.components.find((c) => c.name === 'fin wave drag');
    expect([w?.cd, w?.low, w?.high]).toEqual([0, 0, 0]);
    expect(refusalOf(r, 'fin wave drag')).toBeUndefined();
  });

  it('the wave drag of sharp sections is refused first, attached or not', () => {
    // A 1.5% double wedge's shock is attached at M 1.3 (served before the guard); a 6% one's is
    // detached at M 1.05; a single wedge's faces at 1.4. Each is refused by the guard.
    for (const [section, mach] of [
      [doubleWedge(0.015), 1.3],
      [doubleWedge(0.06), 1.05],
      [singleWedge(0.08), 1.4],
    ] as const) {
      const r = parts(config(section), mach);
      const w = refusalOf(r, 'fin wave drag');
      expect(w?.reason).toBe('fins-own-drag-mach');
      expect(w?.message).toContain('the wave drag of a sharp section');
      expect(r.components.find((c) => c.name === 'fin wave drag')).toBeUndefined();
    }
  });
});

describe('at Mach 1.5 and above, unchanged', () => {
  it('fin friction and the wave drag of a thin double wedge carry the band', () => {
    for (const mach of [1.5, 2.0, 2.96]) {
      const r = parts(config(doubleWedge(0.015)), mach);
      for (const name of ['fin friction', 'fin wave drag']) {
        const c = r.components.find((x) => x.name === name)!;
        expect(c).toBeDefined();
        expect(refusalOf(r, name)).toBeUndefined();
        if (name === 'fin friction') {
          expect(c.low / c.cd).toBeCloseTo(FINS_OWN_DRAG_BAND[0], 12);
          expect(c.high / c.cd).toBeCloseTo(FINS_OWN_DRAG_BAND[1], 12);
        }
      }
    }
  });
});

describe('above Mach 2.96, carried and labelled', () => {
  it('the labels say by how much the band is carried beyond its measurements', () => {
    for (const [mach, by] of [
      [2.98, '0.02'],
      [3.0, '0.04'],
      [2.9601, 'less than 0.01'],
    ] as const) {
      const r = parts(config(doubleWedge(0.015)), mach);
      for (const name of ['fin friction', 'fin wave drag']) {
        const c = r.components.find((x) => x.name === name)!;
        expect(c.label).toContain(`the band is carried ${by} in Mach beyond its measurements`);
        expect(c.label).toContain('the ARCAS increments end at Mach 2.96');
        expect(c.low / c.cd).toBeCloseTo(FINS_OWN_DRAG_BAND[0], name === 'fin friction' ? 12 : 2);
      }
    }
  });

  it('at Mach 2.96 and below, no such words', () => {
    const r = parts(config(doubleWedge(0.015)), 2.96);
    for (const name of ['fin friction', 'fin wave drag']) {
      expect(r.components.find((x) => x.name === name)!.label).not.toContain(
        'beyond its measurements',
      );
    }
  });
});

describe("the review's bevel case (0019 section 3.3, 2026-10-22)", () => {
  it('a bevel swept 45 deg at Mach 1.18 (M_n 0.83) is refused until its additive sweep allowance is set', () => {
    // A 10 deg bevel on a 4% plate with a square trailing edge, leading edge swept 45 deg.
    const h = 0.02;
    const bevel = h / Math.tan((10 * Math.PI) / 180);
    const section: SymmetricSection = {
      x: [0, bevel, 1],
      halfThickness: [0, h, h],
      bluntTrailingEdge: true,
    };
    const swept45: FinnedBody = {
      ...config(section),
      fins: {
        ...config(section).fins,
        planform: trapezoidalPlanform({ rootChord: 1.5, span: 1, leadingEdgeSweep: Math.PI / 4 }),
      },
    };
    expect(Math.atan(swept45.fins.planform.tanLeadingEdge) / (Math.PI / 180)).toBeCloseTo(45, 6);
    const r = parts(swept45, 1.18);
    expect(refusalOf(r, 'fin wave drag')?.reason).toBe('fins-own-drag-mach');
    expect(r.components.find((c) => c.name === 'fin wave drag')).toBeUndefined();
  });
});
