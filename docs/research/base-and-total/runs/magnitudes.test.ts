import { appendFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { bodyFriction } from '../../src/friction/body-friction';
import { flatPlateFriction } from '../../src/friction/flat-plate';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';
import { obliqueShock } from '../../src/validation/gas-dynamics';

const OUT = 'tests/tmp-total/magnitudes.out';
const log = (s: string) => appendFileSync(OUT, s + '\n');
const shots = [
  [1.799, 0.594, 0.119e8],
  [1.846, 0.598, 0.124e8],
  [1.85, 0.567, 0.123e8],
  [2.348, 0.5, 0.156e8],
  [2.364, 0.478, 0.155e8],
  [2.414, 0.473, 0.161e8],
  [2.663, 0.446, 0.174e8],
  [2.741, 0.4, 0.18e8],
  [2.749, 0.452, 0.18e8],
  [2.969, 0.385, 0.198e8],
  [2.97, 0.376, 0.197e8],
] as const;
it('scratch', () => {
  writeFileSync(OUT, '');
  const deg = Math.PI / 180;
  const T = 343.7 ** 2 / (1.4 * 287.05);
  const half = 10 * deg;
  const noseL = 0.5 / Math.tan(half);
  const body = {
    nose: { shape: { kind: 'conical' as const }, length: noseL, baseRadius: 0.5 },
    cylinderLength: 10 - noseL,
  };
  const aref = Math.PI / 4;
  for (const [M, cx, ReL] of shots) {
    const t0 = performance.now();
    const nose = taylorMaccoll(M, half, 1.4).surfacePressureCoefficient;
    const t1 = performance.now();
    const rePer = ReL / 10;
    const bf = (extra: object) =>
      bodyFriction(body, {
        method: 'momentum-integral',
        mach: M,
        temperature: T,
        reynoldsPerLength: rePer,
        ...extra,
      }).cd;
    const fin = (extra: object) =>
      (8 * flatPlateFriction({ mach: M, temperature: T, ...extra }).averageCf(rePer * 1)) / aref;
    const bAd = bf({}),
      bCold = bf({ wallTemperature: T });
    const fAd = fin({}),
      fCold = fin({ wallTemperature: T });
    const t2 = performance.now();
    const tr = [5e5, 1.6e6, 3e6].map(
      (re) => bf({ transitionReynolds: re }) + fin({ transitionReynolds: re }) - bAd - fAd,
    );
    const t3 = performance.now();
    const sh = obliqueShock(M, Math.atan(0.04), 1.4);
    const cpw = (sh.pressureRatio - 1) / (0.7 * M * M);
    const beta = Math.sqrt(M * M - 1);
    const finWave2d = 2 * cpw * 0.04; // on chord, both faces
    const finWave = (4 * finWave2d * (1 - 1 / (2 * Math.PI * beta))) / aref;
    log(
      `${M} CX0 ${cx} nose ${nose.toFixed(5)} bodyAd ${bAd.toFixed(5)} bodyCold ${bCold.toFixed(5)} (${((bCold / bAd - 1) * 100).toFixed(1)}%) finAd ${fAd.toFixed(5)} finCold ${fCold.toFixed(5)} (${((fCold / fAd - 1) * 100).toFixed(1)}%) trans ${tr.map((d) => d.toFixed(4)).join(' ')} finWave ${finWave.toFixed(5)} times ${(t1 - t0).toFixed(0)} ${(t2 - t1).toFixed(0)} ${(t3 - t2).toFixed(0)}`,
    );
  }
});
