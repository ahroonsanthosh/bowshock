/**
 * The readout (docs/design/0012-interface.md section 3): live statistics
 * in a monospace face with tabular numerals, top left over the view. Its
 * items are declared once, so the layout never jumps as values change;
 * an item without a value is left out.
 */

import { h } from './dom';

export interface ReadoutItem {
  readonly id: string;
  /** Written before the value in the muted colour ('M', 'grid', 'step'); none for a bare value. */
  readonly label?: string;
}

export type ReadoutKind = 'ok' | 'warn' | 'bad' | '';

export class Readout {
  readonly element: HTMLElement;
  private readonly values = new Map<string, { item: HTMLElement; value: HTMLElement }>();

  /** Lines of items, in reading order. */
  constructor(lines: readonly (readonly ReadoutItem[])[], label = 'Live statistics') {
    this.element = h('div', {
      className: 'readout',
      attrs: { role: 'group', 'aria-label': label },
    });
    for (const line of lines) {
      const row = h('div', { className: 'readout__line' });
      for (const spec of line) {
        const value = h('span', { className: 'readout__value' });
        const item = h(
          'span',
          { className: 'readout__item', attrs: { hidden: true, 'data-id': spec.id } },
          spec.label === undefined
            ? null
            : h('span', { className: 'readout__label', text: spec.label }),
          value,
        );
        this.values.set(spec.id, { item, value });
        row.append(item);
      }
      this.element.append(row);
    }
  }

  /** Set an item's value; an empty string or null hides it. */
  set(id: string, text: string | null, kind: ReadoutKind = ''): void {
    const entry = this.values.get(id);
    if (entry === undefined) throw new Error(`no readout item ${id}`);
    const shown = text !== null && text !== '';
    entry.item.hidden = !shown;
    if (entry.value.textContent !== (text ?? '')) entry.value.textContent = text ?? '';
    if (kind === '') entry.value.removeAttribute('data-kind');
    else entry.value.setAttribute('data-kind', kind);
    entry.value.classList.toggle('readout__state', kind !== '');
  }

  /** The text of an item, for tests. */
  get(id: string): string {
    return this.values.get(id)?.value.textContent ?? '';
  }
}
