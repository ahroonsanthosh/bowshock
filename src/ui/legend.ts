/**
 * The colour legend (docs/design/0012-interface.md section 3): the colour
 * scale of the field shown, with its name, units and range; for
 * schlieren, which has no numeric scale, what its brightness means.
 */

import { colormapTable, SCHLIEREN_DARK, SCHLIEREN_LIGHT, spectrumTable } from '../render/colormap';
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
    }
  /**
   * The glow view (docs/design/0017-rocketeer-interface.md section 6): the
   * Mach number's colour on the spectrum, and the density gradient's
   * brightness, base + (1 - base)(1 - exp(-contrast g)).
   */
  | {
      readonly kind: 'glow';
      readonly min: number;
      readonly max: number;
      readonly contrast: number;
      readonly base: number;
    }
  /** A colour field on the spectrum (the app's filled views). */
  | {
      readonly kind: 'spectrum';
      readonly title: string;
      readonly units?: string;
      readonly min: number;
      readonly max: number;
      readonly note?: string;
    };

/** The density gradients marked on the glow view's brightness bar. */
export const GLOW_TICKS = [0, 0.1, 0.3, 1] as const;

/** The glow's brightness, 0 to 1, of a density gradient g. */
export function glowBrightness(g: number, contrast: number, base: number): number {
  return base + (1 - base) * (1 - Math.exp(-contrast * g));
}

/** The colour map as a CSS gradient, left to right from low to high. */
export function colormapGradient(stops = 9, table = colormapTable(stops)): string {
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

/** The spectrum as a CSS gradient, left to right from low to high. */
export function spectrumGradient(stops = 29): string {
  return colormapGradient(stops, spectrumTable(stops));
}

export class Legend {
  readonly element: HTMLElement;
  private readonly title = h('span');
  private readonly units = h('span', { className: 'legend__units' });
  private readonly bar = h('div', { className: 'legend__bar', attrs: { 'aria-hidden': 'true' } });
  private readonly low = h('span');
  private readonly high = h('span');
  private readonly note = h('p', { className: 'legend__note' });
  /** The glow view's second channel: the brightness. */
  private readonly brightness = h('div', { className: 'legend__channel', attrs: { hidden: true } });
  private kind: LegendScale['kind'] | null = null;

  constructor() {
    this.element = h(
      'div',
      { className: 'legend', attrs: { role: 'group', 'aria-label': 'Colour scale', hidden: true } },
      h('div', { className: 'legend__title' }, this.title, this.units),
      this.bar,
      h('div', { className: 'legend__scale' }, this.low, this.high),
      this.brightness,
      this.note,
    );
  }

  /** The glow view's brightness channel: black (uniform flow) to white, with gradients marked. */
  private showBrightness(contrast: number, base: number): void {
    const stops = Array.from({ length: 17 }, (_, k) => {
      const g = (k / 16) * 1.2;
      const t = 1 - Math.exp(-contrast * g);
      const v = Math.round(255 * glowBrightness(g, contrast, base));
      return `rgb(${v} ${v} ${v}) ${(100 * t).toFixed(1)}%`;
    });
    const ticks = GLOW_TICKS.map((g) =>
      h('span', {
        className: 'legend__tick',
        text: g === 1 ? '1+' : String(g),
        attrs: { style: `left: ${(100 * (1 - Math.exp(-contrast * g))).toFixed(1)}%` },
      }),
    );
    this.brightness.replaceChildren(
      h(
        'div',
        { className: 'legend__title' },
        h('span', { text: 'Brightness: density gradient' }),
        h('span', { className: 'legend__units', text: '|∇ρ| r / ρ∞' }),
      ),
      h('div', {
        className: 'legend__bar',
        attrs: {
          'aria-hidden': 'true',
          style: `background: linear-gradient(to right, ${stops.join(', ')})`,
        },
      }),
      h('div', { className: 'legend__ticks' }, ...ticks),
    );
    this.brightness.hidden = false;
  }

  show(scale: LegendScale): void {
    if (this.kind !== scale.kind) {
      this.bar.style.background =
        scale.kind === 'colormap'
          ? colormapGradient()
          : scale.kind === 'glow' || scale.kind === 'spectrum'
            ? spectrumGradient()
            : schlierenGradient();
      this.kind = scale.kind;
      this.brightness.hidden = true;
    }
    if (scale.kind === 'glow') {
      setText(this.title, 'Colour: Mach number');
      setText(this.units, '');
      setText(this.low, formatScaleValue(scale.min));
      setText(this.high, formatScaleValue(scale.max));
      setText(this.note, 'Black: uniform flow. Hatched: behind the base, not simulated.');
      this.showBrightness(scale.contrast, scale.base);
      this.element.hidden = false;
      return;
    }
    setText(this.title, scale.title);
    setText(this.note, scale.note ?? '');
    if (scale.kind === 'colormap' || scale.kind === 'spectrum') {
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
