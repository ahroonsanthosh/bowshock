// Throwaway: sizes of the Basic Finner interpretations quoted in 0010 section 4.1.
import { appendFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { bodyFriction } from '../../src/friction/body-friction';
import { normalShock, stagnationPressureRatio } from '../../src/validation/gas-dynamics';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const OUT = 'tests/tmp-total/interpretations.out';
const log = (s: string) => appendFileSync(OUT, s + '\n');
it('interpretations', () => {
  writeFileSync(OUT, '');
  const g = 1.4;
  const T = 343.7 ** 2 / (g * 287.05);
  for (const m of [1.799, 2.414, 2.97]) {
    const a = taylorMaccoll(m, (10 * Math.PI) / 180, g).surfacePressureCoefficient;
    const b = taylorMaccoll(m, Math.atan(0.5 / 2.84), g).surfacePressureCoefficient;
    const sh = normalShock(m, g);
    const pitot = (sh.pressureRatio * stagnationPressureRatio(sh.downstreamMach, g) - 1) / (0.5 * g * m * m);
    const meplat = (pitot - a) * (0.004 / 0.5) ** 2;
    log(
      `M ${m}: cone Cp 10 deg ${a.toFixed(6)}, atan(0.5/2.84) = ${((Math.atan(0.5 / 2.84) * 180) / Math.PI).toFixed(4)} deg ${b.toFixed(6)}, change ${(b - a).toExponential(2)} (${(100 * (b / a - 1)).toFixed(2)}%); meplat at pitot over the cone ${meplat.toExponential(2)}; recovery T ${(T * (1 + 0.89 * 0.2 * m * m)).toFixed(1)} K`,
    );
  }
  const noseL = 0.5 / Math.tan((10 * Math.PI) / 180);
  const body = { nose: { shape: { kind: 'conical' as const }, length: noseL, baseRadius: 0.5 }, cylinderLength: 10 - noseL };
  const f = bodyFriction(body, { method: 'momentum-integral', mach: 2.4, temperature: T, reynoldsPerLength: 1.6e6 });
  const roots = 4 * 0.04 * 1;
  log(`T ${T.toFixed(3)} K; nose length ${noseL.toFixed(4)}; body wetted area ${f.wettedArea.toFixed(3)} cal^2; fin roots ${roots} cal^2 = ${(100 * roots / f.wettedArea).toFixed(2)}%; body friction at M 2.4 ${f.cd.toFixed(5)}, times that share ${(f.cd * roots / f.wettedArea).toExponential(2)}`);
});
