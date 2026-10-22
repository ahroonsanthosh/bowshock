import { it } from 'vitest';
import { domainAllowance } from '../../src/verification/domain-allowance';
it('noise inversion', () => {
  const v: [number, number, number] = [0.1, 0.1 + 5e-6, 0.1 + 9.5e-6];
  for (const noise of [1e-7, 1e-6, 1e-5]) console.log('NOISE', noise, JSON.stringify(domainAllowance(v, 1e-6, noise)));
  // Mach 1.01 nested (cone, base grid): the rule against what 408.7 radii shows
  const m101: [number, number, number] = [0.09975348457485804, 0.10261026960618434, 0.10351345309568905];
  console.log('M1.01', JSON.stringify(domainAllowance(m101, 1e-4, 1e-7)), 'c3', 0.1034732094263092 - 0.10351345309568905, 'predicted c3', (0.10351345309568905 - 0.10261026960618434) ** 2 / (0.10261026960618434 - 0.09975348457485804));
  const m102: [number, number, number] = [0.10903164228339668, 0.109800801244637, 0.10969795361513447];
  console.log('M1.02', JSON.stringify(domainAllowance(m102, 1e-4, 1e-7)));
});
