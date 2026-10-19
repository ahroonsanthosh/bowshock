/**
 * The drag page (demos/nose-drag.html) in the browser: its total-drag
 * section before any nose solve (the solve itself takes far too long on
 * software WebGPU to run here), and the section's rendering of a total
 * computed with the nose given as the Basic Finner gate gave it. The
 * numbers are those of tests/app/total-drag.test.ts; this checks that the
 * page shows them, with their labels, and refuses with every reason.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  basicFinnerForm,
  BREAKDOWN_NOTE,
  FINS_BAND_NOTE,
  GATE_TRANSITION_REYNOLDS,
  OFFSET_CAVEAT,
  totalDragView,
  VALIDATED_CLAIM,
} from '../../src/app/total-drag';
import { renderTotalDrag } from '../../src/app/total-drag-render';
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

describe('the drag page: total drag before a nose solve', () => {
  it('opens on the Basic Finner, inside the class, with no number', () => {
    expect(text('#overall-length')).toBe('10 calibers');
    expect(text('#total-mach')).toBe('2');
    const out = text('#total-output');
    expect(out).toContain('No total yet: run the solve above');
    expect(out).toContain('inside the class tested by the Basic Finner');
    expect(out).not.toContain('C_D =');
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

describe('the total as the page renders it', { timeout: 60_000 }, () => {
  it('shows the total, its band rounded outward, every input band and every component with its label', () => {
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
    const target = document.createElement('div');
    document.body.append(target);
    renderTotalDrag(target, view);
    const shown = target.textContent;
    // The gate's shot DA95022205 (0010 section 4.2): 0.4071 (0.3579 to 0.4786).
    expect(shown).toContain('Total C_D = 0.4071, model-form band 0.3579 to 0.4786');
    expect(shown).toContain(VALIDATED_CLAIM);
    expect(shown).toContain(OFFSET_CAVEAT);
    expect(shown).toContain('than any other gated shot');
    expect(shown).toContain(BREAKDOWN_NOTE);
    expect(shown).toContain(FINS_BAND_NOTE);
    for (const c of view.total.components) {
      expect(shown).toContain(c.name);
      expect(shown).toContain(c.label);
    }
    for (const i of view.total.inputs) {
      expect(shown).toContain(i.name);
      expect(shown).toContain(i.label);
    }
    target.remove();
  });
});
