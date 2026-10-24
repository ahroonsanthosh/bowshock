/**
 * The evaluation of 0014 10.7 (y): the transonic solver of 0013 below and
 * near Mach 1 on TN 4233's 7 deg cone-cylinder, judged by the rules
 * registered there before any such value existed
 * (src/validation/subsonic-verification.ts: the rungs, R1 to R5, the
 * tolerances (a) to (g) and (h), the absolute scale S and the floor rule,
 * the 800-radius test, the per-station allowance, the ordering check).
 * Nothing here reads a measured value: the solves, the 800-radius runs and,
 * if the owner ran it, the independent code's results.
 *
 * Inputs:
 * - ./out/blind-run-3/solves/M<mach>.json (the CPU job) or, with
 *   SOLVES=solves-gpu, the owner's GPU run (then ./owner-kit/match/gpu-M0.800.json
 *   must record a passed match test);
 * - ./out/far-800/M<mach>.json (far-800.test.ts);
 * - ./su2/results/M<mach>.json (the owner's SU2 runs; ./su2/README.txt).
 *
 * Writes ./out/verify-subsonic.out and .json. Run:
 *   ONLY=./verify-subsonic.test.ts npx vitest run --config docs/research/nose-model-form/vitest.config.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { TN4233_CONE_HALF_ANGLE } from '../../../src/validation/cone-cylinder-tn4233';
import {
  far800Contained,
  judgeRung,
  linearisedConeCylinderCp,
  NEAR_SONIC_RUNGS,
  orderingCheck,
  SUBSONIC_RUNGS,
  ZERO_DRAG_RUNG,
  type RungInput,
  type RungVerdict,
} from '../../../src/validation/subsonic-verification';
import type { DomainAllowance } from '../../../src/verification/domain-allowance';
import { body, STATIONS_RADII } from './solve-common';
import type { AllowanceRecord, GridRecords, GridResult } from './solve-common';

const here = dirname(fileURLToPath(import.meta.url));
const solvesDir = join(here, 'out', 'blind-run-3', process.env.SOLVES ?? 'solves');
const gpu = (process.env.SOLVES ?? 'solves') === 'solves-gpu';

interface Solve {
  readonly mach: number;
  readonly converged: boolean;
  readonly reason?: string;
  readonly engine?: string;
  readonly levels: readonly (GridResult & { readonly records?: GridRecords })[];
  readonly allowances?: { readonly farField: AllowanceRecord; readonly cylinder: AllowanceRecord } | null;
}

interface Far800 {
  readonly mach: number;
  readonly path: string;
  readonly converged: boolean;
  readonly reason?: string;
  readonly drags?: readonly number[];
  readonly allowance?: DomainAllowance;
  readonly verdict?: ReturnType<typeof far800Contained>;
}

interface Code {
  readonly mach: number;
  /** The finest level's nose pressure drag on the base area and the family's band (su2/README.txt). */
  readonly drag: number;
  readonly band: number;
  readonly levels: number;
}

function readJson<T>(file: string): T | null {
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : null;
}

const tau = Math.tan(TN4233_CONE_HALF_ANGLE);
const L = body.nose.length;

function inputOf(solve: Solve, floor: number | null): RungInput | string {
  if (!solve.converged) return `not converged: ${solve.reason ?? ''}`;
  if (solve.levels.length < 4) return 'fewer than four grids';
  if (solve.levels.some((l) => l.records === undefined)) return 'a grid without the records of (y) (solved before the registration)';
  if (!solve.allowances) return 'no domain allowances recorded';
  const far = solve.allowances.farField;
  return {
    mach: solve.mach,
    levels: solve.levels.map((l) => ({
      refinement: l.refinement,
      drag: l.drag,
      noise: l.noise,
      stationCp: l.records!.stationCp,
      loss: l.records!.loss,
    })),
    farField: far.result,
    cylinder: solve.allowances.cylinder.result,
    stationFar: far.stationAllowance,
    floor,
    linear: STATIONS_RADII.map((x) => linearisedConeCylinderCp(tau, L, solve.mach, x).cp),
    code: readJson<Code>(join(here, 'su2', 'results', `M${solve.mach.toFixed(3)}.json`)) ?? undefined,
  };
}

function lines(v: RungVerdict): string[] {
  const out = [
    `Mach ${v.mach.toFixed(3)}: ${v.verdict.toUpperCase()}`,
    `  CD_r8 ${v.value.toExponential(6)}; procedure ${v.estimate.kind}${v.estimate.kind === 'monotone' ? ` (order ${v.estimate.order.toFixed(2)}, extrapolated ${v.estimate.extrapolated.toExponential(6)})` : ''}`,
    `  band ${v.band === null ? 'none' : v.band.toExponential(3)} = grids ${v.parts.grids?.toExponential(3) ?? 'none'} + floor ${v.parts.floor.toExponential(3)} + far ${v.parts.farField?.toExponential(3) ?? 'refused'} + cylinder ${v.parts.cylinder?.toExponential(3) ?? 'refused'}`,
  ];
  for (const [k, c] of Object.entries(v.criteria)) out.push(`  (${k}) ${c.status}: ${c.detail}`);
  out.push(
    `  station bands (r = 2, 4, 8): ${v.stationBands.map((b) => `${b.kind} ${b.band.toExponential(2)}`).join('; ')}`,
  );
  if (v.floorSet !== null) out.push(`  floor set by this rung: ${v.floorSet.toExponential(3)} (absolute, applied to every subsonic row)`);
  return out;
}

it('judges the subsonic and near-sonic rungs by 0014 10.7 (y)', () => {
  const out: string[] = [
    '# 0014 10.7 (y): the transonic solver below and near Mach 1, judged by the registered rules',
    `# solves: ${solvesDir}${gpu ? ' (the owner’s GPU run)' : ' (the CPU job)'}; written ${new Date().toISOString()}`,
    '',
  ];
  const json: Record<string, unknown> = { solves: solvesDir };
  if (gpu) {
    const match = readJson<{ passed: boolean }>(join(here, 'owner-kit', 'match', 'gpu-M0.800.json'));
    out.push(
      `GPU match test (item 5 (h)): ${match === null ? 'NOT RUN: no GPU row counts' : match.passed ? 'passed' : 'FAILED: no GPU row counts'}`,
      '',
    );
    json.match = match;
  }

  // The zero-drag rung first: it sets the floor.
  const verdicts: RungVerdict[] = [];
  const skipped: string[] = [];
  let floor: number | null = null;
  const ordered = [ZERO_DRAG_RUNG, ...SUBSONIC_RUNGS.filter((m) => m !== ZERO_DRAG_RUNG)];
  for (const mach of ordered) {
    const solve = readJson<Solve>(join(solvesDir, `M${mach.toFixed(3)}.json`));
    if (solve === null) {
      skipped.push(`Mach ${mach.toFixed(3)}: no solve yet`);
      continue;
    }
    if (mach !== ZERO_DRAG_RUNG && floor === null) {
      skipped.push(`Mach ${mach.toFixed(3)}: waits for the floor from the Mach ${ZERO_DRAG_RUNG} rung`);
      continue;
    }
    const input = inputOf(solve, floor);
    if (typeof input === 'string') {
      skipped.push(`Mach ${mach.toFixed(3)}: ${input}`);
      continue;
    }
    const v = judgeRung(input);
    verdicts.push(v);
    if (v.floorSet !== null) floor = v.floorSet;
    out.push(...lines(v), '');
  }
  const ordering = orderingCheck(
    verdicts.filter((v) => v.band !== null).map((v) => ({ mach: v.mach, drag: v.value, band: v.band! })),
  );
  out.push(
    `ordering across rungs (item 5 (c)): ${ordering.ok ? 'pass' : 'FAIL'}`,
    ...ordering.violations.map((s) => `  ${s}`),
    '',
  );
  if (skipped.length > 0) out.push('not judged:', ...skipped.map((s) => `  ${s}`), '');

  // The near-sonic rungs: the 800-radius test.
  const far800: Record<string, unknown> = {};
  out.push('the 800-radius test (addendum item 4):');
  let far800Pass: boolean | null = true;
  for (const mach of NEAR_SONIC_RUNGS) {
    const f = readJson<Far800>(join(here, 'out', 'far-800', `M${mach.toFixed(3)}.json`));
    if (f === null) {
      out.push(`  Mach ${mach.toFixed(3)}: not run`);
      far800Pass = null;
      continue;
    }
    far800[mach] = f;
    if (!f.converged) {
      out.push(`  Mach ${mach.toFixed(3)}: NOT CONVERGED by ${f.path}: ${f.reason ?? ''}; the rows at 1.001 to 1.041 stay out`);
      far800Pass = false;
      continue;
    }
    out.push(`  Mach ${mach.toFixed(3)} (${f.path}): ${f.verdict!.detail}`);
    if (!f.verdict!.contained) far800Pass = false;
  }
  out.push(
    far800Pass === null
      ? '  verdict: incomplete; the rows at Mach 1.001 to 1.041 wait'
      : far800Pass
        ? '  verdict: pass; the moved family’s allowance stands for the rows at Mach 1.001 to 1.041'
        : '  verdict: FAIL; the moved family’s allowance is withdrawn and the rows at Mach 1.001 to 1.041 stay out',
    '',
  );

  // Every row's own band, by the same rules, for 0022 (u_num and the labels).
  out.push('every TN 4233 row below Mach 1.078 with a solve, by the same rules (the floor as set above):');
  const rows: Record<string, unknown> = {};
  for (const file of existsSync(solvesDir) ? readdirSorted(solvesDir) : []) {
    const solve = readJson<Solve>(join(solvesDir, file))!;
    if (solve.mach >= 1.078) continue;
    const input = inputOf(solve, solve.mach < 1 ? floor : 0);
    if (typeof input === 'string') {
      out.push(`  Mach ${solve.mach.toFixed(3)}: ${input}`);
      rows[solve.mach] = { reason: input };
      continue;
    }
    if (solve.mach < 1 && floor === null) {
      out.push(`  Mach ${solve.mach.toFixed(3)}: waits for the floor`);
      continue;
    }
    const v = judgeRung(input);
    rows[solve.mach] = v;
    const worst = Math.max(...v.stationBands.map((b, j) => b.band + (input.stationFar?.[j] ?? Infinity) + v.parts.floor));
    out.push(
      `  Mach ${solve.mach.toFixed(3)}: CD_r8 ${v.value.toExponential(5)}, band ${v.band?.toExponential(3) ?? 'none'} (${v.estimate.kind}; far ${input.farField.kind}), largest station band ${worst.toExponential(2)}; ${solve.mach < 1 ? `rung rules: ${v.verdict}` : `near-sonic: far-field allowance ${v.parts.farField?.toExponential(3) ?? 'refused'}${solve.mach < 1.05 ? ' (moved family; subject to the 800-radius test)' : ''}`}`,
    );
  }
  mkdirSync(join(here, 'out'), { recursive: true });
  writeFileSync(join(here, 'out', 'verify-subsonic.out'), out.join('\n') + '\n');
  writeFileSync(
    join(here, 'out', 'verify-subsonic.json'),
    JSON.stringify({ ...json, floor, verdicts, ordering, far800, far800Pass, rows }, null, 1) + '\n',
  );
  console.log(out.join('\n'));
  expect(out.length).toBeGreaterThan(3);
});

function readdirSorted(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => /^M\d\.\d{3}\.json$/.test(f))
    .sort();
}
