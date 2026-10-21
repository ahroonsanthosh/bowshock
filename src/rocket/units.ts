/**
 * Lengths as the builder asks them (docs/design/0017-rocketeer-interface.md
 * section 2): millimetres by default or inches, each shown with its value
 * in calibres (the body's diameter) beside it. The model keeps metres
 * (./design.ts); what is typed is read in the unit shown and converted
 * once, and a length the user has not typed is shown to enough digits to
 * read back to the same metres.
 */

export type LengthUnit = 'mm' | 'in';

/** Metres in one unit: the inch is 0.0254 m exactly. */
export const METRES_PER: Readonly<Record<LengthUnit, number>> = { mm: 1e-3, in: 0.0254 };

/** A length typed in `unit`, in metres. */
export function toMetres(value: number, unit: LengthUnit): number {
  return value * METRES_PER[unit];
}

/** A length in metres, in `unit`. */
export function fromMetres(metres: number, unit: LengthUnit): number {
  return metres / METRES_PER[unit];
}

/**
 * A length for a field: in `unit`, to seven significant digits (a micron
 * on a metre-long rocket), trailing zeros dropped, so that a preset's
 * exact length is shown as it is used.
 */
export function lengthText(metres: number, unit: LengthUnit): string {
  if (!Number.isFinite(metres)) return '';
  return String(Number(fromMetres(metres, unit).toPrecision(7)));
}

/** A length in calibres, as shown beside a field: three decimals. */
export function calibresText(metres: number, diameter: number): string {
  const c = metres / diameter;
  return Number.isFinite(c) && diameter > 0 ? `${c.toFixed(3)} cal` : '';
}

/** A round length for a scale bar: the largest of 1, 2 and 5 times a power of ten not above `most`. */
export function scaleBarLength(most: number): number {
  if (!(most > 0 && Number.isFinite(most))) return 0;
  const power = 10 ** Math.floor(Math.log10(most));
  for (const step of [5, 2, 1]) {
    if (step * power <= most) return step * power;
  }
  return power;
}

/** Where the unit chosen is remembered. */
const STORAGE_KEY = 'bowshock:units';

/** The unit remembered from the last visit, or millimetres. */
export function rememberedUnit(): LengthUnit {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'in' ? 'in' : 'mm';
  } catch {
    return 'mm';
  }
}

export function rememberUnit(unit: LengthUnit): void {
  try {
    localStorage.setItem(STORAGE_KEY, unit);
  } catch {
    // Storage refused (private mode): the unit is simply not kept.
  }
}
