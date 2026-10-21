/**
 * The status words (src/app/status-words.ts; docs/design/0017-rocketeer-interface.md
 * section 5): every claim and reason worded, one sentence each, never the
 * word "validated", and the refusals the logic really gives routed to
 * their words.
 */

import { describe, expect, it } from 'vitest';
import {
  changeText,
  CLAIM_WORDS,
  noNumberWords,
  noseWords,
  provisionalWords,
  refusalWords,
  STOPPED,
  WAITING,
  type NoseEnd,
} from '../../src/app/status-words';
import { totalDragView } from '../../src/app/total-drag';
import { designForm } from '../../src/rocket/adapter';
import { preset } from '../../src/rocket/presets';

const words = (text: string) => text.split(/\s+/).filter((w) => w !== '').length;

describe('the words', () => {
  it('one sentence of at most 32 words for every status, and never "validated"', () => {
    const all = [
      ...Object.values(CLAIM_WORDS),
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

  it('a mark and a colour for each, the claims apart from the provisional and the refused', () => {
    expect(CLAIM_WORDS.validated.mark).toBe('circle');
    expect(CLAIM_WORDS.estimate.mark).toBe('diamond');
    expect(provisionalWords(1, 4).mark).toBe('hollow');
    expect(noNumberWords('x').mark).toBe('cross');
    expect(new Set(Object.values(CLAIM_WORDS).map((w) => w.tone)).size).toBe(2);
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

  it("the Basic Finner at Mach 1.4: the base, the trailing edges' base, the leading edges", () => {
    const plain = refusalsAt('basic-finner', 1.4).map((r) => [r.component, refusalWords(r)]);
    expect(plain).toEqual([
      [
        'fin leading edges',
        {
          reason:
            "a rounded leading edge's drag is measured only at Mach 1.49 to 3.0 and for edge " +
            'sizes within its data',
          change: 'bevelled leading edges',
        },
      ],
      [
        'body base',
        {
          reason: 'the drag behind the base is known from measurements only at other speeds',
          change: '',
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

  it('Mach 1.0: the fins’ method does not apply', () => {
    const fins = refusalsAt('basic-finner', 1).find((r) => r.component === 'fin wave drag')!;
    expect(refusalWords(fins)).toEqual({
      reason: "at Mach 1 and below the fins' method does not apply",
      change: '',
    });
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
