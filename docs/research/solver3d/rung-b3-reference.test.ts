/**
 * Rung (b3)'s reference (docs/design/0021-3d-euler-fins.md section 4.2), on the CPU: the planar method of
 * characteristics (src/validation/characteristics-planar.ts) on the (b3) hexagons, verified before use.
 *
 * - The double wedges of the unit test (t/c 0.05 Mach 2, 0.08 Mach 1.5, 0.05 Mach 3) at 2560 intervals equal
 *   shock-expansion theory within 1e-7 of the drag.
 * - Its own refinement on each hexagon, 320, 640, 1280 and 2560 intervals: pass where the observed order of
 *   the finest triple lies between 1.5 and 2.5 (the coarser triple's is recorded); the reference is then the
 *   Richardson extrapolation of the two finest at that order. A case whose four values agree within 1e-12 of
 *   the drag has no reflected wave on its surface: its reference is the finest value, which must equal
 *   shock-expansion theory within 1e-7.
 * - Against a different method, the 2D fitted engine (0006) in planar geometry
 *   (src/analysis/planar-fitted-flow.ts), on the two cases of revision 3e (t/c 0.08 with 15% bevels at Mach 2,
 *   t/c 0.03 with 5% bevels at Mach 2): base grid 16 cells from the surface to the shock and 48 columns a
 *   chord (each segment at least two), refined by 2 to 8 times; the fitted family's band is 0005's procedure
 *   at ratio 2 (order tolerance 0.5, noise 1e-12) plus 0006's floor of 7e-5 of the value, placed on the
 *   finest value. Each case: pass where the band contains the characteristics reference and not
 *   shock-expansion theory's value; inconclusive (never a pass) where it contains both; fail where it does
 *   not contain the reference. The check: fail if any case fails, else inconclusive if any is, else pass.
 *   If it is inconclusive, (b3) waits for SU2 on the planar hexagons (scripts/reference-3d, cases b3-*).
 *
 * The cases: the five hexagons of 0021 4.2 (revision 3e); t/c 0.05 with 10% bevels at Mach 1.5 (a 14.04 deg
 * bevel, beyond the 12.1 deg attachment limit) detaches and was removed as impossible.
 *
 * Levels are appended to out/rung-b3-reference.jsonl as they finish (a restart skips those done); verdicts in
 * out/rung-b3-reference.json. Run (hours, one core):
 *   sh docs/research/solver3d/run-lane.sh rung-b3-reference
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { planarSectionFit } from '../../../src/analysis/planar-fitted-flow';
import { doubleWedge, hexagonal, type SymmetricSection } from '../../../src/fins/section';
import { exactSectionDrag } from '../../../src/fins/section-drag';
import {
  planarCharacteristics,
  planarSectionDragCoefficient,
} from '../../../src/validation/characteristics-planar';
import { gridConvergence } from '../../../src/verification/grid-convergence';
import { B3_CASES, mocVerdict, type B3Case } from './b3-cases';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
const LEVELS = join(OUT, 'rung-b3-reference.jsonl');
const GAMMA = 1.4;
const INTERVALS = [320, 640, 1280, 2560] as const;
const FITTED_REFINEMENTS = [1, 2, 4, 8] as const;
const FITTED_NJ = 16;
const FITTED_COLUMNS = 48;
const FITTED_FLOOR = 7e-5;

/** The two reflected-wave cases of the fitted check (revision 3e). */
const FITTED_CASES: readonly B3Case[] = [B3_CASES[0]!, B3_CASES[4]!];

const upper = (s: SymmetricSection) => ({ x: s.x, y: s.halfThickness });

interface Row {
  readonly kind: 'moc' | 'fitted';
  readonly case: string;
  readonly n: number;
  readonly cd: number;
}

function loadDone(): Map<string, Row> {
  const done = new Map<string, Row>();
  if (existsSync(LEVELS)) {
    for (const line of readFileSync(LEVELS, 'utf8').split('\n').filter(Boolean)) {
      const r = JSON.parse(line) as Row;
      done.set(`${r.kind}|${r.case}|${r.n}`, r);
    }
  }
  return done;
}

function solveOnce(done: Map<string, Row>, kind: Row['kind'], id: string, n: number, run: () => Record<string, unknown> & { cd: number }): number {
  const key = `${kind}|${id}|${n}`;
  const had = done.get(key);
  if (had) return had.cd;
  const t0 = Date.now();
  const extra = run();
  const row = { kind, case: id, n, ...extra, seconds: (Date.now() - t0) / 1000, date: new Date().toISOString() };
  appendFileSync(LEVELS, JSON.stringify(row) + '\n');
  done.set(key, row as Row);
  return row.cd;
}

test('rung (b3) reference: the planar characteristics on the double wedges and the hexagons, and the fitted check', { timeout: 86_400_000 * 3 }, () => {
  mkdirSync(OUT, { recursive: true });
  const done = loadDone();
  const moc = (s: SymmetricSection, mach: number, n: number) => () => {
    const r = planarCharacteristics(upper(s), { mach, gamma: GAMMA, intervals: n });
    return { cd: planarSectionDragCoefficient(r, mach, GAMMA), lines: r.lines, massBalance: r.massBalance };
  };

  const wedges = ([[0.05, 2], [0.08, 1.5], [0.05, 3]] as const).map(([tc, mach]) => {
    const id = `double wedge t/c ${tc}, M ${mach}`;
    const exact = exactSectionDrag(doubleWedge(tc), mach).cd;
    const cd = solveOnce(done, 'moc', id, 2560, moc(doubleWedge(tc), mach, 2560));
    return { case: id, exact, cd, error: cd / exact - 1, pass: Math.abs(cd / exact - 1) <= 1e-7 };
  });

  const write = (extra: Record<string, unknown>) =>
    writeFileSync(join(OUT, 'rung-b3-reference.json'), JSON.stringify({ date: new Date().toISOString(), doubleWedges: wedges, ...extra }, null, 2) + '\n');

  const hexagons = B3_CASES.map((c) => {
    const s = hexagonal(c.tc, c.bevel);
    const values = INTERVALS.map((n) => solveOnce(done, 'moc', c.id, n, moc(s, c.mach, n)));
    const se = exactSectionDrag(s, c.mach, { neglectReflectedWaves: true }).cd;
    return { case: c.id, intervals: INTERVALS, values, shockExpansion: se, ...mocVerdict(values, se) };
  });
  write({ hexagons });

  const fitted = FITTED_CASES.map((c) => {
    const s = hexagonal(c.tc, c.bevel);
    const levels = FITTED_REFINEMENTS.map((r) =>
      solveOnce(done, 'fitted', c.id, r, () => {
        const f = planarSectionFit(upper(s), { mach: c.mach, gamma: GAMMA, nj: FITTED_NJ, columnsPerChord: FITTED_COLUMNS, refinement: r, maxIterations: 40_000 * r });
        if (!f.fit.converged) throw new Error(`the fit did not converge at refinement ${r}: speed ${f.fit.maxSpeed}, residual ${f.fit.residual}`);
        return { cd: f.cd, cells: f.cells, iterations: f.fit.iterations, maxSpeed: f.fit.maxSpeed, residual: f.fit.residual };
      }),
    );
    const estimate = gridConvergence(levels, { orderTolerance: 0.5, noise: 1e-12 });
    const finest = levels[levels.length - 1]!;
    const band = estimate.kind === 'unresolved' ? null : estimate.uncertainty + FITTED_FLOOR * Math.abs(finest);
    const reference = hexagons.find((h) => h.case === c.id)!.reference;
    const se = exactSectionDrag(s, c.mach, { neglectReflectedWaves: true }).cd;
    const containsReference = band !== null && Math.abs(finest - reference) <= band;
    const containsShockExpansion = band !== null && Math.abs(finest - se) <= band;
    const verdict: 'pass' | 'inconclusive' | 'fail' = !containsReference ? 'fail' : containsShockExpansion ? 'inconclusive' : 'pass';
    return {
      case: c.id,
      refinements: FITTED_REFINEMENTS,
      values: levels,
      estimate,
      band,
      reference,
      shockExpansion: se,
      distance: Math.abs(finest - reference),
      shockExpansionDistance: Math.abs(finest - se),
      containsReference,
      containsShockExpansion,
      verdict,
    };
  });
  const fittedCheck = fitted.some((f) => f.verdict === 'fail') ? 'fail' : fitted.some((f) => f.verdict === 'inconclusive') ? 'inconclusive' : 'pass';
  const referenceVerified = wedges.every((w) => w.pass) && hexagons.every((h) => h.pass);
  const pass = referenceVerified && fittedCheck === 'pass';
  write({
    hexagons,
    fitted,
    referenceVerified,
    fittedCheck,
    next: fittedCheck === 'inconclusive' ? 'SU2 on the planar hexagons (scripts/reference-3d, cases b3-*), run by the owner (0021 4.2, revision 3e)' : null,
    pass,
  });
  expect(pass).toBe(true);
});
