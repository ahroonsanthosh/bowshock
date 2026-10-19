import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { linearWaveDrag } from '../../src/fins/linear-wave-drag';
import { leadingEdgeMachParameter } from '../../src/fins/planform';
import { areaRuleWaveDrag } from '../fins/support/area-rule';
import { FINS, MACHS } from '../fins/support/cases';

const OUT = 'tests/tmp-fins/table.jsonl';
const log = (o: object) => appendFileSync(OUT, JSON.stringify(o) + '\n');

it('strip-theory table at the default resolution', () => {
  for (const fin of FINS) {
    for (const mach of MACHS) {
      const t0 = performance.now();
      const r = linearWaveDrag(fin.planform, fin.section, mach);
      const t1 = performance.now();
      const ar = areaRuleWaveDrag(fin.planform, fin.section, mach, 4).ratio;
      log({
        case: fin.name,
        mach,
        B: leadingEdgeMachParameter(fin.planform, mach),
        span_over_root: fin.planform.span / fin.planform.rootChord,
        ratio: r.ratio,
        estimate: r.quadratureError,
        areaRule: ar,
        error: r.ratio - ar,
        ms: Math.round(t1 - t0),
      });
    }
  }
});
