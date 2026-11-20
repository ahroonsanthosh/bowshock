/**
 * The integration script (design record 0022 sections 4.3 to 4.5; 0014
 * section 10.7 (w)) on blind readings A and B of the two cone sets the first
 * blind run (./blind-run.test.ts, cce5621) stopped on, run after the owner's
 * answers were recorded (0022 section 8 items 7 and 8; the dated addition
 * under (w); commit c4908d3):
 *
 * - TN 4233, tables I(a) (Ames 2-foot) and I(b) (Ames 14-foot): the check
 *   orifices 16 and 17 enter as alternatives of orifices 4 and 7 (item 7);
 *   the earlier typing (src/validation/cone-cylinder-tn4233.ts) enters as
 *   0022 4.2's earlier reading where it has the same tunnel and Mach row.
 * - RM E51H17, fig. 4(a): the two meridian symbols at each station enter as
 *   alternatives (item 7); e is the largest stated Cp uncertainty among the
 *   other nose reports (item 8).
 *
 * Seen sets ((w) item 3): widening only, never a test or a validation,
 * formed from data seen before registration. RM E51H17 only inside its own
 * box (0022 section 8 item 6).
 *
 * The inviscid side is the seen runs' for a cone (./seen-runs.test.ts):
 * Taylor-Maccoll. No registered rule, threshold, floor, box or quadrature is
 * changed.
 *
 * Writes ./out/blind-run-2.out, ./out/blind-run-2.json (compact) and
 * ./out/blind-run-2-combinations.txt (every combination of every reading).
 * The first blind run's outputs are not touched. Run:
 *   ONLY=./blind-run-2.test.ts npx vitest run --config docs/research/nose-model-form/vitest.config.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
import { taylorMaccoll } from '../../../src/validation/taylor-maccoll';

const gamma = 1.4;
const here = dirname(fileURLToPath(import.meta.url));
const readings = join(here, 'blind-readings');
const LABEL =
  'Seen sets (0014 10.7 (w) item 3): widening only, never a test or a validation; ' +
  'formed from data seen before registration';

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

function geometryRows(reader: 'A' | 'B', source: string): Row[] {
  return readCsv(join(readings, reader, 'geometry.csv')).filter((r) => r.source === source);
}

/** The same quantity from both readers, which must agree where both recorded it. */
function bothGeometry(source: string, quantity: RegExp): string {
  const a = geometryRows('A', source).find((r) => quantity.test(r.quantity!));
  const b = geometryRows('B', source).find((r) => quantity.test(r.quantity!));
  if (a && b && a.value !== b.value)
    throw new Error(`${source} ${quantity}: A ${a.value} against B ${b.value}`);
  const v = a ?? b;
  if (!v) throw new Error(`${source} ${quantity}: recorded by neither reader`);
  return v.value!;
}

/** Merge a station's values: the first is the reading, every other distinct value an alternative. */
function station(x: number, values: number[]): ReadingStation {
  const distinct = values.filter((v, i) => values.indexOf(v) === i);
  return { x, cp: distinct[0]!, alternatives: distinct.slice(1) };
}

// ------------------------------------------------------------- TN 4233

/** The rows run: those where the seen runs' inviscid path (Taylor-Maccoll) is the inviscid solution. */
const TN4233_FIRST_MACH = 1.078;

interface Tn4233Set {
  inputs: { input: MeasuredCase; tunnel: string; rowsNotes: string[] }[];
  notRun: string[];
}

function tn4233(): Tn4233Set {
  // Geometry (A and B agree): half-angle 6 deg 59 min, cone 5.50 in, cylinder 1.347 in.
  // The same angle, worded differently: A "6 59'", B "6 deg 59 min".
  for (const reader of ['A', 'B'] as const) {
    const half = geometryRows(reader, 'TN 4233').find((r) =>
      /^cone (half-angle|semiapex angle)/.test(r.quantity!),
    );
    expect(["6 59'", '6 deg 59 min']).toContain(half!.value);
  }
  const angle = TN4233_CONE_HALF_ANGLE; // 6 deg 59 min, as the seen run
  const L = 0.5 / Math.tan(angle);
  const coneIn = num(bothGeometry('TN 4233', /^cone length/));
  const diaIn = num(bothGeometry('TN 4233', /^cylinder diameter/));
  expect(Math.abs(coneIn / diaIn / L - 1)).toBeLessThan(2e-3);
  const e = Math.abs(num(bothGeometry('TN 4233', /^Cp uncertainty/).replace('+-', '')));

  const tables: { file: string; tunnel: '2ft' | '14ft'; name: string }[] = [
    { file: 'tn4233_table1a.csv', tunnel: '2ft', name: 'table I(a), Ames 2- by 2-foot' },
    { file: 'tn4233_table1b.csv', tunnel: '14ft', name: 'table I(b), Ames 14-foot' },
  ];
  const inputs: Tn4233Set['inputs'] = [];
  const notRun: string[] = [];
  for (const t of tables) {
    const byReader = (['A', 'B'] as const).map((reader) => ({
      reader,
      rows: readCsv(join(readings, reader, t.file)),
    }));
    const machs = [...new Set(byReader[0]!.rows.map((r) => num(r.mach!)))].sort((a, b) => a - b);
    const machsB = [...new Set(byReader[1]!.rows.map((r) => num(r.mach!)))].sort((a, b) => a - b);
    expect(machsB).toEqual(machs);
    for (const mach of machs) {
      if (mach < TN4233_FIRST_MACH) {
        notRun.push(`${t.name}, indicated Mach ${mach.toFixed(3)}`);
        continue;
      }
      const readingsHere: Reading[] = [];
      const rowsNotes: string[] = [];
      for (const { reader, rows } of byReader) {
        const row = rows.filter((r) => num(r.mach!) === mach);
        const cellOf = (n: number) => row.find((r) => num(r.orifice!) === n);
        const stations: ReadingStation[] = [];
        for (let n = 1; n <= 11; n++) {
          const c = cellOf(n)!;
          const xl = num(c.station!);
          expect(xl).toBeLessThanOrEqual(1);
          expect(xl).toBeCloseTo(TN4233_ORIFICES[n - 1]!, 9);
          const values = [num(c.cp!), ...alternativesOf(c)];
          // 0022 section 8 item 7: the check orifice at the same station is an alternative.
          const check = n === 4 ? cellOf(16) : n === 7 ? cellOf(17) : undefined;
          if (check) {
            expect(num(check.station!)).toBeCloseTo(xl, 9);
            values.push(num(check.cp!), ...alternativesOf(check));
          }
          if (c.flag !== 'ok')
            rowsNotes.push(
              `  reader ${reader}, orifice ${n}: flagged "${c.flag}"${alternativesOf(c).length ? `, alternatives ${c.alternatives}` : ', no alternative given: enters as printed'}`,
            );
          stations.push(station(xl * L, values));
        }
        readingsHere.push({
          label: `reader ${reader}, ${t.name} (blind reading, 2026-10-24)`,
          stations,
        });
      }
      // 0022 4.2: the earlier typing, where it has this tunnel and Mach row.
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
      } else rowsNotes.push('  no earlier typing of this row (0022 4.2): fresh readings only');
      const cp = taylorMaccoll(mach, angle, gamma).surfacePressureCoefficient;
      inputs.push({
        tunnel: t.tunnel,
        rowsNotes,
        input: {
          id: `TN 4233, 7 deg cone, ${t.name}`,
          family: 'cone',
          fineness: L,
          mach,
          reynolds:
            '2.4e6 on the 5.50 in. cone length (text p. 7); the report does not say whether the 14-foot run used the same value (B)',
          radius: (x: number) => (0.5 * Math.min(Math.max(x, 0), L)) / L,
          inviscidCp: () => cp,
          cpUncertainty: e,
          readings: readingsHere,
          seen: true,
        },
      });
    }
  }
  // The earlier typing's rows must all have found their fresh row.
  for (const r of TN4233_ROWS.filter((r) => r.mach >= TN4233_FIRST_MACH))
    expect(inputs.some((i) => i.tunnel === r.tunnel && i.input.mach === r.mach)).toBe(true);
  return { inputs, notRun };
}

// ------------------------------------------------------------ RM E51H17

function rmE51H17() {
  const angleDeg = num(bothGeometry('RM E51H17', /^cone half-angle/));
  const coneIn = num(bothGeometry('RM E51H17', /^cone length/));
  const diaIn = num(bothGeometry('RM E51H17', /^maximum body diameter/));
  const mach = num(bothGeometry('RM E51H17', /Mach number/).split('+-')[0]!);
  const angle = (angleDeg * Math.PI) / 180;
  // As the seen run for TN 4233: the nose length from the stated half-angle.
  const L = 0.5 / Math.tan(angle);
  // Fig. 2's 21 in. on 3.50 in. gives 6.000 cal; the half-angle 4.77 deg gives 5.990: within 0.2%.
  expect(Math.abs(coneIn / diaIn / L - 1)).toBeLessThan(2e-3);
  const listed = bothGeometry('RM E51H17', /^orifice stations/)
    .split(/\s+/)
    .map(num);
  const onCone = listed.filter((s) => s <= coneIn);

  // 0022 section 8 item 8: the largest stated Cp uncertainty among TN 3716,
  // RM A53E01 and TN 4233, from both readers' geometry.csv.
  const stated: { source: string; quantity: string; value: number; page: string }[] = [];
  for (const source of ['TN 3716', 'RM A53E01', 'TN 4233'])
    for (const r of geometryRows('A', source).concat(geometryRows('B', source)))
      if (/^Cp uncertainty/.test(r.quantity!))
        stated.push({
          source,
          quantity: r.quantity!,
          value: Math.abs(num(r.value!.replace('+-', ''))),
          page: r.page!,
        });
  const largest = stated.reduce((a, b) => (b.value > a.value ? b : a));
  expect(largest.value).toBe(0.006);
  expect(largest.source).toBe('RM A53E01');

  const absent: number[] = [];
  const readingOf = (reader: 'A' | 'B'): Reading => {
    const rows = readCsv(join(readings, reader, 'rme51h17_fig4a.csv'));
    const at = new Map<number, number[]>();
    for (const r of rows) {
      const xr = num(r.station!);
      if (xr > coneIn + 0.15) continue;
      // Each point at its nearest fig. 2 station, within the summed read error (0.15 in.).
      const s = listed.reduce((best, v) => (Math.abs(v - xr) < Math.abs(best - xr) ? v : best));
      expect(Math.abs(s - xr)).toBeLessThanOrEqual(0.15);
      // Circle and square, and each reader's alternatives: every value an alternative (item 7).
      at.set(s, [...(at.get(s) ?? []), num(r.cp!), ...alternativesOf(r)]);
    }
    for (const s of onCone) if (!at.has(s) && !absent.includes(s)) absent.push(s);
    return {
      label: `reader ${reader}, fig. 4(a), both meridians (blind reading, 2026-10-24)`,
      stations: [...at.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([s, values]) => station(s / diaIn, values)),
    };
  };
  const rA = readingOf('A');
  const rB = readingOf('B');
  const cp = taylorMaccoll(mach, angle, gamma).surfacePressureCoefficient;
  const input: MeasuredCase = {
    id: 'RM E51H17, 4.77 deg cone',
    family: 'cone',
    fineness: L,
    mach,
    reynolds:
      '3.85e6 in the summary (basis not stated) and 1.1e6 per foot in the text, both far below flight; ' +
      'the basis conflict is recorded, not resolved',
    radius: (x: number) => (0.5 * Math.min(Math.max(x, 0), L)) / L,
    inviscidCp: () => cp,
    cpUncertainty: largest.value,
    readings: [rA, rB],
    seen: true,
  };
  const notes = [
    `  geometry (A and B agree): half-angle ${angleDeg} deg, cone ${coneIn} in., diameter ${diaIn} in. (${(coneIn / diaIn).toFixed(3)} cal; the half-angle gives ${L.toFixed(3)} cal, used as for TN 4233), Mach ${mach} (+-0.04 stated; not an alternative). B's boundary-layer remark (displacement raises cone Cp to about 0.025, p. 7) is recorded only.`,
    `  e = +-${largest.value}: 0022 section 8 item 8, the largest stated Cp uncertainty among the other nose reports, RM A53E01's "${largest.quantity}" (p. ${largest.page}). Stated values found: ${stated
      .filter((s, i) => stated.findIndex((t) => t.source === s.source && t.value === s.value) === i)
      .map((s) => `${s.source} +-${s.value}`)
      .join(
        ', ',
      )}. The +-0.006 is the largest stated, as item 8 says; it is RM A53E01's figure off the plane of symmetry (its in-plane figure is +-0.004), and the largest in-plane figure is TN 3716's +-0.005. Disclosed for the coordinator, not chosen between.`,
    `  stations: fig. 2's list on the cone (${onCone.join(', ')} in.), x/d = in. / ${diaIn}. Each plotted point at its nearest listed station; circle (meridian 0 deg) and square (90 deg) and every reader alternative enter as alternatives (0022 section 8 item 7).`,
    `  absent (listed in fig. 2, no plotted point; 0022 section 8 item 8): ${absent.length ? absent.map((s) => `${s} in.`).join(', ') : 'none'}`,
    '  earlier reading on record (sources.md, one value, Cp about 0.031, no station): it cannot enter the script, which needs a station for every value, so it is recorded here and does not enter the envelope (0022 4.2 allows no more for it).',
    '  only inside its own box (0022 section 8 item 6): cones, its fineness and Mach number; no other box is touched.',
  ];
  return { input, notes, absent };
}

// ----------------------------------------------------------------- output

const pct = (v: number) => `${(100 * v).toFixed(2)}%`;

function summary(r: CaseResult, notes: string[], listEvery: boolean): string[] {
  const lines = [
    `${r.id}, Mach ${r.mach}, ${r.fineness.toFixed(3)} cal`,
    `  Re: ${r.reynolds}`,
    ...notes,
    `  stations on the nose (x/d): ${r.stations.map((x) => x.toFixed(3)).join(', ')}`,
    `  inviscid nose drag (fine quadrature) ${r.inviscidNoseDrag.toFixed(6)}; at the stations ${r.evaluations[0]!.inviscidDrag.toFixed(6)}`,
    `  uncovered share of the inviscid drag ${pct(r.uncoveredShare)} (limit ${pct(COVERAGE_LIMIT)}): ${r.sets ? 'not refused by the one-tenth rule' : 'REFUSED by the one-tenth rule: sets nothing'}`,
    `  covered area ${pct(r.coveredArea)}; bias area (first orifice to shoulder) ${pct(r.biasArea)}`,
  ];
  if (listEvery) {
    lines.push(
      '  per reading and combination (values at the nose stations, in order):',
      '    r        u_meas   u_unc    |r|+u    reading; Cp values',
      ...combinationLines(r),
    );
  }
  lines.push('  per reading (every combination is in blind-run-2-combinations.txt):');
  const readingsSeen = [...new Set(r.evaluations.map((e) => e.reading))];
  for (const k of readingsSeen) {
    const ev = r.evaluations.filter((e) => e.reading === k);
    const rs = ev.map((e) => e.r);
    lines.push(
      `    ${k}: ${ev.length} combination(s), r ${pct(Math.min(...rs))} to ${pct(Math.max(...rs))}, u_meas ${pct(ev[0]!.uMeas)}, u_unc ${pct(Math.min(...ev.map((e) => e.uUnc)))} to ${pct(Math.max(...ev.map((e) => e.uUnc)))}, largest |r| + u ${pct(Math.max(...ev.map((e) => e.halfWidth)))}`,
    );
  }
  lines.push(
    `  a = max |r| + u over every reading and combination: ${r.halfWidth === null ? 'none (refused)' : pct(r.halfWidth)}`,
    '  floor: none published for this set (0022 section 5 (a)); ' +
      (r.evaluations.some((e) => e.reading.startsWith('EARLIER'))
        ? 'the earlier typing, carried in the envelope above, does its job'
        : 'no earlier reading of this row could enter'),
  );
  return lines;
}

function combinationLines(r: CaseResult): string[] {
  return r.evaluations.map(
    (e) =>
      `    ${pct(e.r).padStart(7)}  ${pct(e.uMeas).padStart(6)}  ${pct(e.uUnc).padStart(6)}  ${pct(e.halfWidth).padStart(6)}   ${e.reading}; ${e.cps.join(' ')}`,
  );
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

/** The allowance along Mach at one fineness, between the box edges (the union, never the hull). */
function allowanceAlongMach(boxes: readonly Box[], fineness: number): string[] {
  const edges = [
    ...new Set(
      boxes.flatMap((b) => [b.mach - BOX_MACH, b.mach + BOX_MACH]).map((v) => +v.toFixed(6)),
    ),
  ].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const mid = 0.5 * (edges[i]! + edges[i + 1]!);
    const al = allowanceAt(boxes, 'cone', fineness, mid);
    out.push(
      `    Mach ${edges[i]!.toFixed(3)} to ${edges[i + 1]!.toFixed(3)}: ${al === null ? 'none (numerical error only)' : pct(al.halfWidth)}`,
    );
  }
  return out;
}

it('runs TN 4233 and RM E51H17 under the owner answers of 2026-10-24 (0022 section 8 items 7, 8)', () => {
  const out: string[] = [
    '# 0022 integration script on the blind readings A and B, second run (2026-10-24):',
    '# TN 4233 and RM E51H17, after the owner answered the questions of the first run',
    '# (0022 section 8 items 7 and 8; dated addition under 0014 10.7 (w); commit c4908d3).',
    `# ${LABEL}.`,
    "# Inviscid side as the seen runs for a cone: Taylor-Maccoll. Earlier typings enter as 0022 4.2's",
    '# earlier readings (labelled EARLIER READING; lower limits). Unchanged: the script, the one-tenth',
    '# rule, the floors, the boxes, the quadrature. The first run (blind-run.out) is not touched.',
    '',
  ];
  const combos: string[] = [
    '# Every combination of every reading, blind run 2 (2026-10-24). Columns: r, u_meas, u_unc, |r|+u, reading; Cp at the nose stations in order.',
    '',
  ];
  const json: unknown[] = [];
  const t4233Boxes: Box[] = [];

  const t = tn4233();
  for (const { input, rowsNotes } of t.inputs) {
    const r = evaluateCase(input);
    out.push(...summary(r, rowsNotes, true), '');
    combos.push(`${r.id}, Mach ${r.mach}`, ...combinationLines(r), '');
    t4233Boxes.push(boxOf(r));
    json.push({ label: LABEL, result: r });
  }
  out.push(
    `TN 4233 rows NOT RUN (${t.notRun.length}): indicated Mach below ${TN4233_FIRST_MACH}, where the seen runs'`,
    '  inviscid path (Taylor-Maccoll) is not the inviscid solution (0013 calls it exact at indicated Mach',
    '  1.078 and above only); 0022 4.3 item 2 would need the finest fitted grid of the transonic solver,',
    '  which the seen runs did not use. See the question at the end of this file.',
    ...t.notRun.map((s) => `    ${s}`),
    '',
  );

  const e51 = rmE51H17();
  const re = evaluateCase(e51.input);
  out.push(...summary(re, e51.notes, false), '');
  combos.push(`${re.id}, Mach ${re.mach}`, ...combinationLines(re), '');
  const e51Box = boxOf(re);
  json.push({ label: LABEL, result: re, absentStations: e51.absent });

  const allBoxes = [...t4233Boxes, e51Box];
  out.push('Cone boxes (0022 4.4: union of boxes, largest a_b; symmetric about the served value):');
  for (const b of allBoxes) out.push(boxLine(b, allBoxes));
  out.push(
    `  the allowance along Mach for a ${t4233Boxes[0]!.fineness.toFixed(3)} cal cone (TN 4233's boxes, ${(t4233Boxes[0]!.fineness - BOX_FINENESS).toFixed(2)} to ${(t4233Boxes[0]!.fineness + BOX_FINENESS).toFixed(2)} cal):`,
    ...allowanceAlongMach(t4233Boxes, t4233Boxes[0]!.fineness),
    `  RM E51H17's box stands alone (cones ${(e51Box.fineness - BOX_FINENESS).toFixed(2)} to ${(e51Box.fineness + BOX_FINENESS).toFixed(2)} cal, Mach ${(e51Box.mach - BOX_MACH).toFixed(2)} to ${(e51Box.mach + BOX_MACH).toFixed(2)}); it widens nothing else.`,
    '  Every cone box is formed from data seen before registration; never a test. Outside every box the nose',
    '  stays "numerical error of the inviscid solve; the model\'s own error is not in this band".',
    '',
    'Question for the coordinator (these rows were not run; nothing was chosen for them):',
    `  The owner asked for every row of tables I(a) and I(b). ${t.notRun.length} rows lie below indicated Mach ${TN4233_FIRST_MACH},`,
    "  where the seen runs' inviscid path does not apply. Should they be run against the transonic solver's",
    '  finest fitted grid (0022 4.3 item 2), which needs that solve for this body at each row? They would',
    '  add cone boxes from Mach 0.55 to 1.114 and could raise the allowance where those overlap the boxes',
    '  above (Mach 1.028 to 1.114). Until then no cone box below Mach 1.028 exists.',
    '',
    `# ${LABEL}.`,
  );
  json.push({ boxes: allBoxes, notRun: t.notRun });

  mkdirSync(join(here, 'out'), { recursive: true });
  writeFileSync(join(here, 'out', 'blind-run-2.out'), out.join('\n') + '\n');
  writeFileSync(join(here, 'out', 'blind-run-2-combinations.txt'), combos.join('\n') + '\n');
  writeFileSync(join(here, 'out', 'blind-run-2.json'), JSON.stringify(json) + '\n');
  console.log(out.join('\n'));
});
