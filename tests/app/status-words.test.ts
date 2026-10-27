/**
 * The status words (src/app/status-words.ts; docs/design/0017-rocketeer-interface.md
 * section 5): every claim and reason worded, one sentence each, never the
 * word "validated", and the refusals the logic really gives routed to
 * their words.
 */

import { describe, expect, it } from 'vitest';
import {
  BOUNDED_WORDS,
  changeText,
  claimWords,
  W1_BOUNDED_WORDS,
  VALIDATED_WORDS,
  CLASS_WORDS,
  ESTIMATE_WORDS,
  noNumberWords,
  noseWords,
  provisionalWords,
  refusalWords,
  SEVERAL_BOUNDED_WORDS,
  STOPPED,
  SWEPT_EDGE_BOUNDED_WORDS,
  WAITING,
  type NoseEnd,
} from '../../src/app/status-words';
import type { FinRefusal } from '../../src/fins/refusal';
import { roundedLeadingEdgeDrag } from '../../src/fins/rounded-leading-edge';
import { SWEPT_EDGE_BOUNDED_REASON } from '../../src/total/finned-body';
import {
  BOUNDED_REASON,
  CLASS_CLAIM,
  ESTIMATE_CLAIM,
  totalDragView,
  VALIDATED_CLAIM,
  W1_BOUNDED_REASON,
} from '../../src/app/total-drag';
import { designForm } from '../../src/rocket/adapter';
import { preset } from '../../src/rocket/presets';

const words = (text: string) => text.split(/\s+/).filter((w) => w !== '').length;

describe('the words', () => {
  it('one sentence of at most 32 words for every status, and never "validated"', () => {
    const all = [
      ESTIMATE_WORDS,
      CLASS_WORDS,
      BOUNDED_WORDS,
      W1_BOUNDED_WORDS,
      SWEPT_EDGE_BOUNDED_WORDS,
      SEVERAL_BOUNDED_WORDS,
      provisionalWords(2, 4),
      WAITING,
      STOPPED,
      noNumberWords('the drag behind the base is known from measurements only at other speeds'),
    ];
    for (const w of all) {
      expect(words(w.sentence)).toBeLessThanOrEqual(32);
      expect(`${w.word} ${w.sentence}`).not.toMatch(/validated/i);
      expect(`${w.word} ${w.sentence}`).not.toMatch(/—|–/);
    }
  });

  it("the validated claim: the logic's word, one sentence, green", () => {
    expect(VALIDATED_WORDS.word).toBe('Validated');
    expect(words(VALIDATED_WORDS.sentence)).toBeLessThanOrEqual(32);
    expect(VALIDATED_WORDS.tone).toBe('ok');
    expect(claimWords({ kind: 'validated', text: VALIDATED_CLAIM, caveats: [] })).toBe(
      VALIDATED_WORDS,
    );
  });

  it('a mark and a colour for each, the claims apart from the provisional and the refused', () => {
    expect(ESTIMATE_WORDS.mark).toBe('diamond');
    expect(CLASS_WORDS.mark).toBe('diamond');
    expect(BOUNDED_WORDS.mark).toBe('square');
    expect(provisionalWords(1, 4).mark).toBe('hollow');
    expect(noNumberWords('x').mark).toBe('cross');
    // Every claim is an estimate today: none of them green.
    expect([ESTIMATE_WORDS, CLASS_WORDS, BOUNDED_WORDS].map((w) => w.tone)).toEqual([
      'warn',
      'warn',
      'bounded',
    ]);
  });

  it("each claim's words follow its text and reasons, a bounded part first", () => {
    const claim = (text: string, reasons: string[]) => ({
      kind: 'estimate' as const,
      text,
      reasons,
    });
    expect(claimWords(claim(ESTIMATE_CLAIM, []))).toBe(ESTIMATE_WORDS);
    expect(claimWords(claim(CLASS_CLAIM, []))).toBe(CLASS_WORDS);
    expect(claimWords(claim(CLASS_CLAIM, [BOUNDED_REASON]))).toBe(BOUNDED_WORDS);
    // The rebuilt fins-on-base factor's bounded values (main's W1).
    expect(claimWords(claim(ESTIMATE_CLAIM, [W1_BOUNDED_REASON]))).toBe(W1_BOUNDED_WORDS);
    // The fins' rounded leading edges swept beyond 60 deg, bounded (0016 section 21.2).
    expect(claimWords(claim(CLASS_CLAIM, ['x', SWEPT_EDGE_BOUNDED_REASON]))).toBe(
      SWEPT_EDGE_BOUNDED_WORDS,
    );
    // Two bounded parts: neither part's words alone.
    expect(claimWords(claim(ESTIMATE_CLAIM, [W1_BOUNDED_REASON, SWEPT_EDGE_BOUNDED_REASON]))).toBe(
      SEVERAL_BOUNDED_WORDS,
    );
    for (const w of [SWEPT_EDGE_BOUNDED_WORDS, SEVERAL_BOUNDED_WORDS]) {
      expect(w.tone).toBe('bounded');
      expect(w.mark).toBe('square');
    }
  });

  it("the nose's ends; a finer grid suggested only where one is offered", () => {
    const ends: NoseEnd[] = [
      'no-band',
      'invalid',
      'not-converged',
      'refused-case',
      'no-webgpu',
      'gpu-failed',
    ];
    for (const end of ends) {
      const plain = noseWords(end, true);
      expect(plain.reason.length).toBeGreaterThan(0);
      expect(plain.reason).not.toMatch(/validated/i);
    }
    expect(noseWords('no-band', true).change).toMatch(/320 cells across/);
    expect(changeText(noseWords('no-band', false))).toBe(
      'Nothing about the rocket changes this: this speed has no number yet.',
    );
  });
});

describe('the refusals the logic gives, worded', { timeout: 60_000 }, () => {
  const refusalsAt = (id: string, mach: number) => {
    const result = designForm(preset(id).design, mach, { without: true });
    if (result.kind !== 'form') throw new Error('no form');
    const view = totalDragView(result.form, { kind: 'pending' });
    return view.kind === 'refused' ? view.refusals : [];
  };

  it("the Basic Finner at Mach 1.4: the fins' own drag, the base and the trailing edges' base", () => {
    const own = {
      reason:
        "the fins' own drag (their friction, and a sharp section's wave drag) is checked " +
        'against flight measurements only from Mach 1.5 to 2.96, and its error grows below that',
      change: '',
    };
    const plain = refusalsAt('basic-finner', 1.4).map((r) => [r.component, refusalWords(r)]);
    expect(plain).toEqual([
      ['fin friction', own],
      ['fin wave drag', own],
      // The rebuilt fins-on-base factor (main's W1) reaches below Mach 1.8, but not the wedge's
      // thick trailing edge at the base.
      [
        'body base',
        {
          reason:
            'at this speed, the base drag with fins at the base is measured only for flat fins ' +
            'with square trailing edges or fins with sharp ones, not for this trailing edge (a ' +
            'wedge thickening to it, or a rounded one)',
          change:
            'flat fins with square trailing edges, sharp trailing edges, or fins a root chord or ' +
            'more ahead of the base',
        },
      ],
      [
        'fin trailing-edge base',
        {
          reason: "a square trailing edge's drag is measured only at other speeds",
          change: 'bevelled (sharp) trailing edges',
        },
      ],
    ]);
  });

  it("Mach 1.0: the fins' own drag below Mach 1.5; the fins' method; the rounded edges' range", () => {
    const fins = refusalsAt('basic-finner', 1).find((r) => r.component === 'fin wave drag')!;
    expect(fins.reason).toBe('fins-own-drag-mach');
    expect(refusalWords(fins).reason).toMatch(/^the fins' own drag/);
    // The fins' method's own reason at Mach 1 (behind the guard today), worded too.
    expect(
      refusalWords({ component: 'fin wave drag', reason: 'subsonic-free-stream', message: '' }),
    ).toEqual({
      reason: "at Mach 1 and below the fins' method does not apply",
      change: '',
    });
    const edges = refusalsAt('basic-finner', 1).find((r) => r.component === 'fin leading edges')!;
    expect(refusalWords(edges)).toEqual({
      reason:
        "a rounded leading edge's drag is measured only where the Mach number across the edge " +
        'is 1.0 to 3.0 and for edge sizes within its data',
      change: 'bevelled leading edges',
    });
  });

  it('a rounded edge refused past 60 deg: less sweep offered beside a bevelled edge', () => {
    const refusal = (mach: number, deg: number) => {
      try {
        roundedLeadingEdgeDrag({
          mach,
          radius: 0.0015,
          faceAngle: 0,
          tanLeadingEdgeSweep: Math.tan((deg * Math.PI) / 180),
          reynoldsOnDiameter: 2e5,
        });
      } catch (e) {
        return e as FinRefusal;
      }
      throw new Error('expected a refusal');
    };
    // Past 60 deg refused, as main refuses it, until TN 3861 fig. 17 is read twice (0014 (ab)).
    for (const [mach, deg] of [
      [2.0, 62],
      [2.8, 66.4],
      [5.0, 78],
    ] as const) {
      const e = refusal(mach, deg);
      expect(e.reason).toBe('swept-leading-edge');
      expect(
        refusalWords({ component: 'fin leading edges', reason: e.reason, message: e.message }),
      ).toEqual({
        reason: "a rounded leading edge's drag is measured only up to 60 degrees of sweep",
        change: 'less sweep (60 degrees or less), or a bevelled leading edge',
      });
    }
    // A sweep that is not a number keeps its own words.
    expect(
      refusalWords({
        component: 'fin leading edges',
        reason: 'swept-leading-edge',
        message: 'bad leading-edge sweep (tan NaN)',
      }),
    ).toEqual({
      reason: "the leading edge's sweep is not a usable number",
      change: 'a sweep of zero or more',
    });
    // Once the bounded term is served again (0016 section 21.2), a case it refuses past 60 deg is
    // the term's own range, and less sweep is offered there too; at 60 deg or less, a bevelled edge.
    expect(
      refusalWords({
        component: 'fin leading edges',
        reason: 'leading-edge-range',
        message:
          'a rounded leading edge swept 62.0 deg, beyond the 60 deg where the yawed-cylinder',
      }).change,
    ).toBe('less sweep (60 degrees or less), or a bevelled leading edge');
    expect(
      refusalWords({
        component: 'fin leading edges',
        reason: 'leading-edge-range',
        message: 'the Mach number 0.98 is below 1.0',
      }).change,
    ).toBe('bevelled leading edges');
  });

  it('a reason the words do not know yet: its message, plainly', () => {
    expect(
      refusalWords({ component: 'fins', reason: 'something-new', message: 'it is new' }),
    ).toEqual({ reason: 'it is new', change: 'see the reason in Details' });
    expect(
      refusalWords({ component: 'flight condition', reason: 'input', message: 'too high' }),
    ).toEqual({ reason: 'too high', change: 'see the reason' });
  });
});
