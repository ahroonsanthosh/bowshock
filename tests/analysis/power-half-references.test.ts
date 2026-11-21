/**
 * The power-1/2 nose's served outline held to the judged record of its
 * references (docs/design/0006-shock-fitting.md, "The power-1/2 outline:
 * registration" and "results"): the verdicts that
 * docs/research/two-scale-noses/outline/analysis/judge.mjs gives with the
 * allowance fixed at 8e-4 (`--allowance 8e-4`) on the power-1/2 fits and
 * marches, each march ended at the end of the nose
 * (outline/power-half/analysis/judge.json), and the registration's rule
 * for adding them: every passing case joins the references and the
 * outline is their convex hull, separate from the Haack outlines; a failed
 * case is not added, and if one lay inside the hull of the passing ones,
 * or on it, nothing would be added until the owner decides.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  bluntNoseRefusal,
  insideOutline,
  LV_HAACK_REFERENCES,
  POWER_HALF_REFERENCES,
  VON_KARMAN_REFERENCES,
} from '../../src/analysis/fitted-flow';
import type { Body } from '../../src/geometry/body';
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
const outline = join(research, 'outline/power-half');
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

const powerHalf = record.verdicts.filter(
  (v) => v.source === 'new' && v.case.startsWith('power n0.5 '),
);
const passed = powerHalf.filter((v) => v.pass);
const failed = powerHalf.filter((v) => !v.pass);

describe('the power-1/2 references (0006, "The power-1/2 outline")', () => {
  it("judged the registration's six cases, and nothing else is new", () => {
    expect(record.verdicts.filter((v) => v.source === 'new')).toHaveLength(6);
    expect(sorted(powerHalf.map((v) => point(v.case)))).toEqual([
      [3, 1.5],
      [3, 3],
      [4, 2],
      [5, 1.5],
      [5, 2],
      [5, 3],
    ]);
  });

  it('every march ended at the end of the nose', () => {
    const marches = join(outline, 'marches');
    const logs = readdirSync(marches).filter((f) => f.endsWith('.txt'));
    expect(logs).toHaveLength(6);
    for (const f of logs) {
      const first = readFileSync(join(marches, f), 'utf8').split('\n')[0]!;
      expect(first).toMatch(/ended at the end of the nose/);
    }
    for (const f of readdirSync(marches).filter((f) => f.endsWith('.jsonl'))) {
      const lines = readFileSync(join(marches, f), 'utf8').trim().split('\n');
      for (const l of lines) expect((JSON.parse(l) as { end?: string }).end).toBe('nose');
    }
  });

  it('serves exactly the cases that passed', () => {
    expect(sorted(POWER_HALF_REFERENCES)).toEqual(sorted(passed.map((v) => point(v.case))));
  });

  it('5 calibers at Mach 1.5 failed on the fixed allowance, and lies outside the hull of those that passed', () => {
    expect(failed.map((v) => point(v.case))).toEqual([[5, 1.5]]);
    expect(failed[0]!.reasons).toEqual([
      'twice the largest counted miss, 1.39e-3, rounds up above the fixed allowance 8e-4',
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
      expect(insideOutline(POWER_HALF_REFERENCES, point(v.case))).toBe(false);
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

  it('is separate from the Haack outlines', () => {
    // Each list stands for its own shape only: a power-1/2 nose at a point
    // the Von Karman or LV-Haack outline holds is refused, and the reverse.
    const body = (shape: Body['nose']['shape'], calibers: number): Body => ({
      nose: { shape, length: calibers, baseRadius: 0.5 },
      cylinderLength: 1,
    });
    const paraboloid = { kind: 'power', exponent: 0.5 } as const;
    expect(insideOutline(VON_KARMAN_REFERENCES, [1, 2])).toBe(true);
    expect(bluntNoseRefusal(body(paraboloid, 1), 2)).toMatch(/power-1\/2 nose of 1 caliber/);
    expect(insideOutline(LV_HAACK_REFERENCES, [6, 2.5])).toBe(true);
    expect(bluntNoseRefusal(body(paraboloid, 6), 2.5)).toMatch(/outside the referenced range/);
    expect(insideOutline(POWER_HALF_REFERENCES, [3, 2])).toBe(true);
    expect(bluntNoseRefusal(body({ kind: 'haack', parameter: 1 / 3 }, 3), 2)).toMatch(
      /LV-Haack nose of 3 calibers/,
    );
  });

  it('judge.json is what judge.mjs gives now from the committed fits and marches', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pow-judge-'));
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
