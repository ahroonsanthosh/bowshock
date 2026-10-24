/**
 * The third blind run (design record 0022 section 8 item 9, decided
 * 2026-10-24 and committed at 3b906c1 before anything ran): TN 4233's 30 rows
 * below indicated Mach 1.078 in tables I(a) and I(b), blind readings A and B
 * each as its own reading, the check orifices 16 and 17 as alternatives of
 * orifices 4 and 7 (item 7), the earlier typing as 0022 4.2's earlier reading
 * where it has the row, against the transonic solver of 0013 on its finest
 * grid (r = 8), solved by ./blind-run-3-solve.test.ts into
 * ./out/blind-run-3/solves/.
 *
 * The 16 rows below Mach 1 are held, not evaluated, until a verification
 * plan for the solver there is registered (the owner, 2026-10-24); they are
 * listed as held. The owner runs the r = 8 solves on a GPU (./owner-kit/);
 * SOLVES=solves-gpu evaluates those.
 *
 * Seen set ((w) item 3): widening only, never a test or a validation,
 * formed from data seen before registration. Below Mach 1 the inviscid side
 * lies outside 0013's verified range (Mach 1 to 1.2), and every such row is
 * labelled so. Unchanged: the script, the one-tenth rule, the boxes, the
 * quadrature. The earlier runs' outputs are not touched; the cone boxes of
 * the second run are read from ./out/blind-run-2.json.
 *
 * Writes ./out/blind-run-3.out, ./out/blind-run-3.json and
 * ./out/blind-run-3-combinations.txt. Run:
 *   ONLY=./blind-run-3.test.ts npx vitest run --config docs/research/nose-model-form/vitest.config.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import {
  TN4233_CONE_HALF_ANGLE,
  TN4233_ORIFICES,
  TN4233_ROWS,
} from '../../../src/validation/cone-cylinder-tn4233';
import {
  allowanceAt,
  boxOf,
  evaluateCase,
  BOX_FINENESS,
  BOX_MACH,
  COVERAGE_LIMIT,
  type Box,
  type CaseResult,
  type MeasuredCase,
  type Reading,
  type ReadingStation,
} from '../../../src/validation/nose-model-form';

const here = dirname(fileURLToPath(import.meta.url));
const readings = join(here, 'blind-readings');
/**
 * The solves to evaluate: SOLVES=solves-gpu for the owner's GPU run (owner-kit/),
 * the CPU job's ./out/blind-run-3/solves/ by default.
 */
const solves = join(here, 'out', 'blind-run-3', process.env.SOLVES ?? 'solves');
const LABEL =
  'Seen sets (0014 10.7 (w) item 3): widening only, never a test or a validation; ' +
  'formed from data seen before registration';
const LAST_MACH = 1.078;

// ---------------------------------------------------------------- CSV input

type Row = Record<string, string>;

/** A small CSV reader: quoted fields with doubled quotes, comma separated. */
function readCsv(path: string): Row[] {
  const text = readFileSync(path, 'utf8');
  const records: string[][] = [];
  let field = '';
  let rec: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      rec.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      rec.push(field);
      field = '';
      if (rec.some((f) => f !== '')) records.push(rec);
      rec = [];
    } else field += ch;
  }
  if (field !== '' || rec.length > 0) {
    rec.push(field);
    if (rec.some((f) => f !== '')) records.push(rec);
  }
  const [head, ...body] = records;
  return body.map((r) => Object.fromEntries(head!.map((h, k) => [h, r[k] ?? ''])));
}

function num(s: string): number {
  const v = Number(s.trim());
  if (!Number.isFinite(v) || s.trim() === '') throw new RangeError(`not a number: "${s}"`);
  return v;
}

function alternativesOf(row: Row): number[] {
  return row.alternatives!.trim() === '' ? [] : row.alternatives!.split(';').map(num);
}

/** A station's values: the first is the reading, every other distinct value an alternative. */
function station(x: number, values: number[]): ReadingStation {
  const distinct = values.filter((v, i) => values.indexOf(v) === i);
  return { x, cp: distinct[0]!, alternatives: distinct.slice(1) };
}

// -------------------------------------------------------- the inviscid side

interface Solve {
  readonly mach: number;
  readonly converged: boolean;
  readonly reason?: string;
  readonly finest: number;
  readonly domain?: { readonly farRadius: number; readonly cylinderCalibers: number };
  readonly noseLengthRadii?: number;
  readonly levels: readonly {
    refinement: number;
    ni: number;
    nj: number;
    drag: number;
    steps: number;
    seconds: number;
    noise: number;
  }[];
  readonly wall?: readonly { x: number; y: number; cp: number }[];
}

function solveOf(mach: number): Solve | null {
  const file = join(solves, `M${mach.toFixed(3)}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Solve) : null;
}

/**
 * The finest grid's wall Cp at x (body diameters): linear between the wall
 * faces' midpoints, the first face's value ahead of it (the grid's tip).
 */
function inviscidCpOf(solve: Solve): (x: number) => number {
  const pts = solve.wall!.map((w) => ({ x: w.x / 2, cp: w.cp })).sort((a, b) => a.x - b.x);
  return (x: number) => {
    if (x <= pts[0]!.x) return pts[0]!.cp;
    let k = 0;
    while (k < pts.length - 2 && pts[k + 1]!.x < x) k++;
    const a = pts[k]!;
    const b = pts[k + 1]!;
    return a.cp + ((b.cp - a.cp) * (x - a.x)) / (b.x - a.x);
  };
}

// ------------------------------------------------------------------ TN 4233

interface RowCase {
  readonly input: MeasuredCase;
  readonly notes: string[];
  readonly solve: Solve;
}

function rows(): {
  cases: RowCase[];
  pending: string[];
  notConverged: string[];
  held: string[];
} {
  const angle = TN4233_CONE_HALF_ANGLE;
  const L = 0.5 / Math.tan(angle);
  const e = 0.002; // stated, p. 8 (both readers); as the second run
  const tables: { file: string; tunnel: '2ft' | '14ft'; name: string }[] = [
    { file: 'tn4233_table1a.csv', tunnel: '2ft', name: 'table I(a), Ames 2- by 2-foot' },
    { file: 'tn4233_table1b.csv', tunnel: '14ft', name: 'table I(b), Ames 14-foot' },
  ];
  const cases: RowCase[] = [];
  const pending: string[] = [];
  const held: string[] = [];
  const notConverged: string[] = [];
  for (const t of tables) {
    const byReader = (['A', 'B'] as const).map((reader) => ({
      reader,
      rows: readCsv(join(readings, reader, t.file)),
    }));
    const machs = [...new Set(byReader[0]!.rows.map((r) => num(r.mach!)))]
      .filter((m) => m < LAST_MACH)
      .sort((a, b) => a - b);
    for (const mach of machs) {
      const what = `${t.name}, indicated Mach ${mach.toFixed(3)}`;
      // The owner, 2026-10-24: no row below Mach 1 is evaluated until a
      // verification plan for the solver there is registered.
      if (mach < 1) {
        held.push(what);
        continue;
      }
      const solve = solveOf(mach);
      if (solve === null) {
        pending.push(what);
        continue;
      }
      if (!solve.converged) {
        notConverged.push(`${what}: ${solve.reason ?? 'not converged'}`);
        continue;
      }
      expect(solve.finest).toBe(8);
      expect(solve.noseLengthRadii! / 2).toBeCloseTo(L, 9);
      const notes: string[] = [];
      const readingsHere: Reading[] = [];
      for (const { reader, rows: all } of byReader) {
        const row = all.filter((r) => num(r.mach!) === mach);
        const cellOf = (n: number) => row.find((r) => num(r.orifice!) === n);
        const stations: ReadingStation[] = [];
        for (let n = 1; n <= 11; n++) {
          const c = cellOf(n)!;
          const xl = num(c.station!);
          expect(xl).toBeCloseTo(TN4233_ORIFICES[n - 1]!, 9);
          const values = [num(c.cp!), ...alternativesOf(c)];
          // 0022 section 8 item 7: the check orifice at the same station is an alternative.
          const check = n === 4 ? cellOf(16) : n === 7 ? cellOf(17) : undefined;
          if (check) {
            expect(num(check.station!)).toBeCloseTo(xl, 9);
            values.push(num(check.cp!), ...alternativesOf(check));
          }
          if (c.flag !== 'ok')
            notes.push(
              `  reader ${reader}, orifice ${n}: flagged "${c.flag}"` +
                (alternativesOf(c).length > 0
                  ? `, alternatives ${c.alternatives!}`
                  : ', no alternative given: enters as printed'),
            );
          stations.push(station(xl * L, values));
        }
        readingsHere.push({
          label: `reader ${reader}, ${t.name} (blind reading, 2026-10-24)`,
          stations,
        });
      }
      const earlier = TN4233_ROWS.find((r) => r.tunnel === t.tunnel && r.mach === mach);
      if (earlier) {
        readingsHere.push({
          label:
            'EARLIER READING (0022 4.2, a lower limit): the typing in src/validation/cone-cylinder-tn4233.ts',
          stations: TN4233_ORIFICES.slice(0, 11).map((xl, i) =>
            station(xl * L, [
              earlier.cp[i]!,
              ...(i === 3 ? [earlier.check[0]] : i === 6 ? [earlier.check[1]] : []),
            ]),
          ),
        });
      } else notes.push('  no earlier typing of this row (0022 4.2): fresh readings only');
      const finest = solve.levels[solve.levels.length - 1]!;
      notes.unshift(
        `  inviscid: the transonic solver of 0013, CPU engine, r = 8 (${finest.ni} x ${finest.nj} cells), far boundary ${solve.domain!.farRadius.toFixed(1)} radii, ${solve.domain!.cylinderCalibers} calibers of cylinder; drag by level ${solve.levels.map((l) => `r=${l.refinement} ${l.drag.toFixed(7)}`).join(', ')}; r = 8 settled in ${finest.steps} steps (${Math.round(finest.seconds)} s), noise ${finest.noise.toExponential(1)}. No grid-convergence band or domain allowance computed.` +
          (mach < 1
            ? ' BELOW MACH 1: OUTSIDE 0013 VERIFIED RANGE (Mach 1 to 1.2); the driver would refuse it.'
            : mach < 1.05
              ? ' Below Mach 1.05: the driver refuses this unserved (near-sonic, 0013 B1); solved in its near-sonic domain.'
              : ''),
      );
      cases.push({
        solve,
        notes,
        input: {
          id: `TN 4233, 7 deg cone, ${t.name}`,
          family: 'cone',
          fineness: L,
          mach,
          reynolds:
            '2.4e6 on the 5.50 in. cone length (text p. 7); the report does not say whether the 14-foot run used the same value (B)',
          radius: (x: number) => (0.5 * Math.min(Math.max(x, 0), L)) / L,
          inviscidCp: inviscidCpOf(solve),
          cpUncertainty: e,
          readings: readingsHere,
          seen: true,
        },
      });
    }
  }
  return { cases, pending, notConverged, held };
}

// ------------------------------------------------------------------ output

const pct = (v: number) => `${(100 * v).toFixed(2)}%`;

function combinationLines(r: CaseResult): string[] {
  return r.evaluations.map(
    (e) =>
      `    ${pct(e.r).padStart(8)}  ${pct(e.uMeas).padStart(7)}  ${pct(e.uUnc).padStart(6)}  ${pct(e.halfWidth).padStart(7)}   ${e.reading}; ${e.cps.join(' ')}`,
  );
}

function summary(r: CaseResult, notes: string[], solverDrag: number): string[] {
  const lines = [
    `${r.id}, Mach ${r.mach}, ${r.fineness.toFixed(3)} cal`,
    `  Re: ${r.reynolds}`,
    ...notes,
    `  stations on the nose (x/d): ${r.stations.map((x) => x.toFixed(3)).join(', ')}`,
    `  inviscid nose drag: the solver's ${solverDrag.toFixed(6)}; its wall Cp by the fine quadrature ${r.inviscidNoseDrag.toFixed(6)}; at the stations ${r.evaluations[0]!.inviscidDrag.toFixed(6)}`,
    `  uncovered share of the inviscid drag ${pct(r.uncoveredShare)} (limit ${pct(COVERAGE_LIMIT)}): ${r.sets ? 'not refused by the one-tenth rule' : 'REFUSED by the one-tenth rule: sets nothing'}`,
    `  covered area ${pct(r.coveredArea)}; bias area (first orifice to shoulder) ${pct(r.biasArea)}`,
    '  per reading and combination (values at the nose stations, in order):',
    '    r         u_meas   u_unc    |r|+u     reading; Cp values',
    ...combinationLines(r),
  ];
  lines.push(
    `  a = max |r| + u over every reading and combination: ${r.halfWidth === null ? 'none (refused)' : pct(r.halfWidth)}`,
    '  floor: none published for this set (0022 section 5 (a)); ' +
      (r.evaluations.some((e) => e.reading.startsWith('EARLIER'))
        ? 'the earlier typing, carried in the envelope above, does its job'
        : 'no earlier typing of this row'),
  );
  return lines;
}

function boxLine(b: Box, boxes: readonly Box[]): string {
  const al = allowanceAt(boxes, b.family, b.fineness, b.mach);
  return (
    `  ${b.family}, ${(b.fineness - BOX_FINENESS).toFixed(2)} to ${(b.fineness + BOX_FINENESS).toFixed(2)} cal, ` +
    `Mach ${(b.mach - BOX_MACH).toFixed(3)} to ${(b.mach + BOX_MACH).toFixed(3)} (${b.id}, Mach ${b.mach}): a_b ` +
    `${b.halfWidth === null ? 'none (refused)' : pct(b.halfWidth)}; allowance at its centre ` +
    (al === null
      ? 'none'
      : `${pct(al.halfWidth)} from ${al.boxes.length} box(es)${al.seenOnly ? ', formed from data seen before registration' : ''}`)
  );
}

/** The allowance along Mach at one fineness between the box edges, before and after. */
function alongMach(before: readonly Box[], after: readonly Box[], fineness: number): string[] {
  const edges = [
    ...new Set(
      after.flatMap((b) => [b.mach - BOX_MACH, b.mach + BOX_MACH]).map((v) => +v.toFixed(6)),
    ),
  ].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const mid = 0.5 * (edges[i]! + edges[i + 1]!);
    const was = allowanceAt(before, 'cone', fineness, mid);
    const now = allowanceAt(after, 'cone', fineness, mid);
    const show = (a: typeof now) => (a === null ? 'none' : pct(a.halfWidth));
    const change =
      was === null
        ? now === null
          ? ''
          : '  (new)'
        : now !== null && now.halfWidth > was.halfWidth
          ? `  (WIDENED from ${show(was)})`
          : '  (unchanged)';
    out.push(
      `    Mach ${edges[i]!.toFixed(3)} to ${edges[i + 1]!.toFixed(3)}: ${show(now)}${change}`,
    );
  }
  return out;
}

it('runs TN 4233 rows below Mach 1.078 against the transonic solver (0022 section 8 item 9)', () => {
  const { cases, pending, notConverged, held } = rows();
  const out: string[] = [
    '# 0022 integration script on the blind readings A and B, third run (2026-10-24):',
    "# TN 4233's 30 rows below indicated Mach 1.078 against the transonic solver of 0013, r = 8",
    '# (0022 section 8 item 9, committed at 3b906c1 before the solves; solves by blind-run-3-solve.test.ts).',
    `# ${LABEL}.`,
    "# Earlier typings enter as 0022 4.2's earlier readings (labelled EARLIER READING; lower limits).",
    '# Unchanged: the script, the one-tenth rule, the boxes, the quadrature. Earlier outputs untouched.',
    '',
  ];
  const combos: string[] = [
    '# Every combination of every reading, blind run 3 (2026-10-24). Columns: r, u_meas, u_unc, |r|+u, reading; Cp at the nose stations in order.',
    '',
  ];
  const json: unknown[] = [];
  const newBoxes: Box[] = [];
  for (const c of cases) {
    const r = evaluateCase(c.input);
    const solverDrag = c.solve.levels[c.solve.levels.length - 1]!.drag;
    out.push(...summary(r, c.notes, solverDrag), '');
    combos.push(`${r.id}, Mach ${r.mach}`, ...combinationLines(r), '');
    newBoxes.push(boxOf(r));
    json.push({ label: LABEL, result: r, solverDrag, belowMach1: r.mach < 1 });
  }
  out.push(
    `HELD, NOT EVALUATED (below Mach 1, until a verification plan for the solver there is registered; the owner, 2026-10-24; ${held.length}):`,
    ...held.map((s) => `  ${s}`),
    '',
  );
  if (pending.length > 0)
    out.push(`PENDING (no solve yet, ${pending.length}):`, ...pending.map((s) => `  ${s}`), '');
  if (notConverged.length > 0)
    out.push(
      `NOT CONVERGED (no inviscid solution, so the row sets nothing; ${notConverged.length}):`,
      ...notConverged.map((s) => `  ${s}`),
      '',
    );

  // The cone boxes of the second run (TN 4233 at 1.078 and above, RM E51H17).
  const run2 = JSON.parse(readFileSync(join(here, 'out', 'blind-run-2.json'), 'utf8')) as unknown[];
  const before = (run2[run2.length - 1] as { boxes: Box[] }).boxes;
  const after = [...before, ...newBoxes];
  const cone4233 = before.find((b) => b.id.startsWith('TN 4233'))!;
  out.push(
    'Table: TN 4233 rows below indicated Mach 1.078 (r range over every reading and combination; a = max |r| + u):',
    '  table, tunnel        Mach    D_inv     r                    u_meas   u_unc          uncovered  refused  a',
  );
  for (const c of cases) {
    const r = evaluateCase(c.input);
    const rs = r.evaluations.map((e) => e.r);
    const uu = r.evaluations.map((e) => e.uUnc);
    out.push(
      `  ${c.input.id.replace('TN 4233, 7 deg cone, ', '').padEnd(32)} ${r.mach.toFixed(3)}  ${r.evaluations[0]!.inviscidDrag.toFixed(5)}  ${pct(Math.min(...rs))} to ${pct(Math.max(...rs))}  ${pct(r.evaluations[0]!.uMeas)}  ${pct(Math.min(...uu))} to ${pct(Math.max(...uu))}  ${pct(r.uncoveredShare)}  ${r.sets ? 'no' : 'YES'}  ${r.halfWidth === null ? 'none' : pct(r.halfWidth)}${r.mach < 1 ? '  (below Mach 1: outside 0013)' : ''}`,
    );
  }
  out.push(
    '',
    'Cone boxes after this run (0022 4.4: union of boxes, largest a_b; symmetric about the served value):',
  );
  for (const b of after) out.push(boxLine(b, after));
  out.push(
    `  the allowance along Mach for a ${cone4233.fineness.toFixed(3)} cal cone (TN 4233's boxes, ${(cone4233.fineness - BOX_FINENESS).toFixed(2)} to ${(cone4233.fineness + BOX_FINENESS).toFixed(2)} cal), against the second run:`,
    ...alongMach(
      before.filter((b) => b.id.startsWith('TN 4233')),
      after.filter((b) => b.id.startsWith('TN 4233')),
      cone4233.fineness,
    ),
    "  RM E51H17's box (Mach 3.80 to 3.90, 5.74 to 6.24 cal) is unchanged and alone.",
    '  Every cone box is formed from data seen before registration; never a test. Boxes below Mach 1 rest',
    "  on an inviscid solution outside 0013's verified range. Outside every box the nose stays",
    '  "numerical error of the inviscid solve; the model\'s own error is not in this band".',
    '',
    `# ${LABEL}.`,
  );
  json.push({ boxes: after, pending, notConverged, held });

  mkdirSync(join(here, 'out'), { recursive: true });
  writeFileSync(join(here, 'out', 'blind-run-3.out'), out.join('\n') + '\n');
  writeFileSync(join(here, 'out', 'blind-run-3-combinations.txt'), combos.join('\n') + '\n');
  writeFileSync(join(here, 'out', 'blind-run-3.json'), JSON.stringify(json) + '\n');
});
