import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { colormapTable, oklabToSrgb, srgbToOklab } from '../../src/render/colormap';

describe('Oklab conversion', () => {
  // The published forward and inverse matrices are given to about ten
  // significant figures and are not exact inverses, so the round trip is
  // exact to about 5e-7: far finer than one step of an 8-bit channel (4e-3).
  it('property: sRGB -> Oklab -> sRGB is the identity', () => {
    const channel = fc.double({ min: 0, max: 1, noNaN: true });
    fc.assert(
      fc.property(channel, channel, channel, (r, g, b) => {
        const back = oklabToSrgb(srgbToOklab([r, g, b]));
        expect(Math.abs(back[0] - r)).toBeLessThan(5e-6);
        expect(Math.abs(back[1] - g)).toBeLessThan(5e-6);
        expect(Math.abs(back[2] - b)).toBeLessThan(5e-6);
      }),
      { seed: 81 },
    );
  });

  it('maps white to L = 1 with no chroma, and black to 0', () => {
    const white = srgbToOklab([1, 1, 1]);
    expect(white[0]).toBeCloseTo(1, 4);
    expect(white[1]).toBeCloseTo(0, 4);
    expect(white[2]).toBeCloseTo(0, 4);
    expect(srgbToOklab([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('reproduces the Oklab coordinates of pure sRGB red given in its definition', () => {
    const red = srgbToOklab([1, 0, 0]);
    expect(red[0]).toBeCloseTo(0.627955, 4);
    expect(red[1]).toBeCloseTo(0.224863, 4);
    expect(red[2]).toBeCloseTo(0.125846, 4);
  });
});

describe('colour map', () => {
  it('rises monotonically in lightness, so it reads as a sequential scale', () => {
    const table = colormapTable(64);
    let previous = -Infinity;
    for (let k = 0; k < 64; k++) {
      const L = srgbToOklab([table[4 * k]!, table[4 * k + 1]!, table[4 * k + 2]!])[0];
      expect(L).toBeGreaterThan(previous);
      previous = L;
    }
  });
});
