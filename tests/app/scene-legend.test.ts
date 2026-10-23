/**
 * The page's legend for the 3D view (src/app/scene3d.ts): it says first
 * that the flow is the axisymmetric solution revolved, with the fins not
 * in it (the advisor's item 10), then the scale's own notes.
 */

import { describe, expect, it } from 'vitest';
import { sceneLegend, sceneLegendDetails, shellsNote } from '../../src/app/scene3d';
import type { SceneScale } from '../../src/render3d/scene';

const SCALE: SceneScale = {
  quantity: 'mach',
  label: 'Mach number',
  unit: '',
  min: 1.68,
  max: 1.87,
  freeValue: 1.8,
  cellMin: 1.65,
  cellMax: 1.91,
  levels: [1.7, 1.75, 1.8],
  colour: () => [0, 0, 0],
  faces: 'fibres',
  schlieren: null,
  bodyCp: { min: -0.08, max: 0.08 },
  streaks: 'off',
};

describe("the 3D view's legend", () => {
  it('is short: the two honesty lines and a line for each layer shown', () => {
    const legend = sceneLegend(SCALE);
    if (legend.kind !== 'palette') throw new Error(legend.kind);
    // The honesty lines, always shown; the layers' lines, which the fold hides.
    expect(legend.note).toBe(
      'The axisymmetric solution, revolved; fins are not in the airflow, their drag computed separately. ' +
        'Hatched: behind the base, not simulated.',
    );
    expect(legend.more).toBe(
      'Texture follows the computed flow. ' +
        'Body: computed surface pressure, blue low, red high. ' +
        'Drag to turn it; 0 resets.',
    );
    const moving = sceneLegend({ ...SCALE, streaks: 'moving' });
    if (moving.kind !== 'palette') throw new Error(moving.kind);
    expect(moving.more).toContain(
      'Streaks follow the computed flow; start points spread by the page.',
    );
    const plain = sceneLegend({ ...SCALE, faces: null, bodyCp: null });
    if (plain.kind !== 'palette') throw new Error(plain.kind);
    expect(plain.note).toBe(
      'The axisymmetric solution, revolved; fins are not in the airflow, their drag computed separately. ' +
        'Hatched: behind the base, not simulated.',
    );
    expect(plain.more).toBe('Drag to turn it; 0 resets.');
  });

  it('gives the rest in Details: free stream, shells, cells beyond the bar, each layer', () => {
    const details = sceneLegendDetails(SCALE).join(' ');
    expect(details).toContain('the free stream 1.80');
    expect(details).toContain('Shells at 1.70, 1.75, 1.80.');
    expect(details).toContain('beyond the bar, its end colours');
    expect(details).toContain('computed surface pressure coefficient');
    expect(details).toContain('Black: no flow drawn');
  });

  it('lists a few shells; many as their count, spacing and ends', () => {
    expect(shellsNote([1.7, 1.75])).toBe('Shells at 1.70, 1.75.');
    const many = Array.from({ length: 29 }, (_, k) => Number((1.66 + 0.01 * k).toFixed(2)));
    expect(shellsNote(many)).toBe('29 shells, every 0.01 from 1.66 to 1.94.');
  });
});
