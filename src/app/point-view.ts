/**
 * What the page shows of one point of the curve, without the DOM
 * (docs/design/0017-rocketeer-interface.md sections 5 and 8): its C_D and
 * band as the drag page writes them (four decimals, the band rounded
 * outward, its percentages too), its status in a word and a sentence, and
 * for a point without a number the plain reason and what could change it.
 * The chart, the table, the pinned line and the PNG all show these.
 */

import { withoutText } from '../rocket/adapter';
import { outward, outwardPercent } from './band';
import type { CurvePoint } from './curve';
import {
  changeText,
  chooseWords,
  CLAIM_WORDS,
  noNumberWords,
  noseWords,
  provisionalWords,
  refusalWords,
  solvingWords,
  STOPPED,
  WAITING,
  type PlainReason,
  type StatusWords,
} from './status-words';

export interface PointView {
  /** Two decimals: "2.00". */
  readonly mach: string;
  /** C_D to four decimals, or a provisional value to three; null where there is none. */
  readonly value: string | null;
  /** The model-form band rounded outward, "0.4823 to 0.6493"; null without one. */
  readonly band: string | null;
  /** The band as percentages of the value, rounded outward. */
  readonly percent: string | null;
  readonly status: StatusWords;
  /** "To get a number: ..." for a point without a number, else null. */
  readonly change: string | null;
  /** "without the launch lug", or ''. */
  readonly without: string;
}

/** C_D's decimals, as the drag page shows it (total-drag-display.ts). */
const DIGITS = 4;

/** The plain words of a point without a number. */
function plainOf(point: CurvePoint): PlainReason | null {
  const s = point.state;
  if (s.kind !== 'done') return null;
  const r = s.result;
  switch (r.kind) {
    case 'refused': {
      const first = r.refusals[0];
      const noseFirst = first === undefined || first.component === 'nose wave drag';
      if (r.nose !== null && noseFirst) return noseWords(r.nose, false);
      return first === undefined ? noseWords('gpu-failed', false) : refusalWords(first);
    }
    case 'not-modelled': {
      const f = r.features[0]!;
      return { reason: `bowshock does not model ${f.feature} (${f.reason})`, change: f.change };
    }
    case 'total':
    case 'choose':
      return null;
  }
}

/** One point as the page shows it; `finer` says whether a finer grid is offered. */
export function pointView(point: CurvePoint, finer: boolean): PointView {
  const mach = point.mach.toFixed(2);
  const none = { value: null, band: null, percent: null, change: null, without: '' };
  const s = point.state;
  switch (s.kind) {
    case 'waiting':
      return { mach, ...none, status: WAITING };
    case 'stopped':
      return { mach, ...none, status: STOPPED };
    case 'solving':
      return s.grid === 0 || s.provisional === null
        ? { mach, ...none, status: solvingWords(s.grids) }
        : {
            mach,
            ...none,
            value: s.provisional.toFixed(3),
            status: provisionalWords(s.grid, s.grids),
          };
    case 'done':
      break;
  }
  const r = s.result;
  if (r.kind === 'total') {
    const t = r.view.total;
    const [low, high] = outward(t.low, t.high, DIGITS);
    return {
      mach,
      value: t.cd.toFixed(DIGITS),
      band: `${low} to ${high}`,
      percent: outwardPercent(t.low / t.cd - 1, t.high / t.cd - 1),
      status: CLAIM_WORDS[r.view.claim.kind],
      change: null,
      without: withoutText(r.without),
    };
  }
  if (r.kind === 'choose') {
    return { mach, ...none, status: chooseWords(r.excludable.map((e) => e.part)) };
  }
  const plain = plainOf(point)!;
  // The nose's "finer grid" suggestion only where one is offered.
  const fixed = r.kind === 'refused' && r.nose === 'no-band' ? noseWords('no-band', finer) : plain;
  return {
    mach,
    ...none,
    status: noNumberWords(fixed.reason),
    change: changeText(fixed),
  };
}
