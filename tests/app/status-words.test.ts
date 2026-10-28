/**
 * The status words (src/app/status-words.ts; docs/design/0017-rocketeer-interface.md
 * section 5): every claim and reason worded, one sentence each, never the
 * word "validated", and the refusals the logic really gives routed to
 * their words.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BLUNT_AHEAD_OF_BASE,
  BLUNT_EDGE_NOTE,
  MORE_THAN_A_CHORD_AHEAD,
  ROUNDED_EDGE_NOTE,
  ROUNDED_PLATE_AHEAD_OF_BASE,
} from '../../src/base/base-drag';
import type { BaseRefusalReason } from '../../src/base/refusal';
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
import { SQUARE_EDGE_REFUSAL, SWEPT_EDGE_BOUNDED_REASON } from '../../src/total/finned-body';
import {
  finsOnBaseFactorW1,
  W1_FLAT_BEYOND_60_MARK,
  W1_FLAT_UNDER_45_MARK,
  W1_SWEEP_REFUSED_TOO,
} from '../../src/base/fins-on-base-w1';
import { bodyBaseDrag } from '../../src/base/base-drag';
import { BaseRefusal } from '../../src/base/refusal';
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
          // No advice to move the fins a root chord or more ahead: refused there since 2026-10-27
          // (0014 section 10.7 (ad)).
          change: 'flat fins with square trailing edges, or sharp trailing edges',
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

  it("the fin-sweep words are 0017's rows: flat fins with a square, unswept trailing edge at any leading-edge sweep from Mach 1.62 (0015 section 12), and the narrowings below it, under 45 and beyond 60 deg (0014 10.7 (z))", () => {
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
        'below Mach 1.62 only unswept or swept 45 to 60 deg',
    );
    // The library's own refusals of flat plates swept 20 and 70 deg at Mach 1.55 take the narrowing's words.
    const messageAt = (deg: number) => {
      try {
        finsOnBaseFactorW1(1.55, {
          count: 3,
          section: { x: [0, 0.1, 1], halfThickness: [0, 0.012, 0.012], bluntTrailingEdge: true },
          sectionFamily: 'other',
          tanLeadingEdgeSweep: Math.tan((deg * Math.PI) / 180),
          tanTrailingEdgeSweep: 0,
          trailingEdgeAheadOfBase: 0,
        });
      } catch (e) {
        return (e as Error).message;
      }
      return '';
    };
    const under = refusalWords({
      component: 'body base',
      reason: 'fin-sweep',
      message: messageAt(20),
    });
    const [, uReason, uChange] = row('`fin-sweep` (flat fins swept under 45 deg, below Mach 1.62)');
    expect(uReason).toBe(`${under.reason} (0014 10.7 (z), the note of 2026-10-27)`);
    expect(uChange).toBe(under.change);
    expect(under.reason).toContain('measured only at Mach 1.06 to 1.10, with fins swept 45 deg');
    expect(under.reason).toContain('flat fins at or near the base');
    const beyond = refusalWords({
      component: 'body base',
      reason: 'fin-sweep',
      message: messageAt(70),
    });
    const [, bReason, bChange] = row(
      '`fin-sweep` (flat fins swept beyond 60 deg, below Mach 1.62)',
    );
    expect(bReason).toBe(`${beyond.reason} (0014 10.7 (z), the note of 2026-10-27)`);
    expect(bChange).toBe(beyond.change);
    expect(beyond.reason).toContain('not measured with fins swept beyond 60 deg');
    expect(beyond.reason).toContain('flat fins at or near the base');
    expect(new Set([words.reason, under.reason, beyond.reason]).size).toBe(3);
  });

  it('a rounded edge refused past 60 deg: less sweep offered beside a bevelled edge', () => {
    let message = '';
    try {
      roundedLeadingEdgeDrag({
        mach: 2.0,
        radius: 0.0015,
        faceAngle: 0,
        tanLeadingEdgeSweep: Math.tan((62 * Math.PI) / 180),
        reynoldsOnDiameter: 2e5,
      });
    } catch (e) {
      message = (e as Error).message;
    }
    const w = refusalWords({
      component: 'fin leading edges',
      reason: 'leading-edge-range',
      message,
    });
    expect(w.change).toBe('less sweep (60 degrees or less), or a bevelled leading edge');
    // At 60 deg or less the change stays a bevelled edge.
    expect(
      refusalWords({
        component: 'fin leading edges',
        reason: 'leading-edge-range',
        message: 'the Mach number 0.98 is below 1.0',
      }).change,
    ).toBe('bevelled leading edges');
  });

  it('a rounded edge refused beyond 75.1 deg: refused at any Mach number, less sweep offered', () => {
    let e: FinRefusal | undefined;
    try {
      roundedLeadingEdgeDrag({
        mach: 5.0,
        radius: 0.0015,
        faceAngle: 0,
        tanLeadingEdgeSweep: Math.tan((78 * Math.PI) / 180),
        reynoldsOnDiameter: 2e5,
      });
    } catch (x) {
      e = x as FinRefusal;
    }
    expect(e!.reason).toBe('swept-leading-edge');
    expect(
      refusalWords({ component: 'fin leading edges', reason: e!.reason, message: e!.message }),
    ).toEqual({
      reason:
        "a rounded leading edge's drag is bounded only up to 75 degrees of sweep, the most at " +
        'which its bounds have been checked against a measured swept cylinder',
      change: 'less sweep (75 degrees or less), or a bevelled leading edge',
    });
    // A sweep that is not a number keeps its own words.
    expect(
      refusalWords({
        component: 'fin leading edges',
        reason: 'swept-leading-edge',
        message: 'bad leading-edge sweep (tan NaN)',
      }).change,
    ).toBe('a sweep of zero or more');
  });

  it('fins ending ahead of the base: where they are refused, said plainly', () => {
    // Refused below Mach 1.5, above 2.0, at Mach 1.5 to 2.0 with another root chord than TN 2360's,
    // and more than a root chord ahead at any chord (0015 section 3.3): the words name what is
    // measured, and so what is missing; the change is the base, never further ahead.
    expect(refusalWords({ component: 'body base', reason: 'fins-near-base', message: '' })).toEqual(
      {
        reason:
          'fins ending ahead of the base: the base drag with fins there is measured only up to one ' +
          'root chord ahead, at Mach 1.5 to 2.0 (none is known below Mach 1.5), and only with a fin ' +
          'root chord of 1.5 body diameters',
        change: "the fins' trailing edges at the base",
      },
    );
  });

  it('a rounded plate within a chord ahead of the base: refused for its trailing edge, worded near the base', () => {
    const near = refusalWords({
      component: 'body base',
      reason: 'fin-trailing-edge',
      message: `${ROUNDED_PLATE_AHEAD_OF_BASE} 0.5 root chords ahead of the base: ...`,
    });
    expect(near).toEqual({
      reason:
        'with fins near the base, the base drag is measured only for fins with square or sharp ' +
        'trailing edges, not for a rounded one',
      // At the base, where square or sharp trailing edges are served; not a chord or more ahead,
      // refused since 2026-10-27 (0014 section 10.7 (ad)).
      change: 'square or sharp trailing edges, with the fins ending at the base',
    });
    expect(near.reason).not.toContain('at the base');
    expect(near.reason).not.toContain('at this speed');
    // At the base the words stay as they were.
    expect(
      refusalWords({ component: 'body base', reason: 'fin-trailing-edge', message: 'x' }).reason,
    ).toMatch(/^at this speed, the base drag with fins at the base/);
  });

  it('fins ahead of the base whose trailing edge is refused there too: the change names one served at the base', () => {
    // The Basic Finner's wedges ahead of the base (src/base/base-drag.ts): refused for the trailing
    // edge, worded near the base, the change sharp edges at the base (served there at every speed).
    const blunt = refusalWords({
      component: 'body base',
      reason: 'fin-trailing-edge',
      message: `${BLUNT_AHEAD_OF_BASE} 0.5 root chords ahead of the base: ...`,
    });
    expect(blunt).toEqual({
      reason:
        'with fins near the base, the base drag is measured only for fins with square or sharp ' +
        'trailing edges, not for a blunt one that the faces widen or narrow to (as the Basic ' +
        "Finner's wedges)",
      change: 'sharp trailing edges, with the fins ending at the base',
    });
    expect(blunt.reason).not.toContain('at this speed');
    // More than a chord ahead: the position, and the trailing edge where it is refused too.
    const far = (note: string) =>
      refusalWords({
        component: 'body base',
        reason: 'fins-near-base',
        message: `${MORE_THAN_A_CHORD_AHEAD} (2 root chords): ...${note}`,
      });
    expect(far('').change).toBe("the fins' trailing edges at the base");
    expect(far(BLUNT_EDGE_NOTE).change).toBe(
      'sharp trailing edges, with the fins ending at the base',
    );
    expect(far(ROUNDED_EDGE_NOTE).change).toBe(
      'square or sharp trailing edges, with the fins ending at the base',
    );
    expect(far(BLUNT_EDGE_NOTE).reason).toMatch(/, and only for square or sharp trailing edges$/);
    expect(far('').reason).not.toContain('trailing edges');
  });

  it('no advice moves the fins a chord or more ahead of the base (refused there since 2026-10-27)', () => {
    // 0014 section 10.7 (ad), 2026-10-27: the plain curve a chord or more ahead is withdrawn, so no
    // words may send the rocketeer there. Every base reason, at and near the base, for the base and
    // for the fins' trailing-edge base, and the logic's own messages for the cases that used to.
    const reasons: readonly BaseRefusalReason[] = [
      'mach-range',
      'afterbody',
      'laminar-base',
      'fins-near-base',
      'fin-count',
      'fin-thickness',
      'fin-trailing-edge',
      'fin-sweep',
      'flat-plate-fins',
      'swept-trailing-edge',
      'laminar-trailing-edge',
      'thick-layer',
      'rounded-trailing-edge',
      'beyond-read-range',
      'input',
    ];
    const messages = [
      '',
      'x',
      `${ROUNDED_PLATE_AHEAD_OF_BASE} 0.5 root chords ahead of the base: ...`,
      `${MORE_THAN_A_CHORD_AHEAD} (2 root chords): ...`,
      `${MORE_THAN_A_CHORD_AHEAD} (2 root chords): ...${BLUNT_EDGE_NOTE}`,
      `${MORE_THAN_A_CHORD_AHEAD} (2 root chords): ...${ROUNDED_EDGE_NOTE}`,
      `${BLUNT_AHEAD_OF_BASE} 0.5 root chords ahead of the base: ...`,
    ];
    for (const reason of reasons) {
      for (const component of ['body base', 'fin trailing-edge base']) {
        for (const message of messages) {
          const { change } = refusalWords({ component, reason, message });
          expect(change).not.toMatch(/chord or more ahead|more ahead|further ahead/);
          expect(change).not.toMatch(/ahead of (the base|it)$/);
        }
      }
    }
    // The Basic Finner at Mach 1.4 and its wedges, refused at the base, as the logic gives them.
    for (const r of refusalsAt('basic-finner', 1.4)) {
      expect(refusalWords(r).change).not.toMatch(/ahead/);
    }
  });

  it('a flat plate a half chord ahead, swept 20 or 70 deg, at Mach 1.2: refused for its position and its sweep, the advice leading to neither (the review of 2026-10-27)', () => {
    for (const deg of [20, 70]) {
      const fins = {
        count: 3,
        section: { x: [0, 0.1, 1], halfThickness: [0, 0.012, 0.012], bluntTrailingEdge: true },
        sectionFamily: 'other' as const,
        tanLeadingEdgeSweep: Math.tan((deg * Math.PI) / 180),
        tanTrailingEdgeSweep: 0,
      };
      // Through the library, which names the position first, within a chord and more than a chord ahead, and
      // through the factor itself.
      const library = (ahead: number) => () =>
        bodyBaseDrag({
          mach: 1.2,
          afterbody: 'cylinder',
          boundaryLayerAtBase: 'turbulent',
          baseAreaRatio: 1,
          fins: {
            count: 3,
            thicknessRatio: 0.024,
            section: 'other',
            tanLeadingEdge: fins.tanLeadingEdgeSweep,
            tanTrailingEdge: 0,
            trailingEdgeAheadOfBase: ahead,
            rootChordOverDiameter: 1.5,
            flatFaced: true,
            nearBase: fins,
          },
        });
      const messages: string[] = [];
      for (const call of [
        library(0.5),
        library(1.5),
        () =>
          finsOnBaseFactorW1(1.2, {
            ...fins,
            trailingEdgeAheadOfBase: 0.5,
            rootChordOverDiameter: 1.5,
          }),
      ]) {
        try {
          call();
          messages.push('');
        } catch (e) {
          expect((e as BaseRefusal).reason, `${deg} deg`).toBe('fins-near-base');
          messages.push((e as Error).message);
        }
      }
      expect(messages).toHaveLength(3);
      for (const [k, message] of messages.entries()) {
        // Both reasons: the position's, and the sweep's.
        expect(message, `${deg} deg, call ${k}`).toContain(
          k === 1
            ? MORE_THAN_A_CHORD_AHEAD
            : 'below Mach 1.5 no measurement with fins ahead of the base',
        );
        expect(message, `${deg} deg`).toContain(W1_SWEEP_REFUSED_TOO);
        expect(message, `${deg} deg`).toContain(
          deg < 45 ? W1_FLAT_UNDER_45_MARK : W1_FLAT_BEYOND_60_MARK,
        );
        const words = refusalWords({ component: 'body base', reason: 'fins-near-base', message });
        expect(words.reason).toContain('flat fins are taken only unswept or swept 45 to 60 deg');
        // The words are the plain position words with the sweep's clause, and 0017's row holds them.
        const clause =
          'below Mach 1.62, at or near the base, flat fins are taken only unswept or swept 45 to 60 deg';
        const plain = refusalWords({
          component: 'body base',
          reason: 'fins-near-base',
          message: '',
        });
        expect(words.reason).toBe(`${plain.reason}; and ${clause}`);
        const row = readFileSync(
          new URL('../../docs/design/0017-rocketeer-interface.md', import.meta.url),
          'utf8',
        )
          .split('\n')
          .filter((l) =>
            l.startsWith("| `fins-near-base` (a flat plate's sweep refused too, below Mach 1.62)"),
          )
          .map((l) =>
            l
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim()),
          );
        expect(row).toHaveLength(1);
        expect(row[0]![1]).toBe(
          `the reason of \`fins-near-base\`, and ${clause} (0014 10.7 (z), the note of 2026-10-27)`,
        );
        expect(row[0]![2]).toBe(words.change);
        // The advice: at the base and at a sweep served there, not "unswept ones" alone, nor the base alone.
        expect(words.change).toBe(
          "the fins' trailing edges at the base, the fins unswept or swept 45 to 60 deg at the leading edge",
        );
        // And the advice is served: the same plate at the base, swept 45 deg, at Mach 1.2.
        expect(() =>
          finsOnBaseFactorW1(1.2, {
            ...fins,
            tanLeadingEdgeSweep: 1,
            trailingEdgeAheadOfBase: 0,
          }),
        ).not.toThrow();
      }
    }
  });

  it("a square-cut leading edge: the page's words, exactly (premises, not bounds; faces far larger)", () => {
    // 0016 section 21.6 and the re-review of ef7fc7d..5159cac: measurements bore out what the
    // bounds rest on, not the bounds, and only on faces far larger than a fin's.
    expect(
      refusalWords({
        component: 'fin leading edges',
        reason: 'square-leading-edge',
        message: SQUARE_EDGE_REFUSAL,
      }),
    ).toEqual({
      reason:
        "a square-cut leading edge's drag has bounds, but measurements bear out what they rest on " +
        "only on flat faces far larger than a model rocket fin's",
      change: 'rounded or bevelled leading edges',
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
