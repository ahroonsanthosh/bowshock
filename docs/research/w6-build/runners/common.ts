// W6 build: shared definitions of the reference runs (docs/research/w6-build).
// Copied into the frozen tree's tests/w6b/ (see lane.sh).
import { appendFileSync } from 'node:fs';
import type { Body } from '../../src/geometry/body';
import type { NoseShape } from '../../src/geometry/nose';

export const gamma = 1.4;
export const OUT = process.env.OUT ?? 'results.jsonl';
export const LOGFILE = process.env.LOG ?? 'log.txt';
export const append = (o: object, file = OUT) =>
  appendFileSync(file, JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n');
export const log = (s: string, file = LOGFILE) =>
  appendFileSync(file, `${new Date().toISOString()} ${s}\n`);

/** The shapes W6 caps first: tangent ogive, Von Karman, parabola K = 1. */
export const SHAPES: Record<string, NoseShape> = {
  ogive: { kind: 'ogive', parameter: 1 },
  vk: { kind: 'haack', parameter: 0 },
  parabolic: { kind: 'parabolic', parameter: 1 },
};

/**
 * A capped nose of `calibers` calibers overall (cap included), base
 * radius 0.5 (lengths in calibers), tip radius `ratio` times the base
 * radius, and `cylinder` calibers of cylinder.
 */
export function cappedBody(shape: string, calibers: number, ratio: number, cylinder = 2): Body {
  const s = SHAPES[shape];
  if (!s) throw new RangeError(`unknown shape ${shape}`);
  return {
    nose: { shape: s, length: calibers, baseRadius: 0.5, tipRadius: 0.5 * ratio },
    cylinderLength: cylinder,
  };
}

/** The case from the environment: SHAPE, CAL, RATIO, M, CYL. */
export function caseFromEnv() {
  const shape = process.env.SHAPE ?? 'ogive';
  const calibers = Number(process.env.CAL ?? 5);
  const ratio = Number(process.env.RATIO ?? 0.05);
  const mach = Number(process.env.M ?? 1.3);
  const cylinder = Number(process.env.CYL ?? 2);
  return {
    shape,
    calibers,
    ratio,
    mach,
    cylinder,
    body: cappedBody(shape, calibers, ratio, cylinder),
    tag: `${shape}${calibers}rn${ratio}M${mach}`,
  };
}

export const deg = (r: number) => (r * 180) / Math.PI;
