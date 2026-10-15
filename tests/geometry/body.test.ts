import { describe, expect, it } from 'vitest';
import { bodyBreakpoints, bodyRadius, type Body } from '../../src/geometry/body';
import { noseRadius } from '../../src/geometry/nose';

describe('bodies', () => {
  it('nose then cylinder, with breakpoints at the tip, shoulder and end', () => {
    const body: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 7,
    };
    expect(bodyRadius(body, -1)).toBe(0);
    expect(bodyRadius(body, 1.5)).toBe(noseRadius(body.nose, 1.5));
    expect(bodyRadius(body, 5)).toBe(0.5);
    expect(bodyBreakpoints(body)).toEqual([0, 3, 10]);
  });
});
