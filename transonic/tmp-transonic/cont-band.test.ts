/** The cone's Mach 1.05 band with r = 8 continued to a fitted window (re-review of dd6c423). */
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { domainAllowance } from '../../src/verification/domain-allowance';
import { gridConvergence } from '../../src/verification/grid-convergence';

it('cont band', () => {
  const D = [55.10160405104679, 100.60719837318378, 224.2118229126046] as const;
  const L = 1 / Math.tan(((6 + 59 / 60) * Math.PI) / 180);
  const cyl = [(19.214244588210985 - L) / 2, (28.163978552142765 - L) / 2, (52.161104816630946 - L) / 2] as const;
  const fam = [0.10651053183048755, 0.10686619083144872, 0.10703756313485618, 0.10711167501236205];
  const e = gridConvergence(fam, { orderTolerance: 0.5, noise: 1e-7 });
  const far = domainAllowance([0.10650412065557352, fam[0]!, 0.10651040821945537], D, 1e-7);
  const c = domainAllowance([0.1065105378360506, fam[0]!, 0.10651053246979673], cyl, 1e-7);
  const out = [JSON.stringify(e)];
  if (e.kind !== 'unresolved' && far.kind !== 'refused' && c.kind !== 'refused') {
    const floor = 7e-5 * e.value;
    out.push(`value ${e.value} grids ${e.uncertainty} floor ${floor} far ${far.allowance} cyl ${c.allowance} band ${e.uncertainty + floor + far.allowance + c.allowance}`);
  }
  writeFileSync('tests/tmp-transonic/cont-band.txt', out.join('\n') + '\n');
});
