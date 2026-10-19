import { appendFileSync, readFileSync } from 'node:fs';
import { it } from 'vitest';
import { linearWaveDrag } from '../../src/fins/linear-wave-drag';
import { doubleWedge } from '../../src/fins/section';
import { ackeretSectionDrag, exactSectionDrag } from '../../src/fins/section-drag';
import { rectangleLogIntegral } from '../fins/support/area-rule';
import { FINS } from '../fins/support/cases';

const OUT = 'tests/tmp-fins/claims.out';
const log = (s: string) => appendFileSync(OUT, s + '\n');

it('claims', () => {
  // section2d worst
  const rows = JSON.parse(
    readFileSync('docs/research/fin-wave-drag/section2d_full.json', 'utf8'),
  ) as { tc: number; mach: number; section2d: number | null; indep: number | null }[];
  let worst = 0;
  let worstIndep = 0;
  const ratios: string[] = [];
  for (const r of rows) {
    if (r.section2d === null) continue;
    const cd = exactSectionDrag(doubleWedge(r.tc), r.mach).cd;
    worst = Math.max(worst, Math.abs(cd / r.section2d - 1));
    worstIndep = Math.max(worstIndep, Math.abs(cd / r.indep! - 1));
    ratios.push(`${r.tc}/${r.mach}: ${(cd / ackeretSectionDrag(doubleWedge(r.tc), r.mach)).toFixed(5)}`);
  }
  log(`section2d worst ${worst.toExponential(2)}, audit indep worst ${worstIndep.toExponential(2)}`);
  log('exact/Ackeret: ' + ratios.join('  '));
  // reflection bound of the section2d cases
  const refl: string[] = [];
  for (const tc of [0.03, 0.05, 0.08]) {
    for (const mach of [1.2, 1.3, 1.5, 2, 2.5, 3]) {
      try {
        refl.push(`${tc}/${mach}: ${exactSectionDrag(doubleWedge(tc), mach).upper.firstReflection.toFixed(2)}`);
      } catch {
        refl.push(`${tc}/${mach}: refused`);
      }
    }
  }
  log('first reflection x/c: ' + refl.join('  '));
  // tent
  const h = 1.3;
  const logForm =
    (-h * h / (2 * Math.PI)) *
    (rectangleLogIntegral(0, 1, 0, 1) + rectangleLogIntegral(1, 2, 1, 2) - 2 * rectangleLogIntegral(0, 1, 1, 2));
  let fourier = 0;
  for (let n = 1; n < 2_000_000; n += 2) {
    const cosInt =
      n === 1 ? 0.5 : 0.5 * ((1 - (-1) ** ((n + 1) / 2)) / (n + 1) + (1 - (-1) ** ((n - 1) / 2)) / (n - 1));
    const a = (2 / Math.PI) * h * (2 / n - 2 * cosInt);
    fourier += n * a * a;
  }
  fourier *= Math.PI / 4;
  log(`tent: log form / Fourier - 1 = ${(logForm / fourier - 1).toExponential(2)}; log form / (2 ln2 h^2/pi) - 1 = ${(logForm / ((2 * Math.log(2) * h * h) / Math.PI) - 1).toExponential(2)}`);
  // audit values
  const audit: [string, number, number][] = [
    ['A', 1.2, 1.024], ['A', 1.5, 1.058], ['A', 2, 1.027], ['A', 3, 1.017], ['F', 1.2, 0.421], ['F', 2, 0.893],
    ['E', 1.5, 1.196], ['G', 1.5, 1.104], ['G', 3, 1.017], ['C', 1.2, 1.1], ['R02', 1.2, 0.654],
  ];
  const out: string[] = [];
  for (const [name, mach, ratio] of audit) {
    const fin = FINS.find((f) => f.name === name)!;
    const r = linearWaveDrag(fin.planform, fin.section, mach).ratio;
    out.push(`${name} M${mach}: ${r.toFixed(5)} vs ${ratio} (${((r / ratio - 1) * 100).toFixed(3)}%)`);
  }
  log('audit: ' + out.join('  '));
});
