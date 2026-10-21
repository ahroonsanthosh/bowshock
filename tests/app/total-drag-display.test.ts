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
  altitudeInUnit,
  BASIC_FINNER_NOSE_FIELDS,
  basicFinnerFields,
  conditionOf,
  displayText,
  failureDisplay,
  fieldsShown,
  formOf,
  gateDisplay,
  impliedConditionText,
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
  ABOVE_THE_CLASS,
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
import { flightConditionOf } from '../../src/app/flight-condition';
import type { Body } from '../../src/geometry/body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import { basicFinnerBody, basicFinnerBodyAsTyped } from '../../src/validation/basic-finner';

/**
 * The page's fields as it opens (demos/nose-drag.html): the Basic Finner's
 * shape, 30 mm across, at sea level in the standard atmosphere, at Mach 2.
 */
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
  conditionMode: 'altitude-m',
  altitude: '0',
  diameter: '30',
  reynoldsOnLength: '1.32e7',
  temperature: '293.95',
  transitionReynolds: '',
  wallTemperature: '',
  roughnessLow: '',
  roughnessHigh: '',
  roughnessSource: '',
};
/** The same with the Reynolds number and temperature given directly: the Basic Finner's range at Mach 2. */
const DIRECT_FIELDS: TotalDragFields = { ...DEFAULT_FIELDS, conditionMode: 'reynolds' };
/** The Basic Finner as the page's fields give it (BASIC_FINNER_NOSE_FIELDS). */
const BODY: Body = {
  nose: { shape: { kind: 'conical' }, length: 2.835641, baseRadius: 0.5 },
  cylinderLength: 7.164359,
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
  it("the page opens on the Basic Finner's shape, 30 mm across, at sea level: inside the class", () => {
    const form = formOf(BODY, 2, DEFAULT_FIELDS);
    // The standard atmosphere at sea level: 288.15 K; Re 1.40e7, inside 1.19e7 to 2.0e7.
    expect(form.temperature).toBe(288.15);
    expect(form.reynoldsOnLength).toBeCloseTo(1.3978e7, -3);
    expect(basicFinnerClass(form)).toEqual({ inside: true, outside: [] });
    expect(form.transitionReynolds).toEqual([]);
    expect(form.wallTemperature).toBeUndefined();
    expect(form.roughness).toBeUndefined();
    expect(overallLengthText(BODY)).toBe('10 calibers');
    // So are the range's Reynolds number and temperature given directly.
    expect(basicFinnerClass(formOf(BODY, 2, DIRECT_FIELDS))).toEqual({ inside: true, outside: [] });
    // At sea level, 30 mm across, the case lies inside the class from Mach 1.799 to 2.15;
    // above, the Mach number leaves it, and from 2.87 the Reynolds number too.
    expect(basicFinnerClass(formOf(BODY, 2.15, DEFAULT_FIELDS)).inside).toBe(true);
    expect(basicFinnerClass(formOf(BODY, 2.86, DEFAULT_FIELDS)).outside).toEqual([
      `Mach 2.86 is outside 1.799 to 2.15${ABOVE_THE_CLASS}`,
    ]);
    expect(basicFinnerClass(formOf(BODY, 2.87, DEFAULT_FIELDS)).outside).toEqual([
      `Mach 2.87 is outside 1.799 to 2.15${ABOVE_THE_CLASS}`,
      'the Reynolds number on length, 2.01e7, is outside 1.19e7 to 2.0e7',
    ]);
  });

  it('the flight condition from the altitude, Mach number and diameter, shown read-only beside them', () => {
    const c = flightConditionOf({
      altitude: 0,
      altitudeUnit: 'm',
      mach: 2,
      diameterMm: 30,
      lengthCalibers: 10,
    });
    if (c.kind !== 'ok') throw new Error('expected a condition');
    expect(conditionOf(BODY, 2, DEFAULT_FIELDS)).toEqual({
      reynoldsOnLength: c.value.reynoldsOnLength,
      temperature: 288.15,
      refusals: [],
    });
    expect(impliedConditionText(BODY, 2, DEFAULT_FIELDS)).toEqual({
      reynolds: '1.40e7',
      temperature: '288.15 K',
    });
    // In feet; the length is the body's, in calibers, times the diameter.
    const feet = { ...DEFAULT_FIELDS, conditionMode: 'altitude-ft', altitude: '36089.24' };
    expect(impliedConditionText(BODY, 2, feet).temperature).toBe('216.77 K');
    const longer = { ...BODY, cylinderLength: 2 * 7.164359 + 2.835641 };
    expect(conditionOf(longer, 2, DEFAULT_FIELDS).reynoldsOnLength).toBeCloseTo(
      2 * c.value.reynoldsOnLength,
      0,
    );
    // Given directly, the altitude and diameter are not read.
    expect(conditionOf(BODY, 2, { ...DIRECT_FIELDS, altitude: '', diameter: '' })).toEqual({
      reynoldsOnLength: 1.32e7,
      temperature: 293.95,
      refusals: [],
    });
  });

  it('an altitude out of range or a missing diameter refuses the total, with the reason', () => {
    const fields = { ...DEFAULT_FIELDS, altitude: '60000', diameter: '' };
    expect(impliedConditionText(BODY, 2, fields)).toEqual({
      reynolds: 'none',
      temperature: 'none',
    });
    const form = formOf(BODY, 2, fields);
    expect(form.reynoldsOnLength).toBeNaN();
    const text = displayText(totalDragDisplay(totalDragView(form, exactNose(form))));
    expect(text).toContain(
      'flight condition (input): the altitude must lie within -5,000 to 51,412 m above sea level',
    );
    expect(text).toContain(
      'flight condition (input): the diameter must be a positive number of millimeters.',
    );
    // Said once, not again as a Reynolds number or a temperature.
    expect(text).not.toContain('the Reynolds number on length must be');
    expect(text).not.toContain('the static temperature must be');
    // A Mach number that is not one is said once.
    const noMach = displayText(
      totalDragDisplay(
        totalDragView(formOf(BODY, Number.NaN, DEFAULT_FIELDS), { kind: 'pending' }),
      ),
    );
    expect(noMach.split('the Mach number must be a positive number').length).toBe(2);
  });

  it('a change of unit converts the altitude typed', () => {
    expect(altitudeInUnit('3048', 'm', 'ft')).toBe('10000');
    expect(altitudeInUnit('10000', 'ft', 'm')).toBe('3048');
    expect(altitudeInUnit('1000', 'm', 'ft')).toBe('3280.8');
    expect(altitudeInUnit('', 'm', 'ft')).toBe('');
    expect(altitudeInUnit('1000', 'm', 'm')).toBe('1000');
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
      altitude: true,
      altitudeLabel: 'Altitude (m)',
      reynolds: false,
    });
    expect(
      fieldsShown({ planform: 'trapezoidal', section: 'hexagonal', conditionMode: 'reynolds' }),
    ).toEqual({
      sweeps: true,
      taperRatio: false,
      ridge: false,
      bevels: true,
      thicknessLabel: 'Largest thickness',
      altitude: false,
      altitudeLabel: 'Altitude (m)',
      reynolds: true,
    });
    expect(fieldsShown({ ...DEFAULT_FIELDS, conditionMode: 'altitude-ft' }).altitudeLabel).toBe(
      'Altitude (ft)',
    );
  });

  it('the Basic Finner button: its nose, fins and range conditions given directly, the inputs kept', () => {
    expect(BASIC_FINNER_NOSE_FIELDS).toEqual({
      shape: 'conical',
      noseLength: '2.835641',
      bodyLength: '7.164359',
    });
    // The exact body (basicFinnerBody, the gate's), to six decimals.
    const exact = basicFinnerBody();
    expect(Math.abs(Number(BASIC_FINNER_NOSE_FIELDS.noseLength) - exact.nose.length)).toBeLessThan(
      5e-7,
    );
    expect(
      Math.abs(Number(BASIC_FINNER_NOSE_FIELDS.bodyLength) - exact.cylinderLength),
    ).toBeLessThan(5e-7);
    expect(basicFinnerForm().body).toEqual(exact);
    // The live flow page solves what these fields give, to the last bit.
    expect(basicFinnerBodyAsTyped()).toEqual({
      nose: {
        shape: { kind: 'conical' },
        length: Number(BASIC_FINNER_NOSE_FIELDS.noseLength),
        baseRadius: 0.5,
      },
      cylinderLength: Number(BASIC_FINNER_NOSE_FIELDS.bodyLength),
    });
    expect(BODY).toEqual(basicFinnerBodyAsTyped());
    const typed = {
      ...DEFAULT_FIELDS,
      finCount: '3',
      section: 'double-wedge',
      altitude: '1500',
      diameter: '54',
      reynoldsOnLength: '4e7',
      temperature: '250',
      transitionReynolds: '1e6',
    };
    const fields = basicFinnerFields(2.1, typed);
    // The range's air was no standard atmosphere: its conditions are given directly.
    expect(fields.conditionMode).toBe('reynolds');
    expect(fields.diameter).toBe('30');
    expect(fields.altitude).toBe('1500');
    expect(fields.reynoldsOnLength).toBe('1.39e7');
    expect(basicFinnerFields(2, typed).reynoldsOnLength).toBe(DEFAULT_FIELDS.reynoldsOnLength);
    expect(basicFinnerFields(2.9, typed).reynoldsOnLength).toBe('1.92e7');
    expect(fields.temperature).toBe('293.95');
    expect(fields.transitionReynolds).toBe('1e6');
    const form = formOf(BODY, 2.1, fields);
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
      totalDragView(formOf(BODY, 2, DIRECT_FIELDS), { kind: 'pending' }),
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
      totalDragView(formOf(ogive, 2, DIRECT_FIELDS), { kind: 'pending' }),
    );
    expect(displayText(outside)).toContain('so the total will be an estimate, not validated:');
    expect(outside.at(-1)).toEqual({
      kind: 'list',
      items: ["the nose is not a cone (the Basic Finner's is a 20 deg cone)"],
    });
  });

  it('a validated total: the headline rounded outward, the claim, every label, the notes', () => {
    const form: TotalDragForm = {
      ...basicFinnerForm(1.85, 1.23e7),
      transitionReynolds: GATE_TRANSITION_REYNOLDS,
      wallTemperature: 343.7 ** 2 / (1.4 * 287.05),
    };
    const view = totalDragView(form, exactNose(form));
    if (view.kind !== 'total') throw new Error(view.kind);
    const blocks = totalDragDisplay(view);
    // The gate's shot DA95021308 (0010 section 4.2): 0.5944 (0.5172 to 0.7039).
    expect(blocks[0]).toEqual({
      kind: 'paragraph',
      text: 'Total C_D = 0.5944, model-form band 0.5172 to 0.7039 (-13.0% to +18.5%)',
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
    // The offset at Mach 2.97 is stated beside the claim, not set apart: the class stops at
    // Mach 2.15, below those shots.
    expect(said.find((b) => b.text === OFFSET_CAVEAT)?.tone).toBe('plain');
    const [inputs, components] = tables(blocks);
    expect(inputs!.rows.map((r) => [r[0], r[2]])).toEqual(
      view.total.inputs.map((i) => [i.name, i.label]),
    );
    expect(inputs!.rows.find((r) => r[0] === 'roughness')![1]).toBe('none');
    // The transition as states of the boundary layer (0010 section 10): the run to 3e6 with
    // the fins and their trailing edges laminar together, rounded outward.
    expect(inputs!.rows.find((r) => r[0] === 'transition')![1]).toBe('-0.0448 to 0.0000');
    expect(components!.rows.map((r) => [r[0], r[4], r[5]])).toEqual(
      view.total.components.map((c) => [c.name, c.label, c.band]),
    );
    expect(components!.rows.find((r) => r[0] === 'body base')!.slice(1, 4)).toEqual([
      '0.2077',
      '0.1484 to 0.2462',
      '35%',
    ]);
    expect(blocks).toContainEqual({ kind: 'list', items: [FINS_BAND_NOTE, FINS_ON_BASE_NOTE] });
  });

  it('inside the class the offset is stated, not set apart: nothing in the claim is', () => {
    for (const mach of [1.799, 2.0, 2.15]) {
      const form = basicFinnerForm(mach);
      const blocks = totalDragDisplay(totalDragView(form, exactNose(form)));
      const box = blocks[1]!;
      if (box.kind !== 'box') throw new Error('expected the claim');
      expect(box.tone).toBe('ok');
      const said = paragraphs(box.blocks).flatMap((b) => (b.kind === 'paragraph' ? [b] : []));
      expect(said.find((b) => b.text === OFFSET_CAVEAT)?.tone).toBe('plain');
      expect(said.every((b) => b.tone === 'plain')).toBe(true);
    }
  });

  it('an estimate: said in the headline and the box, with every reason and the tolerance', () => {
    const form = { ...basicFinnerForm(2.0), trailingEdgeAheadOfBase: 1, leadingEdgeRadius: 0 };
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
