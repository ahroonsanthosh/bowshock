/**
 * The top bar (docs/design/0012-interface.md section 3): the name, the
 * menus, help and full screen. Each menu is a disclosure: a button that
 * shows a list of links or actions, closed by Esc, by a click elsewhere or
 * by moving focus out of it. On phones the menus fold into one.
 */

import { h, icon, logo } from './dom';
import { pagePath, type MenuGroup, type MenuItem } from './site';

export interface TopBarOptions {
  /** The site's root from this page ('' or '../'). */
  readonly root: string;
  /** The page's name, beside bowshock's. */
  readonly title?: string;
  /** The menus, in order. */
  readonly menus: readonly MenuGroup[];
  /** Opens the help overlay; without it there is no help button. */
  readonly onHelp?: () => void;
}

export class TopBar {
  readonly element: HTMLElement;
  private readonly menus: Menu[] = [];
  private fullscreenButton: HTMLButtonElement | null = null;

  constructor(options: TopBarOptions) {
    const brand = h(
      'a',
      { className: 'topbar__brand', attrs: { href: pagePath(options.root, 'home') } },
      logo(),
      'bowshock',
    );
    const title =
      options.title === undefined
        ? null
        : h('span', { className: 'topbar__page', text: options.title });
    const bar = h('nav', { className: 'topbar__menus', attrs: { 'aria-label': 'Main' } });
    for (const group of options.menus) {
      const menu = new Menu(group.label, [group], `menu-${group.id}`);
      this.menus.push(menu);
      bar.append(menu.element);
    }
    const compact = new Menu('Menu', options.menus, 'menu-all', true);
    compact.element.classList.add('topbar__compact', 'menu--end');
    this.menus.push(compact);

    const actions = h('div', { className: 'topbar__actions' });
    if (options.onHelp !== undefined) {
      const onHelp = options.onHelp;
      const help = h(
        'button',
        {
          className: 'icon-button',
          attrs: { type: 'button', 'aria-label': 'Help and keys (H)', title: 'Help and keys (H)' },
        },
        icon('help'),
      );
      help.addEventListener('click', () => {
        onHelp();
      });
      actions.append(help);
    }
    if (document.fullscreenEnabled) {
      const button = h('button', {
        className: 'icon-button',
        attrs: { type: 'button', 'aria-label': 'Full screen', title: 'Full screen' },
      });
      button.addEventListener('click', () => {
        void toggleFullscreen();
      });
      document.addEventListener('fullscreenchange', () => {
        this.updateFullscreen();
      });
      this.fullscreenButton = button;
      this.updateFullscreen();
      actions.append(button);
    }
    actions.append(compact.element);

    this.element = h(
      'header',
      { className: 'topbar' },
      brand,
      title,
      bar,
      h('div', { className: 'topbar__spacer' }),
      actions,
    );

    // A click outside any menu closes the open one.
    document.addEventListener('pointerdown', (event) => {
      for (const menu of this.menus) {
        if (!(event.target instanceof Node && menu.element.contains(event.target))) menu.close();
      }
    });
  }

  /** Close every menu; true if one was open. */
  closeMenus(): boolean {
    let closed = false;
    for (const menu of this.menus) closed = menu.close() || closed;
    return closed;
  }

  /** Refresh the menus' toggles (their pressed marks) after a change made elsewhere. */
  refresh(): void {
    for (const menu of this.menus) menu.refresh();
  }

  private updateFullscreen(): void {
    const button = this.fullscreenButton;
    if (button === null) return;
    const on = document.fullscreenElement !== null;
    button.replaceChildren(icon(on ? 'collapse' : 'expand'));
    const label = on ? 'Leave full screen' : 'Full screen';
    button.setAttribute('aria-label', label);
    button.title = label;
  }
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement !== null) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // Refused by the browser (no user gesture, or not allowed here): nothing to do.
  }
}

/** One disclosure menu. */
class Menu {
  readonly element: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly list: HTMLElement;
  private readonly toggles: { item: MenuItem; node: HTMLElement }[] = [];

  constructor(label: string, groups: readonly MenuGroup[], id: string, compact = false) {
    this.button = h(
      'button',
      {
        className: compact ? 'icon-button' : 'menu__button',
        attrs: {
          type: 'button',
          'aria-expanded': 'false',
          'aria-controls': id,
          'aria-label': compact ? 'Menu' : null,
        },
      },
      compact ? icon('menu') : label,
    );
    this.list = h('div', { className: 'menu__list', attrs: { id, hidden: true } });
    for (const group of groups) {
      if (compact || groups.length > 1) {
        this.list.append(h('div', { className: 'menu__heading', text: group.label }));
      }
      for (const item of group.items) this.list.append(this.itemNode(item));
    }
    this.element = h('div', { className: 'menu' }, this.button, this.list);

    this.button.addEventListener('click', () => {
      if (this.isOpen) this.close();
      else this.open();
    });
    this.button.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' && !this.isOpen) {
        event.preventDefault();
        this.open();
        this.focusItem(0);
      }
    });
    this.element.addEventListener('keydown', (event) => {
      if (!this.isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
        this.button.focus();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const items = this.items();
        const at = items.indexOf(document.activeElement as HTMLElement);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.focusItem((at + step + items.length) % items.length);
      }
    });
    this.element.addEventListener('focusout', (event) => {
      const next = event.relatedTarget;
      if (next instanceof Node && this.element.contains(next)) return;
      this.close();
    });
  }

  get isOpen(): boolean {
    return !this.list.hidden;
  }

  open(): void {
    this.refresh();
    this.list.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
  }

  /** Close; true if it was open. */
  close(): boolean {
    if (!this.isOpen) return false;
    this.list.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
    return true;
  }

  refresh(): void {
    for (const { item, node } of this.toggles) {
      node.setAttribute('aria-pressed', String(item.pressed?.() ?? false));
    }
  }

  private items(): HTMLElement[] {
    return Array.from(this.list.querySelectorAll<HTMLElement>('.menu__item'));
  }

  private focusItem(index: number): void {
    this.items()[index]?.focus();
  }

  private itemNode(item: MenuItem): HTMLElement {
    const text = h(
      'span',
      {},
      item.label,
      item.detail === undefined ? null : h('small', { text: item.detail }),
    );
    const key = item.key === undefined ? null : h('kbd', { text: item.key });
    const external = item.external === true ? icon('external') : null;
    if (item.href !== undefined) {
      const link = h(
        'a',
        {
          className: 'menu__item',
          attrs: {
            href: item.href,
            'aria-current': item.current === true ? 'page' : null,
            target: item.external === true ? '_blank' : null,
            rel: item.external === true ? 'noopener' : null,
          },
        },
        text,
        external,
        key,
      );
      link.addEventListener('click', () => this.close());
      return link;
    }
    const button = h(
      'button',
      {
        className: 'menu__item',
        attrs: {
          type: 'button',
          'aria-pressed': item.pressed === undefined ? null : String(item.pressed()),
        },
      },
      text,
      key,
    );
    if (item.pressed !== undefined) this.toggles.push({ item, node: button });
    button.addEventListener('click', () => {
      item.action?.();
      this.close();
      this.button.focus();
    });
    return button;
  }
}
