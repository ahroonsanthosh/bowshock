/**
 * The drag page (demos/nose-drag.html) in the browser: its total-drag
 * section before any nose solve (the solve itself takes far too long on
 * software WebGPU to run here), and the layout of a total computed with
 * the nose given as the Basic Finner gate gave it. What is shown is tested
 * in tests/app/total-drag.test.ts and tests/app/total-drag-display.test.ts;
 * this checks that the page reads its fields, shows exactly the display's
 * blocks, and refuses with every reason.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  basicFinnerForm,
  GATE_TRANSITION_REYNOLDS,
  OFFSET_CAVEAT,
  totalDragView,
  VALIDATED_CLAIM,
} from '../../src/app/total-drag';
import {
  displayText,
  formOf,
  gateDisplay,
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
    reynoldsOnLength: value('#reynolds'),
    temperature: value('#temperature'),
    transitionReynolds: value('#transition'),
    wallTemperature: value('#wall-temperature'),
    roughnessLow: value('#rough-low'),
    roughnessHigh: value('#rough-high'),
    roughnessSource: value('#rough-source'),
  };
}

describe('the drag page: total drag before a nose solve', () => {
  it('opens on the Basic Finner, inside the class, with no number, laid out as the display says', () => {
    expect(text('#overall-length')).toBe('10 calibers');
    expect(text('#total-mach')).toBe('2');
    const out = text('#total-output');
    expect(out).toContain('No total yet: run the solve above');
    expect(out).toContain('inside the class tested by the Basic Finner');
    expect(out).not.toContain('C_D =');
    const body = {
      nose: { shape: { kind: 'conical' }, length: 2.836, baseRadius: 0.5 },
      cylinderLength: 7.164,
    } as const;
    const form = formOf(body, 2, pageFields());
    expect(out).toBe(displayText(totalDragDisplay(totalDragView(form, { kind: 'pending' }))));
    expect(text('#gate-body')).toBe(displayText(gateDisplay()));
    expect(doc.querySelectorAll('#gate-body tbody tr').length).toBe(11);
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
    expect(out).toContain('outside the class tested by the Basic Finner');
    expect(out).toContain('the nose is not a cone');
    before = out;
    set('#planform', 'trapezoidal');
    expect((doc.querySelector('#sweep-fields') as HTMLElement).hidden).toBe(false);
    // Swept at 30 deg front and back, of constant chord: src/fins refuses the
    // swept rounded leading edge and src/base the swept blunt trailing edge.
    set('#le-sweep', '30');
    set('#te-sweep', '30');
    out = await settled(before);
    expect(out).toContain('Total drag refused: no number is given');
    expect(out).toContain('fin leading edges (swept-leading-edge)');
    expect(out).toContain('fin trailing-edge base (swept-trailing-edge)');
    before = out;
    // Sweeping the leading edge alone changes the chord along the span.
    set('#te-sweep', '0');
    out = await settled(before);
    expect(out).toContain('fin leading edges (leading-edge-geometry)');
    expect(out).toContain('fin trailing-edge base (input)');
    before = out;
    (doc.querySelector('#basic-finner') as HTMLButtonElement).click();
    out = await settled(before);
    expect(out).toContain('inside the class tested by the Basic Finner');
    expect(text('#overall-length')).toBe('10 calibers');
  });
});

describe('the total as the page lays it out', { timeout: 60_000 }, () => {
  it('every block of the display, in order, with the claim set apart and the numbers unwrapped', () => {
    const mach = 2.97;
    const form = {
      ...basicFinnerForm(mach, 1.97e7),
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
    // The gate's shot DA95022205 (0010 section 4.2): 0.4071 (0.3579 to 0.4786).
    expect(target.querySelector('p.result.ok')?.textContent).toBe(
      'Total C_D = 0.4071, model-form band 0.3579 to 0.4786 (-12.1% to +17.6%)',
    );
    expect(target.querySelector('.claim.claim-ok')?.textContent).toContain(VALIDATED_CLAIM);
    expect(target.querySelector('.claim .warn')?.textContent).toBe(OFFSET_CAVEAT);
    expect(target.querySelectorAll('tbody tr').length).toBe(
      view.total.inputs.length + view.total.components.length,
    );
    expect(target.querySelectorAll('td.num').length).toBe(
      view.total.inputs.length + 3 * view.total.components.length,
    );
    target.remove();
  });
});
