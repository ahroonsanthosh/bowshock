// Throwaway: find tips with supersonic surface flow but axial Mach below 1 at the surface.
import { test } from 'vitest';
import { appendFileSync } from 'node:fs';
import { coneFlowField } from './snap/src/validation/taylor-maccoll';
import { noseTipSlope } from './snap/src/geometry/nose';
const OUT = process.env.OUT!;
test('scan', () => {
  const cones = [20, 22, 25, 26.565051177077994, 28];
  const tips: [string, number][] = cones.map((d) => [`cone ${d.toFixed(2)}`, (d * Math.PI) / 180]);
  tips.push(['tangent ogive L3', Math.atan(noseTipSlope({ shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 }))]);
  for (const [name, angle] of tips) {
    for (let m = 1.2; m <= 2.0001; m += 0.05) {
      try {
        const f = coneFlowField(m, angle, 1.4);
        const ms = f.flow.surfaceMach;
        appendFileSync(OUT, JSON.stringify({ name, deg: (angle * 180) / Math.PI, mach: +m.toFixed(2), surfaceMach: ms, axialMach: ms * Math.cos(angle), cp: f.flow.surfacePressureCoefficient }) + '\n');
      } catch (e) {
        appendFileSync(OUT, JSON.stringify({ name, mach: +m.toFixed(2), error: String(e).slice(0, 60) }) + '\n');
      }
    }
  }
});
