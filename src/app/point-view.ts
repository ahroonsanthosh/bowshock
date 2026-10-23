/**
 * What the page shows of one point of the curve, without the DOM
 * (docs/design/0017-rocketeer-interface.md sections 5 and 8): its C_D and
 * band as the drag page writes them (four decimals, the band rounded
 * outward, its percentages too), its status in a word and a sentence, and
 * for a point without a number the plain reason and what could change it.
 * The chart and the table show these; the point block, the pinned line and
 * the PNG show the headline: three significant figures where the band is
 * wider than 1% of the value (the advisor's item 6), since a fourth
 * decimal would claim more than the band allows. Details and the CSV keep
 * the full figures.
 */

import { withoutText } from '../rocket/adapter';
import { outward, outwardPercent } from './band';
import type { CurvePoint } from './curve';
import {
  changeText,
  chooseWords,
  claimWords,
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
  /**
   * The headline's C_D: `value`, or three significant figures where the
   * band is wider than 1% of it (HEADLINE_BAND); null where there is none.
   */
  readonly headline: string | null;
  /** The band to the headline's decimals, rounded outward; null without one. */
  readonly headlineBand: string | null;
  readonly status: StatusWords;
  /**
   * For a point without a number, what could change that for all its
   * reasons together ("To get a number: ..." only where one change clears
   * every reason), else null.
   */
  readonly change: string | null;
  /** Every reason a point has no number, in plain words; empty for any other point. */
  readonly reasons: readonly string[];
  /** "without the launch lug", or ''. */
  readonly without: string;
  /** A validated point: the logic's claim text and its caveats, word for word; else null and none. */
  readonly claim: string | null;
  readonly caveats: readonly string[];
}

/**
 * The result line of a point, as the PNG's caption gives it: its C_D, the
 * band and the status word ("C_D 0.552, band 0.48 to 0.65: Validated").
 */
export function resultLine(v: PointView): string {
  return `C_D ${v.headline ?? 'none'}${v.headlineBand === null ? '' : `, band ${v.headlineBand}`}: ${v.status.word}`;
}

/** C_D's decimals, as the drag page shows it (total-drag-display.ts). */
const DIGITS = 4;

/** A band wider than this fraction of the value (on either side) puts the headline to three significant figures. */
export const HEADLINE_BAND = 0.01;

/**
 * The headline's decimals for a total of `cd` with the band `low` to
 * `high`: DIGITS where the band is within HEADLINE_BAND of the value, else
 * three significant figures (never more than DIGITS).
 */
export function headlineDigits(cd: number, low: number, high: number): number {
  const wide = Math.max(1 - low / cd, high / cd - 1) > HEADLINE_BAND;
  if (!wide) return DIGITS;
  return Math.min(DIGITS, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(cd)))));
}

/**
 * Every reason a point has no number, in plain words, in the logic's order
 * and each once: the nose's end (where it is the nose that gave no term)
 * in place of the logic's nose refusal, then every other refusal. Null for
 * a point that is not finished or has a number. `finer` says whether a
 * finer grid is offered.
 */
export function plainReasons(point: CurvePoint, finer: boolean): readonly PlainReason[] | null {
  const s = point.state;
  if (s.kind !== 'done') return null;
  const r = s.result;
  switch (r.kind) {
    case 'refused': {
      const out: PlainReason[] = [];
      const add = (p: PlainReason) => {
        if (!out.some((q) => q.reason === p.reason)) out.push(p);
      };
      const nose = r.nose === null ? null : noseWords(r.nose, finer);
      if (nose !== null && !r.refusals.some((x) => x.component === 'nose wave drag')) add(nose);
      for (const x of r.refusals) {
        add(x.component === 'nose wave drag' && nose !== null ? nose : refusalWords(x));
      }
      if (out.length === 0) add(noseWords('gpu-failed', false));
      return out;
    }
    case 'not-modelled':
      return r.features.map((f) => ({
        reason: `bowshock does not model ${f.feature} (${f.reason})`,
        change: f.change,
      }));
    case 'total':
    case 'choose':
      return null;
  }
}

/** The no-WebGPU reason's words, to name the browser beside the rocket. */
const NO_WEBGPU_REASON = noseWords('no-webgpu', false).reason;

/**
 * What could give a point a number, for all its reasons together. One
 * change is offered as giving a number only where there is one reason;
 * where any reason has no change about the rocket, nothing does; where
 * there are several, each is said to need its own.
 */
export function changeOfAll(reasons: readonly PlainReason[]): string {
  if (reasons.length === 1) return changeText(reasons[0]!);
  if (reasons.some((p) => p.change === '')) {
    const browser = reasons.some((p) => p.reason === NO_WEBGPU_REASON);
    return `Nothing about the rocket${browser ? ' or the browser' : ''} changes this: this speed has no number yet.`;
  }
  return `No one change gives a number here: each reason needs its own (${reasons
    .map((p) => p.change)
    .join('; ')}).`;
}

/** The sentence of a point without a number: its one reason, or how many there are. */
function reasonSentence(reasons: readonly PlainReason[]): string {
  const n = reasons.length;
  return n === 1
    ? reasons[0]!.reason
    : `${n === 2 ? 'two' : n === 3 ? 'three' : n === 4 ? 'four' : String(n)} reasons, each listed below`;
}

/** One point as the page shows it; `finer` says whether a finer grid is offered. */
export function pointView(point: CurvePoint, finer: boolean): PointView {
  const mach = point.mach.toFixed(2);
  const none = {
    value: null,
    band: null,
    percent: null,
    headline: null,
    headlineBand: null,
    change: null,
    reasons: [] as readonly string[],
    without: '',
    claim: null,
    caveats: [] as readonly string[],
  };
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
            headline: s.provisional.toFixed(3),
            status: provisionalWords(s.grid, s.grids),
          };
    case 'done':
      break;
  }
  const r = s.result;
  if (r.kind === 'total') {
    const t = r.view.total;
    const [low, high] = outward(t.low, t.high, DIGITS);
    const digits = headlineDigits(t.cd, t.low, t.high);
    const [headLow, headHigh] = outward(t.low, t.high, digits);
    return {
      mach,
      value: t.cd.toFixed(DIGITS),
      band: `${low} to ${high}`,
      percent: outwardPercent(t.low / t.cd - 1, t.high / t.cd - 1),
      headline: t.cd.toFixed(digits),
      headlineBand: `${headLow} to ${headHigh}`,
      status: claimWords(r.view.claim),
      change: null,
      reasons: [],
      without: withoutText(r.without),
      claim: r.view.claim.kind === 'validated' ? r.view.claim.text : null,
      caveats: r.view.claim.kind === 'validated' ? r.view.claim.caveats : [],
    };
  }
  if (r.kind === 'choose') {
    return { mach, ...none, status: chooseWords(r.excludable.map((e) => e.part)) };
  }
  const reasons = plainReasons(point, finer)!;
  return {
    mach,
    ...none,
    status: noNumberWords(reasonSentence(reasons)),
    reasons: reasons.map((p) => p.reason),
    change: changeOfAll(reasons),
  };
}
