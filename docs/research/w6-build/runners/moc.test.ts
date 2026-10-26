// W6 build: the march of characteristics from grid lines of a capped nose's
// saved fits (nj = 20, 40, 80), against the fitted solver's own drag
// downstream of each line, as for the Von Karman references
// (docs/research/two-scale-noses/runners/tmp-haackmoc/moc.test.ts).
// Env: SHAPE, CAL, RATIO, M, CYL; MOC_R (refinements, e.g. 1,2,4),
// MOC_FILES (saved states, same order), MOC_LINES (base-grid line
// indices, "scan", or "auto"), MOC_RUN (intervals), MOC_OUT (text log),
// MOC_JSONL (records), MOC_ENTROPY ("cells", the first march, default; or
// "shock", the second march of README section 6: each starting point's
// entropy from its streamline's crossing of the fitted shock, entropy.ts).
//
// "auto" chooses the lines once, on the first grid (refinement 1), before
// any march: the lines of the nose behind its sonic line whose least Mach
// number is 1.05 or more, MOC_COUNT of them (default 7) spaced evenly in
// log x from the first such line to 0.8 of the nose's length. The choice
// depends only on the nj = 20 flow, never on a march's result.
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { characteristicsFrom } from '../../src/validation/characteristics';
import { caseFromEnv } from './common';
import { shockEntropyLine } from './entropy';
import { downstreamDrag, effectiveMach, fittedDragFrom, gamma, lineData, loadFit } from './fitdata';

const OUT = process.env.MOC_OUT ?? 'moc.txt';
const JSONL = process.env.MOC_JSONL ?? 'moc.jsonl';
const log = (s: string) => appendFileSync(OUT, `${new Date().toISOString()} ${s}\n`);

it('moc', () => {
  const { body, mach: M, tag } = caseFromEnv();
  const rs = (process.env.MOC_R ?? '1').split(',').map(Number);
  const files = (process.env.MOC_FILES ?? '').split(',');
  const runs = (process.env.MOC_RUN ?? '640,1280,2560').split(',').map(Number);
  const linesArg = process.env.MOC_LINES ?? 'auto';
  const count = Number(process.env.MOC_COUNT ?? 7);
  const entropy = process.env.MOC_ENTROPY ?? 'cells';
  if (entropy !== 'cells' && entropy !== 'shock') throw new Error(`MOC_ENTROPY ${entropy}`);
  let lines: number[] = [];
  rs.forEach((r, n) => {
    const t0 = performance.now();
    const f = loadFit(body, M, r, files[n]!);
    const mach = effectiveMach(f);
    log(
      `${tag} r ${r} (${f.ni} x ${f.nj}) from ${files[n]}: drag ${f.drag.toPrecision(17)}, mach ${mach.toPrecision(12)}, rebuilt in ${((performance.now() - t0) / 1000).toFixed(0)} s`,
    );
    if (n === 0 && (linesArg === 'scan' || linesArg === 'auto')) {
      if (r !== 1) throw new Error('scan and auto need refinement 1 first');
      const candidates: { i: number; x: number }[] = [];
      for (let i = 2; i <= f.ni - 2; i++) {
        const d = lineData(f, i);
        if (d.x > f.body.nose.length) break;
        log(
          `  scan line ${i} (x ${d.x.toExponential(4)}): min Mach ${d.minMach.toFixed(4)}, wall K ${d.wallEntropyError.toExponential(2)}, downstream fitted ${fittedDragFrom(f, i).toPrecision(10)} of ${f.drag.toPrecision(10)}`,
        );
        if (d.minMach >= 1.05) candidates.push({ i, x: d.x });
        else candidates.length = 0;
      }
      if (linesArg === 'scan') return;
      const L = f.body.nose.length;
      const usable = candidates.filter((c) => c.x <= 0.8 * L);
      if (usable.length === 0) throw new Error('no line behind the sonic line');
      const x0 = usable[0]!.x;
      const x1 = 0.8 * L;
      const chosen = new Set<number>();
      for (let k = 0; k < count; k++) {
        const target = count === 1 ? x0 : x0 * (x1 / x0) ** (k / (count - 1));
        let best = usable[0]!;
        for (const c of usable) if (Math.abs(Math.log(c.x / target)) < Math.abs(Math.log(best.x / target))) best = c;
        chosen.add(best.i);
      }
      lines = [...chosen].sort((a, b) => a - b);
      log(`${tag}: lines chosen on nj = 20 (auto): ${lines.join(',')}`);
    } else if (n === 0) {
      lines = linesArg.split(',').map(Number);
    }
    for (const base of lines) {
      const i = base * r;
      const d = lineData(f, i);
      const fitted = fittedDragFrom(f, i);
      let start = d.start;
      let massRatio = Number.NaN;
      let entropyChange = Number.NaN;
      if (entropy === 'shock') {
        const s = shockEntropyLine(f, i, d.start);
        start = s.start;
        massRatio = s.massRatio;
        entropyChange = s.largestEntropyChange;
        log(
          `  line ${base}: entropy from the shock; the line's mass flux over the shock's ${massRatio.toFixed(6)}, largest entropy change ${entropyChange.toExponential(2)}`,
        );
      }
      log(
        `  line ${base} (x ${d.x.toExponential(5)}): min Mach ${d.minMach.toFixed(4)}, wall K ${d.wallEntropyError.toExponential(2)}, fitted downstream ${fitted.toPrecision(12)} (${((100 * fitted) / f.drag).toFixed(3)}% of the drag)`,
      );
      for (const intervals of runs) {
        const t1 = performance.now();
        try {
          const sol = characteristicsFrom(f.body, start, { mach, gamma, intervals });
          const drag = downstreamDrag(f.body, mach, sol.wall);
          appendFileSync(
            JSONL,
            JSON.stringify({
              case: tag,
              entropy,
              massRatio,
              entropyChange,
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
            }) + '\n',
          );
          log(
            `    MOC ${intervals}: ${drag.toPrecision(12)}, fitted - MOC ${((fitted - drag) / f.drag).toExponential(3)} of the drag, mass ${sol.massBalance.toExponential(2)}, penetration ${sol.penetration.toExponential(1)}, ${((performance.now() - t1) / 1000).toFixed(0)} s`,
          );
        } catch (e) {
          log(`    MOC ${intervals}: ${(e as Error).message}`);
        }
      }
    }
  });
});
