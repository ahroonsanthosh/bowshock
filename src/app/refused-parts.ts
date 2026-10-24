/**
 * The words a refused total's parts and floor are shown in
 * (docs/design/0011-total-drag-on-the-page.md section 10.5), shared by
 * Details (./total-drag-display.ts), the point block and the table
 * (./point-view.ts), the CSV (./curve-csv.ts) and the PNG's caption. The
 * logic decides (src/total/refused-floor.ts); these only word it.
 */

import type { PartNotShown, RefusedFloor, RefusedTotalParts } from '../total/refused-floor';
import type { DragComponent } from '../total/total-drag';
import { outward } from './band';

/** C_D's decimals, as the drag page shows it. */
const DIGITS = 4;

/** The point block's and the table's heading of the parts. */
export const KNOWN_HEADING = 'Known here, though the total has no number:';
/** Details' caption of the parts. */
export const PARTS_CAPTION = 'The parts served, each with its band (the total is refused)';

/** A value rounded down (never up) to `digits` decimals. */
export function roundedDown(x: number, digits: number): string {
  return outward(x, x, digits)[0];
}

/** A value rounded down to three significant figures, at most DIGITS decimals. */
export function roundedDownShort(x: number): string {
  const digits =
    x === 0 ? DIGITS : Math.min(DIGITS, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x)))));
  return roundedDown(x, digits);
}

/** "nose wave drag 0.0620 (0.0619 to 0.0621)": a part's name, value and band rounded outward. */
export function partLine(c: DragComponent): string {
  const [low, high] = outward(c.low, c.high, DIGITS);
  return `${c.name} ${c.cd.toFixed(DIGITS)} (${low} to ${high})`;
}

/** A part's label and band source, word for word. */
export function partLabel(c: DragComponent): string {
  return `${c.label}; band: ${c.band}`;
}

/** "fin wave drag: not shown: ...". */
export function notShownLine(p: PartNotShown): string {
  return `${p.name}: not shown: ${p.reason}`;
}

/**
 * The floor, or why none is given: "At least F: a floor, not an estimate:
 * ..." with F rounded down to four decimals (`short`: three significant
 * figures), or "No floor is given: ...".
 */
export function floorText(floor: RefusedFloor, short = false): string {
  if (floor.kind === 'withheld') return `No floor is given: ${floor.reasons.join('; ')}.`;
  const value = short ? roundedDownShort(floor.value) : roundedDown(floor.value, DIGITS);
  return `At least ${value}: ${floor.label}.`;
}

/** The floor's value for the CSV's own column, rounded down; '' where none is given. */
export function floorValue(floor: RefusedFloor): string {
  return floor.kind === 'floor' ? roundedDown(floor.value, DIGITS) : '';
}

/** The parts and the floor in one line of text: the CSV's and the table's. */
export function partsSentence(parts: RefusedTotalParts, labels: boolean): string {
  const items = parts.served.map((c) => (labels ? `${partLine(c)}: ${partLabel(c)}` : partLine(c)));
  const shown = items.length === 0 ? 'no part is served' : items.join('; ');
  const notShown =
    parts.notShown.length === 0 ? '' : ` ${parts.notShown.map(notShownLine).join('; ')}.`;
  return `${KNOWN_HEADING} ${shown}.${notShown} ${floorText(parts.floor)}`;
}
