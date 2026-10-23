/**
 * The app (index.html) in the browser, its numbers against the logic's
 * (docs/design/0017-rocketeer-interface.md section 12): the Basic
 * Finner's points the logic refuses before any solve, each with the
 * logic's own reason in its plain words, in the table and the point
 * block; and the first point's provisional C_D after its first grid, the
 * logic's total with that grid's nose (the solve to a band takes hours on
 * software WebGPU, so the finished numbers are checked in
 * tests/app/numbers.test.ts). Also: the 3D view as the main canvas (or
 * the side view where it cannot be set up), the side view by V, and the
 * truth notes in view.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { provisionalTotal } from '../../src/app/curve';
import { pointView } from '../../src/app/point-view';
import { refusalWords } from '../../src/app/status-words';
import { totalDragView } from '../../src/app/total-drag';
import { designForm } from '../../src/rocket/adapter';
import { preset } from '../../src/rocket/presets';

async function until(test: () => boolean, what: string, ms = 60_000): Promise<void> {
  const start = performance.now();
  while (!test()) {
    if (performance.now() - start > ms) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

let frame: HTMLIFrameElement;
let doc: Document;
const text = (selector: string) => doc.querySelector(selector)?.textContent ?? '';
const design = preset('basic-finner').design;

beforeAll(async () => {
  frame = document.createElement('iframe');
  frame.style.width = '1440px';
  frame.style.height = '900px';
  frame.src = '/index.html';
  const loaded = new Promise((resolve) => {
    frame.addEventListener('load', resolve, { once: true });
  });
  document.body.append(frame);
  await loaded;
  doc = frame.contentDocument!;
  await until(() => doc.querySelector('.curve-table, .chart') !== null, 'the curve', 120_000);
}, 180_000);

afterAll(() => {
  frame.remove();
});

describe('the app page', () => {
  it("shows the logic's refusals before any solve, in its plain words", async () => {
    (doc.querySelector('#table-toggle') as HTMLButtonElement).click();
    await until(() => doc.querySelectorAll('.curve-table tbody tr').length === 11, 'the table');
    const rows = Array.from(doc.querySelectorAll('.curve-table tbody tr'), (tr) =>
      Array.from(tr.querySelectorAll('td'), (td) => td.textContent),
    );
    for (const [k, mach] of [1, 1.2, 1.4, 1.6].entries()) {
      const asked = designForm(design, mach, { without: false });
      if (asked.kind !== 'form') throw new Error(asked.kind);
      const view = totalDragView(asked.form, { kind: 'pending' });
      expect(view.kind, `Mach ${mach}`).toBe('refused');
      if (view.kind !== 'refused') continue;
      expect(rows[k]!.slice(0, 3)).toEqual([mach.toFixed(2), '', '', '']);
      expect(rows[k]![3]!.startsWith('No number')).toBe(true);
      // The table row and the point block of that point: every refusal's plain reason.
      (doc.querySelectorAll('.curve-table__mach')[k] as HTMLButtonElement).click();
      await until(() => text('.point__mach') === `Mach ${mach.toFixed(2)}`, `Mach ${mach}`);
      const block = `${text('.point__sentence')} ${text('.point__reasons')}`;
      for (const r of view.refusals) {
        const plain = refusalWords(r);
        expect(rows[k]![3]).toContain(plain.reason);
        expect(block).toContain(plain.reason);
      }
    }
  });

  it('shows the 3D view, or the side view where it cannot be set up, with the truth notes', async () => {
    const flow3d = doc.querySelector('#flow3d') as HTMLCanvasElement;
    const flow = doc.querySelector('#flow') as HTMLCanvasElement;
    // The 3D view loads on its own once the GPU is up; this test's frame cannot load modules
    // on demand (the test runner's), so here the side view, its fallback, may show instead.
    await until(
      () => !flow3d.hidden || /side view shows the airflow/i.test(text('.toasts')),
      'a view of the airflow',
      120_000,
    );
    const shown3d = !flow3d.hidden;
    expect(flow.hidden).toBe(shown3d);
    expect(text('#flow-note')).toContain('Hatched: behind the base, not simulated.');
    expect(text('#flow-note')).toContain('their drag computed separately');
    // The phone's first screen (the sheet under the pinned line): what the picture is, and a cross.
    expect(text('.sheet__note')).toMatch(/The axisymmetric solution.*fins are not in the airflow/);
    expect(text('.sheet__note')).toContain('Hatched: behind the base, not simulated.');
    expect(text('.sheet__note')).toContain('No number: the drag there cannot be given');
    if (!shown3d) {
      // The fallback: the side view and its field mode bar; no 3D | Side switch; and the
      // airflow's note keeps saying which step failed (0017 section 6.5).
      expect((doc.querySelector('.flow-switch') as HTMLElement).hidden).toBe(true);
      expect(text('#flow-note')).toMatch(
        /The 3D view could not be set up: (its code could not be fetched|the GPU did not set it up)/,
      );
      return;
    }
    const win = frame.contentWindow as Window & typeof globalThis;
    win.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'v', bubbles: true }));
    await until(() => !flow.hidden, 'the side view');
    expect(flow3d.hidden).toBe(true);
    win.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'v', bubbles: true }));
    await until(() => !flow3d.hidden, 'the 3D view again');
  }, 180_000);

  it("shows the first point's provisional C_D: the logic's total with that grid's nose", async () => {
    // The first point solved: the first of the order (the ends, then the middles) not refused.
    await until(
      () =>
        text('.readout [data-id="cd"] .readout__value') !== '' &&
        text('.point__band') === ' no band yet',
      'the first grid',
      900_000,
    );
    const mach = Number(text('.readout [data-id="mach"] .readout__value'));
    const drag = Number(text('.readout [data-id="cd"] .readout__value'));
    const asked = designForm(design, mach, { without: false });
    if (asked.kind !== 'form') throw new Error(asked.kind);
    const expected = provisionalTotal(asked.form, drag, 1);
    expect(expected).not.toBeNull();
    // "C" with "D" below it, then the value.
    const shown = Number(text('.point__cd').replace('CD', '').trim());
    // The readout gives the grid's nose term to five decimals; the point shows three.
    expect(Math.abs(shown - expected!)).toBeLessThanOrEqual(0.0005 + 1e-5);
    expect(
      pointView(
        {
          mach,
          nose: null,
          seconds: 0,
          cellUpdates: 0,
          state: { kind: 'solving', grid: 1, grids: 4, provisional: expected },
        },
        true,
      ).status.word,
    ).toBe('Provisional');
  }, 1_000_000);
});
