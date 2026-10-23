/**
 * The page's legend for the 3D view (src/app/scene3d.ts): it says first
 * that the flow is the axisymmetric solution revolved, with the fins not
 * in it (the advisor's item 10), then the scale's own notes.
 */

import { describe, expect, it } from 'vitest';
import { sceneLegend, shellsNote } from '../../src/app/scene3d';

describe("the 3D view's legend", () => {
  it('says the flow is axisymmetric, revolved, and the fins are not in it', () => {
    const legend = sceneLegend({
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
    });
    if (legend.kind !== 'palette') throw new Error(legend.kind);
    expect(legend.note).toMatch(
      /^The axisymmetric solution, revolved; fins are not in the airflow\. Free stream 1\.8/,
    );
    expect(legend.note).toContain('Hatched: behind the base, not simulated.');
  });

  it('lists a few shells; many as their count, spacing and ends', () => {
    expect(shellsNote([1.7, 1.75])).toBe('Shells at 1.70, 1.75.');
    const many = Array.from({ length: 29 }, (_, k) => Number((1.66 + 0.01 * k).toFixed(2)));
    expect(shellsNote(many)).toBe('29 shells, every 0.01 from 1.66 to 1.94.');
  });
});
