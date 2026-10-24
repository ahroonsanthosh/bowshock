/**
 * The fitted surface's code checks and junction tests of docs/design/0021-3d-euler-fins.md (4.0), on the CPU
 * (src/solver3d/junction.ts: a 10 deg wedge at Mach 2.5 between a plane wall and a mirror face).
 *
 * - The fitted surface: the planar oblique shock placed at its exact position stays there (largest shock
 *   speed within 1e-13 of the sound speed after 100 steps); started 10% too high it returns to it (to the
 *   stopping test, shock speeds below 1e-12).
 * - J1 (fitted over the inner half of the span, captured beyond the junction row) and J2 (fitted up to the
 *   middle column, captured behind it), each on levels 0, 1, 2 (8, 16, 32 columns and rows; 4 + 8 cells across
 *   on level 0), with the code's rule (upstream state the free stream) and with the planted breach (upstream
 *   state from the main block's cell across the face). Registered (4.0, revision 3a):
 *   - away: on every fitted face more than k = 4 cells from the junction, the shock angle within 1e-10 rad of
 *     the exact one and the post-shock state within 1e-10 (relative to the free stream's density, sound speed,
 *     pressure); on level 0 no face is that far (block L has 4 rows or columns there), so it binds on 1 and 2;
 *   - near: on the fitted faces within k cells, the error of their integrated pressure force against the
 *     exact uniform state falls with each refinement, and on level 2 it is at most a tenth of the breach's;
 *   - the breach: its near error on level 2 is at least ten times the code's (the test can see the error);
 *     whether its own error falls with refinement is recorded.
 * - n_ex: on level 2, the largest distance from the junction, in cells, at which a main-block cell second or
 *   third upstream of a fitted face differs from the free stream by more than the outer-row tolerance
 *   (max(1e-5, 5 eps_cell); on the CPU 1e-5), plus two cells, the larger of J1's and J2's; recorded, to be
 *   fixed before any blunt-edge family runs.
 *
 * Runs are appended to out/junction-runs.jsonl (a restart skips those done); verdicts in out/junction.json.
 *   sh docs/research/solver3d/run-lane.sh junction
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import {
  junctionMeasures,
  runJunction,
  type JunctionKind,
  type JunctionMeasures,
} from '../../../src/solver3d/junction';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
const RUNS = join(OUT, 'junction-runs.jsonl');
const TOLERANCE = 1e-5;

interface Run extends JunctionMeasures {
  readonly id: string;
  readonly steps: number;
  readonly converged: boolean;
  readonly maxSpeed: number;
  readonly residual: number;
}

test('the fitted surface and the junction tests (4.0)', { timeout: 86_400_000 * 2 }, () => {
  mkdirSync(OUT, { recursive: true });
  const done = new Map<string, Run>();
  if (existsSync(RUNS)) {
    for (const line of readFileSync(RUNS, 'utf8').split('\n').filter(Boolean)) {
      const r = JSON.parse(line) as Run;
      done.set(r.id, r);
    }
  }
  const run = (kind: JunctionKind, level: number, opts: { breach?: boolean; displaced?: number; maxSteps: number }): Run => {
    const id = `${kind} L${level}${opts.breach ? ' breach' : ''}${opts.displaced ? ` displaced ${opts.displaced}` : ''} steps ${opts.maxSteps}`;
    const had = done.get(id);
    if (had) return had;
    const t0 = Date.now();
    const s = runJunction({ kind, level, maxSteps: opts.maxSteps, ...(opts.breach ? { breach: true } : {}), ...(opts.displaced ? { displaced: opts.displaced } : {}) });
    const m = junctionMeasures(s, kind, TOLERANCE);
    const row: Run = { id, ...m, steps: s.steps, converged: s.converged, maxSpeed: s.maxSpeed, residual: s.residual };
    appendFileSync(RUNS, JSON.stringify({ ...row, seconds: (Date.now() - t0) / 1000, date: new Date().toISOString() }) + '\n');
    done.set(id, row);
    return row;
  };
  const stays = run('full', 1, { maxSteps: 100 });
  const returns = run('full', 1, { displaced: 0.1, maxSteps: 60_000 });
  const fittedSurface = {
    stays: { maxSpeed: stays.maxSpeed, awayAngle: stays.awayAngle, awayState: stays.awayState, pass: stays.maxSpeed <= 1e-13 },
    returns: { steps: returns.steps, converged: returns.converged, awayAngle: returns.awayAngle, awayState: returns.awayState, pass: returns.converged && returns.awayAngle <= 1e-10 && returns.awayState <= 1e-10 },
  };
  const write = (extra: Record<string, unknown>) =>
    writeFileSync(join(OUT, 'junction.json'), JSON.stringify({ date: new Date().toISOString(), fittedSurface, ...extra }, null, 2) + '\n');
  write({});
  const tests: Record<string, unknown>[] = [];
  let pass = fittedSurface.stays.pass && fittedSurface.returns.pass;
  let nEx = -Infinity;
  for (const kind of ['J1', 'J2'] as const) {
    const code = [0, 1, 2].map((l) => run(kind, l, { maxSteps: 40_000 * 2 ** l }));
    const breach = [0, 1, 2].map((l) => run(kind, l, { breach: true, maxSteps: 40_000 * 2 ** l }));
    const converged = [...code, ...breach].every((r) => r.converged);
    const away = code.every((r) => r.awayAngle <= 1e-10 && r.awayState <= 1e-10);
    const falls = code[1]!.nearForce < code[0]!.nearForce && code[2]!.nearForce < code[1]!.nearForce;
    const tenth = code[2]!.nearForce <= 0.1 * breach[2]!.nearForce;
    const sees = breach[2]!.nearForce >= 10 * code[2]!.nearForce;
    const ok = converged && away && falls && tenth && sees;
    pass &&= ok;
    nEx = Math.max(nEx, code[2]!.upstreamReach + 2);
    tests.push({
      kind,
      code,
      breach,
      converged,
      away,
      nearFalls: falls,
      nearWithinTenthOfBreach: tenth,
      breachSeen: sees,
      breachFalls: breach[1]!.nearForce < breach[0]!.nearForce && breach[2]!.nearForce < breach[1]!.nearForce,
      pass: ok,
    });
    write({ tests });
  }
  write({ tests, nEx, nExTolerance: TOLERANCE, pass });
  expect(pass).toBe(true);
});
