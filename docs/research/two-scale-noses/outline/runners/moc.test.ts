// The march of characteristics from grid lines of the saved fits (nj = 20,
// 40, 80), against the fitted solver's own drag downstream of each line:
// W5's docs/research/two-scale-noses/runners/tmp-haackmoc/moc.test.ts
// (fitdata.ts unchanged), with the lines chosen by the rule registered in
// 0006 ("Widening the outline: registration", 2026-10-27) instead of by
// hand:
//
// "auto" chooses the lines once, on the first grid (refinement 1), before
// any march: the nose's lines behind the last one whose least Mach number
// is below 1.05 and ahead of the first whose fitted drag downstream is
// below 40% of the nose's; MOC_COUNT (7) targets spaced evenly in log x
// from the first such line to the last, each taking the nearest line (one
// chosen twice counts once). The choice depends only on the nj = 20 flow.
//
// Every saved fit must carry the fingerprint of this tree's fit (its case
// and the numerics hash of fitsave.test.ts's sources); the records carry
// this runner's own hashes.
// Env: C, L, M, CYL (common.ts), MOC_R (refinements, e.g. 1,2,4),
// MOC_FILES (saved states, same order), MOC_LINES (base-grid line indices,
// "scan" or "auto"), MOC_COUNT, MOC_RUN (intervals), MOC_OUT (text log),
// MOC_JSONL (records).
import { appendFileSync, readFileSync } from 'node:fs';
import { it } from 'vitest';
import { characteristicsFrom } from '../../src/validation/characteristics';
import { bodyFromEnv, idFromEnv } from './common';
import { codeHashes } from './fingerprint';
import { downstreamDrag, effectiveMach, fittedDragFrom, gamma, lineData, loadFit } from './fitdata';

const OUT = process.env.MOC_OUT ?? 'tests/vk/moc.txt';
const JSONL = process.env.MOC_JSONL ?? 'tests/vk/moc.jsonl';
const log = (s: string) => appendFileSync(OUT, `${s}\n`);

it('moc', () => {
  const body = bodyFromEnv();
  const tag = idFromEnv();
  const M = Number(process.env.M ?? 2);
  const rs = (process.env.MOC_R ?? '1').split(',').map(Number);
  const files = (process.env.MOC_FILES ?? '').split(',');
  const runs = (process.env.MOC_RUN ?? '640,1280,2560').split(',').map(Number);
  const linesArg = process.env.MOC_LINES ?? 'auto';
  const count = Number(process.env.MOC_COUNT ?? 7);
  const fitCode = codeHashes(['fitsave.test.ts']);
  const own = codeHashes(['moc.test.ts']);
  log(`${new Date().toISOString()} ${tag}: march, fit numerics ${fitCode.numerics}, march numerics ${own.numerics}, runner ${own.runner}`);
  let lines: number[] = [];
  rs.forEach((r, n) => {
    const head = JSON.parse(readFileSync(`${files[n]!}.json`, 'utf8')) as {
      fingerprint?: { case: string; refinement: number; numerics: string };
    };
    const fp = head.fingerprint;
    if (!fp || fp.case !== tag || fp.refinement !== r || fp.numerics !== fitCode.numerics) {
      throw new Error(`${files[n]}: saved fit of another case or code (${JSON.stringify(fp)})`);
    }
    const t0 = performance.now();
    const f = loadFit(body, M, r, files[n]!);
    const mach = effectiveMach(f);
    log(
      `r ${r} (${f.ni} x ${f.nj}) from ${files[n]}: drag ${f.drag.toPrecision(17)}, mach ${mach.toPrecision(12)}, rebuilt in ${((performance.now() - t0) / 1000).toFixed(0)} s`,
    );
    if (n === 0 && (linesArg === 'scan' || linesArg === 'auto')) {
      if (r !== 1) throw new Error('scan and auto need refinement 1 first');
      const all: { i: number; x: number; minMach: number; share: number }[] = [];
      for (let i = 2; i <= f.ni - 2; i++) {
        const d = lineData(f, i);
        if (d.x > f.body.nose.length) break;
        const downstream = fittedDragFrom(f, i);
        const share = downstream / f.drag;
        all.push({ i, x: d.x, minMach: d.minMach, share });
        log(
          `  scan line ${i} (x ${d.x.toExponential(4)}): min Mach ${d.minMach.toFixed(4)}, wall K ${d.wallEntropyError.toExponential(2)}, downstream fitted ${downstream.toPrecision(10)} of ${f.drag.toPrecision(10)} (${(100 * share).toFixed(2)}%)`,
        );
      }
      if (linesArg === 'scan') return;
      let first = 0;
      all.forEach((c, k) => {
        if (c.minMach < 1.05) first = k + 1;
      });
      let end = all.findIndex((c) => c.share < 0.4);
      if (end < 0) end = all.length;
      const usable = all.slice(first, Math.max(first, end));
      if (usable.length === 0) throw new Error('no line behind the sonic line carrying 40% of the drag');
      const x0 = usable[0]!.x;
      const x1 = usable[usable.length - 1]!.x;
      const chosen = new Set<number>();
      for (let k = 0; k < count; k++) {
        const target = count === 1 ? x0 : x0 * (x1 / x0) ** (k / (count - 1));
        let best = usable[0]!;
        for (const c of usable)
          if (Math.abs(Math.log(c.x / target)) < Math.abs(Math.log(best.x / target))) best = c;
        chosen.add(best.i);
      }
      lines = [...chosen].sort((a, b) => a - b);
      log(
        `${tag}: lines chosen on nj = 20 (auto): ${lines.join(',')} (usable ${usable[0]!.i} to ${usable[usable.length - 1]!.i}, x ${x0.toExponential(3)} to ${x1.toExponential(3)})`,
      );
    } else if (n === 0) {
      lines = linesArg.split(',').map(Number);
    }
    for (const base of lines) {
      const i = base * r;
      const d = lineData(f, i);
      const fitted = fittedDragFrom(f, i);
      log(
        `  line ${base} (x ${d.x.toExponential(5)}): min Mach ${d.minMach.toFixed(4)}, wall K ${d.wallEntropyError.toExponential(2)}, fitted downstream ${fitted.toPrecision(12)} (${((100 * fitted) / f.drag).toFixed(3)}% of the drag)`,
      );
      for (const intervals of runs) {
        const t1 = performance.now();
        try {
          const sol = characteristicsFrom(f.body, d.start, { mach, gamma, intervals });
          const drag = downstreamDrag(f.body, mach, sol.wall);
          appendFileSync(
            JSONL,
            JSON.stringify({
              case: tag,
              r,
              line: base,
              x: d.x,
              minMach: d.minMach,
              n: intervals,
              fitted,
              total: f.drag,
              moc: drag,
              mass: sol.massBalance,
              penetration: sol.penetration,
              fitNumerics: fitCode.numerics,
              mocNumerics: own.numerics,
              mocRunner: own.runner,
            }) + '\n',
          );
          log(
            `    MOC ${intervals}: ${drag.toPrecision(12)}, fitted - MOC ${(fitted - drag).toExponential(3)} (${((fitted - drag) / f.drag).toExponential(3)} of the drag), mass ${sol.massBalance.toExponential(2)}, penetration ${sol.penetration.toExponential(1)}, ${((performance.now() - t1) / 1000).toFixed(0)} s`,
          );
        } catch (e) {
          log(`    MOC ${intervals}: ${(e as Error).message}`);
        }
      }
    }
  });
});
