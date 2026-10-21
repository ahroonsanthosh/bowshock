/**
 * The total-drag section's blocks (./total-drag-display.ts) as DOM, for
 * demos/nose-drag.html: layout only, every string already final. Text
 * only: nothing here is parsed as HTML.
 */

import type { DisplayBlock, Tone } from './total-drag-display';

const TONE_CLASS: Record<Tone, string> = { plain: '', warn: 'warn', muted: 'scope' };

function el(tag: string, text = '', className = ''): HTMLElement {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className !== '') node.className = className;
  return node;
}

function blockElement(block: DisplayBlock): HTMLElement {
  switch (block.kind) {
    case 'paragraph':
      return el(
        'p',
        block.text,
        [TONE_CLASS[block.tone], block.headline ? 'result' : ''].filter((c) => c !== '').join(' '),
      );
    case 'list': {
      const ul = document.createElement('ul');
      for (const item of block.items) ul.append(el('li', item));
      return ul;
    }
    case 'table': {
      const t = document.createElement('table');
      t.append(el('caption', block.caption));
      const head = t.createTHead().insertRow();
      for (const text of block.head) head.append(el('th', text));
      const body = t.createTBody();
      for (const row of block.rows) {
        const r = body.insertRow();
        row.forEach((text, k) => {
          const cell = r.insertCell();
          cell.textContent = text;
          if (block.numeric.includes(k)) cell.className = 'num';
        });
      }
      const wrap = el('div', '', 'table-wrap');
      wrap.append(t);
      return wrap;
    }
    case 'box': {
      const box = el('div', '', `claim claim-${block.tone}`);
      box.append(...block.blocks.map(blockElement));
      return box;
    }
  }
}

/** Lays the blocks out in `target`, replacing what was there. */
export function renderBlocks(target: HTMLElement, blocks: readonly DisplayBlock[]): void {
  target.replaceChildren(...blocks.map(blockElement));
}
