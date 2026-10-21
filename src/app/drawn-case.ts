/**
 * The case whose flow the live flow page draws, as a saved PNG names and
 * captions it. A new run keeps the last flow drawn (frozen) while it stops
 * the old run and sets up its first grid; until that grid is drawn, the
 * PNG is of the old case, so it is named and captioned from the case
 * recorded when its grid was drawn, never from the controls.
 */

import { formatFixed } from '../ui/format';

export interface DrawnCase {
  /** The run (its generation) whose grid is drawn. */
  readonly run: number;
  readonly mach: number;
  /** The grid drawn, as the readout writes it. */
  readonly grid: string;
  /** The value on that grid with its status, as last shown for that run. */
  readonly value: string;
}

export class DrawnCaseRecord {
  private drawn: DrawnCase | null = null;

  /** The case drawn now, if a flow has been drawn. */
  get current(): DrawnCase | null {
    return this.drawn;
  }

  /** A run's grid is drawn (each grid of the run, in turn). */
  drawnGrid(run: number, mach: number, grid: string): void {
    const value = this.drawn?.run === run ? this.drawn.value : 'wave Cd: solving, no check yet';
    this.drawn = { run, mach, grid, value };
  }

  /** A check of a run: its drag on the grid drawn. A run not drawn is not the PNG's. */
  checked(run: number, drag: number): void {
    if (this.drawn?.run !== run) return;
    this.drawn = {
      ...this.drawn,
      value: `wave Cd on this grid ${drag.toFixed(5)} (solving, not verified)`,
    };
  }

  /** A run's outcome: its value (or none) and status. */
  settled(run: number, value: string, status: string): void {
    if (this.drawn?.run !== run) return;
    this.drawn = { ...this.drawn, value: `wave Cd ${value} (${status})` };
  }
}

/** The PNG's file name: the case drawn and what is shown of it ('split' or the field). */
export function pngName(drawn: DrawnCase, shown: string): string {
  return `bowshock-basic-finner-M${drawn.mach}-${shown}.png`;
}

/** The PNG's caption lines: the case drawn, its grid, and its value with its status. */
export function pngCaption(drawn: DrawnCase): string[] {
  return [
    `bowshock: the Basic Finner, M ${formatFixed(drawn.mach, 2)}, α 0°, grid ${drawn.grid}`,
    drawn.value,
  ];
}
