// Throwaway: the round-4 second-reading tables of src/base/blunt-te-2d.ts and
// src/fins/tn2960.ts against the reader's own files, value by value. ROUND4 is the folder
// holding audit_round4.md, readings/ and scripts/ (rounds 2 and 3 are kept under
// docs/research/total-drag/audit/).
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  RM_A51J25_FIG7_CURVE_SECOND,
  RM_A51J25_FIG7_SYMBOLS_SECOND,
  TR1109_FIG29A_TURBULENT_SECOND,
  TR1109_FIG29B_LAMINAR_SECOND,
  TR1109_FIG8_CURVES_SECOND,
  TR1109_FIG8_SYMBOLS_SECOND,
  type Tr1109Curve,
} from '../../src/base/blunt-te-2d';
import { TN2960_FIG5C_SECOND, TN2960_FIG7_SECOND } from '../../src/fins/tn2960';

const ROUND4 = process.env.ROUND4 ?? 'docs/research/total-drag/audit/round4/';
const OUT = 'tests/tmp-total/second-readings.out';
const log = (s: string) => appendFileSync(OUT, s + '\n');
const csv = (f: string) =>
  readFileSync(ROUND4 + 'readings/' + f, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '' && !l.startsWith('#'))
    .map((l) => l.split(','));

/** A dict literal of compare_round4.py, {M: {X: p, ...}, ...}, as sorted [X, p] lists per M. */
function pythonDict(name: string): Record<string, number[][]> {
  const src = readFileSync(ROUND4 + 'scripts/compare_round4.py', 'utf8');
  const m = new RegExp('^' + name + ' = (\\{[\\s\\S]*?\\}\\})\\n', 'm').exec(src);
  if (m === null) throw new Error(`no ${name}`);
  const json = m[1]!
    .replace(/(\d*\.?\d+)\s*:/g, '"$1":')
    .replace(/([:\s,[])\.(\d)/g, '$10.$2');
  const parsed = JSON.parse(json) as Record<string, Record<string, number>>;
  const out: Record<string, number[][]> = {};
  for (const [mach, d] of Object.entries(parsed)) {
    out[String(Number(mach))] = Object.entries(d)
      .map(([x, p]) => [Number(x), p])
      .sort((a, b) => a[0]! - b[0]!);
  }
  return out;
}

it('the second readings, against the reader files', () => {
  writeFileSync(OUT, `reader's files: ${ROUND4}\n`);
  const f8 = csv('tr1109_fig8_symbols.csv').map((r) => [Number(r[1]), Number(r[3]), Number(r[4])]);
  expect(TR1109_FIG8_SYMBOLS_SECOND.map((s) => [s.mach, s.x, s.ratio])).toEqual(f8);
  log(`TR 1109 fig. 8 symbols (tr1109_fig8_symbols.csv): ${f8.length} equal`);
  const c7 = csv('rm_a51j25_fig7.csv')
    .slice(1)
    .map((r) => [Number(r[0]), Number(r[1]), !r.slice(2).join(',').includes('not blind')]);
  expect(RM_A51J25_FIG7_CURVE_SECOND.map((p) => [p.mach, p.ratio, p.blind])).toEqual(c7);
  log(`RM A51J25 fig. 7 curve (rm_a51j25_fig7.csv): ${c7.length} equal, not-blind flags too`);
  const s7 = csv('rm_a51j25_fig7_symbols.csv')
    .slice(1)
    .map((r) => [Number(r[r.length - 2]), Number(r[r.length - 1])]);
  expect(RM_A51J25_FIG7_SYMBOLS_SECOND.map((p) => [p.mach, p.ratio])).toEqual(s7);
  log(`RM A51J25 fig. 7 symbols (rm_a51j25_fig7_symbols.csv): ${s7.length} equal`);
  const f29 = csv('tr1109_fig29.csv').slice(1);
  let na = 0;
  for (const r of f29.filter((x) => x[0] === 'a')) {
    const c = TR1109_FIG29A_TURBULENT_SECOND.find((k) => k.mach === Number(r[1]))!;
    expect(c.points.find((q) => q.x === Number(r[2]))?.ratio).toBe(Number(r[3]));
    na++;
  }
  log(`TR 1109 fig. 29(a) (tr1109_fig29.csv): all ${na} csv values present and equal`);
  let nb = 0;
  const notTaken: string[] = [];
  for (const r of f29.filter((x) => x[0] === 'b')) {
    const m = r[1]!.startsWith('upper') ? 1.5 : r[1]!.startsWith('lower') ? 2.0 : Number(r[1]);
    const p = TR1109_FIG29B_LAMINAR_SECOND.find((k) => k.mach === m)!.points.find(
      (q) => q.x === Number(r[2]),
    );
    if (p === undefined) notTaken.push(`M ${m} X ${r[2]} ${r[3]}`);
    else {
      expect(p.ratio).toBe(Number(r[3]));
      nb++;
    }
  }
  log(`TR 1109 fig. 29(b) (tr1109_fig29.csv): ${nb} csv values present and equal; not taken: ${notTaken.join('; ')}`);
  for (const [name, table] of [
    ['S29', TR1109_FIG29A_TURBULENT_SECOND],
    ['S29b', TR1109_FIG29B_LAMINAR_SECOND],
    ['C8', TR1109_FIG8_CURVES_SECOND],
  ] as [string, readonly Tr1109Curve[]][]) {
    const d = pythonDict(name);
    let n = 0;
    for (const c of table) {
      expect(c.points.map((p) => [p.x, p.ratio])).toEqual(d[String(c.mach)]);
      n += c.points.length;
    }
    expect(Object.keys(d).length).toBe(table.length);
    log(`compare_round4.py ${name}: ${n} values equal`);
  }
  const t5 = csv('tn2960_fig5c.csv').filter((r) => /^\d/.test(r[0]!));
  for (const r of t5) {
    const c = TN2960_FIG5C_SECOND.find((k) => k.mach === Number(r[2]!.slice(1, 5)))!;
    expect(c.points.find((q) => q.theta === Number(r[0]))!.p).toBe(Number(r[4]));
  }
  expect(TN2960_FIG5C_SECOND.reduce((a, c) => a + c.points.length, 0)).toBe(t5.length);
  log(`TN 2960 fig. 5(c) (tn2960_fig5c.csv, the means): ${t5.length} equal`);
  const t7 = csv('tn2960_fig7.csv')
    .slice(1)
    .filter((r) => r[0] !== '')
    .map((r) => [Number(r[0]), Number(r[1])]);
  expect(TN2960_FIG7_SECOND.map((p) => [p.mach, p.cd])).toEqual(t7);
  log(`TN 2960 fig. 7 (tn2960_fig7.csv): ${t7.length} equal`);
});
