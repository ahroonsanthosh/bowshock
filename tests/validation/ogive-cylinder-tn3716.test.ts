import { describe, expect, it } from 'vitest';
import { noseRadius } from '../../src/geometry/nose';
import {
  TN3716_NOSE_CALIBERS,
  TN3716_OGIVE_RADIUS_CALIBERS,
  TN3716_ZERO_INCIDENCE,
} from '../../src/validation/ogive-cylinder-tn3716';

describe('NACA TN 3716 data (ogive-cylinder, M = 1.98)', () => {
  it('the model is a tangent ogive: its 9.25 d arc radius follows from a 3-caliber nose', () => {
    // A tangent ogive of length L and base radius R has arc radius
    // (R^2 + L^2) / (2 R); with R = 0.5 d and L = 3 d that is 9.25 d.
    const R = 0.5;
    const L = TN3716_NOSE_CALIBERS;
    expect((R * R + L * L) / (2 * R)).toBeCloseTo(TN3716_OGIVE_RADIUS_CALIBERS, 12);
    // And the profile module's tangent ogive lies on that arc.
    const nose = { shape: { kind: 'ogive', parameter: 1 } as const, length: L, baseRadius: R };
    for (const x of [0.5, 1.5, 2.5]) {
      const y = noseRadius(nose, x);
      expect(Math.hypot(x - L, y - (R - TN3716_OGIVE_RADIUS_CALIBERS))).toBeCloseTo(
        TN3716_OGIVE_RADIUS_CALIBERS,
        10,
      );
    }
  });

  it('transcription is consistent: stations increase, pressure falls along the nose', () => {
    const stations = TN3716_ZERO_INCIDENCE.map((p) => p.xOverD);
    expect(stations).toEqual([...stations].sort((a, b) => a - b));
    // On the convex nose (x/d < 3) the flow expands: Cp falls monotonically.
    const nose = TN3716_ZERO_INCIDENCE.filter((p) => p.xOverD < 3);
    for (let k = 1; k < nose.length; k++) expect(nose[k]!.cp).toBeLessThan(nose[k - 1]!.cp);
  });
});
