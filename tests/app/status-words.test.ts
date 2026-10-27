/**
 * The status words (src/app/status-words.ts; docs/design/0017-rocketeer-interface.md
 * section 5): every claim and reason worded, one sentence each, never the
 * word "validated", and the refusals the logic really gives routed to
 * their words.
 */

import { readFileSync } from 'node:fs';
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
  STOPPED,
  WAITING,
  type NoseEnd,
} from '../../src/app/status-words';
import { finsOnBaseFactorW1 } from '../../src/base/fins-on-base-w1';
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

  it("the fin-sweep words are 0017's rows: flat fins with a square, unswept trailing edge at any leading-edge sweep from Mach 1.62 (0015 section 12), and the narrowing below it (0014 10.7 (z))", () => {
    const rows = readFileSync(
      new URL('../../docs/design/0017-rocketeer-interface.md', import.meta.url),
      'utf8',
    )
      .split('\n')
      .filter((l) => l.startsWith('| `fin-sweep`'))
      .map((l) =>
        l
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim()),
      );
    const row = (key: string) => {
      const found = rows.filter((r) => r[0] === key);
      expect(found, key).toHaveLength(1);
      return found[0]!;
    };
    // The record's rows are the page's words, with the record's citation after the reason.
    const words = refusalWords({ component: 'body base', reason: 'fin-sweep', message: '' });
    const [, reason, change] = row('`fin-sweep`');
    expect(reason).toBe(`${words.reason} (0015 section 12)`);
    expect(change).toBe(words.change);
    expect(words.reason).toContain(
      'flat fins with a square, unswept trailing edge are taken at any leading-edge sweep, but ' +
        'below Mach 1.62 only unswept or swept 45 deg or more',
    );
    // The library's own refusal of a flat plate swept 20 deg at Mach 1.55 takes the narrowing's words.
    let message = '';
    try {
      finsOnBaseFactorW1(1.55, {
        count: 3,
        section: { x: [0, 0.1, 1], halfThickness: [0, 0.012, 0.012], bluntTrailingEdge: true },
        sectionFamily: 'other',
        tanLeadingEdgeSweep: Math.tan((20 * Math.PI) / 180),
        tanTrailingEdgeSweep: 0,
        trailingEdgeAheadOfBase: 0,
      });
    } catch (e) {
      message = (e as Error).message;
    }
    const narrowed = refusalWords({ component: 'body base', reason: 'fin-sweep', message });
    const [, nReason, nChange] = row('`fin-sweep` (flat fins swept under 45 deg, below Mach 1.62)');
    expect(nReason).toBe(`${narrowed.reason} (0014 10.7 (z), the note of 2026-10-27)`);
    expect(nChange).toBe(narrowed.change);
    expect(narrowed.reason).toContain('measured only with fins swept 45 deg');
    expect(narrowed.reason).not.toBe(words.reason);
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
