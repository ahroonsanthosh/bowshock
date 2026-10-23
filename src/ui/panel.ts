/**
 * The side panels and, on phones, the bottom sheet that holds them as tabs
 * (docs/design/0012-interface.md section 3). A panel is written in the
 * page's HTML as `<aside class="panel panel--left" data-title="Rocket">`
 * around a `.panel__body`, so its controls exist before any script runs;
 * Panel adds the header that collapses it. Below 700 px wide the same
 * elements become the sheet's tab panels, so no control is duplicated and
 * nothing moves in the document.
 */

import { h, icon } from './dom';

/** The width below which the phone layout applies; matches style.css. */
export const PHONE_QUERY = '(max-width: 699.98px)';

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage refused (private mode, or disabled): the state is simply not kept.
  }
}

export class Panel {
  readonly element: HTMLElement;
  readonly body: HTMLElement;
  readonly header: HTMLButtonElement;
  readonly title: string;
  /** The label of the panel's tab on phones. */
  readonly tab: string;
  private readonly listeners: (() => void)[] = [];
  private readonly storageKey: string;

  /** Enhance a panel written in the page. */
  constructor(element: HTMLElement) {
    if (element.id === '') throw new Error('a panel needs an id');
    const body = element.querySelector<HTMLElement>(':scope > .panel__body');
    if (body === null) throw new Error(`panel #${element.id} has no .panel__body`);
    this.element = element;
    this.body = body;
    this.title = element.dataset.title ?? '';
    this.tab = element.dataset.tab ?? this.title;
    if (body.id === '') body.id = `${element.id}-body`;
    this.header = h(
      'button',
      {
        className: 'panel__header',
        attrs: { type: 'button', 'aria-expanded': 'true', 'aria-controls': body.id },
      },
      h('span', { text: this.title }),
      icon('chevron'),
    );
    element.prepend(this.header);
    element.setAttribute('aria-label', this.title);
    this.header.addEventListener('click', () => {
      this.setCollapsed(!this.collapsed);
    });
    this.storageKey = `bowshock:${location.pathname}:${element.id}:collapsed`;
    const stored = readStored(this.storageKey);
    if (stored !== null) this.setCollapsed(stored === 'true', false);
  }

  get collapsed(): boolean {
    return this.header.getAttribute('aria-expanded') === 'false';
  }

  setCollapsed(collapsed: boolean, remember = true): void {
    this.header.setAttribute('aria-expanded', String(!collapsed));
    this.body.hidden = collapsed;
    if (remember) writeStored(this.storageKey, String(collapsed));
    for (const listener of this.listeners) listener();
  }

  /** Called whenever the panel opens or closes. */
  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }
}

/**
 * The phone layout's bottom sheet: a pinned line (the result that must stay
 * in view) above a tab for each panel. On wider screens it is hidden and
 * the panels are side panels again.
 */
export class Sheet {
  readonly element: HTMLElement;
  /**
   * The line kept in view above the tabs. Not a live region: it changes
   * with every check of a run; pages announce outcomes (Shell.announce).
   */
  readonly pinned: HTMLElement;
  /** Short notes kept in view under the pinned line (what the picture and the marks mean); empty on most pages. */
  readonly note: HTMLElement;
  private readonly tablist: HTMLElement;
  private readonly tabs: HTMLButtonElement[];
  private active = 0;
  private readonly phone: MediaQueryList;
  private readonly listeners: (() => void)[] = [];

  constructor(private readonly panels: readonly Panel[]) {
    this.pinned = h('div', { className: 'pinned' });
    this.note = h('div', { className: 'sheet__note' });
    this.tabs = panels.map((panel, k) => {
      const tab = h('button', {
        className: 'sheet__tab',
        text: panel.tab,
        attrs: {
          type: 'button',
          role: 'tab',
          id: `${panel.element.id}-tab`,
          'aria-controls': panel.element.id,
        },
      });
      tab.addEventListener('click', () => {
        this.select(k);
      });
      tab.addEventListener('keydown', (event) => {
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (step === 0) return;
        event.preventDefault();
        const next = (k + step + panels.length) % panels.length;
        this.select(next);
        this.tabs[next]?.focus();
      });
      return tab;
    });
    this.tablist = h(
      'div',
      { className: 'sheet__tabs', attrs: { role: 'tablist', 'aria-label': 'Panels' } },
      ...this.tabs,
    );
    this.element = h(
      'section',
      { className: 'sheet', attrs: { 'aria-label': 'Panels' } },
      this.pinned,
      this.note,
      this.tablist,
    );
    this.phone = window.matchMedia(PHONE_QUERY);
    this.phone.addEventListener('change', () => {
      this.apply();
    });
    // The panels start below the pinned line and the tabs, whose height
    // changes with the pinned line's text.
    const head = new ResizeObserver(() => {
      const height = this.pinned.offsetHeight + this.note.offsetHeight + this.tablist.offsetHeight;
      document.documentElement.style.setProperty('--sheet-head', `${height}px`);
    });
    head.observe(this.pinned);
    head.observe(this.note);
    head.observe(this.tablist);
    this.apply();
  }

  /** Whether the phone layout applies now. */
  get isPhone(): boolean {
    return this.phone.matches;
  }

  select(index: number): void {
    this.active = index;
    this.apply();
  }

  /** Called when the layout changes between phone and wider screens. */
  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  private apply(): void {
    const phone = this.phone.matches;
    this.panels.forEach((panel, k) => {
      const tab = this.tabs[k]!;
      const selected = k === this.active;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (phone) {
        panel.element.setAttribute('role', 'tabpanel');
        panel.element.setAttribute('aria-labelledby', tab.id);
        panel.element.removeAttribute('aria-label');
        panel.element.toggleAttribute('data-tab-hidden', !selected);
      } else {
        panel.element.removeAttribute('role');
        panel.element.removeAttribute('aria-labelledby');
        panel.element.setAttribute('aria-label', panel.title);
        panel.element.removeAttribute('data-tab-hidden');
      }
    });
    for (const listener of this.listeners) listener();
  }
}
