/**
 * The shell of a full-window page (docs/design/0012-interface.md section
 * 3): the top bar with the site's menus and the page's View menu, the
 * side panels (the page's own `<aside class="panel">` elements) and the
 * phone's bottom sheet, the bottom row for the legend and the mode bar,
 * help, toasts, and the page's keys. The page draws into its `.viewport`
 * and asks the shell which part of it is not covered (`insets`).
 */

import { h } from './dom';
import { Help, HELP_BINDING, type HelpSection } from './help';
import { KeyMap, type KeyBinding } from './keymap';
import { Panel, Sheet } from './panel';
import { siteMenus, type MenuGroup, type MenuItem, type PageId } from './site';
import { Toasts } from './toast';
import { TopBar } from './topbar';

/** A rectangle in CSS pixels from the viewport's top left corner. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Of the rectangles a drawing could take, the one in which a drawing of
 * this aspect ratio (width over height) is largest.
 */
export function largestFit(candidates: readonly Rect[], aspect: number): Rect {
  let best = candidates[0]!;
  let bestScale = -Infinity;
  for (const rect of candidates) {
    const scale = Math.min(rect.width / aspect, rect.height);
    if (rect.width > 0 && rect.height > 0 && scale > bestScale) {
      best = rect;
      bestScale = scale;
    }
  }
  return best;
}

export interface ShellOptions<A extends string> {
  /** The site's root from this page ('' or '../'). */
  readonly root: string;
  readonly page: PageId;
  readonly title: string;
  /** The page's View menu (none if empty). */
  readonly view?: readonly MenuItem[];
  readonly bindings: readonly KeyBinding<A>[];
  readonly onAction: (action: A) => void;
  readonly help: { readonly title?: string; readonly sections: readonly HelpSection[] };
}

/** Space kept between the drawing and what floats over it, in CSS pixels. */
const MARGIN = 16;

export class Shell<A extends string> {
  readonly topBar: TopBar;
  readonly help: Help;
  readonly toasts = new Toasts();
  readonly keys: KeyMap<A | 'help'>;
  readonly panels: Panel[];
  readonly sheet: Sheet;
  /** The bottom row: legend on the left, mode bar on the right. */
  readonly bottom: HTMLElement;
  readonly viewport: HTMLElement;
  private readonly layoutListeners: (() => void)[] = [];
  /** Where outcomes are said to screen readers, once each. */
  private readonly announcer = h('div', {
    className: 'visually-hidden',
    attrs: { role: 'status' },
  });

  constructor(options: ShellOptions<A>) {
    const viewport = document.querySelector<HTMLElement>('.viewport');
    if (viewport === null) throw new Error('the page has no .viewport');
    this.viewport = viewport;
    const bindings = [...options.bindings, HELP_BINDING];
    this.help = new Help({
      title: options.help.title ?? 'Keys and help',
      bindings,
      sections: options.help.sections,
    });
    const menus: MenuGroup[] = siteMenus(options.root, options.page);
    if (options.view !== undefined && options.view.length > 0) {
      menus.splice(1, 0, { id: 'view', label: 'View', items: options.view });
    }
    this.topBar = new TopBar({
      root: options.root,
      title: options.title,
      menus,
      onHelp: () => {
        this.help.open();
      },
      dialogOpen: () => this.help.isOpen,
    });
    this.keys = new KeyMap<A | 'help'>(
      bindings,
      (action) => {
        if (action === 'help') this.help.toggle();
        else options.onAction(action);
        this.topBar.refresh();
      },
      () => this.help.isOpen,
    );
    this.keys.attach();

    this.panels = Array.from(document.querySelectorAll<HTMLElement>('aside.panel'), (el) => {
      const panel = new Panel(el);
      panel.onChange(() => {
        this.layoutChanged();
      });
      return panel;
    });
    this.sheet = new Sheet(this.panels);
    this.sheet.onChange(() => {
      this.layoutChanged();
    });
    this.bottom = h('section', {
      className: 'hud-bottom',
      attrs: { 'aria-label': 'Colour scale and view' },
    });

    // Reading and focus order: the top bar, the view with its readout, the
    // bottom row, then the panels (on phones: the sheet's tabs, then the
    // panel shown).
    const main = viewport.closest('main');
    if (main === null) throw new Error('the .viewport must be inside <main>');
    document.body.prepend(this.topBar.element);
    main.after(this.bottom);
    this.bottom.after(this.sheet.element);
    main.append(this.toasts.element, this.announcer);
    document.body.append(this.help.element);

    // The view, and what floats over it: a panel growing (a table of
    // results filling in) changes the room a drawing has.
    const resized = new ResizeObserver(() => {
      this.layoutChanged();
    });
    for (const el of [this.viewport, this.bottom, ...this.panels.map((p) => p.element)]) {
      resized.observe(el);
    }
  }

  /** The panel with this id. */
  panel(id: string): Panel {
    const panel = this.panels.find((p) => p.element.id === id);
    if (panel === undefined) throw new Error(`no panel #${id}`);
    return panel;
  }

  /**
   * Say an outcome (a result and its status, a failure) to screen readers.
   * The readout and the pinned line change with every check of a run and
   * are not live regions: pages announce what a run ends with.
   */
  announce(text: string): void {
    // Emptied first, so that the same words said twice are said again.
    this.announcer.textContent = '';
    window.setTimeout(() => {
      this.announcer.textContent = text;
    }, 50);
  }

  /** Called when the part of the viewport left uncovered may have changed. */
  onLayout(listener: () => void): void {
    this.layoutListeners.push(listener);
  }

  /**
   * The whole view below the top bar (and, if asked, above the bottom
   * row), in CSS pixels from the viewport's corner: where a flow is
   * fitted, full window, with the panels and the readout floating over it.
   */
  viewRect(aboveBottomRow = false): Rect {
    const box = this.viewport.getBoundingClientRect();
    const top = Math.max(0, this.topBar.element.getBoundingClientRect().bottom - box.top);
    let bottom = box.height;
    if (aboveBottomRow && this.bottom.offsetHeight > 0) {
      bottom = Math.min(bottom, this.bottom.getBoundingClientRect().top - box.top - MARGIN);
    }
    return { x: 0, y: top, width: box.width, height: Math.max(0, bottom - top) };
  }

  /**
   * Where a drawing of this aspect ratio (width over height) is largest
   * without going under the top bar, the readout, an open panel or the
   * bottom row: between the side panels, or below one or both of them,
   * whichever leaves it larger. In CSS pixels from the viewport's corner.
   */
  drawingRect(aspect: number): Rect {
    const box = this.viewport.getBoundingClientRect();
    let top = this.topBar.element.getBoundingClientRect().bottom - box.top;
    const readout = document.querySelector<HTMLElement>('.readout');
    if (readout !== null && readout.offsetHeight > 0) {
      top = Math.max(top, readout.getBoundingClientRect().bottom - box.top);
    }
    let bottom = box.height;
    if (this.bottom.offsetHeight > 0) {
      bottom = Math.min(bottom, this.bottom.getBoundingClientRect().top - box.top);
    }
    // The open side panels: how far in each reaches, and how far down.
    let left = 0;
    let leftBottom = 0;
    let right = box.width;
    let rightBottom = 0;
    if (!this.sheet.isPhone) {
      for (const panel of this.panels) {
        // A collapsed panel keeps only its header; a hidden one has no box.
        if (panel.collapsed || panel.element.getClientRects().length === 0) continue;
        const r = panel.element.getBoundingClientRect();
        if (panel.element.classList.contains('panel--left')) {
          left = Math.max(left, r.right - box.left);
          leftBottom = Math.max(leftBottom, r.bottom - box.top);
        } else {
          right = Math.min(right, r.left - box.left);
          rightBottom = Math.max(rightBottom, r.bottom - box.top);
        }
      }
    }
    const rect = (x0: number, y0: number, x1: number, y1: number): Rect => ({
      x: x0 + MARGIN,
      y: y0 + MARGIN,
      width: Math.max(0, x1 - x0 - 2 * MARGIN),
      height: Math.max(0, y1 - y0 - 2 * MARGIN),
    });
    return largestFit(
      [
        rect(left, top, right, bottom),
        rect(0, Math.max(top, leftBottom, rightBottom), box.width, bottom),
        rect(0, Math.max(top, leftBottom), right, bottom),
        rect(left, Math.max(top, rightBottom), box.width, bottom),
      ],
      aspect,
    );
  }

  private layoutChanged(): void {
    for (const listener of this.layoutListeners) listener();
  }
}
