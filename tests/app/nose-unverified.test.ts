/**
 * No claim stronger than an estimate when the nose term is not verified
 * (src/app/total-drag.ts; 0011, 0014 section 10.7 (q), explicit since
 * 2026-10-23): inside the BRL sub-class with a nose whose band is measured
 * but wider than the solver's tolerance, the claim is an estimate with that
 * reason; with a verified nose, validated as before. The class's and every
 * other estimate name the reason too.
 */

import { describe, expect, it } from 'vitest';
import { claimWords, NOSE_UNVERIFIED_WORDS, VALIDATED_WORDS } from '../../src/app/status-words';
import {
  basicFinnerForm,
  CLASS_CLAIM,
  ESTIMATE_CLAIM,
  NOSE_UNVERIFIED_REASON,
  SUB_CLASS_UNVERIFIED_CLAIM,
  totalDragView,
  VALIDATED_CLAIM,
  type NoseState,
  type TotalDragForm,
} from '../../src/app/total-drag';
import { noseStateOf } from '../../src/app/total-drag-display';
import { exactConeNoseWaveDrag } from '../../src/total/nose';

const nose = (form: TotalDragForm, verified?: boolean): NoseState => ({
  kind: 'solved',
  component: exactConeNoseWaveDrag(
    form.mach,
    Math.atan(form.body.nose.baseRadius / form.body.nose.length),
  ),
  ...(verified === undefined ? {} : { verified }),
});
const claimAt = (form: TotalDragForm, verified?: boolean) => {
  const view = totalDragView(form, nose(form, verified));
  if (view.kind !== 'total') throw new Error(view.kind);
  return view.claim;
};

/** The BRL sub-class (sharp edges, Re/M 4.634e6, 293 K) at Mach 2.423. */
const sub = (): TotalDragForm => ({
  ...basicFinnerForm(2.423, 4.634e6 * 2.423),
  leadingEdgeRadius: 0,
  temperature: 293,
});

describe('a nose term not verified', () => {
  it('inside the BRL sub-class: an estimate with the plain reason; verified: validated', () => {
    expect(claimAt(sub(), false)).toEqual({
      kind: 'estimate',
      text: SUB_CLASS_UNVERIFIED_CLAIM,
      reasons: [NOSE_UNVERIFIED_REASON],
    });
    expect(claimWords(claimAt(sub(), false))).toBe(NOSE_UNVERIFIED_WORDS);
    expect(claimAt(sub(), true).kind).toBe('validated');
    expect(claimAt(sub()).kind).toBe('validated');
    const v = claimAt(sub(), true);
    if (v.kind === 'validated') expect(v.text).toBe(VALIDATED_CLAIM);
    expect(claimWords(claimAt(sub(), true))).toBe(VALIDATED_WORDS);
  });

  it("the class's and every other estimate name the reason too", () => {
    const inClass = claimAt(basicFinnerForm(2), false);
    expect(inClass.kind).toBe('estimate');
    if (inClass.kind === 'estimate') {
      expect(inClass.text).toBe(CLASS_CLAIM);
      expect(inClass.reasons).toContain(NOSE_UNVERIFIED_REASON);
    }
    const outside = claimAt(basicFinnerForm(2.6), false);
    expect(outside.kind).toBe('estimate');
    if (outside.kind === 'estimate') {
      expect(outside.text).toBe(ESTIMATE_CLAIM);
      expect(outside.reasons).toContain(NOSE_UNVERIFIED_REASON);
    }
    // Verified: the reason is absent.
    const fine = claimAt(basicFinnerForm(2), true);
    if (fine.kind === 'estimate') expect(fine.reasons).not.toContain(NOSE_UNVERIFIED_REASON);
  });

  it("the page's nose state carries the solve's verification: a wide band, not verified", () => {
    const form = sub();
    const value =
      nose(form).kind === 'solved' ? (nose(form) as { component: { cd: number } }).component.cd : 0;
    const state = noseStateOf({
      kind: 'solved',
      estimate: { kind: 'monotone', value, extrapolated: value, order: 2, uncertainty: 0.5 },
      uncertainty: 0.5,
      verified: false,
      levels: [{ refinement: 1, value }],
      reports: [],
    });
    expect(state).not.toBeNull();
    if (state === null || state.kind !== 'solved') throw new Error('not solved');
    expect(state.verified).toBe(false);
    const view = totalDragView(form, state);
    if (view.kind !== 'total') throw new Error(view.kind);
    expect(view.claim.kind).toBe('estimate');
  });
});
