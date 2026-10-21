/**
 * The drag page (demos/nose-drag.html) in the browser: its total-drag
 * section before any nose solve (the solve itself takes far too long on
 * software WebGPU to run here), and the layout of a total computed with
 * the nose given as the Basic Finner gate gave it. What is shown is tested
 * in tests/app/total-drag.test.ts and tests/app/total-drag-display.test.ts;
 * this checks that the page reads its fields, shows exactly the display's
 * blocks, and refuses with every reason; and that the flight condition is
 * asked as altitude and diameter, with the Reynolds number directly as
 * the alternative.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  basicFinnerForm,
  GATE_TRANSITION_REYNOLDS,
  CLASS_CLAIM,
  totalDragView,
  SUSPENDED_REASON,
} from '../../src/app/total-drag';
import {
  displayText,
  formOf,
  gateDisplay,
  impliedConditionText,
  totalDragDisplay,
  type TotalDragFields,
} from '../../src/app/total-drag-display';
import { renderBlocks } from '../../src/app/total-drag-render';
import { exactConeNoseWaveDrag } from '../../src/total/nose';

async function until(test: () => boolean, what: string, ms = 30_000): Promise<void> {
  const start = performance.now();
  while (!test()) {
    if (performance.now() - start > ms) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

let frame: HTMLIFrameElement;
let doc: Document;
const text = (selector: string) => doc.querySelector(selector)?.textContent ?? '';
const hidden = (selector: string) => (doc.querySelector(selector) as HTMLElement).hidden;

/** Sets an input or select and fires the events the page listens to. */
function set(selector: string, value: string): void {
  const win = frame.contentWindow as (Window & typeof globalThis) | null;
  const el = doc.querySelector(selector);
  if (
    win === null ||
    !(el instanceof win.HTMLInputElement || el instanceof win.HTMLSelectElement)
  ) {
    throw new Error(`no input at ${selector}`);
  }
  el.value = value;
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
}

/** Waits for the total to be recomputed after a change (the page waits for typing to pause). */
async function settled(previous: string): Promise<string> {
  await until(() => text('#total-output') !== previous, 'the total to update', 10_000);
  return text('#total-output');
}

beforeAll(async () => {
  frame = document.createElement('iframe');
  frame.style.width = '1000px';
  frame.style.height = '800px';
  frame.src = '/demos/nose-drag.html';
  const loaded = new Promise((resolve) => {
    frame.addEventListener('load', resolve, { once: true });
  });
  document.body.append(frame);
  await loaded;
  doc = frame.contentDocument!;
  await until(() => text('#total-output') !== '', 'the total section');
});

afterAll(() => {
  frame.remove();
});

/** The page's fields as they stand, read from its elements. */
function pageFields(): TotalDragFields {
  const value = (id: string) => (doc.querySelector(id) as HTMLInputElement).value;
  return {
    finCount: value('#fin-count'),
    planform: value('#planform'),
    leadingEdgeSweep: value('#le-sweep'),
    trailingEdgeSweep: value('#te-sweep'),
    taperRatio: value('#taper'),
    rootChord: value('#root-chord'),
    span: value('#span'),
    section: value('#section'),
    thickness: value('#thickness'),
    ridge: value('#ridge'),
    frontBevel: value('#front-bevel'),
    rearBevel: value('#rear-bevel'),
    leadingEdgeRadius: value('#le-radius'),
    trailingEdgeAheadOfBase: value('#te-ahead'),
    conditionMode: value('#condition-mode'),
    altitude: value('#altitude'),
    diameter: value('#diameter'),
    reynoldsOnLength: value('#reynolds'),
    temperature: value('#temperature'),
    transitionReynolds: value('#transition'),
    wallTemperature: value('#wall-temperature'),
    roughnessLow: value('#rough-low'),
    roughnessHigh: value('#rough-high'),
    roughnessSource: value('#rough-source'),
  };
}

/** The Basic Finner as the page opens on it (BASIC_FINNER_NOSE_FIELDS). */
const BODY = {
  nose: { shape: { kind: 'conical' }, length: 2.835641, baseRadius: 0.5 },
  cylinderLength: 7.164359,
} as const;

describe('the drag page: total drag before a nose solve', () => {
  it("opens on the Basic Finner's shape at sea level, inside the class, with no number", () => {
    expect(text('#overall-length')).toBe('10 calibers');
    expect(text('#total-mach')).toBe('2');
    // Asked as altitude and diameter; the Reynolds number and temperature shown, not asked.
    expect(pageFields().conditionMode).toBe('altitude-m');
    expect(hidden('#altitude-field') || hidden('#diameter-field')).toBe(false);
    expect(hidden('#reynolds-field') || hidden('#temperature-field')).toBe(true);
    expect(text('#implied-reynolds')).toBe('1.40e7');
    expect(text('#implied-temperature')).toBe('288.15 K');
    const out = text('#total-output');
    expect(out).toContain('No total yet: run the solve above');
    expect(out).toContain("inside the Basic Finner's class, kept as the range");
    expect(out).not.toContain('C_D =');
    const form = formOf(BODY, 2, pageFields());
    expect(out).toBe(displayText(totalDragDisplay(totalDragView(form, { kind: 'pending' }))));
    expect(text('#gate-body')).toBe(displayText(gateDisplay()));
    expect(doc.querySelectorAll('#gate-body tbody tr').length).toBe(11);
  });

  it('the altitude in feet, converted; the Reynolds number directly as the alternative', async () => {
    let before = text('#total-output');
    set('#altitude', '3048');
    let out = await settled(before);
    expect(text('#implied-temperature')).toBe('268.35 K');
    set('#condition-mode', 'altitude-ft');
    expect(text('#altitude-label')).toBe('Altitude (ft)');
    expect(pageFields().altitude).toBe('10000');
    before = out;
    set('#diameter', '60');
    out = await settled(before);
    expect(text('#implied-reynolds')).toBe(impliedConditionText(BODY, 2, pageFields()).reynolds);
    expect(out).toBe(
      displayText(
        totalDragDisplay(totalDragView(formOf(BODY, 2, pageFields()), { kind: 'pending' })),
      ),
    );
    // Out of range: no number, and the reason.
    before = out;
    set('#altitude', '200000');
    out = await settled(before);
    expect(text('#implied-reynolds')).toBe('none');
    expect(out).toContain('the altitude must lie within -16,404 to 168,676 ft above sea level');
    // Directly: the Basic Finner's range, inside the class.
    before = out;
    set('#condition-mode', 'reynolds');
    out = await settled(before);
    expect(hidden('#altitude-field') || hidden('#implied-reynolds-field')).toBe(true);
    expect(hidden('#reynolds-field') || hidden('#temperature-field')).toBe(false);
    expect(out).toContain("inside the Basic Finner's class, kept as the range");
    // Back to meters, as the page opened: inside the class again, the same words.
    set('#condition-mode', 'altitude-m');
    set('#altitude', '0');
    set('#diameter', '30');
    await until(() => text('#implied-reynolds') === '1.40e7', 'the condition shown', 10_000);
    expect(text('#total-output')).toBe(out);
  });

  it('below Mach 1.8 it is refused, with the reason, and no number', async () => {
    const before = text('#total-output');
    set('#mach', '1.6');
    const out = await settled(before);
    expect(out).toContain('Total drag refused: no number is given');
    expect(out).toContain('body base (mach-range)');
    expect(out).not.toContain('C_D =');
    set('#mach', '2');
    await settled(out);
  });

  it('another nose and swept fins: outside the class, with every reason', async () => {
    let before = text('#total-output');
    set('#shape', 'ogive');
    let out = await settled(before);
    expect(out).toContain("outside the Basic Finner's class");
    expect(out).toContain('the nose is not a cone');
    before = out;
    set('#planform', 'trapezoidal');
    expect((doc.querySelector('#sweep-fields') as HTMLElement).hidden).toBe(false);
    // Swept at 30 deg front and back, of constant chord: src/fins refuses the
    // swept rounded leading edge and src/base the swept blunt trailing edge and,
    // the fins ending at the base, the fins-on-base factor (0014 section 10.7).
    set('#le-sweep', '30');
    set('#te-sweep', '30');
    out = await settled(before);
    expect(out).toContain('Total drag refused: no number is given');
    expect(out).toContain('fin leading edges (swept-leading-edge)');
    expect(out).toContain('fin trailing-edge base (swept-trailing-edge)');
    expect(out).toContain('body base (fin-sweep)');
    before = out;
    // Sweeping the leading edge alone changes the chord along the span.
    set('#te-sweep', '0');
    out = await settled(before);
    expect(out).toContain('fin leading edges (leading-edge-geometry)');
    expect(out).toContain('body base (fin-sweep)');
    expect(out).toContain('fin trailing-edge base (input)');
    before = out;
    (doc.querySelector('#basic-finner') as HTMLButtonElement).click();
    out = await settled(before);
    // The range's conditions, given directly: the gate's class.
    expect(pageFields().conditionMode).toBe('reynolds');
    expect(hidden('#reynolds-field')).toBe(false);
    expect(pageFields().reynoldsOnLength).toBe('1.32e7');
    expect(pageFields().temperature).toBe('293.95');
    expect(out).toContain("inside the Basic Finner's class, kept as the range");
    expect(text('#overall-length')).toBe('10 calibers');
  });
});

describe('the total as the page lays it out', { timeout: 60_000 }, () => {
  it('every block of the display, in order, with the claim set apart and the numbers unwrapped', () => {
    const mach = 1.85;
    const form = {
      ...basicFinnerForm(mach, 1.23e7),
      transitionReynolds: GATE_TRANSITION_REYNOLDS,
      wallTemperature: 343.7 ** 2 / (1.4 * 287.05),
    };
    const view = totalDragView(form, {
      kind: 'solved',
      component: exactConeNoseWaveDrag(mach, Math.atan(0.5 / form.body.nose.length)),
    });
    if (view.kind !== 'total') throw new Error(view.kind);
    const blocks = totalDragDisplay(view);
    const target = document.createElement('div');
    document.body.append(target);
    renderBlocks(target, blocks);
    expect(target.textContent).toBe(displayText(blocks));
    // The gate's shot DA95021308, corrected (0010 section 11): 0.5940 (0.5155 to 0.7048), inside
    // the class and an estimate, its claim suspended (0010 section 11.7).
    expect(target.querySelector('p.result.warn')?.textContent).toBe(
      'Total C_D = 0.5940, model-form band 0.5155 to 0.7048 (-13.2% to +18.7%): an estimate, ' +
        'not validated',
    );
    expect(target.querySelector('.claim.claim-warn')?.textContent).toContain(CLASS_CLAIM);
    expect(target.querySelector('.claim.claim-warn')?.textContent).toContain(SUSPENDED_REASON);
    // No green status anywhere in the total.
    expect(target.querySelector('.ok, .claim-ok')).toBeNull();
    expect(target.querySelectorAll('tbody tr').length).toBe(
      view.total.inputs.length + view.total.components.length,
    );
    expect(target.querySelectorAll('td.num').length).toBe(
      view.total.inputs.length + 3 * view.total.components.length,
    );
    target.remove();
  });

  it('the Basic Finner is laid out as an estimate, not validated, with the corrected band, never refused, inside the class (M 1.8, 2.0, 2.15, its claim suspended) and above it (M 2.3, 2.5, 2.9)', () => {
    for (const mach of [1.8, 2.0, 2.15, 2.3, 2.5, 2.9]) {
      const form = basicFinnerForm(mach);
      const view = totalDragView(form, {
        kind: 'solved',
        component: exactConeNoseWaveDrag(mach, Math.atan(0.5 / form.body.nose.length)),
      });
      if (view.kind !== 'total') throw new Error(`M ${mach}: ${view.kind}`);
      const blocks = totalDragDisplay(view);
      const target = document.createElement('div');
      document.body.append(target);
      renderBlocks(target, blocks);
      expect(target.textContent).toBe(displayText(blocks));
      const head = target.querySelector('p.result.warn')?.textContent ?? '';
      expect(head.startsWith(`Total C_D = ${view.total.cd.toFixed(4)}`)).toBe(true);
      expect(head.endsWith(': an estimate, not validated')).toBe(true);
      expect(target.querySelector('.claim.claim-warn')?.textContent).toContain(
        mach <= 2.15 ? SUSPENDED_REASON : `Mach ${mach} is outside 1.799 to 2.15`,
      );
      expect(target.textContent).toContain(
        mach > 2.56 ? 'bounded, not measured' : 'an analogy, not a measurement',
      );
      expect(target.querySelector('.ok, .claim-ok')).toBeNull();
      target.remove();
    }
  });
});
