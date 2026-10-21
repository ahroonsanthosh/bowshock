/**
 * The help overlay (docs/design/0012-interface.md section 4): opened with
 * H or ?, it lists the page's keys (from its key map, so the two never
 * disagree) and explains the colour scale and the band. It is a modal
 * dialog: focus stays inside it, Esc (or H or ? again) closes it, and focus
 * returns to where it was.
 */

import { h, icon } from './dom';
import { bindingLabels, normalizeKey, type KeyBinding } from './keymap';
import { colormapGradient, schlierenGradient } from './legend';

/** The key that opens and closes help, on every page. */
export const HELP_BINDING: KeyBinding<'help'> = {
  keys: ['h', '?'],
  action: 'help',
  description: 'Show or hide this help',
};

export interface HelpSection {
  readonly title: string;
  readonly body: readonly (string | Node)[];
}

export interface HelpOptions {
  readonly title: string;
  readonly bindings: readonly KeyBinding[];
  /** Sections after the keys, in order. */
  readonly sections: readonly HelpSection[];
}

export class Help {
  readonly element: HTMLDialogElement;
  private returnFocus: HTMLElement | null = null;
  private readonly closeButton: HTMLButtonElement;

  constructor(options: HelpOptions) {
    this.closeButton = h(
      'button',
      { className: 'icon-button', attrs: { type: 'button', 'aria-label': 'Close help' } },
      icon('close'),
    );
    this.closeButton.addEventListener('click', () => {
      this.close();
    });
    const titleId = 'help-title';
    const keys = h('table', { className: 'help__keys' });
    const tbody = h('tbody');
    // A binding without a description is listed with another (the four arrows as one).
    for (const binding of options.bindings.filter((b) => b.description !== '')) {
      const labels = bindingLabels(binding);
      tbody.append(
        h(
          'tr',
          {},
          h('th', { attrs: { scope: 'row' } }, ...labels.map((label) => h('kbd', { text: label }))),
          h('td', { text: binding.description }),
        ),
      );
    }
    tbody.append(
      h(
        'tr',
        {},
        h('th', { attrs: { scope: 'row' } }, h('kbd', { text: 'Esc' })),
        h('td', { text: 'Close this help, or an open menu' }),
      ),
    );
    keys.append(
      h('caption', { className: 'visually-hidden', text: 'Keys and what they do' }),
      tbody,
    );
    // Focusable, so that its text scrolls by keyboard too.
    const body = h(
      'div',
      { className: 'help__body', attrs: { tabindex: '0', 'aria-label': 'Help text' } },
      h('section', { className: 'help__section' }, h('h3', { text: 'Keys' }), keys),
      ...options.sections.map((section) =>
        h(
          'section',
          { className: 'help__section' },
          h('h3', { text: section.title }),
          ...section.body.map((part) => (typeof part === 'string' ? h('p', { text: part }) : part)),
        ),
      ),
    );
    this.element = h(
      'dialog',
      { className: 'help', attrs: { 'aria-labelledby': titleId } },
      h(
        'div',
        { className: 'help__header' },
        h('h2', { text: options.title, attrs: { id: titleId } }),
        this.closeButton,
      ),
      body,
    );
    // Esc: the dialog's own cancel, with focus returned.
    this.element.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.close();
    });
    // A click on the backdrop (outside the dialog's box) closes it.
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.close();
    });
    this.element.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') this.trapFocus(event);
      else if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        HELP_BINDING.keys.includes(normalizeKey(event.key))
      ) {
        // The key that opened help closes it.
        event.preventDefault();
        this.close();
      }
    });
  }

  get isOpen(): boolean {
    return this.element.open;
  }

  open(): void {
    if (this.isOpen) return;
    this.returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.element.showModal();
    this.closeButton.focus();
  }

  close(): void {
    if (!this.isOpen) return;
    this.element.close();
    this.returnFocus?.focus();
    this.returnFocus = null;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  /** Keep Tab and Shift+Tab inside the dialog. */
  private trapFocus(event: KeyboardEvent): void {
    const focusable = Array.from(
      this.element.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first === undefined || last === undefined) return;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !this.element.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !this.element.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }
}

/** A scale bar with its two ends named, for a help section. */
function scale(background: string, low: string, high: string): Node[] {
  const bar = h('div', { className: 'help__scale', attrs: { 'aria-hidden': 'true' } });
  bar.style.background = background;
  return [
    bar,
    h(
      'div',
      { className: 'help__scale-labels', attrs: { 'aria-hidden': 'true' } },
      h('span', { text: low }),
      h('span', { text: high }),
    ),
  ];
}

/** What the colour map means. */
export function colourScaleSection(): HelpSection {
  return {
    title: 'The colour scale',
    body: [
      ...scale(colormapGradient(), 'lowest', 'highest'),
      'Fields are coloured with a perceptual colour map: equal steps in value look like equal steps in colour, from deep blue through teal and green to pale yellow. A rainbow would show edges where the field has none; here the only sharp lines are the flow’s own.',
      'The scale runs from the lowest to the highest value in the flow shown, and the legend gives both ends with their units.',
    ],
  };
}

/** What numerical schlieren shows. */
export function schlierenSection(): HelpSection {
  return {
    title: 'Schlieren',
    body: [
      ...scale(schlierenGradient(), 'uniform', 'steep'),
      'Numerical schlieren shows how fast the density changes, light on dark: uniform flow is dark, and the steeper the change, the brighter. Shocks are the brightest lines; expansions and compressions show fainter.',
    ],
  };
}

/** What a band and a status mean, the same on every page. */
export function bandSection(): HelpSection {
  return {
    title: 'The band and the status',
    body: [
      'bowshock shows no drag value without its band and its status. The wave drag’s band is measured from nested grids, each twice as fine as the one before, and includes an allowance of 7e-5 of the value for an error the grids cannot show; where no band can be measured, the value is marked not verified.',
      'The status is written in words as well as colour: green for a value verified (its band measured) or a run converged; amber for a value not verified, or a run stopped at its limit; red where there is no value (refused, not converged, or a failure of the GPU), with the reason. The total drag’s badge takes the colour of its own label, the claim beside it, and red where it is refused.',
    ],
  };
}
