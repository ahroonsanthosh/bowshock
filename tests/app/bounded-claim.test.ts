/**
 * The page's claim names every bounded part of a served total, the fins'
 * parts as well as the body base (src/app/total-drag.ts, `boundedReasons(
 * parts.base, parts.components)`). Since main's A5 (f88ecbe) no served
 * total holds a bounded part of the fins: a rounded leading edge swept past
 * 60 deg is served only among a refused total's parts (0016 section 21.8),
 * and the square-cut edge is unwired (21.6). So the call site is tested
 * here with the components' function wrapped to mark a served part bounded,
 * as a bounded leading edge would be.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/total/finned-body', async (importOriginal) => {
  const m = await importOriginal<typeof import('../../src/total/finned-body')>();
  return {
    ...m,
    finnedBodyComponents: (...args: Parameters<typeof m.finnedBodyComponents>) => {
      const r = m.finnedBodyComponents(...args);
      return {
        ...r,
        components: r.components.map((c) =>
          c.name === 'fin wave drag' ? { ...c, bounded: m.SWEPT_EDGE_BOUNDED_REASON } : c,
        ),
      };
    },
  };
});

import { claimWords, SWEPT_EDGE_BOUNDED_WORDS } from '../../src/app/status-words';
import {
  basicFinnerForm,
  totalDragView,
  type NoseState,
  type TotalDragForm,
} from '../../src/app/total-drag';
import { SWEPT_EDGE_BOUNDED_REASON } from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';

const exactNose = (form: TotalDragForm): NoseState => {
  const n = form.body.nose;
  return {
    kind: 'solved',
    verified: true,
    component: exactConeNoseWaveDrag(form.mach, Math.atan(n.baseRadius / n.length)),
  };
};

describe("the claim names a fins' part that is bounded", { timeout: 60_000 }, () => {
  it('a served total with a bounded part: an estimate, its reasons and words naming it', () => {
    const form = basicFinnerForm(2.4, 1.6e7);
    const v = totalDragView(form, exactNose(form));
    if (v.kind !== 'total') throw new Error(JSON.stringify(v));
    expect(v.total.components.find((c) => c.name === 'fin wave drag')!.bounded).toBe(
      SWEPT_EDGE_BOUNDED_REASON,
    );
    expect(v.claim.kind).toBe('estimate');
    if (v.claim.kind !== 'estimate') return;
    expect(v.claim.reasons).toContain(SWEPT_EDGE_BOUNDED_REASON);
    expect(claimWords(v.claim)).toBe(SWEPT_EDGE_BOUNDED_WORDS);
  });
});
