/**
 * Numbers as the interface shows them. Pure functions, so that every page
 * writes the same quantity the same way; the readout's face has tabular
 * numerals, so these never pad with spaces to align.
 */

/** A thin space between groups of three digits: 41 200. */
const GROUP = ' ';
/** The minus sign, not the hyphen. */
const MINUS = '−';

/** Replace a leading hyphen-minus by the minus sign. */
function minus(text: string): string {
  return text.startsWith('-') ? MINUS + text.slice(1) : text;
}

/** An integer with its digits grouped in threes past four digits: 4120, and 41200 as "41 200" (a thin space). */
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const digits = Math.abs(Math.round(n)).toString();
  // Four-digit numbers stay whole, as in most style guides.
  const grouped = digits.length <= 4 ? digits : digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
  return n < 0 ? MINUS + grouped : grouped;
}

/** A fixed number of decimals, with the minus sign. */
export function formatFixed(x: number, decimals: number): string {
  return minus(x.toFixed(decimals));
}

/**
 * Scientific notation with `digits` significant digits after the first,
 * written as 3.1e-10 (the exponent without a plus sign or padding).
 */
export function formatExponent(x: number, digits = 1): string {
  if (x === 0) return '0';
  return minus(x.toExponential(digits).replace('e+', 'e'));
}

/** A signed percentage with a fixed number of decimals: +0.12%, −0.03%, 0.00%. */
export function formatSignedPercent(fraction: number, decimals = 2): string {
  const text = (100 * fraction).toFixed(decimals);
  const value = Number(text);
  const signed = value > 0 ? `+${text}` : value < 0 ? minus(text) : (0).toFixed(decimals);
  return `${signed}%`;
}

const PREFIXES = [
  { factor: 1e12, prefix: 'T' },
  { factor: 1e9, prefix: 'G' },
  { factor: 1e6, prefix: 'M' },
  { factor: 1e3, prefix: 'k' },
] as const;

/**
 * A rate with an SI prefix and three significant digits:
 * 2.12e8 cells per second as "212 Mcell/s".
 */
export function formatRate(perSecond: number, unit: string): string {
  if (!(perSecond > 0) || !Number.isFinite(perSecond)) return `0 ${unit}/s`;
  const scale = PREFIXES.find((p) => perSecond >= p.factor) ?? { factor: 1, prefix: '' };
  const value = perSecond / scale.factor;
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${scale.prefix}${unit}/s`;
}

/** A legend's end value: three significant digits, scientific outside 1e-3 to 1e4. */
export function formatScaleValue(x: number): string {
  if (!Number.isFinite(x)) return String(x);
  if (x === 0) return '0';
  const magnitude = Math.abs(x);
  if (magnitude < 1e-3 || magnitude >= 1e4) return formatExponent(x, 2);
  return minus(x.toPrecision(3));
}

/** Grid size as "640×80" (no spaces, so that it never breaks). */
export function formatGrid(ni: number, nj: number): string {
  return `${formatCount(ni)}×${formatCount(nj)}`;
}

/** An angle in degrees, signed when asked: "+10°", "0°", "−10°". */
export function formatDegrees(degrees: number, signed = false, decimals = 0): string {
  const text = degrees.toFixed(decimals);
  const value = Number(text);
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${minus(text)}°`;
}
