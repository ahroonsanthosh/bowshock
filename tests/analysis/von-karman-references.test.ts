/**
 * The Von Karman nose's served outline and allowance held to the judged
 * record of its references (docs/design/0006-shock-fitting.md, "Two-scale
 * noses" and "Widening the outline: registration"): the verdicts that
 * docs/research/two-scale-noses/outline/analysis/judge.mjs gives, by the
 * registered criteria, on W5's marches and on the new ones
 * (outline/analysis/judge.json).
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { insideOutline, VON_KARMAN_REFERENCES } from '../../src/analysis/fitted-flow';
import { TWO_SCALE_DRAG_FLOOR } from '../../src/analysis/verified-drag';

interface Verdict {
  readonly case: string;
  readonly source: 'W5' | 'new';
  readonly pass: boolean;
  readonly reasons: readonly string[];
  readonly containment: readonly number[];
}

const record = JSON.parse(
  readFileSync(
    new URL('../../docs/research/two-scale-noses/outline/analysis/judge.json', import.meta.url),
    'utf8',
  ),
) as { allowance: number; largest: number; verdicts: readonly Verdict[] };

/** A case's nose length in calibers and its Mach number, from its name ("C0 L5 M2 cyl2"). */
function point(name: string): [number, number] {
  const m = /L([\d.]+) M([\d.]+)/.exec(name);
  if (!m) throw new Error(`no calibers and Mach number in ${name}`);
  return [Number(m[1]), Number(m[2])];
}

const same = (a: readonly number[], b: readonly number[]) => a[0] === b[0] && a[1] === b[1];

describe('the Von Karman references (0006, "Two-scale noses")', () => {
  it('serves the cases that passed the registered criteria, and only those', () => {
    const passed = record.verdicts.filter((v) => v.pass).map((v) => point(v.case));
    expect(passed.length).toBe(VON_KARMAN_REFERENCES.length);
    for (const p of VON_KARMAN_REFERENCES) expect(passed.some((q) => same(p, q))).toBe(true);
    // W5's seven are all among them.
    expect(record.verdicts.filter((v) => v.source === 'W5' && v.pass)).toHaveLength(7);
  });

  it('a case that failed lies outside the outline', () => {
    const failed = record.verdicts.filter((v) => !v.pass);
    for (const v of failed) {
      expect(v.reasons.length).toBeGreaterThan(0);
      expect(insideOutline(VON_KARMAN_REFERENCES, point(v.case))).toBe(false);
    }
  });

  it('the allowance is twice the largest miss, rounded up, and every passing band contains its error against the lowest bound', () => {
    expect(TWO_SCALE_DRAG_FLOOR).toBe(record.allowance);
    expect(record.allowance).toBeGreaterThanOrEqual(2 * record.largest);
    for (const v of record.verdicts.filter((w) => w.pass)) {
      for (const ratio of v.containment) expect(ratio).toBeGreaterThanOrEqual(1);
    }
  });
});
