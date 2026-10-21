/**
 * Toasts: short messages that confirm an action ("PNG saved") or report a
 * change the user did not ask for ("the GPU was lost"), announced politely
 * to assistive technology and gone after a few seconds.
 */

import { h } from './dom';

export type ToastKind = 'info' | 'warn' | 'bad';

export class Toasts {
  readonly element: HTMLElement;

  constructor() {
    this.element = h('div', {
      className: 'toasts',
      attrs: { role: 'status', 'aria-live': 'polite' },
    });
  }

  show(message: string, kind: ToastKind = 'info', seconds = 3.5): void {
    const toast = h('div', { className: 'toast', text: message, attrs: { 'data-kind': kind } });
    this.element.append(toast);
    // Keep at most three on screen.
    while (this.element.children.length > 3) this.element.firstElementChild?.remove();
    window.setTimeout(() => {
      toast.setAttribute('data-leaving', '');
      window.setTimeout(() => {
        toast.remove();
      }, 200);
    }, seconds * 1000);
  }
}
