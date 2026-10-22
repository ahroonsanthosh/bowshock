import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { noseTipSlope } from '../../src/geometry/nose';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';
import { sharpFitProblem } from '../../src/analysis/fitted-flow';

const out = 'tests/tmp-transonic/probe-tips.jsonl';
it('tips', () => {
  const cone = (deg: number) => ({
    shape: { kind: 'conical' as const },
    length: 0.5 / Math.tan((deg * Math.PI) / 180),
    baseRadius: 0.5,
  });
  const ogive = (cal: number) => ({
    shape: { kind: 'ogive' as const, parameter: 1 },
    length: cal,
    baseRadius: 0.5,
  });
  const noses = [
    { name: 'cone7', nose: cone(6 + 59 / 60) },
    { name: 'cone10', nose: cone(10) },
    { name: 'cone12.5', nose: cone(12.5) },
    { name: 'cone15', nose: cone(15) },
    { name: 'ogive3', nose: ogive(3) },
    { name: 'ogive4', nose: ogive(4) },
    { name: 'ogive5', nose: ogive(5) },
  ];
  for (const mach of [1.2, 1.15, 1.1, 1.08, 1.06, 1.05, 1.04]) {
    for (const { name, nose } of noses) {
      const tip = Math.atan(noseTipSlope(nose));
      let rec: Record<string, unknown> = { mach, name, tipDeg: (tip * 180) / Math.PI };
      try {
        const tm = taylorMaccoll(mach, tip, 1.4);
        rec = {
          ...rec,
          shockDeg: (tm.shockAngle * 180) / Math.PI,
          cp: tm.surfacePressureCoefficient,
          surfaceMach: tm.surfaceMach,
        };
      } catch (e) {
        rec = { ...rec, tm: String(e).slice(0, 100) };
      }
      try {
        sharpFitProblem({ nose, cylinderLength: 2 }, { mach, gamma: 1.4, nj: 20, refinement: 1 });
        rec = { ...rec, fit: 'accepted' };
      } catch (e) {
        rec = { ...rec, fit: String(e).slice(0, 200) };
      }
      appendFileSync(out, JSON.stringify(rec) + '\n');
    }
  }
});
