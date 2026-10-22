/**
 * The colour legend (docs/design/0012-interface.md section 3): the colour
 * scale of the field shown, with its name, units and range; for
 * schlieren, which has no numeric scale, what its brightness means.
 */

import { colormapTable, SCHLIEREN_DARK, SCHLIEREN_LIGHT } from '../render/colormap';
import { h } from './dom';
import { formatScaleValue } from './format';

export type LegendScale =
  | {
      readonly kind: 'colormap';
      readonly title: string;
      readonly units?: string;
      readonly min: number;
      readonly max: number;
      readonly note?: string;
    }
  | {
      readonly kind: 'schlieren';
      readonly title: string;
      readonly note?: string;
    };

/** The colour map as a CSS gradient, left to right from low to high. */
export function colormapGradient(stops = 9): string {
  const table = colormapTable(stops);
  const colours = Array.from({ length: stops }, (_, k) => {
    const [r, g, b] = [0, 1, 2].map((c) => Math.round(255 * table[4 * k + c]!));
    return `rgb(${r} ${g} ${b}) ${((100 * k) / (stops - 1)).toFixed(1)}%`;
  });
  return `linear-gradient(to right, ${colours.join(', ')})`;
}

/** Schlieren's grey scale as drawn, light on dark: uniform flow dark, steep gradients light. */
export function schlierenGradient(): string {
  return `linear-gradient(to right, ${SCHLIEREN_DARK}, ${SCHLIEREN_LIGHT})`;
}

export class Legend {
  readonly element: HTMLElement;
  private readonly title = h('span');
  private readonly units = h('span', { className: 'legend__units' });
  private readonly bar = h('div', { className: 'legend__bar', attrs: { 'aria-hidden': 'true' } });
  private readonly low = h('span');
  private readonly high = h('span');
  private readonly note = h('p', { className: 'legend__note' });
  private kind: LegendScale['kind'] | null = null;

  constructor() {
    this.element = h(
      'div',
      { className: 'legend', attrs: { role: 'group', 'aria-label': 'Colour scale', hidden: true } },
      h('div', { className: 'legend__title' }, this.title, this.units),
      this.bar,
      h('div', { className: 'legend__scale' }, this.low, this.high),
      this.note,
    );
  }

  show(scale: LegendScale): void {
    if (this.kind !== scale.kind) {
      this.bar.style.background =
        scale.kind === 'colormap' ? colormapGradient() : schlierenGradient();
      this.kind = scale.kind;
    }
    setText(this.title, scale.title);
    setText(this.note, scale.note ?? '');
    if (scale.kind === 'colormap') {
      setText(this.units, scale.units ?? '');
      setText(this.low, formatScaleValue(scale.min));
      setText(this.high, formatScaleValue(scale.max));
    } else {
      setText(this.units, '');
      setText(this.low, 'uniform');
      setText(this.high, 'steep');
    }
    this.element.hidden = false;
  }

  hide(): void {
    this.element.hidden = true;
  }
}

/** Set text only when it changes, so a legend updated every frame does not churn the page. */
function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}
