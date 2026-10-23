/**
 * The quantities the 3D view colours by (key Z cycles them), each with its
 * own palette, from the solver's cell values: the Mach number, the speed,
 * the density, the temperature and the pressure coefficient. With the
 * free stream's static temperature known, the speed is in m/s and the
 * temperature in kelvin; otherwise both are ratios to the free stream's.
 *
 * Palettes are bowshock's own: the speed and the Mach number on the fully
 * saturated spectrum (./spectrum.ts); the density, the temperature and
 * the pressure coefficient on maps interpolated in the Oklab colour space
 * (src/render/colormap.ts), so that equal steps in value look like equal
 * steps in colour.
 */

import { hexToRgb, oklabToSrgb, srgbToOklab } from '../render/colormap';
import { freeStreamMach, type DualMesh, type MeridionalField } from './field';
import { spectrum } from './spectrum';

export type Quantity = 'mach' | 'speed' | 'density' | 'temperature' | 'cp';

export const QUANTITIES: readonly Quantity[] = ['mach', 'speed', 'density', 'temperature', 'cp'];

/** Specific gas constant of air, J/(kg K) (US Standard Atmosphere 1976: 8314.32 / 28.9644). */
export const AIR_GAS_CONSTANT = 287.0528;

export interface QuantityScale {
  readonly quantity: Quantity;
  /** Name for the legend. */
  readonly label: string;
  /** Unit for the legend ('' for a pure number, named in `label`). */
  readonly unit: string;
  /** Value of each cell. */
  readonly cellValue: (c: number) => number;
  /** Value in the free stream. */
  readonly freeValue: number;
  /** Colour (sRGB, 0..1) at t in [0, 1] of the range. */
  readonly palette: (t: number) => [number, number, number];
}

/** What the scale needs beyond the field: the free stream's static temperature, kelvin, if known. */
export interface Units {
  readonly freeStreamTemperature?: number | undefined;
}

export function quantityScale(
  field: MeridionalField,
  quantity: Quantity,
  units: Units = {},
): QuantityScale {
  const { gamma, freeStream: f } = field;
  const aFree = Math.sqrt((gamma * f.p) / f.rho);
  const vFree = Math.hypot(f.u, f.v);
  const tFree = f.p / f.rho;
  const T = units.freeStreamTemperature;
  const known = T !== undefined && T > 0;
  const speedScale = known ? Math.sqrt(gamma * AIR_GAS_CONSTANT * T) / aFree : 1 / vFree;
  const tempScale = known ? T / tFree : 1 / tFree;
  switch (quantity) {
    case 'mach':
      return {
        quantity,
        label: 'Mach number',
        unit: '',
        cellValue: (c) =>
          Math.hypot(field.u[c]!, field.v[c]!) / Math.sqrt((gamma * field.p[c]!) / field.rho[c]!),
        freeValue: freeStreamMach(field),
        palette: spectrum,
      };
    case 'speed':
      return {
        quantity,
        label: known ? 'Speed' : 'Speed over free stream',
        unit: known ? 'm/s' : 'V/V∞',
        cellValue: (c) => Math.hypot(field.u[c]!, field.v[c]!) * speedScale,
        freeValue: vFree * speedScale,
        palette: spectrum,
      };
    case 'density':
      return {
        quantity,
        label: 'Density over free stream',
        unit: 'ρ/ρ∞',
        cellValue: (c) => field.rho[c]! / f.rho,
        freeValue: 1,
        palette: DENSITY_PALETTE,
      };
    case 'temperature':
      return {
        quantity,
        label: known ? 'Temperature' : 'Temperature over free stream',
        unit: known ? 'K' : 'T/T∞',
        cellValue: (c) => (field.p[c]! / field.rho[c]!) * tempScale,
        freeValue: tFree * tempScale,
        palette: TEMPERATURE_PALETTE,
      };
    case 'cp':
      return {
        quantity,
        label: 'Pressure coefficient',
        unit: 'Cp',
        cellValue: (c) => (field.p[c]! - f.p) / (0.5 * f.rho * vFree * vFree),
        freeValue: 0,
        palette: PRESSURE_PALETTE,
      };
  }
}

/** A palette through these colours, interpolated in Oklab. */
export function oklabPalette(colours: readonly string[]): (t: number) => [number, number, number] {
  const stops = colours.map((c) => srgbToOklab(hexToRgb(c)));
  return (t) => {
    const s = Math.min(Math.max(Number.isFinite(t) ? t : 0, 0), 1) * (stops.length - 1);
    const k = Math.min(Math.floor(s), stops.length - 2);
    const f = s - k;
    const a = stops[k]!;
    const b = stops[k + 1]!;
    const [r, g, bl] = oklabToSrgb([
      a[0] + f * (b[0] - a[0]),
      a[1] + f * (b[1] - a[1]),
      a[2] + f * (b[2] - a[2]),
    ]);
    return [r, g, bl];
  };
}

/** Density: deep blue through teal and green to a light yellow (as the 2D view's map, brighter). */
export const DENSITY_PALETTE = oklabPalette([
  '#1b2fd0',
  '#1f7fd8',
  '#14b8a6',
  '#6fdc5a',
  '#f6f08a',
]);
/** Temperature: violet through red and orange to a light yellow. */
export const TEMPERATURE_PALETTE = oklabPalette([
  '#5a19c8',
  '#c4167a',
  '#f2402a',
  '#ff9a1a',
  '#fff27a',
]);
/** Pressure coefficient: blue (expansion) through a light grey (the free stream's) to red (compression). */
export const PRESSURE_PALETTE = oklabPalette([
  '#2a5cff',
  '#58b8ff',
  '#e8e8ec',
  '#ff9a5a',
  '#ff2a3a',
]);

/** Values of a quantity at the dual mesh's vertices (each its cell's). */
export function dualValues(mesh: DualMesh, scale: QuantityScale): Float64Array {
  const values = new Float64Array(mesh.cell.length);
  const byCell = new Map<number, number>();
  for (let k = 0; k < values.length; k++) {
    const c = mesh.cell[k]!;
    let q = byCell.get(c);
    if (q === undefined) {
      q = scale.cellValue(c);
      byCell.set(c, q);
    }
    values[k] = q;
  }
  return values;
}

/** A colour range, and the cells' own extremes (beyond it where the range clips them). */
export interface ColourRange {
  readonly min: number;
  readonly max: number;
  readonly cellMin: number;
  readonly cellMax: number;
}

/**
 * The colour range of a quantity: from the value below which lie `tail`
 * of the computed volume to the value above which lie `tail` of it (each
 * cell weighted by its volume of revolution, r dA), widened to take in
 * the free stream's; for the pressure coefficient, symmetric about 0 so
 * that the free stream sits at the palette's middle. So a tiny region of
 * extreme values (the stagnation point of a blunt tip, at Mach 0) does not
 * take the whole palette from the rest of the flow; values beyond the
 * range are drawn in its end colours, and the legend says so.
 */
export function quantityRange(
  field: MeridionalField,
  scale: QuantityScale,
  tail = 0.005,
): ColourRange {
  const { ni, nj, x, r } = field;
  const n = ni * nj;
  const cells: { value: number; weight: number }[] = [];
  let cellMin = Infinity;
  let cellMax = -Infinity;
  let total = 0;
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      const k = [
        i + j * (ni + 1),
        i + 1 + j * (ni + 1),
        i + 1 + (j + 1) * (ni + 1),
        i + (j + 1) * (ni + 1),
      ];
      let area = 0;
      let rc = 0;
      for (let q = 0; q < 4; q++) {
        const a = k[q]!;
        const b = k[(q + 1) % 4]!;
        area += 0.5 * (x[a]! * r[b]! - x[b]! * r[a]!);
        rc += 0.25 * r[a]!;
      }
      const value = scale.cellValue(i + j * ni);
      const weight = Math.abs(area) * Math.max(rc, 0);
      cells.push({ value, weight });
      total += weight;
      cellMin = Math.min(cellMin, value);
      cellMax = Math.max(cellMax, value);
    }
  }
  let lo = cellMin;
  let hi = cellMax;
  if (n > 0 && total > 0) {
    cells.sort((p, q) => p.value - q.value);
    let sum = 0;
    lo = cells[0]!.value;
    for (const c of cells) {
      sum += c.weight;
      if (sum > tail * total) {
        lo = c.value;
        break;
      }
    }
    sum = 0;
    hi = cells[cells.length - 1]!.value;
    for (let q = cells.length - 1; q >= 0; q--) {
      sum += cells[q]!.weight;
      if (sum > tail * total) {
        hi = cells[q]!.value;
        break;
      }
    }
  }
  let min = Math.min(lo, scale.freeValue);
  let max = Math.max(hi, scale.freeValue);
  if (scale.quantity === 'cp') {
    const m = Math.max(Math.abs(min), Math.abs(max));
    min = -m;
    max = m;
  }
  if (!(max > min)) {
    min -= 0.5;
    max += 0.5;
  }
  return { min, max, cellMin, cellMax };
}
