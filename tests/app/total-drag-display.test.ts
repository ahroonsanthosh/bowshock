/**
 * Everything the drag page shows of the total drag
 * (src/app/total-drag-display.ts): the fields as typed, the nose solve's
 * outcome, and the display blocks, every string final. The numbers behind
 * them are tested in ./total-drag.test.ts; here, that the page shows them
 * as they are, with their labels, its bands rounded outward, and no number
 * where there is none.
 */

import { describe, expect, it } from 'vitest';
import type { VerifiedDrag } from '../../src/analysis/verified-drag';
import {
  BASIC_FINNER_NOSE_FIELDS,
  basicFinnerFields,
  displayText,
  failureDisplay,
  fieldsShown,
  formOf,
  gateDisplay,
  NEAR_MACH_3_TEXT,
  NO_WEBGPU,
  noseKeyOf,
  noseStateOf,
  overallLengthText,
  PENDING_TEXT,
  totalDragDisplay,
  type DisplayBlock,
  type TotalDragFields,
} from '../../src/app/total-drag-display';
import {
  BAND_CAVEAT,
  basicFinnerClass,
  basicFinnerForm,
  BREAKDOWN_NOTE,
  CLASS_DESCRIPTION,
  ESTIMATE_CLAIM,
  FINS_BAND_NOTE,
  FINS_ON_BASE_NOTE,
  GATE_TRANSITION_REYNOLDS,
  NOT_REPRESENTED,
  OFFSET_CAVEAT,
  PUBLISHED_GATE,
  TOLERANCE_CAVEAT,
  totalDragView,
  VALIDATED_CLAIM,
  type NoseState,
  type TotalDragForm,
} from '../../src/app/total-drag';
import type { Body } from '../../src/geometry/body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';

/** The page's fields as it opens: the Basic Finner at Mach 2 (demos/nose-drag.html). */
const DEFAULT_FIELDS: TotalDragFields = {
  finCount: '4',
  planform: 'rectangular',
  leadingEdgeSweep: '0',
  trailingEdgeSweep: '0',
  taperRatio: '0.5',
  rootChord: '1',
  span: '1',
  section: 'single-wedge',
  thickness: '0.08',
  ridge: '0.5',
  frontBevel: '0.25',
  rearBevel: '0.25',
  leadingEdgeRadius: '0.004',
  trailingEdgeAheadOfBase: '0',
  reynoldsOnLength: '1.32e7',
  temperature: '293.95',
  transitionReynolds: '',
  wallTemperature: '',
  roughnessLow: '',
  roughnessHigh: '',
  roughnessSource: '',
};
const BODY: Body = {
  nose: { shape: { kind: 'conical' }, length: 2.836, baseRadius: 0.5 },
  cylinderLength: 7.164,
};

const exactNose = (form: TotalDragForm): NoseState => ({
  kind: 'solved',
  component: exactConeNoseWaveDrag(
    form.mach,
    Math.atan(form.body.nose.baseRadius / form.body.nose.length),
  ),
});
const paragraphs = (blocks: readonly DisplayBlock[]): DisplayBlock[] =>
  blocks.flatMap((b) => (b.kind === 'box' ? paragraphs(b.blocks) : [b]));
const tables = (blocks: readonly DisplayBlock[]) =>
  blocks.flatMap((b) => (b.kind === 'table' ? [b] : []));

describe('the fields as typed', { timeout: 60_000 }, () => {
  it('the page opens on the Basic Finner, inside the class', () => {
    const form = formOf(BODY, 2, DEFAULT_FIELDS);
    expect(basicFinnerClass(form)).toEqual({ inside: true, outside: [] });
    expect(form.transitionReynolds).toEqual([]);
    expect(form.wallTemperature).toBeUndefined();
    expect(form.roughness).toBeUndefined();
    expect(overallLengthText(BODY)).toBe('10 calibers');
  });

  it('an empty number is refused, not read as zero; lists and one-sided bands', () => {
    const form = formOf(BODY, 2, {
      ...DEFAULT_FIELDS,
      span: '',
      transitionReynolds: '5e5, 1.6e6 3e6',
      wallTemperature: '293.95',
      roughnessHigh: '0.01',
      roughnessSource: 'a guess',
    });
    expect(form.span).toBeNaN();
    expect(form.transitionReynolds).toEqual([5e5, 1.6e6, 3e6]);
    expect(form.wallTemperature).toBe(293.95);
    expect(form.roughness).toEqual({ low: 0, high: 0.01, source: 'a guess' });
    const v = totalDragView(form, exactNose(form));
    expect(v.kind).toBe('refused');
    expect(displayText(totalDragDisplay(v))).toContain(
      'fins (input): the span must be a positive number.',
    );
  });

  it('planforms and sections, and which fields they ask', () => {
    const form = formOf(BODY, 2, {
      ...DEFAULT_FIELDS,
      planform: 'trapezoidal',
      leadingEdgeSweep: '30',
      trailingEdgeSweep: '10',
      section: 'hexagonal',
      thickness: '0.06',
      frontBevel: '0.2',
      rearBevel: '0.3',
    });
    expect(form.planform).toEqual({
      kind: 'trapezoidal',
      leadingEdgeSweepDegrees: 30,
      trailingEdgeSweepDegrees: 10,
    });
    expect(form.section).toEqual({
      kind: 'hexagonal',
      thickness: 0.06,
      frontBevel: 0.2,
      rearBevel: 0.3,
    });
    expect(
      formOf(BODY, 2, { ...DEFAULT_FIELDS, planform: 'clipped-delta', taperRatio: '0.4' }).planform,
    ).toEqual({ kind: 'clipped-delta', taperRatio: 0.4 });
    expect(
      formOf(BODY, 2, { ...DEFAULT_FIELDS, section: 'double-wedge', ridge: '0.4' }).section,
    ).toEqual({ kind: 'double-wedge', thickness: 0.08, ridge: 0.4 });
    expect(fieldsShown(DEFAULT_FIELDS)).toEqual({
      sweeps: false,
      taperRatio: false,
      ridge: false,
      bevels: false,
      thicknessLabel: 'Trailing-edge thickness',
    });
    expect(fieldsShown({ planform: 'trapezoidal', section: 'hexagonal' })).toEqual({
      sweeps: true,
      taperRatio: false,
      ridge: false,
      bevels: true,
      thicknessLabel: 'Largest thickness',
    });
  });

  it('the Basic Finner button: its nose, fins and range conditions, the inputs kept', () => {
    expect(BASIC_FINNER_NOSE_FIELDS).toEqual({
      shape: 'conical',
      noseLength: '2.836',
      bodyLength: '7.164',
    });
    const typed = {
      ...DEFAULT_FIELDS,
      finCount: '3',
      section: 'double-wedge',
      reynoldsOnLength: '4e7',
      temperature: '250',
      transitionReynolds: '1e6',
    };
    const fields = basicFinnerFields(2.9, typed);
    expect(fields.reynoldsOnLength).toBe('1.92e7');
    expect(basicFinnerFields(2, typed).reynoldsOnLength).toBe(DEFAULT_FIELDS.reynoldsOnLength);
    expect(fields.temperature).toBe('293.95');
    expect(fields.transitionReynolds).toBe('1e6');
    const form = formOf(BODY, 2.9, fields);
    expect(basicFinnerClass(form)).toEqual({ inside: true, outside: [] });
  });
});

describe('the nose solve, as the total takes it', { timeout: 60_000 }, () => {
  const solved = (uncertainty: number | undefined): VerifiedDrag => ({
    kind: 'solved',
    estimate:
      uncertainty === undefined
        ? { kind: 'unresolved', value: 0.1045, reason: 'four grids are needed' }
        : { kind: 'monotone', value: 0.1045, extrapolated: 0.10449, order: 2, uncertainty },
    uncertainty,
    verified: false,
    levels: [
      { refinement: 1, value: 0.1 },
      { refinement: 2, value: 0.104 },
      { refinement: 4, value: 0.1044 },
      { refinement: 8, value: 0.1045 },
    ],
    reports: [],
  });

  it('a band: the value and band unchanged; none: refused', () => {
    const s = noseStateOf(solved(1e-5));
    expect(s?.kind).toBe('solved');
    if (s?.kind === 'solved') {
      expect([s.component.cd, s.component.low, s.component.high]).toEqual([
        0.1045,
        0.1045 - 1e-5,
        0.1045 + 1e-5,
      ]);
      expect(s.component.label).toContain('finest of 4 grids');
    }
    expect(noseStateOf(solved(undefined))).toEqual({
      kind: 'refused',
      message:
        'the nose wave drag has no measured error band (not verified), and the total needs one',
    });
  });

  it('not converged, invalid or refused: the total refused; stopped or a failed GPU: no result', () => {
    expect(noseStateOf({ kind: 'not-converged', refinement: 4, reason: 'x' })?.kind).toBe(
      'refused',
    );
    expect(noseStateOf({ kind: 'invalid', refinement: 2, reason: 'the shock detaches' })).toEqual({
      kind: 'refused',
      message: 'the nose wave drag was not solved: on the grid at refinement 2, the shock detaches',
    });
    expect(
      noseStateOf({ kind: 'error', message: 'the tip shock detaches', gpuFailed: false }),
    ).toEqual({
      kind: 'refused',
      message: 'the nose wave drag cannot be solved here: the tip shock detaches',
    });
    expect(noseStateOf({ kind: 'cancelled', reports: [] })).toBeNull();
    expect(noseStateOf({ kind: 'error', message: 'lost', gpuFailed: true })).toBeNull();
  });

  it('a solve serves only its own nose, body and Mach number', () => {
    expect(noseKeyOf(BODY, 2)).toBe(noseKeyOf({ ...BODY }, 2));
    expect(noseKeyOf(BODY, 2)).not.toBe(noseKeyOf(BODY, 2.01));
    expect(noseKeyOf(BODY, 2)).not.toBe(noseKeyOf({ ...BODY, cylinderLength: 7.2 }, 2));
  });

  it('without WebGPU the total is refused, with every other reason beside it', () => {
    const form = formOf(BODY, 1.6, DEFAULT_FIELDS);
    expect(displayText(totalDragDisplay(totalDragView(form, NO_WEBGPU)))).toBe(
      'Total drag refused: no number is given. Every reason:' +
        'nose wave drag (not-verified): the nose wave drag is solved on the GPU, and this ' +
        'browser provides no WebGPU.' +
        'body base (mach-range): the fins-on-base factor is read at Mach 1.8 to 3 (TN 3819 ' +
        'fig. 35), asked Mach 1.6.',
    );
  });
});

describe('the display', { timeout: 60_000 }, () => {
  it('waiting for the nose: no number, and whether the case is in the class', () => {
    const inside = totalDragDisplay(
      totalDragView(formOf(BODY, 2, DEFAULT_FIELDS), { kind: 'pending' }),
    );
    expect(inside[0]).toEqual({
      kind: 'paragraph',
      text: PENDING_TEXT,
      tone: 'plain',
      headline: true,
    });
    expect(displayText(inside)).toContain('inside the class tested by the Basic Finner');
    expect(displayText(inside)).not.toContain('C_D =');
    const ogive = {
      ...BODY,
      nose: { ...BODY.nose, shape: { kind: 'ogive', parameter: 1 } },
    } as const;
    const outside = totalDragDisplay(
      totalDragView(formOf(ogive, 2, DEFAULT_FIELDS), { kind: 'pending' }),
    );
    expect(displayText(outside)).toContain('so the total will be an estimate, not validated:');
    expect(outside.at(-1)).toEqual({
      kind: 'list',
      items: ["the nose is not a cone (the Basic Finner's is a 20 deg cone)"],
    });
  });

  it('a validated total: the headline rounded outward, the claim, every label, the notes', () => {
    const form: TotalDragForm = {
      ...basicFinnerForm(2.97, 1.97e7),
      transitionReynolds: GATE_TRANSITION_REYNOLDS,
      wallTemperature: 343.7 ** 2 / (1.4 * 287.05),
    };
    const view = totalDragView(form, exactNose(form));
    if (view.kind !== 'total') throw new Error(view.kind);
    const blocks = totalDragDisplay(view);
    // The gate's shot DA95022205 (0010 section 4.2): 0.4071 (0.3579 to 0.4786).
    expect(blocks[0]).toEqual({
      kind: 'paragraph',
      text: 'Total C_D = 0.4071, model-form band 0.3579 to 0.4786 (-12.1% to +17.6%)',
      tone: 'ok',
      headline: true,
    });
    const box = blocks[1]!;
    expect(box.kind === 'box' && box.tone).toBe('ok');
    const said = paragraphs(blocks).flatMap((b) => (b.kind === 'paragraph' ? [b] : []));
    for (const text of [
      VALIDATED_CLAIM,
      TOLERANCE_CAVEAT,
      BAND_CAVEAT,
      BREAKDOWN_NOTE,
      NOT_REPRESENTED,
    ]) {
      expect(said.map((b) => b.text)).toContain(text);
    }
    // Near Mach 3 the offset is set apart.
    expect(said.find((b) => b.text === OFFSET_CAVEAT)?.tone).toBe('warn');
    expect(said.find((b) => b.text === NEAR_MACH_3_TEXT)?.tone).toBe('warn');
    const [inputs, components] = tables(blocks);
    expect(inputs!.rows.map((r) => [r[0], r[2]])).toEqual(
      view.total.inputs.map((i) => [i.name, i.label]),
    );
    expect(inputs!.rows.find((r) => r[0] === 'roughness')![1]).toBe('none');
    // The transition as states of the boundary layer (0010 section 10): the run to 3e6 with
    // the fins and their trailing edges laminar together, -0.02534, rounded outward.
    expect(inputs!.rows.find((r) => r[0] === 'transition')![1]).toBe('-0.0254 to 0.0000');
    expect(components!.rows.map((r) => [r[0], r[4], r[5]])).toEqual(
      view.total.components.map((c) => [c.name, c.label, c.band]),
    );
    expect(components!.rows.find((r) => r[0] === 'body base')!.slice(1, 4)).toEqual([
      '0.1272',
      '0.0886 to 0.1531',
      '31%',
    ]);
    expect(blocks).toContainEqual({
      kind: 'list',
      items: [FINS_BAND_NOTE, FINS_ON_BASE_NOTE, expect.stringContaining('one reading') as string],
    });
  });

  it('away from Mach 3 the offset is stated, not set apart', () => {
    const form = basicFinnerForm(2.4);
    const blocks = totalDragDisplay(totalDragView(form, exactNose(form)));
    const said = paragraphs(blocks).flatMap((b) => (b.kind === 'paragraph' ? [b] : []));
    expect(said.find((b) => b.text === OFFSET_CAVEAT)?.tone).toBe('plain');
    expect(said.some((b) => b.text === NEAR_MACH_3_TEXT)).toBe(false);
  });

  it('an estimate: said in the headline and the box, with every reason and the tolerance', () => {
    const form = { ...basicFinnerForm(2.4), trailingEdgeAheadOfBase: 1, leadingEdgeRadius: 0 };
    const blocks = totalDragDisplay(totalDragView(form, exactNose(form)));
    const head = blocks[0]!;
    expect(head.kind === 'paragraph' && head.text.endsWith(': an estimate, not validated')).toBe(
      true,
    );
    expect(head.kind === 'paragraph' && head.tone).toBe('warn');
    const box = blocks[1]!;
    if (box.kind !== 'box') throw new Error('expected the claim');
    expect(box.tone).toBe('warn');
    expect(displayText(box.blocks)).toContain(ESTIMATE_CLAIM);
    expect(box.blocks).toContainEqual({
      kind: 'list',
      items: [
        'the fins end 1 cal ahead of the base, not at it',
        'the leading-edge radius is 0 cal, not 0.004 within 0.5%',
      ],
    });
    expect(displayText(box.blocks)).toContain('-19.5% to -26.2% and +23.1% to +27.4%');
  });

  it('a failure of the computation itself: no number', () => {
    expect(displayText(failureDisplay('boom'))).toBe(
      'The total could not be computed: boom. No number is given.',
    );
  });

  it('the class in words, and the gate as 0010 section 4.2 prints it', () => {
    const blocks = gateDisplay();
    expect(displayText(blocks)).toContain(CLASS_DESCRIPTION);
    const [gate] = tables(blocks);
    expect(gate!.rows.length).toBe(11);
    expect(gate!.rows[0]).toEqual([
      'DA95021318',
      '1.799',
      '0.594',
      '0.6123 (0.5311 to 0.7261)',
      '-3.0%',
      '-24.2% to +23.1%',
    ]);
    expect(gate!.rows.map((r) => r[0])).toEqual(PUBLISHED_GATE.map((s) => s.shot));
    expect(gate!.rows.map((r) => r[4])).toEqual([
      '-3.0%',
      '+0.4%',
      '-4.6%',
      '+3.2%',
      '-0.9%',
      '-0.3%',
      '+0.7%',
      '-7.7%',
      '+4.5%',
      '-5.4%',
      '-7.6%',
    ]);
  });
});
