/**
 * A value and its error band as shown: the band to two significant
 * digits, the value to the same last digit. An interval's ends are
 * rounded outward, never inward.
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

/**
 * The ends of an interval to `digits` decimals, the low end rounded down
 * and the high end up, so that the interval shown contains the interval
 * computed.
 */
export function outward(low: number, high: number, digits: number): [string, string] {
  const unit = 10 ** digits;
  // A zero end is shown unsigned, not as "-0.0000".
  const show = (x: number) => (x === 0 ? 0 : x).toFixed(digits);
  return [show(Math.floor(low * unit) / unit), show(Math.ceil(high * unit) / unit)];
}

/**
 * An interval of fractions as signed percentages to one decimal, rounded
 * outward: "-12.4% to +18.1%".
 */
export function outwardPercent(low: number, high: number): string {
  const [a, b] = outward(100 * low, 100 * high, 1);
  const signed = (s: string) => (Number(s) > 0 ? `+${s}` : s);
  return `${signed(a)}% to ${signed(b)}%`;
}
