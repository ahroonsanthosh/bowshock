/**
 * A sequential colour map, interpolated in the Oklab colour space (B.
 * Ottosson, "A perceptual color space for image processing", 2020) so that
 * equal steps in value look like equal steps in colour. The control colours
 * are bowshock's own choice: deep blue through teal to a warm light yellow.
 */

const CONTROL_COLOURS = ['#0b1a3a', '#1d4e89', '#1f8a8a', '#7cc47f', '#f4e9a6'] as const;

/**
 * The spectrum of the app's views (docs/design/0017-rocketeer-interface.md
 * section 6): fully saturated, low values to high, blue, azure, cyan,
 * green, yellow, orange, red and magenta at the top (the order of
 * FluidX3D's rainbow, which the owner chose as the look, learnt from its
 * pictures only), interpolated linearly in sRGB between neighbours (which
 * keeps every colour on it saturated). bowshock's own control colours,
 * shared with the 3D scene (src/render3d/spectrum.ts); no other program's
 * table is used.
 */
export const SPECTRUM_STOPS = [
  '#1e2bff', // blue
  '#0a8cff', // azure
  '#00e1ff', // cyan
  '#14f046', // green
  '#f2f20f', // yellow
  '#ff8c0a', // orange
  '#ff1e1e', // red
  '#ff1fd2', // magenta
] as const;

/** `count` colours (RGBA, 0..1) evenly spaced along the spectrum. */
export function spectrumTable(count = 256): Float32Array<ArrayBuffer> {
  const stops = SPECTRUM_STOPS.map(hexToRgb);
  const table = new Float32Array(4 * count);
  for (let k = 0; k < count; k++) {
    const s = (k / (count - 1)) * (stops.length - 1);
    const i = Math.min(Math.floor(s), stops.length - 2);
    const f = s - i;
    const a = stops[i]!;
    const b = stops[i + 1]!;
    table.set(
      [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2]), 1],
      4 * k,
    );
  }
  return table;
}

/**
 * Numerical schlieren drawn light on dark (docs/design/0012-interface.md,
 * decision 2): uniform flow in the dark shade, the steepest density
 * gradients (shocks) in the light one, linearly between them.
 */
export const SCHLIEREN_DARK = '#0b0e13';
export const SCHLIEREN_LIGHT = '#f2f4f7';

type Rgb = readonly [number, number, number];

/** A colour #rrggbb as red, green and blue from 0 to 1. */
export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** sRGB (0..1) to Oklab, using the published matrices of the Oklab definition. */
export function srgbToOklab([r, g, b]: Rgb): Rgb {
  const [R, G, B] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Oklab to sRGB (0..1), clamped to the displayable range. */
export function oklabToSrgb([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (c: number) => Math.min(1, Math.max(0, toSrgb(c)));
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** `count` colours (RGBA, 0..1) evenly spaced along the colour map. */
export function colormapTable(count = 256): Float32Array<ArrayBuffer> {
  const stops = CONTROL_COLOURS.map((c) => srgbToOklab(hexToRgb(c)));
  const table = new Float32Array(4 * count);
  for (let k = 0; k < count; k++) {
    const t = (k / (count - 1)) * (stops.length - 1);
    const segment = Math.min(Math.floor(t), stops.length - 2);
    const f = t - segment;
    const a = stops[segment]!;
    const b = stops[segment + 1]!;
    const lab: Rgb = [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2])];
    table.set([...oklabToSrgb(lab), 1], 4 * k);
  }
  return table;
}
