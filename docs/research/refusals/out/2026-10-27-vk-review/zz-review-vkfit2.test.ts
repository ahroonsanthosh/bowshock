// Temporary review probe (not to be committed): the fitted grids' aspect
// ratio on the page's finer grids (refinements 2, 4, 8: nj 40, 80, 160),
// from the base grid's converged shock carried onto each finer family's
// lines (they nest: every coarser line is kept), and from each family's
// own start, for the Von Karman cases the audit serves nearest the gate.
import { it } from 'vitest';
import { bluntFitFamily, bluntStart, fittedFlow, fittedGridFailure } from '../src/analysis/fitted-flow';
import type { Body } from '../src/geometry/body';
import { gridOnLines } from '../src/grid/blunt-grid';
import { gridQuality } from '../src/grid/quality';

const cases = (process.env.VK_CASES ?? '4.054,13.015,1.5063')
  .split(';')
  .map((s) => s.split(',').map(Number) as [number, number, number]);

it('aspect on the finer grids', { timeout: 7_200_000 }, () => {
  for (const [nose, cylinder, mach] of cases) {
    const body: Body = {
      nose: { shape: { kind: 'haack', parameter: 0 }, length: nose, baseRadius: 0.5 },
      cylinderLength: cylinder,
    };
    const options = { mach, gamma: 1.4, nj: 20 };
    const start = bluntStart(body, options);
    const family = bluntFitFamily(body, options, start);
    const base = family(1);
    const { fit } = fittedFlow(base, 12000);
    const converged = fit.heights;
    const parts: string[] = [];
    const q1 = gridQuality(fit.grid);
    parts.push(`r1 converged ${fit.converged} aspect ${q1.maxAspectRatio.toFixed(3)} size ${q1.maxSizeRatio.toFixed(3)} gates ${String(fittedGridFailure(fit.grid))}`);
    for (const r of [1, 2, 4, 8]) {
      const p = family(r);
      const startAspect = gridQuality(gridOnLines(p.lines, p.heights, p.nj, p.baseRadius, false)).maxAspectRatio;
      // The converged base shock on this family's lines: every r-th line is a base line.
      const n = p.lines.length;
      const heights = Array.from({ length: n }, (_, k) => {
        const i = k / r;
        const i0 = Math.floor(i);
        const i1 = Math.min(i0 + 1, converged.length - 1);
        const t = i - i0;
        return (1 - t) * converged[i0]! + t * converged[i1]!;
      });
      const g = gridOnLines(p.lines, heights, p.nj, p.baseRadius, false);
      const q = gridQuality(g);
      parts.push(
        `r${r} (${n - 1}x${p.nj}): start aspect ${startAspect.toFixed(3)}, on the converged base shock ${q.maxAspectRatio.toFixed(3)} (size ${q.maxSizeRatio.toFixed(3)}, wall ${((q.minWallAngle * 180) / Math.PI).toFixed(1)} deg) gates ${String(fittedGridFailure(g))}`,
      );
    }
    console.log(`VK ${nose} cal, cylinder ${cylinder} cal, M ${mach}: ${parts.join('; ')}`);
  }
});
