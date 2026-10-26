/**
 * The boat-tail term's coverage (docs/design/0023-boat-tails.md section 6,
 * registered 2026-10-26 before its served range exists): the population's
 * boat-tailed rockets, each with its shape from its own stream
 * (boatTailShape, ./population.ts), at the impact run's conditions (seed 7,
 * as ./impact.test.ts draws them), through the nose solve's refusals
 * (./evaluate.ts) and the boat-tail term's own (boatTailReasons,
 * src/analysis/boat-tail.ts, the library itself). Writes
 * out/boat-tail-coverage.out. Run:
 * ONLY=./boat-tail-coverage.test.ts nice -n 10 npx vitest run --config docs/research/refusals/vitest.config.ts
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import {
  BOAT_TAIL_ALLOWANCE_SET,
  BOAT_TAIL_ANGLE_RANGE,
  BOAT_TAIL_LENGTH_RANGE,
  BOAT_TAIL_MACH_RANGE,
  boatTailReasons,
  type BoatTailReason,
} from '../../../src/analysis/boat-tail';
import type { Body } from '../../../src/geometry/body';
import { calibreBody, noseReasons, type ReasonKey } from './evaluate';
import {
  MACH_BANDS,
  SMALLER_MOTOR,
  boatTailShape,
  drawAltitude,
  mulberry32,
  population,
  type BoatTailShape,
  type Rocket,
} from './population';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.OUT_DIR === undefined ? join(here, 'out') : process.env.OUT_DIR;
const N_ROCKETS = Number(process.env.N_ROCKETS ?? 2000);

/** SHA-256 of population(2000) as JSON before the boat-tail stream was added: the stream leaves it unchanged. */
const POPULATION_2000 = 'f769e90c1cd226b3ad623dd38bf93da50fda0055ae7c40a7333f7fb74a836a9e';

/** The rocket in calibres (./evaluate.ts calibreBody), its boat-tail taken from the cylinder's end. */
export function boatTailedBody(r: Rocket, shape: BoatTailShape): Body {
  const body = calibreBody(r);
  return {
    ...body,
    cylinderLength: body.cylinderLength - shape.lengthCalibres,
    boatTail: { length: shape.lengthCalibres, baseRadius: 0.5 * shape.baseRatio },
  };
}

interface Case {
  readonly band: number;
  readonly mach: number;
  readonly nose: readonly ReasonKey[];
  readonly tail: readonly BoatTailReason['key'][];
}

/** The impact run's conditions (./impact.test.ts evaluateAll, seed 7), on the boat-tailed rockets. */
function cases(rockets: readonly Rocket[], smallerMotor: number): Case[] {
  const rand = mulberry32(7);
  const out: Case[] = [];
  for (const rocket of rockets) {
    MACH_BANDS.forEach(([lo, hi], band) => {
      const mach = lo + (hi - lo) * (0.0005 + 0.999 * rand());
      drawAltitude(rand(), rand());
      const shape = boatTailShape(rocket, undefined, smallerMotor);
      if (shape === undefined) return;
      out.push({
        band,
        mach,
        nose: noseReasons(rocket, mach),
        tail: boatTailReasons(boatTailedBody(rocket, shape), mach).map((r) => r.key),
      });
    });
  }
  return out;
}

const KEYS: readonly BoatTailReason['key'][] = ['bluntNose', 'mach', 'angle', 'length', 'allowance'];
const pct = (n: number, d: number) => (d === 0 ? '-' : `${((100 * n) / d).toFixed(1)}%`);
const quantiles = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map((p) => s[Math.min(s.length - 1, Math.floor(p * s.length))]!);
};

test('the boat-tail term over the population', () => {
  // The stream leaves the population unchanged.
  const reference = population(2000);
  expect(createHash('sha256').update(JSON.stringify(reference)).digest('hex')).toBe(POPULATION_2000);
  // A rocket's shape depends on its id alone, and exists exactly where it has a boat-tail.
  const few = population(100);
  for (let k = 0; k < few.length; k++) {
    expect(boatTailShape(few[k]!)).toEqual(boatTailShape(reference[k]!));
    expect(boatTailShape(reference[k]!) !== undefined).toBe(reference[k]!.boatTail);
  }

  const rockets = population(N_ROCKETS);
  const shapes = rockets.map((r) => boatTailShape(r)).filter((s) => s !== undefined);
  for (const s of shapes) {
    const tan = Math.tan((s.angleDeg * Math.PI) / 180);
    expect(1 - 2 * s.lengthCalibres * tan).toBeCloseTo(s.baseRatio, 12);
  }
  const [a0, a1] = BOAT_TAIL_ANGLE_RANGE;
  const [l0, l1] = BOAT_TAIL_LENGTH_RANGE;
  const inAngle = shapes.filter((s) => s.angleDeg >= a0 - 1e-9 && s.angleDeg <= a1 + 1e-9).length;
  const inLength = shapes.filter((s) => s.lengthCalibres >= l0 - 1e-9 && s.lengthCalibres <= l1 + 1e-9).length;
  const fmt = (xs: number[], d: number) => quantiles(xs).map((x) => x.toFixed(d)).join(', ');

  const lines: string[] = [
    '# The boat-tail term over the population (0023 section 6)',
    '',
    `Rockets: ${rockets.length}; with a boat-tail: ${shapes.length} (${pct(shapes.length, rockets.length)}).`,
    `Served range now: Mach ${BOAT_TAIL_MACH_RANGE.map((m) => m.toFixed(1)).join(' to ')}; angles ${a0} to ${a1} deg and lengths ${l0} to ${l1} calibres (provisional until 0023 section 2.5 decides them); viscous allowance set: ${BOAT_TAIL_ALLOWANCE_SET}.`,
    '',
    'Shapes (minimum, 10, 25, 50, 75, 90th percentiles, maximum):',
    '',
    `- half-angle, deg: ${fmt(shapes.map((s) => s.angleDeg), 1)}`,
    `- length, calibres: ${fmt(shapes.map((s) => s.lengthCalibres), 2)}`,
    `- base diameter over the body's: ${fmt(shapes.map((s) => s.baseRatio), 3)}`,
    `- within the angles: ${pct(inAngle, shapes.length)}; within the lengths: ${pct(inLength, shapes.length)}`,
    '',
  ];

  const [m0, m1] = BOAT_TAIL_MACH_RANGE;
  const table = (title: string, all: readonly Case[], compact: boolean) => {
    const bandName = (b: number) => `M ${MACH_BANDS[b]![0].toFixed(1)}-${MACH_BANDS[b]![1].toFixed(1)}`;
    const groups = [
      ...MACH_BANDS.map((_, b) => all.filter((c) => c.band === b)),
      all.filter((c) => c.mach >= m0 && c.mach <= m1),
      all,
    ];
    const row = (label: string, count: (cs: readonly Case[]) => number) =>
      `| ${label} | ${groups.map((cs) => `${count(cs)} (${pct(count(cs), cs.length)})`).join(' | ')} |`;
    const allowance = (c: Case) => c.nose.length === 0 && c.tail.every((k) => k === 'allowance');
    lines.push(
      `## ${title}`,
      '',
      `| Boat-tailed cases | ${MACH_BANDS.map((_, b) => bandName(b)).join(' | ')} | Of these, M ${m0.toFixed(1)}-${m1.toFixed(1)} | All |`,
      `| --- | ${MACH_BANDS.map(() => '---').join(' | ')} | --- | --- |`,
      row('cases', (cs) => cs.length),
    );
    if (compact) {
      lines.push(
        row('term refused: angle', (cs) => cs.filter((c) => c.tail.includes('angle')).length),
        row('nose and term served if the allowance were set', (cs) => cs.filter(allowance).length),
        '',
      );
      return;
    }
    lines.push(
      row('nose term served', (cs) => cs.filter((c) => c.nose.length === 0).length),
      row('nose and term served', (cs) => cs.filter((c) => c.nose.length === 0 && c.tail.length === 0).length),
      row('the same if the allowance were set', (cs) => cs.filter(allowance).length),
      ...KEYS.map((k) => row(`term refused: ${k}`, (cs) => cs.filter((c) => c.tail.includes(k)).length)),
      ...KEYS.map((k) =>
        row(
          `sole blocker (nose served): ${k}`,
          (cs) => cs.filter((c) => c.nose.length === 0 && c.tail.length === 1 && c.tail[0] === k).length,
        ),
      ),
      '',
    );
  };
  table(
    `Baseline (the next motor size down from the largest that fits on ${pct(SMALLER_MOTOR, 1)} of boat-tails)`,
    cases(rockets, SMALLER_MOTOR),
    false,
  );
  table('Variant: every boat-tail to the largest motor that fits (shallower)', cases(rockets, 0), true);
  table('Variant: every boat-tail to the next motor size down (steeper)', cases(rockets, 1), true);
  lines.push(
    'The base behind a boat-tail (Love, 0023 section 4) and the total are not counted yet: the base is',
    'served only within the angles, base ratios and Mach numbers its band\'s boat-tailed points span, which',
    "the readings decide; ./evaluate.ts still refuses every boat-tail ('base: boat-tail').",
    '',
  );
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'boat-tail-coverage.out'), lines.join('\n'));
}, 3_600_000);
