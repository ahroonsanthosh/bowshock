/**
 * A value and its error band as shown: the band to two significant
 * digits, the value to the same last digit.
 */

/**
 * `value ± band` with the band rounded up, and widened by half a unit of
 * the last digit shown, so that the interval shown contains the interval
 * computed whatever the rounding of the value.
 */
export function withBand(value: number, band: number): string {
  const digits = Math.max(0, -Math.floor(Math.log10(band)) + 1);
  const unit = 10 ** -digits;
  const shown = Math.ceil(band / unit + 0.5) * unit;
  return `${value.toFixed(digits)} ± ${shown.toFixed(digits)}`;
}
