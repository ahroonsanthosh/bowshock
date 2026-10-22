// Throwaway: tip flows of the 2-caliber tangent ogive and the 2-caliber K = 1 parabola.
import { test } from 'vitest';
import { appendFileSync } from 'node:fs';
import { coneFlowField } from './snap3/src/validation/taylor-maccoll';
import { noseBaseSlope, noseTipSlope } from './snap3/src/geometry/nose';
test('scan4', () => {
  const noses = [
    ['ogive L2', { shape: { kind: 'ogive' as const, parameter: 1 }, length: 2, baseRadius: 0.5 }],
    ['parabola L2', { shape: { kind: 'parabolic' as const, parameter: 1 }, length: 2, baseRadius: 0.5 }],
  ] as const;
  for (const [name, nose] of noses) {
    const angle = Math.atan(noseTipSlope(nose));
    for (const m of [1.58, 1.59, 1.6, 1.61, 1.62, 1.63, 1.65, 1.7, 1.72]) {
      try {
        const f = coneFlowField(m, angle, 1.4).flow;
        appendFileSync(process.env.OUT!, JSON.stringify({ name, deg: (angle * 180) / Math.PI, base: noseBaseSlope(nose), mach: m, surface: f.surfaceMach, axial: f.surfaceMach * Math.cos(angle), shockDeg: (f.shockAngle * 180) / Math.PI, cp: f.surfacePressureCoefficient }) + '\n');
      } catch (e) { appendFileSync(process.env.OUT!, JSON.stringify({ name, mach: m, error: String(e).slice(0, 50) }) + '\n'); }
    }
  }
});
