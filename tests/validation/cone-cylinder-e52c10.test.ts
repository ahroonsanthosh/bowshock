import { describe, expect, it } from 'vitest';
import {
  E52C10_DIAMETER_INCHES,
  E52C10_MACH,
  E52C10_MODEL_1,
  E52C10_MODEL_3,
} from '../../src/validation/cone-cylinder-e52c10';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';

const gamma = 1.4;

describe.each([
  { name: 'model 1', model: E52C10_MODEL_1, includedAngle: 20 },
  { name: 'model 3', model: E52C10_MODEL_3, includedAngle: 7 + 10 / 60 },
])('NACA RM E52C10 data, $name (cone-cylinder, M = 3.12)', ({ model, includedAngle }) => {
  const d = E52C10_DIAMETER_INCHES;
  const shoulder = model.coneCalibers * d;
  const length = (model.coneCalibers + model.cylinderCalibers) * d;
  const cone = (x: number) => x < shoulder;

  it('the cone length and the included angle of figure 1 agree within 2 min of arc', () => {
    // Both are rounded on the drawing: a length of 2.84 d rounded to 0.01 d
    // alone allows 2 min. Measured: 1.8 min (model 1), 0.8 min (model 3).
    const fromLength = (2 * Math.atan(0.5 / model.coneCalibers) * 180) / Math.PI;
    expect(Math.abs(fromLength - includedAngle)).toBeLessThan(2 / 60);
  });

  it('transcription is consistent: stations increase, lie on the body and bracket the shoulder', () => {
    for (const { stations } of model.runs) {
      const xs = stations.map((p) => p.x);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
      expect(xs[xs.length - 1]!).toBeLessThan(length);
      expect(xs.some(cone)).toBe(true);
      expect(xs.some((x) => !cone(x))).toBe(true);
      // On the cone the windward meridian carries the higher pressure.
      for (const p of stations.filter((q) => cone(q.x))) {
        expect(p.windward).toBeGreaterThan(p.leeward);
      }
    }
  });

  it('at 3 deg the meridian mean on the cone matches the exact conical value within 0.004', () => {
    // Measured when written: model 1 within 0.0004 from x = 2 in on and
    // 0.0026 at 1 in; model 3 within 0.0002 at 3 and 5 in, 0.0033 further
    // aft, where the measured pressure rises along the cone.
    const halfAngle = Math.atan(0.5 / model.coneCalibers);
    const exact = taylorMaccoll(E52C10_MACH, halfAngle, gamma).surfacePressureCoefficient;
    const run = model.runs.find((r) => r.alpha === 3)!;
    for (const p of run.stations.filter((q) => cone(q.x))) {
      expect(Math.abs((p.windward + p.leeward) / 2 - exact)).toBeLessThan(0.004);
    }
  });
});
