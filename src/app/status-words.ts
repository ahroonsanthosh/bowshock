/**
 * The status of a point of the drag curve in plain words
 * (docs/design/0017-rocketeer-interface.md section 5): one word and one
 * sentence for each claim the logic makes, and for each reason it refuses,
 * the reason in plain words and what the user could change. Each wording
 * says what the logic's own text says, no more and no less; the logic's
 * text itself is shown in Details, word for word. The word "Validated"
 * is used only for the logic's own validated claim (the BRL sub-class),
 * whose text and caveats the point block shows beside it.
 *
 * The tables are keyed by the logic's own types, so that a new claim or a
 * new reason fails the build here until it is worded.
 */

import {
  BLUNT_AHEAD_OF_BASE,
  BLUNT_EDGE_NOTE,
  ROUNDED_EDGE_NOTE,
  ROUNDED_PLATE_AHEAD_OF_BASE,
} from '../base/base-drag';
import type { BaseRefusalReason } from '../base/refusal';
import {
  W1_FLAT_BEYOND_60_MARK,
  W1_FLAT_UNDER_45_MARK,
  W1_LONGER_BEVELS,
  W1_OUTSIDE_AT,
  W1_SECTION_SHAPE_LIMIT,
  W1_SECTION_SHAPE_MARK,
  W1_SWEEP_REFUSED_TOO,
} from '../base/fins-on-base-w1';
import type { FinRefusalReason } from '../fins/refusal';
import { SWEPT_EDGE_BOUNDED_REASON } from '../total/finned-body';
import type { ComponentRefusal } from '../total/total-drag';
import type { RocketDesign } from '../rocket/design';
import {
  BOUNDED_REASON,
  CLASS_CLAIM,
  FINS_AHEAD_OF_BASE,
  NOSE_UNVERIFIED_REASON,
  W1_BOUNDED_REASON,
  W1_BOUNDED_SWEPT_REASON,
  type Claim,
} from './total-drag';

/** The colour family of a status: green, amber, blue, red, grey. */
export type Tone = 'ok' | 'warn' | 'bounded' | 'bad' | 'muted';
/** The mark of a point in the chart: shape as well as colour. */
export type Mark = 'circle' | 'diamond' | 'square' | 'cross' | 'hollow' | 'tick';

export interface StatusWords {
  readonly word: string;
  /** One sentence, at most 32 words. */
  readonly sentence: string;
  readonly tone: Tone;
  readonly mark: Mark;
}

/**
 * The logic's claims in plain words. Today it makes one kind, an estimate,
 * not validated (the Basic Finner's validated claim is suspended, design
 * record 0010 section 11.7), said three ways by its text and reasons:
 * outside the Basic Finner's class (ESTIMATE_CLAIM); inside it, its claim
 * suspended (CLASS_CLAIM); and with a part bounded, not measured
 * (BOUNDED_REASON among its reasons).
 */
export const ESTIMATE_WORDS: StatusWords = {
  word: 'Estimate',
  sentence:
    "Each part is computed inside its own band's range, but no measurement of a whole rocket " +
    "like this checks the total, and the parts' bands are estimates here.",
  tone: 'warn',
  mark: 'diamond',
};
export const CLASS_WORDS: StatusWords = {
  word: 'Estimate, tested class',
  sentence:
    'An estimate: this rocket and speed lie inside the one class tested in free flight (the ' +
    "Basic Finner), but that test's claim is suspended until a corrected part is tested again.",
  tone: 'warn',
  mark: 'diamond',
};
export const BOUNDED_WORDS: StatusWords = {
  word: 'Estimate, bounded',
  sentence:
    "An estimate with one part bounded, not measured: the fins' effect on the base drag, whose " +
    'band runs from no effect to its value at the last speed measured.',
  tone: 'bounded',
  mark: 'square',
};

/** Each kind of claim, worded: a new kind fails the build here until it is. */
/**
 * The rebuilt fins-on-base factor's bounded values (main's W1, 0015): for
 * plates, bounded from the relief measured with plates at the base; above
 * Mach 2.56, as the present factor's.
 */
export const W1_BOUNDED_WORDS: StatusWords = {
  word: 'Estimate, bounded',
  sentence:
    "An estimate with one part bounded, not measured: the fins' effect on the base drag, whose " +
    'band the rebuilt factor sets from bounds, not from a measurement of these fins.',
  tone: 'bounded',
  mark: 'square',
};

/** The same, the fins' sweep taken on the argument of 0015 sections 4 and 12 (W1_BOUNDED_SWEPT_REASON). */
export const W1_BOUNDED_SWEPT_WORDS: StatusWords = {
  word: 'Estimate, bounded',
  sentence:
    "An estimate with one part bounded, not measured: the fins' effect on the base drag, set from " +
    'bounds for fins unswept or at a sweep not measured at the base.',
  tone: 'bounded',
  mark: 'square',
};

/** The fins' rounded leading edges swept beyond 60 deg, bounded (0016 section 21.2). */
export const SWEPT_EDGE_BOUNDED_WORDS: StatusWords = {
  word: 'Estimate, bounded',
  sentence:
    "An estimate with one part bounded, not measured: the fins' rounded leading edges, swept past " +
    '60 degrees, whose band runs from the drag at their sweep to that at 60.',
  tone: 'bounded',
  mark: 'square',
};

/** More than one part bounded: Details names each. */
export const SEVERAL_BOUNDED_WORDS: StatusWords = {
  word: 'Estimate, bounded',
  sentence:
    'An estimate with more than one part bounded, not measured: each band runs between two ' +
    'limits, not from a measurement; Details names each part.',
  tone: 'bounded',
  mark: 'square',
};

/** Each bounded part's reason, as the logic names it in a claim, and its words. */
const BOUNDED_PARTS: readonly (readonly [string, StatusWords])[] = [
  [BOUNDED_REASON, BOUNDED_WORDS],
  [W1_BOUNDED_REASON, W1_BOUNDED_WORDS],
  [W1_BOUNDED_SWEPT_REASON, W1_BOUNDED_SWEPT_WORDS],
  [SWEPT_EDGE_BOUNDED_REASON, SWEPT_EDGE_BOUNDED_WORDS],
];

/** The words of a claim with bounded parts, or undefined where it has none. */
function boundedWords(reasons: readonly string[]): StatusWords | undefined {
  const found = BOUNDED_PARTS.filter(([reason]) => reasons.includes(reason));
  if (found.length === 0) return undefined;
  return found.length === 1 ? found[0]![1] : SEVERAL_BOUNDED_WORDS;
}

/**
 * The one validated claim (main's BRL Report 934 run, 0014 section 10.7
 * (q)): the Basic Finner's narrow sub-class at that range's conditions,
 * tested once and passed. Its word is the logic's; its text and caveats
 * are shown beside it in the point block and in full in Details.
 */
export const VALIDATED_WORDS: StatusWords = {
  word: 'Validated',
  sentence:
    'Tested once in free flight at these conditions (BRL Report 934, seven rounds) and passed, ' +
    'inside a wide tolerance; only for this narrow sub-class of the Basic Finner.',
  tone: 'ok',
  mark: 'circle',
};

/** Any estimate whose nose term is not verified: no tested claim applies. */
export const NOSE_UNVERIFIED_WORDS: StatusWords = {
  word: 'Estimate',
  sentence:
    "An estimate: the nose's drag is not verified for this case (its band is wider than the " +
    "solver's tolerance), so no tested claim applies here.",
  tone: 'warn',
  mark: 'diamond',
};

type ClaimOf<K extends Claim['kind']> = Extract<Claim, { kind: K }>;

const CLAIM_KINDS: { readonly [K in Claim['kind']]: (claim: ClaimOf<K>) => StatusWords } = {
  validated: () => VALIDATED_WORDS,
  estimate: (claim) =>
    claim.reasons.includes(NOSE_UNVERIFIED_REASON)
      ? NOSE_UNVERIFIED_WORDS
      : (boundedWords(claim.reasons) ??
        (claim.text === CLASS_CLAIM ? CLASS_WORDS : ESTIMATE_WORDS)),
};

/** A claim of the logic in plain words. */
export function claimWords(claim: Claim): StatusWords {
  return claim.kind === 'validated' ? CLAIM_KINDS.validated(claim) : CLAIM_KINDS.estimate(claim);
}

/** A point while its nose is still being solved: the latest grid's value, no band. */
export function provisionalWords(grid: number, grids: number): StatusWords {
  return {
    word: 'Provisional',
    sentence: `Not finished: the nose is solved on grid ${grid} of ${grids} so far; no band yet.`,
    tone: 'muted',
    mark: 'hollow',
  };
}

/** A point whose first grid is being solved. */
export function solvingWords(grids: number): StatusWords {
  return {
    word: 'Solving',
    sentence: `The airflow round the nose is being solved, on grid 1 of ${grids}.`,
    tone: 'muted',
    mark: 'hollow',
  };
}

/** Parts bowshock does not model: no number until the user chooses to compute without them. */
export function chooseWords(parts: readonly string[]): StatusWords {
  const them = parts.length > 1 || parts.some((p) => /^the \d+ /.test(p)) ? 'them' : 'it';
  return {
    word: 'Your choice',
    sentence:
      `bowshock does not model the drag of ${parts.join(', ')}: compute without ${them}, ` +
      `or keep ${them} and get no number.`,
    tone: 'muted',
    mark: 'tick',
  };
}

/** A point not computed yet. */
export const WAITING: StatusWords = {
  word: 'Waiting',
  sentence: 'Not computed yet.',
  tone: 'muted',
  mark: 'tick',
};

/** A point stopped before its solve ended. */
export const STOPPED: StatusWords = {
  word: 'Stopped',
  sentence: 'Stopped before the airflow solve ended: no number.',
  tone: 'muted',
  mark: 'tick',
};

/** The word of every point without a number. */
export function noNumberWords(reason: string): StatusWords {
  return {
    word: 'No number',
    sentence: `The drag here cannot be given to a known accuracy: ${reason}.`,
    tone: 'bad',
    mark: 'cross',
  };
}

/** A reason in plain words, and what could change it. */
export interface PlainReason {
  readonly reason: string;
  /** What the user could change for a number; empty where nothing about the rocket would. */
  readonly change: string;
  /**
   * The logic checks this before its other checks (an input it cannot
   * take), so clearing it is a first step, never promised to give a number.
   */
  readonly first?: boolean;
  /** The whole line to show where this is the one reason, in place of "To get a number: ...". */
  readonly line?: string;
}

/** Nothing about the rocket changes it. */
const NOTHING = '';

/** What the logic's message says, where its words are the plainest there are. */
const asMessage = (r: ComponentRefusal): PlainReason => ({
  reason: r.message,
  change: 'see the reason in Details',
});

type Worded = (r: ComponentRefusal) => PlainReason;

/**
 * The rebuilt factor's refusals of a sharp section's sweep ahead of the base (src/base/fins-on-base-w1.ts): each
 * names the fins "ending ... root chords ahead of the base"; at the base they say "at the base".
 */
const SHARP_SWEPT_AHEAD = /^fins of a sharp section ending [\d.e+-]+ root chords ahead of the base/;

/** Every reason src/base gives. */
const BASE_WORDS: Readonly<Record<BaseRefusalReason, Worded>> = {
  'mach-range': (r) =>
    r.component === 'fin trailing-edge base'
      ? {
          reason: "a square trailing edge's drag is measured only at other speeds",
          change: 'bevelled (sharp) trailing edges',
        }
      : {
          reason: 'the drag behind the base is known from measurements only at other speeds',
          change: NOTHING,
        },
  afterbody: () => ({
    reason: 'base drag is measured only behind a straight body to a flat base',
    change: 'a body without a boat-tail or flare',
  }),
  'laminar-base': () => ({
    reason: 'the air would reach the base smooth (laminar); base drag is measured in turbulent air',
    change: 'no laminar run past the base',
  }),
  // Never advice to move the fins further ahead: nothing is served more than a root chord ahead (0014
  // section 10.7 (ad), 2026-10-27). Where their trailing edge is refused near the base too, the change
  // names one served at the base.
  'fins-near-base': (r) => {
    // A flat plate whose sweep is refused below Mach 1.62 too (0014 section 10.7 (z), the note of 2026-10-27):
    // both reasons, and a change that the sweep's refusal does not stop.
    const sweep = r.message.includes(W1_SWEEP_REFUSED_TOO);
    return {
      reason:
        'fins ending ahead of the base: the base drag with fins there is measured only up to one ' +
        'root chord ahead, at Mach 1.5 to 2.0 (none is known below Mach 1.5; one at Mach 2.41 is read ' +
        'but not yet settled), and only with a fin root chord of 1.5 body diameters, within 0.5%' +
        (r.message.includes(ROUNDED_EDGE_NOTE) || r.message.includes(BLUNT_EDGE_NOTE)
          ? ', and only for square or sharp trailing edges'
          : '') +
        (sweep
          ? '; and below Mach 1.62, at or near the base, flat fins are taken only unswept or swept ' +
            '45 to 60 deg'
          : ''),
      change: r.message.includes(ROUNDED_EDGE_NOTE)
        ? 'square or sharp trailing edges, with the fins ending at the base'
        : r.message.includes(BLUNT_EDGE_NOTE)
          ? 'sharp trailing edges, with the fins ending at the base'
          : sweep
            ? "the fins' trailing edges at the base, the fins unswept or swept 45 to 60 deg at the " +
              'leading edge'
            : "the fins' trailing edges at the base",
    };
  },
  'fin-count': () => ({
    reason: 'with fins at the base, the base drag is measured with four fins only',
    change: 'four fins',
  }),
  'fin-sweep': (r) =>
    // Flat fins swept more than 0 and under 45 deg, or beyond 60 deg, below Mach 1.62 (0014 section 10.7 (z),
    // the note of 2026-10-27): the missing measurement, named.
    r.message.includes(W1_FLAT_UNDER_45_MARK)
      ? {
          reason:
            'below Mach 1.62 the base drag behind flat fins at or near the base is measured only at ' +
            'Mach 1.06 to 1.10, with fins swept 45 deg, and nothing measured shows a lighter sweep ' +
            'gives the same',
          change: 'flat fins swept 45 to 60 deg at the leading edge, or unswept ones',
        }
      : r.message.includes(W1_FLAT_BEYOND_60_MARK)
        ? {
            reason:
              'below Mach 1.62 the base drag behind flat fins at or near the base is not measured ' +
              'with fins swept beyond 60 deg, and nothing measured shows a sharper sweep gives the same',
            change: 'flat fins swept 45 to 60 deg at the leading edge, or unswept ones',
          }
        : // Sharp fins ending ahead of the base swept other than as RM L52J21a's (the review of 86bcf73, its
          // item 9): worded for fins ahead of the base, not at it.
          SHARP_SWEPT_AHEAD.test(r.message)
          ? {
              reason:
                'with fins ahead of the base, swept fins of a sharp section are measured only as RM ' +
                "L52J21a's, both edges swept 45 deg and ending 0.85 +-0.05 root chords ahead (60 deg is " +
                'measured only at the base), so they are taken there only swept 45 to 60 deg, the ' +
                'trailing edge no more, from 0.9 root chords ahead; not swept like these at this position',
              change: 'unswept fins of constant chord',
            }
          : {
              reason:
                'with fins at the base, the base drag behind wedge or bevelled fins is measured only ' +
                'unswept or at a few sweeps (a tapered fin has a swept edge); flat fins with a square, ' +
                'unswept trailing edge are taken at any leading-edge sweep, but below Mach 1.62 only ' +
                'unswept or swept 45 to 60 deg',
              change:
                'flat fins with a square, unswept trailing edge (below Mach 1.62, unswept or swept 45 to ' +
                '60 deg), or unswept fins of constant chord',
            },
  'fin-trailing-edge': (r) =>
    // A rounded plate ending ahead of the base (src/base/base-drag.ts): refused at every speed, near the base.
    r.message.startsWith(ROUNDED_PLATE_AHEAD_OF_BASE)
      ? {
          reason:
            'with fins near the base, the base drag is measured only for fins with square or sharp ' +
            'trailing edges, not for a rounded one',
          change: 'square or sharp trailing edges, with the fins ending at the base',
        }
      : // Fins ahead of the base whose faces widen or narrow to a blunt trailing edge (src/base/base-drag.ts):
        // at the base, below Mach 1.8, only sharp edges of such sections are served, so the change names sharp.
        r.message.startsWith(BLUNT_AHEAD_OF_BASE)
        ? {
            reason:
              'with fins near the base, the base drag is measured only for fins with square or sharp ' +
              'trailing edges, not for a blunt one that the faces widen or narrow to (as the Basic ' +
              "Finner's wedges); at the base, four unswept wedges like the Basic Finner's are " +
              'measured from Mach 1.8',
            change: 'sharp trailing edges, with the fins ending at the base',
          }
        : {
            reason:
              'at this speed, the base drag with fins at the base is measured only for flat fins with ' +
              'square trailing edges or fins with sharp ones, not for this trailing edge (a wedge ' +
              'thickening to it, or a rounded one)',
            change: 'flat fins with square trailing edges, or sharp trailing edges',
          },
  'flat-plate-fins': () => ({
    reason:
      'flat plates at the base lower the base drag by up to 15% in the one measurement of them, ' +
      "which the base drag's data do not cover yet",
    change: 'wedge or bevelled fins of constant chord at the base',
  }),
  'rounded-trailing-edge': () => ({
    reason:
      "a rounded trailing edge's drag is not shown to be below a square edge's, so it cannot " +
      'be bounded yet',
    change: 'square or bevelled trailing edges',
  }),
  'fin-thickness': (r) => {
    // A section refused for its shape, not its thickness (the review of 55a76d2): it does not lie inside the 10%
    // circular arc everywhere. The change: thinner fins, as thin as the message says this shape is served, or
    // longer bevels where it has them.
    if (r.message.includes(W1_SECTION_SHAPE_MARK)) {
      const limit = new RegExp(`${W1_SECTION_SHAPE_LIMIT} (\\d+\\.\\d+)`).exec(r.message);
      const pct =
        limit === null ? undefined : `${Number((100 * Number(limit[1])).toPrecision(3))}%`;
      // Where the section reaches outside the arc, as the factor found it (the quick look of 5a9ce16): at the
      // ends of its bevels, at its ridge, at an edge; bevels named only where the section has them.
      const at = r.message.indexOf(W1_OUTSIDE_AT);
      const where =
        at < 0
          ? undefined
          : r.message.slice(at + W1_OUTSIDE_AT.length).split(`, so ${W1_SECTION_SHAPE_LIMIT}`)[0];
      const bevels = r.message.includes(W1_LONGER_BEVELS);
      return {
        reason:
          'with fins at or near the base, the base drag is measured only for sections that lie inside a ' +
          '10%-thick circular arc everywhere, and this section reaches outside it' +
          (where === undefined ? '' : ` ${where}`),
        change:
          (pct === undefined ? 'thinner fins' : `fins at most ${pct} thick with this section`) +
          (bevels ? ', or longer bevels' : ''),
      };
    }
    return {
      reason:
        'with fins at the base, the base drag is measured for fins 5% to 10% as thick as their ' +
        'chord',
      change: 'fins of that thickness',
    };
  },
  'swept-trailing-edge': () => ({
    reason: "a swept square trailing edge's drag is not measured",
    change: 'unswept trailing edges, or bevelled ones',
  }),
  'laminar-trailing-edge': () => ({
    reason: "the air would reach the fins' trailing edges smooth (laminar); not measured",
    change: 'no laminar run to the trailing edges',
  }),
  'thick-layer': () => ({
    reason: "the square trailing edge is thin against the air's boundary layer there; not measured",
    change: 'thicker trailing edges, or bevelled ones',
  }),
  'beyond-read-range': asMessage,
  input: asMessage,
};

/** Every reason src/fins gives. */
const FIN_WORDS: Readonly<Record<FinRefusalReason, Worded>> = {
  'subsonic-free-stream': () => ({
    reason: "at Mach 1 and below the fins' method does not apply",
    change: NOTHING,
  }),
  'fins-own-drag-mach': () => ({
    reason:
      "the fins' own drag (their friction, and a sharp section's wave drag) is checked against " +
      'flight measurements only from Mach 1.5 to 2.96, and its error grows below that',
    change: NOTHING,
  }),
  'detached-shock': () => ({
    reason:
      "the fin's edge turns the air more than it can at this speed, so the shock stands off the " +
      'edge',
    change: 'a sharper leading edge (a longer bevel) or thinner fins',
  }),
  'subsonic-behind-shock': () => ({
    reason: "the air behind the fin's leading-edge shock is slower than sound; not modelled",
    change: 'a sharper leading edge (a longer bevel) or thinner fins',
  }),
  'compression-corner': () => ({
    reason: "the fin's section has a corner the method does not model",
    change: 'another section',
  }),
  'expansion-limit': () => ({
    reason: "the fin's section turns the air further than an expansion can",
    change: 'another section',
  }),
  'reflected-wave': () => ({
    reason: "a wave from the leading edge's shock could land on the fin; not modelled",
    change: 'a longer bevel or thinner fins',
  }),
  planform: asMessage,
  // Beyond 75.1 deg a rounded edge is refused at any Mach number (0016 sections 21.7 and 21.8);
  // otherwise this reason is thrown only for a sweep that is not a number.
  'swept-leading-edge': (r) =>
    /^a rounded leading edge swept [\d.]+ deg is refused/.test(r.message)
      ? {
          reason:
            "a rounded leading edge's drag is bounded only up to 75 degrees of sweep, the most at " +
            'which its bounds have been checked against a measured swept cylinder',
          change: 'less sweep (75 degrees or less), or a bevelled leading edge',
        }
      : {
          reason: "the leading edge's sweep is not a usable number",
          change: 'a sweep of zero or more',
        },
  // From 60 to 75.1 deg the edge is bounded only where the term at its sweep and at 60 deg are both
  // served (0016 section 21.2); there less sweep is a change that can help too.
  'leading-edge-range': (r) => ({
    reason:
      "a rounded leading edge's drag is measured only where the Mach number across the edge is " +
      '1.0 to 3.0 and for edge sizes within its data',
    change: /^a rounded leading edge swept [\d.]+ deg, beyond the 60 deg/.test(r.message)
      ? 'less sweep (60 degrees or less), or a bevelled leading edge'
      : 'bevelled leading edges',
  }),
  'square-leading-edge': () => ({
    reason:
      "a square-cut leading edge's drag has bounds, but measurements bear out what they rest on " +
      "only on flat faces far larger than a model rocket fin's",
    change: 'rounded or bevelled leading edges',
  }),
  'leading-edge-geometry': () => ({
    reason: 'a rounded leading edge is modelled only on a wedge-shaped fin, not on this one',
    change: 'bevelled leading edges',
  }),
  // The bounded term for rounded edges below normal Mach 1.0 (0019 section 3.2) is not wired:
  // should it ever refuse, its own message lists every condition.
  'bounded-edge-range': asMessage,
};

/** How the nose's solve ended, where it gave the total no nose term. */
export type NoseEnd =
  'no-band' | 'invalid' | 'not-converged' | 'refused-case' | 'no-webgpu' | 'gpu-failed';

/** The nose's ends in plain words; `finer` says whether a finer grid is offered. */
export function noseWords(end: NoseEnd, finer: boolean): PlainReason {
  switch (end) {
    case 'no-band':
      return {
        reason:
          'the airflow round the nose did not settle to a measured accuracy on the grids solved',
        change: finer ? 'the finer grid (320 cells across)' : NOTHING,
      };
    case 'invalid':
      return {
        reason: 'the airflow solver does not serve this nose at this speed',
        change: 'see the reason in Details',
      };
    case 'not-converged':
      return { reason: 'the airflow solve did not settle', change: 'the other grid' };
    case 'refused-case':
      return {
        reason: 'the airflow solver does not serve this nose at this speed',
        change: 'see the reason in Details',
      };
    case 'no-webgpu':
      return {
        reason: 'this browser cannot run the airflow solver (it has no WebGPU)',
        change: 'a browser with WebGPU (a recent Chrome or Edge)',
        // Not a promise of a number: the solve itself may still not settle.
        line: 'Needs a browser with WebGPU (a recent Chrome or Edge); then the airflow is solved here.',
      };
    case 'gpu-failed':
      return { reason: 'the GPU failed', change: 'reload the page' };
  }
}

/** The reason types the page itself and the nose give (src/app/total-drag.ts). */
const PAGE_WORDS: Readonly<Record<'not-computed' | 'not-verified', Worded>> = {
  'not-computed': (r) => ({ reason: `a method failed: ${r.message}`, change: NOTHING }),
  // The nose's own end, when known, is worded by noseWords; this is the logic's word for it.
  'not-verified': (r) => ({ reason: r.message, change: NOTHING }),
};

const isKey = <K extends string>(table: Readonly<Record<K, unknown>>, key: string): key is K =>
  Object.prototype.hasOwnProperty.call(table, key);

/**
 * A refusal of the logic in plain words (any reason it does not know: its message). A body base refused for its
 * fins that carries further refusals, met as its words' changes are made in turn (src/base/base-drag.ts,
 * everyReason), names every reason, each after the change that met it, and gives every change, or none where
 * nothing about the rocket changes one of them (the reviews of b323511 and 86bcf73).
 */
export function refusalWords(r: ComponentRefusal): PlainReason {
  const own = ownWords(r);
  const further = r.further ?? [];
  if (further.length === 0) return own;
  const words = further.map((f) => ({
    after: f.after,
    plain: ownWords({ component: r.component, reason: f.reason, message: f.message }),
  }));
  // Each further reason's words say "with fins at the base" themselves; said once (the review of e232dca).
  const said = (reason: string) =>
    reason
      .replace(/^with fins at (or near )?the base, /, '')
      .replace('the base drag with fins at the base', 'the base drag');
  const changes = [own.change, ...words.map((w) => w.plain.change)];
  const distinct = changes.filter((c, k) => changes.indexOf(c) === k);
  // Each change one item, between semicolons: a change may hold a comma or an "or" of its own (the review of
  // 55a76d2).
  return {
    reason: own.reason + words.map((w) => `; and ${w.after}, ${said(w.plain.reason)}`).join(''),
    change: changes.includes(NOTHING)
      ? NOTHING
      : distinct.length === 1
        ? distinct[0]!
        : `${distinct.slice(0, -1).join('; ')}; and ${distinct[distinct.length - 1]!}`,
  };
}

function ownWords(r: ComponentRefusal): PlainReason {
  if (r.component === 'flight condition') return { reason: r.message, change: 'see the reason' };
  // The fins' place below zero: the fins overhang the base (the only way the builder or an
  // import gives it, since a field that is not a number is never put into the rocket).
  if (r.reason === 'input' && r.message.startsWith(`${FINS_AHEAD_OF_BASE} must be`)) {
    return {
      reason: 'the fins reach past the base',
      change: 'fins whose trailing edges are at the base or ahead of it',
      first: true,
    };
  }
  if (isKey(BASE_WORDS, r.reason) && /base/.test(r.component)) return BASE_WORDS[r.reason](r);
  if (isKey(FIN_WORDS, r.reason)) return FIN_WORDS[r.reason](r);
  if (isKey(BASE_WORDS, r.reason)) return BASE_WORDS[r.reason](r);
  if (isKey(PAGE_WORDS, r.reason)) return PAGE_WORDS[r.reason](r);
  return asMessage(r);
}

/** "To get a number: ..." or, where nothing about the rocket would change it, why not. */
export function changeText(plain: PlainReason): string {
  if (plain.change === NOTHING) {
    return 'Nothing about the rocket changes this: this speed has no number yet.';
  }
  if (plain.line !== undefined) return plain.line;
  return plain.first === true
    ? `First: ${plain.change}. The rocket's other checks are made only then.`
    : `To get a number: ${plain.change}.`;
}

/**
 * The flight beside the curve: how fast the rocket flies and where that
 * number came from (an OpenRocket file's own simulation is often
 * subsonic), the curve running from Mach 1.0 to 3.0 whatever it is.
 */
export function flightWords(d: RocketDesign): string {
  const m = d.flight.maxMach;
  if (!(m > 0)) return 'The curve runs from Mach 1.0 to 3.0.';
  const at = `It flies to Mach ${m.toFixed(2)} (${d.flight.from ?? 'as set in the builder'})`;
  return m < 1
    ? `${at}: below the curve, which runs from Mach 1.0 to 3.0 all the same.`
    : m > 3
      ? `${at}: past the curve's end at Mach 3.0.`
      : `${at}, marked on the curve.`;
}
