/**
 * The LV-Haack nose's served outline held to the judged record of its
 * references (docs/design/0006-shock-fitting.md, "The LV-Haack outline:
 * registration" and "results"): the verdicts that
 * docs/research/two-scale-noses/outline/analysis/judge.mjs gives with the
 * allowance fixed at 8e-4 (`--allowance 8e-4`) on the LV-Haack fits and
 * marches (outline/lv-haack/analysis/judge.json), and the registration's
 * rule for adding them: every passing case joins the references and the
 * outline is their convex hull, separate from the Von Karman outline; a
 * failed case is not added, and if one lay inside the hull of the passing
 * ones, or on it, nothing would be added until the owner decides.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  insideOutline,
  LV_HAACK_REFERENCES,
  VON_KARMAN_REFERENCES,
} from '../../src/analysis/fitted-flow';
import { TWO_SCALE_DRAG_FLOOR } from '../../src/analysis/verified-drag';

interface Verdict {
  readonly case: string;
  readonly source: 'W5' | 'new';
  readonly pass: boolean;
  readonly reasons: readonly string[];
  readonly counted: readonly number[];
  readonly largestCounted?: number;
  readonly containment: readonly number[];
}

const research = fileURLToPath(new URL('../../docs/research/two-scale-noses/', import.meta.url));
const outline = join(research, 'outline/lv-haack');
const recordFile = join(outline, 'analysis/judge.json');
const record = JSON.parse(readFileSync(recordFile, 'utf8')) as {
  fixedAllowance: number;
  verdicts: readonly Verdict[];
};

/** Rounded up to one significant figure, the registration's step for the allowance. */
function roundedUp(v: number): number {
  const e = Math.floor(Math.log10(v));
  return Number(`${Math.ceil(v / 10 ** e - 1e-9)}e${e}`);
}

/** A case's nose length in calibers and its Mach number, from its name. */
function point(name: string): [number, number] {
  const m = /L([\d.]+) M([\d.]+)/.exec(name);
  if (!m) throw new Error(`no calibers and Mach number in ${name}`);
  return [Number(m[1]), Number(m[2])];
}

const sorted = (points: readonly (readonly [number, number])[]) =>
  [...points].map(([c, m]) => [c, m]).sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);

const lvHaack = record.verdicts.filter(
  (v) => v.source === 'new' && v.case.startsWith('haack C0.3333333333333333 '),
);
const passed = lvHaack.filter((v) => v.pass);
const failed = lvHaack.filter((v) => !v.pass);

describe('the LV-Haack references (0006, "The LV-Haack outline")', () => {
  it("judged the registration's six cases, and nothing else is new", () => {
    expect(record.verdicts.filter((v) => v.source === 'new')).toHaveLength(6);
    expect(sorted(lvHaack.map((v) => point(v.case)))).toEqual([
      [4, 1.5],
      [4, 3],
      [5, 2],
      [6, 1.5],
      [6, 2],
      [6, 3],
    ]);
  });

  it('serves exactly the cases that passed', () => {
    expect(sorted(LV_HAACK_REFERENCES)).toEqual(sorted(passed.map((v) => point(v.case))));
  });

  it('6 calibers at Mach 1.5 failed on the fixed allowance, and lies outside the hull of those that passed', () => {
    expect(failed.map((v) => point(v.case))).toEqual([[6, 1.5]]);
    expect(failed[0]!.reasons).toEqual([
      'twice the largest counted miss, 8.63e-4, rounds up above the fixed allowance 8e-4',
    ]);
    // The registration's hold does not apply: no failed case lies inside
    // the hull of the passing ones, or on it.
    for (const v of failed) {
      expect(
        insideOutline(
          passed.map((p) => point(p.case)),
          point(v.case),
        ),
      ).toBe(false);
      expect(insideOutline(LV_HAACK_REFERENCES, point(v.case))).toBe(false);
    }
  });

  it('the allowance stays 8e-4: every passing case needs no more, and its band with it contains its error against every lowest bound', () => {
    expect(record.fixedAllowance).toBe(8e-4);
    expect(TWO_SCALE_DRAG_FLOOR).toBe(record.fixedAllowance);
    for (const v of passed) {
      expect(v.reasons).toEqual([]);
      expect(v.counted.length).toBeGreaterThan(0);
      expect(roundedUp(2 * v.largestCounted!)).toBeLessThanOrEqual(record.fixedAllowance);
      expect(v.containment.length).toBeGreaterThan(0);
      for (const ratio of v.containment) expect(ratio).toBeGreaterThanOrEqual(1);
    }
  });

  it('is separate from the Von Karman outline', () => {
    // 6 calibers at Mach 2 passed for the LV-Haack nose and failed for the
    // Von Karman: each list stands for its own shape only.
    expect(LV_HAACK_REFERENCES.some(([c, m]) => c === 6 && m === 2)).toBe(true);
    expect(insideOutline(VON_KARMAN_REFERENCES, [6, 2])).toBe(false);
  });

  it('judge.json is what judge.mjs gives now from the committed fits and marches', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lvh-judge-'));
    try {
      const out = join(dir, 'judge.json');
      execFileSync(
        process.execPath,
        [
          join(research, 'outline/analysis/judge.mjs'),
          join(research, 'marches/moc.jsonl'),
          join(outline, 'fits/saved'),
          join(outline, 'marches'),
          '--allowance',
          '8e-4',
          '--json',
          out,
        ],
        { stdio: 'pipe' },
      );
      expect(JSON.parse(readFileSync(out, 'utf8')) as unknown).toEqual(record);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
