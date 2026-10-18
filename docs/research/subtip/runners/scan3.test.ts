// Throwaway: tip flow of the parabolic K = 1 nose (length 3) against Mach.
import { test } from 'vitest';
import { appendFileSync } from 'node:fs';
import { coneFlowField } from './snap3/src/validation/taylor-maccoll';
import { noseTipSlope, noseBaseSlope } from './snap3/src/geometry/nose';
test('scan3', () => {
  const nose = { shape: { kind: 'parabolic' as const, parameter: 1 }, length: 3, baseRadius: 0.5 };
  const ogive = { shape: { kind: 'ogive' as const, parameter: 1 }, length: 3, baseRadius: 0.5 };
  const angle = Math.atan(noseTipSlope(nose));
  appendFileSync(process.env.OUT!, JSON.stringify({ baseSlopeParabolic: noseBaseSlope(nose), baseSlopeOgive: noseBaseSlope(ogive), tipDeg: (angle * 180) / Math.PI }) + '\n');
  for (let m = 1.2; m <= 1.5001; m += 0.05) {
    const f = coneFlowField(m, angle, 1.4);
    appendFileSync(process.env.OUT!, JSON.stringify({ mach: +m.toFixed(2), surfaceMach: f.flow.surfaceMach, axialMach: f.flow.surfaceMach * Math.cos(angle), shockDeg: (f.flow.shockAngle * 180) / Math.PI, cp: f.flow.surfacePressureCoefficient }) + '\n');
  }
});
