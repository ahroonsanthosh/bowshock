/**
 * The nose's model-form allowance on the page (design record 0022, 0014
 * 10.7 (w) and (am)): the boxes are the integration script's results on the
 * paired blind readings, to the bit; a nose inside a box carries the
 * allowance symmetric about its value, beside the numerical band; outside
 * every box the band is the numerical error alone and says so.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  allowanceWords,
  NOSE_MODEL_BOXES,
  noseFamilyOf,
  noseLineAllowance,
  noseModelAllowance,
  UNRELEASED_CONE_ROWS,
  upExponential,
  upPercent,
} from '../../src/app/nose-model-allowance';
import { noseStateOf } from '../../src/app/total-drag-display';
import { noseComponentOf } from '../../src/app/total-drag';
import type { Nose } from '../../src/geometry/nose';

const OUT = 'docs/research/nose-model-form/out';
const read = (file: string): unknown => JSON.parse(readFileSync(`${OUT}/${file}`, 'utf8'));

interface JsonBox {
  readonly id: string;
  readonly family: string;
  readonly fineness: number;
  readonly mach: number;
  readonly reynolds: string;
  readonly seen: boolean;
  readonly halfWidth: number | null;
  readonly floor: number | null;
}

/** Every box the two committed runs formed (blind-run: the ogives; blind-run-2: the cones). */
function committedBoxes(): JsonBox[] {
  const first = read('blind-run.json') as { allowances?: { box: JsonBox }[] }[];
  const second = read('blind-run-2.json') as { boxes?: JsonBox[] }[];
  return [
    ...first.flatMap((x) => (x.allowances ?? []).map((a) => a.box)),
    ...second.flatMap((x) => x.boxes ?? []),
  ];
}

const cone = (fineness: number): Nose => ({
  shape: { kind: 'conical' },
  length: fineness,
  baseRadius: 0.5,
});
const ogive = (fineness: number, parameter = 1): Nose => ({
  shape: { kind: 'ogive', parameter },
  length: fineness,
  baseRadius: 0.5,
});

describe('the boxes (0022 section 4.4)', () => {
  it("are the committed runs' boxes, every field to the bit, all ratio boxes of seen sets", () => {
    const committed = committedBoxes();
    expect(committed.length).toBe(11);
    expect(
      NOSE_MODEL_BOXES.map((b) => {
        const { source, measure, ...rest } = b;
        expect(source.length).toBeGreaterThan(0);
        expect(measure).toBe('ratio');
        return rest;
      }),
    ).toEqual(committed);
    for (const b of NOSE_MODEL_BOXES) {
      expect(b.measure).toBe('ratio');
      expect(b.seen).toBe(true);
    }
  });
});

describe('which noses a box can hold', () => {
  it('cones (and shapes drawn as that cone) and tangent ogives only; secant ogives and other shapes, none', () => {
    expect(noseFamilyOf(cone(4))).toBe('cone');
    expect(noseFamilyOf(ogive(3))).toBe('tangent ogive');
    expect(noseFamilyOf(ogive(3, 0.5))).toBeNull();
    expect(noseFamilyOf(ogive(3, 0.9))).toBeNull();
    expect(noseFamilyOf(ogive(3, 0.999999))).toBeNull();
    // Shapes the geometry draws as the cone exactly (src/geometry/nose.ts).
    expect(noseFamilyOf(ogive(4, 0))).toBe('cone');
    expect(noseFamilyOf(ogive(4, 0.0009))).toBe('cone');
    expect(noseFamilyOf(ogive(4, 0.001))).toBeNull();
    expect(
      noseFamilyOf({ shape: { kind: 'power', exponent: 1 }, length: 4, baseRadius: 0.5 }),
    ).toBe('cone');
    expect(
      noseFamilyOf({ shape: { kind: 'power', exponent: 0.5 }, length: 4, baseRadius: 0.5 }),
    ).toBeNull();
    expect(
      noseFamilyOf({ shape: { kind: 'parabolic', parameter: 0 }, length: 4, baseRadius: 0.5 }),
    ).toBe('cone');
    expect(
      noseFamilyOf({ shape: { kind: 'haack', parameter: 0 }, length: 5, baseRadius: 0.5 }),
    ).toBeNull();
    expect(noseFamilyOf({ shape: { kind: 'ellipsoid' }, length: 2, baseRadius: 0.5 })).toBeNull();
    expect(
      noseFamilyOf({ shape: { kind: 'parabolic', parameter: 1 }, length: 4, baseRadius: 0.5 }),
    ).toBeNull();
  });

  it('the widest box within 0.25 calibers and 0.05 in Mach, none outside', () => {
    // TN 4233's 7 deg cone, 4.08 calibers: at Mach 1.3 only the 1.299 box holds it.
    expect(noseModelAllowance(cone(4), 1.3)?.halfWidth).toBe(0.0781551187911795);
    // At Mach 1.2 both the 1.151 and the 1.2 boxes hold it: the wider counts.
    expect(noseModelAllowance(cone(4), 1.2)?.halfWidth).toBe(0.09410351519421374);
    expect(noseModelAllowance(cone(4), 1.2)?.sources.length).toBe(2);
    expect(noseModelAllowance(cone(4), 1.46)).toBeNull();
    expect(noseModelAllowance(cone(4.34), 1.3)).toBeNull();
    // The box's edges, inclusive: 4.081989... - 0.25 calibers, and 1.299 + 0.05 in Mach.
    const edge = 4.081989276071384 - 0.25;
    expect(noseModelAllowance(cone(edge), 1.3)?.halfWidth).toBe(0.0781551187911795);
    expect(noseModelAllowance(cone(edge - 1e-9), 1.3)).toBeNull();
    expect(noseModelAllowance(cone(4), 1.349)?.halfWidth).toBe(0.0781551187911795);
    expect(noseModelAllowance(cone(4), 1.3495)).toBeNull();
    // TN 3716's 3-caliber tangent ogive: its readings set it above its published floor (14.4%).
    expect(noseModelAllowance(ogive(3), 2)?.halfWidth).toBe(0.16414839743603604);
    expect(noseModelAllowance(ogive(5.75), 1.95)?.halfWidth).toBe(0.2126241678549045);
    expect(noseModelAllowance(ogive(4.5), 2)).toBeNull();
    // The Basic Finner's cone (2.84 calibers) lies in no box.
    expect(noseModelAllowance(cone(2.84), 2)).toBeNull();
    expect(noseModelAllowance(cone(2.84), 1.8)).toBeNull();
  });

  it('none where a measured row not yet released would also hold the case (to Mach 1.064 + 0.05)', () => {
    // The rows not run in blind-run-2 (0014 (y)): their highest indicated Mach number is the constant's.
    const second = read('blind-run-2.json') as { notRun?: string[] }[];
    const rows = second.flatMap((x) => x.notRun ?? []);
    const machs = rows.map((r) => Number(/indicated Mach ([0-9.]+)/.exec(r)![1]));
    expect(rows.length).toBe(30);
    expect(Math.max(...machs)).toBe(UNRELEASED_CONE_ROWS.highestMach);
    expect(UNRELEASED_CONE_ROWS.fineness).toBe(4.081989276071384);
    // A 4.08-caliber cone at Mach 1.1, where the boxes carried hold it and so would the rows at 1.050
    // to 1.064: none. Past 1.114 the released boxes alone hold it.
    expect(noseModelAllowance(cone(4), 1.1)).toBeNull();
    expect(noseModelAllowance(cone(4), 1.114)).toBeNull();
    expect(noseModelAllowance(cone(4), 1.115)?.halfWidth).toBe(0.12751870443103236);
    // Another fineness, outside those rows' boxes, is not touched by them (and lies in no box).
    expect(noseModelAllowance(cone(4.5), 1.1)).toBeNull();
  });
});

describe('the nose term with and without the allowance', () => {
  const solve = { value: 0.08, uncertainty: 3e-5, grids: 4 };

  it('inside a box: D (1 - a) - n to D (1 + a) + n, both parts named with their sizes', () => {
    const a = noseModelAllowance(cone(4), 1.3)!;
    const c = noseComponentOf(solve, a);
    expect(c.cd).toBe(0.08);
    expect(c.low).toBe(0.08 - a.halfWidth * 0.08 - 3e-5);
    expect(c.high).toBe(0.08 + a.halfWidth * 0.08 + 3e-5);
    expect(c.band).toContain('two parts, added: the numerical error of the inviscid solve');
    expect(c.band).toContain('+-3.0e-5 in C_D');
    expect(c.band).toContain('+-7.9% of the value (+-6.3e-3 in C_D)');
    expect(c.band).toContain(
      'NACA TN 4233, a cone of 7 deg half-angle and 4.08 calibers at Mach 1.299, table I(a)',
    );
    expect(c.band).toContain('formed from data seen before registration');
    expect(c.band).not.toContain('is not in this band');
  });

  it("the drag page's nose line takes the same words, the seen-before label with them", () => {
    const a = noseModelAllowance(ogive(3), 2)!;
    const w = allowanceWords(a, 0.1);
    expect(w).toContain('+-16.5% of the value (+-1.7e-2 in C_D)');
    expect(w).toContain('NACA TN 3716, a 3-caliber tangent ogive at Mach 1.98');
    expect(w).toContain('formed from data seen before registration, so it can only widen the band');
    // The 14-foot rows do not claim the 2- by 2-foot tunnel's Reynolds number.
    const b = noseModelAllowance(cone(4), 1.12)!;
    const words = allowanceWords(b, 0.1);
    expect(words).toContain('table I(b), the Ames 14-foot tunnel (the report states 2.4e6');
    expect(words).toContain('and not whether this run had the same');
  });

  it('outside every box: the numerical band alone, as before, and it says so', () => {
    const c = noseComponentOf(solve);
    expect(c.low).toBe(0.08 - 3e-5);
    expect(c.high).toBe(0.08 + 3e-5);
    expect(c.band).toContain("the model's own error is not in this band");
    expect(noseComponentOf(solve, null)).toEqual(c);
  });

  it('noseStateOf applies it only when given the nose, and only inside a box', () => {
    const value = 0.08;
    const outcome = {
      kind: 'solved' as const,
      floor: 7e-5,
      estimate: {
        kind: 'monotone' as const,
        value,
        extrapolated: value,
        order: 2,
        uncertainty: 3e-5,
      },
      uncertainty: 3e-5,
      verified: true,
      levels: [{ refinement: 1, value }],
      reports: [],
    };
    const band = (s: ReturnType<typeof noseStateOf>) => {
      if (s === null || s.kind !== 'solved') throw new Error('not solved');
      return [s.component.low, s.component.high];
    };
    const plain = band(noseStateOf(outcome));
    expect(band(noseStateOf(outcome, { nose: cone(2.84), mach: 2 }))).toEqual(plain);
    const wide = band(noseStateOf(outcome, { nose: cone(4), mach: 1.3 }));
    expect(wide[0]).toBeLessThan(plain[0]!);
    expect(wide[1]).toBeGreaterThan(plain[1]!);
  });

  it('the sizes in words are rounded up, never narrower than the band (src/app/band.ts)', () => {
    expect(upPercent(0.16414839743603604)).toBe('16.5');
    expect(upPercent(0.0781551187911795)).toBe('7.9');
    expect(upPercent(0.09)).toBe('9.0');
    expect(upExponential(0.0062524)).toBe('6.3e-3');
    expect(upExponential(3e-5)).toBe('3.0e-5');
    expect(upExponential(9.96e-3)).toBe('1.0e-2');
    expect(upExponential(0.0164148)).toBe('1.7e-2');
  });

  it("the All inputs page's nose line: the allowance's words where a box holds the nose, else nothing", () => {
    expect(noseLineAllowance(cone(2.84), 2, 0.05)).toBe('');
    expect(noseLineAllowance(cone(4), 1.1, 0.09)).toBe('');
    const line = noseLineAllowance(ogive(3), 2, 0.1);
    expect(line.startsWith(' The total carries also the inviscid model against measured')).toBe(
      true,
    );
    expect(line).toContain('+-16.5% of the value');
    expect(line).toContain('formed from data seen before registration');
  });
});
