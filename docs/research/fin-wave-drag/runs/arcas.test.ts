/**
 * The ARCAS fins' own drag (TN D-4014) over the measured fins-on increment,
 * as the research's arcas_fin_check.py computes it, with the exact section
 * drag in place of Ackeret's and src/friction's van Driest II; increments
 * from the research's readings and from the audit's.
 */
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { finWaveDrag } from '../../src/fins/fin-wave-drag';
import { planformArea } from '../../src/fins/planform';
import { doubleWedge } from '../../src/fins/section';
import { vanDriestAverageCf, vanDriestFactors } from '../../src/friction/van-driest';
import { FINS } from '../fins/support/cases';

const OUT = 'tests/tmp-fins/arcas.out';
const log = (s: string) => appendFileSync(OUT, s + '\n');

it('ARCAS own drag over the measured increment', () => {
  const planform = FINS.find((f) => f.name === 'A')!.planform;
  const section = doubleWedge(0.15 / 3.38, 1.812 / 3.38);
  const area = planformArea(planform);
  const aref = (Math.PI * 2.25 ** 2) / 4;
  const cbar = area / planform.span;
  const rePerInch = 3.0e6 / 12;
  const t0 = 339;
  const research: Record<number, number[]> = {
    1.5: [0.5355 - 0.3475],
    1.8: [0.4707 - 0.3334, 0.505 - 0.369],
    2.3: [0.382 - 0.29, 0.4097 - 0.3245],
    2.96: [0.3083 - 0.2424, 0.335 - 0.269],
  };
  const audit: Record<number, number[]> = {
    1.5: [0.5342 - 0.3461],
    1.8: [0.4691 - 0.332, 0.5088 - 0.3683],
    2.3: [0.3798 - 0.2899, 0.4128 - 0.3256],
    2.96: [0.3046 - 0.2394, 0.3317 - 0.2654],
  };
  log(`S = ${area.toFixed(4)} in^2, Aref = ${aref.toFixed(4)} in^2, cbar = ${cbar.toFixed(4)} in`);
  for (const mach of [1.5, 1.8, 2.3, 2.96]) {
    const w = finWaveDrag(planform, section, mach);
    const te = t0 / (1 + 0.2 * mach * mach);
    const cf = vanDriestAverageCf(rePerInch * cbar, vanDriestFactors({ mach, temperature: te }));
    const wave = (4 * w.cd * area) / aref;
    const fric = (4 * cf * 2 * area) / aref;
    const sum = wave + fric;
    const f = (xs: number[]) => xs.map((x) => (sum / x).toFixed(3)).join(', ');
    log(
      `M ${mach}: wave ${wave.toFixed(4)} (section exact ${w.exactSection}), CF ${cf.toFixed(5)}, friction ${fric.toFixed(4)}, sum ${sum.toFixed(4)}; own/measured, research readings ${f(research[mach]!)}; audit readings ${f(audit[mach]!)}`,
    );
  }
});
