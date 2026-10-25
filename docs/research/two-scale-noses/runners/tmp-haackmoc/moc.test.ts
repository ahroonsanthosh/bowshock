// Throwaway: the march of characteristics from grid lines of the saved
// fitted solutions of the 3-caliber LD-Haack nose at Mach 2 (nj = 20, 40,
// 80), against the fitted solver's own drag downstream of each line.
// Env: MOC_R (refinements, e.g. 1,2,4), MOC_FILES (saved states, same
// order), MOC_LINES (base-grid line indices, or "scan"), MOC_RUN
// (intervals), MOC_OUT (log file).
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { characteristicsFrom } from '../../src/validation/characteristics';
import { haack } from '../tmp-haack/common';
import { downstreamDrag, effectiveMach, fittedDragFrom, gamma, lineData, loadFit } from './fitdata';

const OUT = process.env.MOC_OUT ?? 'tests/tmp-haackmoc/moc.txt';
const log = (s: string) => appendFileSync(OUT, `${s}\n`);

it('moc', () => {
  const body = haack(Number(process.env.C ?? 0), Number(process.env.L ?? 3), Number(process.env.CYL ?? 2));
  const M = Number(process.env.M ?? 2);
  const rs = (process.env.MOC_R ?? '1').split(',').map(Number);
  const files = (process.env.MOC_FILES ?? 'tests/tmp-haackmoc/L3M2r1').split(',');
  const runs = (process.env.MOC_RUN ?? '640,1280').split(',').map(Number);
  const linesArg = process.env.MOC_LINES ?? 'scan';
  rs.forEach((r, n) => {
    const t0 = performance.now();
    const f = loadFit(body, M, r, files[n]!);
    const mach = effectiveMach(f);
    log(`r ${r} (${f.ni} x ${f.nj}) from ${files[n]}: drag ${f.drag.toPrecision(17)}, mach ${mach.toPrecision(12)}, rebuilt in ${((performance.now() - t0) / 1000).toFixed(0)} s`);
    if (linesArg === 'scan') {
      for (let i = 2 * r; i <= f.ni - 2; i += r) {
        const d = lineData(f, i);
        if (d.x > f.body.nose.length) break;
        log(`  line ${i / r} (x ${d.x.toExponential(4)}): min Mach ${d.minMach.toFixed(4)}, wall K ${d.wallEntropyError.toExponential(2)} (wall row ${d.wallRowEntropyError.toExponential(2)}), downstream fitted ${fittedDragFrom(f, i).toPrecision(10)} of ${f.drag.toPrecision(10)}`);
      }
      return;
    }
    for (const base of linesArg.split(',').map(Number)) {
      const i = base * r;
      const d = lineData(f, i);
      const fitted = fittedDragFrom(f, i);
      log(`  line ${base} (x ${d.x.toExponential(5)}): min Mach ${d.minMach.toFixed(4)}, wall K ${d.wallEntropyError.toExponential(2)}, fitted downstream ${fitted.toPrecision(12)} (${((100 * fitted) / f.drag).toFixed(3)}% of the drag)`);
      for (const intervals of runs) {
        const t1 = performance.now();
        try {
          const sol = characteristicsFrom(f.body, d.start, { mach, gamma, intervals });
          const drag = downstreamDrag(f.body, mach, sol.wall);
          appendFileSync(
            'tests/tmp-haackmoc/moc.jsonl',
            JSON.stringify({ case: `C${process.env.C ?? 0} L${process.env.L ?? 3} M${M} cyl${process.env.CYL ?? 2}`, r, line: base, x: d.x, minMach: d.minMach, n: intervals, fitted, total: f.drag, moc: drag, mass: sol.massBalance, penetration: sol.penetration }) + '\n',
          );
          log(`    MOC ${intervals}: ${drag.toPrecision(12)}, fitted - MOC ${(fitted - drag).toExponential(3)} (${((fitted - drag) / f.drag).toExponential(3)} of the drag), mass ${sol.massBalance.toExponential(2)}, penetration ${sol.penetration.toExponential(1)}, ${((performance.now() - t1) / 1000).toFixed(0)} s`);
        } catch (e) {
          log(`    MOC ${intervals}: ${(e as Error).message}`);
        }
      }
    }
  });
});
