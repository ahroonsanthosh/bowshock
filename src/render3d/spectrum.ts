/**
 * The 3D view's colour map: a fully saturated spectrum, low values blue,
 * then azure, cyan, green, yellow, orange and red, high values magenta
 * (src/render/colormap.ts holds the control colours, shared with the side
 * view), interpolated linearly in sRGB between neighbours (which keeps
 * every colour on the spectrum fully saturated).
 */

import { hexToRgb, SPECTRUM_STOPS } from '../render/colormap';

export { SPECTRUM_STOPS };

const STOPS = SPECTRUM_STOPS.map(hexToRgb);

/** The colour (sRGB, 0..1) at t in [0, 1] (clamped). */
export function spectrum(t: number): [number, number, number] {
  const s = Math.min(Math.max(Number.isFinite(t) ? t : 0, 0), 1) * (STOPS.length - 1);
  const k = Math.min(Math.floor(s), STOPS.length - 2);
  const f = s - k;
  const a = STOPS[k]!;
  const b = STOPS[k + 1]!;
  return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2])];
}

/** `count` colours (RGBA, 0..1) evenly spaced along the spectrum, for the GPU. */
export function spectrumTable(count = 256): Float32Array<ArrayBuffer> {
  const table = new Float32Array(4 * count);
  for (let k = 0; k < count; k++) table.set([...spectrum(k / (count - 1)), 1], 4 * k);
  return table;
}

/** A CSS colour for t in [0, 1]. */
export function spectrumCss(t: number): string {
  const [r, g, b] = spectrum(t).map((c) => Math.round(255 * c));
  return `rgb(${r}, ${g}, ${b})`;
}
