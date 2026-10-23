/**
 * The layout of the total drag on the drag page (docs/design/0012-interface.md
 * section 3, the Drag panel): around the blocks the logic returned
 * (./total-drag-display.ts, laid out by ./total-drag-render.ts, every
 * string final), a status badge, the components as bars with their bands,
 * and the details folded under a button. Nothing here writes a number, a
 * label or a claim: the badge's word is the logic's (the view's kind, or
 * its claim's), its colour help's rule (green and amber as the logic's
 * own tone, red where no number is given), and the bars draw the
 * components' values and bands with the names the logic gives them.
 */

import { h } from '../ui/dom';
import type { TotalDragView } from './total-drag';

export interface TotalLayout {
  /** Where the logic's blocks were rendered. */
  readonly output: HTMLElement;
  readonly badge: HTMLElement;
  readonly bars: HTMLElement;
  /** Shows or folds the details (the blocks after the result and its claim). */
  readonly details: HTMLButtonElement;
}

/** Whether the details are unfolded (kept across updates). */
let unfolded = false;
const toggles = new WeakSet<HTMLButtonElement>();

function fold(layout: TotalLayout, foldable: boolean): void {
  const brief = foldable && !unfolded;
  layout.output.classList.toggle('total--brief', brief);
  layout.details.hidden = !foldable;
  layout.details.setAttribute('aria-expanded', String(foldable && unfolded));
}

/** The word a status badge shows: the logic's own (a kind), capitalised. */
const word = (kind: string) => kind.charAt(0).toUpperCase() + kind.slice(1);

/**
 * Lays out the total around the logic's blocks, already rendered into
 * `layout.output`, for the view they came from (null: the computation
 * failed). Returns whether a total (a number) is shown, and the result's
 * text, to be said to screen readers.
 */
export function presentTotal(
  view: TotalDragView | null,
  layout: TotalLayout,
): { total: boolean; said: string } {
  if (!toggles.has(layout.details)) {
    toggles.add(layout.details);
    layout.details.addEventListener('click', () => {
      unfolded = !unfolded;
      fold(layout, true);
    });
  }
  const headline = layout.output.querySelector<HTMLElement>('p.result');
  const said = headline?.textContent ?? '';
  // No number given (refused, or not computed): red, as help says.
  const noNumber = view === null || view.kind === 'refused';
  if (noNumber) {
    for (const el of layout.output.querySelectorAll('.warn')) el.classList.replace('warn', 'bad');
  }
  const status: { text: string; kind: string } =
    view === null
      ? { text: 'Not computed', kind: 'bad' }
      : view.kind === 'refused'
        ? { text: word(view.kind), kind: 'bad' }
        : view.kind === 'pending'
          ? { text: word(view.kind), kind: '' }
          : {
              text: word(view.claim.kind),
              kind: headline?.classList.contains('ok') === true ? 'ok' : 'warn',
            };
  layout.badge.textContent = status.text;
  layout.badge.className = `badge${status.kind === '' ? '' : ` badge--${status.kind}`}`;

  if (view === null || view.kind !== 'total') {
    layout.bars.hidden = true;
    layout.bars.replaceChildren();
    fold(layout, false);
    return { total: false, said };
  }
  // The result and its claim stay in view; the rest folds under Details.
  for (const child of layout.output.children) {
    const kept = child === headline || child.classList.contains('claim');
    child.toggleAttribute('data-detail', !kept);
  }
  fold(layout, true);
  // The components as bars: each its value, and its band as a lighter span.
  const components = view.total.components;
  const top = Math.max(...components.map((c) => c.high), 1e-12);
  const percent = (x: number) => `${((100 * Math.max(0, x)) / top).toFixed(2)}%`;
  layout.bars.replaceChildren(
    ...components.map((c) => {
      const band = h('span', { className: 'bar__band' });
      band.style.left = percent(c.low);
      band.style.width = percent(c.high - c.low);
      const value = h('span', { className: 'bar__value' });
      value.style.width = percent(c.cd);
      return h(
        'div',
        { className: 'bar' },
        h('span', { className: 'bar__name', text: c.name }),
        h('span', { className: 'bar__track' }, value, band),
      );
    }),
  );
  layout.bars.hidden = false;
  return { total: true, said };
}
