/**
 * The Von Karman nose's served outline and allowance held to the judged
 * record of its references (docs/design/0006-shock-fitting.md, "Two-scale
 * noses" and "Widening the outline: registration"): the verdicts that
 * docs/research/two-scale-noses/outline/analysis/judge.mjs gives, by the
 * registered criteria, on W5's marches and on the new ones
 * (outline/analysis/judge.json), and the registration's rule for adding
 * them: a passing case joins the references and the outline is their
 * convex hull, but if a failed case would lie inside the hull of the
 * passing ones, nothing is added until the owner decides.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

const research = fileURLToPath(new URL('../../docs/research/two-scale-noses/', import.meta.url));
const recordFile = join(research, 'outline/analysis/judge.json');
const record = JSON.parse(readFileSync(recordFile, 'utf8')) as {
  allowance: number;
  largest: number;
  verdicts: readonly Verdict[];
};

/** Rounded up to one significant figure, the registration's step for the allowance. */
function roundedUp(v: number): number {
  const e = Math.floor(Math.log10(v));
  return Number(`${Math.ceil(v / 10 ** e - 1e-9)}e${e}`);
}

/** A case's nose length in calibers and its Mach number, from its name ("C0 L5 M2 cyl2"). */
function point(name: string): [number, number] {
  const m = /L([\d.]+) M([\d.]+)/.exec(name);
  if (!m) throw new Error(`no calibers and Mach number in ${name}`);
  return [Number(m[1]), Number(m[2])];
}

const sorted = (points: readonly (readonly [number, number])[]) =>
  [...points].map(([c, m]) => [c, m]).sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);

const passed = record.verdicts.filter((v) => v.pass);
const failed = record.verdicts.filter((v) => !v.pass);
/** Whether a failed case lies inside the hull of the passing ones (the registration's hold). */
const held = failed.some((v) =>
  insideOutline(
    passed.map((p) => point(p.case)),
    point(v.case),
  ),
);

describe('the Von Karman references (0006, "Two-scale noses")', () => {
  it("serves what the registration adds: every passing case, or W5's alone while the hold applies", () => {
    expect(record.verdicts.filter((v) => v.source === 'W5' && v.pass)).toHaveLength(7);
    const added = held ? passed.filter((v) => v.source === 'W5') : passed;
    expect(sorted(VON_KARMAN_REFERENCES)).toEqual(sorted(added.map((v) => point(v.case))));
  });

  it('holds the new cases for the owner: 6 calibers at Mach 2 failed, inside the hull of those that passed', () => {
    expect(failed.map((v) => point(v.case))).toEqual([[6, 2]]);
    expect(failed[0]!.reasons.length).toBeGreaterThan(0);
    expect(sorted(passed.filter((v) => v.source === 'new').map((v) => point(v.case)))).toEqual([
      [5, 3],
      [6, 1.5],
      [6, 3],
    ]);
    expect(held).toBe(true);
  });

  it('a case that failed lies outside the outline served', () => {
    for (const v of failed) {
      expect(insideOutline(VON_KARMAN_REFERENCES, point(v.case))).toBe(false);
    }
  });

  it('the allowance is twice the largest miss counted, rounded up, and every passing band contains its error against the lowest bound', () => {
    expect(roundedUp(7.28e-4)).toBe(8e-4);
    expect(roundedUp(8e-4)).toBe(8e-4);
    expect(record.allowance).toBe(roundedUp(2 * record.largest));
    expect(TWO_SCALE_DRAG_FLOOR).toBe(record.allowance);
    for (const v of passed) {
      for (const ratio of v.containment) expect(ratio).toBeGreaterThanOrEqual(1);
    }
  });

  it('judge.json is what judge.mjs gives now from the committed fits and marches', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vk-judge-'));
    try {
      const out = join(dir, 'judge.json');
      execFileSync(
        process.execPath,
        [
          join(research, 'outline/analysis/judge.mjs'),
          join(research, 'marches/moc.jsonl'),
          join(research, 'outline/fits/saved'),
          join(research, 'outline/marches'),
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
