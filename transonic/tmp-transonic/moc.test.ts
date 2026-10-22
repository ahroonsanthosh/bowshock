/** Method-of-characteristics nose drag of the 5-caliber ogive at Mach 1.2 (reference). */
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { pressureDragFromProfile } from '../../src/analysis/forces';
import { bodyRadius, type Body } from '../../src/geometry/body';
import { noseTipSlope } from '../../src/geometry/nose';
import { characteristics } from '../../src/validation/characteristics';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const gamma = 1.4;
it('moc', () => {
  const mach = Number(process.env.MACH ?? 1.2);
  const body: Body = {
    nose: { shape: { kind: 'ogive', parameter: 1 }, length: Number(process.env.LEN ?? 10), baseRadius: 1 },
    cylinderLength: 2,
  };
  const L = body.nose.length;
  for (const n of (process.env.NS ?? '160,320,640').split(',').map(Number)) {
    const t0 = performance.now();
    const start = Number(process.env.START ?? 1e-3);
    const sol = characteristics(body, { mach, gamma, intervals: n, start });
    const wall = sol.wall;
    const beyond = wall.findIndex((w) => w.x >= L);
    const k = beyond > 0 ? beyond : wall.length - 1;
    const a = wall[k - 1]!;
    const b = wall[k]!;
    const end = { x: L, p: a.p + ((b.p - a.p) * (L - a.x)) / (b.x - a.x) };
    const tip = taylorMaccoll(mach, Math.atan(noseTipSlope(body.nose)), gamma);
    const drag = pressureDragFromProfile(
      [...wall.filter((w) => w.x < L), end],
      (x) => bodyRadius(body, x),
      { pressure: 1, dynamicPressure: 0.5 * gamma * mach * mach },
      1,
      tip.surfacePressureRatio,
    );
    appendFileSync(
      `tests/tmp-transonic/refs/moc-ogive${Number(process.env.LEN ?? 10) / 2}.jsonl`,
      JSON.stringify({ mach, intervals: n, start, drag, massBalance: sol.massBalance, seconds: (performance.now() - t0) / 1000 }) + '\n',
    );
  }
});
