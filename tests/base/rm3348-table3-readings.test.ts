/**
 * ARC R&M 3348's table 3 (base pressure on the swept single-wedge wing) and
 * table 2(b) (the base holes' positions), read twice: the first typing
 * (docs/research/total-drag/audit/w7-fins/rm3348_table3_first.csv, the 0019
 * reader) against the blind second typing
 * (docs/research/total-drag/audit/round8/readings/, the round-8 reader). The
 * coordinator paired them on 2026-10-22 and found them identical; this holds
 * them so, so a later edit to either fails here. Registered band-setting by
 * 0014 section 10.7 (k).
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lines = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '' && !l.startsWith('#'));

/** Rows of a CSV as records of its header's fields; quoted fields are not read (none is used). */
function records(path: string): Record<string, string>[] {
  const [header, ...rows] = lines(path);
  const names = header!.split(',');
  return rows.map((row) => {
    const fields = row.split(',');
    return Object.fromEntries(names.map((n, i) => [n, fields[i] ?? '']));
  });
}

/** The key of one value: sub-table, Mach number, sweep, hole and incidence. */
const key = (subTable: string, mach: string, sweep: string, hole: string, alpha: string) =>
  [subTable, Number(mach), Number(sweep), Number(hole), Number(alpha)].join('|');

const first = records('docs/research/total-drag/audit/w7-fins/rm3348_table3_first.csv');
const second = records('docs/research/total-drag/audit/round8/readings/rm3348_table3.csv');
const holes = records('docs/research/total-drag/audit/round8/readings/rm3348_table2b.csv');

const firstByKey = new Map(
  first.map((r) => [key(r.case!, r.mach!, r.sweep_deg!, r.hole!, r.alpha_deg!), r]),
);
const secondByKey = new Map(
  second.map((r) => [key(r.sub_table!, r.M0!, r.phi_deg!, r.hole!, r.alpha_deg!), r]),
);

describe('R&M 3348 table 3, read twice', () => {
  it('holds 852 values in each reading, each key once', () => {
    expect(first.length).toBe(852);
    expect(second.length).toBe(852);
    expect(firstByKey.size).toBe(852);
    expect(secondByKey.size).toBe(852);
  });

  it('has the same keys in both readings', () => {
    expect([...firstByKey.keys()].sort()).toEqual([...secondByKey.keys()].sort());
  });

  it('agrees value for value, as printed, and on the PDF page', () => {
    const differ = [...firstByKey].filter(([k, a]) => {
      const b = secondByKey.get(k)!;
      return a.pb_over_p0 !== b.p_b_over_p0 || a.pdf_page !== b.pdf_page;
    });
    expect(differ).toEqual([]);
  });

  it('the second reading marks no value uncertain, and its values are p_b / p_0 to three decimals', () => {
    expect(second.every((r) => r.legibility === 'certain')).toBe(true);
    expect(first.every((r) => /^\d\.\d{3}$/.test(r.pb_over_p0!))).toBe(true);
  });
});

describe('R&M 3348 table 2(b), read twice', () => {
  it('gives each hole the same position in both readings, 6 of 6', () => {
    expect(holes.length).toBe(6);
    for (const h of holes) {
      const etas = new Set(first.filter((r) => r.hole === h.hole).map((r) => Number(r.eta_b)));
      expect([...etas]).toEqual([Number(h.eta_b)]);
    }
    expect(holes.map((h) => Number(h.eta_b))).toEqual([0.1, 0.26, 0.425, 0.59, 0.75, 0.915]);
  });
});
