// Throwaway: shared definitions for the subsonic-tip measurements.
// Imports the snapshot of src under ./snap (commit in ./snap/COMMIT).
import { appendFileSync, readFileSync } from 'node:fs';
import type { Body } from './snap/src/geometry/body';
import type { NoseShape } from './snap/src/geometry/nose';

export const DIR =
  '/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip';
export const RESULTS = process.env.OUT ?? `${DIR}/results.jsonl`;
export const COMMIT = readFileSync('tests/tmp-subtip/snap/COMMIT', 'utf8').trim();
export const gamma = 1.4;

export const append = (o: object, file = RESULTS) =>
  appendFileSync(file, JSON.stringify({ t: new Date().toISOString(), commit: COMMIT, ...o }) + '\n');

export interface Case {
  id: string;
  shape: NoseShape;
  length: number;
  cylinderLength: number;
  mach: number;
}

const C_ANGLE = (18 * Math.PI) / 180;

export const CASES: Case[] = [
  { id: 'A', shape: { kind: 'ogive', parameter: 1 }, length: 3, cylinderLength: 2, mach: 1.2 },
  { id: 'B', shape: { kind: 'conical' }, length: 1, cylinderLength: 2, mach: 1.5 },
  { id: 'C', shape: { kind: 'conical' }, length: 0.5 / Math.tan(C_ANGLE), cylinderLength: 2, mach: 1.2 },
  // Regime 1: surface Mach above 1, axial Mach at the surface below 1.
  { id: 'D', shape: { kind: 'conical' }, length: 1, cylinderLength: 2, mach: 1.6 },
  { id: 'E', shape: { kind: 'ogive', parameter: 1 }, length: 3, cylinderLength: 2, mach: 1.35 },
  // Parabolic K = 1 (tangent at the base), tip 18.43 deg: surface Mach 0.944, axial 0.895.
  { id: 'P', shape: { kind: 'parabolic', parameter: 1 }, length: 3, cylinderLength: 2, mach: 1.25 },
  // More references of E's class (supersonic surface flow, axial below 1, no corner).
  // F: 2-caliber tangent ogive (28.07 deg) near the lowest Mach it is served at: surface 1.0036, axial 0.886.
  { id: 'F', shape: { kind: 'ogive', parameter: 1 }, length: 2, cylinderLength: 2, mach: 1.6 },
  // G: 2-caliber K = 1 parabola (26.57 deg, the tip of D's cone): surface 1.053, axial 0.942.
  { id: 'G', shape: { kind: 'parabolic', parameter: 1 }, length: 2, cylinderLength: 2, mach: 1.6 },
  // Supersonic-tip baselines for the convergence history (not asked; same code).
  { id: 'S1', shape: { kind: 'ogive', parameter: 1 }, length: 3, cylinderLength: 2, mach: 2 },
  { id: 'S2', shape: { kind: 'conical' }, length: 1, cylinderLength: 2, mach: 2 },
];

export const caseOf = (id: string): Case => {
  const c = CASES.find((x) => x.id === id);
  if (!c) throw new Error(`no case ${id}`);
  return c;
};

export const bodyOf = (c: Case): Body => ({
  nose: { shape: c.shape, length: c.length, baseRadius: 0.5 },
  cylinderLength: c.cylinderLength,
});

/** The Mach number the solvers solve: freeStreamAt rounds the speed to 32 bits. */
export const effectiveMach = (mach: number) =>
  Math.fround(mach * Math.sqrt(gamma)) / Math.sqrt(gamma);
