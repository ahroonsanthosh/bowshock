// Throwaway: shared definitions for the Haack grid measurements.
import { appendFileSync } from 'node:fs';
import type { Body } from '../../src/geometry/body';

export const RESULTS = process.env.OUT ?? 'tests/tmp-haack/results.jsonl';
export const gamma = 1.4;
export const append = (o: object, file = RESULTS) =>
  appendFileSync(file, JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n');
export const log = (s: string, file = process.env.LOG ?? 'tests/tmp-haack/log.txt') =>
  appendFileSync(file, `${new Date().toISOString()} ${s}\n`);

export const haack = (C: number, L: number, cyl = 2): Body => ({
  nose: { shape: { kind: 'haack', parameter: C }, length: L, baseRadius: 0.5 },
  cylinderLength: cyl,
});
export const power = (n: number, L: number, cyl = 2): Body => ({
  nose: { shape: { kind: 'power', exponent: n }, length: L, baseRadius: 0.5 },
  cylinderLength: cyl,
});
export const ellipsoid = (L: number, cyl = 4): Body => ({
  nose: { shape: { kind: 'ellipsoid' }, length: L, baseRadius: 0.5 },
  cylinderLength: cyl,
});
export const ogive = (p: number, L: number, cyl = 2): Body => ({
  nose: { shape: { kind: 'ogive', parameter: p }, length: L, baseRadius: 0.5 },
  cylinderLength: cyl,
});
export const parabolic = (K: number, L: number, cyl = 2): Body => ({
  nose: { shape: { kind: 'parabolic', parameter: K }, length: L, baseRadius: 0.5 },
  cylinderLength: cyl,
});

/** The body of a measurement, from the environment: SHAPE, C, N, P, K, L, CYL. */
export function bodyFromEnv(): Body {
  const SHAPE = process.env.SHAPE ?? 'haack';
  const L = Number(process.env.L ?? 3);
  const CYL = Number(process.env.CYL ?? 2);
  switch (SHAPE) {
    case 'ellipsoid':
      return ellipsoid(L, CYL);
    case 'power':
      return power(Number(process.env.N ?? 0.75), L, CYL);
    case 'ogive':
      return ogive(Number(process.env.P ?? 1), L, CYL);
    case 'parabolic':
      return parabolic(Number(process.env.K ?? 1), L, CYL);
    default:
      return haack(Number(process.env.C ?? 0), L, CYL);
  }
}

export function idFromEnv(): string {
  const SHAPE = process.env.SHAPE ?? 'haack';
  const param =
    SHAPE === 'power'
      ? `n${process.env.N ?? 0.75}`
      : SHAPE === 'ogive'
        ? `p${process.env.P ?? 1}`
        : SHAPE === 'parabolic'
          ? `K${process.env.K ?? 1}`
          : `C${process.env.C ?? 0}`;
  return `${SHAPE} ${param} L${process.env.L ?? 3} M${process.env.M ?? 2} cyl${process.env.CYL ?? 2}`;
}
