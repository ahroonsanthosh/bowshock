/**
 * The field mode bar (docs/design/0012-interface.md section 3): one button
 * per field with its key, the one shown pressed, and the view's toggles
 * (split view, grid lines, the shock line) with theirs. Every key has a
 * button here or in a panel, for touch and mouse users.
 */

import { h } from './dom';

export interface ModeOption<M extends string> {
  readonly id: M;
  readonly label: string;
  /** Its name for assistive technology, if the label is a symbol (ρ). */
  readonly name?: string;
  /** A longer name, shown as the button's tooltip ("Pressure coefficient"). */
  readonly hint?: string;
  readonly key: string;
}

export interface ToggleOption<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly name?: string;
  readonly key: string;
}

export interface ModeBarOptions<M extends string, T extends string> {
  readonly modes: readonly ModeOption<M>[];
  readonly toggles?: readonly ToggleOption<T>[];
  readonly onMode: (mode: M) => void;
  readonly onToggle?: (toggle: T) => void;
}

export class ModeBar<M extends string, T extends string = never> {
  readonly element: HTMLElement;
  private readonly modeButtons = new Map<M, HTMLButtonElement>();
  private readonly toggleButtons = new Map<T, HTMLButtonElement>();

  constructor(options: ModeBarOptions<M, T>) {
    const modes = h('div', {
      className: 'modebar__group',
      attrs: { role: 'group', 'aria-label': 'Field shown' },
    });
    for (const mode of options.modes) {
      const button = modeButton(mode.label, mode.key, mode.name, mode.hint);
      button.addEventListener('click', () => {
        options.onMode(mode.id);
      });
      this.modeButtons.set(mode.id, button);
      modes.append(button);
    }
    this.element = h('div', { className: 'modebar' }, modes);
    const toggles = options.toggles ?? [];
    if (toggles.length > 0) {
      const group = h('div', {
        className: 'modebar__group modebar__extra',
        attrs: { role: 'group', 'aria-label': 'View options' },
      });
      for (const toggle of toggles) {
        const button = modeButton(toggle.label, toggle.key, toggle.name);
        button.addEventListener('click', () => {
          options.onToggle?.(toggle.id);
        });
        this.toggleButtons.set(toggle.id, button);
        group.append(button);
      }
      this.element.append(
        h('div', {
          className: 'modebar__divider modebar__extra',
          attrs: { 'aria-hidden': 'true' },
        }),
        group,
      );
    }
  }

  /** Show `mode` as the one pressed. */
  setMode(mode: M): void {
    for (const [id, button] of this.modeButtons) {
      button.setAttribute('aria-pressed', String(id === mode));
    }
  }

  setToggle(toggle: T, on: boolean): void {
    this.toggleButtons.get(toggle)?.setAttribute('aria-pressed', String(on));
  }
}

function modeButton(label: string, key: string, name?: string, hint?: string): HTMLButtonElement {
  return h(
    'button',
    {
      className: 'mode-button',
      attrs: {
        type: 'button',
        'aria-pressed': 'false',
        'aria-keyshortcuts': key,
        'aria-label': name ?? null,
        title: `${hint ?? name ?? label} (${key})`,
      },
    },
    h('kbd', { text: key, attrs: { 'aria-hidden': 'true' } }),
    label,
  );
}
