// W6 probe: shared definitions (docs/research/w6-probe). Copied into each
// probe tree (tests/w6/ of a checkout with the cap patch applied).
import { appendFileSync } from 'node:fs';
import type { Body } from '../../src/geometry/body';

export const gamma = 1.4;
export const OUT = process.env.OUT ?? 'results.jsonl';
export const LOGFILE = process.env.LOG ?? 'log.txt';
export const append = (o: object, file = OUT) =>
  appendFileSync(file, JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n');
export const log = (s: string, file = LOGFILE) =>
  appendFileSync(file, `${new Date().toISOString()} ${s}\n`);

/**
 * A tangent ogive of `calibers` calibers (overall, cap included), base
 * radius 0.5 (lengths in calibers), capped with a sphere of radius
 * `ratio` times the base radius, and `cylinder` calibers of cylinder.
 */
export const cappedOgive = (calibers: number, ratio: number, cylinder = 2): Body => ({
  nose: {
    shape: { kind: 'ogive', parameter: 1 },
    length: calibers,
    baseRadius: 0.5,
    ...(ratio > 0 ? { tipRadius: 0.5 * ratio } : {}),
  },
  cylinderLength: cylinder,
});

export const caseId = (calibers: number, ratio: number, mach: number, cylinder = 2) =>
  `ogive${calibers} rn${ratio} M${mach} cyl${cylinder}`;

export const deg = (r: number) => (r * 180) / Math.PI;
