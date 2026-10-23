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
 * The page's legend for the 3D view's colour: the quantity, its unit and
 * range on the scene's palette, that the flow is the axisymmetric solution
 * revolved with the fins not in it, and what the scene's own legend says (the
 * free stream's value, the shells' values, the cells' extremes where the
 * bar clips them, what black means) and that behind the base is not
 * simulated, all in real values.
 */
export function sceneLegend(s: SceneScale): LegendScale {
  const span = s.max - s.min;
  const clipped = s.cellMin < s.min - 1e-9 * span || s.cellMax > s.max + 1e-9 * span;
  const notes = [
    // The advisor's item 10: the look is FluidX3D's, a 3D solver's; this flow is not 3D.
    'The axisymmetric solution, revolved; fins are not in the airflow.',
    `Free stream ${formatScaleValue(s.freeValue)}.`,
    shellsNote(s.levels),
    clipped
      ? `Cells from ${formatScaleValue(s.cellMin)} to ${formatScaleValue(s.cellMax)}; ` +
        'beyond the bar, its end colours.'
      : '',
    'Black: no flow drawn. Hatched: behind the base, not simulated.',
  ];
  return {
    kind: 'palette',
    title: s.label,
    units: s.unit,
    min: s.min,
    max: s.max,
    gradient: paletteGradient(s.colour),
    note: notes.filter((n) => n !== '').join(' '),
  };
}
