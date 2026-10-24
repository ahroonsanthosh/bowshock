/**
 * The integration script (design record 0022 sections 4.3 to 4.5; 0014
 * section 10.7 (w)) on the fresh blind readings A and B in
 * ./blind-readings/, each fed as its own reading, beside the repository's
 * earlier typings as 0022 section 4.2's earlier readings (lower limits).
 *
 * Every set here was seen before (w) was registered: widening only, never
 * a test or a validation, and every box rests on data seen before
 * registration ((w) item 3, 0022 section 5).
 *
 * Run here: TN 3716 (table I(a), with fig. 3's zero-incidence points as
 * readings of their own, since 0022 4.1 and (w) item 3 name them as part of
 * the set) and RM A53E01 (table II(a), theta = 0 column). Not run, with the
 * question written down (task rule: no ambiguity resolved by choice): TN 4233
 * (the check orifices) and RM E51H17 (no stated Cp uncertainty). See
 * ./out/blind-run-questions.txt.
 *
 * The inviscid side is the seen runs' (./seen-runs.test.ts): the method of
 * characteristics, 640 intervals, start line at 1e-3 of the nose, the tip
 * cone ahead of it. No registered rule, threshold, floor, box or quadrature
 * is changed: the script in src/validation/nose-model-form.ts is used as is.
 *
 * Writes ./out/blind-run.out, ./out/blind-run.json and
 * ./out/blind-run-questions.txt. Run:
 *   ONLY=./blind-run.test.ts npx vitest run --config docs/research/nose-model-form/vitest.config.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import type { Body } from '../../../src/geometry/body';
import { noseRadius, noseTipSlope, type Nose } from '../../../src/geometry/nose';
import { characteristics } from '../../../src/validation/characteristics';
import {
  allowanceAt,
  boxOf,
  evaluateCase,
  publishedFloor,
  BOX_FINENESS,
  BOX_MACH,
  COVERAGE_LIMIT,
  type Box,
  type CaseResult,
  type MeasuredCase,
  type Reading,
  type ReadingStation,
} from '../../../src/validation/nose-model-form';
import { TN3716_ZERO_INCIDENCE } from '../../../src/validation/ogive-cylinder-tn3716';
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

/** One geometry quantity from a reader's geometry.csv (by source and a quantity prefix). */
function geometry(reader: 'A' | 'B', source: string, quantity: RegExp): Row | undefined {
  return readCsv(join(readings, reader, 'geometry.csv')).find(
    (r) => r.source === source && quantity.test(r.quantity!),
  );
}

/** The same quantity from both readers, which must agree where both recorded it. */
function bothGeometry(source: string, quantity: RegExp): { value: string; from: string } {
  const a = geometry('A', source, quantity);
  const b = geometry('B', source, quantity);
  if (a && b && a.value !== b.value)
    throw new Error(`${source} ${quantity}: A ${a.value} against B ${b.value}`);
  const v = a ?? b;
  if (!v) throw new Error(`${source} ${quantity}: recorded by neither reader`);
  return { value: v.value!, from: a && b ? 'A and B agree' : a ? 'A only' : 'B only' };
}

// ------------------------------------------------------ the inviscid side

/** The seen runs' inviscid path for a tangent ogive: the method of characteristics. */
function tangentOgiveInviscid(nose: Nose, cylinderLength: number, mach: number) {
  const body: Body = { nose, cylinderLength };
  const wall = characteristics(body, { mach, gamma, intervals: 640, start: 1e-3 }).wall;
  const q = 0.5 * gamma * mach ** 2;
  const tipCp = taylorMaccoll(
    mach,
    Math.atan(noseTipSlope(nose)),
    gamma,
  ).surfacePressureCoefficient;
  return (x: number) => {
    if (x <= wall[0]!.x) return tipCp;
    let k = 0;
    while (k < wall.length - 2 && wall[k + 1]!.x < x) k++;
    const a = wall[k]!;
    const b = wall[k + 1]!;
    return (a.p + ((b.p - a.p) * (x - a.x)) / (b.x - a.x) - 1) / q;
  };
}

/** A tangent ogive of length L calibers checked against the report's ogive radius (0022 4.2). */
function tangentOgive(L: number, printedRadius: number): Nose {
  const R = 0.5;
  const rho = (R * R + L * L) / (2 * R);
  // The printed radius is nominal (33-1/3 for 33.3125): agree to 0.1%.
  expect(Math.abs(rho / printedRadius - 1)).toBeLessThan(1e-3);
  return { shape: { kind: 'ogive', parameter: 1 }, length: L, baseRadius: R };
}

// ------------------------------------------------------------- TN 3716

function tn3716() {
  const L = num(bothGeometry('TN 3716', /^nose length/).value);
  const rhoPrinted = num(bothGeometry('TN 3716', /^ogive radius/).value);
  const mach = num(bothGeometry('TN 3716', /^free-stream Mach number/).value);
  const e = Math.abs(num(bothGeometry('TN 3716', /^Cp uncertainty/).value.replace('+-', '')));
  const bodyLength = num(bothGeometry('TN 3716', /^body length/).value);
  const nose = tangentOgive(L, rhoPrinted);

  // 4.3 item 1: the stations' x/d from the report's model figure (fig. 1),
  // which both readers read clearly; A lists them in two rows, B as n:x.
  const aStations = readCsv(join(readings, 'A', 'geometry.csv'))
    .filter((r) => r.source === 'TN 3716' && /^orifice stations/.test(r.quantity!))
    .flatMap((r) => r.value!.split(/\s+/).map(num));
  const bStations = geometry('B', 'TN 3716', /^orifice stations/)!
    .value!.split(/\s+/)
    .map((t) => num(t.split(':')[1]!));
  expect(aStations).toEqual(bStations);
  const fig1 = aStations.filter((x) => x <= L);

  const tableReading = (reader: 'A' | 'B'): Reading => {
    const rows = readCsv(join(readings, reader, 'tn3716_table1a.csv'));
    const stations: ReadingStation[] = [];
    for (const row of rows) {
      const x = num(row.station!);
      if (x > L) continue;
      // Printed station matched to its fig. 1 orifice (the printed ones agree exactly).
      const f = fig1.find((s) => Math.abs(s - x) < 1e-9);
      if (f === undefined) throw new Error(`TN 3716 ${reader}: station ${x} not in fig. 1`);
      stations.push({ x: f, cp: num(row.cp!), alternatives: alternativesOf(row) });
    }
    return { label: `reader ${reader}, table I(a) (blind reading, 2026-10-24)`, stations };
  };

  const figReading = (reader: 'A' | 'B'): Reading => {
    const rows = readCsv(join(readings, reader, 'tn3716_fig3.csv'));
    const stations: ReadingStation[] = [];
    for (const row of rows) {
      const xr = num(row.station!);
      if (xr > L + 0.04) continue;
      // Each plotted point at its nearest fig. 1 orifice, within the summed read error (0.04).
      const f = fig1.reduce((best, s) => (Math.abs(s - xr) < Math.abs(best - xr) ? s : best));
      if (Math.abs(f - xr) > 0.04)
        throw new Error(`TN 3716 fig. 3 ${reader}: ${xr} off every orifice`);
      stations.push({ x: f, cp: num(row.cp!), alternatives: alternativesOf(row) });
    }
    return {
      label: `reader ${reader}, fig. 3 points at their fig. 1 orifices (blind reading)`,
      stations,
    };
  };

  // 0022 4.2: the earlier typing as it stands, and 5fcc92b's -0.038 at x/d 2.95.
  const earlier: Reading = {
    label:
      'EARLIER READING (0022 4.2, a lower limit): the typing in src/validation/ogive-cylinder-tn3716.ts (2026-10-15), with 5fcc92b',
    stations: TN3716_ZERO_INCIDENCE.map((s) => ({
      x: s.xOverD,
      cp: s.cp,
      alternatives: [
        ...(s.alternative !== undefined ? [s.alternative] : []),
        ...(s.xOverD === 2.95 ? [-0.038] : []),
      ],
    })),
  };

  const reA = bothGeometry('TN 3716', /^(free-stream )?Reynolds number/);
  const input: MeasuredCase = {
    id: 'TN 3716, 3-caliber tangent ogive',
    family: 'tangent ogive',
    fineness: L,
    mach,
    reynolds: `${reA.value} per inch (0.45e6 on the body diameter, as the text states)`,
    radius: (x) => noseRadius(nose, Math.min(Math.max(x, 0), L)),
    inviscidCp: tangentOgiveInviscid(nose, bodyLength - L, mach),
    cpUncertainty: e,
    readings: [tableReading('A'), tableReading('B'), figReading('A'), figReading('B'), earlier],
    seen: true,
  };
  return {
    input,
    // (w) item 4 as registered: never below 14.4%; the unrounded figure beside it.
    floorRegistered: 0.144,
    floorComputed: publishedFloor([0.1068, 0.108], 0.0988, e),
    notes: [
      `  geometry (A and B agree): nose ${L} d, ogive radius ${rhoPrinted} d (tangent ogive: (R^2 + L^2) / 2R = ${((0.25 + L * L) / 1).toFixed(4)} d), body ${bodyLength} d, Mach ${mach}, Cp uncertainty +-${e} (p. 7). The afterbody length 7 d (B only) agrees with body 10 d less nose 3 d; the cylinder used is 7 d.`,
      '  stations: fig. 1 (both readers, clear print). B flags the table stations 1.22, 2.95 (and 3.62, off the nose) as blotted; 0022 4.3 item 1 takes x/d from the model figure, so those flags change nothing.',
      '  fig. 3: 0022 4.1 and (w) item 3 name "fig. 3, zero incidence" with table I(a) as the set; each reader\'s fig. 3 is a reading of its own, each point at its nearest fig. 1 orifice (all within 0.02 x/d). Read errors (A +-0.001, B +-0.003 in Cp) are not alternatives: neither reader flagged a fig. 3 point ambiguous.',
      "  earlier readings (0022 4.2): the file's typing (0.222 or 0.212 at x/d 0.56) and 5fcc92b's -0.038 at 2.95. The file header's fig. 3 value at 0.56 (about 0.213) lies between 0.212 and 0.222; r is linear and |Cp - Cp_inv| convex in each cell, so it cannot exceed those two.",
    ],
  };
}

// ------------------------------------------------------------ RM A53E01

function rmA53E01() {
  const L = num(bothGeometry('RM A53E01', /^nose length/).value);
  const rhoText = bothGeometry('RM A53E01', /^ogive radius/).value; // "33-1/3"
  const rhoPrinted = 33 + 1 / 3;
  expect(rhoText).toBe('33-1/3');
  const mach = num(bothGeometry('RM A53E01', /^free-stream Mach number/).value);
  const e = Math.abs(
    num(
      bothGeometry('RM A53E01', /^Cp uncertainty( \(in plane| in plane)/).value.replace('+-', ''),
    ),
  );
  const bodyLength = num(bothGeometry('RM A53E01', /body length/).value);
  const nose = tangentOgive(L, rhoPrinted);

  const tableReading = (reader: 'A' | 'B'): Reading => {
    const rows = readCsv(join(readings, reader, 'rma53e01_table2a.csv'));
    const stations: ReadingStation[] = [];
    rows.forEach((row) => {
      const x = num(row.station!);
      if (x > L) return;
      stations.push({ x, cp: num(row.cp!), alternatives: alternativesOf(row) });
    });
    // Fig. 1: one row at 0.444 d spacing from 0.44 d; the printed stations are k (4/9) d to print precision.
    stations.forEach((s, k) => {
      expect(Math.abs(s.x - ((k + 1) * 4) / 9)).toBeLessThan(0.006);
    });
    return {
      label: `reader ${reader}, table II(a), theta = 0 column (blind reading, 2026-10-24)`,
      stations,
    };
  };

  const re = bothGeometry('RM A53E01', /Reynolds number/);
  const input: MeasuredCase = {
    id: 'RM A53E01, 5.75-caliber tangent ogive (model 2)',
    family: 'tangent ogive',
    fineness: L,
    mach,
    reynolds:
      `${re.value} per inch (text p. 5 and table II heading); the summary (p. 2) says about 0.5e6 ` +
      'on the body diameter: UNRESOLVED, recorded only; the script uses Re for nothing',
    radius: (x) => noseRadius(nose, Math.min(Math.max(x, 0), L)),
    inviscidCp: tangentOgiveInviscid(nose, bodyLength - L, mach),
    cpUncertainty: e,
    readings: [tableReading('A'), tableReading('B')],
    seen: true,
  };
  return {
    input,
    floorRegistered: 0.161,
    floorComputed: publishedFloor([0.0298, 0.0298], 0.03074, e),
    notes: [
      `  geometry (A and B agree): nose ${L} d, ogive radius 33-1/3 d (tangent ogive: (R^2 + L^2) / 2R = ${(0.25 + L * L).toFixed(4)} d, within 0.1% of the printed nominal), model 2 body ${bodyLength} d, Mach ${mach}, Cp uncertainty +-${e} in the plane of symmetry (p. 6; +-0.006 elsewhere: the theta = 0 row is in the plane of symmetry). The angle-of-attack uncertainty +-0.1 deg (A only) is not used.`,
      '  stations: as printed in table II(a) (both readers agree), which are k (4/9) d to print precision, the 0.444 d spacing of fig. 1.',
      '  Reynolds number: the summary says about 0.5e6 on the body diameter (B), the text and the table heading 0.5e6 per inch (A and B). Recorded, not resolved; the script does not use Re.',
      '  earlier readings (0022 4.2): none. The table was read once on 2026-10-17 and not typed; no value of it is on record, so none can enter the envelope; the published floor stands for that reading.',
      "  only the theta = 0 column was read (both readers, under the brief's zero-roll rule); the 18 other roll columns at alpha = 0 are open (see the questions file).",
    ],
  };
}

// ----------------------------------------------------------------- output

const pct = (v: number) => `${(100 * v).toFixed(2)}%`;

function describeResult(
  r: CaseResult,
  floorRegistered: number,
  floorComputed: number,
  notes: string[],
): string[] {
  const lines = [
    `${r.id}, Mach ${r.mach}, ${r.fineness.toFixed(3)} cal`,
    `  Re: ${r.reynolds}`,
    ...notes,
    `  stations on the nose (x/d): ${r.stations.map((x) => x.toFixed(2)).join(', ')}`,
    `  inviscid nose drag (fine quadrature) ${r.inviscidNoseDrag.toFixed(6)}; at the stations ${r.evaluations[0]!.inviscidDrag.toFixed(6)}`,
    `  uncovered share of the inviscid drag ${pct(r.uncoveredShare)} (limit ${pct(COVERAGE_LIMIT)}): ${r.sets ? 'not refused by the one-tenth rule' : 'REFUSED by the one-tenth rule: sets nothing'}`,
    `  covered area ${pct(r.coveredArea)}; bias area (first orifice to shoulder) ${pct(r.biasArea)}`,
    '  per reading and combination (values at the nose stations, in order):',
    '    r        u_meas   u_unc    |r|+u    reading; Cp values',
  ];
  for (const e of r.evaluations) {
    lines.push(
      `    ${pct(e.r).padStart(7)}  ${pct(e.uMeas).padStart(6)}  ${pct(e.uUnc).padStart(6)}  ${pct(e.halfWidth).padStart(6)}   ${e.reading}; ${e.cps.join(' ')}`,
    );
  }
  const byReading = new Map<string, number>();
  for (const e of r.evaluations)
    byReading.set(e.reading, Math.max(byReading.get(e.reading) ?? 0, e.halfWidth));
  lines.push('  largest |r| + u per reading:');
  for (const [k, v] of byReading) lines.push(`    ${pct(v)}  ${k}`);
  const a = r.halfWidth;
  const floor = Math.max(floorRegistered, floorComputed);
  lines.push(
    `  a = max |r| + u over every reading and combination: ${a === null ? 'none (refused)' : pct(a)}`,
    `  floor ((w) item 4, a lower limit): registered ${pct(floorRegistered)}, from the published figures unrounded ${pct(floorComputed)}; the floor used is the registered ${pct(floor)}`,
    `  ${a === null ? 'refused: the floor alone' : a > floor ? `a exceeds the floor by ${pct(a - floor)}: the readings set the half-width` : `a lies below the floor by ${pct(floor - a)}: the floor sets the half-width`}`,
  );
  return lines;
}

function boxLine(b: Box, al: ReturnType<typeof allowanceAt>): string {
  return (
    `  ${b.family}, ${(b.fineness - BOX_FINENESS).toFixed(2)} to ${(b.fineness + BOX_FINENESS).toFixed(2)} cal, ` +
    `Mach ${(b.mach - BOX_MACH).toFixed(2)} to ${(b.mach + BOX_MACH).toFixed(2)} (${b.id}): ` +
    (al === null
      ? 'none'
      : `allowance ${pct(al.halfWidth)} (a_b ${b.halfWidth === null ? 'none' : pct(b.halfWidth)}, floor ${b.floor === null ? 'none' : pct(b.floor)})${al.seenOnly ? ', formed from data seen before registration' : ''}`)
  );
}

const QUESTIONS = `Questions stopped on (0022 and (w) do not settle them for this data), blind run of 2026-10-24.
Each set named here was NOT run: no r, no allowance and no box was computed for it.

1. TN 4233 (tables I(a) and I(b)): the check orifices. Both readers give orifices 16 and 17
   (flagged "check", on the opposite surface) at x/l .385 and .688, the same stations as orifices
   4 and 7, in every row (46 cells in I(a), 30 in I(b)). 0022 4.3 item 1 takes "the orifices on
   the nose (from the tip to the shoulder) at zero incidence", which includes them, but its
   quadrature (the trapezoid in r^2 between stations) is not defined for two orifices at one
   station. 0022 does not say whether they are left out (as the seen run left them out, the earlier
   typing holding them apart), taken as alternatives of orifices 4 and 7 (every combination, which
   can only widen), averaged with them, or something else. Left out gives the narrower a by
   construction, so it is not chosen here. Question: how do the check orifices enter?
   Also for the answer: which rows run (the seen run took indicated Mach 1.078 and above, where
   Taylor-Maccoll exists; the fresh tables have 2-foot rows to 1.400 and the 2-foot 1.080 row);
   A flags M 1.400 orifice 4 (.079) as "typo?" with no alternative; B notes the report does not
   say whether the 14-foot tunnel ran at the same Reynolds number (2.4e6 on the cone length).

2. RM E51H17 (fig. 4(a)): no stated Cp uncertainty. Neither reader found one (A searched PDF
   pages 1 to 14; B read 3 to 13 through the text layer, and says one the OCR missed cannot be
   ruled out). 0022 4.3 item 5 uses "the report's stated uncertainty e in Cp" and says nothing
   for a report that states none; section 8 item 6 and the dated addition to (w) do not either.
   Question: what e enters u_meas for this set (and should the PDF be searched once more by eye)?
   Also for the answer, not resolved here: (a) fig. 4(a) has two symbols per station (circle,
   meridian 0 deg; square, meridian 90 deg) at zero incidence: two measurements at one station,
   the same quadrature question as TN 4233's check orifices; (b) figure 2 lists stations 19 and
   19.5 in. and only one symbol pair is plotted near 19.5 (A: nothing at 19; B: one listed station
   has no point, not inferred which); (c) the Reynolds number: 3.85e6 in the summary with no basis,
   1.1e6 per foot in the text; (d) the earlier reading on record (sources.md, Cp about 0.031, one
   value) must stay in the envelope (0022 section 8 item 6), but it has no station recorded.
   Its result may only widen, only inside its own box (cones, about 6.0 cal, Mach 3.80 to 3.90),
   labelled as 0022 section 8 item 6 says, once these are answered.

Open but not stopped on (the run is fully defined on what was read; recorded for the coordinator):

3. RM A53E01: 0022 4.1 names "table II(a) zero-incidence column". Table II(a) is the alpha = 0
   table with 19 roll (theta) columns; both readers read only theta = 0 under the brief's zero-roll
   rule. If the other 18 columns are wanted (they are further measurements at the same stations,
   like TN 4233's check orifices), they must be read twice first and question 1's answer applies.
4. RM A53E01 Reynolds number: summary "about 0.5e6 based on body diameter", text and table heading
   "0.5e6 per inch". Recorded in the label; the script needs Re for nothing.
`;

it('runs the script on blind readings A and B (TN 3716, RM A53E01) and records the stops', () => {
  const out: string[] = [
    '# 0022 integration script on the blind readings A and B (2026-10-24)',
    `# ${LABEL}.`,
    '# Inputs: docs/research/nose-model-form/blind-readings/{A,B} (paired: 601 of 601 agree), and the',
    "# repository's earlier typings as 0022 4.2's earlier readings (labelled EARLIER READING; lower limits).",
    '# Inviscid side as the seen runs: method of characteristics, 640 intervals, start 1e-3 of the nose.',
    '# Unchanged: the script, the one-tenth rule, the floors, the boxes, the quadrature.',
    '',
  ];
  const json: unknown[] = [];
  const boxes: Box[] = [];
  for (const set of [tn3716(), rmA53E01()]) {
    const r = evaluateCase(set.input);
    out.push(...describeResult(r, set.floorRegistered, set.floorComputed, set.notes), '');
    const floor = Math.max(set.floorRegistered, set.floorComputed);
    boxes.push(boxOf(r, floor));
    json.push({
      label: LABEL,
      result: r,
      floorRegistered: set.floorRegistered,
      floorComputed: set.floorComputed,
    });
    expect(Math.abs(r.evaluations[0]!.inviscidDrag / r.inviscidNoseDrag - 1)).toBeLessThan(0.05);
  }
  out.push(
    'TN 4233, tables I(a) and I(b): NOT RUN. Stopped on question 1 (the check orifices); see blind-run-questions.txt.',
    'RM E51H17, fig. 4(a): NOT RUN. Stopped on question 2 (no stated Cp uncertainty); see blind-run-questions.txt.',
    '',
    'Allowance boxes (0022 4.4: union of boxes, largest a_b or floor; symmetric about the served value):',
  );
  const allowances: unknown[] = [];
  for (const b of boxes) {
    const al = allowanceAt(boxes, b.family, b.fineness, b.mach);
    out.push(boxLine(b, al));
    allowances.push({ box: b, allowance: al });
  }
  out.push(
    '  cones: none from this run (TN 4233 and RM E51H17 stopped); outside every box the nose stays',
    '  "numerical error of the inviscid solve; the model\'s own error is not in this band".',
    '',
    `# ${LABEL}.`,
  );
  json.push({ allowances, notRun: ['TN 4233 (question 1)', 'RM E51H17 (question 2)'] });

  mkdirSync(join(here, 'out'), { recursive: true });
  writeFileSync(join(here, 'out', 'blind-run.out'), out.join('\n') + '\n');
  writeFileSync(join(here, 'out', 'blind-run.json'), JSON.stringify(json, null, 1) + '\n');
  writeFileSync(join(here, 'out', 'blind-run-questions.txt'), QUESTIONS);
  console.log(out.join('\n'));
});
