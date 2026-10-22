/** Taylor-Maccoll surface pressure coefficients of the TN 4233 cone at Page's Mach numbers. */
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

it('tm', () => {
  const angle = ((6 + 59 / 60) * Math.PI) / 180;
  for (const mach of (process.env.MACHS ?? '1.064,1.078,1.1,1.151,1.2').split(',').map(Number)) {
    try {
      const f = taylorMaccoll(mach, angle, 1.4);
      appendFileSync(
        'tests/tmp-transonic/refs/tm-cone7.jsonl',
        JSON.stringify({ mach, cp: f.surfacePressureCoefficient, surfaceMach: f.surfaceMach, shock: (f.shockAngle * 180) / Math.PI }) + '\n',
      );
    } catch (error) {
      appendFileSync('tests/tmp-transonic/refs/tm-cone7.jsonl', JSON.stringify({ mach, error: String(error) }) + '\n');
    }
  }
});
