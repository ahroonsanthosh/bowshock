// W6 build diagnostic (not a reference): where along the body the march of
// characteristics and the fitted solution part. For one saved grid and one
// line: the fitted wall pressure on each wall face behind the line, the
// march's wall pressure interpolated to the same x, and the drag
// accumulated by each from the line on. Env: SHAPE, CAL, RATIO, M, CYL,
// REF, FILE (saved state), LINE (base-grid index), N (intervals),
// MOC_ENTROPY (cells | shock), OUT.
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { bodyRadius } from '../../src/geometry/body';
import { characteristicsFrom } from '../../src/validation/characteristics';
import { caseFromEnv } from './common';
import { shockEntropyLine } from './entropy';
import { effectiveMach, gamma, lineData, loadFit } from './fitdata';

it('wall pressure, march against fitted', () => {
  const { body, mach: M, tag } = caseFromEnv();
  const r = Number(process.env.REF ?? 4);
  const f = loadFit(body, M, r, process.env.FILE!);
  const i = Number(process.env.LINE ?? 22) * r;
  const n = Number(process.env.N ?? 2560);
  const mach = effectiveMach(f);
  const d = lineData(f, i);
  const start =
    process.env.MOC_ENTROPY === 'shock' ? shockEntropyLine(f, i, d.start).start : d.start;
  const sol = characteristicsFrom(f.body, start, { mach, gamma, intervals: n });
  const wall = sol.wall;
  const q = 0.5 * gamma * mach * mach;
  const R = f.body.nose.baseRadius;
  const marchP = (x: number) => {
    let k = 0;
    while (k < wall.length - 2 && wall[k + 1]!.x < x) k++;
    const a = wall[k]!;
    const b = wall[k + 1]!;
    return a.p + ((b.p - a.p) * (x - a.x)) / (b.x - a.x);
  };
  const rows: object[] = [];
  let fitted = 0;
  let marched = 0;
  for (let t = i; t < f.wall.length; t++) {
    const w = f.wall[t]!;
    if (w.x > f.body.nose.length) break;
    const pf = w.flux[1]! * w.nx + w.flux[2]! * w.ny;
    const pm = marchP(w.x);
    // Each face's drag with the fitted and the marched pressure.
    fitted += ((2 * (pf - 1) * w.nx * w.area) / (q * R * R)) * 1;
    marched += ((2 * (pm - 1) * w.nx * w.area) / (q * R * R)) * 1;
    rows.push({ x: w.x, r: bodyRadius(f.body, w.x), pFitted: pf, pMarch: pm, cumFitted: fitted, cumMarch: marched });
  }
  writeFileSync(
    process.env.OUT ?? 'wallp.json',
    JSON.stringify({ tag, r, line: i / r, x: d.x, n, entropy: process.env.MOC_ENTROPY ?? 'cells', mass: sol.massBalance, rows }),
  );
});
