// Throwaway: first-guess grids' gate failures, default and density 1.5 (no solve).
import { test } from 'vitest';
import { appendFileSync } from 'node:fs';
import { sharpFitProblem } from './snap3/src/analysis/fitted-flow';
import { gridOnLines } from './snap3/src/grid/blunt-grid';
import { FITTED_QUALITY_LIMITS, gridQuality, qualityFailures } from './snap3/src/grid/quality';
import { noseBaseSlope, noseTipSlope, type NoseShape } from './snap3/src/geometry/nose';
import { coneFlowField } from './snap3/src/validation/taylor-maccoll';
test('gate scan', () => {
  const shapes: [string, NoseShape][] = [['cone', { kind: 'conical' }], ['tangent ogive', { kind: 'ogive', parameter: 1 }], ['parabolic 1', { kind: 'parabolic', parameter: 1 }], ['secant 0.5', { kind: 'ogive', parameter: 0.5 }]];
  for (const [name, shape] of shapes) for (const L of [1, 2, 3, 5]) for (const cyl of [10, 15, 20, 30]) for (const mach of [1.5, 2, 2.5, 3]) {
    const body = { nose: { shape, length: L, baseRadius: 0.5 }, cylinderLength: cyl };
    const out: Record<string, unknown> = { name, L, cyl, mach };
    try {
      const tip = Math.atan(noseTipSlope(body.nose));
      const f = coneFlowField(mach, tip, 1.4).flow;
      out.surface = f.surfaceMach; out.axial = f.surfaceMach * Math.cos(tip); out.tangent = noseBaseSlope(body.nose) === 0;
    } catch (e) { out.tmError = String(e).slice(0, 40); }
    try {
      for (const scale of [1, 1.5]) {
        const p = sharpFitProblem(body, { mach, gamma: 1.4, nj: 20, refinement: 1, columnDensityScale: scale });
        const g = gridOnLines(p.lines, p.heights, p.nj, p.baseRadius, false);
        const q = gridQuality(g);
        out[`s${scale}`] = { ni: g.ni, aspect: +q.maxAspectRatio.toFixed(2), failures: qualityFailures(q, FITTED_QUALITY_LIMITS) };
      }
    } catch (e) { out.error = String(e).slice(0, 80); }
    appendFileSync(process.env.OUT!, JSON.stringify(out) + '\n');
  }
});
