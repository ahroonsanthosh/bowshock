import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { gridConvergence } from '../../src/verification/grid-convergence';

it('floor units', () => {
  const out: string[] = [];
  const cases: [string, number[], number][] = [
    ['1.2', [0.08321842815685355, 0.08305473158102415, 0.0830206160762542, 0.08301323443404968], 0.08301133806421783],
    ['1.1 r2-16', [0.09446444072558348, 0.09448214156620545, 0.09449128217105732, 0.0944949749444897], 0.09449757998052263],
  ];
  for (const [name, f, exact] of cases) {
    const e = gridConvergence(f, { orderTolerance: 0.5, noise: 1e-7 });
    if (e.kind !== 'monotone') {
      out.push(`${name} ${e.kind}`);
      continue;
    }
    out.push(
      `${name} extrapolated ${e.extrapolated} exact ${exact} miss ${(e.extrapolated - exact).toExponential(3)} relative ${((e.extrapolated - exact) / exact).toExponential(3)}`,
    );
  }
  writeFileSync('tests/tmp-transonic/floor-units.txt', out.join('\n') + '\n');
});
