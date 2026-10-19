import { appendFileSync, readFileSync } from 'node:fs';
import { it } from 'vitest';
import { stripTheoryRatio } from '../../src/fins/fin-wave-drag';
import { doubleWedge } from '../../src/fins/section';
import {
  ackeretSectionDrag,
  busemannCoefficients,
  exactSectionDrag,
} from '../../src/fins/section-drag';
import {
  machFromPrandtlMeyer,
  obliqueShock,
  prandtlMeyer,
  stagnationPressureRatio,
} from '../../src/validation/gas-dynamics';
import { FINS } from '../fins/support/cases';

const OUT = 'tests/tmp-fins/note.out';
const log = (s: string) => appendFileSync(OUT, s + '\n');
const gamma = 1.4;

it('numbers for the note', () => {
  // Busemann C2 against the exact relations.
  for (const mach of [1.3, 2, 3.5]) {
    const { c1, c2 } = busemannCoefficients(mach, gamma);
    const q = 0.5 * gamma * mach * mach;
    const row: string[] = [];
    for (const delta of [1e-3, 2e-3]) {
      const pShock = obliqueShock(mach, delta, gamma).pressureRatio;
      const m = machFromPrandtlMeyer(prandtlMeyer(mach, gamma) + delta, gamma);
      const pExp = stagnationPressureRatio(mach, gamma) / stagnationPressureRatio(m, gamma);
      const cShock = ((pShock - 1) / q - c1 * delta) / delta ** 2;
      const cExp = ((pExp - 1) / q + c1 * delta) / delta ** 2;
      row.push(`d ${delta}: shock ${(cShock / c2 - 1).toExponential(2)} exp ${(cExp / c2 - 1).toExponential(2)}`);
    }
    log(`C2 M${mach} (${c2.toFixed(4)}): ${row.join('  ')}`);
  }
  // Research table entries that change at 3 decimals.
  const json = JSON.parse(
    readFileSync('docs/research/total-drag/data/fin_linear_theory_results.json', 'utf8').replace(/Infinity/g, 'null'),
  ) as Record<string, [number, number, number | null][]>;
  const table = new Map<string, number>();
  for (const l of readFileSync('tests/tmp-fins/table.jsonl', 'utf8').trim().split('\n')) {
    const r = JSON.parse(l) as { case: string; mach: number; ratio: number };
    table.set(`${r.case} ${r.mach}`, r.ratio);
  }
  const changed: string[] = [];
  let worst = 0;
  for (const [key, rows] of Object.entries(json)) {
    const fin = FINS.find((f) => key.startsWith(f.research + ' '))!;
    for (const [mach, ratio] of rows) {
      const now = table.get(`${fin.name} ${mach}`)!;
      worst = Math.max(worst, Math.abs(ratio / now - 1));
      if (ratio.toFixed(3) !== now.toFixed(3)) changed.push(`${fin.name} M${mach}: ${ratio.toFixed(4)} -> ${now.toFixed(4)}`);
    }
  }
  log(`research table vs now: worst ${worst.toExponential(2)}; changed at 3 decimals: ${changed.join('; ')}`);
  // ARCAS: exact over Ackeret and the ratio at the TN D-4014 Mach numbers.
  const arcas = FINS.find((f) => f.name === 'A')!;
  const section = doubleWedge(0.15 / 3.38, 1.812 / 3.38);
  for (const mach of [1.5, 1.8, 2.3, 2.96]) {
    const e = exactSectionDrag(section, mach);
    const r = stripTheoryRatio(arcas.planform, section, mach);
    log(`ARCAS M${mach}: exact/Ackeret ${(e.cd / ackeretSectionDrag(section, mach)).toFixed(4)}, ratio ${r.ratio.toFixed(4)} (+-${r.quadratureError.toExponential(1)}), fin wave cd ${(e.cd * r.ratio).toFixed(5)}, first reflection ${e.upper.firstReflection.toFixed(2)}`);
  }
});
