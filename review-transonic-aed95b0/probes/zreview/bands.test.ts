import { it } from 'vitest';
import { gridConvergence } from '../../src/verification/grid-convergence';
import { domainAllowance } from '../../src/verification/domain-allowance';
import { taylorMaccoll } from '../../src/validation/taylor-maccoll';
const fam: Record<string, number[]> = {
  '1.2': [0.08321842815685355, 0.08305473158102415, 0.0830206160762542, 0.08301323443404968],
  '1.1': [0.09446444072558348, 0.09448214156620545, 0.09449128217105732, 0.0944949749444897],
  '1.1-r1to8': [0.09446829629185434, 0.09446444072558348, 0.09448214156620545, 0.09449128217105732],
  '1.05': [0.10651053183048755, 0.10686619083144872, 0.10703756313485618, 0.10711161750489769],
};
const far: Record<string, [number, number, number]> = {
  '1.2': [0.08321843162819731, 0.08321842815685355, 0.08321843684969224],
  '1.1': [0.09446829964266552, 0.09446829629185434, 0.09446829447344199],
  '1.05': [0.10650412065557352, 0.10651053183048755, 0.10651040821945537],
};
const cyl: Record<string, [number, number, number]> = {
  '1.2': [0.08321843061525593, 0.08321842815685355, 0.08321843600632188],
  '1.1': [0.09446830676511346, 0.09446829629185434, 0.09446830603533424],
  '1.05': [0.1065105378360506, 0.10651053183048755, 0.10651053246979673],
};
it('bands', () => {
  const angle = Math.atan(1 / (1 / Math.tan((6 + 59 / 60) * Math.PI / 180)));
  for (const noise of [1e-7, 1.64e-6, 2e-6]) {
    for (const k of Object.keys(fam)) {
      const e = gridConvergence(fam[k]!, { orderTolerance: 0.5, noise });
      const m = k.split('-')[0]!;
      const g = e.kind === 'unresolved' ? 0 : e.uncertainty;
      const fa = domainAllowance(far[m]!, g, noise);
      const ca = domainAllowance(cyl[m]!, g, noise);
      const floor = 7e-5 * e.value;
      const band = g + floor + (fa.kind === 'refused' ? NaN : fa.allowance) + (ca.kind === 'refused' ? NaN : ca.allowance);
      let exact = NaN;
      try { const tm = taylorMaccoll(Number(m), angle, 1.4); exact = tm.surfacePressureCoefficient; } catch { /* */ }
      console.log(`noise ${noise} M ${k}: ${e.kind} value ${e.value} ${e.kind === 'monotone' ? 'order ' + e.order.toFixed(3) + ' ext ' + e.extrapolated.toFixed(8) : ''} grids ${g.toExponential(3)} floor ${floor.toExponential(3)} far ${fa.kind}:${fa.kind !== 'refused' ? fa.allowance.toExponential(2) : ''} cyl ${ca.kind}:${ca.kind !== 'refused' ? ca.allowance.toExponential(2) : ''} band ${band.toExponential(3)} exact ${exact} err ${(e.value - exact).toExponential(3)} ${e.kind === 'unresolved' ? e.reason : ''}`);
    }
  }
});
