/**
 * The total-drag section of the drag page as DOM: what
 * ./total-drag.ts's view says, with every band rounded outward
 * (./band.ts) and every label shown beside its number. Text only: nothing
 * here is parsed as HTML.
 */

import { outward, outwardPercent } from './band';
import {
  BAND_CAVEAT,
  BREAKDOWN_NOTE,
  CLASS_DESCRIPTION,
  NOT_REPRESENTED,
  OFFSET_CAVEAT,
  PUBLISHED_GATE,
  type TotalDragView,
} from './total-drag';

/** C_D is shown to four decimals, its bands rounded outward to the same. */
const DIGITS = 4;

function el(tag: string, text = '', className = ''): HTMLElement {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className !== '') node.className = className;
  return node;
}

function list(items: readonly string[]): HTMLElement {
  const ul = document.createElement('ul');
  for (const item of items) ul.append(el('li', item));
  return ul;
}

/** A table in a scrolling wrapper; the columns listed in `numbers` do not wrap. */
function table(
  caption: string,
  head: readonly string[],
  rows: readonly (readonly string[])[],
  numbers: readonly number[] = [],
): HTMLElement {
  const t = document.createElement('table');
  t.append(el('caption', caption));
  const h = t.createTHead().insertRow();
  for (const text of head) h.append(el('th', text));
  const body = t.createTBody();
  for (const row of rows) {
    const r = body.insertRow();
    row.forEach((text, k) => {
      const cell = r.insertCell();
      cell.textContent = text;
      if (numbers.includes(k)) cell.className = 'num';
    });
  }
  const wrap = el('div', '', 'table-wrap');
  wrap.append(t);
  return wrap;
}

const interval = (low: number, high: number) => outward(low, high, DIGITS).join(' to ');

/** Renders the view into `target`, replacing what was there. */
export function renderTotalDrag(target: HTMLElement, view: TotalDragView): void {
  const out: HTMLElement[] = [];
  switch (view.kind) {
    case 'refused':
      out.push(
        el('p', 'Total drag refused: no number is given. Every reason:', 'warn result'),
        list(view.refusals.map((r) => `${r.component} (${r.reason}): ${r.message}.`)),
      );
      break;
    case 'pending':
      out.push(
        el(
          'p',
          'No total yet: run the solve above for this nose, body and Mach number. The total ' +
            'takes its nose wave drag and band; the other components are computed here and none ' +
            'of them is refused.',
          'result',
        ),
        view.check.inside
          ? el(
              'p',
              'This case lies inside the class tested by the Basic Finner: the total will be ' +
                'labelled validated on it, with the tolerance and the offset at Mach 2.97 beside it.',
              'scope',
            )
          : el(
              'p',
              'This case lies outside the class tested by the Basic Finner, so the total will be ' +
                'an estimate, not validated:',
              'scope',
            ),
      );
      if (!view.check.inside) out.push(list(view.check.outside));
      break;
    case 'total': {
      const { total, claim } = view;
      const validated = claim.kind === 'validated';
      out.push(
        el(
          'p',
          `Total C_D = ${total.cd.toFixed(DIGITS)}, model-form band ${interval(total.low, total.high)} ` +
            `(${outwardPercent(total.low / total.cd - 1, total.high / total.cd - 1)})` +
            (validated ? '' : ': an estimate, not validated'),
          `result ${validated ? 'ok' : 'warn'}`,
        ),
      );
      const box = el('div', '', `claim ${claim.kind}`);
      box.append(el('p', claim.text));
      if (claim.kind === 'validated') {
        for (const c of claim.caveats) {
          box.append(el('p', c, c === OFFSET_CAVEAT && claim.nearMach3 ? 'warn' : ''));
        }
        if (claim.nearMach3) {
          box.append(
            el(
              'p',
              'This Mach number lies nearer those two shots, at Mach 2.97, than any other gated ' +
                'shot.',
              'warn',
            ),
          );
        }
      } else {
        box.append(el('p', 'Outside the class because:'), list(claim.reasons));
        box.append(
          el(
            'p',
            'Even inside the class the test is wide: its tolerance was -19.5% to -26.2% and ' +
              '+26.5% to +31.4% of the modelled total.',
          ),
        );
      }
      out.push(box, el('p', BAND_CAVEAT, 'scope'));
      out.push(
        table(
          "Input bands: each the change of the total between its input's ends, kept apart " +
            'from the model-form band',
          ['Input', 'Change of C_D', 'What it is'],
          total.inputs.map((i) => [
            i.name,
            i.low === 0 && i.high === 0 ? 'none' : interval(i.low, i.high),
            i.label,
          ]),
          [1],
        ),
        el(
          'p',
          `With every input band added linearly to the model-form band: ` +
            `${interval(view.withInputs[0], view.withInputs[1])}.`,
          'scope',
        ),
        table(
          "Components, on the body's cross-section",
          ['Component', 'C_D', 'Band', 'Share', 'What it is', 'Band from'],
          total.components.map((c) => [
            c.name,
            c.cd.toFixed(DIGITS),
            interval(c.low, c.high),
            `${Math.round((100 * c.cd) / total.cd)}%`,
            c.label,
            c.band,
          ]),
          [1, 2, 3],
        ),
      );
      out.push(el('p', BREAKDOWN_NOTE, 'scope'));
      if (view.notes.length > 0) out.push(list(view.notes));
      out.push(el('p', NOT_REPRESENTED, 'scope'));
      break;
    }
  }
  target.replaceChildren(...out);
}

/** The class in words and the published gate (0010 section 4.2), into `target`. */
export function renderGate(target: HTMLElement): void {
  const pct = (x: number) => `${x > 0 ? '+' : ''}${x.toFixed(1)}%`;
  target.replaceChildren(
    el('p', CLASS_DESCRIPTION, 'scope'),
    table(
      'The Basic Finner gate, second run, as published in design record 0010 section 4.2 ' +
        '(residual: measured CX0 over modelled, minus 1; values to the nearest last digit shown)',
      ['Shot', 'Mach', 'CX0 measured', 'Modelled C_D (band)', 'Residual', 'Tolerance'],
      PUBLISHED_GATE.map((s) => [
        s.shot,
        s.mach.toFixed(3),
        s.cx0.toFixed(3),
        `${s.cd.toFixed(4)} (${s.low.toFixed(4)} to ${s.high.toFixed(4)})`,
        pct(s.residual),
        `${pct(s.tolerance[0])} to ${pct(s.tolerance[1])}`,
      ]),
      [1, 2, 3, 4, 5],
    ),
    el(
      'p',
      'In the gate the nose was the exact Taylor-Maccoll value, and the inputs were a laminar ' +
        'run to Re_T 5e5, 1.6e6 and 3e6 and the wall from adiabatic to the air temperature; the ' +
        "tolerance adds those input bands and each Mach cluster's own shot-to-shot spread to the " +
        'model-form band. The five shots at Mach 1.06 to 1.33 are refused, as on this page.',
      'scope',
    ),
  );
}
