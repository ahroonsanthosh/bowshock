// Throwaway probe: tip flows, problem sizes, inflow Mach numbers.
import { test } from 'vitest';
import { append, bodyOf, caseOf, effectiveMach, gamma } from './common';
import { noseTipSlope } from './snap/src/geometry/nose';
import { coneFlowField, taylorMaccoll } from './snap/src/validation/taylor-maccoll';
import { sharpFitProblem } from './snap/src/analysis/fitted-flow';

const OUT = process.env.OUT!;

test('probe', () => {
  for (const id of ['A', 'B', 'C', 'S1', 'S2']) {
    const c = caseOf(id);
    const body = bodyOf(c);
    const tip = Math.atan(noseTipSlope(body.nose));
    const m = effectiveMach(c.mach);
    let tm: object = {};
    try {
      const f = coneFlowField(m, tip, gamma);
      const t = taylorMaccoll(m, tip, gamma);
      tm = { shockDeg: (f.flow.shockAngle * 180) / Math.PI, surfaceMach: f.flow.surfaceMach, cp: t.surfacePressureCoefficient, postShockMach: f.flow.postShockMach };
    } catch (e) {
      tm = { error: String(e) };
    }
    const sizes = [];
    for (const refinement of [1, 2, 4]) {
      for (const start of [1e-3, 3e-4, 1e-4]) {
        if (refinement === 4 && start !== 1e-3) continue;
        const p = sharpFitProblem(body, { mach: c.mach, gamma, nj: 20, refinement, start });
        sizes.push({ refinement, start, ni: p.lines.length - 1, nj: p.nj, slowest: p.inflowSlowestMach, x0: p.x0, tipDrag: p.tipDrag });
      }
    }
    append({ kind: 'probe', id, length: c.length, mach: c.mach, effMach: m, tipDeg: (tip * 180) / Math.PI, tm, sizes }, OUT);
  }
});
