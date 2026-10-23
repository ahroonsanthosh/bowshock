import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '../../src/ui/style.css';
import { sceneLegend } from '../../src/app/scene3d';
import { Legend } from '../../src/ui/legend';

/**
 * The 3D view's legend on the page, in a browser with the page's styles
 * (src/ui/legend.ts, src/ui/style.css): folding it hides its layer lines,
 * never the honesty lines (docs/design/0017-rocketeer-interface.md
 * sections 6.2 and 6.6). The app page's own test may not load the 3D view
 * in its frame, so this holds the fold on its own.
 */
describe("the 3D view's legend fold", () => {
  it('keeps the honesty lines shown when folded; hides and shows the layer lines', async () => {
    // A desktop's width: on a phone the legend shows its bar only, its notes under the sheet.
    await page.viewport(1440, 900);
    const legend = new Legend();
    const aside = document.createElement('div');
    aside.className = 'flow-aside';
    aside.append(legend.element);
    document.body.append(aside);
    legend.show(
      sceneLegend({
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
        bodyCp: { min: -0.1, max: 0.1 },
        streaks: 'still',
      }),
    );
    const shown = (el: Element | null) => el !== null && getComputedStyle(el).display !== 'none';
    const honest = legend.element.querySelector('.legend__note:not(.legend__more)');
    const more = legend.element.querySelector('.legend__more');
    const fold = legend.element.querySelector('.legend__fold') as HTMLButtonElement;
    expect(shown(fold)).toBe(true);
    expect(shown(honest) && shown(more)).toBe(true);
    fold.click();
    expect(fold.getAttribute('aria-expanded')).toBe('false');
    expect(shown(honest)).toBe(true);
    expect(honest?.textContent).toContain(
      'The axisymmetric solution, revolved; fins are not in the airflow',
    );
    expect(honest?.textContent).toContain('Hatched: behind the base, not simulated.');
    expect(shown(more)).toBe(false);
    fold.click();
    expect(shown(more)).toBe(true);
    expect(more?.textContent).toContain('Streaks follow the computed flow');
    aside.remove();
  });
});
