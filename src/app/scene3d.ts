/**
 * The 3D view as the page uses it (docs/design/0017-rocketeer-interface.md
 * section 6.1): src/render3d's FlowScene3D, loaded on its own (it is a
 * large part of the page, and only needed once the GPU is up), and its
 * colour scale in the page's own legend. The page owns the rocket, the
 * curve and the GPU device; it hands the scene the rocket in calibres
 * (src/rocket/scene-rocket.ts, the page's one geometry) and the live
 * fit's own GPU buffers.
 */

import type * as Render3D from '../render3d/index';
import type { SceneScale } from '../render3d/scene';
import { formatScaleValue } from '../ui/format';
import type { LegendScale } from '../ui/legend';

export type Render3DModule = typeof Render3D;

/** The 3D view's module, loaded when the page first needs it. */
export function loadRender3D(): Promise<Render3DModule> {
  return import('../render3d/index');
}

/** A CSS gradient of a scale's palette, left to right from low to high. */
export function paletteGradient(colour: SceneScale['colour'], stops = 17): string {
  const parts = Array.from({ length: stops }, (_, k) => {
    const [r, g, b] = colour(k / (stops - 1)).map((c) => Math.round(255 * c));
    return `rgb(${r} ${g} ${b}) ${((100 * k) / (stops - 1)).toFixed(1)}%`;
  });
  return `linear-gradient(to right, ${parts.join(', ')})`;
}

/**
 * The shells' values in a few words: a few listed; many (20 to 40, evenly
 * spaced) as their count, spacing and ends.
 */
export function shellsNote(levels: readonly number[]): string {
  if (levels.length === 0) return '';
  if (levels.length <= 6) return `Shells at ${levels.map(formatScaleValue).join(', ')}.`;
  const step = levels[1]! - levels[0]!;
  return (
    `${levels.length} shells, every ${Number(step.toPrecision(2))} ` +
    `from ${formatScaleValue(levels[0]!)} to ${formatScaleValue(levels[levels.length - 1]!)}.`
  );
}

/**
 * What the 3D view's other layers show, in plain sentences (the scene's
 * own legend, render3d's layerNotes, says the same in its PNG).
 */
export function layerSentences(s: SceneScale): string[] {
  const out: string[] = [];
  if (s.faces === 'fibres') {
    out.push(
      'The slice’s texture follows the computed flow direction; its grain is only a carrier.',
    );
  } else if (s.faces === 'schlieren' && s.schlieren !== null) {
    out.push(
      `The slice is a schlieren: brightness is the density gradient on a log scale, ` +
        `${s.schlieren.lo.toFixed(1)} to ${s.schlieren.hi.toFixed(1)} (log10 of the gradient times ` +
        'the calibre over the free stream’s density); the shock’s jump is not in it (the computed region starts at the shock); the shock is drawn separately, as a line where the solver fits it (key 5).',
    );
  }
  if (s.bodyCp !== null) {
    out.push(
      `The body is coloured by its computed surface pressure coefficient, blue ` +
        `${formatScaleValue(s.bodyCp.min)} through light grey 0 to red ${formatScaleValue(s.bodyCp.max)}; ` +
        'the fins are grey, not in the airflow.',
    );
  }
  if (s.particles) {
    out.push('Particles move with the computed velocity; where they start is random.');
  }
  return out;
}

/**
 * The page's legend for the 3D view's colour: the quantity, its unit and
 * range on the scene's palette, that the flow is the axisymmetric solution
 * revolved with the fins not in it, and what the scene's own legend says (the
 * free stream's value, the shells' values, the cells' extremes where the
 * bar clips them, what black means) and that behind the base is not
 * simulated, all in real values.
 */
export function sceneLegend(s: SceneScale): LegendScale {
  // Short (the owner, 2026-10-23): the two honesty lines, always shown
  // (0017 section 6.2), and a line for each layer shown that needs one,
  // which the legend's fold hides; the rest is in Details
  // (sceneLegendDetails) and in the PNG.
  const honest = [
    // The advisor's item 10: the look is FluidX3D's, a 3D solver's; this flow is not 3D.
    'The axisymmetric solution, revolved; fins are not in the airflow, their drag computed separately.',
    'Hatched: behind the base, not simulated.',
  ];
  const layers = [
    s.faces === 'fibres' ? 'Texture follows the computed flow.' : '',
    s.faces === 'schlieren' ? 'Slice: computed density gradient, light where steep.' : '',
    s.bodyCp !== null ? 'Body: computed surface pressure, blue low, red high.' : '',
    s.particles ? 'Particles move with the computed flow; start points random.' : '',
    'Drag to turn it; 0 resets.',
  ];
  return {
    kind: 'palette',
    title: s.label,
    units: s.unit,
    min: s.min,
    max: s.max,
    gradient: paletteGradient(s.colour),
    note: honest.join(' '),
    more: layers.filter((n) => n !== '').join(' '),
  };
}

/**
 * The 3D picture in full, for Details: the free stream's value, the
 * shells' count and spacing, the cells beyond the bar, what black means,
 * and each layer's scale and source.
 */
export function sceneLegendDetails(s: SceneScale): string[] {
  const span = s.max - s.min;
  const clipped = s.cellMin < s.min - 1e-9 * span || s.cellMax > s.max + 1e-9 * span;
  return [
    `Colour: ${s.label}${s.unit === '' ? '' : ` (${s.unit})`}, ${formatScaleValue(s.min)} to ` +
      `${formatScaleValue(s.max)}; the free stream ${formatScaleValue(s.freeValue)}.`,
    shellsNote(s.levels),
    clipped
      ? `Cells from ${formatScaleValue(s.cellMin)} to ${formatScaleValue(s.cellMax)}; ` +
        'beyond the bar, its end colours.'
      : '',
    ...layerSentences(s),
    'Black: no flow drawn (the free stream outside the shock). ' +
      'Hatched: behind the base, not simulated.',
  ].filter((n) => n !== '');
}
