/**
 * The integration script's first runs (design record 0022 section 4.3,
 * "Fixed before any reading"; 0014 section 10.7 (w) item 5): on the
 * typings already in the repository, TN 3716 and TN 4233, and on nothing
 * else. These are RUNS ON SEEN DATA: a check of the script, labelled so.
 * The typings enter the final envelope only as 0022 4.2's earlier
 * readings (so in practice they are lower limits on the final allowance);
 * they are not readings under (w), and never a test. No source was opened
 * for them.
 *
 * Writes ./out/seen-runs.out (the table) and ./out/seen-runs.json. Run:
 *   npx vitest run --config docs/research/nose-model-form/vitest.config.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import type { Body } from '../../../src/geometry/body';
import { noseRadius, noseTipSlope } from '../../../src/geometry/nose';
import { characteristics } from '../../../src/validation/characteristics';
import {
  TN4233_CONE_HALF_ANGLE,
  TN4233_CP_UNCERTAINTY,
  TN4233_ORIFICES,
  TN4233_ROWS,
} from '../../../src/validation/cone-cylinder-tn4233';
import {
  allowanceAt,
  boxOf,
  evaluateCase,
  publishedFloor,
  type CaseResult,
  type MeasuredCase,
} from '../../../src/validation/nose-model-form';
import {
  TN3716_CP_UNCERTAINTY,
  TN3716_MACH,
  TN3716_NOSE_CALIBERS,
  TN3716_ZERO_INCIDENCE,
} from '../../../src/validation/ogive-cylinder-tn3716';
import { taylorMaccoll } from '../../../src/validation/taylor-maccoll';

const gamma = 1.4;
const here = dirname(fileURLToPath(import.meta.url));
const LABEL =
  'RUN ON SEEN DATA (0022 section 5 (b)): a check of the script; the typings enter the final ' +
  "envelope only as 0022 4.2's earlier readings (so in practice they are lower limits on the " +
  'final allowance); not a reading under (w), never a test';
const TN4233_NOTE = [
  '  Disclosed (independent review of 3e26e9a): the trapezoid spreads the drop at x/l 0.994',
  "  (inside the shoulder's expansion) over x/d 3.845 to 4.057, far more area than the expansion",
  "  reaches, so this cone's r is probably overstated (safe: it widens). It must not be quoted as",
  "  the cone's error. Every orifice on the nose counts: the rule fixed before reading (0022 4.3).",
];

/** TN 3716: the 3-caliber tangent ogive at Mach 1.98, against the method of characteristics. */
function tn3716(): { input: MeasuredCase; floor: number } {
  const nose = {
    shape: { kind: 'ogive', parameter: 1 } as const,
    length: TN3716_NOSE_CALIBERS,
    baseRadius: 0.5,
  };
  const body: Body = { nose, cylinderLength: 7 };
  // 640 intervals, start line at 1e-3 of the nose: converged to well below
  // 1e-5 in Cp (tests/validation/characteristics.test.ts).
  const wall = characteristics(body, { mach: TN3716_MACH, gamma, intervals: 640, start: 1e-3 }).wall;
  const q = 0.5 * gamma * TN3716_MACH ** 2;
  const tipCp = taylorMaccoll(TN3716_MACH, Math.atan(noseTipSlope(nose)), gamma)
    .surfacePressureCoefficient;
  const inviscidCp = (x: number) => {
    // Ahead of the march's first wall point (1e-3 of the nose), the tip cone.
    if (x <= wall[0]!.x) return tipCp;
    let k = 0;
    while (k < wall.length - 2 && wall[k + 1]!.x < x) k++;
    const a = wall[k]!;
    const b = wall[k + 1]!;
    return (a.p + ((b.p - a.p) * (x - a.x)) / (b.x - a.x) - 1) / q;
  };
  const stations = TN3716_ZERO_INCIDENCE.map((s) => ({
    x: s.xOverD,
    cp: s.cp,
    alternatives: [
      ...(s.alternative !== undefined ? [s.alternative] : []),
      // 0022 section 4.2: the first typing's -0.038 at x/d 2.95 (5fcc92b).
      ...(s.xOverD === 2.95 ? [-0.038] : []),
    ],
  }));
  return {
    input: {
      id: 'TN 3716, 3-caliber tangent ogive',
      family: 'tangent ogive',
      fineness: TN3716_NOSE_CALIBERS,
      mach: TN3716_MACH,
      reynolds: '0.44e6 on the diameter',
      radius: (x) => noseRadius(nose, Math.min(Math.max(x, 0), nose.length)),
      inviscidCp,
      cpUncertainty: TN3716_CP_UNCERTAINTY,
      readings: [
        {
          label: 'the typing in src/validation/ogive-cylinder-tn3716.ts (2026-10-15), with 5fcc92b',
          stations,
        },
      ],
      seen: true,
    },
    // Section 5 (a): from the published integration (sources.md).
    floor: publishedFloor([0.1068, 0.108], 0.0988, TN3716_CP_UNCERTAINTY),
  };
}

/** TN 4233: the 7 deg cone, each row at indicated Mach 1.078 and above, against Taylor-Maccoll. */
function tn4233(): MeasuredCase[] {
  const L = 0.5 / Math.tan(TN4233_CONE_HALF_ANGLE);
  const onCone = TN4233_ORIFICES.map((xl, i) => ({ xl, i })).filter((o) => o.xl <= 1);
  return TN4233_ROWS.filter((row) => row.mach >= 1.078).map((row) => {
    const cp = taylorMaccoll(row.mach, TN4233_CONE_HALF_ANGLE, gamma).surfacePressureCoefficient;
    return {
      id: `TN 4233, 7 deg cone, ${row.tunnel} tunnel`,
      family: 'cone',
      fineness: L,
      mach: row.mach,
      reynolds: '2.4e6 on the cone length',
      radius: (x: number) => (0.5 * Math.min(Math.max(x, 0), L)) / L,
      inviscidCp: () => cp,
      cpUncertainty: TN4233_CP_UNCERTAINTY,
      readings: [
        {
          label: 'the typing in src/validation/cone-cylinder-tn4233.ts',
          stations: onCone.map((o) => ({ x: o.xl * L, cp: row.cp[o.i]! })),
        },
      ],
      seen: true,
    };
  });
}

const pct = (v: number) => `${(100 * v).toFixed(2)}%`;

function describeResult(r: CaseResult, floor: number | null): string[] {
  const rs = r.evaluations.map((e) => e.r);
  const best = Math.max(...r.evaluations.map((e) => e.halfWidth));
  const lines = [
    `${r.id}, Mach ${r.mach}, ${r.fineness.toFixed(3)} cal, Re ${r.reynolds}`,
    `  stations on the nose: ${r.stations.map((x) => x.toFixed(3)).join(', ')}`,
    `  inviscid nose drag (fine quadrature) ${r.inviscidNoseDrag.toFixed(6)}; at the stations ${r.evaluations[0]!.inviscidDrag.toFixed(6)}`,
    `  measured, like for like: ${Math.min(...r.evaluations.map((e) => e.measuredDrag)).toFixed(6)} to ${Math.max(...r.evaluations.map((e) => e.measuredDrag)).toFixed(6)} over ${r.evaluations.length} evaluation(s)`,
    `  r ${pct(Math.min(...rs))} to ${pct(Math.max(...rs))}; u_meas ${pct(r.evaluations[0]!.uMeas)}; u_unc up to ${pct(Math.max(...r.evaluations.map((e) => e.uUnc)))}`,
    `  outside the orifices ${pct(r.uncoveredShare)} of the inviscid drag (limit 10%): ${r.sets ? 'sets' : 'SETS NOTHING (coverage)'}`,
    `  largest |r| + u: ${pct(best)}${r.sets ? '' : ' (not used: coverage)'}${floor !== null ? `; published floor ${pct(floor)}` : '; no published floor (the typing is the earlier reading, 4.2)'}`,
  ];
  return lines;
}

it('runs the script on the seen typings and records the result as runs on seen data', () => {
  const out: string[] = [
    '# 0022 integration script: first runs, ON SEEN DATA ONLY',
    `# ${LABEL}.`,
    '# Inputs: the typings already in the repository (TN 3716, TN 4233); no source opened.',
    '',
  ];
  const json: unknown[] = [];

  const a = tn3716();
  const ra = evaluateCase(a.input);
  out.push(...describeResult(ra, a.floor), '');
  const boxes = [boxOf(ra, a.floor)];
  json.push({ label: LABEL, result: { ...ra, evaluations: ra.evaluations }, floor: a.floor });

  for (const c of tn4233()) {
    const r = evaluateCase(c);
    out.push(...describeResult(r, null), ...TN4233_NOTE, '');
    boxes.push(boxOf(r));
    json.push({ label: LABEL, result: r, floor: null });
  }

  out.push('Allowance at the measured cases (union of boxes; floor a lower limit):');
  for (const b of boxes) {
    const al = allowanceAt(boxes, b.family, b.fineness, b.mach);
    out.push(
      `  ${b.id}, Mach ${b.mach}: ${al === null ? 'none (numerical error only)' : `${pct(al.halfWidth)} from ${al.boxes.length} box(es)${al.seenOnly ? ', formed from data seen before registration' : ''}`}`,
    );
  }
  out.push('', `# ${LABEL}.`);

  mkdirSync(join(here, 'out'), { recursive: true });
  writeFileSync(join(here, 'out', 'seen-runs.out'), out.join('\n') + '\n');
  writeFileSync(join(here, 'out', 'seen-runs.json'), JSON.stringify(json, null, 1) + '\n');
  console.log(out.join('\n'));

  // The script's own consistency on real geometry: the station quadrature
  // of the inviscid solution lies near its fine integral.
  expect(Math.abs(ra.evaluations[0]!.inviscidDrag / ra.inviscidNoseDrag - 1)).toBeLessThan(0.05);
});
